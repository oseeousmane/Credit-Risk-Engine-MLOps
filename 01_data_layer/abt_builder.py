"""
ABT Builder — Analytical Base Table
======================================
Construction du dataset analytique final au niveau SK_ID_CURR.
Jointures multi-tables, agregations metier, feature engineering bancaire.

Schema relationnel :
  application_train (SK_ID_CURR)
    |-- bureau (SK_ID_CURR -> N) 
    |     |-- bureau_balance (SK_ID_BUREAU -> N)
    |-- previous_application (SK_ID_CURR -> N)
    |     |-- installments_payments (SK_ID_PREV -> N)
    |     |-- POS_CASH_balance (SK_ID_PREV -> N)
    |     |-- credit_card_balance (SK_ID_PREV -> N)

Auteur  : Credit Risk Engine
Version : 2.0.0
"""

import pandas as pd
import numpy as np
import os
import logging
import json
from datetime import datetime
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)


def _safe_div(a, b, fill=0.0):
    """Division securisee evitant division par zero et inf."""
    result = a / b
    result = result.replace([np.inf, -np.inf], np.nan).fillna(fill)
    return result


# ═══════════════════════════════════════════════════════════════
# AGGREGATION FUNCTIONS — One per source table
# ═══════════════════════════════════════════════════════════════

def aggregate_bureau(bureau: pd.DataFrame, bureau_balance: Optional[pd.DataFrame] = None) -> pd.DataFrame:
    """
    Agrege les donnees bureau de credit au niveau SK_ID_CURR.
    
    Features generees :
    - BUREAU_ACTIVE_COUNT : Nombre de credits actifs
    - BUREAU_CLOSED_COUNT : Nombre de credits fermes
    - BUREAU_DEFAULT_COUNT : Nombre de defauts
    - BUREAU_MEAN_DAYS_CREDIT : Anciennete moyenne des credits
    - BUREAU_TOTAL_DEBT : Total dette oustanding
    - BUREAU_TOTAL_CREDIT_SUM : Total credit accorde
    - BUREAU_CREDIT_UTILIZATION : Ratio utilisation
    - BUREAU_OVERDUE_SUM : Total echeances impayees
    - BUREAU_MEAN_CREDIT_DURATION : Duree moyenne des credits
    """
    logger.info("Aggregation bureau...")

    agg = {}

    # Count by status
    if 'CREDIT_ACTIVE' in bureau.columns:
        status_dummies = pd.get_dummies(bureau['CREDIT_ACTIVE'], prefix='BUREAU_STATUS')
        bureau = pd.concat([bureau, status_dummies], axis=1)
        for col in status_dummies.columns:
            agg[col] = 'sum'

    # Numeric aggregations
    num_aggs = {
        'DAYS_CREDIT': ['count', 'mean', 'min', 'max'],
        'DAYS_CREDIT_ENDDATE': ['mean', 'min'],
        'AMT_CREDIT_SUM': ['sum', 'mean', 'max'],
        'AMT_CREDIT_SUM_DEBT': ['sum', 'mean', 'max'],
        'AMT_CREDIT_SUM_OVERDUE': ['sum', 'mean'],
        'AMT_CREDIT_SUM_LIMIT': ['sum', 'mean'],
        'DAYS_CREDIT_UPDATE': ['mean', 'min'],
        'CNT_CREDIT_PROLONG': ['sum'],
        'AMT_ANNUITY': ['sum', 'mean'],
    }

    for col, funcs in num_aggs.items():
        if col in bureau.columns:
            for func in funcs:
                agg[col] = agg.get(col, [])
                if isinstance(agg[col], list):
                    agg[col].append(func)
                else:
                    agg[col] = [agg[col], func]

    # Group by SK_ID_CURR
    bureau_agg = bureau.groupby('SK_ID_CURR').agg(agg)
    bureau_agg.columns = ['BUREAU_' + '_'.join(col).upper() if isinstance(col, tuple) else 'BUREAU_' + col.upper() 
                          for col in bureau_agg.columns]
    bureau_agg = bureau_agg.reset_index()

    # Derived features
    if 'BUREAU_AMT_CREDIT_SUM_DEBT_SUM' in bureau_agg.columns and 'BUREAU_AMT_CREDIT_SUM_SUM' in bureau_agg.columns:
        bureau_agg['BUREAU_CREDIT_UTILIZATION'] = _safe_div(
            bureau_agg['BUREAU_AMT_CREDIT_SUM_DEBT_SUM'],
            bureau_agg['BUREAU_AMT_CREDIT_SUM_SUM']
        )

    # Bureau balance aggregation (if provided)
    if bureau_balance is not None and 'SK_ID_BUREAU' in bureau_balance.columns:
        logger.info("Aggregation bureau_balance...")
        
        # Status distribution
        bb_agg_cols = {}
        if 'STATUS' in bureau_balance.columns:
            # Count DPD statuses (1,2,3,4,5 = months overdue, C=closed, X=unknown, 0=current)
            for status in ['0', '1', '2', '3', '4', '5', 'C']:
                col_name = f'BB_STATUS_{status}'
                bureau_balance[col_name] = (bureau_balance['STATUS'] == status).astype(int)
                bb_agg_cols[col_name] = 'sum'

        if 'MONTHS_BALANCE' in bureau_balance.columns:
            bb_agg_cols['MONTHS_BALANCE'] = ['count', 'min']

        if bb_agg_cols:
            bb_by_bureau = bureau_balance.groupby('SK_ID_BUREAU').agg(bb_agg_cols)
            bb_by_bureau.columns = ['BB_' + '_'.join(col).upper() if isinstance(col, tuple) else col.upper()
                                    for col in bb_by_bureau.columns]
            bb_by_bureau = bb_by_bureau.reset_index()

            # Join back to bureau, then aggregate by SK_ID_CURR
            bureau_with_bb = bureau[['SK_ID_CURR', 'SK_ID_BUREAU']].merge(
                bb_by_bureau, on='SK_ID_BUREAU', how='left'
            )
            bb_by_curr = bureau_with_bb.drop('SK_ID_BUREAU', axis=1).groupby('SK_ID_CURR').mean()
            bb_by_curr.columns = [c if c.startswith('BB_') else f'BB_{c}' for c in bb_by_curr.columns]
            bb_by_curr = bb_by_curr.reset_index()

            bureau_agg = bureau_agg.merge(bb_by_curr, on='SK_ID_CURR', how='left')

    logger.info(f"Bureau features: {bureau_agg.shape[1] - 1} colonnes")
    return bureau_agg


