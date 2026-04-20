"""
05_api_layer — FastAPI Credit Risk Engine API
================================================
Microservice REST API pour le Credit Risk Engine.

Endpoints :
- POST /predict         : Scoring PD + Décision crédit
- POST /portfolio/el    : Calcul EL portefeuille
- POST /ifrs9/staging   : Classification IFRS 9
- POST /raroc           : Calcul RAROC
- GET  /health          : Health check
- GET  /model/info      : Metadata modèle

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import os
import sys
import logging
from datetime import datetime
from contextlib import asynccontextmanager

# Add project root to path
PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, PROJECT_ROOT)

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import importlib

schemas = importlib.import_module("05_api_layer.schemas")
CreditApplicationRequest = schemas.CreditApplicationRequest
RawCreditApplicationRequest = schemas.RawCreditApplicationRequest
CreditApplicationResponse = schemas.CreditApplicationResponse
PortfolioELRequest = schemas.PortfolioELRequest
PortfolioELResponse = schemas.PortfolioELResponse
IFRS9StagingRequest = schemas.IFRS9StagingRequest
IFRS9StagingResponse = schemas.IFRS9StagingResponse
RAROCRequest = schemas.RAROCRequest
RAROCResponse = schemas.RAROCResponse
HealthResponse = schemas.HealthResponse
ModelInfoResponse = schemas.ModelInfoResponse

import json
from pathlib import Path

# Init Monitoring Logger
MONITORING_LOG_DIR = os.path.join(PROJECT_ROOT, "06_monitoring", "logs")
Path(MONITORING_LOG_DIR).mkdir(parents=True, exist_ok=True)
MONITORING_FILE_PATH = os.path.join(MONITORING_LOG_DIR, "predictions_log.jsonl")

def log_prediction_monitoring(entry: dict):
    """Log l'inférence pour la détection MLOps (Data Drift / PSI)."""
    try:
        with open(MONITORING_FILE_PATH, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry) + '\n')
    except Exception as e:
        logger.error(f"Failed to write monitoring log: {e}")

# Risk Engine imports
from importlib import import_module
ExpectedLossCalculator = import_module("03_risk_engine.expected_loss").ExpectedLossCalculator
DecisionEngine = import_module("03_risk_engine.decision_engine").DecisionEngine
IFRS9StagingEngine = import_module("03_risk_engine.ifrs9_staging").IFRS9StagingEngine
RAROCCalculator = import_module("03_risk_engine.raroc").RAROCCalculator

logger = logging.getLogger(__name__)

# ─── Global instances ────────────────────────────────────────
el_calculator = None
decision_engine = None
ifrs9_engine = None
raroc_calculator = None
pd_predictor = None
startup_time = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle — initialize engines on startup."""
    global el_calculator, decision_engine, ifrs9_engine, raroc_calculator, pd_predictor, startup_time

    logger.info("Initialisation du Credit Risk Engine API...")
    startup_time = datetime.utcnow()

    config_path = os.path.join(PROJECT_ROOT, "config", "thresholds.yaml")

    el_calculator = ExpectedLossCalculator()
    decision_engine = DecisionEngine(config_path=config_path)
    ifrs9_engine = IFRS9StagingEngine(config_path=config_path)
    raroc_calculator = RAROCCalculator(config_path=config_path)

    # Tentative de chargement du modèle PD
    try:
        predict_module = import_module("02_modeling.pd_model.predict")
        PDModelPredictor = predict_module.PDModelPredictor
        pd_predictor = PDModelPredictor()
        if pd_predictor.is_ready():
            logger.info("Modèle PD chargé avec succès")
        else:
            logger.warning("Modèle PD non disponible — scoring désactivé")
            pd_predictor = None
    except Exception as e:
        logger.warning(f"Modèle PD non chargeable: {e}")
        pd_predictor = None

    logger.info("✓ Credit Risk Engine API prêt")
    yield
    logger.info("Arrêt du Credit Risk Engine API")


# ─── FastAPI App ──────────────────────────────────────────────
app = FastAPI(
    title="Credit Risk Engine API",
    description=(
        "API de scoring et décision crédit pour le secteur bancaire CEMAC. "
        "Conforme COBAC, Bâle II/III, IFRS 9."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Middleware: Request logging ──────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log toutes les requêtes pour audit trail."""
    start = datetime.utcnow()
    response = await call_next(request)
    duration = (datetime.utcnow() - start).total_seconds()
    logger.info(
        f"{request.method} {request.url.path} → {response.status_code} "
        f"({duration:.3f}s)"
    )
    return response


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        uptime_seconds=(datetime.utcnow() - startup_time).total_seconds() if startup_time else 0,
        components={
            "el_calculator": el_calculator is not None,
            "decision_engine": decision_engine is not None,
            "ifrs9_engine": ifrs9_engine is not None,
            "raroc_calculator": raroc_calculator is not None,
            "pd_model": pd_predictor is not None and pd_predictor.is_ready() if pd_predictor else False,
        },
    )


