import pytest
import pandas as pd
import numpy as np
import sys
import os

# Link to project root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from importlib import import_module
fe_module = import_module("01_data_layer.feature_store.feature_engineering")
BankFeatureEngineer = fe_module.BankFeatureEngineer

def test_feature_engineering_basic_ratios():
    """Vérifie que les ratios financiers sont calculés correctement sur des cas nominaux."""
    raw_data = pd.DataFrame([{
        "AMT_INCOME_TOTAL": 100000,
        "AMT_CREDIT": 500000,
        "AMT_ANNUITY": 25000,
        "DAYS_BIRTH": -18250, # 50 ans
        "DAYS_EMPLOYED": -3650 # 10 ans
    }])
    
    engineer = BankFeatureEngineer()
    df_feat = engineer.transform(raw_data)
    
    assert 'DEBT_TO_INCOME' in df_feat.columns
    assert 'AGE_YEARS' in df_feat.columns
    
    # Assertions mathématiques
    assert df_feat['DEBT_TO_INCOME'].iloc[0] == 25000 / 100000
    assert df_feat['AGE_YEARS'].iloc[0] == 18250 / 365

def test_feature_engineering_extreme_values():
    """Vérifie la robustesse face aux valeurs extrêmes (ex: Retraités, chômeurs inscrits à 365243)."""
    raw_data = pd.DataFrame([{
        "AMT_INCOME_TOTAL": 1, # Limite absurdement basse
        "AMT_CREDIT": 500000,
        "AMT_ANNUITY": 25000,
        "DAYS_BIRTH": -25000, # 68 ans
        "DAYS_EMPLOYED": 365243 # Standard Kaggle "Retraité/Chômeur"
    }])
    
    engineer = BankFeatureEngineer()
    df_feat = engineer.transform(raw_data)
    
    # L'ancienneté emploi doit être remplacée par np.nan si 365243
    # Ce qui, dans un payload à 1 ligne, va lever un drop dynamique (100% missing > 60% threshold)
    assert 'EMPLOYMENT_YEARS' not in df_feat.columns
    assert df_feat['DAYS_EMPLOYED_ANOM'].iloc[0] == 1

def test_feature_engineering_missing_values():
    """Vérifie que le manque de champs optionnels ne bloque pas le pipeline."""
    raw_data = pd.DataFrame([{
        "AMT_INCOME_TOTAL": 100000,
        "AMT_CREDIT": 500000,
        "AMT_ANNUITY": 25000,
        # MISSING_AGE
        # MISSING_EMPLOYED
    }])
    
    engineer = BankFeatureEngineer()
    
    # Should not raise exception (robustesse pipeline)
    df_feat = engineer.transform(raw_data)
    
    # La Feature AGE_YEARS n'est logiquement pas calculée car la base manque
    assert 'AGE_YEARS' not in df_feat.columns
