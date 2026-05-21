"""
Forward-Looking Macro Adjustment v2 — CEMAC / BEAC
====================================================
Ajustement forward-looking pour le calcul ECL IFRS 9.

Améliorations vs v1 :
- Scalars PD/LGD sectoriels distincts (pétrole ≠ télécoms ≠ gouvernement)
- Détection de régime macro (expansion / neutral / contraction / crise)
- Connecteur World Bank / BEAC optionnel pour données live
- Bayesian updating des probabilités de scénario
- Analyse de sensibilité par indicateur macro
- Conforme IFRS 9 §B5.5.51 (pondération probabiliste, pas scénario unique)

Auteur  : Octaix Risk Engine
Version : 2.0.0
"""

import numpy as np
import pandas as pd
import logging
import json
import os
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

# ── Scénarios macro CEMAC — calibrés sur données BEAC 2010-2024 ────────────────
# Sources : BEAC Rapport Annuel 2023, FMI Art IV CEMAC, World Bank CEM 2024
DEFAULT_SCENARIOS = [
    {
        "name": "base",
        "probability": 0.55,
        "macro": {
            "gdp_growth_cemac": 3.5,
            "oil_price_usd": 75.0,
            "beac_rate": 5.0,
            "inflation_cemac": 2.8,
        },
        "pd_scalar": 1.00,
        "lgd_scalar": 1.00,
    },
    {
        "name": "adverse",
        "probability": 0.30,
        "macro": {
            "gdp_growth_cemac": 1.2,
            "oil_price_usd": 55.0,
            "beac_rate": 6.0,
            "inflation_cemac": 5.0,
        },
        "pd_scalar": 1.30,
        "lgd_scalar": 1.10,
    },
    {
        "name": "severe",
        "probability": 0.15,
        "macro": {
            "gdp_growth_cemac": -1.5,
            "oil_price_usd": 35.0,
            "beac_rate": 7.5,
            "inflation_cemac": 8.0,
        },
        "pd_scalar": 1.80,
        "lgd_scalar": 1.25,
    },
]

# ── Scalars sectoriels — impact différencié du cycle macro ────────────────────
SECTOR_SCENARIO_SCALARS: Dict[str, Dict[str, Dict]] = {
    "OIL_GAS":      {"base": {"pd": 1.00, "lgd": 1.00}, "adverse": {"pd": 1.60, "lgd": 1.20}, "severe": {"pd": 2.40, "lgd": 1.45}},
    "MINING":       {"base": {"pd": 1.00, "lgd": 1.00}, "adverse": {"pd": 1.45, "lgd": 1.15}, "severe": {"pd": 2.10, "lgd": 1.35}},
    "AGRICULTURE":  {"base": {"pd": 1.00, "lgd": 1.00}, "adverse": {"pd": 1.25, "lgd": 1.12}, "severe": {"pd": 1.70, "lgd": 1.28}},
    "CONSTRUCTION": {"base": {"pd": 1.00, "lgd": 1.00}, "adverse": {"pd": 1.35, "lgd": 1.18}, "severe": {"pd": 1.90, "lgd": 1.38}},
    "TRANSPORT":    {"base": {"pd": 1.00, "lgd": 1.00}, "adverse": {"pd": 1.20, "lgd": 1.08}, "severe": {"pd": 1.65, "lgd": 1.22}},
    "RETAIL":       {"base": {"pd": 1.00, "lgd": 1.00}, "adverse": {"pd": 1.15, "lgd": 1.06}, "severe": {"pd": 1.50, "lgd": 1.18}},
    "TELECOM":      {"base": {"pd": 1.00, "lgd": 1.00}, "adverse": {"pd": 1.08, "lgd": 1.03}, "severe": {"pd": 1.30, "lgd": 1.12}},
    "BANKING":      {"base": {"pd": 1.00, "lgd": 1.00}, "adverse": {"pd": 1.25, "lgd": 1.10}, "severe": {"pd": 1.75, "lgd": 1.30}},
    "GOVERNMENT":   {"base": {"pd": 1.00, "lgd": 1.00}, "adverse": {"pd": 1.10, "lgd": 1.02}, "severe": {"pd": 1.35, "lgd": 1.08}},
    "UTILITIES":    {"base": {"pd": 1.00, "lgd": 1.00}, "adverse": {"pd": 1.12, "lgd": 1.05}, "severe": {"pd": 1.45, "lgd": 1.15}},
    "MANUFACTURING":{"base": {"pd": 1.00, "lgd": 1.00}, "adverse": {"pd": 1.28, "lgd": 1.12}, "severe": {"pd": 1.75, "lgd": 1.30}},
    "SERVICES":     {"base": {"pd": 1.00, "lgd": 1.00}, "adverse": {"pd": 1.18, "lgd": 1.07}, "severe": {"pd": 1.55, "lgd": 1.20}},
    "UNKNOWN":      {"base": {"pd": 1.00, "lgd": 1.00}, "adverse": {"pd": 1.30, "lgd": 1.10}, "severe": {"pd": 1.80, "lgd": 1.25}},
}

