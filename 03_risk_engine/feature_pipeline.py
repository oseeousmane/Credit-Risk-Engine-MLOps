"""
feature_pipeline.py
Centralized Feature Ingestion Engine for the Octaix Risk Engine.

Takes a raw business payload (Application + Counterparty + Financials) and
maps/derives the exact 157 features expected by pd_model_v2.

Feature Lineage is explicitly tracked in 3 categories:
  - RAW:     field provided directly in the business payload
  - DERIVED: computed from multiple raw business fields
  - IMPUTED: defaulted because source data was unavailable

IMPORTANT — Training-Serving Context:
  The current model (pd_model_v2) was trained on Home Credit consumer retail
  data. Corporate/SME business payloads are mapped to these features via
  domain heuristics. A high imputation rate (>60%) signals that the model is
  scoring in a distribution significantly different from its training regime.
  Quality band warnings should be surfaced to decision-makers accordingly.
"""
import importlib.util
import os
import sys
import pandas as pd
import numpy as np
import logging
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime

# ── EAD Model — loaded via file path because 02_modeling has a numeric prefix ─
_EAD_MODEL = None
try:
    _EAD_MODEL_FILE = os.path.join(
        os.path.dirname(__file__), "..", "02_modeling", "ead_model", "ead_model.py"
    )
    _spec = importlib.util.spec_from_file_location("ead_model_module", _EAD_MODEL_FILE)
    _ead_mod = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(_ead_mod)
    _EAD_MODEL = _ead_mod.EADModel()
    _EAD_RESULT_CLS = _ead_mod.EADResult
    del _spec, _ead_mod
except Exception as _e:
    logging.getLogger("feature_pipeline").warning(
        f"EADModel non disponible — fallback CCF=1.0 (term loan). Raison: {_e}"
    )

logger = logging.getLogger("feature_pipeline")


# ── Feature Schema : plages attendues pour validation pré-inférence ──────────
# Ces plages sont calibrées sur le dataset d'entraînement (Home Credit).
# Un feature hors plage déclenche un avertissement — pas un blocage.
FEATURE_SCHEMA: Dict[str, Tuple[float, float]] = {
    # Scores externes : normalisés 0-1
    "EXT_SOURCE_1":              (0.0,   1.0),
    "EXT_SOURCE_2":              (0.0,   1.0),
    "EXT_SOURCE_3":              (0.0,   1.0),
    "EXT_SOURCE_MEAN":           (0.0,   1.0),
    # Ratios financiers
    "DEBT_TO_INCOME":            (0.0,   5.0),
    "CREDIT_TO_INCOME_RATIO":    (0.0,  20.0),
    "CREDIT_TO_ANNUITY_RATIO":   (0.0, 120.0),
    "BUREAU_CREDIT_UTILIZATION": (0.0,   1.0),
    # Jours (négatifs = actif, convention Home Credit)
    "DAYS_EMPLOYED":             (-40000.0, 0.0),
    "DAYS_REGISTRATION":         (-30000.0, 0.0),
    # Taux de retard
    "INST_LATE_PAYMENT_RATE":    (0.0,   1.0),
    "INST_MEAN_DAYS_LATE":       (0.0, 365.0),
    "POS_SK_DPD_MEAN":           (0.0, 365.0),
    # Montants (en unités absolues après conversion millions→unités)
    "AMT_CREDIT":                (0.0, 1e9),
    "AMT_INCOME_TOTAL":          (0.0, 1e9),
    "AMT_ANNUITY":               (0.0, 1e8),
}

# Seuil d'imputation au-delà duquel on considère le payload insuffisant
# pour une décision ML fiable sans superviseur humain
IMPUTATION_HARD_FLOOR = 0.70  # >70% features imputées → qualité CRITIQUE

# Champs critiques dont l'imputation est interdite par FEATURE_CONTRACT.json
# (canonical_feature_definitions: "imputation_allowed": false)
CRITICAL_NON_NULLABLE_FIELDS = [
    "EXT_SOURCE_1", "EXT_SOURCE_2", "EXT_SOURCE_3",
    "DEBT_TO_INCOME", "DAYS_EMPLOYED",
    "AMT_CREDIT", "AMT_INCOME_TOTAL", "BUREAU_CREDIT_UTILIZATION",
]

