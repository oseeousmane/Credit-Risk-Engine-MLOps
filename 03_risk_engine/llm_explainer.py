"""
LLM Rationale Generator
=======================
Transforme les résultats bruts du modèle ML (SHAP drivers, PD Score, Imputation)
en texte en langage naturel compréhensible par un analyste ou un client.

Mode opératoire :
  - LLM_ENABLED=true + ANTHROPIC_API_KEY  → Claude API (claude-haiku-4-5) avec prompt caching
  - Sinon                                 → templates heuristiques déterministes (zéro hallucination)

Auteur : Octaix Credit Risk Team
Version : 2.0.0
"""

import os
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("llm_explainer")

# ── Vocabulaire SHAP → libellés humains (extrait de reason_codes.FEATURE_VOCABULARY_FR) ──
_VOCAB_FR: Dict[str, str] = {
    "EXT_SOURCE_1":              "score du bureau de crédit principal",
    "EXT_SOURCE_2":              "score du bureau de crédit secondaire",
    "EXT_SOURCE_3":              "score comportemental bureau",
    "EXT_SOURCE_MEAN":           "score composite des bureaux de crédit",
    "DEBT_TO_INCOME":            "ratio d'endettement",
    "CREDIT_TO_INCOME_RATIO":    "ratio crédit / revenus",
    "CREDIT_TO_ANNUITY_RATIO":   "ratio crédit / annuité",
    "BUREAU_CREDIT_UTILIZATION": "taux d'utilisation des lignes de crédit",
    "INST_LATE_PAYMENT_RATE":    "taux de retards de paiement",
    "DAYS_EMPLOYED":             "ancienneté dans l'emploi",
    "AMT_CREDIT":                "montant total du crédit demandé",
    "AMT_ANNUITY":               "charge de remboursement mensuelle",
    "AMT_INCOME_TOTAL":          "revenus déclarés",
    "DAYS_PAST_DUE":             "jours de retard actuel",
    "BUREAU_DAYS_CREDIT_MAX":    "durée maximale des crédits en cours",
    "FLAG_DOCUMENT_SUM":         "complétude du dossier documentaire",
    "NAME_EDUCATION_TYPE":       "niveau d'éducation",
    "AMT_GOODS_PRICE":           "valeur du bien financé",
}


