"""
RAROC Calculator — Risk-Adjusted Return on Capital
====================================================
Calcul du RAROC conforme Bâle II/III pour l'évaluation de la rentabilité
ajustée au risque des expositions de crédit.

    RAROC = (Revenus - Coûts - Expected Loss) / Economic Capital

Intègre :
- Calcul du capital économique (Basel III RWA-based)
- Comparaison avec le Hurdle Rate
- Pricing ajusté au risque
- Support portefeuille
- Audit trail

Auteur  : Credit Risk Engine  
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import yaml
import os
import logging
from dataclasses import dataclass, field
from typing import Optional, Dict, List
from datetime import datetime
import uuid
from scipy.stats import norm

logger = logging.getLogger(__name__)


@dataclass
class RAROCResult:
    """Résultat structuré du calcul RAROC."""
    exposure_id: str
    revenue: float
    cost_of_funds: float
    operating_cost: float
    expected_loss: float
    economic_capital: float
    raroc: float
    hurdle_rate: float
    value_created: bool  # RAROC > Hurdle Rate
    risk_adjusted_margin: float  # Marge nette ajustée au risque
    rwa: float  # Risk-Weighted Assets
    pricing_recommendation: str  # "ADEQUATE" / "UNDERPRICE" / "OVERPRICE"
    calculation_timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    calculation_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    def to_dict(self) -> dict:
        return {
            "exposure_id": self.exposure_id,
            "revenue": round(self.revenue, 2),
            "cost_of_funds": round(self.cost_of_funds, 2),
            "operating_cost": round(self.operating_cost, 2),
            "expected_loss": round(self.expected_loss, 2),
            "economic_capital": round(self.economic_capital, 2),
            "raroc": round(self.raroc, 6),
            "raroc_pct": f"{self.raroc:.2%}",
            "hurdle_rate": round(self.hurdle_rate, 4),
            "value_created": self.value_created,
            "risk_adjusted_margin": round(self.risk_adjusted_margin, 2),
            "rwa": round(self.rwa, 2),
            "pricing_recommendation": self.pricing_recommendation,
            "calculation_timestamp": self.calculation_timestamp,
            "calculation_id": self.calculation_id,
        }


class RAROCCalculator:
    """
    Calcul du Risk-Adjusted Return on Capital (RAROC).
    
    RAROC = (Revenue - Cost_of_Funds - OpEx - EL) / Economic_Capital
    
    Où :
    - Revenue = EAD × taux client
    - Cost of Funds = EAD × taux de refinancement
    - OpEx = coûts opérationnels alloués
    - EL = PD × LGD × EAD
    - Economic Capital = RWA × 8% (ratio Bâle) ou via formule IRB
    
    Paramètres de calcul du capital économique Bâle III :
    - K (IRB) = LGD × [N((1-R)^-0.5 × G(PD) + (R/(1-R))^0.5 × G(0.999)) - PD]
    - RWA = K × 12.5 × EAD
    """

    def __init__(self, config_path: Optional[str] = None):
        if config_path is None:
            config_path = os.path.join(
                os.path.dirname(__file__), "..", "config", "thresholds.yaml"
            )

        self.config = self._load_config(config_path)
        self._audit_log: List[Dict] = []

        # RAROC parameters
        raroc_config = self.config.get("raroc", {})
        self.hurdle_rate = raroc_config.get("target_hurdle_rate", 0.15)
        self.ec_multiplier = raroc_config.get("economic_capital_multiplier", 12.5)

        # Cost parameters (défaults pour zone CEMAC)
        self.default_funding_rate = 0.045    # Taux de refinancement BEAC ~4.5%
        self.default_operating_cost_ratio = 0.015  # 1.5% coûts opérationnels
        self.capital_ratio = 0.08  # 8% ratio de capital minimum Bâle

        logger.info(
            f"RAROCCalculator initialisé — Hurdle rate={self.hurdle_rate:.0%}, "
            f"Capital ratio={self.capital_ratio:.0%}"
        )

    def _load_config(self, config_path: str) -> dict:
        try:
            with open(config_path, "r") as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            logger.warning(f"Config non trouvée: {config_path}")
            return {}

    def _compute_irb_capital(
        self, pd: float, lgd: float, maturity: float = 2.5
    ) -> float:
        """
        Calcul du capital réglementaire IRB Foundation (Bâle III).
        
        K = LGD × [Φ((1-R)^-0.5 × Φ^-1(PD) + (R/(1-R))^0.5 × Φ^-1(0.999)) - PD]
            × (1 + (M - 2.5) × b) / (1 - 1.5 × b)
        
        Où R = corrélation d'actif, M = maturité, b = ajustement maturité
        """
        if pd <= 0 or pd >= 1:
            return 0.0

        # Corrélation d'actif (formule Bâle III pour corporates)
        R = 0.12 * (1 - np.exp(-50 * pd)) / (1 - np.exp(-50)) + \
            0.24 * (1 - (1 - np.exp(-50 * pd)) / (1 - np.exp(-50)))

        # Ajustement maturité
        b = (0.11852 - 0.05478 * np.log(pd)) ** 2

        # Capital (K)
        K = lgd * (
            norm.cdf(
                (1 - R) ** (-0.5) * norm.ppf(pd) +
                (R / (1 - R)) ** 0.5 * norm.ppf(0.999)
            ) - pd
        ) * (1 + (maturity - 2.5) * b) / (1 - 1.5 * b)

        return max(K, 0.0)

    def compute(
        self,
        exposure_id: str,
        pd: float,
        lgd: float,
        ead: float,
        client_rate: float,
        maturity_years: float = 5.0,
        funding_rate: Optional[float] = None,
        operating_cost_ratio: Optional[float] = None,
        use_irb: bool = True,
    ) -> RAROCResult:
        """
        Calcul RAROC pour une exposition individuelle.
        
        Args:
            exposure_id: Identifiant de l'exposition
            pd: Probability of Default
            lgd: Loss Given Default
            ead: Exposure At Default
            client_rate: Taux d'intérêt facturé au client
            maturity_years: Maturité en années
            funding_rate: Taux de refinancement (sinon BEAC default)
            operating_cost_ratio: Ratio coûts opérationnels
            use_irb: Si True, utilise la formule IRB pour le capital
            
        Returns:
            RAROCResult avec RAROC, recommandation pricing, etc.
        """
        funding = funding_rate or self.default_funding_rate
        opex_ratio = operating_cost_ratio or self.default_operating_cost_ratio

        # Composantes du P&L
        revenue = ead * client_rate
        cost_of_funds = ead * funding
        operating_cost = ead * opex_ratio
        expected_loss = pd * lgd * ead

        # Capital économique
        if use_irb:
            K = self._compute_irb_capital(pd, lgd, min(maturity_years, 5.0))
            economic_capital = K * ead * self.ec_multiplier * self.capital_ratio
            rwa = K * self.ec_multiplier * ead
        else:
            # Approche standard simplifiée
            rwa = ead * 1.0  # Pondération 100% standard
            economic_capital = rwa * self.capital_ratio

        # RAROC
        net_income = revenue - cost_of_funds - operating_cost - expected_loss
        raroc = net_income / economic_capital if economic_capital > 0 else 0.0

        # Analyse pricing
        value_created = raroc > self.hurdle_rate
        risk_adjusted_margin = net_income

        if raroc > self.hurdle_rate * 1.2:
            pricing_recommendation = "ADEQUATE"
        elif raroc >= self.hurdle_rate:
            pricing_recommendation = "MARGINAL"
        else:
            pricing_recommendation = "UNDERPRICED"

        result = RAROCResult(
            exposure_id=exposure_id,
            revenue=revenue,
            cost_of_funds=cost_of_funds,
            operating_cost=operating_cost,
            expected_loss=expected_loss,
            economic_capital=economic_capital,
            raroc=raroc,
            hurdle_rate=self.hurdle_rate,
            value_created=value_created,
            risk_adjusted_margin=risk_adjusted_margin,
            rwa=rwa,
            pricing_recommendation=pricing_recommendation,
        )

        # Audit trail
        self._audit_log.append({
            "action": "raroc_calculation",
            "timestamp": result.calculation_timestamp,
            "input": {
                "exposure_id": exposure_id,
                "pd": pd, "lgd": lgd, "ead": ead,
                "client_rate": client_rate,
            },
            "output": result.to_dict(),
        })

        logger.info(
            f"RAROC: {exposure_id} → {raroc:.2%} "
            f"({'✓ créateur de valeur' if value_created else '✗ destructeur'})"
        )

        return result

    def compute_minimum_rate(
        self,
        pd: float,
        lgd: float,
        ead: float,
        maturity_years: float = 5.0,
        funding_rate: Optional[float] = None,
        operating_cost_ratio: Optional[float] = None,
    ) -> float:
        """
        Calcul du taux minimum à facturer pour atteindre le Hurdle Rate.
        
        Résout : RAROC = hurdle_rate pour trouver le taux client minimum.
        
        min_rate = (hurdle_rate × EC + cost_of_funds + opex + EL) / EAD
        """
        funding = funding_rate or self.default_funding_rate
        opex_ratio = operating_cost_ratio or self.default_operating_cost_ratio

        K = self._compute_irb_capital(pd, lgd, min(maturity_years, 5.0))
        economic_capital = K * ead * self.ec_multiplier * self.capital_ratio
        
        expected_loss = pd * lgd * ead
        cost_of_funds = ead * funding
        operating_cost = ead * opex_ratio

        required_revenue = (
            self.hurdle_rate * economic_capital +
            cost_of_funds + operating_cost + expected_loss
        )

        min_rate = required_revenue / ead if ead > 0 else 0.0
        return min_rate

    def compute_portfolio(
        self,
        portfolio_df: pd.DataFrame,
        pd_col: str = "pd",
        lgd_col: str = "lgd",
        ead_col: str = "ead",
        rate_col: str = "client_rate",
        id_col: str = "exposure_id",
    ) -> pd.DataFrame:
        """Calcul RAROC batch sur portefeuille."""
        results = []
        for _, row in portfolio_df.iterrows():
            result = self.compute(
                exposure_id=str(row.get(id_col, _)),
                pd=row[pd_col],
                lgd=row[lgd_col],
                ead=row[ead_col],
                client_rate=row[rate_col],
            )
            results.append(result.to_dict())

        return pd.DataFrame(results)

    def get_portfolio_summary(self, results_df: pd.DataFrame) -> Dict:
        """Synthèse portefeuille RAROC pour comité risque."""
        total_ec = results_df["economic_capital"].sum()
        total_margin = results_df["risk_adjusted_margin"].sum()

        return {
            "portfolio_raroc": round(total_margin / total_ec, 6) if total_ec > 0 else 0,
            "total_economic_capital": round(total_ec, 2),
            "total_rwa": round(results_df["rwa"].sum(), 2),
            "total_expected_loss": round(results_df["expected_loss"].sum(), 2),
            "value_creating_pct": round(
                results_df["value_created"].mean(), 4
            ),
            "underpriced_count": int((results_df["pricing_recommendation"] == "UNDERPRICED").sum()),
            "adequate_count": int((results_df["pricing_recommendation"] == "ADEQUATE").sum()),
            "n_exposures": len(results_df),
            "timestamp": datetime.utcnow().isoformat(),
        }

    def get_audit_log(self) -> List[Dict]:
        return self._audit_log.copy()


if __name__ == "__main__":
    calc = RAROCCalculator()

    # Calcul individuel
    result = calc.compute(
        exposure_id="EXPO-001",
        pd=0.05,
        lgd=0.45,
        ead=10_000_000,
        client_rate=0.12,  # 12% taux client
    )
    print(f"[{result.exposure_id}] RAROC={result.raroc:.2%} → {result.pricing_recommendation}")

    # Taux minimum
    min_rate = calc.compute_minimum_rate(pd=0.05, lgd=0.45, ead=10_000_000)
    print(f"Taux minimum pour hurdle rate: {min_rate:.2%}")

    # Portefeuille
    portfolio = pd.DataFrame({
        "exposure_id": [f"EXP-{i:03d}" for i in range(4)],
        "pd": [0.02, 0.08, 0.15, 0.03],
        "lgd": [0.45, 0.55, 0.60, 0.40],
        "ead": [5_000_000, 10_000_000, 3_000_000, 20_000_000],
        "client_rate": [0.09, 0.14, 0.18, 0.08],
    })

    results = calc.compute_portfolio(portfolio)
    summary = calc.get_portfolio_summary(results)
    print(f"\n[Portfolio] RAROC = {summary['portfolio_raroc']:.2%}")
    print(f"  Value creating: {summary['value_creating_pct']:.0%}")
    print(f"  Underpriced: {summary['underpriced_count']}")
