-- CreateEnum
CREATE TYPE "BorrowerSegment" AS ENUM ('FORMAL', 'SEMI_FORMAL', 'INFORMAL', 'THIN_FILE');

-- CreateEnum
CREATE TYPE "BorrowerStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ConsentSourceType" AS ENUM ('MOBILE_MONEY', 'DEVICE_DATA', 'FIELD_DATA', 'OCR_DOCUMENT', 'CREDIT_BUREAU', 'KYC_IDENTITY', 'GPS_LOCATION', 'GUARANTOR_DATA', 'GROUP_DATA');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('UNDERWRITING', 'AFFORDABILITY_ASSESSMENT', 'FRAUD_PREVENTION', 'COLLECTIONS', 'PORTFOLIO_MONITORING', 'MODEL_MONITORING', 'MODEL_TRAINING', 'REGULATORY_REPORTING');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConsentCaptureChannel" AS ENUM ('MOBILE_APP', 'FIELD_AGENT', 'BRANCH', 'USSD', 'WEB_PORTAL');

-- CreateEnum
CREATE TYPE "MicroLoanProductType" AS ENUM ('INDIVIDUAL', 'GROUP', 'MERCHANT', 'AGRI', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "MicroLoanApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'FIELD_REVIEW_REQUIRED', 'FIELD_REVIEWED', 'SCORED', 'SUPERVISOR_REVIEW', 'APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FieldVisitStatus" AS ENUM ('PLANNED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FieldVisitOutcome" AS ENUM ('VERIFIED', 'NEEDS_REVIEW', 'REJECTED', 'FRAUD_SUSPECTED');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "RepaymentFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BULLET');

-- CreateEnum
CREATE TYPE "ScorecardRecommendation" AS ENUM ('APPROVE_SMALL_LIMIT', 'APPROVE_WITH_GUARANTOR', 'FIELD_REVIEW_REQUIRED', 'SUPERVISOR_REVIEW', 'DECLINE_FOR_NOW');

-- CreateEnum
CREATE TYPE "LoanOfferStatus" AS ENUM ('DRAFT', 'ISSUED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisbursementChannel" AS ENUM ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'AGENT_CASHOUT');

-- CreateEnum
CREATE TYPE "DisbursementStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "LoanAccountStatus" AS ENUM ('PENDING_DISBURSEMENT', 'ACTIVE', 'CLOSED', 'DEFAULTED', 'WRITTEN_OFF', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RepaymentScheduleStatus" AS ENUM ('SCHEDULED', 'DUE', 'PAID', 'PARTIALLY_PAID', 'LATE', 'DEFAULTED', 'WAIVED');

-- CreateEnum
CREATE TYPE "RepaymentChannel" AS ENUM ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'AGENT_COLLECTION');

-- CreateEnum
CREATE TYPE "RepaymentEventStatus" AS ENUM ('POSTED', 'REVERSED', 'FAILED');

-- CreateEnum
CREATE TYPE "DelinquencyStatus" AS ENUM ('OPEN', 'CURED', 'ESCALATED', 'RESTRUCTURED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "CollectionActionType" AS ENUM ('SMS_REMINDER', 'PHONE_CALL', 'WHATSAPP_MESSAGE', 'FIELD_VISIT', 'PROMISE_TO_PAY', 'RESTRUCTURING_PROPOSAL', 'GUARANTOR_CONTACT', 'GROUP_ESCALATION', 'LEGAL_NOTICE', 'WRITE_OFF_RECOMMENDATION');

-- CreateEnum
CREATE TYPE "CollectionActionStatus" AS ENUM ('PLANNED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlternativeDataSourceType" AS ENUM ('MOBILE_MONEY', 'AIRTIME', 'FIELD_DATA', 'CREDIT_BUREAU', 'OCR_DOCUMENT', 'DEVICE_DATA', 'REPAYMENT_HISTORY', 'GROUP_DATA', 'GUARANTOR_DATA');

-- CreateTable
CREATE TABLE "RetailBorrower" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "nationalIdNumber" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "geography" TEXT,
    "address" TEXT,
    "segment" "BorrowerSegment" NOT NULL DEFAULT 'THIN_FILE',
    "status" "BorrowerStatus" NOT NULL DEFAULT 'PROSPECT',
    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycLevel" TEXT,
    "riskFlags" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailBorrower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InformalBusinessProfile" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "businessName" TEXT,
    "activityType" TEXT NOT NULL,
    "sector" TEXT,
    "locationType" TEXT,
    "yearsInActivity" DOUBLE PRECISION,
    "monthlyRevenueEstimate" DOUBLE PRECISION,
    "monthlyExpenseEstimate" DOUBLE PRECISION,
    "seasonalityNotes" TEXT,
    "stockValueEstimate" DOUBLE PRECISION,
    "employeeCount" INTEGER,
    "declaredIncomeSource" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InformalBusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentGrant" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "sourceType" "ConsentSourceType" NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'GRANTED',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "consentTextVersion" TEXT NOT NULL,
    "captureChannel" "ConsentCaptureChannel" NOT NULL,
    "capturedBy" TEXT,
    "evidenceUrl" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ConsentGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicroLoanPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "productType" "MicroLoanProductType" NOT NULL,
    "segment" "BorrowerSegment" NOT NULL,
    "minAmount" DOUBLE PRECISION NOT NULL,
    "maxAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "allowedTenors" JSONB NOT NULL,
    "interestRateMin" DOUBLE PRECISION NOT NULL,
    "interestRateMax" DOUBLE PRECISION NOT NULL,
    "feeRules" JSONB,
    "minScore" DOUBLE PRECISION NOT NULL,
    "maxDebtBurdenRatio" DOUBLE PRECISION,
    "requiresGuarantor" BOOLEAN NOT NULL DEFAULT false,
    "requiresFieldVisit" BOOLEAN NOT NULL DEFAULT true,
    "requiresMobileMoneyConsent" BOOLEAN NOT NULL DEFAULT false,
    "renewalRules" JSONB,
    "progressiveLendingRules" JSONB,
    "coolingOffPeriodDays" INTEGER NOT NULL DEFAULT 0,
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicroLoanPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPolicySnapshot" (
    "id" TEXT NOT NULL,
    "policyId" TEXT,
    "policyName" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "applicationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPolicySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicroLoanApplication" (
    "id" TEXT NOT NULL,
    "reqId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "policyId" TEXT,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "purpose" TEXT,
    "productType" "MicroLoanProductType" NOT NULL DEFAULT 'INDIVIDUAL',
    "segment" "BorrowerSegment" NOT NULL DEFAULT 'THIN_FILE',
    "channel" TEXT,
    "status" "MicroLoanApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicroLoanApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldVisit" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "status" "FieldVisitStatus" NOT NULL DEFAULT 'PLANNED',
    "outcome" "FieldVisitOutcome",
    "visitType" TEXT,
    "assignedToId" TEXT,
    "completedById" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "observations" JSONB,
    "agentConfidenceScore" DOUBLE PRECISION,
    "photos" JSONB,
    "auditMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guarantor" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "guarantorBorrowerId" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "relationship" TEXT,
    "guaranteeType" TEXT,
    "maxLiabilityAmount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guarantor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMembership" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "groupType" TEXT,
    "role" TEXT,
    "joinedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "groupScore" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThinFileScorecard" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "policySnapshotId" TEXT,
    "identityScore" DOUBLE PRECISION NOT NULL,
    "activityStabilityScore" DOUBLE PRECISION NOT NULL,
    "cashflowScore" DOUBLE PRECISION NOT NULL,
    "mobileMoneyScore" DOUBLE PRECISION NOT NULL,
    "repaymentHistoryScore" DOUBLE PRECISION NOT NULL,
    "guarantorGroupScore" DOUBLE PRECISION NOT NULL,
    "fieldConfidenceScore" DOUBLE PRECISION NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "recommendation" "ScorecardRecommendation" NOT NULL,
    "reasonCodes" JSONB NOT NULL,
    "featureSnapshot" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThinFileScorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicroLoanDecision" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "scorecardId" TEXT,
    "policySnapshotId" TEXT,
    "status" "DecisionStatus" NOT NULL DEFAULT 'PENDING',
    "decisionType" TEXT NOT NULL DEFAULT 'HUMAN_IN_THE_LOOP',
    "approvedAmount" DOUBLE PRECISION,
    "tenorDays" INTEGER,
    "interestRate" DOUBLE PRECISION,
    "overrideFlag" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "conditions" JSONB,
    "auditMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicroLoanDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionReason" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "source" TEXT NOT NULL DEFAULT 'SCORECARD',
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanOffer" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "policySnapshotId" TEXT,
    "approvedAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "tenorDays" INTEGER NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "fees" JSONB,
    "repaymentFrequency" "RepaymentFrequency" NOT NULL,
    "requiresGuarantor" BOOLEAN NOT NULL DEFAULT false,
    "requiresCollateral" BOOLEAN NOT NULL DEFAULT false,
    "conditions" JSONB,
    "status" "LoanOfferStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "acceptedBy" TEXT,
    "auditMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disbursement" (
    "id" TEXT NOT NULL,
    "loanOfferId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "loanAccountId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "channel" "DisbursementChannel" NOT NULL,
    "provider" TEXT,
    "providerReference" TEXT,
    "status" "DisbursementStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT,
    "disbursedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "auditMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanAccount" (
    "id" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "loanOfferId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "principalAmount" DOUBLE PRECISION NOT NULL,
    "outstandingPrincipal" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "status" "LoanAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepaymentSchedule" (
    "id" TEXT NOT NULL,
    "loanAccountId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "principalDue" DOUBLE PRECISION NOT NULL,
    "interestDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feesDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDue" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "RepaymentScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepaymentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepaymentEvent" (
    "id" TEXT NOT NULL,
    "loanAccountId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "borrowerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "channel" "RepaymentChannel" NOT NULL,
    "provider" TEXT,
    "providerReference" TEXT,
    "status" "RepaymentEventStatus" NOT NULL DEFAULT 'POSTED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelinquencyEvent" (
    "id" TEXT NOT NULL,
    "loanAccountId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "borrowerId" TEXT NOT NULL,
    "dpd" INTEGER NOT NULL,
    "overdueAmount" DOUBLE PRECISION NOT NULL,
    "status" "DelinquencyStatus" NOT NULL DEFAULT 'OPEN',
    "severity" TEXT NOT NULL DEFAULT 'WATCH',
    "reason" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "curedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DelinquencyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionAction" (
    "id" TEXT NOT NULL,
    "loanAccountId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "delinquencyEventId" TEXT,
    "borrowerId" TEXT NOT NULL,
    "actionType" "CollectionActionType" NOT NULL,
    "status" "CollectionActionStatus" NOT NULL DEFAULT 'PLANNED',
    "assignedToId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "promiseToPayDate" TIMESTAMP(3),
    "promiseToPayAmount" DOUBLE PRECISION,
    "nextActionAt" TIMESTAMP(3),
    "notes" TEXT,
    "auditMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileMoneySnapshot" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "consentGrantId" TEXT,
    "provider" TEXT NOT NULL,
    "walletNumberMasked" TEXT,
    "statementStart" TIMESTAMP(3) NOT NULL,
    "statementEnd" TIMESTAMP(3) NOT NULL,
    "cashInTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashOutTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "activeDays" INTEGER NOT NULL DEFAULT 0,
    "salaryLikeInflows" INTEGER NOT NULL DEFAULT 0,
    "merchantPaymentCount" INTEGER NOT NULL DEFAULT 0,
    "reversalsCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileMoneySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlternativeDataFeatureSnapshot" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "applicationId" TEXT,
    "consentGrantId" TEXT,
    "sourceType" "AlternativeDataSourceType" NOT NULL,
    "featureSchemaVersion" TEXT NOT NULL,
    "payloadQualityScore" DOUBLE PRECISION NOT NULL,
    "rawCount" INTEGER NOT NULL DEFAULT 0,
    "derivedCount" INTEGER NOT NULL DEFAULT 0,
    "imputedCount" INTEGER NOT NULL DEFAULT 0,
    "declaredCount" INTEGER NOT NULL DEFAULT 0,
    "features" JSONB NOT NULL,
    "lineage" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlternativeDataFeatureSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FairnessMetric" (
    "id" TEXT NOT NULL,
    "segment" "BorrowerSegment" NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "filters" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FairnessMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RetailBorrower_externalId_key" ON "RetailBorrower"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "RetailBorrower_phone_key" ON "RetailBorrower"("phone");

-- CreateIndex
CREATE INDEX "RetailBorrower_segment_status_idx" ON "RetailBorrower"("segment", "status");

-- CreateIndex
CREATE INDEX "RetailBorrower_phone_idx" ON "RetailBorrower"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "InformalBusinessProfile_borrowerId_key" ON "InformalBusinessProfile"("borrowerId");

-- CreateIndex
CREATE INDEX "ConsentGrant_borrowerId_sourceType_purpose_status_idx" ON "ConsentGrant"("borrowerId", "sourceType", "purpose", "status");

-- CreateIndex
CREATE INDEX "MicroLoanPolicy_productType_segment_status_idx" ON "MicroLoanPolicy"("productType", "segment", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MicroLoanPolicy_name_version_key" ON "MicroLoanPolicy"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPolicySnapshot_applicationId_key" ON "ProductPolicySnapshot"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "MicroLoanApplication_reqId_key" ON "MicroLoanApplication"("reqId");

-- CreateIndex
CREATE INDEX "MicroLoanApplication_borrowerId_status_idx" ON "MicroLoanApplication"("borrowerId", "status");

-- CreateIndex
CREATE INDEX "MicroLoanApplication_segment_productType_status_idx" ON "MicroLoanApplication"("segment", "productType", "status");

-- CreateIndex
CREATE INDEX "FieldVisit_applicationId_status_idx" ON "FieldVisit"("applicationId", "status");

-- CreateIndex
CREATE INDEX "FieldVisit_borrowerId_status_idx" ON "FieldVisit"("borrowerId", "status");

-- CreateIndex
CREATE INDEX "Guarantor_applicationId_idx" ON "Guarantor"("applicationId");

-- CreateIndex
CREATE INDEX "Guarantor_borrowerId_idx" ON "Guarantor"("borrowerId");

-- CreateIndex
CREATE INDEX "GroupMembership_borrowerId_active_idx" ON "GroupMembership"("borrowerId", "active");

-- CreateIndex
CREATE INDEX "ThinFileScorecard_applicationId_createdAt_idx" ON "ThinFileScorecard"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ThinFileScorecard_borrowerId_createdAt_idx" ON "ThinFileScorecard"("borrowerId", "createdAt");

-- CreateIndex
CREATE INDEX "MicroLoanDecision_applicationId_createdAt_idx" ON "MicroLoanDecision"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "MicroLoanDecision_borrowerId_status_idx" ON "MicroLoanDecision"("borrowerId", "status");

-- CreateIndex
CREATE INDEX "LoanOffer_applicationId_status_idx" ON "LoanOffer"("applicationId", "status");

-- CreateIndex
CREATE INDEX "LoanOffer_borrowerId_status_idx" ON "LoanOffer"("borrowerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Disbursement_loanAccountId_key" ON "Disbursement"("loanAccountId");

-- CreateIndex
CREATE INDEX "Disbursement_loanOfferId_status_idx" ON "Disbursement"("loanOfferId", "status");

-- CreateIndex
CREATE INDEX "Disbursement_borrowerId_status_idx" ON "Disbursement"("borrowerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LoanAccount_accountNumber_key" ON "LoanAccount"("accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LoanAccount_loanOfferId_key" ON "LoanAccount"("loanOfferId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanAccount_applicationId_key" ON "LoanAccount"("applicationId");

-- CreateIndex
CREATE INDEX "LoanAccount_borrowerId_status_idx" ON "LoanAccount"("borrowerId", "status");

-- CreateIndex
CREATE INDEX "RepaymentSchedule_loanAccountId_dueDate_status_idx" ON "RepaymentSchedule"("loanAccountId", "dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RepaymentSchedule_loanAccountId_installmentNumber_key" ON "RepaymentSchedule"("loanAccountId", "installmentNumber");

-- CreateIndex
CREATE INDEX "RepaymentEvent_loanAccountId_receivedAt_idx" ON "RepaymentEvent"("loanAccountId", "receivedAt");

-- CreateIndex
CREATE INDEX "RepaymentEvent_borrowerId_receivedAt_idx" ON "RepaymentEvent"("borrowerId", "receivedAt");

-- CreateIndex
CREATE INDEX "DelinquencyEvent_loanAccountId_status_idx" ON "DelinquencyEvent"("loanAccountId", "status");

-- CreateIndex
CREATE INDEX "DelinquencyEvent_borrowerId_status_idx" ON "DelinquencyEvent"("borrowerId", "status");

-- CreateIndex
CREATE INDEX "CollectionAction_loanAccountId_status_idx" ON "CollectionAction"("loanAccountId", "status");

-- CreateIndex
CREATE INDEX "CollectionAction_borrowerId_status_idx" ON "CollectionAction"("borrowerId", "status");

-- CreateIndex
CREATE INDEX "CollectionAction_delinquencyEventId_idx" ON "CollectionAction"("delinquencyEventId");

-- CreateIndex
CREATE INDEX "MobileMoneySnapshot_borrowerId_capturedAt_idx" ON "MobileMoneySnapshot"("borrowerId", "capturedAt");

-- CreateIndex
CREATE INDEX "MobileMoneySnapshot_consentGrantId_idx" ON "MobileMoneySnapshot"("consentGrantId");

-- CreateIndex
CREATE INDEX "AlternativeDataFeatureSnapshot_borrowerId_sourceType_create_idx" ON "AlternativeDataFeatureSnapshot"("borrowerId", "sourceType", "createdAt");

-- CreateIndex
CREATE INDEX "AlternativeDataFeatureSnapshot_applicationId_idx" ON "AlternativeDataFeatureSnapshot"("applicationId");

-- CreateIndex
CREATE INDEX "FairnessMetric_segment_metricName_windowEnd_idx" ON "FairnessMetric"("segment", "metricName", "windowEnd");

-- AddForeignKey
ALTER TABLE "InformalBusinessProfile" ADD CONSTRAINT "InformalBusinessProfile_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "RetailBorrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentGrant" ADD CONSTRAINT "ConsentGrant_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "RetailBorrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPolicySnapshot" ADD CONSTRAINT "ProductPolicySnapshot_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "MicroLoanPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPolicySnapshot" ADD CONSTRAINT "ProductPolicySnapshot_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MicroLoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroLoanApplication" ADD CONSTRAINT "MicroLoanApplication_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "RetailBorrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroLoanApplication" ADD CONSTRAINT "MicroLoanApplication_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "MicroLoanPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldVisit" ADD CONSTRAINT "FieldVisit_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MicroLoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldVisit" ADD CONSTRAINT "FieldVisit_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "RetailBorrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guarantor" ADD CONSTRAINT "Guarantor_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MicroLoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guarantor" ADD CONSTRAINT "Guarantor_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "RetailBorrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guarantor" ADD CONSTRAINT "Guarantor_guarantorBorrowerId_fkey" FOREIGN KEY ("guarantorBorrowerId") REFERENCES "RetailBorrower"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "RetailBorrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinFileScorecard" ADD CONSTRAINT "ThinFileScorecard_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MicroLoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinFileScorecard" ADD CONSTRAINT "ThinFileScorecard_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "RetailBorrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinFileScorecard" ADD CONSTRAINT "ThinFileScorecard_policySnapshotId_fkey" FOREIGN KEY ("policySnapshotId") REFERENCES "ProductPolicySnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroLoanDecision" ADD CONSTRAINT "MicroLoanDecision_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MicroLoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroLoanDecision" ADD CONSTRAINT "MicroLoanDecision_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "RetailBorrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroLoanDecision" ADD CONSTRAINT "MicroLoanDecision_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "ThinFileScorecard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroLoanDecision" ADD CONSTRAINT "MicroLoanDecision_policySnapshotId_fkey" FOREIGN KEY ("policySnapshotId") REFERENCES "ProductPolicySnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionReason" ADD CONSTRAINT "DecisionReason_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "MicroLoanDecision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanOffer" ADD CONSTRAINT "LoanOffer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MicroLoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanOffer" ADD CONSTRAINT "LoanOffer_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "RetailBorrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanOffer" ADD CONSTRAINT "LoanOffer_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "MicroLoanDecision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanOffer" ADD CONSTRAINT "LoanOffer_policySnapshotId_fkey" FOREIGN KEY ("policySnapshotId") REFERENCES "ProductPolicySnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_loanOfferId_fkey" FOREIGN KEY ("loanOfferId") REFERENCES "LoanOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MicroLoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "RetailBorrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_loanAccountId_fkey" FOREIGN KEY ("loanAccountId") REFERENCES "LoanAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanAccount" ADD CONSTRAINT "LoanAccount_loanOfferId_fkey" FOREIGN KEY ("loanOfferId") REFERENCES "LoanOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanAccount" ADD CONSTRAINT "LoanAccount_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MicroLoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanAccount" ADD CONSTRAINT "LoanAccount_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "RetailBorrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepaymentSchedule" ADD CONSTRAINT "RepaymentSchedule_loanAccountId_fkey" FOREIGN KEY ("loanAccountId") REFERENCES "LoanAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepaymentEvent" ADD CONSTRAINT "RepaymentEvent_loanAccountId_fkey" FOREIGN KEY ("loanAccountId") REFERENCES "LoanAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepaymentEvent" ADD CONSTRAINT "RepaymentEvent_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "RepaymentSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepaymentEvent" ADD CONSTRAINT "RepaymentEvent_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "RetailBorrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelinquencyEvent" ADD CONSTRAINT "DelinquencyEvent_loanAccountId_fkey" FOREIGN KEY ("loanAccountId") REFERENCES "LoanAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelinquencyEvent" ADD CONSTRAINT "DelinquencyEvent_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "RepaymentSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelinquencyEvent" ADD CONSTRAINT "DelinquencyEvent_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "RetailBorrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAction" ADD CONSTRAINT "CollectionAction_loanAccountId_fkey" FOREIGN KEY ("loanAccountId") REFERENCES "LoanAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAction" ADD CONSTRAINT "CollectionAction_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "RepaymentSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAction" ADD CONSTRAINT "CollectionAction_delinquencyEventId_fkey" FOREIGN KEY ("delinquencyEventId") REFERENCES "DelinquencyEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAction" ADD CONSTRAINT "CollectionAction_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "RetailBorrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileMoneySnapshot" ADD CONSTRAINT "MobileMoneySnapshot_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "RetailBorrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileMoneySnapshot" ADD CONSTRAINT "MobileMoneySnapshot_consentGrantId_fkey" FOREIGN KEY ("consentGrantId") REFERENCES "ConsentGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlternativeDataFeatureSnapshot" ADD CONSTRAINT "AlternativeDataFeatureSnapshot_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "RetailBorrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlternativeDataFeatureSnapshot" ADD CONSTRAINT "AlternativeDataFeatureSnapshot_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MicroLoanApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlternativeDataFeatureSnapshot" ADD CONSTRAINT "AlternativeDataFeatureSnapshot_consentGrantId_fkey" FOREIGN KEY ("consentGrantId") REFERENCES "ConsentGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
