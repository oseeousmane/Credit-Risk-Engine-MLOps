"""
Decision Engine — Credit Decisioning v2
==========================================
Moteur de décision crédit conforme aux pratiques bancaires CEMAC.

Logique de décision tri-partite :
    - ACCEPT  : Exposition approuvée automatiquement
    - REVIEW  : Renvoi vers analyste crédit senior
    - REJECT  : Refus automatique (hors appétit risque)

Nouvelles fonctionnalités v2 :
- Contrôle de concentration sectorielle (portefeuille)
- Override rules structurées avec justification réglementaire
- Intégration watchlist (BLACKLISTED → REJECT automatique)
- Multi-critères : fort collatéral peut compenser PD élevée
- Scoring composite de risque pour calibrer REVIEW vs REJECT

Auteur  : Octaix Risk Engine
Version : 2.0.0
"""

import yaml
import os
import logging
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Tuple
from datetime import datetime
from enum import Enum
import uuid

logger = logging.getLogger(__name__)


class CreditDecision(str, Enum):
    ACCEPT  = "ACCEPT"
    REVIEW  = "REVIEW"
    REJECT  = "REJECT"


class RejectionReason(str, Enum):
    PD_TOO_HIGH          = "PD_EXCEEDS_THRESHOLD"
    EL_TOO_HIGH          = "EXPECTED_LOSS_EXCEEDS_LIMIT"
    DTI_TOO_HIGH         = "DEBT_TO_INCOME_RATIO_EXCEEDS_LIMIT"
    EXPOSURE_LIMIT       = "EXPOSURE_EXCEEDS_SINGLE_OBLIGOR_LIMIT"
    SECTOR_CONCENTRATION = "SECTOR_CONCENTRATION_BREACH"
    NEGATIVE_RAROC       = "RAROC_BELOW_HURDLE_RATE"
    BLACKLISTED          = "CLIENT_ON_WATCHLIST_BLACKLIST"
    INSUFFICIENT_DATA    = "INSUFFICIENT_DATA_FOR_SCORING"


class OverrideType(str, Enum):
    """Types d'override documentés pour comité de crédit."""
    STRONG_COLLATERAL     = "STRONG_COLLATERAL_OFFSET"      # Collatéral couvre > 120% EAD
    STRATEGIC_CLIENT      = "STRATEGIC_CLIENT_RELATIONSHIP"  # Relation stratégique approbée DG
    GOVERNMENT_MANDATE    = "GOVERNMENT_MANDATE"             # Financement mandaté par l'État
    EXISTING_TRACK_RECORD = "EXISTING_CLIENT_TRACK_RECORD"  # Client existant sans incident > 3 ans
    ANALYST_JUDGMENT      = "ANALYST_CREDIT_JUDGMENT"       # Jugement analyste senior documenté


@dataclass
class PortfolioContext:
    """
    Contexte portefeuille injecté dans le moteur pour les contrôles de concentration.
    Mis à jour en temps réel par le moteur de risque.
    """
    sector_exposures: Dict[str, float] = field(default_factory=dict)  # {sector: total_EAD}
    total_portfolio_ead: float = 0.0
    sector_limits: Dict[str, float] = field(default_factory=dict)     # {sector: max_EAD}
    global_obligor_limit: float = 500_000_000   # 500M XAF par défaut

    def sector_utilization(self, sector: str) -> float:
        """Taux d'utilisation de la limite sectorielle."""
        if self.total_portfolio_ead <= 0 or sector not in self.sector_exposures:
            return 0.0
        sector_ead = self.sector_exposures.get(sector, 0)
        # Si limite sectorielle explicite — sinon 25% max par secteur (règle COBAC)
        limit = self.sector_limits.get(sector, self.total_portfolio_ead * 0.25)
        return sector_ead / limit if limit > 0 else 0.0