# Seuils de bandes qualité alignés sur FEATURE_CONTRACT.json (quality_bands)
#   HIGH   : <= 15 features imputées (9.5% de 157)
#   MEDIUM : <= 63 features imputées (40.1% de 157)
#   LOW    : > 63 features imputées
QUALITY_BAND_HIGH_MAX_IMPUTED = 15
QUALITY_BAND_MEDIUM_MAX_IMPUTED = 63

# ── Feature Schema ────────────────────────────────────────────────────────────
EXPECTED_FEATURES = [
    "NAME_CONTRACT_TYPE","CODE_GENDER","FLAG_OWN_CAR","FLAG_OWN_REALTY",
    "AMT_INCOME_TOTAL","AMT_CREDIT","AMT_ANNUITY","AMT_GOODS_PRICE",
    "NAME_TYPE_SUITE","NAME_INCOME_TYPE","NAME_EDUCATION_TYPE","NAME_FAMILY_STATUS",
    "NAME_HOUSING_TYPE","REGION_POPULATION_RELATIVE","DAYS_EMPLOYED","DAYS_REGISTRATION",
    "OCCUPATION_TYPE","CNT_FAM_MEMBERS","WEEKDAY_APPR_PROCESS_START","ORGANIZATION_TYPE",
    "EXT_SOURCE_1","EXT_SOURCE_2","EXT_SOURCE_3",
    "APARTMENTS_AVG","BASEMENTAREA_AVG","YEARS_BEGINEXPLUATATION_AVG","ELEVATORS_AVG",
    "ENTRANCES_AVG","FLOORSMAX_AVG","LANDAREA_AVG","LIVINGAREA_AVG","NONLIVINGAREA_AVG",
    "APARTMENTS_MODE","BASEMENTAREA_MODE","YEARS_BEGINEXPLUATATION_MODE","ELEVATORS_MODE",
    "ENTRANCES_MODE","FLOORSMAX_MODE","LANDAREA_MODE","LIVINGAREA_MODE","NONLIVINGAREA_MODE",
    "APARTMENTS_MEDI","BASEMENTAREA_MEDI","YEARS_BEGINEXPLUATATION_MEDI","ELEVATORS_MEDI",
    "ENTRANCES_MEDI","FLOORSMAX_MEDI","LANDAREA_MEDI","LIVINGAREA_MEDI","NONLIVINGAREA_MEDI",
    "HOUSETYPE_MODE","TOTALAREA_MODE","WALLSMATERIAL_MODE","EMERGENCYSTATE_MODE",
    "OBS_30_CNT_SOCIAL_CIRCLE","DEF_30_CNT_SOCIAL_CIRCLE","OBS_60_CNT_SOCIAL_CIRCLE",
    "DEF_60_CNT_SOCIAL_CIRCLE","DAYS_LAST_PHONE_CHANGE",
    "AMT_REQ_CREDIT_BUREAU_HOUR","AMT_REQ_CREDIT_BUREAU_DAY","AMT_REQ_CREDIT_BUREAU_WEEK",
    "AMT_REQ_CREDIT_BUREAU_MON","AMT_REQ_CREDIT_BUREAU_QRT","AMT_REQ_CREDIT_BUREAU_YEAR",
    "BUREAU_BUREAU_STATUS_ACTIVE_SUM","BUREAU_BUREAU_STATUS_BAD DEBT_SUM",
    "BUREAU_BUREAU_STATUS_CLOSED_SUM","BUREAU_BUREAU_STATUS_SOLD_SUM",
    "BUREAU_DAYS_CREDIT_COUNT","BUREAU_DAYS_CREDIT_MEAN","BUREAU_DAYS_CREDIT_MIN",
    "BUREAU_DAYS_CREDIT_MAX","BUREAU_DAYS_CREDIT_ENDDATE_MEAN","BUREAU_DAYS_CREDIT_ENDDATE_MIN",
    "BUREAU_AMT_CREDIT_SUM_SUM","BUREAU_AMT_CREDIT_SUM_MEAN","BUREAU_AMT_CREDIT_SUM_MAX",
    "BUREAU_AMT_CREDIT_SUM_DEBT_SUM","BUREAU_AMT_CREDIT_SUM_DEBT_MEAN","BUREAU_AMT_CREDIT_SUM_DEBT_MAX",
    "BUREAU_AMT_CREDIT_SUM_OVERDUE_SUM","BUREAU_AMT_CREDIT_SUM_OVERDUE_MEAN",
    "BUREAU_AMT_CREDIT_SUM_LIMIT_SUM","BUREAU_AMT_CREDIT_SUM_LIMIT_MEAN",
    "BUREAU_DAYS_CREDIT_UPDATE_MEAN","BUREAU_DAYS_CREDIT_UPDATE_MIN","BUREAU_CNT_CREDIT_PROLONG_SUM",
    "BUREAU_AMT_ANNUITY_SUM","BUREAU_CREDIT_UTILIZATION",
    "PREV_PREV_APPROVED_FLAG_SUM","PREV_PREV_REFUSED_FLAG_SUM","PREV_PREV_CANCELED_FLAG_SUM",
    "PREV_AMT_CREDIT_SUM","PREV_AMT_CREDIT_MEAN","PREV_AMT_CREDIT_MAX",
    "PREV_AMT_APPLICATION_SUM","PREV_AMT_APPLICATION_MEAN",
    "PREV_AMT_ANNUITY_SUM","PREV_AMT_ANNUITY_MEAN",
    "PREV_AMT_DOWN_PAYMENT_SUM","PREV_AMT_DOWN_PAYMENT_MEAN",
    "PREV_AMT_GOODS_PRICE_SUM","PREV_AMT_GOODS_PRICE_MEAN",
    "PREV_DAYS_DECISION_MEAN","PREV_DAYS_DECISION_MIN","PREV_DAYS_DECISION_MAX",
    "PREV_CNT_PAYMENT_MEAN","PREV_CNT_PAYMENT_SUM",
    "PREV_DAYS_FIRST_DRAWING_MEAN","PREV_DAYS_FIRST_DUE_MEAN","PREV_DAYS_LAST_DUE_MEAN",
    "PREV_APP_COUNT",
    "INST_MEAN_DAYS_LATE","INST_MAX_DAYS_LATE","INST_DAYS_LATE_SUM","INST_LATE_PAYMENT_RATE",
    "INST_IS_LATE_SUM","INST_PAYMENT_DIFF_MEAN","INST_PAYMENT_DIFF_MAX","INST_PAYMENT_DIFF_SUM",
    "INST_PAYMENT_RATIO_MEAN","INST_PAYMENT_RATIO_MIN",
    "INST_AMT_PAYMENT_SUM","INST_AMT_PAYMENT_MEAN","INST_AMT_INSTALMENT_SUM",
    "INST_AMT_INSTALMENT_MEAN","INST_NUM_INSTALMENT_NUMBER_MAX",
    "POS_SK_DPD_MEAN","POS_SK_DPD_MAX","POS_SK_DPD_DEF_MEAN","POS_SK_DPD_DEF_MAX",
    "POS_POS_COMPLETED_SUM","POS_POS_ACTIVE_SUM","POS_CNT_INSTALMENT_MEAN",
    "POS_CNT_INSTALMENT_MAX","POS_CNT_INSTALMENT_FUTURE_MEAN",
    "POS_MONTHS_BALANCE_COUNT","POS_MONTHS_BALANCE_MIN",
    "DAYS_EMPLOYED_ANOM","DEBT_TO_INCOME","CREDIT_TO_ANNUITY_RATIO",
    "CREDIT_TO_INCOME_RATIO","GOODS_CREDIT_DIFF","GOODS_CREDIT_RATIO",
    "AGE_YEARS","EMPLOYMENT_YEARS","EMPLOYMENT_TO_AGE_RATIO",
    "INCOME_PER_CHILD","INCOME_PER_FAMILY","REGISTRATION_YEARS","ID_PUBLISH_YEARS",
    "EXT_SOURCE_MEAN","EXT_SOURCE_STD","EXT_SOURCE_PRODUCT",
    "FLAG_DOCUMENT_SUM","FLAG_CONTACT_SUM",
]

