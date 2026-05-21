"""
IFRS 9 Staging Engine
======================
Classification des expositions selon les stades IFRS 9 :

    Stage 1 (Performing)       : Pas de détérioration significative
    Stage 2 (Underperforming)  : Détérioration significative du risque de crédit (SICR)
    Stage 3 (Credit-Impaired)  : Défaut avéré

Intègre :
- Critères quantitatifs (PD variation, jours de retard)
- Critères qualitatifs (watchlist, restructuration)
- Forward-looking overlay (overlay macroéconomique)
- Calcul des provisions ECL (Expected Credit Loss) par stade
- Audit trail complet pour conformité COBAC/IFRS 9

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import yaml
import os
import logging
from dataclasses import dataclass, field
from typing import Optional, Dict, List
from datetime import datetime
from enum import IntEnum
import uuid

logger = logging.getLogger(__name__)


class Stage(IntEnum):
    """IFRS 9 Staging Classification."""
    STAGE_1 = 1  # Performing — 12-month ECL
    STAGE_2 = 2  # Underperforming — Lifetime ECL
    STAGE_3 = 3  # Credit-Impaired — Lifetime ECL (defaulted)


@dataclass
class StagingResult:
    """Résultat de staging IFRS 9 pour une exposition."""
    exposure_id: str
    current_stage: int
    previous_stage: Optional[int]
    pd_at_origination: float
    pd_current: float
    pd_delta_relative: float  # (PD_current - PD_orig) / PD_orig
    days_past_due: int
    is_restructured: bool
    is_watchlisted: bool
    sicr_triggered: bool  # Significant Increase in Credit Risk
    ecl_provision: float
    ecl_horizon: str  # "12_MONTH" ou "LIFETIME"
    staging_reasons: List[str] = field(default_factory=list)
    staging_timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    staging_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    def to_dict(self) -> dict:
        return {
            "exposure_id": self.exposure_id,
            "current_stage": self.current_stage,
            "previous_stage": self.previous_stage,
            "pd_at_origination": round(self.pd_at_origination, 6),
            "pd_current": round(self.pd_current, 6),
            "pd_delta_relative": round(self.pd_delta_relative, 4),
            "days_past_due": self.days_past_due,
            "is_restructured": self.is_restructured,
            "is_watchlisted": self.is_watchlisted,
            "sicr_triggered": self.sicr_triggered,
            "ecl_provision": round(self.ecl_provision, 2),
            "ecl_horizon": self.ecl_horizon,
            "staging_reasons": self.staging_reasons,
            "staging_timestamp": self.staging_timestamp,
            "staging_id": self.staging_id,
        }


class IFRS9StagingEngine:
    """
    Moteur de classification IFRS 9 pour les expositions de crédit.
    
    Architecture de staging :
    
    1. Critères quantitatifs (PD-based)
       - Variation relative PD > seuil SICR → Stage 2
       - PD absolue > seuil défaut → Stage 3
       
    2. Critères de retard de paiement
       - DPD > 30 jours → Stage 2 (présomption réfutable)
       - DPD > 90 jours → Stage 3 (présomption irréfutable)
       
    3. Critères qualitatifs
       - Restructuration / forbearance → Stage 2 minimum
       - Watchlist / surveillance renforcée → Stage 2
       
    4. Forward-looking overlay
       - Ajustement macro-économique sur les provisions ECL
       
    Tous les seuils sont chargés depuis config/thresholds.yaml
    """

    # Seuils par défaut conformes aux pratiques COBAC / IFRS 9
    SICR_PD_RELATIVE_THRESHOLD = 2.0    # Doublement de la PD → SICR
    SICR_PD_ABSOLUTE_THRESHOLD = 0.03   # Augmentation absolue > 3pp → SICR
    DPD_STAGE_2_THRESHOLD = 30          # Jours de retard → Stage 2
    DPD_STAGE_3_THRESHOLD = 90          # Jours de retard → Stage 3 (critère primaire — IFRS 9 §B5.5.37)
    # PD backstop secondaire pour Stage 3 (IFRS 9 "unlikely to pay" proxy).
    # Critère primaire = DPD ≥ 90 jours. Ce seuil de 20% est le backstop
    # quantitatif conservateur — aligné pratiques CEMAC et BCBS guidance 2017.
    # L'ancienne valeur 0.999 rendait ce critère inopérant.
    DEFAULT_PD_THRESHOLD = 0.20         # PD > 20% → défaut probable (backstop secondaire)
    # Taux de référence BEAC pour l'actualisation des ECL lifetime (proxy CEMAC).
    # À remplacer par l'EIR contractuel réel lors de la promotion CHALLENGER.
    REFERENCE_RATE = 0.08               # 8% — taux directeur BEAC

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialise le moteur de staging IFRS 9.
        """
        if config_path is None:
            config_path = os.path.join(
                os.path.dirname(__file__), "..", "config", "thresholds.yaml"
            )

        self.config = self._load_config(config_path)
        self._audit_log: List[Dict] = []

        # Chargement seuils depuis config
        ifrs9_config = self.config.get("ifrs9_staging", {})
        self.stage_1_max_pd = ifrs9_config.get("stage_1_max_pd", 0.15)
        self.stage_2_max_pd = ifrs9_config.get("stage_2_max_pd", 0.999)

        logger.info(
            f"IFRS9StagingEngine initialisé — "
            f"Stage1 max PD={self.stage_1_max_pd:.0%}, "
            f"Stage2 max PD={self.stage_2_max_pd:.0%}"
        )

    def _load_config(self, config_path: str) -> dict:
        try:
            with open(config_path, "r") as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            logger.warning(f"Config non trouvée: {config_path}. Valeurs par défaut utilisées.")
            return {}

    def _assess_sicr(
        self,
        pd_origination: float,
        pd_current: float,
    ) -> tuple:
        """
        Évalue le Significant Increase in Credit Risk (SICR).
        
        Returns:
            (sicr_triggered, pd_delta_relative, reasons)
        """
        reasons = []

        # Variation relative
        if pd_origination > 0:
            pd_delta_relative = (pd_current - pd_origination) / pd_origination
        else:
            pd_delta_relative = 0.0

        # Variation absolue
        pd_delta_absolute = pd_current - pd_origination

        sicr = False

        # Test relatif : PD a plus que doublé
        if pd_delta_relative >= (self.SICR_PD_RELATIVE_THRESHOLD - 1):
            sicr = True
            reasons.append(
                f"SICR_RELATIVE: PD ratio={1 + pd_delta_relative:.1f}x > {self.SICR_PD_RELATIVE_THRESHOLD}x"
            )

        # Test absolu : Augmentation > 3 points de pourcentage
        if pd_delta_absolute >= self.SICR_PD_ABSOLUTE_THRESHOLD:
            sicr = True
            reasons.append(
                f"SICR_ABSOLUTE: PD delta={pd_delta_absolute:.1%} > {self.SICR_PD_ABSOLUTE_THRESHOLD:.0%}"
            )

        return sicr, pd_delta_relative, reasons

    def classify(
        self,
        exposure_id: str,
        pd_current: float,
        pd_origination: float,
        lgd: float,
        ead: float,
        days_past_due: int = 0,
        is_restructured: bool = False,
        is_watchlisted: bool = False,
        previous_stage: Optional[int] = None,
        remaining_maturity_years: float = 5.0,
        forward_looking_scalar: float = 1.0,
        effective_interest_rate: Optional[float] = None,
    ) -> StagingResult:
        """
        Classifie une exposition dans un stade IFRS 9 et calcule la provision ECL.
        
        Args:
            exposure_id: Identifiant de l'exposition
            pd_current: PD courante
            pd_origination: PD à l'origination
            lgd: Loss Given Default
            ead: Exposure At Default
            days_past_due: Jours de retard de paiement
            is_restructured: Indicateur de restructuration
            is_watchlisted: Indicateur de surveillance renforcée
            previous_stage: Stade précédent (pour tracking des transitions)
            remaining_maturity_years: Maturité résiduelle en années
            forward_looking_scalar: Multiplicateur forward-looking (macro overlay)
            
        Returns:
            StagingResult avec stade, provisions, et métadata
        """
        reasons = []
        stage = Stage.STAGE_1  # Default: performing

        # ── 1. Critères de défaut (Stage 3) ─────────────────────
        if pd_current >= self.DEFAULT_PD_THRESHOLD:
            stage = Stage.STAGE_3
            reasons.append(f"DEFAULT: PD >= {self.DEFAULT_PD_THRESHOLD:.0%} (backstop secondaire — unlikely to pay)")
        
        if days_past_due >= self.DPD_STAGE_3_THRESHOLD:
            stage = Stage.STAGE_3
            reasons.append(f"DEFAULT: DPD={days_past_due} >= {self.DPD_STAGE_3_THRESHOLD}")

        # ── 2. Critères SICR (Stage 2) ──────────────────────────
        if stage != Stage.STAGE_3:
            sicr_triggered, pd_delta_relative, sicr_reasons = self._assess_sicr(
                pd_origination, pd_current
            )
            
            if sicr_triggered:
                stage = Stage.STAGE_2
                reasons.extend(sicr_reasons)

            # DPD > 30 jours → Stage 2 (présomption réfutable IFRS 9)
            if days_past_due >= self.DPD_STAGE_2_THRESHOLD:
                stage = Stage.STAGE_2
                reasons.append(f"DPD_PRESUMPTION: DPD={days_past_due} >= {self.DPD_STAGE_2_THRESHOLD}")

            # Critères qualitatifs
            if is_restructured:
                stage = max(stage, Stage.STAGE_2)
                reasons.append("QUALITATIVE: Restructured/Forbearance")

            if is_watchlisted:
                stage = max(stage, Stage.STAGE_2)
                reasons.append("QUALITATIVE: Watchlisted")
        else:
            sicr_triggered = True
            pd_delta_relative = (pd_current - pd_origination) / max(pd_origination, 1e-6)

        # ── 3. Calcul ECL (Expected Credit Loss) ────────────────
        ecl_provision, ecl_horizon = self._compute_ecl(
            stage=stage,
            pd=pd_current,
            lgd=lgd,
            ead=ead,
            remaining_maturity_years=remaining_maturity_years,
            forward_looking_scalar=forward_looking_scalar,
            effective_interest_rate=effective_interest_rate,
        )

        result = StagingResult(
            exposure_id=exposure_id,
            current_stage=int(stage),
            previous_stage=previous_stage,
            pd_at_origination=pd_origination,
            pd_current=pd_current,
            pd_delta_relative=pd_delta_relative,
            days_past_due=days_past_due,
            is_restructured=is_restructured,
            is_watchlisted=is_watchlisted,
            sicr_triggered=sicr_triggered,
            ecl_provision=ecl_provision,
            ecl_horizon=ecl_horizon,
            staging_reasons=reasons,
        )

        # Audit trail
        self._audit_log.append({
            "action": "ifrs9_staging",
            "timestamp": result.staging_timestamp,
            "input": {
                "exposure_id": exposure_id,
                "pd_current": pd_current,
                "pd_origination": pd_origination,
                "days_past_due": days_past_due,
            },
            "output": result.to_dict(),
        })

        logger.info(
            f"Staging: {exposure_id} → Stage {stage} "
            f"(ECL={ecl_provision:,.0f}, horizon={ecl_horizon})"
        )

        return result

    def _compute_ecl(
        self,
        stage: Stage,
        pd: float,
        lgd: float,
        ead: float,
        remaining_maturity_years: float,
        forward_looking_scalar: float,
        effective_interest_rate: Optional[float] = None,
    ) -> tuple:
        """
        Calcul de l'Expected Credit Loss selon le stade IFRS 9.

        Stage 1 : ECL 12 mois = PD_12m × LGD × EAD (pas de discounting — horizon court)
        Stage 2 : ECL Lifetime discounté à l'EIR (IFRS 9 §5.5.17, §B5.5.44)
        Stage 3 : ECL = LGD × EAD discounté à l'EIR (IFRS 9 §B5.5.44)

        Le discounting lifetime utilise l'approximation mid-maturity :
            discount_factor = 1 / (1 + EIR)^(T/2)
        En l'absence d'EIR contractuel, on utilise REFERENCE_RATE (proxy BEAC 8%).
        """
        eir = effective_interest_rate if effective_interest_rate is not None else self.REFERENCE_RATE

        if stage == Stage.STAGE_1:
            pd_12m = min(pd, 1.0)
            ecl = pd_12m * lgd * ead * forward_looking_scalar
            horizon = "12_MONTH"

        elif stage == Stage.STAGE_2:
            # ECL Lifetime — PD cumulée sur la maturité résiduelle
            pd_lifetime = 1 - (1 - pd) ** remaining_maturity_years
            pd_lifetime = min(pd_lifetime, 1.0)
            ecl_undiscounted = pd_lifetime * lgd * ead * forward_looking_scalar
            # Actualisation à la valeur présente — approximation mid-maturity (IFRS 9 §B5.5.44)
            discount_factor = 1.0 / (1 + eir) ** (remaining_maturity_years / 2) if eir > 0 else 1.0
            ecl = ecl_undiscounted * discount_factor
            horizon = "LIFETIME"

        elif stage == Stage.STAGE_3:
            # Défaut avéré — ECL = LGD × EAD actualisé
            ecl_undiscounted = lgd * ead * forward_looking_scalar
            # Pour Stage 3, le recouvrement est attendu dans T/2 années (approx.)
            discount_factor = 1.0 / (1 + eir) ** (remaining_maturity_years / 2) if eir > 0 else 1.0
            ecl = ecl_undiscounted * discount_factor
            horizon = "LIFETIME"

        else:
            ecl = 0.0
            horizon = "UNKNOWN"

        return ecl, horizon

    def classify_portfolio(
        self,
        portfolio_df: pd.DataFrame,
        pd_current_col: str = "pd_current",
        pd_origination_col: str = "pd_origination",
        lgd_col: str = "lgd",
        ead_col: str = "ead",
        dpd_col: str = "days_past_due",
        id_col: str = "exposure_id",
    ) -> pd.DataFrame:
        """
        Classification batch IFRS 9 sur un portefeuille.
        """
        results = []

        for _, row in portfolio_df.iterrows():
            result = self.classify(
                exposure_id=str(row.get(id_col, _)),
                pd_current=row[pd_current_col],
                pd_origination=row[pd_origination_col],
                lgd=row[lgd_col],
                ead=row[ead_col],
                days_past_due=int(row.get(dpd_col, 0)),
                is_restructured=bool(row.get("is_restructured", False)),
                is_watchlisted=bool(row.get("is_watchlisted", False)),
                remaining_maturity_years=float(row.get("remaining_maturity_years", 5.0)),
            )
            results.append(result.to_dict())

        return pd.DataFrame(results)

    def get_staging_summary(self, results_df: pd.DataFrame) -> Dict:
        """
        Synthèse de staging pour reporting IFRS 9 / COBAC.
        """
        total_ead = results_df.get("ead", pd.Series([0])).sum() if "ead" in results_df else 0
        total_ecl = results_df["ecl_provision"].sum()

        stage_counts = results_df["current_stage"].value_counts().to_dict()

        return {
            "total_exposures": len(results_df),
            "stage_1_count": int(stage_counts.get(1, 0)),
            "stage_2_count": int(stage_counts.get(2, 0)),
            "stage_3_count": int(stage_counts.get(3, 0)),
            "total_ecl_provision": round(total_ecl, 2),
            "ecl_coverage_ratio": round(total_ecl / total_ead, 6) if total_ead > 0 else 0,
            "stage_2_migration_rate": round(
                stage_counts.get(2, 0) / len(results_df), 4
            ) if len(results_df) > 0 else 0,
            "timestamp": datetime.utcnow().isoformat(),
        }

    def get_audit_log(self) -> List[Dict]:
        """Retourne le journal d'audit complet."""
        return self._audit_log.copy()


