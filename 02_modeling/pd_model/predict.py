"""
PD Model — Inference & Prediction
====================================
Module d'inférence pour le modèle PD en production.

Fonctionnalités :
- Prédiction individuelle et batch
- Validation des inputs (feature schema)
- Logging structuré pour audit trail
- Compatible avec le Risk Engine (03_risk_engine)

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import pickle
import json
import os
import logging
from typing import Optional, Dict, List, Union
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


class PDModelPredictor:
    """
    Service d'inférence PD Model pour environnement production.
    
    Gère :
    - Chargement sécurisé du modèle
    - Validation du schéma d'input
    - Prédiction avec audit trail
    - Gestion des erreurs gracieuse
    """

    def __init__(
        self,
        model_dir: Optional[str] = None,
        model_name: str = "pd_model_v1",
    ):
        if model_dir is None:
            model_dir = os.path.join(os.path.dirname(__file__), "artifacts")

        self.model_dir = model_dir
        self.model_name = model_name
        self.model = None
        self.feature_names: List[str] = []
        self.metadata: Dict = {}
        self._prediction_log: List[Dict] = []

        self._load()

    def _load(self):
        """Charge le modèle et ses metadata."""
        model_path = os.path.join(self.model_dir, f"{self.model_name}.pkl")
        features_path = os.path.join(self.model_dir, f"{self.model_name}_features.json")
        meta_path = os.path.join(self.model_dir, f"{self.model_name}_metadata.json")

        if not os.path.exists(model_path):
            logger.warning(
                f"Modèle non trouvé: {model_path}. "
                f"Exécuter d'abord train.py"
            )
            return

        with open(model_path, "rb") as f:
            self.model = pickle.load(f)

        if os.path.exists(features_path):
            with open(features_path, "r") as f:
                self.feature_names = json.load(f)["features"]

        if os.path.exists(meta_path):
            with open(meta_path, "r") as f:
                self.metadata = json.load(f)

        logger.info(
            f"Modèle PD chargé: {self.model_name} "
            f"({len(self.feature_names)} features)"
        )

    def is_ready(self) -> bool:
        """Vérifie que le modèle est prêt pour l'inférence."""
        return self.model is not None and len(self.feature_names) > 0

    def _validate_input(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Valide et aligne l'input avec le schéma du modèle.
        Ajoute les colonnes manquantes avec NaN (LightGBM les gère nativement).
        """
        missing_features = set(self.feature_names) - set(X.columns)
        extra_features = set(X.columns) - set(self.feature_names)

        if missing_features:
            logger.warning(
                f"Features manquantes (remplies avec NaN): {missing_features}"
            )
            for feat in missing_features:
                X[feat] = np.nan

        if extra_features:
            logger.debug(f"Features ignorées: {extra_features}")

        return X[self.feature_names]

    def predict(
        self,
        X: Union[pd.DataFrame, Dict],
        application_id: Optional[str] = None,
    ) -> Dict:
        """
        Prédit la probabilité de défaut pour une ou plusieurs observations.
        
        Args:
            X: DataFrame ou dict avec les features
            application_id: ID de la demande pour audit trail
            
        Returns:
            Dict avec pd_score, metadata, et prediction_id
        """
        if not self.is_ready():
            raise RuntimeError(
                "Modèle PD non chargé. Exécuter train.py d'abord."
            )

        # Conversion dict → DataFrame
        if isinstance(X, dict):
            X = pd.DataFrame([X])

        X_aligned = self._validate_input(X.copy())

        # Prédiction
        probas = self.model.predict_proba(X_aligned)[:, 1]

        prediction_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()

        result = {
            "prediction_id": prediction_id,
            "application_id": application_id or "N/A",
            "pd_scores": probas.tolist(),
            "pd_mean": round(float(probas.mean()), 6),
            "n_predictions": len(probas),
            "model_name": self.model_name,
            "model_version": self.metadata.get("training_timestamp", "unknown"),
            "timestamp": timestamp,
        }

        # Audit trail
        self._prediction_log.append({
            "prediction_id": prediction_id,
            "application_id": application_id,
            "n_records": len(probas),
            "pd_mean": float(probas.mean()),
            "pd_min": float(probas.min()),
            "pd_max": float(probas.max()),
            "timestamp": timestamp,
        })

        logger.info(
            f"Prediction: {application_id or 'batch'} → "
            f"PD mean={probas.mean():.4f} ({len(probas)} records)"
        )

        return result

    def predict_single(self, features: Dict, application_id: str) -> float:
        """
        Prédiction simplifiée pour une seule observation.
        Retourne directement le score PD.
        """
        result = self.predict(features, application_id)
        return result["pd_scores"][0]

    def get_prediction_log(self) -> List[Dict]:
        """Retourne le journal d'audit des prédictions."""
        return self._prediction_log.copy()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    predictor = PDModelPredictor()

    if predictor.is_ready():
        # Test avec données fictives
        test_input = {
            "AMT_INCOME_TOTAL": 150000,
            "AMT_CREDIT": 500000,
            "AMT_ANNUITY": 30000,
            "DAYS_BIRTH": -12000,
            "DAYS_EMPLOYED": -3000,
            "EXT_SOURCE_1": 0.5,
            "EXT_SOURCE_2": 0.6,
            "EXT_SOURCE_3": 0.4,
        }

        result = predictor.predict(test_input, application_id="TEST-001")
        print(f"PD Score: {result['pd_scores'][0]:.4f}")
    else:
        print("⚠ Modèle non entraîné. Exécuter d'abord:")
        print("  python 02_modeling/pd_model/train.py")
