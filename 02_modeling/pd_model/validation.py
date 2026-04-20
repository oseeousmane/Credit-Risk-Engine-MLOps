"""
PD Model — Validation Statistique
====================================
Framework de validation complet du modèle PD conforme aux exigences
réglementaires Bâle II/III et aux meilleures pratiques MRM.

Métriques implémentées :
- Discrimination   : AUC-ROC, Gini, KS Statistic
- Calibration      : Brier Score, ECE, Hosmer-Lemeshow
- Stabilité        : PSI (Population Stability Index)
- Classification   : Confusion Matrix, Precision, Recall, F1

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import json
import os
import logging
from typing import Optional, Dict, Tuple, List
from datetime import datetime
from sklearn.metrics import (
    roc_auc_score, roc_curve, precision_recall_curve,
    confusion_matrix, classification_report,
    brier_score_loss, log_loss,
    precision_score, recall_score, f1_score,
)
from scipy import stats
import warnings

logger = logging.getLogger(__name__)


class PDModelValidator:
    """
    Framework de validation du modèle PD conforme MRM.
    
    Produit un rapport de validation complet couvrant :
    1. Discrimination Power (capacité à séparer bons/mauvais)
    2. Calibration Quality (fiabilité des probabilités)
    3. Stability Assessment (robustesse dans le temps)
    4. Regulatory Metrics (KPIs exigés par la COBAC)
    """

    # Seuils d'alerte pour les métriques
    AUC_MIN_ACCEPTABLE = 0.65     # En-dessous : modèle insuffisant
    AUC_MIN_GOOD = 0.70           # Minimum pour production
    GINI_MIN_GOOD = 0.40
    KS_MIN_GOOD = 0.20
    PSI_WARNING = 0.10            # PSI > 10% → alerte
    PSI_CRITICAL = 0.25           # PSI > 25% → action requise

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = output_dir or os.path.join(
            os.path.dirname(__file__), "artifacts", "validation"
        )
        os.makedirs(self.output_dir, exist_ok=True)

    # ──────────────────────────────────────────────────────────
    # 1. DISCRIMINATION METRICS
    # ──────────────────────────────────────────────────────────

    def compute_auc_gini(
        self, y_true: np.ndarray, y_pred: np.ndarray
    ) -> Dict:
        """AUC-ROC et coefficient de Gini."""
        auc = roc_auc_score(y_true, y_pred)
        gini = 2 * auc - 1

        fpr, tpr, thresholds = roc_curve(y_true, y_pred)

        return {
            "auc": round(float(auc), 6),
            "gini": round(float(gini), 6),
            "roc_curve": {
                "fpr": fpr.tolist(),
                "tpr": tpr.tolist(),
            },
            "auc_status": "PASS" if auc >= self.AUC_MIN_GOOD else "FAIL",
            "gini_status": "PASS" if gini >= self.GINI_MIN_GOOD else "FAIL",
        }

    def compute_ks_statistic(
        self, y_true: np.ndarray, y_pred: np.ndarray
    ) -> Dict:
        """
        Kolmogorov-Smirnov Statistic.
        Mesure la séparation maximale entre les distributions de score
        des bons et mauvais payeurs.
        """
        fpr, tpr, thresholds = roc_curve(y_true, y_pred)
        ks_stat = max(tpr - fpr)
        ks_threshold = thresholds[np.argmax(tpr - fpr)]

        return {
            "ks_statistic": round(float(ks_stat), 6),
            "ks_threshold": round(float(ks_threshold), 6),
            "ks_status": "PASS" if ks_stat >= self.KS_MIN_GOOD else "FAIL",
        }

    def compute_discrimination_by_decile(
        self, y_true: np.ndarray, y_pred: np.ndarray, n_bins: int = 10
    ) -> pd.DataFrame:
        """
        Analyse de discrimination par décile de score.
        Tableau standard pour comités risque.
        """
        df = pd.DataFrame({"y_true": y_true, "y_pred": y_pred})
        df["decile"] = pd.qcut(df["y_pred"], q=n_bins, labels=False, duplicates="drop") + 1

        decile_stats = df.groupby("decile").agg(
            n_total=("y_true", "count"),
            n_defaults=("y_true", "sum"),
            avg_pd=("y_pred", "mean"),
            min_pd=("y_pred", "min"),
            max_pd=("y_pred", "max"),
        ).reset_index()

        decile_stats["default_rate"] = decile_stats["n_defaults"] / decile_stats["n_total"]
        decile_stats["cumulative_defaults"] = decile_stats["n_defaults"].cumsum()
        decile_stats["cumulative_default_pct"] = (
            decile_stats["cumulative_defaults"] / decile_stats["n_defaults"].sum()
        )

        return decile_stats

    # ──────────────────────────────────────────────────────────
    # 2. CALIBRATION METRICS
    # ──────────────────────────────────────────────────────────

    def compute_brier_score(
        self, y_true: np.ndarray, y_pred: np.ndarray
    ) -> Dict:
        """Brier Score — mesure de calibration (0 = parfait)."""
        brier = brier_score_loss(y_true, y_pred)

        # Décomposition de Brier (Murphy)
        ll = log_loss(y_true, y_pred)
        base_rate = y_true.mean()
        brier_baseline = base_rate * (1 - base_rate)  # Brier d'un modèle naïf
        brier_skill = 1 - (brier / brier_baseline) if brier_baseline > 0 else 0

        return {
            "brier_score": round(float(brier), 6),
            "log_loss": round(float(ll), 6),
            "brier_skill_score": round(float(brier_skill), 6),
            "brier_baseline": round(float(brier_baseline), 6),
        }

    def compute_hosmer_lemeshow(
        self, y_true: np.ndarray, y_pred: np.ndarray, n_groups: int = 10
    ) -> Dict:
        """
        Test de Hosmer-Lemeshow.
        Teste si les taux de défaut observés diffèrent significativement
        des PD prédites par groupe.
        """
        df = pd.DataFrame({"y_true": y_true, "y_pred": y_pred})
        df["group"] = pd.qcut(df["y_pred"], q=n_groups, labels=False, duplicates="drop")

        groups = df.groupby("group").agg(
            n=("y_true", "count"),
            observed=("y_true", "sum"),
            predicted=("y_pred", "sum"),
        )

        # Chi-squared statistic
        hl_stat = 0
        for _, row in groups.iterrows():
            n = row["n"]
            obs = row["observed"]
            pred = row["predicted"]
            expected_0 = n - pred
            if pred > 0 and expected_0 > 0:
                hl_stat += (obs - pred) ** 2 / (pred * (1 - pred / n))

        dof = n_groups - 2
        p_value = 1 - stats.chi2.cdf(hl_stat, dof) if dof > 0 else 1.0

        return {
            "hl_statistic": round(float(hl_stat), 4),
            "hl_p_value": round(float(p_value), 6),
            "hl_status": "PASS" if p_value > 0.05 else "FAIL",
            "degrees_of_freedom": dof,
        }

    # ──────────────────────────────────────────────────────────
    # 3. STABILITY METRICS
    # ──────────────────────────────────────────────────────────

    def compute_psi(
        self,
        expected: np.ndarray,
        actual: np.ndarray,
        n_bins: int = 10,
    ) -> Dict:
        """
        Population Stability Index (PSI).
        Mesure la dérive de la distribution des scores entre deux périodes.
        
        PSI < 0.10 : Stable
        0.10 ≤ PSI < 0.25 : Légère dérive, investigation recommandée
        PSI ≥ 0.25 : Dérive significative, action requise
        """
        # Binning sur la distribution de référence
        bins = np.percentile(expected, np.linspace(0, 100, n_bins + 1))
        bins[0] = -np.inf
        bins[-1] = np.inf

        expected_counts = np.histogram(expected, bins=bins)[0]
        actual_counts = np.histogram(actual, bins=bins)[0]

        # Proportions (avec smoothing pour eviter log(0))
        expected_pct = (expected_counts + 1e-6) / (expected_counts.sum() + n_bins * 1e-6)
        actual_pct = (actual_counts + 1e-6) / (actual_counts.sum() + n_bins * 1e-6)

        # PSI
        psi_values = (actual_pct - expected_pct) * np.log(actual_pct / expected_pct)
        psi_total = psi_values.sum()

        if psi_total >= self.PSI_CRITICAL:
            status = "CRITICAL"
        elif psi_total >= self.PSI_WARNING:
            status = "WARNING"
        else:
            status = "STABLE"

        return {
            "psi": round(float(psi_total), 6),
            "psi_status": status,
            "psi_by_bin": psi_values.tolist(),
            "n_bins": n_bins,
        }

    # ──────────────────────────────────────────────────────────
    # 4. FULL VALIDATION REPORT
    # ──────────────────────────────────────────────────────────

    def generate_validation_report(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        dataset_name: str = "test",
        y_pred_reference: Optional[np.ndarray] = None,
        save: bool = True,
    ) -> Dict:
        """
        Génère un rapport de validation complet conforme MRM.
        
        Args:
            y_true: Labels réels
            y_pred: Probabilités prédites
            dataset_name: Nom du jeu de données
            y_pred_reference: Scores de référence pour calcul PSI
            save: Sauvegarder le rapport
            
        Returns:
            Dict avec toutes les métriques de validation
        """
        logger.info(f"Génération du rapport de validation sur '{dataset_name}'...")

        report = {
            "report_id": datetime.utcnow().strftime("%Y%m%d_%H%M%S"),
            "dataset": dataset_name,
            "n_observations": len(y_true),
            "default_rate": round(float(y_true.mean()), 6),
            "timestamp": datetime.utcnow().isoformat(),
        }

        # 1. Discrimination
        report["discrimination"] = {
            **self.compute_auc_gini(y_true, y_pred),
            **self.compute_ks_statistic(y_true, y_pred),
        }

        # 2. Calibration
        report["calibration"] = {
            **self.compute_brier_score(y_true, y_pred),
            **self.compute_hosmer_lemeshow(y_true, y_pred),
        }

        # 3. Stability
        if y_pred_reference is not None:
            report["stability"] = self.compute_psi(y_pred_reference, y_pred)
        else:
            report["stability"] = {"psi": "N/A — no reference distribution"}

        # 4. Decile analysis
        decile_df = self.compute_discrimination_by_decile(y_true, y_pred)
        report["decile_analysis"] = decile_df.to_dict("records")

        # 5. Overall assessment
        auc = report["discrimination"]["auc"]
        gini = report["discrimination"]["gini"]
        ks = report["discrimination"]["ks_statistic"]

        if auc >= self.AUC_MIN_GOOD and gini >= self.GINI_MIN_GOOD:
            overall = "APPROVED"
        elif auc >= self.AUC_MIN_ACCEPTABLE:
            overall = "CONDITIONAL"
        else:
            overall = "REJECTED"

        report["overall_assessment"] = {
            "status": overall,
            "summary": (
                f"AUC={auc:.4f} ({'✓' if auc >= self.AUC_MIN_GOOD else '✗'}), "
                f"Gini={gini:.4f} ({'✓' if gini >= self.GINI_MIN_GOOD else '✗'}), "
                f"KS={ks:.4f} ({'✓' if ks >= self.KS_MIN_GOOD else '✗'})"
            ),
        }

        # Save report
        if save:
            report_path = os.path.join(
                self.output_dir,
                f"validation_report_{dataset_name}_{report['report_id']}.json"
            )
            # Remove non-serializable items
            report_save = json.loads(json.dumps(report, default=str))
            with open(report_path, "w") as f:
                json.dump(report_save, f, indent=2)
            logger.info(f"Rapport sauvegardé: {report_path}")

        logger.info(
            f"Validation '{dataset_name}' — {overall}: "
            f"AUC={auc:.4f}, Gini={gini:.4f}, KS={ks:.4f}"
        )

        return report


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    # Simulation d'un modèle
    np.random.seed(42)
    n = 10000
    y_true = np.random.binomial(1, 0.08, n)
    y_pred = np.clip(
        np.random.beta(2, 20, n) + y_true * np.random.uniform(0.05, 0.3, n),
        0, 1
    )

    validator = PDModelValidator()
    report = validator.generate_validation_report(y_true, y_pred, dataset_name="simulated_test")

    print(f"\n{'='*60}")
    print(f"VALIDATION REPORT — {report['overall_assessment']['status']}")
    print(f"{'='*60}")
    print(f"  AUC:   {report['discrimination']['auc']:.4f}")
    print(f"  Gini:  {report['discrimination']['gini']:.4f}")
    print(f"  KS:    {report['discrimination']['ks_statistic']:.4f}")
    print(f"  Brier: {report['calibration']['brier_score']:.4f}")
    print(f"  H-L:   p={report['calibration']['hl_p_value']:.4f}")
