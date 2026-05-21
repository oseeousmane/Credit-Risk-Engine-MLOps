# 🤖 Model Governance Specification: Canonical Risk Path

**Status:** APPROVED FOR INDUSTRIALIZATION  
**Priority:** HIGHEST  
**Objective:** Definitive resolution of model architecture, registry governance, and runtime contracts for the PROD_CHAMPION tier.

---

## 1. Target Champion Architecture: XGBoost

After evaluating **XGBoost** vs **LightGBM**, Octaix targets **XGBoost** for any future Production Champion (`PROD_CHAMPION`) tier.

Current implementation truth: the active checked-in PD artifact is a **LightGBM demonstration/pilot artifact** (`pd_model_v2`). It must not be described as a validated XGBoost `PROD_CHAMPION` until a reproducible XGBoost artifact, validation pack, and promotion evidence exist in the registry.

### Rationale:
- **Monotonicity Constraints:** XGBoost provides superior, stable enforcement of monotonic constraints (e.g., as Income increases, PD must non-linearly decrease). This is a non-negotiable requirement for regulatory validation (Basel/IFRS 9).
- **SHAP Integration:** The SHAP ecosystem for XGBoost is the industry benchmark for local explainability (Reason Codes), which is mandatory for adverse action notices.
- **Serialization:** We will use the `XGBoost JSON` format (`.json`) for model artifacts to ensure language-agnostic ingestion between the Python training pipeline and the high-performance inference engine.

---

## 2. Model Lifecycle & Promotion Registry

The target `ModelRegistry` lifecycle for `PROD_CHAMPION` candidates is:

| Stage | Governance Requirement | Registry Tag |
| :--- | :--- | :--- |
| **Development** | Research artifacts trained on research data. | `DEV_ALPHA` |
| **Candidate** | Trained on the current 157-feature contract with 70/30 split. | `CANDIDATE` |
| **Challenger** | Validated on Out-of-Time (OOT) test set. | `CHALLENGER` |
| **Champion** | Approved by Model Risk Management (MRM) for live production scoring. | `PROD_CHAMPION` |

### The "OOT" Mandate:
No model shall be promoted to `CHALLENGER` without an **Out-of-Time (OOT)** validation score.  
*   **OOT Window:** Minimum 6-month delay between training end-date and OOT start-date to simulate real-world drift.

---

## 3. Data Contract Alignment
- **Feature Contract:** Must strictly adhere to `FEATURE_CONTRACT.json` (currently 157 features).
- **Lineage:** Every inference must record the `artifactCategory` to distinguish between "Demo Data" and "Bank Truth" in audit logs.

---

## 4. Training Protocol (XGBoost Parameters)
Production models must be trained with the following hyper-parameter constraints:
- `tree_method`: `hist` (for scalability and deterministic binning)
- `monotone_constraints`: Enabled for all core financial ratios (DTI, Leverage, Liquidity).
- `max_depth`: Limited to 6 to prevent over-fitting on sparse emerging market data.
- `eval_metric`: `auc` (Primary) and `logloss` (Secondary).
