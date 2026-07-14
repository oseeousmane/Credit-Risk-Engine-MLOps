
"""
Advanced Model Validation — PD Model
=======================================
Validation avancee conforme aux exigences bancaires :
1. Discrimination : AUC, Gini, KS
2. Calibration : Brier, Hosmer-Lemeshow, calibration curve
3. Stability : PSI
4. Decile Analysis : PD distribution par decile
5. ROC Curve generation
6. Temporal validation (proxy)

Auteur  : Credit Risk Engine
Version : 2.0.0
"""

import numpy as np
import pandas as pd
import os

import json
import logging
from typing import Dict, Optional, Tuple, List
from datetime import datetime
from sklearn.metrics import (
    roc_auc_score, roc_curve, brier_score_loss, precision_recall_curve,
    average_precision_score, log_loss, confusion_matrix,
)
from scipy import stats

logger = logging.getLogger(__name__)


class AdvancedModelValidator:
    """
    Suite de validation avancee pour le modele PD.
    
    Genere un rapport complet couvrant :
    - Discrimination (AUC/Gini/KS)
    - Calibration (Brier/HL/calibration curve)
    - Decile analysis
    - ROC/PR curves (data pour plotting)
    - Temporal stability
    """

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = output_dir or os.path.join(
            os.path.dirname(__file__), "validation_reports"
        )
        os.makedirs(self.output_dir, exist_ok=True)
        self.results: Dict = {}

    # ─── DISCRIMINATION ──────────────────────────────────────
    def compute_discrimination(self, y_true: np.ndarray, y_pred: np.ndarray) -> Dict:
        """Calcul des metriques de discrimination."""
        auc = roc_auc_score(y_true, y_pred)
        gini = 2 * auc - 1

        # KS statistic
        fpr, tpr, thresholds = roc_curve(y_true, y_pred)
        ks = max(tpr - fpr)
        ks_threshold = thresholds[np.argmax(tpr - fpr)]

        # Average precision
        ap = average_precision_score(y_true, y_pred)

        # ROC curve data (for plotting)
        roc_data = {
            "fpr": fpr.tolist(),
            "tpr": tpr.tolist(),
            "thresholds": thresholds.tolist(),
        }

        # PR curve data
        precision, recall, pr_thresholds = precision_recall_curve(y_true, y_pred)

        result = {
            "auc_roc": round(auc, 6),
            "gini": round(gini, 6),
            "ks_statistic": round(ks, 6),
            "ks_threshold": round(float(ks_threshold), 6),
            "average_precision": round(ap, 6),
            "log_loss": round(log_loss(y_true, y_pred), 6),
            "roc_curve": roc_data,
            "pr_curve": {
                "precision": precision.tolist(),
                "recall": recall.tolist(),
            },
        }

        logger.info(f"Discrimination: AUC={auc:.4f}, Gini={gini:.4f}, KS={ks:.4f}")
        return result

    # ─── CALIBRATION ─────────────────────────────────────────
    def compute_calibration(self, y_true: np.ndarray, y_pred: np.ndarray, n_bins: int = 10) -> Dict:
        """Calibration metrics and curve."""
        brier = brier_score_loss(y_true, y_pred)

        # Calibration curve (binned)
        bin_edges = np.linspace(0, 1, n_bins + 1)
        bin_indices = np.digitize(y_pred, bin_edges) - 1
        bin_indices = np.clip(bin_indices, 0, n_bins - 1)

        cal_data = []
        for i in range(n_bins):
            mask = bin_indices == i
            if mask.sum() > 0:
                cal_data.append({
                    "bin": i,
                    "mean_predicted": round(float(y_pred[mask].mean()), 6),
                    "mean_observed": round(float(y_true[mask].mean()), 6),
                    "count": int(mask.sum()),
                    "bin_range": f"[{bin_edges[i]:.2f}, {bin_edges[i+1]:.2f})",
                })

        # Hosmer-Lemeshow test
        hl_stat, hl_pvalue = self._hosmer_lemeshow(y_true, y_pred, n_groups=10)

        # Calibration ratio (observed / predicted default rate)
        overall_predicted = y_pred.mean()
        overall_observed = y_true.mean()
        cal_ratio = overall_observed / overall_predicted if overall_predicted > 0 else 0

        result = {
            "brier_score": round(brier, 6),
            "hosmer_lemeshow_stat": round(hl_stat, 4),
            "hosmer_lemeshow_pvalue": round(hl_pvalue, 4),
            "calibration_ratio": round(cal_ratio, 4),
            "overall_predicted_dr": round(float(overall_predicted), 6),
            "overall_observed_dr": round(float(overall_observed), 6),
            "calibration_curve": cal_data,
        }

        logger.info(f"Calibration: Brier={brier:.4f}, HL p={hl_pvalue:.4f}, CR={cal_ratio:.3f}")
        return result

    def _hosmer_lemeshow(self, y_true, y_pred, n_groups=10) -> Tuple[float, float]:
        """Hosmer-Lemeshow goodness-of-fit test."""
        try:
            order = np.argsort(y_pred)
            y_true_sorted = np.array(y_true)[order]
            y_pred_sorted = np.array(y_pred)[order]

            groups = np.array_split(np.arange(len(y_true_sorted)), n_groups)

            hl_stat = 0.0
            for group in groups:
                obs_events = y_true_sorted[group].sum()
                exp_events = y_pred_sorted[group].sum()
                n_g = len(group)
                obs_nonevents = n_g - obs_events
                exp_nonevents = n_g - exp_events

                if exp_events > 0:
                    hl_stat += (obs_events - exp_events) ** 2 / exp_events
                if exp_nonevents > 0:
                    hl_stat += (obs_nonevents - exp_nonevents) ** 2 / exp_nonevents

            pvalue = 1 - stats.chi2.cdf(hl_stat, n_groups - 2)
            return hl_stat, pvalue
        except Exception:
            return 0.0, 1.0

    # ─── DECILE ANALYSIS ─────────────────────────────────────
    def compute_decile_analysis(self, y_true: np.ndarray, y_pred: np.ndarray) -> List[Dict]:
        """Analyse par deciles de PD."""
        df = pd.DataFrame({"y_true": y_true, "y_pred": y_pred})
        df["decile"] = pd.qcut(df["y_pred"], 10, labels=False, duplicates="drop") + 1

        deciles = []
        for decile in sorted(df["decile"].unique()):
            group = df[df["decile"] == decile]
            deciles.append({
                "decile": int(decile),
                "count": len(group),
                "pd_mean": round(float(group["y_pred"].mean()), 6),
                "pd_min": round(float(group["y_pred"].min()), 6),
                "pd_max": round(float(group["y_pred"].max()), 6),
                "actual_dr": round(float(group["y_true"].mean()), 6),
                "n_defaults": int(group["y_true"].sum()),
                "capture_rate": round(float(group["y_true"].sum() / y_true.sum()), 4) if y_true.sum() > 0 else 0,
            })

        logger.info(f"Decile analysis: {len(deciles)} deciles")
        return deciles

    # ─── TEMPORAL VALIDATION ─────────────────────────────────
    def compute_temporal_validation(
        self,
        y_true_train: np.ndarray, y_pred_train: np.ndarray,
        y_true_test: np.ndarray, y_pred_test: np.ndarray,
    ) -> Dict:
        """Compare performance train vs test (proxy temporal)."""
        train_auc = roc_auc_score(y_true_train, y_pred_train)
        test_auc = roc_auc_score(y_true_test, y_pred_test)

        train_brier = brier_score_loss(y_true_train, y_pred_train)
        test_brier = brier_score_loss(y_true_test, y_pred_test)

        train_dr = float(y_true_train.mean())
        test_dr = float(y_true_test.mean())

        # PSI between train and test predictions
        psi = self._compute_psi(y_pred_train, y_pred_test)

        # Overfitting check
        auc_gap = train_auc - test_auc
        overfitting_flag = auc_gap > 0.03

        result = {
            "train_auc": round(train_auc, 6),
            "test_auc": round(test_auc, 6),
            "auc_gap": round(auc_gap, 6),
            "train_brier": round(train_brier, 6),
            "test_brier": round(test_brier, 6),
            "train_default_rate": round(train_dr, 6),
            "test_default_rate": round(test_dr, 6),
            "prediction_psi": round(psi, 6),
            "overfitting_flag": overfitting_flag,
            "stability_status": "STABLE" if psi < 0.10 else "WARNING" if psi < 0.25 else "UNSTABLE",
        }

        logger.info(
            f"Temporal: Train AUC={train_auc:.4f}, Test AUC={test_auc:.4f}, "
            f"Gap={auc_gap:.4f}, PSI={psi:.4f}"
        )
        return result

    def _compute_psi(self, expected: np.ndarray, actual: np.ndarray, n_bins: int = 10) -> float:
        """Population Stability Index."""
        eps = 1e-4
        bins = np.linspace(0, 1, n_bins + 1)

        expected_hist = np.histogram(expected, bins=bins)[0] / len(expected) + eps
        actual_hist = np.histogram(actual, bins=bins)[0] / len(actual) + eps

        psi = np.sum((actual_hist - expected_hist) * np.log(actual_hist / expected_hist))
        return float(psi)

    # ─── CONFUSION MATRIX ────────────────────────────────────
    def compute_confusion_matrix(self, y_true: np.ndarray, y_pred: np.ndarray, threshold: float = 0.5) -> Dict:
        """Matrice de confusion a un seuil donne."""
        y_binary = (y_pred >= threshold).astype(int)
        cm = confusion_matrix(y_true, y_binary)

        tn, fp, fn, tp = cm.ravel()
        total = len(y_true)

        return {
            "threshold": threshold,
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp),
            "accuracy": round((tp + tn) / total, 4),
            "precision": round(tp / (tp + fp), 4) if (tp + fp) > 0 else 0,
            "recall": round(tp / (tp + fn), 4) if (tp + fn) > 0 else 0,
            "specificity": round(tn / (tn + fp), 4) if (tn + fp) > 0 else 0,
            "f1_score": round(2 * tp / (2 * tp + fp + fn), 4) if (2 * tp + fp + fn) > 0 else 0,
        }

    # ─── FULL REPORT ─────────────────────────────────────────
    def run_full_validation(
        self,
        y_true: np.ndarray, y_pred: np.ndarray,
        y_true_train: Optional[np.ndarray] = None,
        y_pred_train: Optional[np.ndarray] = None,
        model_name: str = "PD_LightGBM_v2",
        id_proxy: Optional[np.ndarray] = None,
    ) -> Dict:
        """
        Execute la validation complete et genere le rapport.
        """
        logger.info(f"=== Full Validation: {model_name} ===")

        self.results = {
            "model_name": model_name,
            "validation_timestamp": datetime.now().isoformat(),
            "n_samples": len(y_true),
            "n_defaults": int(y_true.sum()),
            "default_rate": round(float(y_true.mean()), 6),
            "discrimination": self.compute_discrimination(y_true, y_pred),
            "calibration": self.compute_calibration(y_true, y_pred),
            "decile_analysis": self.compute_decile_analysis(y_true, y_pred),
            "confusion_matrix": self.compute_confusion_matrix(y_true, y_pred),
        }

        # Temporal validation (if train data provided)
        if y_true_train is not None and y_pred_train is not None:
            self.results["temporal_validation"] = self.compute_temporal_validation(
                y_true_train, y_pred_train, y_true, y_pred
            )

        # Vintage analysis (si proxy temporel disponible)
        if id_proxy is not None and len(id_proxy) == len(y_true):
            self.results["vintage_analysis"] = self.compute_vintage_analysis(
                y_true, y_pred, id_proxy, n_vintages=5
            )

        # Overall assessment
        auc = self.results["discrimination"]["auc_roc"]
        gini = self.results["discrimination"]["gini"]
        brier = self.results["calibration"]["brier_score"]
        ks = self.results["discrimination"]["ks_statistic"]

        self.results["assessment"] = {
            "auc_pass": auc >= 0.70,
            "gini_pass": gini >= 0.40,
            "ks_pass": ks >= 0.20,
            "brier_pass": brier <= 0.10,
            "overall_pass": auc >= 0.70 and brier <= 0.10,
            "grade": "A" if auc >= 0.80 else "B" if auc >= 0.75 else "C" if auc >= 0.70 else "D",
        }

        return self.results

    # ─── VINTAGE ANALYSIS ────────────────────────────────────────
    def compute_vintage_analysis(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        id_proxy: np.ndarray,
        n_vintages: int = 5,
    ) -> Dict:
        """
        Analyse par vintage (tranche chronologique).

        Découpe les observations en N tranches ordonnées par ID (proxy temporel)
        et calcule pour chaque tranche :
          - AUC / Gini / KS
          - Taux de défaut observé
          - PSI de la distribution de scores vs tranche 1 (référence)

        Un Gini qui chute de >10pp entre la tranche 1 et la tranche N signale
        une dégradation temporelle — indicateur de leakage ou de concept drift.

        Args:
            id_proxy : SK_ID_CURR ou équivalent — tri chronologique proxy
            n_vintages : nombre de tranches (défaut 5)
        """
        from sklearn.metrics import roc_auc_score

        order = np.argsort(id_proxy)
        y_sorted    = np.array(y_true)[order]
        pred_sorted = np.array(y_pred)[order]
        n = len(y_sorted)
        chunk = n // n_vintages

        vintages = []
        ref_pred = None

        for i in range(n_vintages):
            start = i * chunk
            end   = start + chunk if i < n_vintages - 1 else n
            ys   = y_sorted[start:end]
            ps   = pred_sorted[start:end]

            if ref_pred is None:
                ref_pred = ps.copy()

            if ys.sum() < 5 or (1 - ys).sum() < 5:
                vintages.append({
                    "vintage": i + 1,
                    "n": int(len(ys)),
                    "default_rate": round(float(ys.mean()), 4),
                    "auc": None, "gini": None, "ks": None, "psi_vs_v1": None,
                    "status": "INSUFFICIENT_EVENTS",
                })
                continue

            auc  = roc_auc_score(ys, ps)
            gini = 2 * auc - 1
            fpr, tpr, _ = __import__("sklearn.metrics", fromlist=["roc_curve"]).roc_curve(ys, ps)
            ks   = float(max(tpr - fpr))
            psi  = self._compute_psi(ref_pred, ps)

            status = "STABLE"
            if psi > 0.20:
                status = "UNSTABLE"
            elif psi > 0.10 or gini < 0.40:
                status = "MONITOR"

            vintages.append({
                "vintage": i + 1,
                "n": int(len(ys)),
                "default_rate": round(float(ys.mean()), 4),
                "auc":  round(float(auc),  4),
                "gini": round(float(gini), 4),
                "ks":   round(float(ks),   4),
                "psi_vs_v1": round(float(psi), 4),
                "status": status,
            })

        # Dégradation du Gini entre premier et dernier vintage
        valid = [v for v in vintages if v["gini"] is not None]
        gini_drift = round(valid[0]["gini"] - valid[-1]["gini"], 4) if len(valid) >= 2 else 0.0
        temporal_stability = "STABLE" if gini_drift < 0.10 else "DEGRADED"

        result = {
            "n_vintages":        n_vintages,
            "vintages":          vintages,
            "gini_drift_v1_vN":  gini_drift,
            "temporal_stability": temporal_stability,
            "stability_warning": gini_drift >= 0.10,
        }

        logger.info(
            f"Vintage analysis: Gini V1={valid[0]['gini']:.3f} → "
            f"V{n_vintages}={valid[-1]['gini']:.3f} | "
            f"Drift={gini_drift:+.3f} | Status={temporal_stability}"
        )
        return result

    def save_report(self, filename: Optional[str] = None) -> str:
        """Sauvegarde le rapport de validation en JSON."""
        if not self.results:
            raise ValueError("No validation results to save")

        filename = filename or f"validation_{self.results.get('model_name', 'model')}_{datetime.now().strftime('%Y%m%d')}.json"
        path = os.path.join(self.output_dir, filename)

        with open(path, "w") as f:
            json.dump(self.results, f, indent=2, default=str)

        logger.info(f"Validation report saved: {path}")
        return path
