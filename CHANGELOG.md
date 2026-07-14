# 📜 Changelog (Model & Platform)

Toutes les modifications majeures apportées au moteur de risque ML et à la plateforme seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/), et le projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - (En développement)
### Added
- Moteur de Stress-Test Macro-Économique.
- Alertes de Conformité Avancées (LTV croisé avec ESG).

---

## [v2.1.0] - 2026-05-28
### Added
- **Moteur RWA (Bâle III)** : Intégration de l'Approche Standardisée pour calculer les Actifs Pondérés par le Risque.
- **Fail-Safe UI** : Skeletons animés et bannières `CRITICAL RISK` implémentées dans le frontend NextJS.
- **Property-Based Testing (PBT)** : Preuve mathématique absolue (via `hypothesis`) que les formules ECL ne peuvent jamais dépasser l'EAD ni générer de valeurs négatives.
- **Dictionnaire de Données** : Officialisation du langage ubiquitaire (EAD, LGD, DPD) pour aligner métier et technique.

### Changed
- Refonte de la structure Tailwind CSS pour utiliser des classes sémantiques (suppression des hexadécimaux codés en dur).

---

## [v2.0.0] - 2026-05-27
### Added
- **Moteur ML XGBoost Intégré** : Passage d'un vieux modèle CatBoost expérimental à un pipeline de prédiction robuste XGBoost (API FastAPI).
- **Circuit Breaker** : Pattern disjoncteur ajouté dans `scoring.service.ts` pour router vers le *Fallback Rule Engine* si le modèle ML est hors ligne.
- **Explainable AI (XAI)** : Utilisation de SHAP TreeExplainer pour dériver l'impact précis de chaque variable sur la PD.
- **Sécurité RLS (Supabase)** : Isolation cryptographique des données par tenant via *Row Level Security*.

### Removed
- Ancien code hérité du PoC "Jupyter Notebook only".

---

## [v1.0.0] - 2025-10-15
### Added
- **Version Initiale** : Preuve de concept (PoC) du Credit Risk Engine.
- Interface React basique.
- Moteur de base de données PostgreSQL.
