"""
API Schemas — Pydantic Models
================================
Schémas de validation pour l'API Credit Risk Engine.
Tous les modèles sont documentés pour l'auto-génération OpenAPI/Swagger.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


# ═══════════════════════════════════════════════════════════════
# CREDIT APPLICATION (Scoring + Decision)
# ═══════════════════════════════════════════════════════════════

class CreditApplicationRequest(BaseModel):
    """Requête de scoring crédit."""
    application_id: str = Field(..., description="Identifiant unique de la demande")
    pd_score: Optional[float] = Field(
        None, ge=0, le=1,
        description="PD pré-calculée (si non fourni, le modèle PD est utilisé)"
    )
    lgd: float = Field(0.45, ge=0, le=1, description="Loss Given Default")
    ead: float = Field(..., gt=0, description="Exposure At Default (montant en XAF)")
    pd_at_origination: Optional[float] = Field(
        None, ge=0, le=1,
        description="PD à l'origination (pour staging IFRS 9)"
    )
    days_past_due: Optional[int] = Field(0, ge=0, description="Jours de retard")
    dti_ratio: Optional[float] = Field(
        None, ge=0, le=2,
        description="Ratio dette/revenu"
    )
    features: Optional[Dict[str, Any]] = Field(
        None,
        description="Features brutes pour prédiction PD (si pd_score non fourni)"
    )

class RawCreditApplicationRequest(BaseModel):
    """Requête métier de scoring crédit via données brutes (End-to-End)."""
    application_id: str = Field(..., description="Identifiant unique de la demande")
    
    # Données Financières Brutes
    AMT_INCOME_TOTAL: float = Field(..., gt=0, description="Revenu total (doit être > 0)")
    AMT_CREDIT: float = Field(..., gt=0, description="Montant du prêt demandé")
    AMT_ANNUITY: float = Field(..., gt=0, description="Annuité prévue")
    
    # Démographie
    DAYS_BIRTH: int = Field(..., lt=-6570, description="Âge en jours négatifs (Strictement Majeur > 18 ans)")
    DAYS_EMPLOYED: float = Field(..., description="Ancienneté emploi (Jours négatifs. 365243 si invalide/retraité)")
    
    # Données Bureau / Tiers
    EXT_SOURCE_1: Optional[float] = Field(None, ge=0, le=1)
    EXT_SOURCE_2: Optional[float] = Field(None, ge=0, le=1)
    EXT_SOURCE_3: Optional[float] = Field(None, ge=0, le=1)
    
    # Facultatif: Bâle III variables
    lgd: float = Field(0.45, ge=0, le=1, description="LGD réglementaire")
    ead: Optional[float] = Field(None, gt=0, description="EAD. Déduit dynamiquement sur l'AMT_CREDIT si vide.")
    
    # Pipeline Versioning
    feature_version: str = Field("v1.0", description="Tag de la pipeline MLOps")

    class Config:
        json_schema_extra = {
            "example": {
                "application_id": "APP-RAW-002",
                "AMT_INCOME_TOTAL": 150000,
                "AMT_CREDIT": 500000,
                "AMT_ANNUITY": 30000,
                "DAYS_BIRTH": -12000,
                "DAYS_EMPLOYED": -3000,
                "EXT_SOURCE_2": 0.6,
                "lgd": 0.45,
                "feature_version": "v1.0"
            }
        }

    class Config:
        json_schema_extra = {
            "example": {
                "application_id": "APP-2024-001",
                "pd_score": 0.08,
                "lgd": 0.45,
                "ead": 5000000,
                "pd_at_origination": 0.05,
                "days_past_due": 0,
                "dti_ratio": 0.35,
            }
        }


class CreditApplicationResponse(BaseModel):
    """Réponse de scoring crédit."""
    application_id: str
    pd_score: float
    pd_source: str  # "provided" ou "model_predicted"
    expected_loss: float
    el_rate: float
    decision: str   # "ACCEPT", "REVIEW", "REJECT"
    rejection_reasons: List[str]
    review_flags: List[str]
    ifrs9_stage: int
    ecl_provision: float
    timestamp: str


# ═══════════════════════════════════════════════════════════════
# PORTFOLIO EL
# ═══════════════════════════════════════════════════════════════

class ExposureItem(BaseModel):
    """Item d'exposition pour calcul portefeuille."""
    exposure_id: str
    pd: float = Field(..., ge=0, le=1)
    lgd: float = Field(..., ge=0, le=1)
    ead: float = Field(..., gt=0)


