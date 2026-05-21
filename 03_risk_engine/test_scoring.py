"""
Unit tests for the Octaix Risk Engine scoring API.

Run with:  pytest 03_risk_engine/test_scoring.py -v
Dependencies: pytest, httpx, fastapi[testclient]
"""
import pytest
from fastapi.testclient import TestClient

# Import after ensuring no circular imports
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Patch the model to None before importing app (no .pkl file in test environment)
import unittest.mock as mock
with mock.patch("builtins.open", side_effect=FileNotFoundError):
    pass  # noqa — model loading happens at startup, handled by the try/except

from main import app, _apply_calibration_buffer, apply_decision_policy  # noqa: E402

client = TestClient(app)


# ── /health ───────────────────────────────────────────────────────────────────

class TestHealth:
    def test_health_returns_ok(self):
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert "model_loaded" in data
        assert "model_version" in data

    def test_health_reports_model_state(self):
        r = client.get("/health")
        data = r.json()
        # In test env (no model file) model_loaded should be False
        assert isinstance(data["model_loaded"], bool)


# ── /ready ────────────────────────────────────────────────────────────────────

class TestReady:
    def test_ready_returns_503_when_model_not_loaded(self):
        """Without the model artifact, /ready must refuse traffic."""
        from main import model  # noqa: F401
        import main
        original_model = main.model
        main.model = None
        try:
            r = client.get("/ready")
            assert r.status_code == 503
        finally:
            main.model = original_model

    def test_ready_returns_200_when_model_loaded(self):
        """Simulate a loaded model."""
        import main
        original_model = main.model
        main.model = mock.MagicMock()
        try:
            r = client.get("/ready")
            assert r.status_code == 200
            assert r.json()["status"] == "ready"
        finally:
            main.model = original_model


# ── /metrics ──────────────────────────────────────────────────────────────────

class TestMetrics:
    def test_metrics_returns_counters(self):
        r = client.get("/metrics")
        assert r.status_code == 200
        data = r.json()
        assert "inference_count" in data
        assert "fallback_count" in data
        assert "error_count" in data
        assert "fallback_rate" in data
        assert "error_rate" in data
        assert isinstance(data["inference_count"], int)


# ── _apply_calibration_buffer ─────────────────────────────────────────────────

class TestCalibrationBuffer:
    def test_no_buffer_below_3_5(self):
        pd_buf, note = _apply_calibration_buffer(2.0)
        assert pd_buf == 2.0
        assert note == ""

    def test_watch_buffer_between_3_5_and_6(self):
        pd_buf, note = _apply_calibration_buffer(5.0)
        assert abs(pd_buf - 5.0 * 1.08) < 1e-9
        assert "1.08" in note

    def test_high_risk_buffer_above_6(self):
        pd_buf, note = _apply_calibration_buffer(8.0)
        assert abs(pd_buf - 8.0 * 1.15) < 1e-9
        assert "1.15" in note

    def test_buffer_caps_at_99(self):
        # Extremely high PD should not exceed 99%
        pd_buf, _ = _apply_calibration_buffer(90.0)
        assert pd_buf == 99.0

    def test_boundary_exactly_6(self):
        # PD exactly 6.0% — is NOT strictly > 6.0, so watch-band applies
        pd_buf, note = _apply_calibration_buffer(6.0)
        assert abs(pd_buf - 6.0 * 1.08) < 1e-9

    def test_boundary_exactly_3_5(self):
        # PD exactly 3.5% — not > 3.5, no buffer
        pd_buf, note = _apply_calibration_buffer(3.5)
        assert pd_buf == 3.5
        assert note == ""


# ── apply_decision_policy ─────────────────────────────────────────────────────

