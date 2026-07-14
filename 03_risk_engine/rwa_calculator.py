"""
Risk-Weighted Assets (RWA) Calculator
=====================================
Implémentation de l'Approche Standardisée Bâle III pour le calcul des RWA
et des exigences en Fonds Propres (Regulatory Capital).

Bâle III impose un capital minimum de 8% sur les actifs pondérés (RWA).
Les pondérations dépendent de la classe d'exposition et de la notation (Rating).

Auteur  : Credit Risk Engine / Compliance Module
Version : 1.0.0
"""

import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

@dataclass
class RWAResult:
    exposure_id: str
    exposure_class: str
    ead: float
    risk_weight: float
    rwa: float
    minimum_capital_required: float
    model_framework: str = "Basel_III_Standardized"

class RWACalculator:
    """
    Calculateur RWA selon Bâle III Standardisée.
    """
    
    # Exigences de Fonds Propres Bâle III
    MINIMUM_CAPITAL_RATIO = 0.08  # 8%

    # Matrice des pondérations de risque Bâle III (Risk Weights)
    RISK_WEIGHTS = {
        "SOVEREIGN": 0.0,         # État souverain (ex: obligations d'État)
        "RETAIL": 0.75,           # Particuliers et PME Retail
        "MORTGAGE": 0.35,         # Immobilier Résidentiel (Hypothécaire)
        "CORPORATE_RATED": 0.50,  # Entreprises très bien notées (Simplification)
        "CORPORATE_UNRATED": 1.0, # Entreprises non notées
        "HIGH_RISK": 1.50,        # Créances en défaut ou Private Equity
    }

    def compute(
        self,
        ead: float,
        exposure_class: str,
        is_defaulted: bool = False,
        exposure_id: str = "UNKNOWN",
    ) -> RWAResult:
        """
        Calcule les RWA et le capital réglementaire requis pour une exposition.
        
        Args:
            ead: Exposure at Default (Montant total engagé).
            exposure_class: Type d'exposition (RETAIL, CORPORATE_UNRATED, etc.).
            is_defaulted: True si le prêt est déjà en défaut (NPL).
            exposure_id: Identifiant de l'exposition pour audit trail.
            
        Returns:
            RWAResult contenant le RWA et le Capital Requis.
        """
        if ead < 0:
            raise ValueError(f"EAD ne peut être négatif: {ead}")
            
        # Si en défaut, Bâle III applique une pénalité sévère (150% pour du non provisionné)
        if is_defaulted:
            weight = self.RISK_WEIGHTS["HIGH_RISK"]
        else:
            weight = self.RISK_WEIGHTS.get(exposure_class.upper(), 1.0) # 100% par défaut
            
        rwa = ead * weight
        capital_req = rwa * self.MINIMUM_CAPITAL_RATIO
        
        logger.info(f"Calcul RWA [Basel III] {exposure_id} | Class: {exposure_class} | Weight: {weight*100}% | RWA: {rwa}")
        
        return RWAResult(
            exposure_id=exposure_id,
            exposure_class=exposure_class.upper(),
            ead=ead,
            risk_weight=weight,
            rwa=rwa,
            minimum_capital_required=capital_req
        )
