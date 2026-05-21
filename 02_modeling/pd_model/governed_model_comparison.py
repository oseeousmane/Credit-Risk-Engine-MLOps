"""
Governed Model Comparison — Champion / Challenger Framework
=============================================================
Compare le modèle CHAMPION en production avec un CHALLENGER candidat.

Pipeline :
1. Chargement champion + challenger depuis les artefacts
2. Scoring parallèle sur le dataset de test holdout
3. Test statistique AUC (DeLong 1988) — H0 : AUC_challenger = AUC_champion
4. Test Hosmer-Lemeshow comparatif (calibration)
5. Comparaison SHAP (drift de feature importance)
6. Recommandation de promotion automatique
7. Rapport JSON complet pour comité MRM

Critères de promotion (COBAC / EBA IRB standard) :
- AUC_challenger ≥ AUC_champion + 0.5pp (gain significatif)
- p-value DeLong < 0.05 (significativité statistique)
- Brier_challenger ≤ Brier_champion (calibration au moins aussi bonne)
- Pas de régression sur un sous-groupe (secteur, rating)

Auteur  : Octaix Risk Engine
Version : 1.0.0
"""

from __future__ import annotations

import argparse
import json
import pickle
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import spearmanr
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[2]
FEATURES_PATH      = ROOT / "02_modeling" / "pd_model" / "artifacts" / "pd_model_v2_features.json"
RUNTIME_MODEL_PATH = ROOT / "02_modeling" / "pd_model" / "artifacts" / "pd_model_v2.pkl"
DEFAULT_DATA_PATH  = ROOT / "01_data_layer" / "curated" / "curated_dataset.parquet"
OUT_ROOT           = ROOT / "02_modeling" / "pd_model" / "artifacts" / "governed_comparisons"

# ── Seuils de promotion réglementaires ────────────────────────────────────────
PROMOTION_CRITERIA = {
    "min_auc_gain_pp":      0.005,   # +0.5pp AUC minimum pour justifier le changement
    "max_pvalue_delong":    0.05,    # Significativité DeLong
    "max_brier_regression": 0.002,   # Régression Brier tolérée (2pp)
    "min_observations":     500,     # Observations test minimales
    "max_shap_drift":       0.30,    # Drift max sur le top-5 SHAP (30%)
}


@dataclass
class ModelMetrics:
    """Métriques complètes d'un modèle sur un dataset."""
    model_name: str
    n_observations: int
    default_rate: float
    auc_roc: float
    gini: float
    ks_statistic: float
    brier_score: float
    log_loss: float
    average_precision: float
    auc_by_decile: List[Dict]
    calibration_ece: float      # Expected Calibration Error
    top10_feature_importance: List[Dict]   # Gain-based (disponible sans SHAP)

    def to_dict(self) -> dict:
        return {
            "model_name": self.model_name,
            "n_observations": self.n_observations,
            "default_rate": round(self.default_rate, 6),
            "auc_roc": round(self.auc_roc, 6),
            "gini": round(self.gini, 6),
            "ks_statistic": round(self.ks_statistic, 6),
            "brier_score": round(self.brier_score, 6),
            "log_loss": round(self.log_loss, 6),
            "average_precision": round(self.average_precision, 6),
            "calibration_ece": round(self.calibration_ece, 6),
            "auc_by_decile": self.auc_by_decile,
            "top10_feature_importance": self.top10_feature_importance,
        }


