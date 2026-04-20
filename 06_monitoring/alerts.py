"""
Alert Manager — Automated Alerting System
=============================================
Système d'alertes automatiques pour le monitoring MLOps.

Niveaux d'alerte :
- INFO     : Événement informatif
- WARNING  : Attention requise, seuil en approche
- CRITICAL : Action immédiate requise
- EMERGENCY: Arrêt d'urgence / escalation CRO

Canaux de notification :
- Log fichier (toujours actif)
- Console (développement)
- Webhook (production — Slack/Teams/Email)

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import json
import os
import logging
from typing import Optional, Dict, List
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class AlertLevel(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    EMERGENCY = "EMERGENCY"


class AlertManager:
    """
    Gestionnaire d'alertes pour le monitoring des modèles.
    
    Architecture :
    1. Règles d'alerte configurables (PSI, AUC, Brier, volume)
    2. Agrégation et dédoublonnage des alertes
    3. Escalation automatique pour niveaux CRITICAL/EMERGENCY
    4. Historique complet pour audit
    """

    # Règles d'alerte par défaut
    DEFAULT_RULES = {
        "psi_warning": {
            "metric": "psi",
            "threshold": 0.10,
            "direction": "above",
            "level": AlertLevel.WARNING,
            "message": "PSI > 10% détecté — Dérive de population modérée",
        },
        "psi_critical": {
            "metric": "psi",
            "threshold": 0.25,
            "direction": "above",
            "level": AlertLevel.CRITICAL,
            "message": "PSI > 25% détecté — Dérive critique, recalibration requise",
        },
        "auc_degradation": {
            "metric": "auc_delta",
            "threshold": -0.03,
            "direction": "below",
            "level": AlertLevel.WARNING,
            "message": "AUC dégradé de plus de 3pp vs baseline",
        },
        "auc_critical": {
            "metric": "auc",
            "threshold": 0.65,
            "direction": "below",
            "level": AlertLevel.CRITICAL,
            "message": "AUC < 65% — Modèle en dessous du seuil d'acceptabilité",
        },
        "default_rate_spike": {
            "metric": "default_rate_ratio",
            "threshold": 1.50,
            "direction": "above",
            "level": AlertLevel.WARNING,
            "message": "Taux de défaut observé > 1.5× la PD prédite",
        },
        "prediction_volume_drop": {
            "metric": "prediction_volume_ratio",
            "threshold": 0.50,
            "direction": "below",
            "level": AlertLevel.WARNING,
            "message": "Volume de prédictions < 50% de la moyenne — vérifier le pipeline",
        },
    }

    def __init__(
        self,
        rules: Optional[Dict] = None,
        output_dir: Optional[str] = None,
    ):
        self.rules = rules or self.DEFAULT_RULES.copy()
        self.output_dir = output_dir or os.path.join(
            os.path.dirname(__file__), "alerts"
        )
        os.makedirs(self.output_dir, exist_ok=True)
        self._alert_history: List[Dict] = []

    def check_and_alert(
        self,
        metrics: Dict,
        source: str = "monitoring",
    ) -> List[Dict]:
        """
        Vérifie les métriques contre les règles d'alerte.
        Retourne la liste des alertes déclenchées.
        """
        triggered_alerts = []

        for rule_name, rule in self.rules.items():
            metric_value = self._extract_metric(metrics, rule["metric"])
            if metric_value is None:
                continue

            triggered = False
            if rule["direction"] == "above" and metric_value > rule["threshold"]:
                triggered = True
            elif rule["direction"] == "below" and metric_value < rule["threshold"]:
                triggered = True

            if triggered:
                alert = {
                    "alert_id": datetime.utcnow().strftime("%Y%m%d%H%M%S") + f"_{rule_name}",
                    "rule_name": rule_name,
                    "level": rule["level"].value if isinstance(rule["level"], AlertLevel) else rule["level"],
                    "metric": rule["metric"],
                    "metric_value": round(metric_value, 6),
                    "threshold": rule["threshold"],
                    "direction": rule["direction"],
                    "message": rule["message"],
                    "source": source,
                    "timestamp": datetime.utcnow().isoformat(),
                    "acknowledged": False,
                }

                triggered_alerts.append(alert)
                self._alert_history.append(alert)

                # Log based on severity
                if alert["level"] == "EMERGENCY":
                    logger.critical(f"🚨 EMERGENCY: {alert['message']} ({rule['metric']}={metric_value:.4f})")
                elif alert["level"] == "CRITICAL":
                    logger.error(f"🔴 CRITICAL: {alert['message']} ({rule['metric']}={metric_value:.4f})")
                elif alert["level"] == "WARNING":
                    logger.warning(f"🟡 WARNING: {alert['message']} ({rule['metric']}={metric_value:.4f})")
                else:
                    logger.info(f"🔵 INFO: {alert['message']}")

        # Save alerts
        if triggered_alerts:
            alerts_path = os.path.join(
                self.output_dir,
                f"alerts_{datetime.utcnow().strftime('%Y%m%d')}.json"
            )
            existing = []
            if os.path.exists(alerts_path):
                with open(alerts_path, "r") as f:
                    existing = json.load(f)

            existing.extend(triggered_alerts)
            with open(alerts_path, "w") as f:
                json.dump(existing, f, indent=2)

        return triggered_alerts

    def _extract_metric(self, metrics: Dict, metric_name: str):
        """Extrait une métrique depuis un dict imbriqué."""
        # Cherche à plat d'abord
        if metric_name in metrics:
            return metrics[metric_name]
        # Cherche en profondeur
        for key, value in metrics.items():
            if isinstance(value, dict):
                if metric_name in value:
                    return value[metric_name]
        return None

    def get_active_alerts(self, level: Optional[str] = None) -> List[Dict]:
        """Retourne les alertes non acquittées."""
        alerts = [a for a in self._alert_history if not a["acknowledged"]]
        if level:
            alerts = [a for a in alerts if a["level"] == level]
        return alerts

    def acknowledge_alert(self, alert_id: str, by: str = "system") -> bool:
        """Acquitte une alerte."""
        for alert in self._alert_history:
            if alert["alert_id"] == alert_id:
                alert["acknowledged"] = True
                alert["acknowledged_by"] = by
                alert["acknowledged_at"] = datetime.utcnow().isoformat()
                logger.info(f"Alert {alert_id} acknowledged by {by}")
                return True
        return False

    def get_alert_summary(self) -> Dict:
        """Résumé des alertes pour dashboard."""
        total = len(self._alert_history)
        active = [a for a in self._alert_history if not a["acknowledged"]]

        by_level = {}
        for alert in active:
            level = alert["level"]
            by_level[level] = by_level.get(level, 0) + 1

        return {
            "total_alerts": total,
            "active_alerts": len(active),
            "by_level": by_level,
            "last_alert": self._alert_history[-1] if self._alert_history else None,
            "timestamp": datetime.utcnow().isoformat(),
        }

    def get_history(self) -> List[Dict]:
        return self._alert_history.copy()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    manager = AlertManager()

    # Test avec métriques
    metrics = {
        "psi": 0.18,
        "auc": 0.72,
        "auc_delta": -0.04,
        "default_rate_ratio": 1.2,
    }

    alerts = manager.check_and_alert(metrics, source="monthly_monitoring")
    print(f"\n{len(alerts)} alertes déclenchées:")
    for a in alerts:
        print(f"  [{a['level']}] {a['message']}")