@app.get("/model/info", response_model=ModelInfoResponse, tags=["System"])
async def model_info():
    """Retourne les métadonnées du modèle PD chargé."""
    if pd_predictor and pd_predictor.is_ready():
        return ModelInfoResponse(
            model_name=pd_predictor.model_name,
            n_features=len(pd_predictor.feature_names),
            metadata=pd_predictor.metadata,
            status="loaded",
        )
    return ModelInfoResponse(
        model_name="N/A",
        n_features=0,
        metadata={},
        status="not_loaded",
    )


@app.post("/predict/raw", response_model=CreditApplicationResponse, tags=["Scoring End-to-End"])
async def predict_raw_credit_risk(request: RawCreditApplicationRequest):
    """
    Scoring crédit complet End-to-End depuis les données bancaires brutes.
    
    Pipeline :
    1. Récupération des données brutes saisies (ex: Guichet)
    2. Transformations via Feature Store
    3. Inférénce LightGBM (Calibré)
    4. Calcul de l'Expected Loss
    5. Évaluation de la décision (Accept/Review/Reject)
    6. Classification IFRS 9
    """
    try:
        import pandas as pd
        from _01_data_layer.feature_store.feature_engineering import BankFeatureEngineer
        
        start_time = datetime.utcnow()
        
        # 1. Parsing raw data
        raw_dict = request.dict(exclude={'application_id', 'lgd', 'ead', 'feature_version'})
        
        # 2. Feature Engineering on-the-fly
        engineer = BankFeatureEngineer()
        df_raw = pd.DataFrame([raw_dict])
        df_features = engineer.transform(df_raw)
        features = df_features.iloc[0].to_dict()
        
        # 3. Modele PD (Calibré)
        if not pd_predictor or not pd_predictor.is_ready():
             raise HTTPException(status_code=500, detail="Modèle PD non disponible/chargé pour l'inférence.")
             
        pd_score = pd_predictor.predict_single(features, request.application_id)
        
        # Defaults
        ead = request.ead if request.ead else request.AMT_CREDIT
        dti_ratio = df_features['DEBT_TO_INCOME'].iloc[0] if 'DEBT_TO_INCOME' in df_features else (request.AMT_ANNUITY / request.AMT_INCOME_TOTAL)
        
        # 4. EL
        el_result = el_calculator.compute(
            pd=pd_score,
            lgd=request.lgd,
            ead=ead,
            exposure_id=request.application_id,
        )

        # 5. Décision
        decision_result = decision_engine.evaluate(
            application_id=request.application_id,
            pd_score=pd_score,
            lgd=request.lgd,
            ead=ead,
            dti_ratio=dti_ratio,
        )

        # 6. IFRS 9 Staging
        staging_result = ifrs9_engine.classify(
            exposure_id=request.application_id,
            pd_current=pd_score,
            pd_origination=pd_score, # Assumption T0
            lgd=request.lgd,
            ead=ead,
            days_past_due=0,
        )
        
        # Logging MLOps Monitoring
        duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        monitoring_entry = {
            "timestamp": start_time.isoformat(),
            "application_id": request.application_id,
            "feature_version": request.feature_version,
            "latency_ms": round(duration_ms, 2),
            "inputs_raw": raw_dict,
            "features_engineered": features,
            "pd_score": round(pd_score, 6),
            "decision": decision_result.decision.value,
        }
        log_prediction_monitoring(monitoring_entry)

        return CreditApplicationResponse(
            application_id=request.application_id,
            pd_score=round(pd_score, 6),
            pd_source="model_predicted",
            expected_loss=round(el_result.expected_loss, 2),
            el_rate=round(el_result.expected_loss_rate, 6),
            decision=decision_result.decision.value,
            rejection_reasons=decision_result.rejection_reasons,
            review_flags=decision_result.review_flags,
            ifrs9_stage=staging_result.current_stage,
            ecl_provision=round(staging_result.ecl_provision, 2),
            timestamp=datetime.utcnow().isoformat(),
        )

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Erreur scoring raw end-to-end: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur interne API: {str(e)}")

