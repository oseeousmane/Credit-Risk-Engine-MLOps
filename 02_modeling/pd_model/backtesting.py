"""
PD Model Backtesting Pipeline
===============================
Backtesting cohorte pour validation de la précision du modèle PD.

Architecture :
1. Cohortes vintage (regroupement par trimestre d'origination)
2. PD accuracy backtest (PD prévue vs taux de défaut observé)
3. Binomial test (la PD prévue est-elle dans l'IC 95% du taux observé ?)
4. PSI temporel (dérive de la distribution des scores dans le temps)
5. Hosmer-Lemeshow par cohorte
6. Traffic light system (Vert / Orange / Rouge) conforme Bâle II

Sources réglementaires :
- Bâle II §501-504 (validation du modèle IRB)
- EBA GL 2017/16 (lignes directrices IRB)
- BCBS WP 14 (backtesting des modèles PD)

Auteur  : Octaix Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import json
import logging
import os
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Tuple
from datetime import datetime
from scipy import stats

logger = logging.getLogger(__name__)

# ── Traffic light system (conforme Bâle II §501) ──────────────────────────────
TRAFFIC_LIGHT_THRESHOLDS = {
    "GREEN":  {"z_score_max": 1.645},   # p-value > 5% (test unilatéral)
    "AMBER":  {"z_score_max": 2.326},   # 5% ≥ p-value > 1%
    "RED":    {"z_score_max": float("inf")},  # p-value < 1%
}

# ── Seuils de stabilité PSI ────────────────────────────────────────────────────
PSI_GREEN  = 0.10
PSI_AMBER  = 0.25


@dataclass
class CohortResult:
    """Résultat de backtesting pour une cohorte vintage."""
    vintage: str           # Ex: "2023-Q1"
    n_observations: int
    n_defaults: int
    observed_dr: float     # Taux de défaut observé
    predicted_pd: float    # PD moyenne prévue par le modèle
    pd_ratio: float        # observed_dr / predicted_pd
    z_score: float         # Test binomial normalisé
    p_value: float
    traffic_light: str     # GREEN / AMBER / RED
    ci_lower: float        # IC 95% Clopper-Pearson
    ci_upper: float
    in_confidence_interval: bool  # predicted_pd ∈ [ci_lower, ci_upper]
    hl_statistic: Optional[float] = None
    hl_p_value: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "vintage": self.vintage,
            "n_observations": self.n_observations,
            "n_defaults": self.n_defaults,
            "observed_dr": round(self.observed_dr, 6),
            "predicted_pd": round(self.predicted_pd, 6),
            "pd_ratio": round(self.pd_ratio, 4),
            "z_score": round(self.z_score, 4),
            "p_value": round(self.p_value, 6),
            "traffic_light": self.traffic_light,
            "ci_95_lower": round(self.ci_lower, 6),
            "ci_95_upper": round(self.ci_upper, 6),
            "in_confidence_interval": self.in_confidence_interval,
            "hl_statistic": round(self.hl_statistic, 4) if self.hl_statistic else None,
            "hl_p_value": round(self.hl_p_value, 6) if self.hl_p_value else None,
        }


@dataclass
class BacktestReport:
    """Rapport complet de backtesting PD."""
    report_id: str
    model_name: str
    cohort_results: List[CohortResult]
    psi_score: float
    psi_status: str
    overall_traffic_light: str
    n_green: int
    n_amber: int
    n_red: int
    portfolio_observed_dr: float
    portfolio_predicted_pd: float
    portfolio_pd_ratio: float
    assessment: str     # APPROVED / CONDITIONAL / REJECTED
    assessment_reasons: List[str]
    generation_timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict:
        return {
            "report_id": self.report_id,
            "model_name": self.model_name,
            "cohort_results": [c.to_dict() for c in self.cohort_results],
            "psi_score": round(self.psi_score, 6),
            "psi_status": self.psi_status,
            "overall_traffic_light": self.overall_traffic_light,
            "traffic_light_counts": {
                "GREEN": self.n_green,
                "AMBER": self.n_amber,
                "RED": self.n_red,
            },
            "portfolio_observed_dr": round(self.portfolio_observed_dr, 6),
            "portfolio_predicted_pd": round(self.portfolio_predicted_pd, 6),
            "portfolio_pd_ratio": round(self.portfolio_pd_ratio, 4),
            "assessment": self.assessment,
            "assessment_reasons": self.assessment_reasons,
            "generation_timestamp": self.generation_timestamp,
        }


class PDBacktester:
    """
    Pipeline de backtesting cohorte pour le modèle PD.

    Utilisation :
        backtester = PDBacktester()
        report = backtester.run(df, model_name="pd_model_v2")
        backtester.save_report(report, output_dir)

    DataFrame requis :
        - vintage_quarter  : str, ex "2023-Q1" (trimestre d'origination)
        - predicted_pd     : float [0,1] — PD prévue par le modèle
        - defaulted        : int {0, 1} — indicateur de défaut observé
        - pd_score_bin     : int [1-10] optionnel — décile de score pour PSI/HL
    """

    def __init__(self, min_cohort_size: int = 30, n_hl_bins: int = 10):
        self.min_cohort_size = min_cohort_size
        self.n_hl_bins = n_hl_bins

    def run(
        self,
        df: pd.DataFrame,
        model_name: str = "pd_model",
        reference_vintage: Optional[str] = None,
        output_dir: Optional[str] = None,
    ) -> BacktestReport:
        """
        Exécute le backtesting complet.

        Args:
            df:                  DataFrame avec colonnes vintage_quarter, predicted_pd, defaulted
            model_name:          Nom du modèle pour le rapport
            reference_vintage:   Vintage de référence pour le PSI (premier trimestre si None)
            output_dir:          Répertoire de sauvegarde (optionnel)
        """
        logger.info(f"[Backtest] Démarrage — {len(df)} observations, modèle={model_name}")

        df = self._validate_and_prepare(df)

        # ── 1. Backtesting par cohorte vintage ─────────────────────────────
        cohort_results = self._backtest_cohorts(df)

        # ── 2. PSI temporel ────────────────────────────────────────────────
        ref_vintage = reference_vintage or df["vintage_quarter"].min()
        psi_score, psi_status = self._compute_temporal_psi(df, ref_vintage)

        # ── 3. Métriques portefeuille ──────────────────────────────────────
        portfolio_dr  = df["defaulted"].mean()
        portfolio_pd  = df["predicted_pd"].mean()
        portfolio_ratio = portfolio_dr / portfolio_pd if portfolio_pd > 0 else float("nan")

        # ── 4. Traffic light global ────────────────────────────────────────
        n_green = sum(1 for c in cohort_results if c.traffic_light == "GREEN")
        n_amber = sum(1 for c in cohort_results if c.traffic_light == "AMBER")
        n_red   = sum(1 for c in cohort_results if c.traffic_light == "RED")

        overall = "GREEN"
        if n_red > 0:
            overall = "RED"
        elif n_amber > len(cohort_results) * 0.3:
            overall = "AMBER"

        # ── 5. Évaluation finale ───────────────────────────────────────────
        assessment, reasons = self._assess(
            cohort_results, psi_score, psi_status, portfolio_ratio, n_red, n_amber
        )

        import uuid
        report = BacktestReport(
            report_id=str(uuid.uuid4())[:8],
            model_name=model_name,
            cohort_results=cohort_results,
            psi_score=psi_score,
            psi_status=psi_status,
            overall_traffic_light=overall,
            n_green=n_green,
            n_amber=n_amber,
            n_red=n_red,
            portfolio_observed_dr=portfolio_dr,
            portfolio_predicted_pd=portfolio_pd,
            portfolio_pd_ratio=portfolio_ratio,
            assessment=assessment,
            assessment_reasons=reasons,
        )

        logger.info(
            f"[Backtest] {model_name} — {assessment} | "
            f"Traffic: {n_green}G/{n_amber}A/{n_red}R | "
            f"PSI={psi_score:.4f} ({psi_status}) | "
            f"PD ratio={portfolio_ratio:.2f}"
        )

        if output_dir:
            self.save_report(report, output_dir)

        return report

    def _backtest_cohorts(self, df: pd.DataFrame) -> List[CohortResult]:
        """Backtest par cohorte vintage."""
        results = []
        for vintage, group in df.groupby("vintage_quarter"):
            if len(group) < self.min_cohort_size:
                logger.warning(f"[Backtest] Cohorte {vintage}: {len(group)} obs < {self.min_cohort_size} — ignorée")
                continue

            n = len(group)
            k = int(group["defaulted"].sum())
            obs_dr = k / n
            pred_pd = group["predicted_pd"].mean()

            # ── Test binomial (z-score normalisation de Wilson) ────────────
            # H0 : p_observed = p_predicted
            # Sous H0, k ~ Binomial(n, pred_pd)
            z_score, p_value = self._binomial_test(k, n, pred_pd)

            # ── Traffic light ──────────────────────────────────────────────
            tl = self._traffic_light(z_score)

            # ── IC Clopper-Pearson 95% sur le taux observé ────────────────
            ci_lo, ci_hi = self._clopper_pearson(k, n, alpha=0.05)

            # ── Hosmer-Lemeshow (si déciles disponibles) ───────────────────
            hl_stat = hl_pval = None
            if "pd_score_bin" in group.columns:
                hl_stat, hl_pval = self._hosmer_lemeshow(group)

            results.append(CohortResult(
                vintage=str(vintage),
                n_observations=n,
                n_defaults=k,
                observed_dr=obs_dr,
                predicted_pd=pred_pd,
                pd_ratio=obs_dr / pred_pd if pred_pd > 0 else float("nan"),
                z_score=z_score,
                p_value=p_value,
                traffic_light=tl,
                ci_lower=ci_lo,
                ci_upper=ci_hi,
                in_confidence_interval=(ci_lo <= pred_pd <= ci_hi),
                hl_statistic=hl_stat,
                hl_p_value=hl_pval,
            ))

        results.sort(key=lambda r: r.vintage)
        return results

    def _compute_temporal_psi(
        self,
        df: pd.DataFrame,
        reference_vintage: str,
    ) -> Tuple[float, str]:
        """
        PSI temporel : compare la distribution des scores PD entre
        la cohorte de référence et l'ensemble des autres cohortes.
        """
        ref = df[df["vintage_quarter"] == reference_vintage]["predicted_pd"]
        actual = df[df["vintage_quarter"] != reference_vintage]["predicted_pd"]

        if len(ref) < 10 or len(actual) < 10:
            return 0.0, "INSUFFICIENT_DATA"

        bins = np.percentile(ref, np.linspace(0, 100, self.n_hl_bins + 1))
        bins = np.unique(bins)
        if len(bins) < 2:
            return 0.0, "INSUFFICIENT_VARIATION"

        ref_counts, _    = np.histogram(ref,    bins=bins)
        actual_counts, _ = np.histogram(actual, bins=bins)

        ref_pct    = ref_counts    / ref_counts.sum()
        actual_pct = actual_counts / actual_counts.sum()

        # Évite log(0)
        ref_pct    = np.where(ref_pct    == 0, 1e-6, ref_pct)
        actual_pct = np.where(actual_pct == 0, 1e-6, actual_pct)

        psi = float(np.sum((actual_pct - ref_pct) * np.log(actual_pct / ref_pct)))

        if psi < PSI_GREEN:
            status = "GREEN"
        elif psi < PSI_AMBER:
            status = "AMBER"
        else:
            status = "RED"

        return psi, status

    def _assess(
        self,
        cohort_results: List[CohortResult],
        psi_score: float,
        psi_status: str,
        portfolio_ratio: float,
        n_red: int,
        n_amber: int,
    ) -> Tuple[str, List[str]]:
        """Évaluation globale conforme EBA GL 2017/16."""
        reasons = []
        is_rejected = False
        is_conditional = False

        if n_red >= 2:
            reasons.append(f"CRITICAL: {n_red} cohortes en zone rouge (>1% de signification)")
            is_rejected = True
        elif n_red == 1:
            reasons.append(f"WARNING: 1 cohorte en zone rouge")
            is_conditional = True

        if psi_status == "RED":
            reasons.append(f"CRITICAL: Dérive PSI critique ({psi_score:.4f} ≥ {PSI_AMBER})")
            is_rejected = True
        elif psi_status == "AMBER":
            reasons.append(f"WARNING: Dérive PSI modérée ({psi_score:.4f})")
            is_conditional = True

        if not np.isnan(portfolio_ratio):
            if portfolio_ratio > 3.0:
                reasons.append(f"CRITICAL: Ratio PD observé/prévu = {portfolio_ratio:.2f} (> 3x)")
                is_rejected = True
            elif portfolio_ratio > 2.0:
                reasons.append(f"WARNING: Ratio PD observé/prévu = {portfolio_ratio:.2f} (> 2x)")
                is_conditional = True
            elif portfolio_ratio < 0.5:
                reasons.append(f"INFO: Modèle conservateur — ratio = {portfolio_ratio:.2f} (< 0.5)")

        if not reasons:
            reasons.append("Toutes les cohortes dans les limites acceptables")

        if is_rejected:
            return "REJECTED", reasons
        elif is_conditional:
            return "CONDITIONAL", reasons
        return "APPROVED", reasons

    def save_report(self, report: BacktestReport, output_dir: str) -> str:
        """Sauvegarde le rapport en JSON."""
        os.makedirs(output_dir, exist_ok=True)
        filename = f"backtest_{report.model_name}_{report.generation_timestamp[:10]}_{report.report_id}.json"
        path = os.path.join(output_dir, filename)
        with open(path, "w") as f:
            json.dump(report.to_dict(), f, indent=2, default=str)
        logger.info(f"[Backtest] Rapport sauvegardé : {path}")
        return path

    def generate_summary_table(self, report: BacktestReport) -> pd.DataFrame:
        """Génère un tableau récapitulatif lisible."""
        rows = []
        for c in report.cohort_results:
            rows.append({
                "Vintage": c.vintage,
                "N obs": c.n_observations,
                "Défauts": c.n_defaults,
                "DR observé": f"{c.observed_dr:.2%}",
                "PD prévu": f"{c.predicted_pd:.2%}",
                "Ratio": f"{c.pd_ratio:.2f}",
                "Z-score": f"{c.z_score:.2f}",
                "p-value": f"{c.p_value:.4f}",
                "Traffic": c.traffic_light,
                "Dans IC95%": "✓" if c.in_confidence_interval else "✗",
            })
        return pd.DataFrame(rows)

    # ── Tests statistiques ─────────────────────────────────────────────────────

    @staticmethod
    def _binomial_test(k: int, n: int, p_expected: float) -> Tuple[float, float]:
        """
        Test binomial pour H0 : DR_observé = PD_prévu.
        Utilise l'approximation normale (Wilson) valide si n*p > 5.
        """
        if p_expected <= 0 or p_expected >= 1:
            return 0.0, 1.0
        p_hat = k / n
        se = np.sqrt(p_expected * (1 - p_expected) / n)
        z = (p_hat - p_expected) / se if se > 0 else 0.0
        # Unilatéral supérieur : PD sous-estimée est le risque principal
        p_value = 1 - stats.norm.cdf(abs(z))
        return float(z), float(p_value)

    @staticmethod
    def _traffic_light(z_score: float) -> str:
        """Traffic light system conforme Bâle II §501."""
        abs_z = abs(z_score)
        if abs_z <= TRAFFIC_LIGHT_THRESHOLDS["GREEN"]["z_score_max"]:
            return "GREEN"
        elif abs_z <= TRAFFIC_LIGHT_THRESHOLDS["AMBER"]["z_score_max"]:
            return "AMBER"
        return "RED"

    @staticmethod
    def _clopper_pearson(k: int, n: int, alpha: float = 0.05) -> Tuple[float, float]:
        """Intervalle de confiance exact Clopper-Pearson."""
        if n == 0:
            return 0.0, 1.0
        lo = stats.beta.ppf(alpha / 2, k, n - k + 1) if k > 0 else 0.0
        hi = stats.beta.ppf(1 - alpha / 2, k + 1, n - k) if k < n else 1.0
        return float(lo), float(hi)

    @staticmethod
    def _hosmer_lemeshow(group: pd.DataFrame, n_bins: int = 10) -> Tuple[float, float]:
        """Hosmer-Lemeshow test sur un groupe."""
        try:
            g = group.copy()
            g["bin"] = pd.qcut(g["predicted_pd"], q=n_bins, labels=False, duplicates="drop")
            binned = g.groupby("bin").agg(
                n=("defaulted", "count"),
                observed=("defaulted", "sum"),
                predicted=("predicted_pd", "sum"),
            )
            hl = ((binned["observed"] - binned["predicted"]) ** 2
                  / (binned["predicted"] * (1 - binned["predicted"] / binned["n"]))).sum()
            df_hl = len(binned) - 2
            p_val = 1 - stats.chi2.cdf(hl, df=df_hl) if df_hl > 0 else 1.0
            return float(hl), float(p_val)
        except Exception:
            return None, None

    @staticmethod
    def _validate_and_prepare(df: pd.DataFrame) -> pd.DataFrame:
        """Valide et normalise le DataFrame d'entrée."""
        required = {"vintage_quarter", "predicted_pd", "defaulted"}
        missing = required - set(df.columns)
        if missing:
            raise ValueError(f"Colonnes manquantes : {missing}")
        df = df.copy()
        df["predicted_pd"] = pd.to_numeric(df["predicted_pd"], errors="coerce").clip(1e-6, 1 - 1e-6)
        df["defaulted"] = pd.to_numeric(df["defaulted"], errors="coerce").fillna(0).astype(int)
        df = df.dropna(subset=["vintage_quarter", "predicted_pd", "defaulted"])
        return df


# ── Générateur de données synthétiques (pour tests / démonstration) ────────────

def generate_synthetic_backtest_data(
    n_vintages: int = 8,
    n_per_vintage: int = 500,
    true_pd: float = 0.06,
    model_pd_bias: float = 1.0,   # 1.0 = bien calibré, 1.3 = sous-estimé de 30%
    drift: bool = False,
) -> pd.DataFrame:
    """
    Génère un dataset synthétique pour illustrer le backtesting.

    Args:
        n_vintages:     Nombre de trimestres (cohortes)
        n_per_vintage:  Observations par cohorte
        true_pd:        Taux de défaut réel
        model_pd_bias:  Ratio PD_prévu / PD_réel (1.0 = parfait)
        drift:          Simule une dérive du taux de défaut dans le temps
    """
    rng = np.random.default_rng(42)
    rows = []
    quarters = [f"202{3 + i//4}-Q{i%4 + 1}" for i in range(n_vintages)]

    for i, quarter in enumerate(quarters):
        period_dr = true_pd * (1 + 0.05 * i if drift else 1.0)   # Dérive +5%/trimestre si drift
        defaults = rng.binomial(1, period_dr, n_per_vintage)
        noise = rng.normal(0, 0.01, n_per_vintage)
        model_pd = np.clip(period_dr / model_pd_bias + noise, 0.001, 0.999)

        for j in range(n_per_vintage):
            rows.append({
                "vintage_quarter": quarter,
                "predicted_pd": float(model_pd[j]),
                "defaulted": int(defaults[j]),
                "pd_score_bin": min(10, max(1, int(model_pd[j] * 10 / 0.15) + 1)),
            })

    return pd.DataFrame(rows)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    backtester = PDBacktester(min_cohort_size=50)

    # ── Modèle bien calibré ────────────────────────────────────────────────
    df_good = generate_synthetic_backtest_data(n_vintages=8, model_pd_bias=1.0)
    report_good = backtester.run(df_good, model_name="pd_model_calibre")

    print(f"\n[Modèle bien calibré] Assessment: {report_good.assessment}")
    print(f"  Traffic: {report_good.n_green}G / {report_good.n_amber}A / {report_good.n_red}R")
    print(f"  PSI: {report_good.psi_score:.4f} ({report_good.psi_status})")
    print(backtester.generate_summary_table(report_good).to_string(index=False))

    # ── Modèle sous-estimant le risque ────────────────────────────────────
    df_bad = generate_synthetic_backtest_data(n_vintages=8, model_pd_bias=0.4)
    report_bad = backtester.run(df_bad, model_name="pd_model_optimiste")

    print(f"\n[Modèle optimiste] Assessment: {report_bad.assessment}")
    print(f"  Traffic: {report_bad.n_green}G / {report_bad.n_amber}A / {report_bad.n_red}R")
    for reason in report_bad.assessment_reasons:
        print(f"  ⚠ {reason}")
