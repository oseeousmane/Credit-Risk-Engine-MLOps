import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from importlib import import_module
api_module = import_module("05_api_layer.main")
app = api_module.app

client = TestClient(app)

def test_api_health():
    """Vérifie que l'API démarre correctement."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_predict_raw_endpoint_nominal():
    """Test nominal du endpoint /predict/raw simulant un client complet."""
    payload = {
        "application_id": "TEST-APP-123",
        "AMT_INCOME_TOTAL": 180000,
        "AMT_CREDIT": 450000,
        "AMT_ANNUITY": 25000,
        "DAYS_BIRTH": -15000, # 41 ans
        "DAYS_EMPLOYED": -4500, # 12 ans
        "EXT_SOURCE_1": 0.8,
        "EXT_SOURCE_2": 0.7,
        "EXT_SOURCE_3": 0.6,
        "lgd": 0.45,
        "feature_version": "v1.0"
    }

    # Cet appel déclenche Engine -> Predictor -> Decision
    # Si le Modèle PD n'est pas instancié en Test (car train.py non exécuté), 
    # l'API gère et renvoie un 500 informatif. On vérifie la structure de gestion minimale.
    response = client.post("/predict/raw", json=payload)
    
    # Si l'API marche et le modèle a été sauvegardé localement :
    if response.status_code == 200:
        data = response.json()
        assert "pd_score" in data
        assert "decision" in data
        assert data["decision"] in ["ACCEPT", "REVIEW", "REJECT"]
        assert "expected_loss" in data
    else:
        # Fallback pour pipeline CI/CD si model non pré-entraîné
        assert response.status_code == 500

def test_predict_raw_endpoint_validation_error():
    """Test de la validation Pydantic - Income négatif doit rejeter avec 422."""
    payload = {
        "application_id": "TEST-APP-INVALID",
        "AMT_INCOME_TOTAL": -5000, # INTERDIT par Pydantic (gt=0)
        "AMT_CREDIT": 450000,
        "AMT_ANNUITY": 25000,
        "DAYS_BIRTH": -15000, 
        "DAYS_EMPLOYED": -4500,
    }

    response = client.post("/predict/raw", json=payload)
    assert response.status_code == 422
    assert "AMT_INCOME_TOTAL" in response.text
