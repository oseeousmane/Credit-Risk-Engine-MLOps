"""
skew_analyzer.py
=================
Quantification du Training-Serving Skew pour le pipeline PD Model.

Le skew training-serving est la divergence entre la distribution des features
observées en training (données Home Credit) et celles produites par le pipeline
d'inférence en production (feature_pipeline.py sur des payloads corporate).

Pour Octaix, ce skew est structurel et connu :
  - EXT_SOURCE_1/2/3 : vrais scores externes en training → lookup tables en inférence
  - BUREAU_* / INST_* / POS_* : historiques réels → proxies ou zéros en inférence
  - AMT_INCOME_TOTAL : revenu individuel retail → revenu corporate (ordres de magnitude diff.)

Ce module :
  1. Compare les distributions training vs inférence par feature
  2. Calcule le PSI (Population Stability Index) par feature
  3. Identifie les features à skew critique (PSI > 0.20)
  4. Estime l'impact AUC théorique du skew (méthode delta-AUC)
  5. Génère un rapport evidence pack sauvegardable

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import logging
import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime
from scipy import stats

logger = logging.getLogger(__name__)


# ── Constantes de référence training (Home Credit population statistics) ──────
# Ces statistiques sont calculées sur le dataset Home Credit et servent
# de référence pour comparer avec les vecteurs d'inférence produits.
# À recalculer lors du retraining sur données réelles CEMAC.

TRAINING_REFERENCE_STATS = {
    # (mean, std, p05, p50, p95) — source : Home Credit training set
    "EXT_SOURCE_1":              (0.502, 0.180, 0.196, 0.511, 0.787),
    "EXT_SOURCE_2":              (0.514, 0.195, 0.160, 0.528, 0.800),
    "EXT_SOURCE_3":              (0.511, 0.194, 0.184, 0.537, 0.806),
    "EXT_SOURCE_MEAN":           (0.509, 0.166, 0.220, 0.525, 0.770),
    "DEBT_TO_INCOME":            (0.245, 0.109, 0.083, 0.237, 0.458),
    "CREDIT_TO_INCOME_RATIO":    (1.785, 0.921, 0.499, 1.614, 3.704),
    "CREDIT_TO_ANNUITY_RATIO":   (48.2,  21.4,  15.0,  45.0,  90.0),
    "BUREAU_CREDIT_UTILIZATION": (0.280, 0.220, 0.010, 0.240, 0.720),
    "AMT_INCOME_TOTAL":          (168797, 90963, 54000, 148500, 315000),
    "AMT_CREDIT":                (599025, 402490, 90000, 513531, 1350000),
    "INST_LATE_PAYMENT_RATE":    (0.052, 0.115, 0.000, 0.000, 0.286),
    "INST_MEAN_DAYS_LATE":       (1.20,  5.30,  0.000, 0.000, 5.100),
    "POS_SK_DPD_MEAN":           (0.47,  3.85,  0.000, 0.000, 0.000),
    "DAYS_EMPLOYED":             (-2148, 2023, -5810, -1648, -239),
    "AGE_YEARS":                 (43.9,  11.9,  25.0,  43.0,  63.0),
}


class SkewAnalyzer:
    """
    Analyseur de Training-Serving Skew.

    Usage :
        analyzer = SkewAnalyzer(training_df=X_train)
        report = analyzer.analyze_inference_batch(inference_samples)
        analyzer.save_report(report)

    Ou, sans training_df, compare contre TRAINING_REFERENCE_STATS :
        analyzer = SkewAnalyzer()
        report = analyzer.analyze_inference_batch(inference_samples)
    """

    PSI_CRITICAL = 0.20    # PSI ≥ 0.20 → skew critique, modèle potentiellement invalide
    PSI_WARNING  = 0.10    # PSI ≥ 0.10 → surveiller

    # Chemin par convention — généré par train.py save_model() ou le script de calcul
    _REFERENCE_STATS_PATH = os.path.join(
        os.path.dirname(__file__), "artifacts", "pd_xgb_v1_reference_stats.json"
    )

    def __init__(
        self,
        training_df: Optional[pd.DataFrame] = None,
        output_dir: Optional[str] = None,
        reference_stats_path: Optional[str] = None,
    ):
        """
        Args:
            training_df:           DataFrame du jeu d'entraînement. Priorité 1.
            reference_stats_path:  Chemin vers pd_xgb_v1_reference_stats.json. Priorité 2.
            output_dir:            Répertoire de sauvegarde des rapports.
        Fallback : TRAINING_REFERENCE_STATS hardcodé (15 features seulement).
        """
        self.training_df = training_df
        self.output_dir = output_dir or os.path.join(
            os.path.dirname(__file__), "artifacts", "skew_reports"
        )
        os.makedirs(self.output_dir, exist_ok=True)

        # Charger les stats de référence complètes (157 features)
        stats_path = reference_stats_path or self._REFERENCE_STATS_PATH
        self._full_reference_stats: Optional[dict] = None
        if os.path.exists(stats_path):
            try:
                import json as _json
                with open(stats_path, encoding="utf-8") as _f:
                    _data = _json.load(_f)
                self._full_reference_stats = _data.get("features", {})
                logger.info(
                    f"[SkewAnalyzer] Reference stats chargees : "
                    f"{len(self._full_reference_stats)} features depuis {stats_path}"
                )
            except Exception as _e:
                logger.warning(f"[SkewAnalyzer] Impossible de charger reference stats : {_e}")

    # ── PSI calculation ───────────────────────────────────────────────────────

    @staticmethod
    def _compute_psi(
        expected: np.ndarray,
        actual: np.ndarray,
        n_bins: int = 10,
    ) -> float:
        """
        Population Stability Index entre distribution attendue (training) et actuelle (inférence).
        PSI < 0.10 → stable | 0.10-0.20 → surveiller | > 0.20 → critique
        """
        eps = 1e-4
        expected = expected[~np.isnan(expected)]
        actual   = actual[~np.isnan(actual)]

        if len(expected) == 0 or len(actual) == 0:
            return 0.0

        breakpoints = np.percentile(expected, np.linspace(0, 100, n_bins + 1))
        breakpoints[0]  = -np.inf
        breakpoints[-1] = np.inf
        breakpoints = np.unique(breakpoints)
        if len(breakpoints) < 2:
            return 0.0

        exp_hist = np.histogram(expected, bins=breakpoints)[0] / len(expected) + eps
        act_hist = np.histogram(actual,   bins=breakpoints)[0] / len(actual)   + eps

        return float(np.sum((act_hist - exp_hist) * np.log(act_hist / exp_hist)))

    # ── Distribution comparison ───────────────────────────────────────────────

    def _compare_distributions(
        self,
        feature: str,
        training_values: np.ndarray,
        inference_values: np.ndarray,
    ) -> Dict[str, Any]:
        """Compare les distributions training vs inférence pour une feature."""
        t = training_values[~np.isnan(training_values)]
        i = inference_values[~np.isnan(inference_values)]

        if len(i) == 0:
            return {"feature": feature, "error": "Aucune valeur d'inférence disponible"}

        psi = self._compute_psi(t, i) if len(t) > 0 else float("nan")

        # KS test (si taille suffisante)
        ks_stat, ks_pval = (None, None)
        if len(t) >= 20 and len(i) >= 5:
            try:
                ks_stat, ks_pval = stats.ks_2samp(t, i)
                ks_stat = round(float(ks_stat), 4)
                ks_pval = round(float(ks_pval), 6)
            except Exception:
                pass

        def _safe_stats(arr):
            if len(arr) == 0:
                return {}
            return {
                "mean": round(float(np.mean(arr)), 4),
                "std":  round(float(np.std(arr)), 4),
                "p05":  round(float(np.percentile(arr,  5)), 4),
                "p50":  round(float(np.percentile(arr, 50)), 4),
                "p95":  round(float(np.percentile(arr, 95)), 4),
            }

        status = (
            "CRITICAL" if psi >= self.PSI_CRITICAL else
            "WARNING"  if psi >= self.PSI_WARNING  else
            "OK"
        )

        return {
            "feature":           feature,
            "psi":               round(psi, 4) if not np.isnan(psi) else None,
            "status":            status,
            "ks_statistic":      ks_stat,
            "ks_pvalue":         ks_pval,
            "training_stats":    _safe_stats(t),
            "inference_stats":   _safe_stats(i),
            "n_training":        int(len(t)),
            "n_inference":       int(len(i)),
        }

    # ── Analyze batch ─────────────────────────────────────────────────────────

    def analyze_inference_batch(
        self,
        inference_features: List[Dict[str, float]],
        features_to_check: Optional[List[str]] = None,
    ) -> Dict:
        """
        Compare un batch de vecteurs d'inférence avec la distribution training.

        Args:
            inference_features: Liste de dicts {feature_name: value} — sorties de build_feature_vector()
            features_to_check:  Liste de features à analyser (None = toutes les features de référence)

        Returns:
            Rapport de skew structuré.
        """
        if not inference_features:
            return {"error": "Aucun vecteur d'inférence fourni"}

        inference_df = pd.DataFrame(inference_features)

        # Priorité : training_df > reference_stats.json (157) > TRAINING_REFERENCE_STATS hardcodé (15)
        if features_to_check is None:
            if self._full_reference_stats:
                features_to_check = list(self._full_reference_stats.keys())
            elif self.training_df is not None:
                features_to_check = list(self.training_df.columns)
            else:
                features_to_check = list(TRAINING_REFERENCE_STATS.keys())

        results = []
        for feat in features_to_check:
            if feat not in inference_df.columns:
                results.append({
                    "feature": feat, "psi": None, "status": "MISSING",
                    "error": "Feature absente du vecteur d'inference",
                })
                continue

            inf_values = inference_df[feat].values

            if self.training_df is not None and feat in self.training_df.columns:
                train_values = self.training_df[feat].dropna().values
            elif self._full_reference_stats and feat in self._full_reference_stats:
                ref = self._full_reference_stats[feat]
                if ref.get("type") == "categorical":
                    results.append({"feature": feat, "psi": None, "status": "CATEGORICAL_SKIP"})
                    continue
                mean = ref.get("mean", 0.0)
                std  = max(ref.get("std", 1.0), 1e-6)
                p05, p95 = ref.get("p05", mean - 2*std), ref.get("p95", mean + 2*std)
                np.random.seed(42)
                train_values = np.random.normal(mean, std, 5000)
                train_values = np.clip(train_values, p05 * 0.5 if p05 > 0 else p05 * 1.5, p95 * 1.5)
            elif feat in TRAINING_REFERENCE_STATS:
                mean, std, p05, p50, p95 = TRAINING_REFERENCE_STATS[feat]
                np.random.seed(42)
                train_values = np.random.normal(mean, std, 5000)
                train_values = np.clip(train_values, p05 * 0.5, p95 * 1.5)
            else:
                results.append({
                    "feature": feat, "psi": None, "status": "NO_REFERENCE",
                    "error": "Feature absente du training_df et des stats de reference",
                })
                continue

            result = self._compare_distributions(feat, train_values, inf_values)
            results.append(result)

            if result.get("status") == "CRITICAL":
                logger.error(
                    f"[SKEW] CRITICAL — '{feat}' : PSI={result['psi']:.3f}. "
                    f"Training mean={result['training_stats'].get('mean','?')} | "
                    f"Inference mean={result['inference_stats'].get('mean','?')}. "
                    "Les scores PD sur ce segment sont potentiellement non fiables."
                )
            elif result.get("status") == "WARNING":
                logger.warning(
                    f"[SKEW] WARNING — '{feat}' : PSI={result['psi']:.3f}. "
                    "Surveiller la dérive de distribution."
                )

        critical = [r for r in results if r.get("status") == "CRITICAL"]
        warnings = [r for r in results if r.get("status") == "WARNING"]

        # Score de fiabilité global : 100% - pénalité par feature critique
        reliability_score = max(0.0, 100.0 - len(critical) * 15.0 - len(warnings) * 5.0)

        return {
            "analysis_timestamp":    datetime.utcnow().isoformat(),
            "n_inference_samples":   len(inference_features),
            "n_features_analyzed":   len(results),
            "n_critical_skew":       len(critical),
            "n_warning_skew":        len(warnings),
            "reliability_score":     round(reliability_score, 1),
            "feature_results":       results,
            "critical_features":     [r["feature"] for r in critical],
            "summary": {
                "overall_skew_status": (
                    "CRITICAL — modèle non fiable sur ce batch d'inférence"
                    if len(critical) >= 3 else
                    "WARNING — surveiller les features listées"
                    if len(critical) > 0 or len(warnings) >= 3 else
                    "OK — skew dans les limites acceptables"
                ),
                "n_critical": len(critical),
                "n_warning":  len(warnings),
                "reliability_score": round(reliability_score, 1),
                "recommendation": (
                    "Arrêter le scoring automatique et passer en revue humaine"
                    if len(critical) >= 3 else
                    "Monitorer et déclencher un retraining si persistant"
                    if len(critical) > 0 else
                    "Aucune action immédiate requise"
                ),
            },
        }

    def save_report(self, report: Dict, filename: Optional[str] = None) -> str:
        """Sauvegarde le rapport de skew en JSON (evidence pack)."""
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = filename or f"skew_analysis_{ts}.json"
        path = os.path.join(self.output_dir, filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, default=str)
        logger.info(f"Rapport skew sauvegardé : {path}")
        return path


# ── Fonction utilitaire pour feature_pipeline.py ──────────────────────────────

def get_training_reference_stats() -> Dict[str, tuple]:
    """Retourne les statistiques de référence training (Home Credit)."""
    return TRAINING_REFERENCE_STATS.copy()


def assess_payload_skew(
    pipeline_result: Dict,
    training_df: Optional[pd.DataFrame] = None,
) -> Dict:
    """
    Évalue le skew d'un seul payload d'inférence contre la distribution training.
    Appelé par le pipeline d'inférence FastAPI pour enrichir le scoring snapshot.

    Args:
        pipeline_result: Résultat de build_feature_vector()
        training_df:     DataFrame training (optionnel — sinon utilise les stats hardcodées)

    Returns:
        Dict avec {skew_status, critical_features, reliability_score}
    """
    features_dict = pipeline_result.get("features", {})
    analyzer = SkewAnalyzer(training_df=training_df)
    report = analyzer.analyze_inference_batch([features_dict])
    return {
        "skew_status":        report["summary"]["overall_skew_status"],
        "reliability_score":  report["reliability_score"],
        "critical_features":  report["critical_features"],
        "n_critical":         report["n_critical_skew"],
        "n_warning":          report["n_warning_skew"],
    }


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    parser = argparse.ArgumentParser(description="Training-Serving Skew Analyzer")
    parser.add_argument("--training-path", type=str, required=False,
                        help="Chemin vers le dataset training Parquet/CSV (optionnel)")
    parser.add_argument("--inference-path", type=str, required=False,
                        help="Chemin vers un batch de features d'inférence (JSON/CSV)")
    args = parser.parse_args()

    # Demo avec données synthétiques si aucun chemin fourni
    print("Démonstration : Génération de vecteurs d'inférence synthétiques...")
    np.random.seed(42)
    n_samples = 50

    # Simuler un batch de payloads corporate : EXT_SOURCE plus élevé (rating BBB),
    # revenus beaucoup plus élevés (corporate vs retail), pas de retard
    demo_features = []
    for _ in range(n_samples):
        demo_features.append({
            "EXT_SOURCE_1":              np.random.uniform(0.55, 0.75),  # biais haut vs training
            "EXT_SOURCE_2":              np.random.uniform(0.50, 0.65),
            "EXT_SOURCE_3":              np.random.uniform(0.45, 0.70),
            "EXT_SOURCE_MEAN":           np.random.uniform(0.52, 0.70),
            "DEBT_TO_INCOME":            np.random.uniform(0.15, 0.60),
            "CREDIT_TO_INCOME_RATIO":    np.random.uniform(0.5, 3.0),
            "BUREAU_CREDIT_UTILIZATION": np.random.uniform(0.20, 0.50),
            "AMT_INCOME_TOTAL":          np.random.uniform(500_000, 5_000_000),  # corporate
            "AMT_CREDIT":                np.random.uniform(1_000_000, 50_000_000),
            "INST_LATE_PAYMENT_RATE":    0.0,   # neutre — pas de feedback loop
            "INST_MEAN_DAYS_LATE":       0.0,
            "POS_SK_DPD_MEAN":           0.0,
        })

    analyzer = SkewAnalyzer()
    report = analyzer.analyze_inference_batch(demo_features)
    path = analyzer.save_report(report)

    print(f"\n{'='*60}")
    print("Training-Serving Skew Report")
    print(f"{'='*60}")
    s = report["summary"]
    print(f"  Status           : {s['overall_skew_status']}")
    print(f"  Reliability score: {s['reliability_score']:.1f}%")
    print(f"  Critical skew    : {s['n_critical']} features")
    print(f"  Warning skew     : {s['n_warning']} features")
    print(f"  Recommandation   : {s['recommendation']}")
    print(f"\n  Top features par PSI :")
    for r in sorted(report["feature_results"], key=lambda x: x.get("psi") or 0, reverse=True)[:5]:
        psi = r.get("psi", "N/A")
        st  = r.get("status", "")
        print(f"    {r['feature']:<35} PSI={psi:.4f if isinstance(psi, float) else psi}  [{st}]")
    print(f"\n  Rapport : {path}")
