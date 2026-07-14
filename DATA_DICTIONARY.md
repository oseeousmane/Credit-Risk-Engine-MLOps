# Dictionnaire de Données (Data Dictionary)
**Octaix Credit Risk Engine**

Ce dictionnaire est le pont entre l'Ingénierie et le Métier. Il définit le "Langage Ubiquitaire" (Domain-Driven Design) utilisé dans toute la base de code pour garantir qu'aucune ambiguïté financière ne mène à des bugs critiques.

---

## 1. Termes Fondamentaux du Risque de Crédit (Bâle III & IFRS 9)

| Variable | Nom Complet | Explication Métier | Impact Modèle |
| :--- | :--- | :--- | :--- |
| **PD** | Probability of Default | La probabilité mathématique (en %) que la contrepartie fasse défaut sur sa dette dans les 12 prochains mois. C'est le score principal généré par le modèle Machine Learning (XGBoost). | +PD = +Risque |
| **LGD** | Loss Given Default | La fraction de l'exposition (en %) qui sera définitivement perdue si la contrepartie fait défaut (après revente du collatéral). | +LGD = +Perte |
| **EAD** | Exposure At Default | Le montant total en devise auquel la banque est exposée au moment où l'emprunteur fait faillite. | Base de calcul de l'ECL |
| **ECL** | Expected Credit Loss | La Perte Attendue. Formule : `PD * LGD * EAD`. Il s'agit de la provision comptable exacte que la banque doit mettre de côté selon la norme IFRS 9. | Provision comptable |
| **RWA** | Risk-Weighted Assets | Les Actifs Pondérés par le Risque. C'est l'exposition (EAD) multipliée par un "Risk Weight" réglementaire (ex: 75% pour du Retail). Bâle III exige un minimum de 8% de fonds propres (Capital Réglementaire) en face de ces RWA. | Exigence de Fonds Propres |

---

## 2. Données de Profil de Contrepartie (Counterparty)

| Variable | Explication Métier |
| :--- | :--- |
| **Counterparty** | Le terme générique désignant un client (Particulier, Entreprise, ou État) avec qui la banque prend un risque. Remplace le terme flou "User". |
| **Facility Type** | Le type de prêt (Term Loan, Revolving Credit, Mortgage). Détermine la pondération réglementaire. |
| **Watchlist Flag** | Un booléen `True/False`. Si True, la contrepartie est sous surveillance renforcée par le comité des risques (ex: suite à un retard de paiement récent). |
| **Internal Rating** | La note interne de la banque (ex: AAA, BBB+, CCC). |

---

## 3. Données Financières et Comportementales

| Variable | Explication Métier |
| :--- | :--- |
| **DPD** | **Days Past Due**. Nombre de jours de retard de paiement. Un DPD > 90 jours qualifie automatiquement la contrepartie "en défaut" (NPL - Non-Performing Loan). |
| **EBITDA** | *Earnings Before Interest, Taxes, Depreciation, and Amortization*. Indicateur de la rentabilité opérationnelle pure d'une entreprise, avant considérations fiscales et d'amortissement. |
| **DTI / CTI** | **Debt-To-Income** / **Credit-To-Income**. Ratio comparant le poids de la dette (ou de la mensualité) face aux revenus. Un DTI élevé augmente drastiquement la PD. |
| **LTV** | **Loan-To-Value**. Pour les prêts garantis (ex: immobilier), c'est le ratio entre le montant du prêt et la valeur estimée de la garantie. Un LTV > 100% est un prêt sous-collatéralisé. |
| **Missed Payments 24m** | Nombre d'échéances ratées sur les 24 derniers mois. C'est la variable comportementale la plus prédictive du défaut. |

---

## 4. Rôles et Acteurs de la Plateforme

| Rôle Système | Langage Métier | Permissions Types |
| :--- | :--- | :--- |
| `ANALYST` | **Analyste Risque** | Initie les requêtes de scoring, analyse les facteurs SHAP, propose une recommandation. |
| `MANAGER` | **Chef d'Équipe Risque** | Valide les dossiers ambigus (SEND_TO_REVIEW). |
| `CRO` | **Chief Risk Officer** | Seul habilité à outrepasser un "REJECT" de l'algorithme (Decision Override). |
| `CLIENT` | **Emprunteur / Tiers** | A accès à l'espace Client-Portal pour soumettre des documents. N'a **aucun** accès au backend de scoring. |

> *"Any fool can write code that a computer can understand. Good programmers write code that humans can understand." - Martin Fowler*