def aggregate_previous_application(prev: pd.DataFrame) -> pd.DataFrame:
    """
    Agrege les demandes anterieures au niveau SK_ID_CURR.
    
    Features :
    - PREV_APP_COUNT : Nombre de demandes
    - PREV_APPROVED_COUNT / REFUSED_COUNT
    - PREV_REFUSED_RATE : Taux de refus
    - PREV_MEAN_AMT_CREDIT / AMT_APPLICATION
    - PREV_MEAN_DAYS_DECISION
    """
    logger.info("Aggregation previous_application...")

    agg = {}

    # Status counts
    if 'NAME_CONTRACT_STATUS' in prev.columns:
        for status in ['Approved', 'Refused', 'Canceled']:
            col = f'PREV_{status.upper()}_FLAG'
            prev[col] = (prev['NAME_CONTRACT_STATUS'] == status).astype(int)
            agg[col] = 'sum'

    # Numeric features
    num_aggs = {
        'AMT_CREDIT': ['sum', 'mean', 'max'],
        'AMT_APPLICATION': ['sum', 'mean'],
        'AMT_ANNUITY': ['sum', 'mean'],
        'AMT_DOWN_PAYMENT': ['sum', 'mean'],
        'AMT_GOODS_PRICE': ['sum', 'mean'],
        'DAYS_DECISION': ['mean', 'min', 'max'],
        'CNT_PAYMENT': ['mean', 'sum'],
        'DAYS_FIRST_DRAWING': ['mean'],
        'DAYS_FIRST_DUE': ['mean'],
        'DAYS_LAST_DUE': ['mean'],
        'SK_ID_PREV': ['count'],  # Total applications
    }

    for col, funcs in num_aggs.items():
        if col in prev.columns:
            agg[col] = funcs

    prev_agg = prev.groupby('SK_ID_CURR').agg(agg)
    prev_agg.columns = ['PREV_' + '_'.join(col).upper() if isinstance(col, tuple) else 'PREV_' + col.upper()
                        for col in prev_agg.columns]
    prev_agg = prev_agg.reset_index()

    # Rename count column
    count_col = [c for c in prev_agg.columns if c.startswith('PREV_SK_ID_PREV')]
    if count_col:
        prev_agg = prev_agg.rename(columns={count_col[0]: 'PREV_APP_COUNT'})

    # Derived: refused rate
    if 'PREV_REFUSED_FLAG_SUM' in prev_agg.columns and 'PREV_APP_COUNT' in prev_agg.columns:
        prev_agg['PREV_REFUSED_RATE'] = _safe_div(
            prev_agg['PREV_REFUSED_FLAG_SUM'], prev_agg['PREV_APP_COUNT']
        )

    logger.info(f"Previous applications features: {prev_agg.shape[1] - 1} colonnes")
    return prev_agg


