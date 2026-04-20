"""
Forward-Looking Macro Adjustment (IFRS 9)
============================================
Module d'overlay macroéconomique pour le calcul des provisions IFRS 9.

Intègre des scénarios prospectifs (forward-looking) dans le calcul ECL
via un ajustement pondéré par probabilité de scénarios macroéconomiques.

Scénarios :
- Base (optimiste modéré)
- Adverse (stress modéré)  
- Severe (crise sévère)

Pondération : Probability-weighted (exigence IFRS 9.5.8)

Référence zone CEMAC : indicateurs BEAC / COBAC.

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, Optional, List
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


# ─── Scénarios macroéconomiques par défaut (zone CEMAC) ──────────────
DEFAULT_SCENARIOS = {
    "base": {
        "probability": 0.55,
        "gdp_growth": 0.035,          # Croissance PIB 3.5%
        "inflation": 0.028,            # Inflation 2.8%
        "unemployment_change": -0.005, # Chômage en baisse
        "oil_price_change": 0.02,      # Prix du pétrole +2%
        "interest_rate_change": 0.0,   # Taux BEAC stable
        "pd_scalar": 1.0,             # Pas d'ajustement PD
        "lgd_scalar": 1.0,
        "description": "Scénario central — croissance modérée, stabilité macro"
    },
    "adverse": {
        "probability": 0.30,
        "gdp_growth": 0.010,
        "inflation": 0.050,
        "unemployment_change": 0.025,
        "oil_price_change": -0.15,
        "interest_rate_change": 0.015,
        "pd_scalar": 1.30,            # PD × 1.30 (stress modéré)
        "lgd_scalar": 1.10,
        "description": "Scénario adverse — ralentissement, choc pétrolier modéré"
    },
    "severe": {
        "probability": 0.15,
        "gdp_growth": -0.020,
        "inflation": 0.080,
        "unemployment_change": 0.060,
        "oil_price_change": -0.35,
        "interest_rate_change": 0.035,
        "pd_scalar": 1.80,            # PD × 1.80 (stress sévère)
        "lgd_scalar": 1.25,
        "description": "Scénario sévère — récession, crise pétrolière majeure"
    },
}


@dataclass
class MacroAdjustmentResult:
    """Résultat de l'ajustement macroéconomique forward-looking."""
    exposure_id: str
    pd_original: float
    pd_adjusted: float
    lgd_original: float
    lgd_adjusted: float
    weighted_pd_scalar: float
    weighted_lgd_scalar: float
    ecl_original: float
    ecl_adjusted: float
    ecl_uplift_pct: float
    scenario_details: Dict
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict:
        return {
            "exposure_id": self.exposure_id,
            "pd_original": round(self.pd_original, 6),
            "pd_adjusted": round(self.pd_adjusted, 6),
            "lgd_original": round(self.lgd_original, 4),
            "lgd_adjusted": round(self.lgd_adjusted, 4),
            "weighted_pd_scalar": round(self.weighted_pd_scalar, 4),
            "weighted_lgd_scalar": round(self.weighted_lgd_scalar, 4),
            "ecl_original": round(self.ecl_original, 2),
            "ecl_adjusted": round(self.ecl_adjusted, 2),
            "ecl_uplift_pct": round(self.ecl_uplift_pct, 2),
            "scenario_details": {
                k: {sk: round(sv, 4) if isinstance(sv, float) else sv
                     for sk, sv in v.items()}
                for k, v in self.scenario_details.items()
            },
            "timestamp": self.timestamp,
        }


