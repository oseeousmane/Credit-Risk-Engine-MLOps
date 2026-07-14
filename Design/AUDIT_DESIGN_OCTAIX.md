# AUDIT DESIGN — OCTAIX RISK ENGINE
## Cabinet de conseil design indépendant · Juin 2026

---

## AVERTISSEMENT PRÉLIMINAIRE

Avant d'entrer dans chaque rôle, une anomalie structurelle doit être posée en exergue car elle conditionne l'ensemble de l'audit : la plateforme s'appelle simultanément **Obsidian Flux**, **Alpha Insight**, **Algorithmic Command**, **RiskIntel**, **Capital Markets**, **QUANTEDGE**, **Credit Command**, et **RiskEngine / RiskEngine AI** selon l'écran consulté. Ce n'est pas un système de branding multi-produit cohérent — c'est une fragmentation de prototypes non unifiés présentés comme un produit. Chaque rôle ci-dessous notera les conséquences spécifiques de ce problème, mais il faut comprendre dès l'ouverture qu'aucun CTO de banque, aucun CRO, aucun régulateur COBAC et aucun investisseur sérieux ne confondra cela avec un produit finalisé.

---

## RÔLE 1 — DIRECTEUR ARTISTIQUE

**Mandat :** auditer la cohérence et la maturité de l'identité visuelle.