class PortfolioELRequest(BaseModel):
    """Requête de calcul EL portefeuille."""
    exposures: List[ExposureItem]

    class Config:
        json_schema_extra = {
            "example": {
                "exposures": [
                    {"exposure_id": "EXP-001", "pd": 0.03, "lgd": 0.45, "ead": 5000000},
                    {"exposure_id": "EXP-002", "pd": 0.08, "lgd": 0.55, "ead": 2000000},
                ]
            }
        }


class PortfolioELResponse(BaseModel):
    """Réponse calcul EL portefeuille."""
    total_el: float
    total_ead: float
    weighted_avg_pd: float
    weighted_avg_lgd: float
    n_exposures: int
    exposures: List[Dict[str, Any]]
    timestamp: str


# ═══════════════════════════════════════════════════════════════
# IFRS 9 STAGING
# ═══════════════════════════════════════════════════════════════

class IFRS9StagingRequest(BaseModel):
    """Requête de staging IFRS 9."""
    exposure_id: str
    pd_current: float = Field(..., ge=0, le=1)
    pd_origination: float = Field(..., ge=0, le=1)
    lgd: float = Field(..., ge=0, le=1)
    ead: float = Field(..., gt=0)
    days_past_due: int = Field(0, ge=0)
    is_restructured: bool = False
    is_watchlisted: bool = False
    remaining_maturity_years: float = Field(5.0, gt=0)

    class Config:
        json_schema_extra = {
            "example": {
                "exposure_id": "EXP-001",
                "pd_current": 0.08,
                "pd_origination": 0.03,
                "lgd": 0.45,
                "ead": 10000000,
                "days_past_due": 15,
                "is_restructured": False,
                "remaining_maturity_years": 4.0,
            }
        }


class IFRS9StagingResponse(BaseModel):
    """Réponse de staging IFRS 9."""
    exposure_id: str
    current_stage: int
    sicr_triggered: bool
    ecl_provision: float
    ecl_horizon: str
    staging_reasons: List[str]
    timestamp: str


# ═══════════════════════════════════════════════════════════════
# RAROC
# ═══════════════════════════════════════════════════════════════

class RAROCRequest(BaseModel):
    """Requête de calcul RAROC."""
    exposure_id: str
    pd: float = Field(..., ge=0, le=1)
    lgd: float = Field(..., ge=0, le=1)
    ead: float = Field(..., gt=0)
    client_rate: float = Field(..., gt=0, le=1, description="Taux d'intérêt client")
    maturity_years: float = Field(5.0, gt=0)

    class Config:
        json_schema_extra = {
            "example": {
                "exposure_id": "EXP-001",
                "pd": 0.05,
                "lgd": 0.45,
                "ead": 10000000,
                "client_rate": 0.12,
                "maturity_years": 5.0,
            }
        }


class RAROCResponse(BaseModel):
    """Réponse calcul RAROC."""
    exposure_id: str
    raroc: float
    raroc_pct: str
    hurdle_rate: float
    value_created: bool
    economic_capital: float
    rwa: float
    expected_loss: float
    pricing_recommendation: str
    minimum_rate: float
    timestamp: str


# ═══════════════════════════════════════════════════════════════
# SYSTEM
# ═══════════════════════════════════════════════════════════════

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    timestamp: str
    uptime_seconds: float
    components: Dict[str, bool]


class ModelInfoResponse(BaseModel):
    """Model metadata response."""
    model_name: str
    n_features: int
    metadata: Dict[str, Any]
    status: str
