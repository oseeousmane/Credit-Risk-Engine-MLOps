"""
PD Model — Calibration
========================
Module de calibration du modèle PD pour conformité réglementaire Bâle III.

La calibration garantit que les scores du modèle reflètent fidèlement
les probabilités de défaut observées (calibration PIT → TTC).

Méthodes :
- Platt Scaling (régression logistique sur les scores)
- Isotonic Regression (calibration non-paramétrique)
- Central Tendency Adjustment (TTC adjustment)

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import pickle
import os
import logging
from typing import Optional, Dict, Tuple
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.linear_model import LogisticRegression
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import brier_score_loss
from datetime import datetime

logger = logging.getLogger(__name__)


class PDCalibrator:
    """
    Calibrateur du modèle PD pour conformité réglementaire.
    
    Architecture :
    1. Évaluer la qualité de calibration initiale
    2. Appliquer Platt Scaling OU Isotonic Regression
    3. Ajustement Central Tendency (TTC vs PIT)
    4. Validation de la calibration
    5. Sauvegarde du calibrateur
    """

    def __init__(self, model_dir: Optional[str] = None):
        if model_dir is None:
            model_dir = os.path.join(os.path.dirname(__file__), "artifacts")

        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)

        self.platt_calibrator: Optional[LogisticRegression] = None
        self.isotonic_calibrator: Optional[IsotonicRegression] = None
        self.active_method: Optional[str] = None
        self.calibration_metadata: Dict = {}

    def evaluate_calibration(
        self,
        y_true: np.ndarray,
        y_pred_proba: np.ndarray,
        n_bins: int = 10,
    ) -> Dict:
        """
        Évalue la qualité de calibration du modèle.
        
        Returns:
            Dict avec métriques de calibration (Brier, Expected Calibration Error)
        """
        # Brier Score (lower is better, 0 = perfect)
        brier = brier_score_loss(y_true, y_pred_proba)

        # Calibration curve
        prob_true, prob_pred = calibration_curve(
            y_true, y_pred_proba, n_bins=n_bins, strategy="uniform"
        )

        # Expected Calibration Error (ECE)
        bin_counts = np.histogram(y_pred_proba, bins=n_bins, range=(0, 1))[0]
        total = len(y_pred_proba)
        ece = 0.0
        for i in range(len(prob_true)):
            if bin_counts[i] > 0:
                ece += (bin_counts[i] / total) * abs(prob_true[i] - prob_pred[i])

        # Maximum Calibration Error (MCE)
        mce = max(abs(prob_true - prob_pred)) if len(prob_true) > 0 else 0.0

        result = {
            "brier_score": round(float(brier), 6),
            "ece": round(float(ece), 6),
            "mce": round(float(mce), 6),
            "calibration_curve": {
                "prob_true": prob_true.tolist(),
                "prob_pred": prob_pred.tolist(),
            },
            "mean_predicted": round(float(y_pred_proba.mean()), 6),
            "mean_observed": round(float(y_true.mean()), 6),
            "n_bins": n_bins,
        }

        logger.info(
            f"Calibration — Brier={brier:.4f}, ECE={ece:.4f}, MCE={mce:.4f}"
        )

        return result

    def fit_platt(
        self,
        y_true: np.ndarray,
        y_pred_proba: np.ndarray,
    ) -> LogisticRegression:
        """
        Platt Scaling : Régression logistique sur les log-odds du modèle.
        """
        # Clip pour éviter log(0)
        y_pred_clipped = np.clip(y_pred_proba, 1e-6, 1 - 1e-6)
        log_odds = np.log(y_pred_clipped / (1 - y_pred_clipped)).reshape(-1, 1)

        self.platt_calibrator = LogisticRegression(
            solver="lbfgs", max_iter=1000, C=1e10
        )
        self.platt_calibrator.fit(log_odds, y_true)

        calibrated = self.platt_calibrator.predict_proba(log_odds)[:, 1]
        brier_before = brier_score_loss(y_true, y_pred_proba)
        brier_after = brier_score_loss(y_true, calibrated)

        logger.info(
            f"Platt Scaling — Brier: {brier_before:.4f} → {brier_after:.4f} "
            f"({'✓ amélioré' if brier_after < brier_before else '✗ dégradé'})"
        )

        return self.platt_calibrator

    def fit_isotonic(
        self,
        y_true: np.ndarray,
        y_pred_proba: np.ndarray,
    ) -> IsotonicRegression:
        """
        Isotonic Regression : Calibration non-paramétrique monotone.
        """
        self.isotonic_calibrator = IsotonicRegression(
            out_of_bounds="clip", y_min=0.0, y_max=1.0
        )
        self.isotonic_calibrator.fit(y_pred_proba, y_true)

        calibrated = self.isotonic_calibrator.predict(y_pred_proba)
        brier_before = brier_score_loss(y_true, y_pred_proba)
        brier_after = brier_score_loss(y_true, calibrated)

        logger.info(
            f"Isotonic Regression — Brier: {brier_before:.4f} → {brier_after:.4f}"
        )

        return self.isotonic_calibrator

    def auto_calibrate(
        self,
        y_true: np.ndarray,
        y_pred_proba: np.ndarray,
    ) -> Tuple[str, Dict]:
        """
        Calibration automatique : sélectionne la meilleure méthode.
        Compare Platt vs Isotonic et retient celle avec le meilleur Brier.
        """
        # Évaluation avant calibration
        pre_eval = self.evaluate_calibration(y_true, y_pred_proba)

        # Platt
        self.fit_platt(y_true, y_pred_proba)
        platt_pred = self.transform_platt(y_pred_proba)
        platt_brier = brier_score_loss(y_true, platt_pred)

        # Isotonic
        self.fit_isotonic(y_true, y_pred_proba)
        iso_pred = self.transform_isotonic(y_pred_proba)
        iso_brier = brier_score_loss(y_true, iso_pred)

        # Sélection
        if platt_brier <= iso_brier:
            self.active_method = "platt"
            best_brier = platt_brier
        else:
            self.active_method = "isotonic"
            best_brier = iso_brier

        # Post-calibration evaluation
        calibrated = self.transform(y_pred_proba)
        post_eval = self.evaluate_calibration(y_true, calibrated)

        self.calibration_metadata = {
            "method_selected": self.active_method,
            "brier_before": pre_eval["brier_score"],
            "brier_platt": round(platt_brier, 6),
            "brier_isotonic": round(iso_brier, 6),
            "brier_after": round(best_brier, 6),
            "improvement": round(pre_eval["brier_score"] - best_brier, 6),
            "ece_before": pre_eval["ece"],
            "ece_after": post_eval["ece"],
            "timestamp": datetime.utcnow().isoformat(),
        }

        logger.info(
            f"Auto-calibration → {self.active_method} sélectionné "
            f"(Brier: {pre_eval['brier_score']:.4f} → {best_brier:.4f})"
        )

        return self.active_method, self.calibration_metadata

    def transform_platt(self, y_pred_proba: np.ndarray) -> np.ndarray:
        """Applique la calibration Platt."""
        if self.platt_calibrator is None:
            raise ValueError("Platt calibrator non entraîné")
        y_clipped = np.clip(y_pred_proba, 1e-6, 1 - 1e-6)
        log_odds = np.log(y_clipped / (1 - y_clipped)).reshape(-1, 1)
        return self.platt_calibrator.predict_proba(log_odds)[:, 1]

    def transform_isotonic(self, y_pred_proba: np.ndarray) -> np.ndarray:
        """Applique la calibration Isotonic."""
        if self.isotonic_calibrator is None:
            raise ValueError("Isotonic calibrator non entraîné")
        return self.isotonic_calibrator.predict(y_pred_proba)

    def transform(self, y_pred_proba: np.ndarray) -> np.ndarray:
        """Applique la calibration active (auto-sélectionnée)."""
        if self.active_method == "platt":
            return self.transform_platt(y_pred_proba)
        elif self.active_method == "isotonic":
            return self.transform_isotonic(y_pred_proba)
        else:
            logger.warning("Pas de calibration active, scores bruts retournés")
            return y_pred_proba

    def apply_central_tendency(
        self,
        y_pred_proba: np.ndarray,
        long_run_default_rate: float,
    ) -> np.ndarray:
        """
        Ajustement Central Tendency (PIT → TTC).
        
        Aligne la PD moyenne prédite sur le taux de défaut long terme
        observé (Through-The-Cycle adjustment).
        
        Formule : PD_TTC = PD_PIT × (DR_LR / PD_mean)
        """
        current_mean = y_pred_proba.mean()
        if current_mean > 0:
            adjustment_factor = long_run_default_rate / current_mean
            adjusted = y_pred_proba * adjustment_factor
            adjusted = np.clip(adjusted, 0.0, 1.0)
        else:
            adjusted = y_pred_proba

        logger.info(
            f"Central Tendency — "
            f"PD mean: {current_mean:.4f} → {adjusted.mean():.4f} "
            f"(target DR: {long_run_default_rate:.4f})"
        )

        return adjusted

    def save(self, calibrator_name: str = "pd_calibrator") -> str:
        """Sauvegarde du calibrateur."""
        save_path = os.path.join(self.model_dir, f"{calibrator_name}.pkl")
        state = {
            "platt_calibrator": self.platt_calibrator,
            "isotonic_calibrator": self.isotonic_calibrator,
            "active_method": self.active_method,
            "calibration_metadata": self.calibration_metadata,
        }
        with open(save_path, "wb") as f:
            pickle.dump(state, f)

        logger.info(f"Calibrateur sauvegardé: {save_path}")
        return save_path

    def load(self, calibrator_name: str = "pd_calibrator"):
        """Charge un calibrateur sauvegardé."""
        load_path = os.path.join(self.model_dir, f"{calibrator_name}.pkl")
        with open(load_path, "rb") as f:
            state = pickle.load(f)

        self.platt_calibrator = state["platt_calibrator"]
        self.isotonic_calibrator = state["isotonic_calibrator"]
        self.active_method = state["active_method"]
        self.calibration_metadata = state["calibration_metadata"]

        logger.info(f"Calibrateur chargé: {load_path} (method={self.active_method})")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    # Simulation
    np.random.seed(42)
    n = 5000
    y_true = np.random.binomial(1, 0.08, n)
    y_scores = np.clip(
        np.random.beta(2, 20, n) + y_true * np.random.uniform(0.0, 0.15, n),
        0, 1
    )

    calibrator = PDCalibrator()
    pre = calibrator.evaluate_calibration(y_true, y_scores)
    print(f"Avant calibration: Brier={pre['brier_score']:.4f}, ECE={pre['ece']:.4f}")

    method, meta = calibrator.auto_calibrate(y_true, y_scores)
    print(f"Méthode sélectionnée: {method}")
    print(f"Brier après: {meta['brier_after']:.4f}")
