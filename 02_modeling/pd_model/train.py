"""
PD Model — Probability of Default (LightGBM)
===============================================
Modèle de Probability of Default basé sur LightGBM, conçu pour le secteur
bancaire CEMAC avec calibration réglementaire et validation statistique complète.

Pipeline complet :
1. Chargement & split stratifié (Train / Validation / Test)
2. Entraînement LightGBM avec early stopping
3. Calibration (Platt Scaling / Isotonic Regression)
4. Sauvegarde du modèle + metadata MLflow-ready

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import lightgbm as lgb
import os
import json
import pickle
import hashlib
import logging
from datetime import datetime
from typing import Optional, Dict, Tuple, List
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.metrics import roc_auc_score, brier_score_loss, log_loss
from sklearn.calibration import CalibratedClassifierCV

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    logging.getLogger(__name__).warning("xgboost non disponible. Installer: pip install xgboost")

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════
# DÉFINITION FORMELLE DU DÉFAUT — SOCLE RÉGLEMENTAIRE
# ═══════════════════════════════════════════════════════════════════════════
# Source : Basel III §452 (BCBS 2004/2017) + pratiques COBAC CEMAC.
# Cette définition DOIT être reproduite identiquement dans le Modèle Card
# et le rapport de validation MRM externe avant toute promotion PROD_CHAMPION.
#
# Pour les données Home Credit (DEMO_BASELINE) :
#   TARGET = 1  ↔  client en défaut dans les 12 mois suivant la demande
#   Définition Home Credit : retard de paiement > 60/90 DPD sur toute
#   obligation de crédit. Observation window : 12 mois post-décaissement.
#
# Pour PROD_CHAMPION (données bancaires CEMAC réelles) — à confirmer avec
# le partenaire bancaire — la définition recommandée est :
#   Défaut = DPD ≥ 90 jours  OU  "unlikely to pay" (restructuration,
#             passage en contentieux, provision ≥ 100% de l'EAD).
#   Observation window : 12 mois (IFRS 9 Stage 1 ECL horizon).
#   Période d'exclusion post-décaissement (performance period) : 3 mois minimum.
DEFAULT_DEFINITION = {
    "regulatory_basis":      "Basel III §452 + IFRS 9 §B5.5.37 + COBAC CEMAC",
    "default_event_primary": "DPD >= 90 jours sur toute obligation (critère irréfutable)",
    "default_event_secondary": "Unlikely to pay : restructuration, contentieux, provision >= 100%",
    "observation_window_months": 12,
    "performance_period_months": 3,
    "target_variable":       "TARGET (1 = défaut, 0 = sain)",
    "demo_dataset_note": (
        "Home Credit (données russo-asiatiques 2016-2018). "
        "Définition exacte Home Credit non divulguée publiquement — approximation "
        "60-90 DPD. Non certifiable COBAC en l'état. Retraining sur données CEMAC requis."
    ),
}

# ─── Default Hyperparameters (optimisés pour crédit scoring) ────────────
DEFAULT_PARAMS = {
    "objective": "binary",
    "metric": ["auc", "binary_logloss"],
    "boosting_type": "gbdt",
    "n_estimators": 2000,
    "learning_rate": 0.005,      # Réduit pour éviter l'overshoot avec scale_pos_weight
    "num_leaves": 31,            # Réduit pour limiter l'overfitting
    "max_depth": 5,              # Réduit
    "min_child_samples": 100,    # Éviter overfitting sur petits segments
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "reg_alpha": 0.5,            # Augmenté pour régularisation
    "reg_lambda": 2.0,           # Augmenté pour régularisation
    "scale_pos_weight": 1,       # Sera ajusté dynamiquement
    "random_state": 42,
    "n_jobs": -1,
    "verbose": -1,
    "is_unbalance": True,
}

# Colonnes à exclure de l'entraînement
EXCLUDE_COLUMNS = [
    "SK_ID_CURR", "TARGET", "SK_ID_BUREAU", "SK_ID_PREV",
    "index", "level_0",
]

# ─── XGBoost Production Params (MODEL_GOVERNANCE_SPEC §4) ───────────────────
# Ces paramètres sont la cible réglementaire : monotonicity + hist binning.
XGBOOST_PARAMS = {
    "objective": "binary:logistic",
    "eval_metric": ["auc", "logloss"],
    "tree_method": "hist",          # déterministe, scalable (spec §4)
    "max_depth": 6,                 # limite overfitting sur données émergentes (spec §4)
    "learning_rate": 0.05,
    "n_estimators": 1000,
    "min_child_weight": 50,         # cohérent avec LightGBM min_child_samples
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "seed": 42,
    "n_jobs": -1,
    "verbosity": 0,
}

# Contraintes de monotonicité réglementaires (Basel/IFRS 9 — spec §4)
# +1 = monotone croissant (feature ↑ → PD ↑)
# -1 = monotone décroissant (feature ↑ → PD ↓)
#  0 = non contraint
MONOTONE_CONSTRAINTS: Dict[str, int] = {
    # Ratios de risque : plus le ratio est élevé, plus le risque est élevé
    "DEBT_TO_INCOME":              1,
    "CREDIT_TO_INCOME_RATIO":      1,
    "CREDIT_TO_ANNUITY_RATIO":     1,
    "BUREAU_CREDIT_UTILIZATION":   1,
    # Historique de retard : plus de jours en retard = plus de risque
    "INST_LATE_PAYMENT_RATE":      1,
    "INST_MEAN_DAYS_LATE":         1,
    "INST_MAX_DAYS_LATE":          1,
    "POS_SK_DPD_MEAN":             1,
    "POS_SK_DPD_MAX":              1,
    # Scores externes et revenus : plus élevé = meilleure qualité = moins de risque
    "EXT_SOURCE_1":               -1,
    "EXT_SOURCE_2":               -1,
    "EXT_SOURCE_3":               -1,
    "EXT_SOURCE_MEAN":            -1,
    "AMT_INCOME_TOTAL":           -1,
    "EMPLOYMENT_YEARS":           -1,
}


def compute_data_hash(df: pd.DataFrame) -> str:
    """
    Calcule un hash SHA-256 déterministe du DataFrame pour la reproductibilité.
    Tracé dans les metadata d'entraînement pour lier artefact modèle ↔ snapshot données.
    """
    # Hash sur shape + premières/dernières lignes + colonnes — rapide et robuste
    fingerprint = f"{df.shape}|{sorted(df.columns.tolist())}|{df.head(5).to_csv()}|{df.tail(5).to_csv()}"
    return hashlib.sha256(fingerprint.encode()).hexdigest()[:16]


class PDModelTrainer:
    """
    Pipeline d'entraînement du modèle PD.
    
    Fonctionnalités :
    - Split stratifié avec respect de la chronologie (si disponible)
    - Entraînement LightGBM avec early stopping et validation croisée
    - Feature importance (gain-based et SHAP-ready)
    - Sauvegarde complète du modèle + metadata
    - Audit trail pour conformité COBAC
    """

    def __init__(
        self,
        params: Optional[Dict] = None,
        model_dir: Optional[str] = None,
    ):
        self.params = params or DEFAULT_PARAMS.copy()
        self.model_dir = model_dir or os.path.join(
            os.path.dirname(__file__), "artifacts"
        )
        os.makedirs(self.model_dir, exist_ok=True)

        self.model: Optional[lgb.LGBMClassifier] = None
        self.feature_names: List[str] = []
        self.training_metadata: Dict = {}

        logger.info("PDModelTrainer initialisé")

    def prepare_data_temporal(
        self,
        df: pd.DataFrame,
        target_col: str = "TARGET",
        temporal_col: Optional[str] = None,
        val_ratio: float = 0.15,
        test_ratio: float = 0.20,
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame,
               pd.Series, pd.Series, pd.Series]:
        """
        Split walk-forward respectant l'ordre chronologique strict.

        Évite le leakage temporel : les données futures ne contaminent
        jamais le train. Utilise SK_ID_CURR comme proxy temporel si
        aucune colonne date explicite n'est disponible (Home Credit :
        SK_ID_CURR croît monotonement avec la date de dépôt).

        Ordre : [──── TRAIN ────][── VAL ──][── TEST ──]
                   (1-val-test)    (val_ratio) (test_ratio)
        """
        feature_cols = [
            c for c in df.columns
            if c not in EXCLUDE_COLUMNS
            and df[c].dtype in ['int64', 'float64', 'int32', 'float32', 'bool', 'category']
        ]
        self.feature_names = feature_cols

        # Détermination de l'ordre temporel
        if temporal_col and temporal_col in df.columns:
            sort_col = temporal_col
            logger.info(f"Tri temporel sur la colonne '{temporal_col}'")
        elif "SK_ID_CURR" in df.columns:
            sort_col = "SK_ID_CURR"
            logger.info("Tri temporel sur SK_ID_CURR (proxy chronologique Home Credit)")
        else:
            logger.warning(
                "Aucune colonne temporelle trouvée. "
                "Utiliser prepare_data() pour un split aléatoire stratifié, "
                "ou fournir temporal_col= pour un split chronologique."
            )
            return self.prepare_data(df, target_col, test_size=test_ratio, val_size=val_ratio)

        df_sorted = df.sort_values(sort_col).reset_index(drop=True)
        n = len(df_sorted)
        test_cut  = int(n * (1 - test_ratio))
        val_cut   = int(n * (1 - test_ratio - val_ratio))

        train_df = df_sorted.iloc[:val_cut]
        val_df   = df_sorted.iloc[val_cut:test_cut]
        test_df  = df_sorted.iloc[test_cut:]

        X_train, y_train = train_df[feature_cols], train_df[target_col]
        X_val,   y_val   = val_df[feature_cols],   val_df[target_col]
        X_test,  y_test  = test_df[feature_cols],  test_df[target_col]

        logger.info(
            f"Split temporel — Train: {len(X_train)} ({y_train.mean():.2%}), "
            f"Val: {len(X_val)} ({y_val.mean():.2%}), "
            f"Test: {len(X_test)} ({y_test.mean():.2%})"
        )

        # Vérification : le taux de défaut doit être stable entre les fenêtres
        dr_gap = abs(y_train.mean() - y_test.mean())
        if dr_gap > 0.05:
            logger.warning(
                f"Dérive de taux de défaut Train→Test : {dr_gap:.2%}. "
                "Vérifier la cohérence temporelle du dataset."
            )

        return X_train, X_val, X_test, y_train, y_val, y_test

    def prepare_data_oot_calendar(
        self,
        df: pd.DataFrame,
        date_col: str,
        oot_start: str,
        target_col: str = "TARGET",
        val_ratio: float = 0.15,
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame,
               pd.Series, pd.Series, pd.Series]:
        """
        Split OOT calendaire conforme Basel III / IFRS 9.

        Contrairement à prepare_data_temporal() qui utilise SK_ID_CURR comme
        proxy, cette méthode exige une colonne date réelle et garantit un gap
        calendaire minimum de 6 mois entre fin du train et début de l'OOT.

        Ordre : [──── TRAIN + VAL ─────────][──── OOT ────]
                  dates < oot_start             dates >= oot_start

        Usage (données CEMAC réelles) :
            X_train, X_val, X_oot, y_train, y_val, y_oot = trainer.prepare_data_oot_calendar(
                df=df_cemac,
                date_col="date_octroi",
                oot_start="2024-01-01",   # >= 6 mois après la fin du train
                target_col="defaut_90j",
            )

        Args:
            df:         DataFrame complet avec la colonne date.
            date_col:   Colonne datetime (ou parseable en datetime).
            oot_start:  Date ISO 8601 de début de la fenêtre OOT.
                        Doit être >= 6 mois après la date max du train.
            target_col: Variable cible binaire (1 = défaut).
            val_ratio:  Fraction du jeu train réservée pour la validation.

        Raises:
            ValueError: Si le gap calendaire < 6 mois (non-conforme Basel III).
            ValueError: Si moins de 500 observations dans la fenêtre OOT.
        """
        import pandas as pd

        df = df.copy()
        df[date_col] = pd.to_datetime(df[date_col])
        oot_cutoff = pd.Timestamp(oot_start)

        train_val_df = df[df[date_col] < oot_cutoff]
        oot_df       = df[df[date_col] >= oot_cutoff]

        if len(oot_df) < 500:
            raise ValueError(
                f"OOT trop petit : {len(oot_df)} observations (min 500 requis). "
                f"Reculer oot_start ou ajouter des données."
            )

        train_max_date = train_val_df[date_col].max()
        calendar_gap   = (oot_cutoff - train_max_date).days
        MIN_GAP_DAYS   = 180  # 6 mois

        if calendar_gap < MIN_GAP_DAYS:
            raise ValueError(
                f"Gap calendaire insuffisant : {calendar_gap} jours < {MIN_GAP_DAYS} jours (6 mois). "
                f"Basel III CRE36 exige un gap minimum de 6 mois entre le train et l'OOT. "
                f"Décaler oot_start au-delà de {(train_max_date + pd.Timedelta(days=MIN_GAP_DAYS)).date()}."
            )

        logger.info(
            f"[OOT_CALENDAR] Gap calendaire : {calendar_gap} jours — conforme Basel III "
            f"(>= {MIN_GAP_DAYS}j). Train max date : {train_max_date.date()}, OOT start : {oot_cutoff.date()}"
        )

        feature_cols = [
            c for c in df.columns
            if c not in EXCLUDE_COLUMNS and c != date_col
            and df[c].dtype in ['int64', 'float64', 'int32', 'float32', 'bool', 'category']
        ]
        self.feature_names = feature_cols

        # Val split à l'intérieur du train/val (chronologique)
        train_val_sorted = train_val_df.sort_values(date_col)
        n_tv = len(train_val_sorted)
        val_cut = int(n_tv * (1 - val_ratio))
        train_df = train_val_sorted.iloc[:val_cut]
        val_df   = train_val_sorted.iloc[val_cut:]

        X_train, y_train = train_df[feature_cols], train_df[target_col]
        X_val,   y_val   = val_df[feature_cols],   val_df[target_col]
        X_oot,   y_oot   = oot_df[feature_cols],   oot_df[target_col]

        logger.info(
            f"[OOT_CALENDAR] Train: {len(X_train)} ({y_train.mean():.2%}) | "
            f"Val: {len(X_val)} ({y_val.mean():.2%}) | "
            f"OOT: {len(X_oot)} ({y_oot.mean():.2%})"
        )
        logger.info(
            f"[OOT_CALENDAR] OOT période : {oot_df[date_col].min().date()} → "
            f"{oot_df[date_col].max().date()} ({calendar_gap // 30} mois de gap)"
        )

        return X_train, X_val, X_oot, y_train, y_val, y_oot

    def prepare_data(
        self,
        df: pd.DataFrame,
        target_col: str = "TARGET",
        test_size: float = 0.20,
        val_size: float = 0.15,
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame,
               pd.Series, pd.Series, pd.Series]:
        """
        Prépare les données avec split stratifié Train/Val/Test.
        
        Args:
            df: DataFrame avec features et target
            target_col: Nom de la colonne cible
            test_size: Proportion du jeu de test
            val_size: Proportion du jeu de validation (sur le train restant)
            
        Returns:
            X_train, X_val, X_test, y_train, y_val, y_test
        """
        # Identification des features
        feature_cols = [
            c for c in df.columns
            if c not in EXCLUDE_COLUMNS
            and df[c].dtype in ['int64', 'float64', 'int32', 'float32', 'bool', 'category']
        ]
        self.feature_names = feature_cols

        X = df[feature_cols]
        y = df[target_col]

        logger.info(
            f"Features: {len(feature_cols)} colonnes, "
            f"Target distribution: {y.value_counts().to_dict()}"
        )

        # Split stratifié : Test holdout
        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )

        # Split stratifié : Train / Validation
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, test_size=val_size, random_state=42, stratify=y_temp
        )

        logger.info(
            f"Splits — Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}"
        )
        logger.info(
            f"Default rates — Train: {y_train.mean():.2%}, "
            f"Val: {y_val.mean():.2%}, Test: {y_test.mean():.2%}"
        )

        return X_train, X_val, X_test, y_train, y_val, y_test

    def train(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_val: pd.DataFrame,
        y_val: pd.Series,
        early_stopping_rounds: int = 200,
    ) -> lgb.LGBMClassifier:
        """
        Entraîne le modèle LightGBM avec early stopping.
        """
        logger.info("Démarrage de l'entraînement LightGBM...")

        # Ajustement scale_pos_weight pour données déséquilibrées
        n_positive = y_train.sum()
        n_negative = len(y_train) - n_positive
        if n_positive > 0:
            self.params["scale_pos_weight"] = n_negative / n_positive
            if "is_unbalance" in self.params:
                self.params.pop("is_unbalance")
            logger.info(f"scale_pos_weight ajusté à {self.params['scale_pos_weight']:.2f}")

        # Création du modèle brut
        base_model = lgb.LGBMClassifier(**self.params)

        # Conversion des colonnes catégorielles
        cat_features = [
            col for col in X_train.columns
            if X_train[col].dtype.name == 'category'
        ]

        # Entraînement avec early stopping sur modèle brut
        fit_params = {
            "eval_set": [(X_val, y_val)],
            "callbacks": [
                lgb.early_stopping(stopping_rounds=early_stopping_rounds),
                lgb.log_evaluation(period=200),
            ],
        }

        if cat_features:
            fit_params["categorical_feature"] = cat_features

        logger.info("Entraînement du modèle brut...")
        base_model.fit(X_train, y_train, **fit_params)

        val_pred_base = base_model.predict_proba(X_val)[:, 1]
        base_auc = roc_auc_score(y_val, val_pred_base)
        base_brier = brier_score_loss(y_val, val_pred_base)

        logger.info(f"Modèle Brut — AUC: {base_auc:.4f}, Brier: {base_brier:.4f}")

        # Calibration Isotonique (Validation Empirique)
        logger.info("Entraînement de la surcouche Calibrator (Isotonic)...")
        try:
            # sklearn >= 1.6: FrozenEstimator preserves already-fitted model through CV splits
            from sklearn.frozen import FrozenEstimator
            calibrated_model = CalibratedClassifierCV(FrozenEstimator(base_model), method='isotonic', cv=5)
        except ImportError:
            # sklearn < 1.6: cv='prefit' is the old API
            calibrated_model = CalibratedClassifierCV(base_model, method='isotonic', cv='prefit')
        calibrated_model.fit(X_val, y_val)

        # Tester le modèle calibré sur le training set (par proxy) pour voir l'impact, 
        # Ou en réalité, the true test set will be used later. Let's record the improvement.
        train_pred_calibrated = calibrated_model.predict_proba(X_train)[:, 1]
        val_pred_calibrated = calibrated_model.predict_proba(X_val)[:, 1]
        
        calib_auc = roc_auc_score(y_val, val_pred_calibrated)
        calib_brier = brier_score_loss(y_val, val_pred_calibrated)

        logger.info(f"Modèle Calibré — AUC: {calib_auc:.4f}, Brier: {calib_brier:.4f}")

        # Règle de décision : la calibration est-elle empiriquement stable ?
        auc_drop = base_auc - calib_auc
        brier_improvement = base_brier - calib_brier

        if brier_improvement > 0 and auc_drop < 0.02:
            logger.info("✅ Calibration retenue : Amélioration Brier validée sans chute d'AUC critique.")
            self.model = calibrated_model
        else:
            logger.warning("❌ Calibration rejetée : Dégradation des performances. On conserve le modèle brut.")
            self.model = base_model

        # Metadata d'entraînement (on enregistre celles du modèle retenu)
        best_iteration = base_model.best_iteration_
        
        train_pred_final = self.model.predict_proba(X_train)[:, 1]
        val_pred_final = self.model.predict_proba(X_val)[:, 1]

        self.training_metadata = {
            "model_type": "LightGBM + IsotonicCalibration" if self.model == calibrated_model else "LightGBM Brut",
            "n_features": len(self.feature_names),
            "n_train_samples": len(X_train),
            "n_val_samples": len(X_val),
            "best_iteration": best_iteration,
            "train_auc": round(roc_auc_score(y_train, train_pred_final), 6),
            "val_auc": round(roc_auc_score(y_val, val_pred_final), 6),
            "train_brier": round(brier_score_loss(y_train, train_pred_final), 6),
            "val_brier": round(brier_score_loss(y_val, val_pred_final), 6),
            "train_logloss": round(log_loss(y_train, train_pred_final), 6),
            "val_logloss": round(log_loss(y_val, val_pred_final), 6),
            "default_rate_train": round(y_train.mean(), 6),
            "hyperparameters": self.params,
            "categorical_features": cat_features,
            "is_calibrated": self.model == calibrated_model,
            "training_timestamp": datetime.utcnow().isoformat(),
        }

        logger.info(
            f"Entraînement terminé — "
            f"Modèle Final: {self.training_metadata['model_type']}, "
            f"Val AUC: {self.training_metadata['val_auc']:.4f}, "
            f"Val Brier: {self.training_metadata['val_brier']:.4f}"
        )

        return self.model

    def cross_validate(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        n_folds: int = 5,
        compute_feature_stability: bool = True,
    ) -> Dict:
        """
        Validation croisée stratifiée avec analyse de stabilité des feature importances.

        En plus des métriques AUC/Brier par fold, calcule :
        - Importance moyenne par feature sur les N folds
        - CV (coefficient de variation) de l'importance par feature
        - Features instables : CV > 50% signale une importance peu fiable
          (la feature contribue de façon inconsistante selon l'échantillon)

        Une feature avec CV > 50% sur son importance devrait être examinée :
        elle peut capter du bruit plutôt qu'un signal stable, ce qui fragilise
        la fiabilité des SHAP drivers pour les adverse action codes.
        """
        skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42)
        fold_results = []
        fold_importances: List[np.ndarray] = []

        for fold_idx, (train_idx, val_idx) in enumerate(skf.split(X, y)):
            X_fold_train = X.iloc[train_idx]
            y_fold_train = y.iloc[train_idx]
            X_fold_val = X.iloc[val_idx]
            y_fold_val = y.iloc[val_idx]

            model = lgb.LGBMClassifier(**self.params)
            model.fit(
                X_fold_train, y_fold_train,
                eval_set=[(X_fold_val, y_fold_val)],
                callbacks=[
                    lgb.early_stopping(stopping_rounds=50),
                    lgb.log_evaluation(period=0),
                ],
            )

            val_pred = model.predict_proba(X_fold_val)[:, 1]
            auc = roc_auc_score(y_fold_val, val_pred)
            brier = brier_score_loss(y_fold_val, val_pred)

            fold_results.append({"fold": fold_idx, "auc": auc, "brier": brier})
            logger.info(f"Fold {fold_idx}: AUC={auc:.4f}, Brier={brier:.4f}")

            if compute_feature_stability and hasattr(model, "feature_importances_"):
                imps = model.feature_importances_.astype(float)
                total = imps.sum()
                fold_importances.append(imps / total if total > 0 else imps)

        results_df = pd.DataFrame(fold_results)
        cv_summary = {
            "mean_auc":   round(results_df["auc"].mean(), 6),
            "std_auc":    round(results_df["auc"].std(), 6),
            "mean_brier": round(results_df["brier"].mean(), 6),
            "std_brier":  round(results_df["brier"].std(), 6),
            "n_folds":    n_folds,
            "fold_details": fold_results,
        }

        # ── Stabilité des feature importances ──────────────────────────────
        if fold_importances and len(fold_importances) == n_folds:
            imp_matrix = np.stack(fold_importances, axis=0)  # (n_folds, n_features)
            mean_imp = imp_matrix.mean(axis=0)
            std_imp  = imp_matrix.std(axis=0)
            # Coefficient de variation : std/mean (robuste uniquement si mean > 0)
            cv_imp = np.where(mean_imp > 1e-6, std_imp / mean_imp, 0.0)

            feature_stability = []
            cols = list(X.columns)
            for i, feat in enumerate(cols):
                feature_stability.append({
                    "feature":       feat,
                    "mean_importance": round(float(mean_imp[i]), 6),
                    "std_importance":  round(float(std_imp[i]), 6),
                    "cv_importance":   round(float(cv_imp[i]), 4),
                    "stable":          bool(cv_imp[i] < 0.50),
                })

            feature_stability.sort(key=lambda x: x["mean_importance"], reverse=True)
            unstable = [f for f in feature_stability if not f["stable"]]

            cv_summary["feature_importance_stability"] = {
                "n_features":         len(cols),
                "n_unstable":         len(unstable),
                "unstable_features":  [f["feature"] for f in unstable[:10]],
                "top_stable_features": feature_stability[:20],
                "stability_rate":     round(1 - len(unstable) / max(len(cols), 1), 4),
            }

            if unstable:
                logger.warning(
                    f"[FEATURE_STABILITY] {len(unstable)} features instables (CV > 50%) : "
                    f"{[f['feature'] for f in unstable[:5]]}... "
                    "Ces features peuvent capturer du bruit — vérifier leur pertinence métier."
                )
            logger.info(
                f"[FEATURE_STABILITY] {len(cols) - len(unstable)}/{len(cols)} features stables "
                f"(CV < 50%) | Taux de stabilité: {cv_summary['feature_importance_stability']['stability_rate']:.1%}"
            )

        logger.info(
            f"CV Results — AUC: {cv_summary['mean_auc']:.4f} ± {cv_summary['std_auc']:.4f}"
        )
        return cv_summary

    def get_feature_importance(self, importance_type: str = "gain") -> pd.DataFrame:
        """
        Retourne l'importance des features (pour XAI / explainability).
        """
        if self.model is None:
            raise ValueError("Modèle non entraîné")

        # Gérer le cas où le modèle est de type CalibratedClassifierCV (qui n'a pas feature_importances_ en surface)
        try:
            if hasattr(self.model, 'estimator'):
                importance = self.model.estimator.feature_importances_
            elif hasattr(self.model, 'calibrated_classifiers_'):
                importance = self.model.calibrated_classifiers_[0].estimator.feature_importances_
            else:
                importance = self.model.feature_importances_
        except Exception:
            importance = np.zeros(len(self.feature_names))

        fi_df = pd.DataFrame({
            "feature": self.feature_names,
            "importance": importance,
        }).sort_values("importance", ascending=False)

        fi_df["importance_normalized"] = fi_df["importance"] / fi_df["importance"].sum()
        fi_df["cumulative_importance"] = fi_df["importance_normalized"].cumsum()

        return fi_df

    def save_model(self, model_name: str = "pd_model_v1") -> str:
        """
        Sauvegarde complète du modèle + metadata pour reproductibilité.
        
        Crée :
        - {model_name}.pkl (modèle sérialisé)
        - {model_name}_metadata.json (metadata d'entraînement)
        - {model_name}_features.json (liste des features)
        """
        if self.model is None:
            raise ValueError("Aucun modèle à sauvegarder")

        # Format natif LightGBM .txt (cross-language, auditabilité MRM, conforme §1)
        # Priorité sur pickle pour la validation externe.
        try:
            lgb_path = os.path.join(self.model_dir, f"{model_name}.txt")
            base_estimator = self.model.estimator if hasattr(self.model, 'estimator') else self.model
            if hasattr(base_estimator, 'booster_'):
                base_estimator.booster_.save_model(lgb_path)
                logger.info(f"Booster LightGBM natif sauvegarde : {lgb_path}")
            else:
                logger.warning("Booster LightGBM non accessible — format natif non sauvegarde.")
        except Exception as _e:
            logger.warning(f"Save format natif LightGBM echoue : {_e}")

        # Format pickle — pipeline complet (calibrateur inclus)
        # NOTE : pickle est vulnérable à la désérialisation malveillante.
        # En PROD_CHAMPION : migrer vers format natif + calibrateur JSON séparé.
        model_path = os.path.join(self.model_dir, f"{model_name}.pkl")
        with open(model_path, "wb") as f:
            pickle.dump(self.model, f)

        # Compute SHA-256 of the serialized artifact for startup integrity verification
        with open(model_path, "rb") as f:
            artifact_sha256 = hashlib.sha256(f.read()).hexdigest()

        # Metadata (data_hash injecté par run_training_pipeline si disponible)
        meta_path = os.path.join(self.model_dir, f"{model_name}_metadata.json")
        metadata_serializable = self.training_metadata.copy()
        metadata_serializable["model_artifact_sha256"] = artifact_sha256
        params = metadata_serializable.get("hyperparameters", {})
        for k, v in params.items():
            if isinstance(v, np.integer):
                params[k] = int(v)
            elif isinstance(v, np.floating):
                params[k] = float(v)
        with open(meta_path, "w") as f:
            json.dump(metadata_serializable, f, indent=2, default=str)

        # Features
        features_path = os.path.join(self.model_dir, f"{model_name}_features.json")
        with open(features_path, "w") as f:
            json.dump({"features": self.feature_names}, f, indent=2)

        logger.info(f"Modèle sauvegardé dans {self.model_dir} (SHA-256: {artifact_sha256[:16]}…)")
        return model_path

    @staticmethod
    def validate_sk_id_monotonicity(df: pd.DataFrame, id_col: str = "SK_ID_CURR") -> Dict:
        """
        Vérifie que SK_ID_CURR est bien monotone croissant avec l'ordre de dépôt.

        Hypothèse du split temporel : SK_ID_CURR croît monotoniquement avec la date
        de soumission dans Home Credit. Si cette hypothèse est fausse (inversions),
        le split walk-forward introduit du leakage temporel caché.

        Returns:
            Dict avec {is_monotone, n_inversions, inversion_rate, safe_to_use_as_temporal_proxy}
        """
        if id_col not in df.columns:
            return {"error": f"Colonne '{id_col}' absente", "safe_to_use_as_temporal_proxy": False}

        ids = df[id_col].values
        n_inversions = int((np.diff(ids) < 0).sum())
        total_pairs = len(ids) - 1
        inversion_rate = n_inversions / total_pairs if total_pairs > 0 else 0.0
        is_monotone = n_inversions == 0

        if not is_monotone:
            logger.warning(
                f"[TEMPORAL_VALIDITY] SK_ID_CURR non-monotone : "
                f"{n_inversions} inversions ({inversion_rate:.2%}) sur {total_pairs} paires. "
                "Le split walk-forward peut introduire du leakage temporel."
            )
        else:
            logger.info(
                f"[TEMPORAL_VALIDITY] SK_ID_CURR monotone confirmé sur {len(ids)} obs. "
                "Proxy chronologique valide pour le split walk-forward."
            )

        return {
            "id_column": id_col,
            "n_observations": int(len(ids)),
            "n_inversions": n_inversions,
            "inversion_rate": round(inversion_rate, 6),
            "is_monotone": is_monotone,
            "safe_to_use_as_temporal_proxy": inversion_rate < 0.001,
        }

    @staticmethod
    def seed_sensitivity_test(
        df: pd.DataFrame,
        target_col: str = "TARGET",
        seeds: Optional[List[int]] = None,
        n_estimators: int = 200,
    ) -> Dict:
        """
        Teste la sensibilité de l'AUC aux graines aléatoires.

        Un modèle robuste doit avoir un écart-type AUC < 0.005 sur 5 seeds
        différents. Un écart > 0.01 signale une instabilité liée à la
        variabilité du split ou au petit échantillon.

        Returns:
            Dict avec {mean_auc, std_auc, cv_auc (coefficient de variation),
                       seeds_results, stability_status}
        """
        seeds = seeds or [42, 7, 123, 99, 2024]
        logger.info(f"[SEED_SENSITIVITY] Test sur {len(seeds)} seeds : {seeds}")

        feature_cols = [
            c for c in df.columns
            if c not in EXCLUDE_COLUMNS
            and df[c].dtype in ['int64', 'float64', 'int32', 'float32', 'bool']
        ]
        X = df[feature_cols].fillna(0)
        y = df[target_col]

        results = []
        for seed in seeds:
            X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.20, random_state=seed, stratify=y)
            params = {**DEFAULT_PARAMS, "random_state": seed, "n_estimators": n_estimators, "verbose": -1}
            m = lgb.LGBMClassifier(**params)
            m.fit(X_tr, y_tr, eval_set=[(X_te, y_te)],
                  callbacks=[lgb.early_stopping(50, verbose=False), lgb.log_evaluation(0)])
            auc = roc_auc_score(y_te, m.predict_proba(X_te)[:, 1])
            results.append({"seed": seed, "auc": round(auc, 6)})
            logger.info(f"  Seed {seed:5d} → AUC={auc:.4f}")

        aucs = [r["auc"] for r in results]
        mean_auc = float(np.mean(aucs))
        std_auc = float(np.std(aucs))
        cv_auc = std_auc / mean_auc if mean_auc > 0 else 0.0

        status = "STABLE" if std_auc < 0.005 else "WARNING" if std_auc < 0.01 else "UNSTABLE"

        summary = {
            "mean_auc": round(mean_auc, 6),
            "std_auc": round(std_auc, 6),
            "cv_auc": round(cv_auc, 6),
            "min_auc": round(float(min(aucs)), 6),
            "max_auc": round(float(max(aucs)), 6),
            "stability_status": status,
            "seeds_results": results,
        }

        logger.info(
            f"[SEED_SENSITIVITY] AUC={mean_auc:.4f} ± {std_auc:.4f} | "
            f"CV={cv_auc:.3f} | Status={status}"
        )
        return summary

    def load_model(self, model_name: str = "pd_model_v1") -> lgb.LGBMClassifier:
        """Charge un modèle sauvegardé."""
        model_path = os.path.join(self.model_dir, f"{model_name}.pkl")
        with open(model_path, "rb") as f:
            self.model = pickle.load(f)

        features_path = os.path.join(self.model_dir, f"{model_name}_features.json")
        with open(features_path, "r") as f:
            self.feature_names = json.load(f)["features"]

        meta_path = os.path.join(self.model_dir, f"{model_name}_metadata.json")
        if os.path.exists(meta_path):
            with open(meta_path, "r") as f:
                self.training_metadata = json.load(f)

        logger.info(f"Modèle chargé depuis {model_path}")
        return self.model


class PDXGBTrainer(PDModelTrainer):
    """
    Entraîneur XGBoost avec contraintes de monotonicité réglementaires.

    Cible PROD_CHAMPION selon MODEL_GOVERNANCE_SPEC §1 :
    - tree_method=hist (déterministe)
    - monotone_constraints sur ratios financiers clés
    - max_depth=6 (limite overfitting marchés émergents)
    - Sérialisation JSON (cross-language, auditble par les régulateurs)

    Remplace PDModelTrainer (LightGBM) pour la promotion CHALLENGER→CHAMPION.
    """

    def __init__(self, params: Optional[Dict] = None, model_dir: Optional[str] = None):
        if not XGBOOST_AVAILABLE:
            raise ImportError("xgboost requis. pip install xgboost>=2.0")
        super().__init__(params or XGBOOST_PARAMS.copy(), model_dir)
        self._xgb_booster: Optional[xgb.XGBClassifier] = None

    def _build_monotone_constraints(self, feature_names: List[str]) -> Dict[str, int]:
        """Retourne les contraintes de monotonicité pour les features présentes."""
        return {f: v for f, v in MONOTONE_CONSTRAINTS.items() if f in feature_names}

    def train(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_val: pd.DataFrame,
        y_val: pd.Series,
        early_stopping_rounds: int = 50,
    ) -> xgb.XGBClassifier:
        """
        Entraîne XGBoost avec contraintes de monotonicité + early stopping.
        Calibration isotonique appliquée si Brier s'améliore.
        """
        constraints = self._build_monotone_constraints(list(X_train.columns))
        logger.info(f"Contraintes monotones actives : {list(constraints.keys())} ({len(constraints)} features)")

        params = {**self.params, "monotone_constraints": constraints}

        # XGBoost 3.x ne supporte pas le dtype 'category' pandas.
        # Convertir en float avant de passer au modèle (codes numériques).
        def _encode_cats(df: pd.DataFrame) -> pd.DataFrame:
            df = df.copy()
            for col in df.select_dtypes(include="category").columns:
                df[col] = df[col].cat.codes.astype(float)
            return df

        X_train_xgb = _encode_cats(X_train)
        X_val_xgb   = _encode_cats(X_val)

        # XGBoost ≥ 2.0 : early_stopping_rounds passe dans le constructeur, pas dans fit().
        base_model = xgb.XGBClassifier(
            early_stopping_rounds=early_stopping_rounds,
            **{k: v for k, v in params.items() if k not in ("eval_metric",)}
        )

        base_model.fit(
            X_train_xgb, y_train,
            eval_set=[(X_val_xgb, y_val)],
            verbose=False,
        )

        # Remplacer X_train/X_val par les versions encodées pour la suite
        X_train, X_val = X_train_xgb, X_val_xgb

        val_pred_base = base_model.predict_proba(X_val)[:, 1]
        base_auc = roc_auc_score(y_val, val_pred_base)
        base_brier = brier_score_loss(y_val, val_pred_base)
        logger.info(f"XGBoost brut — AUC: {base_auc:.4f}, Brier: {base_brier:.4f}")

        # Calibration isotonique (même logique que LightGBM trainer)
        try:
            from sklearn.frozen import FrozenEstimator
            calibrated = CalibratedClassifierCV(FrozenEstimator(base_model), method='isotonic', cv=5)
        except ImportError:
            calibrated = CalibratedClassifierCV(base_model, method='isotonic', cv='prefit')
        calibrated.fit(X_val, y_val)
        val_pred_calib = calibrated.predict_proba(X_val)[:, 1]
        calib_brier = brier_score_loss(y_val, val_pred_calib)
        calib_auc = roc_auc_score(y_val, val_pred_calib)

        use_calibrated = (calib_brier < base_brier) and (base_auc - calib_auc < 0.02)
        self.model = calibrated if use_calibrated else base_model
        self._xgb_booster = base_model  # conservé pour save JSON

        val_pred_final = self.model.predict_proba(X_val)[:, 1]
        train_pred_final = self.model.predict_proba(X_train)[:, 1]

        self.training_metadata = {
            "model_type": "XGBoost + IsotonicCalibration" if use_calibrated else "XGBoost",
            "framework": "xgboost",
            "n_features": len(self.feature_names),
            "n_train_samples": len(X_train),
            "n_val_samples": len(X_val),
            "best_iteration": base_model.best_iteration,
            "train_auc": round(roc_auc_score(y_train, train_pred_final), 6),
            "val_auc": round(roc_auc_score(y_val, val_pred_final), 6),
            "train_brier": round(brier_score_loss(y_train, train_pred_final), 6),
            "val_brier": round(brier_score_loss(y_val, val_pred_final), 6),
            "train_logloss": round(log_loss(y_train, train_pred_final), 6),
            "val_logloss": round(log_loss(y_val, val_pred_final), 6),
            "default_rate_train": round(y_train.mean(), 6),
            "hyperparameters": {k: v for k, v in params.items() if k != "monotone_constraints"},
            "monotone_constraints": constraints,
            "is_calibrated": use_calibrated,
            "training_timestamp": datetime.utcnow().isoformat(),
        }

        logger.info(
            f"XGBoost {'calibré' if use_calibrated else 'brut'} — "
            f"Val AUC: {self.training_metadata['val_auc']:.4f}, "
            f"Val Brier: {self.training_metadata['val_brier']:.4f}"
        )
        return self.model

    def save_model(self, model_name: str = "pd_model_xgb_v1") -> str:
        """
        Sauvegarde double format :
        - .pkl  : artefact Python complet (calibrateur + wrapper sklearn)
        - .json : booster XGBoost natif (cross-language, conforme MODEL_GOVERNANCE_SPEC §1)
        """
        if self.model is None:
            raise ValueError("Aucun modèle à sauvegarder")

        # Format pickle (pipeline sklearn complet avec calibrateur)
        model_path = os.path.join(self.model_dir, f"{model_name}.pkl")
        with open(model_path, "wb") as f:
            pickle.dump(self.model, f)

        # SHA-256 de l'artefact (integrity check au startup FastAPI)
        with open(model_path, "rb") as f:
            artifact_sha256 = hashlib.sha256(f.read()).hexdigest()

        # Format JSON natif XGBoost (auditabilité cross-language)
        if self._xgb_booster is not None:
            json_path = os.path.join(self.model_dir, f"{model_name}.json")
            self._xgb_booster.save_model(json_path)
            logger.info(f"Booster JSON sauvegardé : {json_path}")

        # Metadata
        meta_path = os.path.join(self.model_dir, f"{model_name}_metadata.json")
        metadata_serializable = self.training_metadata.copy()
        metadata_serializable["model_artifact_sha256"] = artifact_sha256
        with open(meta_path, "w") as f:
            json.dump(metadata_serializable, f, indent=2, default=str)

        logger.info(f"Artefact SHA-256 : {artifact_sha256[:16]}...")

        # Features
        features_path = os.path.join(self.model_dir, f"{model_name}_features.json")
        with open(features_path, "w") as f:
            json.dump({"features": self.feature_names}, f, indent=2)

        logger.info(f"Modèle XGBoost sauvegardé dans {self.model_dir} (pkl + json)")
        return model_path

    def cross_validate(self, X: pd.DataFrame, y: pd.Series, n_folds: int = 5) -> Dict:
        """CV 5-folds XGBoost — override nécessaire car la classe parente utilise LightGBM."""
        from sklearn.model_selection import StratifiedKFold

        def _encode_cats(df: pd.DataFrame) -> pd.DataFrame:
            df = df.copy()
            for col in df.select_dtypes(include="category").columns:
                df[col] = df[col].cat.codes.astype(float)
            return df

        skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42)
        fold_results = []

        for fold_idx, (train_idx, val_idx) in enumerate(skf.split(X, y)):
            X_tr = _encode_cats(X.iloc[train_idx])
            y_tr = y.iloc[train_idx]
            X_vl = _encode_cats(X.iloc[val_idx])
            y_vl = y.iloc[val_idx]

            m = xgb.XGBClassifier(
                early_stopping_rounds=30,
                **{k: v for k, v in XGBOOST_PARAMS.items() if k != "eval_metric"}
            )
            m.fit(X_tr, y_tr, eval_set=[(X_vl, y_vl)], verbose=False)
            auc   = roc_auc_score(y_vl, m.predict_proba(X_vl)[:, 1])
            brier = brier_score_loss(y_vl, m.predict_proba(X_vl)[:, 1])
            fold_results.append({"fold": fold_idx, "auc": round(auc, 6), "brier": round(brier, 6)})
            logger.info(f"XGB CV Fold {fold_idx}: AUC={auc:.4f}, Brier={brier:.4f}")

        results_df = pd.DataFrame(fold_results)
        summary = {
            "mean_auc":   round(float(results_df["auc"].mean()), 6),
            "std_auc":    round(float(results_df["auc"].std()), 6),
            "mean_brier": round(float(results_df["brier"].mean()), 6),
            "std_brier":  round(float(results_df["brier"].std()), 6),
            "n_folds":    n_folds,
            "fold_details": fold_results,
        }
        logger.info(f"XGB CV: AUC={summary['mean_auc']:.4f} +/- {summary['std_auc']:.4f}")
        return summary

    def get_feature_importance(self, importance_type: str = "gain") -> pd.DataFrame:
        """Importance des features XGBoost (gain-based pour SHAP-alignment)."""
        if self._xgb_booster is None:
            raise ValueError("Modèle XGBoost non entraîné")
        scores = self._xgb_booster.get_booster().get_score(importance_type=importance_type)
        fi_df = pd.DataFrame(
            [{"feature": k, "importance": v} for k, v in scores.items()]
        ).sort_values("importance", ascending=False)
        fi_df["importance_normalized"] = fi_df["importance"] / fi_df["importance"].sum()
        fi_df["cumulative_importance"] = fi_df["importance_normalized"].cumsum()
        return fi_df


def run_training_pipeline(
    data_path: Optional[str] = None,
    model_name: str = "pd_model_v2",
    model_type: str = "lightgbm",
    use_temporal_split: bool = True,
    run_cross_validation: bool = False,
    run_seed_sensitivity: bool = False,
    # ── Domain Adaptation (Stratégie B) ──────────────────────────────────────
    cemac_data_path: Optional[str] = None,
    cemac_weight_multiplier: float = 10.0,
    # ── CEMAC Synthetic Generation ────────────────────────────────────────────
    generate_cemac_synthetic: bool = False,
    cemac_n_samples: int = 50_000,
) -> Dict:
    """
    Pipeline complet d'entrainement PD Model.

    Args:
        data_path:             Chemin explicite vers le dataset. Si None, résolution automatique.
        model_name:            Nom de l'artefact sauvegardé.
        model_type:            'lightgbm' (démonstration) ou 'xgboost' (cible PROD_CHAMPION).
        use_temporal_split:    Si True, split walk-forward chronologique (recommandé).
                               Si False, split aléatoire stratifié (legacy — leakage possible).
        run_cross_validation:  Si True, exécute une CV 5-folds pour estimation robuste.
        run_seed_sensitivity:  Si True, exécute le test de sensibilité aux seeds (5 seeds).

    Etapes :
    1. Chargement des données (ABT curated ou raw + feature engineering)
    2. Hash SHA-256 du dataset (reproductibilité / audit trail)
    3. Validation monotonie SK_ID_CURR (proxy temporel)
    4. Split Train/Val/Test (temporel par défaut)
    5. Entraînement LightGBM ou XGBoost selon model_type
    6. Validation avancée (AUC, Gini, KS, calibration sur X_TEST, deciles)
    7. Calibration évaluée sur X_test — indépendant du jeu d'entraînement calibration
    8. [Optionnel] Cross-validation 5 folds
    9. [Optionnel] Seed sensitivity test
    10. Sauvegarde modèle + metadata avec data_hash
    """
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

    # ── Génération auto du dataset CEMAC synthétique si demandé ──────────────
    if generate_cemac_synthetic:
        logger.info("[CEMAC] Génération du dataset synthétique CEMAC...")
        try:
            cemac_gen_path = os.path.join(
                os.path.dirname(__file__), "..", "..",
                "01_data_layer", "cemac_synthetic", "cemac_generator.py"
            )
            import importlib.util as _ilu
            _spec = _ilu.spec_from_file_location("cemac_generator", cemac_gen_path)
            _mod  = _ilu.module_from_spec(_spec)
            _spec.loader.exec_module(_mod)
            _gen = _mod.CemacSyntheticGenerator(seed=42)
            _, _cemac_path = _gen.generate_and_save(n_samples=cemac_n_samples)
            logger.info(f"[CEMAC] Dataset synthétique généré : {_cemac_path}")
            if data_path is None:
                data_path = _cemac_path
                logger.info("[CEMAC] Dataset CEMAC synthétique utilisé comme source principale.")
        except Exception as _e:
            logger.error(f"[CEMAC] Génération synthétique échouée : {_e}")

    # Smart data resolution chain
    base_dir = os.path.join(os.path.dirname(__file__), "..", "..")
    candidate_paths = [
        data_path,
        # CEMAC synthétique généré précédemment
        os.path.join(base_dir, "01_data_layer", "curated", "cemac_synthetic.parquet"),
        os.path.join(base_dir, "01_data_layer", "curated", "curated_dataset.parquet"),
        os.path.join(base_dir, "01_data_layer", "curated", "modeling_base_table.parquet"),
        os.path.join(base_dir, "01_data_layer", "curated", "curated_dataset.csv"),
        os.path.join(base_dir, "application_train.csv"),
        os.path.join(base_dir, "01_data_layer", "raw", "application_train.csv"),
    ]

    df = None
    resolved_path = None
    for path in candidate_paths:
        if path and os.path.exists(path):
            logger.info(f"Loading data from: {path}")
            resolved_path = path
            if path.endswith(".parquet"):
                df = pd.read_parquet(path)
            else:
                df = pd.read_csv(path)
            break

    if df is None:
        raise FileNotFoundError("No data source found. Run the ABT builder first.")

    # ── Hash SHA-256 pour reproductibilité (lien artefact ↔ snapshot data) ──
    data_hash = compute_data_hash(df)
    logger.info(f"Data hash (SHA-256 partiel): {data_hash} | Shape: {df.shape} | Source: {resolved_path}")

    # ── Validation monotonie SK_ID_CURR (proxy temporel) ─────────────────────
    # Vérifie que le tri chronologique proxy est valide avant le split walk-forward.
    # Si SK_ID_CURR n'est pas monotone, le split est biaisé et le leakage temporel
    # est possible. Ce check est enregistré dans les metadata pour l'audit MRM.
    monotonicity_check = PDModelTrainer.validate_sk_id_monotonicity(df)
    logger.info(f"[MONOTONICITY] SK_ID_CURR proxy check: {monotonicity_check}")
    if not monotonicity_check.get("safe_to_use_as_temporal_proxy", True):
        logger.error(
            "[MONOTONICITY] ⚠️ SK_ID_CURR présente trop d'inversions pour être un proxy "
            "temporel fiable. Fournir une colonne de date explicite via temporal_col=."
        )

    # Apply feature engineering if loading raw data
    if 'DEBT_TO_INCOME' not in df.columns and 'AMT_ANNUITY' in df.columns:
        logger.info("Applying feature engineering on raw data...")
        try:
            from importlib import import_module
            fe = import_module("01_data_layer.feature_store.feature_engineering")
            engineer = fe.BankFeatureEngineer()
            df = engineer.transform(df)
        except Exception as e:
            logger.warning(f"Feature engineering not available: {e}")

    logger.info(f"Donnees chargees: {df.shape}")

    # ── Sélection du trainer selon model_type ─────────────────────────────────
    if model_type == "xgboost":
        if not XGBOOST_AVAILABLE:
            logger.warning("XGBoost non disponible, bascule vers LightGBM. pip install xgboost")
            trainer: PDModelTrainer = PDModelTrainer()
        else:
            trainer = PDXGBTrainer()
            logger.info("Trainer XGBoost sélectionné (cible PROD_CHAMPION)")
    else:
        trainer = PDModelTrainer()
        logger.info("Trainer LightGBM sélectionné (démonstration)")

    # ── Split des données ─────────────────────────────────────────────────────
    if use_temporal_split:
        logger.info("Split walk-forward chronologique (leakage-safe)")
        X_train, X_val, X_test, y_train, y_val, y_test = trainer.prepare_data_temporal(df)
    else:
        logger.warning(
            "Split aléatoire stratifié utilisé. "
            "ATTENTION : risque de leakage temporel sur données chronologiques."
        )
        X_train, X_val, X_test, y_train, y_val, y_test = trainer.prepare_data(df)

    # ── Stratégie B : mixing avec données CEMAC réelles (si fournies) ─────────
    sample_weights_train = None
    cemac_mixing_meta: Dict = {"strategy": "none"}

    if cemac_data_path and os.path.exists(cemac_data_path):
        logger.info(f"[DOMAIN_ADAPT] Chargement données CEMAC réelles : {cemac_data_path}")
        try:
            sys.path.insert(0, os.path.dirname(__file__))
            from two_stage_trainer import create_mixed_dataset, build_sample_weights

            if cemac_data_path.endswith(".parquet"):
                df_cemac = pd.read_parquet(cemac_data_path)
            else:
                df_cemac = pd.read_csv(cemac_data_path)

            # Colonnes de contexte CEMAC à exclure de l'entraînement
            df_cemac = df_cemac[[c for c in df_cemac.columns if not c.startswith("_")]]

            # Aligner les colonnes avec le dataset principal
            common_features = [f for f in trainer.feature_names if f in df_cemac.columns]
            X_cemac_train = df_cemac[common_features].fillna(0)
            y_cemac_train = df_cemac["TARGET"] if "TARGET" in df_cemac.columns else pd.Series(np.zeros(len(df_cemac)))

            # Concaténer : Home Credit (w=1) + CEMAC réel (w=cemac_weight_multiplier)
            n_hc = len(X_train)
            n_cemac = len(X_cemac_train)
            X_train = pd.concat([X_train[common_features], X_cemac_train], ignore_index=True)
            y_train = pd.concat([y_train, y_cemac_train], ignore_index=True)
            sample_weights_train, cemac_mixing_meta = build_sample_weights(
                n_home_credit=n_hc,
                n_cemac=n_cemac,
                cemac_weight_multiplier=cemac_weight_multiplier,
            )
            cemac_mixing_meta["strategy"] = "B_sample_weighted"
            cemac_mixing_meta["cemac_data_path"] = cemac_data_path

            logger.info(
                f"[DOMAIN_ADAPT] Strategy B activée — "
                f"Home Credit: {n_hc:,} (w=1.0) | CEMAC réel: {n_cemac:,} (w={cemac_weight_multiplier}) | "
                f"Ratio effectif CEMAC: {cemac_mixing_meta['effective_cemac_ratio']:.1%}"
            )
        except Exception as _e:
            logger.error(f"[DOMAIN_ADAPT] Mixing CEMAC échoué : {_e}. Entraînement sans mixing.")

    trainer.train(X_train, y_train, X_val, y_val)

    # Injecter le hash dans les metadata avant sauvegarde
    trainer.training_metadata["data_hash_sha256"] = data_hash
    trainer.training_metadata["data_source_path"] = str(resolved_path)
    trainer.training_metadata["split_strategy"] = "temporal_walkforward" if use_temporal_split else "random_stratified"
    trainer.training_metadata["model_type_requested"] = model_type
    trainer.training_metadata["default_definition"] = DEFAULT_DEFINITION
    trainer.training_metadata["sk_id_monotonicity_check"] = monotonicity_check
    trainer.training_metadata["domain_adaptation"] = cemac_mixing_meta
    # Artifact category : déterminé par la source de données
    if "cemac_synthetic" in str(resolved_path):
        trainer.training_metadata["artifact_category"] = "SYNTHETIC_CEMAC"
    elif cemac_data_path and cemac_mixing_meta.get("strategy") != "none":
        trainer.training_metadata["artifact_category"] = "MIXED_CEMAC_REAL"
    else:
        trainer.training_metadata["artifact_category"] = "DEMO_BASELINE"

    # ── Évaluation de calibration sur X_TEST (indépendant du jeu de calibration) ──
    # La calibration isotonique a été fittée sur X_val. Si on évalue seulement sur X_val,
    # on ne détecte pas l'overfit du calibrateur. X_test est ici un témoin indépendant.
    y_test_pred_for_calib = trainer.model.predict_proba(X_test)[:, 1]
    from sklearn.metrics import brier_score_loss as _brier
    test_brier_calib = _brier(y_test, y_test_pred_for_calib)
    val_brier_calib  = trainer.training_metadata.get("val_brier", None)
    calib_overfit_flag = False
    if val_brier_calib is not None:
        calib_overfit_flag = (test_brier_calib - val_brier_calib) > 0.005
        if calib_overfit_flag:
            logger.warning(
                f"[CALIBRATION] Overfit du calibrateur détecté : "
                f"Brier(val)={val_brier_calib:.4f} → Brier(test)={test_brier_calib:.4f} "
                f"(delta={test_brier_calib - val_brier_calib:+.4f}). "
                "Considérer cv='prefit' ou réduire le jeu de calibration."
            )
        else:
            logger.info(
                f"[CALIBRATION] Généralisation confirmée sur X_test : "
                f"Brier(val)={val_brier_calib:.4f}, Brier(test)={test_brier_calib:.4f}"
            )
    trainer.training_metadata["test_brier_calibration_check"] = {
        "test_brier": round(test_brier_calib, 6),
        "val_brier":  round(val_brier_calib, 6) if val_brier_calib else None,
        "overfit_flag": calib_overfit_flag,
    }

    # ── Cross-Validation (optionnelle) ────────────────────────────────────────
    if run_cross_validation:
        logger.info("[CV] Lancement de la validation croisée 5-folds...")
        X_full = pd.concat([X_train, X_val, X_test])
        y_full = pd.concat([y_train, y_val, y_test])
        cv_results = trainer.cross_validate(X_full, y_full, n_folds=5)
        trainer.training_metadata["cross_validation"] = cv_results
        logger.info(
            f"[CV] Résultat : AUC={cv_results['mean_auc']:.4f} ± {cv_results['std_auc']:.4f}"
        )

    # ── Seed Sensitivity Test (optionnel) ─────────────────────────────────────
    if run_seed_sensitivity:
        logger.info("[SEED] Test de sensibilité aux seeds (5 seeds)...")
        df_full = pd.concat([X_train, X_val, X_test], axis=0).copy()
        df_full["TARGET"] = pd.concat([y_train, y_val, y_test]).values
        seed_results = PDModelTrainer.seed_sensitivity_test(df_full)
        trainer.training_metadata["seed_sensitivity"] = seed_results
        logger.info(
            f"[SEED] Status={seed_results['stability_status']} | "
            f"AUC={seed_results['mean_auc']:.4f} ± {seed_results['std_auc']:.4f}"
        )

    # Save
    model_path = trainer.save_model(model_name)

    # ── MLflow Experiment Tracking ────────────────────────────────────────────
    # URI de tracking : MLFLOW_TRACKING_URI env var (priorité).
    # Exemples :
    #   SQLite local  : sqlite:///mlruns.db  (défaut si env var absente)
    #   Serveur dédié : http://mlflow.octaix.internal:5000
    #   Supabase/PG   : postgresql://user:pass@host/mlflow_db
    #   S3 + PG       : export MLFLOW_TRACKING_URI=http://mlflow-server:5000
    # Pour équipe distribuée : déployer un serveur MLflow central et définir
    # MLFLOW_TRACKING_URI dans les secrets GitHub Actions.
    try:
        import mlflow
        _tracking_uri = os.environ.get(
            "MLFLOW_TRACKING_URI",
            f"sqlite:///{os.path.join(os.path.dirname(__file__), 'mlflow.db')}"
        )
        mlflow.set_tracking_uri(_tracking_uri)
        logger.info(f"[MLflow] Tracking URI: {_tracking_uri}")
        mlflow.set_experiment(f"pd_model_{model_type}")
        with mlflow.start_run(run_name=f"{model_name}_{data_hash}"):
            meta = trainer.training_metadata
            # Params
            mlflow.log_param("model_type", model_type)
            mlflow.log_param("model_name", model_name)
            mlflow.log_param("split_strategy", meta.get("split_strategy", "unknown"))
            mlflow.log_param("data_hash_sha256", data_hash)
            mlflow.log_param("n_features", meta.get("n_features", 0))
            mlflow.log_param("n_train_samples", meta.get("n_train_samples", 0))
            mlflow.log_param("is_calibrated", meta.get("is_calibrated", False))
            # Metrics (training / validation)
            mlflow.log_metric("train_auc", meta.get("train_auc", 0))
            mlflow.log_metric("val_auc", meta.get("val_auc", 0))
            mlflow.log_metric("train_brier", meta.get("train_brier", 0))
            mlflow.log_metric("val_brier", meta.get("val_brier", 0))
            mlflow.log_metric("default_rate_train", meta.get("default_rate_train", 0))
            # Artifact
            mlflow.log_artifact(model_path, artifact_path="model")
            logger.info(
                f"[MLflow] Run logged — experiment=pd_model_{model_type}, "
                f"val_auc={meta.get('val_auc', 0):.4f}"
            )
    except Exception as mlflow_err:
        logger.warning(f"[MLflow] Tracking skipped: {mlflow_err}")

    # Feature importance
    fi = trainer.get_feature_importance()
    fi.to_csv(
        os.path.join(trainer.model_dir, f"{model_name}_feature_importance.csv"),
        index=False,
    )

    try:
        import sys
        sys.path.append(os.path.dirname(__file__))
        from advanced_validation import AdvancedModelValidator

        validator = AdvancedModelValidator(
            output_dir=os.path.join(trainer.model_dir, "validation")
        )

        y_test_pred = trainer.model.predict_proba(X_test)[:, 1]
        y_train_pred = trainer.model.predict_proba(X_train)[:, 1]

        # SK_ID_CURR comme proxy temporel pour la vintage analysis
        _id_proxy = None
        if "SK_ID_CURR" in X_test.columns:
            _id_proxy = X_test["SK_ID_CURR"].values
        elif hasattr(X_test, "index"):
            _id_proxy = X_test.index.values

        val_report = validator.run_full_validation(
            y_true=y_test.values if hasattr(y_test, 'values') else y_test,
            y_pred=y_test_pred,
            y_true_train=y_train.values if hasattr(y_train, 'values') else y_train,
            y_pred_train=y_train_pred,
            model_name=model_name,
            id_proxy=_id_proxy,
        )
        validator.save_report()

        logger.info(
            f"Validation: AUC={val_report['discrimination']['auc_roc']:.4f}, "
            f"Gini={val_report['discrimination']['gini']:.4f}, "
            f"KS={val_report['discrimination']['ks_statistic']:.4f}, "
            f"Brier={val_report['calibration']['brier_score']:.4f}"
        )

        trainer.training_metadata["test_metrics"] = {
            "auc": val_report["discrimination"]["auc_roc"],
            "gini": val_report["discrimination"]["gini"],
            "ks": val_report["discrimination"]["ks_statistic"],
            "brier": val_report["calibration"]["brier_score"],
            "grade": val_report["assessment"]["grade"],
        }

    except Exception as e:
        logger.warning(f"Advanced validation skipped: {e}")

    # --- Leakage Gate automatique ---
    try:
        sys.path.append(os.path.dirname(__file__))
        from leakage_detector import run_leakage_gate

        df_full_audit = pd.concat([X_train, X_val, X_test], axis=0).copy()
        df_full_audit["TARGET"] = pd.concat([y_train, y_val, y_test]).values
        leakage_gate_pass, leakage_report = run_leakage_gate(
            df_full_audit,
            output_dir=os.path.join(trainer.model_dir, "validation"),
        )
        trainer.training_metadata["leakage_gate"] = {
            "gate_pass": leakage_gate_pass,
            "signals": leakage_report.get("summary", {}).get("signals", {}),
            "promotion_gate_status": leakage_report.get("summary", {}).get("promotion_gate_status", ""),
        }
        if not leakage_gate_pass:
            logger.error(
                "[LEAKAGE GATE] ⛔ Promotion bloquée — investiguer les signaux de leakage "
                "dans le rapport avant de passer en CHALLENGER."
            )
    except Exception as e:
        logger.warning(f"Leakage gate skipped: {e}")

    # --- NOUVEAU : Audit de Fairness Automatique ---
    try:
        import sys
        sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "01_data_layer", "fairness_checks"))
        from fairness_validator import FairnessValidator

        fairness_val = FairnessValidator(
            output_dir=os.path.join(trainer.model_dir, "validation")
        )
        
        df_test = X_test.copy()
        
        fairness_report = fairness_val.run_full_fairness_audit(
            df=df_test,
            y_true=y_test.values if hasattr(y_test, 'values') else y_test,
            y_pred=y_test_pred,
            model_name=model_name
        )
        fairness_val.save_report(fairness_report)

        trainer.training_metadata["fairness"] = {
            "gate_status": fairness_report["summary"]["promotion_gate_status"],
            "underperforming_segments": fairness_report["summary"]["n_underperforming_segments"],
            "adverse_impact_flags": fairness_report["summary"]["n_adverse_impact_flags"]
        }
    except Exception as e:
        logger.warning(f"Fairness validation skipped: {e}")

    # ── Lifecycle auto-advance : DEV_ALPHA → CANDIDATE ───────────────────────
    # Le training positionne l'artefact en CANDIDATE si les gates passent.
    # L'avancement CANDIDATE → CHALLENGER nécessite un appel explicite
    # (CI gate ou décision humaine avec `python model_lifecycle.py --action advance`).
    try:
        lifecycle_path = os.path.join(os.path.dirname(__file__), "..", "..", "04_model_risk_management", "model_lifecycle.py")
        import importlib.util as _ilu
        _spec = _ilu.spec_from_file_location("model_lifecycle", lifecycle_path)
        _mlc  = _ilu.module_from_spec(_spec)
        _spec.loader.exec_module(_mlc)
        lifecycle_result = _mlc.auto_advance_lifecycle(model_name, actor="run_training_pipeline")
        trainer.training_metadata["lifecycle"] = lifecycle_result
        logger.info(f"[LIFECYCLE] {model_name}: {lifecycle_result.get('current_stage', 'unknown')}")
    except Exception as _lc_err:
        logger.warning(f"[LIFECYCLE] auto_advance skipped: {_lc_err}")

    return {
        "model_path": model_path,
        "training_metadata": trainer.training_metadata,
        "top_features": fi.head(10).to_dict("records"),
    }


if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(description="PD Model Training Pipeline")
    parser.add_argument("--model-type", choices=["lightgbm", "xgboost"], default="xgboost",
                        help="lightgbm (demo) ou xgboost (cible PROD_CHAMPION)")
    parser.add_argument("--model-name", default="pd_model_v2")
    parser.add_argument("--data-path", type=str, default=None,
                        help="Chemin explicite vers le dataset (Parquet ou CSV)")
    parser.add_argument("--no-temporal-split", action="store_true",
                        help="Désactive le split temporel (non recommandé)")
    parser.add_argument("--cross-validate", action="store_true",
                        help="Lance la validation croisée 5-folds après training")
    parser.add_argument("--seed-sensitivity", action="store_true",
                        help="Lance le test de sensibilité aux seeds (5 seeds)")
    # ── Domain Adaptation ────────────────────────────────────────────────────
    parser.add_argument("--cemac-data", type=str, default=None,
                        help="Chemin vers données CEMAC réelles (Stratégie B — mixing)")
    parser.add_argument("--cemac-weight", type=float, default=10.0,
                        help="Poids relatif des données CEMAC vs Home Credit (défaut: 10)")
    parser.add_argument("--generate-cemac", action="store_true",
                        help="Générer automatiquement des données synthétiques CEMAC avant training")
    parser.add_argument("--cemac-n-samples", type=int, default=50_000,
                        help="Nombre de dossiers CEMAC synthétiques à générer (défaut: 50 000)")
    args = parser.parse_args()

    try:
        results = run_training_pipeline(
            data_path=args.data_path,
            model_name=args.model_name,
            model_type=args.model_type,
            use_temporal_split=not args.no_temporal_split,
            run_cross_validation=args.cross_validate,
            run_seed_sensitivity=args.seed_sensitivity,
            cemac_data_path=args.cemac_data,
            cemac_weight_multiplier=args.cemac_weight,
            generate_cemac_synthetic=args.generate_cemac,
            cemac_n_samples=args.cemac_n_samples,
        )
        meta = results["training_metadata"]
        print(f"\n{'='*60}")
        print(f"PD Model Training Complete — {meta['model_type']}")
        print(f"{'='*60}")
        print(f"  Data hash:      {meta.get('data_hash_sha256', 'N/A')}")
        print(f"  Split strategy: {meta.get('split_strategy', 'N/A')}")
        print(f"  Train AUC: {meta['train_auc']:.4f}")
        print(f"  Val AUC:   {meta['val_auc']:.4f}")
        if "test_metrics" in meta:
            t = meta["test_metrics"]
            gini_ok = "[OK]" if t.get("gini", 0) >= 0.45 else "[SOUS LE FLOOR 45%]"
            print(f"  Test AUC:  {t['auc']:.4f}")
            print(f"  Test Gini: {t['gini']:.4f} {gini_ok}")
            print(f"  Test KS:   {t['ks']:.4f}")
            print(f"  Brier:     {t['brier']:.4f}")
            print(f"  Grade:     {t['grade']}")
        print(f"  Path: {results['model_path']}")
        if meta.get("monotone_constraints"):
            print(f"  Contraintes monotones : {len(meta['monotone_constraints'])} features")
    except FileNotFoundError as e:
        print(f"ERROR: {e}")
        print("Run: python 01_data_layer/abt_builder.py")

