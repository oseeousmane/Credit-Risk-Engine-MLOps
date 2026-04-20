"""
Audit Trail — Traçabilité Complète
=====================================
Système de traçabilité pour conformité COBAC et auditabilité.

Enregistre tous les événements critiques du Credit Risk Engine :
- Décisions de crédit
- Prédictions du modèle
- Modifications de seuils / configuration
- Actions de gouvernance
- Alertes et interventions

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import json
import os
import logging
from typing import Optional, Dict, List
from datetime import datetime
from enum import Enum
import uuid

logger = logging.getLogger(__name__)


class AuditEventType(str, Enum):
    CREDIT_DECISION = "CREDIT_DECISION"
    MODEL_PREDICTION = "MODEL_PREDICTION"
    MODEL_TRAINING = "MODEL_TRAINING"
    MODEL_DEPLOYMENT = "MODEL_DEPLOYMENT"
    MODEL_VALIDATION = "MODEL_VALIDATION"
    CONFIG_CHANGE = "CONFIG_CHANGE"
    THRESHOLD_CHANGE = "THRESHOLD_CHANGE"
    ALERT_TRIGGERED = "ALERT_TRIGGERED"
    ALERT_ACKNOWLEDGED = "ALERT_ACKNOWLEDGED"
    DATA_QUALITY_CHECK = "DATA_QUALITY_CHECK"
    OVERRIDE_APPLIED = "OVERRIDE_APPLIED"
    USER_ACTION = "USER_ACTION"


class AuditTrail:
    """
    Système de traçabilité pour conformité COBAC.
    
    Principes :
    - Immuabilité : les enregistrements ne sont jamais modifiés
    - Exhaustivité : tous les événements critiques sont journalisés
    - Horodatage : timestamp UTC pour chaque événement
    - Identification : qui, quoi, quand, pourquoi
    """

    def __init__(self, log_dir: Optional[str] = None):
        self.log_dir = log_dir or os.path.join(
            os.path.dirname(__file__), "audit_logs"
        )
        os.makedirs(self.log_dir, exist_ok=True)

    def log_event(
        self,
        event_type: AuditEventType,
        description: str,
        actor: str = "system",
        entity_id: Optional[str] = None,
        details: Optional[Dict] = None,
        outcome: Optional[str] = None,
    ) -> Dict:
        """
        Enregistre un événement dans le journal d'audit.
        
        Args:
            event_type: Type d'événement
            description: Description humainement lisible
            actor: Qui a déclenché l'événement
            entity_id: ID de l'entité concernée
            details: Détails additionnels
            outcome: Résultat de l'action
        """
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": event_type.value if isinstance(event_type, AuditEventType) else event_type,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "actor": actor,
            "entity_id": entity_id,
            "description": description,
            "details": details or {},
            "outcome": outcome,
        }

        # Append to daily log file (append-only for immutability)
        date_str = datetime.utcnow().strftime("%Y%m%d")
        log_file = os.path.join(self.log_dir, f"audit_{date_str}.jsonl")

        with open(log_file, "a") as f:
            f.write(json.dumps(event, default=str) + "\n")

        logger.debug(
            f"Audit: [{event_type.value if isinstance(event_type, AuditEventType) else event_type}] "
            f"{description} (actor={actor})"
        )

        return event

    def log_credit_decision(
        self,
        application_id: str,
        pd_score: float,
        decision: str,
        reasons: List[str],
        analyst: str = "AUTOMATED_ENGINE",
    ) -> Dict:
        """Raccourci pour journaliser une décision de crédit."""
        return self.log_event(
            event_type=AuditEventType.CREDIT_DECISION,
            description=f"Décision crédit: {application_id} → {decision}",
            actor=analyst,
            entity_id=application_id,
            details={
                "pd_score": pd_score,
                "decision": decision,
                "reasons": reasons,
            },
            outcome=decision,
        )

    def log_model_deployment(
        self,
        model_id: str,
        model_version: str,
        deployed_by: str = "mlops_pipeline",
    ) -> Dict:
        """Journalise un déploiement de modèle."""
        return self.log_event(
            event_type=AuditEventType.MODEL_DEPLOYMENT,
            description=f"Déploiement modèle: {model_id} v{model_version}",
            actor=deployed_by,
            entity_id=model_id,
            details={"model_version": model_version},
            outcome="DEPLOYED",
        )

    def log_config_change(
        self,
        config_key: str,
        old_value,
        new_value,
        changed_by: str = "admin",
    ) -> Dict:
        """Journalise un changement de configuration/seuils."""
        return self.log_event(
            event_type=AuditEventType.CONFIG_CHANGE,
            description=f"Configuration modifiée: {config_key}",
            actor=changed_by,
            entity_id=config_key,
            details={
                "old_value": old_value,
                "new_value": new_value,
            },
            outcome="CHANGED",
        )

    def query_events(
        self,
        event_type: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        entity_id: Optional[str] = None,
        max_results: int = 100,
    ) -> List[Dict]:
        """
        Requête sur le journal d'audit.
        """
        results = []
        log_files = sorted(
            [f for f in os.listdir(self.log_dir) if f.startswith("audit_")],
            reverse=True
        )

        for log_file in log_files:
            if len(results) >= max_results:
                break

            file_date = log_file.replace("audit_", "").replace(".jsonl", "")
            if date_from and file_date < date_from.replace("-", ""):
                continue
            if date_to and file_date > date_to.replace("-", ""):
                continue

            file_path = os.path.join(self.log_dir, log_file)
            with open(file_path, "r") as f:
                for line in f:
                    if len(results) >= max_results:
                        break
                    event = json.loads(line.strip())
                    if event_type and event["event_type"] != event_type:
                        continue
                    if entity_id and event.get("entity_id") != entity_id:
                        continue
                    results.append(event)

        return results

    def get_summary(self, date: Optional[str] = None) -> Dict:
        """Résumé de l'activité d'audit pour une date donnée."""
        date_str = date or datetime.utcnow().strftime("%Y%m%d")
        log_file = os.path.join(self.log_dir, f"audit_{date_str}.jsonl")

        if not os.path.exists(log_file):
            return {"date": date_str, "total_events": 0, "by_type": {}}

        events = []
        with open(log_file, "r") as f:
            for line in f:
                events.append(json.loads(line.strip()))

        by_type = {}
        for e in events:
            t = e["event_type"]
            by_type[t] = by_type.get(t, 0) + 1

        return {
            "date": date_str,
            "total_events": len(events),
            "by_type": by_type,
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    audit = AuditTrail()

    audit.log_credit_decision("APP-001", 0.08, "ACCEPT", [])
    audit.log_credit_decision("APP-002", 0.72, "REJECT", ["PD_EXCEEDS_THRESHOLD"])
    audit.log_model_deployment("PD-LGBM-001", "1.0.0")
    audit.log_config_change("pd_thresholds.accept_max", 0.30, 0.25, "CRO")

    summary = audit.get_summary()
    print(f"\nAudit Summary: {summary['total_events']} events")
    for t, c in summary["by_type"].items():
        print(f"  {t}: {c}")
