# AUDIT INDÉPENDANT — OCTAIX RISK ENGINE

**Date d'audit :** 28 mai 2026
**Mandataire :** Cabinet d'audit indépendant (simulation)
**Périmètre :** Intégralité du dépôt `oseeousmane/Credit-Risk-Engine-MLOps`
**Contexte cible :** Banque / microfinance / fintech, zone CEMAC (supervision COBAC), alignement Basel III / IFRS 9

---

> **Clause liminaire.** Le projet dispose d'un précédent « AUDIT_REPORT.md » interne daté du 27 avril 2026, signé « Antigravity Senior Audit Team », qui attribue des scores entre 8/10 et 9.5/10. Ce document est un auto-audit par l'équipe de développement elle-même. Le présent rapport le contredit sur de nombreux points. L'auto-évaluation « 85% industrialisé, Pilot Ready » est une surestimation significative de la maturité réelle.

---

# RÔLE 1 — DATA SCIENTIST SENIOR (Credit Risk)

**Mandat :** Auditer la qualité scientifique du travail de modélisation.

**Ce que je cherche :** Cohérence de la cible, honnêteté du split, EDA, choix algorithmique, métriques de discrimination ET calibration, stabilité, reproductibilité.

**Constats :**

✅ VÉRIFIÉ — La definition of default est cohérente : variable TARGET binaire issue du dataset Home Credit, taux de défaut ~8.07% documenté dans le notebook EDA (notebooks_dump.md §4, cell target_counts). Le taux est stable entre les fenêtres train/val/OOT selon OOT_VALIDATION_PACK §1 (8.07% / 8.12% / 8.20%).

✅ VÉRIFIÉ — Le split temporel walk-forward est implémenté dans train.py (méthode `prepare_data_temporal()`, lignes 151-220). Le tri se fait sur SK_ID_CURR comme proxy chronologique. Les trois fenêtres sont Train (IDs 1-70%), Validation (70-85%), Test/OOT (85-100%). C'est la bonne approche pour éviter le leakage temporel.

✅ VÉRIFIÉ — L'EDA dans le notebook 01 est substantielle : analyse univariée, bivariée, ratios bancaires (DTI, CTI, CTA), concentration du risque (courbe de Pareto/Lift), Information Value, analyse des manquants comme signal, colinéarité, segmentation croisée. Le notebook 02 couvre Data Quality avec un « Single-Split Tree Test » pour détecter le leakage non-linéaire (notebooks_dump.md §10.1).

✅ VÉRIFIÉ — La calibration isotonique est implémentée (train.py lignes 330-360) avec un critère de décision clair : la calibration n'est retenue que si le Brier s'améliore sans chute d'AUC >2pp. Le modèle final est un `CalibratedClassifierCV(FrozenEstimator(base_model), method='isotonic', cv=5)`.

⚠️ DÉCLARATIF — Les métriques OOT annoncées (Gini ~49%, AUC ~0.74, KS ~0.38) dans OOT_VALIDATION_PACK §2 portent la mention « valeurs approximatives ». Les metadata réelles du modèle (pd_model_v2_metadata.json) montrent un val_auc de 0.747132, cohérent. Mais les métriques OOT exactes ne sont pas enregistrées dans les metadata — elles sont seulement « approximées » dans la documentation. Preuve d'exécution OOT absente dans les artifacts.

⚠️ DÉCLARATIF — Le notebook 04 (PD Model Validation) existe (582 Ko) mais son contenu n'a pas été audité cellule par cellule. Les résultats de validation sont reportés dans la doc mais le lien artefact → notebook → métriques exactes n'est pas traçable automatiquement.

❌ GAP — **best_iteration = 3** dans pd_model_v2_metadata.json. Ceci est un signal d'alarme majeur : le modèle LightGBM avec 2000 estimateurs demandés s'est arrêté à la 3ème itération via early stopping. Cela signifie soit (a) que le modèle n'apprend quasiment rien au-delà du bruit, soit (b) que le learning_rate (0.02) combiné à `scale_pos_weight=11.3` provoque un overshoot immédiat. Un modèle qui converge en 3 boosting rounds sur 2000 prévus est suspecté de sous-apprentissage sévère ou de problème de configuration d'early stopping.

❌ GAP — Aucun test de monotonicité vérifié sur le modèle actuel (LightGBM). La doc (MODEL_GOVERNANCE_SPEC §4) exige des monotone_constraints, mais celles-ci ne sont définies que pour le trainer XGBoost (MONOTONE_CONSTRAINTS dans train.py lignes 90-109). Le modèle LightGBM déployé (`pd_model_v2.pkl`) n'a AUCUNE contrainte de monotonicité active.

❌ GAP — Pas de test de fairness exécuté et documenté avec résultats. Le fichier `fairness_validator.py` existe (21 Ko) mais aucun rapport de fairness n'est présent dans les artifacts. Le notebook 02 mentionne un « audit exploratoire préliminaire » qui observe un écart de défaut 10.1% vs 7.0% par genre, sans résolution.

❌ GAP — Pas de comparaison formelle avec des alternatives (Logistic Regression baseline, Random Forest). Le choix LightGBM est justifié par la robustesse aux outliers (notebook EDA §6) mais aucun benchmark comparatif n'est tracé.

❌ GAP — Le segment Self-Employed a un Gini de ~38%, sous le floor réglementaire de 45% (OOT_VALIDATION_PACK §5). C'est documenté honnêtement, mais aucune mitigation codée — le modèle score quand même ces dossiers sans flag automatique dans le code du scoring engine (main.py ne filtre pas sur NAME_INCOME_TYPE).

**Score : 4.5/10**

Le travail de recherche (EDA, notebooks) est sérieux et bien structuré. Mais le modèle déployé a un best_iteration de 3, pas de monotonicité, pas de fairness audit exécuté, des métriques OOT approximatives, et un segment entier sous le floor. C'est un modèle de démonstration, pas un modèle de production.

**Top 3 priorités :**
1. Investiguer et résoudre le best_iteration=3 (signal de dysfonctionnement du training pipeline)
2. Exécuter le fairness_validator.py et documenter les résultats
3. Produire un artefact XGBoost avec contraintes de monotonicité vérifiées et métriques OOT exactes enregistrées dans les metadata

**Verdict :** Le socle analytique est solide (notebooks) mais le modèle déployé est un artefact sous-entraîné sans les garde-fous réglementaires essentiels.

---

# RÔLE 2 — QUANT / MODEL RISK ANALYST (Bâle III / IFRS 9)

**Mandat :** Auditer la pertinence réglementaire et quantitative.

**Constats :**

✅ VÉRIFIÉ — L'architecture PD/LGD/EAD existe structurellement. Le calcul EL = PD × LGD × EAD est correctement implémenté dans expected_loss.py (ligne 182) avec des floors réglementaires : PD floor = 3 bps (ligne 80), LGD floor secured = 10%, unsecured = 25% (lignes 81-82). Conforme Basel III Foundation IRB.

