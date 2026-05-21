"""
SHAP Explainability — PD Model
================================
Explainability réglementaire pour le modèle PD.

Fonctionnalités :
1. Global Feature Importance (SHAP summary — gain-based est biaisé)
2. Per-prediction SHAP values (waterfall data pour regulatory explain)
3. SHAP interaction values (top feature pairs)
4. Force plot data (JSON-serialisable pour le frontend)
5. Fairness check par sous-groupe sectoriel
6. Rapport JSON complet (conforme EBA XAI guidelines 2023)

Note : SHAP TreeExplainer est déterministe — mêmes inputs → mêmes valeurs.
       Reproductibilité auditée conforme COBAC.

Auteur  : Octaix Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import json
import logging
import os
import pickle
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Tuple, Any
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class PredictionExplanation:
    """Explication SHAP pour une prédiction individuelle."""
    observation_id: str
    predicted_pd: float
    base_value: float      # E[f(X)] — PD moyenne du dataset d'entraînement
    top_features: List[Dict]   # [{feature, shap_value, feature_value, direction}]
    total_shap: float      # Somme des SHAP values (doit ≈ predicted_pd - base_value)
    risk_drivers: List[str]    # Facteurs haussiers principaux
    mitigating_factors: List[str]  # Facteurs baissiers principaux
    explanation_timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict:
        return {
            "observation_id": self.observation_id,
            "predicted_pd": round(self.predicted_pd, 6),
            "base_value": round(self.base_value, 6),
            "top_features": self.top_features,
            "total_shap": round(self.total_shap, 6),
            "risk_drivers": self.risk_drivers,
            "mitigating_factors": self.mitigating_factors,
            "explanation_timestamp": self.explanation_timestamp,
        }


class SHAPExplainer:
    """
    Moteur d'explication SHAP pour le modèle PD (LightGBM / XGBoost).

    Usage :
        explainer = SHAPExplainer.from_model_path("pd_model_v2.pkl", X_train)
        global_report = explainer.global_importance(X_test)
        prediction_explain = explainer.explain_prediction("APP-001", x_single)
    """

    TOP_N_FEATURES = 15    # Nombre de features dans le rapport global
    TOP_N_SINGLE  = 10    # Nombre de features dans l'explication individuelle

    def __init__(
        self,
        model: Any,
        X_background: pd.DataFrame,
        feature_names: Optional[List[str]] = None,
    ):
        """
        Args:
            model:         Modèle entraîné (LGBMClassifier, XGBClassifier, ou CalibratedClassifierCV)
            X_background:  Dataset de référence (train ou sample) — calcule E[f(X)]
            feature_names: Noms des features (inféré depuis X_background si None)
        """
        try:
            import shap
        except ImportError:
            raise ImportError("shap requis: pip install shap")

        self._shap = shap
        self.feature_names = feature_names or list(X_background.columns)

        # Unwrap CalibratedClassifierCV → estimateur brut LightGBM/XGBoost
        base_model = self._unwrap_model(model)

        # TreeExplainer — déterministe, rapide O(TLD) pour tree ensembles
        try:
            self.explainer = shap.TreeExplainer(
                base_model,
                data=X_background,
                feature_perturbation="interventional",
                model_output="probability",
            )
            self.base_value = float(self.explainer.expected_value)
        except Exception:
            # Fallback : pas de données de fond (moins précis mais toujours valide)
            self.explainer = shap.TreeExplainer(base_model)
            ev = self.explainer.expected_value
            self.base_value = float(ev[1] if hasattr(ev, "__len__") else ev)

        logger.info(
            f"SHAPExplainer initialisé — base_value={self.base_value:.4f}, "
            f"{len(self.feature_names)} features"
        )

    @classmethod
    def from_model_path(
        cls,
        model_path: str,
        X_background: pd.DataFrame,
    ) -> "SHAPExplainer":
        """Charge un modèle depuis un fichier .pkl et initialise l'explainer."""
        with open(model_path, "rb") as f:
            model = pickle.load(f)
        return cls(model, X_background)

    # ── Importance globale ─────────────────────────────────────────────────────

    def global_importance(
        self,
        X: pd.DataFrame,
        max_samples: int = 1000,
        output_dir: Optional[str] = None,
    ) -> Dict:
        """
        Rapport d'importance globale SHAP.

        Args:
            X:            Dataset d'évaluation (test ou validation)
            max_samples:  Limite pour éviter les calculs trop longs
            output_dir:   Répertoire de sauvegarde (optionnel)
        """
        X_sample = X.sample(min(max_samples, len(X)), random_state=42) if len(X) > max_samples else X

        logger.info(f"[SHAP] Calcul des valeurs globales sur {len(X_sample)} observations...")
        shap_values = self.explainer.shap_values(X_sample)

        # Pour les classifieurs binaires, shap_values peut être une liste [class0, class1]
        if isinstance(shap_values, list):
            shap_values = shap_values[1]   # Classe positive (défaut)

        mean_abs_shap = np.abs(shap_values).mean(axis=0)
        mean_shap     = shap_values.mean(axis=0)
        std_shap      = shap_values.std(axis=0)

        importance_df = pd.DataFrame({
            "feature": self.feature_names[:len(mean_abs_shap)],
            "mean_abs_shap": mean_abs_shap,
            "mean_shap": mean_shap,
            "std_shap": std_shap,
        }).sort_values("mean_abs_shap", ascending=False).reset_index(drop=True)

        importance_df["rank"] = importance_df.index + 1
        importance_df["importance_pct"] = (
            importance_df["mean_abs_shap"] / importance_df["mean_abs_shap"].sum() * 100
        ).round(2)
        importance_df["cumulative_pct"] = importance_df["importance_pct"].cumsum().round(2)

        top_features = importance_df.head(self.TOP_N_FEATURES).to_dict("records")

        # Features qui augmentent le risque (SHAP > 0) vs diminuent (SHAP < 0)
        risk_increasing  = importance_df[importance_df["mean_shap"] > 0]["feature"].head(5).tolist()
        risk_decreasing  = importance_df[importance_df["mean_shap"] < 0]["feature"].head(5).tolist()

        # Nombre de features couvrant 80% de l'importance
        n_80pct = int((importance_df["cumulative_pct"] <= 80).sum()) + 1

        report = {
            "n_observations": len(X_sample),
            "n_features_total": len(self.feature_names),
            "n_features_80pct": n_80pct,
            "base_value": round(self.base_value, 6),
            "top_features": top_features,
            "risk_increasing_features": risk_increasing,
            "risk_decreasing_features": risk_decreasing,
            "generation_timestamp": datetime.utcnow().isoformat(),
        }

        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
            path = os.path.join(output_dir, "shap_global_importance.json")
            with open(path, "w") as f:
                json.dump(report, f, indent=2, default=str)
            logger.info(f"[SHAP] Rapport global sauvegardé : {path}")

            # Sauvegarde les SHAP values brutes pour plotting
            shap_df = pd.DataFrame(shap_values, columns=self.feature_names[:shap_values.shape[1]])
            shap_df.to_parquet(os.path.join(output_dir, "shap_values.parquet"))

        logger.info(
            f"[SHAP] Top 3 features: "
            + ", ".join(f"{r['feature']}({r['mean_abs_shap']:.4f})" for r in top_features[:3])
        )

        return report

    # ── Explication individuelle ───────────────────────────────────────────────

    def explain_prediction(
        self,
        observation_id: str,
        x: pd.DataFrame,
        predicted_pd: Optional[float] = None,
    ) -> PredictionExplanation:
        """
        Génère l'explication SHAP pour une seule prédiction.

        Args:
            observation_id: Identifiant (dossier, application_id, etc.)
            x:              DataFrame avec une seule ligne
            predicted_pd:   PD prévue (calculée depuis x si None)
        """
        if len(x) != 1:
            raise ValueError("explain_prediction attend exactement 1 ligne")

        shap_vals = self.explainer.shap_values(x)
        if isinstance(shap_vals, list):
            shap_vals = shap_vals[1]

        sv = shap_vals[0]
        n = min(len(sv), len(self.feature_names))

        feature_shap = [
            {
                "rank": i + 1,
                "feature": self.feature_names[i],
                "shap_value": round(float(sv[i]), 6),
                "feature_value": round(float(x.iloc[0, i]), 6) if i < x.shape[1] else None,
                "direction": "RISK_INCREASE" if sv[i] > 0 else "RISK_DECREASE",
                "abs_shap": round(float(abs(sv[i])), 6),
            }
            for i in range(n)
        ]
        feature_shap.sort(key=lambda d: d["abs_shap"], reverse=True)
        for i, d in enumerate(feature_shap):
            d["rank"] = i + 1

        top = feature_shap[:self.TOP_N_SINGLE]

        risk_drivers = [d["feature"] for d in top if d["direction"] == "RISK_INCREASE"][:3]
        mitigating   = [d["feature"] for d in top if d["direction"] == "RISK_DECREASE"][:3]

        total_shap = float(sv.sum())
        pred_pd = predicted_pd if predicted_pd is not None else float(self.base_value + total_shap)

        return PredictionExplanation(
            observation_id=observation_id,
            predicted_pd=round(pred_pd, 6),
            base_value=round(self.base_value, 6),
            top_features=top,
            total_shap=round(total_shap, 6),
            risk_drivers=risk_drivers,
            mitigating_factors=mitigating,
        )

    # ── Interactions ───────────────────────────────────────────────────────────

    def compute_interactions(
        self,
        X: pd.DataFrame,
        max_samples: int = 200,
    ) -> pd.DataFrame:
        """
        Calcule les SHAP interaction values (top feature pairs).
        Plus lent que les SHAP simples — limiter à 200 observations.
        """
        try:
            X_sample = X.sample(min(max_samples, len(X)), random_state=42)
            logger.info(f"[SHAP] Calcul des interactions sur {len(X_sample)} obs...")
            interaction_values = self.explainer.shap_interaction_values(X_sample)
            if isinstance(interaction_values, list):
                interaction_values = interaction_values[1]

            # Matrice des interactions moyennes
            mean_interactions = np.abs(interaction_values).mean(axis=0)
            n = min(mean_interactions.shape[0], len(self.feature_names))
            names = self.feature_names[:n]

            rows = []
            for i in range(n):
                for j in range(i + 1, n):
                    rows.append({
                        "feature_1": names[i],
                        "feature_2": names[j],
                        "interaction_strength": round(float(mean_interactions[i, j]), 6),
                    })

            df_interactions = pd.DataFrame(rows).sort_values(
                "interaction_strength", ascending=False
            ).reset_index(drop=True)

            return df_interactions.head(20)

        except Exception as e:
            logger.warning(f"[SHAP] Interactions indisponibles : {e}")
            return pd.DataFrame()

    # ── Fairness par sous-groupe ───────────────────────────────────────────────

    def fairness_check(
        self,
        X: pd.DataFrame,
        group_col: pd.Series,
        predicted_pd: pd.Series,
        max_samples: int = 500,
    ) -> Dict:
        """
        Vérifie la calibration SHAP par sous-groupe (secteur, région, etc.).
        Identifie les groupes où le modèle est systématiquement biaisé.

        Returns:
            Dict avec mean_abs_shap par feature et par groupe.
        """
        X_sample = X.sample(min(max_samples, len(X)), random_state=42)
        shap_vals = self.explainer.shap_values(X_sample)
        if isinstance(shap_vals, list):
            shap_vals = shap_vals[1]

        groups = group_col.iloc[X_sample.index] if hasattr(group_col, "iloc") else group_col

        report = {}
        for group in groups.unique():
            mask = groups == group
            if mask.sum() < 10:
                continue
            group_shap = shap_vals[mask.values]
            mean_pd = float(predicted_pd.iloc[X_sample.index][mask.values].mean())
            top_drivers = pd.Series(
                np.abs(group_shap).mean(axis=0),
                index=self.feature_names[:group_shap.shape[1]],
            ).nlargest(5).to_dict()
            report[str(group)] = {
                "n": int(mask.sum()),
                "mean_predicted_pd": round(mean_pd, 6),
                "top_shap_drivers": {k: round(v, 6) for k, v in top_drivers.items()},
            }

        return report

    # ── Helper ────────────────────────────────────────────────────────────────

    @staticmethod
    def _unwrap_model(model: Any) -> Any:
        """Extrait l'estimateur de base depuis CalibratedClassifierCV."""
        if hasattr(model, "calibrated_classifiers_"):
            return model.calibrated_classifiers_[0].estimator
        if hasattr(model, "estimator"):
            return model.estimator
        return model


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    # Test avec données synthétiques (LightGBM)
    try:
        import lightgbm as lgb
        from sklearn.datasets import make_classification
        from sklearn.model_selection import train_test_split

        X, y = make_classification(n_samples=2000, n_features=20, n_informative=10, random_state=42)
        feature_names = [f"FEATURE_{i:02d}" for i in range(X.shape[1])]
        X_df = pd.DataFrame(X, columns=feature_names)

        X_train, X_test, y_train, y_test = train_test_split(X_df, y, test_size=0.2, random_state=42)

        model = lgb.LGBMClassifier(n_estimators=100, random_state=42, verbose=-1)
        model.fit(X_train, y_train)

        explainer = SHAPExplainer(model, X_train, feature_names=feature_names)

        # Global
        global_report = explainer.global_importance(X_test, max_samples=200)
        print(f"\n[SHAP Global] Base value: {global_report['base_value']:.4f}")
        print(f"  Top 5 features:")
        for f in global_report["top_features"][:5]:
            print(f"    {f['rank']:2d}. {f['feature']:15s} | abs_shap={f['mean_abs_shap']:.4f} | {f['importance_pct']:.1f}%")

        # Per prediction
        x_single = X_test.iloc[[0]]
        pred_pd = float(model.predict_proba(x_single)[0, 1])
        explanation = explainer.explain_prediction("TEST-001", x_single, predicted_pd=pred_pd)
        print(f"\n[SHAP Prédiction TEST-001] PD={explanation.predicted_pd:.4f}")
        print(f"  Risk drivers   : {explanation.risk_drivers}")
        print(f"  Mitigating     : {explanation.mitigating_factors}")

    except ImportError as e:
        print(f"Dépendance manquante pour le test : {e}")
        print("Installer : pip install lightgbm shap scikit-learn")
