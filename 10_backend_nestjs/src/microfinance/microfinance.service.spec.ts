import { BadRequestException } from '@nestjs/common';
import {
  AlternativeDataSourceType,
  BorrowerSegment,
  CollectionActionType,
  ConsentCaptureChannel,
  ConsentPurpose,
  ConsentSourceType,
  DecisionStatus,
  DisbursementChannel,
  DisbursementStatus,
  FieldVisitOutcome,
  FieldVisitStatus,
  LoanOfferStatus,
  MicroLoanProductType,
  PolicyStatus,
  RepaymentChannel,
  RepaymentFrequency,
  RepaymentScheduleStatus,
} from '@prisma/client';
import { MicrofinanceService } from './microfinance.service';

const actor = { id: 'user-manager', role: 'MANAGER' } as any;

const activePolicy = {
  id: 'policy-1',
  name: 'Informal Trader Starter Loan',
  version: 'v1.0.0',
  productType: MicroLoanProductType.INDIVIDUAL,
  segment: BorrowerSegment.INFORMAL,
  minAmount: 25_000,
  maxAmount: 250_000,
  currency: 'XAF',
  allowedTenors: [30, 60, 90],
  interestRateMin: 2.5,
  interestRateMax: 5.5,
  feeRules: { processingFeePct: 1 },
  minScore: 60,
  maxDebtBurdenRatio: 0.35,
  requiresGuarantor: true,
  requiresFieldVisit: true,
  requiresMobileMoneyConsent: true,
  renewalRules: { minOnTimeRepayments: 2 },
  progressiveLendingRules: { maxIncreasePct: 50 },
  coolingOffPeriodDays: 7,
  status: PolicyStatus.ACTIVE,
  approvedBy: 'cro-1',
  approvedAt: new Date(),
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const borrower = {
  id: 'borrower-1',
  fullName: 'Amina Informal Trader',
  phone: '+237600000000',
  nationalIdNumber: 'CNI-001',
  identityVerified: true,
  segment: BorrowerSegment.INFORMAL,
  informalBusinessProfile: {
    yearsInActivity: 3,
    monthlyRevenueEstimate: 180_000,
    monthlyExpenseEstimate: 80_000,
  },
  consents: [{ id: 'consent-mm', sourceType: ConsentSourceType.MOBILE_MONEY, status: 'GRANTED', expiresAt: null }],
  groupMemberships: [{ id: 'group-1', active: true }],
  mobileMoneySnapshots: [{ id: 'momo-1', activeDays: 24, transactionCount: 42 }],
  loanAccounts: [],
};

describe('MicrofinanceService', () => {
  let service: MicrofinanceService;
  let prisma: any;
  let audit: any;
  let tx: any;

  beforeEach(() => {
    tx = {
      loanAccount: { create: jest.fn() },
      disbursement: { update: jest.fn() },
      repaymentEvent: { create: jest.fn() },
      repaymentSchedule: { update: jest.fn() },
      loanAccount: { create: jest.fn(), update: jest.fn() },
    };

    prisma = {
      retailBorrower: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(borrower),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      consentGrant: { create: jest.fn(), findFirst: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn() },
      microLoanPolicy: { create: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
      microLoanApplication: { create: jest.fn(), update: jest.fn(), findUniqueOrThrow: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      productPolicySnapshot: { create: jest.fn() },
      fieldVisit: { create: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn() },
      thinFileScorecard: { create: jest.fn() },
      microLoanDecision: { create: jest.fn(), findUniqueOrThrow: jest.fn() },
      loanOffer: { create: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn() },
      disbursement: { create: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn() },
      loanAccount: { findUniqueOrThrow: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      repaymentSchedule: { update: jest.fn(), findUniqueOrThrow: jest.fn() },
      repaymentEvent: { create: jest.fn() },
      delinquencyEvent: { create: jest.fn(), findUniqueOrThrow: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
      collectionAction: { create: jest.fn(), count: jest.fn() },
      mobileMoneySnapshot: { create: jest.fn() },
      alternativeDataFeatureSnapshot: { create: jest.fn() },
      disbursementAggregate: { aggregate: jest.fn() },
      $transaction: jest.fn((arg: any) => Array.isArray(arg) ? Promise.all(arg) : arg(tx)),
    };
    prisma.disbursement.aggregate = jest.fn();

    audit = { log: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    service = new MicrofinanceService(prisma, audit);
    jest.clearAllMocks();
  });

  it('creates granular consent grants and writes audit trail', async () => {
    prisma.consentGrant.create.mockResolvedValue({ id: 'consent-1', sourceType: ConsentSourceType.MOBILE_MONEY, purpose: ConsentPurpose.UNDERWRITING });

    const result = await service.grantConsent('borrower-1', {
      sourceType: ConsentSourceType.MOBILE_MONEY,
      purpose: ConsentPurpose.UNDERWRITING,
      consentTextVersion: 'v1.0.0',
      captureChannel: ConsentCaptureChannel.FIELD_AGENT,
    }, actor);

    expect(result.id).toBe('consent-1');
    expect(prisma.consentGrant.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ borrowerId: 'borrower-1', sourceType: ConsentSourceType.MOBILE_MONEY, purpose: ConsentPurpose.UNDERWRITING }),
    }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'MICRO_CONSENT_GRANTED' }));
  });

  it('creates and activates governable microloan policies', async () => {
    prisma.microLoanPolicy.create.mockResolvedValue(activePolicy);
    prisma.microLoanPolicy.findUniqueOrThrow.mockResolvedValue({ ...activePolicy, status: PolicyStatus.DRAFT });
    prisma.microLoanPolicy.update.mockResolvedValue(activePolicy);

    const created = await service.createPolicy({
      name: activePolicy.name,
      version: activePolicy.version,
      productType: activePolicy.productType,
      segment: activePolicy.segment,
      minAmount: activePolicy.minAmount,
      maxAmount: activePolicy.maxAmount,
      allowedTenors: activePolicy.allowedTenors,
      interestRateMin: activePolicy.interestRateMin,
      interestRateMax: activePolicy.interestRateMax,
      minScore: activePolicy.minScore,
      status: PolicyStatus.ACTIVE,
    }, actor);
    const activated = await service.activatePolicy('policy-1', actor);

    expect(created.status).toBe(PolicyStatus.ACTIVE);
    expect(activated.status).toBe(PolicyStatus.ACTIVE);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'MICRO_POLICY_ACTIVATED' }));
  });

  it('creates applications only when required alternative-data consent exists', async () => {
    prisma.microLoanPolicy.findFirst.mockResolvedValue(activePolicy);
    prisma.consentGrant.findFirst.mockResolvedValue({ id: 'consent-mm' });
    prisma.microLoanApplication.create.mockResolvedValue({ id: 'app-1', borrowerId: 'borrower-1' });
    prisma.microLoanApplication.findUniqueOrThrow.mockResolvedValue({ id: 'app-1', borrower, policy: activePolicy });

    const result = await service.createApplication({ borrowerId: 'borrower-1', requestedAmount: 100_000 }, actor);

    expect(result.id).toBe('app-1');
    expect(prisma.productPolicySnapshot.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ applicationId: 'app-1', policyName: activePolicy.name }),
    }));
  });

  it('blocks application origination when no active policy matches', async () => {
    prisma.microLoanPolicy.findFirst.mockResolvedValue(null);

    await expect(service.createApplication({ borrowerId: 'borrower-1', requestedAmount: 100_000 }, actor))
      .rejects.toThrow(BadRequestException);
  });

  it('blocks mobile money snapshots when granular consent is missing', async () => {
    prisma.consentGrant.findFirst.mockResolvedValue(null);

    await expect(service.createMobileMoneySnapshot({
      borrowerId: 'borrower-1',
      provider: 'MTN_MOMO',
      statementStart: '2026-01-01T00:00:00.000Z',
      statementEnd: '2026-03-31T00:00:00.000Z',
    }, actor)).rejects.toThrow(BadRequestException);
  });

  it('runs the thin-file scorecard after field underwriting', async () => {
    prisma.microLoanApplication.findUniqueOrThrow.mockResolvedValue({
      id: 'app-1',
      requestedAmount: 100_000,
      borrowerId: 'borrower-1',
      borrower,
      policySnapshot: { id: 'snapshot-1', snapshot: activePolicy },
      fieldVisits: [{ id: 'visit-1', status: FieldVisitStatus.COMPLETED, agentConfidenceScore: 80 }],
      guarantors: [{ id: 'guarantor-1' }],
    });
    prisma.thinFileScorecard.create.mockResolvedValue({ id: 'score-1', totalScore: 92, recommendation: 'APPROVE_SMALL_LIMIT' });
    prisma.microLoanApplication.update.mockResolvedValue({});

    const scorecard = await service.runScorecard('app-1', actor);

    expect(scorecard.id).toBe('score-1');
    expect(prisma.thinFileScorecard.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ applicationId: 'app-1', policySnapshotId: 'snapshot-1' }),
    }));
  });

  it('requires accepted offers before disbursement', async () => {
    prisma.loanOffer.findUniqueOrThrow.mockResolvedValue({ id: 'offer-1', status: LoanOfferStatus.ISSUED, disbursements: [] });

    await expect(service.createDisbursement('offer-1', { channel: DisbursementChannel.MOBILE_MONEY }, actor))
      .rejects.toThrow(BadRequestException);
  });

  it('blocks loan offers that exceed approved decision terms', async () => {
    prisma.microLoanDecision.findUniqueOrThrow.mockResolvedValue({
      id: 'decision-1',
      applicationId: 'app-1',
      borrowerId: 'borrower-1',
      policySnapshotId: 'snapshot-1',
      status: DecisionStatus.APPROVE,
      approvedAmount: 100_000,
      tenorDays: 30,
      interestRate: 4,
      application: { currency: 'XAF' },
      policySnapshot: { snapshot: activePolicy },
      conditions: {},
    });

    await expect(service.createOffer('decision-1', { approvedAmount: 120_000 }, actor))
      .rejects.toThrow(BadRequestException);
  });

  it('creates loan accounts and repayment schedules after successful disbursement', async () => {
    const offer = {
      id: 'offer-1',
      applicationId: 'app-1',
      borrowerId: 'borrower-1',
      approvedAmount: 120_000,
      currency: 'XAF',
      tenorDays: 30,
      interestRate: 4,
      repaymentFrequency: RepaymentFrequency.WEEKLY,
    };
    prisma.disbursement.findUniqueOrThrow.mockResolvedValue({
      id: 'disb-1',
      loanOfferId: offer.id,
      applicationId: offer.applicationId,
      borrowerId: offer.borrowerId,
      amount: offer.approvedAmount,
      currency: offer.currency,
      status: DisbursementStatus.PENDING,
      providerReference: null,
      loanAccountId: null,
      loanOffer: offer,
    });
    tx.loanAccount.create.mockImplementation((args: any) => Promise.resolve({
      id: 'loan-1',
      repaymentSchedules: args.data.repaymentSchedules.create,
    }));
    tx.disbursement.update.mockResolvedValue({ id: 'disb-1', status: DisbursementStatus.SUCCESS, loanAccountId: 'loan-1' });

    const result = await service.completeDisbursement('disb-1', { status: DisbursementStatus.SUCCESS }, actor);

    expect(result.account.id).toBe('loan-1');
    expect(result.account.repaymentSchedules.length).toBeGreaterThan(1);
    expect(tx.disbursement.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: DisbursementStatus.SUCCESS, loanAccountId: 'loan-1' }),
    }));
  });

  it('records repayment events and updates schedule/account balances', async () => {
    prisma.loanAccount.findUniqueOrThrow.mockResolvedValue({
      id: 'loan-1',
      borrowerId: 'borrower-1',
      currency: 'XAF',
      outstandingPrincipal: 100_000,
      status: 'ACTIVE',
      repaymentSchedules: [{ id: 'sch-1', amountPaid: 0, totalDue: 25_000, principalDue: 25_000, interestDue: 0, feesDue: 0, status: RepaymentScheduleStatus.SCHEDULED }],
    });
    tx.repaymentEvent.create.mockResolvedValue({ id: 'repay-1' });
    tx.repaymentSchedule.update.mockResolvedValue({ id: 'sch-1', status: RepaymentScheduleStatus.PAID });
    tx.loanAccount.update.mockResolvedValue({ id: 'loan-1', outstandingPrincipal: 75_000 });

    const result = await service.recordRepayment('loan-1', { amount: 25_000, channel: RepaymentChannel.MOBILE_MONEY }, actor);

    expect(result.event.id).toBe('repay-1');
    expect(result.schedule.status).toBe(RepaymentScheduleStatus.PAID);
    expect(result.account.outstandingPrincipal).toBe(75_000);
  });

  it('opens delinquency events and creates collection actions', async () => {
    prisma.loanAccount.findUniqueOrThrow.mockResolvedValue({ id: 'loan-1', borrowerId: 'borrower-1' });
    prisma.repaymentSchedule.findUniqueOrThrow.mockResolvedValue({ id: 'sch-1', loanAccountId: 'loan-1' });
    prisma.delinquencyEvent.findFirst.mockResolvedValue(null);
    prisma.delinquencyEvent.create.mockResolvedValue({ id: 'delq-1', loanAccountId: 'loan-1', borrowerId: 'borrower-1', scheduleId: 'sch-1' });
    prisma.repaymentSchedule.update.mockResolvedValue({});
    prisma.delinquencyEvent.findUniqueOrThrow.mockResolvedValue({ id: 'delq-1', loanAccountId: 'loan-1', borrowerId: 'borrower-1', scheduleId: 'sch-1' });
    prisma.collectionAction.create.mockResolvedValue({ id: 'coll-1', actionType: CollectionActionType.PHONE_CALL });

    const delinquency = await service.openDelinquency('loan-1', { scheduleId: 'sch-1', dpd: 12, overdueAmount: 20_000 }, actor);
    const action = await service.createCollectionAction(delinquency.id, { actionType: CollectionActionType.PHONE_CALL }, actor);

    expect(delinquency.id).toBe('delq-1');
    expect(action.id).toBe('coll-1');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'MICRO_COLLECTION_ACTION_CREATED' }));
  });

  it('enforces consent for alternative data feature snapshots', async () => {
    prisma.consentGrant.findFirst.mockResolvedValue(null);

    await expect(service.createAlternativeDataFeatureSnapshot({
      borrowerId: 'borrower-1',
      sourceType: AlternativeDataSourceType.MOBILE_MONEY,
      featureSchemaVersion: 'alt-v1',
      payloadQualityScore: 82,
      features: { walletActivityScore: 0.8 },
      lineage: { raw: ['cashInTotal'], derived: ['walletActivityScore'], imputed: [] },
    }, actor)).rejects.toThrow(BadRequestException);

    prisma.consentGrant.findFirst.mockResolvedValue({ id: 'consent-mm' });
    prisma.alternativeDataFeatureSnapshot.create.mockResolvedValue({ id: 'alt-1', payloadQualityScore: 82 });

    const snapshot = await service.createAlternativeDataFeatureSnapshot({
      borrowerId: 'borrower-1',
      sourceType: AlternativeDataSourceType.MOBILE_MONEY,
      featureSchemaVersion: 'alt-v1',
      payloadQualityScore: 82,
      features: { walletActivityScore: 0.8 },
      lineage: { raw: ['cashInTotal'], derived: ['walletActivityScore'], imputed: [] },
    }, actor);

    expect(snapshot.id).toBe('alt-1');
  });
});