class TestDecisionPolicy:
    """
    Verify the 4 decision tiers match DEMO_VS_PROD_BENCHMARK §5 and main.py.
    Thresholds after calibration buffer:
      Elite  : pd_decision <= 0.8% AND exposure < 50 → APPROVE
      Core   : pd_decision <= 6.0%                   → APPROVE_WITH_CONDITIONS
      Watch  : pd_decision >  3.5% OR large exposure → SEND_TO_REVIEW
      Decline: pd_decision >  6.0%                   → REJECT
    Note: pd_score passed in is RAW (before buffer). Buffer applied inside the function.
    """

    def test_elite_tier_approve(self):
        rec, conf, _ = apply_decision_policy(0.5, 10.0, "LOW", "HIGH")
        assert rec == "APPROVE"
        assert conf > 0.7

    def test_core_tier_approve_with_conditions(self):
        rec, conf, _ = apply_decision_policy(2.0, 10.0, "LOW", "HIGH")
        assert rec == "APPROVE_WITH_CONDITIONS"

    def test_watch_tier_review_by_pd(self):
        # PD 5.0% → after no buffer (5.0 > 3.5 but <= 6.0 raw) → buffer 1.08 → 5.4% → SEND_TO_REVIEW
        rec, conf, _ = apply_decision_policy(5.0, 10.0, "LOW", "HIGH")
        assert rec == "SEND_TO_REVIEW"

    def test_decline_tier_reject(self):
        # PD 7.0% → after buffer 1.15 → 8.05% → REJECT
        rec, conf, _ = apply_decision_policy(7.0, 10.0, "LOW", "HIGH")
        assert rec == "REJECT"

    def test_large_exposure_forces_review(self):
        # Even Elite PD, large exposure → committee review
        rec, _, _ = apply_decision_policy(0.5, 120.0, "LOW", "HIGH")
        assert rec == "SEND_TO_REVIEW"

    def test_high_risk_level_forces_review(self):
        rec, _, _ = apply_decision_policy(2.0, 10.0, "HIGH", "HIGH")
        assert rec == "SEND_TO_REVIEW"

    def test_low_quality_payload_penalizes_confidence(self):
        _, conf_high, _ = apply_decision_policy(2.0, 10.0, "LOW", "HIGH")
        _, conf_low, _ = apply_decision_policy(2.0, 10.0, "LOW", "LOW")
        assert conf_low < conf_high

    def test_confidence_never_below_0_4(self):
        _, conf, _ = apply_decision_policy(7.0, 100.0, "CRITICAL", "LOW")
        assert conf >= 0.40


# ── /score — fallback mode (no model artifact) ────────────────────────────────

class TestScoreEndpointFallback:
    """Test the /score endpoint when the ML model is not loaded (fallback rule engine)."""

    PAYLOAD = {
        "application_id": "TEST-001",
        "requested_amount": 5.0,
        "exposure": 5.0,
        "pd_current": 2.0,
        "risk_level": "MED",
    }

    def test_score_fallback_returns_200(self):
        r = client.post("/score", json=self.PAYLOAD)
        assert r.status_code == 200

    def test_score_fallback_returns_required_fields(self):
        r = client.post("/score", json=self.PAYLOAD)
        data = r.json()
        assert "recommendation" in data
        assert "pd_score" in data
        assert "pd_score_raw" in data
        assert "confidence" in data
        assert "xai_drivers" in data
        assert "model_version" in data
        assert "engine" in data

    def test_score_recommendation_is_valid_enum(self):
        r = client.post("/score", json=self.PAYLOAD)
        assert r.json()["recommendation"] in (
            "APPROVE", "APPROVE_WITH_CONDITIONS", "SEND_TO_REVIEW", "REJECT"
        )

    def test_score_high_pd_triggers_reject(self):
        payload = {**self.PAYLOAD, "pd_current": 15.0, "risk_level": "CRITICAL"}
        r = client.post("/score", json=payload)
        assert r.json()["recommendation"] == "REJECT"

    def test_score_pd_score_raw_equals_pd_score_in_fallback(self):
        r = client.post("/score", json=self.PAYLOAD)
        data = r.json()
        assert data["pd_score_raw"] == data["pd_score"]

    def test_score_missing_required_field_returns_422(self):
        r = client.post("/score", json={"application_id": "TEST-002"})
        assert r.status_code == 422

    def test_score_api_key_rejected_when_key_configured(self):
        import main
        original_key = main.SCORING_API_KEY
        main.SCORING_API_KEY = "secret-test-key"
        try:
            r = client.post("/score", json=self.PAYLOAD, headers={"X-Api-Key": "wrong-key"})
            assert r.status_code == 401
        finally:
            main.SCORING_API_KEY = original_key

    def test_score_api_key_accepted_when_correct(self):
        import main
        original_key = main.SCORING_API_KEY
        main.SCORING_API_KEY = "secret-test-key"
        try:
            r = client.post("/score", json=self.PAYLOAD, headers={"X-Api-Key": "secret-test-key"})
            assert r.status_code == 200
        finally:
            main.SCORING_API_KEY = original_key
