from fastapi import FastAPI, HTTPException, Header, Depends, Response, Request
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
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

# Thread pool pour éviter le blocage de l'Event Loop FastAPI (ex: par SHAP TreeExplainer)
_ml_executor = ThreadPoolExecutor(max_workers=4)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("risk_engine_api")

try:
    from .feature_pipeline import build_feature_vector, EXPECTED_FEATURES
    from .llm_explainer import LLMRationaleGenerator
    from .reason_codes import extract_reason_codes, generate_adverse_action_notice
    from .segment_config import SegmentRouter, SEGMENT_REGISTRY
except ImportError:  # Allows `cd 03_risk_engine && uvicorn main:app` during local work.
    from feature_pipeline import build_feature_vector, EXPECTED_FEATURES
    from llm_explainer import LLMRationaleGenerator
    from reason_codes import extract_reason_codes, generate_adverse_action_notice
    from segment_config import SegmentRouter, SEGMENT_REGISTRY

_segment_router: Optional[SegmentRouter] = None

# Skew analyzer — chargé une seule fois au startup, non bloquant
_skew_analyzer = None
try:
    import sys as _sys
    _sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "02_modeling", "pd_model"))
    from skew_analyzer import SkewAnalyzer as _SkewAnalyzer
    _skew_analyzer = _SkewAnalyzer()
    logger.info("[SKEW] SkewAnalyzer chargé — monitoring training-serving skew actif.")
except Exception as _e:
    logger.warning(f"[SKEW] SkewAnalyzer non disponible : {_e}")

llm_explainer = LLMRationaleGenerator()  # mode piloté par LLM_ENABLED env var

app = FastAPI(
    title="Octaix Risk Engine - ML Inference API",
    description="Canonical Python API for PD scoring, SHAP explainability, and feature lineage.",
    version="3.0.0",
)

# ── API Key Auth ──────────────────────────────────────────────────────────────
# Set SCORING_API_KEY env var in production. If absent: dev/open mode with a warning.
# NestJS sends this key in the X-Api-Key header (configured via SCORING_API_KEY).
SCORING_API_KEY: str = os.environ.get("SCORING_API_KEY", "")
# Mode dev explicite : SCORING_DEV_MODE=true autorise l'absence de clé (CI, local)
# En production (SCORING_DEV_MODE absent ou false), la clé est OBLIGATOIRE au startup.
_SCORING_DEV_MODE: bool = os.environ.get("SCORING_DEV_MODE", "false").lower() == "true"

def _verify_api_key(x_api_key: Optional[str] = Header(default=None, alias="X-Api-Key")):
    if not SCORING_API_KEY:
        if _SCORING_DEV_MODE:
            # Mode dev explicitement activé — autorisé sans clé
            return
        # En production : refus strict si clé absente (configuré au startup)
        raise HTTPException(
            status_code=503,
            detail="SCORING_API_KEY not configured. Service not ready for production traffic."
        )
    if not x_api_key or not secrets.compare_digest(x_api_key, SCORING_API_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing X-Api-Key header.")

# ── Observabilité (Prometheus Metrics) ────────────────────────────────────────
scoring_requests_total = Counter("risk_engine_scoring_requests_total", "Total scoring requests", ["status"])
scoring_latency_seconds = Histogram("risk_engine_scoring_latency_seconds", "Latency of the ML inference pipeline")
pd_score_gauge = Gauge("risk_engine_pd_score", "Probability of Default scores generated")

# ── Request Counters (legacy) ────────────────────────────────────────────────
_inference_count: int = 0
_fallback_count: int = 0
_error_count: int = 0

# ── Rate Limiter par IP (protection indépendante de NestJS) ──────────────────
# NestJS a déjà un ThrottlerGuard, mais le service FastAPI doit se protéger
# indépendamment — un attaquant qui connaît l'API key peut appeler /score
# directement sans passer par NestJS.
# Limite : 30 requêtes/minute par IP (scoring intensif légitime reste en dessous).
import time as _time
from collections import defaultdict as _defaultdict

_rate_limit_store: dict = _defaultdict(list)   # IP → [timestamps]
_RATE_LIMIT_WINDOW_S = 60
_RATE_LIMIT_MAX_REQUESTS = 30

def _check_rate_limit(client_ip: str) -> None:
    """Vérifie et applique le rate limit par IP. Lève HTTPException(429) si dépassé."""
    now = _time.time()
    window_start = now - _RATE_LIMIT_WINDOW_S
    # Nettoyer les timestamps hors fenêtre
    _rate_limit_store[client_ip] = [
        ts for ts in _rate_limit_store[client_ip] if ts > window_start
    ]
    if len(_rate_limit_store[client_ip]) >= _RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: max {_RATE_LIMIT_MAX_REQUESTS} requests/minute per IP.",
            headers={"Retry-After": str(_RATE_LIMIT_WINDOW_S)},
        )
    _rate_limit_store[client_ip].append(now)

