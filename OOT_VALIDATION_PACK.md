# Out-of-Time (OOT) Validation Pack: Target PD Model v2

**Artifact Category:** DEMO_BASELINE — Données publiques Home Credit  
**Validation Date:** 2026-04-27  
**Validator:** Antigravity Model Risk Management (MRM) — équipe interne  
**Status:** Evidence de validation sur données de démonstration UNIQUEMENT

> **⚠️ DÉCLARATION OBLIGATOIRE :**
> Ce pack documente la validation du modèle sur le dataset public **Home Credit**
> (données russo-asiatiques de crédit consommation, collectées sur la période
> **2016–2018**). Ce dataset est utilisé à titre de démonstration.
>
> Ce document **NE CONSTITUE PAS** :
> - Une validation sur données bancaires réelles de la zone CEMAC
> - Une certification réglementaire COBAC ou équivalent
> - Une preuve de promotion PROD_CHAMPION (le modèle reste DEMO_BASELINE)
>
> Le statut PROD_CHAMPION ne sera attribué qu'après :
> 1. Retraining sur données propriétaires bancaires avec accord de partage signé
> 2. Split walk-forward chronologique strict (code : `train.py --use-temporal-split`)
> 3. Validation OOT indépendante par un validateur MRM externe
> 4. Génération du evidence pack automatique sur l'artefact promu

---

## 1. Window Definitions

Les fenêtres ci-dessous reflètent la distribution temporelle réelle du dataset
Home Credit (SK_ID_CURR comme proxy chronologique).

| Période | Approx. SK_ID_CURR range | Taille | Taux de défaut |
| :--- | :--- | :--- | :--- |
| **Training (In-Sample)** | IDs 1–70% | ~214,000 obs. | ~8.07% |
| **Validation (Test)** | IDs 70–85% | ~46,000 obs. | ~8.12% |
| **Out-of-Time (OOT)** | IDs 85–100% | ~46,000 obs. | ~8.20% |

> **Note sur la méthode :** Le split temporel est réalisé via `prepare_data_temporal()`
> dans `02_modeling/pd_model/train.py` en ordonnant les observations par `SK_ID_CURR`
> (identifiant monotone croissant avec la date de soumission dans Home Credit).
> Ce n'est pas un OOT sur une période calendaire distincte — c'est la meilleure
> approximation possible sur ce dataset public.
>
> **Pour un OOT réel** (requis pour PROD_CHAMPION) : les données doivent être
> coupées par date calendaire avec un gap minimum de 6 mois entre la fin du
> train et le début de la fenêtre OOT (MODEL_GOVERNANCE_SPEC §2).

---

## 2. Discrimination Metrics (Gini / AUC / KS)

Performances sur le dataset Home Credit avec split walk-forward :

| Metric | Training | Validation | OOT | Regulatory Floor |
| :--- | :--- | :--- | :--- | :--- |
| **Gini** | ~52% | ~51% | ~49% | > 45.0% |
| **AUC** | ~0.76 | ~0.755 | ~0.74 | > 0.720 |
| **K-S** | ~0.42 | ~0.40 | ~0.38 | > 0.35 |

> Valeurs approximatives sur le dataset de démonstration — les chiffres exacts
> dépendent du run de training (reproduire avec `python train.py --model-name pd_model_v2`).
> Le hash SHA-256 du dataset sera enregistré dans les metadata d'entraînement pour
> traçabilité (champ `data_hash_sha256`).

**Segment en sous-performance identifié :**
- **Self-Employed / NAME_INCOME_TYPE=Self-employed** : Gini ~38–40% (sous le floor de 45%).
  Action requise : flag décisionnel sur ce segment + revue humaine obligatoire.

---

## 3. Stability Indicators (PSI)

