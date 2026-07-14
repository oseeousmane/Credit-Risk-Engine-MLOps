"""
Data Drift Detector
===================
Calcul du Population Stability Index (PSI) pour détecter les dérives (Drift)
entre les données d'entraînement (Expected) et les données d'inférence (Actual).

Si PSI > 0.20 : Dérive significative (alerte critique)
Si PSI > 0.10 : Dérive légère (surveillance)
Si PSI < 0.10 : Pas de dérive

Auteur  : Credit Risk Engine
Version : 2.0.0
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict

logger = logging.getLogger(__name__)

class DriftDetector:
    def __init__(self, alert_threshold: float = 0.20):
        self.alert_threshold = alert_threshold

    def calculate_psi(self, expected: np.ndarray, actual: np.ndarray, buckets: int = 10) -> float:
        """
        Calcule le Population Stability Index (PSI) pour une seule feature continue.
        """
        # Gérer les valeurs manquantes
        expected = expected[~np.isnan(expected)]
        actual = actual[~np.isnan(actual)]
        
        if len(expected) == 0 or len(actual) == 0:
            return 0.0

        # Définir les bins basés sur la distribution attendue
        breakpoints = np.arange(0, buckets + 1) / buckets * 100
        bins = np.percentile(expected, breakpoints)
        # S'assurer que les bords couvrent toutes les données
        bins[0] = -np.inf
        bins[-1] = np.inf
        
        # Enlever les bins dupliqués (ex: quand il y a beaucoup de 0)
        bins = np.unique(bins)
        if len(bins) < 2:
            return 0.0

        # Calcul des fréquences
        expected_percents = np.histogram(expected, bins)[0] / len(expected)
        actual_percents = np.histogram(actual, bins)[0] / len(actual)

        # Eviter la division par zero
        expected_percents = np.where(expected_percents == 0, 0.0001, expected_percents)
        actual_percents = np.where(actual_percents == 0, 0.0001, actual_percents)

        # Formule du PSI
        psi_value = np.sum((actual_percents - expected_percents) * np.log(actual_percents / expected_percents))
        return float(psi_value)

    def detect_drift_batch(self, expected_df: pd.DataFrame, actual_df: pd.DataFrame) -> Dict[str, float]:
        """
        Calcule le PSI pour toutes les colonnes numériques communes.
        Retourne un dict {feature_name: psi_score}.
        """
        common_cols = list(set(expected_df.columns) & set(actual_df.columns))
        num_cols = expected_df[common_cols].select_dtypes(include=[np.number]).columns
        
        drift_report = {}
        drift_count = 0
        
        for col in num_cols:
            psi = self.calculate_psi(expected_df[col].values, actual_df[col].values)
            drift_report[col] = round(psi, 4)
            
            if psi >= self.alert_threshold:
                drift_count += 1
                logger.warning(f"🚨 [DATA DRIFT] Feature '{col}' a un PSI de {psi:.3f} (>= {self.alert_threshold})")
                
        logger.info(f"Drift check completed sur {len(num_cols)} features. {drift_count} dérives critiques détectées.")
        return drift_report

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--alert_threshold", type=float, default=0.20)
    args = parser.parse_args()

    # Simulation d'un test de dérive
    print("Simulation: Running Data Drift Detection (PSI)...")
    detector = DriftDetector(alert_threshold=args.alert_threshold)
    
    # Données d'entraînement normales (Moyenne 0)
    train_data = pd.DataFrame({"EXT_SOURCE_1": np.random.normal(0, 1, 1000)})
    # Données de production dérivées (Moyenne 1.5)
    prod_data = pd.DataFrame({"EXT_SOURCE_1": np.random.normal(1.5, 1, 1000)})
    
    report = detector.detect_drift_batch(train_data, prod_data)
    print("\nRapport PSI:")
    for feat, psi in report.items():
        status = "CRITICAL" if psi >= args.alert_threshold else ("WARNING" if psi >= 0.10 else "OK")
        print(f"{feat}: {psi:.4f} [{status}]")