# ── Rolling buffer pour drift detection ──────────────────────────────────────
# Conserve les N derniers vecteurs de features pour le calcul du PSI en temps réel.
# Comparé contre TRAINING_REFERENCE_STATS (distributions Home Credit baseline).
# Taille choisie pour capturer ~1h de trafic à ~10 req/min.
_DRIFT_BUFFER_SIZE = 600
_recent_feature_vectors: list = []  # Liste de dicts {feature: value}

# ── Artifact Loading ──────────────────────────────────────────────────────────

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "02_modeling", "pd_model", "artifacts")

# ── Champion actif ────────────────────────────────────────────────────────────
# pd_xgb_v1 : XGBoost + IsotonicCalibration, 15 monotone constraints
# Gini=57.4%, AUC=0.787, KS=0.440 — Home Credit DEMO_BASELINE
# Remplace pd_model_v2 (LightGBM, best_iteration=3, inutilisable).
# Pour changer de champion : mettre à jour MODEL_ARTIFACT_NAME ci-dessous.
MODEL_ARTIFACT_NAME  = os.environ.get("MODEL_ARTIFACT_NAME", "pd_xgb_v1")
MODEL_PATH           = os.path.join(MODEL_DIR, f"{MODEL_ARTIFACT_NAME}.pkl")
MODEL_METADATA_PATH  = os.path.join(MODEL_DIR, f"{MODEL_ARTIFACT_NAME}_metadata.json")

# ── Shadow model (CHALLENGER en mode observation) ─────────────────────────────
# Positionner SHADOW_MODEL_ARTIFACT_NAME=pd_cemac_v1 pour activer le shadow scoring.
# Le shadow score n'influence PAS la décision — comparaison uniquement.
SHADOW_MODEL_ARTIFACT_NAME = os.environ.get("SHADOW_MODEL_ARTIFACT_NAME", "")
SHADOW_MODEL_PATH          = os.path.join(MODEL_DIR, f"{SHADOW_MODEL_ARTIFACT_NAME}.pkl") if SHADOW_MODEL_ARTIFACT_NAME else ""

model = None
explainer = None
model_version_tag = "fallback_rule_engine_v1"
model_type = "unavailable"
model_artifact_sha256: str = ""
model_categorical_features: list = []

# Shadow model slot — chargé au startup si SHADOW_MODEL_ARTIFACT_NAME est positionné
shadow_model = None
shadow_explainer = None
shadow_version_tag: str = ""


