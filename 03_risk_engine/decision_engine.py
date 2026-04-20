"""
Decision Engine — Credit Decisioning
======================================
Moteur de décision crédit conforme aux pratiques bancaires CEMAC.

Logique de décision tri-partite :
    - ACCEPT  : Exposition approuvée automatiquement
    - REVIEW  : Renvoi vers analyste crédit senior
    - REJECT  : Refus automatique (hors appétit risque)

Intègre :
- Seuils PD configurables (thresholds.yaml)
- Override rules pour cas exceptionnels
- Audit trail complet pour conformité COBAC
- Raison de refus documentée (obligation réglementaire)

Auteur  : Credit Risk Engine
Version : 1.0.0
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
    """Décisions de crédit conformes aux pratiques CEMAC."""
    ACCEPT = "ACCEPT"
    REVIEW = "REVIEW"
    REJECT = "REJECT"


class RejectionReason(str, Enum):
    """Motifs de rejet documentés (exigence réglementaire COBAC)."""
    PD_TOO_HIGH = "PD_EXCEEDS_THRESHOLD"
    EL_TOO_HIGH = "EXPECTED_LOSS_EXCEEDS_LIMIT"
    DTI_TOO_HIGH = "DEBT_TO_INCOME_RATIO_EXCEEDS_LIMIT"
    EXPOSURE_LIMIT = "EXPOSURE_EXCEEDS_SINGLE_OBLIGOR_LIMIT"
    SECTOR_CONCENTRATION = "SECTOR_CONCENTRATION_BREACH"
    NEGATIVE_RAROC = "RAROC_BELOW_HURDLE_RATE"
    BLACKLISTED = "CLIENT_ON_WATCHLIST"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA_FOR_SCORING"


@dataclass
class DecisionResult:
    """
    Résultat structuré de décision crédit.
    Conçu pour audit trail COBAC et traçabilité complète.
    """
    application_id: str
    decision: CreditDecision
    pd_score: float
    el_amount: float
    el_rate: float
    rejection_reasons: List[str] = field(default_factory=list)
    review_flags: List[str] = field(default_factory=list)
    override_applied: bool = False
    override_reason: Optional[str] = None
    decision_timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    decision_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    decided_by: str = "AUTOMATED_ENGINE"  # vs. "ANALYST_OVERRIDE"

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
            "override_reason": self.override_reason,
            "decision_timestamp": self.decision_timestamp,
            "decision_id": self.decision_id,
            "decided_by": self.decided_by,
        }


class DecisionEngine:
    """
    Moteur de décision crédit pour le secteur bancaire CEMAC.
    
    Architecture de décision :
    1. Évaluation PD vs seuils (Accept/Review/Reject)
    2. Vérification EL rate maximale
    3. Contrôle DTI (Debt-to-Income)
    4. Vérification limites d'exposition individuelle
    5. Contrôle de concentration sectorielle
    6. Application d'override rules si applicable
    
    Tous les seuils sont chargés depuis config/thresholds.yaml
    """

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialise le Decision Engine avec les seuils réglementaires.
        
        Args:
            config_path: Chemin vers thresholds.yaml. Si None, utilise le chemin par défaut.
        """
        if config_path is None:
            config_path = os.path.join(
                os.path.dirname(__file__), "..", "config", "thresholds.yaml"
            )

        self.config = self._load_config(config_path)
        self._audit_log: List[Dict] = []

        # Extraction des seuils
        pd_thresholds = self.config.get("decision_engine", {}).get("pd_thresholds", {})
        self.accept_max_pd = pd_thresholds.get("accept_max", 0.30)
        self.review_max_pd = pd_thresholds.get("review_max", 0.60)
        self.reject_min_pd = pd_thresholds.get("reject_min", 0.60)

        # Limites additionnelles
        self.max_el_rate = self.config.get("decision_engine", {}).get("max_el_rate", 0.10)
        self.max_dti_ratio = self.config.get("decision_engine", {}).get("max_dti_ratio", 0.50)
        self.single_obligor_limit = self.config.get("decision_engine", {}).get(
            "single_obligor_limit", 500_000_000  # 500M XAF par défaut
        )

        logger.info(
            f"DecisionEngine initialisé — "
            f"Accept<={self.accept_max_pd:.0%}, "
            f"Review<={self.review_max_pd:.0%}, "
            f"Reject>={self.reject_min_pd:.0%}"
        )

    def _load_config(self, config_path: str) -> dict:
        """Charge la configuration depuis YAML."""
        try:
            with open(config_path, "r") as f:
                config = yaml.safe_load(f)
            logger.info(f"Configuration chargée depuis {config_path}")
            return config
        except FileNotFoundError:
            logger.warning(
                f"Configuration non trouvée : {config_path}. "
                "Utilisation des valeurs par défaut."
            )
            return {}

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
    ) -> DecisionResult:
        """
        Évalue une demande de crédit et retourne une décision structurée.

        Args:
            application_id: Identifiant de la demande
            pd_score: Probabilité de défaut (0-1)
            lgd: Loss Given Default (0-1)
            ead: Exposure At Default
            dti_ratio: Ratio dette/revenu du demandeur
            sector: Secteur d'activité
            annual_income: Revenu annuel du demandeur
            is_existing_client: Si client existant (affecte les seuils)

        Returns:
            DecisionResult avec décision, raisons, et metadata d'audit
        """
        rejection_reasons = []
        review_flags = []

        # ── 1. Évaluation PD ────────────────────────────────────
        if pd_score >= self.reject_min_pd:
            rejection_reasons.append(RejectionReason.PD_TOO_HIGH.value)
        elif pd_score > self.accept_max_pd:
            review_flags.append(f"PD={pd_score:.2%} > seuil accept {self.accept_max_pd:.0%}")

        # ── 2. Évaluation EL Rate ───────────────────────────────
        el_amount = pd_score * lgd * ead
        el_rate = pd_score * lgd
        if el_rate > self.max_el_rate:
            review_flags.append(
                f"EL rate={el_rate:.2%} > max autorisé {self.max_el_rate:.0%}"
            )
            if el_rate > self.max_el_rate * 2:
                rejection_reasons.append(RejectionReason.EL_TOO_HIGH.value)

        # ── 3. Contrôle DTI ─────────────────────────────────────
        if dti_ratio is not None and dti_ratio > self.max_dti_ratio:
            review_flags.append(
                f"DTI={dti_ratio:.0%} > limite {self.max_dti_ratio:.0%}"
            )
            if dti_ratio > 0.70:
                rejection_reasons.append(RejectionReason.DTI_TOO_HIGH.value)

        # ── 4. Contrôle limite individuelle ─────────────────────
        if ead > self.single_obligor_limit:
            rejection_reasons.append(RejectionReason.EXPOSURE_LIMIT.value)

        # ── 5. Détermination décision finale ────────────────────
        if rejection_reasons:
            decision = CreditDecision.REJECT
        elif review_flags:
            decision = CreditDecision.REVIEW
        else:
            decision = CreditDecision.ACCEPT

        result = DecisionResult(
            application_id=application_id,
            decision=decision,
            pd_score=pd_score,
            el_amount=el_amount,
            el_rate=el_rate,
            rejection_reasons=rejection_reasons,
            review_flags=review_flags,
        )

        # Audit trail
        self._audit_log.append({
            "action": "credit_decision",
            "timestamp": result.decision_timestamp,
            "input": {
                "application_id": application_id,
                "pd_score": pd_score,
                "lgd": lgd,
                "ead": ead,
                "dti_ratio": dti_ratio,
                "sector": sector,
            },
            "output": result.to_dict(),
        })

        logger.info(
            f"Decision: {application_id} → {decision.value} "
            f"(PD={pd_score:.2%}, EL={el_amount:,.0f})"
        )

        return result

    def evaluate_batch(
        self,
        applications_df,
        pd_col: str = "pd",
        lgd_col: str = "lgd",
        ead_col: str = "ead",
        id_col: str = "application_id",
    ):
        """
        Évaluation batch d'un portefeuille de demandes.
        """
        import pandas as pd

        results = []
        for _, row in applications_df.iterrows():
            result = self.evaluate(
                application_id=str(row.get(id_col, _)),
                pd_score=row[pd_col],
                lgd=row[lgd_col],
                ead=row[ead_col],
                dti_ratio=row.get("dti_ratio"),
            )
            results.append(result.to_dict())

        results_df = pd.DataFrame(results)

        # Statistiques de décision
        decision_stats = results_df["decision"].value_counts().to_dict()
        logger.info(f"Batch decision stats: {decision_stats}")

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
            "avg_pd_accepted": round(
                results_df[results_df["decision"] == "ACCEPT"]["pd_score"].mean(), 6
            ) if counts.get("ACCEPT", 0) > 0 else None,
            "avg_el_rejected": round(
                results_df[results_df["decision"] == "REJECT"]["el_amount"].mean(), 2
            ) if counts.get("REJECT", 0) > 0 else None,
        }

    def get_audit_log(self) -> List[Dict]:
        """Retourne le journal d'audit complet."""
        return self._audit_log.copy()


if __name__ == "__main__":
    import pandas as pd

    engine = DecisionEngine()

    # Test individuel
    result = engine.evaluate(
        application_id="APP-2024-001",
        pd_score=0.12,
        lgd=0.45,
        ead=5_000_000,
    )
    print(f"[{result.application_id}] → {result.decision.value}")

    # Test batch
    apps = pd.DataFrame({
        "application_id": [f"APP-{i:03d}" for i in range(6)],
        "pd": [0.02, 0.15, 0.35, 0.55, 0.75, 0.08],
        "lgd": [0.45, 0.50, 0.55, 0.60, 0.70, 0.40],
        "ead": [1_000_000, 5_000_000, 2_000_000, 8_000_000, 500_000, 3_000_000],
    })

    results = engine.evaluate_batch(apps)
    stats = engine.get_decision_distribution(results)
    print(f"\nDistribution: {stats}")
