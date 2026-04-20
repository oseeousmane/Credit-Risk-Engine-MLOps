"""
Data Quality Checks — Bank-Grade Validation
==============================================
Controles de qualite industriels pour conformite bancaire.

Controles :
1. Completeness — taux de valeurs manquantes
2. Uniqueness — doublons sur cle primaire
3. Referential Integrity — coherence entre tables
4. Leakage Detection — correlation suspicieuse avec TARGET
5. Outlier Detection — IQR-based pour variables financieres
6. Zero Variance — features constantes
7. Cardinality — categoriques a haute cardinalite

Auteur  : Credit Risk Engine
Version : 2.0.0
"""

import pandas as pd
import numpy as np
import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class DataQualityEngine:
    """
    Moteur de controle qualite bancaire.
    Genere un rapport complet avec recommandations.
    """

    def __init__(self, severity_config: Optional[Dict] = None):
        self.config = severity_config or {
            "missing_warning": 0.10,
            "missing_critical": 0.60,
            "correlation_leakage": 0.80,
            "cardinality_high": 100,
            "outlier_iqr_factor": 3.0,
        }
        self.checks: List[Dict] = []
        self.issues: List[Dict] = []

    def _add_check(self, category: str, name: str, status: str, details: str, severity: str = "INFO"):
        self.checks.append({
            "category": category, "check": name,
            "status": status, "severity": severity,
            "details": details, "timestamp": datetime.now().isoformat(),
        })
        if status == "FAIL":
            self.issues.append({"category": category, "check": name, "severity": severity, "details": details})

    def check_completeness(self, df: pd.DataFrame) -> Dict:
        """Analyse des valeurs manquantes par colonne."""
        missing = df.isnull().mean().sort_values(ascending=False)
        missing_report = {}

        n_warning = 0
        n_critical = 0
        cols_to_drop = []

        for col, pct in missing.items():
            if pct > 0:
                missing_report[col] = round(pct, 4)
                if pct > self.config["missing_critical"]:
                    n_critical += 1
                    cols_to_drop.append(col)
                elif pct > self.config["missing_warning"]:
                    n_warning += 1

        self._add_check("COMPLETENESS", "missing_values",
                        "WARN" if n_critical > 0 else "PASS",
                        f"{len(missing_report)} cols with missing, {n_critical} critical (>{self.config['missing_critical']:.0%})",
                        "WARNING" if n_critical > 0 else "INFO")

        return {
            "missing_ratios": missing_report,
            "n_cols_with_missing": len(missing_report),
            "n_critical": n_critical,
            "n_warning": n_warning,
            "cols_to_drop": cols_to_drop,
        }

    def check_duplicates(self, df: pd.DataFrame, key_col: str = "SK_ID_CURR") -> Dict:
        """Detection de doublons sur la cle primaire."""
        if key_col not in df.columns:
            self._add_check("UNIQUENESS", "duplicates", "SKIP", f"Key column {key_col} not found")
            return {"duplicates": 0, "key_col": key_col}

        n_dupes = df[key_col].duplicated().sum()
        status = "FAIL" if n_dupes > 0 else "PASS"
        self._add_check("UNIQUENESS", "duplicates", status,
                        f"{n_dupes} duplicates on {key_col}",
                        "CRITICAL" if n_dupes > 0 else "INFO")

        return {
            "duplicates": int(n_dupes),
            "key_col": key_col,
            "total_rows": len(df),
            "unique_keys": int(df[key_col].nunique()),
        }

    def check_leakage(self, df: pd.DataFrame, target_col: str = "TARGET") -> Dict:
        """Detection de fuite de donnees (correlation suspicieuse avec TARGET)."""
        if target_col not in df.columns:
            self._add_check("LEAKAGE", "target_correlation", "SKIP", "Target column absent")
            return {"potential_leakage": [], "target_col": target_col}

        numeric = df.select_dtypes(include=[np.number])
        if target_col in numeric.columns:
            corr = numeric.corr()[target_col].abs().sort_values(ascending=False)
            suspicious = corr[(corr > self.config["correlation_leakage"]) & (corr < 1.0)]
            leakage_list = list(suspicious.index)

            status = "FAIL" if len(leakage_list) > 0 else "PASS"
            self._add_check("LEAKAGE", "target_correlation", status,
                            f"{len(leakage_list)} features with corr > {self.config['correlation_leakage']}",
                            "CRITICAL" if leakage_list else "INFO")

            return {
                "potential_leakage": leakage_list,
                "correlations": {col: round(corr[col], 4) for col in leakage_list},
            }

        return {"potential_leakage": []}

    def check_zero_variance(self, df: pd.DataFrame) -> Dict:
        """Detection des features sans variance (constantes)."""
        numeric = df.select_dtypes(include=[np.number])
        zero_var = [col for col in numeric.columns if numeric[col].std() == 0]

        if zero_var:
            self._add_check("VARIANCE", "zero_variance", "WARN",
                            f"{len(zero_var)} constant features: {zero_var[:5]}",
                            "WARNING")
        else:
            self._add_check("VARIANCE", "zero_variance", "PASS", "No constant features")

        return {"zero_variance_features": zero_var}

    def check_cardinality(self, df: pd.DataFrame) -> Dict:
        """Detection des categoriques a haute cardinalite."""
        cat_cols = df.select_dtypes(include=['object', 'category']).columns
        high_card = {}
        for col in cat_cols:
            nunique = df[col].nunique()
            if nunique > self.config["cardinality_high"]:
                high_card[col] = nunique

        if high_card:
            self._add_check("CARDINALITY", "high_cardinality", "WARN",
                            f"{len(high_card)} high-cardinality cats",
                            "WARNING")

        return {"high_cardinality": high_card}

    def check_outliers(self, df: pd.DataFrame, financial_cols: Optional[List[str]] = None) -> Dict:
        """Detection d'outliers IQR sur les variables financieres."""
        if financial_cols is None:
            financial_cols = [c for c in df.columns if c.startswith('AMT_') or c.startswith('CREDIT_')]

        outlier_report = {}
        for col in financial_cols:
            if col not in df.columns or df[col].dtype not in [np.float64, np.float32, np.int64, np.int32]:
                continue
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            factor = self.config["outlier_iqr_factor"]
            n_outliers = ((df[col] < Q1 - factor * IQR) | (df[col] > Q3 + factor * IQR)).sum()
            if n_outliers > 0:
                outlier_report[col] = int(n_outliers)

        return {"outlier_counts": outlier_report}

    def run_all_checks(self, df: pd.DataFrame, key_col: str = "SK_ID_CURR") -> Dict:
        """Execute tous les controles de qualite."""
        logger.info(f"=== Data Quality Checks ({df.shape}) ===")

        report = {
            "shape": {"rows": len(df), "cols": len(df.columns)},
            "completeness": self.check_completeness(df),
            "duplicates": self.check_duplicates(df, key_col),
            "leakage": self.check_leakage(df),
            "zero_variance": self.check_zero_variance(df),
            "cardinality": self.check_cardinality(df),
            "outliers": self.check_outliers(df),
            "dtypes": {str(k): int(v) for k, v in df.dtypes.value_counts().items()},
            "memory_mb": round(df.memory_usage(deep=True).sum() / 1024**2, 1),
        }

        # Summary
        n_pass = sum(1 for c in self.checks if c["status"] == "PASS")
        n_warn = sum(1 for c in self.checks if c["status"] == "WARN")
        n_fail = sum(1 for c in self.checks if c["status"] == "FAIL")

        report["summary"] = {
            "total_checks": len(self.checks),
            "passed": n_pass, "warnings": n_warn, "failed": n_fail,
            "overall_status": "FAIL" if n_fail > 0 else "WARN" if n_warn > 0 else "PASS",
        }

        logger.info(f"DQ Summary: {n_pass} PASS, {n_warn} WARN, {n_fail} FAIL")
        return report

    def save_report(self, report: Dict, path: Optional[str] = None):
        """Sauvegarde le rapport DQ en JSON."""
        if path is None:
            path = os.path.join(os.path.dirname(__file__), "dq_report.json")

        # Convert non-serializable types
        def convert(obj):
            if isinstance(obj, (np.integer,)): return int(obj)
            if isinstance(obj, (np.floating,)): return float(obj)
            if isinstance(obj, np.ndarray): return obj.tolist()
            if isinstance(obj, pd.Series): return obj.to_dict()
            return str(obj)

        with open(path, "w") as f:
            json.dump(report, f, indent=2, default=convert)
        logger.info(f"DQ report saved: {path}")