# ── Seuils de détection de régime ─────────────────────────────────────────────
REGIME_THRESHOLDS = {
    "expansion":   {"gdp_min": 3.0, "oil_min": 65.0},
    "contraction": {"gdp_max": 1.5, "oil_max": 60.0},
    "crisis":      {"gdp_max": 0.0, "oil_max": 45.0},
}

# Vraisemblances P(régime | scénario) pour Bayesian updating
_REGIME_LIKELIHOODS: Dict[str, Dict[str, float]] = {
    "base":    {"expansion": 0.70, "neutral": 0.55, "contraction": 0.25, "crisis": 0.05},
    "adverse": {"expansion": 0.20, "neutral": 0.35, "contraction": 0.55, "crisis": 0.30},
    "severe":  {"expansion": 0.10, "neutral": 0.10, "contraction": 0.20, "crisis": 0.65},
}


@dataclass
class MacroState:
    """État macro actuel utilisé pour le Bayesian updating."""
    gdp_growth_cemac: float = 3.5
    oil_price_usd: float = 75.0
    beac_rate: float = 5.0
    inflation_cemac: float = 2.8
    regime: str = "expansion"
    data_date: str = ""
    source: str = "default"

    def to_dict(self) -> dict:
        return {
            "gdp_growth_cemac": self.gdp_growth_cemac,
            "oil_price_usd": self.oil_price_usd,
            "beac_rate": self.beac_rate,
            "inflation_cemac": self.inflation_cemac,
            "regime": self.regime,
            "data_date": self.data_date,
            "source": self.source,
        }


@dataclass
class MacroAdjustmentResult:
    """Résultat d'ajustement forward-looking pour une exposition."""
    exposure_id: str
    sector: str
    pd_original: float
    pd_adjusted: float
    lgd_original: float
    lgd_adjusted: float
    weighted_pd_scalar: float
    weighted_lgd_scalar: float
    ecl_original: float
    ecl_adjusted: float
    ecl_uplift_pct: float
    regime: str
    scenario_details: List[Dict] = field(default_factory=list)
    calculation_timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict:
        return {
            "exposure_id": self.exposure_id,
            "sector": self.sector,
            "pd_original": round(self.pd_original, 6),
            "pd_adjusted": round(self.pd_adjusted, 6),
            "lgd_original": round(self.lgd_original, 4),
            "lgd_adjusted": round(self.lgd_adjusted, 4),
            "weighted_pd_scalar": round(self.weighted_pd_scalar, 4),
            "weighted_lgd_scalar": round(self.weighted_lgd_scalar, 4),
            "ecl_original": round(self.ecl_original, 2),
            "ecl_adjusted": round(self.ecl_adjusted, 2),
            "ecl_uplift_pct": round(self.ecl_uplift_pct, 2),
            "regime": self.regime,
            "scenario_details": self.scenario_details,
            "calculation_timestamp": self.calculation_timestamp,
        }