@dataclass
class DecisionResult:
    """Résultat structuré de décision crédit — audit trail COBAC complet."""
    application_id: str
    decision: CreditDecision
    pd_score: float
    el_amount: float
    el_rate: float
    rejection_reasons: List[str] = field(default_factory=list)
    review_flags: List[str] = field(default_factory=list)
    override_applied: bool = False
    override_type: Optional[str] = None
    override_reason: Optional[str] = None
    override_approver: Optional[str] = None
    concentration_breach: bool = False
    watchlist_flag: bool = False
    risk_composite_score: float = 0.0   # Score composite 0-100 (100 = risque max)
    decision_timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    decision_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    decided_by: str = "AUTOMATED_ENGINE"

    def to_dict(self) -> dict:
        return {
            "application_id": self.application_id,
            "decision": self.decision.value,
            "pd_score": round(self.pd_score, 6),
            "el_amount": round(self.el_amount, 2),
            "el_rate": round(self.el_rate, 6),
            "rejection_reasons": self.rejection_reasons,
            "review_flags": self.review_flags,
            "override_applied": self.override_applied,
            "override_type": self.override_type,
            "override_reason": self.override_reason,
            "override_approver": self.override_approver,
            "concentration_breach": self.concentration_breach,
            "watchlist_flag": self.watchlist_flag,
            "risk_composite_score": round(self.risk_composite_score, 1),
            "decision_timestamp": self.decision_timestamp,
            "decision_id": self.decision_id,
            "decided_by": self.decided_by,
        }


