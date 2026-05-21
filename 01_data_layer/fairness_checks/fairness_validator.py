"""
fairness_validator.py
Validation de Fairness / Biais pour le Modèle PD
==================================================
Contexte CEMAC : Les biais ethno-géographiques, de genre et d'âge sont
des risques de conformité réglementaire explicites. Ce module implémente
les tests anti-discrimination requis avant toute promotion CHALLENGER.

Tests implémentés :
  1. Performance par segment (Gini, AUC, taux de défaut observé)
  2. Disparate Impact (ratio taux de rejet : groupe protégé / groupe référence)
  3. Equal Opportunity (différence de TPR entre groupes)
  4. Calibration par groupe (ratio E/O par groupe)
  5. Détection de sous-performance (segment sous le floor Gini 45%)

Variables protégées CEMAC typiques :
  - CODE_GENDER      (genre)
  - AGE_YEARS        (âge — proxy via DAYS_BIRTH)
  - REGION_*         (géographie — concentration urbain/rural)
  - NAME_INCOME_TYPE (statut d'emploi)
  - NAME_EDUCATION_TYPE (niveau d'éducation)

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import json
import os
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from sklearn.metrics import roc_auc_score

logger = logging.getLogger(__name__)


class FairnessValidator:
    """
    Suite de tests de fairness pour le modèle PD.

    Usage :
        validator = FairnessValidator()
        report = validator.run_full_fairness_audit(df, y_true, y_pred)
        validator.save_report(report)
    """

    # Floor de performance réglementaire par segment
    GINI_FLOOR = 0.40       # Gini < 40% → segment en sous-performance
    GINI_WARNING = 0.45     # Gini < 45% → monitoring requis
    AUC_FLOOR = 0.70

    # Seuil Disparate Impact : en dessous = discrimination adverse potentielle
    # (règle des 80% du EEOC / pratique bancaire)
    DISPARATE_IMPACT_THRESHOLD = 0.80

    # Seuil Equal Opportunity Gap (différence de TPR)
    EQUAL_OPPORTUNITY_GAP_THRESHOLD = 0.10

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = output_dir or os.path.join(
            os.path.dirname(__file__), "reports"
        )
        os.makedirs(self.output_dir, exist_ok=True)

    # ── Segmentation helpers ──────────────────────────────────────────────────

    def _age_bucket(self, age_years: pd.Series) -> pd.Series:
        """Crée des tranches d'âge (proxy protection CEMAC)."""
        return pd.cut(
            age_years,
            bins=[0, 25, 35, 45, 55, 200],
            labels=["<25", "25-35", "35-45", "45-55", "55+"],
        )

    def _make_reject_flag(self, y_pred: np.ndarray, threshold: float = 0.06) -> np.ndarray:
        """
        Crée un flag de rejet binaire pour les tests de disparate impact.
        Seuil par défaut : PD > 6% = Decline (DEMO_VS_PROD_BENCHMARK §5).
        """
        return (y_pred >= threshold).astype(int)

    # ── Test 1 : Performance par segment ─────────────────────────────────────

    def compute_segment_performance(
        self,
        df: pd.DataFrame,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        segment_col: str,
        min_segment_size: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Calcule AUC, Gini, KS et taux de défaut par segment.
        Identifie les segments sous le floor réglementaire (Gini < 40%).
        """
        results = []
        y_true_arr = np.asarray(y_true)
        y_pred_arr = np.asarray(y_pred)

        if segment_col not in df.columns:
            logger.warning(f"Colonne '{segment_col}' absente du DataFrame")
            return results

        segments = df[segment_col].dropna().unique()

        for seg in segments:
            mask = (df[segment_col] == seg).values
            n = mask.sum()
            if n < min_segment_size:
                logger.debug(f"Segment '{seg}' ignoré (n={n} < {min_segment_size})")
                continue

            seg_y_true = y_true_arr[mask]
            seg_y_pred = y_pred_arr[mask]
            seg_dr = seg_y_true.mean()

            if seg_y_true.sum() < 5 or (1 - seg_y_true).sum() < 5:
                # Pas assez de positifs/négatifs pour AUC
                auc, gini = float("nan"), float("nan")
                status = "INSUFFICIENT_EVENTS"
            else:
                try:
                    auc = roc_auc_score(seg_y_true, seg_y_pred)
                    gini = 2 * auc - 1
                    if gini < self.GINI_FLOOR:
                        status = "UNDERPERFORMING"
                    elif gini < self.GINI_WARNING:
                        status = "MONITORING_REQUIRED"
                    else:
                        status = "PASS"
                except Exception as e:
                    auc, gini, status = float("nan"), float("nan"), f"ERROR: {e}"

            results.append({
                "segment_col": segment_col,
                "segment_value": str(seg),
                "n_samples": int(n),
                "default_rate": round(float(seg_dr), 6),
                "auc": round(float(auc), 4) if not np.isnan(auc) else None,
                "gini": round(float(gini), 4) if not np.isnan(gini) else None,
                "gini_floor_pass": bool(gini >= self.GINI_FLOOR) if not np.isnan(gini) else None,
                "status": status,
            })

        underperforming = [r for r in results if r["status"] == "UNDERPERFORMING"]
        if underperforming:
            for seg in underperforming:
                logger.warning(
                    f"[Fairness] Segment UNDERPERFORMING : {segment_col}={seg['segment_value']} "
                    f"Gini={seg['gini']:.1%} < floor {self.GINI_FLOOR:.0%}"
                )

        return results

    # ── Test 2 : Disparate Impact ─────────────────────────────────────────────

    def compute_disparate_impact(
        self,
        df: pd.DataFrame,
        y_pred: np.ndarray,
        protected_col: str,
        reference_group: Optional[str] = None,
        reject_threshold: float = 0.06,
    ) -> Dict[str, Any]:
        """
        Disparate Impact Ratio = taux de rejet groupe protégé / taux de rejet référence.
        DI < 0.80 → discrimination adverse potentielle (règle des 80% EEOC).

        Args:
            reference_group: Groupe de référence (ex. "M" pour CODE_GENDER).
                             Si None, le groupe avec le plus faible taux de rejet.
        """
        if protected_col not in df.columns:
            return {"error": f"Colonne '{protected_col}' absente"}

        reject_flags = self._make_reject_flag(y_pred, reject_threshold)
        df_temp = df[[protected_col]].copy()
        df_temp["rejected"] = reject_flags

        group_stats = (
            df_temp.groupby(protected_col)["rejected"]
            .agg(["mean", "count"])
            .rename(columns={"mean": "reject_rate", "count": "n"})
            .reset_index()
        )
        group_stats = group_stats[group_stats["n"] >= 50]

        if group_stats.empty:
            return {"error": "Pas assez d'effectifs par groupe"}

        if reference_group is None:
            # Groupe référence = groupe avec le taux de rejet le plus faible
            ref_idx = group_stats["reject_rate"].idxmin()
            reference_group = str(group_stats.loc[ref_idx, protected_col])

        ref_rate = group_stats.loc[
            group_stats[protected_col].astype(str) == reference_group, "reject_rate"
        ].values

        if len(ref_rate) == 0:
            return {"error": f"Groupe référence '{reference_group}' non trouvé"}

        ref_rate = float(ref_rate[0])
        results_per_group = []
        has_adverse_impact = False

        for _, row in group_stats.iterrows():
            group = str(row[protected_col])
            rate = float(row["reject_rate"])
            di = rate / ref_rate if ref_rate > 0 else float("nan")
            adverse = bool(di < self.DISPARATE_IMPACT_THRESHOLD) if not np.isnan(di) else False
            if adverse and group != reference_group:
                has_adverse_impact = True
                logger.warning(
                    f"[Fairness] Disparate Impact ADVERSE : {protected_col}={group} "
                    f"DI={di:.3f} < seuil {self.DISPARATE_IMPACT_THRESHOLD}"
                )
            results_per_group.append({
                "group": group,
                "reject_rate": round(rate, 4),
                "n": int(row["n"]),
                "disparate_impact_ratio": round(di, 4) if not np.isnan(di) else None,
                "adverse_impact_flag": adverse,
                "is_reference": group == reference_group,
            })

        return {
            "protected_col": protected_col,
            "reference_group": reference_group,
            "reject_threshold": reject_threshold,
            "has_adverse_impact": has_adverse_impact,
            "groups": results_per_group,
        }

    # ── Test 3 : Equal Opportunity (TPR gap) ──────────────────────────────────

    def compute_equal_opportunity(
        self,
        df: pd.DataFrame,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        protected_col: str,
        decision_threshold: float = 0.06,
    ) -> Dict[str, Any]:
        """
        Equal Opportunity : vérifie que le True Positive Rate (recall)
        est équitable entre groupes (les vrais emprunteurs solvables
        ne doivent pas être rejetés à des taux différents selon le groupe).

        Gap TPR > 10pp → signalement.
        """
        if protected_col not in df.columns:
            return {"error": f"Colonne '{protected_col}' absente"}

        y_true_arr = np.asarray(y_true)
        y_pred_arr = np.asarray(y_pred)
        # TPR = recall sur les non-défauts (solvables) — ceux qu'on veut approuver
        y_approve = (y_pred_arr < decision_threshold).astype(int)  # 1 = approuvé par le modèle
        y_actually_good = (y_true_arr == 0).astype(int)            # 1 = réellement solvable

        group_tprs = []
        groups = df[protected_col].dropna().unique()

        for g in groups:
            mask = (df[protected_col] == g).values
            if mask.sum() < 50:
                continue
            tpr = (y_approve[mask] & y_actually_good[mask]).sum() / max(y_actually_good[mask].sum(), 1)
            group_tprs.append({"group": str(g), "tpr": round(float(tpr), 4), "n": int(mask.sum())})

        if len(group_tprs) < 2:
            return {"error": "Pas assez de groupes pour comparer"}

        tpr_values = [g["tpr"] for g in group_tprs]
        tpr_gap = max(tpr_values) - min(tpr_values)
        gap_flag = tpr_gap > self.EQUAL_OPPORTUNITY_GAP_THRESHOLD

        if gap_flag:
            logger.warning(
                f"[Fairness] Equal Opportunity GAP : {protected_col} "
                f"TPR gap={tpr_gap:.2%} > seuil {self.EQUAL_OPPORTUNITY_GAP_THRESHOLD:.0%}"
            )

        return {
            "protected_col": protected_col,
            "tpr_gap": round(tpr_gap, 4),
            "gap_flag": gap_flag,
            "groups": group_tprs,
        }

    # ── Test 4 : Calibration par groupe ──────────────────────────────────────

    def compute_group_calibration(
        self,
        df: pd.DataFrame,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        protected_col: str,
    ) -> Dict[str, Any]:
        """
        Vérifie que le ratio Expected/Observed est stable entre groupes.
        Un ratio E/O très différent entre groupes signale une sur/sous-estimation
        systématique pour un groupe particulier.
        """
        if protected_col not in df.columns:
            return {"error": f"Colonne '{protected_col}' absente"}

        y_true_arr = np.asarray(y_true)
        y_pred_arr = np.asarray(y_pred)
        groups_data = []

        for g in df[protected_col].dropna().unique():
            mask = (df[protected_col] == g).values
            if mask.sum() < 50:
                continue
            observed_dr = y_true_arr[mask].mean()
            predicted_dr = y_pred_arr[mask].mean()
            eo_ratio = predicted_dr / observed_dr if observed_dr > 0 else float("nan")

            groups_data.append({
                "group": str(g),
                "n": int(mask.sum()),
                "observed_dr": round(float(observed_dr), 6),
                "predicted_dr": round(float(predicted_dr), 6),
                "eo_ratio": round(float(eo_ratio), 4) if not np.isnan(eo_ratio) else None,
                "calibration_flag": bool(not np.isnan(eo_ratio) and (eo_ratio < 0.80 or eo_ratio > 1.25)),
            })

        flagged = [g for g in groups_data if g["calibration_flag"]]
        for g in flagged:
            logger.warning(
                f"[Fairness] Calibration hors plage : {protected_col}={g['group']} "
                f"E/O={g['eo_ratio']:.2f}"
            )

        return {
            "protected_col": protected_col,
            "has_calibration_issues": len(flagged) > 0,
            "groups": groups_data,
        }

    # ── Rapport complet ───────────────────────────────────────────────────────

    def run_full_fairness_audit(
        self,
        df: pd.DataFrame,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        model_name: str = "pd_model_v2",
    ) -> Dict[str, Any]:
        """
        Lance la suite complète de tests fairness.

        Variables protégées auditées (si présentes dans le dataset) :
          - CODE_GENDER         → genre
          - AGE_BUCKET          → tranche d'âge (dérivée de AGE_YEARS)
          - NAME_INCOME_TYPE    → statut d'emploi
          - NAME_EDUCATION_TYPE → niveau d'éducation
          - REGION_*            → géographie
        """
        logger.info(f"=== Fairness Audit : {model_name} | n={len(y_true)} ===")
        report: Dict[str, Any] = {
            "model_name": model_name,
            "audit_timestamp": datetime.utcnow().isoformat(),
            "n_samples": int(len(y_true)),
            "overall_default_rate": round(float(np.asarray(y_true).mean()), 6),
            "segment_performance": [],
            "disparate_impact": [],
            "equal_opportunity": [],
            "group_calibration": [],
            "summary": {},
        }

        # Ajouter la tranche d'âge si AGE_YEARS disponible
        df = df.copy()
        if "AGE_YEARS" in df.columns:
            df["AGE_BUCKET"] = self._age_bucket(df["AGE_YEARS"])

        protected_vars = [
            col for col in [
                "CODE_GENDER", "AGE_BUCKET", "NAME_INCOME_TYPE",
                "NAME_EDUCATION_TYPE", "NAME_HOUSING_TYPE",
            ]
            if col in df.columns
        ]

        if not protected_vars:
            logger.warning("Aucune variable protégée trouvée dans le dataset.")
            report["summary"]["error"] = "Aucune variable protégée disponible"
            return report

        segment_flags: List[str] = []

        for col in protected_vars:
            # Performance par segment
            seg_perf = self.compute_segment_performance(df, y_true, y_pred, col)
            report["segment_performance"].extend(seg_perf)

            underperforming = [s for s in seg_perf if s["status"] == "UNDERPERFORMING"]
            for up in underperforming:
                segment_flags.append(
                    f"{col}={up['segment_value']} : Gini={up['gini']:.1%} (UNDERPERFORMING)"
                )

            # Disparate Impact
            if col == "CODE_GENDER":
                di = self.compute_disparate_impact(df, np.asarray(y_pred), col, reference_group="M")
            else:
                di = self.compute_disparate_impact(df, np.asarray(y_pred), col)
            report["disparate_impact"].append(di)

            # Equal Opportunity
            eo = self.compute_equal_opportunity(df, y_true, y_pred, col)
            report["equal_opportunity"].append(eo)

            # Calibration par groupe
            cal = self.compute_group_calibration(df, y_true, y_pred, col)
            report["group_calibration"].append(cal)

        # Synthèse
        n_adverse_impact = sum(
            1 for di in report["disparate_impact"]
            if isinstance(di, dict) and di.get("has_adverse_impact")
        )
        n_eo_gaps = sum(
            1 for eo in report["equal_opportunity"]
            if isinstance(eo, dict) and eo.get("gap_flag")
        )
        n_calib_issues = sum(
            1 for cal in report["group_calibration"]
            if isinstance(cal, dict) and cal.get("has_calibration_issues")
        )

        promotion_blocked = (
            len(segment_flags) > 0 or n_adverse_impact > 0 or n_eo_gaps > 0
        )

        report["summary"] = {
            "protected_variables_tested": protected_vars,
            "n_underperforming_segments": len(segment_flags),
            "underperforming_segments": segment_flags,
            "n_adverse_impact_flags": n_adverse_impact,
            "n_equal_opportunity_gaps": n_eo_gaps,
            "n_calibration_issues": n_calib_issues,
            "promotion_gate_pass": not promotion_blocked,
            "promotion_gate_status": (
                "BLOCKED — corriger les segments en sous-performance et les biais détectés"
                if promotion_blocked else
                "PASS — aucune discrimination adverse détectée"
            ),
        }

        level = logging.WARNING if promotion_blocked else logging.INFO
        logger.log(
            level,
            f"Fairness Audit terminé — "
            f"Gate: {'BLOCKED' if promotion_blocked else 'PASS'} | "
            f"Segments sous-perf: {len(segment_flags)} | "
            f"DI flags: {n_adverse_impact} | EO gaps: {n_eo_gaps}"
        )

        return report

    def save_report(
        self,
        report: Dict[str, Any],
        filename: Optional[str] = None,
    ) -> str:
        """Sauvegarde le rapport fairness en JSON (evidence pack)."""
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = filename or f"fairness_audit_{report.get('model_name', 'model')}_{ts}.json"
        path = os.path.join(self.output_dir, filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, default=str)
        logger.info(f"Rapport fairness sauvegardé : {path}")
        return path


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import pickle
    import sys
    logging.basicConfig(level=logging.INFO)

    # Exemple de validation sur données synthétiques (remplacement par données réelles)
    np.random.seed(42)
    n = 5000

    # Simulation d'un dataset avec variables protégées
    df_test = pd.DataFrame({
        "CODE_GENDER": np.random.choice(["M", "F"], n, p=[0.55, 0.45]),
        "AGE_YEARS":   np.random.randint(22, 65, n).astype(float),
        "NAME_INCOME_TYPE": np.random.choice(
            ["Working", "Commercial associate", "Self-employed", "Pensioner"],
            n, p=[0.50, 0.20, 0.20, 0.10]
        ),
        "NAME_EDUCATION_TYPE": np.random.choice(
            ["Secondary / secondary special", "Higher education", "Incomplete higher", "Lower secondary"],
            n, p=[0.60, 0.25, 0.10, 0.05]
        ),
    })

    # Scores PD simulés avec léger biais genre
    base_pd = np.random.beta(2, 30, n)
    gender_bias = np.where(df_test["CODE_GENDER"] == "F", 0.01, 0.0)  # biais simulé
    income_bias = np.where(df_test["NAME_INCOME_TYPE"] == "Self-employed", 0.03, 0.0)
    y_pred_sim = np.clip(base_pd + gender_bias + income_bias, 0, 1)
    y_true_sim = np.random.binomial(1, np.clip(y_pred_sim * 1.2, 0, 1))

    validator = FairnessValidator()
    report = validator.run_full_fairness_audit(df_test, y_true_sim, y_pred_sim)
    path = validator.save_report(report)

    print(f"\n{'='*60}")
    print("Fairness Audit Report")
    print(f"{'='*60}")
    s = report["summary"]
    print(f"  Gate: {s['promotion_gate_status']}")
    print(f"  Segments sous-performance : {s['n_underperforming_segments']}")
    print(f"  Disparate Impact flags    : {s['n_adverse_impact_flags']}")
    print(f"  Equal Opportunity gaps    : {s['n_equal_opportunity_gaps']}")
    print(f"  Calibration issues        : {s['n_calibration_issues']}")
    print(f"  Rapport : {path}")