✅ VÉRIFIÉ — Le calcul du capital économique IRB dans raroc.py (lignes 122-151) implémente correctement la formule de Vasicek/Gordy : corrélation d'actif R, ajustement maturité b, et K = LGD × [Φ(...) - PD]. La scipy.stats.norm est utilisée correctement.

✅ VÉRIFIÉ — L'IFRS 9 staging engine (ifrs9_staging.py) implémente les 3 stades avec des critères conformes : SICR par variation relative PD (doublement = 2x, ligne 106), SICR par variation absolue (>3pp, ligne 107), DPD 30 jours → Stage 2 (ligne 108), DPD 90 jours → Stage 3 (ligne 109). Les critères qualitatifs (restructuration, watchlist) sont pris en compte.

✅ VÉRIFIÉ — Le calcul ECL lifetime dans ifrs9_staging.py (lignes 310-360) actualise correctement à la valeur présente avec un EIR (proxy BEAC 8%), et utilise PD lifetime = 1 - (1-PD)^T pour la PD cumulée. L'approximation mid-maturity est documentée.

✅ VÉRIFIÉ — Le forward-looking est paramétré dans thresholds.yaml (lignes 44-57) avec 3 scénarios : base (55%, scalar 1.0), adverse (30%, scalar 1.3), severe (15%, scalar 1.8). C'est un schéma standard.

⚠️ DÉCLARATIF — Les contraintes de monotonicité sont DÉFINIES dans le code (train.py lignes 90-109 : DTI +1, EXT_SOURCE -1, etc.) mais elles ne sont PAS ACTIVES sur le modèle déployé qui est LightGBM sans contraintes. La monotonicité est un objectif, pas une réalité.

⚠️ DÉCLARATIF — Le LGD est statique. Le TRANSFORMATION_ROADMAP §3 (Workstream 2) reconnaît : « Move from static RiskMathService tables to segmented, recovery-based logic ». Le LGD actuel est un paramètre passé en input (default_lgd=0.45 dans expected_loss.py), pas un modèle. C'est acceptable en Standardized Approach mais insuffisant pour Foundation IRB.

⚠️ DÉCLARATIF — Le EAD model (02_modeling/ead_model/) existe avec un CCF-adjusted EAD = Drawn + CCF × Undrawn (feature_pipeline.py ligne 274-296), mais le fallback est CCF=1.0 (term loan). Les product types pris en charge ne sont pas documentés dans un contrat.

❌ GAP — **Pas de PIT vs TTC.** Le modèle est Point-in-Time (OOT_VALIDATION_PACK §6 caveat 5), mais il n'y a pas de modèle TTC pour comparaison, pas de matrice de migration, et pas de conversion PIT→TTC documentée. Pour Basel III, la distinction est fondamentale.

❌ GAP — **Pas de stress testing réel.** Le forward_looking_scalar dans thresholds.yaml est un multiplicateur simple. Le TRANSFORMATION_ROADMAP reconnaît : « Replace multipliers with a Migration Matrix approach ». Pas de matrice de transition, pas de VAR macro, pas de scénarios ICAAP.

❌ GAP — **Le contrat de 157 features repose sur Home Credit.** Les features sont calibrées sur un dataset retail russo-asiatique 2016-2018 (FEATURE_CONTRACT.json §contract_meta). La transposition au contexte corporate/SME CEMAC est faite par « domain heuristics » dans feature_pipeline.py (lignes 152-173 : _SECTOR_EXT_SOURCE_MAP, _RATING_EXT_SOURCE_MAP). Ceci est un mapping arbitraire, pas un modèle calibré. Un taux d'imputation de 60-70% est attendu sur des dossiers corporate typiques (OOT_VALIDATION_PACK §6 caveat 2).

❌ GAP — Le backstop PD Stage 3 à 20% (ifrs9_staging.py ligne 114) est conservateur mais non calibré sur des données réelles CEMAC. Le commentaire du code reconnaît : « L'ancienne valeur 0.999 rendait ce critère inopérant ». Cela signifie que le seuil a été corrigé tardivement, sans backtesting.

**Score : 4/10**

La structure réglementaire (EL, RAROC, IFRS 9 staging, IRB capital) est correctement codée d'un point de vue mathématique. Mais sans modèle LGD, sans PIT/TTC, sans matrice de migration, sans monotonicité active, et avec un feature contract construit sur des heuristiques de mapping, la couche quantitative est une coquille institutionnelle — la forme est là, le fond manque.

**Top 3 priorités :**
1. Activer les contraintes de monotonicité sur le modèle effectivement déployé
2. Développer un modèle LGD segmenté (au moins par collateral type et seniority)
3. Implémenter une matrice de migration PD pour le stress testing et les transitions IFRS 9

**Verdict :** Architecture réglementaire impressionnante sur le papier, mais remplie de proxies et de valeurs statiques — inutilisable pour une soumission COBAC en l'état.

---

# RÔLE 3 — ML ENGINEER (Production ML)

**Mandat :** Auditer la robustesse du pipeline ML en production.

**Constats :**

✅ VÉRIFIÉ — L'intégrité de l'artefact est vérifiée au startup. main.py (lignes 61-104) calcule le SHA-256 du fichier .pkl et le compare au hash stocké dans les metadata. En cas de mismatch, le modèle n'est pas chargé et le service passe en mode fallback. C'est un bon contrôle.

✅ VÉRIFIÉ — Le fallback rule engine est explicite et auditable (main.py lignes 231-237). Quand le modèle ML n'est pas disponible, un moteur de règles simple prend le relais avec une confidence plafonnée à 0.55 et le scoring est marqué `PYTHON_FALLBACK` / `RULE_ENGINE`.

✅ VÉRIFIÉ — Les endpoints de santé sont bien séparés : `/health` (liveness, toujours 200), `/ready` (readiness, 503 si modèle non chargé), `/metrics` (compteurs opérationnels). C'est conforme aux patterns Kubernetes. main.py lignes 409-462.

✅ VÉRIFIÉ — Le feature pipeline (feature_pipeline.py) trace explicitement le lineage de chaque feature (RAW/DERIVED/IMPUTED) et expose cette information dans la réponse scoring. La validation pré-inférence (lignes 178-249) vérifie les plages, les ratios non négatifs, et signale les champs critiques imputés.

✅ VÉRIFIÉ — Les compteurs opérationnels (`_inference_count`, `_fallback_count`, `_error_count`) sont des compteurs in-process réels, pas des données simulées (main.py lignes 43-45). Le `/metrics` expose le fallback_rate et l'error_rate calculés.

⚠️ DÉCLARATIF — La sérialisation est en pickle (.pkl) pour le modèle actuel. MODEL_GOVERNANCE_SPEC §1 cible le format XGBoost JSON pour « language-agnostic ingestion ». Le pickle est notoirement fragile aux changements de version Python/sklearn/lightgbm. Le XGBoost JSON n'est implémenté que dans le trainer PDXGBTrainer (train.py lignes 638-670), jamais utilisé en production.