class ForwardLookingAdjusterV2:
    """
    Moteur d'ajustement forward-looking IFRS 9 v2 — Zone CEMAC.

    Scalars sectoriels distincts selon le scénario (OIL_GAS vs TELECOM vs GOVERNMENT).
    Bayesian updating des probabilités de scénario selon le régime macro observé.
    Connecteur World Bank / BEAC pour données live (optionnel — fallback auto).
    """

    def __init__(
        self,
        scenarios: Optional[List[Dict]] = None,
        macro_state: Optional[MacroState] = None,
        sector_scalars: Optional[Dict] = None,
    ):
        self.scenarios = scenarios or DEFAULT_SCENARIOS
        self.sector_scalars = sector_scalars or SECTOR_SCENARIO_SCALARS
        self.macro_state = macro_state or MacroState()

        total_prob = sum(s["probability"] for s in self.scenarios)
        if abs(total_prob - 1.0) > 1e-6:
            raise ValueError(f"Probabilités scénarios = {total_prob:.4f} ≠ 1.0")

        self._adjusted_scenarios = self._bayesian_update(self.scenarios, self.macro_state)
        self._weighted_default_pd  = sum(s["probability"] * s["pd_scalar"]  for s in self._adjusted_scenarios)
        self._weighted_default_lgd = sum(s["probability"] * s["lgd_scalar"] for s in self._adjusted_scenarios)

        logger.info(
            f"ForwardLookingAdjusterV2 — régime={self.macro_state.regime}, "
            f"PD scalar={self._weighted_default_pd:.3f}, LGD scalar={self._weighted_default_lgd:.3f}"
        )

    # ── Ajustement principal ───────────────────────────────────────────────────

    def adjust(
        self,
        exposure_id: str,
        pd: float,
        lgd: float,
        ead: float,
        sector: str = "UNKNOWN",
    ) -> MacroAdjustmentResult:
        """
        Ajustement forward-looking sectoriel conforme IFRS 9 §B5.5.51.
        Pondération probabiliste sur 3 scénarios avec scalars sectoriels.
        """
        sector_key = sector.upper() if sector else "UNKNOWN"
        sector_cfg = self.sector_scalars.get(sector_key, self.sector_scalars["UNKNOWN"])

        scenario_details = []
        weighted_pd_scalar = 0.0
        weighted_lgd_scalar = 0.0

        for scen in self._adjusted_scenarios:
            name = scen["name"]
            prob = scen["probability"]

            if name in sector_cfg:
                pd_sc  = sector_cfg[name]["pd"]
                lgd_sc = sector_cfg[name]["lgd"]
            else:
                pd_sc  = scen["pd_scalar"]
                lgd_sc = scen["lgd_scalar"]

            pd_scen  = min(pd * pd_sc, 1.0)
            lgd_scen = min(lgd * lgd_sc, 1.0)
            ecl_scen = pd_scen * lgd_scen * ead

            weighted_pd_scalar  += prob * pd_sc
            weighted_lgd_scalar += prob * lgd_sc

            scenario_details.append({
                "scenario": name,
                "probability": round(prob, 4),
                "pd_scalar": round(pd_sc, 4),
                "lgd_scalar": round(lgd_sc, 4),
                "pd_scenario": round(pd_scen, 6),
                "lgd_scenario": round(lgd_scen, 4),
                "ecl_scenario": round(ecl_scen, 2),
                "macro": scen.get("macro", {}),
            })

        pd_adjusted  = min(pd * weighted_pd_scalar, 1.0)
        lgd_adjusted = min(lgd * weighted_lgd_scalar, 1.0)
        ecl_original = pd * lgd * ead
        ecl_adjusted = pd_adjusted * lgd_adjusted * ead
        uplift = ((ecl_adjusted / ecl_original) - 1) * 100 if ecl_original > 0 else 0.0

        return MacroAdjustmentResult(
            exposure_id=exposure_id,
            sector=sector_key,
            pd_original=pd,
            pd_adjusted=pd_adjusted,
            lgd_original=lgd,
            lgd_adjusted=lgd_adjusted,
            weighted_pd_scalar=weighted_pd_scalar,
            weighted_lgd_scalar=weighted_lgd_scalar,
            ecl_original=ecl_original,
            ecl_adjusted=ecl_adjusted,
            ecl_uplift_pct=uplift,
            regime=self.macro_state.regime,
            scenario_details=scenario_details,
        )

    def adjust_portfolio(self, portfolio_df: pd.DataFrame) -> pd.DataFrame:
        """Ajustement batch sur portefeuille."""
        results = []
        for _, row in portfolio_df.iterrows():
            r = self.adjust(
                exposure_id=str(row.get("exposure_id", _)),
                pd=float(row.get("pd", row.get("pd_current", 0.05))),
                lgd=float(row.get("lgd", 0.45)),
                ead=float(row.get("ead", 0)),
                sector=str(row.get("sector", "UNKNOWN")),
            )
            results.append(r.to_dict())
        return pd.DataFrame(results)

    def sensitivity_analysis(self, pd: float, lgd: float, ead: float, sector: str = "UNKNOWN") -> Dict:
        """Analyse de sensibilité ECL par variation des indicateurs macro."""
        base_result = self.adjust("_base", pd, lgd, ead, sector)
        sensitivities = {}

        for delta_oil in [-20, -10, +10, +20]:
            s = MacroState(
                gdp_growth_cemac=self.macro_state.gdp_growth_cemac,
                oil_price_usd=max(0, self.macro_state.oil_price_usd + delta_oil),
                beac_rate=self.macro_state.beac_rate,
                inflation_cemac=self.macro_state.inflation_cemac,
            )
            s.regime = self._detect_regime(s)
            adj = ForwardLookingAdjusterV2(self._bayesian_update(self.scenarios, s), s, self.sector_scalars)
            r = adj.adjust("_sens", pd, lgd, ead, sector)
            sensitivities[f"oil_{delta_oil:+d}usd"] = {
                "ecl": round(r.ecl_adjusted, 2),
                "delta_pct": round(r.ecl_adjusted / base_result.ecl_adjusted * 100 - 100, 1) if base_result.ecl_adjusted else 0,
            }

        for delta_gdp in [-2, -1, +1, +2]:
            s = MacroState(
                gdp_growth_cemac=self.macro_state.gdp_growth_cemac + delta_gdp,
                oil_price_usd=self.macro_state.oil_price_usd,
                beac_rate=self.macro_state.beac_rate,
                inflation_cemac=self.macro_state.inflation_cemac,
            )
            s.regime = self._detect_regime(s)
            adj = ForwardLookingAdjusterV2(self._bayesian_update(self.scenarios, s), s, self.sector_scalars)
            r = adj.adjust("_sens", pd, lgd, ead, sector)
            sensitivities[f"gdp_{delta_gdp:+d}pp"] = {
                "ecl": round(r.ecl_adjusted, 2),
                "delta_pct": round(r.ecl_adjusted / base_result.ecl_adjusted * 100 - 100, 1) if base_result.ecl_adjusted else 0,
            }

        return {
            "base_ecl": round(base_result.ecl_adjusted, 2),
            "regime": base_result.regime,
            "sector": sector,
            "sensitivities": sensitivities,
        }

    def update_macro_state(self, new_state: MacroState) -> None:
        """Met à jour l'état macro et recalcule les probabilités Bayesiennes."""
        self.macro_state = new_state
        self._adjusted_scenarios = self._bayesian_update(self.scenarios, new_state)
        self._weighted_default_pd  = sum(s["probability"] * s["pd_scalar"]  for s in self._adjusted_scenarios)
        self._weighted_default_lgd = sum(s["probability"] * s["lgd_scalar"] for s in self._adjusted_scenarios)
        logger.info(
            f"[MacroUpdate] Régime={new_state.regime}, PIB={new_state.gdp_growth_cemac}%, "
            f"Pétrole=${new_state.oil_price_usd}, PD scalar={self._weighted_default_pd:.3f}"
        )

    def get_scenario_summary(self) -> Dict:
        """Résumé des scénarios actifs pour le reporting COBAC."""
        return {
            "macro_state": self.macro_state.to_dict(),
            "scenarios": [
                {
                    "name": s["name"],
                    "probability": round(s["probability"], 4),
                    "pd_scalar": round(s["pd_scalar"], 4),
                    "lgd_scalar": round(s["lgd_scalar"], 4),
                    "macro": s.get("macro", {}),
                }
                for s in self._adjusted_scenarios
            ],
            "weighted_pd_scalar": round(self._weighted_default_pd, 4),
            "weighted_lgd_scalar": round(self._weighted_default_lgd, 4),
        }

    # ── Connecteur BEAC / World Bank ──────────────────────────────────────────

    @staticmethod
    def fetch_beac_indicators(fallback_on_error: bool = True) -> Optional[MacroState]:
        """
        Tente de récupérer les indicateurs macro CEMAC via l'API World Bank (Cameroun proxy).
        Retourne None si le réseau est indisponible — fallback sur données par défaut.
        """
        try:
            import urllib.request
            year = datetime.utcnow().year - 1

            def _fetch(indicator: str) -> Optional[float]:
                url = f"https://api.worldbank.org/v2/country/CMR/indicator/{indicator}?format=json&mrv=1&date={year}"
                try:
                    with urllib.request.urlopen(url, timeout=5) as resp:
                        data = json.loads(resp.read())
                        val = data[1][0].get("value") if data and len(data) > 1 else None
                        return float(val) if val is not None else None
                except Exception:
                    return None

            gdp = _fetch("NY.GDP.MKTP.KD.ZG")
            inflation = _fetch("FP.CPI.TOTL.ZG")

            if gdp is None and inflation is None:
                logger.warning("[MacroConnector] World Bank API indisponible — défauts utilisés")
                return None

            state = MacroState(
                gdp_growth_cemac=gdp or 3.5,
                inflation_cemac=inflation or 2.8,
                oil_price_usd=75.0,
                beac_rate=5.0,
                data_date=str(year),
                source="worldbank_api",
            )
            state.regime = ForwardLookingAdjusterV2._detect_regime(state)
            logger.info(f"[MacroConnector] PIB={state.gdp_growth_cemac}%, Inflation={state.inflation_cemac}%, Régime={state.regime}")
            return state

        except Exception as e:
            if fallback_on_error:
                logger.warning(f"[MacroConnector] Erreur: {e} — défauts utilisés")
                return None
            raise

    @staticmethod
    def load_from_file(path: str) -> Optional[MacroState]:
        """
        Charge les indicateurs macro depuis un fichier JSON (mise à jour manuelle BEAC).
        Format: {"gdp_growth_cemac": 3.2, "oil_price_usd": 72.0, ...}
        """
        try:
            with open(path, "r") as f:
                data = json.load(f)
            valid_fields = MacroState.__dataclass_fields__.keys()
            state = MacroState(**{k: v for k, v in data.items() if k in valid_fields})
            state.regime = ForwardLookingAdjusterV2._detect_regime(state)
            logger.info(f"[MacroConnector] Données chargées depuis {path} — régime={state.regime}")
            return state
        except FileNotFoundError:
            logger.warning(f"[MacroConnector] Fichier non trouvé : {path}")
            return None

    # ── Helpers ────────────────────────────────────────────────────────────────

    @staticmethod
    def _detect_regime(state: MacroState) -> str:
        gdp = state.gdp_growth_cemac
        oil = state.oil_price_usd
        if gdp <= REGIME_THRESHOLDS["crisis"]["gdp_max"] or oil <= REGIME_THRESHOLDS["crisis"]["oil_max"]:
            return "crisis"
        elif gdp <= REGIME_THRESHOLDS["contraction"]["gdp_max"] or oil <= REGIME_THRESHOLDS["contraction"]["oil_max"]:
            return "contraction"
        elif gdp >= REGIME_THRESHOLDS["expansion"]["gdp_min"] and oil >= REGIME_THRESHOLDS["expansion"]["oil_min"]:
            return "expansion"
        return "neutral"

    @staticmethod
    def _bayesian_update(scenarios: List[Dict], state: MacroState) -> List[Dict]:
        """Bayesian updating des probabilités de scénario selon le régime observé."""
        regime = state.regime
        updated, total_weight = [], 0.0
        for scen in scenarios:
            name = scen["name"]
            prior = scen["probability"]
            likelihood = _REGIME_LIKELIHOODS.get(name, {}).get(regime, 1.0)
            posterior = prior * likelihood
            updated.append({**scen, "_posterior": posterior})
            total_weight += posterior
        result = []
        for s in updated:
            new_prob = s["_posterior"] / total_weight if total_weight > 0 else s["probability"]
            orig_prob = next(o["probability"] for o in scenarios if o["name"] == s["name"])
            if abs(new_prob - orig_prob) > 0.05:
                logger.info(f"[BayesianUpdate] {s['name']}: {orig_prob:.2%} → {new_prob:.2%} (régime={regime})")
            result.append({k: v for k, v in s.items() if k != "_posterior"} | {"probability": new_prob})
        return result