@app.post("/predict", response_model=CreditApplicationResponse, tags=["Scoring Legacy"])
async def predict_credit_risk(request: CreditApplicationRequest):
    """
    Scoring crédit complet : PD → EL → Décision.
    
    Pipeline Legacy: Accepte une PD forcée ou un set de features existantes.
    """
    try:
        # PD : utiliser le score fourni ou prédire via le modèle
        pd_score = request.pd_score
        pd_source = "provided"

        if pd_score is None and pd_predictor and pd_predictor.is_ready():
            features = request.features or {}
            pd_score = pd_predictor.predict_single(features, request.application_id)
            pd_source = "model_predicted"
        elif pd_score is None:
            raise HTTPException(
                status_code=400,
                detail="PD score non fourni et modèle PD non disponible."
            )

        # EL
        el_result = el_calculator.compute(
            pd=pd_score,
            lgd=request.lgd,
            ead=request.ead,
            exposure_id=request.application_id,
        )

        # Décision
        decision_result = decision_engine.evaluate(
            application_id=request.application_id,
            pd_score=pd_score,
            lgd=request.lgd,
            ead=request.ead,
            dti_ratio=request.dti_ratio,
        )

        # IFRS 9 Staging
        staging_result = ifrs9_engine.classify(
            exposure_id=request.application_id,
            pd_current=pd_score,
            pd_origination=request.pd_at_origination or pd_score,
            lgd=request.lgd,
            ead=request.ead,
            days_past_due=request.days_past_due or 0,
        )

        return CreditApplicationResponse(
            application_id=request.application_id,
            pd_score=round(pd_score, 6),
            pd_source=pd_source,
            expected_loss=round(el_result.expected_loss, 2),
            el_rate=round(el_result.expected_loss_rate, 6),
            decision=decision_result.decision.value,
            rejection_reasons=decision_result.rejection_reasons,
            review_flags=decision_result.review_flags,
            ifrs9_stage=staging_result.current_stage,
            ecl_provision=round(staging_result.ecl_provision, 2),
            timestamp=datetime.utcnow().isoformat(),
        )

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Erreur scoring: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")


@app.post("/portfolio/el", response_model=PortfolioELResponse, tags=["Portfolio"])
async def compute_portfolio_el(request: PortfolioELRequest):
    """Calcul Expected Loss sur portefeuille."""
    try:
        import pandas as pd
        portfolio_df = pd.DataFrame([exp.dict() for exp in request.exposures])

        results_df = el_calculator.compute_portfolio(
            portfolio_df, pd_col="pd", lgd_col="lgd", ead_col="ead",
            id_col="exposure_id"
        )
        summary = el_calculator.get_portfolio_summary(results_df)

        return PortfolioELResponse(
            total_el=summary["total_el"],
            total_ead=summary["total_ead"],
            weighted_avg_pd=summary["weighted_avg_pd"],
            weighted_avg_lgd=summary["weighted_avg_lgd"],
            n_exposures=summary["n_exposures"],
            exposures=results_df.to_dict("records"),
            timestamp=datetime.utcnow().isoformat(),
        )
    except Exception as e:
        logger.error(f"Erreur portfolio EL: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ifrs9/staging", response_model=IFRS9StagingResponse, tags=["IFRS 9"])
async def compute_ifrs9_staging(request: IFRS9StagingRequest):
    """Classification IFRS 9 avec calcul ECL."""
    try:
        result = ifrs9_engine.classify(
            exposure_id=request.exposure_id,
            pd_current=request.pd_current,
            pd_origination=request.pd_origination,
            lgd=request.lgd,
            ead=request.ead,
            days_past_due=request.days_past_due,
            is_restructured=request.is_restructured,
            is_watchlisted=request.is_watchlisted,
            remaining_maturity_years=request.remaining_maturity_years,
        )

        return IFRS9StagingResponse(
            exposure_id=result.exposure_id,
            current_stage=result.current_stage,
            sicr_triggered=result.sicr_triggered,
            ecl_provision=round(result.ecl_provision, 2),
            ecl_horizon=result.ecl_horizon,
            staging_reasons=result.staging_reasons,
            timestamp=datetime.utcnow().isoformat(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/raroc", response_model=RAROCResponse, tags=["RAROC"])
async def compute_raroc(request: RAROCRequest):
    """Calcul RAROC pour une exposition."""
    try:
        result = raroc_calculator.compute(
            exposure_id=request.exposure_id,
            pd=request.pd,
            lgd=request.lgd,
            ead=request.ead,
            client_rate=request.client_rate,
            maturity_years=request.maturity_years,
        )

        min_rate = raroc_calculator.compute_minimum_rate(
            pd=request.pd, lgd=request.lgd, ead=request.ead,
            maturity_years=request.maturity_years,
        )

        return RAROCResponse(
            exposure_id=result.exposure_id,
            raroc=round(result.raroc, 6),
            raroc_pct=f"{result.raroc:.2%}",
            hurdle_rate=result.hurdle_rate,
            value_created=result.value_created,
            economic_capital=round(result.economic_capital, 2),
            rwa=round(result.rwa, 2),
            expected_loss=round(result.expected_loss, 2),
            pricing_recommendation=result.pricing_recommendation,
            minimum_rate=round(min_rate, 6),
            timestamp=datetime.utcnow().isoformat(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    logging.basicConfig(level=logging.INFO)
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