❌ GAP — **Training-serving skew structurel et reconnu.** Le modèle est entraîné sur des features retail Home Credit. L'inférence reçoit des payloads corporate mappés via des heuristiques (feature_pipeline.py). OOT_VALIDATION_PACK §6 caveat 2 admet « un taux d'imputation moyen de 60-70% ». Un modèle qui impute 60-70% de ses features à l'inférence ne fait pas de ML — il fait de l'imputation avec un vernis de prédiction.

❌ GAP — **Pas de lock file Python.** Le fichier requirements.txt (1097 bytes) à la racine liste des dépendances sans pinning strict (pas de `==` visible dans les fichiers examinés). Pas de poetry.lock, pas de pip freeze, pas de Pipfile.lock. La reproductibilité d'environnement n'est pas garantie.

❌ GAP — **Pas de tests d'intégration ML.** test_scoring.py (239 lignes) teste le fallback, les buffers de calibration, et la policy de décision — mais AUCUN test ne charge le modèle réel et vérifie que l'inférence produit un score cohérent sur un payload de référence. Le modèle est mocké à None dans les tests.

❌ GAP — **Latence non mesurée ni contrainte.** Aucun benchmark de latence P50/P95/P99. Pas de timeout configuré sur l'endpoint `/score`. Le SHAP TreeExplainer est appelé à chaque inférence (main.py ligne 208), ce qui peut être coûteux (>100ms pour 157 features).

❌ GAP — **Gestion des catégorielles fragile.** main.py lignes 201-204 re-cast les colonnes catégorielles en `category` dtype pour LightGBM. Si les catégories observées en inférence diffèrent de celles du training (ce qui est garanti puisque les payloads sont corporate et non retail), le comportement est indéfini.

**Score : 4/10**

Les patterns de résilience (fallback, health probes, SHA-256 integrity) sont bien pensés. Mais le training-serving skew est fondamental et structurel — le modèle ne voit JAMAIS en production les données sur lesquelles il a été entraîné. L'absence de tests d'intégration ML réels et de lock file sont des manquements basiques.

**Top 3 priorités :**
1. Écrire un test d'intégration qui charge le .pkl réel et vérifie la cohérence du score sur un golden payload
2. Créer un lock file (pip freeze ou poetry.lock) et scanner les CVE
3. Mesurer et contraindre la latence P95 du endpoint `/score`

**Verdict :** Infrastructure de serving correcte, mais le training-serving skew rend l'inférence ML largement fictive — le modèle score des données qu'il n'a jamais vues pendant l'entraînement.

---

# RÔLE 4 — MLOps LEAD (Industrialisation)

**Mandat :** Auditer la maturité du cycle de vie modèle.

**Constats :**

✅ VÉRIFIÉ — Le model registry conceptuel est défini : DEV_ALPHA → CANDIDATE → CHALLENGER → PROD_CHAMPION (MODEL_GOVERNANCE_SPEC §2). Le code model_inventory.py implémente un registre JSON avec change_log, validation_history, et risk tiers.

✅ VÉRIFIÉ — MLflow est intégré au pipeline de training (train.py lignes 789-800+) avec logging de params, metrics, et artifacts. Un fichier mlflow.db (712 Ko) et un répertoire mlruns/ existent dans 02_modeling/pd_model/.

✅ VÉRIFIÉ — Le data hash SHA-256 est calculé et enregistré dans les metadata (train.py lignes 112-119, metadata ligne 54 : `data_hash_sha256: "8208d91e6130f934"`). C'est un bon mécanisme de reproductibilité data→artefact.

⚠️ DÉCLARATIF — La promotion CANDIDATE → CHALLENGER est documentée comme nécessitant une « validation OOT » (MODEL_GOVERNANCE_SPEC §2), mais la machine à états n'est PAS implémentée dans le code. model_inventory.py a une méthode `update_status()` qui accepte n'importe quelle string, sans validation de transition.

⚠️ DÉCLARATIF — Le champion/challenger est mentionné dans le fichier 04_model_risk_management/champion_challenger.py (9200 bytes) mais c'est un module autonome, pas intégré au pipeline de scoring. Le `/score` endpoint de main.py ne fait AUCUNE distinction champion/challenger.

❌ GAP — **Pas de CI/CD ML.** Aucun fichier .github/workflows/ visible pour l'automatisation du retrain, de la validation, ou de la promotion. Le répertoire .github/ existe mais n'a pas été exploré en détail — aucune evidence de pipeline.

❌ GAP — **Pas de monitoring drift en production.** Le drift_detector.py (06_monitoring/) est un module Python standalone qui compare des arrays numpy. Il n'est PAS intégré au pipeline de scoring ni au backend NestJS. Le RUNBOOK §4 mentionne un « hourly cron » pour le PSI, mais c'est côté NestJS (monitoring.service.ts) avec des données potentiellement simulées.

❌ GAP — **Pas d'evidence pack automatique.** Le TRANSFORMATION_ROADMAP (Workstream 4) mentionne « Automated generation of Validation Reports whenever a model is promoted ». La checklist OOT_VALIDATION_PACK §7 est entièrement en `[ ]` (non cochée). Aucune automatisation implémentée.

❌ GAP — **Pas de rollback testé.** Le RUNBOOK §5 décrit un rollback par SQL direct (`UPDATE "ModelVersion" SET status = 'DEPRECATED'`). Ce n'est pas un rollback d'artefact ML — c'est un changement de flag en base. Le modèle précédent n'est pas conservé ni versionné dans un registry d'artefacts.

❌ GAP — **Retraining trigger inexistant.** Le RUNBOOK mentionne `POST /scoring/retrain` mais cette route n'existe pas dans le code de main.py ni dans les fichiers API examinés. Preuve absente.

**Score : 2.5/10**

Le vocabulaire MLOps est maîtrisé (registry, promotion gates, champion/challenger, evidence packs). Mais l'implémentation se résume à un model_inventory.py basé sur un fichier JSON et un MLflow local. Aucune automatisation réelle, aucun gate de promotion codé, aucun monitoring runtime, aucun rollback testé.

**Top 3 priorités :**
1. Implémenter la machine à états de promotion avec gates automatiques (AUC > threshold, PSI < threshold)
2. Créer un pipeline CI/CD qui exécute le retrain + validation + packaging sur trigger
3. Intégrer le drift_detector.py au runtime NestJS avec persistance des métriques

**Verdict :** MLOps de présentation, pas d'industrialisation — les briques existent en isolation mais rien ne s'assemble en un cycle de vie opérationnel.

---

# RÔLE 5 — DATA ENGINEER (Data Platform)

**Mandat :** Auditer la fiabilité de la couche données.

**Constats :**

✅ VÉRIFIÉ — Le data_ingestion.py (01_data_layer/, 10911 bytes) et abt_builder.py (21379 bytes) existent et structurent la chaîne raw → cleaned → curated. Un fichier curated_dataset.parquet est référencé dans les metadata de training.

✅ VÉRIFIÉ — Le feature_store/ et data_quality_checks/ existent avec du code réel (data_quality.py 11134 bytes, dq_report.json 9294 bytes). Le rapport DQ est un JSON structuré.

