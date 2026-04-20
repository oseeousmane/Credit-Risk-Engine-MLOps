"""
Model Inventory — Governance Register
========================================
Registre d'inventaire des modèles conformément aux exigences SR 11-7
(Fed Reserve) et COBAC pour la gouvernance des modèles.

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import json
import os
import logging
from typing import Optional, Dict, List
from datetime import datetime

logger = logging.getLogger(__name__)


class ModelInventory:
    """
    Registre d'inventaire pour la gouvernance des modèles.
    
    Chaque modèle enregistré contient :
    - Identification (nom, version, type)
    - Classification du risque modèle (Tier 1/2/3)
    - Historique de validation
    - Statut de production
    - Owner et responsabilités
    """

    RISK_TIERS = {
        1: "CRITICAL — Impact matériel sur les fonds propres / provisions",
        2: "SIGNIFICANT — Impact modéré, modèle utilisé en production",
        3: "LOW — Impact limité, modèle auxiliaire ou en développement",
    }

    def __init__(self, inventory_path: Optional[str] = None):
        self.inventory_path = inventory_path or os.path.join(
            os.path.dirname(__file__), "model_registry.json"
        )
        self._inventory = self._load()
        logger.info(f"Model Inventory: {len(self._inventory)} modèles enregistrés")

    def _load(self) -> List[Dict]:
        if os.path.exists(self.inventory_path):
            with open(self.inventory_path, "r") as f:
                return json.load(f)
        return []

    def _save(self):
        with open(self.inventory_path, "w") as f:
            json.dump(self._inventory, f, indent=2, default=str)

    def register_model(
        self,
        model_id: str,
        model_name: str,
        model_version: str,
        model_type: str,
        risk_tier: int = 1,
        owner: str = "",
        description: str = "",
        algorithm: str = "",
        use_case: str = "",
        regulatory_use: bool = True,
        production_status: str = "DEVELOPMENT",
    ) -> Dict:
        """
        Enregistre un modèle dans l'inventaire.
        """
        entry = {
            "model_id": model_id,
            "model_name": model_name,
            "model_version": model_version,
            "model_type": model_type,
            "risk_tier": risk_tier,
            "risk_tier_description": self.RISK_TIERS.get(risk_tier, ""),
            "owner": owner,
            "description": description,
            "algorithm": algorithm,
            "use_case": use_case,
            "regulatory_use": regulatory_use,
            "production_status": production_status,
            "registration_date": datetime.utcnow().isoformat(),
            "last_validation_date": None,
            "next_validation_date": None,
            "validation_frequency": "ANNUAL" if risk_tier == 1 else "BIANNUAL",
            "validation_history": [],
            "change_log": [{
                "date": datetime.utcnow().isoformat(),
                "action": "REGISTERED",
                "by": owner,
                "details": "Initial registration",
            }],
        }

        self._inventory.append(entry)
        self._save()

        logger.info(f"Model registered: {model_id} ({model_name} v{model_version})")
        return entry

    def update_status(self, model_id: str, new_status: str, by: str = "system"):
        """Met à jour le statut d'un modèle."""
        for entry in self._inventory:
            if entry["model_id"] == model_id:
                old_status = entry["production_status"]
                entry["production_status"] = new_status
                entry["change_log"].append({
                    "date": datetime.utcnow().isoformat(),
                    "action": f"STATUS_CHANGE: {old_status} → {new_status}",
                    "by": by,
                })
                self._save()
                logger.info(f"Model {model_id}: {old_status} → {new_status}")
                return True
        return False

    def record_validation(
        self, model_id: str, validation_result: str,
        validator: str = "", report_path: str = ""
    ):
        """Enregistre un événement de validation."""
        for entry in self._inventory:
            if entry["model_id"] == model_id:
                entry["last_validation_date"] = datetime.utcnow().isoformat()
                entry["validation_history"].append({
                    "date": datetime.utcnow().isoformat(),
                    "result": validation_result,
                    "validator": validator,
                    "report_path": report_path,
                })
                self._save()
                return True
        return False

    def get_all(self) -> List[Dict]:
        return self._inventory.copy()

    def get_by_status(self, status: str) -> List[Dict]:
        return [m for m in self._inventory if m["production_status"] == status]

    def get_due_for_validation(self) -> List[Dict]:
        """Retourne les modèles devant être revalidés."""
        due = []
        for entry in self._inventory:
            if entry["production_status"] in ["PRODUCTION", "CHAMPION"]:
                if entry["last_validation_date"] is None:
                    due.append(entry)
                # In production, could add date-based logic here
        return due

    def generate_inventory_report(self) -> Dict:
        """Rapport d'inventaire pour comité de gouvernance."""
        total = len(self._inventory)
        by_status = {}
        by_tier = {}

        for entry in self._inventory:
            status = entry["production_status"]
            by_status[status] = by_status.get(status, 0) + 1
            tier = entry["risk_tier"]
            by_tier[tier] = by_tier.get(tier, 0) + 1

        return {
            "report_date": datetime.utcnow().isoformat(),
            "total_models": total,
            "by_status": by_status,
            "by_risk_tier": by_tier,
            "due_for_validation": len(self.get_due_for_validation()),
            "models": [
                {
                    "id": m["model_id"],
                    "name": m["model_name"],
                    "version": m["model_version"],
                    "status": m["production_status"],
                    "tier": m["risk_tier"],
                    "last_validated": m["last_validation_date"],
                }
                for m in self._inventory
            ],
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    inventory = ModelInventory()

    inventory.register_model(
        model_id="PD-LGBM-001",
        model_name="PD_LightGBM",
        model_version="1.0.0",
        model_type="PD",
        risk_tier=1,
        owner="Credit Risk Analytics",
        algorithm="LightGBM",
        use_case="Scoring PD retail & commercial",
        regulatory_use=True,
        production_status="CHAMPION",
    )

    report = inventory.generate_inventory_report()
    print(f"\nInventaire: {report['total_models']} modèle(s)")
    print(f"Due for validation: {report['due_for_validation']}")