# Sector → Internal Rating → EXT_SOURCE proxy
# These are domain heuristics: investment-grade sectors mapped to higher credit quality
_SECTOR_EXT_SOURCE_MAP = {
    "Technology":       0.62,
    "Finance":          0.58,
    "Healthcare":       0.60,
    "Energy":           0.50,
    "Mining":           0.45,
    "Agriculture":      0.42,
    "Real Estate":      0.48,
    "Construction":     0.40,
    "Retail":           0.44,
    "Manufacturing":    0.47,
    "Government":       0.72,
    "Telecommunications": 0.56,
}

_RATING_EXT_SOURCE_MAP = {
    "AAA": 0.85, "AA_PLUS": 0.82, "AA": 0.80, "AA_MINUS": 0.78,
    "A_PLUS": 0.74, "A": 0.72, "A_MINUS": 0.70,
    "BBB_PLUS": 0.64, "BBB": 0.60, "BBB_MINUS": 0.56,
    "BB_PLUS": 0.48, "BB": 0.44, "B": 0.36, "CCC": 0.22, "D": 0.10,
}

_RISK_LEVEL_MAP = {"LOW": 0, "MED": 1, "HIGH": 2, "CRITICAL": 3}


def validate_feature_vector(
    features: Dict[str, float],
    lineage: Dict[str, str],
    imputed_count: int,
    total_count: int,
) -> Dict[str, Any]:
    """
    Valide le vecteur de features pré-inférence.

    Contrôles :
    1. Plages attendues (FEATURE_SCHEMA) — hors plage = anomalie
    2. Taux d'imputation — seuil critique = IMPUTATION_HARD_FLOOR
    3. Cohérence des features dérivées clés (ratios non négatifs)

    Returns:
        Dict avec {violations, imputation_warning, critical_imputation,
                   schema_pass, n_violations}
    """
    violations: List[str] = []

    # 1. Validation des plages
    for feat, (lo, hi) in FEATURE_SCHEMA.items():
        val = features.get(feat)
        if val is not None and not (lo <= val <= hi):
            violations.append(
                f"{feat}={val:.4f} hors plage [{lo}, {hi}] "
                f"(lineage={lineage.get(feat, 'UNKNOWN')})"
            )

    # 2. Vérification des ratios non négatifs dérivés
    for ratio_feat in ["DEBT_TO_INCOME", "CREDIT_TO_INCOME_RATIO", "INST_LATE_PAYMENT_RATE"]:
        val = features.get(ratio_feat, 0.0)
        if val < 0:
            violations.append(f"{ratio_feat}={val:.4f} négatif — incohérence dérivation")

    # 3. Champs critiques imputés (FEATURE_CONTRACT.json: "imputation_allowed": false)
    imputed_critical = [
        f for f in CRITICAL_NON_NULLABLE_FIELDS
        if lineage.get(f) == "IMPUTED"
    ]
    if imputed_critical:
        violations.append(
            f"Champs critiques imputés non autorisés (FEATURE_CONTRACT.json): {imputed_critical}. "
            "Revue humaine obligatoire avant décision."
        )

    imputation_rate = imputed_count / max(total_count, 1)
    critical_imputation = imputation_rate >= IMPUTATION_HARD_FLOOR

    if critical_imputation:
        violations.append(
            f"Taux d'imputation CRITIQUE : {imputation_rate:.1%} >= {IMPUTATION_HARD_FLOOR:.0%}. "
            "Décision ML non fiable sans revue humaine."
        )

    if violations:
        for v in violations:
            logger.warning(f"[FeatureValidation] {v}")

    n_ext_sources_observed = sum(
        1 for f in ["EXT_SOURCE_1", "EXT_SOURCE_2", "EXT_SOURCE_3"]
        if lineage.get(f) in ("RAW", "DERIVED")
    )

    return {
        "schema_pass": len(violations) == 0,
        "n_violations": len(violations),
        "violations": violations,
        "imputation_rate": round(imputation_rate, 4),
        "critical_imputation": critical_imputation,
        "ext_sources_observed": n_ext_sources_observed,
    }


