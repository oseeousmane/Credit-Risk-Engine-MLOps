# État Actuel du Projet : Octaix Credit Risk Engine
**Date de mise à jour : 28 Mai 2026**
**Statut officiel : PILOTE TECHNIQUE — Non Production-Ready**

---

> **DÉCLARATION OBLIGATOIRE**
> Ce document remplace la version précédente qui déclarait le projet "Production-Ready"
> et "120/120 audit". Ces mentions étaient inexactes et ont été supprimées.
> Le projet est un pilote technique avancé avec des lacunes réglementaires documentées
> qui empêchent tout déploiement en production bancaire réelle à ce jour.

---

## 1. Modèle de Crédit — Statut Réel

**Modèle actif : `pd_xgb_v1` (XGBoost + IsotonicCalibration)**

| Dimension | Statut | Détail |
|---|---|---|
| Catégorie artefact | **DEMO_BASELINE** | Entraîné sur Home Credit (données publiques russo-asiatiques, 2016-2018) |
| Gini (test) | 57.4% | Au-dessus du floor réglementaire 45% |
| AUC (test) | 0.787 | Au-dessus du floor 0.72 |
| Calibration | Vérifiée sur test set | Brier = 0.065 |
| Contraintes monotones | 15 features actives | DTI, EXT_SOURCE, DPD — conformes Basel §4 |
| Données CEMAC réelles | **ABSENTES** | Aucun accord de partage de données bancaires signé |
| Validation MRM externe | **ABSENTE** | Auto-validation interne uniquement |
| Promotion PROD_CHAMPION | **NON ATTEINTE** | Voir checklist OOT_VALIDATION_PACK §7 |

**Conséquence directe :** Aucune décision de crédit réelle ne peut s'appuyer sur ce modèle
devant un auditeur COBAC ou un comité des risques bancaire.

---

## 2. Ce qui a été construit (vérifié)

**Architecture et pipeline :**
- API FastAPI (Python) avec XGBoost, SHAP explainability, Prometheus metrics
- Backend NestJS (TypeScript), Prisma ORM, auth JWT + refresh rotation + bcrypt(12)
- Frontend Next.js, multilingue fr/en, 4 personas (Analyst, Manager, CRO, Client Portal)
- Supabase PostgreSQL avec Row Level Security (RLS)
- CI/CD GitHub Actions avec smoke tests, leakage gate, fairness audit automatiques

**Modélisation :**
- Pipeline walk-forward chronologique anti-leakage
- Détection de leakage (corrélation TARGET, temporal proxy, variance nulle)
- Calibration isotonique vérifiée sur jeu de test indépendant
- Fairness audit (CODE_GENDER, AGE_BUCKET, NAME_INCOME_TYPE)
- Domain adaptation infrastructure (two-stage trainer, CEMAC synthetic generator)

**Réglementation :**
- IFRS 9 staging (Stage 1/2/3) avec SICR bi-critère et triggers qualitatifs
- ECL formula correcte (PD × LGD × EAD, actualisé à l'EIR)
- Expected Loss calculator avec floors prudentiels Basel III
- RAROC calculator avec capital IRB

---

## 3. Lacunes documentées (à corriger avant production)

| Lacune | Gravité | Référence |
|---|---|---|
| Données bancaires CEMAC réelles absentes | **CRITIQUE** | OOT_VALIDATION_PACK §7 |
| Pas de validation MRM externe indépendante | **CRITIQUE** | MODEL_GOVERNANCE_SPEC §2 |
| LGD statique (45% uniforme) | HAUTE | Rôle 2 — audit indépendant |
| EIR hardcodé à 8% BEAC pour toutes expositions | HAUTE | ifrs9_staging.py ligne 118 |
| Zero-Touch Auto-Approve désactivée | RÉSOLUE (28/05/2026) | decisioning.service.ts |
| LEGACY_SHA256_BRIDGE encore actif | MOYENNE | auth.service.ts ligne 13 |
| Drift monitoring non automatisé | MOYENNE | Rôle 4 — audit indépendant |
| SAST/CVE scan absent du CI | MOYENNE | ci.yml |
| Audit log IFRS9 en mémoire (non persisté) | MOYENNE | ifrs9_staging.py ligne 295 |
| Stress testing sans matrice de migration | BASSE | TRANSFORMATION_ROADMAP §3 |

---

## 4. Données disponibles

| Dataset | Statut | Usage |
|---|---|---|
| `curated_dataset.parquet` | Home Credit (307K obs, 2016-2018) | DEMO_BASELINE uniquement |
| `cemac_synthetic.parquet` | 50K dossiers synthétiques CEMAC | Bridge — non certifiable COBAC |
| Données bancaires CEMAC réelles | **NON DISPONIBLES** | Accord de partage requis |

---

## 5. Roadmap vers PROD_CHAMPION

1. **Accord de partage de données** avec une institution financière CEMAC (EMF ou banque)
2. **Retraining** sur données réelles — `python train.py --data-path cemac_reel.parquet --model-type xgboost`
3. **Validation OOT calendaire** avec gap ≥ 6 mois train → OOT
4. **Validation MRM externe indépendante** par un cabinet agréé
5. **Approbation Comité des Risques** avec seuils et périmètre documentés
6. **Réactivation Zero-Touch** uniquement après étapes 1-5 complètes (`ZERO_TOUCH_ENABLED=true`)

---

## 6. Architecture technique en place

- **Frontend :** Next.js 16 (React), Tailwind CSS, TypeScript
- **Backend :** NestJS 11 (TypeScript), Prisma ORM, Circuit Breaker actif
- **Risk Engine :** FastAPI (Python), XGBoost `pd_xgb_v1`, SHAP explainability
- **Base de données :** Supabase PostgreSQL + RLS
- **Modèle CEMAC bridge :** `pd_cemac_v1` (XGBoost sur données synthétiques)
