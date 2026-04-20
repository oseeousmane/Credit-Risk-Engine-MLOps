"""
Validation Report Generator
==============================
Génère des rapports de validation modèle conformes aux exigences MRM,
COBAC et EBA Guidelines.

Structure du rapport :
1. Executive Summary
2. Model Description
3. Data Quality Assessment
4. Discrimination Analysis
5. Calibration Analysis
6. Stability Assessment
7. Backtesting Results
8. Champion/Challenger Results
9. Recommendations & Action Items
10. Sign-off Section

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import json
import os
import logging
from typing import Optional, Dict, List
from datetime import datetime

logger = logging.getLogger(__name__)


class ValidationReportGenerator:
    """
    Générateur de rapports de validation modèle conformes au MRM.
    
    Produit un Document de Validation complet pour :
    - Comité des Risques
    - Audit COBAC
    - Revue MRM indépendante
    """

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = output_dir or os.path.join(
            os.path.dirname(__file__), "reports"
        )
        os.makedirs(self.output_dir, exist_ok=True)

    def generate(
        self,
        model_name: str,
        model_version: str,
        validation_results: Dict,
        backtest_results: Optional[Dict] = None,
        cc_results: Optional[Dict] = None,
        model_description: Optional[str] = None,
        validator_name: str = "Model Validation Unit",
        recommendations: Optional[List[str]] = None,
    ) -> Dict:
        """
        Génère un rapport de validation complet.
        
        Args:
            model_name: Nom du modèle
            model_version: Version du modèle
            validation_results: Résultats de validation (discrimination, calibration)
            backtest_results: Résultats de backtesting
            cc_results: Résultats Champion/Challenger
            model_description: Description du modèle
            validator_name: Nom du validateur
            recommendations: Recommandations et actions
        """
        report_id = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

        report = {
            "report_metadata": {
                "report_id": report_id,
                "report_type": "MODEL_VALIDATION_REPORT",
                "regulatory_framework": "Basel_III_COBAC_IFRS9",
                "generated_at": datetime.utcnow().isoformat(),
                "validator": validator_name,
                "status": "DRAFT",
            },

            # ── 1. Executive Summary ────────────────────────────
            "executive_summary": self._build_executive_summary(
                model_name, model_version, validation_results,
                backtest_results, cc_results
            ),

            # ── 2. Model Description ───────────────────────────
            "model_description": {
                "name": model_name,
                "version": model_version,
                "type": "Probability of Default (PD)",
                "algorithm": "LightGBM (Gradient Boosted Decision Trees)",
                "target_variable": "Default (binary: 0/1)",
                "scope": "Retail & Commercial Credit — Zone CEMAC",
                "description": model_description or (
                    "Modèle de Probability of Default basé sur LightGBM, "
                    "calibré sur données Home Credit et adapté aux pratiques CEMAC."
                ),
                "regulatory_use": [
                    "Calcul de l'Expected Loss (EL = PD × LGD × EAD)",
                    "Classification IFRS 9 (staging 1/2/3)",
                    "Décision de crédit automatisée (Accept/Review/Reject)",
                    "Calcul du RAROC",
                    "Reporting réglementaire COBAC",
                ],
            },

            # ── 3. Validation Results ──────────────────────────
            "discrimination_analysis": self._extract_discrimination(validation_results),
            "calibration_analysis": self._extract_calibration(validation_results),
            "stability_assessment": self._extract_stability(validation_results),

            # ── 4. Backtesting ─────────────────────────────────
            "backtesting": backtest_results or {"status": "NOT_PERFORMED"},

            # ── 5. Champion/Challenger ─────────────────────────
            "champion_challenger": cc_results or {"status": "NOT_PERFORMED"},

            # ── 6. Recommendations ─────────────────────────────
            "recommendations": recommendations or self._auto_recommendations(
                validation_results, backtest_results
            ),

            # ── 7. Sign-off ───────────────────────────────────
            "sign_off": {
                "model_owner": {"name": "", "date": "", "signature": ""},
                "model_validator": {"name": validator_name, "date": "", "signature": ""},
                "chief_risk_officer": {"name": "", "date": "", "signature": ""},
                "internal_audit": {"name": "", "date": "", "signature": ""},
            },
        }

        # Overall verdict
        report["overall_verdict"] = self._compute_verdict(
            validation_results, backtest_results
        )

        # Save
        report_path = os.path.join(
            self.output_dir,
            f"validation_report_{model_name}_{report_id}.json"
        )
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2, default=str)

        logger.info(
            f"Validation Report generated: {report_path} "
            f"— Verdict: {report['overall_verdict']['status']}"
        )

        return report

    def _build_executive_summary(
        self, model_name, model_version, validation, backtest, cc
    ) -> Dict:
        """Construit le résumé exécutif."""
        disc = validation.get("discrimination", {})
        auc = disc.get("auc", 0)
        gini = disc.get("gini", 0)

        status = validation.get("overall_assessment", {}).get("status", "UNKNOWN")

        return {
            "model_name": model_name,
            "model_version": model_version,
            "validation_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "key_metrics": {
                "auc": auc,
                "gini": gini,
                "ks": disc.get("ks_statistic", 0),
                "brier": validation.get("calibration", {}).get("brier_score", 0),
            },
            "validation_status": status,
            "summary": (
                f"Le modèle {model_name} v{model_version} a été soumis à une "
                f"validation complète couvrant la discrimination (AUC={auc:.4f}), "
                f"la calibration et la stabilité. "
                f"Verdict : {status}."
            ),
        }

    def _extract_discrimination(self, results: Dict) -> Dict:
        disc = results.get("discrimination", {})
        return {
            "auc_roc": disc.get("auc"),
            "gini_coefficient": disc.get("gini"),
            "ks_statistic": disc.get("ks_statistic"),
            "auc_status": disc.get("auc_status"),
            "gini_status": disc.get("gini_status"),
            "ks_status": disc.get("ks_status"),
        }

    def _extract_calibration(self, results: Dict) -> Dict:
        cal = results.get("calibration", {})
        return {
            "brier_score": cal.get("brier_score"),
            "brier_skill_score": cal.get("brier_skill_score"),
            "hosmer_lemeshow_p": cal.get("hl_p_value"),
            "hl_status": cal.get("hl_status"),
        }

    def _extract_stability(self, results: Dict) -> Dict:
        stab = results.get("stability", {})
        if isinstance(stab, str):
            return {"psi": stab}
        return {
            "psi": stab.get("psi"),
            "psi_status": stab.get("psi_status"),
        }

    def _auto_recommendations(self, validation, backtest) -> List[str]:
        """Génère des recommandations automatiques."""
        recommendations = []

        disc = validation.get("discrimination", {})
        if disc.get("auc", 0) < 0.70:
            recommendations.append(
                "CRITIQUE: AUC < 70%, le modèle nécessite une refonte/"
                "recalibration avant mise en production."
            )

        cal = validation.get("calibration", {})
        if cal.get("hl_status") == "FAIL":
            recommendations.append(
                "ATTENTION: Test Hosmer-Lemeshow échoué. "
                "Recalibration recommandée (Platt/Isotonic)."
            )

        stab = validation.get("stability", {})
        if isinstance(stab, dict) and stab.get("psi_status") == "CRITICAL":
            recommendations.append(
                "URGENT: PSI critique détecté. "
                "Vérifier la dérive des données et réentraîner si nécessaire."
            )

        if not recommendations:
            recommendations.append(
                "Aucune action corrective majeure identifiée. "
                "Poursuivre le monitoring régulier."
            )

        return recommendations

    def _compute_verdict(self, validation, backtest) -> Dict:
        """Calcul du verdict global."""
        disc = validation.get("discrimination", {})
        auc = disc.get("auc", 0)

        overall = validation.get("overall_assessment", {}).get("status", "UNKNOWN")

        if overall == "APPROVED":
            status = "APPROVED_FOR_PRODUCTION"
            color = "GREEN"
        elif overall == "CONDITIONAL":
            status = "APPROVED_WITH_CONDITIONS"
            color = "YELLOW"
        else:
            status = "NOT_APPROVED"
            color = "RED"

        return {
            "status": status,
            "color": color,
            "effective_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "next_review_date": "",  # À remplir par le CRO
            "conditions": [] if color == "GREEN" else [
                "Recalibration requise dans les 3 mois",
                "Monitoring renforcé (PSI mensuel)",
            ],
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    generator = ValidationReportGenerator()

    # Résultats fictifs
    validation_results = {
        "discrimination": {
            "auc": 0.7823,
            "gini": 0.5646,
            "ks_statistic": 0.3421,
            "auc_status": "PASS",
            "gini_status": "PASS",
            "ks_status": "PASS",
        },
        "calibration": {
            "brier_score": 0.0654,
            "brier_skill_score": 0.12,
            "hl_p_value": 0.23,
            "hl_status": "PASS",
        },
        "stability": {
            "psi": 0.04,
            "psi_status": "STABLE",
        },
        "overall_assessment": {"status": "APPROVED"},
    }

    report = generator.generate(
        model_name="PD_LightGBM",
        model_version="1.0.0",
        validation_results=validation_results,
    )

    print(f"\nRapport généré: {report['overall_verdict']['status']}")
