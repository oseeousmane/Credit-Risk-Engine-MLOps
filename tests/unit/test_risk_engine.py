"""
Tests unitaires — Risk Engine (Phase 2)
==========================================
Tests de validation pour :
- Expected Loss Calculator
- Decision Engine
- IFRS 9 Staging Engine
- RAROC Calculator
"""

import sys
import os
import pytest
import numpy as np
import pandas as pd

# Add project root to path
PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
sys.path.insert(0, PROJECT_ROOT)

# Use importlib for directories with numeric prefixes
import importlib

risk_engine = importlib.import_module("03_risk_engine")
expected_loss_mod = importlib.import_module("03_risk_engine.expected_loss")
decision_engine_mod = importlib.import_module("03_risk_engine.decision_engine")
ifrs9_mod = importlib.import_module("03_risk_engine.ifrs9_staging")
raroc_mod = importlib.import_module("03_risk_engine.raroc")

ExpectedLossCalculator = expected_loss_mod.ExpectedLossCalculator
DecisionEngine = decision_engine_mod.DecisionEngine
CreditDecision = decision_engine_mod.CreditDecision
IFRS9StagingEngine = ifrs9_mod.IFRS9StagingEngine
Stage = ifrs9_mod.Stage
RAROCCalculator = raroc_mod.RAROCCalculator


# ═══════════════════════════════════════════════════════════════
# EXPECTED LOSS TESTS
# ═══════════════════════════════════════════════════════════════

class TestExpectedLossCalculator:
    """Tests pour le calculateur Expected Loss."""

    def setup_method(self):
        self.calc = ExpectedLossCalculator(
            apply_pd_floor=False, apply_lgd_floor=False
        )
        self.calc_regulated = ExpectedLossCalculator(
            apply_pd_floor=True, apply_lgd_floor=True
        )

    def test_basic_el_calculation(self):
        """EL = PD × LGD × EAD doit être mathématiquement correct."""
        result = self.calc.compute(pd=0.05, lgd=0.45, ead=1_000_000)
        assert abs(result.expected_loss - 22_500.0) < 0.01

    def test_zero_pd(self):
        """PD = 0 → EL = 0."""
        result = self.calc.compute(pd=0.0, lgd=0.45, ead=1_000_000)
        assert result.expected_loss == 0.0

    def test_full_default(self):
        """PD = 1, LGD = 1 → EL = EAD."""
        result = self.calc.compute(pd=1.0, lgd=1.0, ead=500_000)
        assert abs(result.expected_loss - 500_000) < 0.01

    def test_pd_floor_applied(self):
        """Le floor PD Bâle III (0.03%) doit être appliqué."""
        result = self.calc_regulated.compute(pd=0.0001, lgd=0.45, ead=1_000_000)
        assert result.pd >= 0.0003  # PD Floor Bâle III

    def test_lgd_floor_unsecured(self):
        """Le floor LGD non-garanti (25%) doit être appliqué."""
        result = self.calc_regulated.compute(pd=0.05, lgd=0.10, ead=1_000_000)
        assert result.lgd >= 0.25  # Floor LGD non-garanti

    def test_invalid_pd_raises(self):
        """PD hors bornes [0,1] doit lever une ValueError."""
        with pytest.raises(ValueError):
            self.calc.compute(pd=1.5, lgd=0.45, ead=1_000_000)

    def test_negative_ead_raises(self):
        """EAD négative doit lever une ValueError."""
        with pytest.raises(ValueError):
            self.calc.compute(pd=0.05, lgd=0.45, ead=-100)

    def test_el_rate(self):
        """EL rate doit être PD × LGD."""
        result = self.calc.compute(pd=0.10, lgd=0.50, ead=2_000_000)
        assert abs(result.expected_loss_rate - 0.05) < 0.001

    def test_portfolio_computation(self):
        """Le calcul portefeuille doit fonctionner."""
        portfolio = pd.DataFrame({
            "client_id": ["A", "B", "C"],
            "pd": [0.02, 0.05, 0.10],
            "lgd": [0.45, 0.55, 0.60],
            "ead": [1_000_000, 2_000_000, 500_000],
        })
        results = self.calc.compute_portfolio(portfolio, id_col="client_id")
        assert len(results) == 3
        assert "expected_loss" in results.columns

    def test_audit_trail(self):
        """L'audit trail doit se remplir après chaque calcul."""
        self.calc.compute(pd=0.05, lgd=0.45, ead=1_000_000, exposure_id="TEST")
        log = self.calc.get_audit_log()
        assert len(log) >= 1
        assert log[-1]["output"]["exposure_id"] == "TEST"


# ═══════════════════════════════════════════════════════════════
# DECISION ENGINE TESTS
# ═══════════════════════════════════════════════════════════════

