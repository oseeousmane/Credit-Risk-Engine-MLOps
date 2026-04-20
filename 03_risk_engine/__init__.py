"""
03_risk_engine — Credit Risk Engine
====================================
Moteur de calcul du risque de crédit conforme COBAC / Bâle II-III / IFRS 9.

Composants :
- expected_loss    : Calcul EL = PD × LGD × EAD
- decision_engine  : Logique Accept / Review / Reject
- ifrs9_staging    : Classification Stage 1/2/3 + provisionnement
- raroc            : Risk-Adjusted Return on Capital
"""

from .expected_loss import ExpectedLossCalculator
from .decision_engine import DecisionEngine
from .ifrs9_staging import IFRS9StagingEngine
from .raroc import RAROCCalculator

__all__ = [
    "ExpectedLossCalculator",
    "DecisionEngine",
    "IFRS9StagingEngine",
    "RAROCCalculator",
]
