"""
LGD Model — Loss Given Default (Proxy / Simulation)
======================================================
Modèle de LGD basé sur des hypothèses métier et une simulation réaliste
pour le MVP, en attendant des données de recouvrement réelles.

Approches implémentées :
1. LGD Segmentée (règles métier par type de garantie)
2. Beta Regression Proxy (distribution paramétrique)
3. Workout LGD Simulator (flux de recouvrement simulés)

Conforme aux exigences Bâle III pour Foundation IRB.

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import logging
from typing import Optional, Dict, List
from dataclasses import dataclass, field
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


# ─── LGD Segments par type de garantie (pratiques CEMAC) ─────────────
LGD_SEGMENTS = {
    "unsecured": {
        "mean_lgd": 0.55,
        "std_lgd": 0.15,
        "floor": 0.25,      # Floor Bâle III (non-garanti)
        "cap": 1.0,
        "description": "Prêts non garantis (consommation, trésorerie)"
    },
    "real_estate": {
        "mean_lgd": 0.25,
        "std_lgd": 0.10,
        "floor": 0.10,      # Floor Bâle III (immobilier résidentiel)
        "cap": 0.80,
        "description": "Prêts garantis par hypothèque immobilière"
    },
    "vehicle": {
        "mean_lgd": 0.40,
        "std_lgd": 0.12,
        "floor": 0.15,
        "cap": 0.85,
        "description": "Prêts auto / véhicule"
    },
    "cash_collateral": {
        "mean_lgd": 0.10,
        "std_lgd": 0.05,
        "floor": 0.05,
        "cap": 0.30,
        "description": "DAT, nantissement de dépôts"
    },
    "government_guarantee": {
        "mean_lgd": 0.20,
        "std_lgd": 0.08,
        "floor": 0.10,
        "cap": 0.50,
        "description": "Garanties étatiques / souveraines"
    },
}


@dataclass
class LGDResult:
    """Résultat d'estimation LGD."""
    exposure_id: str
    lgd_estimate: float
    lgd_downturn: float  # LGD en conditions de stress
    collateral_type: str
    recovery_rate: float
    estimation_method: str
    confidence_interval: tuple
    calculation_timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict:
        return {
            "exposure_id": self.exposure_id,
            "lgd_estimate": round(self.lgd_estimate, 4),
            "lgd_downturn": round(self.lgd_downturn, 4),
            "recovery_rate": round(self.recovery_rate, 4),
            "collateral_type": self.collateral_type,
            "estimation_method": self.estimation_method,
            "confidence_interval_low": round(self.confidence_interval[0], 4),
            "confidence_interval_high": round(self.confidence_interval[1], 4),
            "calculation_timestamp": self.calculation_timestamp,
        }