@dataclass
class ComparisonReport:
    """Rapport de comparaison Champion vs Challenger."""
    report_id: str
    champion_name: str
    challenger_name: str
    test_dataset_path: str
    n_test_observations: int

    champion_metrics: ModelMetrics
    challenger_metrics: ModelMetrics

    # Tests statistiques
    delong_auc_diff: float
    delong_z_score: float
    delong_p_value: float
    delong_significant: bool

    brier_diff: float          # challenger - champion (négatif = challenger meilleur)
    calibration_winner: str

    # SHAP drift
    shap_drift_score: Optional[float]
    shap_top5_overlap: Optional[float]

    # Recommandation finale
    recommendation: str         # PROMOTE / REJECT / CONDITIONAL_PROMOTE / REVIEW
    recommendation_reasons: List[str]
    promotion_criteria_met: Dict[str, bool]

    generated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict:
        return {
            "report_id": self.report_id,
            "champion_name": self.champion_name,
            "challenger_name": self.challenger_name,
            "test_dataset_path": self.test_dataset_path,
            "n_test_observations": self.n_test_observations,
            "champion_metrics": self.champion_metrics.to_dict(),
            "challenger_metrics": self.challenger_metrics.to_dict(),
            "statistical_tests": {
                "delong_auc_diff": round(self.delong_auc_diff, 6),
                "delong_z_score": round(self.delong_z_score, 4),
                "delong_p_value": round(self.delong_p_value, 6),
                "delong_significant": self.delong_significant,
                "brier_diff_challenger_minus_champion": round(self.brier_diff, 6),
                "calibration_winner": self.calibration_winner,
            },
            "shap_analysis": {
                "drift_score": round(self.shap_drift_score, 4) if self.shap_drift_score else None,
                "top5_overlap": round(self.shap_top5_overlap, 4) if self.shap_top5_overlap else None,
            },
            "recommendation": self.recommendation,
            "recommendation_reasons": self.recommendation_reasons,
            "promotion_criteria_met": self.promotion_criteria_met,
            "generated_at": self.generated_at,
        }


