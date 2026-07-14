"""
Segment Configuration — Multi-Model Routing
============================================
Définit les segments de risque Basel III / COBAC et mappe chacun vers
son artefact PD modèle dédié.

Architecture :
  BusinessPayload.segment → SegmentRouter → artifact_name → load/cache → score

Segments cibles pour données CEMAC réelles :
  CORPORATE_CEMAC   : PME/Corporate, CA > 500M XAF
  RETAIL_CEMAC      : Salariés secteur formel, CA < 50M XAF
  MICROFINANCE_CEMAC: Thin-file, économie informelle, alt-data requis
  HOME_CREDIT_DEMO  : Fallback sur le dataset de démonstration (actuel)

Status : INFRASTRUCTURE PRÊTE — artefacts CEMAC non disponibles.
         Dès qu'un artefact est entraîné sur données réelles, pointer ici.
"""

from dataclasses import dataclass, field
from typing import Optional, Dict


@dataclass
class SegmentSpec:
    """Spécification d'un segment de risque."""
    segment_id: str
    label: str
    artifact_name: str              # Nom de l'artefact .pkl (sans extension)
    status: str                     # "AVAILABLE" | "PENDING_DATA" | "DEPRECATED"
    min_revenue_xaf: Optional[float] = None
    max_revenue_xaf: Optional[float] = None
    data_source: str = "UNKNOWN"
    gini_floor: float = 0.45        # Floor réglementaire OOT_VALIDATION_PACK §2
    auc_floor: float = 0.725
    description: str = ""
    fallback_segment: Optional[str] = None  # Segment de repli si artefact absent


SEGMENT_REGISTRY: Dict[str, SegmentSpec] = {
    "HOME_CREDIT_DEMO": SegmentSpec(
        segment_id    = "HOME_CREDIT_DEMO",
        label         = "Démonstration Home Credit (DEMO_BASELINE)",
        artifact_name = "pd_xgb_v1",
        status        = "AVAILABLE",
        data_source   = "Home Credit 2016-2018 (Kaggle)",
        description   = "Modèle retail russe/asiatique. Utilisé par défaut en l'absence d'artefacts CEMAC.",
        gini_floor    = 0.45,
        auc_floor     = 0.725,
    ),
    "CORPORATE_CEMAC": SegmentSpec(
        segment_id    = "CORPORATE_CEMAC",
        label         = "PME / Corporate CEMAC (CA > 500M XAF)",
        artifact_name = "pd_corporate_cemac_v1",  # À entraîner
        status        = "PENDING_DATA",
        min_revenue_xaf = 500_000_000,
        data_source   = "CBS CEMAC — données réelles requises",
        description   = "Segment corporate CEMAC. Risque concentration sectorielle (pétrole, BTP). "
                        "Nécessite données réelles pour entraînement.",
        gini_floor    = 0.45,
        auc_floor     = 0.725,
        fallback_segment = "HOME_CREDIT_DEMO",
    ),
    "RETAIL_CEMAC": SegmentSpec(
        segment_id    = "RETAIL_CEMAC",
        label         = "Retail Formel CEMAC (Salariés, CA < 500M XAF)",
        artifact_name = "pd_retail_cemac_v1",  # À entraîner
        status        = "PENDING_DATA",
        max_revenue_xaf = 500_000_000,
        data_source   = "CBS CEMAC — données réelles requises",
        description   = "Segment retail formel CEMAC. Plus proche du profil Home Credit "
                        "mais avec spécificités macroéconomiques CEMAC.",
        gini_floor    = 0.45,
        auc_floor     = 0.725,
        fallback_segment = "HOME_CREDIT_DEMO",
    ),
    "MICROFINANCE_CEMAC": SegmentSpec(
        segment_id    = "MICROFINANCE_CEMAC",
        label         = "Microfinance / EMF CEMAC (Thin-file)",
        artifact_name = "pd_microfinance_cemac_v1",  # À entraîner
        status        = "PENDING_DATA",
        max_revenue_xaf = 5_000_000,
        data_source   = "Alt-data (mobile money, field visits) — collecte requise",
        description   = "Segment microfinance / économie informelle CEMAC. "
                        "Requiert alt-data : mobile money, GPS, données de groupe, "
                        "historique de vente terrain. Score Home Credit non applicable.",
        gini_floor    = 0.35,    # Floor adapté au thin-file (moins d'historique)
        auc_floor     = 0.675,
        fallback_segment = None,  # Pas de fallback — segment trop différent
    ),
    "CEMAC_SYNTHETIC": SegmentSpec(
        segment_id    = "CEMAC_SYNTHETIC",
        label         = "CEMAC Synthétique (Validation calibration uniquement)",
        artifact_name = "pd_cemac_v1",
        status        = "AVAILABLE",
        data_source   = "Données synthétiques générées (01_data_layer/curated/cemac_synthetic.parquet)",
        description   = "Modèle entraîné sur données synthétiques CEMAC. "
                        "AUC ~0.94 non comparable à AUC sur données réelles (~0.75-0.80 attendu). "
                        "Utiliser uniquement pour tester l'infrastructure.",
        gini_floor    = 0.45,
        auc_floor     = 0.725,
        fallback_segment = "HOME_CREDIT_DEMO",
    ),
}