✅ La palette de base est bien choisie et documentée dans les tokens CSS : navy profond (#070D1B) comme fond primaire, bleu électrique (#3B7BFF) comme accent de marque, avec une hiérarchie sémantique déclinée en emerald/amber/rose/purple. Ce choix crée un espace visuel crédible, distinctif, et lisible.

✅ La typographie Inter + JetBrains Mono est une combinaison professionnelle et techniquement pertinente pour une plateforme de données financières. L'échelle typo est correctement définie avec font-optical-sizing, letter-spacing et font-feature-settings.

⚠️ L'iconographie utilise exclusivement Lucide Icons, une bibliothèque générique open-source. Aucun icon set propriétaire, aucun traitement personnalisé. Pour un produit "bank-grade premium", l'iconographie est indiscernable d'un boilerplate SaaS quelconque.

⚠️ Le ton de voix visuel hésite entre trois registres sans en maîtriser aucun complètement : fintech moderne SaaS (dominant), outils de trading institutionnel, et tableau de bord opérationnel. Le résultat oscille selon les écrans — le Monitoring & Operations ressemble à un outil DevOps, le Counterparty screen ressemble à un Bloomberg allégé, le Client Portal ressemble à un produit d'onboarding B2C.

❌ Le nom de marque est absent, multiple, et contradictoire. "Obsidian Flux" (Admin, Client Portal, Stress Testing), "Alpha Insight" (Portfolio), "Algorithmic Command" (Monitoring), "RiskIntel" (Decisioning), "Capital Markets" (Compliance), "QUANTEDGE" (Counterparty), "Credit Command" (Applications Pipeline), "Enterprise Suite / RiskEngine AI" (tous les écrans admin). Sept noms pour un seul produit est une impossibilité identitaire.

❌ Aucune différenciation Africa-first ou CEMAC-first visible. Le design pourrait sortir d'un boilerplate SaaS américain. Pas de drapeau linguistique FR/EN cohérent (présent uniquement sur le screen Compliance), pas d'évocation visuelle de la zone CFA/XAF, pas de traitement de l'espace francophone.

❌ Le "light mode" implémenté dans le CSS est un `filter: invert(1) hue-rotate(180deg)` sur le body — un hack de développeur, pas un système de couleurs light/dark documenté. En salle de comité, ce mode produira des couleurs sémantiques corrompues, des images mal rendues, et des transitions artificielles.

**Score : 3/10**

**Top 3 priorités :**
1. Choisir un seul nom de produit et l'appliquer à tous les écrans — blocage le plus urgent de tout l'audit.
2. Implémenter un vrai système light/dark avec des tokens de couleur duaux, pas un filtre CSS.
3. Définir 1 à 2 signaux d'identité Africa/CEMAC concrets (langue par défaut FR, XAF comme devise, mention COBAC/OHADA dans le branding institutionnel).

**Verdict :** Une palette solide et une typographie propre, sabotées par une fragmentation de marque qui signerait immédiatement "prototype de démonstration assemblé" aux yeux de n'importe quel décideur bancaire.

---

## RÔLE 2 — DESIGN SYSTEM LEAD

**Mandat :** auditer la maturité du design system sous-jacent.

✅ Les tokens CSS sont bien structurés et documentés : backgrounds en 4 niveaux, borders en 3 niveaux, texte en 4 niveaux avec commentaire de ratio WCAG, accents sémantiques nommés par fonction.

✅ Le système de boutons couvre 4 variantes (primary, secondary, ghost, danger) avec des transitions et des états hover/active cohérents.

✅ Les tokens de radius (6px/10px/14px/18px) créent une progression cohérente visible sur les screenshots.

⚠️ Le spacing suit Tailwind (multiple de 4px) dans les déclarations CSS, mais les screenshots montrent des inconsistances de padding entre écrans. Sans inspection du code React complet, il est difficile de conclure si c'est systémique ou ponctuel.

⚠️ La `card-glow` au hover produit un shadow avec `rgba(62, 207, 142, 0.2)` — une lueur emerald verte — alors que la couleur de marque est le bleu (#3B7BFF). Ce conflit sémantique existe aussi dans `input:focus` qui utilise `rgba(62, 207, 142, 0.08)` : l'anneau de focus est vert alors que tout le design system repose sur le bleu. Deux systèmes de couleur coexistent en silence.

❌ Les états manquants sont critiques : aucun état `disabled` pour les boutons, aucun `loading` state, aucun état `error` pour les champs de formulaire, aucun skeleton loader visible. Pour un produit qui manipule des décisions de crédit, l'absence de feedback d'état est une faute de conception.

❌ Le mode sombre est réel mais le mode clair est un anti-pattern (`filter: invert`). Un design system industriel maintient des tokens séparés par mode.

❌ Aucun breakpoint responsive visible dans globals.css. Le design system est exclusivement desktop.

**Score : 5/10**

**Top 3 priorités :**
1. Corriger le conflit emerald/bleu dans les tokens focus et card-glow.
2. Ajouter les états disabled et loading sur tous les boutons d'action critiques.
3. Implémenter un vrai système de tokens duaux pour le light mode.

**Verdict :** Un fondement de tokens solide qui révèle à l'inspection deux systèmes de couleur en concurrence, des états manquants sur les composants les plus critiques, et un mode clair qui n'existe pas.

---

## RÔLE 3 — UX RESEARCHER

**Mandat :** auditer la stratégie UX et les parcours utilisateurs.

✅ Le parcours Decisioning (RiskIntel) est bien construit : l'analyste voit le résultat du modèle (PD, EL, Scenario Delta), les SHAP drivers, les benchmarks sectoriels, et le circuit de décision avec justification obligatoire.

✅ Le Portfolio Explorer réussit la tâche surveillance : KPIs en en-tête, table triable avec filtres, panneau de détail en slide-right sur sélection.

✅ Le Task Manager montre un suivi de workflow avec priorités, stages, assignees et SLA.

⚠️ La hiérarchie d'information dans le Client Portal est structurellement problématique : l'action la plus urgente ("Upload Q3 Financials — Due in 5 days") est reléguée en colonne droite, en compétition visuelle avec des alertes système.

⚠️ La charge cognitive du Monitoring & Operations screen est excessive : 4 KPI cards + graphique + Drift & Quality + Alert Center + Live Inference Stream + Business Impact — tout cela dans une seule vue sans hiérarchie entre le critique et le contextuel.

❌ Aucun onboarding visible pour aucun persona — ni analyste, ni client emprunteur, ni administrateur.

❌ Aucun empty state visible sur aucun screenshot. Tous les écrans sont affichés avec des données de démonstration, masquant l'expérience réelle du premier connexion.

❌ Aucune confirmation, aucune progression visible pour les actions importantes (Approve, Execute Decision) — qu'est-ce qui se passe après le clic ?

**Score : 4/10**

**Top 3 priorités :**
1. Redéfinir la hiérarchie du Client Portal pour mettre l'action urgente au premier plan absolu.
2. Créer des empty states travaillés pour les 3 vues les plus critiques (Portfolio vide, Pipeline sans applications, Client Portal premier login).
3. Implémenter des confirmations d'action sur toutes les décisions irréversibles.

**Verdict :** Les parcours analytiques internes sont fonctionnels pour des utilisateurs experts, mais l'expérience client et l'onboarding de tout nouveau profil sont inexistants.

---

## RÔLE 4 — UI DESIGNER

**Mandat :** auditer l'exécution visuelle écran par écran.

✅ L'alignement général est solide. Les screens Portfolio, Risk Intelligence, Data Hub et Task Manager utilisent une grille en cards avec des gouttières cohérentes.

✅ La table du Portfolio Explorer est l'un des éléments les mieux exécutés : colonnes bien définies, sparkline de tendance, panneau de détail contextuel à droite sur sélection.

✅ Les visualisations principales (area chart ECL, line chart Risk Trajectory, bar chart Stress Testing) sont bien choisies pour leurs données respectives.

⚠️ La hiérarchie des boutons dans l'écran Decisioning est le point de défaillance UI le plus grave. L'écran affiche simultanément : "Execute Decision" (navbar), "Finalize Decision" (header), "View Row Data", "Approve" (vert), "Approve with Conditions", "Send to Review", "Reject" — sept affordances d'action sans hiérarchie visuelle claire entre irréversible et révisable.

⚠️ Dans les cercles IFRS 9 Stage Allocation (Risk Intelligence), Stage 1 est affiché en orange/amber. Sémantiquement, Stage 1 est la catégorie la plus saine — elle devrait être verte. Utiliser l'amber pour Stage 1 génère une lecture inverse du risque.

❌ L'effet `card-glow:hover` produit une lueur emerald — visuellement attractif mais fonctionnellement trompeur dans un contexte bancaire où le vert signifie "bon/sûr".

❌ Les effets glassmorphism (backdrop-filter: blur) et les gradients animés sur les charts ajoutent un poids visuel décoratif qui n'apporte aucune information. Dans un environnement bancaire à haute densité, chaque pixel de décoration coûte de la lisibilité.

**Score : 6/10**

**Top 3 priorités :**
1. Refaire la hiérarchie de la zone Decision Control — une seule action primaire visible, les autres en secondaire/tertiaire.
2. Corriger la sémantique de couleur des stages IFRS 9 : Stage 1 = vert, Stage 2 = amber, Stage 3 = rouge.
3. Supprimer ou neutraliser la lueur emerald de card-glow — aligner avec le bleu de marque.

**Verdict :** Une exécution visuelle propre et cohérente sur la majorité des écrans, compromise par une hiérarchie de boutons dangereuse sur l'écran décisionnel le plus critique.

---

## RÔLE 5 — LANDING PAGE / GROWTH DESIGNER

**Mandat :** auditer la home page sous l'angle conversion.

**Preuve visuelle absente.** Aucune capture d'écran de la home page publique n'a été fournie dans le dossier Design. Le code source réfère à `app/[lang]/home/page.tsx` mais sans capture visuelle, aucune évaluation ne peut être émise.

Ce manque lui-même est un signal : si la home page n'est pas prête à être montrée dans un audit design, il est probable qu'elle soit dans un état insuffisant pour la cible institutionnelle.

**Score : N/A — preuve visuelle absente.**

**Top 3 priorités (formulées d'après le contexte projet) :**
1. Produire une capture de la home page dans son état actuel avant toute communication externe.
2. Vérifier que le hero encode la promesse "credit risk CEMAC/IFRS 9/COBAC" en moins de 5 secondes.
3. S'assurer que les logos ou noms des banques clientes apparaissent above the fold.

**Verdict :** Preuve visuelle absente — impossibilité de conclure.

---

## RÔLE 6 — UX WRITER / CONTENT DESIGNER

**Mandat :** auditer la qualité éditoriale et l'intelligibilité textuelle.

✅ Sur les écrans analytiques internes, le vocabulaire est généralement adapté : "Probability of Default", "Expected Loss", "XAI Key Risk Drivers", "SHAP Values", "Stage Migration Trajectory".

✅ Le toggle FR/EN est visible sur le Compliance screen — fonctionnalité essentielle pour le marché bilingue Cameroun.

⚠️ "SHAP VALUE" apparaît comme label de colonne dans la table des key risk drivers sans tooltip ni explication. Un analyste crédit classique en zone CEMAC, formé sur des méthodes traditionnelles, n'a pas de référence pour ce terme.

⚠️ Les libellés boutons d'action ne sont pas cohérents en cross-screen : "Execute Decision", "Execute Deal", possible coquille "Execute Tosks" sur le Pipeline screen. Le verbe "Execute" dans le contexte d'une décision de crédit a une connotation de finalité potentiellement anxiogène en français.

❌ Client Portal — Acme Heavy Industries : le dashboard affiche explicitement "Probability of Default (PD) remains low at 0.12%. Covenant compliance verified via automated OCR on last quarterly statement." Ce texte expose du jargon ML (PD) et de la terminologie opérationnelle interne directement à un emprunteur corporate, avec des implications légales potentielles (adverse action disclosure).

❌ La terminologie est incohérente à travers les écrans : "counterparty" (Counterparty screen), "entity" (Portfolio), "client" (Client Portal), "borrower" (contexte métier). Pour un analyste qui navigue entre modules, cette polysémie crée une confusion sur la nature de l'objet traité.

❌ Aucun texte d'aide, aucun tooltip, aucune explication des concepts complexes n'est visible. Dans le Monitoring & Operations, "Drift PSI: 0.15", "CRITICAL FEATURES: income_ratio, formal_score" — ces métriques n'ont pas de contexte pour un utilisateur non-ML.

**Score : 3/10**

**Top 3 priorités :**
1. Retirer immédiatement la mention de PD brute du Client Portal — remplacer par une communication de statut de rating ou de décision.
2. Standardiser le vocabulaire sur un glossaire unique : choisir "contrepartie" (FR) ou "counterparty" (EN) et s'y tenir dans toute l'interface.
3. Ajouter des tooltips contextuels sur tous les termes ML/techniques exposés aux non-spécialistes.

**Verdict :** L'écriture UX interne pour les analystes est acceptable, mais exposer du jargon ML brut aux clients emprunteurs et aux non-spécialistes est une faute éditoriale à risque légal.

---

## RÔLE 7 — DATA VISUALIZATION SPECIALIST

**Mandat :** auditer la qualité des visualisations de données.

✅ La Risk Trajectory dans le Counterparty screen est la visualisation la plus sophistiquée : line chart avec bandes de confiance, annotation de scénario dynamique, progression temporelle Q1 '23 → Current → Proj '24.

✅ Le waterfall horizontal SHAP dans le Decisioning screen est un choix pédagogiquement judicieux : barres vertes pour les facteurs risque-réducteurs, barres rouges pour les facteurs risque-augmenteurs, avec valeurs numériques.

✅ Les axes des graphiques Recharts sont correctement allégés dans le CSS (suppression des axis lines et tick lines) — bon data-ink ratio de base.

✅ Le graphique "Stage Migration Trajectory" dans le Stress Testing screen utilise des barres empilées horizontales pour montrer la migration entre stages sous différents scénarios — choix adapté.

⚠️ L'area chart de Model Performance dans Monitoring n'a aucun label d'axe Y visible, aucune unité, aucune légende. La courbe montre des variations mais sans contexte (accuracy ? AUC ? F1 ?), la visualisation est décorative.

⚠️ Les KPIs principaux (Risk Intelligence : 74.3% Auto-Approval Rate) sont présentés sans benchmark ni comparaison temporelle. Sans contexte réglementaire ou historique, ces chiffres sont vides de sens décisionnel.

❌ Les cercles IFRS 9 Stage Allocation dans Risk Intelligence affichent Stage 1 en orange/amber dominant. Stage 1 = actifs performants = devrait être vert. Un régulateur COBAC lira le portefeuille comme en stress alors que 80% est en Stage 1. Erreur de sémantique de couleur dans une visualisation de conformité réglementaire directe.

❌ Sur le Business Impact panel dans Monitoring, la présentation mélange des métriques de nature différente (pourcentage et valeur absolue) dans un format KPI juxtaposé sans séparation sémantique.

**Score : 5.5/10**

**Top 3 priorités :**
1. Corriger immédiatement les couleurs des cercles IFRS 9 Stage Allocation (Stage 1 vert, Stage 2 amber, Stage 3 rouge).
2. Ajouter des axes labelisés et des unités à tous les graphiques de performance de modèle dans Monitoring.
3. Contextualiser chaque KPI standalone avec une comparaison (vs période précédente, vs seuil réglementaire, vs benchmark sectoriel).

**Verdict :** Quelques visualisations de niveau expert (Risk Trajectory, SHAP waterfall), sabotées par des erreurs de sémantique de couleur sur les métriques IFRS 9 les plus régulièrement auditées.

---

## RÔLE 8 — CLIENT PORTAL UX

**Mandat :** auditer spécifiquement le portail client (emprunteur).

✅ La structure informationnelle du Client Portal couvre les informations fondamentales : rating actuel (AA-), exposition totale ($42.5M), documents récents, alertes système, actions requises.

⚠️ La note AA- avec sous-texte "Stable" est un bon format de communication de rating pour un client corporate.

❌ La sidebar de navigation affiche : Portfolios, Intelligence, Exposure, Risk Modeling, **Admin Panel**, **Audit Logs**. Ces deux derniers items sont des menus d'administrateur interne exposés dans l'interface client. Défaillance de séparation des rôles et potentiellement violation de data governance.

❌ Le texte principal du rating card expose : "Probability of Default (PD) remains low at 0.12%. Covenant compliance verified via automated OCR on last quarterly statement." Un emprunteur corporate lit son propre PD brut. Outre la dimension juridique (adverse action disclosure), cette information est orientée analyste, pas client.

❌ La section "System Alerts" affiche "Covenant Headroom Tightening: Debt-to-EBITDA approaching ICX limit..." — alerte de surveillance interne montrée au client, créant une anxiété injustifiée et révélant la mécanique de surveillance interne de la banque.

❌ Aucune adaptation visible pour un profil microfinance individu. L'écran est 100% corporate, avec des montants en millions de dollars et une terminologie institutionnelle (covenant, OCR). Un emprunteur microfinance est complètement exclu de ce design.

❌ La marque "Obsidian Flux / INSTITUTIONAL CREDIT" n'inspire pas confiance pour un client d'une banque CEMAC. L'interface devrait porter le nom de la banque, pas celui du fournisseur SaaS.

**Score : 2/10**

**Top 3 priorités :**
1. Retirer Admin Panel et Audit Logs de la navigation client — immédiatement, défaillance de sécurité de l'interface.
2. Réécrire entièrement le texte du rating card : supprimer la PD brute, remplacer par une communication orientée décision (statut, prochaine étape, contact conseiller).
3. Concevoir deux versions distinctes du portail : corporate (langue institutionnelle, métriques financières) et microfinance (langue simplifiée, étapes du dossier, montant en XAF).

**Verdict :** Le portail client expose des métriques analytiques internes à l'emprunteur, lui affiche des menus d'administration, et ne différencie pas corporate de microfinance — trois échecs critiques qui invalident l'expérience emprunteur dans son ensemble.

---

## RÔLE 9 — DASHBOARD UX (Analyst / Manager / CRO)

**Mandat :** auditer les dashboards internes.

✅ La vue Portfolio Explorer est bien construite pour le rôle analyste : KPIs au-dessus du fold, table triable avec filtres, panneau de détail contextuel en slide-right.

✅ L'écran Decisioning couvre le workflow d'approbation avec résultat modèle, benchmarks, SHAP drivers, et panneau Decision Control avec justification obligatoire.

✅ La vue Risk Intelligence présente une synthèse CRO correcte : ECL total, taux PD global, taux défaut, taux auto-approbation, insights algorithmiques, allocation IFRS 9.

✅ L'Alert Center segmente les alertes par gravité (Critical 12, Warning 34, Info 89) avec des détails d'incident dans un panneau latéral.

⚠️ La "différenciation par rôle" n'existe pas dans le sens d'un produit unifié avec des vues adaptées — elle existe en tant que produits distincts avec des noms distincts. Un COMEX qui demande "montre-moi le même dossier depuis la vue analyste et la vue manager" ne peut pas le faire sans changer d'application.

⚠️ Le maker-checker est implicitement présent (boutons Approve/Send to Review/Reject, "Committee Review" dans le Pipeline) mais le circuit de validation n'est jamais visualisé explicitement. Qui a déjà vu ce dossier ? Combien de niveaux requis ? Ces informations sont absentes de tous les écrans.

❌ Aucune vue CRO dédiée distincte avec une densité réduite. La Risk Intelligence ressemble à un dashboard analytique condensé, pas à un executive summary. Un CRO a besoin de 3 à 5 métriques clés avec contexte et tendance, pas d'une table à scroller.

**Score : 5/10**

**Top 3 priorités :**
1. Conceptualiser les rôles dans un seul produit unifié avec routing par rôle — pas 7 applications séparées.
2. Ajouter la visualisation explicite du circuit maker-checker sur l'écran Decisioning (timeline "Analyste → Manager → CRO → Décision").
3. Créer une vue CRO distincte à densité réduite : 5 KPIs, 1 graphique, top 10 expositions — pas plus.

**Verdict :** Des dashboards analytiques fonctionnels pour des experts, mais sans différenciation de rôle unifiée, sans visualisation du circuit d'approbation, et sans vue exécutive adaptée au CRO.

---

## RÔLE 10 — ACCESSIBILITY EXPERT (a11y / WCAG)

**Mandat :** auditer l'accessibilité WCAG 2.1 AA.

✅ Les textes primaires (blanc sur fond navy #070D1B) atteignent ~21:1 — bien au-delà du minimum AA.

✅ Les tokens sémantiques de couleur sont couplés avec du texte dans les badges d'alerte (CRITICAL, WARNING, INFO) — l'information n'est pas portée uniquement par la couleur.

⚠️ Le token `--text-muted: #64748B` sur fond `#070D1B` atteint environ 4.2:1 — légèrement en-dessous du minimum 4.5:1 pour le texte normal AA. Les sous-titres, labels secondaires, et légendes de graphiques utilisant cette couleur échouent techniquement à WCAG AA pour le texte normal sous 18px.

❌ Aucun style de focus clavier n'est défini dans globals.css pour les boutons, les liens, les éléments de navigation. Seul `input:focus` est stylé. Un utilisateur naviguant au clavier ne verra aucun indicateur de focus sur les boutons d'action. Sur l'écran Decisioning notamment, l'absence de focus visible est une non-conformité AA majeure.

❌ Aucune règle `@media (prefers-reduced-motion: reduce)` n'est présente dans le CSS global. La plateforme définit 9 animations sans aucune désactivation pour les utilisateurs sensibles aux mouvements. WCAG 2.1 2.3.3 et les recommandations AA pratiques exigent cette prise en compte.

❌ Le mode "clair" via `filter: invert(1) hue-rotate(180deg)` corrompt les couleurs sémantiques — un rouge (#F43F5E) passerait à un cyan, invalidant toute l'information sémantique portée par les couleurs d'alerte. Non-conformité WCAG 1.4.1 (Use of Color) et 1.4.3 (Contrast) dans le mode "présentation".

**Score : 3/10**

**Top 3 priorités :**
1. Ajouter `focus-visible` styles explicites sur tous les éléments interactifs — demi-journée de développement, conformité AA immédiate.
2. Ajouter `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }` dans globals.css.
3. Corriger `--text-muted` à `#718096` minimum pour passer le seuil AA sur les petits textes.

**Verdict :** La conformité WCAG 2.1 AA n'est pas atteinte : focus clavier absent, animations sans réduction, mode clair brisé — trois non-conformités qui élimineraient la plateforme d'un appel d'offres bancaire européen ou d'un audit IT de grande banque.

---

## RÔLE 11 — MOBILE / RESPONSIVE LEAD

**Mandat :** auditer l'adaptation mobile et tablette.

**Preuve visuelle absente pour toutes les vues mobiles.** Aucune capture d'écran mobile ou tablette n'a été fournie. Le code CSS (globals.css) ne contient aucun media query responsive.

❌ La densité informationnelle des dashboards (Monitoring, Portfolio Explorer, Counterparty Profile) est incompatible avec un viewport mobile 375px sans refonte significative de la hiérarchie. La table du Portfolio avec 7 colonnes, le Live Inference Stream à 5 colonnes — aucun de ces layouts n'a de solution de dégradation visible.

❌ Pour le marché cible CEMAC, le portail client mobile est une priorité critique. Les agents de terrain en microfinance utilisent des smartphones Android d'entrée de gamme sur réseau 3G. Un portail client non-mobile est un portail client non-utilisé par ce segment.

❌ L'absence de considérations de lazy loading explicites dans le CSS, combinée à l'utilisation de `backdrop-filter: blur(12px)` sur plusieurs cards, indique un produit non optimisé pour les contraintes réseau des marchés cibles.

**Score : 2/10**

**Top 3 priorités :**
1. Définir impérativement une stratégie mobile-first pour le portail client avant tout autre effort de polish.
2. Implémenter des breakpoints Tailwind sur les tables avec `overflow-x-auto` et des cards empilées en mobile.
3. Supprimer ou conditionner les `backdrop-filter: blur` sur les appareils à faible GPU.

**Verdict :** Aucune preuve d'existence d'une expérience mobile — sur un marché où l'accès terrain et microfinance passe majoritairement par le téléphone, c'est une lacune de stratégie produit, pas seulement de design.

---

## RÔLE 12 — BRAND / MARKETING STRATEGIST

**Mandat :** auditer le positionnement perçu via le design.

⚠️ Le positionnement perçu est "scale-up tech SaaS américain" — pas "plateforme institutionnelle CEMAC". La palette dark navy + bleu électrique, les animations d'entrée fluides, les badges "AI-powered" positionnent le produit dans l'espace Linear/Vercel/Supabase. Pour un CTO de banque CEMAC ayant travaillé avec Bloomberg ou Murex, ce signal esthétique est lisible comme "startup" plutôt que "grade enterprise".

⚠️ Les signaux d'innovation sont présents et réels : XAI intégrée, SHAP explicabilité, drift detection, model registry avec governance. Mais ils sont enfouis dans des menus techniques et ne font pas l'objet d'un storytelling visuel au premier plan.

❌ Zéro signal Africa-first dans le design. Les devises sont affichées en USD. La langue par défaut dans l'Admin est "English (US)". Aucune évocation visuelle de la zone CEMAC, COBAC, XAF, OHADA.

❌ Les noms de marque utilisés dans les démos sont contre-productifs. "Obsidian Flux" évoque un projet de shader graphique ou une crypto. "Algorithmic Command" évoque un bot de trading. Aucun de ces noms ne passe un COMEX d'une banque régionale sans susciter un scepticisme immédiat.

❌ Cohérence avec les communications externes impossible à évaluer — mais la fragmentation des noms dans le produit indique que la cohérence est rompue quelle que soit la communication externe.

**Score : 2.5/10**

**Top 3 priorités :**
1. Choisir un seul nom de produit, en cohérence avec la proposition de valeur CEMAC (éviter les anglicismes opaques pour une cible francophone).
2. Afficher les devises en XAF (Franc CFA) comme défaut primaire dans tous les écrans de démo.
3. Intégrer 1 à 2 références visuelles explicites à la zone CEMAC/COBAC : logo régulateur, mention zone franc, noms de pays exemples dans les données de démo.

**Verdict :** Un produit qui prétend être Africa-first mais dont chaque pixel de la démo signale America-SaaS — le gap entre le pitch et le rendu visuel sera immédiatement perçu par tout CTO ou investisseur connaissant le marché.

---

## RÔLE 13 — REGULATORY / INSTITUTIONAL DESIGN OFFICER

**Mandat :** auditer la crédibilité institutionnelle face à un CTO de banque, un régulateur COBAC, un auditeur Big Four.

✅ La section Compliance & Audit est l'écran le plus institutionnellement crédible : IFRS 9 Compliance Active, COBAC Adherence, Basel III Capital Ratio — trois référentiels réglementaires nommés explicitement avec des logs d'audit systémiques.

✅ Le Model Registry affiche le versioning des modèles, les statuts (Production/Validation/Shadow/Archived), les métriques de performance (AUC, KS), et un workflow "Governance: Model Risk Review". La traçabilité du cycle de vie modèle est un signal fort pour un CTO technique.

✅ La zone "Mandatory Justification" dans Decisioning oblige l'analyste à documenter sa décision — signal de gouvernance et d'auditabilité fort.

⚠️ Le Compliance screen affiche "COBAC Adherence: PENDING — 3 stress tests results pending". Dans un contexte de démo ou de pitch, afficher une non-conformité pending est risqué sans disclaimer visible.

❌ Aucun trust signal de certification externe : pas de mention ISO 27001, pas de SOC 2, pas de RGPD/protection des données, pas de clause de confidentialité. Pour un audit Big Four ou un comité IT de grande banque, c'est un frein à toute discussion de déploiement.

❌ Aucun disclaimer "démonstration / données synthétiques" visible sur les écrans. Les données affichées (noms d'entreprises avec montants précis) créent une ambiguïté sur leur nature avec des implications légales non nulles.

❌ Les noms de produit (Obsidian Flux, Algorithmic Command) sont disqualifiants dans un contexte de présentation à un régulateur ou à un COMEX bancaire. La sobriété institutionnelle est une exigence implicite dans cet espace.

**Score : 3.5/10**

**Top 3 priorités :**
1. Ajouter un bandeau "Démonstration — Données synthétiques" discret mais systématique sur tous les écrans de démo.
2. Ajouter sur la page Compliance (ou footer global) les certifications visées ou obtenues, et la mention de politique de protection des données.
3. Résoudre le "COBAC Pending" avec soit un état complété pour la démo, soit un disclaimer explicite.

**Verdict :** La mécanique réglementaire est présente (IFRS 9, COBAC, Basel III, audit trail), mais l'absence de certifications externes, les noms de produits non-institutionnels, et l'ambiguïté démo/prod empêchent ce design de passer un comité IT bancaire sans questions bloquantes.

---

## RÔLE 14 — INVESTISSEUR / DUE DILIGENCE DESIGN

**Mandat :** auditer le design vu par un investisseur fintech.

✅ Certains écrans individuels sont défendables devant un investisseur sérieux : Counterparty Profile avec Risk Trajectory chart et "Copilot Insight", Decisioning avec SHAP intégré, Model Registry avec governance workflow — ces trois écrans montrent une profondeur de produit au-delà du dashboard analytics générique.

✅ L'intégration de XAI/SHAP, du drift detection, du model governance, et du maker-checker dans une seule plateforme est une proposition de valeur défendable et différenciée par rapport aux solutions disponibles sur le marché africain.

⚠️ La maturité perçue est "fin de beta / early production" — les écrans individuels sont bien finis mais l'ensemble révèle un assemblage de prototypes. Un investisseur expérimenté qui navigue entre plusieurs écrans réalisera en quelques minutes que les noms, les sidebars, et les composants changent.

❌ Red flag numéro un : **sept noms de produit différents.** En due diligence, cela indique soit une équipe sans discipline de branding (signal d'organisation), soit un produit pas encore convergé (signal de maturité), soit un portfolio de projets non liés (signal de focus). Dans tous les cas, conversation difficile lors d'un pitch deck review.

❌ Le light mode CSS `filter: invert` est un signal technique immédiatement lisible pour tout investisseur ayant un CTO en équipe. Cela indique soit un manque de séniorité frontend, soit une dette technique acceptée sans plan de résolution.

❌ L'absence complète d'expérience mobile sur un produit ciblant l'Afrique sera une question directe lors d'un pitch. Si la réponse est "pas encore implémenté", c'est un risque d'exécution sur le TAM le plus accessible.

❌ Les données de démo en USD avec des entreprises aux noms anglais américains sur un produit positionné CEMAC crée une dissonance entre le pitch (Afrique francophone) et l'exécution (template SaaS américain).

**Score : 4/10**

**Top 3 priorités :**
1. Préparer une version de démo "Africa Ready" avant tout prochain pitch : XAF comme devise, noms d'entreprises CEMAC, données de stress en contexte économique de la zone.
2. Résoudre la fragmentation de branding avant toute présentation — premier point de friction en due diligence.
3. Montrer une capture d'écran ou un prototype de l'expérience mobile pour répondre proactivement à la question TAM/distribution.

**Verdict :** La technologie est sérieuse et potentiellement défendable en Series A, mais l'exécution design signale une équipe qui n'a pas encore investi dans la cohérence produit — ce qui bloquera la conversation avant d'arriver à la tech.

---

## SYNTHÈSE FINALE

### A) MATRICE DE SCORES

| Rôle | Score /10 | 3 mots-clés du verdict |
|------|-----------|------------------------|
| 1 — Directeur Artistique | 3/10 | Palette solide, identité fragmentée |
| 2 — Design System Lead | 5/10 | Tokens corrects, états manquants |
| 3 — UX Researcher | 4/10 | Analytique fonctionnel, client absent |
| 4 — UI Designer | 6/10 | Exécution propre, Decisioning dangereux |
| 5 — Landing Page/Growth | N/A | Preuve visuelle absente |
| 6 — UX Writer | 3/10 | PD brute exposée, noms incohérents |
| 7 — Dataviz Specialist | 5.5/10 | SHAP bon, stages sémantiquement inversés |
| 8 — Client Portal UX | 2/10 | Admin visible, PD exposée, microfinance absent |
| 9 — Dashboard UX | 5/10 | Screens solides, rôles non unifiés |
| 10 — Accessibility | 3/10 | Focus absent, animations sans réduction |
| 11 — Mobile/Responsive | 2/10 | Inexistant pour cible terrain |
| 12 — Brand Strategist | 2.5/10 | SaaS américain, zéro CEMAC |
| 13 — Regulatory/Institutional | 3.5/10 | IFRS 9 présent, certifications absentes |
| 14 — Investor Due Diligence | 4/10 | Tech défendable, exécution fragile |
| **Moyenne pondérée** | **3.7/10** | |

---

### B) TOP 10 PROBLÈMES DESIGN (par gravité × impact)

| # | Gravité | Écran | Constat | Mitigation | Effort |
|---|---------|-------|---------|------------|--------|
| 1 | **H** | Tous | 7 noms de produit différents — aucune identité unifiée | Choisir un nom unique, l'appliquer à tous les sidebars/headers | 0.5j |
| 2 | **H** | Client Portal | Admin Panel + Audit Logs visibles dans la nav client — défaillance de séparation de rôles | Routing conditionnel par rôle, supprimer ces items de la nav client | 1j |
| 3 | **H** | Client Portal | PD brute (0.12%) + mention "automated OCR" exposés à l'emprunteur | Réécrire le bloc rating card pour communication client, pas analyste | 0.5j |
| 4 | **H** | Tous | Aucun `prefers-reduced-motion` dans le CSS — 9 animations sans fallback | Ajouter 3 lignes de media query dans globals.css | 0.25j |
| 5 | **H** | Tous | Focus clavier absent sur tous les boutons/liens/nav — non-conformité WCAG AA | Ajouter `focus-visible` styles sur tous les composants interactifs | 1j |
| 6 | **H** | Risk Intelligence | IFRS 9 Stage 1 coloré en orange/amber — sémantique de risque inversée | Corriger : Stage 1 = vert, Stage 2 = amber, Stage 3 = rouge | 0.25j |
| 7 | **M** | Decisioning | 7 boutons d'action actifs simultanément sans hiérarchie — décision irréversible sans signal dominant | Hiérarchie unique : 1 primary (Approve), menu secondaire pour les autres | 1j |
| 8 | **M** | Tous | Light mode via `filter: invert(1) hue-rotate(180deg)` — couleurs sémantiques corrompues | Implémenter des tokens duaux light/dark dans globals.css | 3–5j |
| 9 | **M** | card-glow | Lueur emerald sur hover en conflit avec brand bleu — signal sémantique parasite | Aligner card-glow hover sur `--brand` (#3B7BFF) ou supprimer | 0.25j |
| 10 | **M** | Monitoring | Graphique Model Performance sans labels d'axe ni unité — visualisation décorative | Ajouter Y-axis label (AUC/Score), légende, seuil de performance | 0.5j |

---

### C) "DESIGN-WORTHY OR NOT?"

**CTO banque CEMAC** → Intention positive avec réserves importantes. Les fonctionnalités sont crédibles (IFRS 9, COBAC, XAI, Model Registry), mais la fragmentation de branding et l'absence de certifications déclencheront un questionnaire IT non trivial.

**CRO** → Intention neutre à positive avec réserves. Les dashboards exécutifs sont lisibles mais non différenciés des vues analyste. Un CRO habitué à Bloomberg ou FICO percevra l'interface comme "trop légère" pour une décision de déploiement enterprise.

**Investisseur fintech** → Doute fondamental sur la maturité d'exécution. La technologie est sérieuse, l'exécution signale un assemblage de prototypes. La question "est-ce un produit ou une démo ?" se posera à la 3ème diapo.

**Emprunteur corporate** → Doute fondamental. La PD brute exposée, les menus d'administration visibles, et le nom "Obsidian Flux" créent une expérience qui ne ressemble pas à celle d'une institution financière crédible.

**Régulateur COBAC** → Doute fondamental à rejet. L'absence de disclaimers démo/prod, le "COBAC Pending" non résolu, et l'absence de certifications de sécurité bloqueront tout échange formel.

---

### D) ROADMAP DE REFONTE DESIGN 60 JOURS

#### 0–15 jours — Fondations non négociables
- Choisir et déployer un seul nom de produit sur tous les écrans
- Corriger la séparation de rôles dans la navigation (retirer Admin Panel/Audit Logs du client portal)
- Ajouter `prefers-reduced-motion` et `focus-visible` dans globals.css
- Corriger la sémantique de couleur IFRS 9 Stage 1→vert
- Corriger le conflit emerald/bleu dans card-glow et input:focus
- Ajouter le disclaimer "Démonstration — Données synthétiques" sur tous les écrans

#### 15–30 jours — Portail client et landing page
- Réécrire entièrement le Client Portal : supprimer la PD brute, créer une communication de statut orientée emprunteur
- Concevoir les deux versions corporate et microfinance
- Produire la capture de la home page et auditer sa conversion
- Implémenter XAF comme devise par défaut dans les données de démo
- Substituer les noms d'entreprises par des entités CEMAC fictives crédibles

#### 30–45 jours — Refonte dashboards internes
- Unifier les 7 applications sous un seul produit avec routing par rôle
- Créer une vue CRO distincte à densité réduite (5 KPIs, 1 graphique, top 10 expositions)
- Refaire la hiérarchie de la zone Decision Control (1 bouton primary, les autres en menu)
- Implémenter le vrai dual-token light/dark mode
- Ajouter la visualisation du circuit maker-checker sur le Decisioning screen

#### 45–60 jours — Mobile, polish et tests
- Implémenter les breakpoints responsive Tailwind sur les composants critiques (tables → cards stack, nav → hamburger)
- Prioriser le portail client mobile pour les agents terrain microfinance
- Conduire 3 sessions de test utilisateur (1 analyste crédit, 1 responsable microfinance, 1 emprunteur corporate)
- Ajouter les tooltips sur tous les termes ML exposés aux non-spécialistes
- Préparer le dossier de certifications (ISO 27001, SOC 2 roadmap, mentions RGPD)

---

### E) UNE PHRASE BRUTALE

> En une phrase, ce design est aujourd'hui : **un ensemble de maquettes techniquement impressionnantes et visuellement soignées dans leur isolement, mais qui — présentées comme un produit — révèlent immédiatement à tout professionnel qu'elles ont été construites par module, sans vision de marque unifiée, sans expérience client pensée jusqu'au bout, et sans l'ancrage Africa/CEMAC que la proposition de valeur exige.**

---

*Audit réalisé en juin 2026 — 17 captures d'écran analysées (dashboards internes, portail client, admin) — home page publique non disponible pour évaluation.*