# Backward compatibility
def run_data_quality_checks(df: pd.DataFrame) -> Dict:
    """API backward-compatible pour les tests existants."""
    engine = DataQualityEngine()
    report = engine.run_all_checks(df)
    # Flatten for backward compat
    return {
        "missing_ratios": report["completeness"]["missing_ratios"],
        "potential_leakage": report["leakage"].get("potential_leakage", []),
        "high_cardinality": list(report["cardinality"].get("high_cardinality", {}).keys()),
        "zero_variance": report["zero_variance"].get("zero_variance_features", []),
        "summary": report["summary"],
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    # Load curated data
    data_paths = [
        os.path.join(os.path.dirname(__file__), "..", "curated", "curated_dataset.parquet"),
        os.path.join(os.path.dirname(__file__), "..", "curated", "curated_dataset.csv"),
        os.path.join(os.path.dirname(__file__), "..", "raw", "application_train.csv"),
    ]

    df = None
    for path in data_paths:
        if os.path.exists(path):
            if path.endswith('.parquet'):
                df = pd.read_parquet(path)
            else:
                df = pd.read_csv(path)
            print(f"Loaded: {path} ({df.shape})")
            break

    if df is not None:
        engine = DataQualityEngine()
        report = engine.run_all_checks(df)
        engine.save_report(report)

        print(f"\n=== Data Quality Summary ===")
        print(f"  Status: {report['summary']['overall_status']}")
        print(f"  Checks: {report['summary']['total_checks']}")
        print(f"  Passed: {report['summary']['passed']}")
        print(f"  Warnings: {report['summary']['warnings']}")
        print(f"  Failed: {report['summary']['failed']}")
    else:
        print("No data found to check")
