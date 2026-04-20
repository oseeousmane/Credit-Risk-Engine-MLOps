"""
EAD Model — Exposure At Default (CCF-based)
=============================================
Modèle d'Exposure At Default basé sur le Credit Conversion Factor (CCF),
conforme à l'approche Foundation IRB de Bâle III.

    EAD = Drawn + CCF × Undrawn

Approches :
1. CCF réglementaire (supervisory values)
2. CCF segmenté par type de produit
3. CCF estimé par simulation (Monte Carlo)

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import logging
from typing import Optional, Dict, List
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


# ─── CCF Supervisory Values (Bâle III, Foundation IRB) ───────────────
CCF_REGULATORY = {
    "term_loan": {
        "ccf": 1.0,              # Fully drawn → CCF = 100%
        "description": "Prêts à terme (fully committed)"
    },
    "revolving_credit": {
        "ccf": 0.75,             # 75% Bâle III
        "description": "Lignes de crédit renouvelables"
    },
    "overdraft": {
        "ccf": 0.75,             # Découverts autorisés
        "description": "Facilités de découvert"
    },
    "guarantee": {
        "ccf": 0.50,             # Cautions / garanties données
        "description": "Engagements par signature"
    },
    "letter_of_credit": {
        "ccf": 0.20,             # Crédits documentaires
        "description": "Lettres de crédit (trade finance)"
    },
    "undrawn_commitment": {
        "ccf": 0.75,             # Bâle III : révocable à tout moment = 0%, 
        "description": "Engagements non tirés (irrévocables)"
    },
    "contingent_revocable": {
        "ccf": 0.00,             # Engagements révocables sans condition
        "description": "Engagements révocables sans conditions"
    },
}


@dataclass
class EADResult:
    """Résultat de calcul EAD."""
    exposure_id: str
    drawn_amount: float
    undrawn_amount: float
    ccf_applied: float
    ead_estimate: float
    product_type: str
    estimation_method: str
    calculation_timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict:
        return {
            "exposure_id": self.exposure_id,
            "drawn_amount": round(self.drawn_amount, 2),
            "undrawn_amount": round(self.undrawn_amount, 2),
            "ccf_applied": round(self.ccf_applied, 4),
            "ead_estimate": round(self.ead_estimate, 2),
            "product_type": self.product_type,
            "estimation_method": self.estimation_method,
            "calculation_timestamp": self.calculation_timestamp,
        }


class EADModel:
    """
    Modèle EAD (Exposure At Default) conforme Bâle III.
    
    EAD = Drawn + CCF × Undrawn
    
    Modes :
    - Regulatory : utilise les CCF supervisory values
    - Estimated  : CCF estimé par historique ou simulation
    """

    def __init__(self, ccf_table: Optional[Dict] = None):
        self.ccf_table = ccf_table or CCF_REGULATORY.copy()
        self._audit_log: List[Dict] = []

        logger.info(
            f"EADModel initialisé — {len(self.ccf_table)} types de produits"
        )

    def compute(
        self,
        exposure_id: str,
        drawn_amount: float,
        credit_limit: float,
        product_type: str = "term_loan",
        ccf_override: Optional[float] = None,
    ) -> EADResult:
        """
        Calcule l'EAD pour une exposition.
        
        Args:
            exposure_id: Identifiant
            drawn_amount: Montant déjà tiré
            credit_limit: Limite de crédit totale autorisée
            product_type: Type de produit bancaire
            ccf_override: CCF manuel (override le réglementaire)
        """
        undrawn_amount = max(credit_limit - drawn_amount, 0)

        # Détermination du CCF
        if ccf_override is not None:
            ccf = np.clip(ccf_override, 0.0, 1.0)
            method = "manual_override"
        elif product_type in self.ccf_table:
            ccf = self.ccf_table[product_type]["ccf"]
            method = "regulatory_foundation_irb"
        else:
            ccf = 0.75  # Valeur par défaut Bâle
            method = "default_regulatory"

        # EAD = Drawn + CCF × Undrawn
        ead = drawn_amount + ccf * undrawn_amount

        result = EADResult(
            exposure_id=exposure_id,
            drawn_amount=drawn_amount,
            undrawn_amount=undrawn_amount,
            ccf_applied=ccf,
            ead_estimate=ead,
            product_type=product_type,
            estimation_method=method,
        )

        self._audit_log.append({
            "action": "ead_computation",
            "input": {
                "exposure_id": exposure_id,
                "drawn": drawn_amount,
                "limit": credit_limit,
                "product": product_type,
            },
            "output": result.to_dict(),
        })

        logger.debug(
            f"EAD: {exposure_id} → {ead:,.0f} "
            f"(drawn={drawn_amount:,.0f}, CCF={ccf:.0%})"
        )

        return result

    def compute_portfolio(
        self,
        portfolio_df: pd.DataFrame,
        id_col: str = "exposure_id",
        drawn_col: str = "drawn_amount",
        limit_col: str = "credit_limit",
        product_col: str = "product_type",
    ) -> pd.DataFrame:
        """Calcul batch EAD sur portefeuille."""
        results = []
        for _, row in portfolio_df.iterrows():
            result = self.compute(
                exposure_id=str(row.get(id_col, _)),
                drawn_amount=float(row[drawn_col]),
                credit_limit=float(row[limit_col]),
                product_type=str(row.get(product_col, "term_loan")),
            )
            results.append(result.to_dict())
        return pd.DataFrame(results)

    def stress_test_ead(
        self,
        drawn_amount: float,
        credit_limit: float,
        product_type: str = "revolving_credit",
        scenarios: Optional[Dict[str, float]] = None,
    ) -> Dict:
        """
        Stress test sur l'EAD avec différents scénarios de tirage.
        
        Scénarios par défaut :
        - Base : CCF réglementaire
        - Stress modéré : CCF + 15pp
        - Stress sévère : CCF + 25pp (plafond 100%)
        """
        if scenarios is None:
            base_ccf = self.ccf_table.get(product_type, {"ccf": 0.75})["ccf"]
            scenarios = {
                "base": base_ccf,
                "moderate_stress": min(base_ccf + 0.15, 1.0),
                "severe_stress": min(base_ccf + 0.25, 1.0),
                "full_drawdown": 1.0,
            }

        undrawn = max(credit_limit - drawn_amount, 0)
        results = {}

        for scenario_name, ccf in scenarios.items():
            ead = drawn_amount + ccf * undrawn
            results[scenario_name] = {
                "ccf": round(ccf, 4),
                "ead": round(ead, 2),
                "ead_increase_pct": round((ead - drawn_amount) / max(drawn_amount, 1) * 100, 2),
            }

        return {
            "drawn_amount": drawn_amount,
            "credit_limit": credit_limit,
            "undrawn_amount": undrawn,
            "product_type": product_type,
            "scenarios": results,
        }

    def get_audit_log(self) -> List[Dict]:
        return self._audit_log.copy()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    model = EADModel()

    # Calcul individuel
    result = model.compute(
        exposure_id="EXPO-001",
        drawn_amount=3_000_000,
        credit_limit=5_000_000,
        product_type="revolving_credit",
    )
    print(f"[{result.exposure_id}] EAD = {result.ead_estimate:,.0f} XAF (CCF={result.ccf_applied:.0%})")

    # Stress test
    stress = model.stress_test_ead(
        drawn_amount=3_000_000,
        credit_limit=5_000_000,
        product_type="revolving_credit",
    )
    print(f"\nStress Test EAD:")
    for scenario, data in stress["scenarios"].items():
        print(f"  {scenario}: EAD={data['ead']:,.0f} (CCF={data['ccf']:.0%})")