class DecisionEngine:
    """
    Moteur de décision crédit v2 — CEMAC / COBAC.

    Critères de décision :
    1. PD vs seuils configurables (Accept/Review/Reject)
    2. EL rate maximale
    3. DTI ratio
    4. Limite d'exposition individuelle
    5. Concentration sectorielle (nouveau)
    6. Watchlist / blacklist (nouveau)
    7. Override rules structurées (nouveau)
    8. Score composite de risque multi-critères (nouveau)
    """

    # Limites de concentration COBAC (% du portefeuille total par secteur)
    DEFAULT_SECTOR_CONCENTRATION_LIMIT = 0.25   # 25% max par secteur
    CONCENTRATION_WARNING_THRESHOLD    = 0.20   # Warning à 20%
    CONCENTRATION_BREACH_THRESHOLD     = 0.25   # Breach à 25%

    def __init__(
        self,
        config_path: Optional[str] = None,
        portfolio_context: Optional[PortfolioContext] = None,
    ):
        if config_path is None:
            config_path = os.path.join(
                os.path.dirname(__file__), "..", "config", "thresholds.yaml"
            )

        self.config = self._load_config(config_path)
        self.portfolio = portfolio_context or PortfolioContext()
        self._audit_log: List[Dict] = []

        # Seuils PD
        pd_cfg = self.config.get("decision_engine", {}).get("pd_thresholds", {})
        self.accept_max_pd  = pd_cfg.get("accept_max", 0.30)
        self.review_max_pd  = pd_cfg.get("review_max", 0.60)
        self.reject_min_pd  = pd_cfg.get("reject_min", 0.60)

        # Autres seuils
        eng_cfg = self.config.get("decision_engine", {})
        self.max_el_rate          = eng_cfg.get("max_el_rate", 0.10)
        self.max_dti_ratio        = eng_cfg.get("max_dti_ratio", 0.50)
        self.single_obligor_limit = eng_cfg.get("single_obligor_limit", 500_000_000)

        # Concentration sectorielle
        conc_cfg = eng_cfg.get("sector_concentration", {})
        self.sector_warning_threshold = conc_cfg.get("warning_pct", self.CONCENTRATION_WARNING_THRESHOLD)
        self.sector_breach_threshold  = conc_cfg.get("breach_pct",  self.CONCENTRATION_BREACH_THRESHOLD)

        logger.info(
            f"DecisionEngine v2 — Accept≤{self.accept_max_pd:.0%}, "
            f"Review≤{self.review_max_pd:.0%}, Reject≥{self.reject_min_pd:.0%}"
        )

    # ── Évaluation principale ──────────────────────────────────────────────────

    def evaluate(
        self,
        application_id: str,
        pd_score: float,
        lgd: float,
        ead: float,
        dti_ratio: Optional[float] = None,
        sector: Optional[str] = None,
        annual_income: Optional[float] = None,
        is_existing_client: bool = False,
        is_watchlisted: bool = False,
        collateral_coverage: float = 0.0,   # Valeur collatéral / EAD
        override: Optional[Dict] = None,    # {"type": OverrideType, "approver": str, "reason": str}
    ) -> DecisionResult:
        """
        Évalue une demande de crédit et retourne une décision structurée.

        Args:
            application_id:      Identifiant de la demande
            pd_score:            Probabilité de défaut [0,1]
            lgd:                 Loss Given Default [0,1]
            ead:                 Exposure At Default en XAF
            dti_ratio:           Ratio dette/revenu [0,1]
            sector:              Secteur d'activité (pour concentration)
            annual_income:       Revenu annuel en XAF
            is_existing_client:  Client existant (seuils légèrement assouplis)
            is_watchlisted:      Client en liste de surveillance → REJECT automatique
            collateral_coverage: Ratio collatéral/EAD (1.2 = 120% de couverture)
            override:            Override structuré {type, approver, reason}
        """
        rejection_reasons: List[str] = []
        review_flags: List[str] = []
        concentration_breach = False
        watchlist_flag = is_watchlisted

        # ── 0. Watchlist — REJECT immédiat (blocage AML/compliance) ────────
        if is_watchlisted:
            rejection_reasons.append(RejectionReason.BLACKLISTED.value)
            result = self._build_result(
                application_id, CreditDecision.REJECT, pd_score, lgd, ead,
                rejection_reasons, review_flags,
                watchlist_flag=True, concentration_breach=False,
            )
            self._log_decision(result, application_id, pd_score, lgd, ead, dti_ratio, sector)
            return result

        # ── 1. Évaluation PD ────────────────────────────────────────────────
        # Client existant sans incident → seuil d'accept légèrement assoupli (+2pp)
        effective_accept_pd = self.accept_max_pd + (0.02 if is_existing_client else 0.0)
        effective_reject_pd = self.reject_min_pd

        if pd_score >= effective_reject_pd:
            rejection_reasons.append(
                f"{RejectionReason.PD_TOO_HIGH.value}: PD={pd_score:.2%} ≥ {effective_reject_pd:.0%}"
            )
        elif pd_score > effective_accept_pd:
            review_flags.append(
                f"PD={pd_score:.2%} > seuil accept {effective_accept_pd:.0%}"
            )

        # ── 2. EL Rate ──────────────────────────────────────────────────────
        el_amount = pd_score * lgd * ead
        el_rate   = pd_score * lgd
        if el_rate > self.max_el_rate * 2:
            rejection_reasons.append(
                f"{RejectionReason.EL_TOO_HIGH.value}: EL rate={el_rate:.2%} > 2×{self.max_el_rate:.0%}"
            )
        elif el_rate > self.max_el_rate:
            review_flags.append(f"EL rate={el_rate:.2%} > limite {self.max_el_rate:.0%}")

        # ── 3. DTI ──────────────────────────────────────────────────────────
        if dti_ratio is not None:
            if dti_ratio > 0.70:
                rejection_reasons.append(
                    f"{RejectionReason.DTI_TOO_HIGH.value}: DTI={dti_ratio:.0%} > 70%"
                )
            elif dti_ratio > self.max_dti_ratio:
                review_flags.append(f"DTI={dti_ratio:.0%} > limite {self.max_dti_ratio:.0%}")

        # ── 4. Limite d'exposition individuelle ─────────────────────────────
        if ead > self.single_obligor_limit:
            rejection_reasons.append(
                f"{RejectionReason.EXPOSURE_LIMIT.value}: EAD={ead:,.0f} > {self.single_obligor_limit:,.0f} XAF"
            )

        # ── 5. Concentration sectorielle ────────────────────────────────────
        if sector and self.portfolio.total_portfolio_ead > 0:
            utilization = self.portfolio.sector_utilization(sector)
            # Calcule l'utilisation projetée post-approbation
            projected_sector_ead = self.portfolio.sector_exposures.get(sector, 0) + ead
            projected_limit = self.portfolio.sector_limits.get(
                sector, self.portfolio.total_portfolio_ead * self.DEFAULT_SECTOR_CONCENTRATION_LIMIT
            )
            projected_utilization = projected_sector_ead / projected_limit if projected_limit > 0 else 0

            if projected_utilization >= self.sector_breach_threshold:
                rejection_reasons.append(
                    f"{RejectionReason.SECTOR_CONCENTRATION.value}: "
                    f"{sector} atteindrait {projected_utilization:.0%} (limite {self.sector_breach_threshold:.0%})"
                )
                concentration_breach = True
            elif projected_utilization >= self.sector_warning_threshold:
                review_flags.append(
                    f"Concentration {sector}: {projected_utilization:.0%} (seuil alerte {self.sector_warning_threshold:.0%})"
                )

        # ── 6. Score composite de risque (0-100) ────────────────────────────
        risk_score = self._compute_risk_score(
            pd_score, lgd, ead, dti_ratio, collateral_coverage, concentration_breach
        )

        # ── 7. Mitigation collatéral (multi-critères) ───────────────────────
        # Un collatéral fort (> 120% EAD) peut reclasser REJECT → REVIEW
        # SAUF si watchlist, sector_concentration, ou DTI > 70%
        hard_blocks = {RejectionReason.BLACKLISTED.value, RejectionReason.SECTOR_CONCENTRATION.value}
        has_hard_block = any(r.startswith(b) for r in rejection_reasons for b in hard_blocks)

        if (collateral_coverage >= 1.20
                and not has_hard_block
                and RejectionReason.PD_TOO_HIGH.value + ":" in " ".join(rejection_reasons)):
            # Reclassement vers REVIEW — documenté dans review_flags
            rejection_reasons = [
                r for r in rejection_reasons
                if not r.startswith(RejectionReason.PD_TOO_HIGH.value)
            ]
            review_flags.append(
                f"PD élevée (={pd_score:.2%}) atténuée par collatéral fort ({collateral_coverage:.0%} couverture)"
            )

        # ── 8. Override ─────────────────────────────────────────────────────
        override_applied = False
        override_type = override_reason = override_approver = None

        if override and not has_hard_block:
            ov_type = override.get("type", "")
            ov_approver = override.get("approver", "UNKNOWN")
            ov_reason   = override.get("reason", "")

            # Un override valide reclasse REJECT → REVIEW (sauf blacklist/AML)
            if rejection_reasons and ov_type and ov_approver and ov_reason:
                override_applied = True
                override_type    = ov_type
                override_approver = ov_approver
                override_reason  = ov_reason
                rejection_reasons = []
                review_flags.append(
                    f"OVERRIDE [{ov_type}] par {ov_approver}: {ov_reason}"
                )
                logger.warning(
                    f"[OVERRIDE] {application_id} — {ov_type} par {ov_approver}: {ov_reason}"
                )

        # ── 9. Décision finale ──────────────────────────────────────────────
        if rejection_reasons:
            decision = CreditDecision.REJECT
        elif review_flags:
            decision = CreditDecision.REVIEW
        else:
            decision = CreditDecision.ACCEPT

        result = self._build_result(
            application_id, decision, pd_score, lgd, ead,
            rejection_reasons, review_flags,
            watchlist_flag=watchlist_flag,
            concentration_breach=concentration_breach,
            risk_composite_score=risk_score,
            override_applied=override_applied,
            override_type=override_type,
            override_reason=override_reason,
            override_approver=override_approver,
        )

        self._log_decision(result, application_id, pd_score, lgd, ead, dti_ratio, sector)
        return result

    def evaluate_batch(
        self,
        applications_df,
        pd_col: str = "pd",
        lgd_col: str = "lgd",
        ead_col: str = "ead",
        id_col: str = "application_id",
    ):
        """Évaluation batch d'un portefeuille de demandes."""
        import pandas as pd

        results = []
        for _, row in applications_df.iterrows():
            result = self.evaluate(
                application_id=str(row.get(id_col, _)),
                pd_score=float(row[pd_col]),
                lgd=float(row[lgd_col]),
                ead=float(row[ead_col]),
                dti_ratio=float(row["dti_ratio"]) if "dti_ratio" in row else None,
                sector=str(row["sector"]) if "sector" in row else None,
                is_watchlisted=bool(row.get("watchlist_flag", False)),
                collateral_coverage=float(row.get("collateral_coverage", 0.0)),
            )
            results.append(result.to_dict())

        results_df = pd.DataFrame(results)
        logger.info(f"Batch: {results_df['decision'].value_counts().to_dict()}")
        return results_df

    def get_decision_distribution(self, results_df) -> dict:
        """Statistiques de distribution des décisions pour reporting."""
        total = len(results_df)
        if total == 0:
            return {}
        counts = results_df["decision"].value_counts()
        return {
            "total_applications": total,
            "accept_count": int(counts.get("ACCEPT", 0)),
            "accept_rate": round(counts.get("ACCEPT", 0) / total, 4),
            "review_count": int(counts.get("REVIEW", 0)),
            "review_rate": round(counts.get("REVIEW", 0) / total, 4),
            "reject_count": int(counts.get("REJECT", 0)),
            "reject_rate": round(counts.get("REJECT", 0) / total, 4),
            "override_count": int(results_df.get("override_applied", results_df.get("override_applied", 0) * 0).sum()) if "override_applied" in results_df.columns else 0,
            "concentration_breach_count": int(results_df["concentration_breach"].sum()) if "concentration_breach" in results_df.columns else 0,
            "avg_pd_accepted": round(results_df[results_df["decision"] == "ACCEPT"]["pd_score"].mean(), 6)
                               if counts.get("ACCEPT", 0) > 0 else None,
            "avg_risk_score": round(results_df["risk_composite_score"].mean(), 1)
                              if "risk_composite_score" in results_df.columns else None,
        }

    def update_portfolio_context(self, new_context: PortfolioContext) -> None:
        """Met à jour le contexte portefeuille (exposition sectorielle en temps réel)."""
        self.portfolio = new_context
        logger.info(
            f"[Portfolio] Mise à jour — EAD total={new_context.total_portfolio_ead:,.0f} XAF, "
            f"{len(new_context.sector_exposures)} secteurs"
        )

    def get_audit_log(self) -> List[Dict]:
        return self._audit_log.copy()

    # ── Helpers ────────────────────────────────────────────────────────────────

    def _compute_risk_score(
        self,
        pd_score: float,
        lgd: float,
        ead: float,
        dti_ratio: Optional[float],
        collateral_coverage: float,
        concentration_breach: bool,
    ) -> float:
        """
        Score composite de risque 0-100.
        Utilisé pour prioriser la file d'attente des dossiers en REVIEW.
        """
        # Composante PD (0-40 points)
        pd_component = min(40.0, pd_score / self.reject_min_pd * 40)

        # Composante EL rate (0-25 points)
        el_rate = pd_score * lgd
        el_component = min(25.0, el_rate / (self.max_el_rate * 2) * 25)

        # Composante DTI (0-15 points)
        dti_component = min(15.0, (dti_ratio / 0.70 * 15)) if dti_ratio else 0.0

        # Composante taille (0-10 points)
        size_component = min(10.0, ead / self.single_obligor_limit * 10)

        # Bonus de mitigation collatéral (-10 points max)
        collateral_mitigation = min(10.0, collateral_coverage * 10)

        # Pénalité concentration (+ 10 points)
        concentration_penalty = 10.0 if concentration_breach else 0.0

        score = (pd_component + el_component + dti_component + size_component
                 + concentration_penalty - collateral_mitigation)

        return round(max(0.0, min(100.0, score)), 1)

    @staticmethod
    def _build_result(
        application_id: str,
        decision: CreditDecision,
        pd_score: float,
        lgd: float,
        ead: float,
        rejection_reasons: List[str],
        review_flags: List[str],
        **kwargs,
    ) -> DecisionResult:
        el_amount = pd_score * lgd * ead
        el_rate   = pd_score * lgd
        return DecisionResult(
            application_id=application_id,
            decision=decision,
            pd_score=pd_score,
            el_amount=el_amount,
            el_rate=el_rate,
            rejection_reasons=rejection_reasons,
            review_flags=review_flags,
            **kwargs,
        )

    def _log_decision(
        self,
        result: DecisionResult,
        application_id: str,
        pd_score: float,
        lgd: float,
        ead: float,
        dti_ratio: Optional[float],
        sector: Optional[str],
    ) -> None:
        self._audit_log.append({
            "action": "credit_decision_v2",
            "timestamp": result.decision_timestamp,
            "input": {
                "application_id": application_id,
                "pd_score": pd_score, "lgd": lgd, "ead": ead,
                "dti_ratio": dti_ratio, "sector": sector,
            },
            "output": result.to_dict(),
        })
        logger.info(
            f"Decision [{application_id}] → {result.decision.value} "
            f"(PD={pd_score:.2%}, EL={result.el_amount:,.0f}, risk={result.risk_composite_score:.0f}/100)"
        )

    def _load_config(self, config_path: str) -> dict:
        try:
            with open(config_path, "r") as f:
                return yaml.safe_load(f) or {}
        except FileNotFoundError:
            logger.warning(f"Config non trouvée: {config_path} — défauts utilisés")
            return {}


