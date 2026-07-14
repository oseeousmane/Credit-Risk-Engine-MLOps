"""
Feature Store Client
====================
Client interface pour communiquer avec le Feature Store (ex: Redis) en production.
Permet à l'API de scoring de récupérer des features pré-calculés (latence < 10ms)
plutôt que de tout reconstruire à chaud depuis les bases de données.

Auteur  : Credit Risk Engine
Version : 2.0.0 (Data Upgrade)
"""

import logging
import json
from typing import Dict, Optional, Any

logger = logging.getLogger(__name__)

class FeatureStoreClient:
    """
    Interface client pour le Feature Store temps-réel (Redis).
    En l'absence d'un cluster Redis actif, ceci est un Mock robuste.
    """

    def __init__(self, host: str = "localhost", port: int = 6379, db: int = 0):
        self.host = host
        self.port = port
        self.db = db
        self._connected = False
        self._mock_cache: Dict[str, str] = {}
        logger.info(f"FeatureStoreClient initialized (Target: {host}:{port})")

    def connect(self):
        """Établit la connexion avec Redis."""
        # Mock connection success
        self._connected = True
        logger.debug("Feature Store connection established.")

    def get_online_features(self, entity_id: str, feature_service: str = "pd_model_v2") -> Optional[Dict[str, Any]]:
        """
        Récupère le vecteur de features complet pour une entité donnée.
        
        Args:
            entity_id: L'identifiant métier (ex: numéro SIREN, application_id)
            feature_service: Le nom du modèle cible (définit la liste des features attendues)
            
        Returns:
            Un dictionnaire de features ou None si cache miss.
        """
        if not self._connected:
            self.connect()

        cache_key = f"{feature_service}:{entity_id}"
        
        # Simulation d'un cache hit si la donnée a été préalablement poussée
        cached_data = self._mock_cache.get(cache_key)
        
        if cached_data:
            logger.debug(f"[FeatureStore] Cache HIT for {cache_key}")
            return json.loads(cached_data)
        
        logger.debug(f"[FeatureStore] Cache MISS for {cache_key}")
        return None

    def push_features(self, entity_id: str, features: Dict[str, Any], feature_service: str = "pd_model_v2"):
        """
        Pousse un vecteur de features dans le store (utilisé par l'ETL Airflow).
        """
        if not self._connected:
            self.connect()
            
        cache_key = f"{feature_service}:{entity_id}"
        self._mock_cache[cache_key] = json.dumps(features)
        logger.info(f"[FeatureStore] Pushed features for {cache_key}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--action", choices=["push_batch"], help="Action to perform")
    args = parser.parse_args()

    if args.action == "push_batch":
        print("Simulating batch push of features to Redis from ETL...")
        client = FeatureStoreClient()
        client.push_features("APP-001", {"EXT_SOURCE_1": 0.5, "AMT_CREDIT": 10000})
        print("Done.")