def _compute_file_sha256(path: str) -> str:
    """SHA-256 fingerprint of a file — used for artifact integrity verification."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


@app.on_event("startup")
def validate_security_config():
    """Vérification de sécurité au démarrage — refuse de démarrer sans clé en production."""
    if not SCORING_API_KEY and not _SCORING_DEV_MODE:
        raise RuntimeError(
            "[SECURITY] SCORING_API_KEY is not set and SCORING_DEV_MODE is not 'true'. "
            "Set SCORING_API_KEY env var in production, or set SCORING_DEV_MODE=true for local development. "
            "The service cannot start without authentication in production mode."
        )
    if not SCORING_API_KEY and _SCORING_DEV_MODE:
        logger.warning(
            "[SECURITY] Running in DEV MODE without API key authentication. "
            "NEVER deploy with SCORING_DEV_MODE=true in production."
        )

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
            model_version_tag = MODEL_ARTIFACT_NAME  # ex: "pd_xgb_v1"
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

    # ── Segment router ────────────────────────────────────────────────────────
    global _segment_router
    import os as _os
    _available = [
        f.replace(".pkl", "")
        for f in _os.listdir(MODEL_DIR)
        if f.endswith(".pkl")
    ] if _os.path.isdir(MODEL_DIR) else []
    _segment_router = SegmentRouter(available_artifacts=_available)
    logger.info(f"[SEGMENT] Router initialisé — {len(_available)} artefact(s) disponibles: {_available}")

    # ── Shadow model (optionnel) ───────────────────────────────────────────────
    global shadow_model, shadow_explainer, shadow_version_tag
    if SHADOW_MODEL_ARTIFACT_NAME and os.path.exists(SHADOW_MODEL_PATH):
        try:
            shadow_model = joblib.load(SHADOW_MODEL_PATH)
            shadow_version_tag = SHADOW_MODEL_ARTIFACT_NAME
            _s_target = shadow_model
            if hasattr(shadow_model, 'estimator'):
                _si = shadow_model.estimator
                _s_target = _si.estimator if hasattr(_si, 'estimator') else _si
            shadow_explainer = shap.TreeExplainer(_s_target)
            logger.info(f"[SHADOW] Shadow model loaded: {SHADOW_MODEL_ARTIFACT_NAME}")
        except Exception as _se:
            logger.warning(f"[SHADOW] Shadow model load failed: {_se} — shadow scoring disabled.")


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
    # ── IFRS 9 / Quant inputs (nouveaux) ──────────────────────────────────────
    pd_origination: Optional[float] = None    # PD à l'origination (%) — pour SICR
    effective_interest_rate: Optional[float] = None  # EIR contractuel (ex: 0.12 = 12%)
    days_past_due: Optional[int] = Field(default=0, description="Jours de retard actuels")
    is_restructured: Optional[bool] = False
    lgd_override: Optional[float] = None      # LGD fournie explicitement (0-1) — override le modèle
    historical_late_rate: Optional[float] = None  # Taux historique de retards (0-1)

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


class SkewAssessment(BaseModel):
    skew_status: str
    reliability_score: float
    n_critical: int
    n_warning: int
    critical_features: List[str]

class IFRS9Assessment(BaseModel):
    """Classification IFRS 9 + quant complet calculé en temps réel lors du scoring."""
    stage: int
    ecl_horizon: str
    ecl_provision: float
    lgd_estimate: float
    lgd_p05: Optional[float] = None     # Percentile 5% Monte-Carlo (intervalle de confiance)
    lgd_p95: Optional[float] = None     # Percentile 95% Monte-Carlo
    lgd_method: str
    lgd_sector_applied: Optional[str] = None  # Scalar sectoriel CEMAC utilisé
    ead_estimate: float
    eir_used: float
    rwa_estimate: Optional[float] = None      # Risk-Weighted Assets (Basel SA)
    rwa_method: Optional[str] = None
    sicr_triggered: bool
    staging_reasons: List[str]
    pd_origination_used: float
    staging_id: Optional[str] = None   # UUID de la décision — corrèle avec Ifrs9StagingAudit DB

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
    # Training-Serving Skew assessment (audit scientifique)
    skew_assessment: Optional[SkewAssessment] = None
    # IFRS 9 stage + ECL + LGD calculés en temps réel
    ifrs9: Optional[IFRS9Assessment] = None
    # Reason codes réglementaires COBAC (SHAP → libellés humains)
    reason_codes: Optional[List[Dict[str, Any]]] = None
    # Notice adverse action COBAC (refus / conditions uniquement)
    adverse_action_notice: Optional[Dict[str, Any]] = None
    # Shadow model comparison (CHALLENGER en observation — ne pas exposer au client final)
    shadow_pd_score: Optional[float] = None
    shadow_model_version: Optional[str] = None
    shadow_pd_delta: Optional[float] = None  # shadow_pd - champion_pd


# ── ML Inference ──────────────────────────────────────────────────────────────

def run_model_inference(pipeline_result: dict, exposure: float):
    """Runs the loaded PD model on the fully assembled feature vector."""
    if model is None:
        raise ValueError("Model artifact not loaded.")
    if explainer is None:
        raise ValueError("SHAP explainer not initialized — model artifact may be corrupted.")

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

def apply_decision_policy(pd_score: float, exposure: float, risk_level: str, quality_band: str, sector: str = "") -> tuple[str, float, str]:
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

    # --- MITIGATION : Segment sous-performant (Self-Employed) ---
    if sector and sector.strip().lower() in ["self-employed", "self_employed", "entrepreneur", "freelance"]:
        return (
            "SEND_TO_REVIEW",
            round(confidence * 0.8, 2),
            f"Segment Policy: 'Self-Employed' automatically routed to committee review due to known model underperformance (Gini < 45% floor). Original PD: {pd_score:.2f}%.",
        )

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
async def score_application(req: BusinessPayload, request: "Request"):
    start_time = time.time()
    global _inference_count, _fallback_count, _error_count
    _inference_count += 1

    correlation_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    logger.info(f"[Scoring] START app={req.application_id} correlation_id={correlation_id}")

    # Rate limiting par IP — indépendant du ThrottlerGuard NestJS
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    logger.info(f"[Scoring] Application {req.application_id} received from {client_ip}.")

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

        # 2. Inference (with ThreadPool and 1.5s P95 latency constraint)
        is_fallback = False
        try:
            loop = asyncio.get_running_loop()
            pd_score, xai_drivers = await asyncio.wait_for(
                loop.run_in_executor(_ml_executor, run_model_inference, pipeline_result, req.exposure),
                timeout=1.5
            )
            engine = f"PYTHON_{model_type.upper()}"
            scored_by = "ML_AUTO"
        except asyncio.TimeoutError:
            logger.error("[ML_INFERENCE] Timeout (>1.5s). SLA breached, switching to explicit fallback.")
            pd_score, xai_drivers = run_fallback_inference(req)
            engine = "PYTHON_FALLBACK"
            scored_by = "RULE_ENGINE"
            is_fallback = True
            _fallback_count += 1
        except Exception as e:
            logger.error(f"[ML_INFERENCE] Failed: {str(e)}. Switching to explicit fallback.")
            pd_score, xai_drivers = run_fallback_inference(req)
            engine = "PYTHON_FALLBACK"
            scored_by = "RULE_ENGINE"
            is_fallback = True
            _fallback_count += 1

        # 3. Decision policy (raw PD preserved, confidence adjusted for quality, explicit sector check)
        rec, confidence, _ = apply_decision_policy(
            pd_score, req.exposure, req.risk_level, quality_band, req.sector or ""
        )

        rationale = llm_explainer.generate_rationale(
            pd_score=pd_score,
            recommendation=rec,
            risk_level=req.risk_level,
            xai_drivers=xai_drivers,
            imputed_count=pipeline_result["imputed_count"],
            feature_count=len(pipeline_result["features"])
        )

        if is_fallback:
            rationale = "[WARNING: FALLBACK ENGINE ACTIVE] " + rationale

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

        # Training-Serving Skew assessment (non bloquant — erreur ignorée)
        skew_obj = None
        if _skew_analyzer is not None:
            try:
                skew_report = _skew_analyzer.analyze_inference_batch(
                    [pipeline_result["features"]]
                )
                skew_obj = SkewAssessment(
                    skew_status=skew_report["summary"]["overall_skew_status"],
                    reliability_score=float(skew_report["reliability_score"]),
                    n_critical=int(skew_report["n_critical_skew"]),
                    n_warning=int(skew_report["n_warning_skew"]),
                    critical_features=skew_report["critical_features"],
                )
                if skew_report["n_critical_skew"] >= 3:
                    logger.warning(
                        f"[SKEW] {skew_report['n_critical_skew']} features critiques — "
                        f"score PD potentiellement non fiable pour {req.application_id}."
                    )
            except Exception as _se:
                logger.debug(f"[SKEW] Assessment skipped: {_se}")

        # ── IFRS 9 staging + LGD + ECL en temps réel ─────────────────────────
        ifrs9_obj: Optional[IFRS9Assessment] = None
        try:
            from ifrs9_staging import IFRS9StagingEngine
            from expected_loss import ExpectedLossCalculator

            _ifrs9 = IFRS9StagingEngine()
            _el_calc = ExpectedLossCalculator(apply_pd_floor=True, apply_lgd_floor=True)

            # EAD en unités absolues (payload en millions → ×1M)
            _ead = req.exposure * 1_000_000 if req.exposure > 0 else req.requested_amount * 1_000_000

            # LGD : override explicite > LGDModelV2 > static 45%
            if req.lgd_override is not None:
                _lgd = float(req.lgd_override)
                _lgd_method = "lgd_override_explicit"
            else:
                # Mapper le secteur payload vers la nomenclature LGDModelV2
                _SECTOR_MAP = {
                    "oil": "OIL_GAS", "petroleum": "OIL_GAS", "mining": "MINING",
                    "agriculture": "AGRICULTURE", "transport": "TRANSPORT",
                    "construction": "CONSTRUCTION", "btp": "CONSTRUCTION",
                    "retail": "RETAIL", "telecom": "TELECOM", "banking": "BANKING",
                    "government": "GOVERNMENT", "utilities": "UTILITIES",
                    "manufacturing": "MANUFACTURING", "services": "SERVICES",
                }
                _sector_key = _SECTOR_MAP.get(
                    (req.sector or "").lower().split("/")[0].strip(), "UNKNOWN"
                )

            _el_result = _el_calc.compute(
                pd=pd_score / 100,
                ead=_ead,
                collateral_type=(req.collateral_type or "UNSECURED").lower(),
                collateral_value=(req.collateral_value or 0) * 1_000_000,
            )
            _lgd = _el_result.lgd
            _lgd_method = _el_calc.lgd_model_version

            # Monte-Carlo LGD (p05/p95) si LGDModelV2 disponible
            _lgd_p05 = _lgd_p95 = None
            if hasattr(_el_calc, "lgd_model") and _el_calc.lgd_model is not None:
                try:
                    if _el_calc.lgd_model_version == "two_part_beta_v2_cemac":
                        _v2_result = _el_calc.lgd_model.estimate(
                            exposure_id=req.application_id,
                            collateral_type=(req.collateral_type or "UNSECURED").lower(),
                            collateral_value=(req.collateral_value or 0) * 1_000_000,
                            ead=_ead,
                            sector=_sector_key,
                            run_montecarlo=True,
                        )
                        _lgd = _v2_result.lgd_point_estimate  # Avec scalar sectoriel
                        _lgd_p05 = _v2_result.lgd_p05
                        _lgd_p95 = _v2_result.lgd_p95
                        _lgd_method = f"two_part_beta_v2_cemac_sector={_sector_key}"
                except Exception as _mc_err:
                    logger.debug(f"[LGD_MC] Skipped: {_mc_err}")

            # PD origination : fournie ou estimée à partir de pd_current (conservative)
            _pd_orig = (req.pd_origination / 100) if req.pd_origination else (pd_score / 100 * 0.5)

            # EIR : contractuel si fourni, sinon référence BEAC
            _eir = req.effective_interest_rate if req.effective_interest_rate else None

            # Tenor (maturité résiduelle)
            _tenor_years = (req.tenor_months or 60) / 12

            _staging = _ifrs9.classify(
                exposure_id=req.application_id,
                pd_current=pd_score / 100,
                pd_origination=_pd_orig,
                lgd=_lgd,
                ead=_ead,
                days_past_due=req.days_past_due or 0,
                is_restructured=req.is_restructured or False,
                is_watchlisted=req.watchlist_flag or False,
                remaining_maturity_years=_tenor_years,
                effective_interest_rate=_eir,
            )

            # ── RWA Basel Standardised Approach ──────────────────────────────
            # Pondération en risque selon la catégorie d'exposition (Basel III SA §113-134).
            # Pour zone CEMAC (COBAC) : approche standardisée sans modèles internes.
            # Risk weights par segment :
            #   Corporate IG (unrated) : 100%  | BBB+ to BB- : 100%
            #   SME (< 1.5M EUR) : 75%         | Retail : 75%
            #   Immobilier résidentiel : 35%    | Défaut (Stage 3) : 150%
            _RW_BY_STAGE = {1: 1.00, 2: 1.00, 3: 1.50}  # Stage 3 = 150% (Basel §123)
            _rw = _RW_BY_STAGE.get(_staging.current_stage, 1.00)
            if req.collateral_type in ("RESIDENTIAL_REAL_ESTATE", "real_estate"):
                _rw = 0.35   # Hypothèque résidentielle (Basel §120)
            elif req.collateral_type in ("CASH", "cash_collateral"):
                _rw = 0.00   # Nantissement cash (Basel §117)
            _rwa = _ead * _rw
            _rwa_method = f"BASEL_SA_RW={_rw*100:.0f}%_STAGE{_staging.current_stage}"

            ifrs9_obj = IFRS9Assessment(
                stage=_staging.current_stage,
                ecl_horizon=_staging.ecl_horizon,
                ecl_provision=round(_staging.ecl_provision, 2),
                lgd_estimate=round(_lgd, 4),
                lgd_p05=round(_lgd_p05, 4) if _lgd_p05 is not None else None,
                lgd_p95=round(_lgd_p95, 4) if _lgd_p95 is not None else None,
                lgd_method=_lgd_method,
                lgd_sector_applied=_sector_key,
                ead_estimate=round(_ead, 2),
                eir_used=round(_eir or 0.08, 4),
                rwa_estimate=round(_rwa, 2),
                rwa_method=_rwa_method,
                sicr_triggered=_staging.sicr_triggered,
                staging_reasons=_staging.staging_reasons,
                pd_origination_used=round(_pd_orig, 6),
                staging_id=_staging.staging_id,
            )
            logger.info(
                f"[IFRS9] {req.application_id} → Stage {_staging.current_stage} | "
                f"ECL={_staging.ecl_provision:,.0f} | LGD={_lgd:.2%} ({_lgd_method})"
            )
        except Exception as _ifrs_err:
            logger.warning(f"[IFRS9] Calcul skipped: {_ifrs_err}")

        # ── Reason codes COBAC (SHAP → libellés réglementaires) ──────────────
        rc_list = extract_reason_codes(
            xai_drivers=xai_drivers,
            recommendation=rec,
            imputed_count=pipeline_result["imputed_count"],
            total_features=len(pipeline_result["features"]),
        )
        notice = None
        if rec in ("REJECT", "APPROVE_WITH_CONDITIONS", "SEND_TO_REVIEW"):
            notice = generate_adverse_action_notice(
                application_id=req.application_id,
                recommendation=rec,
                pd_score=pd_score,
                reason_codes=rc_list,
                model_version=model_version_tag if not is_fallback else "rule_engine_v1",
            )

        # ── Shadow scoring (CHALLENGER en observation) ────────────────────────
        shadow_pd: Optional[float] = None
        shadow_ver: Optional[str] = None
        if shadow_model is not None and not is_fallback:
            try:
                import pandas as _pd_lib
                X_shadow = _pd_lib.DataFrame([pipeline_result["features"]])[EXPECTED_FEATURES]
                shadow_pd = float(shadow_model.predict_proba(X_shadow)[0][1] * 100)
                shadow_ver = shadow_version_tag
                logger.info(
                    f"[SHADOW] app={req.application_id} "
                    f"champion={pd_score:.2f}% shadow={shadow_pd:.2f}% "
                    f"delta={shadow_pd - pd_score:+.2f}pp"
                )
            except Exception as _se:
                logger.warning(f"[SHADOW] Shadow scoring skipped: {_se}")

        response = ScoreResponse(
            recommendation=rec,
            confidence=confidence,
            pd_score=pd_score,
            pd_score_raw=pd_score,
            rationale=rationale,
            xai_drivers=[XAIDriver(**d) for d in xai_drivers],
            model_version=model_version_tag if not is_fallback else "rule_engine_v1",
            scored_by=scored_by,
            engine=engine,
            inference_timestamp=datetime.utcnow().isoformat(),
            inference_id=request.headers.get("X-Request-ID") or str(uuid.uuid4()),
            imputed_features_count=pipeline_result["imputed_count"],
            payload_quality_score=quality_score,
            quality_band=quality_band,
            feature_lineage=lineage_summary,
            schema_validation=SchemaValidationSummary(**schema_val),
            skew_assessment=skew_obj,
            ifrs9=ifrs9_obj,
            reason_codes=rc_list if rc_list else None,
            adverse_action_notice=notice,
            shadow_pd_score=shadow_pd,
            shadow_model_version=shadow_ver,
            shadow_pd_delta=round(shadow_pd - pd_score, 4) if shadow_pd is not None else None,
        )

        logger.info(f"[Scoring] Done: {rec} | PD={pd_score:.2f}% | Engine={engine} | Quality={quality_band}")

        # ── Drift buffer : stocker le vecteur de features pour PSI en temps réel ──
        global _recent_feature_vectors
        _recent_feature_vectors.append(pipeline_result["features"].copy())
        if len(_recent_feature_vectors) > _DRIFT_BUFFER_SIZE:
            _recent_feature_vectors = _recent_feature_vectors[-_DRIFT_BUFFER_SIZE:]

        # MLOps: Enregistrement des métriques Prometheus
        latency = time.time() - start_time
        scoring_latency_seconds.observe(latency)
        pd_score_gauge.set(pd_score)
        status_label = "fallback" if is_fallback else "success"
        scoring_requests_total.labels(status=status_label).inc()
        
        return response

    except HTTPException:
        raise
    except Exception as e:
        _error_count += 1
        scoring_requests_total.labels(status="error").inc()
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
        "artifact_sha256": model_artifact_sha256[:16] + "..." if model_artifact_sha256 else None,
        "canonical_endpoint": "/score",
    }


@app.get("/segments", dependencies=[Depends(_verify_api_key)])
async def list_segments():
    """
    Retourne les segments de risque Basel III / COBAC disponibles et leur statut.
    Permet de savoir quels artefacts CEMAC sont disponibles vs en attente de données.
    """
    if _segment_router is None:
        return {"error": "SegmentRouter non initialisé", "segments": []}
    return {
        "segments": _segment_router.get_available_segments(),
        "active_champion": model_version_tag,
        "routing_note": (
            "Segments PENDING_DATA utilisent le fallback HOME_CREDIT_DEMO. "
            "Entraîner les artefacts CEMAC réels et les déposer dans le MODEL_DIR pour activer le routing."
        ),
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
    Expose standard Prometheus metrics.
    Scrapable by Prometheus Server and Grafana.
    """
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/ifrs9-audit", dependencies=[Depends(_verify_api_key)])
async def get_ifrs9_audit_log():
    """
    Deprecated — l'audit log en mémoire a été supprimé.
    La source de vérité réglementaire est Ifrs9StagingAudit (PostgreSQL via NestJS).
    Utiliser GET /api/v1/compliance/ifrs9-staging sur le service NestJS.
    """
    return {
        "deprecated": True,
        "message": "In-memory audit log removed. Use NestJS compliance endpoint.",
        "redirect": "GET /api/v1/compliance/ifrs9-staging",
        "persistent_store": "Ifrs9StagingAudit (PostgreSQL via scoring.service.ts)",
    }


