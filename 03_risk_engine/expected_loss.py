"""
Expected Loss Calculator
========================
Calcul réglementaire de la perte attendue (Expected Loss) selon Bâle II/III.

    EL = PD × LGD × EAD

Avec prise en charge :
- Calcul individuel (par exposition)
- Calcul portefeuille (agrégé)
- Ventilation par segment / produit
- Audit trail complet pour conformité COBAC

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Optional, Dict, List
from datetime import datetime
import logging
import uuid

logger = logging.getLogger(__name__)


@dataclass
class ELResult:
    """
    Résultat structuré du calcul Expected Loss.
    Conçu pour traçabilité complète (audit trail COBAC).
    """
    exposure_id: str
    pd: float
    lgd: float
    ead: float
    expected_loss: float
    expected_loss_rate: float  # EL / EAD
    calculation_timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    calculation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    model_version: str = "1.0.0"
    regulatory_framework: str = "Basel_III_SA"  # Standardized Approach par défaut

    def to_dict(self) -> dict:
        return {
            "exposure_id": self.exposure_id,
            "pd": round(self.pd, 6),
            "lgd": round(self.lgd, 6),
            "ead": round(self.ead, 2),
            "expected_loss": round(self.expected_loss, 2),
            "expected_loss_rate": round(self.expected_loss_rate, 6),
            "calculation_timestamp": self.calculation_timestamp,
            "calculation_id": self.calculation_id,
            "model_version": self.model_version,
            "regulatory_framework": self.regulatory_framework,
        }


class ExpectedLossCalculator:
    """
    Moteur de calcul de l'Expected Loss (EL) conforme Bâle II/III.
    
    Supporte :
    - Calcul individuel par exposition
    - Calcul batch sur portefeuille complet
    - Floors réglementaires PD (0.03% Bâle plancher)
    - Caps LGD réglementaires
    - Audit trail intégral
    
    Exemple d'utilisation :
    >>> calc = ExpectedLossCalculator()
    >>> result = calc.compute(pd=0.05, lgd=0.45, ead=1_000_000)
    >>> print(result.expected_loss)
    22500.0
    """

    # Planchers réglementaires Bâle III (Foundation IRB)
    PD_FLOOR = 0.0003           # 3 bps — plancher PD Bâle III
    LGD_FLOOR_SECURED = 0.10    # 10% pour expositions garanties
    LGD_FLOOR_UNSECURED = 0.25  # 25% pour expositions non garanties
    LGD_CAP = 1.0               # Maximum théorique
    PD_CAP = 1.0                # Maximum PD

    def __init__(
        self,
        apply_pd_floor: bool = True,
        apply_lgd_floor: bool = True,
        default_lgd: float = 0.45,
        default_secured: bool = False,
        model_version: str = "1.0.0",
    ):
        """
        Initialise le calculateur EL.

        Args:
            apply_pd_floor: Appliquer le plancher PD Bâle III (0.03%)
            apply_lgd_floor: Appliquer les floors LGD réglementaires
            default_lgd: LGD par défaut si non fournie
            default_secured: Si True, utilise le floor LGD sécurisé (10%)
            model_version: Version du modèle pour audit trail
        """
        self.apply_pd_floor = apply_pd_floor
        self.apply_lgd_floor = apply_lgd_floor
        self.default_lgd = default_lgd
        self.default_secured = default_secured
        self.model_version = model_version
        self._audit_log: List[Dict] = []

        # Priorité : LGDModelV2 (Two-Part Beta, secteurs CEMAC, vintage, downturn)
        # Fallback : LGDModel v1 (règles statiques), puis default_lgd=45%.
        self.lgd_model = None
        self.lgd_model_version = "static_45pct"
        try:
            import sys as _sys, importlib.util as _ilu, os as _os
            _lgd_v2_path = _os.path.join(
                _os.path.dirname(__file__), "..", "02_modeling", "lgd_model", "lgd_model_v2.py"
            )
            _spec = _ilu.spec_from_file_location("lgd_model_v2", _lgd_v2_path)
            _mod  = _ilu.module_from_spec(_spec)
            _spec.loader.exec_module(_mod)
            self.lgd_model = _mod.LGDModelV2()
            self.lgd_model_version = "two_part_beta_v2_cemac"
        except Exception as _e:
            logger.warning(f"LGDModelV2 non disponible ({_e}) — tentative LGDModel v1")
            try:
                from lgd_model import LGDModel
                self.lgd_model = LGDModel()
                self.lgd_model_version = "static_rules_v1"
            except ImportError:
                pass  # static default_lgd utilisé

        logger.info(
            f"ExpectedLossCalculator initialisé — "
            f"PD floor={'ON' if apply_pd_floor else 'OFF'}, "
            f"LGD floor={'ON' if apply_lgd_floor else 'OFF'}, "
            f"LGD Model={self.lgd_model_version}"
        )

    def _validate_inputs(self, pd: float, lgd: float, ead: float) -> None:
        """Validation stricte des inputs avec messages d'erreur métier."""
        if not (0.0 <= pd <= 1.0):
            raise ValueError(
                f"PD hors bornes [0,1] : {pd}. "
                f"Vérifier la calibration du modèle PD."
            )
        if not (0.0 <= lgd <= 1.0):
            raise ValueError(
                f"LGD hors bornes [0,1] : {lgd}. "
                f"Vérifier le modèle LGD ou les hypothèses de recouvrement."
            )
        if ead < 0:
            raise ValueError(
                f"EAD négative : {ead}. "
                f"L'Exposure At Default ne peut être négative."
            )

    def _apply_regulatory_floors(
        self, pd: float, lgd: float, secured: Optional[bool] = None
    ) -> tuple:
        """
        Applique les planchers réglementaires Bâle III.
        
        Returns:
            (pd_floored, lgd_floored)
        """
        pd_adj = pd
        lgd_adj = lgd

        if self.apply_pd_floor:
            pd_adj = max(pd, self.PD_FLOOR)

        if self.apply_lgd_floor:
            is_secured = secured if secured is not None else self.default_secured
            lgd_floor = self.LGD_FLOOR_SECURED if is_secured else self.LGD_FLOOR_UNSECURED
            lgd_adj = max(lgd, lgd_floor)

        return pd_adj, lgd_adj

    def compute(
        self,
        pd: float,
        ead: float,
        lgd: Optional[float] = None,
        exposure_id: Optional[str] = None,
        secured: Optional[bool] = None,
        collateral_type: str = "UNSECURED",
        is_subordinated: bool = False,
        collateral_value: float = 0.0,
    ) -> ELResult:
        """
        Calcul de l'Expected Loss pour une exposition individuelle.

        Args:
            pd: Probability of Default (0-1)
            ead: Exposure At Default (montant en devise)
            lgd: Loss Given Default (0-1). Si None, calculé via LGDModel.
            exposure_id: Identifiant unique de l'exposition
            secured: Si l'exposition est garantie (affecte le floor LGD)
            collateral_type: Type de collatéral pour calcul dynamique
            is_subordinated: Dette subordonnée (True/False)
            collateral_value: Valeur du collatéral en devise

        Returns:
            ELResult avec EL, EL rate, et metadata d'audit
        """
        if lgd is None:
            if self.lgd_model:
                c_val = collateral_value if collateral_value > 0 else (ead if secured else 0.0)
                try:
                    if self.lgd_model_version == "two_part_beta_v2_cemac":
                        # LGDModelV2 : Two-Part Beta, secteurs CEMAC, downturn
                        result_v2 = self.lgd_model.estimate(
                            exposure_id=exposure_id or "EL_CALC",
                            collateral_type=collateral_type.lower(),
                            collateral_value=c_val,
                            ead=ead,
                            seniority="subordinated" if is_subordinated else "senior",
                            run_montecarlo=False,
                        )
                        lgd = result_v2.lgd_point_estimate
                    else:
                        # LGDModel v1 : interface compute_lgd()
                        lgd = self.lgd_model.compute_lgd(
                            ead=ead,
                            collateral_value=c_val,
                            collateral_type=collateral_type,
                            is_subordinated=is_subordinated,
                        )
                except Exception as _lgd_err:
                    logger.warning(f"LGD model error ({_lgd_err}) — using default {self.default_lgd}")
                    lgd = self.default_lgd
            else:
                lgd = self.default_lgd

        self._validate_inputs(pd, lgd, ead)

        pd_adj, lgd_adj = self._apply_regulatory_floors(pd, lgd, secured)
        expected_loss = pd_adj * lgd_adj * ead
        el_rate = (pd_adj * lgd_adj) if ead > 0 else 0.0

        result = ELResult(
            exposure_id=exposure_id or str(uuid.uuid4()),
            pd=pd_adj,
            lgd=lgd_adj,
            ead=ead,
            expected_loss=expected_loss,
            expected_loss_rate=el_rate,
            model_version=self.model_version,
        )

        # Audit trail
        self._audit_log.append({
            "action": "compute_el",
            "input": {"pd_raw": pd, "lgd_raw": lgd, "ead": ead},
            "output": result.to_dict(),
            "floors_applied": {
                "pd_floored": pd_adj != pd,
                "lgd_floored": lgd_adj != lgd,
            },
        })

        logger.debug(
            f"EL computed: ID={result.exposure_id}, "
            f"PD={pd_adj:.4f}, LGD={lgd_adj:.4f}, EAD={ead:,.0f}, "
            f"EL={expected_loss:,.2f}"
        )

        return result

    def compute_portfolio(
        self,
        portfolio_df: pd.DataFrame,
        pd_col: str = "pd",
        lgd_col: str = "lgd",
        ead_col: str = "ead",
        id_col: Optional[str] = None,
        secured_col: Optional[str] = None,
    ) -> pd.DataFrame:
        """
        Calcul batch de l'Expected Loss sur un portefeuille complet.

        Args:
            portfolio_df: DataFrame avec colonnes PD, LGD, EAD
            pd_col: Nom colonne PD
            lgd_col: Nom colonne LGD
            ead_col: Nom colonne EAD
            id_col: Nom colonne identifiant exposition
            secured_col: Nom colonne indicateur garanti/non garanti

        Returns:
            DataFrame enrichi avec colonnes EL, EL_rate, et metadata
        """
        results = []

        for idx, row in portfolio_df.iterrows():
            secured = row.get(secured_col) if secured_col else None
            exp_id = str(row.get(id_col, idx)) if id_col else str(idx)
            
            lgd_val = row.get(lgd_col) if lgd_col in row else None
            col_type = row.get("collateral_type", "UNSECURED")
            is_sub = bool(row.get("is_subordinated", False))
            col_val = float(row.get("collateral_value", 0.0))

            result = self.compute(
                pd=row[pd_col],
                lgd=lgd_val,
                ead=row[ead_col],
                exposure_id=exp_id,
                secured=bool(secured) if secured is not None else None,
                collateral_type=col_type,
                is_subordinated=is_sub,
                collateral_value=col_val,
            )
            results.append(result.to_dict())

        results_df = pd.DataFrame(results)
        logger.info(
            f"Portfolio EL computed: {len(results_df)} expositions, "
            f"EL total = {results_df['expected_loss'].sum():,.2f}"
        )

        return results_df

    def get_portfolio_summary(self, results_df: pd.DataFrame) -> Dict:
        """
        Synthèse portefeuille pour reporting direction / COBAC.
        """
        return {
            "total_ead": round(results_df["ead"].sum(), 2),
            "total_el": round(results_df["expected_loss"].sum(), 2),
            "weighted_avg_pd": round(
                np.average(results_df["pd"], weights=results_df["ead"]), 6
            ),
            "weighted_avg_lgd": round(
                np.average(results_df["lgd"], weights=results_df["ead"]), 6
            ),
            "avg_el_rate": round(results_df["expected_loss_rate"].mean(), 6),
            "n_exposures": len(results_df),
            "timestamp": datetime.utcnow().isoformat(),
        }

    def get_audit_log(self) -> List[Dict]:
        """Retourne l'intégralité du journal d'audit pour vérification COBAC."""
        return self._audit_log.copy()

    def clear_audit_log(self) -> None:
        """Purge du journal d'audit (avec timestamp de purge)."""
        logger.warning(f"Audit log purged — {len(self._audit_log)} entries cleared.")
        self._audit_log.clear()


if __name__ == "__main__":
    # Démonstration fonctionnelle
    calc = ExpectedLossCalculator(apply_pd_floor=True, apply_lgd_floor=True)

    # Calcul individuel
    result = calc.compute(pd=0.05, lgd=0.45, ead=1_000_000, exposure_id="EXPO-001")
    print(f"[Individual] EL = {result.expected_loss:,.2f} XAF")

    # Calcul portefeuille
    portfolio = pd.DataFrame({
        "client_id": [f"CLI-{i:03d}" for i in range(5)],
        "pd": [0.02, 0.08, 0.15, 0.03, 0.50],
        "lgd": [0.45, 0.55, 0.60, 0.40, 0.70],
        "ead": [500_000, 2_000_000, 750_000, 10_000_000, 300_000],
    })

    results = calc.compute_portfolio(portfolio, id_col="client_id")
    summary = calc.get_portfolio_summary(results)

    print(f"\n[Portfolio] EL Total = {summary['total_el']:,.2f} XAF")
    print(f"[Portfolio] PD Pondérée = {summary['weighted_avg_pd']:.4%}")
    print(f"[Portfolio] Nb Expositions = {summary['n_exposures']}")
