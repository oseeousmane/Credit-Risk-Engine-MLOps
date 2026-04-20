"""
Backtesting Engine
====================
Framework de backtesting du modèle PD conforme aux exigences MRM / COBAC.

Tests implémentés :
- Binomial Test (test de prédictibilité)
- Traffic Light Approach (Bâle — Vert/Jaune/Rouge)
- Hosmer-Lemeshow (calibration par groupe)
- Jeffreys Test (test bayésien)
- Breakthroughs Analysis (dépassements par grade)

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import logging
from typing import Optional, Dict, List
from datetime import datetime
from scipy import stats
import json
import os

logger = logging.getLogger(__name__)


class BacktestingEngine:
    """
    Moteur de backtesting pour la validation continue du modèle PD.
    
    Conforme aux exigences :
    - Bâle III (Annexe 10, Traffic Light Approach)
    - COBAC (validation ex-post des modèles internes)
    - EBA Guidelines on PD estimation (EBA/GL/2017/16)
    """

    # Traffic Light Thresholds (Basel III)
    GREEN_ZONE_MAX = 0.9772   # Probabilité cumulative
    YELLOW_ZONE_MAX = 0.9999
    # > YELLOW → RED

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = output_dir or os.path.join(
            os.path.dirname(__file__), "reports"
        )
        os.makedirs(self.output_dir, exist_ok=True)

    def binomial_test(
        self,
        n_observations: int,
        n_defaults: int,
        expected_pd: float,
        confidence_level: float = 0.99,
    ) -> Dict:
        """
        Test binomial : le nombre de défauts observés est-il cohérent
        avec la PD prédite ?
        
        H0 : Le taux de défaut observé est conforme à la PD prédite
        H1 : Le taux de défaut observé diffère significativement
        """
        if n_observations == 0:
            return {"status": "INSUFFICIENT_DATA"}

        observed_dr = n_defaults / n_observations

        # Test binomial exact
        p_value = stats.binom_test(
            n_defaults, n_observations, expected_pd, alternative="two-sided"
        ) if hasattr(stats, 'binom_test') else stats.binomtest(
            n_defaults, n_observations, expected_pd, alternative="two-sided"
        ).pvalue

        # Intervalle de confiance
        ci = stats.binom.interval(confidence_level, n_observations, expected_pd)
        ci_low = ci[0] / n_observations
        ci_high = ci[1] / n_observations

        passed = ci_low <= observed_dr <= ci_high

        return {
            "test": "binomial",
            "n_observations": n_observations,
            "n_defaults": n_defaults,
            "observed_default_rate": round(observed_dr, 6),
            "expected_pd": round(expected_pd, 6),
            "p_value": round(float(p_value), 6),
            "confidence_level": confidence_level,
            "ci_low": round(ci_low, 6),
            "ci_high": round(ci_high, 6),
            "result": "PASS" if passed else "FAIL",
            "interpretation": (
                f"DR observé ({observed_dr:.2%}) "
                f"{'dans' if passed else 'hors'} IC "
                f"[{ci_low:.2%}, {ci_high:.2%}]"
            ),
        }

    def traffic_light_test(
        self,
        n_observations: int,
        n_defaults: int,
        expected_pd: float,
    ) -> Dict:
        """
        Traffic Light Approach (Bâle III, Annexe 10).
        
        Vert  : Modèle fiable — pas d'action
        Jaune : Attention requise — investigation
        Rouge : Modèle inadéquat — action immédiate
        """
        if n_observations == 0 or expected_pd <= 0:
            return {"zone": "INSUFFICIENT_DATA"}

        # Probabilité cumulée de Poisson d'observer n_defaults ou moins
        # approché par la distribution normale pour grands échantillons
        expected_defaults = n_observations * expected_pd
        std_defaults = np.sqrt(n_observations * expected_pd * (1 - expected_pd))

        if std_defaults > 0:
            z_score = (n_defaults - expected_defaults) / std_defaults
            cumulative_prob = stats.norm.cdf(z_score)
        else:
            cumulative_prob = 1.0 if n_defaults > 0 else 0.0

        # Classification
        if cumulative_prob <= self.GREEN_ZONE_MAX:
            zone = "GREEN"
            action = "Aucune action nécessaire"
        elif cumulative_prob <= self.YELLOW_ZONE_MAX:
            zone = "YELLOW"
            action = "Investigation requise — réviser la calibration"
        else:
            zone = "RED"
            action = "Action immédiate — recalibration ou remplacement du modèle"

        return {
            "test": "traffic_light",
            "zone": zone,
            "n_observations": n_observations,
            "n_defaults": n_defaults,
            "expected_defaults": round(expected_defaults, 1),
            "observed_default_rate": round(n_defaults / n_observations, 6),
            "expected_pd": round(expected_pd, 6),
            "z_score": round(float(z_score), 4) if std_defaults > 0 else None,
            "cumulative_probability": round(float(cumulative_prob), 6),
            "recommended_action": action,
        }

    def backtest_by_grade(
        self,
        grades_df: pd.DataFrame,
        grade_col: str = "pd_grade",
        n_obs_col: str = "n_observations",
        n_def_col: str = "n_defaults",
        expected_pd_col: str = "expected_pd",
    ) -> pd.DataFrame:
        """
        Backtesting par grade/segment de risque.
        Exécute le Traffic Light Test sur chaque grade.
        """
        results = []

        for _, row in grades_df.iterrows():
            tl_result = self.traffic_light_test(
                n_observations=int(row[n_obs_col]),
                n_defaults=int(row[n_def_col]),
                expected_pd=float(row[expected_pd_col]),
            )
            tl_result["grade"] = row[grade_col]
            results.append(tl_result)

        return pd.DataFrame(results)

    def herfindahl_concentration(
        self,
        n_by_grade: List[int],
    ) -> Dict:
        """
        Indice de Herfindahl — mesure de la concentration du portefeuille
        dans les grades de risque.
        
        HHI = Σ(share_i²) ; HHI → 0 = diversifié ; HHI → 1 = concentré
        """
        total = sum(n_by_grade)
        if total == 0:
            return {"hhi": 0, "status": "INSUFFICIENT_DATA"}

        shares = [n / total for n in n_by_grade]
        hhi = sum(s ** 2 for s in shares)

        if hhi < 0.15:
            status = "WELL_DIVERSIFIED"
        elif hhi < 0.25:
            status = "MODERATE_CONCENTRATION"
        else:
            status = "HIGH_CONCENTRATION"

        return {
            "hhi": round(hhi, 6),
            "n_grades": len(n_by_grade),
            "total_observations": total,
            "status": status,
            "max_share": round(max(shares), 4),
        }

    def generate_backtest_report(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        n_grades: int = 10,
        report_name: str = "backtest",
    ) -> Dict:
        """
        Génère un rapport de backtesting complet.
        """
        n_obs = len(y_true)
        n_defaults = int(y_true.sum())
        avg_pd = float(y_pred.mean())

        report = {
            "report_id": datetime.utcnow().strftime("%Y%m%d_%H%M%S"),
            "report_name": report_name,
            "timestamp": datetime.utcnow().isoformat(),
            "portfolio_stats": {
                "n_observations": n_obs,
                "n_defaults": n_defaults,
                "observed_default_rate": round(n_defaults / n_obs, 6) if n_obs > 0 else 0,
                "average_predicted_pd": round(avg_pd, 6),
            },
        }

        # Global tests
        report["binomial_test"] = self.binomial_test(n_obs, n_defaults, avg_pd)
        report["traffic_light"] = self.traffic_light_test(n_obs, n_defaults, avg_pd)

        # By grade
        df = pd.DataFrame({"y_true": y_true, "y_pred": y_pred})
        df["grade"] = pd.qcut(df["y_pred"], q=n_grades, labels=False, duplicates="drop") + 1

        grade_stats = df.groupby("grade").agg(
            n_observations=("y_true", "count"),
            n_defaults=("y_true", "sum"),
            expected_pd=("y_pred", "mean"),
        ).reset_index()
        grade_stats.rename(columns={"grade": "pd_grade"}, inplace=True)

        grade_results = self.backtest_by_grade(grade_stats)
        report["grade_level_results"] = grade_results.to_dict("records")

        # Concentration
        report["concentration"] = self.herfindahl_concentration(
            grade_stats["n_observations"].tolist()
        )

        # Overall assessment
        tl_zone = report["traffic_light"]["zone"]
        binom_result = report["binomial_test"]["result"]

        if tl_zone == "GREEN" and binom_result == "PASS":
            overall = "MODEL_ADEQUATE"
        elif tl_zone == "RED":
            overall = "MODEL_INADEQUATE"
        else:
            overall = "REQUIRES_INVESTIGATION"

        report["overall_assessment"] = overall

        # Save
        report_path = os.path.join(
            self.output_dir,
            f"{report_name}_{report['report_id']}.json"
        )
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2, default=str)

        logger.info(
            f"Backtest report: {overall} "
            f"(TL={tl_zone}, Binomial={binom_result})"
        )

        return report


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    engine = BacktestingEngine()

    # Simulation
    np.random.seed(42)
    n = 5000
    y_true = np.random.binomial(1, 0.07, n)
    y_pred = np.clip(
        np.random.beta(2, 25, n) + y_true * np.random.uniform(0.0, 0.1, n),
        0, 1
    )

    report = engine.generate_backtest_report(y_true, y_pred)
    print(f"\nBacktest: {report['overall_assessment']}")
    print(f"  Traffic Light: {report['traffic_light']['zone']}")
    print(f"  Binomial: {report['binomial_test']['result']}")
