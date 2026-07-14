"""
leakage_detector.py
====================
Détection de data leakage pour le pipeline PD Model.

Trois types de leakage audités :

1. Feature-TARGET leakage (corrélation suspecte)
   Une feature avec |Spearman| > 0.70 avec TARGET peut indiquer une fuite
   d'information future (ex : indicateur de défaut post-décision inclus
   dans le dataset d'entraînement).

2. Temporal leakage (features calculées sur des données futures)
   Pour chaque feature agrégée de bureau (BUREAU_*, INST_*, POS_*) :
   vérifier que l'agrégation ne contient pas d'entrées postérieures
   à la date de demande du prêt.
   → Ici : proxy via la corrélation avec SK_ID_CURR (si une feature
     de bureau corrèle plus fort dans les dernières tranches que dans
     les premières, c'est suspect).

3. Monotonie SK_ID_CURR
   Réexpose validate_sk_id_monotonicity() pour la suite CI.

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import logging
import json
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from scipy import stats

logger = logging.getLogger(__name__)


class LeakageDetector:
    """
    Suite de tests de leakage pour le dataset PD.

    Usage :
        detector = LeakageDetector()
        report = detector.run_full_leakage_audit(df, target_col="TARGET")
        detector.save_report(report)
    """

    # Seuil de corrélation Spearman au-delà duquel une feature est suspecte.
    # En pratique, aucune feature brute ne devrait dépasser 0.70 avec TARGET
    # sans être elle-même un proxy du défaut (ex : champ "default_flag").
    CORRELATION_ALERT_THRESHOLD = 0.70
    CORRELATION_WARNING_THRESHOLD = 0.50

    # Colonnes exclues de la recherche de leakage (identifiants, target elle-même)
    EXCLUDE_COLS = {"SK_ID_CURR", "SK_ID_BUREAU", "SK_ID_PREV", "TARGET", "index", "level_0"}

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = output_dir or os.path.join(
            os.path.dirname(__file__), "artifacts", "leakage_reports"
        )
        os.makedirs(self.output_dir, exist_ok=True)

    # ── Test 1 : Corrélation feature-TARGET ───────────────────────────────────

    def check_feature_target_correlation(
        self,
        df: pd.DataFrame,
        target_col: str = "TARGET",
        top_n: int = 20,
    ) -> Dict:
        """
        Calcule la corrélation de Spearman entre chaque feature numérique et TARGET.

        Un |r| > 0.70 est un signal d'alarme : soit la feature est un proxy direct
        du défaut (leakage), soit elle encode une information post-événement.

        Exceptions normales attendues :
          - EXT_SOURCE_1/2/3 : corrélation négative modérée (-0.3 à -0.5) → normal
          - DAYS_EMPLOYED : corrélation modérée négative → normal
        """
        if target_col not in df.columns:
            return {"error": f"Target column '{target_col}' not found"}

        y = df[target_col].values
        num_cols = [
            c for c in df.select_dtypes(include=[np.number]).columns
            if c not in self.EXCLUDE_COLS and c != target_col
        ]

        correlations = []
        for col in num_cols:
            x = df[col].values
            # Retirer les NaN pairés
            mask = ~(np.isnan(x) | np.isnan(y.astype(float)))
            if mask.sum() < 100:
                continue
            try:
                r, p = stats.spearmanr(x[mask], y[mask])
                abs_r = abs(float(r))
                correlations.append({
                    "feature": col,
                    "spearman_r": round(float(r), 4),
                    "abs_r": round(abs_r, 4),
                    "p_value": round(float(p), 6),
                    "status": (
                        "ALERT" if abs_r >= self.CORRELATION_ALERT_THRESHOLD else
                        "WARNING" if abs_r >= self.CORRELATION_WARNING_THRESHOLD else
                        "OK"
                    ),
                })
            except Exception as e:
                logger.debug(f"Spearman failed for {col}: {e}")

        correlations.sort(key=lambda x: x["abs_r"], reverse=True)
        alerts = [c for c in correlations if c["status"] == "ALERT"]
        warnings = [c for c in correlations if c["status"] == "WARNING"]

        for a in alerts:
            logger.error(
                f"[LEAKAGE] ALERT — feature '{a['feature']}' : "
                f"|Spearman|={a['abs_r']:.3f} ≥ {self.CORRELATION_ALERT_THRESHOLD}. "
                "Risque de leakage ou proxy du défaut."
            )
        for w in warnings:
            logger.warning(
                f"[LEAKAGE] WARNING — feature '{w['feature']}' : "
                f"|Spearman|={w['abs_r']:.3f} (modéré). Vérifier l'origine."
            )

        return {
            "test": "feature_target_correlation",
            "n_features_tested": len(correlations),
            "n_alerts": len(alerts),
            "n_warnings": len(warnings),
            "top_correlations": correlations[:top_n],
            "alerts": alerts,
            "leakage_suspected": len(alerts) > 0,
        }

    # ── Test 2 : Leakage temporel (asymétrie de corrélation par tranche) ─────

    def check_temporal_leakage_proxy(
        self,
        df: pd.DataFrame,
        target_col: str = "TARGET",
        id_col: str = "SK_ID_CURR",
        n_splits: int = 4,
        bureau_prefix: str = "BUREAU_",
    ) -> Dict:
        """
        Détecte le leakage temporel via l'asymétrie de corrélation.

        Principe : si une feature de bureau (agrégée depuis l'historique crédit)
        est calculée correctement point-in-time, sa corrélation avec TARGET
        ne doit pas augmenter systématiquement dans les tranches temporelles récentes.
        Une augmentation monotone de corrélation avec la tranche temporelle signale
        que des données futures ont "remonté" dans les agrégations anciennes.

        Note : ce test est un proxy — il nécessite des données avec de vraies dates
        pour un audit complet. Avec SK_ID_CURR comme proxy temporel, toute inversion
        de monotonie SK_ID_CURR affecte la fiabilité de ce test.
        """
        if id_col not in df.columns:
            return {"error": f"ID column '{id_col}' not found. Cannot perform temporal leakage check."}

        df_sorted = df.sort_values(id_col).reset_index(drop=True)
        n = len(df_sorted)
        split_size = n // n_splits

        bureau_features = [
            c for c in df.columns
            if c.startswith(bureau_prefix) and c not in self.EXCLUDE_COLS
            and df[c].dtype in [np.float64, np.int64, np.float32]
        ]

        if not bureau_features:
            return {
                "test": "temporal_leakage_proxy",
                "warning": f"Aucune feature avec le préfixe '{bureau_prefix}' trouvée.",
                "leakage_suspected": False,
            }

        feature_trends = []
        for feat in bureau_features[:30]:  # Limiter à 30 features pour performance
            split_corrs = []
            for i in range(n_splits):
                start = i * split_size
                end = start + split_size if i < n_splits - 1 else n
                chunk = df_sorted.iloc[start:end]
                x = chunk[feat].values
                y = chunk[target_col].values
                mask = ~(np.isnan(x) | np.isnan(y.astype(float)))
                if mask.sum() < 50:
                    split_corrs.append(None)
                    continue
                try:
                    r, _ = stats.spearmanr(x[mask], y[mask])
                    split_corrs.append(round(float(r), 4))
                except Exception:
                    split_corrs.append(None)

            # Test de tendance : la corrélation augmente-t-elle monotonement ?
            valid_corrs = [c for c in split_corrs if c is not None]
            if len(valid_corrs) >= 3:
                diffs = [valid_corrs[i+1] - valid_corrs[i] for i in range(len(valid_corrs)-1)]
                monotone_increase = all(d > 0 for d in diffs)
                abs_trend = abs(valid_corrs[-1] - valid_corrs[0]) if valid_corrs else 0
                flag = monotone_increase and abs_trend > 0.15
                feature_trends.append({
                    "feature": feat,
                    "correlations_by_split": split_corrs,
                    "abs_trend": round(abs_trend, 4),
                    "monotone_increase": monotone_increase,
                    "temporal_leakage_flag": flag,
                })

        flagged = [f for f in feature_trends if f["temporal_leakage_flag"]]
        if flagged:
            for f in flagged:
                logger.warning(
                    f"[LEAKAGE] Temporal pattern suspect : '{f['feature']}' — "
                    f"corrélation croît de {f['correlations_by_split'][0]} à "
                    f"{f['correlations_by_split'][-1]} sur les tranches temporelles. "
                    "Vérifier que l'agrégation est bien point-in-time."
                )

        return {
            "test": "temporal_leakage_proxy",
            "n_features_tested": len(feature_trends),
            "n_splits": n_splits,
            "id_column": id_col,
            "n_flagged": len(flagged),
            "flagged_features": flagged,
            "leakage_suspected": len(flagged) > 0,
            "caveat": (
                "Test proxy basé sur SK_ID_CURR — non substituable à un audit "
                "point-in-time sur données réelles avec dates calendaires."
            ),
        }

    # ── Test 3 : Monotonie SK_ID_CURR ────────────────────────────────────────

    def check_sk_id_monotonicity(
        self,
        df: pd.DataFrame,
        id_col: str = "SK_ID_CURR",
    ) -> Dict:
        """
        Réexpose validate_sk_id_monotonicity depuis le contexte du leakage detector.
        Voir PDModelTrainer.validate_sk_id_monotonicity() pour la logique complète.
        """
        if id_col not in df.columns:
            return {
                "test": "sk_id_monotonicity",
                "error": f"Colonne '{id_col}' absente",
                "safe_to_use_as_temporal_proxy": False,
            }

        ids = df[id_col].values
        n_inversions = int((np.diff(ids) < 0).sum())
        total_pairs = len(ids) - 1
        inversion_rate = n_inversions / total_pairs if total_pairs > 0 else 0.0

        if n_inversions > 0:
            logger.warning(
                f"[LEAKAGE] SK_ID_CURR : {n_inversions} inversions ({inversion_rate:.2%}). "
                "Le split walk-forward peut inclure du leakage temporel."
            )
        else:
            logger.info(f"[LEAKAGE] SK_ID_CURR monotone — proxy chronologique valide.")

        return {
            "test": "sk_id_monotonicity",
            "id_column": id_col,
            "n_observations": int(len(ids)),
            "n_inversions": n_inversions,
            "inversion_rate": round(inversion_rate, 6),
            "is_monotone": n_inversions == 0,
            "safe_to_use_as_temporal_proxy": inversion_rate < 0.001,
        }

    # ── Test 4 : Features à variance nulle ou quasi-nulle ────────────────────

    def check_zero_variance_features(
        self,
        df: pd.DataFrame,
        target_col: str = "TARGET",
        variance_threshold: float = 1e-6,
    ) -> Dict:
        """
        Identifie les features avec variance nulle ou quasi-nulle.

        Une feature à variance nulle n'apporte aucune information et peut masquer
        une valeur constante post-leakage (ex : flag "funded" toujours 1 dans
        un dataset filtré sur les prêts accordés).
        """
        num_cols = [
            c for c in df.select_dtypes(include=[np.number]).columns
            if c not in self.EXCLUDE_COLS and c != target_col
        ]
        zero_var = []
        low_var = []
        for col in num_cols:
            var = df[col].var()
            if var < variance_threshold:
                zero_var.append({"feature": col, "variance": float(var)})
            elif var < variance_threshold * 100:
                low_var.append({"feature": col, "variance": float(var)})

        if zero_var:
            logger.warning(
                f"[LEAKAGE] {len(zero_var)} features à variance nulle : "
                f"{[f['feature'] for f in zero_var[:5]]}..."
            )

        return {
            "test": "zero_variance_features",
            "n_zero_variance": len(zero_var),
            "n_low_variance": len(low_var),
            "zero_variance_features": zero_var,
            "low_variance_features": low_var[:10],
            "leakage_suspected": len(zero_var) > 0,
        }

    # ── Rapport complet ───────────────────────────────────────────────────────

    def run_full_leakage_audit(
        self,
        df: pd.DataFrame,
        target_col: str = "TARGET",
        id_col: str = "SK_ID_CURR",
    ) -> Dict:
        """
        Lance l'audit complet de leakage.

        Returns:
            Rapport structuré avec {monotonicity, correlation, temporal, zero_variance, summary}
        """
        logger.info(f"=== Leakage Audit | n={len(df)} | target={target_col} ===")
        report: Dict = {
            "audit_timestamp": datetime.utcnow().isoformat(),
            "n_samples": int(len(df)),
            "target_col": target_col,
            "id_col": id_col,
        }

        report["sk_id_monotonicity"] = self.check_sk_id_monotonicity(df, id_col)
        report["feature_target_correlation"] = self.check_feature_target_correlation(df, target_col)
        report["temporal_leakage_proxy"] = self.check_temporal_leakage_proxy(df, target_col, id_col)
        report["zero_variance"] = self.check_zero_variance_features(df, target_col)

        n_leakage_signals = sum([
            1 if report["sk_id_monotonicity"].get("n_inversions", 0) > 0 else 0,
            report["feature_target_correlation"].get("n_alerts", 0),
            report["temporal_leakage_proxy"].get("n_flagged", 0),
            report["zero_variance"].get("n_zero_variance", 0),
        ])

        promotion_blocked = n_leakage_signals > 0
        report["summary"] = {
            "total_leakage_signals": n_leakage_signals,
            "promotion_gate_pass": not promotion_blocked,
            "promotion_gate_status": (
                "BLOCKED — investiguer les signaux de leakage avant promotion CHALLENGER"
                if promotion_blocked else
                "PASS — aucun signal de leakage critique détecté"
            ),
            "signals": {
                "sk_id_inversions": report["sk_id_monotonicity"].get("n_inversions", 0),
                "correlation_alerts": report["feature_target_correlation"].get("n_alerts", 0),
                "temporal_flags": report["temporal_leakage_proxy"].get("n_flagged", 0),
                "zero_var_features": report["zero_variance"].get("n_zero_variance", 0),
            },
        }

        level = logging.WARNING if promotion_blocked else logging.INFO
        logger.log(
            level,
            f"Leakage Audit terminé — Gate: "
            f"{'BLOCKED' if promotion_blocked else 'PASS'} | "
            f"Signaux: {n_leakage_signals}"
        )
        return report

    def save_report(self, report: Dict, filename: Optional[str] = None) -> str:
        """Sauvegarde le rapport en JSON (evidence pack)."""
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = filename or f"leakage_audit_{ts}.json"
        path = os.path.join(self.output_dir, filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, default=str)
        logger.info(f"Rapport leakage sauvegardé : {path}")
        return path


# ── Intégration dans run_training_pipeline ────────────────────────────────────
# Appelé automatiquement à la fin de run_training_pipeline() si le dataset
# est disponible. Gate bloquant avant promotion CHALLENGER.

def run_leakage_gate(
    df: pd.DataFrame,
    output_dir: Optional[str] = None,
    target_col: str = "TARGET",
    id_col: str = "SK_ID_CURR",
) -> Tuple[bool, Dict]:
    """
    Lance l'audit de leakage et retourne (gate_pass, report).
    Gate_pass = False signifie que la promotion CHALLENGER est bloquée.
    """
    detector = LeakageDetector(output_dir=output_dir)
    report = detector.run_full_leakage_audit(df, target_col=target_col, id_col=id_col)
    detector.save_report(report)
    gate_pass = report["summary"]["promotion_gate_pass"]
    return gate_pass, report


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    parser = argparse.ArgumentParser(description="Leakage Detector — PD Model")
    parser.add_argument("--data-path", type=str, required=True,
                        help="Chemin vers le dataset Parquet ou CSV")
    parser.add_argument("--target-col", type=str, default="TARGET")
    parser.add_argument("--id-col", type=str, default="SK_ID_CURR")
    args = parser.parse_args()

    if args.data_path.endswith(".parquet"):
        df = pd.read_parquet(args.data_path)
    else:
        df = pd.read_csv(args.data_path)

    gate_pass, report = run_leakage_gate(df, target_col=args.target_col, id_col=args.id_col)
    s = report["summary"]
    print(f"\n{'='*60}")
    print("Leakage Audit Report")
    print(f"{'='*60}")
    print(f"  Gate: {s['promotion_gate_status']}")
    print(f"  SK_ID inversions     : {s['signals']['sk_id_inversions']}")
    print(f"  Correlation alerts   : {s['signals']['correlation_alerts']}")
    print(f"  Temporal flags       : {s['signals']['temporal_flags']}")
    print(f"  Zero-var features    : {s['signals']['zero_var_features']}")
    sys.exit(0 if gate_pass else 1)
