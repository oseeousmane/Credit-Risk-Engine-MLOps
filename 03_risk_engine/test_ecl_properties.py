import pytest
from hypothesis import given, strategies as st
from expected_loss import ExpectedLossCalculator

@pytest.fixture
def calc():
    return ExpectedLossCalculator(apply_pd_floor=True, apply_lgd_floor=True)

# Generate extreme macro-economic bounds for mathematical fuzzing
@given(
    pd=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False),
    lgd=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False),
    ead=st.floats(min_value=0.0, max_value=1_000_000_000.0, allow_nan=False, allow_infinity=False)
)
def test_ecl_fundamental_properties(calc, pd, lgd, ead):
    """
    Property-Based Testing (PBT) :
    Peu importe les valeurs d'entrée, la formule d'ECL doit toujours respecter :
    1. ECL >= 0
    2. ECL <= EAD
    3. Les Floors réglementaires doivent être appliqués.
    """
    result = calc.compute(pd=pd, ead=ead, lgd=lgd, secured=False)

    # Propriété 1 : ECL ne peut jamais être négative
    assert result.expected_loss >= 0.0

    # Propriété 2 : ECL ne peut jamais dépasser l'exposition (EAD) totale
    # On gère les légères erreurs de flottant avec un arrondi
    assert round(result.expected_loss, 2) <= round(ead, 2)

    # Propriété 3 : PD Réglementaire (Floor = 3 bps)
    assert result.pd >= calc.PD_FLOOR

    # Propriété 4 : LGD Réglementaire pour du non sécurisé
    assert result.lgd >= calc.LGD_FLOOR_UNSECURED

@given(
    pd=st.floats(min_value=0.0, max_value=1.0),
    ead=st.floats(min_value=1.0, max_value=100_000.0)
)
def test_ecl_secured_lgd_floors(calc, pd, ead):
    """
    Un prêt garanti (Secured) doit avoir un floor LGD de 10% (0.10).
    """
    result = calc.compute(pd=pd, ead=ead, lgd=0.05, secured=True)
    assert result.lgd >= calc.LGD_FLOOR_SECURED
    # Vérification que le Floor Secured a bien été appliqué, et non le Unsecured
    assert result.lgd == max(0.05, calc.LGD_FLOOR_SECURED)
