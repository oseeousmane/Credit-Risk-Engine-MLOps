from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import secrets
import hashlib
import numpy as np
import pandas as pd
import logging
import joblib
import json
import shap
import os

try:
    from .feature_pipeline import build_feature_vector, EXPECTED_FEATURES
except ImportError:  # Allows `cd 03_risk_engine && uvicorn main:app` during local work.
    from feature_pipeline import build_feature_vector, EXPECTED_FEATURES

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("risk_engine_api")

app = FastAPI(
    title="Octaix Risk Engine - ML Inference API",
    description="Canonical Python API for PD scoring, SHAP explainability, and feature lineage.",
    version="3.0.0",
)

# ── API Key Auth ──────────────────────────────────────────────────────────────
# Set SCORING_API_KEY env var in production. If absent: dev/open mode with a warning.
# NestJS sends this key in the X-Api-Key header (configured via SCORING_API_KEY).
SCORING_API_KEY: str = os.environ.get("SCORING_API_KEY", "")

def _verify_api_key(x_api_key: Optional[str] = Header(default=None, alias="X-Api-Key")):
    if not SCORING_API_KEY:
        logger.warning("[SECURITY] SCORING_API_KEY not set — /score is unauthenticated. Set SCORING_API_KEY in production.")
        return
    if not x_api_key or not secrets.compare_digest(x_api_key, SCORING_API_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing X-Api-Key header.")

# ── Request Counters (for /metrics endpoint) ─────────────────────────────────
_inference_count: int = 0
_fallback_count: int = 0
_error_count: int = 0

# ── Artifact Loading ──────────────────────────────────────────────────────────

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "02_modeling", "pd_model", "artifacts")
MODEL_PATH = os.path.join(MODEL_DIR, "pd_model_v2.pkl")
MODEL_METADATA_PATH = os.path.join(MODEL_DIR, "pd_model_v2_metadata.json")

model = None
explainer = None
model_version_tag = "fallback_rule_engine_v1"
model_type = "unavailable"
model_artifact_sha256: str = ""
model_categorical_features: list = []


