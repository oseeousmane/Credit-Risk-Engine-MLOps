"""
Segmented LGD (Loss Given Default) Model
========================================
Modèle de LGD segmentée conforme aux principes Bâle III Foundation IRB.
Remplace l'approche statique (45%) par un calcul dynamique basé sur :
- Le type de collatéral (Cash, Immobilier, Équipement, Aucun)
- La séniorité de la dette (Senior, Subordonnée)
- Les taux de recouvrement historiques (Haircuts)

Auteur  : Credit Risk Engine
Version : 2.0.0 (Quant Upgrade)
"""

import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)


class LGDModel:
    """
    Calculateur de Loss Given Default (LGD).
    Utilise les paramètres réglementaires Bâle III (FIRB) pour les expositions non-retail.
    """

    # LGD par défaut pour dette non couverte (Unsecured)
    # 45% pour dette senior, 75% pour dette subordonnée (Bâle III FIRB)
    UNSECURED_LGD_SENIOR = 0.45
    UNSECURED_LGD_SUBORDINATED = 0.75

    # LGD planchers (floors) par type de collatéral (Haircuts réglementaires typiques)
    COLLATERAL_HAIRCUTS = {
        "CASH": 0.0,              # Cash / Dépôts (0% haircut) -> LGD ~ 0%
        "SOVEREIGN": 0.05,        # Titres souverains -> LGD ~ 5%
        "REAL_ESTATE": 0.35,      # Immobilier commercial/résidentiel -> LGD ~ 35%
        "RECEIVABLES": 0.50,      # Créances commerciales -> LGD ~ 50%
        "EQUIPMENT": 0.60,        # Équipements / Véhicules -> LGD ~ 60%
        "UNSECURED": 1.0,         # Aucun collatéral reconnu -> LGD = 100% de la partie non couverte
    }

    def __init__(self, override_haircuts: Optional[Dict[str, float]] = None):
        self.haircuts = self.COLLATERAL_HAIRCUTS.copy()
        if override_haircuts:
            self.haircuts.update(override_haircuts)
        logger.info("LGDModel (Segmented FIRB) initialisé.")

    def compute_lgd(
        self,
        ead: float,
        collateral_value: float = 0.0,
        collateral_type: str = "UNSECURED",
        is_subordinated: bool = False
    ) -> float:
        """
        Calcule la LGD effective de l'exposition.
        
        Args:
            ead: Exposure At Default (Montant exposé)
            collateral_value: Valeur de marché du collatéral
            collateral_type: Type de collatéral (ex: 'REAL_ESTATE')
            is_subordinated: True si dette subordonnée, False si senior
            
        Returns:
            lgd: Taux de Loss Given Default (0.0 à 1.0)
        """
        if ead <= 0:
            return 0.0

        collateral_type = collateral_type.upper()
        if collateral_type not in self.haircuts:
            logger.warning(f"Type de collatéral inconnu '{collateral_type}', fallback sur UNSECURED.")
            collateral_type = "UNSECURED"

        # Valeur ajustée du collatéral après décote (haircut réglementaire)
        haircut = self.haircuts[collateral_type]
        adjusted_collateral_value = collateral_value * (1.0 - haircut)

        # La partie non couverte (Unsecured portion)
        unsecured_exposure = max(0.0, ead - adjusted_collateral_value)

        # LGD sur la partie non couverte
        base_unsecured_lgd = self.UNSECURED_LGD_SUBORDINATED if is_subordinated else self.UNSECURED_LGD_SENIOR

        # Perte totale attendue en cas de défaut
        expected_loss_amount = unsecured_exposure * base_unsecured_lgd

        # LGD finale = Perte Totale / EAD (bornée entre 0 et 1)
        final_lgd = min(1.0, max(0.0, expected_loss_amount / ead))

        return final_lgd

if __name__ == "__main__":
    lgd_model = LGDModel()
    # Test: Prêt de 1M, avec Immo de 1.2M
    ead_test = 1_000_000
    immo_val = 1_200_000
    lgd = lgd_model.compute_lgd(ead_test, immo_val, "REAL_ESTATE")
    print(f"EAD: 1M, Immo: 1.2M -> LGD = {lgd:.2%}")
    
    # Test: Prêt de 1M, avec Immo de 500k
    lgd_partial = lgd_model.compute_lgd(ead_test, 500_000, "REAL_ESTATE")
    print(f"EAD: 1M, Immo: 500k -> LGD = {lgd_partial:.2%}")
    
    # Test: Prêt Unsecured
    lgd_unsec = lgd_model.compute_lgd(ead_test, 0, "UNSECURED")
    print(f"EAD: 1M, Unsecured -> LGD = {lgd_unsec:.2%}")
