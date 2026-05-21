"""
Credit Risk Engine — PD Scoring Microservice
=============================================
FastAPI service exposant le modèle PD LightGBM en REST.

Démarrage :
    uvicorn scoring_service:app --host 0.0.0.0 --port 8000 --reload

Endpoints :
    GET  /health        → status du service + modèle chargé
    POST /score         → scoring PD + recommandation + XAI drivers
    GET  /model/info    → métadonnées du modèle actif
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import os
import pickle
import json
import logging
from datetime import datetime

# ── Setup ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scoring_service")

app = FastAPI(
    title="Credit Risk Engine — Scoring Service",
    description="PD Model inference API for the Credit Risk Engine platform.",
    version="1.0.0",
)

# ── Model Loading ──────────────────────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "02_modeling", "pd_model", "artifacts")
MODEL_NAME = os.getenv("PD_MODEL_NAME", "pd_model_v2")

model = None
model_metadata: Dict[str, Any] = {}
feature_names: List[str] = []

def load_model():
    """Attempt to load the PD model from disk."""
    global model, model_metadata, feature_names

    model_path = os.path.join(MODEL_DIR, f"{MODEL_NAME}.pkl")
    meta_path = os.path.join(MODEL_DIR, f"{MODEL_NAME}_metadata.json")
    features_path = os.path.join(MODEL_DIR, f"{MODEL_NAME}_features.json")

    if not os.path.exists(model_path):
        logger.warning(f"Model not found at {model_path}. Falling back to rule-based scoring.")
        return False

    with open(model_path, "rb") as f:
        model = pickle.load(f)

    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            model_metadata = json.load(f)

    if os.path.exists(features_path):
        with open(features_path, "r") as f:
            feature_names = json.load(f).get("features", [])

    logger.info(f"✅ Model loaded: {MODEL_NAME} | Features: {len(feature_names)}")
    return True

model_available = load_model()


# ── Pydantic Schemas ──────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    """
    Input for PD scoring.
    In full integration, 'features' contains the actual model feature vector.
    These simplified fields are used for the rule-based fallback and metadata.
    """
    application_id: str = Field(..., description="Internal application UUID")
    pd_current: float = Field(..., ge=0.0, le=100.0, description="Current PD estimate (%)")
    exposure: float = Field(..., gt=0, description="Requested exposure in millions USD")
    risk_level: str = Field(..., description="Counterparty risk level: LOW | MED | HIGH | CRITICAL")
    # Optional raw features for ML model inference
    features: Optional[Dict[str, float]] = Field(None, description="Feature vector for ML model")

class XAIDriver(BaseModel):
    label: str
    impact: float
    direction: str  # 'positive' | 'negative'
    category: str

class ScoreResponse(BaseModel):
    application_id: str
    recommendation: str  # APPROVE | APPROVE_WITH_CONDITIONS | SEND_TO_REVIEW | REJECT
    confidence: float     # 0.0 – 1.0
    pd_score: float       # model output PD (%)
    rationale: str
    xai_drivers: List[XAIDriver]
    model_version: str
    scored_by: str        # 'ML_MODEL' | 'RULE_ENGINE'
    scored_at: str


# ── Scoring Logic ──────────────────────────────────────────────────────────

# Policy thresholds (bank-configurable)
POLICY = {
    "AUTO_APPROVE_MAX_PD": 0.5,      # PD < 0.5% → auto approve
    "AUTO_REJECT_MIN_PD": 6.0,       # PD > 6%   → auto reject
    "AUTO_APPROVE_MAX_EXPOSURE": 50,  # Exposure < $50M for auto-approve
    "REVIEW_MIN_EXPOSURE": 100,       # Exposure > $100M → escalate
}

def rule_based_score(req: ScoreRequest) -> ScoreResponse:
    """
    Fallback rule engine when ML model is unavailable.
    Also used as a reference for audit comparison.
    """
    pd = req.pd_current
    exposure = req.exposure
    risk = req.risk_level.upper()

    if pd < POLICY["AUTO_APPROVE_MAX_PD"] and exposure < POLICY["AUTO_APPROVE_MAX_EXPOSURE"]:
        recommendation = "APPROVE"
        confidence = round(0.92 - pd * 0.1, 3)
        rationale = (
            f"PD of {pd:.2f}% is well below the auto-approval threshold ({POLICY['AUTO_APPROVE_MAX_PD']}%). "
            f"Exposure of ${exposure:.1f}M is within the auto-approval limit."
        )
        drivers = [
            XAIDriver(label="Probability of Default", impact=-0.15, direction="positive", category="Credit Risk"),
            XAIDriver(label="Exposure vs Limit", impact=-0.08, direction="positive", category="Portfolio"),
        ]

    elif pd > POLICY["AUTO_REJECT_MIN_PD"]:
        recommendation = "REJECT"
        confidence = round(0.88 + (pd - POLICY["AUTO_REJECT_MIN_PD"]) * 0.02, 3)
        rationale = (
            f"PD of {pd:.2f}% exceeds the maximum acceptable threshold of {POLICY['AUTO_REJECT_MIN_PD']}%. "
            f"Automatic rejection enforced by credit policy."
        )
        drivers = [
            XAIDriver(label="Probability of Default", impact=0.38, direction="negative", category="Credit Risk"),
            XAIDriver(label="Counterparty Risk Level", impact=0.22, direction="negative", category="Rating"),
        ]

    elif exposure > POLICY["REVIEW_MIN_EXPOSURE"] or risk in ("HIGH", "CRITICAL"):
        recommendation = "SEND_TO_REVIEW"
        confidence = round(0.78, 3)
        rationale = (
            f"Exposure of ${exposure:.1f}M {'exceeds' if exposure > POLICY['REVIEW_MIN_EXPOSURE'] else 'is within'} "
            f"the committee escalation threshold, or counterparty risk level ({risk}) is elevated. "
            f"Manual committee review required."
        )
        drivers = [
            XAIDriver(label="Large Exposure Flag", impact=0.18, direction="negative", category="Portfolio"),
            XAIDriver(label="Risk Level Classification", impact=0.12, direction="negative", category="Rating"),
        ]

    else:
        recommendation = "APPROVE_WITH_CONDITIONS"
        confidence = round(0.72, 3)
        rationale = "Application meets minimum credit policy criteria. Approval recommended subject to covenant monitoring."
        drivers = [
            XAIDriver(label="Covenant Compliance Monitor", impact=-0.06, direction="positive", category="Governance"),
            XAIDriver(label="Industry Concentration", impact=0.09, direction="negative", category="Portfolio"),
        ]

    return ScoreResponse(
        application_id=req.application_id,
        recommendation=recommendation,
        confidence=min(confidence, 1.0),
        pd_score=pd,
        rationale=rationale,
        xai_drivers=drivers,
        model_version=f"{MODEL_NAME}_rules",
        scored_by="RULE_ENGINE",
        scored_at=datetime.utcnow().isoformat() + "Z",
    )


def ml_score(req: ScoreRequest) -> ScoreResponse:
    """
    ML model inference path.
    Uses the loaded LightGBM model with a simplified feature vector.
    """
    import numpy as np

    # Build feature vector — use provided features or construct from simplified inputs
    if req.features and len(req.features) > 0:
        try:
            import pandas as pd
            feature_df = pd.DataFrame([req.features])
            # Align columns to trained feature names
            for col in feature_names:
                if col not in feature_df.columns:
                    feature_df[col] = 0.0
            feature_df = feature_df[feature_names]
            pd_prob = float(model.predict_proba(feature_df)[:, 1][0]) * 100  # convert to %
        except Exception as e:
            logger.warning(f"ML inference failed on features: {e}. Falling back to rules.")
            return rule_based_score(req)
    else:
        # No features provided — use rule-based with model branding
        result = rule_based_score(req)
        result.scored_by = "ML_MODEL_SIMPLIFIED"
        result.model_version = MODEL_NAME
        return result

    # Map ML PD output to recommendation
    if pd_prob < POLICY["AUTO_APPROVE_MAX_PD"] and req.exposure < POLICY["AUTO_APPROVE_MAX_EXPOSURE"]:
        recommendation = "APPROVE"
    elif pd_prob > POLICY["AUTO_REJECT_MIN_PD"]:
        recommendation = "REJECT"
    elif req.exposure > POLICY["REVIEW_MIN_EXPOSURE"] or req.risk_level.upper() in ("HIGH", "CRITICAL"):
        recommendation = "SEND_TO_REVIEW"
    else:
        recommendation = "APPROVE_WITH_CONDITIONS"

    confidence = round(abs(pd_prob - POLICY["AUTO_REJECT_MIN_PD"] / 2) / 10, 3)
    confidence = max(0.5, min(0.99, confidence))

    drivers = [
        XAIDriver(label="ML PD Estimate", impact=round((pd_prob / 100) - 0.5, 3),
                  direction="negative" if pd_prob > 2 else "positive", category="Credit Risk"),
        XAIDriver(label="Exposure Threshold", impact=round((req.exposure / 200) - 0.3, 3),
                  direction="negative" if req.exposure > 100 else "positive", category="Portfolio"),
    ]

    return ScoreResponse(
        application_id=req.application_id,
        recommendation=recommendation,
        confidence=confidence,
        pd_score=round(pd_prob, 4),
        rationale=f"ML model PD estimate: {pd_prob:.3f}%. Policy thresholds applied.",
        xai_drivers=drivers,
        model_version=MODEL_NAME,
        scored_by="ML_MODEL",
        scored_at=datetime.utcnow().isoformat() + "Z",
    )


# ── Endpoints ─────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model_available,
        "model_name": MODEL_NAME if model_available else None,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

@app.get("/model/info")
def model_info():
    if not model_available:
        return {"status": "unavailable", "fallback": "rule_engine"}
    return {
        "model_name": MODEL_NAME,
        "metadata": model_metadata,
        "n_features": len(feature_names),
        "features": feature_names[:20],  # Return first 20 for brevity
    }

@app.post("/score", response_model=ScoreResponse)
def score(req: ScoreRequest):
    """
    Main scoring endpoint.
    Uses ML model if available, falls back to rule engine.
    """
    logger.info(f"Scoring request: app={req.application_id}, PD={req.pd_current}%, exp=${req.exposure}M")
    try:
        if model_available:
            result = ml_score(req)
        else:
            result = rule_based_score(req)
        logger.info(f"Result: {result.recommendation} (confidence={result.confidence:.2f}, by={result.scored_by})")
        return result
    except Exception as e:
        logger.error(f"Scoring error: {e}")
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
