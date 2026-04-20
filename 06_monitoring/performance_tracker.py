"""
Performance Tracker — Model Performance Monitoring
=====================================================
Suivi continu des performances du modèle en production.

Métriques suivies :
- AUC / Gini (discrimination)
- Brier Score (calibration)
- Default rate vs predicted PD (calibration trend)
- Score distribution statistics
- Prediction volume & latency

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import json
import os
import logging
from typing import Optional, Dict, List
from datetime import datetime
from sklearn.metrics import roc_auc_score, brier_score_loss

logger = logging.getLogger(__name__)


class PerformanceTracker:
    """
    Tracker de performance du modèle en production.
    
    Collecte et analyse les métriques de performance sur des fenêtres
    temporelles glissantes pour détecter la dégradation.
    """

    # Seuils de dégradation
    AUC_DEGRADATION_THRESHOLD = 0.03   # Baisse AUC > 3pp → alerte
    BRIER_DEGRADATION_THRESHOLD = 0.02 # Hausse Brier > 2pp → alerte

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = output_dir or os.path.join(
            os.path.dirname(__file__), "metrics"
        )
        os.makedirs(self.output_dir, exist_ok=True)
        self._metrics_history: List[Dict] = []
        self._baseline_metrics: Optional[Dict] = None

    def set_baseline(self, auc: float, brier: float, default_rate: float):
        """Définit les métriques de baseline (lors du déploiement)."""
        self._baseline_metrics = {
            "auc": auc,
            "brier": brier,
            "default_rate": default_rate,
            "timestamp": datetime.utcnow().isoformat(),
        }
        logger.info(f"Baseline défini: AUC={auc:.4f}, Brier={brier:.4f}")

    def track(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        period_name: str = "current",
        prediction_count: int = 0,
        avg_latency_ms: float = 0.0,
    ) -> Dict:
        """
        Enregistre et analyse les métriques pour une période donnée.
        """
        auc = roc_auc_score(y_true, y_pred) if y_true.sum() > 0 and y_true.sum() < len(y_true) else None
        gini = 2 * auc - 1 if auc else None
        brier = brier_score_loss(y_true, y_pred)
        observed_dr = float(y_true.mean())
        predicted_pd_mean = float(y_pred.mean())

        metrics = {
            "period": period_name,
            "timestamp": datetime.utcnow().isoformat(),
            "n_observations": len(y_true),
            "n_defaults": int(y_true.sum()),
            "discrimination": {
                "auc": round(auc, 6) if auc else None,
                "gini": round(gini, 6) if gini else None,
            },
            "calibration": {
                "brier_score": round(brier, 6),
                "observed_default_rate": round(observed_dr, 6),
                "predicted_pd_mean": round(predicted_pd_mean, 6),
                "calibration_ratio": round(
                    observed_dr / predicted_pd_mean, 4
                ) if predicted_pd_mean > 0 else None,
            },
            "operational": {
                "prediction_count": prediction_count,
                "avg_latency_ms": round(avg_latency_ms, 2),
            },
            "score_distribution": {
                "mean": round(float(y_pred.mean()), 6),
                "std": round(float(y_pred.std()), 6),
                "median": round(float(np.median(y_pred)), 6),
                "p5": round(float(np.percentile(y_pred, 5)), 6),
                "p25": round(float(np.percentile(y_pred, 25)), 6),
                "p75": round(float(np.percentile(y_pred, 75)), 6),
                "p95": round(float(np.percentile(y_pred, 95)), 6),
            },
        }

        # Comparison with baseline
        if self._baseline_metrics and auc:
            auc_delta = auc - self._baseline_metrics["auc"]
            brier_delta = brier - self._baseline_metrics["brier"]

            metrics["vs_baseline"] = {
                "auc_delta": round(auc_delta, 6),
                "brier_delta": round(brier_delta, 6),
                "auc_degraded": auc_delta < -self.AUC_DEGRADATION_THRESHOLD,
                "brier_degraded": brier_delta > self.BRIER_DEGRADATION_THRESHOLD,
            }

        self._metrics_history.append(metrics)

        # Save
        metrics_path = os.path.join(
            self.output_dir, f"metrics_{period_name}.json"
        )
        with open(metrics_path, "w") as f:
            json.dump(metrics, f, indent=2, default=str)

        logger.info(
            f"Tracking [{period_name}]: AUC={auc:.4f if auc else 'N/A'}, "
            f"Brier={brier:.4f}, DR={observed_dr:.2%}"
        )

        return metrics

    def get_trend(self, n_periods: int = 12) -> pd.DataFrame:
        """Retourne l'historique des métriques pour analyse de tendance."""
        recent = self._metrics_history[-n_periods:]
        rows = []
        for m in recent:
            rows.append({
                "period": m["period"],
                "timestamp": m["timestamp"],
                "auc": m["discrimination"].get("auc"),
                "brier": m["calibration"]["brier_score"],
                "observed_dr": m["calibration"]["observed_default_rate"],
                "predicted_pd": m["calibration"]["predicted_pd_mean"],
                "n_observations": m["n_observations"],
            })
        return pd.DataFrame(rows)

    def get_metrics_history(self) -> List[Dict]:
        return self._metrics_history.copy()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    tracker = PerformanceTracker()

    tracker.set_baseline(auc=0.78, brier=0.065, default_rate=0.08)

    np.random.seed(42)
    for month in range(1, 7):
        n = 2000
        y_true = np.random.binomial(1, 0.07 + month * 0.002, n)
        y_pred = np.clip(np.random.beta(2, 20, n) + y_true * 0.15, 0, 1)

        metrics = tracker.track(y_true, y_pred, period_name=f"2024-M{month:02d}")

    trend = tracker.get_trend()
    print(f"\nTrend ({len(trend)} periods):")
    print(trend[["period", "auc", "brier", "observed_dr"]].to_string(index=False))
