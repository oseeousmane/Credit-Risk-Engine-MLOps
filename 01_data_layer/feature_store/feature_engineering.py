"""
Feature Engineering — Bank-Grade Pipeline
============================================
Pipeline de feature engineering metier pour credit scoring.
Remplacement complet du pipeline synthetique par des features
documentees, tracables et conformes aux pratiques bancaires.

Sources :
- Application (ratios financiers, demographics)
- Bureau (historique credit externe)
- Installments (comportement de paiement)
- Credit Card (utilisation revolving)
- Previous Applications (historique demandes)

Auteur  : Credit Risk Engine
Version : 2.0.0
"""

import pandas as pd
import numpy as np
import os
import json
import logging
from datetime import datetime
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)


def _safe_div(a, b, fill=0.0):
    """Division securisee."""
    with np.errstate(divide='ignore', invalid='ignore'):
        result = np.where(b != 0, a / b, fill)
    result = np.where(np.isfinite(result), result, fill)
    return result


class BankFeatureEngineer:
    """
    Pipeline de feature engineering bancaire.
    
    Categories de features :
    1. Application — Ratios financiers + demographics
    2. Anomaly handling (DAYS_EMPLOYED 365243)
    3. Feature interactions
    4. Categorical encoding (LightGBM-native)
    5. Missing value strategy
    
    Chaque feature est documentee et tracable.
    """

    def __init__(self):
        self.feature_log: List[Dict] = []
        self.features_created: List[str] = []
        self.features_dropped: List[str] = []

    def _log_feature(self, name: str, source: str, formula: str, description: str):
        """Enregistre la creation d'une feature pour tracabilite."""
        self.feature_log.append({
            "name": name, "source": source,
            "formula": formula, "description": description,
        })
        self.features_created.append(name)

    def engineer_application_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Features derivees de la table application.
        Ratios financiers critiques pour le credit scoring.
        """
        df = df.copy()

        # ─── ANOMALY HANDLING ─────────────────────────────────
        if 'DAYS_EMPLOYED' in df.columns:
            df['DAYS_EMPLOYED_ANOM'] = (df['DAYS_EMPLOYED'] == 365243).astype(int)
            df['DAYS_EMPLOYED'] = df['DAYS_EMPLOYED'].replace(365243, np.nan)
            self._log_feature('DAYS_EMPLOYED_ANOM', 'application',
                              'DAYS_EMPLOYED == 365243', 'Flag anomalie emploi (retraites/inactifs)')

        # ─── FINANCIAL RATIOS ─────────────────────────────────
        if all(c in df.columns for c in ['AMT_ANNUITY', 'AMT_INCOME_TOTAL']):
            df['DEBT_TO_INCOME'] = _safe_div(df['AMT_ANNUITY'].values, df['AMT_INCOME_TOTAL'].values)
            self._log_feature('DEBT_TO_INCOME', 'application',
                              'AMT_ANNUITY / AMT_INCOME_TOTAL', 'Ratio dette/revenu (DTI)')

        if all(c in df.columns for c in ['AMT_CREDIT', 'AMT_ANNUITY']):
            df['CREDIT_TO_ANNUITY_RATIO'] = _safe_div(df['AMT_CREDIT'].values, df['AMT_ANNUITY'].values)
            self._log_feature('CREDIT_TO_ANNUITY_RATIO', 'application',
                              'AMT_CREDIT / AMT_ANNUITY', 'Ratio credit/annuite (proxy duree)')

        if all(c in df.columns for c in ['AMT_CREDIT', 'AMT_INCOME_TOTAL']):
            df['CREDIT_TO_INCOME_RATIO'] = _safe_div(df['AMT_CREDIT'].values, df['AMT_INCOME_TOTAL'].values)
            self._log_feature('CREDIT_TO_INCOME_RATIO', 'application',
                              'AMT_CREDIT / AMT_INCOME_TOTAL', 'Ratio credit/revenu')

        if all(c in df.columns for c in ['AMT_GOODS_PRICE', 'AMT_CREDIT']):
            df['GOODS_CREDIT_DIFF'] = df['AMT_CREDIT'] - df['AMT_GOODS_PRICE']
            df['GOODS_CREDIT_RATIO'] = _safe_div(df['AMT_GOODS_PRICE'].values, df['AMT_CREDIT'].values)
            self._log_feature('GOODS_CREDIT_DIFF', 'application',
                              'AMT_CREDIT - AMT_GOODS_PRICE', 'Difference credit vs prix bien')
            self._log_feature('GOODS_CREDIT_RATIO', 'application',
                              'AMT_GOODS_PRICE / AMT_CREDIT', 'Ratio prix bien / credit')

        # ─── DEMOGRAPHICS ────────────────────────────────────
        if 'DAYS_BIRTH' in df.columns:
            df['AGE_YEARS'] = (-df['DAYS_BIRTH'] / 365.25).round(1)
            self._log_feature('AGE_YEARS', 'application', '-DAYS_BIRTH / 365.25', 'Age en annees')

        if 'DAYS_EMPLOYED' in df.columns:
            df['EMPLOYMENT_YEARS'] = (-df['DAYS_EMPLOYED'] / 365.25).clip(lower=0)
            self._log_feature('EMPLOYMENT_YEARS', 'application',
                              '-DAYS_EMPLOYED / 365.25', 'Anciennete emploi (annees)')

        if all(c in df.columns for c in ['DAYS_EMPLOYED', 'DAYS_BIRTH']):
            df['EMPLOYMENT_TO_AGE_RATIO'] = _safe_div(df['DAYS_EMPLOYED'].values, df['DAYS_BIRTH'].values)
            self._log_feature('EMPLOYMENT_TO_AGE_RATIO', 'application',
                              'DAYS_EMPLOYED / DAYS_BIRTH', 'Ratio emploi / age')

        if all(c in df.columns for c in ['AMT_INCOME_TOTAL', 'CNT_CHILDREN']):
            df['INCOME_PER_CHILD'] = _safe_div(
                df['AMT_INCOME_TOTAL'].values, (df['CNT_CHILDREN'] + 1).values
            )
            self._log_feature('INCOME_PER_CHILD', 'application',
                              'AMT_INCOME_TOTAL / (CNT_CHILDREN + 1)', 'Revenu par personne a charge')

        if all(c in df.columns for c in ['AMT_INCOME_TOTAL', 'CNT_FAM_MEMBERS']):
            df['INCOME_PER_FAMILY'] = _safe_div(
                df['AMT_INCOME_TOTAL'].values, df['CNT_FAM_MEMBERS'].values
            )
            self._log_feature('INCOME_PER_FAMILY', 'application',
                              'AMT_INCOME_TOTAL / CNT_FAM_MEMBERS', 'Revenu par membre famille')

        # ─── REGISTRATION / ID ───────────────────────────────
        if 'DAYS_REGISTRATION' in df.columns:
            df['REGISTRATION_YEARS'] = (-df['DAYS_REGISTRATION'] / 365.25).clip(lower=0)
            self._log_feature('REGISTRATION_YEARS', 'application',
                              '-DAYS_REGISTRATION / 365.25', 'Anciennete enregistrement')

        if 'DAYS_ID_PUBLISH' in df.columns:
            df['ID_PUBLISH_YEARS'] = (-df['DAYS_ID_PUBLISH'] / 365.25).clip(lower=0)
            self._log_feature('ID_PUBLISH_YEARS', 'application',
                              '-DAYS_ID_PUBLISH / 365.25', 'Anciennete piece identite')

        # ─── EXTERNAL SOURCES INTERACTION ─────────────────────
        ext_cols = [c for c in df.columns if c.startswith('EXT_SOURCE')]
        if len(ext_cols) >= 2:
            df['EXT_SOURCE_MEAN'] = df[ext_cols].mean(axis=1)
            df['EXT_SOURCE_STD'] = df[ext_cols].std(axis=1)
            df['EXT_SOURCE_PRODUCT'] = df[ext_cols].prod(axis=1)
            self._log_feature('EXT_SOURCE_MEAN', 'application', 'mean(EXT_SOURCE_*)', 'Score externe moyen')
            self._log_feature('EXT_SOURCE_STD', 'application', 'std(EXT_SOURCE_*)', 'Variabilite scores externes')
            self._log_feature('EXT_SOURCE_PRODUCT', 'application', 'prod(EXT_SOURCE_*)', 'Produit scores externes')

        # ─── FLAG AGGREGATION (DOCUMENT FLAGS) ────────────────
        flag_cols = [c for c in df.columns if c.startswith('FLAG_DOCUMENT_')]
        if flag_cols:
            df['FLAG_DOCUMENT_SUM'] = df[flag_cols].sum(axis=1)
            self._log_feature('FLAG_DOCUMENT_SUM', 'application',
                              'sum(FLAG_DOCUMENT_*)', 'Nombre total de documents fournis')

        # Contact flags
        contact_cols = [c for c in df.columns if 'FLAG_' in c and ('PHONE' in c or 'EMAIL' in c or 'MOBILE' in c)]
        if contact_cols:
            df['FLAG_CONTACT_SUM'] = df[contact_cols].sum(axis=1)
            self._log_feature('FLAG_CONTACT_SUM', 'application',
                              'sum(contact_flags)', 'Nombre de contacts fournis')

        return df

    def handle_categoricals(self, df: pd.DataFrame) -> pd.DataFrame:
        """Encode les variables categorielles pour LightGBM."""
        cat_cols = df.select_dtypes(include=['object']).columns.tolist()
        for col in cat_cols:
            df[col] = df[col].astype('category')
        logger.info(f"Encoded {len(cat_cols)} categorical columns")
        return df

    def drop_low_quality_features(self, df: pd.DataFrame, missing_threshold: float = 0.60) -> pd.DataFrame:
        """Supprime les colonnes avec trop de valeurs manquantes."""
        missing_pct = df.isnull().mean()
        to_drop = missing_pct[missing_pct > missing_threshold].index.tolist()
        if to_drop:
            df = df.drop(columns=to_drop)
            self.features_dropped.extend(to_drop)
            logger.info(f"Dropped {len(to_drop)} features (>{missing_threshold:.0%} missing)")
        return df

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Pipeline complet de feature engineering.
        
        1. Features application
        2. Drop low quality
        3. Handle categoricals
        """
        logger.info(f"Feature engineering: input shape = {df.shape}")

        df = self.engineer_application_features(df)
        df = self.drop_low_quality_features(df)
        df = self.handle_categoricals(df)

        logger.info(f"Feature engineering: output shape = {df.shape}")
        logger.info(f"  Created: {len(self.features_created)} features")
        logger.info(f"  Dropped: {len(self.features_dropped)} features")

        return df

    def get_feature_catalog(self) -> pd.DataFrame:
        """Retourne le catalogue des features creees."""
        return pd.DataFrame(self.feature_log)

    def save_feature_catalog(self, path: Optional[str] = None):
        """Sauvegarde le catalogue de features en JSON."""
        if path is None:
            path = os.path.join(os.path.dirname(__file__), "feature_catalog.json")
        with open(path, "w") as f:
            json.dump(self.feature_log, f, indent=2)
        logger.info(f"Feature catalog saved: {path}")