✅ VÉRIFIÉ — La documentation du lineage est explicite dans le feature contract (FEATURE_CONTRACT.json §entity_mappings) : chaque feature est mappée à une source (Core Banking System, Octaix Origination Layer, External Credit Bureau).

⚠️ DÉCLARATIF — Le FEATURE_CONTRACT.json mentionne des sources « Core Banking System (CBS) / CRM » et « External Credit Bureau (API) » mais ces connecteurs N'EXISTENT PAS dans le code. Le seul connecteur réel est `mock_home_credit.py` (01_data_layer/, 3934 bytes) — un mock. Le TRANSFORMATION_ROADMAP Workstream 3 reconnaît : « Design the Bank Source Connector architecture. »

❌ GAP — **Aucun connecteur Core Banking réel.** Toute la donnée provient du dataset public Home Credit chargé via CSV/Parquet. La donnée bancaire CEMAC n'existe pas dans le pipeline.

❌ GAP — **Pas de Great Expectations ni d'outil de DQ automatisé.** data_quality.py est un script custom. Pas de contrats de données validés automatiquement à l'ingestion. Pas d'alertes sur violations de schéma.

❌ GAP — **Pas de point-in-time reconstruction.** L'ABT n'est pas reconstructible à une date donnée. Le split temporel utilise SK_ID_CURR comme proxy mais le dataset n'a pas de dates réelles (OOT_VALIDATION_PACK §6 caveat 3).

❌ GAP — **Gestion des PII inexistante.** Le notebook 02 identifie CODE_GENDER et DAYS_BIRTH comme « Haute sensibilité, soumis RGPD ». Mais aucune pseudonymisation, aucun chiffrement at-rest, aucune politique de rétention n'est implémentée. Pas de conformité GDPR/loi CEMAC.

❌ GAP — **Pas de versionnage de schéma data.** Les migrations schema sont gérées par Prisma côté backend (supabase), mais la couche data Python (parquet/CSV) n'a aucun versionnage.

**Score : 2/10**

La structure de répertoires est propre (raw/cleaned/curated), les concepts sont posés (lineage, feature store, DQ). Mais tout repose sur un dataset public statique. Aucune connexion à une source bancaire réelle, aucune automatisation de qualité, aucune gestion des PII.

**Top 3 priorités :**
1. Concevoir et implémenter un connecteur CBS même minimaliste (API ou batch)
2. Implémenter des contrôles DQ automatisés à l'ingestion (Great Expectations ou équivalent)
3. Pseudonymiser les PII et définir une politique de rétention conforme

**Verdict :** Couche données factice — structurée pour l'apparence mais alimentée uniquement par un dataset public, sans aucune connexion au monde bancaire réel.

---

# RÔLE 6 — SOFTWARE ARCHITECT (Backend / Frontend)

**Mandat :** Auditer la solidité architecturale de la plateforme.

**Constats :**

✅ VÉRIFIÉ — L'architecture tri-couche est réelle : Next.js 16 (frontend, port 3000), NestJS 11 (backend, port 3001), FastAPI (scoring, port 8000). Le découplage est effectif — le backend appelle le scoring via HTTP avec un API key (main.py lignes 30-40, .env SCORING_SERVICE_URL).

✅ VÉRIFIÉ — Le backend NestJS est structuré en modules fonctionnels (22 sous-répertoires dans src/ : auth, audit, scoring, monitoring, pipeline, model-registry, decisioning, compliance, risk-math, stress-testing, etc.). C'est une architecture modulaire propre.

✅ VÉRIFIÉ — main.ts implémente les bonnes pratiques : Helmet (headers sécu), CORS restreint, ValidationPipe (whitelist + forbidNonWhitelisted), GlobalPrefix api/v1, Swagger conditionnel (désactivé en prod), shutdown hooks. Lignes 1-111.

✅ VÉRIFIÉ — Des tests E2E existent : app.e2e-spec.ts (12332 bytes), workflow.e2e-spec.ts (5998 bytes), stress.e2e-spec.ts (1729 bytes). Un répertoire coverage/ existe.

⚠️ DÉCLARATIF — Le Prisma schema utilise `db push` en dev avec l'avertissement explicite « do NOT add --accept-data-loss » (CURRENT_STATE.md ligne 46, RUNBOOK §7). C'est bien documenté, mais `db push` sans migrations versionnées reste risqué. Le RUNBOOK §7 mentionne `prisma migrate deploy` pour la production, mais preuve absente que des migrations existent.

⚠️ DÉCLARATIF — Le maker-checker circuit est mentionné dans la documentation mais l'implémentation dans le code de decisioning/ n'a pas été auditée en profondeur. Le decision_engine.py Python implémente un override system avec approver (lignes 311-332), mais le flux NestJS complet (approbation multi-niveaux) est incertain.

❌ GAP — **Pas de queue ni de processing asynchrone.** Le scoring est synchrone HTTP. Pas de Redis, RabbitMQ, ou Bull queue visible. Pour du batch scoring ou du retraining, c'est bloquant.

❌ GAP — **WebSockets mentionnés** (CURRENT_STATE.md : « NestJS 11 with SWC and WebSockets ») mais preuve d'usage absente dans les modules examinés.

❌ GAP — **Tests de coverage inconnue.** Le répertoire coverage/ existe mais son contenu n'a pas été vérifié. Le nombre de tests unitaires pour 22 modules NestJS est probablement insuffisant — seuls auth.service.spec.ts et roles.guard.spec.ts sont visibles dans auth/.

❌ GAP — **Multiples fichiers de test DB parasites.** Le répertoire 10_backend_nestjs/ contient test-conn.js, test-db.mjs, test-db.ts, test-db2.ts, test-db3.ts, test-db4.ts, test-net.js, test-pg.js, test-pg2.js, test-pg3.js, test-pg-6543.js, test-pg-loop.js, test-prisma.ts — 12 scripts de debugging qui polluent la racine. Signal de dette technique et de problèmes de connexion DB récurrents.

**Score : 5.5/10**

L'architecture NestJS est bien structurée et les conventions sont solides (modules, guards, interceptors, Swagger). Mais l'absence de processing asynchrone, la dette technique visible (12 scripts de test DB), et les migrations Prisma non versionnées pèsent.

**Top 3 priorités :**
1. Nettoyer les 12 fichiers test-*.js/ts parasites de la racine backend
2. Implémenter des migrations Prisma versionnées au lieu de db push
3. Ajouter une queue (Bull/Redis) pour le scoring batch et les tâches longues

**Verdict :** Architecture applicative correcte pour un MVP, mais les signaux de dette technique et l'absence de traitement asynchrone la disqualifient pour une opération bancaire sérieuse.

---

# RÔLE 7 — SECURITY ENGINEER / DevSecOps

**Mandat :** Auditer la posture sécurité.

**Constats :**