def aggregate_installments(inst: pd.DataFrame, prev: Optional[pd.DataFrame] = None) -> pd.DataFrame:
    """
    Agrege les echeanciers de paiement au niveau SK_ID_CURR.
    
    Features :
    - INST_LATE_PAYMENT_RATE : % paiements en retard
    - INST_MEAN_DAYS_LATE : Retard moyen
    - INST_MAX_DAYS_LATE : Retard max
    - INST_PAYMENT_DIFF_MEAN : Ecart moyen montant
    - INST_TOTAL_PAYMENTS : Nombre total de paiements
    """
    logger.info("Aggregation installments_payments...")

    # Compute payment delay and diff
    if 'DAYS_INSTALMENT' in inst.columns and 'DAYS_ENTRY_PAYMENT' in inst.columns:
        inst['DAYS_LATE'] = inst['DAYS_ENTRY_PAYMENT'] - inst['DAYS_INSTALMENT']
        inst['DAYS_LATE'] = inst['DAYS_LATE'].clip(lower=0)
        inst['IS_LATE'] = (inst['DAYS_LATE'] > 0).astype(int)

    if 'AMT_INSTALMENT' in inst.columns and 'AMT_PAYMENT' in inst.columns:
        inst['PAYMENT_DIFF'] = inst['AMT_INSTALMENT'] - inst['AMT_PAYMENT']
        inst['PAYMENT_RATIO'] = _safe_div(inst['AMT_PAYMENT'], inst['AMT_INSTALMENT'], fill=1.0)

    # Aggregate by SK_ID_PREV first
    agg_by_prev = {}
    for col, funcs in {
        'DAYS_LATE': ['mean', 'max', 'sum'],
        'IS_LATE': ['mean', 'sum'],
        'PAYMENT_DIFF': ['mean', 'max', 'sum'],
        'PAYMENT_RATIO': ['mean', 'min'],
        'AMT_PAYMENT': ['sum', 'mean'],
        'AMT_INSTALMENT': ['sum', 'mean'],
        'NUM_INSTALMENT_NUMBER': ['max'],
    }.items():
        if col in inst.columns:
            agg_by_prev[col] = funcs

    inst_by_prev = inst.groupby('SK_ID_PREV').agg(agg_by_prev)
    inst_by_prev.columns = ['INST_' + '_'.join(col).upper() for col in inst_by_prev.columns]
    inst_by_prev = inst_by_prev.reset_index()

    # Map SK_ID_PREV -> SK_ID_CURR via previous_application
    if prev is not None and 'SK_ID_PREV' in prev.columns and 'SK_ID_CURR' in prev.columns:
        prev_map = prev[['SK_ID_PREV', 'SK_ID_CURR']].drop_duplicates()
        inst_by_prev = inst_by_prev.merge(prev_map, on='SK_ID_PREV', how='left')
    elif 'SK_ID_CURR' in inst.columns:
        pass  # SK_ID_CURR already present
    else:
        logger.warning("Cannot map installments to SK_ID_CURR")
        return pd.DataFrame()

    # Aggregate by SK_ID_CURR
    if 'SK_ID_CURR' in inst_by_prev.columns:
        inst_cols = [c for c in inst_by_prev.columns if c.startswith('INST_')]
        inst_agg = inst_by_prev.groupby('SK_ID_CURR')[inst_cols].mean().reset_index()

        # Rename key features
        rename_map = {
            'INST_IS_LATE_MEAN': 'INST_LATE_PAYMENT_RATE',
            'INST_DAYS_LATE_MEAN': 'INST_MEAN_DAYS_LATE',
            'INST_DAYS_LATE_MAX': 'INST_MAX_DAYS_LATE',
            'INST_PAYMENT_DIFF_MEAN': 'INST_PAYMENT_DIFF_MEAN',
        }
        inst_agg = inst_agg.rename(columns={k: v for k, v in rename_map.items() if k in inst_agg.columns})

        logger.info(f"Installments features: {inst_agg.shape[1] - 1} colonnes")
        return inst_agg

    return pd.DataFrame()