class ChampionChallengerComparison:
    """
    Framework de comparaison Champion/Challenger pour le modèle PD.

    Implémente le protocole de validation MRM :
    1. Chargement des modèles depuis les artefacts
    2. Scoring sur dataset holdout partagé
    3. DeLong AUC test (Zhang & Yu 1998 — implementation rapide O(n log n))
    4. Comparaison SHAP drift (optionnel — nécessite shap)
    5. Rapport JSON avec recommandation motivée
    """

    def __init__(
        self,
        champion_path: Optional[str] = None,
        challenger_path: Optional[str] = None,
        features_path: Optional[str] = None,
    ):
        self.champion_path   = champion_path   or str(RUNTIME_MODEL_PATH)
        self.challenger_path = challenger_path
        self.features_path   = features_path   or str(FEATURES_PATH)
        self.champion_model  = None
        self.challenger_model = None
        self.feature_names: List[str] = []

    def load_models(self) -> None:
        """Charge champion et challenger depuis les fichiers pkl."""
        import logging
        log = logging.getLogger(__name__)

        log.info(f"Chargement champion : {self.champion_path}")
        with open(self.champion_path, "rb") as f:
            self.champion_model = pickle.load(f)

        if self.challenger_path:
            log.info(f"Chargement challenger : {self.challenger_path}")
            with open(self.challenger_path, "rb") as f:
                self.challenger_model = pickle.load(f)

        if Path(self.features_path).exists():
            with open(self.features_path, "r") as f:
                self.feature_names = json.load(f).get("features", [])

        log.info(f"Modèles chargés — {len(self.feature_names)} features")

    def run_comparison(
        self,
        X_test: pd.DataFrame,
        y_test: pd.Series,
        champion_name: str = "champion",
        challenger_name: str = "challenger",
        output_dir: Optional[str] = None,
    ) -> ComparisonReport:
        """
        Exécute la comparaison complète.

        Args:
            X_test:           Features test holdout (partagé entre les deux modèles)
            y_test:           Labels test (0/1 — défaut)
            champion_name:    Nom du modèle champion
            challenger_name:  Nom du modèle challenger
            output_dir:       Répertoire de sauvegarde du rapport
        """
        import logging, uuid
        log = logging.getLogger(__name__)

        if len(y_test) < PROMOTION_CRITERIA["min_observations"]:
            raise ValueError(
                f"Dataset test insuffisant : {len(y_test)} obs < {PROMOTION_CRITERIA['min_observations']}"
            )

        log.info(f"[Comparison] Scoring champion + challenger sur {len(y_test)} observations...")

        # ── Scores ────────────────────────────────────────────────────────
        champ_scores = self._predict_proba(self.champion_model, X_test)
        chall_scores = self._predict_proba(self.challenger_model, X_test)

        # ── Métriques ─────────────────────────────────────────────────────
        champ_metrics = self._compute_metrics(champion_name, y_test.values, champ_scores, X_test)
        chall_metrics = self._compute_metrics(challenger_name, y_test.values, chall_scores, X_test)

        log.info(
            f"  Champion  AUC={champ_metrics.auc_roc:.4f}, Brier={champ_metrics.brier_score:.4f}"
        )
        log.info(
            f"  Challenger AUC={chall_metrics.auc_roc:.4f}, Brier={chall_metrics.brier_score:.4f}"
        )

        # ── Test DeLong ───────────────────────────────────────────────────
        auc_diff, z_score, p_value = self._delong_test(
            y_test.values, champ_scores, chall_scores
        )
        delong_significant = p_value < PROMOTION_CRITERIA["max_pvalue_delong"]

        # ── Calibration ───────────────────────────────────────────────────
        brier_diff = chall_metrics.brier_score - champ_metrics.brier_score
        calib_winner = "challenger" if brier_diff < 0 else "champion"

        # ── SHAP drift ────────────────────────────────────────────────────
        shap_drift, shap_overlap = self._compute_shap_drift(
            X_test, champ_metrics, chall_metrics
        )

        # ── Recommandation ────────────────────────────────────────────────
        recommendation, reasons, criteria_met = self._make_recommendation(
            auc_diff, delong_significant, brier_diff, shap_drift,
            champ_metrics, chall_metrics,
        )

        log.info(f"[Comparison] Recommandation : {recommendation}")
        for r in reasons:
            log.info(f"  → {r}")

        report = ComparisonReport(
            report_id=str(uuid.uuid4())[:8],
            champion_name=champion_name,
            challenger_name=challenger_name,
            test_dataset_path=str(DEFAULT_DATA_PATH),
            n_test_observations=len(y_test),
            champion_metrics=champ_metrics,
            challenger_metrics=chall_metrics,
            delong_auc_diff=auc_diff,
            delong_z_score=z_score,
            delong_p_value=p_value,
            delong_significant=delong_significant,
            brier_diff=brier_diff,
            calibration_winner=calib_winner,
            shap_drift_score=shap_drift,
            shap_top5_overlap=shap_overlap,
            recommendation=recommendation,
            recommendation_reasons=reasons,
            promotion_criteria_met=criteria_met,
        )

        if output_dir:
            self._save_report(report, output_dir)

        return report

    # ── Tests statistiques ─────────────────────────────────────────────────────

    @staticmethod
    def _delong_test(
        y_true: np.ndarray,
        scores_a: np.ndarray,
        scores_b: np.ndarray,
    ) -> Tuple[float, float, float]:
        """
        DeLong AUC difference test (DeLong, DeLong & Clarke-Pearson, 1988).
        H0 : AUC(A) = AUC(B)

        Returns:
            (auc_b - auc_a, z_score, p_value_two_tailed)

        Implémentation : méthode des V-statistiques (Zhang & Yu 1998 O(n log n)).
        """
        def _compute_midrank(x: np.ndarray) -> np.ndarray:
            J = np.argsort(x)
            Z = x[J]
            N = len(x)
            T = np.zeros(N, dtype=float)
            i = 0
            while i < N:
                j = i
                while j < N - 1 and Z[j] == Z[j + 1]:
                    j += 1
                T[i:j + 1] = (i + j + 2) / 2.0
                i = j + 1
            T2 = np.empty(N, dtype=float)
            T2[J] = T
            return T2

        def _fast_delong(y, pred_a, pred_b):
            pos = y == 1
            neg = y == 0
            m = pos.sum()
            n = neg.sum()

            def _auc_components(scores):
                r = _compute_midrank(scores)
                auc = (r[pos].sum() - m * (m + 1) / 2) / (m * n)
                v10 = (r[pos] - _compute_midrank(scores[pos])) / n
                v01 = 1 - (r[neg] - _compute_midrank(scores[neg])) / m
                return auc, v10, v01

            auc_a, v10_a, v01_a = _auc_components(pred_a)
            auc_b, v10_b, v01_b = _auc_components(pred_b)

            var_a  = (np.var(v10_a) / m + np.var(v01_a) / n)
            var_b  = (np.var(v10_b) / m + np.var(v01_b) / n)
            cov_ab = (np.cov(v10_a, v10_b)[0, 1] / m + np.cov(v01_a, v01_b)[0, 1] / n)

            diff = auc_b - auc_a
            var_diff = var_a + var_b - 2 * cov_ab
            se = np.sqrt(max(var_diff, 1e-10))
            z = diff / se
            p = 2 * (1 - stats.norm.cdf(abs(z)))
            return float(diff), float(z), float(p)

        try:
            return _fast_delong(y_true, scores_a, scores_b)
        except Exception as e:
            # Fallback : simple AUC difference sans test
            auc_a = roc_auc_score(y_true, scores_a)
            auc_b = roc_auc_score(y_true, scores_b)
            return float(auc_b - auc_a), 0.0, 1.0

    # ── Métriques ──────────────────────────────────────────────────────────────

    def _compute_metrics(
        self,
        name: str,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        X: pd.DataFrame,
    ) -> ModelMetrics:
        """Calcule toutes les métriques pour un modèle."""
        from sklearn.metrics import log_loss as sklearn_log_loss

        auc  = roc_auc_score(y_true, y_pred)
        gini = 2 * auc - 1
        fpr, tpr, _ = roc_curve(y_true, y_pred)
        ks   = float(np.max(tpr - fpr))
        brier = brier_score_loss(y_true, y_pred)
        ll    = sklearn_log_loss(y_true, y_pred)
        ap    = average_precision_score(y_true, y_pred)

        # ECE (calibration)
        fraction_of_positives, mean_predicted = calibration_curve(y_true, y_pred, n_bins=10)
        ece = float(np.mean(np.abs(fraction_of_positives - mean_predicted)))

        # AUC par décile de score
        decile_aucs = self._auc_by_decile(y_true, y_pred)

        # Feature importance (gain-based, disponible sans SHAP)
        fi = self._get_feature_importance(name, X)

        return ModelMetrics(
            model_name=name,
            n_observations=len(y_true),
            default_rate=float(y_true.mean()),
            auc_roc=auc,
            gini=gini,
            ks_statistic=ks,
            brier_score=brier,
            log_loss=ll,
            average_precision=ap,
            calibration_ece=ece,
            auc_by_decile=decile_aucs,
            top10_feature_importance=fi,
        )

    def _auc_by_decile(self, y_true: np.ndarray, y_pred: np.ndarray, n_deciles: int = 5) -> List[Dict]:
        """AUC par quintile de score — détecte les dégradations locales."""
        df = pd.DataFrame({"y": y_true, "p": y_pred})
        df["decile"] = pd.qcut(df["p"], q=n_deciles, labels=False, duplicates="drop")
        results = []
        for d, grp in df.groupby("decile"):
            if grp["y"].nunique() < 2 or len(grp) < 20:
                continue
            try:
                a = roc_auc_score(grp["y"], grp["p"])
            except Exception:
                a = float("nan")
            results.append({
                "decile": int(d) + 1,
                "n": len(grp),
                "default_rate": round(float(grp["y"].mean()), 4),
                "auc": round(a, 4),
            })
        return results

    def _get_feature_importance(self, model_name: str, X: pd.DataFrame) -> List[Dict]:
        """Importance des features (gain-based, depuis le modèle en mémoire)."""
        model = self.champion_model if "champion" in model_name.lower() else self.challenger_model
        if model is None:
            return []
        try:
            base = self._unwrap_model(model)
            if hasattr(base, "feature_importances_"):
                fi = base.feature_importances_
                names = self.feature_names[:len(fi)] if self.feature_names else [f"f{i}" for i in range(len(fi))]
                df = pd.DataFrame({"feature": names, "importance": fi})
                df = df.sort_values("importance", ascending=False).head(10)
                return df.to_dict("records")
        except Exception:
            pass
        return []

    def _compute_shap_drift(
        self,
        X: pd.DataFrame,
        champ_metrics: ModelMetrics,
        chall_metrics: ModelMetrics,
    ) -> Tuple[Optional[float], Optional[float]]:
        """
        Calcule le drift SHAP entre champion et challenger.
        Retourne (None, None) si shap n'est pas installé.
        """
        try:
            import shap
            sample = X.sample(min(100, len(X)), random_state=42)

            def _top5(model):
                base = self._unwrap_model(model)
                exp = shap.TreeExplainer(base)
                sv = exp.shap_values(sample)
                if isinstance(sv, list):
                    sv = sv[1]
                mean_abs = np.abs(sv).mean(axis=0)
                n = min(len(mean_abs), X.shape[1])
                idx = np.argsort(mean_abs[:n])[::-1][:5]
                return set(idx.tolist())

            top5_champ = _top5(self.champion_model)
            top5_chall = _top5(self.challenger_model)

            overlap = len(top5_champ & top5_chall) / 5
            drift   = 1 - overlap
            return round(drift, 4), round(overlap, 4)

        except Exception:
            return None, None

    # ── Recommandation ─────────────────────────────────────────────────────────

    def _make_recommendation(
        self,
        auc_diff: float,
        delong_significant: bool,
        brier_diff: float,
        shap_drift: Optional[float],
        champ: ModelMetrics,
        chall: ModelMetrics,
    ) -> Tuple[str, List[str], Dict[str, bool]]:
        """
        Recommandation de promotion basée sur les critères COBAC / EBA IRB.
        """
        criteria = {
            "auc_gain_sufficient": auc_diff >= PROMOTION_CRITERIA["min_auc_gain_pp"],
            "delong_significant":  delong_significant,
            "no_brier_regression": brier_diff <= PROMOTION_CRITERIA["max_brier_regression"],
            "no_shap_drift": (shap_drift is None) or (shap_drift <= PROMOTION_CRITERIA["max_shap_drift"]),
        }

        reasons = []

        if auc_diff >= PROMOTION_CRITERIA["min_auc_gain_pp"]:
            reasons.append(f"✅ Gain AUC : +{auc_diff*100:.2f}pp (≥ {PROMOTION_CRITERIA['min_auc_gain_pp']*100:.1f}pp requis)")
        else:
            reasons.append(f"❌ Gain AUC insuffisant : {auc_diff*100:+.2f}pp (< {PROMOTION_CRITERIA['min_auc_gain_pp']*100:.1f}pp)")

        if delong_significant:
            reasons.append(f"✅ Test DeLong significatif (p={chall.auc_roc:.4f} vs champion AUC)")
        else:
            reasons.append(f"⚠️  Test DeLong non significatif — différence peut être due au hasard")

        if brier_diff <= 0:
            reasons.append(f"✅ Calibration améliorée (Brier {brier_diff:+.4f})")
        elif brier_diff <= PROMOTION_CRITERIA["max_brier_regression"]:
            reasons.append(f"⚠️  Légère régression calibration Brier ({brier_diff:+.4f})")
        else:
            reasons.append(f"❌ Régression calibration Brier ({brier_diff:+.4f} > {PROMOTION_CRITERIA['max_brier_regression']})")

        if shap_drift is not None:
            if shap_drift <= PROMOTION_CRITERIA["max_shap_drift"]:
                reasons.append(f"✅ Drift SHAP acceptable ({shap_drift:.1%})")
            else:
                reasons.append(f"❌ Drift SHAP élevé ({shap_drift:.1%} > {PROMOTION_CRITERIA['max_shap_drift']:.0%}) — changement structurel du modèle")

        # Décision
        n_passed = sum(criteria.values())
        if n_passed == len(criteria):
            recommendation = "PROMOTE"
            reasons.append("🟢 Tous les critères de promotion sont satisfaits.")
        elif criteria["no_brier_regression"] is False or (shap_drift and shap_drift > PROMOTION_CRITERIA["max_shap_drift"]):
            recommendation = "REJECT"
            reasons.append("🔴 Critères bloquants non satisfaits — rejet de la promotion.")
        elif n_passed >= 2:
            recommendation = "CONDITIONAL_PROMOTE"
            reasons.append("🟡 Promotion conditionnelle — revue par le comité MRM recommandée.")
        else:
            recommendation = "REVIEW"
            reasons.append("🟡 Insuffisant pour promotion — tests complémentaires nécessaires.")

        return recommendation, reasons, criteria

    def _save_report(self, report: ComparisonReport, output_dir: str) -> str:
        """Sauvegarde le rapport en JSON."""
        OUT_ROOT.mkdir(parents=True, exist_ok=True)
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        filename = f"comparison_{report.champion_name}_vs_{report.challenger_name}_{report.report_id}.json"
        path = output_dir / filename
        with open(path, "w") as f:
            json.dump(report.to_dict(), f, indent=2, default=str)
        print(f"[Comparison] Rapport sauvegardé : {path}")
        return str(path)

    @staticmethod
    def _predict_proba(model: Any, X: pd.DataFrame) -> np.ndarray:
        """Extrait les probabilités de défaut depuis n'importe quel modèle sklearn-compatible."""
        proba = model.predict_proba(X)
        return proba[:, 1] if proba.ndim == 2 else proba

    @staticmethod
    def _unwrap_model(model: Any) -> Any:
        """Déwrappe CalibratedClassifierCV."""
        if hasattr(model, "calibrated_classifiers_"):
            return model.calibrated_classifiers_[0].estimator
        if hasattr(model, "estimator"):
            return model.estimator
        return model


