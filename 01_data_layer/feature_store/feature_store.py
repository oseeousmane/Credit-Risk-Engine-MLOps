"""
Feature Store — Versioning & Traceability
============================================
Systeme de versioning et tracabilite des features.
- Versioning automatique des datasets
- Metadata tracking (lineage, stats)
- Hash-based integrity checks

Auteur  : Credit Risk Engine
Version : 2.0.0
"""

import pandas as pd
import numpy as np
import os
import json
import hashlib
import logging
from datetime import datetime
from typing import Dict, Optional, List

logger = logging.getLogger(__name__)


class FeatureStore:
    """
    Feature Store avec versioning et tracabilite.
    
    Fonctionnalites :
    - Sauvegarde versionnee des feature sets
    - Calcul de hash pour validation d'integrite
    - Statistiques descriptives par feature
    - Lineage tracking (source, timestamp, transform)
    """

    def __init__(self, store_dir: Optional[str] = None):
        self.store_dir = store_dir or os.path.join(os.path.dirname(__file__), "versions")
        os.makedirs(self.store_dir, exist_ok=True)
        self.registry_path = os.path.join(self.store_dir, "registry.json")
        self.registry = self._load_registry()

    def _load_registry(self) -> List[Dict]:
        """Charge le registre des versions."""
        if os.path.exists(self.registry_path):
            with open(self.registry_path, "r") as f:
                return json.load(f)
        return []

    def _save_registry(self):
        """Sauvegarde le registre."""
        with open(self.registry_path, "w") as f:
            json.dump(self.registry, f, indent=2, default=str)

    def _compute_hash(self, df: pd.DataFrame) -> str:
        """Calcule un hash SHA256 du DataFrame pour validation."""
        return hashlib.sha256(
            pd.util.hash_pandas_object(df).values.tobytes()
        ).hexdigest()[:16]

    def _compute_stats(self, df: pd.DataFrame) -> Dict:
        """Calcule les statistiques descriptives des features."""
        numeric = df.select_dtypes(include=[np.number])
        stats = {}

        for col in numeric.columns[:50]:  # Cap at 50 for performance
            col_stats = {
                "mean": round(float(numeric[col].mean()), 4) if not numeric[col].isna().all() else None,
                "std": round(float(numeric[col].std()), 4) if not numeric[col].isna().all() else None,
                "min": round(float(numeric[col].min()), 4) if not numeric[col].isna().all() else None,
                "max": round(float(numeric[col].max()), 4) if not numeric[col].isna().all() else None,
                "missing_pct": round(float(numeric[col].isna().mean()), 4),
            }
            stats[col] = col_stats

        return stats

    def save_version(
        self,
        df: pd.DataFrame,
        version_name: str,
        description: str = "",
        source_tables: Optional[List[str]] = None,
        transform_steps: Optional[List[str]] = None,
    ) -> str:
        """
        Sauvegarde une version du feature set.
        
        Args:
            df: DataFrame a sauvegarder
            version_name: Nom de la version (ex: 'v2.0_abt_full')
            description: Description de la version
            source_tables: Tables sources utilisees
            transform_steps: Etapes de transformation appliquees
            
        Returns:
            Chemin du fichier sauvegarde
        """
        version_id = f"{version_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        version_dir = os.path.join(self.store_dir, version_id)
        os.makedirs(version_dir, exist_ok=True)

        # Save data
        data_path = os.path.join(version_dir, "features.parquet")
        df.to_parquet(data_path, index=False)

        # Compute hash and stats
        data_hash = self._compute_hash(df)
        stats = self._compute_stats(df)

        # Create metadata
        metadata = {
            "version_id": version_id,
            "version_name": version_name,
            "description": description,
            "n_rows": len(df),
            "n_features": len(df.columns),
            "features": list(df.columns),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "data_hash": data_hash,
            "source_tables": source_tables or [],
            "transform_steps": transform_steps or [],
            "statistics": stats,
            "created_at": datetime.now().isoformat(),
            "size_mb": round(os.path.getsize(data_path) / 1024**2, 2),
        }

        # Save metadata
        meta_path = os.path.join(version_dir, "metadata.json")
        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=2, default=str)

        # Update registry
        self.registry.append({
            "version_id": version_id,
            "version_name": version_name,
            "n_rows": len(df),
            "n_features": len(df.columns),
            "data_hash": data_hash,
            "created_at": metadata["created_at"],
            "size_mb": metadata["size_mb"],
        })
        self._save_registry()

        logger.info(f"Feature version saved: {version_id} ({len(df)} rows, {len(df.columns)} features)")
        return data_path

    def load_version(self, version_id: str) -> pd.DataFrame:
        """Charge une version specifique."""
        data_path = os.path.join(self.store_dir, version_id, "features.parquet")
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Version {version_id} not found")
        return pd.read_parquet(data_path)

    def get_latest_version(self) -> Optional[str]:
        """Retourne l'ID de la derniere version."""
        if not self.registry:
            return None
        return self.registry[-1]["version_id"]

    def list_versions(self) -> pd.DataFrame:
        """Liste toutes les versions."""
        if not self.registry:
            return pd.DataFrame()
        return pd.DataFrame(self.registry)

    def compare_versions(self, version_a: str, version_b: str) -> Dict:
        """Compare deux versions (schema + stats)."""
        meta_a_path = os.path.join(self.store_dir, version_a, "metadata.json")
        meta_b_path = os.path.join(self.store_dir, version_b, "metadata.json")

        with open(meta_a_path) as f:
            meta_a = json.load(f)
        with open(meta_b_path) as f:
            meta_b = json.load(f)

        features_a = set(meta_a["features"])
        features_b = set(meta_b["features"])

        return {
            "added_features": list(features_b - features_a),
            "removed_features": list(features_a - features_b),
            "common_features": len(features_a & features_b),
            "row_diff": meta_b["n_rows"] - meta_a["n_rows"],
            "feature_diff": meta_b["n_features"] - meta_a["n_features"],
        }