@app.get("/drift", dependencies=[Depends(_verify_api_key)])
async def compute_drift():
    """
    Calcule le PSI (Population Stability Index) entre la distribution training
    et les N derniers vecteurs d'inférence stockés dans le rolling buffer.

    Appelé par NestJS (fetchAndIngestPythonMetrics) toutes les 30 secondes.
    Le PSI global est écrit dans ModelVersion.psi pour déclencher l'évaluation
    de drift dans evaluateModelDrift() (cron EVERY_HOUR).

    Retourne :
      - global_psi : PSI moyen sur les features clés
      - feature_psi : PSI par feature (pour diagnostics)
      - alert_level : "OK" | "WARNING" | "CRITICAL"
      - buffer_size : nombre d'inférences dans le buffer
      - recommendation : action recommandée
    """
    global _recent_feature_vectors

    if len(_recent_feature_vectors) < 30:
        return {
            "global_psi": 0.0,
            "feature_psi": {},
            "alert_level": "INSUFFICIENT_DATA",
            "buffer_size": len(_recent_feature_vectors),
            "min_samples_required": 30,
            "recommendation": "Accumulate at least 30 inferences before drift evaluation.",
        }

    try:
        import sys as _sys
        _sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "02_modeling", "pd_model"))
        from skew_analyzer import SkewAnalyzer, TRAINING_REFERENCE_STATS

        analyzer = SkewAnalyzer()
        report = analyzer.analyze_inference_batch(_recent_feature_vectors)

        # PSI global = moyenne des PSI sur les features clés disponibles
        feature_psi_map = {
            r["feature"]: r["psi"]
            for r in report["feature_results"]
            if r.get("psi") is not None
        }
        global_psi = float(np.mean(list(feature_psi_map.values()))) if feature_psi_map else 0.0

        # Top features par PSI (pour diagnostics NestJS)
        top_features = sorted(
            [{"feature": k, "psi": round(v, 4), "status": (
                "CRITICAL" if v >= 0.20 else "WARNING" if v >= 0.10 else "OK"
            )} for k, v in feature_psi_map.items()],
            key=lambda x: x["psi"], reverse=True
        )[:10]

        if global_psi >= 0.20:
            alert_level = "CRITICAL"
            recommendation = (
                "Drift critique détecté. Suspendre le scoring automatique et "
                "investiguer la distribution des features. Retraining recommandé."
            )
        elif global_psi >= 0.10:
            alert_level = "WARNING"
            recommendation = (
                "Drift modéré détecté. Surveiller l'évolution sur les prochaines heures. "
                "Préparer un plan de retraining si la tendance persiste."
            )
        else:
            alert_level = "OK"
            recommendation = "Distribution stable. Aucune action requise."

        logger.info(
            f"[DRIFT] PSI global={global_psi:.4f} | Level={alert_level} | "
            f"Buffer={len(_recent_feature_vectors)} inferences"
        )

        return {
            "global_psi": round(global_psi, 4),
            "feature_psi": feature_psi_map,
            "top_drifting_features": top_features,
            "alert_level": alert_level,
            "buffer_size": len(_recent_feature_vectors),
            "recommendation": recommendation,
            "n_features_evaluated": len(feature_psi_map),
            "model_version": model_version_tag,
            "evaluated_at": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"[DRIFT] Calculation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Drift calculation error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
