# 📟 Octaix Risk Engine — Operational Runbook

**Version:** 1.0  
**Last Updated:** 2026-04-27  
**Owner:** Credit Risk Platform Team  
**Classification:** Internal — Restricted

> This runbook covers day-to-day operations, incident response, and rollback procedures for the Octaix Risk Engine platform.

---

## 1. Service Overview

| Service | Port | Technology | Criticality |
|---|---|---|---|
| **NestJS Backend** | 3001 | Node.js / NestJS 11 | P0 — Critical |
| **Next.js Frontend** | 3000 | Next.js 16 | P1 — High |
| **Python Scoring Engine** | 8000 | FastAPI / Uvicorn (`03_risk_engine.main:app`) | P1 — High (fallback exists) |
| **Database** | Cloud | Supabase PostgreSQL | P0 — Critical |

---

## 2. Service Start Order

> **Rule:** Always start services in this order. Starting the frontend before the backend causes auth failures.

```bash
# Step 1 — Database (Supabase Cloud, always available; no local action needed)

# Step 2 — Python Scoring Engine
cd 03_risk_engine
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Step 3 — NestJS Backend
cd 10_backend_nestjs
npm run start:dev

# Step 4 — Next.js Frontend
cd 08_frontend
npm run dev
```

---

## 3. Health Verification

Run these commands immediately after startup to confirm all systems are operational.

```bash
# Is the NestJS process alive?
curl http://localhost:3001/health/liveness

# Are DB and Python engine reachable?
curl http://localhost:3001/health/readiness

# Has the app fully initialized (DB connected)?
curl http://localhost:3001/health/startup

# Python scoring engine — liveness (always 200 while process is alive)
curl http://localhost:8000/health

# Python scoring engine — readiness (503 until model artifact is loaded)
curl http://localhost:8000/ready

# Python operational counters (real inference/fallback/error counts)
curl http://localhost:8000/metrics

# What is the scoring engine status + active model version?
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3001/monitoring/scoring-health
```

**Expected healthy responses:**
```json
// /health/liveness
{ "status": "OK", "timestamp": "..." }

// /health/readiness
{ "status": "OK", "checks": { "database": "UP", "scoring_engine": "UP" } }

// /health/startup
{ "status": "STARTED", "database": "connected" }
```

---

## 4. Incident Response

### 🔴 P0 — Database Connection Lost

**Detection:** `/health/readiness` returns `{ "database": "DOWN" }` or `503`.  
**Business Impact:** All API requests fail. No reads, no writes. Platform is down.

