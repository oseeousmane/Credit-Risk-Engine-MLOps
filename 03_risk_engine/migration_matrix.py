"""
Migration Matrix & Stress Testing
=================================
Implémentation de la matrice de migration (Through-The-Cycle vers Point-In-Time)
basée sur le modèle à facteur unique de Vasicek (Z-factor model).
Permet de déformer une matrice de transition historique (TTC) selon des scénarios
macroéconomiques (Base, Adverse, Severe) pour simuler la migration de rating et
re-calculer la PD sous stress.

Auteur  : Credit Risk Engine
Version : 2.0.0 (Quant Upgrade)
"""

import numpy as np
import logging
from scipy.stats import norm
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)

class MigrationMatrixModel:
    """
    Modèle de matrice de transition et stress testing via Vasicek.
    """
    
    # Ratings internes
    RATINGS = ["A", "B", "C", "D", "DEFAULT"]
    
    # Matrice de transition Through-The-Cycle (TTC) moyenne sur un cycle long
    # Lignes = Rating initial, Colonnes = Rating final à 1 an
    # Doit sommer à 1 par ligne.
    DEFAULT_TTC_MATRIX = np.array([
        [0.90, 0.08, 0.01, 0.005, 0.005], # A
        [0.05, 0.85, 0.07, 0.02,  0.01 ], # B
        [0.01, 0.10, 0.75, 0.10,  0.04 ], # C
        [0.00, 0.02, 0.15, 0.70,  0.13 ], # D
        [0.00, 0.00, 0.00, 0.00,  1.00 ]  # DEFAULT (Etat absorbant)
    ])

    def __init__(self, ttc_matrix: np.ndarray = None, asset_correlation: float = 0.15):
        """
        Args:
            ttc_matrix: Matrice de transition TTC (5x5)
            asset_correlation: R (corrélation des actifs Bâle, typiquement entre 0.12 et 0.24)
        """
        self.ttc_matrix = ttc_matrix if ttc_matrix is not None else self.DEFAULT_TTC_MATRIX
        self.R = asset_correlation
        
        # Validation
        assert self.ttc_matrix.shape == (len(self.RATINGS), len(self.RATINGS)), "Matrice de taille invalide"
        assert np.allclose(self.ttc_matrix.sum(axis=1), 1), "Les lignes de la matrice doivent sommer à 1"
        logger.info("MigrationMatrixModel initialisé (Vasicek Z-factor).")

    def _compute_thresholds(self) -> np.ndarray:
        """
        Calcule les seuils de probabilité cumulative inverse (normale standard)
        à partir de la matrice TTC.
        """
        thresholds = np.zeros(self.ttc_matrix.shape)
        for i in range(len(self.RATINGS)):
            cum_prob = 0.0
            for j in range(len(self.RATINGS) - 1, -1, -1): # En partant de Default vers A
                cum_prob += self.ttc_matrix[i, j]
                # Limiter cum_prob entre 0 et 1 (avoid infinity in norm.ppf)
                cum_prob = min(max(cum_prob, 1e-10), 1 - 1e-10)
                thresholds[i, j] = norm.ppf(cum_prob)
        return thresholds

    def get_pit_matrix(self, z_factor: float) -> np.ndarray:
        """
        Déforme la matrice TTC en PIT (Point-In-Time) selon le Z-factor macroéconomique.
        
        Args:
            z_factor: Facteur macroéconomique standardisé. 
                      Z < 0 = Récession (Adverse)
                      Z = 0 = Cycle Neutre (Base)
                      Z > 0 = Expansion
        Returns:
            Matrice de transition PIT
        """
        thresholds = self._compute_thresholds()
        pit_matrix = np.zeros_like(self.ttc_matrix)
        
        sqrt_R = np.sqrt(self.R)
        sqrt_1_minus_R = np.sqrt(1 - self.R)
        
        for i in range(len(self.RATINGS) - 1): # Ignore Default state (absorbant)
            prev_cum_prob = 0.0
            for j in range(len(self.RATINGS) - 1, -1, -1):
                # Formule de Vasicek pour probabilités conditionnelles
                t = thresholds[i, j]
                # Z est positif en expansion (réduit la PD), négatif en récession (augmente la PD)
                conditional_threshold = (t - sqrt_R * z_factor) / sqrt_1_minus_R
                cum_prob = norm.cdf(conditional_threshold)
                
                # La proba de transition exacte vers l'état j
                pit_matrix[i, j] = max(0.0, cum_prob - prev_cum_prob)
                prev_cum_prob = cum_prob
                
        # Normalisation par ligne (pour pallier les petites erreurs d'arrondi)
        for i in range(len(self.RATINGS) - 1):
            pit_matrix[i, :] = pit_matrix[i, :] / pit_matrix[i, :].sum()
            
        # L'état défaut reste absorbant
        pit_matrix[-1, :] = 0.0
        pit_matrix[-1, -1] = 1.0
        
        return pit_matrix

    def stress_pd(self, current_pd: float, current_rating: str, scenario: str = "BASE") -> float:
        """
        Calcule la PD stressée en simulant une transition via la matrice PIT.
        Scénarios typiques : BASE (Z=0), ADVERSE (Z=-1.5), SEVERE (Z=-2.5).
        """
        # Mapping Scenario -> Z-factor
        z_map = {
            "BASE": 0.0,
            "ADVERSE": -1.5,
            "SEVERE": -2.5
        }
        
        z = z_map.get(scenario.upper(), 0.0)
        pit_matrix = self.get_pit_matrix(z)
        
        if current_rating not in self.RATINGS:
            return current_pd # Fallback if rating is unknown
            
        rating_idx = self.RATINGS.index(current_rating)
        stressed_pd = pit_matrix[rating_idx, -1] # Probabilité de transition vers DEFAULT
        
        # Pour maintenir la pertinence du current_pd spécifique à l'emprunteur,
        # on calcule un facteur d'échelle à partir de la matrice (Stressed PD / Base PD du rating)
        base_rating_pd = self.ttc_matrix[rating_idx, -1]
        
        if base_rating_pd > 0:
            stress_multiplier = stressed_pd / base_rating_pd
            return min(1.0, current_pd * stress_multiplier)
        else:
            return current_pd

if __name__ == "__main__":
    mm = MigrationMatrixModel()
    print("TTC Matrix (Base):")
    print(np.round(mm.ttc_matrix, 3))
    
    print("\nPIT Matrix (Adverse Z=-1.5):")
    pit_adverse = mm.get_pit_matrix(-1.5)
    print(np.round(pit_adverse, 3))
    
    print("\nStress Test sur rating C (PD Initiale: 4.0%):")
    print(f"Base:    {mm.stress_pd(0.04, 'C', 'BASE'):.2%}")
    print(f"Adverse: {mm.stress_pd(0.04, 'C', 'ADVERSE'):.2%}")
    print(f"Severe:  {mm.stress_pd(0.04, 'C', 'SEVERE'):.2%}")