class ForwardLookingAdjuster:
    """
    Ajustement Forward-Looking IFRS 9 par overlay macroéconomique.
    
    Méthodologie :
    1. Définir N scénarios macroéconomiques (Base, Adverse, Severe)
    2. Chaque scénario a un scalaire PD et un scalaire LGD
    3. Pondérer les scalaires par la probabilité de chaque scénario
    4. Appliquer les scalaires pondérés sur PD/LGD
    5. Recalculer ECL = PD_adj × LGD_adj × EAD
    
    weighted_scalar = Σ(probability_i × scalar_i) pour i dans scénarios
    
    Exigence IFRS 9.5.8 : l'ECL doit refléter une estimation
    « forward-looking, probability-weighted ».
    """

    def __init__(self, scenarios: Optional[Dict] = None):
        self.scenarios = scenarios or DEFAULT_SCENARIOS.copy()
        self._validate_scenarios()
        self._audit_log: List[Dict] = []

        # Calcul des scalaires pondérés
        self.weighted_pd_scalar = sum(
            s["probability"] * s["pd_scalar"]
            for s in self.scenarios.values()
        )
        self.weighted_lgd_scalar = sum(
            s["probability"] * s["lgd_scalar"]
            for s in self.scenarios.values()
        )

        logger.info(
            f"ForwardLookingAdjuster initialisé — "
            f"Weighted PD scalar={self.weighted_pd_scalar:.4f}, "
            f"LGD scalar={self.weighted_lgd_scalar:.4f}"
        )

    def _validate_scenarios(self):
        """Vérifie que les probabilités des scénarios somment à 1."""
        total_prob = sum(s["probability"] for s in self.scenarios.values())
        if abs(total_prob - 1.0) > 0.01:
            raise ValueError(
                f"Les probabilités des scénarios doivent sommer à 1.0 "
                f"(actuellement {total_prob:.4f})"
            )

    def adjust(
        self,
        exposure_id: str,
        pd: float,
        lgd: float,
        ead: float,
    ) -> MacroAdjustmentResult:
        """
        Applique l'ajustement forward-looking sur une exposition.
        """
        pd_adjusted = min(pd * self.weighted_pd_scalar, 1.0)
        lgd_adjusted = min(lgd * self.weighted_lgd_scalar, 1.0)

        ecl_original = pd * lgd * ead
        ecl_adjusted = pd_adjusted * lgd_adjusted * ead
        ecl_uplift = ((ecl_adjusted - ecl_original) / ecl_original * 100
                      if ecl_original > 0 else 0.0)

        # Détail par scénario
        scenario_details = {}
        for name, s in self.scenarios.items():
            pd_s = min(pd * s["pd_scalar"], 1.0)
            lgd_s = min(lgd * s["lgd_scalar"], 1.0)
            scenario_details[name] = {
                "probability": s["probability"],
                "pd_scalar": s["pd_scalar"],
                "lgd_scalar": s["lgd_scalar"],
                "pd_scenario": pd_s,
                "lgd_scenario": lgd_s,
                "ecl_scenario": pd_s * lgd_s * ead,
            }

        result = MacroAdjustmentResult(
            exposure_id=exposure_id,
            pd_original=pd,
            pd_adjusted=pd_adjusted,
            lgd_original=lgd,
            lgd_adjusted=lgd_adjusted,
            weighted_pd_scalar=self.weighted_pd_scalar,
            weighted_lgd_scalar=self.weighted_lgd_scalar,
            ecl_original=ecl_original,
            ecl_adjusted=ecl_adjusted,
            ecl_uplift_pct=ecl_uplift,
            scenario_details=scenario_details,
        )

        self._audit_log.append(result.to_dict())
        return result

    def adjust_portfolio(
        self,
        portfolio_df: pd.DataFrame,
        pd_col: str = "pd",
        lgd_col: str = "lgd",
        ead_col: str = "ead",
        id_col: str = "exposure_id",
    ) -> pd.DataFrame:
        """Ajustement batch sur portefeuille."""
        results = []
        for _, row in portfolio_df.iterrows():
            result = self.adjust(
                exposure_id=str(row.get(id_col, _)),
                pd=row[pd_col],
                lgd=row[lgd_col],
                ead=row[ead_col],
            )
            results.append(result.to_dict())
        return pd.DataFrame(results)

    def sensitivity_analysis(
        self,
        pd: float,
        lgd: float,
        ead: float,
    ) -> Dict:
        """
        Analyse de sensibilité : impact de chaque scénario sur l'ECL.
        """
        base_ecl = pd * lgd * ead
        analysis = {"base_ecl": round(base_ecl, 2)}

        for name, s in self.scenarios.items():
            pd_s = min(pd * s["pd_scalar"], 1.0)
            lgd_s = min(lgd * s["lgd_scalar"], 1.0)
            ecl_s = pd_s * lgd_s * ead
            analysis[name] = {
                "ecl": round(ecl_s, 2),
                "ecl_delta": round(ecl_s - base_ecl, 2),
                "ecl_delta_pct": round((ecl_s - base_ecl) / base_ecl * 100, 2) if base_ecl > 0 else 0,
                "probability": s["probability"],
                "contribution": round(s["probability"] * ecl_s, 2),
            }

        analysis["weighted_ecl"] = round(
            sum(
                s["probability"] * min(pd * s["pd_scalar"], 1.0) * min(lgd * s["lgd_scalar"], 1.0) * ead
                for s in self.scenarios.values()
            ), 2
        )

        return analysis

    def get_audit_log(self) -> List[Dict]:
        return self._audit_log.copy()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    adjuster = ForwardLookingAdjuster()

    # Ajustement individuel
    result = adjuster.adjust("EXPO-001", pd=0.05, lgd=0.45, ead=10_000_000)
    print(f"ECL: {result.ecl_original:,.0f} → {result.ecl_adjusted:,.0f} XAF (+{result.ecl_uplift_pct:.1f}%)")

    # Analyse de sensibilité
    sensitivity = adjuster.sensitivity_analysis(pd=0.05, lgd=0.45, ead=10_000_000)
    print(f"\nWeighted ECL: {sensitivity['weighted_ecl']:,.0f} XAF")
    for name in ["base", "adverse", "severe"]:
        s = sensitivity[name]
        print(f"  {name}: ECL={s['ecl']:,.0f} (Δ={s['ecl_delta_pct']:+.1f}%)")