def _compute_file_sha256(path: str) -> str:
    """SHA-256 fingerprint of a file — used for artifact integrity verification."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


@app.on_event("startup")
def load_model_artifacts():
    global model, explainer, model_version_tag, model_type, model_artifact_sha256, model_categorical_features
    try:
        if os.path.exists(MODEL_PATH):
            # ── Integrity check: compute artifact SHA-256 before loading ──────
            computed_sha256 = _compute_file_sha256(MODEL_PATH)
            model_artifact_sha256 = computed_sha256

            # Compare against stored hash if metadata records one
            stored_sha256 = None
            if os.path.exists(MODEL_METADATA_PATH):
                with open(MODEL_METADATA_PATH, "r", encoding="utf-8") as f:
                    metadata = json.load(f)
                stored_sha256 = metadata.get("model_artifact_sha256")
                model_type = metadata.get("model_type", "ML_MODEL")
                model_categorical_features = metadata.get("categorical_features", [])
            else:
                model_type = type(joblib.load(MODEL_PATH)).__name__

            if stored_sha256 and stored_sha256 != computed_sha256:
                logger.error(
                    f"[INTEGRITY] ARTIFACT SHA-256 MISMATCH — "
                    f"expected={stored_sha256}, computed={computed_sha256}. "
                    "Model file may be corrupted or tampered. Refusing to load."
                )
                return  # Leave model=None → fallback mode, /ready returns 503

            if stored_sha256:
                logger.info(f"[INTEGRITY] Artifact SHA-256 verified: {computed_sha256[:16]}…")
            else:
                logger.warning(
                    f"[INTEGRITY] No stored SHA-256 in metadata — computed: {computed_sha256}. "
                    "Re-run training to embed the hash for future integrity checks."
                )

            model = joblib.load(MODEL_PATH)
            model_version_tag = f"{model_type.lower()}_pd_model_v2"
            # TreeExplainer needs the raw tree model, not a CalibratedClassifierCV wrapper.
            # Unwrap: CalibratedClassifierCV → FrozenEstimator → LightGBM/XGBoost
            _shap_target = model
            if hasattr(model, 'estimator'):
                _inner = model.estimator
                _shap_target = _inner.estimator if hasattr(_inner, 'estimator') else _inner
            explainer = shap.TreeExplainer(_shap_target)
            logger.info(f"Loaded {model_type} artifact and SHAP explainer ({len(EXPECTED_FEATURES)} features).")
        else:
            logger.error(f"Model artifact not found at {MODEL_PATH}. Fallback mode active.")
    except Exception as e:
        logger.error(f"Startup artifact loading failed: {str(e)}")


# ── Request / Response Types ──────────────────────────────────────────────────

class BusinessPayload(BaseModel):
    """Structured business payload from NestJS (domain-driven, not Kaggle-driven)."""
    application_id: str
    requested_amount: float = Field(..., description="Loan amount in millions USD")
    exposure: float = Field(default=0.0, description="Total counterparty exposure in millions")
    pd_current: float = Field(default=2.0, description="Current PD estimate %")
    risk_level: str = Field(default="MED")
    # Counterparty
    internal_rating: Optional[str] = None
    sector: Optional[str] = None
    years_in_business: Optional[int] = None
    watchlist_flag: Optional[bool] = False
    # Financials
    revenue: Optional[float] = None           # millions
    ebitda: Optional[float] = None            # millions
    total_debt: Optional[float] = None        # millions
    operating_cash_flow: Optional[float] = None
    # Facility
    collateral_value: Optional[float] = None  # millions
    collateral_type: Optional[str] = None
    tenor_months: Optional[int] = None
    facility_type: Optional[str] = None

class XAIDriver(BaseModel):
    label: str
    impact: float
    direction: str
    category: str

class FeatureLineageSummary(BaseModel):
    raw_count: int
    derived_count: int
    imputed_count: int
    payload_quality_score: float
    quality_band: str          # HIGH / MEDIUM / LOW
    imputed_features: List[str]

class SchemaValidationSummary(BaseModel):
    schema_pass: bool
    n_violations: int
    violations: List[str]
    imputation_rate: float
    critical_imputation: bool
    ext_sources_observed: int


class ScoreResponse(BaseModel):
    recommendation: str
    confidence: float
    pd_score: float
    pd_score_raw: float           # PD brute avant buffer — toujours enregistrée
    rationale: str
    xai_drivers: List[XAIDriver]
    model_version: str
    scored_by: str
    engine: str
    inference_timestamp: str
    inference_id: str
    # Quality / Lineage
    imputed_features_count: int
    payload_quality_score: float
    quality_band: str
    feature_lineage: FeatureLineageSummary
    # Schema validation (audit trail)
    schema_validation: SchemaValidationSummary


# ── ML Inference ──────────────────────────────────────────────────────────────

def run_model_inference(pipeline_result: dict, exposure: float):
    """Runs the loaded PD model on the fully assembled feature vector."""
    if model is None:
        raise ValueError("Model artifact not loaded.")

    features_dict = pipeline_result["features"]
    df = pd.DataFrame([features_dict])[EXPECTED_FEATURES]

    # Re-apply category dtype so LightGBM sees the same feature types as training
    for col in model_categorical_features:
        if col in df.columns:
            df[col] = df[col].astype('category')

    pd_score = float(model.predict_proba(df)[0][1] * 100)

    shap_values = explainer.shap_values(df)
    # SHAP >= 0.40 returns a list [class0_arr, class1_arr] for binary classifiers,
    # each of shape (n_samples, n_features). Use class 1 (default/positive).
    if isinstance(shap_values, list):
        shap_row = np.array(shap_values[1])[0]   # shape: (n_features,)
    else:
        shap_row = np.array(shap_values)[0]       # shape: (n_features,)

    drivers = []
    for feat_name, impact in zip(EXPECTED_FEATURES, shap_row):
        if abs(float(impact)) > 0.0001:
            lineage_tag = pipeline_result["lineage"].get(feat_name, "IMPUTED")
            drivers.append({
                "label": feat_name,
                "impact": float(impact),
                "direction": "negative" if impact > 0 else "positive",
                "category": lineage_tag,  # RAW / DERIVED / IMPUTED — explicit lineage in SHAP
            })

    drivers.sort(key=lambda x: abs(x["impact"]), reverse=True)
    return pd_score, drivers[:10]


def run_fallback_inference(req: BusinessPayload):
    """Explicit, auditable fallback when ML artifact is unavailable."""
    logger.warning("[FALLBACK] Executing explicit fallback rule engine. ML artifact unavailable.")
    risk_adj = {"LOW": -0.01, "MED": 0.0, "HIGH": 0.03, "CRITICAL": 0.08}
    pd_score = float(np.clip(req.pd_current + risk_adj.get(req.risk_level.upper(), 0.0), 0.01, 99.0))
    drivers = [{"label": "Rule: Risk Level", "impact": pd_score, "direction": "negative", "category": "FALLBACK"}]
    return pd_score, drivers


# ── Calibration Buffer (OOT_VALIDATION_PACK §4) ──────────────────────────────
# Le modèle sous-prédit légèrement en tail haute (ratio E/O = 0.87 pour PD > 10%).
# Un buffer conservateur est appliqué aux segments haute-risque UNIQUEMENT.
# La PD brute du modèle est CONSERVÉE dans le scoring snapshot pour l'audit.
# Le buffer n'affecte que la décision finale, pas la PD enregistrée.

CALIBRATION_BUFFER_HIGH_RISK = 1.15   # +15% sur PD > 6% (OOT_VALIDATION_PACK §4)
CALIBRATION_BUFFER_WATCH     = 1.08   # +8% sur PD 3.5–6% (tail modérée)


def _apply_calibration_buffer(pd_score: float) -> tuple[float, str]:
    """
    Applique le buffer de calibration conservateur sur les segments à risque élevé.
    Retourne (pd_buffered, buffer_note).

    La PD brute reste dans le scoring snapshot. Seule la décision utilise la PD bufferisée.
    """
    if pd_score > 6.0:
        buffered = min(pd_score * CALIBRATION_BUFFER_HIGH_RISK, 99.0)
        note = f"Buffer x{CALIBRATION_BUFFER_HIGH_RISK} appliqué (PD tail haute — OOT under-prediction)"
    elif pd_score > 3.5:
        buffered = min(pd_score * CALIBRATION_BUFFER_WATCH, 99.0)
        note = f"Buffer x{CALIBRATION_BUFFER_WATCH} appliqué (segment Watch)"
    else:
        buffered = pd_score
        note = ""
    return buffered, note


# ── Decision Policy ───────────────────────────────────────────────────────────

def apply_decision_policy(pd_score: float, exposure: float, risk_level: str, quality_band: str) -> tuple[str, float, str]:
    """
    Post-scoring policy.
    - La PD brute (pd_score) est CONSERVÉE dans le scoring snapshot pour l'audit.
    - Le buffer de calibration est appliqué avant la décision (non avant l'enregistrement).
    - La confidence est pénalisée par la qualité du payload — jamais la PD brute.

    Thresholds alignés avec DEMO_VS_PROD_BENCHMARK §5 :
      Elite  : PD < 0.8%  → Auto-Approve
      Core   : 0.8–3.5%   → Approve with conditions
      Watch  : 3.5–6.0%   → Committee Review
      Decline: > 6.0%     → Reject
    """
    base_confidence = 0.90
    # Confidence pénalisée par qualité payload — pas par la PD
    quality_penalty = {"HIGH": 0.0, "MEDIUM": 0.07, "LOW": 0.18}
    confidence = round(max(0.40, base_confidence - quality_penalty.get(quality_band, 0.0)), 2)

    # Appliquer le buffer sur la PD de décision (pas la PD enregistrée)
    pd_decision, buffer_note = _apply_calibration_buffer(pd_score)

    buffer_suffix = f" [{buffer_note}]" if buffer_note else ""

    # Thresholds alignés avec DEMO_VS_PROD_BENCHMARK §5
    if pd_decision <= 0.8 and exposure < 50:
        return (
            "APPROVE",
            confidence,
            f"Elite tier: PD ({pd_score:.2f}%) within auto-approve threshold.{buffer_suffix}",
        )
    elif pd_decision > 6.0:
        return (
            "REJECT",
            confidence,
            f"Decline tier: PD ({pd_score:.2f}%) exceeds maximum threshold "
            f"(decision PD with buffer: {pd_decision:.2f}%).{buffer_suffix}",
        )
    elif pd_decision > 3.5 or exposure > 100 or risk_level.upper() in ("HIGH", "CRITICAL"):
        return (
            "SEND_TO_REVIEW",
            confidence,
            f"Watch/elevated tier: PD ({pd_score:.2f}%) or exposure/risk level requires committee review.{buffer_suffix}",
        )
    else:
        return (
            "APPROVE_WITH_CONDITIONS",
            confidence,
            f"Core tier: PD ({pd_score:.2f}%) meets minimum criteria subject to covenant monitoring.{buffer_suffix}",
        )


# ── Main Endpoint ─────────────────────────────────────────────────────────────

@app.post("/score", response_model=ScoreResponse, dependencies=[Depends(_verify_api_key)])
async def score_application(req: BusinessPayload):
    global _inference_count, _fallback_count, _error_count
    _inference_count += 1
    logger.info(f"[Scoring] Application {req.application_id} received.")

    try:
        # 1. Build feature vector with full lineage tracking
        pipeline_result = build_feature_vector(req.dict())
        quality_band = pipeline_result["quality_band"]
        quality_score = pipeline_result["payload_quality_score"]

        logger.info(
            f"[FeaturePipeline] Quality={quality_band} ({quality_score:.1f}%) | "
            f"RAW={pipeline_result['raw_count']} DERIVED={pipeline_result['derived_count']} "
            f"IMPUTED={pipeline_result['imputed_count']}"
        )

        # 2. Inference
        is_fallback = False
        try:
            pd_score, xai_drivers = run_model_inference(pipeline_result, req.exposure)
            engine = f"PYTHON_{model_type.upper()}"
            scored_by = "ML_AUTO"
        except Exception as e:
            logger.error(f"[ML_INFERENCE] Failed: {str(e)}. Switching to explicit fallback.")
            pd_score, xai_drivers = run_fallback_inference(req)
            engine = "PYTHON_FALLBACK"
            scored_by = "RULE_ENGINE"
            is_fallback = True
            _fallback_count += 1

        # 3. Decision policy (raw PD preserved, confidence adjusted for quality)
        rec, confidence, rationale = apply_decision_policy(pd_score, req.exposure, req.risk_level, quality_band)

        if is_fallback:
            rationale = "[WARNING: FALLBACK ENGINE ACTIVE] " + rationale
        if quality_band == "LOW":
            rationale = f"[LOW DATA QUALITY — {pipeline_result['imputed_count']} features imputed] " + rationale

        lineage_summary = FeatureLineageSummary(
            raw_count=pipeline_result["raw_count"],
            derived_count=pipeline_result["derived_count"],
            imputed_count=pipeline_result["imputed_count"],
            payload_quality_score=quality_score,
            quality_band=quality_band,
            imputed_features=pipeline_result["imputed_features"][:20],  # Top 20 for snapshot
        )

        schema_val = pipeline_result.get("schema_validation", {
            "schema_pass": True, "n_violations": 0, "violations": [],
            "imputation_rate": pipeline_result["imputed_count"] / max(len(pipeline_result["features"]), 1),
            "critical_imputation": False, "ext_sources_observed": 0,
        })

        response = ScoreResponse(
            recommendation=rec,
            confidence=confidence,
            pd_score=pd_score,
            pd_score_raw=pd_score,          # PD brute conservée pour audit (buffer non appliqué ici)
            rationale=rationale,
            xai_drivers=[XAIDriver(**d) for d in xai_drivers],
            model_version=model_version_tag if not is_fallback else "rule_engine_v1",
            scored_by=scored_by,
            engine=engine,
            inference_timestamp=datetime.utcnow().isoformat(),
            inference_id=str(uuid.uuid4()),
            imputed_features_count=pipeline_result["imputed_count"],
            payload_quality_score=quality_score,
            quality_band=quality_band,
            feature_lineage=lineage_summary,
            schema_validation=SchemaValidationSummary(**schema_val),
        )

        logger.info(f"[Scoring] Done: {rec} | PD={pd_score:.2f}% | Engine={engine} | Quality={quality_band}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        _error_count += 1
        logger.error(f"[Scoring] Critical failure: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "engine": f"PYTHON_{model_type.upper()}" if model is not None else "PYTHON_FALLBACK",
        "feature_schema_version": "v2_157_features",
        "model_version": model_version_tag,
        "artifact_sha256": model_artifact_sha256[:16] + "…" if model_artifact_sha256 else None,
        "canonical_endpoint": "/score",
    }


@app.get("/ready")
async def ready():
    """
    Readiness probe — distinct from /health.
    Returns 503 until the model artifact is loaded and passes integrity check.
    Docker/k8s should gate traffic on this endpoint, not /health (liveness probe).
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model artifact not loaded. Service not ready to serve inference traffic.",
        )
    return {
        "status": "ready",
        "model_version": model_version_tag,
        "engine": f"PYTHON_{model_type.upper()}",
        "feature_count": len(EXPECTED_FEATURES),
        "artifact_sha256_prefix": model_artifact_sha256[:16] if model_artifact_sha256 else None,
    }


@app.get("/metrics")
async def metrics():
    """
    Operational counters for monitoring integration (MonitoringService.fetchAndIngestPythonMetrics).
    Returns real per-process counts — not simulated data.
    Counters reset on pod restart (stateless by design).
    """
    fallback_rate = _fallback_count / max(_inference_count, 1)
    error_rate = _error_count / max(_inference_count, 1)
    return {
        "model_loaded": model is not None,
        "model_version": model_version_tag,
        "model_type": model_type,
        "feature_count": len(EXPECTED_FEATURES),
        "inference_count": _inference_count,
        "fallback_count": _fallback_count,
        "error_count": _error_count,
        "fallback_rate": round(fallback_rate, 4),
        "error_rate": round(error_rate, 4),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