def aggregate_credit_card(cc: pd.DataFrame, prev: Optional[pd.DataFrame] = None) -> pd.DataFrame:
    """
    Agrege les soldes cartes de credit au niveau SK_ID_CURR.
    
    Features :
    - CC_UTILIZATION_RATE : Solde / Limite moyen
    - CC_MAX_UTILIZATION : Utilisation max
    - CC_MEAN_BALANCE : Solde moyen
    - CC_DRAWING_COUNT : Nombre de tirages
    - CC_MIN_PAYMENT_RATIO : Ratio paiement minimum
    """
    logger.info("Aggregation credit_card_balance...")

    # Compute utilization
    if 'AMT_BALANCE' in cc.columns and 'AMT_CREDIT_LIMIT_ACTUAL' in cc.columns:
        cc['CC_UTILIZATION'] = _safe_div(cc['AMT_BALANCE'], cc['AMT_CREDIT_LIMIT_ACTUAL'])

    if 'AMT_PAYMENT_CURRENT' in cc.columns and 'AMT_INST_MIN_REGULARITY' in cc.columns:
        cc['CC_PAYMENT_RATIO'] = _safe_div(cc['AMT_PAYMENT_CURRENT'], cc['AMT_INST_MIN_REGULARITY'], fill=1.0)

    # Aggregate by SK_ID_PREV
    agg_by_prev = {}
    for col, funcs in {
        'AMT_BALANCE': ['mean', 'max'],
        'AMT_CREDIT_LIMIT_ACTUAL': ['mean', 'max'],
        'CC_UTILIZATION': ['mean', 'max'],
        'AMT_DRAWINGS_CURRENT': ['sum', 'mean'],
        'AMT_DRAWINGS_ATM_CURRENT': ['sum', 'mean'],
        'CNT_DRAWINGS_CURRENT': ['sum', 'mean'],
        'AMT_PAYMENT_CURRENT': ['sum', 'mean'],
        'CC_PAYMENT_RATIO': ['mean', 'min'],
        'SK_DPD': ['mean', 'max'],
        'MONTHS_BALANCE': ['count', 'min'],
    }.items():
        if col in cc.columns:
            agg_by_prev[col] = funcs

    cc_by_prev = cc.groupby('SK_ID_PREV').agg(agg_by_prev)
    cc_by_prev.columns = ['CC_' + '_'.join(col).upper() for col in cc_by_prev.columns]
    cc_by_prev = cc_by_prev.reset_index()

    # Map to SK_ID_CURR
    if prev is not None and 'SK_ID_PREV' in prev.columns:
        prev_map = prev[['SK_ID_PREV', 'SK_ID_CURR']].drop_duplicates()
        cc_by_prev = cc_by_prev.merge(prev_map, on='SK_ID_PREV', how='left')

    if 'SK_ID_CURR' in cc_by_prev.columns:
        cc_cols = [c for c in cc_by_prev.columns if c.startswith('CC_')]
        cc_agg = cc_by_prev.groupby('SK_ID_CURR')[cc_cols].mean().reset_index()

        rename_map = {
            'CC_CC_UTILIZATION_MEAN': 'CC_UTILIZATION_RATE',
            'CC_CC_UTILIZATION_MAX': 'CC_MAX_UTILIZATION',
            'CC_AMT_BALANCE_MEAN': 'CC_MEAN_BALANCE',
            'CC_CNT_DRAWINGS_CURRENT_SUM': 'CC_DRAWING_COUNT',
        }
        cc_agg = cc_agg.rename(columns={k: v for k, v in rename_map.items() if k in cc_agg.columns})

        logger.info(f"Credit card features: {cc_agg.shape[1] - 1} colonnes")
        return cc_agg

    return pd.DataFrame()