if __name__ == "__main__":
    import pandas as pd

    # ── Test avec contexte portefeuille ──────────────────────────────────
    portfolio = PortfolioContext(
        sector_exposures={"OIL_GAS": 180_000_000, "BANKING": 50_000_000},
        total_portfolio_ead=500_000_000,
        sector_limits={"OIL_GAS": 200_000_000},
    )

    engine = DecisionEngine(portfolio_context=portfolio)

    # Test 1 : Dossier clean
    r1 = engine.evaluate("APP-001", pd_score=0.05, lgd=0.35, ead=2_000_000, sector="TELECOM")
    print(f"[APP-001] {r1.decision.value} | Risk={r1.risk_composite_score:.0f}/100")

    # Test 2 : PD élevée mais fort collatéral
    r2 = engine.evaluate("APP-002", pd_score=0.45, lgd=0.45, ead=5_000_000,
                         collateral_coverage=1.35, sector="AGRICULTURE")
    print(f"[APP-002] {r2.decision.value} | Risk={r2.risk_composite_score:.0f}/100 | {r2.review_flags}")

    # Test 3 : Concentration sectorielle pétrole proche limite
    r3 = engine.evaluate("APP-003", pd_score=0.08, lgd=0.40, ead=30_000_000, sector="OIL_GAS")
    print(f"[APP-003] {r3.decision.value} | Concentration breach={r3.concentration_breach}")

    # Test 4 : Watchlist → REJECT immédiat
    r4 = engine.evaluate("APP-004", pd_score=0.02, lgd=0.20, ead=500_000, is_watchlisted=True)
    print(f"[APP-004] {r4.decision.value} | Watchlist={r4.watchlist_flag}")

    # Test 5 : Override par analyste senior
    r5 = engine.evaluate(
        "APP-005", pd_score=0.55, lgd=0.50, ead=10_000_000, sector="CONSTRUCTION",
        override={
            "type": OverrideType.STRATEGIC_CLIENT.value,
            "approver": "DG_RISQUE",
            "reason": "Client stratégique 15 ans, projet PPP gouvernemental"
        }
    )
    print(f"[APP-005] {r5.decision.value} | Override={r5.override_applied} | {r5.override_type}")
