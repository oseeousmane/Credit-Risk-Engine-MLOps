"""
two_stage_trainer.py
=====================
Domain Adaptation : Home Credit → CEMAC
Stratégies B (sample weighting) et D (two-stage calibration).

POURQUOI DEUX ÉTAPES ?
-----------------------
Un modèle GBM (XGBoost/LightGBM) entraîné sur des données de consommation
russe ne peut pas être utilisé directement sur le crédit corporate CEMAC.
Deux problèmes distincts :

  Problème 1 — RANG : classer les dossiers du meilleur au pire.
    → Le modèle Home Credit fait ça correctement (EXT_SOURCE, DTI, etc.
      sont des signaux universels de solvabilité).
    → Gini ~45-52% conservé même sur d'autres populations.

  Problème 2 — CALIBRATION : traduire le rang en PD absolue CEMAC.
    → Home Credit : taux de défaut ~8%, retail consommation russe.
    → CEMAC PME : taux de défaut 8-14%, corporate, XAF.
    → Une PD de "3%" sur le modèle Home Credit ne veut rien dire en CEMAC.

SOLUTION — TWO-STAGE :
  Stage 1 (existant) : modèle Home Credit / CEMAC synthétique → score de rang
  Stage 2 (nouveau)  : recalibration isotonique sur données CEMAC réelles

QUAND UTILISER CHAQUE STRATÉGIE ?
-----------------------------------
  Données CEMAC disponibles | Stratégie recommandée
  ─────────────────────────────────────────────────
  0 dossiers réels          → Stage 1 seul (SYNTHETIC_CEMAC)
  200-500 dossiers réels    → Stage 2 : recalibration (Stratégie D)
  500-2000 dossiers réels   → Stage 2 + warm-start XGBoost (Stratégie A+D)
  2000+ dossiers réels      → Retraining sample-weighted (Stratégie B)
  10 000+ dossiers réels    → Full retrain PROD_CHAMPION from scratch

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import pickle
import json
import os
import logging
import hashlib
from datetime import datetime
from typing import Optional, Dict, List, Tuple, Any
from sklearn.isotonic import IsotonicRegression
from sklearn.calibration import calibration_curve
from sklearn.metrics import roc_auc_score, brier_score_loss

logger = logging.getLogger(__name__)

# ── Seuil minimum de données CEMAC pour la recalibration ─────────────────────
MIN_CEMAC_SAMPLES_FOR_CALIBRATION = 200
MIN_CEMAC_DEFAULTS_FOR_CALIBRATION = 20   # au moins 20 défauts observés


class DomainCalibrator:
    """
    Recalibreur isotonique : mappe les scores du modèle source (Home Credit)
    vers les probabilités de défaut réelles du domaine cible (CEMAC).

    Fonctionne avec aussi peu que 200 observations labellisées CEMAC
    (dont ≥20 défauts), ce qui est atteignable en 2-3 mois de pilote EMF.

    La régression isotonique est choisie pour :
    - Préserver la monotonicité (un score plus élevé = une PD plus élevée)
    - Ne pas imposer de forme paramétrique (Platt Scaling suppose sigmoid)
    - Être robuste aux petits échantillons
    """

    def __init__(self):
        self._calibrator = IsotonicRegression(out_of_bounds='clip', increasing=True)
        self._is_fitted = False
        self._fit_metadata: Dict = {}

    def fit(
        self,
        base_scores: np.ndarray,
        y_cemac: np.ndarray,
        exposure_ids: Optional[List[str]] = None,
    ) -> "DomainCalibrator":
        """
        Entraîne le recalibreur sur des données CEMAC réelles.

        Args:
            base_scores: Scores du modèle source (predict_proba[:, 1])
            y_cemac:     Labels réels CEMAC (0 = sain, 1 = défaut)
            exposure_ids: Identifiants des expositions (pour audit trail)
        """
        n = len(y_cemac)
        n_defaults = int(y_cemac.sum())

        if n < MIN_CEMAC_SAMPLES_FOR_CALIBRATION:
            raise ValueError(
                f"Données insuffisantes pour recalibration : {n} observations "
                f"(minimum requis : {MIN_CEMAC_SAMPLES_FOR_CALIBRATION}). "
                "Collecter plus de données CEMAC labellisées."
            )
        if n_defaults < MIN_CEMAC_DEFAULTS_FOR_CALIBRATION:
            raise ValueError(
                f"Pas assez de défauts observés : {n_defaults} "
                f"(minimum requis : {MIN_CEMAC_DEFAULTS_FOR_CALIBRATION}). "
                "La calibration isotonique est instable avec trop peu de défauts."
            )

        # Trier par score pour la régression isotonique
        sort_idx = np.argsort(base_scores)
        self._calibrator.fit(base_scores[sort_idx], y_cemac[sort_idx])
        self._is_fitted = True

        # Évaluation post-fit
        pd_calibrated = self._calibrator.transform(base_scores)
        brier_before = brier_score_loss(y_cemac, base_scores)
        brier_after  = brier_score_loss(y_cemac, pd_calibrated)
        auc_rank     = roc_auc_score(y_cemac, base_scores)

        self._fit_metadata = {
            "n_cemac_samples":        int(n),
            "n_cemac_defaults":       int(n_defaults),
            "cemac_default_rate":     round(float(y_cemac.mean()), 4),
            "source_brier":           round(float(brier_before), 6),
            "calibrated_brier":       round(float(brier_after), 6),
            "brier_improvement":      round(float(brier_before - brier_after), 6),
            "rank_auc_preserved":     round(float(auc_rank), 6),
            "fit_timestamp":          datetime.utcnow().isoformat(),
            "calibration_method":     "isotonic_regression",
            "pd_range_after":         [
                round(float(pd_calibrated.min()), 4),
                round(float(pd_calibrated.max()), 4),
            ],
        }

        logger.info(
            f"[DomainCalibrator] Recalibration CEMAC terminée — "
            f"n={n} | defaults={n_defaults} | "
            f"Brier {brier_before:.4f} → {brier_after:.4f} "
            f"(Δ={brier_before - brier_after:+.4f}) | "
            f"AUC (rang préservé) = {auc_rank:.4f}"
        )
        return self

    def transform(self, base_scores: np.ndarray) -> np.ndarray:
        """Recalibre les scores source → PD CEMAC."""
        if not self._is_fitted:
            raise RuntimeError("DomainCalibrator non entraîné. Appeler .fit() d'abord.")
        return self._calibrator.transform(base_scores)

    @property
    def is_fitted(self) -> bool:
        return self._is_fitted

    @property
    def metadata(self) -> Dict:
        return self._fit_metadata.copy()


class TwoStageTrainer:
    """
    Entraîneur two-stage pour la domain adaptation Home Credit → CEMAC.

    Stage 1 : modèle de rang (Home Credit ou CEMAC synthétique)
    Stage 2 : recalibreur isotonique sur données CEMAC réelles

    Usage :
        # Charger le modèle Stage 1 existant
        trainer = TwoStageTrainer(base_model_path="artifacts/pd_model_v2.pkl")

        # Recalibrer sur 300 dossiers CEMAC réels
        trainer.fit_stage2(X_cemac, y_cemac)

        # Scorer un nouveau dossier
        pd_cemac = trainer.predict_proba(X_new)[:, 1]

        # Sauvegarder
        trainer.save("artifacts/pd_cemac_v1_two_stage.pkl")
    """

    def __init__(
        self,
        base_model_path: Optional[str] = None,
        base_model=None,
    ):
        """
        Args:
            base_model_path: Chemin vers l'artefact Stage 1 (.pkl)
            base_model:      Modèle Stage 1 déjà chargé (alternative à base_model_path)
        """
        if base_model is not None:
            self._base_model = base_model
            self._base_model_path = "provided_in_memory"
        elif base_model_path is not None:
            self._base_model_path = base_model_path
            self._base_model = self._load_base_model(base_model_path)
        else:
            raise ValueError("Fournir base_model_path ou base_model.")

        self._domain_calibrator = DomainCalibrator()
        self._feature_names: List[str] = []
        self._stage2_fitted = False
        self._metadata: Dict = {
            "stage1_model_path": self._base_model_path,
            "stage2_fitted": False,
            "creation_timestamp": datetime.utcnow().isoformat(),
        }

    def _load_base_model(self, path: str):
        """Charge le modèle Stage 1 depuis un fichier pickle."""
        if not os.path.exists(path):
            raise FileNotFoundError(f"Modèle Stage 1 introuvable : {path}")
        with open(path, "rb") as f:
            model = pickle.load(f)
        # Charger la liste de features si disponible
        feat_path = path.replace(".pkl", "_features.json")
        if os.path.exists(feat_path):
            with open(feat_path) as f:
                self._feature_names = json.load(f).get("features", [])
        logger.info(f"[TwoStage] Stage 1 chargé : {path} ({len(self._feature_names)} features)")
        return model

    def _get_base_scores(self, X: pd.DataFrame) -> np.ndarray:
        """Obtient les scores bruts du modèle Stage 1."""
        if self._feature_names:
            available = [f for f in self._feature_names if f in X.columns]
            missing = [f for f in self._feature_names if f not in X.columns]
            if missing:
                logger.warning(f"[TwoStage] {len(missing)} features manquantes — imputées à 0")
                for m in missing:
                    X = X.copy()
                    X[m] = 0.0
            X = X[self._feature_names]
        return self._base_model.predict_proba(X)[:, 1]

    # ── Stage 2 : recalibration sur données CEMAC ─────────────────────────────

    def fit_stage2(
        self,
        X_cemac: pd.DataFrame,
        y_cemac: np.ndarray,
        exposure_ids: Optional[List[str]] = None,
    ) -> "TwoStageTrainer":
        """
        Entraîne le recalibreur Stage 2 sur des données CEMAC réelles.

        Peut être appelé plusieurs fois pour mise à jour incrémentale
        (chaque appel remplace la calibration précédente).

        Args:
            X_cemac:      Features des dossiers CEMAC (même format que Stage 1)
            y_cemac:      Labels CEMAC (0 = sain, 1 = défaut)
            exposure_ids: Identifiants pour l'audit trail
        """
        logger.info(
            f"[TwoStage] Recalibration Stage 2 — "
            f"n={len(y_cemac)} | défauts={int(y_cemac.sum())} | "
            f"DR={y_cemac.mean():.2%}"
        )

        # Obtenir les scores Stage 1
        base_scores = self._get_base_scores(X_cemac)

        # Entraîner le recalibreur
        self._domain_calibrator.fit(base_scores, y_cemac, exposure_ids)
        self._stage2_fitted = True

        # Mise à jour metadata
        self._metadata["stage2_fitted"] = True
        self._metadata["stage2"] = self._domain_calibrator.metadata
        self._metadata["stage2_update_timestamp"] = datetime.utcnow().isoformat()

        return self

    def update_calibration(
        self,
        X_new: pd.DataFrame,
        y_new: np.ndarray,
    ) -> Dict:
        """
        Met à jour la calibration Stage 2 avec de nouvelles données CEMAC.
        Utile quand de nouveaux dossiers real deviennent disponibles.

        Returns:
            Dict avec les métriques avant/après mise à jour.
        """
        logger.info(f"[TwoStage] Mise à jour de la calibration ({len(y_new)} nouveaux dossiers)")
        old_meta = self._domain_calibrator.metadata.copy()
        self.fit_stage2(X_new, y_new)
        new_meta = self._domain_calibrator.metadata.copy()
        return {
            "update_timestamp": datetime.utcnow().isoformat(),
            "n_new_samples": len(y_new),
            "brier_before_update": old_meta.get("calibrated_brier"),
            "brier_after_update": new_meta.get("calibrated_brier"),
        }

    # ── Inférence ────────────────────────────────────────────────────────────

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """
        Retourne les probabilités de défaut two-stage.

        Si Stage 2 fitted → applique la recalibration CEMAC.
        Sinon → retourne les scores Stage 1 (dégradé gracieux).

        Returns:
            Array (n, 2) : [[P(non-défaut), P(défaut)], ...]
        """
        base_scores = self._get_base_scores(X)

        if self._stage2_fitted:
            pd_cemac = self._domain_calibrator.transform(base_scores)
        else:
            logger.warning(
                "[TwoStage] Stage 2 non entraîné — utilisation des scores Stage 1 bruts. "
                "La calibration CEMAC n'est pas appliquée."
            )
            pd_cemac = base_scores

        pd_cemac = np.clip(pd_cemac, 0.0001, 0.9999)
        return np.column_stack([1.0 - pd_cemac, pd_cemac])

    def score_single(
        self,
        features: Dict[str, float],
        feature_names: Optional[List[str]] = None,
    ) -> Dict:
        """
        Score un seul dossier et retourne un dict enrichi pour l'audit.

        Args:
            features: Dict {feature_name: value}
            feature_names: Ordre des features (si None, utilise self._feature_names)
        """
        cols = feature_names or self._feature_names
        X = pd.DataFrame([features])
        proba = self.predict_proba(X)
        pd_score = float(proba[0, 1])
        return {
            "pd_score":       round(pd_score * 100, 4),  # en %
            "pd_raw_stage1":  round(float(self._get_base_scores(X)[0]) * 100, 4),
            "stage2_applied": self._stage2_fitted,
            "model_type":     "TWO_STAGE_CEMAC",
            "inference_id":   hashlib.sha256(
                f"{datetime.utcnow().isoformat()}{pd_score}".encode()
            ).hexdigest()[:12],
        }

    # ── Évaluation ────────────────────────────────────────────────────────────

    def evaluate(
        self,
        X: pd.DataFrame,
        y: np.ndarray,
        label: str = "eval",
    ) -> Dict:
        """
        Évalue le modèle two-stage sur un jeu de test.
        Retourne AUC, Gini, Brier, et la comparaison Stage 1 vs Stage 2.
        """
        proba = self.predict_proba(X)
        pd_two_stage = proba[:, 1]
        pd_stage1    = self._get_base_scores(X)

        auc_ts  = roc_auc_score(y, pd_two_stage)
        auc_s1  = roc_auc_score(y, pd_stage1)
        brier_ts = brier_score_loss(y, pd_two_stage)
        brier_s1 = brier_score_loss(y, pd_stage1)

        result = {
            "label":                    label,
            "n_samples":                int(len(y)),
            "default_rate":             round(float(y.mean()), 4),
            "stage1_auc":               round(float(auc_s1), 4),
            "stage2_auc":               round(float(auc_ts), 4),
            "stage1_gini":              round(float(2 * auc_s1 - 1), 4),
            "stage2_gini":              round(float(2 * auc_ts - 1), 4),
            "stage1_brier":             round(float(brier_s1), 6),
            "stage2_brier":             round(float(brier_ts), 6),
            "brier_improvement":        round(float(brier_s1 - brier_ts), 6),
            "stage2_applied":           self._stage2_fitted,
            "evaluation_timestamp":     datetime.utcnow().isoformat(),
        }

        logger.info(
            f"[TwoStage] Évaluation '{label}' — "
            f"Stage1 AUC={auc_s1:.4f} | Stage2 AUC={auc_ts:.4f} | "
            f"Brier Stage1={brier_s1:.4f} → Stage2={brier_ts:.4f}"
        )
        return result

    # ── Persistance ──────────────────────────────────────────────────────────

    def save(self, output_path: str) -> str:
        """Sauvegarde le two-stage trainer complet."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        artifact = {
            "base_model":         self._base_model,
            "domain_calibrator":  self._domain_calibrator,
            "feature_names":      self._feature_names,
            "stage2_fitted":      self._stage2_fitted,
            "metadata":           self._metadata,
        }
        with open(output_path, "wb") as f:
            pickle.dump(artifact, f)

        # Metadata JSON
        meta_path = output_path.replace(".pkl", "_metadata.json")
        with open(meta_path, "w") as f:
            json.dump(self._metadata, f, indent=2, default=str)

        logger.info(f"[TwoStage] Artefact sauvegardé : {output_path}")
        return output_path

    @classmethod
    def load(cls, path: str) -> "TwoStageTrainer":
        """Charge un two-stage trainer sauvegardé."""
        with open(path, "rb") as f:
            artifact = pickle.load(f)
        trainer = cls.__new__(cls)
        trainer._base_model       = artifact["base_model"]
        trainer._base_model_path  = path
        trainer._domain_calibrator = artifact["domain_calibrator"]
        trainer._feature_names    = artifact.get("feature_names", [])
        trainer._stage2_fitted    = artifact.get("stage2_fitted", False)
        trainer._metadata         = artifact.get("metadata", {})
        logger.info(f"[TwoStage] Chargé depuis {path} | Stage2={trainer._stage2_fitted}")
        return trainer


