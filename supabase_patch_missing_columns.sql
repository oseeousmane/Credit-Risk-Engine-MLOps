-- ============================================================
-- Patch: add columns missing from pre-existing tables
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).
-- Generated 2026-05-21 — targets tables created before lockout/refresh columns were added.
-- ============================================================

-- ── User table: columns from later migrations ─────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hashedRefreshToken"    TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordAlgorithm"     TEXT NOT NULL DEFAULT 'BCRYPT';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordMigratedAt"    TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginAttempts"   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil"           TIMESTAMP(3);

-- ── Application table: facility fields + PD-at-origination ───────────────
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "pdAtOrigination"    DOUBLE PRECISION;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "facilityType"       TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interestRate"       DOUBLE PRECISION;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "tenorMonths"        INTEGER;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "collateralValue"    DOUBLE PRECISION;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "collateralType"     TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "repaymentSource"    TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "amortizationType"   TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "gracePeriodMonths"  INTEGER DEFAULT 0;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "createdBy"          TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "updatedBy"          TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "metadata"           JSONB;

-- ── Counterparty table: enriched financial + behavioral fields ─────────────
ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "industry"            TEXT;
ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "yearsInBusiness"     INTEGER;
ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "revenue"             DOUBLE PRECISION;
ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "ebitda"              DOUBLE PRECISION;
ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "netProfit"           DOUBLE PRECISION;
ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "totalAssets"         DOUBLE PRECISION;
ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "totalDebt"           DOUBLE PRECISION;
ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "operatingCashFlow"   DOUBLE PRECISION;
ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "currentRatio"        DOUBLE PRECISION;
ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "leverageRatio"       DOUBLE PRECISION;
ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "inventoryTurnover"   DOUBLE PRECISION;
ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "daysPastDue"         INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "missedPayments24m"   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "creditHistoryYears"  DOUBLE PRECISION;
ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "bureauScore"         INTEGER;

-- ── ComplianceItem (create if missing, add columns if exists) ────────────
DO $$ BEGIN
    CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'REVIEW', 'BREACH', 'PENDING');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ComplianceItem" (
    "id"            TEXT NOT NULL,
    "label"         TEXT NOT NULL,
    "status"        "ComplianceStatus" NOT NULL DEFAULT 'REVIEW',
    "detail"        TEXT,
    "referenceDoc"  TEXT,
    "lastValidated" TIMESTAMP(3),
    "dueDate"       TIMESTAMP(3),
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "sortOrder"     INTEGER NOT NULL DEFAULT 0,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ComplianceItem" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- ── TechDocument (create if missing) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TechDocument" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "version"     TEXT NOT NULL,
    "fileType"    TEXT NOT NULL,
    "fileUrl"     TEXT,
    "description" TEXT,
    "isPublic"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TechDocument_pkey" PRIMARY KEY ("id")
);

-- ── AdminSetting (create if missing) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AdminSetting" (
    "id"        TEXT NOT NULL,
    "key"       TEXT NOT NULL,
    "value"     TEXT NOT NULL,
    "label"     TEXT,
    "group"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AdminSetting_key_key" ON "AdminSetting"("key");

-- ── WebhookSubscription (create if missing) ───────────────────────────────
CREATE TABLE IF NOT EXISTS "WebhookSubscription" (
    "id"          TEXT NOT NULL,
    "url"         TEXT NOT NULL,
    "secret"      TEXT NOT NULL,
    "events"      TEXT[],
    "active"      BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- ── WebhookDelivery (create if missing) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
    "id"             TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "event"          TEXT NOT NULL,
    "payload"        JSONB NOT NULL,
    "statusCode"     INTEGER,
    "success"        BOOLEAN NOT NULL DEFAULT false,
    "attemptCount"   INTEGER NOT NULL DEFAULT 1,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
    ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_subscriptionId_fkey"
        FOREIGN KEY ("subscriptionId") REFERENCES "WebhookSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
CREATE INDEX IF NOT EXISTS "WebhookDelivery_subscriptionId_idx" ON "WebhookDelivery"("subscriptionId");
