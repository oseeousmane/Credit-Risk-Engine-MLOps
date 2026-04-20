"""
Data Ingestion Pipeline — Home Credit Default Risk
=====================================================
Module d'ingestion industriel pour les 8 tables Kaggle.
- Chargement optimise (dtypes, chunks)
- Validation de schemas
- Optimisation memoire automatique
- Audit trail d'ingestion

Auteur  : Credit Risk Engine
Version : 2.0.0
"""

import pandas as pd
import numpy as np
import os
import json
import logging
from datetime import datetime
from typing import Dict, Optional, List, Tuple

logger = logging.getLogger(__name__)

# ─── Schema Registry ────────────────────────────────────────────────────
# Colonnes cles attendues pour chaque table (validation minimale)
EXPECTED_SCHEMAS = {
    "application_train": {
        "key": "SK_ID_CURR",
        "required_cols": ["SK_ID_CURR", "TARGET", "AMT_INCOME_TOTAL", "AMT_CREDIT", "AMT_ANNUITY"],
        "expected_rows_min": 300_000,
    },
    "application_test": {
        "key": "SK_ID_CURR",
        "required_cols": ["SK_ID_CURR", "AMT_INCOME_TOTAL", "AMT_CREDIT"],
        "expected_rows_min": 40_000,
    },
    "bureau": {
        "key": "SK_ID_BUREAU",
        "foreign_key": "SK_ID_CURR",
        "required_cols": ["SK_ID_CURR", "SK_ID_BUREAU", "CREDIT_ACTIVE", "DAYS_CREDIT"],
        "expected_rows_min": 1_000_000,
    },
    "bureau_balance": {
        "key": "SK_ID_BUREAU",
        "required_cols": ["SK_ID_BUREAU", "MONTHS_BALANCE", "STATUS"],
        "expected_rows_min": 20_000_000,
    },
    "previous_application": {
        "key": "SK_ID_PREV",
        "foreign_key": "SK_ID_CURR",
        "required_cols": ["SK_ID_CURR", "SK_ID_PREV", "NAME_CONTRACT_STATUS"],
        "expected_rows_min": 1_000_000,
    },
    "installments_payments": {
        "key": "SK_ID_PREV",
        "required_cols": ["SK_ID_PREV", "NUM_INSTALMENT_NUMBER", "DAYS_INSTALMENT", "AMT_INSTALMENT", "AMT_PAYMENT"],
        "expected_rows_min": 10_000_000,
    },
    "POS_CASH_balance": {
        "key": "SK_ID_PREV",
        "required_cols": ["SK_ID_PREV", "MONTHS_BALANCE", "SK_DPD"],
        "expected_rows_min": 5_000_000,
    },
    "credit_card_balance": {
        "key": "SK_ID_PREV",
        "required_cols": ["SK_ID_PREV", "MONTHS_BALANCE", "AMT_BALANCE", "AMT_CREDIT_LIMIT_ACTUAL"],
        "expected_rows_min": 3_000_000,
    },
}

# ─── Memory Optimization ────────────────────────────────────────────────

def optimize_memory(df: pd.DataFrame, verbose: bool = False) -> Tuple[pd.DataFrame, float]:
    """
    Downcast les types numeriques pour reduire l'empreinte memoire.
    Returns: (df_optimized, reduction_pct)
    """
    start_mem = df.memory_usage(deep=True).sum() / 1024**2

    for col in df.columns:
        col_type = df[col].dtype

        if col_type != object and str(col_type) != 'category':
            c_min = df[col].min()
            c_max = df[col].max()

            if str(col_type).startswith('int'):
                if c_min >= np.iinfo(np.int8).min and c_max <= np.iinfo(np.int8).max:
                    df[col] = df[col].astype(np.int8)
                elif c_min >= np.iinfo(np.int16).min and c_max <= np.iinfo(np.int16).max:
                    df[col] = df[col].astype(np.int16)
                elif c_min >= np.iinfo(np.int32).min and c_max <= np.iinfo(np.int32).max:
                    df[col] = df[col].astype(np.int32)
            elif str(col_type).startswith('float'):
                if c_min >= np.finfo(np.float32).min and c_max <= np.finfo(np.float32).max:
                    df[col] = df[col].astype(np.float32)

    end_mem = df.memory_usage(deep=True).sum() / 1024**2
    reduction = 100 * (start_mem - end_mem) / start_mem

    if verbose:
        logger.info(f"Memory: {start_mem:.1f}MB -> {end_mem:.1f}MB ({reduction:.1f}% reduction)")

    return df, reduction


