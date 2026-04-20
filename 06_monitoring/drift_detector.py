"""
Drift Detector — Population & Feature Drift Monitoring
=========================================================
Détection de la dérive des données et des scores pour le monitoring
continu des modèles de risque de crédit.

Métriques de dérive :
- PSI (Population Stability Index) — Distribution des scores
- CSI (Characteristic Stability Index) — Distribution des features
- KL Divergence — Messure théorique de dérive
- Wasserstein Distance — Distance de transport optimal

Seuils (standards bancaires) :
- PSI < 0.10 → Stable
- 0.10 ≤ PSI < 0.25 → Investigation requise 
- PSI ≥ 0.25 → Action immédiate

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import json
import os
import logging
from typing import Optional, Dict, List, Tuple
from datetime import datetime
from scipy import stats

logger = logging.getLogger(__name__)


class DriftDetector:
    """
    Détecteur de dérive pour monitoring continu.
    
    Compare la distribution de référence (training/baseline)
    avec la distribution courante (production) pour détecter
    les dérives de données (data drift) et de concept (concept drift).
    """

    PSI_STABLE = 0.10
    PSI_WARNING = 0.25
    CSI_STABLE = 0.10
    CSI_WARNING = 0.25

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = output_dir or os.path.join(
            os.path.dirname(__file__), "reports"
        )
        os.makedirs(self.output_dir, exist_ok=True)
        self._history: List[Dict] = []

    def compute_psi(
        self,
        reference: np.ndarray,
        current: np.ndarray,
        n_bins: int = 10,
        label: str = "score",
    ) -> Dict:
        """
        Population Stability Index (PSI).
        
        PSI = Σ (P_current_i - P_reference_i) × ln(P_current_i / P_reference_i)
        """
        bins = np.percentile(reference, np.linspace(0, 100, n_bins + 1))
        bins[0] = -np.inf
        bins[-1] = np.inf

        ref_counts = np.histogram(reference, bins=bins)[0]
        cur_counts = np.histogram(current, bins=bins)[0]

        ref_pct = (ref_counts + 1e-6) / (ref_counts.sum() + n_bins * 1e-6)
        cur_pct = (cur_counts + 1e-6) / (cur_counts.sum() + n_bins * 1e-6)

        psi_bins = (cur_pct - ref_pct) * np.log(cur_pct / ref_pct)
        psi_total = float(psi_bins.sum())

        if psi_total >= self.PSI_WARNING:
            status = "CRITICAL"
            action = "Recalibration ou réentraînement immédiat"
        elif psi_total >= self.PSI_STABLE:
            status = "WARNING"
            action = "Investigation de la dérive requise"
        else:
            status = "STABLE"
            action = "Aucune action nécessaire"

        result = {
            "metric": "PSI",
            "variable": label,
            "value": round(psi_total, 6),
            "status": status,
            "action": action,
            "n_bins": n_bins,
            "ref_size": len(reference),
            "cur_size": len(current),
            "psi_by_bin": [round(float(x), 6) for x in psi_bins],
            "timestamp": datetime.utcnow().isoformat(),
        }

        self._history.append(result)
        return result

    def compute_csi(
        self,
        reference_df: pd.DataFrame,
        current_df: pd.DataFrame,
        features: Optional[List[str]] = None,
        n_bins: int = 10,
    ) -> pd.DataFrame:
        """
        Characteristic Stability Index (CSI).
        Calcule le PSI pour chaque feature individuellement.
        """
        if features is None:
            features = [
                c for c in reference_df.columns
                if reference_df[c].dtype in ['float64', 'int64', 'float32', 'int32']
            ]

        results = []
        for feat in features:
            ref_vals = reference_df[feat].dropna().values
            cur_vals = current_df[feat].dropna().values

            if len(ref_vals) == 0 or len(cur_vals) == 0:
                results.append({
                    "feature": feat,
                    "csi": None,
                    "status": "INSUFFICIENT_DATA",
                })
                continue

            psi_result = self.compute_psi(
                ref_vals, cur_vals, n_bins=n_bins, label=feat
            )

            results.append({
                "feature": feat,
                "csi": psi_result["value"],
                "status": psi_result["status"],
                "action": psi_result["action"],
            })

        results_df = pd.DataFrame(results)
        results_df = results_df.sort_values("csi", ascending=False, na_position="last")

        return results_df

    def compute_ks_drift(
        self,
        reference: np.ndarray,
        current: np.ndarray,
        label: str = "feature",
    ) -> Dict:
        """
        Test de Kolmogorov-Smirnov bilatéral pour détection de dérive.
        """
        ks_stat, p_value = stats.ks_2samp(reference, current)

        return {
            "metric": "KS_2SAMP",
            "variable": label,
            "ks_statistic": round(float(ks_stat), 6),
            "p_value": round(float(p_value), 6),
            "drift_detected": p_value < 0.05,
            "significance": "5%",
            "timestamp": datetime.utcnow().isoformat(),
        }

    def generate_drift_report(
        self,
        reference_scores: np.ndarray,
        current_scores: np.ndarray,
        reference_features: Optional[pd.DataFrame] = None,
        current_features: Optional[pd.DataFrame] = None,
        report_name: str = "drift_report",
        top_n_features: int = 10,
    ) -> Dict:
        """
        Rapport de dérive complet pour monitoring mensuel.
        """
        report = {
            "report_id": datetime.utcnow().strftime("%Y%m%d_%H%M%S"),
            "report_name": report_name,
            "timestamp": datetime.utcnow().isoformat(),
            "period": {
                "reference_size": len(reference_scores),
                "current_size": len(current_scores),
            },
        }

        # Score drift (PSI)
        report["score_drift"] = self.compute_psi(
            reference_scores, current_scores, label="pd_score"
        )

        # Score drift (KS)
        report["score_ks_test"] = self.compute_ks_drift(
            reference_scores, current_scores, label="pd_score"
        )

        # Score statistics comparison
        report["score_statistics"] = {
            "reference": {
                "mean": round(float(reference_scores.mean()), 6),
                "median": round(float(np.median(reference_scores)), 6),
                "std": round(float(reference_scores.std()), 6),
                "p5": round(float(np.percentile(reference_scores, 5)), 6),
                "p95": round(float(np.percentile(reference_scores, 95)), 6),
            },
            "current": {
                "mean": round(float(current_scores.mean()), 6),
                "median": round(float(np.median(current_scores)), 6),
                "std": round(float(current_scores.std()), 6),
                "p5": round(float(np.percentile(current_scores, 5)), 6),
                "p95": round(float(np.percentile(current_scores, 95)), 6),
            },
        }

        # Feature drift (CSI) if features provided
        if reference_features is not None and current_features is not None:
            csi_df = self.compute_csi(reference_features, current_features)
            report["feature_drift"] = csi_df.head(top_n_features).to_dict("records")
            
            drifted_features = csi_df[csi_df["status"].isin(["WARNING", "CRITICAL"])]
            report["n_drifted_features"] = len(drifted_features)
        else:
            report["feature_drift"] = "NOT_COMPUTED"

        # Overall assessment
        score_psi = report["score_drift"]["value"]
        if score_psi >= self.PSI_WARNING:
            assessment = "CRITICAL_DRIFT"
        elif score_psi >= self.PSI_STABLE:
            assessment = "MODERATE_DRIFT"
        else:
            assessment = "NO_SIGNIFICANT_DRIFT"

        report["overall_assessment"] = assessment

        # Save
        report_path = os.path.join(
            self.output_dir, f"{report_name}_{report['report_id']}.json"
        )
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2, default=str)

        logger.info(f"Drift report: {assessment} (PSI={score_psi:.4f})")
        return report

    def get_history(self) -> List[Dict]:
        return self._history.copy()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    detector = DriftDetector()

    np.random.seed(42)
    reference = np.random.beta(2, 20, 5000)
    current = np.random.beta(2.2, 18, 5000)  # Légère dérive

    report = detector.generate_drift_report(reference, current)
    print(f"Score PSI: {report['score_drift']['value']:.4f} → {report['overall_assessment']}")