def aggregate_pos_cash(pos: pd.DataFrame, prev: Optional[pd.DataFrame] = None) -> pd.DataFrame:
    """
    Agrege les POS/cash balances au niveau SK_ID_CURR.
    
    Features :
    - POS_MEAN_DPD : DPD moyen
    - POS_MAX_DPD : DPD max
    - POS_COMPLETED_COUNT : Nombre de contrats termines
    - POS_ACTIVE_COUNT : Nombre de contrats actifs
    """
    logger.info("Aggregation POS_CASH_balance...")

    if 'NAME_CONTRACT_STATUS' in pos.columns:
        pos['POS_COMPLETED'] = (pos['NAME_CONTRACT_STATUS'] == 'Completed').astype(int)
        pos['POS_ACTIVE'] = (pos['NAME_CONTRACT_STATUS'] == 'Active').astype(int)

    agg_by_prev = {}
    for col, funcs in {
        'SK_DPD': ['mean', 'max'],
        'SK_DPD_DEF': ['mean', 'max'],
        'POS_COMPLETED': ['sum'],
        'POS_ACTIVE': ['sum'],
        'CNT_INSTALMENT': ['mean', 'max'],
        'CNT_INSTALMENT_FUTURE': ['mean'],
        'MONTHS_BALANCE': ['count', 'min'],
    }.items():
        if col in pos.columns:
            agg_by_prev[col] = funcs

    pos_by_prev = pos.groupby('SK_ID_PREV').agg(agg_by_prev)
    pos_by_prev.columns = ['POS_' + '_'.join(col).upper() for col in pos_by_prev.columns]
    pos_by_prev = pos_by_prev.reset_index()

    # Map to SK_ID_CURR
    if prev is not None and 'SK_ID_PREV' in prev.columns:
        prev_map = prev[['SK_ID_PREV', 'SK_ID_CURR']].drop_duplicates()
        pos_by_prev = pos_by_prev.merge(prev_map, on='SK_ID_PREV', how='left')

    if 'SK_ID_CURR' in pos_by_prev.columns:
        pos_cols = [c for c in pos_by_prev.columns if c.startswith('POS_')]
        pos_agg = pos_by_prev.groupby('SK_ID_CURR')[pos_cols].mean().reset_index()
        logger.info(f"POS/Cash features: {pos_agg.shape[1] - 1} colonnes")
        return pos_agg

    return pd.DataFrame()


# ═══════════════════════════════════════════════════════════════
# ABT BUILDER — Main Class
# ═══════════════════════════════════════════════════════════════

