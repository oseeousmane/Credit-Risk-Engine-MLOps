# 🚀 Credit Risk Engine - Current State

**Last Updated:** May 01, 2026
**Status:** Controlled pilot hardening in progress. The platform is a governed dual-domain credit operating system candidate, not yet a production-truth platform.

## 🏗️ Architecture Setup
- **Frontend:** Next.js 16 (running on `http://localhost:3000`)
- **Backend:** NestJS 11 (running on `http://localhost:3001` with SWC and WebSockets)
- **Scoring Engine:** Canonical FastAPI scorer is `03_risk_engine.main:app` on `http://localhost:8000`; it exposes `/score` with feature lineage, payload quality, imputation metrics, and fallback signaling expected by NestJS.
- **Database:** Supabase PostgreSQL (Cloud) via Connection Pooler (IPv4 bypass).
- **ORM:** Prisma Client (with `$env:PRISMA_ENGINES_MIRROR` workaround for corporate network).

## 🔐 Authentication
The `DEV BYPASS` has been **REMOVED**. The platform is strictly secured via JWT Strategy. You MUST log in to access the Dashboard.

**Demo Credentials (Seeded in DB):**
- **Analyst:** `analyst@riskengine.com`
- **Risk Manager:** `manager@riskengine.com`
- **CRO:** `cro@riskengine.com`
- **Client:** `tom.eriksen@glp-group.com`
- **Universal Password:** `Demo@2026!`

*(Note: demo seed primarily uses bcrypt. A temporary SHA-256 bridge remains only for legacy demo accounts and migrates those accounts on successful login.)*

## 🛠️ How to Resume Work (Next Session)

1. **Start the Frontend:**
   ```bash
   cd 08_frontend
   npm run dev
   ```
2. **Start the Canonical Scoring Engine:**
   ```bash
   cd 03_risk_engine
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Start the Backend:**
   ```bash
   cd 10_backend_nestjs
   npm run start:dev
   ```
   *(If you encounter an `EADDRINUSE` error on port 3001, make sure to kill the hanging node process).*

4. **Database Changes:**
   If you change the Prisma Schema, push using the mirror. This command prompts before any destructive change — **do not add `--accept-data-loss`**:
   ```powershell
   $env:PRISMA_ENGINES_MIRROR="https://registry.npmmirror.com/-/binary/prisma"; npx prisma db push
   npx prisma db seed
   ```

## 📋 Next Steps
- Finish credibility hardening: canonical scoring path, RBAC, and documentation consistency.
- Narrow microfinance pilot readiness to one controlled EMF slice before alternative-data expansion.
- Keep thin-file scoring rules-first and human-in-the-loop until real repayment/outcome data exists.
- Replace static/simulated monitoring and compliance surfaces with evidenced runtime data where pilot-critical.