class LLMRationaleGenerator:

    # Prompt système mis en cache — ne change pas entre les appels
    _SYSTEM_PROMPT = (
        "Tu es un expert en analyse de crédit bancaire pour des PME en zone CEMAC (Afrique centrale). "
        "Tu génères des explications de décision de crédit concises (2-4 phrases), "
        "claires pour un dirigeant non-financier, en français, sans jargon technique. "
        "Tu te bases UNIQUEMENT sur les données fournies — aucune invention. "
        "Tu ne mentionnes jamais les noms de features ML (SHAP, EXT_SOURCE, etc.). "
        "Tu utilises des termes métier (ratio d'endettement, historique de paiement, etc.)."
    )

    def __init__(self, use_real_llm: Optional[bool] = None):
        # use_real_llm=None → lecture de l'env var LLM_ENABLED
        if use_real_llm is None:
            use_real_llm = os.environ.get("LLM_ENABLED", "false").lower() == "true"
        self.use_real_llm = use_real_llm
        self._client = None

        if self.use_real_llm:
            api_key = os.environ.get("ANTHROPIC_API_KEY", "")
            if not api_key:
                logger.warning("[LLM] LLM_ENABLED=true mais ANTHROPIC_API_KEY absent — fallback heuristique.")
                self.use_real_llm = False
            else:
                try:
                    import anthropic
                    self._client = anthropic.Anthropic(api_key=api_key)
                    logger.info("[LLM] Claude API initialisée (claude-haiku-4-5, prompt caching ON).")
                except ImportError:
                    logger.warning("[LLM] anthropic SDK non installé — fallback heuristique.")
                    self.use_real_llm = False
        else:
            logger.info("[LLM] Mode heuristique (LLM_ENABLED non positionné).")

    def generate_rationale(
        self,
        pd_score: float,
        recommendation: str,
        risk_level: str,
        xai_drivers: List[Dict[str, Any]],
        imputed_count: int,
        feature_count: int,
    ) -> str:
        if self.use_real_llm and self._client is not None:
            try:
                return self._call_claude(pd_score, recommendation, risk_level, xai_drivers, imputed_count, feature_count)
            except Exception as e:
                logger.warning(f"[LLM] Appel Claude échoué ({e}) — fallback heuristique.")

        return self._generate_heuristic_rationale(
            pd_score, recommendation, risk_level, xai_drivers, imputed_count, feature_count
        )

    def _call_claude(
        self,
        pd_score: float,
        recommendation: str,
        risk_level: str,
        xai_drivers: List[Dict[str, Any]],
        imputed_count: int,
        feature_count: int,
    ) -> str:
        # Construire le résumé des drivers SHAP en langage naturel
        aggravating = [d for d in xai_drivers if d.get("direction") == "negative"][:3]
        mitigating  = [d for d in xai_drivers if d.get("direction") == "positive"][:2]

        def _label(d: Dict) -> str:
            return _VOCAB_FR.get(d.get("label", ""), d.get("label", "facteur inconnu"))

        agg_text = ", ".join(_label(d) for d in aggravating) if aggravating else "aucun facteur aggravant identifié"
        mit_text = ", ".join(_label(d) for d in mitigating)  if mitigating  else "aucun facteur atténuant identifié"
        quality_note = (
            f"ATTENTION : {imputed_count}/{feature_count} données manquantes extrapolées."
            if imputed_count / max(feature_count, 1) > 0.40 else ""
        )

        rec_labels = {
            "APPROVE":                 "Approuvé",
            "APPROVE_WITH_CONDITIONS": "Approuvé avec conditions",
            "SEND_TO_REVIEW":          "Envoyé en comité",
            "REJECT":                  "Refusé",
        }

        user_content = (
            f"Décision : {rec_labels.get(recommendation, recommendation)}\n"
            f"PD Score : {pd_score:.2f}% | Niveau de risque : {risk_level}\n"
            f"Facteurs aggravants : {agg_text}\n"
            f"Facteurs atténuants : {mit_text}\n"
            f"{quality_note}\n\n"
            "Génère une explication de décision en 2-4 phrases pour le dirigeant."
        )

        # Appel Claude avec prompt caching sur le system prompt (TTL 5 min)
        response = self._client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            system=[
                {
                    "type": "text",
                    "text": self._SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_content}],
        )
        return response.content[0].text.strip()

    def _generate_heuristic_rationale(
        self,
        pd_score: float,
        recommendation: str,
        risk_level: str,
        xai_drivers: List[Dict[str, Any]],
        imputed_count: int,
        feature_count: int,
    ) -> str:
        intro_map = {
            "APPROVE":                 f"Le dossier présente un profil très sain (PD : {pd_score:.2f}%).",
            "APPROVE_WITH_CONDITIONS": f"Le dossier est acceptable mais requiert des garanties (PD : {pd_score:.2f}%).",
            "SEND_TO_REVIEW":          f"Le profil de risque est élevé (niveau {risk_level}, PD : {pd_score:.2f}%). Une révision par le comité est exigée.",
            "REJECT":                  f"Le dossier dépasse l'appétence au risque de l'institution (PD : {pd_score:.2f}%).",
        }
        intro = intro_map.get(recommendation, f"Décision : {recommendation} (PD : {pd_score:.2f}%).")

        aggravating = [d for d in xai_drivers if d.get("direction") == "negative"]
        mitigating  = [d for d in xai_drivers if d.get("direction") == "positive"]

        factors = ""
        if aggravating:
            label = _VOCAB_FR.get(aggravating[0]["label"], aggravating[0]["label"])
            factors += f" Le principal facteur aggravant est le {label}."
        if mitigating:
            label = _VOCAB_FR.get(mitigating[0]["label"], mitigating[0]["label"])
            factors += f" Ce risque est partiellement compensé par le {label}."

        quality = ""
        ratio = imputed_count / max(feature_count, 1)
        if ratio > 0.40:
            quality = f" Attention : la qualité des données est critique ({imputed_count} variables extrapolées sur {feature_count}), ce qui réduit la fiabilité de cette recommandation."
        elif ratio > 0.10:
            quality = f" Note : {imputed_count} données manquantes ont été extrapolées par l'algorithme."

        return f"{intro}{factors}{quality}"
