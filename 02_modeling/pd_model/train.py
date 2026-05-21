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

# ─── Default Hyperparameters (optimisés pour crédit scoring) ────────────
DEFAULT_PARAMS = {
    "objective": "binary",
    "metric": ["auc", "binary_logloss"],
    "boosting_type": "gbdt",
    "n_estimators": 2000,
    "learning_rate": 0.02,
    "num_leaves": 63,
    "max_depth": 7,
    "min_child_samples": 50,     # Éviter overfitting sur petits segments
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
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
        early_stopping_rounds: int = 100,
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
    ) -> Dict:
        """
        Validation croisée stratifiée pour estimation robuste.
        """
        skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42)
        fold_results = []

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

        results_df = pd.DataFrame(fold_results)
        cv_summary = {
            "mean_auc": round(results_df["auc"].mean(), 6),
            "std_auc": round(results_df["auc"].std(), 6),
            "mean_brier": round(results_df["brier"].mean(), 6),
            "std_brier": round(results_df["brier"].std(), 6),
            "n_folds": n_folds,
            "fold_details": fold_results,
        }

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

        # Modèle
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

        base_model = xgb.XGBClassifier(**{
            k: v for k, v in params.items()
            if k not in ("eval_metric",)  # eval_metric géré séparément dans fit
        })

        base_model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
            early_stopping_rounds=early_stopping_rounds,
        )

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

        # Format JSON natif XGBoost (auditabilité cross-language)
        if self._xgb_booster is not None:
            json_path = os.path.join(self.model_dir, f"{model_name}.json")
            self._xgb_booster.save_model(json_path)
            logger.info(f"Booster JSON sauvegardé : {json_path}")

        # Metadata
        meta_path = os.path.join(self.model_dir, f"{model_name}_metadata.json")
        metadata_serializable = self.training_metadata.copy()
        with open(meta_path, "w") as f:
            json.dump(metadata_serializable, f, indent=2, default=str)

        # Features
        features_path = os.path.join(self.model_dir, f"{model_name}_features.json")
        with open(features_path, "w") as f:
            json.dump({"features": self.feature_names}, f, indent=2)

        logger.info(f"Modèle XGBoost sauvegardé dans {self.model_dir} (pkl + json)")
        return model_path

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
) -> Dict:
    """
    Pipeline complet d'entrainement PD Model.

    Args:
        data_path:           Chemin explicite vers le dataset. Si None, résolution automatique.
        model_name:          Nom de l'artefact sauvegardé.
        model_type:          'lightgbm' (démonstration) ou 'xgboost' (cible PROD_CHAMPION).
        use_temporal_split:  Si True, split walk-forward chronologique (recommandé).
                             Si False, split aléatoire stratifié (legacy — leakage possible).

    Etapes :
    1. Chargement des donnees (ABT curated ou raw + feature engineering)
    2. Hash SHA-256 du dataset (reproductibilité / audit trail)
    3. Split Train/Val/Test (temporel par défaut)
    4. Entrainement LightGBM ou XGBoost selon model_type
    5. Validation avancee (AUC, Gini, KS, calibration, deciles)
    6. Sauvegarde modele + metadata avec data_hash
    """
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

    # Smart data resolution chain
    base_dir = os.path.join(os.path.dirname(__file__), "..", "..")
    candidate_paths = [
        data_path,
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

    trainer.train(X_train, y_train, X_val, y_val)

    # Injecter le hash dans les metadata avant sauvegarde
    trainer.training_metadata["data_hash_sha256"] = data_hash
    trainer.training_metadata["data_source_path"] = str(resolved_path)
    trainer.training_metadata["split_strategy"] = "temporal_walkforward" if use_temporal_split else "random_stratified"
    trainer.training_metadata["model_type_requested"] = model_type

    # Save
    model_path = trainer.save_model(model_name)

    # ── MLflow Experiment Tracking ────────────────────────────────────────────
    # Logs params, metrics, and artifact for experiment traceability.
    # mlflow==2.10.2 is in requirements.txt. MLFLOW_TRACKING_URI defaults to
    # ./mlruns (local). Point to the MLflow server via env var for team tracking.
    try:
        import mlflow
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

        val_report = validator.run_full_validation(
            y_true=y_test.values if hasattr(y_test, 'values') else y_test,
            y_pred=y_test_pred,
            y_true_train=y_train.values if hasattr(y_train, 'values') else y_train,
            y_pred_train=y_train_pred,
            model_name=model_name,
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

    return {
        "model_path": model_path,
        "training_metadata": trainer.training_metadata,
        "top_features": fi.head(10).to_dict("records"),
    }


if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(description="PD Model Training Pipeline")
    parser.add_argument("--model-type", choices=["lightgbm", "xgboost"], default="lightgbm",
                        help="lightgbm (démo) ou xgboost (cible PROD_CHAMPION)")
    parser.add_argument("--model-name", default="pd_model_v2")
    parser.add_argument("--no-temporal-split", action="store_true",
                        help="Désactive le split temporel (non recommandé)")
    args = parser.parse_args()

    try:
        results = run_training_pipeline(
            model_name=args.model_name,
            model_type=args.model_type,
            use_temporal_split=not args.no_temporal_split,
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
            gini_ok = "✅" if t.get("gini", 0) >= 0.45 else "❌ SOUS LE FLOOR 45%"
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

