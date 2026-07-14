"""
Integration tests for the Octaix Risk Engine scoring API.

Unlike `test_scoring.py` which mocks the model artifact, this test 
verifies that the REAL `pd_model_v2.pkl` can be loaded and executed 
successfully without crashing on actual payloads.

Run with: pytest 03_risk_engine/test_integration.py -v
"""
import pytest
from fastapi.testclient import TestClient
import sys
import os

# Ensure imports work regardless of execution dir
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, load_model_artifacts  # noqa: E402

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_model():
    """Forces the loading of the real model artifact before running tests."""
    load_model_artifacts()

class TestModelIntegration:
    def test_health_shows_model_loaded(self):
        """Verifies that the actual model artifact was successfully loaded."""
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        # If this is False, it means pd_model_v2.pkl is missing or corrupted
        assert data["model_loaded"] is True, "The real model failed to load in the test environment."

    def test_full_scoring_pipeline_on_golden_payload(self):
        """
        Sends a complete business payload to the /score endpoint and 
        verifies that the ML model, feature pipeline, and SHAP explainer 
        all execute successfully.
        """
        golden_payload = {
            "application_id": "INT-TEST-001",
            "requested_amount": 5.0,
            "exposure": 10.0,
            "pd_current": 3.0,
            "risk_level": "MED",
            "sector": "Technology",
            "internal_rating": "A",
            "years_in_business": 5,
            "revenue": 50.0,
            "total_debt": 10.0,
            "collateral_value": 8.0,
            "tenor_months": 36
        }
        
        # Assume authentication is bypassed in dev or pass a mock key if required
        r = client.post("/score", json=golden_payload)
        
        # If authentication is required but missing, it will return 401
        if r.status_code == 401:
            pytest.skip("Authentication enabled. Please configure SCORING_API_KEY for tests.")
            
        assert r.status_code == 200, f"Scoring failed with {r.text}"
        
        response = r.json()
        
        # Validate critical ML outputs
        assert "pd_score" in response
        assert 0.0 <= response["pd_score"] <= 100.0
        
        # Verify SHAP drivers were generated successfully
        assert "xai_drivers" in response
        assert len(response["xai_drivers"]) > 0, "SHAP explainer failed to return drivers"
        
        # Verify the engine used was the python ML model, not the fallback
        assert "PYTHON_" in response["engine"]
        assert "FALLBACK" not in response["engine"], "Model execution crashed and fell back to rule engine."