def build_curated_data(nrows: Optional[int] = None):
    """
    Pipeline complet : charge ABT curated, applique feature engineering, sauvegarde.
    """
    base_dir = os.path.dirname(__file__)
    curated_dir = os.path.join(base_dir, "..", "curated")

    # Try parquet first, then CSV
    parquet_path = os.path.join(curated_dir, "curated_dataset.parquet")
    csv_path = os.path.join(curated_dir, "curated_dataset.csv")

    if os.path.exists(parquet_path) and not nrows:
        df = pd.read_parquet(parquet_path)
    elif os.path.exists(csv_path):
        df = pd.read_csv(csv_path, nrows=nrows)
    else:
        # Fallback: raw application_train
        raw_path = os.path.join(base_dir, "..", "raw", "application_train.csv")
        root_path = os.path.join(base_dir, "..", "..", "application_train.csv")
        if os.path.exists(raw_path):
            df = pd.read_csv(raw_path, nrows=nrows)
        elif os.path.exists(root_path):
            df = pd.read_csv(root_path, nrows=nrows)
        else:
            raise FileNotFoundError("No data source found")

    engineer = BankFeatureEngineer()
    df = engineer.transform(df)

    # Save
    out_path = os.path.join(curated_dir, "modeling_base_table.parquet")
    os.makedirs(curated_dir, exist_ok=True)
    df.to_parquet(out_path, index=False)
    engineer.save_feature_catalog()

    print(f"Curated dataset: {df.shape} -> {out_path}")
    return df


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    build_curated_data()