class TestDecisionEngine:
    """Tests pour le Decision Engine."""

    def setup_method(self):
        self.engine = DecisionEngine()

    def test_accept_low_pd(self):
        """PD basse → ACCEPT."""
        result = self.engine.evaluate(
            application_id="APP-001", pd_score=0.05,
            lgd=0.45, ead=1_000_000
        )
        assert result.decision == CreditDecision.ACCEPT

    def test_review_medium_pd(self):
        """PD moyenne → REVIEW."""
        result = self.engine.evaluate(
            application_id="APP-002", pd_score=0.40,
            lgd=0.45, ead=1_000_000
        )
        assert result.decision == CreditDecision.REVIEW

    def test_reject_high_pd(self):
        """PD élevée → REJECT."""
        result = self.engine.evaluate(
            application_id="APP-003", pd_score=0.75,
            lgd=0.45, ead=1_000_000
        )
        assert result.decision == CreditDecision.REJECT

    def test_rejection_reasons_documented(self):
        """Les raisons de rejet doivent être documentées."""
        result = self.engine.evaluate(
            application_id="APP-004", pd_score=0.80,
            lgd=0.45, ead=1_000_000
        )
        assert len(result.rejection_reasons) > 0

    def test_el_calculation_in_decision(self):
        """L'EL doit être calculé dans la décision."""
        result = self.engine.evaluate(
            application_id="APP-005", pd_score=0.10,
            lgd=0.50, ead=2_000_000
        )
        assert abs(result.el_amount - 100_000) < 1.0

    def test_batch_evaluation(self):
        """L'évaluation batch doit fonctionner."""
        apps = pd.DataFrame({
            "application_id": ["A1", "A2"],
            "pd": [0.05, 0.70],
            "lgd": [0.45, 0.60],
            "ead": [1_000_000, 500_000],
        })
        results = self.engine.evaluate_batch(apps)
        assert len(results) == 2
        assert "ACCEPT" in results["decision"].values
        assert "REJECT" in results["decision"].values


# ═══════════════════════════════════════════════════════════════
# IFRS 9 STAGING TESTS
# ═══════════════════════════════════════════════════════════════

class TestIFRS9Staging:
    """Tests pour le moteur de staging IFRS 9."""

    def setup_method(self):
        self.engine = IFRS9StagingEngine()

    def test_stage_1_performing(self):
        """Exposition performante sans SICR → Stage 1."""
        result = self.engine.classify(
            exposure_id="E001",
            pd_current=0.02, pd_origination=0.02,
            lgd=0.45, ead=5_000_000,
            days_past_due=0,
        )
        assert result.current_stage == 1

    def test_stage_2_sicr_pd_doubling(self):
        """Doublement de PD → SICR → Stage 2."""
        result = self.engine.classify(
            exposure_id="E002",
            pd_current=0.08, pd_origination=0.03,
            lgd=0.45, ead=5_000_000,
        )
        assert result.current_stage == 2
        assert result.sicr_triggered

    def test_stage_2_dpd_30(self):
        """DPD >= 30 jours → Stage 2."""
        result = self.engine.classify(
            exposure_id="E003",
            pd_current=0.03, pd_origination=0.03,
            lgd=0.45, ead=5_000_000,
            days_past_due=35,
        )
        assert result.current_stage == 2

    def test_stage_3_dpd_90(self):
        """DPD >= 90 jours → Stage 3 (défaut)."""
        result = self.engine.classify(
            exposure_id="E004",
            pd_current=0.50, pd_origination=0.05,
            lgd=0.60, ead=3_000_000,
            days_past_due=100,
        )
        assert result.current_stage == 3

    def test_stage_2_restructured(self):
        """Exposition restructurée → Stage 2 minimum."""
        result = self.engine.classify(
            exposure_id="E005",
            pd_current=0.02, pd_origination=0.02,
            lgd=0.45, ead=5_000_000,
            is_restructured=True,
        )
        assert result.current_stage >= 2

    def test_ecl_12_month_stage_1(self):
        """Stage 1 → ECL 12 mois."""
        result = self.engine.classify(
            exposure_id="E006",
            pd_current=0.02, pd_origination=0.02,
            lgd=0.45, ead=10_000_000,
        )
        assert result.ecl_horizon == "12_MONTH"
        expected_ecl = 0.02 * 0.45 * 10_000_000
        assert abs(result.ecl_provision - expected_ecl) < 1.0

    def test_ecl_lifetime_stage_2(self):
        """Stage 2 → ECL Lifetime."""
        result = self.engine.classify(
            exposure_id="E007",
            pd_current=0.10, pd_origination=0.03,
            lgd=0.45, ead=10_000_000,
            days_past_due=35,
        )
        assert result.ecl_horizon == "LIFETIME"
        assert result.ecl_provision > 0.10 * 0.45 * 10_000_000  # > 12-month ECL


# ═══════════════════════════════════════════════════════════════
# RAROC TESTS
# ═══════════════════════════════════════════════════════════════

class TestRAROCCalculator:
    """Tests pour le calculateur RAROC."""

    def setup_method(self):
        self.calc = RAROCCalculator()

    def test_raroc_positive(self):
        """Prêt bien pricé → RAROC positif."""
        result = self.calc.compute(
            exposure_id="E001",
            pd=0.03, lgd=0.45, ead=10_000_000,
            client_rate=0.12,
        )
        assert result.raroc > 0

    def test_value_created_above_hurdle(self):
        """RAROC > hurdle rate → value_created = True."""
        result = self.calc.compute(
            exposure_id="E002",
            pd=0.02, lgd=0.30, ead=5_000_000,
            client_rate=0.15,
        )
        if result.raroc > self.calc.hurdle_rate:
            assert result.value_created

    def test_minimum_rate_covers_costs(self):
        """Taux minimum doit couvrir les coûts + hurdle."""
        min_rate = self.calc.compute_minimum_rate(
            pd=0.05, lgd=0.45, ead=10_000_000
        )
        assert min_rate > 0.0
        assert min_rate > self.calc.default_funding_rate

    def test_underpriced_detection(self):
        """Prêt sous-tarifé → pricing_recommendation != ADEQUATE."""
        result = self.calc.compute(
            exposure_id="E003",
            pd=0.15, lgd=0.60, ead=10_000_000,
            client_rate=0.06,
        )
        assert result.pricing_recommendation in ["UNDERPRICED", "MARGINAL"]

    def test_irb_capital_calculation(self):
        """Le capital IRB doit être positif pour PD > 0."""
        K = self.calc._compute_irb_capital(pd=0.05, lgd=0.45)
        assert K > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
