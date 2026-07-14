# 🏦 Octaix Credit Risk Engine

![Version](https://img.shields.io/badge/version-2.1.0-blue)
![Status](https://img.shields.io/badge/status-Production_Ready-success)
![Compliance](https://img.shields.io/badge/compliance-Basel_III_%7C_IFRS_9-purple)

## 📌 Le "Business Case" (Pourquoi Octaix ?)

Dans un environnement bancaire de plus en plus réglementé (Bâle III, IFRS 9), l'octroi de crédit ne peut plus reposer uniquement sur l'intuition humaine ou des feuilles Excel fragiles.

**Octaix Credit Risk Engine** est une plateforme "End-to-End" de gestion du risque de crédit. Elle adresse trois douleurs majeures du marché financier actuel :
1. **Time-to-Yes excessivement long** : Le système utilise le Machine Learning (XGBoost) pour évaluer la Probabilité de Défaut (PD) en moins de 200 millisecondes.
2. **Boîte Noire algorithmique** : Pour répondre aux exigences des régulateurs, le moteur intègre de l'**Explainable AI (SHAP)**. Chaque refus de prêt est mathématiquement justifiable par des facteurs clairs (ex: "Endettement trop élevé : +0.25% PD").
3. **Pénalités Réglementaires** : Le système calcule automatiquement la Perte Attendue comptable (**ECL**) et les exigences en Fonds Propres (**RWA**), automatisant le reporting réglementaire à destination des Banques Centrales.

---

## 🏗️ Architecture Technique (Haut Niveau)

Le projet utilise une architecture de type "Microservices / Monorepo" hyper-convergée :

- **Moteur de Risque (ML)** : `FastAPI` (Python). Exécute l'inférence XGBoost, les calculs IFRS 9 (ECL) et Bâle III (RWA). Sécurisé par du Property-Based Testing.
- **Passerelle & Logique Métier** : `NestJS` (TypeScript). Orchestre les requêtes, gère le Fallback Engine en cas de panne ML (Circuit Breaker), et vérifie la conformité des collatéraux.
- **Interface Utilisateur (UI)** : `Next.js` (React). Un tableau de bord ultra-réactif et sécurisé ("Fail-Safe UX"), stylisé avec un Design System Tailwind sémantique.
- **Gouvernance des Données** : `Supabase` (PostgreSQL). Sécurisé par Row-Level Security (RLS) et des triggers d'audit stricts interdisant la falsification historique (COBAC compliant).

---

## 📖 Démarrage Rapide (Quickstart)

Pour les instructions d'installation locales (Docker, Python, Node.js), veuillez vous référer au fichier **[RUNBOOK.md](./RUNBOOK.md)**.

## 🗂️ Documentation Clé
- **[Dictionnaire de Données (DATA_DICTIONARY.md)](./DATA_DICTIONARY.md)** : Lexique financier (PD, LGD, EAD, etc.) pour aligner le Métier et l'IT.
- **[Roadmap Produit (ROADMAP.md)](./ROADMAP.md)** : Les prochaines grandes étapes de création de valeur (Stress Testing, OpenBanking).
- **[Changelog (CHANGELOG.md)](./CHANGELOG.md)** : Historique d'évolution des modèles ML et des versions majeures.

---
*Octaix — Empowering Financial Institutions with Deterministic & Explainable AI.*
