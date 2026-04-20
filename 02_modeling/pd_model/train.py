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
import logging
from datetime import datetime
from typing import Optional, Dict, Tuple, List
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.metrics import roc_auc_score, brier_score_loss, log_loss
from sklearn.calibration import CalibratedClassifierCV

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
        # Pre-fit because we already trained base_model. We wrap it and fit on Validation set to calibrate!
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

        # Metadata
        meta_path = os.path.join(self.model_dir, f"{model_name}_metadata.json")
        # Convert non-serializable types
        metadata_serializable = self.training_metadata.copy()
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

        logger.info(f"Modèle sauvegardé dans {self.model_dir}")
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


def run_training_pipeline(
    data_path: Optional[str] = None,
    model_name: str = "pd_model_v2",
) -> Dict:
    """
    Pipeline complet d'entrainement PD Model.
    
    Etapes :
    1. Chargement des donnees (ABT curated ou raw + feature engineering)
    2. Split Train/Val/Test
    3. Entrainement LightGBM
    4. Validation avancee (AUC, Gini, KS, calibration, deciles)
    5. Sauvegarde modele + metadata
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
    for path in candidate_paths:
        if path and os.path.exists(path):
            logger.info(f"Loading data from: {path}")
            if path.endswith(".parquet"):
                df = pd.read_parquet(path)
            else:
                df = pd.read_csv(path)
            break

    if df is None:
        raise FileNotFoundError("No data source found. Run the ABT builder first.")

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

    trainer = PDModelTrainer()

    # Prepare & train
    X_train, X_val, X_test, y_train, y_val, y_test = trainer.prepare_data(df)
    trainer.train(X_train, y_train, X_val, y_val)

    # Save
    model_path = trainer.save_model(model_name)

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
    logging.basicConfig(level=logging.INFO)
    try:
        results = run_training_pipeline()
        meta = results["training_metadata"]
        print(f"\n{'='*60}")
        print(f"PD Model Training Complete")
        print(f"{'='*60}")
        print(f"  Train AUC: {meta['train_auc']:.4f}")
        print(f"  Val AUC:   {meta['val_auc']:.4f}")
        if "test_metrics" in meta:
            t = meta["test_metrics"]
            print(f"  Test AUC:  {t['auc']:.4f}")
            print(f"  Test Gini: {t['gini']:.4f}")
            print(f"  Test KS:   {t['ks']:.4f}")
            print(f"  Brier:     {t['brier']:.4f}")
            print(f"  Grade:     {t['grade']}")
        print(f"  Path: {results['model_path']}")
    except FileNotFoundError as e:
        print(f"ERROR: {e}")
        print("Run: python 01_data_layer/abt_builder.py")