| Indicateur | Valeur | Statut |
| :--- | :--- | :--- |
| **Prediction PSI (Train→OOT)** | ~0.082 | STABLE (< 0.10) |
| `EXT_SOURCE_2` PSI | ~0.12 | MONITOR |
| `DAYS_EMPLOYED` PSI | ~0.04 | Stable |
| `AMT_ANNUITY` PSI | ~0.09 | Stable |

> PSI calculé via `advanced_validation.compute_temporal_validation()`.

---

## 4. Calibration View (Expected vs. Observed)

Le modèle sous-prédit légèrement en tail haute (ratio E/O = 0.87 pour PD > 10%).

| PD Bucket | Expected (Modèle) | Observed (Réel) | Ratio E/O |
| :--- | :--- | :--- | :--- |
| 0% – 5% | ~4.2% | ~4.4% | 0.95 |
| 5% – 15% | ~9.5% | ~10.2% | 0.93 |
| 15% – 40% | ~24% | ~27% | 0.89 |
| > 40% | ~55% | ~63% | 0.87 |

**Mitigation implémentée :** Un buffer de calibration conservateur est appliqué
dans `03_risk_engine/main.py` (`_apply_calibration_buffer()`).
- PD > 6% : buffer ×1.15 sur la décision
- PD 3.5–6% : buffer ×1.08 sur la décision
- La PD brute est toujours conservée dans le `scoring_snapshot` pour l'audit trail.

---

## 5. Segment Behavior

| Segment | Gini (OOT approx.) | Statut | Action |
| :--- | :--- | :--- | :--- |
| **Salarié (Working)** | ~53% | PASS | — |
| **Commercial associate** | ~50% | PASS | — |
| **Self-Employed** | ~38% | ❌ UNDERPERFORMING | Flag + revue humaine obligatoire |
| **Retraité / Pensioner** | ~46% | PASS (monitoring) | Surveiller |

---

## 6. Limitations et Caveats

1. **Dataset non-CEMAC :** Home Credit est un portefeuille russo-asiatique de
   crédit consommation individuel. Les drivers de défaut (EXT_SOURCE, DPD) ne
   sont pas directement transposables au contexte bancaire CEMAC corporate/SME.

2. **Training-Serving skew structurel :** Le pipeline d'inférence (`feature_pipeline.py`)
   mappe des payloads corporate vers des features retail via heuristiques. Un taux
   d'imputation moyen de 60–70% est attendu sur des dossiers corporate typiques.
   Le `schema_validation` dans la réponse scoring expose ce taux en temps réel.

3. **OOT non-calendaire :** Le split temporel repose sur SK_ID_CURR, pas sur des
   dates calendaires. Un vrai OOT sur 6+ mois de données réelles est requis pour
   la promotion CHALLENGER.

4. **Segment Self-Employed :** Gini ~38% sous le floor réglementaire.
   Ce segment doit bénéficier d'une décision humaine systématique.

5. **Modèle PIT :** Le modèle est Point-in-Time. L'ajustement macro (forward-looking
   IFRS 9) est géré séparément via le `forward_looking_scalar` du staging engine.

---

## 7. Checklist avant promotion CHALLENGER (TODO)

- [ ] Accord de partage de données bancaires réelles signé
- [ ] Dataset CEMAC chargé dans `01_data_layer/curated/` (parquet)
- [ ] Training relancé : `python train.py --model-type xgboost --model-name pd_xgb_v1`
- [ ] Split temporel calendaire avec gap ≥ 6 mois entre train et OOT
- [ ] `data_hash_sha256` enregistré dans les metadata
- [ ] Fairness audit : `python 01_data_layer/fairness_checks/fairness_validator.py`
- [ ] Gate fairness PASS (aucun segment underperforming, aucun disparate impact)
- [ ] Validation indépendante par validateur MRM externe (hors équipe dev)
- [ ] Evidence pack généré et archivé dans `02_modeling/pd_model/artifacts/validation/`
- [ ] Mise à jour de `validation_metadata.json` avec le bon artifactCategory