**Response Steps:**
1. Check [Supabase Status](https://status.supabase.com) for cloud outages.
2. If Supabase is operational, check the connection pool:
   - Supabase Dashboard → Settings → Database → Connection Pooling
   - If pool is exhausted, restart NestJS to force `$disconnect()` / `$connect()`.
3. **Corporate VPN workaround:** Set the Prisma engine mirror before restarting:
   ```powershell
   $env:PRISMA_ENGINES_MIRROR="https://registry.npmmirror.com/-/binary/prisma"
   npm run start:dev
   ```
4. Verify recovery: `/health/readiness` should return `{ "database": "UP" }`.
5. Log the incident duration in the audit trail via a manual `POST /audit` event.

---

### 🟠 P1 — Python Scoring Engine Down

**Detection:** `/monitoring/scoring-health` returns `{ "status": "FALLBACK_ACTIVE" }`.  
**Business Impact:** All new scorings use the rule-based fallback engine. Confidence is capped at 0.55. SHAP drivers are not available. Scoring continues but at lower quality.

**Response Steps:**
1. Check Python engine logs for startup errors.
2. Restart the canonical scoring service:
    ```bash
    cd 03_risk_engine
    uvicorn main:app --host 0.0.0.0 --port 8000
    ```
3. Confirm recovery:
   ```bash
   curl http://localhost:8000/health
   # Expected: { "status": "ok" }
   ```
4. NestJS will automatically switch back to the Python engine within 30 seconds (next scheduled cron tick). Confirm via `/monitoring/scoring-health`.
5. If the fallback rate exceeded 10%, a `REVIEW_REQUIRED` governance flag will have been set. Resolve it via:
   ```bash
   PATCH /monitoring/alerts/{alert_id}/resolve
   ```

---

### 🟡 P2 — Model Drift Alert (PSI > 0.25)

**Detection:** `CRITICAL` alert in `/monitoring/alerts` with message `"Model Drift Detected"`.  
**Business Impact:** Model is predicting on a shifted data distribution. Scores may be unreliable.

**Response Steps:**
1. Review the alert in the Monitoring Dashboard → Alerts tab.
2. Check the drift detail: which features are drifting (`criticalFeatures` PSI values).
3. **Short-term:** Do NOT rollback immediately. Observe for 2–3 drift cycles (hourly cron).
4. **If drift persists:** Escalate to MRM team for model retraining decision.
5. To trigger a retraining job:
   ```bash
   POST /scoring/retrain  # Submits job to orchestration queue, creates audit record
   ```

---

### 🟡 P2 — JWT Authentication Failures (Mass)

**Detection:** Spike in 401 responses across all endpoints.  
**Likely Cause:** `JWT_SECRET` mismatch between deployed instances, or token TTL change causing all sessions to expire simultaneously.

**Response Steps:**
1. Verify the `JWT_SECRET` environment variable matches across all deployments.
2. If TTL was recently changed (e.g., from `24h` to `1h`), all existing tokens are invalid — users must re-login. This is expected behavior in production posture.
3. Check the auth service logs for `UnauthorizedException` patterns.

---

## 5. Model Rollback Procedure

Use this when a model version is producing bad scores and must be reverted to the previous champion.

**Trigger Criteria:** PSI > 0.25 for 3+ consecutive hours, OR MRM explicit decision.

```sql
-- Step 1: Deprecate the bad version
UPDATE "ModelVersion"
SET status = 'DEPRECATED'
WHERE "versionTag" = '<bad_version_tag>';

-- Step 2: Ensure the previous champion is HEALTHY
UPDATE "ModelVersion"
SET status = 'HEALTHY'
WHERE "versionTag" = '<previous_good_version_tag>';
```

```bash
# Step 3: Verify the rollback via API
GET /model-registry
# Confirm the previous version is now shown as active champion

# Step 4: Log the rollback as a governance event
POST /audit
{
  "eventType": "MODEL_ROLLBACK",
  "entityType": "ModelVersion",
  "entityId": "<bad_version_id>",
  "newValue": { "reason": "PSI > 0.25 for 3 consecutive cycles", "rolledBackTo": "<previous_version>" }
}
```

---

## 6. Kill Switches

### Disable Python ML Engine (Force Rule Engine)
Set an unreachable URL in the environment and restart the backend. All scoring will route to the fallback rule engine automatically — no code change required.

```powershell
# Temporarily override SCORING_SERVICE_URL to force fallback mode
$env:SCORING_SERVICE_URL="http://localhost:9999"
npm run start:dev
```

Restore by resetting the env var to the real scoring service URL.

### Disable Scheduled Monitoring Crons
Comment out the `@Cron()` decorators in `monitoring.service.ts` and restart. This stops PSI evaluation and auto-alerting.

---

## 7. Prisma & Database Operations

### Development (local / staging)

```powershell
# Sync schema without migrations — safe for feature branch iteration.
# Will PROMPT and ABORT if any change would drop data. Do NOT use --accept-data-loss.
$env:PRISMA_ENGINES_MIRROR="https://registry.npmmirror.com/-/binary/prisma"
npx prisma db push

# Re-seed demo data
npx prisma db seed

# Open Prisma Studio (visual DB browser)
npx prisma studio
```

### Production (CI/CD deploy path)

```powershell
# Apply versioned migration files — the ONLY safe method for production.
# This command is idempotent and never drops data without an explicit migration file.
npx prisma migrate deploy
```

> [!CAUTION]
> **`--accept-data-loss` is PROHIBITED in standard operations.**
> This flag silently drops columns and data without confirmation.
> If you believe you need it, stop and consult the Engineering Lead first.
> For production schema changes: always write a migration (`npx prisma migrate dev --name <desc>`),
> review the generated SQL, and deploy via `prisma migrate deploy`.

### Required secrets

Three secrets are required — `JWT_SECRET` and `SESSION_SECRET` must be independently generated values:

```powershell
# JWT signing secret (min 32 chars, enforced by Joi at startup)
$env:JWT_SECRET="<openssl rand -hex 64>"

# Express session cookie secret — MUST differ from JWT_SECRET
$env:SESSION_SECRET="<openssl rand -hex 64>"

# Python scoring service API key
$env:SCORING_API_KEY="<python -c 'import secrets; print(secrets.token_hex(32))'>"
```

NestJS reads `SCORING_API_KEY` and forwards it in the `X-Api-Key` header to the Python engine.
`SESSION_SECRET` and `JWT_SECRET` are both validated at startup by Joi — the app will not start if either is missing or shorter than 32 characters.

---

## 8. Demo Credentials

| Role | Email | Password |
|---|---|---|
| Analyst | `analyst@riskengine.com` | `Demo@2026!` |
| Risk Manager | `manager@riskengine.com` | `Demo@2026!` |
| CRO | `cro@riskengine.com` | `Demo@2026!` |
| Client | `tom.eriksen@glp-group.com` | `Demo@2026!` |

---

## 9. Escalation & Contacts

| Severity | Escalation Path |
|---|---|
| P0 — Platform Down | Engineering Lead → CTO |
| P1 — Scoring Degraded | Risk Platform Team → Risk Manager |
| P2 — Model Drift | MLOps Team → Model Risk Management (MRM) |
| P3 — Governance Flag | Compliance Officer |

---

## 10. Post-Incident Checklist

After any P0 or P1 incident, complete the following before closing:

- [ ] Root cause identified and documented
- [ ] Incident duration logged in audit trail (`POST /audit`)
- [ ] Alert resolved in system (`PATCH /monitoring/alerts/{id}/resolve`)
- [ ] If fallback was active: governance flag reviewed and cleared
- [ ] If model was rolled back: MRM notified and formal review scheduled
- [ ] Runbook updated if new failure mode was discovered
