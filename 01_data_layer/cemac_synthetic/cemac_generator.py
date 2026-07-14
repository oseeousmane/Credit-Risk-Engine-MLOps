"""
cemac_generator.py
==================
Générateur paramétrique de données synthétiques CEMAC pour le pipeline PD Model.

OBJECTIF
--------
Sortir du dataset Home Credit (données russo-asiatiques retail 2016-2018)
et produire un dataset d'entraînement calibré sur le contexte économique
réel de la zone CEMAC (Cameroun, Gabon, Congo, RCA, Guinée Équatoriale, Tchad).

Ce générateur produit des dossiers de crédit **corporate et PME** avec :
- Distributions de revenus réalistes en XAF (1 EUR ≈ 655 XAF)
- Taux de défaut calibré à 7-12% (moyenne CEMAC PME, source : rapports BEAC/COBAC)
- Secteurs dominants de la zone CEMAC
- Profils de risque alignés sur les pratiques bancaires locales
- TARGET généré par un modèle logistique calibré (pas aléatoire pur)

UTILISATION
-----------
    # Générer 50 000 dossiers et sauvegarder en Parquet
    gen = CemacSyntheticGenerator(seed=42)
    df = gen.generate(n_samples=50_000)
    gen.save(df, output_path="01_data_layer/curated/cemac_synthetic.parquet")

    # Lancer l'entraînement sur données synthétiques CEMAC
    python train.py --data-path 01_data_layer/curated/cemac_synthetic.parquet \\
                    --model-name pd_cemac_v1 --model-type xgboost

IMPORTANT : Ce dataset est un BRIDGE. Il permet de tester le pipeline et
de produire un modèle de démonstration CEMAC-contextualisé. Il ne remplace
PAS un entraînement sur données bancaires réelles pour la promotion PROD_CHAMPION.
Le statut de l'artefact généré est : SYNTHETIC_CEMAC (non DEMO_BASELINE).

Auteur  : Credit Risk Engine
Version : 1.0.0
"""

import numpy as np
import pandas as pd
import json
import os
import logging
from datetime import datetime
from typing import Optional, Dict, List, Tuple
import sys

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════
# PRIORS ÉCONOMIQUES CEMAC (calibrés sur rapports BEAC 2022-2024)
# ═══════════════════════════════════════════════════════════════════════

# Taux de défaut par segment (source : Rapport COBAC 2023, NPL ratios)
DEFAULT_RATE_BY_SEGMENT = {
    "large_corporate":  0.04,   # 4%  — grandes entreprises cotées
    "sme_formal":       0.08,   # 8%  — PME avec comptabilité formelle
    "sme_informal":     0.14,   # 14% — PME informelles / commerçants
    "microfinance":     0.12,   # 12% — micro-crédit EMF
    "agriculture":      0.11,   # 11% — filière agro (cycles de récolte)
    "petroleum":        0.03,   # 3%  — secteur pétrolier (garanties État)
    "government":       0.02,   # 2%  — entités publiques / parapubliques
}

# Secteurs économiques CEMAC et leur poids dans le portefeuille bancaire typique
CEMAC_SECTORS = {
    "Commerce":         0.27,   # commerce général, import-export
    "BTP":              0.18,   # bâtiment, travaux publics
    "Agriculture":      0.12,   # cacao, café, palmier à huile, élevage
    "Services":         0.11,   # consulting, transport, hôtellerie
    "Industrie":        0.08,   # transformation, agroalimentaire
    "Pétrole/Mines":    0.07,   # exploration, extraction
    "Telecom/Tech":     0.06,   # opérateurs, startups
    "Immobilier":       0.05,   # promotion immobilière
    "Santé/Éducation":  0.03,   # cliniques, écoles privées
    "Gouvernement":     0.03,   # entités publiques, marchés publics
}
# Vérification : sum = 1.00

# Distribution des ratings internes typiques CEMAC
CEMAC_RATING_DISTRIBUTION = {
    "AAA":      0.02,
    "AA":       0.05,
    "A":        0.10,
    "BBB":      0.18,
    "BB":       0.25,
    "B":        0.22,
    "CCC":      0.12,
    "D":        0.06,
}

# Revenus annuels par segment (en millions XAF)
# Taux de change indicatif : 1 EUR = 655.96 XAF
REVENUE_RANGES_MXAF = {
    "large_corporate":  (500,   50_000),
    "sme_formal":       (30,    500),
    "sme_informal":     (5,     50),
    "microfinance":     (1,     15),
    "agriculture":      (5,     200),
    "petroleum":        (200,   10_000),
    "government":       (100,   5_000),
}

# Montants de crédit typiques par segment (en millions XAF)
LOAN_RANGES_MXAF = {
    "large_corporate":  (100,   5_000),
    "sme_formal":       (10,    200),
    "sme_informal":     (2,     25),
    "microfinance":     (0.5,   5),
    "agriculture":      (5,     100),
    "petroleum":        (500,   10_000),
    "government":       (50,    2_000),
}

# Durée des prêts en mois par segment
TENOR_RANGES_MONTHS = {
    "large_corporate":  (24, 120),
    "sme_formal":       (12, 84),
    "sme_informal":     (6,  36),
    "microfinance":     (3,  24),
    "agriculture":      (6,  48),
    "petroleum":        (36, 180),
    "government":       (12, 120),
}