✅ VÉRIFIÉ — L'authentification utilise bcrypt avec 12 rounds (auth.service.ts lignes 76, 271). Le SHA-256 legacy est en migration automatique (bridge, lignes 62-98) avec audit trail de la migration. Le timing-safe comparison est utilisé (crypto.timingSafeEqual, ligne 70).

✅ VÉRIFIÉ — Account lockout implémenté : 5 tentatives max, lockout 15 minutes, avec audit trail (auth.service.ts lignes 18-20, 326-346).

✅ VÉRIFIÉ — Refresh token rotation avec détection de réutilisation (auth.service.ts lignes 154-191). En cas de token reuse, la session est terminée entièrement.

✅ VÉRIFIÉ — RBAC implémenté avec décorateur @Roles et guard (roles.decorator.ts, roles.guard.ts, roles.guard.spec.ts). Les rôles Prisma (ANALYST, MANAGER, CRO, CLIENT) correspondent aux 4 personas.

✅ VÉRIFIÉ — Headers de sécurité via Helmet (main.ts ligne 35-38) : CSP, HSTS conditionnel, X-Content-Type-Options nosniff, X-Frame-Options DENY (DEPLOYMENT_PROFILES §5).

✅ VÉRIFIÉ — L'API scoring Python requiert un API key (X-Api-Key header) avec secrets.compare_digest pour timing-safe comparison (main.py lignes 35-40).

❌ GAP CRITIQUE — **Secrets en clair dans .env commité dans Git.** Le fichier 10_backend_nestjs/.env contient :
- DATABASE_URL avec mot de passe en clair : `RiskEngine%402026`
- JWT_SECRET en clair : `octaix-risk-engine-institutional-secret-2026-secure`
- SESSION_SECRET et REFRESH_SECRET en clair
- Ce fichier est dans le dépôt Git. C'est une fuite de secrets de production.

❌ GAP CRITIQUE — **JWT_SECRET faible.** La valeur `octaix-risk-engine-institutional-secret-2026-secure` est un mot lisible, pas un secret haute entropie. Le RUNBOOK §7 recommande `openssl rand -hex 64` mais cette recommandation n'est pas appliquée dans le .env commité.

❌ GAP — **Demo credentials universels.** Un mot de passe unique `Demo@2026!` pour tous les rôles (CURRENT_STATE.md lignes 21). Pas de rotation, pas de complexité suffisante pour un environnement exposé.

❌ GAP — **Pas de CSRF protection explicite.** express-session est configuré (main.ts lignes 21-27) mais sans csurf ni double-submit cookie. Pour une app bancaire, c'est un manquement.

❌ GAP — **SCORING_API_KEY optionnelle.** Si l'env var n'est pas set, le endpoint `/score` est ouvert sans authentification (main.py lignes 36-38 : « dev/open mode with a warning »). Pas de fail-closed.

❌ GAP — **Aucune preuve de scan SAST/DAST, pentest, ou audit CVE.** Pas de snyk, npm audit, safety, ou bandit dans le pipeline.

❌ GAP — **Audit trail côté Python basé sur des fichiers JSONL.** audit_trail.py (07_governance/) écrit des fichiers locaux append-only. Pas de signature, pas d'immutabilité cryptographique, pas de centralisation. Un attaquant avec accès filesystem peut modifier l'historique.

**Score : 3/10**

Les mécanismes d'authentification (bcrypt, lockout, refresh rotation) sont bien implémentés. Mais la fuite de secrets dans Git, le JWT_SECRET faible, l'absence de CSRF, le scoring ouvert par défaut, et l'absence totale de scanning sécurité sont des failles critiques pour une plateforme bancaire.

**Top 3 priorités :**
1. IMMÉDIAT : Révoquer tous les secrets, retirer .env du Git, régénérer JWT_SECRET avec haute entropie
2. Rendre l'API key scoring obligatoire (fail-closed) et ajouter CSRF
3. Mettre en place un scan CVE automatisé (npm audit, safety/bandit)

**Verdict :** Authentification correctement codée mais posture sécurité globalement défaillante — des secrets de production dans Git invalident tout le reste.

---

# RÔLE 8 — COMPLIANCE OFFICER (COBAC / IFRS 9 / AML)

**Mandat :** Auditer la conformité réglementaire.

**Constats :**

✅ VÉRIFIÉ — La documentation reconnaît honnêtement le statut DEMO_BASELINE. L'OOT_VALIDATION_PACK §1 (lignes 8-22) contient une « DÉCLARATION OBLIGATOIRE » explicite : « Ce document NE CONSTITUE PAS une validation sur données bancaires réelles de la zone CEMAC, une certification réglementaire COBAC ou équivalent ». C'est de l'honnêteté documentaire rare et bienvenue.

✅ VÉRIFIÉ — Le validation_metadata.json porte `artifactCategory: "DEMO_BASELINE"` et `validationStatus: "DEMO_VALIDATION_PASS"`. Pas de prétention à un statut production.

✅ VÉRIFIÉ — Le reason code est partiellement implémenté via SHAP (main.py lignes 208-228, XAIDriver avec label, impact, direction, category). Le moteur expose les top 10 drivers de chaque décision.

⚠️ DÉCLARATIF — L'audit trail dans le backend NestJS (module audit/) existe mais son contenu exact n'a pas été audité. L'audit trail Python (07_governance/audit_trail.py) est un fichier JSONL local, non signé, non immutable.

❌ GAP — **Pas de model card formelle.** Aucun document structuré selon les standards SR 11-7 ou EBA/GL/2020/06 (Guidelines on model validation). Le « AUDIT_REPORT.md » interne n'est pas une model card — c'est un auto-panégyrique.

❌ GAP — **Pas d'adverse action notice conforme.** Les SHAP drivers sont techniques (noms de features comme `EXT_SOURCE_2`, `BUREAU_CREDIT_UTILIZATION`). Pour un emprunteur CEMAC, un « reason code » doit être compréhensible : « Votre historique de crédit est insuffisant ». Aucune traduction feature→raison humaine n'est implémentée.

❌ GAP — **Fairness non validé.** Le notebook 02 observe un écart de défaut par genre (10.1% M vs 7.0% F) mais aucun test de disparate impact (80% rule), equalized odds, ou demographic parity n'est exécuté et documenté. Le fairness_validator.py existe mais sans rapport de résultats.

❌ GAP — **Right to explanation inexistant.** Pas de mécanisme pour qu'un client conteste un refus et obtienne une explication compréhensible.

