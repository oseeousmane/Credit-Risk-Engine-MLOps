# Frontend Architecture & Design System

*A digital record of the UI/UX architecture established during our sessions.*

## 1. Vision & Identity
- **Objectif** : Transformer un simple outil de scoring bancaire en un produit logiciel premium, empruntant les codes visuels des SaaS de pointe (Scale AI, Vercel, Stripe).
- **Style** : Dark Mode natif hyper-premium, complété d'un Light Mode clair et accessible pour un environnement bancaire IFRS 9 classique.
- **Principe UX** : Hiérarchisation "Bento Box" pour aérer l'information complexe (PD, Expected Loss) et limiter la fatigue visuelle des analystes crédit.

## 2. Design System MLOps
### Couleurs & Variables (`globals.css`)
- **Background Radial** : Utilisation d'un effet `bg-radial-premium` apportant une lueur douce (bleutée) au sommet de l'application, signature visuelle des "AI native apps".
- **Glassmorphism** : Application de classes `.glass-panel` sur les bordures et fonds de cartes `bg-[var(--glass-bg)]` couplés avec des `backdrop-blur` élevés (24px) et une double ombre portée profonde (`--shadow-intense`).
- **Accentuation (Feedback Modèle)** :
  - `Emerald (#10b981)` : Acceptation, signaux positifs (baisse du risque).
  - `Amber (#f59e0b)` : Étude manuelle, stages IFRS9 intermédiaires.
  - `Rose (#f43f5e)` : Rejet, breach MLOps (PSI), hausse du risque de défaut (Features SHAP).

### Typographie (`Inter`)
- Fonts dynamiques et impactantes pour les KPIs financiers majeurs (taille text-6xl, tracking stricts `tracking-tighter`).
- Hiérarchie typographique basée sur la capitalisation (`uppercase`, `tracking-widest`) pour tous les métadonnées (labels, ticks d'axes, statuts réseau).

## 3. Topologie de l'Application (Next.js)

### `app/page.tsx` : Dashboard Risk Manager
- **Layout** : Grille Bento 4 colonnes (Hero Metric "Expected Loss" s'étendant horizontalement, suivi des KPIs mineurs empilés).
- **Charts (Recharts)** : Suppression totale du "Look par défaut" via masquage complet des bordures SVG (`recharts-cartesian-axis-line`), substitution des grids par des tiretés très opacifiés (`stroke-dasharray="4 4"`), et intégration de tooltips sur-mesure floutés. IFRS9 Donut avec ombrage projeté selon la couleur native du segment.

### `app/scoring/page.tsx` : Console de Score
- **Dualité UI** : Un sélecteur dynamique "Business Mode" vs "Expert Mode".
- **Business Mode** : Interface standard, variables simplifiées (Revenus, Âge, Annuities).
- **Expert Mode** : Interface d'ingénieur machine learning. Variables brutes JSON apparentes (`EXT_SOURCE_2`, format brut float/int).
- **XAI Viz** : Utilisation d'un Waterfall chart horizontal pour décoder l'intrication algorithmique (Local SHAP explanations).

### `app/portfolio/page.tsx` : Analyse Massives
- Implémentation d'une Data Table de masse.
- Filtres supérieurs pour catégorisation des profils selon la compliance COBAC / Basel III (Stage 1, 2, 3 et décisions finales).

### `app/monitoring/page.tsx` : Surveillance MLOps
- Suivi du Population Stability Index (PSI) afin de repérer le Data Drift.
- LineChart d'alerte avec une référence "threshold" de rouge (0.20 PSI Breach marking).
- Logs bruts affichés de l'Inférence en direct (Live Ping).

## 4. Internationalisation & Accessibilité
Le système englobe de manière architecturale l'accès au langage naturel FR/EN via le provider custom `I18n Context` afin de répondre d'emblée à un marché CEMAC francophone et une gouvernance anglophone.