class ABTBuilder:
    """
    Construit l'Analytical Base Table a partir des tables Home Credit.
    
    Pipeline :
    1. Charger les tables depuis raw/ (parquet ou CSV)
    2. Agreger chaque table au niveau SK_ID_CURR
    3. Left join sur la table application
    4. Sauvegarder le dataset final dans curated/
    """

    def __init__(self, raw_dir: Optional[str] = None, curated_dir: Optional[str] = None):
        self.raw_dir = raw_dir or os.path.join(os.path.dirname(__file__), "raw")
        self.curated_dir = curated_dir or os.path.join(os.path.dirname(__file__), "curated")
        os.makedirs(self.curated_dir, exist_ok=True)

        self.build_metadata: Dict = {}

    def _load_table(self, name: str, nrows: Optional[int] = None) -> Optional[pd.DataFrame]:
        """Charge une table (parquet prioritaire, fallback CSV)."""
        parquet_path = os.path.join(self.raw_dir, f"{name}.parquet")
        if os.path.exists(parquet_path) and not nrows:
            return pd.read_parquet(parquet_path)

        # Check raw dir
        csv_path = os.path.join(self.raw_dir, f"{name}.csv")
        if os.path.exists(csv_path):
            return pd.read_csv(csv_path, nrows=nrows)

        # Check project root
        root_csv = os.path.join(self.raw_dir, "..", "..", f"{name}.csv")
        if os.path.exists(root_csv):
            return pd.read_csv(root_csv, nrows=nrows)

        logger.warning(f"Table {name} introuvable")
        return None

    def build(self, nrows: Optional[int] = None, dataset: str = "train") -> pd.DataFrame:
        """
        Construit l'ABT complete.
        
        Args:
            nrows: Limite de lignes pour dev/debug
            dataset: 'train' ou 'test'
        """
        table_name = f"application_{dataset}"
        start_time = datetime.now()
        logger.info(f"=== Construction ABT ({dataset}) ===")

        # 1. Load base table
        app = self._load_table(table_name, nrows)
        if app is None:
            raise FileNotFoundError(f"{table_name} introuvable")

        initial_shape = app.shape
        logger.info(f"Application: {app.shape}")

        # 2. Load and aggregate auxiliary tables
        bureau = self._load_table("bureau")
        bureau_balance = self._load_table("bureau_balance")
        prev = self._load_table("previous_application")
        inst = self._load_table("installments_payments")
        cc = self._load_table("credit_card_balance")
        pos = self._load_table("POS_CASH_balance")

        # 3. Build aggregations
        tables_to_join = []

        if bureau is not None:
            bureau_agg = aggregate_bureau(bureau, bureau_balance)
            tables_to_join.append(("bureau", bureau_agg))

        if prev is not None:
            prev_agg = aggregate_previous_application(prev)
            tables_to_join.append(("previous_application", prev_agg))

            if inst is not None:
                inst_agg = aggregate_installments(inst, prev)
                if len(inst_agg) > 0:
                    tables_to_join.append(("installments", inst_agg))

            if cc is not None:
                cc_agg = aggregate_credit_card(cc, prev)
                if len(cc_agg) > 0:
                    tables_to_join.append(("credit_card", cc_agg))

            if pos is not None:
                pos_agg = aggregate_pos_cash(pos, prev)
                if len(pos_agg) > 0:
                    tables_to_join.append(("pos_cash", pos_agg))

        # 4. Left join all aggregations onto application
        abt = app.copy()
        for table_name_join, agg_df in tables_to_join:
            n_before = len(abt.columns)
            abt = abt.merge(agg_df, on='SK_ID_CURR', how='left')
            n_added = len(abt.columns) - n_before
            logger.info(f"  Joined {table_name_join}: +{n_added} features")

        # 5. Validate
        assert len(abt) == initial_shape[0], "Row count mismatch after joins!"
        assert abt['SK_ID_CURR'].is_unique, "Duplicate SK_ID_CURR detected!"

        # 6. Metadata
        elapsed = (datetime.now() - start_time).total_seconds()
        self.build_metadata = {
            "dataset": dataset,
            "n_rows": len(abt),
            "n_features": len(abt.columns),
            "initial_features": initial_shape[1],
            "added_features": len(abt.columns) - initial_shape[1],
            "tables_joined": [t[0] for t in tables_to_join],
            "build_time_seconds": round(elapsed, 1),
            "build_timestamp": datetime.now().isoformat(),
        }

        logger.info(
            f"\n=== ABT Complete ===\n"
            f"  Shape: {abt.shape}\n"
            f"  Features: {initial_shape[1]} base + {len(abt.columns) - initial_shape[1]} derived\n"
            f"  Build time: {elapsed:.1f}s"
        )

        return abt

    def save(self, abt: pd.DataFrame, name: str = "curated_dataset"):
        """Sauvegarde l'ABT en CSV et Parquet."""
        csv_path = os.path.join(self.curated_dir, f"{name}.csv")
        parquet_path = os.path.join(self.curated_dir, f"{name}.parquet")

        abt.to_csv(csv_path, index=False)
        abt.to_parquet(parquet_path, index=False)

        # Save metadata
        meta_path = os.path.join(self.curated_dir, f"{name}_metadata.json")
        with open(meta_path, "w") as f:
            json.dump(self.build_metadata, f, indent=2)

        size_mb = os.path.getsize(parquet_path) / 1024**2
        logger.info(f"ABT sauvegardee: {parquet_path} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    builder = ABTBuilder()
    abt = builder.build()
    builder.save(abt)

    print(f"\nABT finale: {abt.shape}")
    print(f"Metadata: {json.dumps(builder.build_metadata, indent=2)}")