if __name__ == "__main__":
    engine = IFRS9StagingEngine()

    # Test individuel
    result = engine.classify(
        exposure_id="EXPO-001",
        pd_current=0.08,
        pd_origination=0.03,
        lgd=0.45,
        ead=10_000_000,
        days_past_due=15,
    )
    print(f"[{result.exposure_id}] Stage {result.current_stage} — ECL={result.ecl_provision:,.0f} XAF")
    print(f"  SICR={result.sicr_triggered}, Reasons={result.staging_reasons}")

    # Test Stage 3
    result_3 = engine.classify(
        exposure_id="EXPO-002",
        pd_current=0.50,
        pd_origination=0.04,
        lgd=0.60,
        ead=5_000_000,
        days_past_due=120,
    )
    print(f"[{result_3.exposure_id}] Stage {result_3.current_stage} — ECL={result_3.ecl_provision:,.0f} XAF")

    # Test portefeuille
    portfolio = pd.DataFrame({
        "exposure_id": [f"EXP-{i:03d}" for i in range(5)],
        "pd_current": [0.02, 0.08, 0.20, 0.50, 0.01],
        "pd_origination": [0.02, 0.03, 0.05, 0.04, 0.01],
        "lgd": [0.45, 0.50, 0.55, 0.60, 0.40],
        "ead": [5_000_000, 10_000_000, 3_000_000, 2_000_000, 15_000_000],
        "days_past_due": [0, 35, 10, 95, 0],
    })

    results_df = engine.classify_portfolio(portfolio)
    summary = engine.get_staging_summary(results_df)
    print(f"\n[Summary] ECL Total = {summary['total_ecl_provision']:,.0f} XAF")
    print(f"  Stage 1: {summary['stage_1_count']}, Stage 2: {summary['stage_2_count']}, Stage 3: {summary['stage_3_count']}")
