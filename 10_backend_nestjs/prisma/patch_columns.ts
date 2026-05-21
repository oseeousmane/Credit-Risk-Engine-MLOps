import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Applying column patch via Prisma pooler connection...');

  const statements = [
    // User — lockout + refresh token columns
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hashedRefreshToken"  TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordAlgorithm"   TEXT NOT NULL DEFAULT 'BCRYPT'`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordMigratedAt"  TIMESTAMP(3)`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil"         TIMESTAMP(3)`,

    // Application — facility + PD-at-origination
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "pdAtOrigination"   DOUBLE PRECISION`,
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "facilityType"      TEXT`,
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interestRate"      DOUBLE PRECISION`,
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "tenorMonths"       INTEGER`,
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "collateralValue"   DOUBLE PRECISION`,
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "collateralType"    TEXT`,
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "repaymentSource"   TEXT`,
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "amortizationType"  TEXT`,
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "gracePeriodMonths" INTEGER DEFAULT 0`,
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "createdBy"         TEXT`,
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "updatedBy"         TEXT`,
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "metadata"          JSONB`,

    // Counterparty — enriched financials + behavioral
    `ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "industry"           TEXT`,
    `ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "yearsInBusiness"    INTEGER`,
    `ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "revenue"            DOUBLE PRECISION`,
    `ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "ebitda"             DOUBLE PRECISION`,
    `ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "netProfit"          DOUBLE PRECISION`,
    `ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "totalAssets"        DOUBLE PRECISION`,
    `ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "totalDebt"          DOUBLE PRECISION`,
    `ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "operatingCashFlow"  DOUBLE PRECISION`,
    `ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "currentRatio"       DOUBLE PRECISION`,
    `ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "leverageRatio"      DOUBLE PRECISION`,
    `ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "inventoryTurnover"  DOUBLE PRECISION`,
    `ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "daysPastDue"        INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "missedPayments24m"  INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "creditHistoryYears" DOUBLE PRECISION`,
    `ALTER TABLE "Counterparty" ADD COLUMN IF NOT EXISTS "bureauScore"        INTEGER`,
  ];

  let ok = 0;
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      ok++;
    } catch (e: any) {
      // column already exists → ignore; any other error → log and continue
      if (!e.message?.includes('already exists')) {
        console.warn(`  WARN: ${sql.slice(0, 60)}… → ${e.message}`);
      }
    }
  }
  console.log(`  ${ok}/${statements.length} statements executed.`);

  // Create missing tables via raw SQL
  const tables = [
    `CREATE TABLE IF NOT EXISTS "ComplianceItem" (
      "id" TEXT NOT NULL, "label" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'REVIEW', "detail" TEXT,
      "referenceDoc" TEXT, "lastValidated" TIMESTAMP(3), "dueDate" TIMESTAMP(3),
      "isActive" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      CONSTRAINT "ComplianceItem_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "TechDocument" (
      "id" TEXT NOT NULL, "name" TEXT NOT NULL, "version" TEXT NOT NULL DEFAULT '',
      "fileType" TEXT NOT NULL DEFAULT 'pdf', "fileUrl" TEXT, "description" TEXT,
      "isPublic" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      CONSTRAINT "TechDocument_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "AdminSetting" (
      "id" TEXT NOT NULL, "key" TEXT NOT NULL, "value" TEXT NOT NULL,
      "label" TEXT, "group" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "AdminSetting_key_key" ON "AdminSetting"("key")`,
    `CREATE TABLE IF NOT EXISTS "WebhookSubscription" (
      "id" TEXT NOT NULL, "url" TEXT NOT NULL, "secret" TEXT NOT NULL,
      "events" TEXT[], "active" BOOLEAN NOT NULL DEFAULT true, "description" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
      "id" TEXT NOT NULL, "subscriptionId" TEXT NOT NULL, "event" TEXT NOT NULL,
      "payload" JSONB NOT NULL, "statusCode" INTEGER,
      "success" BOOLEAN NOT NULL DEFAULT false, "attemptCount" INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "WebhookDelivery_subscriptionId_idx" ON "WebhookDelivery"("subscriptionId")`,
  ];

  let tok = 0;
  for (const sql of tables) {
    try {
      await prisma.$executeRawUnsafe(sql);
      tok++;
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        console.warn(`  WARN table: ${e.message}`);
      }
    }
  }
  console.log(`  ${tok}/${tables.length} table statements executed.`);

  // FK for WebhookDelivery (separate try — will fail silently if exists)
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_subscriptionId_fkey"
       FOREIGN KEY ("subscriptionId") REFERENCES "WebhookSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
  } catch { /* already exists */ }

  console.log('Patch complete.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
