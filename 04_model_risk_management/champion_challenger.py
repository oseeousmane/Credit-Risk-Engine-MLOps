"""
Champion / Challenger Framework
=================================
Framework de comparaison de modèles pour la gouvernance MLOps.

Workflow :
1. Champion : modèle en production
2. Challenger : nouveau modèle candidat
3. Comparaison sur métriques de discrimination, calibration, stabilité
4. Décision de promotion automatique ou manuelle
5. Audit trail complet

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
from sklearn.metrics import roc_auc_score, brier_score_loss, log_loss

logger = logging.getLogger(__name__)


class ChampionChallengerFramework:
    """
    Framework Champion/Challenger pour la gouvernance des modèles.
    
    Critères de promotion :
    1. AUC du Challenger > AUC du Champion (avec marge de significativité)
    2. Brier Score du Challenger <= Brier Score du Champion
    3. Stabilité du Challenger (PSI acceptable)
    4. Test de DeLong pour significativité statistique
    
    Modes de décision :
    - AUTO : Promotion automatique si tous les critères sont remplis
    - MANUAL : Recommandation uniquement, décision humaine requise
    """

    # Seuils de promotion
    AUC_IMPROVEMENT_THRESHOLD = 0.005    # Amélioration AUC minimum (+0.5pp)
    BRIER_DEGRADATION_MAX = 0.01         # Dégradation Brier maximum tolérée
    PSI_MAX_CHALLENGER = 0.10            # PSI maximum pour stabilité

    def __init__(
        self,
        decision_mode: str = "MANUAL",  # "AUTO" ou "MANUAL"
        output_dir: Optional[str] = None,
    ):
        self.decision_mode = decision_mode
        self.output_dir = output_dir or os.path.join(
            os.path.dirname(__file__), "reports"
        )
        os.makedirs(self.output_dir, exist_ok=True)
        self._comparison_log: List[Dict] = []

        logger.info(f"Champion/Challenger initialisé — Mode={decision_mode}")

    def compare(
        self,
        y_true: np.ndarray,
        champion_scores: np.ndarray,
        challenger_scores: np.ndarray,
        champion_name: str = "Champion_v1",
        challenger_name: str = "Challenger_v2",
        dataset_name: str = "validation",
    ) -> Dict:
        """
        Compare le modèle Champion au Challenger sur un jeu de données commun.
        
        Returns:
            Dict avec métriques comparatives et recommandation
        """
        logger.info(
            f"Comparaison {champion_name} vs {challenger_name} "
            f"sur {len(y_true)} observations"
        )

        # ── 1. Métriques de discrimination ──────────────────────
        champ_auc = roc_auc_score(y_true, champion_scores)
        chall_auc = roc_auc_score(y_true, challenger_scores)
        auc_delta = chall_auc - champ_auc

        # ── 2. Métriques de calibration ─────────────────────────
        champ_brier = brier_score_loss(y_true, champion_scores)
        chall_brier = brier_score_loss(y_true, challenger_scores)
        brier_delta = chall_brier - champ_brier  # Négatif = meilleur

        champ_logloss = log_loss(y_true, champion_scores)
        chall_logloss = log_loss(y_true, challenger_scores)

        # ── 3. Test de DeLong (approximation) ─────────────────
        delong_p = self._delong_test_approx(y_true, champion_scores, challenger_scores)

        # ── 4. Stabilité (PSI entre Champion et Challenger) ────
        psi = self._compute_psi(champion_scores, challenger_scores)

        # ── 5. Décision ─────────────────────────────────────────
        criteria = {
            "auc_improvement": auc_delta >= self.AUC_IMPROVEMENT_THRESHOLD,
            "brier_acceptable": brier_delta <= self.BRIER_DEGRADATION_MAX,
            "statistical_significance": delong_p < 0.05,
            "stability_acceptable": psi < self.PSI_MAX_CHALLENGER,
        }

        all_criteria_met = all(criteria.values())

        if all_criteria_met:
            recommendation = "PROMOTE_CHALLENGER"
            rationale = "Tous les critères de promotion sont satisfaits"
        elif auc_delta > 0 and criteria["brier_acceptable"]:
            recommendation = "CONDITIONAL_PROMOTION"
            rationale = "Amélioration constatée mais incomplète"
        else:
            recommendation = "RETAIN_CHAMPION"
            rationale = "Le Challenger ne surpasse pas le Champion"

        result = {
            "comparison_id": datetime.utcnow().strftime("%Y%m%d_%H%M%S"),
            "champion": {
                "name": champion_name,
                "auc": round(champ_auc, 6),
                "brier": round(champ_brier, 6),
                "logloss": round(champ_logloss, 6),
            },
            "challenger": {
                "name": challenger_name,
                "auc": round(chall_auc, 6),
                "brier": round(chall_brier, 6),
                "logloss": round(chall_logloss, 6),
            },
            "deltas": {
                "auc_delta": round(auc_delta, 6),
                "brier_delta": round(brier_delta, 6),
                "logloss_delta": round(chall_logloss - champ_logloss, 6),
            },
            "statistical_tests": {
                "delong_p_value": round(delong_p, 6),
                "psi_champion_vs_challenger": round(psi, 6),
            },
            "criteria_met": criteria,
            "recommendation": recommendation,
            "rationale": rationale,
            "decision_mode": self.decision_mode,
            "dataset": dataset_name,
            "n_observations": len(y_true),
            "timestamp": datetime.utcnow().isoformat(),
        }

        self._comparison_log.append(result)

        # Save report
        report_path = os.path.join(
            self.output_dir,
            f"cc_comparison_{result['comparison_id']}.json"
        )
        with open(report_path, "w") as f:
            json.dump(result, f, indent=2)

        logger.info(
            f"Résultat: {recommendation} "
            f"(ΔAUC={auc_delta:+.4f}, ΔBrier={brier_delta:+.4f})"
        )

        return result

    def _delong_test_approx(
        self,
        y_true: np.ndarray,
        scores_a: np.ndarray,
        scores_b: np.ndarray,
    ) -> float:
        """
        Approximation du test de DeLong pour comparer deux AUC.
        Utilise l'approche bootstrap pour l'estimation de la variance.
        """
        n_bootstraps = 1000
        rng = np.random.default_rng(42)
        auc_diffs = []

        for _ in range(n_bootstraps):
            idx = rng.choice(len(y_true), size=len(y_true), replace=True)
            y_boot = y_true[idx]

            if y_boot.sum() == 0 or y_boot.sum() == len(y_boot):
                continue

            auc_a = roc_auc_score(y_boot, scores_a[idx])
            auc_b = roc_auc_score(y_boot, scores_b[idx])
            auc_diffs.append(auc_b - auc_a)

        if not auc_diffs:
            return 1.0

        auc_diffs = np.array(auc_diffs)
        mean_diff = auc_diffs.mean()
        std_diff = auc_diffs.std()

        if std_diff > 0:
            z = mean_diff / std_diff
            p_value = 2 * (1 - abs(float(self._norm_cdf(abs(z)))))
        else:
            p_value = 1.0

        return max(min(p_value, 1.0), 0.0)

    @staticmethod
    def _norm_cdf(x):
        from scipy.stats import norm
        return norm.cdf(x)

    def _compute_psi(
        self,
        expected: np.ndarray,
        actual: np.ndarray,
        n_bins: int = 10,
    ) -> float:
        """Calcul simplifié du PSI."""
        bins = np.percentile(expected, np.linspace(0, 100, n_bins + 1))
        bins[0] = -np.inf
        bins[-1] = np.inf

        exp_counts = np.histogram(expected, bins=bins)[0]
        act_counts = np.histogram(actual, bins=bins)[0]

        exp_pct = (exp_counts + 1e-6) / (exp_counts.sum() + n_bins * 1e-6)
        act_pct = (act_counts + 1e-6) / (act_counts.sum() + n_bins * 1e-6)

        psi = float(np.sum((act_pct - exp_pct) * np.log(act_pct / exp_pct)))
        return psi

    def get_comparison_history(self) -> List[Dict]:
        return self._comparison_log.copy()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    framework = ChampionChallengerFramework()

    np.random.seed(42)
    n = 5000
    y_true = np.random.binomial(1, 0.08, n)

    # Champion : modèle OK
    champion = np.clip(
        np.random.beta(2, 20, n) + y_true * np.random.uniform(0.0, 0.15, n),
        0, 1
    )
    # Challenger : légèrement meilleur
    challenger = np.clip(
        np.random.beta(2.5, 22, n) + y_true * np.random.uniform(0.0, 0.20, n),
        0, 1
    )

    result = framework.compare(y_true, champion, challenger)
    print(f"\nRecommandation: {result['recommendation']}")
    print(f"  Champion AUC:   {result['champion']['auc']:.4f}")
    print(f"  Challenger AUC: {result['challenger']['auc']:.4f}")
    print(f"  ΔAUC: {result['deltas']['auc_delta']:+.4f}")
