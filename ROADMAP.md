# 🗺️ Roadmap Produit : Octaix Credit Risk Engine

Ce document liste et priorise les initiatives futures de la plateforme, alignées sur la "Business Value" (ROI, Conformité, UX).

## Q3 2026 : Extension Réglementaire & Sécurité
| Initiative | Description | Valeur Métier (Business Value) | Priorité |
| :--- | :--- | :--- | :--- |
| **Stress Testing Macro-Économique** | Permettre d'appliquer un choc (ex: Hausse des taux +2%) sur tout le portefeuille. | Exigence de la BCE / COBAC pour les banques d'importance systémique. | 🔥 CRITIQUE |
| **Intégration SSO Entreprise (SAML)** | Remplacer l'authentification standard par Azure AD / Okta. | Obligatoire pour le déploiement en grande banque (Sécurité IT). | ⭐ HAUTE |
| **API OpenBanking (PSD2)** | Se connecter aux comptes bancaires externes pour un scoring "en direct". | Baisse de la fraude documentaire et réduction du Time-To-Yes. | ⭐ HAUTE |

## Q4 2026 : IA Générative & Automatisation
| Initiative | Description | Valeur Métier (Business Value) | Priorité |
| :--- | :--- | :--- | :--- |
| **LLM "Rationale" Generator** | Utiliser un LLM privatisé pour traduire les facteurs SHAP en un texte juridique explicatif pour les refus de prêt. | Transparence client (exigence RGPD/IA Act sur l'explicabilité). | ⭐ HAUTE |
| **Auto-Approbation "Zero Touch"** | Circuit de validation où les dossiers PD < 0.5% sont validés et décaissés sans action humaine. | Réduction radicale des coûts d'opération (OPEX) pour le Retail. | ⏳ MOYENNE |
| **Alertes MLOps Prédictives** | Détecter le "Data Drift" avant qu'il n'impacte les modèles de production. | Diminution du Risque Modèle (MRM). | ⏳ MOYENNE |

## Backlog / Étude (2027+)
- Modèles spécifiques pour le marché du Crédit Agricole (Agriculture Scoring).
- Dashboard d'impact Carbone (ESG Risk) pour pondérer l'ECL selon l'empreinte environnementale du client.