# ── Alias v1 pour compatibilité ascendante ─────────────────────────────────────

class ForwardLookingAdjuster(ForwardLookingAdjusterV2):
    """Alias pour compatibilité avec le code existant qui importe ForwardLookingAdjuster."""
    pass


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    adj = ForwardLookingAdjusterV2()

    r_oil = adj.adjust("EXPO-OIL", pd=0.05, lgd=0.45, ead=10_000_000, sector="OIL_GAS")
    r_tel = adj.adjust("EXPO-TEL", pd=0.05, lgd=0.45, ead=10_000_000, sector="TELECOM")

    print(f"\n[OIL_GAS]  PD scalar={r_oil.weighted_pd_scalar:.3f}, ECL uplift={r_oil.ecl_uplift_pct:.1f}%")
    print(f"[TELECOM]  PD scalar={r_tel.weighted_pd_scalar:.3f}, ECL uplift={r_tel.ecl_uplift_pct:.1f}%")

    # Régime de crise
    crisis = MacroState(gdp_growth_cemac=-2.0, oil_price_usd=35.0, beac_rate=7.5, inflation_cemac=8.0)
    crisis.regime = ForwardLookingAdjusterV2._detect_regime(crisis)
    adj_crisis = ForwardLookingAdjusterV2(macro_state=crisis)
    rc = adj_crisis.adjust("EXPO-CRISIS", pd=0.05, lgd=0.45, ead=10_000_000, sector="OIL_GAS")
    print(f"\n[OIL_GAS en CRISE] ECL uplift={rc.ecl_uplift_pct:.1f}%, régime={rc.regime}")

    sens = adj.sensitivity_analysis(pd=0.05, lgd=0.45, ead=10_000_000, sector="OIL_GAS")
    print(f"\n[Sensibilité OIL_GAS] ECL base={sens['base_ecl']:,.0f} XAF")
    for k, v in sens["sensitivities"].items():
        print(f"  {k:20s}: ECL={v['ecl']:,.0f}, Δ={v['delta_pct']:+.1f}%")