class DataIngestionPipeline:
    """
    Pipeline d'ingestion des donnees Home Credit.

    Responsabilites :
    - Localiser et charger les CSV
    - Valider les schemas
    - Optimiser la memoire
    - Copier les fichiers valides vers raw/
    - Generer un rapport d'ingestion
    """

    def __init__(self, source_dir: Optional[str] = None, raw_dir: Optional[str] = None):
        self.source_dir = source_dir or os.path.join(
            os.path.dirname(__file__), ".."
        )
        self.raw_dir = raw_dir or os.path.join(
            os.path.dirname(__file__), "raw"
        )
        os.makedirs(self.raw_dir, exist_ok=True)

        self.ingestion_log: List[Dict] = []
        self.tables: Dict[str, pd.DataFrame] = {}

    def _find_csv(self, table_name: str) -> Optional[str]:
        """Localise le fichier CSV pour une table donnee."""
        filename = f"{table_name}.csv"
        # Check source dir first, then raw dir
        for search_dir in [self.source_dir, self.raw_dir]:
            path = os.path.join(search_dir, filename)
            if os.path.exists(path):
                return path
        return None

    def _validate_schema(self, df: pd.DataFrame, table_name: str) -> Dict:
        """Valide le schema d'un DataFrame contre les attentes."""
        schema = EXPECTED_SCHEMAS.get(table_name, {})
        report = {"table": table_name, "valid": True, "issues": []}

        # Check required columns
        required = schema.get("required_cols", [])
        missing = [c for c in required if c not in df.columns]
        if missing:
            report["valid"] = False
            report["issues"].append(f"Colonnes manquantes: {missing}")

        # Check minimum rows
        min_rows = schema.get("expected_rows_min", 0)
        if len(df) < min_rows * 0.5:  # 50% tolerance
            report["issues"].append(
                f"Rows: {len(df):,} < expected minimum {min_rows:,}"
            )

        # Check key uniqueness for primary tables
        key = schema.get("key")
        if key and key in df.columns and table_name in ["application_train", "application_test"]:
            n_duplicates = df[key].duplicated().sum()
            if n_duplicates > 0:
                report["issues"].append(f"Doublons sur {key}: {n_duplicates}")

        report["n_rows"] = len(df)
        report["n_cols"] = len(df.columns)
        return report

    def ingest_table(
        self,
        table_name: str,
        nrows: Optional[int] = None,
        save_parquet: bool = True,
    ) -> Optional[pd.DataFrame]:
        """
        Charge et valide une table individuelle.

        Args:
            table_name: Nom de la table (sans .csv)
            nrows: Limite de lignes (pour dev/debug)
            save_parquet: Sauvegarder en parquet pour lectures futures
        """
        csv_path = self._find_csv(table_name)
        if csv_path is None:
            logger.warning(f"[SKIP] {table_name}.csv introuvable")
            self.ingestion_log.append({
                "table": table_name, "status": "NOT_FOUND",
                "timestamp": datetime.now().isoformat(),
            })
            return None

        # Check for existing parquet (faster reload)
        parquet_path = os.path.join(self.raw_dir, f"{table_name}.parquet")
        if os.path.exists(parquet_path) and not nrows:
            logger.info(f"[CACHE] Loading {table_name} from parquet")
            df = pd.read_parquet(parquet_path)
        else:
            logger.info(f"[LOAD] {table_name} from {csv_path}")
            df = pd.read_csv(csv_path, nrows=nrows)

        # Optimize memory
        df, reduction = optimize_memory(df, verbose=True)

        # Validate schema
        validation = self._validate_schema(df, table_name)
        if not validation["valid"]:
            logger.error(f"[FAIL] {table_name}: {validation['issues']}")

        # Save parquet for fast reloads
        if save_parquet and not os.path.exists(parquet_path):
            df.to_parquet(parquet_path, index=False)
            logger.info(f"[SAVE] {table_name}.parquet ({len(df):,} rows)")

        # Log
        mem_mb = df.memory_usage(deep=True).sum() / 1024**2
        self.ingestion_log.append({
            "table": table_name,
            "status": "OK" if validation["valid"] else "WARN",
            "n_rows": len(df),
            "n_cols": len(df.columns),
            "memory_mb": round(mem_mb, 1),
            "reduction_pct": round(reduction, 1),
            "issues": validation.get("issues", []),
            "source": csv_path,
            "timestamp": datetime.now().isoformat(),
        })

        self.tables[table_name] = df
        return df

    def ingest_all(
        self,
        nrows: Optional[int] = None,
        tables: Optional[List[str]] = None,
    ) -> Dict[str, pd.DataFrame]:
        """
        Charge toutes les tables du dataset Home Credit.

        Args:
            nrows: Limite de lignes par table (pour dev/debug)
            tables: Liste des tables a charger (default: toutes)
        """
        target_tables = tables or list(EXPECTED_SCHEMAS.keys())

        logger.info(f"=== Ingestion de {len(target_tables)} tables ===")

        for table_name in target_tables:
            self.ingest_table(table_name, nrows=nrows)

        # Summary
        loaded = [t for t in self.ingestion_log if t["status"] in ("OK", "WARN")]
        total_rows = sum(t.get("n_rows", 0) for t in loaded)
        total_mem = sum(t.get("memory_mb", 0) for t in loaded)

        logger.info(
            f"\n=== Ingestion Complete ===\n"
            f"  Tables: {len(loaded)}/{len(target_tables)}\n"
            f"  Total rows: {total_rows:,}\n"
            f"  Total memory: {total_mem:.0f} MB"
        )

        return self.tables

    def get_ingestion_report(self) -> pd.DataFrame:
        """Retourne le rapport d'ingestion sous forme de DataFrame."""
        return pd.DataFrame(self.ingestion_log)

    def save_ingestion_report(self, path: Optional[str] = None):
        """Sauvegarde le rapport d'ingestion en JSON."""
        path = path or os.path.join(self.raw_dir, "ingestion_report.json")
        with open(path, "w") as f:
            json.dump(self.ingestion_log, f, indent=2)
        logger.info(f"Rapport d'ingestion sauvegarde: {path}")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    pipeline = DataIngestionPipeline()
    tables = pipeline.ingest_all()

    print("\n=== Rapport d'ingestion ===")
    for entry in pipeline.ingestion_log:
        status = entry["status"]
        name = entry["table"]
        if status == "NOT_FOUND":
            print(f"  [{status}] {name}")
        else:
            print(f"  [{status}] {name}: {entry['n_rows']:>12,} rows | {entry['memory_mb']:>7.1f} MB | -{entry['reduction_pct']:.0f}%")

    pipeline.save_ingestion_report()