# ── Stratégie B : Sample-Weighted Retraining ─────────────────────────────────

def build_sample_weights(
    n_home_credit: int,
    n_cemac: int,
    cemac_weight_multiplier: float = 10.0,
) -> Tuple[np.ndarray, Dict]:
    """
    Construit les poids d'échantillonnage pour le retraining mixte.

    Strategy B : données CEMAC pondérées 10x plus que Home Credit.
    Le modèle apprend principalement des patterns CEMAC tout en conservant
    la régularisation apportée par le volume de données publiques.

    Args:
        n_home_credit:          Nombre de dossiers Home Credit
        n_cemac:                Nombre de dossiers CEMAC
        cemac_weight_multiplier: Poids relatif des données CEMAC (défaut: 10)

    Returns:
        (weights_array, metadata_dict)
    """
    w_home  = np.ones(n_home_credit) * 1.0
    w_cemac = np.ones(n_cemac) * cemac_weight_multiplier

    weights = np.concatenate([w_home, w_cemac])

    # Normaliser pour que la somme totale = n total (évite les instabilités LR)
    weights = weights / weights.mean()

    meta = {
        "strategy":              "B_sample_weighted",
        "n_home_credit":         n_home_credit,
        "n_cemac":               n_cemac,
        "cemac_weight_multiplier": cemac_weight_multiplier,
        "effective_cemac_ratio": round(
            (n_cemac * cemac_weight_multiplier)
            / (n_home_credit + n_cemac * cemac_weight_multiplier), 3
        ),
        "note": (
            f"Les {n_cemac} dossiers CEMAC représentent effectivement "
            f"{meta_eff:.1%} du poids d'entraînement"
            if False else  # calculé ci-dessous
            ""
        ),
    }
    effective_ratio = (n_cemac * cemac_weight_multiplier) / (n_home_credit + n_cemac * cemac_weight_multiplier)
    meta["note"] = (
        f"Les {n_cemac} dossiers CEMAC représentent {effective_ratio:.1%} "
        f"du poids d'entraînement (vs {n_cemac/(n_home_credit+n_cemac):.1%} sans pondération)"
    )

    logger.info(
        f"[SampleWeights] Strategy B — "
        f"Home Credit: {n_home_credit} (w=1.0) | CEMAC: {n_cemac} (w={cemac_weight_multiplier}) | "
        f"Ratio effectif CEMAC: {effective_ratio:.1%}"
    )
    return weights, meta


