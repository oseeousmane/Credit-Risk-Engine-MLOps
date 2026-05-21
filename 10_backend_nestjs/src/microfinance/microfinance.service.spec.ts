import { BadRequestException } from '@nestjs/common';
import {
  AlternativeDataSourceType,
  BorrowerSegment,
  BorrowerStatus,
  CollectionActionType,
  ConsentCaptureChannel,
  ConsentPurpose,
  ConsentSourceType,
  DecisionStatus,
  DisbursementChannel,
  DisbursementStatus,
  FieldVisitOutcome,
  FieldVisitStatus,
  LoanAccountStatus,
  LoanOfferStatus,
  MicroLoanApplicationStatus,
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
  consents: [
    {
      id: 'consent-mm',
      sourceType: ConsentSourceType.MOBILE_MONEY,
      status: 'GRANTED',
      expiresAt: null,
    },
  ],
  groupMemberships: [{ id: 'group-1', active: true }],
  mobileMoneySnapshots: [
    { id: 'momo-1', activeDays: 24, transactionCount: 42 },
  ],
  loanAccounts: [],
};

describe('MicrofinanceService', () => {
  let service: MicrofinanceService;
  let prisma: any;
  let audit: any;
  let mobileMoney: any;
  let tx: any;

  beforeEach(() => {
    mobileMoney = {
      processCollection: jest.fn().mockResolvedValue({ status: 'SUCCESS', transactionId: 'mm-tx-1' }),
    };

    tx = {
      loanAccount: { create: jest.fn(), update: jest.fn() },
      disbursement: { update: jest.fn() },
      repaymentEvent: { create: jest.fn() },
      repaymentSchedule: { update: jest.fn() },
      delinquencyEvent: {
        updateMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    prisma = {
      retailBorrower: {
        findUnique: jest.fn().mockResolvedValue(borrower),
        findUniqueOrThrow: jest.fn().mockResolvedValue(borrower),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      consentGrant: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      microLoanPolicy: {
        create: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      microLoanApplication: {
        create: jest.fn(),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      productPolicySnapshot: { create: jest.fn() },
      fieldVisit: {
        create: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      thinFileScorecard: { create: jest.fn() },
      microLoanDecision: {
        create: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        count: jest.fn(),
      },
      loanOffer: {
        create: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      disbursement: {
        create: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      loanAccount: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      repaymentSchedule: {
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn(),
      },
      repaymentEvent: { create: jest.fn() },
      delinquencyEvent: {
        create: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      collectionAction: {
        create: jest.fn(),
        count: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      mobileMoneySnapshot: { create: jest.fn() },
      transactionRecord: { create: jest.fn().mockResolvedValue({ id: 'txrec-1' }) },
      alternativeDataFeatureSnapshot: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      fairnessMetric: { createMany: jest.fn() },
      $transaction: jest.fn((arg: any) =>
        Array.isArray(arg) ? Promise.all(arg) : arg(tx),
      ),
    };

    audit = { log: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    service = new MicrofinanceService(prisma, audit, mobileMoney);
    jest.clearAllMocks();
  });

  it('creates granular consent grants and writes audit trail', async () => {
    prisma.consentGrant.create.mockResolvedValue({
      id: 'consent-1',
      sourceType: ConsentSourceType.MOBILE_MONEY,
      purpose: ConsentPurpose.UNDERWRITING,
    });

    const result = await service.grantConsent(
      'borrower-1',
      {
        sourceType: ConsentSourceType.MOBILE_MONEY,
        purpose: ConsentPurpose.UNDERWRITING,
        consentTextVersion: 'v1.0.0',
        captureChannel: ConsentCaptureChannel.FIELD_AGENT,
      },
      actor,
    );

    expect(result.id).toBe('consent-1');
    expect(prisma.consentGrant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          borrowerId: 'borrower-1',
          sourceType: ConsentSourceType.MOBILE_MONEY,
          purpose: ConsentPurpose.UNDERWRITING,
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'MICRO_CONSENT_GRANTED' }),
    );
  });

  it('revokes consent and writes audit trail', async () => {
    prisma.consentGrant.findUniqueOrThrow.mockResolvedValue({
      id: 'consent-1',
      status: 'GRANTED',
    });
    prisma.consentGrant.update.mockResolvedValue({
      id: 'consent-1',
      status: 'REVOKED',
      revokedAt: new Date(),
    });

    const result = await service.revokeConsent('consent-1', actor);
    expect(result.status).toBe('REVOKED');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'MICRO_CONSENT_REVOKED' }),
    );
  });

  it('creates and activates governable microloan policies', async () => {
    prisma.microLoanPolicy.create.mockResolvedValue(activePolicy);
    prisma.microLoanPolicy.findUniqueOrThrow.mockResolvedValue({
      ...activePolicy,
      status: PolicyStatus.DRAFT,
    });
    prisma.microLoanPolicy.update.mockResolvedValue(activePolicy);

    const created = await service.createPolicy(
      {
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
      },
      actor,
    );
    const activated = await service.activatePolicy('policy-1', actor);

    expect(created.status).toBe(PolicyStatus.ACTIVE);
    expect(activated.status).toBe(PolicyStatus.ACTIVE);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'MICRO_POLICY_ACTIVATED' }),
    );
  });

  it('creates applications only when required alternative-data consent exists', async () => {
    prisma.microLoanPolicy.findFirst.mockResolvedValue(activePolicy);
    prisma.consentGrant.findFirst.mockResolvedValue({ id: 'consent-mm' });
    prisma.microLoanApplication.create.mockResolvedValue({
      id: 'app-1',
      borrowerId: 'borrower-1',
    });
    prisma.microLoanApplication.findUniqueOrThrow.mockResolvedValue({
      id: 'app-1',
      borrower,
      policy: activePolicy,
    });

    const result = await service.createApplication(
      { borrowerId: 'borrower-1', requestedAmount: 100_000 },
      actor,
    );

    expect(result.id).toBe('app-1');
    expect(prisma.productPolicySnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          applicationId: 'app-1',
          policyName: activePolicy.name,
        }),
      }),
    );
  });

  it('blocks application origination when no active policy matches', async () => {
    prisma.microLoanPolicy.findFirst.mockResolvedValue(null);

    await expect(
      service.createApplication(
        { borrowerId: 'borrower-1', requestedAmount: 100_000 },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks mobile money snapshots when granular consent is missing', async () => {
    prisma.consentGrant.findFirst.mockResolvedValue(null);

    await expect(
      service.createMobileMoneySnapshot(
        {
          borrowerId: 'borrower-1',
          provider: 'MTN_MOMO',
          statementStart: '2026-01-01T00:00:00.000Z',
          statementEnd: '2026-03-31T00:00:00.000Z',
        },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('runs the thin-file scorecard after field underwriting', async () => {
    prisma.microLoanApplication.findUniqueOrThrow.mockResolvedValue({
      id: 'app-1',
      requestedAmount: 100_000,
      borrowerId: 'borrower-1',
      borrower,
      policySnapshot: { id: 'snapshot-1', snapshot: activePolicy },
      fieldVisits: [
        {
          id: 'visit-1',
          status: FieldVisitStatus.COMPLETED,
          agentConfidenceScore: 80,
        },
      ],
      guarantors: [{ id: 'guarantor-1' }],
    });
    prisma.thinFileScorecard.create.mockResolvedValue({
      id: 'score-1',
      totalScore: 92,
      recommendation: 'APPROVE_SMALL_LIMIT',
    });
    prisma.microLoanApplication.update.mockResolvedValue({});

    const scorecard = await service.runScorecard('app-1', actor);

    expect(scorecard.id).toBe('score-1');
    expect(prisma.thinFileScorecard.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          applicationId: 'app-1',
          policySnapshotId: 'snapshot-1',
        }),
      }),
    );
  });

  it('requires accepted offers before disbursement', async () => {
    prisma.loanOffer.findUniqueOrThrow.mockResolvedValue({
      id: 'offer-1',
      status: LoanOfferStatus.ISSUED,
      disbursements: [],
    });

    await expect(
      service.createDisbursement(
        'offer-1',
        { channel: DisbursementChannel.MOBILE_MONEY },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
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

    await expect(
      service.createOffer('decision-1', { approvedAmount: 120_000 }, actor),
    ).rejects.toThrow(BadRequestException);
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
    tx.loanAccount.create.mockImplementation((args: any) =>
      Promise.resolve({
        id: 'loan-1',
        repaymentSchedules: args.data.repaymentSchedules.create,
      }),
    );
    tx.disbursement.update.mockResolvedValue({
      id: 'disb-1',
      status: DisbursementStatus.SUCCESS,
      loanAccountId: 'loan-1',
    });

    const result = await service.completeDisbursement(
      'disb-1',
      { status: DisbursementStatus.SUCCESS },
      actor,
    );

    expect((result as any).account.id).toBe('loan-1');
    expect((result as any).account.repaymentSchedules.length).toBeGreaterThan(
      1,
    );
    expect(tx.disbursement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: DisbursementStatus.SUCCESS,
          loanAccountId: 'loan-1',
        }),
      }),
    );
  });

  it('records repayment events and updates schedule/account balances', async () => {
    prisma.loanAccount.findUniqueOrThrow.mockResolvedValue({
      id: 'loan-1',
      borrowerId: 'borrower-1',
      currency: 'XAF',
      outstandingPrincipal: 100_000,
      status: LoanAccountStatus.ACTIVE,
      repaymentSchedules: [
        {
          id: 'sch-1',
          amountPaid: 0,
          totalDue: 25_000,
          principalDue: 25_000,
          interestDue: 0,
          feesDue: 0,
          status: RepaymentScheduleStatus.SCHEDULED,
        },
      ],
      delinquencyEvents: [],
    });
    tx.repaymentEvent.create.mockResolvedValue({ id: 'repay-1' });
    tx.repaymentSchedule.update.mockResolvedValue({
      id: 'sch-1',
      status: RepaymentScheduleStatus.PAID,
    });
    tx.loanAccount.update.mockResolvedValue({
      id: 'loan-1',
      outstandingPrincipal: 75_000,
      status: LoanAccountStatus.ACTIVE,
    });

    const result = await service.recordRepayment(
      'loan-1',
      { amount: 25_000, channel: RepaymentChannel.MOBILE_MONEY },
      actor,
    );

    expect(result.event.id).toBe('repay-1');
    expect(result.schedule.status).toBe(RepaymentScheduleStatus.PAID);
    expect(result.account.outstandingPrincipal).toBe(75_000);
  });

  it('reconciles delinquency when repayment cures overdue schedule', async () => {
    const delinquency = {
      id: 'delq-1',
      scheduleId: 'sch-1',
      loanAccountId: 'loan-1',
      status: 'OPEN',
      dpd: 15,
    };
    prisma.loanAccount.findUniqueOrThrow.mockResolvedValue({
      id: 'loan-1',
      borrowerId: 'borrower-1',
      currency: 'XAF',
      outstandingPrincipal: 100_000,
      status: LoanAccountStatus.ACTIVE,
      repaymentSchedules: [
        {
          id: 'sch-1',
          amountPaid: 0,
          totalDue: 25_000,
          principalDue: 25_000,
          interestDue: 0,
          feesDue: 0,
          status: RepaymentScheduleStatus.LATE,
        },
      ],
      delinquencyEvents: [delinquency],
    });
    tx.repaymentEvent.create.mockResolvedValue({ id: 'repay-1' });
    tx.repaymentSchedule.update.mockResolvedValue({
      id: 'sch-1',
      status: RepaymentScheduleStatus.PAID,
    });
    tx.delinquencyEvent.update.mockResolvedValue({
      id: 'delq-1',
      status: 'CURED',
    });
    tx.loanAccount.update.mockResolvedValue({
      id: 'loan-1',
      outstandingPrincipal: 75_000,
      status: LoanAccountStatus.ACTIVE,
    });
    tx.delinquencyEvent.count.mockResolvedValue(0);

    const result = await service.recordRepayment(
      'loan-1',
      { amount: 25_000, channel: RepaymentChannel.MOBILE_MONEY },
      actor,
    );

    expect(result.curedDelinquencyIds).toContain('delq-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'MICRO_REPAYMENT_POSTED' }),
    );
  });

  it('blocks repayment on written-off accounts', async () => {
    prisma.loanAccount.findUniqueOrThrow.mockResolvedValue({
      id: 'loan-1',
      borrowerId: 'borrower-1',
      currency: 'XAF',
      outstandingPrincipal: 0,
      status: LoanAccountStatus.WRITTEN_OFF,
      repaymentSchedules: [],
      delinquencyEvents: [],
    });

    await expect(
      service.recordRepayment(
        'loan-1',
        { amount: 10_000, channel: RepaymentChannel.MOBILE_MONEY },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('opens delinquency events and creates collection actions', async () => {
    prisma.loanAccount.findUniqueOrThrow.mockResolvedValue({
      id: 'loan-1',
      borrowerId: 'borrower-1',
    });
    prisma.repaymentSchedule.findUniqueOrThrow.mockResolvedValue({
      id: 'sch-1',
      loanAccountId: 'loan-1',
    });
    prisma.delinquencyEvent.findFirst.mockResolvedValue(null);
    prisma.delinquencyEvent.create.mockResolvedValue({
      id: 'delq-1',
      loanAccountId: 'loan-1',
      borrowerId: 'borrower-1',
      scheduleId: 'sch-1',
    });
    prisma.repaymentSchedule.update.mockResolvedValue({});
    prisma.delinquencyEvent.findUniqueOrThrow.mockResolvedValue({
      id: 'delq-1',
      loanAccountId: 'loan-1',
      borrowerId: 'borrower-1',
      scheduleId: 'sch-1',
    });
    prisma.collectionAction.create.mockResolvedValue({
      id: 'coll-1',
      actionType: CollectionActionType.PHONE_CALL,
    });

    const delinquency = await service.openDelinquency(
      'loan-1',
      { scheduleId: 'sch-1', dpd: 12, overdueAmount: 20_000 },
      actor,
    );
    const action = await service.createCollectionAction(
      delinquency.id,
      { actionType: CollectionActionType.PHONE_CALL },
      actor,
    );

    expect(delinquency.id).toBe('delq-1');
    expect(action.id).toBe('coll-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'MICRO_COLLECTION_ACTION_CREATED' }),
    );
  });

  it('enforces consent for alternative data feature snapshots', async () => {
    prisma.consentGrant.findFirst.mockResolvedValue(null);

    await expect(
      service.createAlternativeDataFeatureSnapshot(
        {
          borrowerId: 'borrower-1',
          sourceType: AlternativeDataSourceType.MOBILE_MONEY,
          featureSchemaVersion: 'alt-v1',
          payloadQualityScore: 82,
          features: { walletActivityScore: 0.8 },
          lineage: {
            raw: ['cashInTotal'],
            derived: ['walletActivityScore'],
            imputed: [],
          },
        },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);

    prisma.consentGrant.findFirst.mockResolvedValue({ id: 'consent-mm' });
    prisma.alternativeDataFeatureSnapshot.create.mockResolvedValue({
      id: 'alt-1',
      payloadQualityScore: 82,
    });

    const snapshot = await service.createAlternativeDataFeatureSnapshot(
      {
        borrowerId: 'borrower-1',
        sourceType: AlternativeDataSourceType.MOBILE_MONEY,
        featureSchemaVersion: 'alt-v1',
        payloadQualityScore: 82,
        features: { walletActivityScore: 0.8 },
        lineage: {
          raw: ['cashInTotal'],
          derived: ['walletActivityScore'],
          imputed: [],
        },
      },
      actor,
    );

    expect(snapshot.id).toBe('alt-1');
  });

  describe('Borrower Lifecycle', () => {
    it('creates a retail borrower with informal business profile', async () => {
      prisma.retailBorrower.create.mockResolvedValue({
        id: 'borrower-new',
        fullName: 'Test',
        segment: BorrowerSegment.THIN_FILE,
        informalBusinessProfile: null,
      });

      const result = await service.createBorrower(
        {
          fullName: 'Test',
          segment: BorrowerSegment.THIN_FILE,
        },
        actor,
      );

      expect(result.id).toBe('borrower-new');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'MICRO_BORROWER_CREATED' }),
      );
    });

    it('transitions borrower from PROSPECT to ACTIVE', async () => {
      prisma.retailBorrower.findUniqueOrThrow.mockResolvedValue({
        id: 'borrower-1',
        status: BorrowerStatus.PROSPECT,
      });
      prisma.retailBorrower.update.mockResolvedValue({
        id: 'borrower-1',
        status: BorrowerStatus.ACTIVE,
      });

      const result = await service.updateBorrowerStatus(
        'borrower-1',
        { status: BorrowerStatus.ACTIVE, reason: 'First loan originated' },
        actor,
      );

      expect(result.status).toBe(BorrowerStatus.ACTIVE);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'MICRO_BORROWER_STATUS_CHANGED' }),
      );
    });

    it('blocks invalid borrower status transitions', async () => {
      prisma.retailBorrower.findUniqueOrThrow.mockResolvedValue({
        id: 'borrower-1',
        status: BorrowerStatus.PROSPECT,
      });

      await expect(
        service.updateBorrowerStatus(
          'borrower-1',
          { status: BorrowerStatus.SUSPENDED },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('suspends and closes an ACTIVE borrower', async () => {
      prisma.retailBorrower.findUniqueOrThrow.mockResolvedValue({
        id: 'borrower-1',
        status: BorrowerStatus.ACTIVE,
      });
      prisma.retailBorrower.update.mockResolvedValue({
        id: 'borrower-1',
        status: BorrowerStatus.SUSPENDED,
      });

      const suspended = await service.updateBorrowerStatus(
        'borrower-1',
        { status: BorrowerStatus.SUSPENDED, reason: 'Fraud suspicion' },
        actor,
      );
      expect(suspended.status).toBe(BorrowerStatus.SUSPENDED);

      prisma.retailBorrower.findUniqueOrThrow.mockResolvedValue({
        id: 'borrower-1',
        status: BorrowerStatus.SUSPENDED,
      });
      prisma.retailBorrower.update.mockResolvedValue({
        id: 'borrower-1',
        status: BorrowerStatus.CLOSED,
      });

      const closed = await service.updateBorrowerStatus(
        'borrower-1',
        { status: BorrowerStatus.CLOSED, reason: 'Account closure' },
        actor,
      );
      expect(closed.status).toBe(BorrowerStatus.CLOSED);
    });
  });

  describe('Field Visit', () => {
    it('creates a field visit and sets application to FIELD_REVIEW_REQUIRED', async () => {
      prisma.microLoanApplication.findUniqueOrThrow.mockResolvedValue({
        id: 'app-1',
        borrowerId: 'borrower-1',
      });
      prisma.fieldVisit.create.mockResolvedValue({
        id: 'visit-1',
        applicationId: 'app-1',
      });
      prisma.microLoanApplication.update.mockResolvedValue({});

      const result = await service.createFieldVisit(
        'app-1',
        { visitType: 'INITIAL' },
        actor,
      );

      expect(result.id).toBe('visit-1');
      expect(prisma.microLoanApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: MicroLoanApplicationStatus.FIELD_REVIEW_REQUIRED },
        }),
      );
    });

    it('completes a field visit and sets application to FIELD_REVIEWED', async () => {
      prisma.fieldVisit.findUniqueOrThrow.mockResolvedValue({
        id: 'visit-1',
        applicationId: 'app-1',
        status: FieldVisitStatus.PLANNED,
      });
      prisma.fieldVisit.update.mockResolvedValue({
        id: 'visit-1',
        status: FieldVisitStatus.COMPLETED,
        outcome: FieldVisitOutcome.VERIFIED,
      });
      prisma.microLoanApplication.update.mockResolvedValue({});

      const result = await service.completeFieldVisit(
        'visit-1',
        { outcome: FieldVisitOutcome.VERIFIED },
        actor,
      );

      expect(result.outcome).toBe(FieldVisitOutcome.VERIFIED);
      expect(prisma.microLoanApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: MicroLoanApplicationStatus.FIELD_REVIEWED },
        }),
      );
    });
  });

  describe('Offer Lifecycle', () => {
    it('accepts a valid issued offer', async () => {
      prisma.loanOffer.findUniqueOrThrow.mockResolvedValue({
        id: 'offer-1',
        status: LoanOfferStatus.ISSUED,
        expiresAt: new Date(Date.now() + 86400000),
      });
      prisma.loanOffer.update.mockResolvedValue({
        id: 'offer-1',
        status: LoanOfferStatus.ACCEPTED,
        acceptedAt: new Date(),
      });

      const result = await service.acceptOffer('offer-1', {}, actor);
      expect(result.status).toBe(LoanOfferStatus.ACCEPTED);
    });

    it('rejects expired offer acceptance and auto-transitions to EXPIRED', async () => {
      prisma.loanOffer.findUniqueOrThrow.mockResolvedValue({
        id: 'offer-1',
        status: LoanOfferStatus.ISSUED,
        expiresAt: new Date(Date.now() - 86400000),
      });
      prisma.loanOffer.update.mockResolvedValue({
        id: 'offer-1',
        status: LoanOfferStatus.EXPIRED,
      });

      await expect(service.acceptOffer('offer-1', {}, actor)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.loanOffer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: LoanOfferStatus.EXPIRED },
        }),
      );
    });

    it('declines an issued offer', async () => {
      prisma.loanOffer.findUniqueOrThrow.mockResolvedValue({
        id: 'offer-1',
        status: LoanOfferStatus.ISSUED,
      });
      prisma.loanOffer.update.mockResolvedValue({
        id: 'offer-1',
        status: LoanOfferStatus.DECLINED,
      });

      const result = await service.declineOffer(
        'offer-1',
        { reason: 'Too expensive' },
        actor,
      );
      expect(result.status).toBe(LoanOfferStatus.DECLINED);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'MICRO_LOAN_OFFER_DECLINED' }),
      );
    });

    it('cancels an issued offer', async () => {
      prisma.loanOffer.findUniqueOrThrow.mockResolvedValue({
        id: 'offer-1',
        status: LoanOfferStatus.ISSUED,
      });
      prisma.loanOffer.update.mockResolvedValue({
        id: 'offer-1',
        status: LoanOfferStatus.CANCELLED,
      });

      const result = await service.cancelOffer(
        'offer-1',
        { reason: 'Policy change' },
        actor,
      );
      expect(result.status).toBe(LoanOfferStatus.CANCELLED);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'MICRO_LOAN_OFFER_CANCELLED' }),
      );
    });

    it('expires stale offers in batch', async () => {
      prisma.loanOffer.findMany.mockResolvedValue([
        {
          id: 'offer-1',
          status: LoanOfferStatus.ISSUED,
          expiresAt: new Date(Date.now() - 86400000),
        },
        {
          id: 'offer-2',
          status: LoanOfferStatus.ISSUED,
          expiresAt: new Date(Date.now() - 172800000),
        },
      ]);
      prisma.loanOffer.update.mockResolvedValue({
        status: LoanOfferStatus.EXPIRED,
      });

      const result = await service.expireStaleOffers();
      expect(result.expiredCount).toBe(2);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'MICRO_STALE_OFFERS_EXPIRED' }),
      );
    });
  });

  describe('Disbursement Retry', () => {
    it('retries a failed disbursement by creating a new one', async () => {
      prisma.disbursement.findUniqueOrThrow.mockResolvedValue({
        id: 'disb-failed',
        loanOfferId: 'offer-1',
        applicationId: 'app-1',
        borrowerId: 'borrower-1',
        amount: 100_000,
        currency: 'XAF',
        status: DisbursementStatus.FAILED,
        loanOffer: { id: 'offer-1', status: LoanOfferStatus.ACCEPTED },
      });
      prisma.disbursement.create.mockResolvedValue({
        id: 'disb-retry',
        amount: 100_000,
        status: DisbursementStatus.PENDING,
      });

      const result = await service.retryDisbursement(
        'disb-failed',
        { channel: DisbursementChannel.MOBILE_MONEY },
        actor,
      );

      expect(result.id).toBe('disb-retry');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'MICRO_DISBURSEMENT_RETRY_CREATED',
        }),
      );
    });

    it('blocks retry of non-failed disbursement', async () => {
      prisma.disbursement.findUniqueOrThrow.mockResolvedValue({
        id: 'disb-1',
        status: DisbursementStatus.SUCCESS,
        loanOffer: { id: 'offer-1', status: LoanOfferStatus.ACCEPTED },
      });

      await expect(
        service.retryDisbursement(
          'disb-1',
          { channel: DisbursementChannel.MOBILE_MONEY },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Supervisor Decision', () => {
    it('submits supervisor decision on SUPERVISOR_REVIEW application', async () => {
      prisma.microLoanApplication.findUniqueOrThrow.mockResolvedValue({
        id: 'app-1',
        borrowerId: 'borrower-1',
        requestedAmount: 100_000,
        status: MicroLoanApplicationStatus.SUPERVISOR_REVIEW,
        policySnapshot: { id: 'snapshot-1', snapshot: activePolicy },
        scorecards: [
          {
            id: 'score-1',
            recommendation: 'SUPERVISOR_REVIEW',
            reasonCodes: [],
          },
        ],
        decisions: [],
      });
      prisma.microLoanDecision.create.mockResolvedValue({
        id: 'decision-super',
        status: DecisionStatus.APPROVE,
        approvedAmount: 100_000,
        tenorDays: 30,
        interestRate: 4,
      });
      prisma.microLoanApplication.update.mockResolvedValue({});

      const result = await service.submitSupervisorDecision(
        'app-1',
        {
          status: DecisionStatus.APPROVE,
          approvedAmount: 100_000,
          tenorDays: 30,
          overrideReason:
            'Borrower demonstrated improved profile since initial review.',
        },
        actor,
      );

      expect(result.id).toBe('decision-super');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'MICRO_SUPERVISOR_DECISION_SUBMITTED',
        }),
      );
    });

    it('blocks supervisor decision on non-SUPERVISOR_REVIEW application', async () => {
      prisma.microLoanApplication.findUniqueOrThrow.mockResolvedValue({
        id: 'app-1',
        status: MicroLoanApplicationStatus.SCORED,
      });

      await expect(
        service.submitSupervisorDecision(
          'app-1',
          {
            status: DecisionStatus.APPROVE,
          },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Application Cancellation and Re-application', () => {
    it('cancels a pre-decision application', async () => {
      prisma.microLoanApplication.findUniqueOrThrow.mockResolvedValue({
        id: 'app-1',
        status: MicroLoanApplicationStatus.SUBMITTED,
      });
      prisma.microLoanApplication.update.mockResolvedValue({
        id: 'app-1',
        status: MicroLoanApplicationStatus.CANCELLED,
      });

      const result = await service.cancelApplication(
        'app-1',
        { reason: 'Borrower withdrew' },
        actor,
      );
      expect(result.status).toBe(MicroLoanApplicationStatus.CANCELLED);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'MICRO_APPLICATION_CANCELLED' }),
      );
    });

    it('blocks cancellation of post-decision application', async () => {
      prisma.microLoanApplication.findUniqueOrThrow.mockResolvedValue({
        id: 'app-1',
        status: MicroLoanApplicationStatus.APPROVED,
      });

      await expect(
        service.cancelApplication('app-1', { reason: 'Too late' }, actor),
      ).rejects.toThrow(BadRequestException);
    });

    it('re-applies from a rejected application', async () => {
      prisma.microLoanApplication.findUniqueOrThrow
        .mockResolvedValueOnce({
          id: 'app-rejected',
          borrowerId: 'borrower-1',
          reqId: 'MLA-2026-REJECTED',
          status: MicroLoanApplicationStatus.REJECTED,
        })
        .mockResolvedValueOnce({ id: 'app-new' });
      prisma.microLoanPolicy.findFirst.mockResolvedValue(activePolicy);
      prisma.consentGrant.findFirst.mockResolvedValue({ id: 'consent-mm' });
      prisma.microLoanApplication.create.mockResolvedValue({
        id: 'app-new',
        borrowerId: 'borrower-1',
      });
      prisma.productPolicySnapshot.create.mockResolvedValue({ id: 'snap-new' });

      const result = await service.reapply(
        'app-rejected',
        {
          borrowerId: 'borrower-1',
          requestedAmount: 80_000,
        },
        actor,
      );

      expect(result.application.id).toBe('app-new');
      expect(result.previousApplicationId).toBe('app-rejected');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'MICRO_REAPPLICATION_CREATED' }),
      );
    });

    it('blocks re-application from non-rejected/non-expired application', async () => {
      prisma.microLoanApplication.findUniqueOrThrow.mockResolvedValue({
        id: 'app-1',
        borrowerId: 'borrower-1',
        status: MicroLoanApplicationStatus.APPROVED,
      });

      await expect(
        service.reapply(
          'app-1',
          {
            borrowerId: 'borrower-1',
            requestedAmount: 80_000,
          },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Schedule Overdue Detection', () => {
    it('marks overdue schedules and auto-opens delinquency events', async () => {
      const pastDate = new Date(Date.now() - 15 * 86400000);
      prisma.repaymentSchedule.findMany.mockResolvedValue([
        {
          id: 'sch-1',
          installmentNumber: 1,
          loanAccountId: 'loan-1',
          totalDue: 25_000,
          amountPaid: 0,
          dueDate: pastDate,
          loanAccount: {
            id: 'loan-1',
            borrowerId: 'borrower-1',
            status: LoanAccountStatus.ACTIVE,
          },
        },
      ]);
      prisma.repaymentSchedule.update.mockResolvedValue({});
      prisma.delinquencyEvent.findFirst.mockResolvedValue(null);
      prisma.loanAccount.findUniqueOrThrow.mockResolvedValue({
        id: 'loan-1',
        borrowerId: 'borrower-1',
      });
      prisma.repaymentSchedule.findUniqueOrThrow.mockResolvedValue({
        id: 'sch-1',
        loanAccountId: 'loan-1',
      });
      prisma.delinquencyEvent.create.mockResolvedValue({ id: 'delq-1' });
      prisma.microLoanApplication.update.mockResolvedValue({});

      const result = await service.markSchedulesOverdue();

      expect(result.schedulesMarkedLate).toBe(1);
      expect(result.delinquenciesOpened).toBe(1);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'MICRO_SCHEDULES_MARKED_OVERDUE',
        }),
      );
    });
  });

  describe('Portfolio Query Endpoints', () => {
    it('finds loan accounts with status filter', async () => {
      prisma.loanAccount.findMany.mockResolvedValue([
        { id: 'loan-1', accountNumber: 'MLN-2026-001' },
      ]);
      prisma.loanAccount.count.mockResolvedValue(1);

      const result = await service.findLoanAccounts({
        status: LoanAccountStatus.ACTIVE,
      });
      expect(result.data.length).toBe(1);
    });

    it('finds delinquencies with segment filter', async () => {
      prisma.delinquencyEvent.findMany.mockResolvedValue([
        { id: 'delq-1', dpd: 15 },
      ]);
      prisma.delinquencyEvent.count.mockResolvedValue(1);

      const result = await service.findDelinquencies({
        segment: BorrowerSegment.INFORMAL,
      });
      expect(result.data.length).toBe(1);
    });

    it('finds collection actions with status filter', async () => {
      prisma.collectionAction.findMany.mockResolvedValue([
        { id: 'coll-1', actionType: CollectionActionType.SMS_REMINDER },
      ]);
      prisma.collectionAction.count.mockResolvedValue(1);

      const result = await service.findCollectionActions({
        status: 'PLANNED',
      });
      expect(result.data.length).toBe(1);
    });

    it('finds disbursements with borrower filter', async () => {
      prisma.disbursement.findMany.mockResolvedValue([
        { id: 'disb-1', status: DisbursementStatus.SUCCESS },
      ]);
      prisma.disbursement.count.mockResolvedValue(1);

      const result = await service.findDisbursements({
        borrowerId: 'borrower-1',
      });
      expect(result.data.length).toBe(1);
    });

    it('finds field visits with application filter', async () => {
      prisma.fieldVisit.findMany.mockResolvedValue([
        { id: 'visit-1', status: FieldVisitStatus.PLANNED },
      ]);
      prisma.fieldVisit.count.mockResolvedValue(1);

      const result = await service.findFieldVisits({ applicationId: 'app-1' });
      expect(result.data.length).toBe(1);
    });
  });

  describe('Renewal / Progressive Lending', () => {
    it('blocks renewal of non-closed loan accounts', async () => {
      prisma.loanAccount.findUniqueOrThrow.mockResolvedValue({
        id: 'loan-1',
        borrowerId: 'borrower-1',
        status: LoanAccountStatus.ACTIVE,
        principalAmount: 100_000,
        loanOfferId: 'offer-1',
        repaymentEvents: [],
        delinquencyEvents: [],
      });

      await expect(
        service.renewLoan(
          'loan-1',
          { borrowerId: 'borrower-1', requestedAmount: 120_000 },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks renewal when borrower had delinquency', async () => {
      prisma.loanAccount.findUniqueOrThrow.mockResolvedValue({
        id: 'loan-1',
        borrowerId: 'borrower-1',
        status: LoanAccountStatus.CLOSED,
        principalAmount: 100_000,
        loanOfferId: 'offer-1',
        repaymentEvents: [{ id: 'rep-1', status: 'POSTED' }],
        delinquencyEvents: [{ id: 'delq-1' }],
      });
      prisma.loanOffer.findUniqueOrThrow.mockResolvedValue({
        id: 'offer-1',
        decision: {
          policySnapshot: {
            snapshot: {
              renewalRules: { minOnTimeRepayments: 2, maxIncreasePct: 50 },
            },
          },
        },
      });

      await expect(
        service.renewLoan(
          'loan-1',
          { borrowerId: 'borrower-1', requestedAmount: 120_000 },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks renewal when requested amount exceeds progressive cap', async () => {
      const closedLoan = {
        id: 'loan-1',
        borrowerId: 'borrower-1',
        status: LoanAccountStatus.CLOSED,
        principalAmount: 100_000,
        repaymentEvents: [
          { id: 'rep-1', status: 'POSTED' },
          { id: 'rep-2', status: 'POSTED' },
        ],
        delinquencyEvents: [],
      };
      prisma.loanAccount.findUniqueOrThrow.mockResolvedValue(closedLoan);
      prisma.loanOffer.findUniqueOrThrow.mockResolvedValue({
        id: 'offer-1',
        decision: {
          policySnapshot: {
            snapshot: {
              renewalRules: { minOnTimeRepayments: 2, maxIncreasePct: 50 },
            },
          },
        },
      });
      prisma.microLoanPolicy.findFirst.mockResolvedValue(activePolicy);
      prisma.consentGrant.findFirst.mockResolvedValue({ id: 'consent-mm' });
      prisma.microLoanApplication.create.mockResolvedValue({ id: 'app-new' });
      prisma.productPolicySnapshot.create.mockResolvedValue({ id: 'snap-new' });

      await expect(
        service.renewLoan(
          'loan-1',
          { borrowerId: 'borrower-1', requestedAmount: 200_000 },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Delinquency Escalation and Cure', () => {
    it('escalates delinquency severity and writes audit trail', async () => {
      prisma.delinquencyEvent.findUniqueOrThrow.mockResolvedValue({
        id: 'delq-1',
        loanAccountId: 'loan-1',
        borrowerId: 'borrower-1',
        status: 'OPEN',
        severity: 'WATCH',
        dpd: 35,
      });
      prisma.delinquencyEvent.update.mockResolvedValue({
        id: 'delq-1',
        status: 'ESCALATED',
        severity: 'HIGH',
      });

      const result = await service.escalateDelinquency('delq-1', {}, actor);
      expect(result.severity).toBe('HIGH');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'MICRO_DELINQUENCY_ESCALATED' }),
      );
    });

    it('cures delinquency and reactivates defaulted loan when all delinquencies are cured', async () => {
      prisma.delinquencyEvent.findUniqueOrThrow.mockResolvedValue({
        id: 'delq-1',
        loanAccountId: 'loan-1',
        borrowerId: 'borrower-1',
        status: 'ESCALATED',
      });
      prisma.delinquencyEvent.update.mockResolvedValue({
        id: 'delq-1',
        status: 'CURED',
        curedAt: new Date(),
      });
      prisma.delinquencyEvent.count.mockResolvedValue(0);
      prisma.loanAccount.findUniqueOrThrow.mockResolvedValue({
        id: 'loan-1',
        status: LoanAccountStatus.DEFAULTED,
      });
      prisma.loanAccount.update.mockResolvedValue({
        id: 'loan-1',
        status: LoanAccountStatus.ACTIVE,
      });

      const result = await service.cureDelinquency('delq-1', {}, actor);
      expect(result.status).toBe('CURED');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'MICRO_DELINQUENCY_CURED' }),
      );
    });
  });

  describe('Write-Off', () => {
    it('blocks write-off of non-defaulted accounts without severe delinquency', async () => {
      prisma.loanAccount.findUniqueOrThrow.mockResolvedValue({
        id: 'loan-1',
        status: LoanAccountStatus.ACTIVE,
        delinquencyEvents: [{ dpd: 30 }],
      });

      await expect(
        service.writeOffLoanAccount(
          'loan-1',
          { reason: 'Irrecoverable' },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('writes off a defaulted account and marks delinquencies', async () => {
      prisma.loanAccount.findUniqueOrThrow.mockResolvedValue({
        id: 'loan-1',
        status: LoanAccountStatus.DEFAULTED,
        outstandingPrincipal: 50_000,
        delinquencyEvents: [],
      });
      tx.loanAccount.update.mockResolvedValue({
        id: 'loan-1',
        status: LoanAccountStatus.WRITTEN_OFF,
      });
      tx.delinquencyEvent.updateMany.mockResolvedValue({ count: 1 });
      prisma.$transaction.mockImplementation((fn: any) => fn(tx));

      const result = await service.writeOffLoanAccount(
        'loan-1',
        { reason: 'Irrecoverable after 180 DPD' },
        actor,
      );
      expect(result.status).toBe('WRITTEN_OFF');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'MICRO_LOAN_WRITTEN_OFF' }),
      );
    });

    it('writes off an ACTIVE account with 180+ DPD delinquency', async () => {
      prisma.loanAccount.findUniqueOrThrow.mockResolvedValue({
        id: 'loan-1',
        status: LoanAccountStatus.ACTIVE,
        outstandingPrincipal: 50_000,
        delinquencyEvents: [{ dpd: 200 }],
      });
      tx.loanAccount.update.mockResolvedValue({
        id: 'loan-1',
        status: LoanAccountStatus.WRITTEN_OFF,
      });
      tx.delinquencyEvent.updateMany.mockResolvedValue({ count: 1 });
      prisma.$transaction.mockImplementation((fn: any) => fn(tx));

      const result = await service.writeOffLoanAccount(
        'loan-1',
        { reason: '180+ DPD' },
        actor,
      );
      expect(result.status).toBe('WRITTEN_OFF');
    });
  });

  describe('Collection Action Completion', () => {
    it('completes a planned collection action with outcome', async () => {
      prisma.collectionAction.findUniqueOrThrow.mockResolvedValue({
        id: 'coll-1',
        status: 'PLANNED',
      });
      prisma.collectionAction.update.mockResolvedValue({
        id: 'coll-1',
        status: 'COMPLETED',
        outcome: 'Promise to pay secured',
      });

      const result = await service.completeCollectionAction(
        'coll-1',
        {
          status: 'COMPLETED',
          outcome: 'Promise to pay secured',
          notes: 'Borrower committed to Friday payment',
        },
        actor,
      );

      expect(result.outcome).toBe('Promise to pay secured');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'MICRO_COLLECTION_ACTION_COMPLETED',
        }),
      );
    });
  });

  describe('Fairness Metrics', () => {
    it('returns segment-level approval, rejection, delinquency and data burden rates', async () => {
      prisma.microLoanDecision.count.mockResolvedValue(10);
      prisma.microLoanDecision.count.mockImplementation((args: any) => {
        if (args.where.status?.in) return Promise.resolve(7);
        if (args.where.status === 'REJECT') return Promise.resolve(3);
        return Promise.resolve(10);
      });
      prisma.alternativeDataFeatureSnapshot.aggregate.mockResolvedValue({
        _avg: { payloadQualityScore: 78, imputedCount: 12 },
        _count: 15,
      });
      prisma.delinquencyEvent.count.mockResolvedValue(2);
      prisma.fairnessMetric.createMany.mockResolvedValue({ count: 15 });

      const result = await service.getFairnessMetrics({});
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.segments[0].segment).toBeDefined();
      expect(result.segments[0].approvalRate).toBeDefined();
    });
  });

  describe('Consent Coverage', () => {
    it('returns total, granted, revoked, expired and by-source breakdown', async () => {
      prisma.consentGrant.count.mockResolvedValue(20);
      prisma.consentGrant.count.mockImplementation((args: any) => {
        if (args.where.status === 'GRANTED') return Promise.resolve(15);
        if (args.where.status === 'REVOKED') return Promise.resolve(3);
        if (args.where.status === 'EXPIRED') return Promise.resolve(2);
        return Promise.resolve(20);
      });
      prisma.consentGrant.groupBy.mockResolvedValue([
        { sourceType: 'MOBILE_MONEY', _count: { id: 12 } },
      ]);

      const result = await service.getConsentCoverage({});
      expect(result.total).toBe(20);
      expect(result.granted).toBe(15);
      expect(result.coverageRate).toBe(75);
    });
  });

  describe('Alt-Data Lineage', () => {
    it('returns paginated lineage records with consent and borrower info', async () => {
      prisma.alternativeDataFeatureSnapshot.findMany.mockResolvedValue([
        {
          id: 'alt-1',
          borrowerId: 'borrower-1',
          sourceType: 'MOBILE_MONEY',
          createdAt: new Date(),
          borrower: {
            id: 'borrower-1',
            fullName: 'Amina',
            segment: 'INFORMAL',
          },
          consentGrant: {
            id: 'consent-1',
            sourceType: 'MOBILE_MONEY',
            status: 'GRANTED',
            purpose: 'UNDERWRITING',
          },
        },
      ]);
      prisma.alternativeDataFeatureSnapshot.count.mockResolvedValue(1);

      const result = await service.getAltDataLineage({});
      expect(result.data.length).toBe(1);
      expect(result.data[0].borrower.fullName).toBe('Amina');
    });
  });
});