class SegmentRouter:
    """
    Résout le segment d'un payload et retourne l'artefact PD approprié.

    Usage :
        router = SegmentRouter()
        artifact, spec = router.resolve(segment="CORPORATE_CEMAC", revenue_xaf=2_000_000_000)
        # artifact = "pd_xgb_v1" (fallback car CORPORATE_CEMAC PENDING_DATA)
        # spec.status = "AVAILABLE" (le fallback est disponible)
    """

    def __init__(self, available_artifacts: Optional[list] = None):
        """
        Args:
            available_artifacts: Liste des artefacts .pkl présents sur disque.
                                 Si None, tous les AVAILABLE sont considérés chargés.
        """
        self.available = set(available_artifacts or [
            s.artifact_name for s in SEGMENT_REGISTRY.values()
            if s.status == "AVAILABLE"
        ])

    def resolve(
        self,
        segment: Optional[str] = None,
        revenue_xaf: Optional[float] = None,
        sector: Optional[str] = None,
    ) -> tuple:
        """
        Retourne (artifact_name, SegmentSpec) pour un payload donné.

        Logique de résolution :
          1. Si segment explicite et artefact disponible → utiliser
          2. Si segment explicite mais PENDING_DATA → fallback
          3. Si pas de segment → déduction par revenue_xaf
          4. Fallback final → HOME_CREDIT_DEMO
        """
        # 1. Segment explicite
        if segment and segment in SEGMENT_REGISTRY:
            spec = SEGMENT_REGISTRY[segment]
            if spec.artifact_name in self.available:
                return spec.artifact_name, spec
            # Fallback
            if spec.fallback_segment and spec.fallback_segment in SEGMENT_REGISTRY:
                fallback = SEGMENT_REGISTRY[spec.fallback_segment]
                return fallback.artifact_name, fallback

        # 2. Déduction automatique par revenue
        if revenue_xaf is not None:
            if revenue_xaf < 5_000_000:
                candidate = SEGMENT_REGISTRY.get("MICROFINANCE_CEMAC")
            elif revenue_xaf < 500_000_000:
                candidate = SEGMENT_REGISTRY.get("RETAIL_CEMAC")
            else:
                candidate = SEGMENT_REGISTRY.get("CORPORATE_CEMAC")

            if candidate and candidate.artifact_name in self.available:
                return candidate.artifact_name, candidate
            if candidate and candidate.fallback_segment:
                fallback = SEGMENT_REGISTRY.get(candidate.fallback_segment)
                if fallback:
                    return fallback.artifact_name, fallback

        # 3. Fallback universel
        default = SEGMENT_REGISTRY["HOME_CREDIT_DEMO"]
        return default.artifact_name, default

    def get_available_segments(self) -> list:
        return [
            {"segment_id": k, "label": v.label, "status": v.status,
             "artifact": v.artifact_name, "available": v.artifact_name in self.available}
            for k, v in SEGMENT_REGISTRY.items()
        ]