def create_mixed_dataset(
    df_home: pd.DataFrame,
    df_cemac: pd.DataFrame,
    cemac_weight_multiplier: float = 10.0,
    target_col: str = "TARGET",
) -> Tuple[pd.DataFrame, np.ndarray]:
    """
    Combine Home Credit + CEMAC en un seul dataset avec sample weights.

    Returns:
        (df_combined, sample_weights)
    """
    # Aligner les colonnes (garder l'intersection)
    common_cols = list(set(df_home.columns) & set(df_cemac.columns))
    train_cols  = [c for c in common_cols if c != target_col]

    df_h = df_home[train_cols + [target_col]].copy()
    df_c = df_cemac[train_cols + [target_col]].copy()

    df_combined = pd.concat([df_h, df_c], ignore_index=True)

    weights, _ = build_sample_weights(
        n_home_credit=len(df_h),
        n_cemac=len(df_c),
        cemac_weight_multiplier=cemac_weight_multiplier,
    )

    logger.info(
        f"[MixedDataset] Home Credit: {len(df_h):,} | CEMAC: {len(df_c):,} | "
        f"Total: {len(df_combined):,} | DR global: {df_combined[target_col].mean():.2%}"
    )
    return df_combined, weights


# ── CLI de démonstration ─────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    parser = argparse.ArgumentParser(description="Two-Stage Domain Adaptation Demo")
    parser.add_argument("--base-model", type=str,
                        default="02_modeling/pd_model/artifacts/pd_model_v2.pkl",
                        help="Chemin vers le modèle Stage 1")
    parser.add_argument("--cemac-data", type=str, default=None,
                        help="Chemin vers données CEMAC réelles (Parquet/CSV)")
    parser.add_argument("--n-synthetic", type=int, default=500,
                        help="Dossiers synthétiques CEMAC pour la démo (si --cemac-data absent)")
    parser.add_argument("--output", type=str,
                        default="02_modeling/pd_model/artifacts/pd_cemac_two_stage.pkl")
    args = parser.parse_args()

    # Charger ou générer des données CEMAC
    if args.cemac_data and os.path.exists(args.cemac_data):
        if args.cemac_data.endswith(".parquet"):
            df_cemac = pd.read_parquet(args.cemac_data)
        else:
            df_cemac = pd.read_csv(args.cemac_data)
        print(f"✓ Données CEMAC chargées : {df_cemac.shape}")
    else:
        print(f"Génération de {args.n_synthetic} dossiers synthétiques CEMAC pour la démo...")
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "01_data_layer", "cemac_synthetic"))
        from cemac_generator import CemacSyntheticGenerator
        gen = CemacSyntheticGenerator(seed=42)
        df_cemac = gen.generate(n_samples=args.n_synthetic)
        print(f"✓ Données synthétiques générées : {df_cemac.shape} | DR={df_cemac['TARGET'].mean():.2%}")

    # Initialiser le trainer Two-Stage
    if not os.path.exists(args.base_model):
        print(f"⚠️  Modèle Stage 1 non trouvé : {args.base_model}")
        print("   Lancer d'abord : python 02_modeling/pd_model/train.py")
        exit(1)

    trainer = TwoStageTrainer(base_model_path=args.base_model)

    # Features disponibles dans le dataset CEMAC
    from train import EXCLUDE_COLUMNS
    feature_cols = [
        c for c in df_cemac.columns
        if c not in EXCLUDE_COLUMNS and c not in {"TARGET"}
        and not c.startswith("_cemac_") and not c.startswith("_")
        and df_cemac[c].dtype in [np.float64, np.int64, np.float32, np.int32]
    ]

    X_cemac = df_cemac[feature_cols].fillna(0)
    y_cemac = df_cemac["TARGET"].values

    # Split 80/20 pour évaluation
    from sklearn.model_selection import train_test_split
    X_cal, X_eval, y_cal, y_eval = train_test_split(
        X_cemac, y_cemac, test_size=0.20, random_state=42, stratify=y_cemac
    )

    # Stage 2 : recalibration
    print(f"\nEntraînement Stage 2 sur {len(y_cal)} dossiers CEMAC...")
    trainer.fit_stage2(X_cal, y_cal)

    # Évaluation
    eval_result = trainer.evaluate(X_eval, y_eval, label="CEMAC_eval")

    print(f"\n{'='*60}")
    print("Two-Stage Trainer — Résultats")
    print(f"{'='*60}")
    print(f"  Stage 1 AUC  (Home Credit model) : {eval_result['stage1_auc']:.4f}")
    print(f"  Stage 2 AUC  (+ recalibration)   : {eval_result['stage2_auc']:.4f}")
    print(f"  Stage 1 Brier                    : {eval_result['stage1_brier']:.4f}")
    print(f"  Stage 2 Brier                    : {eval_result['stage2_brier']:.4f}")
    print(f"  Amélioration Brier               : {eval_result['brier_improvement']:+.4f}")
    print(f"  CEMAC default rate               : {eval_result['default_rate']:.2%}")

    # Sauvegarder
    import sys
    trainer.save(args.output)
    print(f"\n  Artefact sauvegardé : {args.output}")
    print(f"\n  Prochaine étape (avec données réelles) :")
    print(f"    trainer = TwoStageTrainer.load('{args.output}')")
    print(f"    trainer.update_calibration(X_real_cemac, y_real_cemac)")