❌ GAP — **Conservation des décisions non conforme.** Les scoring snapshots sont en base Supabase mais la politique de rétention (durée légale, archivage, format d'export pour régulateur) n'est pas définie.

❌ GAP — **Conformité COBAC non adressée spécifiquement.** Les seuils de provisions, les formats de reporting (CERBER, SYSCO, etc.), les ratios prudentiels COBAC (Règlement COBAC R-2018/01) ne sont pas référencés ni implémentés.

**Score : 3/10**

L'honnêteté documentaire sur le statut DEMO_BASELINE est un point fort majeur — trop de projets cachent ce genre de limitation. Mais l'absence de model card, de reason codes compréhensibles, de fairness audit, et de conformité COBAC spécifique rend le projet non soumissible à un régulateur.

**Top 3 priorités :**
1. Produire une model card formelle conforme SR 11-7
2. Implémenter un mapping SHAP feature → reason code humain (fr/en)
3. Exécuter et documenter l'audit de fairness (disparate impact, demographic parity)

**Verdict :** Honnêteté documentaire exemplaire mais conformité réglementaire purement déclarative — aucun livrable soumissible à la COBAC aujourd'hui.

---

# RÔLE 9 — RISK MANAGER / CRO (Métier)

**Mandat :** Auditer la pertinence métier de bout en bout.

**Constats :**

✅ VÉRIFIÉ — Le processus crédit couvre l'origination → scoring → décision → suivi. Le decision_engine.py v2 (555 lignes) implémente un moteur tri-partite (ACCEPT/REVIEW/REJECT) avec 9 critères documentés : PD, EL rate, DTI, limite d'exposition, concentration sectorielle, watchlist, override, collatéral, score composite.

✅ VÉRIFIÉ — Les seuils de décision dans main.py (lignes 279-283) sont documentés et alignés avec DEMO_VS_PROD_BENCHMARK §5 : Elite <0.8%, Core 0.8-3.5%, Watch 3.5-6.0%, Decline >6.0%. Les buffers de calibration sont appliqués avant la décision (×1.15 pour PD>6%, ×1.08 pour PD 3.5-6%).

✅ VÉRIFIÉ — L'override system est structuré (decision_engine.py lignes 51-57) avec des types documentés : STRONG_COLLATERAL, STRATEGIC_CLIENT, GOVERNMENT_MANDATE, EXISTING_TRACK_RECORD, ANALYST_JUDGMENT. Chaque override requiert un type, un approver, et une raison. Les hard blocks (watchlist, concentration) ne sont pas overridables.

✅ VÉRIFIÉ — Le contrôle de concentration sectorielle (decision_engine.py lignes 267-286) avec la règle COBAC 25% max par secteur est implémenté et fonctionnel.

✅ VÉRIFIÉ — Le RAROC calculator (raroc.py) avec taux minimum de pricing et hurdle rate à 15% est opérationnel.

⚠️ DÉCLARATIF — Les seuils Elite/Core/Watch/Decline sont présentés comme calibrés mais leur justification économique (backtesting sur données réelles, analyse du coût d'erreur de type I vs type II) est absente.

❌ GAP — **Pas de données réelles pour calibrer les seuils.** Le DEMO_VS_PROD_BENCHMARK §5 annonce « $4.2M reduction in annual Expected Loss on a $100M portfolio ». C'est un chiffre non sourcé — pas de backtesting sur un portefeuille réel.

❌ GAP — **Reporting CRO inexistant.** Pas de tableau de bord ECL portefeuille, pas de RWA agrégé, pas de rapport de concentration, pas d'export ICAAP. Le TRANSFORMATION_ROADMAP Phase E mentionne « Production Reporting Packs (PDF/CSV Regulatory Exports) » comme futur.

❌ GAP — **Thin-file / alt-data non implémenté.** CURRENT_STATE.md ligne 55 mentionne « Keep thin-file scoring rules-first and human-in-the-loop until real repayment/outcome data exists ». L'adaptation microfinance est un objectif, pas une réalité.

❌ GAP — **Temps de scoring non mesuré.** Le RUNBOOK ne donne aucun SLA de temps de réponse du scoring. Pour un analyste crédit, le temps de décision est critique.

**Score : 5/10**

Le moteur de décision est le composant le plus mature du projet. La logique métier (seuils, override, concentration, RAROC) est bien codée et conforme aux pratiques bancaires. Mais sans données réelles, sans reporting CRO, et sans SLA de performance, c'est un simulateur de décision, pas un outil de production.

**Top 3 priorités :**
1. Construire un dashboard CRO avec ECL portefeuille, RWA, et concentration
2. Définir et mesurer un SLA de temps de scoring (<2s P95)
3. Backtester les seuils Elite/Core/Watch/Decline sur un échantillon réel

**Verdict :** Logique métier solide et bien pensée, mais opérant dans le vide faute de données réelles et de reporting.

---

# RÔLE 10 — UX / PRODUCT (Adoption métier)

**Mandat :** Auditer l'expérience des utilisateurs métier réels.

**Constats :**

✅ VÉRIFIÉ — Le frontend Next.js existe avec une structure complète : app/, components/, dictionaries/, lib/, middleware.ts. Tailwind CSS est configuré (tailwind.config.ts). Des tests existent (tests/).

✅ VÉRIFIÉ — Le middleware.ts (1915 bytes) implique une gestion de routing et potentiellement d'internationalisation (répertoire dictionaries/ présent).

✅ VÉRIFIÉ — Les 4 personas sont implémentées via les rôles RBAC : Analyst, Manager, CRO, Client (CURRENT_STATE.md lignes 16-20). Un client-portal/ existe dans le backend NestJS.

⚠️ DÉCLARATIF — La qualité UX réelle ne peut être auditée sans exécuter le frontend. Les descriptions dans l'AUDIT_REPORT.md interne parlent de « real-time time-series telemetry (AUC, KS, PSI) », « Functional Kanban board », « SHAP visualization ». Preuve visuelle absente.

⚠️ DÉCLARATIF — Le dictionaries/ suggère un support multilingue (fr/en pour zone CEMAC) mais le contenu n'a pas été vérifié.

❌ GAP — **Accessibilité (WCAG) non auditée ni mentionnée.** Aucune référence à a11y dans le code frontend examiné.

❌ GAP — **Compréhension du score par l'analyste.** Les SHAP drivers sont présentés avec des noms techniques (`EXT_SOURCE_2`, `BUREAU_CREDIT_UTILIZATION`). Pour un analyste crédit CEMAC sans formation ML, ces noms sont opaques.

❌ GAP — **Client Portal — exposition de la PD.** Le portail client existe mais la stratégie de communication du risque au client (montrer le score ? montrer la recommandation ? comment inspirer confiance ?) n'est pas documentée.

**Score : 4/10** (évaluation partielle — impossible d'auditer pleinement sans exécuter le frontend)

**Top 3 priorités :**
1. Audit WCAG du frontend
2. Implémenter un mapping SHAP → langage métier pour les analystes
3. Définir la stratégie de communication de risque du portail client

**Verdict :** Structure frontend complète mais impossible à évaluer en profondeur sans exécution — les claims de l'auto-audit (9.5/10) sont invérifiables.

---

# RÔLE 11 — PROJECT / PROGRAM MANAGER

**Mandat :** Auditer la trajectoire et l'écart à la cible.

**Constats :**

✅ VÉRIFIÉ — Le TRANSFORMATION_ROADMAP est remarquablement honnête. La section « Brutally Honest 10/10 Gap Analysis » (lignes 9-19) identifie correctement les gaps HIGH sur Model et Quant Math, MEDIUM sur Data et MLOps. Le niveau 3 « Quantitative Truth » est à 60% et identifié comme « The Bottleneck ».

✅ VÉRIFIÉ — Le DEMO_VS_PROD_BENCHMARK distingue explicitement DEMO_BASELINE et PROD_CHAMPION (cible). La note « PROD_CHAMPION in this document is a target benchmark and validation standard, not proof that Octaix currently runs a certified production champion model » (ligne 5) est un exemple d'honnêteté rare.

✅ VÉRIFIÉ — Le CURRENT_STATE.md (ligne 4) qualifie la plateforme de « governed dual-domain credit operating system candidate, not yet a production-truth platform ». Correct et honnête.

❌ GAP CRITIQUE — **L'AUDIT_REPORT.md interne contredit cette honnêteté.** Ce document auto-signé attribue « Quantitative Rigor: 9/10, Bank-Grade (IFRS 9 / Basel III) » et « Frontend Fidelity: 9.5/10 ». Ces scores sont en contradiction directe avec le TRANSFORMATION_ROADMAP qui place la Quantitative Truth à 60%. L'auto-audit est un document marketing, pas un audit. Sa coexistence avec les documents honnêtes crée une ambiguïté dangereuse pour un investisseur ou un régulateur.

❌ GAP — **Pas de plan B documenté.** Si le pilote EMF ne valide pas l'hypothèse alt-data (CURRENT_STATE.md ligne 55), quelle est la stratégie de repli ? Pas de scénario alternatif.

❌ GAP — **La dette de validation est massive.** Checklist OOT_VALIDATION_PACK §7 : 10 items, tous en `[ ]`. Aucune des conditions de promotion CHALLENGER n'est remplie.

❌ GAP — **Risque de communication.** L'utilisation du terme « Bank-Grade » dans le titre du TRANSFORMATION_ROADMAP (« The 10/10 Bank-Grade Transformation Roadmap ») crée une attente que le produit ne peut pas satisfaire aujourd'hui.

**Score : 5/10**

La documentation stratégique est d'une honnêteté remarquable — les gaps sont correctement identifiés, les niveaux de maturité sont réalistes. Mais l'AUDIT_REPORT.md auto-flatteur et l'utilisation marketing de « Bank-Grade » sapent cette crédibilité.

**Top 3 priorités :**
1. Supprimer ou reclasser l'AUDIT_REPORT.md interne en « auto-évaluation dev » pour éviter la confusion
2. Documenter un plan B explicite pour le pilote EMF
3. Créer un registre de dette de validation avec dates butoirs

**Verdict :** Excellente conscience de la trajectoire, gâchée par un auto-audit complaisance qui contredit les documents honnêtes.

---

# RÔLE 12 — INVESTISSEUR / DUE DILIGENCE TECHNIQUE

**Mandat :** Auditer le projet du point de vue d'un investisseur.

**Constats :**

✅ VÉRIFIÉ — **Différenciation réelle.** L'approche « Africa-first credit risk engine » avec IFRS 9 staging, COBAC awareness, et feature contract pour données CEMAC est un positionnement pertinent. Le marché de la notation interne pour les banques CEMAC est sous-servi par les solutions globales (Experian, FICO, Moody's).

✅ VÉRIFIÉ — **Profondeur technique.** La couverture fonctionnelle (PD/LGD/EAD, IFRS 9, RAROC, decision engine, monitoring, governance) est impressionnante pour un stade précoce. Le volume de code est conséquent (>50 fichiers Python, NestJS backend complet, frontend).

✅ VÉRIFIÉ — **IP réelle.** Le feature pipeline de mapping corporate→retail, le decision engine v2 avec concentration sectorielle COBAC, et le RAROC calculator IRB sont du code propriétaire à valeur ajoutée.

⚠️ DÉCLARATIF — **Moat technique limité.** Le modèle ML lui-même est un LightGBM standard sur des données publiques. Le vrai moat serait dans les données propriétaires (accord de partage bancaire signé) et le feature contract calibré sur des données CEMAC — qui n'existent pas encore.

❌ GAP — **Aucune donnée propriétaire.** Le modèle tourne sur Home Credit (données publiques 2016-2018, Russie/Asie). Aucun accord de partage de données bancaires signé (OOT_VALIDATION_PACK §7, premier item non coché). Sans données, pas de modèle, pas de produit.

❌ GAP — **Time-to-value incertain.** La checklist de promotion CHALLENGER a 10 items non cochés. Le chemin vers un premier pilote EMF fonctionnel est de 6-12 mois minimum (accord de données, nettoyage, retraining, OOT, validation MRM).

❌ GAP — **Coût de migration data inconnu.** Le TRANSFORMATION_ROADMAP Workstream 3 mentionne « Design the Bank Source Connector architecture » comme futur travail. L'effort d'intégration CBS est typiquement le poste le plus coûteux et le plus long dans un projet de risk engine bancaire.

❌ GAP — **Single-point-of-failure : dépendance à un développeur.** Tous les transcripts d'implémentation référencent « Antigravity » comme seul développeur/architecte/auditeur. Le bus factor est de 1.

❌ GAP — **Revenus : aucun.** Pas de client payant, pas de LOI, pas de POC signé. La trajectoire de revenus n'est pas documentée.

❌ GAP — **Secrets dans Git = red flag DD.** Un investisseur qui voit des credentials de base de données en clair dans un .env commité remet en question la maturité opérationnelle de l'équipe.

**Score : 3.5/10**

Le positionnement marché est pertinent et la couverture fonctionnelle est impressionnante pour un projet early-stage. Mais sans données propriétaires, sans client, avec un bus factor de 1 et des secrets dans Git, l'investissement est prématuré.

**Top 3 priorités :**
1. Signer un accord de partage de données avec une banque/EMF CEMAC pilote
2. Recruter au moins un second ingénieur ML/backend
3. Nettoyer les secrets, mettre en place un vault, et faire un scan de sécurité

**Verdict :** Concept prometteur avec couverture fonctionnelle rare, mais la valeur est aspirationnelle tant qu'aucune donnée bancaire réelle ne passe dans le pipeline.

---

# SYNTHÈSE FINALE

## A) MATRICE DE SCORES

| Rôle | Score /10 | 3 mots-clés du verdict |
|---|---|---|
| 1. Data Scientist Senior | 4.5 | Sous-entraîné, sans monotonicité, EDA solide |
| 2. Quant / Model Risk | 4.0 | Coquille réglementaire, proxies partout, LGD statique |
| 3. ML Engineer | 4.0 | Training-serving skew, pas de lock file, pas d'intégration test |
| 4. MLOps Lead | 2.5 | Présentation sans automatisation, pas de CI/CD, pas de gates |
| 5. Data Engineer | 2.0 | Dataset public, pas de CBS, pas de PII, pas de DQ auto |
| 6. Software Architect | 5.5 | Architecture propre, dette technique visible, pas d'async |
| 7. Security Engineer | 3.0 | Secrets dans Git, JWT faible, auth correcte mais posture faillie |
| 8. Compliance Officer | 3.0 | Honnêteté doc exemplaire, mais rien de soumissible à COBAC |
| 9. Risk Manager / CRO | 5.0 | Decision engine solide, mais opère dans le vide |
| 10. UX / Product | 4.0 | Structure complète, impossible à valider sans exécution |
| 11. Project Manager | 5.0 | Conscience lucide, auto-audit contredit l'honnêteté |
| 12. Investisseur | 3.5 | Concept pertinent, exécution prématurée, bus factor=1 |

**Moyenne : 3.8 / 10**

---

## B) TOP 10 RISQUES (Gravité × Probabilité)

| # | Gravité | Constat | Preuve | Mitigation |
|---|---|---|---|---|
| 1 | **H** | Secrets de production dans Git (.env commité) | 10_backend_nestjs/.env : DATABASE_URL, JWT_SECRET en clair | Révoquer immédiatement, .gitignore, vault |
| 2 | **H** | Modèle ML entraîné sur données non-CEMAC, scoring en production impossible | OOT_VALIDATION_PACK §6 caveat 1, feature_pipeline.py 60-70% imputation | Signer accord données, retrainer sur données réelles |
| 3 | **H** | best_iteration=3 — modèle potentiellement sous-entraîné | pd_model_v2_metadata.json ligne 6 | Investiguer early stopping config, relancer training |
| 4 | **H** | Auto-audit (AUDIT_REPORT.md) survendant le projet « 9/10 Bank-Grade » | AUDIT_REPORT.md vs TRANSFORMATION_ROADMAP §1 (60% Quant Truth) | Retirer ou reclasser en « vision cible » |
| 5 | **H** | Pas de monotonicité sur le modèle déployé malgré l'exigence réglementaire | MODEL_GOVERNANCE_SPEC §4 vs pd_model_v2 = LightGBM sans contraintes | Déployer le XGBoost trainer avec MONOTONE_CONSTRAINTS |
| 6 | **M** | Aucun pipeline CI/CD ML — promotion manuelle | .github/ sans workflow, pas de gates automatiques | Implémenter GitHub Actions avec validation automatique |
| 7 | **M** | Bus factor = 1 — tout repose sur un seul développeur | Transcripts d'implémentation, tous signés Antigravity | Recruter et documenter l'architecture |
| 8 | **M** | Audit trail Python non immutable (fichiers JSONL locaux) | audit_trail.py — fichiers append-only sans signature | Migrer vers un stockage immutable (DB avec trigger, ou blockchain simple) |
| 9 | **M** | Fairness non validé sur variable genre (écart 10.1% vs 7.0%) | notebooks_dump.md notebook 02 §9 | Exécuter fairness_validator.py, documenter résultats |
| 10 | **M** | Pas de gestion des PII — aucune pseudonymisation | notebook 02 §3 : CODE_GENDER, DAYS_BIRTH = « Haute sensibilité » | Implémenter hashing/masking des PII |

---

## C) WALK AWAY OR CONTINUE?

**Réponse : CONTINUE — sous conditions strictes et non négociables.**

Le projet a trois atouts réels :
1. **Positionnement marché** : une plateforme de risque de crédit IFRS 9 / Basel III pour la zone CEMAC n'existe pas dans l'offre actuelle. Le besoin est réel.
2. **Honnêteté documentaire** : la distinction DEMO_BASELINE / PROD_CHAMPION et les caveats de l'OOT_VALIDATION_PACK montrent une maturité intellectuelle rare. L'équipe sait ce qui manque.
3. **Couverture fonctionnelle** : PD/LGD/EAD, IFRS 9 staging, RAROC, decision engine v2, monitoring, governance — tout est ébauché. C'est un prototype complet, pas un MVP incomplet.

**Conditions de poursuite du financement :**
- Résolution immédiate (7 jours) : secrets retirés de Git, JWT_SECRET régénéré
- T+30 jours : accord de partage de données signé avec un EMF pilote
- T+60 jours : premier modèle XGBoost entraîné sur données réelles avec monotonicité et OOT calendaire
- T+90 jours : evidence pack automatique généré, fairness validé, model card formelle produite
- Recrutement : minimum 1 ML Engineer senior avant T+30

**Si ces conditions ne sont pas remplies**, le projet reste un prototype de recherche bien documenté — pas un produit investissable.

---

## D) ROADMAP DE REMÉDIATION 90 JOURS

### 0-30 jours : Sécurité + Conformité + Honnêteté

- [ ] **J1** : Retirer .env de Git, révoquer tous les secrets, régénérer avec haute entropie
- [ ] **J3** : Rendre SCORING_API_KEY obligatoire (fail-closed), ajouter CSRF
- [ ] **J7** : Exécuter npm audit + safety/bandit, corriger les CVE critiques
- [ ] **J7** : Supprimer ou renommer AUDIT_REPORT.md en « AUTO_EVALUATION_DEV.md »
- [ ] **J14** : Exécuter fairness_validator.py, documenter les résultats dans un rapport
- [ ] **J14** : Créer un pip freeze / poetry.lock pour reproductibilité
- [ ] **J21** : Produire une model card formelle (SR 11-7 format)
- [ ] **J30** : Signer un accord de partage de données avec un EMF CEMAC pilote

### 30-60 jours : Industrialisation modèle + Monitoring runtime

- [ ] **J35** : Investiguer et résoudre le best_iteration=3, retrainer le LightGBM
- [ ] **J40** : Entraîner le premier XGBoost (PDXGBTrainer) avec contraintes de monotonicité
- [ ] **J45** : Si données réelles disponibles : retrainer sur données CEMAC avec split calendaire OOT 6 mois
- [ ] **J50** : Intégrer drift_detector.py au runtime NestJS avec persistance DB
- [ ] **J55** : Implémenter GitHub Actions : lint + test + validation métriques sur PR
- [ ] **J60** : Écrire un test d'intégration ML qui charge le .pkl réel et valide un golden payload

### 60-90 jours : Pilote EMF contrôlé + Evidence packs auto

- [ ] **J65** : Connecteur CBS minimaliste (batch CSV/API) pour l'EMF pilote
- [ ] **J70** : Générer automatiquement un evidence pack (métriques, SHAP, PSI) à chaque promotion
- [ ] **J75** : Dashboard CRO avec ECL portefeuille et concentration sectorielle
- [ ] **J80** : Mapping SHAP features → reason codes humains (fr/en)
- [ ] **J85** : Pilote contrôlé sur 100-500 dossiers réels avec human-in-the-loop
- [ ] **J90** : Rapport de pilote avec comparaison décisions ML vs décisions humaines

---

## E) UNE PHRASE BRUTALE

> « En une phrase, ce projet est aujourd'hui : **un simulateur de plateforme bancaire remarquablement bien documenté dans ses propres lacunes, qui score des entreprises africaines avec un modèle entraîné sur des consommateurs russes, stocke ses secrets en clair dans Git, et dont l'auto-audit à 9/10 contredit sa propre roadmap à 60%.** »