class LGDModel:
    """
    Modèle LGD pour le MVP Credit Risk Engine.
    
    Architecture :
    1. Estimation segmentée par type de garantie
    2. Ajustement Downturn LGD (stress conditions)
    3. Simulation de variation via distribution Beta
    4. Workout LGD proxy (flux de recouvrement simulés)
    """

    DOWNTURN_SCALAR = 1.25  # Facteur Downturn (Bâle III, +25%)

    def __init__(self, segments: Optional[Dict] = None):
        self.segments = segments or LGD_SEGMENTS
        # _rng is retained for workout_lgd_simulation only (scenario analysis tool).
        # The point estimate in estimate() is deterministic — same inputs always yield same LGD.
        self._rng = np.random.default_rng(42)
        self._audit_log: List[Dict] = []

        logger.info(
            f"LGDModel initialisé — {len(self.segments)} segments de garantie"
        )

    def estimate(
        self,
        exposure_id: str,
        collateral_type: str = "unsecured",
        collateral_value: float = 0.0,
        ead: float = 0.0,
        seniority: str = "senior",
    ) -> LGDResult:
        """
        Estime la LGD pour une exposition individuelle.
        
        Args:
            exposure_id: Identifiant de l'exposition
            collateral_type: Type de garantie
            collateral_value: Valeur de la garantie
            ead: Exposure At Default
            seniority: Séniorité de la créance ('senior' ou 'subordinated')
        """
        segment = self.segments.get(collateral_type, self.segments["unsecured"])

        mean = segment["mean_lgd"]
        std = segment["std_lgd"]

        # Deterministic point estimate: use segment mean LGD directly.
        # Stochastic beta sampling was replaced because non-deterministic LGD
        # violates reproducibility requirements for regulatory capital (same
        # inputs must always yield the same ECL — BCBS supervisory expectation).
        lgd_estimate = np.clip(mean, segment["floor"], segment["cap"])

        # Ajustement par taux de couverture (collateral coverage ratio)
        if ead > 0 and collateral_value > 0:
            coverage_ratio = min(collateral_value / ead, 1.0)
            lgd_estimate *= (1 - 0.5 * coverage_ratio)
            lgd_estimate = max(lgd_estimate, segment["floor"])

        # Ajustement séniorité
        if seniority == "subordinated":
            lgd_estimate = min(lgd_estimate * 1.15, segment["cap"])

        # Downturn LGD
        lgd_downturn = min(lgd_estimate * self.DOWNTURN_SCALAR, 1.0)

        # Intervalle de confiance (approx via quantiles Beta)
        ci_low = max(segment["floor"], mean - 1.96 * std)
        ci_high = min(segment["cap"], mean + 1.96 * std)

        result = LGDResult(
            exposure_id=exposure_id,
            lgd_estimate=lgd_estimate,
            lgd_downturn=lgd_downturn,
            collateral_type=collateral_type,
            recovery_rate=1 - lgd_estimate,
            estimation_method="beta_regression_proxy",
            confidence_interval=(ci_low, ci_high),
        )

        self._audit_log.append({
            "action": "lgd_estimation",
            "input": {
                "exposure_id": exposure_id,
                "collateral_type": collateral_type,
                "collateral_value": collateral_value,
                "ead": ead,
            },
            "output": result.to_dict(),
        })

        return result

    def _beta_params(self, mean: float, std: float) -> tuple:
        """Calcule les paramètres alpha/beta à partir de mean/std."""
        mean = np.clip(mean, 0.01, 0.99)
        variance = std ** 2
        variance = min(variance, mean * (1 - mean) - 1e-6)

        alpha = mean * (mean * (1 - mean) / variance - 1)
        beta = (1 - mean) * (mean * (1 - mean) / variance - 1)

        return max(alpha, 0.5), max(beta, 0.5)

    def estimate_portfolio(
        self,
        portfolio_df: pd.DataFrame,
        id_col: str = "exposure_id",
        collateral_col: str = "collateral_type",
        collateral_value_col: str = "collateral_value",
        ead_col: str = "ead",
    ) -> pd.DataFrame:
        """Estimation batch LGD sur portefeuille."""
        results = []
        for _, row in portfolio_df.iterrows():
            result = self.estimate(
                exposure_id=str(row.get(id_col, _)),
                collateral_type=row.get(collateral_col, "unsecured"),
                collateral_value=float(row.get(collateral_value_col, 0)),
                ead=float(row.get(ead_col, 0)),
            )
            results.append(result.to_dict())
        return pd.DataFrame(results)

    def workout_lgd_simulation(
        self,
        ead: float,
        collateral_type: str = "unsecured",
        recovery_horizon_months: int = 36,
    ) -> Dict:
        """
        Simulation Workout LGD avec flux de recouvrement.
        Simule un scénario de recouvrement réaliste post-défaut.
        """
        segment = self.segments.get(collateral_type, self.segments["unsecured"])

        # Simulation de recouvrement mensuel
        monthly_recoveries = []
        remaining = ead
        total_recovered = 0
        total_costs = 0

        for month in range(1, recovery_horizon_months + 1):
            # Probabilité de recouvrement décroissante
            recovery_prob = max(0.3 * np.exp(-0.03 * month), 0.01)
            recovery_amount = remaining * recovery_prob * self._rng.uniform(0.5, 1.5)
            recovery_amount = min(recovery_amount, remaining)

            # Coûts de recouvrement
            legal_costs = recovery_amount * 0.05

            total_recovered += recovery_amount
            total_costs += legal_costs
            remaining -= recovery_amount

            monthly_recoveries.append({
                "month": month,
                "recovered": round(recovery_amount, 2),
                "costs": round(legal_costs, 2),
                "remaining": round(remaining, 2),
            })

            if remaining < ead * 0.01:
                break

        net_recovery = total_recovered - total_costs
        workout_lgd = max(0, (ead - net_recovery) / ead) if ead > 0 else 1.0

        return {
            "ead": ead,
            "total_recovered": round(total_recovered, 2),
            "total_costs": round(total_costs, 2),
            "net_recovery": round(net_recovery, 2),
            "workout_lgd": round(workout_lgd, 4),
            "recovery_rate": round(1 - workout_lgd, 4),
            "months_to_resolution": len(monthly_recoveries),
            "monthly_cash_flows": monthly_recoveries[:6],  # First 6 months
        }

    def get_audit_log(self) -> List[Dict]:
        return self._audit_log.copy()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    model = LGDModel()

    # Estimation individuelle
    result = model.estimate("EXPO-001", collateral_type="real_estate", ead=10_000_000, collateral_value=8_000_000)
    print(f"[{result.exposure_id}] LGD={result.lgd_estimate:.2%}, Downturn={result.lgd_downturn:.2%}")

    # Workout simulation
    workout = model.workout_lgd_simulation(ead=5_000_000, collateral_type="unsecured")
    print(f"\nWorkout LGD: {workout['workout_lgd']:.2%}, Recovery: {workout['recovery_rate']:.2%}")