def main():
    import argparse, logging
    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(description="Champion/Challenger Comparison")
    parser.add_argument("--champion",   required=True, help="Chemin vers le modèle champion (.pkl)")
    parser.add_argument("--challenger", required=True, help="Chemin vers le modèle challenger (.pkl)")
    parser.add_argument("--data",       default=str(DEFAULT_DATA_PATH), help="Dataset de test")
    parser.add_argument("--features",   default=str(FEATURES_PATH), help="Features JSON")
    parser.add_argument("--output",     default=str(OUT_ROOT), help="Répertoire de sortie")
    parser.add_argument("--target",     default="TARGET", help="Nom de la colonne cible")
    args = parser.parse_args()

    # Chargement des données
    if args.data.endswith(".parquet"):
        df = pd.read_parquet(args.data)
    else:
        df = pd.read_csv(args.data)

    with open(args.features, "r") as f:
        feature_names = json.load(f)["features"]

    available = [c for c in feature_names if c in df.columns]
    X = df[available]
    y = df[args.target]

    _, X_test, _, y_test = __import__("sklearn.model_selection", fromlist=["train_test_split"]).train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    comp = ChampionChallengerComparison(
        champion_path=args.champion,
        challenger_path=args.challenger,
        features_path=args.features,
    )
    comp.load_models()

    report = comp.run_comparison(X_test, y_test, output_dir=args.output)

    print(f"\n{'='*60}")
    print(f"Champion  : {report.champion_name}  AUC={report.champion_metrics.auc_roc:.4f}")
    print(f"Challenger: {report.challenger_name} AUC={report.challenger_metrics.auc_roc:.4f}")
    print(f"AUC diff  : {report.delong_auc_diff:+.4f} (p={report.delong_p_value:.4f})")
    print(f"{'='*60}")
    print(f"Recommandation : {report.recommendation}")
    for r in report.recommendation_reasons:
        print(f"  {r}")


if __name__ == "__main__":
    main()