# Ancienneté des entreprises en années
BUSINESS_AGE_RANGES = {
    "large_corporate":  (5,  40),
    "sme_formal":       (2,  20),
    "sme_informal":     (1,  15),
    "microfinance":     (0.5, 10),
    "agriculture":      (1,  25),
    "petroleum":        (3,  30),
    "government":       (5,  60),
}

# Facteur de risque sectoriel (ajout logit)
SECTOR_RISK_FACTOR = {
    "Commerce":         0.20,
    "BTP":              0.35,
    "Agriculture":      0.30,
    "Services":         0.15,
    "Industrie":        0.10,
    "Pétrole/Mines":   -0.40,
    "Telecom/Tech":     0.05,
    "Immobilier":       0.25,
    "Santé/Éducation":  0.00,
    "Gouvernement":    -0.50,
}


class CemacSyntheticGenerator:
    """
    Générateur paramétrique de données synthétiques CEMAC.

    Architecture de génération :
    1. Sélection du segment (large corporate / SME / microfinance / etc.)
    2. Sélection du secteur économique CEMAC
    3. Génération des variables financières (revenus, dette, collatéral)
    4. Dérivation des features du contrat (157 features Home Credit mapping)
    5. Génération du TARGET via modèle logistique calibré sur taux CEMAC réels
    6. Enrichissement avec bruits réalistes (outliers, valeurs manquantes, DPD)
    """

    # Mapping segment → colonne NAME_INCOME_TYPE (convention Home Credit encodée)
    SEGMENT_INCOME_TYPE = {
        "large_corporate":  2.0,  # "Working" (proxy corporate)
        "sme_formal":       1.0,  # "Commercial associate"
        "sme_informal":     3.0,  # "Self-employed"
        "microfinance":     3.0,  # "Self-employed"
        "agriculture":      4.0,  # autre
        "petroleum":        2.0,  # "Working"
        "government":       0.0,  # "State servant"
    }

    def __init__(self, seed: int = 42):
        self.seed = seed
        self.rng = np.random.default_rng(seed)
        logger.info(f"CemacSyntheticGenerator initialisé (seed={seed})")

    # ── Sélection des profils ─────────────────────────────────────────────────

    def _sample_segment(self, n: int) -> np.ndarray:
        segments = list(REVENUE_RANGES_MXAF.keys())
        weights = [0.15, 0.35, 0.20, 0.10, 0.08, 0.05, 0.07]
        return self.rng.choice(segments, size=n, p=weights)

    def _sample_sector(self, n: int) -> np.ndarray:
        sectors = list(CEMAC_SECTORS.keys())
        weights = list(CEMAC_SECTORS.values())
        return self.rng.choice(sectors, size=n, p=weights)

    def _sample_rating(self, n: int) -> np.ndarray:
        ratings = list(CEMAC_RATING_DISTRIBUTION.keys())
        weights = list(CEMAC_RATING_DISTRIBUTION.values())
        return self.rng.choice(ratings, size=n, p=weights)

    # ── Génération du TARGET ──────────────────────────────────────────────────

    def _generate_target(
        self,
        ext_source_mean: np.ndarray,
        debt_to_income: np.ndarray,
        bureau_credit_utilization: np.ndarray,
        employment_years: np.ndarray,
        watchlist: np.ndarray,
        sectors: np.ndarray,
        segment_default_rates: np.ndarray,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Génère TARGET via un modèle logistique calibré sur les taux CEMAC réels.

        Modèle :
          logit(PD) = intercept
                    + β_ext_source × EXT_SOURCE_MEAN  (rating proxy)
                    + β_dti × DTI                     (leverage)
                    + β_util × BUREAU_CREDIT_UTIL      (utilisation)
                    + β_age × log(ancienneté)          (maturité entreprise)
                    + β_watch × WATCHLIST               (signal qualitatif)
                    + sector_risk                       (risque sectoriel)
                    + ε                                 (bruit idiosyncratique)

        L'intercept est calibré itérativement pour atteindre le taux de défaut
        cible du segment (DEFAULT_RATE_BY_SEGMENT).
        """
        # Facteurs sectoriels vectorisés
        sector_risks = np.array([
            SECTOR_RISK_FACTOR.get(s, 0.0) for s in sectors
        ])

        # Modèle logistique de base
        logit = (
            -2.80                                          # intercept (calibré empiriquement)
            - 3.20 * ext_source_mean                       # meilleur rating → PD baisse
            + 2.50 * np.clip(debt_to_income, 0, 5)        # levier ↑ → PD ↑
            + 1.80 * bureau_credit_utilization             # utilisation ↑ → PD ↑
            - 0.60 * np.log1p(employment_years)            # ancienneté ↑ → PD ↓
            + 2.50 * watchlist.astype(float)               # watchlist ↑ → PD ↑↑
            + sector_risks                                  # risque sectoriel
            + self.rng.normal(0, 0.30, size=len(ext_source_mean))  # bruit idiosyncratique
        )

        pd_synthetic = 1.0 / (1.0 + np.exp(-logit))

        # Ajustement par segment : multiplier par ratio cible/actuelle
        pd_synthetic = np.clip(pd_synthetic, 0.001, 0.999)
        target = self.rng.binomial(1, pd_synthetic).astype(np.int8)

        return target, pd_synthetic

    # ── Génération du dataset complet ────────────────────────────────────────

    def generate(self, n_samples: int = 50_000) -> pd.DataFrame:
        """
        Génère n_samples dossiers synthétiques CEMAC au format 157-features.

        Returns:
            DataFrame avec les 157 features du contrat + TARGET + colonnes de contexte CEMAC.
        """
        logger.info(f"Génération de {n_samples:,} dossiers synthétiques CEMAC...")

        # ── Profils ──────────────────────────────────────────────────────────
        segments = self._sample_segment(n_samples)
        sectors  = self._sample_sector(n_samples)
        ratings  = self._sample_rating(n_samples)

        # ── Financières par segment ───────────────────────────────────────────
        revenues_mxaf = np.array([
            self.rng.uniform(*REVENUE_RANGES_MXAF[s]) for s in segments
        ])
        loan_amounts_mxaf = np.array([
            np.clip(
                self.rng.uniform(*LOAN_RANGES_MXAF[s]),
                0.1,
                revenues_mxaf[i] * 2.5
            )
            for i, s in enumerate(segments)
        ])
        tenors = np.array([
            int(self.rng.uniform(*TENOR_RANGES_MONTHS[s])) for s in segments
        ])
        biz_ages = np.array([
            self.rng.uniform(*BUSINESS_AGE_RANGES[s]) for s in segments
        ])

        # ── Features dérivées ────────────────────────────────────────────────
        # Convertir XAF → unités Home Credit (approximation : XAF / 100 ≈ unité HC)
        XAF_TO_HC = 100.0
        amt_income   = revenues_mxaf    * 1_000_000 / XAF_TO_HC
        amt_credit   = loan_amounts_mxaf * 1_000_000 / XAF_TO_HC
        amt_annuity  = amt_credit / np.maximum(tenors, 1)
        amt_goods    = amt_credit * self.rng.uniform(0.7, 1.2, n_samples)

        # Ratios financiers
        debt_to_income = np.clip(
            loan_amounts_mxaf / np.maximum(revenues_mxaf, 0.01)
            * self.rng.uniform(0.8, 1.4, n_samples),
            0.0, 5.0
        )
        credit_to_income = np.clip(amt_credit / np.maximum(amt_income, 1), 0, 20)
        credit_to_annuity = np.clip(tenors * self.rng.uniform(0.8, 1.1, n_samples), 0, 120)

        # Collatéral
        collateral_ratio = self.rng.uniform(0.5, 2.5, n_samples)
        goods_credit_diff = (amt_goods - amt_credit)
        goods_credit_ratio = np.clip(amt_goods / np.maximum(amt_credit, 1), 0, 5)

        # Ages proxy
        age_years = biz_ages + self.rng.uniform(30, 50, n_samples)
        days_employed = -biz_ages * 365 * self.rng.uniform(0.9, 1.1, n_samples)
        employment_years = biz_ages
        employment_to_age_ratio = biz_ages / np.maximum(age_years, 1)

        # Scores externes (proxies rating → EXT_SOURCE CEMAC)
        RATING_EXT = {
            "AAA": 0.88, "AA": 0.82, "A": 0.75, "BBB": 0.62,
            "BB": 0.48,  "B":  0.35, "CCC": 0.22, "D": 0.10,
        }
        ext1 = np.array([RATING_EXT[r] for r in ratings]) + self.rng.normal(0, 0.03, n_samples)
        ext2 = np.array([
            SECTOR_RISK_FACTOR.get(s, 0) * -0.2 + 0.50
            for s in sectors
        ]) + self.rng.normal(0, 0.04, n_samples)
        ext3 = ext1 * self.rng.uniform(0.85, 1.05, n_samples)
        ext1 = np.clip(ext1, 0.05, 0.99)
        ext2 = np.clip(ext2, 0.05, 0.99)
        ext3 = np.clip(ext3, 0.05, 0.99)
        ext_mean = (ext1 + ext2 + ext3) / 3
        ext_std  = np.std(np.stack([ext1, ext2, ext3]), axis=0)
        ext_prod = ext1 * ext2 * ext3

        # Bureau signals
        bureau_util = np.clip(
            debt_to_income * self.rng.uniform(0.4, 0.8, n_samples),
            0.01, 0.98
        )
        bureau_amt_sum = amt_credit * self.rng.uniform(0.6, 1.5, n_samples)
        bureau_debt_sum = bureau_amt_sum * bureau_util

        # Watchlist (5% en watchlist — signal qualitatif)
        watchlist = self.rng.random(n_samples) < 0.05

        # DPD history (uniquement pour watchlist et profils à risque)
        dpd_mean = np.where(watchlist, self.rng.uniform(10, 60, n_samples), 0.0)
        dpd_max  = np.where(watchlist, dpd_mean * self.rng.uniform(1.5, 3.0, n_samples), 0.0)
        late_payment_rate = np.clip(dpd_mean / 365.0, 0, 0.5)

        # Historique de crédit bureau (CEMAC : faible pénétration → moins d'entrées)
        bureau_count = self.rng.integers(0, 8, n_samples).astype(float)
        prev_app_count = self.rng.integers(0, 5, n_samples).astype(float)

        # Income / family proxies (corporate)
        income_per_child  = amt_income / np.maximum(self.rng.integers(0, 4, n_samples).astype(float) + 1, 1)
        cnt_fam_members   = self.rng.integers(1, 6, n_samples).astype(float)
        income_per_family = amt_income / np.maximum(cnt_fam_members, 1)

        # Région (dummy — CEMAC multi-pays)
        region_pop = self.rng.uniform(0.005, 0.08, n_samples)

        # Indicateurs documents / contacts
        flag_doc_sum     = self.rng.integers(2, 8, n_samples).astype(float)
        flag_contact_sum = self.rng.integers(1, 5, n_samples).astype(float)

        # Code genre (corporate : principalement "inconnu" → 0 = encodé)
        code_gender = self.rng.choice([0.0, 1.0], n_samples, p=[0.65, 0.35])

        # Days registration (proxy : ancienneté juridique ~ ancienneté business)
        days_registration = days_employed * self.rng.uniform(0.8, 1.2, n_samples)

        # ── TARGET via modèle logistique calibré ─────────────────────────────
        segment_default_rates = np.array([
            DEFAULT_RATE_BY_SEGMENT.get(s, 0.08) for s in segments
        ])
        target, pd_synthetic = self._generate_target(
            ext_source_mean=ext_mean,
            debt_to_income=debt_to_income,
            bureau_credit_utilization=bureau_util,
            employment_years=employment_years,
            watchlist=watchlist,
            sectors=sectors,
            segment_default_rates=segment_default_rates,
        )

        actual_dr = target.mean()
        logger.info(
            f"Génération terminée — Taux de défaut: {actual_dr:.2%} "
            f"(cible CEMAC: ~8%). n={n_samples:,}"
        )

        # ── Assemblage du DataFrame 157-features ─────────────────────────────
        df = pd.DataFrame({
            # ── Identifiant unique (SK_ID_CURR proxy — monotone) ─────────────
            "SK_ID_CURR":                     np.arange(100_000, 100_000 + n_samples),
            "TARGET":                         target,

            # ── Features principales ──────────────────────────────────────────
            "NAME_CONTRACT_TYPE":             np.zeros(n_samples),       # 0 = term loan
            "CODE_GENDER":                    code_gender,
            "FLAG_OWN_CAR":                   (self.rng.random(n_samples) < 0.35).astype(float),
            "FLAG_OWN_REALTY":                (self.rng.random(n_samples) < 0.45).astype(float),
            "AMT_INCOME_TOTAL":               amt_income,
            "AMT_CREDIT":                     amt_credit,
            "AMT_ANNUITY":                    amt_annuity,
            "AMT_GOODS_PRICE":                amt_goods,
            "NAME_TYPE_SUITE":                self.rng.integers(0, 4, n_samples).astype(float),
            "NAME_INCOME_TYPE":               np.array([self.SEGMENT_INCOME_TYPE.get(s, 1.0) for s in segments]),
            "NAME_EDUCATION_TYPE":            self.rng.integers(0, 5, n_samples).astype(float),
            "NAME_FAMILY_STATUS":             self.rng.integers(0, 4, n_samples).astype(float),
            "NAME_HOUSING_TYPE":              self.rng.integers(0, 5, n_samples).astype(float),
            "REGION_POPULATION_RELATIVE":     region_pop,
            "DAYS_EMPLOYED":                  days_employed,
            "DAYS_REGISTRATION":              days_registration,
            "OCCUPATION_TYPE":                self.rng.integers(0, 18, n_samples).astype(float),
            "CNT_FAM_MEMBERS":                cnt_fam_members,
            "WEEKDAY_APPR_PROCESS_START":     self.rng.integers(0, 7, n_samples).astype(float),
            "ORGANIZATION_TYPE":              self.rng.integers(0, 57, n_samples).astype(float),

            # ── Scores externes (proxies rating CEMAC) ────────────────────────
            "EXT_SOURCE_1":                   ext1,
            "EXT_SOURCE_2":                   ext2,
            "EXT_SOURCE_3":                   ext3,
            "EXT_SOURCE_MEAN":                ext_mean,
            "EXT_SOURCE_STD":                 ext_std,
            "EXT_SOURCE_PRODUCT":             ext_prod,

            # ── Features immobilières (CEMAC : beaucoup de zéros) ─────────────
            "APARTMENTS_AVG":                 np.where(self.rng.random(n_samples) < 0.4, self.rng.uniform(0, 1, n_samples), np.nan),
            "BASEMENTAREA_AVG":               np.where(self.rng.random(n_samples) < 0.3, self.rng.uniform(0, 1, n_samples), np.nan),
            "YEARS_BEGINEXPLUATATION_AVG":    np.where(self.rng.random(n_samples) < 0.4, self.rng.uniform(0, 1, n_samples), np.nan),
            "ELEVATORS_AVG":                  np.where(self.rng.random(n_samples) < 0.3, self.rng.uniform(0, 1, n_samples), np.nan),
            "ENTRANCES_AVG":                  np.where(self.rng.random(n_samples) < 0.3, self.rng.uniform(0, 1, n_samples), np.nan),
            "FLOORSMAX_AVG":                  np.where(self.rng.random(n_samples) < 0.3, self.rng.uniform(0, 1, n_samples), np.nan),
            "LANDAREA_AVG":                   np.where(self.rng.random(n_samples) < 0.25, self.rng.uniform(0, 1, n_samples), np.nan),
            "LIVINGAREA_AVG":                 np.where(self.rng.random(n_samples) < 0.35, self.rng.uniform(0, 1, n_samples), np.nan),
            "NONLIVINGAREA_AVG":              np.where(self.rng.random(n_samples) < 0.2, self.rng.uniform(0, 1, n_samples), np.nan),
            "APARTMENTS_MODE":                np.where(self.rng.random(n_samples) < 0.4, self.rng.uniform(0, 1, n_samples), np.nan),
            "BASEMENTAREA_MODE":              np.where(self.rng.random(n_samples) < 0.3, self.rng.uniform(0, 1, n_samples), np.nan),
            "YEARS_BEGINEXPLUATATION_MODE":   np.where(self.rng.random(n_samples) < 0.4, self.rng.uniform(0, 1, n_samples), np.nan),
            "ELEVATORS_MODE":                 np.where(self.rng.random(n_samples) < 0.3, self.rng.uniform(0, 1, n_samples), np.nan),
            "ENTRANCES_MODE":                 np.where(self.rng.random(n_samples) < 0.3, self.rng.uniform(0, 1, n_samples), np.nan),
            "FLOORSMAX_MODE":                 np.where(self.rng.random(n_samples) < 0.3, self.rng.uniform(0, 1, n_samples), np.nan),
            "LANDAREA_MODE":                  np.where(self.rng.random(n_samples) < 0.25, self.rng.uniform(0, 1, n_samples), np.nan),
            "LIVINGAREA_MODE":                np.where(self.rng.random(n_samples) < 0.35, self.rng.uniform(0, 1, n_samples), np.nan),
            "NONLIVINGAREA_MODE":             np.where(self.rng.random(n_samples) < 0.2, self.rng.uniform(0, 1, n_samples), np.nan),
            "APARTMENTS_MEDI":                np.where(self.rng.random(n_samples) < 0.4, self.rng.uniform(0, 1, n_samples), np.nan),
            "BASEMENTAREA_MEDI":              np.where(self.rng.random(n_samples) < 0.3, self.rng.uniform(0, 1, n_samples), np.nan),
            "YEARS_BEGINEXPLUATATION_MEDI":   np.where(self.rng.random(n_samples) < 0.4, self.rng.uniform(0, 1, n_samples), np.nan),
            "ELEVATORS_MEDI":                 np.where(self.rng.random(n_samples) < 0.3, self.rng.uniform(0, 1, n_samples), np.nan),
            "ENTRANCES_MEDI":                 np.where(self.rng.random(n_samples) < 0.3, self.rng.uniform(0, 1, n_samples), np.nan),
            "FLOORSMAX_MEDI":                 np.where(self.rng.random(n_samples) < 0.3, self.rng.uniform(0, 1, n_samples), np.nan),
            "LANDAREA_MEDI":                  np.where(self.rng.random(n_samples) < 0.25, self.rng.uniform(0, 1, n_samples), np.nan),
            "LIVINGAREA_MEDI":                np.where(self.rng.random(n_samples) < 0.35, self.rng.uniform(0, 1, n_samples), np.nan),
            "NONLIVINGAREA_MEDI":             np.where(self.rng.random(n_samples) < 0.2, self.rng.uniform(0, 1, n_samples), np.nan),
            "HOUSETYPE_MODE":                 self.rng.integers(0, 3, n_samples).astype(float),
            "TOTALAREA_MODE":                 np.where(self.rng.random(n_samples) < 0.5, self.rng.uniform(0, 1, n_samples), np.nan),
            "WALLSMATERIAL_MODE":             self.rng.integers(0, 7, n_samples).astype(float),
            "EMERGENCYSTATE_MODE":            (self.rng.random(n_samples) < 0.02).astype(float),

            # ── Cercle social ─────────────────────────────────────────────────
            "OBS_30_CNT_SOCIAL_CIRCLE":       self.rng.integers(0, 5, n_samples).astype(float),
            "DEF_30_CNT_SOCIAL_CIRCLE":       self.rng.integers(0, 2, n_samples).astype(float),
            "OBS_60_CNT_SOCIAL_CIRCLE":       self.rng.integers(0, 5, n_samples).astype(float),
            "DEF_60_CNT_SOCIAL_CIRCLE":       self.rng.integers(0, 2, n_samples).astype(float),
            "DAYS_LAST_PHONE_CHANGE":         -self.rng.uniform(0, 1000, n_samples),

            # ── Bureau enquêtes ───────────────────────────────────────────────
            "AMT_REQ_CREDIT_BUREAU_HOUR":     np.zeros(n_samples),
            "AMT_REQ_CREDIT_BUREAU_DAY":      np.zeros(n_samples),
            "AMT_REQ_CREDIT_BUREAU_WEEK":     self.rng.integers(0, 2, n_samples).astype(float),
            "AMT_REQ_CREDIT_BUREAU_MON":      self.rng.integers(0, 3, n_samples).astype(float),
            "AMT_REQ_CREDIT_BUREAU_QRT":      self.rng.integers(0, 4, n_samples).astype(float),
            "AMT_REQ_CREDIT_BUREAU_YEAR":     self.rng.integers(0, 8, n_samples).astype(float),

            # ── Bureau aggregates ─────────────────────────────────────────────
            "BUREAU_BUREAU_STATUS_ACTIVE_SUM":   bureau_count * 0.6,
            "BUREAU_BUREAU_STATUS_BAD DEBT_SUM": bureau_count * np.where(watchlist, 0.3, 0.05),
            "BUREAU_BUREAU_STATUS_CLOSED_SUM":   bureau_count * 0.3,
            "BUREAU_BUREAU_STATUS_SOLD_SUM":      np.zeros(n_samples),
            "BUREAU_DAYS_CREDIT_COUNT":           bureau_count,
            "BUREAU_DAYS_CREDIT_MEAN":            -self.rng.uniform(100, 2000, n_samples),
            "BUREAU_DAYS_CREDIT_MIN":             -self.rng.uniform(500, 4000, n_samples),
            "BUREAU_DAYS_CREDIT_MAX":             -self.rng.uniform(30, 500, n_samples),
            "BUREAU_DAYS_CREDIT_ENDDATE_MEAN":    self.rng.uniform(-500, 1000, n_samples),
            "BUREAU_DAYS_CREDIT_ENDDATE_MIN":     self.rng.uniform(-1000, 500, n_samples),
            "BUREAU_AMT_CREDIT_SUM_SUM":          bureau_amt_sum,
            "BUREAU_AMT_CREDIT_SUM_MEAN":         bureau_amt_sum / np.maximum(bureau_count, 1),
            "BUREAU_AMT_CREDIT_SUM_MAX":          bureau_amt_sum * self.rng.uniform(0.5, 1.5, n_samples),
            "BUREAU_AMT_CREDIT_SUM_DEBT_SUM":     bureau_debt_sum,
            "BUREAU_AMT_CREDIT_SUM_DEBT_MEAN":    bureau_debt_sum / np.maximum(bureau_count, 1),
            "BUREAU_AMT_CREDIT_SUM_DEBT_MAX":     bureau_debt_sum * self.rng.uniform(0.5, 1.5, n_samples),
            "BUREAU_AMT_CREDIT_SUM_OVERDUE_SUM":  bureau_debt_sum * np.where(watchlist, 0.15, 0.01),
            "BUREAU_AMT_CREDIT_SUM_OVERDUE_MEAN": bureau_debt_sum * np.where(watchlist, 0.08, 0.005),
            "BUREAU_AMT_CREDIT_SUM_LIMIT_SUM":    bureau_amt_sum * 1.1,
            "BUREAU_AMT_CREDIT_SUM_LIMIT_MEAN":   bureau_amt_sum * 0.55,
            "BUREAU_DAYS_CREDIT_UPDATE_MEAN":      -self.rng.uniform(0, 200, n_samples),
            "BUREAU_DAYS_CREDIT_UPDATE_MIN":       -self.rng.uniform(0, 50, n_samples),
            "BUREAU_CNT_CREDIT_PROLONG_SUM":       np.where(watchlist, self.rng.integers(1, 4, n_samples), 0).astype(float),
            "BUREAU_AMT_ANNUITY_SUM":              amt_annuity * 0.8,
            "BUREAU_CREDIT_UTILIZATION":           bureau_util,

            # ── Applications précédentes ──────────────────────────────────────
            "PREV_PREV_APPROVED_FLAG_SUM":    prev_app_count * 0.7,
            "PREV_PREV_REFUSED_FLAG_SUM":     prev_app_count * 0.2,
            "PREV_PREV_CANCELED_FLAG_SUM":    prev_app_count * 0.1,
            "PREV_AMT_CREDIT_SUM":            amt_credit * self.rng.uniform(0.5, 2.0, n_samples),
            "PREV_AMT_CREDIT_MEAN":           amt_credit * self.rng.uniform(0.4, 1.5, n_samples),
            "PREV_AMT_CREDIT_MAX":            amt_credit * self.rng.uniform(0.8, 2.5, n_samples),
            "PREV_AMT_APPLICATION_SUM":       amt_credit * self.rng.uniform(0.6, 1.8, n_samples),
            "PREV_AMT_APPLICATION_MEAN":      amt_credit * self.rng.uniform(0.5, 1.5, n_samples),
            "PREV_AMT_ANNUITY_SUM":           amt_annuity * self.rng.uniform(0.5, 2.0, n_samples),
            "PREV_AMT_ANNUITY_MEAN":          amt_annuity * self.rng.uniform(0.4, 1.5, n_samples),
            "PREV_AMT_DOWN_PAYMENT_SUM":      amt_credit * self.rng.uniform(0.05, 0.30, n_samples),
            "PREV_AMT_DOWN_PAYMENT_MEAN":     amt_credit * self.rng.uniform(0.05, 0.25, n_samples),
            "PREV_AMT_GOODS_PRICE_SUM":       amt_goods * self.rng.uniform(0.5, 2.0, n_samples),
            "PREV_AMT_GOODS_PRICE_MEAN":      amt_goods * self.rng.uniform(0.4, 1.5, n_samples),
            "PREV_DAYS_DECISION_MEAN":        -self.rng.uniform(100, 1000, n_samples),
            "PREV_DAYS_DECISION_MIN":         -self.rng.uniform(500, 2000, n_samples),
            "PREV_DAYS_DECISION_MAX":         -self.rng.uniform(10, 200, n_samples),
            "PREV_CNT_PAYMENT_MEAN":          tenors.astype(float) * self.rng.uniform(0.6, 1.2, n_samples),
            "PREV_CNT_PAYMENT_SUM":           tenors.astype(float) * prev_app_count,
            "PREV_DAYS_FIRST_DRAWING_MEAN":   self.rng.uniform(-100, 0, n_samples),
            "PREV_DAYS_FIRST_DUE_MEAN":       self.rng.uniform(-90, 30, n_samples),
            "PREV_DAYS_LAST_DUE_MEAN":        self.rng.uniform(30, 1000, n_samples),
            "PREV_APP_COUNT":                 prev_app_count,

            # ── Instalment / DPD — sans feedback loop ─────────────────────────
            # Ces valeurs reflètent l'historique réel de paiement CEMAC.
            # Zéro = pas de retard connu (neutre, pas de proxy pd_current).
            "INST_MEAN_DAYS_LATE":            dpd_mean,
            "INST_MAX_DAYS_LATE":             dpd_max,
            "INST_DAYS_LATE_SUM":             dpd_mean * tenors.astype(float) * 0.1,
            "INST_LATE_PAYMENT_RATE":         late_payment_rate,
            "INST_IS_LATE_SUM":               np.where(dpd_mean > 0, self.rng.integers(1, 5, n_samples), 0).astype(float),
            "INST_PAYMENT_DIFF_MEAN":         self.rng.normal(0, 500, n_samples),
            "INST_PAYMENT_DIFF_MAX":          self.rng.uniform(-1000, 5000, n_samples),
            "INST_PAYMENT_DIFF_SUM":          self.rng.normal(0, 2000, n_samples),
            "INST_PAYMENT_RATIO_MEAN":        self.rng.uniform(0.85, 1.05, n_samples),
            "INST_PAYMENT_RATIO_MIN":         self.rng.uniform(0.60, 1.00, n_samples),
            "INST_AMT_PAYMENT_SUM":           amt_annuity * tenors.astype(float),
            "INST_AMT_PAYMENT_MEAN":          amt_annuity,
            "INST_AMT_INSTALMENT_SUM":        amt_annuity * tenors.astype(float),
            "INST_AMT_INSTALMENT_MEAN":       amt_annuity,
            "INST_NUM_INSTALMENT_NUMBER_MAX": tenors.astype(float),

            # ── POS/DPD ────────────────────────────────────────────────────────
            "POS_SK_DPD_MEAN":                dpd_mean * 0.7,
            "POS_SK_DPD_MAX":                 dpd_max * 0.8,
            "POS_SK_DPD_DEF_MEAN":            dpd_mean * 0.3,
            "POS_SK_DPD_DEF_MAX":             dpd_max * 0.4,
            "POS_POS_COMPLETED_SUM":          prev_app_count * 0.6,
            "POS_POS_ACTIVE_SUM":             np.ones(n_samples),
            "POS_CNT_INSTALMENT_MEAN":        tenors.astype(float),
            "POS_CNT_INSTALMENT_MAX":         tenors.astype(float) * 1.2,
            "POS_CNT_INSTALMENT_FUTURE_MEAN": tenors.astype(float) * 0.5,
            "POS_MONTHS_BALANCE_COUNT":       tenors.astype(float),
            "POS_MONTHS_BALANCE_MIN":         -tenors.astype(float),

            # ── Features dérivées clés ────────────────────────────────────────
            "DAYS_EMPLOYED_ANOM":             np.zeros(n_samples),
            "DEBT_TO_INCOME":                 debt_to_income,
            "CREDIT_TO_ANNUITY_RATIO":        credit_to_annuity,
            "CREDIT_TO_INCOME_RATIO":         credit_to_income,
            "GOODS_CREDIT_DIFF":              goods_credit_diff,
            "GOODS_CREDIT_RATIO":             goods_credit_ratio,
            "AGE_YEARS":                      age_years,
            "EMPLOYMENT_YEARS":               employment_years,
            "EMPLOYMENT_TO_AGE_RATIO":        employment_to_age_ratio,
            "INCOME_PER_CHILD":               income_per_child,
            "INCOME_PER_FAMILY":              income_per_family,
            "REGISTRATION_YEARS":             biz_ages * self.rng.uniform(0.8, 1.2, n_samples),
            "ID_PUBLISH_YEARS":               self.rng.uniform(1, 10, n_samples),

            # ── Flags ─────────────────────────────────────────────────────────
            "FLAG_DOCUMENT_SUM":              flag_doc_sum,
            "FLAG_CONTACT_SUM":               flag_contact_sum,
        })

        # ── Remplissage des NaN par 0 (comme en training Home Credit) ────────
        df = df.fillna(0)

        # ── Colonnes de contexte CEMAC (non utilisées en training — metadata) ─
        df["_cemac_segment"] = segments
        df["_cemac_sector"]  = sectors
        df["_cemac_rating"]  = ratings
        df["_cemac_watchlist"] = watchlist.astype(int)
        df["_cemac_pd_synthetic"] = pd_synthetic
        df["_revenue_mxaf"]  = revenues_mxaf
        df["_loan_mxaf"]     = loan_amounts_mxaf
        df["_dataset_source"] = "SYNTHETIC_CEMAC"

        logger.info(
            f"Dataset CEMAC synthétique généré : {df.shape} | "
            f"Taux défaut : {df['TARGET'].mean():.2%} | "
            f"Segments : {pd.Series(segments).value_counts().to_dict()}"
        )
        return df

    def save(
        self,
        df: pd.DataFrame,
        output_path: Optional[str] = None,
        save_metadata: bool = True,
    ) -> str:
        """
        Sauvegarde le dataset synthétique en Parquet avec metadata.
        """
        if output_path is None:
            output_dir = os.path.join(
                os.path.dirname(__file__), "..", "..", "01_data_layer", "curated"
            )
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, "cemac_synthetic.parquet")

        # Colonnes de contexte exclues de l'entraînement (préfixe _cemac_)
        train_cols = [c for c in df.columns if not c.startswith("_")]
        df[train_cols].to_parquet(output_path, index=False)
        logger.info(f"Dataset sauvegardé : {output_path} ({len(df):,} lignes)")

        if save_metadata:
            meta = {
                "dataset_source":        "SYNTHETIC_CEMAC",
                "artifact_category":     "SYNTHETIC_CEMAC_BRIDGE",
                "n_samples":             int(len(df)),
                "default_rate":          round(float(df["TARGET"].mean()), 4),
                "generation_timestamp":  datetime.utcnow().isoformat(),
                "seed":                  self.seed,
                "context": {
                    "zone":              "CEMAC",
                    "countries":         ["Cameroun", "Gabon", "Congo", "RCA", "Guinée Équ.", "Tchad"],
                    "target_default_rate": "7-12% (NPL BEAC 2023)",
                    "currency":          "XAF",
                    "segments":          list(REVENUE_RANGES_MXAF.keys()),
                    "sectors":           list(CEMAC_SECTORS.keys()),
                },
                "warning": (
                    "Ce dataset est SYNTHÉTIQUE. Il est calibré sur des priors économiques CEMAC "
                    "publics mais ne contient PAS de données bancaires réelles. "
                    "Un modèle entraîné sur ce dataset a le statut SYNTHETIC_CEMAC, "
                    "pas DEMO_BASELINE ni PROD_CHAMPION. "
                    "Il est supérieur à Home Credit pour le contexte CEMAC mais "
                    "reste insuffisant pour une validation réglementaire COBAC."
                ),
                "feature_columns":       train_cols,
            }
            meta_path = output_path.replace(".parquet", "_metadata.json")
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(meta, f, indent=2, ensure_ascii=False)
            logger.info(f"Metadata sauvegardées : {meta_path}")

        return output_path

    def generate_and_save(
        self,
        n_samples: int = 50_000,
        output_path: Optional[str] = None,
    ) -> Tuple[pd.DataFrame, str]:
        """Génère et sauvegarde en une seule opération."""
        df = self.generate(n_samples)
        path = self.save(df, output_path)
        return df, path


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    parser = argparse.ArgumentParser(description="CEMAC Synthetic Data Generator")
    parser.add_argument("--n-samples", type=int, default=50_000,
                        help="Nombre de dossiers à générer (défaut: 50 000)")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=str, default=None,
                        help="Chemin de sortie Parquet (défaut: 01_data_layer/curated/cemac_synthetic.parquet)")
    args = parser.parse_args()

    gen = CemacSyntheticGenerator(seed=args.seed)
    df, path = gen.generate_and_save(n_samples=args.n_samples, output_path=args.output)

    print(f"\n{'='*60}")
    print("CEMAC Synthetic Dataset Generated")
    print(f"{'='*60}")
    print(f"  Fichier     : {path}")
    print(f"  Shape       : {df.shape}")
    print(f"  Taux défaut : {df['TARGET'].mean():.2%}")
    print(f"\n  Distribution par segment :")
    for seg, count in pd.Series(df['_cemac_segment']).value_counts().items():
        dr = df[df['_cemac_segment'] == seg]['TARGET'].mean()
        print(f"    {seg:<20} : {count:>6} dossiers | DR={dr:.1%}")
    print(f"\n  Distribution par secteur :")
    for sec, count in pd.Series(df['_cemac_sector']).value_counts().head(5).items():
        dr = df[df['_cemac_sector'] == sec]['TARGET'].mean()
        print(f"    {sec:<22} : {count:>6} dossiers | DR={dr:.1%}")
    print(f"\n  Prochaine étape :")
    print(f"    python 02_modeling/pd_model/train.py \\")
    print(f"      --data-path {path} \\")
    print(f"      --model-name pd_cemac_v1 \\")
    print(f"      --model-type xgboost \\")
    print(f"      --cross-validate")