def build_feature_vector(payload: dict[str, Any]) -> dict:
    """
    Main entry point. Returns:
      - features: dict of {feature_name: value} (157 cols)
      - lineage: dict of {feature_name: 'RAW'|'DERIVED'|'IMPUTED'}
      - payload_quality_score: float 0.0-100.0
      - imputed_features: list of imputed feature names
    """
    raw: dict[str, Any] = {}
    derived: dict[str, Any] = {}
    imputed_names: list[str] = []

    # ── Unpack business payload ───────────────────────────────────────────────
    # EAD fields — payload may supply drawn_amount + credit_limit (revolving),
    # or just requested_amount (term loan where drawn == limit).
    _requested      = payload.get("requested_amount", 0)
    _drawn_m        = payload.get("drawn_amount", _requested)          # millions
    _limit_m        = payload.get("credit_limit", _requested)          # millions
    _product_type   = payload.get("product_type", "term_loan")
    _ccf_override   = payload.get("ccf_override")                      # optional float 0-1
    _app_id         = payload.get("application_id", "UNKNOWN")

    # CCF-adjusted EAD = Drawn + CCF × Undrawn  (Basel III Foundation IRB)
    if _EAD_MODEL is not None:
        _ead_result = _EAD_MODEL.compute(
            exposure_id=_app_id,
            drawn_amount=_drawn_m * 1_000_000,
            credit_limit=_limit_m * 1_000_000,
            product_type=_product_type,
            ccf_override=_ccf_override,
        )
        amt_credit  = _ead_result.ead_estimate          # EAD in absolute units
        _ead_dict   = _ead_result.to_dict()
    else:
        # Fallback: treat requested_amount as a fully drawn term loan (CCF = 1.0)
        amt_credit  = _requested * 1_000_000
        _ead_dict   = {
            "exposure_id": _app_id,
            "drawn_amount": amt_credit,
            "undrawn_amount": 0.0,
            "ccf_applied": 1.0,
            "ead_estimate": amt_credit,
            "product_type": _product_type,
            "estimation_method": "fallback_term_loan",
        }

    amt_income     = payload.get("revenue", 0) * 1_000_000 if payload.get("revenue") else None
    total_debt     = payload.get("total_debt", 0) * 1_000_000 if payload.get("total_debt") else None
    ebitda         = payload.get("ebitda", 0) * 1_000_000 if payload.get("ebitda") else None
    years_biz      = payload.get("years_in_business")
    sector         = payload.get("sector", "")
    rating         = payload.get("internal_rating", "BB")
    risk_level     = payload.get("risk_level", "MED")
    collateral_val = payload.get("collateral_value", 0) * 1_000_000 if payload.get("collateral_value") else None
    tenor_months   = payload.get("tenor_months", 60)
    watchlist      = payload.get("watchlist_flag", False)
    # exposure reflects the CCF-adjusted EAD for bureau signal derivations
    exposure       = amt_credit

    # ── RAW: Direct business-to-feature mappings ──────────────────────────────
    raw["AMT_CREDIT"] = amt_credit
    raw["AMT_GOODS_PRICE"] = collateral_val if collateral_val else amt_credit * 0.9

    if amt_income:
        raw["AMT_INCOME_TOTAL"] = amt_income
    if years_biz:
        raw["DAYS_EMPLOYED"] = -abs(years_biz * 365)  # Negative = active employment convention
        raw["DAYS_REGISTRATION"] = -abs(years_biz * 365)
        raw["EMPLOYMENT_YEARS"] = float(years_biz)

    # Contract type: corporate loans mapped to "Cash loans" proxy
    raw["NAME_CONTRACT_TYPE"] = 0.0  # Encoded: 0=Cash loans
    raw["NAME_INCOME_TYPE"] = 1.0    # Encoded: 1=Commercial associate / corporate
    raw["ORGANIZATION_TYPE"] = float(_RISK_LEVEL_MAP.get(risk_level, 1))

    # ── DERIVED: Computed from raw inputs ─────────────────────────────────────
    if amt_income and total_debt:
        dti = total_debt / amt_income if amt_income > 0 else 0.35
        derived["DEBT_TO_INCOME"] = min(dti, 5.0)
    if amt_income and amt_credit:
        derived["CREDIT_TO_INCOME_RATIO"] = amt_credit / amt_income if amt_income > 0 else 1.5
    if tenor_months and tenor_months > 0 and amt_credit:
        annuity = amt_credit / tenor_months
        derived["AMT_ANNUITY"] = annuity
        derived["CREDIT_TO_ANNUITY_RATIO"] = amt_credit / annuity if annuity > 0 else 0.0
    if collateral_val and amt_credit:
        diff = collateral_val - amt_credit
        ratio = collateral_val / amt_credit if amt_credit > 0 else 1.0
        derived["GOODS_CREDIT_DIFF"] = diff
        derived["GOODS_CREDIT_RATIO"] = ratio

    # EXT_SOURCE proxies from internal rating and sector (domain-calibrated)
    ext1 = _RATING_EXT_SOURCE_MAP.get(rating, 0.50)
    ext2 = _SECTOR_EXT_SOURCE_MAP.get(sector, 0.50)
    ext3 = 0.35 if watchlist else ext1 * 0.95  # Watchlist degrades quality
    derived["EXT_SOURCE_1"] = ext1
    derived["EXT_SOURCE_2"] = ext2
    derived["EXT_SOURCE_3"] = ext3
    derived["EXT_SOURCE_MEAN"] = float(np.mean([ext1, ext2, ext3]))
    derived["EXT_SOURCE_STD"] = float(np.std([ext1, ext2, ext3]))
    derived["EXT_SOURCE_PRODUCT"] = float(ext1 * ext2 * ext3)

    if years_biz:
        age_proxy = max(years_biz + 35, 40)
        derived["AGE_YEARS"] = float(age_proxy)
        derived["EMPLOYMENT_TO_AGE_RATIO"] = years_biz / age_proxy if age_proxy > 0 else 0.0

    # Bureau signals derived from risk profile
    risk_idx = _RISK_LEVEL_MAP.get(risk_level, 1)
    derived["BUREAU_CREDIT_UTILIZATION"] = min(0.20 + risk_idx * 0.15, 0.95)
    derived["BUREAU_AMT_CREDIT_SUM_SUM"] = exposure * 0.8
    derived["BUREAU_AMT_CREDIT_SUM_DEBT_SUM"] = total_debt if total_debt else exposure * 0.4

    # PD-linked instalment quality
    pd_input = payload.get("pd_current", 2.0)
    derived["INST_LATE_PAYMENT_RATE"] = min(pd_input / 100.0 * 2, 0.5)
    derived["INST_MEAN_DAYS_LATE"] = max(0.0, pd_input * 0.5)
    derived["POS_SK_DPD_MEAN"] = max(0.0, pd_input * 0.3)

    # ── Assemble final vector, track lineage ──────────────────────────────────
    features_out: dict[str, float] = {}
    lineage: dict[str, str] = {}

    # Safe scalar defaults per feature group
    _SAFE_DEFAULTS = {
        "FLAG_OWN_CAR": 0.0, "FLAG_OWN_REALTY": 0.0,
        "NAME_TYPE_SUITE": 0.0, "NAME_EDUCATION_TYPE": 1.0,
        "NAME_FAMILY_STATUS": 0.0, "NAME_HOUSING_TYPE": 0.0,
        "REGION_POPULATION_RELATIVE": 0.02, "OCCUPATION_TYPE": 0.0,
        "CNT_FAM_MEMBERS": 2.0, "WEEKDAY_APPR_PROCESS_START": 2.0,
        "CODE_GENDER": 0.0, "DAYS_EMPLOYED_ANOM": 0.0,
        "FLAG_DOCUMENT_SUM": 3.0, "FLAG_CONTACT_SUM": 2.0,
    }

    for feat in EXPECTED_FEATURES:
        if feat in raw:
            features_out[feat] = float(raw[feat])
            lineage[feat] = "RAW"
        elif feat in derived:
            features_out[feat] = float(derived[feat])
            lineage[feat] = "DERIVED"
        elif feat in _SAFE_DEFAULTS:
            features_out[feat] = float(_SAFE_DEFAULTS[feat])
            lineage[feat] = "IMPUTED"
            imputed_names.append(feat)
        else:
            features_out[feat] = 0.0
            lineage[feat] = "IMPUTED"
            imputed_names.append(feat)

    # ── Payload quality score ─────────────────────────────────────────────────
    n_total = len(EXPECTED_FEATURES)
    n_raw = sum(1 for v in lineage.values() if v == "RAW")
    n_derived = sum(1 for v in lineage.values() if v == "DERIVED")
    n_imputed = len(imputed_names)
    n_real = n_raw + n_derived
    payload_quality_score = round((n_real / n_total) * 100, 1)

    # Bandes : alignées sur FEATURE_CONTRACT.json quality_bands (max_imputed_features)
    #   HIGH   : <= 15 imputées  (≈ 9.5%)
    #   MEDIUM : <= 63 imputées  (≈ 40.1%)
    #   LOW    : > 63 imputées
    if n_imputed <= QUALITY_BAND_HIGH_MAX_IMPUTED:
        quality_band = "HIGH"
    elif n_imputed <= QUALITY_BAND_MEDIUM_MAX_IMPUTED:
        quality_band = "MEDIUM"
    else:
        quality_band = "LOW"

    # ── Validation pré-inférence (schema + cohérence) ────────────────────────
    validation_report = validate_feature_vector(
        features=features_out,
        lineage=lineage,
        imputed_count=n_imputed,
        total_count=n_total,
    )

    return {
        "features": features_out,
        "lineage": lineage,
        "payload_quality_score": payload_quality_score,
        "quality_band": quality_band,
        "imputed_features": imputed_names,
        "raw_count": n_raw,
        "derived_count": n_derived,
        "imputed_count": n_imputed,
        # Validation report : exposé dans la réponse scoring pour audit trail
        "schema_validation": validation_report,
        # EAD computation audit (CCF method, drawn/undrawn breakdown)
        "ead_computation": _ead_dict,
    }
