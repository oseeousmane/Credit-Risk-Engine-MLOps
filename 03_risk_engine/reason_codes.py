"""
reason_codes.py
===============
Registre réglementaire des codes adverse action (refus de crédit).

Conformité :
  - COBAC (zone CEMAC) : obligation de motiver les refus de crédit
  - IFRS 9 §B5.5 : traçabilité des critères de détérioration
  - Basel III §452 : transparence des critères d'octroi
  - Directive RGPD-like locale : droit à l'explication

Structure d'un reason code :
  code          : identifiant réglementaire unique (RC_XXX)
  category      : famille de risque
  feature_keys  : features SHAP qui déclenchent ce code (pour mapping auto)
  fr            : libellé client en français (clair, non technique)
  en            : libellé client en anglais
  analyst_note  : note interne pour l'analyste (peut citer la feature)
  cobac_ref     : référence réglementaire COBAC si applicable
  severity      : PRIMARY | SECONDARY (PRIMARY = raison principale du refus)

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime


# ═══════════════════════════════════════════════════════════════════════
# REGISTRE DES REASON CODES
# ═══════════════════════════════════════════════════════════════════════

@dataclass
class ReasonCode:
    code: str
    category: str
    feature_keys: List[str]
    fr: str
    en: str
    analyst_note: str
    cobac_ref: str = ""
    severity: str = "PRIMARY"  # PRIMARY | SECONDARY


REASON_CODE_REGISTRY: List[ReasonCode] = [

    # ── CAPACITÉ DE REMBOURSEMENT ──────────────────────────────────────────────
    ReasonCode(
        code="RC_001",
        category="REPAYMENT_CAPACITY",
        feature_keys=["DEBT_TO_INCOME", "CREDIT_TO_INCOME_RATIO", "AMT_ANNUITY",
                      "CREDIT_TO_ANNUITY_RATIO", "INCOME_PER_FAMILY", "INCOME_PER_CHILD"],
        fr="Votre ratio d'endettement dépasse les seuils acceptables de la banque.",
        en="Your debt-to-income ratio exceeds the bank's acceptable thresholds.",
        analyst_note="DTI ou CREDIT_TO_INCOME_RATIO élevé — capacité de remboursement insuffisante.",
        cobac_ref="Règlement COBAC R-2010/01 — critères de solvabilité emprunteur",
        severity="PRIMARY",
    ),
    ReasonCode(
        code="RC_002",
        category="REPAYMENT_CAPACITY",
        feature_keys=["AMT_INCOME_TOTAL", "EMPLOYMENT_YEARS", "DAYS_EMPLOYED",
                      "EMPLOYMENT_TO_AGE_RATIO", "REGISTRATION_YEARS"],
        fr="Vos revenus ou votre stabilité professionnelle sont insuffisants pour couvrir les engagements demandés.",
        en="Your income or professional stability is insufficient to cover the requested commitments.",
        analyst_note="AMT_INCOME_TOTAL faible ou DAYS_EMPLOYED court — revenus insuffisants.",
        cobac_ref="Règlement COBAC R-2010/01 §3",
        severity="PRIMARY",
    ),
    ReasonCode(
        code="RC_003",
        category="REPAYMENT_CAPACITY",
        feature_keys=["AMT_CREDIT", "AMT_GOODS_PRICE", "GOODS_CREDIT_RATIO",
                      "GOODS_CREDIT_DIFF", "PREV_AMT_CREDIT_MAX"],
        fr="Le montant du crédit demandé est disproportionné par rapport à votre profil financier.",
        en="The requested loan amount is disproportionate to your financial profile.",
        analyst_note="AMT_CREDIT trop élevé vs revenus/collatéral.",
        severity="PRIMARY",
    ),

    # ── HISTORIQUE DE CRÉDIT ───────────────────────────────────────────────────
    ReasonCode(
        code="RC_010",
        category="CREDIT_HISTORY",
        feature_keys=["EXT_SOURCE_1", "EXT_SOURCE_2", "EXT_SOURCE_3", "EXT_SOURCE_MEAN",
                      "EXT_SOURCE_STD", "EXT_SOURCE_PRODUCT"],
        fr="Votre évaluation par les bureaux de crédit révèle un historique de crédit défavorable.",
        en="Your credit bureau assessment reveals an unfavorable credit history.",
        analyst_note="EXT_SOURCE_MEAN ou EXT_SOURCE_1/2/3 faibles — signal bureau externe négatif.",
        cobac_ref="Centrale des Risques BEAC — consultation obligatoire",
        severity="PRIMARY",
    ),
    ReasonCode(
        code="RC_011",
        category="CREDIT_HISTORY",
        feature_keys=["BUREAU_CREDIT_UTILIZATION", "BUREAU_AMT_CREDIT_SUM_SUM",
                      "BUREAU_AMT_CREDIT_SUM_DEBT_SUM", "BUREAU_AMT_CREDIT_SUM_OVERDUE_SUM",
                      "BUREAU_BUREAU_STATUS_BAD DEBT_SUM"],
        fr="Votre taux d'utilisation des crédits existants est trop élevé ou vous avez des impayés en cours.",
        en="Your existing credit utilization rate is too high or you have outstanding arrears.",
        analyst_note="BUREAU_CREDIT_UTILIZATION élevé ou BAD_DEBT_SUM > 0.",
        cobac_ref="Règlement COBAC R-2018/01 §5 — limite d'endettement",
        severity="PRIMARY",
    ),
    ReasonCode(
        code="RC_012",
        category="CREDIT_HISTORY",
        feature_keys=["BUREAU_DAYS_CREDIT_COUNT", "BUREAU_CNT_CREDIT_PROLONG_SUM",
                      "AMT_REQ_CREDIT_BUREAU_MON", "AMT_REQ_CREDIT_BUREAU_QRT",
                      "AMT_REQ_CREDIT_BUREAU_YEAR"],
        fr="Un nombre excessif de demandes de crédit récentes a été détecté.",
        en="An excessive number of recent credit inquiries has been detected.",
        analyst_note="AMT_REQ_CREDIT_BUREAU_* élevé — shopping crédit suspect.",
        severity="SECONDARY",
    ),

    # ── COMPORTEMENT DE PAIEMENT ───────────────────────────────────────────────
    ReasonCode(
        code="RC_020",
        category="PAYMENT_BEHAVIOR",
        feature_keys=["INST_LATE_PAYMENT_RATE", "INST_MEAN_DAYS_LATE", "INST_MAX_DAYS_LATE",
                      "INST_DAYS_LATE_SUM", "INST_IS_LATE_SUM"],
        fr="Votre historique de paiements révèle des retards fréquents ou significatifs.",
        en="Your payment history reveals frequent or significant delays.",
        analyst_note="INST_LATE_PAYMENT_RATE > 0.10 ou INST_MAX_DAYS_LATE élevé.",
        cobac_ref="Règlement COBAC R-2010/01 — critères de comportement",
        severity="PRIMARY",
    ),
    ReasonCode(
        code="RC_021",
        category="PAYMENT_BEHAVIOR",
        feature_keys=["POS_SK_DPD_MEAN", "POS_SK_DPD_MAX", "POS_SK_DPD_DEF_MEAN",
                      "POS_SK_DPD_DEF_MAX"],
        fr="Des retards de paiement récurrents ont été enregistrés sur vos contrats actifs.",
        en="Recurring payment delays have been recorded on your active contracts.",
        analyst_note="POS_SK_DPD_MEAN > 5 ou POS_SK_DPD_MAX > 30.",
        severity="PRIMARY",
    ),
    ReasonCode(
        code="RC_022",
        category="PAYMENT_BEHAVIOR",
        feature_keys=["INST_PAYMENT_RATIO_MEAN", "INST_PAYMENT_RATIO_MIN",
                      "INST_PAYMENT_DIFF_MEAN", "INST_PAYMENT_DIFF_MAX"],
        fr="Des écarts entre les paiements attendus et réels ont été identifiés.",
        en="Discrepancies between expected and actual payments have been identified.",
        analyst_note="INST_PAYMENT_RATIO_MIN faible — paiements partiels fréquents.",
        severity="SECONDARY",
    ),

    # ── APPLICATIONS PRÉCÉDENTES ───────────────────────────────────────────────
    ReasonCode(
        code="RC_030",
        category="PREVIOUS_APPLICATIONS",
        feature_keys=["PREV_PREV_REFUSED_FLAG_SUM", "PREV_PREV_CANCELED_FLAG_SUM",
                      "PREV_APP_COUNT"],
        fr="Plusieurs demandes de crédit précédentes ont été refusées ou annulées.",
        en="Several previous credit applications have been refused or cancelled.",
        analyst_note="PREV_REFUSED_FLAG_SUM > 1 — historique de refus.",
        severity="SECONDARY",
    ),

    # ── PROFIL DÉMOGRAPHIQUE / SITUATION PERSONNELLE ───────────────────────────
    ReasonCode(
        code="RC_040",
        category="PERSONAL_PROFILE",
        feature_keys=["AGE_YEARS", "CNT_FAM_MEMBERS", "NAME_FAMILY_STATUS",
                      "NAME_HOUSING_TYPE", "OBS_60_CNT_SOCIAL_CIRCLE", "DEF_60_CNT_SOCIAL_CIRCLE"],
        fr="Votre situation personnelle présente des facteurs de risque supplémentaires.",
        en="Your personal situation presents additional risk factors.",
        analyst_note="AGE_YEARS très jeune/vieux, famille nombreuse, ou cercle social à risque.",
        severity="SECONDARY",
    ),
    ReasonCode(
        code="RC_041",
        category="PERSONAL_PROFILE",
        feature_keys=["NAME_INCOME_TYPE", "OCCUPATION_TYPE", "ORGANIZATION_TYPE",
                      "DAYS_REGISTRATION", "ID_PUBLISH_YEARS", "FLAG_DOCUMENT_SUM"],
        fr="Des informations professionnelles ou documentaires insuffisantes ont été constatées.",
        en="Insufficient professional or documentary information has been found.",
        analyst_note="DAYS_REGISTRATION court, documents manquants ou occupation non vérifiable.",
        cobac_ref="Règlement COBAC R-2010/01 §2 — pièces justificatives",
        severity="SECONDARY",
    ),

    # ── QUALITÉ DES DONNÉES ────────────────────────────────────────────────────
    ReasonCode(
        code="RC_050",
        category="DATA_QUALITY",
        feature_keys=[],  # Déclenché par imputation_rate, pas par features SHAP
        fr="Le dossier est incomplet. Des informations essentielles sont manquantes pour évaluer votre demande.",
        en="The file is incomplete. Essential information is missing to assess your application.",
        analyst_note="Taux d'imputation > 70% — payload insuffisant pour décision ML fiable.",
        cobac_ref="Règlement COBAC R-2010/01 §2",
        severity="PRIMARY",
    ),

    # ── CONCENTRATION / EXPOSITION ─────────────────────────────────────────────
    ReasonCode(
        code="RC_060",
        category="EXPOSURE_LIMIT",
        feature_keys=["BUREAU_AMT_CREDIT_SUM_SUM", "BUREAU_AMT_ANNUITY_SUM",
                      "BUREAU_AMT_CREDIT_SUM_LIMIT_SUM"],
        fr="L'exposition totale dépasse les limites prudentielles de la banque.",
        en="The total exposure exceeds the bank's prudential limits.",
        analyst_note="Cumul bureaux élevé — dépassement plafond d'endettement.",
        cobac_ref="Règlement COBAC R-2018/01 §4 — grands risques",
        severity="PRIMARY",
    ),
]

# ── Index rapide feature → reason codes ──────────────────────────────────────
_FEATURE_TO_CODES: Dict[str, List[str]] = {}
for rc in REASON_CODE_REGISTRY:
    for feat in rc.feature_keys:
        _FEATURE_TO_CODES.setdefault(feat, []).append(rc.code)

_CODE_TO_RC: Dict[str, ReasonCode] = {rc.code: rc for rc in REASON_CODE_REGISTRY}


# ═══════════════════════════════════════════════════════════════════════
# GÉNÉRATEUR DE REASON CODES DEPUIS LES SHAP DRIVERS
# ═══════════════════════════════════════════════════════════════════════

def extract_reason_codes(
    xai_drivers: List[Dict[str, Any]],
    recommendation: str,
    imputed_count: int = 0,
    total_features: int = 157,
    max_codes: int = 5,
) -> List[Dict[str, str]]:
    """
    Extrait les reason codes réglementaires depuis les SHAP drivers.

    Algorithme :
    1. Pour chaque driver SHAP négatif (aggravant, impact > 0), chercher le reason code
    2. Dédupliquer : si plusieurs features pointent vers le même code, ne garder qu'un
    3. Trier par impact SHAP absolu décroissant
    4. Ajouter RC_050 (données) si taux d'imputation critique
    5. Limiter à max_codes reason codes

    Args:
        xai_drivers:    Liste de dicts {label, impact, direction, category}
        recommendation: 'REJECT' | 'SEND_TO_REVIEW' | 'APPROVE_WITH_CONDITIONS' | 'APPROVE'
        imputed_count:  Nombre de features imputées
        total_features: Nombre total de features (157)
        max_codes:      Nombre maximum de reason codes à retourner

    Returns:
        Liste de dicts {code, category, fr, en, analyst_note, cobac_ref, severity}
    """
    seen_codes: set = set()
    result: List[Dict[str, str]] = []

    # Filtrer les drivers aggravants (direction="negative" = augmente le risque)
    aggravating = [
        d for d in xai_drivers
        if d.get("direction") == "negative" and abs(d.get("impact", 0)) > 0.001
    ]
    aggravating.sort(key=lambda x: abs(x.get("impact", 0)), reverse=True)

    for driver in aggravating:
        feat = driver.get("label", "")
        codes = _FEATURE_TO_CODES.get(feat, [])
        for code in codes:
            if code not in seen_codes:
                rc = _CODE_TO_RC[code]
                result.append({
                    "code":          rc.code,
                    "category":      rc.category,
                    "fr":            rc.fr,
                    "en":            rc.en,
                    "analyst_note":  rc.analyst_note,
                    "cobac_ref":     rc.cobac_ref,
                    "severity":      rc.severity,
                    "trigger_feature": feat,
                    "shap_impact":   round(abs(driver.get("impact", 0)), 4),
                })
                seen_codes.add(code)
                if len(result) >= max_codes:
                    break
        if len(result) >= max_codes:
            break

    # Ajouter RC_050 si données insuffisantes (indépendamment des SHAP)
    imputation_rate = imputed_count / max(total_features, 1)
    if imputation_rate > 0.70 and "RC_050" not in seen_codes:
        rc50 = _CODE_TO_RC["RC_050"]
        result.append({
            "code":          rc50.code,
            "category":      rc50.category,
            "fr":            rc50.fr,
            "en":            rc50.en,
            "analyst_note":  f"Taux d'imputation: {imputation_rate:.0%}",
            "cobac_ref":     rc50.cobac_ref,
            "severity":      rc50.severity,
            "trigger_feature": "imputation_rate",
            "shap_impact":   0.0,
        })

    return result[:max_codes]


# ═══════════════════════════════════════════════════════════════════════
# GÉNÉRATEUR DE NOTICE ADVERSE ACTION (COBAC)
# ═══════════════════════════════════════════════════════════════════════

def generate_adverse_action_notice(
    application_id: str,
    recommendation: str,
    pd_score: float,
    reason_codes: List[Dict[str, str]],
    model_version: str = "pd_xgb_v1",
    lang: str = "fr",
    institution_name: str = "Octaix Credit Engine",
) -> Dict[str, Any]:
    """
    Génère une notice d'action adverse conforme COBAC.

    Applicable uniquement pour REJECT et SEND_TO_REVIEW.
    Pour APPROVE et APPROVE_WITH_CONDITIONS, retourne None.

    La notice contient :
    - Les raisons principales du refus (reason codes)
    - Les droits du demandeur (droit à l'explication, recours)
    - La référence réglementaire
    - La date et l'identifiant de la décision

    Args:
        lang: 'fr' (français, CEMAC) ou 'en'
    """
    if recommendation in ("APPROVE", "APPROVE_WITH_CONDITIONS"):
        return {}

    now = datetime.utcnow()
    primary_reasons   = [r for r in reason_codes if r.get("severity") == "PRIMARY"]
    secondary_reasons = [r for r in reason_codes if r.get("severity") == "SECONDARY"]

    if lang == "fr":
        notice = {
            "type":            "ADVERSE_ACTION_NOTICE",
            "application_id":  application_id,
            "decision":        "REFUS" if recommendation == "REJECT" else "DOSSIER EN RÉVISION",
            "decision_date":   now.strftime("%d/%m/%Y"),
            "decision_time":   now.strftime("%H:%M UTC"),
            "model_reference": model_version,
            "institution":     institution_name,

            "primary_reasons": [
                {"code": r["code"], "motif": r["fr"], "reference": r.get("cobac_ref", "")}
                for r in primary_reasons
            ],
            "secondary_factors": [
                {"code": r["code"], "facteur": r["fr"]}
                for r in secondary_reasons
            ],

            "client_rights": [
                "Vous avez le droit d'obtenir une explication détaillée de cette décision.",
                "Vous pouvez contacter votre chargé de clientèle pour discuter de votre dossier.",
                "Vous pouvez déposer un recours auprès de la direction de la banque dans un délai de 30 jours.",
                "Conformément à la réglementation COBAC, cette décision peut faire l'objet d'une révision.",
            ],

            "regulatory_basis": (
                "Cette décision est prise conformément au Règlement COBAC R-2010/01 "
                "relatif aux conditions d'exercice et de contrôle de l'activité de crédit "
                "dans la zone CEMAC."
            ),

            "data_notice": (
                "Les informations utilisées pour cette évaluation proviennent de votre dossier "
                "et des bureaux de crédit. Vous pouvez demander l'accès à ces données "
                "conformément à la législation en vigueur."
            ),

            "human_in_loop": (
                "Cette décision a été générée automatiquement par un système d'aide à la décision. "
                "Elle peut être révisée par un analyste crédit qualifié sur demande explicite."
                if recommendation == "SEND_TO_REVIEW" else
                "Cette décision peut être révisée par un analyste crédit qualifié sur demande explicite."
            ),
        }
    else:
        notice = {
            "type":            "ADVERSE_ACTION_NOTICE",
            "application_id":  application_id,
            "decision":        "DECLINED" if recommendation == "REJECT" else "UNDER REVIEW",
            "decision_date":   now.strftime("%Y-%m-%d"),
            "decision_time":   now.strftime("%H:%M UTC"),
            "model_reference": model_version,
            "institution":     institution_name,
            "primary_reasons": [
                {"code": r["code"], "reason": r["en"], "reference": r.get("cobac_ref", "")}
                for r in primary_reasons
            ],
            "secondary_factors": [
                {"code": r["code"], "factor": r["en"]}
                for r in secondary_reasons
            ],
            "client_rights": [
                "You have the right to obtain a detailed explanation of this decision.",
                "You may contact your relationship manager to discuss your application.",
                "You may lodge an appeal with bank management within 30 days.",
                "This decision may be subject to review per COBAC regulations.",
            ],
            "regulatory_basis": (
                "This decision is made in accordance with COBAC Regulation R-2010/01 "
                "governing credit activities in the CEMAC zone."
            ),
        }

    return notice


# ── Vocabulaire complet feature → libellé humain (157 features) ──────────────
# Utilisé par le LLM explainer pour la génération de texte.
FEATURE_VOCABULARY_FR: Dict[str, str] = {
    # Scores externes
    "EXT_SOURCE_1":              "le score du bureau de crédit principal",
    "EXT_SOURCE_2":              "le score externe sectoriel",
    "EXT_SOURCE_3":              "le score comportemental",
    "EXT_SOURCE_MEAN":           "le score moyen des bureaux de crédit",
    "EXT_SOURCE_STD":            "la dispersion des scores externes",
    "EXT_SOURCE_PRODUCT":        "l'indice composite de crédit",
    # Ratios financiers
    "DEBT_TO_INCOME":            "le ratio d'endettement (dette/revenus)",
    "CREDIT_TO_INCOME_RATIO":    "le ratio crédit/revenus",
    "CREDIT_TO_ANNUITY_RATIO":   "la durée effective de remboursement",
    "GOODS_CREDIT_RATIO":        "le rapport collatéral/crédit",
    "GOODS_CREDIT_DIFF":         "la couverture collatérale nette",
    # Revenus et emploi
    "AMT_INCOME_TOTAL":          "les revenus annuels déclarés",
    "AMT_CREDIT":                "le montant total du crédit",
    "AMT_ANNUITY":               "la charge de remboursement mensuelle",
    "AMT_GOODS_PRICE":           "la valeur du bien ou collatéral",
    "DAYS_EMPLOYED":             "l'ancienneté dans l'emploi actuel",
    "EMPLOYMENT_YEARS":          "les années d'expérience professionnelle",
    "EMPLOYMENT_TO_AGE_RATIO":   "la proportion de la vie active travaillée",
    "REGISTRATION_YEARS":        "l'ancienneté juridique de l'entreprise",
    "INCOME_PER_FAMILY":         "le revenu par membre de la famille",
    "INCOME_PER_CHILD":          "le revenu disponible par enfant",
    # Bureau de crédit
    "BUREAU_CREDIT_UTILIZATION": "le taux d'utilisation des crédits en cours",
    "BUREAU_AMT_CREDIT_SUM_SUM": "l'encours total de crédit bureau",
    "BUREAU_AMT_CREDIT_SUM_DEBT_SUM": "la dette totale bureau",
    "BUREAU_AMT_CREDIT_SUM_OVERDUE_SUM": "les impayés cumulés bureau",
    "BUREAU_BUREAU_STATUS_BAD DEBT_SUM": "le nombre de créances douteuses",
    "BUREAU_DAYS_CREDIT_COUNT":  "le nombre de lignes de crédit bureau",
    "BUREAU_CNT_CREDIT_PROLONG_SUM": "le nombre de prolongations accordées",
    "BUREAU_AMT_ANNUITY_SUM":    "les charges de remboursement bureau cumulées",
    # Applications précédentes
    "PREV_PREV_REFUSED_FLAG_SUM": "le nombre de refus antérieurs",
    "PREV_PREV_CANCELED_FLAG_SUM": "le nombre d'annulations antérieures",
    "PREV_APP_COUNT":            "le nombre de demandes précédentes",
    "PREV_AMT_CREDIT_MAX":       "le crédit maximum obtenu précédemment",
    # Comportement de paiement
    "INST_LATE_PAYMENT_RATE":    "le taux de paiements en retard",
    "INST_MEAN_DAYS_LATE":       "le retard moyen de paiement",
    "INST_MAX_DAYS_LATE":        "le retard maximum de paiement",
    "INST_DAYS_LATE_SUM":        "le cumul de jours de retard",
    "INST_IS_LATE_SUM":          "le nombre d'échéances en retard",
    "INST_PAYMENT_RATIO_MEAN":   "le ratio moyen de couverture des échéances",
    "INST_PAYMENT_RATIO_MIN":    "le ratio minimum de couverture des échéances",
    # POS/DPD
    "POS_SK_DPD_MEAN":           "le retard moyen de paiement POS",
    "POS_SK_DPD_MAX":            "le retard maximum de paiement POS",
    "POS_SK_DPD_DEF_MEAN":       "le défaut de paiement moyen",
    "POS_SK_DPD_DEF_MAX":        "le défaut de paiement maximum",
    # Profil personnel
    "AGE_YEARS":                 "l'âge du demandeur",
    "CNT_FAM_MEMBERS":           "la charge familiale",
    "NAME_INCOME_TYPE":          "le type de revenus déclaré",
    "OCCUPATION_TYPE":           "la profession exercée",
    "NAME_EDUCATION_TYPE":       "le niveau d'éducation",
    "NAME_HOUSING_TYPE":         "la situation de logement",
    "DAYS_REGISTRATION":         "l'ancienneté de la demande",
    "ID_PUBLISH_YEARS":          "l'ancienneté du document d'identité",
    "FLAG_DOCUMENT_SUM":         "le nombre de documents fournis",
    "FLAG_CONTACT_SUM":          "les informations de contact disponibles",
    "OBS_30_CNT_SOCIAL_CIRCLE":  "les incidents dans le cercle social (30j)",
    "DEF_30_CNT_SOCIAL_CIRCLE":  "les défauts dans le cercle social (30j)",
    "OBS_60_CNT_SOCIAL_CIRCLE":  "les incidents dans le cercle social (60j)",
    "DEF_60_CNT_SOCIAL_CIRCLE":  "les défauts dans le cercle social (60j)",
    # Enquêtes bureau
    "AMT_REQ_CREDIT_BUREAU_MON": "les enquêtes bureau ce mois",
    "AMT_REQ_CREDIT_BUREAU_QRT": "les enquêtes bureau ce trimestre",
    "AMT_REQ_CREDIT_BUREAU_YEAR": "les enquêtes bureau cette année",
}

FEATURE_VOCABULARY_EN: Dict[str, str] = {
    "EXT_SOURCE_1":              "primary credit bureau score",
    "EXT_SOURCE_2":              "secondary external score",
    "EXT_SOURCE_3":              "behavioral credit score",
    "EXT_SOURCE_MEAN":           "average credit bureau score",
    "DEBT_TO_INCOME":            "debt-to-income ratio",
    "CREDIT_TO_INCOME_RATIO":    "credit-to-income ratio",
    "CREDIT_TO_ANNUITY_RATIO":   "effective repayment duration",
    "AMT_INCOME_TOTAL":          "declared annual income",
    "AMT_CREDIT":                "total loan amount",
    "AMT_ANNUITY":               "monthly repayment obligation",
    "DAYS_EMPLOYED":             "tenure in current employment",
    "EMPLOYMENT_YEARS":          "years of professional experience",
    "BUREAU_CREDIT_UTILIZATION": "credit utilization rate",
    "BUREAU_AMT_CREDIT_SUM_OVERDUE_SUM": "total overdue bureau debt",
    "BUREAU_BUREAU_STATUS_BAD DEBT_SUM": "number of bad debt accounts",
    "INST_LATE_PAYMENT_RATE":    "late payment rate",
    "INST_MEAN_DAYS_LATE":       "average payment delay",
    "INST_MAX_DAYS_LATE":        "maximum payment delay",
    "POS_SK_DPD_MEAN":           "average days past due",
    "POS_SK_DPD_MAX":            "maximum days past due",
    "PREV_PREV_REFUSED_FLAG_SUM": "number of previous refusals",
    "AGE_YEARS":                 "applicant age",
    "FLAG_DOCUMENT_SUM":         "number of documents provided",
}
