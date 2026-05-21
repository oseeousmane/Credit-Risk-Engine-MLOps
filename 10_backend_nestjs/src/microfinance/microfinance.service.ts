import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AlternativeDataSourceType,
  BorrowerSegment,
  BorrowerStatus,
  CollectionActionStatus,
  ConsentPurpose,
  ConsentSourceType,
  DecisionStatus,
  DelinquencyStatus,
  DisbursementStatus,
  FieldVisitStatus,
  LoanAccountStatus,
  LoanOfferStatus,
  MicroLoanApplicationStatus,
  MicroLoanPolicy,
  PolicyStatus,
  Prisma,
  RepaymentFrequency,
  RepaymentScheduleStatus,
  ScorecardRecommendation,
  User,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { paginate } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import {
  AcceptLoanOfferDto,
  AltDataLineageQueryDto,
  CancelApplicationDto,
  CancelOfferDto,
  CollectionActionQueryDto,
  CompleteCollectionActionDto,
  CompleteDisbursementDto,
  CompleteFieldVisitDto,
  ConsentCoverageDto,
  CreateAlternativeDataFeatureSnapshotDto,
  CreateCollectionActionDto,
  CreateDisbursementDto,
  CreateFieldVisitDto,
  CreateLoanOfferDto,
  CreateMicroLoanApplicationDto,
  CreateMicroLoanPolicyDto,
  CreateMobileMoneySnapshotDto,
  CreateRetailBorrowerDto,
  CureDelinquencyDto,
  DeclineOfferDto,
  DelinquencyQueryDto,
  DisbursementQueryDto,
  EscalateDelinquencyDto,
  FairnessWindowDto,
  FieldVisitQueryDto,
  GrantConsentDto,
  LoanAccountQueryDto,
  MicrofinanceQueryDto,
  OpenDelinquencyDto,
  PortfolioAnalyticsQueryDto,
  ReapplyDto,
  RecordRepaymentDto,
  RenewLoanDto,
  RetryDisbursementDto,
  SubmitMicroLoanDecisionDto,
  SubmitSupervisorDecisionDto,
  UpdateBorrowerStatusDto,
  WriteOffLoanAccountDto,
} from './dto/microfinance.dto';

type ReasonCode = {
  code: string;
  label: string;
  severity?: string;
  source?: string;
  details?: Record<string, unknown>;
};
import { MobileMoneyAdapter } from './adapters/mobile-money.adapter';

@Injectable()
export class MicrofinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mobileMoney: MobileMoneyAdapter,
  ) {}

  async findBorrowers(query: MicrofinanceQueryDto) {
    const { page = 1, limit = 20, search, segment } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.RetailBorrowerWhereInput = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { externalId: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (segment) where.segment = segment;

    const [data, total] = await Promise.all([
      this.prisma.retailBorrower.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          informalBusinessProfile: true,
          applications: { orderBy: { createdAt: 'desc' }, take: 3 },
          loanAccounts: { orderBy: { createdAt: 'desc' }, take: 3 },
        },
      }),
      this.prisma.retailBorrower.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findBorrower(id: string) {
    return this.prisma.retailBorrower.findUniqueOrThrow({
      where: { id },
      include: {
        informalBusinessProfile: true,
        consents: { orderBy: { grantedAt: 'desc' } },
        applications: { orderBy: { createdAt: 'desc' } },
        groupMemberships: true,
        loanAccounts: { orderBy: { createdAt: 'desc' } },
        delinquencyEvents: {
          where: { status: 'OPEN' },
          orderBy: { openedAt: 'desc' },
        },
      },
    });
  }

  async createBorrower(dto: CreateRetailBorrowerDto, actor?: User) {
    const borrower = await this.prisma.retailBorrower.create({
      data: {
        externalId: dto.externalId,
        fullName: dto.fullName,
        phone: dto.phone,
        nationalIdNumber: dto.nationalIdNumber,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        geography: dto.geography,
        address: dto.address,
        segment: dto.segment ?? BorrowerSegment.THIN_FILE,
        identityVerified: dto.identityVerified ?? false,
        kycLevel: dto.kycLevel,
        riskFlags: this.toJson(dto.riskFlags),
        metadata: this.toJson(dto.metadata),
        informalBusinessProfile: dto.informalBusinessProfile
          ? {
              create: {
                ...dto.informalBusinessProfile,
                metadata: this.toJson(dto.informalBusinessProfile.metadata),
              },
            }
          : undefined,
      },
      include: { informalBusinessProfile: true },
    });

    await this.audit.log({
      eventType: 'MICRO_BORROWER_CREATED',
      entityType: 'RetailBorrower',
      entityId: borrower.id,
      actorId: actor?.id,
      newValue: { fullName: borrower.fullName, segment: borrower.segment },
    });

    return borrower;
  }

  async grantConsent(borrowerId: string, dto: GrantConsentDto, actor?: User) {
    await this.ensureBorrower(borrowerId);

    const consent = await this.prisma.consentGrant.create({
      data: {
        borrowerId,
        sourceType: dto.sourceType,
        purpose: dto.purpose,
        consentTextVersion: dto.consentTextVersion,
        captureChannel: dto.captureChannel,
        capturedBy: actor?.id,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        evidenceUrl: dto.evidenceUrl,
        metadata: this.toJson(dto.metadata),
      },
    });

    await this.audit.log({
      eventType: 'MICRO_CONSENT_GRANTED',
      entityType: 'ConsentGrant',
      entityId: consent.id,
      actorId: actor?.id,
      newValue: {
        borrowerId,
        sourceType: consent.sourceType,
        purpose: consent.purpose,
      },
    });

    return consent;
  }

  async revokeConsent(consentId: string, actor?: User) {
    const existing = await this.prisma.consentGrant.findUniqueOrThrow({
      where: { id: consentId },
    });
    const revoked = await this.prisma.consentGrant.update({
      where: { id: consentId },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    await this.audit.log({
      eventType: 'MICRO_CONSENT_REVOKED',
      entityType: 'ConsentGrant',
      entityId: consentId,
      actorId: actor?.id,
      previousValue: { status: existing.status },
      newValue: { status: revoked.status },
    });

    return revoked;
  }

  async createPolicy(dto: CreateMicroLoanPolicyDto, actor?: User) {
    if (dto.minAmount > dto.maxAmount) {
      throw new BadRequestException(
        'POLICY_AMOUNT_RANGE_INVALID: minAmount must be <= maxAmount.',
      );
    }
    if (dto.interestRateMin > dto.interestRateMax) {
      throw new BadRequestException(
        'POLICY_RATE_RANGE_INVALID: interestRateMin must be <= interestRateMax.',
      );
    }
    if (dto.allowedTenors.length === 0) {
      throw new BadRequestException(
        'POLICY_TENORS_REQUIRED: allowedTenors cannot be empty.',
      );
    }

    const status = dto.status ?? PolicyStatus.DRAFT;
    const policy = await this.prisma.microLoanPolicy.create({
      data: {
        name: dto.name,
        version: dto.version,
        productType: dto.productType,
        segment: dto.segment,
        minAmount: dto.minAmount,
        maxAmount: dto.maxAmount,
        currency: dto.currency ?? 'XAF',
        allowedTenors: dto.allowedTenors,
        interestRateMin: dto.interestRateMin,
        interestRateMax: dto.interestRateMax,
        minScore: dto.minScore,
        maxDebtBurdenRatio: dto.maxDebtBurdenRatio,
        requiresGuarantor: dto.requiresGuarantor ?? false,
        requiresFieldVisit: dto.requiresFieldVisit ?? true,
        requiresMobileMoneyConsent: dto.requiresMobileMoneyConsent ?? false,
        coolingOffPeriodDays: dto.coolingOffPeriodDays ?? 0,
        status,
        approvedBy: status === PolicyStatus.ACTIVE ? actor?.id : undefined,
        approvedAt: status === PolicyStatus.ACTIVE ? new Date() : undefined,
        feeRules: this.toJson(dto.feeRules),
        renewalRules: this.toJson(dto.renewalRules),
        progressiveLendingRules: this.toJson(dto.progressiveLendingRules),
        metadata: this.toJson(dto.metadata),
      },
    });

    await this.audit.log({
      eventType: 'MICRO_POLICY_CREATED',
      entityType: 'MicroLoanPolicy',
      entityId: policy.id,
      actorId: actor?.id,
      newValue: {
        name: policy.name,
        version: policy.version,
        status: policy.status,
      },
    });

    return policy;
  }

  async activatePolicy(policyId: string, actor?: User) {
    const previous = await this.prisma.microLoanPolicy.findUniqueOrThrow({
      where: { id: policyId },
    });
    this.validatePolicyIntegrity(previous);
    const updated = await this.prisma.microLoanPolicy.update({
      where: { id: policyId },
      data: {
        status: PolicyStatus.ACTIVE,
        approvedBy: actor?.id,
        approvedAt: new Date(),
      },
    });

    await this.audit.log({
      eventType: 'MICRO_POLICY_ACTIVATED',
      entityType: 'MicroLoanPolicy',
      entityId: policyId,
      actorId: actor?.id,
      previousValue: { status: previous.status },
      newValue: { status: updated.status },
    });

    return updated;
  }

  async findPolicies(status?: PolicyStatus) {
    return this.prisma.microLoanPolicy.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createApplication(dto: CreateMicroLoanApplicationDto, actor?: User) {
    const borrower = await this.ensureBorrower(dto.borrowerId);
    const segment = dto.segment ?? borrower.segment;
    const productType = dto.productType ?? 'INDIVIDUAL';
    const policy = dto.policyId
      ? await this.prisma.microLoanPolicy.findUniqueOrThrow({
          where: { id: dto.policyId },
        })
      : await this.prisma.microLoanPolicy.findFirst({
          where: { status: PolicyStatus.ACTIVE, segment, productType },
          orderBy: { approvedAt: 'desc' },
        });

    if (!policy) {
      throw new BadRequestException(
        'ACTIVE_POLICY_REQUIRED: No active MicroLoanPolicy matches this segment and product type.',
      );
    }
    if (policy.segment !== segment || policy.productType !== productType) {
      throw new BadRequestException(
        'POLICY_SCOPE_MISMATCH: Policy segment/product type must match the application.',
      );
    }

    this.assertPolicyCanOriginate(policy, dto.requestedAmount);
    if (policy.requiresMobileMoneyConsent) {
      await this.assertActiveConsentForAnyPurpose(
        dto.borrowerId,
        ConsentSourceType.MOBILE_MONEY,
        [ConsentPurpose.UNDERWRITING, ConsentPurpose.AFFORDABILITY_ASSESSMENT],
      );
    }

    const application = await this.prisma.microLoanApplication.create({
      data: {
        reqId: this.generateReference('MLA'),
        borrowerId: dto.borrowerId,
        policyId: policy.id,
        requestedAmount: dto.requestedAmount,
        currency: dto.currency ?? policy.currency,
        purpose: dto.purpose,
        productType,
        segment,
        channel: dto.channel,
        priority: dto.priority ?? false,
        createdBy: actor?.id,
        metadata: this.toJson(dto.metadata),
      },
    });

    await this.prisma.productPolicySnapshot.create({
      data: {
        policyId: policy.id,
        policyName: policy.name,
        policyVersion: policy.version,
        snapshot: this.policyToSnapshot(policy),
        applicationId: application.id,
      },
    });

    await this.audit.log({
      eventType: 'MICRO_APPLICATION_CREATED',
      entityType: 'MicroLoanApplication',
      entityId: application.id,
      actorId: actor?.id,
      newValue: {
        borrowerId: dto.borrowerId,
        requestedAmount: dto.requestedAmount,
        policyId: policy.id,
      },
    });

    return this.findApplication(application.id);
  }

  async findApplications(query: MicrofinanceQueryDto) {
    const { page = 1, limit = 20, search, segment, status } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.MicroLoanApplicationWhereInput = {};

    if (segment) where.segment = segment;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { reqId: { contains: search, mode: 'insensitive' } },
        { borrower: { fullName: { contains: search, mode: 'insensitive' } } },
        { borrower: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.microLoanApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          borrower: {
            select: { id: true, fullName: true, phone: true, segment: true },
          },
          policy: { select: { id: true, name: true, version: true } },
          policySnapshot: true,
          scorecards: { orderBy: { createdAt: 'desc' }, take: 1 },
          decisions: { orderBy: { createdAt: 'desc' }, take: 1 },
          offers: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.microLoanApplication.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findApplication(id: string) {
    return this.prisma.microLoanApplication.findUniqueOrThrow({
      where: { id },
      include: {
        borrower: {
          include: {
            informalBusinessProfile: true,
            consents: true,
            groupMemberships: true,
          },
        },
        policy: true,
        policySnapshot: true,
        fieldVisits: { orderBy: { createdAt: 'desc' } },
        guarantors: true,
        scorecards: { orderBy: { createdAt: 'desc' } },
        decisions: {
          orderBy: { createdAt: 'desc' },
          include: { reasons: true, offers: true },
        },
        offers: {
          orderBy: { createdAt: 'desc' },
          include: { disbursements: true, loanAccount: true },
        },
        disbursements: { orderBy: { createdAt: 'desc' } },
        loanAccount: {
          include: {
            repaymentSchedules: { orderBy: { installmentNumber: 'asc' } },
            repaymentEvents: { orderBy: { receivedAt: 'desc' }, take: 10 },
            delinquencyEvents: {
              orderBy: { openedAt: 'desc' },
              include: {
                collectionActions: { orderBy: { createdAt: 'desc' } },
              },
            },
          },
        },
      },
    });
  }

  async createFieldVisit(
    applicationId: string,
    dto: CreateFieldVisitDto,
    actor?: User,
  ) {
    const application =
      await this.prisma.microLoanApplication.findUniqueOrThrow({
        where: { id: applicationId },
      });
    const visit = await this.prisma.fieldVisit.create({
      data: {
        applicationId,
        borrowerId: application.borrowerId,
        visitType: dto.visitType ?? 'INITIAL',
        assignedToId: dto.assignedToId ?? actor?.id,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        address: dto.address,
      },
    });

    await this.prisma.microLoanApplication.update({
      where: { id: applicationId },
      data: { status: MicroLoanApplicationStatus.FIELD_REVIEW_REQUIRED },
    });

    await this.audit.log({
      eventType: 'MICRO_FIELD_VISIT_CREATED',
      entityType: 'FieldVisit',
      entityId: visit.id,
      actorId: actor?.id,
      newValue: { applicationId, assignedToId: visit.assignedToId },
    });

    return visit;
  }

  async completeFieldVisit(
    visitId: string,
    dto: CompleteFieldVisitDto,
    actor?: User,
  ) {
    const existing = await this.prisma.fieldVisit.findUniqueOrThrow({
      where: { id: visitId },
    });
    const visit = await this.prisma.fieldVisit.update({
      where: { id: visitId },
      data: {
        status: FieldVisitStatus.COMPLETED,
        outcome: dto.outcome,
        completedById: actor?.id,
        completedAt: new Date(),
        latitude: dto.latitude,
        longitude: dto.longitude,
        agentConfidenceScore: dto.agentConfidenceScore,
        observations: this.toJson(dto.observations),
        photos: this.toJson(dto.photos),
      },
    });

    await this.prisma.microLoanApplication.update({
      where: { id: visit.applicationId },
      data: { status: MicroLoanApplicationStatus.FIELD_REVIEWED },
    });

    await this.audit.log({
      eventType: 'MICRO_FIELD_VISIT_COMPLETED',
      entityType: 'FieldVisit',
      entityId: visitId,
      actorId: actor?.id,
      previousValue: { status: existing.status },
      newValue: { status: visit.status, outcome: visit.outcome },
    });

    return visit;
  }

  async runScorecard(applicationId: string, actor?: User) {
    const application =
      await this.prisma.microLoanApplication.findUniqueOrThrow({
        where: { id: applicationId },
        include: {
          borrower: {
            include: {
              informalBusinessProfile: true,
              consents: true,
              groupMemberships: { where: { active: true } },
              mobileMoneySnapshots: {
                orderBy: { capturedAt: 'desc' },
                take: 1,
              },
              loanAccounts: {
                include: { repaymentEvents: true, delinquencyEvents: true },
              },
            },
          },
          policySnapshot: true,
          fieldVisits: { orderBy: { completedAt: 'desc' } },
          guarantors: true,
        },
      });

    if (!application.policySnapshot) {
      throw new BadRequestException(
        'POLICY_SNAPSHOT_REQUIRED: Cannot score an application without an applied policy snapshot.',
      );
    }
    const policy = this.readPolicySnapshot(application.policySnapshot.snapshot);
    const minScore = this.readNumber(policy, 'minScore', 60);
    const requiresFieldVisit = this.readBoolean(
      policy,
      'requiresFieldVisit',
      true,
    );
    const requiresGuarantor = this.readBoolean(
      policy,
      'requiresGuarantor',
      false,
    );
    const completedVisit = application.fieldVisits.find(
      (visit) => visit.status === FieldVisitStatus.COMPLETED,
    );
    const mobileMoney = application.borrower.mobileMoneySnapshots[0];
    const hasMobileMoneyConsent = application.borrower.consents.some(
      (consent) =>
        consent.sourceType === ConsentSourceType.MOBILE_MONEY &&
        this.isConsentCurrentlyActive(consent),
    );
    const hasGoodRepaymentHistory = application.borrower.loanAccounts.some(
      (account) =>
        account.repaymentEvents.length > 0 &&
        account.delinquencyEvents.length === 0,
    );
    const hasDelinquency = application.borrower.loanAccounts.some(
      (account) => account.delinquencyEvents.length > 0,
    );

    const profile = application.borrower.informalBusinessProfile;
    const netMonthlyIncome = Math.max(
      0,
      (profile?.monthlyRevenueEstimate ?? 0) -
        (profile?.monthlyExpenseEstimate ?? 0),
    );

    const identityScore = application.borrower.identityVerified
      ? 15
      : application.borrower.nationalIdNumber
        ? 9
        : 4;
    const activityStabilityScore =
      (profile?.yearsInActivity ?? 0) >= 2
        ? 20
        : (profile?.yearsInActivity ?? 0) >= 1
          ? 14
          : 7;
    const cashflowScore =
      netMonthlyIncome <= 0
        ? 5
        : application.requestedAmount <= netMonthlyIncome * 2
          ? 20
          : application.requestedAmount <= netMonthlyIncome * 4
            ? 13
            : 6;
    const mobileMoneyScore = !hasMobileMoneyConsent
      ? 3
      : mobileMoney &&
          mobileMoney.activeDays >= 20 &&
          mobileMoney.transactionCount >= 20
        ? 15
        : mobileMoney
          ? 10
          : 6;
    const repaymentHistoryScore = hasDelinquency
      ? 4
      : hasGoodRepaymentHistory
        ? 15
        : 8;
    const guarantorGroupScore =
      application.guarantors.length > 0 ||
      application.borrower.groupMemberships.length > 0
        ? 10
        : 4;
    const fieldConfidenceScore =
      completedVisit?.agentConfidenceScore != null
        ? Math.min(5, Math.max(0, completedVisit.agentConfidenceScore / 20))
        : 0;
    const totalScore = this.roundScore(
      identityScore +
        activityStabilityScore +
        cashflowScore +
        mobileMoneyScore +
        repaymentHistoryScore +
        guarantorGroupScore +
        fieldConfidenceScore,
    );

    const reasons = this.scorecardReasons({
      requiresFieldVisit,
      completedVisit: Boolean(completedVisit),
      requiresGuarantor,
      guarantorCount: application.guarantors.length,
      hasMobileMoneyConsent,
      netMonthlyIncome,
      totalScore,
      minScore,
    });
    const recommendation = this.recommendFromScore(
      totalScore,
      minScore,
      requiresFieldVisit,
      Boolean(completedVisit),
      requiresGuarantor,
      application.guarantors.length,
    );

    const scorecard = await this.prisma.thinFileScorecard.create({
      data: {
        applicationId,
        borrowerId: application.borrowerId,
        policySnapshotId: application.policySnapshot?.id,
        identityScore,
        activityStabilityScore,
        cashflowScore,
        mobileMoneyScore,
        repaymentHistoryScore,
        guarantorGroupScore,
        fieldConfidenceScore,
        totalScore,
        recommendation,
        reasonCodes: reasons as Prisma.InputJsonValue,
        featureSnapshot: this.toJson({
          netMonthlyIncome,
          requestedAmount: application.requestedAmount,
          hasMobileMoneyConsent,
          mobileMoneySnapshotId: mobileMoney?.id,
          completedFieldVisitId: completedVisit?.id,
          policyMinScore: minScore,
        }),
        createdBy: actor?.id,
      },
    });

    await this.prisma.microLoanApplication.update({
      where: { id: applicationId },
      data: {
        status:
          recommendation === ScorecardRecommendation.FIELD_REVIEW_REQUIRED
            ? MicroLoanApplicationStatus.FIELD_REVIEW_REQUIRED
            : MicroLoanApplicationStatus.SCORED,
      },
    });

    await this.audit.log({
      eventType: 'MICRO_SCORECARD_CREATED',
      entityType: 'ThinFileScorecard',
      entityId: scorecard.id,
      actorId: actor?.id,
      newValue: { applicationId, totalScore, recommendation },
    });

    return scorecard;
  }

  async submitDecision(
    applicationId: string,
    dto: SubmitMicroLoanDecisionDto,
    actor?: User,
  ) {
    const application =
      await this.prisma.microLoanApplication.findUniqueOrThrow({
        where: { id: applicationId },
        include: {
          policySnapshot: true,
          scorecards: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
    const scorecard = application.scorecards[0];
    if (!scorecard) {
      throw new BadRequestException(
        'SCORECARD_REQUIRED: Run the thin-file scorecard before submitting a decision.',
      );
    }
    if (!application.policySnapshot) {
      throw new BadRequestException(
        'POLICY_SNAPSHOT_REQUIRED: Cannot decide an application without an applied policy snapshot.',
      );
    }

    const recommendedStatus = this.statusFromRecommendation(
      scorecard.recommendation,
    );
    const status = dto.status ?? recommendedStatus;
    if (status !== recommendedStatus && !dto.overrideReason) {
      throw new BadRequestException(
        'OVERRIDE_REASON_REQUIRED: Decision status differs from scorecard recommendation.',
      );
    }

    const policy = this.readPolicySnapshot(application.policySnapshot.snapshot);
    const maxAmount = this.readNumber(
      policy,
      'maxAmount',
      application.requestedAmount,
    );
    const minAmount = this.readNumber(policy, 'minAmount', 0);
    const allowedTenors = this.readNumberArray(policy, 'allowedTenors', [30]);
    const rateMin = this.readNumber(policy, 'interestRateMin', 0);
    const rateMax = this.readNumber(policy, 'interestRateMax', rateMin);
    const isPositiveDecision =
      status === DecisionStatus.APPROVE ||
      status === DecisionStatus.APPROVE_WITH_CONDITIONS;
    const approvedAmount = isPositiveDecision
      ? Math.max(
          minAmount,
          Math.min(
            dto.approvedAmount ?? application.requestedAmount,
            maxAmount,
          ),
        )
      : undefined;
    const tenorDays = isPositiveDecision
      ? (dto.tenorDays ?? allowedTenors[0])
      : undefined;
    const interestRate = isPositiveDecision
      ? (dto.interestRate ?? this.roundMoney((rateMin + rateMax) / 2))
      : undefined;

    if (
      isPositiveDecision &&
      tenorDays != null &&
      !allowedTenors.includes(tenorDays)
    ) {
      throw new BadRequestException(
        'TENOR_NOT_ALLOWED: tenorDays is not allowed by the applied policy snapshot.',
      );
    }

    const reasons = this.extractReasonRecords(scorecard.reasonCodes);
    const decision = await this.prisma.microLoanDecision.create({
      data: {
        applicationId,
        borrowerId: application.borrowerId,
        scorecardId: scorecard.id,
        policySnapshotId: application.policySnapshot?.id,
        status,
        approvedAmount,
        tenorDays,
        interestRate,
        overrideFlag: status !== recommendedStatus || dto.overrideFlag === true,
        overrideReason: dto.overrideReason,
        decidedById: actor?.id,
        decidedAt: new Date(),
        conditions: this.toJson(dto.conditions),
        auditMetadata: this.toJson({
          recommendedStatus,
          scorecardRecommendation: scorecard.recommendation,
        }),
        reasons: { create: reasons },
      },
      include: { reasons: true },
    });

    await this.prisma.microLoanApplication.update({
      where: { id: applicationId },
      data: { status: this.applicationStatusFromDecision(status) },
    });

    await this.audit.log({
      eventType: 'MICRO_DECISION_SUBMITTED',
      entityType: 'MicroLoanDecision',
      entityId: decision.id,
      actorId: actor?.id,
      newValue: { applicationId, status, approvedAmount, tenorDays },
    });

    return decision;
  }

  async createOffer(decisionId: string, dto: CreateLoanOfferDto, actor?: User) {
    const decision = await this.prisma.microLoanDecision.findUniqueOrThrow({
      where: { id: decisionId },
      include: { application: true, policySnapshot: true },
    });
    if (
      decision.status !== DecisionStatus.APPROVE &&
      decision.status !== DecisionStatus.APPROVE_WITH_CONDITIONS
    ) {
      throw new BadRequestException(
        'DECISION_NOT_APPROVED: Only approved decisions can issue loan offers.',
      );
    }
    if (
      decision.approvedAmount == null ||
      decision.tenorDays == null ||
      decision.interestRate == null
    ) {
      throw new BadRequestException(
        'DECISION_TERMS_INCOMPLETE: approvedAmount, tenorDays and interestRate are required.',
      );
    }

    const policy = this.readPolicySnapshot(decision.policySnapshot?.snapshot);
    const approvedAmount = dto.approvedAmount ?? decision.approvedAmount;
    const tenorDays = dto.tenorDays ?? decision.tenorDays;
    const interestRate = dto.interestRate ?? decision.interestRate;
    const rateMin = this.readNumber(
      policy,
      'interestRateMin',
      decision.interestRate,
    );
    const rateMax = this.readNumber(
      policy,
      'interestRateMax',
      decision.interestRate,
    );

    if (approvedAmount <= 0 || approvedAmount > decision.approvedAmount) {
      throw new BadRequestException(
        'OFFER_AMOUNT_EXCEEDS_DECISION: Offer amount cannot exceed the approved decision amount.',
      );
    }
    if (tenorDays !== decision.tenorDays) {
      throw new BadRequestException(
        'OFFER_TENOR_MISMATCH: Offer tenor must match the approved decision tenor.',
      );
    }
    if (
      interestRate < rateMin ||
      interestRate > rateMax ||
      interestRate > decision.interestRate
    ) {
      throw new BadRequestException(
        'OFFER_RATE_OUTSIDE_POLICY: Offer rate must stay within policy and decision terms.',
      );
    }

    const offer = await this.prisma.loanOffer.create({
      data: {
        applicationId: decision.applicationId,
        borrowerId: decision.borrowerId,
        decisionId: decision.id,
        policySnapshotId: decision.policySnapshotId,
        approvedAmount,
        currency: decision.application.currency,
        tenorDays,
        interestRate,
        repaymentFrequency: dto.repaymentFrequency ?? RepaymentFrequency.WEEKLY,
        requiresGuarantor:
          dto.requiresGuarantor ??
          this.readBoolean(policy, 'requiresGuarantor', false),
        requiresCollateral: dto.requiresCollateral ?? false,
        fees: this.toJson(dto.fees),
        conditions: this.toJson(
          dto.conditions ?? this.asRecord(decision.conditions),
        ),
        status: LoanOfferStatus.ISSUED,
        issuedAt: new Date(),
        expiresAt: dto.expiresAt
          ? new Date(dto.expiresAt)
          : this.addDays(new Date(), 7),
        auditMetadata: this.toJson({ issuedBy: actor?.id }),
      },
    });

    await this.audit.log({
      eventType: 'MICRO_LOAN_OFFER_ISSUED',
      entityType: 'LoanOffer',
      entityId: offer.id,
      actorId: actor?.id,
      newValue: {
        decisionId,
        approvedAmount: offer.approvedAmount,
        expiresAt: offer.expiresAt,
      },
    });

    return offer;
  }

  async acceptOffer(offerId: string, dto: AcceptLoanOfferDto, actor?: User) {
    const offer = await this.prisma.loanOffer.findUniqueOrThrow({
      where: { id: offerId },
    });
    if (offer.status !== LoanOfferStatus.ISSUED) {
      throw new BadRequestException(
        'OFFER_NOT_ISSUED: Only issued offers can be accepted.',
      );
    }
    if (offer.expiresAt && offer.expiresAt < new Date()) {
      await this.prisma.loanOffer.update({
        where: { id: offerId },
        data: { status: LoanOfferStatus.EXPIRED },
      });
      throw new BadRequestException('OFFER_EXPIRED: Loan offer has expired.');
    }

    const updated = await this.prisma.loanOffer.update({
      where: { id: offerId },
      data: {
        status: LoanOfferStatus.ACCEPTED,
        acceptedAt: new Date(),
        acceptedBy: actor?.id ?? dto.acceptedBy,
      },
    });

    await this.audit.log({
      eventType: 'MICRO_LOAN_OFFER_ACCEPTED',
      entityType: 'LoanOffer',
      entityId: offerId,
      actorId: actor?.id,
      previousValue: { status: offer.status },
      newValue: { status: updated.status },
    });

    return updated;
  }

  async createDisbursement(
    offerId: string,
    dto: CreateDisbursementDto,
    actor?: User,
  ) {
    const offer = await this.prisma.loanOffer.findUniqueOrThrow({
      where: { id: offerId },
      include: { disbursements: true },
    });
    if (offer.status !== LoanOfferStatus.ACCEPTED) {
      throw new BadRequestException(
        'OFFER_NOT_ACCEPTED: Disbursement requires an accepted loan offer.',
      );
    }
    if (
      offer.disbursements.some(
        (item) =>
          item.status === DisbursementStatus.PENDING ||
          item.status === DisbursementStatus.SUCCESS,
      )
    ) {
      throw new BadRequestException(
        'DISBURSEMENT_ALREADY_EXISTS: This offer already has a pending or successful disbursement.',
      );
    }
    const amount = dto.amount ?? offer.approvedAmount;
    if (amount <= 0) {
      throw new BadRequestException(
        'DISBURSEMENT_AMOUNT_INVALID: amount must be positive.',
      );
    }
    if (amount > offer.approvedAmount) {
      throw new BadRequestException(
        'DISBURSEMENT_AMOUNT_EXCEEDS_OFFER: amount cannot exceed approvedAmount.',
      );
    }

    const disbursement = await this.prisma.disbursement.create({
      data: {
        loanOfferId: offer.id,
        applicationId: offer.applicationId,
        borrowerId: offer.borrowerId,
        amount,
        currency: offer.currency,
        channel: dto.channel,
        provider: dto.provider,
        providerReference: dto.providerReference,
        requestedBy: actor?.id,
      },
    });

    await this.audit.log({
      eventType: 'MICRO_DISBURSEMENT_CREATED',
      entityType: 'Disbursement',
      entityId: disbursement.id,
      actorId: actor?.id,
      newValue: { offerId, amount, channel: disbursement.channel },
    });

    if (dto.channel === 'MOBILE_MONEY') {
      const borrower = await this.prisma.retailBorrower.findUnique({ where: { id: offer.borrowerId }});
      try {
        const txResult = await this.mobileMoney.disburseFunds(borrower?.phone ?? '000000', amount, disbursement.id);
        
        await this.prisma.transactionRecord.create({
          data: {
            internalRef: disbursement.id,
            providerRef: txResult.providerRef,
            amount: amount,
            currency: offer.currency,
            direction: 'OUTBOUND',
            status: txResult.status,
            isLiveMode: (this.mobileMoney as any).isLiveMode ?? false,
            disbursementId: disbursement.id,
          }
        });

        if (txResult.status === 'SUCCESS') {
           await this.completeDisbursement(disbursement.id, { status: 'SUCCESS' as any, providerReference: txResult.providerRef ?? undefined }, actor);
        } else if (txResult.status === 'FAILED') {
           await this.completeDisbursement(disbursement.id, { status: 'FAILED' as any, failureReason: txResult.failureReason ?? 'Adapter failed' }, actor);
        }
      } catch (e: any) {
        await this.completeDisbursement(disbursement.id, { status: 'FAILED' as any, failureReason: e.message }, actor);
        throw e;
      }
    }

    return this.prisma.disbursement.findUnique({ where: { id: disbursement.id } });
  }

  async completeDisbursement(
    disbursementId: string,
    dto: CompleteDisbursementDto,
    actor?: User,
  ) {
    const disbursement = await this.prisma.disbursement.findUniqueOrThrow({
      where: { id: disbursementId },
      include: { loanOffer: true },
    });

    if (
      disbursement.status === DisbursementStatus.SUCCESS ||
      disbursement.loanAccountId
    ) {
      throw new BadRequestException(
        'DISBURSEMENT_ALREADY_COMPLETED: This disbursement already created a loan account.',
      );
    }
    if (
      disbursement.status === DisbursementStatus.REVERSED ||
      disbursement.status === DisbursementStatus.FAILED
    ) {
      throw new BadRequestException(
        'DISBURSEMENT_FINAL_STATE: Final disbursements cannot transition backward.',
      );
    }

    if (dto.status !== DisbursementStatus.SUCCESS) {
      if (
        dto.status !== DisbursementStatus.PROCESSING &&
        dto.status !== DisbursementStatus.FAILED
      ) {
        throw new BadRequestException(
          'DISBURSEMENT_STATUS_INVALID: Only PROCESSING, FAILED, or SUCCESS are valid completion transitions.',
        );
      }
      if (dto.status === DisbursementStatus.FAILED && !dto.failureReason) {
        throw new BadRequestException(
          'DISBURSEMENT_FAILURE_REASON_REQUIRED: failureReason is required when marking a disbursement failed.',
        );
      }
      const updated = await this.prisma.disbursement.update({
        where: { id: disbursementId },
        data: {
          status: dto.status,
          providerReference:
            dto.providerReference ?? disbursement.providerReference,
          failureReason: dto.failureReason,
        },
      });
      await this.audit.log({
        eventType: 'MICRO_DISBURSEMENT_STATUS_CHANGED',
        entityType: 'Disbursement',
        entityId: disbursementId,
        actorId: actor?.id,
        previousValue: { status: disbursement.status },
        newValue: {
          status: updated.status,
          failureReason: updated.failureReason,
        },
      });
      return updated;
    }

    const schedules = this.buildRepaymentSchedule(
      disbursement.loanOffer,
      disbursement.amount,
    );
    const result = await this.prisma.$transaction(async (tx) => {
      const account = await tx.loanAccount.create({
        data: {
          accountNumber: this.generateReference('MLN'),
          loanOfferId: disbursement.loanOfferId,
          applicationId: disbursement.applicationId,
          borrowerId: disbursement.borrowerId,
          principalAmount: disbursement.amount,
          outstandingPrincipal: disbursement.amount,
          currency: disbursement.currency,
          status: LoanAccountStatus.ACTIVE,
          repaymentSchedules: { create: schedules },
        },
        include: { repaymentSchedules: true },
      });

      const updatedDisbursement = await tx.disbursement.update({
        where: { id: disbursementId },
        data: {
          status: DisbursementStatus.SUCCESS,
          providerReference:
            dto.providerReference ?? disbursement.providerReference,
          disbursedAt: new Date(),
          loanAccountId: account.id,
        },
      });

      return { account, disbursement: updatedDisbursement };
    });

    await this.audit.log({
      eventType: 'MICRO_DISBURSEMENT_COMPLETED',
      entityType: 'Disbursement',
      entityId: disbursementId,
      actorId: actor?.id,
      previousValue: { status: disbursement.status },
      newValue: {
        status: result.disbursement.status,
        loanAccountId: result.account.id,
      },
    });

    return result;
  }

  async recordRepayment(
    loanAccountId: string,
    dto: RecordRepaymentDto,
    actor?: User,
  ) {
    const account = await this.prisma.loanAccount.findUniqueOrThrow({
      where: { id: loanAccountId },
      include: {
        repaymentSchedules: { orderBy: { installmentNumber: 'asc' } },
        delinquencyEvents: {
          where: { status: { in: ['OPEN', 'ESCALATED'] } },
          orderBy: { openedAt: 'desc' },
        },
      },
    });

    if (
      account.status === LoanAccountStatus.WRITTEN_OFF ||
      account.status === LoanAccountStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'LOAN_ACCOUNT_NOT_RECEIVABLE: Cannot post repayments to WRITTEN_OFF or CANCELLED accounts.',
      );
    }

    const schedule = dto.scheduleId
      ? account.repaymentSchedules.find((item) => item.id === dto.scheduleId)
      : account.repaymentSchedules.find(
          (item) =>
            item.status !== RepaymentScheduleStatus.PAID &&
            item.status !== RepaymentScheduleStatus.WAIVED,
        );

    if (!schedule) {
      throw new NotFoundException(
        'REPAYMENT_SCHEDULE_NOT_FOUND: No open schedule found for this repayment.',
      );
    }
    if (
      schedule.status === RepaymentScheduleStatus.PAID ||
      schedule.status === RepaymentScheduleStatus.WAIVED
    ) {
      throw new BadRequestException(
        'REPAYMENT_SCHEDULE_ALREADY_PAID: Cannot post repayment to a paid or waived installment.',
      );
    }

    const scheduleOutstanding = this.roundMoney(
      schedule.totalDue - schedule.amountPaid,
    );
    if (dto.amount <= 0 || dto.amount > scheduleOutstanding) {
      throw new BadRequestException(
        'REPAYMENT_AMOUNT_INVALID: amount must be positive and cannot exceed the selected installment outstanding balance.',
      );
    }

    const newAmountPaid = schedule.amountPaid + dto.amount;
    const isScheduleFullyPaid = newAmountPaid >= schedule.totalDue;
    const scheduleStatus = isScheduleFullyPaid
      ? RepaymentScheduleStatus.PAID
      : RepaymentScheduleStatus.PARTIALLY_PAID;
    const nonPrincipalDue = schedule.interestDue + schedule.feesDue;
    const unpaidNonPrincipal = Math.max(
      0,
      nonPrincipalDue - schedule.amountPaid,
    );
    const principalPaidSoFar = Math.max(
      0,
      schedule.amountPaid - nonPrincipalDue,
    );
    const principalRemaining = Math.max(
      0,
      schedule.principalDue - principalPaidSoFar,
    );
    const principalReduction = Math.min(
      Math.max(0, dto.amount - unpaidNonPrincipal),
      principalRemaining,
      account.outstandingPrincipal,
    );
    const newOutstanding = Math.max(
      0,
      account.outstandingPrincipal - principalReduction,
    );

    const newAccountStatus =
      newOutstanding === 0
        ? LoanAccountStatus.CLOSED
        : account.status === LoanAccountStatus.DEFAULTED &&
            account.delinquencyEvents.length === 1 &&
            isScheduleFullyPaid
          ? LoanAccountStatus.ACTIVE
          : account.status;

    if (dto.channel === 'MOBILE_MONEY') {
      const borrower = await this.prisma.retailBorrower.findUnique({ where: { id: account.borrowerId }});
      const internalRef = `REP-${Date.now()}`;
      try {
        const txResult = await this.mobileMoney.processCollection(borrower?.phone ?? '000000', dto.amount, internalRef);
        
        await this.prisma.transactionRecord.create({
          data: {
            internalRef,
            providerRef: txResult.providerRef,
            amount: dto.amount,
            currency: account.currency,
            direction: 'INBOUND',
            status: txResult.status,
            isLiveMode: (this.mobileMoney as any).isLiveMode ?? false,
            loanAccountId: account.id,
          }
        });

        if (txResult.status !== 'SUCCESS') {
          throw new BadRequestException(`Collection failed: ${txResult.failureReason}`);
        }
        
        dto.providerReference = txResult.providerRef ?? dto.providerReference;
      } catch (e: any) {
        if (e instanceof BadRequestException) throw e;
        throw new BadRequestException(e.message);
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const event = await tx.repaymentEvent.create({
        data: {
          loanAccountId: account.id,
          scheduleId: schedule.id,
          borrowerId: account.borrowerId,
          amount: dto.amount,
          currency: account.currency,
          channel: dto.channel,
          provider: dto.provider,
          providerReference: dto.providerReference,
          metadata: this.toJson(dto.metadata),
        },
      });
      const updatedSchedule = await tx.repaymentSchedule.update({
        where: { id: schedule.id },
        data: {
          amountPaid: newAmountPaid,
          status: scheduleStatus,
          paidAt:
            scheduleStatus === RepaymentScheduleStatus.PAID
              ? new Date()
              : undefined,
        },
      });

      let curedDelinquencyIds: string[] = [];
      if (isScheduleFullyPaid && account.delinquencyEvents.length > 0) {
        const scheduleDelinquency = account.delinquencyEvents.find(
          (d) => d.scheduleId === schedule.id,
        );
        if (scheduleDelinquency) {
          await tx.delinquencyEvent.update({
            where: { id: scheduleDelinquency.id },
            data: {
              status: 'CURED',
              curedAt: new Date(),
              reason: 'Cured by full repayment of overdue installment.',
            },
          });
          curedDelinquencyIds = [scheduleDelinquency.id];
        }
      }

      const updatedAccount = await tx.loanAccount.update({
        where: { id: account.id },
        data: {
          outstandingPrincipal: newOutstanding,
          status: newAccountStatus,
          closedAt:
            newAccountStatus === LoanAccountStatus.CLOSED
              ? new Date()
              : undefined,
        },
      });

      return {
        event,
        schedule: updatedSchedule,
        account: updatedAccount,
        curedDelinquencyIds,
      };
    });

    if (result.curedDelinquencyIds.length > 0) {
      const remainingOpen = await this.prisma.delinquencyEvent.count({
        where: { loanAccountId, status: { in: ['OPEN', 'ESCALATED'] } },
      });
      if (
        remainingOpen === 0 &&
        account.status === LoanAccountStatus.DEFAULTED &&
        result.account.status !== LoanAccountStatus.CLOSED
      ) {
        await this.prisma.loanAccount.update({
          where: { id: loanAccountId },
          data: { status: LoanAccountStatus.ACTIVE },
        });
      }
    }

    await this.audit.log({
      eventType: 'MICRO_REPAYMENT_POSTED',
      entityType: 'RepaymentEvent',
      entityId: result.event.id,
      actorId: actor?.id,
      newValue: {
        loanAccountId,
        amount: dto.amount,
        outstandingPrincipal: result.account.outstandingPrincipal,
        curedDelinquencyIds: result.curedDelinquencyIds,
      },
    });

    return result;
  }

  async openDelinquency(
    loanAccountId: string,
    dto: OpenDelinquencyDto,
    actor?: User,
  ) {
    const account = await this.prisma.loanAccount.findUniqueOrThrow({
      where: { id: loanAccountId },
    });
    if (dto.scheduleId) {
      await this.assertScheduleBelongsToLoan(dto.scheduleId, loanAccountId);
      const existing = await this.prisma.delinquencyEvent.findFirst({
        where: { loanAccountId, scheduleId: dto.scheduleId, status: 'OPEN' },
      });
      if (existing) {
        throw new BadRequestException(
          'DELINQUENCY_ALREADY_OPEN: This schedule already has an open delinquency event.',
        );
      }
    }
    const delinquency = await this.prisma.delinquencyEvent.create({
      data: {
        loanAccountId,
        scheduleId: dto.scheduleId,
        borrowerId: account.borrowerId,
        dpd: dto.dpd,
        overdueAmount: dto.overdueAmount,
        severity:
          dto.severity ??
          (dto.dpd >= 90 ? 'DEFAULT' : dto.dpd >= 30 ? 'HIGH' : 'WATCH'),
        reason: dto.reason,
        metadata: this.toJson(dto.metadata),
      },
    });

    await this.prisma.$transaction([
      ...(dto.scheduleId
        ? [
            this.prisma.repaymentSchedule.update({
              where: { id: dto.scheduleId },
              data: { status: RepaymentScheduleStatus.LATE },
            }),
          ]
        : []),
      ...(dto.dpd >= 90
        ? [
            this.prisma.loanAccount.update({
              where: { id: loanAccountId },
              data: { status: LoanAccountStatus.DEFAULTED },
            }),
          ]
        : []),
    ]);

    await this.audit.log({
      eventType: 'MICRO_DELINQUENCY_OPENED',
      entityType: 'DelinquencyEvent',
      entityId: delinquency.id,
      actorId: actor?.id,
      newValue: {
        loanAccountId,
        dpd: dto.dpd,
        overdueAmount: dto.overdueAmount,
      },
    });

    return delinquency;
  }

  async createCollectionAction(
    delinquencyId: string,
    dto: CreateCollectionActionDto,
    actor?: User,
  ) {
    const delinquency = await this.prisma.delinquencyEvent.findUniqueOrThrow({
      where: { id: delinquencyId },
    });
    if (dto.scheduleId) {
      await this.assertScheduleBelongsToLoan(
        dto.scheduleId,
        delinquency.loanAccountId,
      );
    }
    const action = await this.prisma.collectionAction.create({
      data: {
        loanAccountId: delinquency.loanAccountId,
        scheduleId: dto.scheduleId ?? delinquency.scheduleId,
        delinquencyEventId: delinquency.id,
        borrowerId: delinquency.borrowerId,
        actionType: dto.actionType,
        status: dto.status ?? CollectionActionStatus.PLANNED,
        assignedToId: dto.assignedToId ?? actor?.id,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        completedAt:
          dto.status === CollectionActionStatus.COMPLETED
            ? new Date()
            : undefined,
        outcome: dto.outcome,
        promiseToPayDate: dto.promiseToPayDate
          ? new Date(dto.promiseToPayDate)
          : undefined,
        promiseToPayAmount: dto.promiseToPayAmount,
        nextActionAt: dto.nextActionAt ? new Date(dto.nextActionAt) : undefined,
        notes: dto.notes,
        auditMetadata: this.toJson({ createdBy: actor?.id }),
      },
    });

    await this.audit.log({
      eventType: 'MICRO_COLLECTION_ACTION_CREATED',
      entityType: 'CollectionAction',
      entityId: action.id,
      actorId: actor?.id,
      newValue: {
        delinquencyId,
        actionType: action.actionType,
        status: action.status,
      },
    });

    return action;
  }

  async createMobileMoneySnapshot(
    dto: CreateMobileMoneySnapshotDto,
    actor?: User,
  ) {
    await this.assertActiveConsentForAnyPurpose(
      dto.borrowerId,
      ConsentSourceType.MOBILE_MONEY,
      [ConsentPurpose.UNDERWRITING, ConsentPurpose.AFFORDABILITY_ASSESSMENT],
      dto.consentGrantId,
    );

    const snapshot = await this.prisma.mobileMoneySnapshot.create({
      data: {
        borrowerId: dto.borrowerId,
        consentGrantId: dto.consentGrantId,
        provider: dto.provider,
        walletNumberMasked: dto.walletNumberMasked,
        statementStart: new Date(dto.statementStart),
        statementEnd: new Date(dto.statementEnd),
        cashInTotal: dto.cashInTotal ?? 0,
        cashOutTotal: dto.cashOutTotal ?? 0,
        avgBalance: dto.avgBalance ?? 0,
        transactionCount: dto.transactionCount ?? 0,
        activeDays: dto.activeDays ?? 0,
        salaryLikeInflows: dto.salaryLikeInflows ?? 0,
        merchantPaymentCount: dto.merchantPaymentCount ?? 0,
        reversalsCount: dto.reversalsCount ?? 0,
        metadata: this.toJson(dto.metadata),
      },
    });

    await this.audit.log({
      eventType: 'MICRO_MOBILE_MONEY_SNAPSHOT_CREATED',
      entityType: 'MobileMoneySnapshot',
      entityId: snapshot.id,
      actorId: actor?.id,
      newValue: {
        borrowerId: dto.borrowerId,
        provider: dto.provider,
        transactionCount: snapshot.transactionCount,
      },
    });

    return snapshot;
  }

  async createAlternativeDataFeatureSnapshot(
    dto: CreateAlternativeDataFeatureSnapshotDto,
    actor?: User,
  ) {
    const consentSource = this.mapAlternativeSourceToConsentSource(
      dto.sourceType,
    );
    if (consentSource) {
      await this.assertActiveConsentForAnyPurpose(
        dto.borrowerId,
        consentSource,
        [ConsentPurpose.UNDERWRITING],
        dto.consentGrantId,
      );
    }
    if (dto.applicationId) {
      const application =
        await this.prisma.microLoanApplication.findUniqueOrThrow({
          where: { id: dto.applicationId },
        });
      if (application.borrowerId !== dto.borrowerId) {
        throw new BadRequestException(
          'APPLICATION_BORROWER_MISMATCH: Alternative data snapshot borrower must match the application borrower.',
        );
      }
    }

    const snapshot = await this.prisma.alternativeDataFeatureSnapshot.create({
      data: {
        borrowerId: dto.borrowerId,
        applicationId: dto.applicationId,
        consentGrantId: dto.consentGrantId,
        sourceType: dto.sourceType,
        featureSchemaVersion: dto.featureSchemaVersion,
        payloadQualityScore: dto.payloadQualityScore,
        rawCount: dto.rawCount ?? 0,
        derivedCount: dto.derivedCount ?? 0,
        imputedCount: dto.imputedCount ?? 0,
        declaredCount: dto.declaredCount ?? 0,
        features: this.toJson(dto.features)!,
        lineage: this.toJson(dto.lineage)!,
      },
    });

    await this.audit.log({
      eventType: 'MICRO_ALT_DATA_FEATURE_SNAPSHOT_CREATED',
      entityType: 'AlternativeDataFeatureSnapshot',
      entityId: snapshot.id,
      actorId: actor?.id,
      newValue: {
        borrowerId: dto.borrowerId,
        sourceType: dto.sourceType,
        payloadQualityScore: dto.payloadQualityScore,
      },
    });

    return snapshot;
  }

  async getPortfolioSummary() {
    const [
      borrowers,
      applications,
      activeLoans,
      delinquencyEvents,
      collectionActions,
      disbursements,
    ] = await Promise.all([
      this.prisma.retailBorrower.count(),
      this.prisma.microLoanApplication.count(),
      this.prisma.loanAccount.findMany({
        where: { status: LoanAccountStatus.ACTIVE },
        select: { outstandingPrincipal: true, principalAmount: true },
      }),
      this.prisma.delinquencyEvent.count({ where: { status: 'OPEN' } }),
      this.prisma.collectionAction.count({ where: { status: 'PLANNED' } }),
      this.prisma.disbursement.aggregate({
        where: { status: DisbursementStatus.SUCCESS },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      borrowers,
      applications,
      activeLoanCount: activeLoans.length,
      totalPrincipal: this.roundMoney(
        activeLoans.reduce((sum, loan) => sum + loan.principalAmount, 0),
      ),
      outstandingPrincipal: this.roundMoney(
        activeLoans.reduce((sum, loan) => sum + loan.outstandingPrincipal, 0),
      ),
      openDelinquencies: delinquencyEvents,
      plannedCollectionActions: collectionActions,
      successfulDisbursements: disbursements._count,
      disbursedAmount: this.roundMoney(disbursements._sum.amount ?? 0),
      generatedAt: new Date().toISOString(),
    };
  }

  async getPortfolioAnalytics(query: PortfolioAnalyticsQueryDto) {
    const windowEnd = query.windowEnd ? new Date(query.windowEnd) : new Date();
    const windowStart = query.windowStart
      ? new Date(query.windowStart)
      : this.addDays(windowEnd, -30);
    const portfolioLoans = await this.prisma.loanAccount.findMany({
      where: {
        status: {
          in: [
            LoanAccountStatus.ACTIVE,
            LoanAccountStatus.DEFAULTED,
            LoanAccountStatus.WRITTEN_OFF,
          ],
        },
      },
      include: {
        delinquencyEvents: {
          where: {
            status: {
              in: [DelinquencyStatus.OPEN, DelinquencyStatus.ESCALATED],
            },
          },
        },
      },
    });
    const openDelinquencies = await this.prisma.delinquencyEvent.findMany({
      where: {
        status: { in: [DelinquencyStatus.OPEN, DelinquencyStatus.ESCALATED] },
      },
      select: { dpd: true, overdueAmount: true, severity: true },
    });
    const [completedCollections, totalCollections, disbursements] =
      await Promise.all([
        this.prisma.collectionAction.count({
          where: {
            status: CollectionActionStatus.COMPLETED,
            completedAt: { gte: windowStart, lte: windowEnd },
          },
        }),
        this.prisma.collectionAction.count({
          where: { createdAt: { gte: windowStart, lte: windowEnd } },
        }),
        this.prisma.disbursement.aggregate({
          where: {
            status: DisbursementStatus.SUCCESS,
            disbursedAt: { gte: windowStart, lte: windowEnd },
          },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

    const activeAndDefaultedLoans = portfolioLoans.filter((loan) => loan.status !== LoanAccountStatus.WRITTEN_OFF);
    const writtenOffLoans = portfolioLoans.filter((loan) => loan.status === LoanAccountStatus.WRITTEN_OFF);

    const outstanding = this.roundMoney(
      activeAndDefaultedLoans.reduce((sum, loan) => sum + loan.outstandingPrincipal, 0),
    );
    const writtenOffExposure = this.roundMoney(
      writtenOffLoans.reduce((sum, loan) => sum + loan.outstandingPrincipal, 0),
    );

    const par30Outstanding = this.roundMoney(
      activeAndDefaultedLoans
        .filter((loan) =>
          loan.delinquencyEvents.some((event) => event.dpd >= 30),
        )
        .reduce((sum, loan) => sum + loan.outstandingPrincipal, 0),
    );
    const par90Outstanding = this.roundMoney(
      activeAndDefaultedLoans
        .filter((loan) =>
          loan.delinquencyEvents.some((event) => event.dpd >= 90),
        )
        .reduce((sum, loan) => sum + loan.outstandingPrincipal, 0),
    );

    const atRiskExposure = this.roundMoney(par30Outstanding + writtenOffExposure);

    const agingBuckets = {
      dpd1to7: openDelinquencies.filter(
        (event) => event.dpd >= 1 && event.dpd <= 7,
      ).length,
      dpd8to30: openDelinquencies.filter(
        (event) => event.dpd >= 8 && event.dpd <= 30,
      ).length,
      dpd31to90: openDelinquencies.filter(
        (event) => event.dpd >= 31 && event.dpd <= 90,
      ).length,
      dpd90Plus: openDelinquencies.filter((event) => event.dpd > 90).length,
    };

    return {
      windowStart,
      windowEnd,
      activeLoanCount: portfolioLoans.filter(
        (loan) => loan.status === LoanAccountStatus.ACTIVE,
      ).length,
      defaultedLoanCount: portfolioLoans.filter(
        (loan) => loan.status === LoanAccountStatus.DEFAULTED,
      ).length,
      writtenOffLoanCount: writtenOffLoans.length,
      outstandingPrincipal: outstanding,
      par30Outstanding,
      par90Outstanding,
      par30Ratio:
        outstanding > 0
          ? this.roundScore((par30Outstanding / outstanding) * 100)
          : 0,
      par90Ratio:
        outstanding > 0
          ? this.roundScore((par90Outstanding / outstanding) * 100)
          : 0,
      writtenOffExposure,
      atRiskExposure,
      openDelinquencyCount: openDelinquencies.length,
      agingBuckets,
      collectionEfficiency:
        totalCollections > 0
          ? this.roundScore((completedCollections / totalCollections) * 100)
          : 0,
      completedCollections,
      totalCollections,
      disbursementCount: disbursements._count,
      disbursedAmount: this.roundMoney(disbursements._sum.amount ?? 0),
      generatedAt: new Date().toISOString(),
    };
  }

  async renewLoan(
    closedLoanAccountId: string,
    dto: RenewLoanDto,
    actor?: User,
  ) {
    const closedAccount = await this.prisma.loanAccount.findUniqueOrThrow({
      where: { id: closedLoanAccountId },
      include: { repaymentEvents: true, delinquencyEvents: true },
    });
    if (closedAccount.borrowerId !== dto.borrowerId) {
      throw new BadRequestException(
        'LOAN_BORROWER_MISMATCH: Renewal borrower must match the closed loan borrower.',
      );
    }
    if (closedAccount.status !== LoanAccountStatus.CLOSED) {
      throw new BadRequestException(
        'LOAN_NOT_CLOSED: Only closed loan accounts are eligible for renewal.',
      );
    }
    const onTimePayments = closedAccount.repaymentEvents.filter(
      (e) => e.status === 'POSTED',
    ).length;
    const hadDelinquency = closedAccount.delinquencyEvents.length > 0;
    const previousOffer = await this.prisma.loanOffer.findUniqueOrThrow({
      where: { id: closedAccount.loanOfferId },
      include: { decision: { include: { policySnapshot: true } } },
    });
    const policySnapshot = previousOffer.decision?.policySnapshot?.snapshot;
    const renewalRules = policySnapshot
      ? this.readRecord(policySnapshot, 'renewalRules')
      : null;
    const minOnTimeRepayments = this.readNumberFromRecord(
      renewalRules,
      'minOnTimeRepayments',
      2,
    );
    const maxIncreasePct = this.readNumberFromRecord(
      renewalRules,
      'maxIncreasePct',
      50,
    );

    if (hadDelinquency) {
      throw new BadRequestException(
        'RENEWAL_INELIGIBLE_DELINQUENCY: Borrower had delinquency on the previous loan cycle.',
      );
    }
    if (onTimePayments < minOnTimeRepayments) {
      throw new BadRequestException(
        `RENEWAL_INELIGIBLE_REPAYMENTS: Requires ${minOnTimeRepayments} on-time payments, found ${onTimePayments}.`,
      );
    }

    const maxAllowedAmount =
      closedAccount.principalAmount * (1 + maxIncreasePct / 100);
    if (dto.requestedAmount > maxAllowedAmount) {
      throw new BadRequestException(
        `RENEWAL_AMOUNT_EXCEEDS_PROGRESSIVE_CAP: Maximum ${this.roundMoney(maxAllowedAmount)} based on progressive lending rules.`,
      );
    }

    const application = await this.createApplication(
      {
        borrowerId: dto.borrowerId,
        policyId:
          dto.policyId ??
          previousOffer.decision?.policySnapshot?.policyId ??
          undefined,
        requestedAmount: dto.requestedAmount,
        purpose:
          dto.purpose ?? `Renewal of loan ${closedAccount.accountNumber}`,
        channel: dto.channel ?? 'BRANCH',
      },
      actor,
    );

    await this.audit.log({
      eventType: 'MICRO_LOAN_RENEWAL_INITIATED',
      entityType: 'LoanAccount',
      entityId: closedLoanAccountId,
      actorId: actor?.id,
      newValue: {
        newApplicationId: application.id,
        previousPrincipal: closedAccount.principalAmount,
        requestedAmount: dto.requestedAmount,
      },
    });

    return {
      application,
      renewalRules: {
        minOnTimeRepayments,
        maxIncreasePct,
        onTimePayments,
        hadDelinquency,
      },
    };
  }

  async escalateDelinquency(
    delinquencyId: string,
    dto: EscalateDelinquencyDto,
    actor?: User,
  ) {
    const existing = await this.prisma.delinquencyEvent.findUniqueOrThrow({
      where: { id: delinquencyId },
    });
    if (existing.status !== 'OPEN' && existing.status !== 'ESCALATED') {
      throw new BadRequestException(
        'DELINQUENCY_NOT_ESCALATABLE: Only OPEN or ESCALATED delinquencies can be escalated.',
      );
    }
    const escalationTier = this.nextEscalationTier(
      existing.severity,
      existing.dpd,
    );
    const updated = await this.prisma.delinquencyEvent.update({
      where: { id: delinquencyId },
      data: {
        status: 'ESCALATED',
        severity: dto.severity ?? escalationTier,
        reason: dto.reason ?? `Escalated to ${dto.severity ?? escalationTier}`,
        metadata: this.toJson(dto.metadata),
      },
    });

    if (escalationTier === 'DEFAULT' || updated.dpd >= 90) {
      await this.prisma.loanAccount.update({
        where: { id: existing.loanAccountId },
        data: { status: LoanAccountStatus.DEFAULTED },
      });
    }

    await this.audit.log({
      eventType: 'MICRO_DELINQUENCY_ESCALATED',
      entityType: 'DelinquencyEvent',
      entityId: delinquencyId,
      actorId: actor?.id,
      previousValue: { status: existing.status, severity: existing.severity },
      newValue: { status: updated.status, severity: updated.severity },
    });

    return updated;
  }

  async cureDelinquency(
    delinquencyId: string,
    dto: CureDelinquencyDto,
    actor?: User,
  ) {
    const existing = await this.prisma.delinquencyEvent.findUniqueOrThrow({
      where: { id: delinquencyId },
    });
    if (existing.status !== 'OPEN' && existing.status !== 'ESCALATED') {
      throw new BadRequestException(
        'DELINQUENCY_NOT_CURABLE: Only OPEN or ESCALATED delinquencies can be cured.',
      );
    }
    const updated = await this.prisma.delinquencyEvent.update({
      where: { id: delinquencyId },
      data: {
        status: 'CURED',
        curedAt: new Date(),
        reason: dto.reason ?? 'Delinquency cured — overdue balance resolved.',
        metadata: this.toJson(dto.metadata),
      },
    });

    const openDelinquencies = await this.prisma.delinquencyEvent.count({
      where: {
        loanAccountId: existing.loanAccountId,
        status: { in: ['OPEN', 'ESCALATED'] },
      },
    });
    if (openDelinquencies === 0) {
      const account = await this.prisma.loanAccount.findUniqueOrThrow({
        where: { id: existing.loanAccountId },
      });
      if (account.status === LoanAccountStatus.DEFAULTED) {
        await this.prisma.loanAccount.update({
          where: { id: existing.loanAccountId },
          data: { status: LoanAccountStatus.ACTIVE },
        });
      }
    }

    await this.audit.log({
      eventType: 'MICRO_DELINQUENCY_CURED',
      entityType: 'DelinquencyEvent',
      entityId: delinquencyId,
      actorId: actor?.id,
      previousValue: { status: existing.status },
      newValue: { status: updated.status, curedAt: updated.curedAt },
    });

    return updated;
  }

  async writeOffLoanAccount(
    loanAccountId: string,
    dto: WriteOffLoanAccountDto,
    actor?: User,
  ) {
    const account = await this.prisma.loanAccount.findUniqueOrThrow({
      where: { id: loanAccountId },
      include: {
        delinquencyEvents: { where: { status: { in: ['OPEN', 'ESCALATED'] } } },
      },
    });
    if (
      account.status !== LoanAccountStatus.DEFAULTED &&
      account.status !== LoanAccountStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'WRITE_OFF_INVALID_STATE: Only DEFAULTED or ACTIVE accounts with severe delinquency can be written off.',
      );
    }
    if (account.status !== LoanAccountStatus.DEFAULTED) {
      const hasSevere = account.delinquencyEvents.some((d) => d.dpd >= 180);
      if (!hasSevere) {
        throw new BadRequestException(
          'WRITE_OFF_PREREQUISITE_MISSING: Account must be DEFAULTED or have 180+ DPD delinquency.',
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const writtenOff = await tx.loanAccount.update({
        where: { id: loanAccountId },
        data: { status: LoanAccountStatus.WRITTEN_OFF, closedAt: new Date() },
      });
      await tx.delinquencyEvent.updateMany({
        where: { loanAccountId, status: { in: ['OPEN', 'ESCALATED'] } },
        data: { status: 'WRITTEN_OFF' },
      });
      return writtenOff;
    });

    await this.audit.log({
      eventType: 'MICRO_LOAN_WRITTEN_OFF',
      entityType: 'LoanAccount',
      entityId: loanAccountId,
      actorId: actor?.id,
      newValue: {
        status: updated.status,
        outstandingPrincipal: account.outstandingPrincipal,
        reason: dto.reason,
      },
    });

    return updated;
  }

  async completeCollectionAction(
    actionId: string,
    dto: CompleteCollectionActionDto,
    actor?: User,
  ) {
    const existing = await this.prisma.collectionAction.findUniqueOrThrow({
      where: { id: actionId },
    });
    if (existing.status !== 'PLANNED') {
      throw new BadRequestException(
        'COLLECTION_ACTION_NOT_COMPLETABLE: Only PLANNED actions can be completed.',
      );
    }
    const updated = await this.prisma.collectionAction.update({
      where: { id: actionId },
      data: {
        status: dto.status,
        outcome: dto.outcome,
        completedAt:
          dto.status === CollectionActionStatus.COMPLETED
            ? new Date()
            : existing.completedAt,
        nextActionAt: dto.nextActionAt
          ? new Date(dto.nextActionAt)
          : existing.nextActionAt,
        notes: dto.notes ?? existing.notes,
        auditMetadata: this.toJson({ completedBy: actor?.id }),
      },
    });

    await this.audit.log({
      eventType: 'MICRO_COLLECTION_ACTION_COMPLETED',
      entityType: 'CollectionAction',
      entityId: actionId,
      actorId: actor?.id,
      previousValue: { status: existing.status },
      newValue: { status: updated.status, outcome: updated.outcome },
    });

    return updated;
  }

  async getFairnessMetrics(query: FairnessWindowDto) {
    const windowEnd = query.windowEnd ? new Date(query.windowEnd) : new Date();
    const windowStart = query.windowStart
      ? new Date(query.windowStart)
      : this.addDays(windowEnd, -30);
    const segmentFilter = query.segment;

    const segments = segmentFilter
      ? [segmentFilter]
      : [
          BorrowerSegment.INFORMAL,
          BorrowerSegment.SEMI_FORMAL,
          BorrowerSegment.THIN_FILE,
          BorrowerSegment.FORMAL,
        ];

    const results = await Promise.all(
      segments.map(async (segment) => {
        const [approved, rejected, total, altDataSnapshots] = await Promise.all(
          [
            this.prisma.microLoanDecision.count({
              where: {
                borrower: { segment },
                status: {
                  in: [
                    DecisionStatus.APPROVE,
                    DecisionStatus.APPROVE_WITH_CONDITIONS,
                  ],
                },
                decidedAt: { gte: windowStart, lte: windowEnd },
              },
            }),
            this.prisma.microLoanDecision.count({
              where: {
                borrower: { segment },
                status: DecisionStatus.REJECT,
                decidedAt: { gte: windowStart, lte: windowEnd },
              },
            }),
            this.prisma.microLoanDecision.count({
              where: {
                borrower: { segment },
                decidedAt: { gte: windowStart, lte: windowEnd },
              },
            }),
            this.prisma.alternativeDataFeatureSnapshot.aggregate({
              where: {
                borrower: { segment },
                createdAt: { gte: windowStart, lte: windowEnd },
              },
              _avg: { payloadQualityScore: true, imputedCount: true },
              _count: true,
            }),
          ],
        );

        const approvalRate =
          total > 0 ? this.roundScore((approved / total) * 100) : 0;
        const rejectionRate =
          total > 0 ? this.roundScore((rejected / total) * 100) : 0;
        const avgImputedCount = altDataSnapshots._avg.imputedCount ?? 0;
        const avgPayloadQuality =
          altDataSnapshots._avg.payloadQualityScore ?? 0;

        const delinquencyCount = await this.prisma.delinquencyEvent.count({
          where: {
            borrower: { segment },
            openedAt: { gte: windowStart, lte: windowEnd },
          },
        });

        return {
          segment,
          totalDecisions: total,
          approved,
          rejected,
          approvalRate,
          rejectionRate,
          delinquencyEvents: delinquencyCount,
          altDataSnapshotCount: altDataSnapshots._count,
          avgAltDataPayloadQuality: this.roundScore(avgPayloadQuality),
          avgAltDataImputedCount: this.roundScore(avgImputedCount),
        };
      }),
    );

    const records = results.flatMap((r) => [
      {
        segment: r.segment,
        metricName: 'APPROVAL_RATE',
        metricValue: r.approvalRate,
        sampleSize: r.totalDecisions,
        windowStart,
        windowEnd,
      },
      {
        segment: r.segment,
        metricName: 'REJECTION_RATE',
        metricValue: r.rejectionRate,
        sampleSize: r.totalDecisions,
        windowStart,
        windowEnd,
      },
      {
        segment: r.segment,
        metricName: 'DELINQUENCY_COUNT',
        metricValue: r.delinquencyEvents,
        sampleSize: r.totalDecisions,
        windowStart,
        windowEnd,
      },
      {
        segment: r.segment,
        metricName: 'ALT_DATA_AVG_IMPUTED',
        metricValue: r.avgAltDataImputedCount,
        sampleSize: r.altDataSnapshotCount,
        windowStart,
        windowEnd,
      },
      {
        segment: r.segment,
        metricName: 'ALT_DATA_AVG_QUALITY',
        metricValue: r.avgAltDataPayloadQuality,
        sampleSize: r.altDataSnapshotCount,
        windowStart,
        windowEnd,
      },
    ]);

    await this.prisma.fairnessMetric.createMany({
      data: records.map((r) => ({
        segment: r.segment,
        metricName: r.metricName,
        metricValue: r.metricValue,
        sampleSize: r.sampleSize,
        windowStart: r.windowStart,
        windowEnd: r.windowEnd,
      })),
      skipDuplicates: true,
    });

    return { windowStart, windowEnd, segments: results };
  }

  async getConsentCoverage(query: ConsentCoverageDto) {
    const where: Prisma.ConsentGrantWhereInput = {};
    if (query.segment) where.borrower = { segment: query.segment };
    if (query.sourceType) where.sourceType = query.sourceType;

    const [total, granted, revoked, expired, bySource] = await Promise.all([
      this.prisma.consentGrant.count({ where }),
      this.prisma.consentGrant.count({
        where: { ...where, status: 'GRANTED' },
      }),
      this.prisma.consentGrant.count({
        where: { ...where, status: 'REVOKED' },
      }),
      this.prisma.consentGrant.count({
        where: { ...where, status: 'EXPIRED' },
      }),
      this.prisma.consentGrant.groupBy({
        by: ['sourceType'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    return {
      total,
      granted,
      revoked,
      expired,
      coverageRate: total > 0 ? this.roundScore((granted / total) * 100) : 0,
      bySource: bySource.map((s) => ({
        sourceType: s.sourceType,
        count: s._count.id,
      })),
    };
  }

  async getAltDataLineage(query: AltDataLineageQueryDto) {
    const {
      page = 1,
      limit = 20,
      borrowerId,
      sourceType,
      applicationId,
    } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.AlternativeDataFeatureSnapshotWhereInput = {};
    if (borrowerId) where.borrowerId = borrowerId;
    if (sourceType) where.sourceType = sourceType;
    if (applicationId) where.applicationId = applicationId;

    const [data, total] = await Promise.all([
      this.prisma.alternativeDataFeatureSnapshot.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          borrower: { select: { id: true, fullName: true, segment: true } },
          consentGrant: {
            select: { id: true, sourceType: true, status: true, purpose: true },
          },
        },
      }),
      this.prisma.alternativeDataFeatureSnapshot.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findLoanAccounts(query: LoanAccountQueryDto) {
    const { page = 1, limit = 20, search, segment, status } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.LoanAccountWhereInput = {};

    if (status) where.status = status;
    if (segment) where.borrower = { segment };
    if (search) {
      where.OR = [
        { accountNumber: { contains: search, mode: 'insensitive' } },
        { borrower: { fullName: { contains: search, mode: 'insensitive' } } },
        { borrower: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.loanAccount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          borrower: {
            select: { id: true, fullName: true, phone: true, segment: true },
          },
          application: { select: { id: true, reqId: true } },
          disbursement: { select: { id: true, status: true, channel: true } },
          repaymentSchedules: { orderBy: { installmentNumber: 'asc' } },
          delinquencyEvents: {
            where: { status: { in: ['OPEN', 'ESCALATED'] } },
            orderBy: { openedAt: 'desc' },
          },
          collectionActions: {
            where: { status: 'PLANNED' },
            orderBy: { scheduledAt: 'asc' },
          },
        },
      }),
      this.prisma.loanAccount.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findLoanAccount(id: string) {
    return this.prisma.loanAccount.findUniqueOrThrow({
      where: { id },
      include: {
        borrower: { include: { informalBusinessProfile: true } },
        application: true,
        loanOffer: true,
        disbursement: true,
        repaymentSchedules: { orderBy: { installmentNumber: 'asc' } },
        repaymentEvents: { orderBy: { receivedAt: 'desc' } },
        delinquencyEvents: { orderBy: { openedAt: 'desc' } },
        collectionActions: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async findDelinquencies(query: DelinquencyQueryDto) {
    const { page = 1, limit = 20, search, segment, status } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.DelinquencyEventWhereInput = {};

    if (status) where.status = status;
    if (segment) where.borrower = { segment };
    if (search) {
      where.OR = [
        {
          loanAccount: {
            accountNumber: { contains: search, mode: 'insensitive' },
          },
        },
        { borrower: { fullName: { contains: search, mode: 'insensitive' } } },
        { borrower: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.delinquencyEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { openedAt: 'desc' },
        include: {
          borrower: {
            select: { id: true, fullName: true, phone: true, segment: true },
          },
          loanAccount: {
            select: {
              id: true,
              accountNumber: true,
              status: true,
              outstandingPrincipal: true,
            },
          },
          schedule: {
            select: {
              id: true,
              installmentNumber: true,
              totalDue: true,
              amountPaid: true,
            },
          },
          collectionActions: {
            where: { status: 'PLANNED' },
            orderBy: { scheduledAt: 'asc' },
          },
        },
      }),
      this.prisma.delinquencyEvent.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findCollectionActions(query: CollectionActionQueryDto) {
    const { page = 1, limit = 20, search, segment, status } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.CollectionActionWhereInput = {};

    if (status) where.status = status;
    if (segment) where.borrower = { segment };
    if (search) {
      where.OR = [
        {
          loanAccount: {
            accountNumber: { contains: search, mode: 'insensitive' },
          },
        },
        { borrower: { fullName: { contains: search, mode: 'insensitive' } } },
        { borrower: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.collectionAction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          borrower: {
            select: { id: true, fullName: true, phone: true, segment: true },
          },
          loanAccount: {
            select: { id: true, accountNumber: true, status: true },
          },
          delinquencyEvent: {
            select: { id: true, dpd: true, severity: true, status: true },
          },
        },
      }),
      this.prisma.collectionAction.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findDisbursements(query: DisbursementQueryDto) {
    const { page = 1, limit = 20, status, borrowerId } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.DisbursementWhereInput = {};

    if (status) where.status = status;
    if (borrowerId) where.borrowerId = borrowerId;

    const [data, total] = await Promise.all([
      this.prisma.disbursement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          borrower: {
            select: { id: true, fullName: true, phone: true, segment: true },
          },
          loanOffer: {
            select: { id: true, approvedAmount: true, tenorDays: true },
          },
          loanAccount: {
            select: { id: true, accountNumber: true, status: true },
          },
        },
      }),
      this.prisma.disbursement.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findFieldVisits(query: FieldVisitQueryDto) {
    const { page = 1, limit = 20, status, applicationId, assignedToId } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.FieldVisitWhereInput = {};

    if (status) where.status = status;
    if (applicationId) where.applicationId = applicationId;
    if (assignedToId) where.assignedToId = assignedToId;

    const [data, total] = await Promise.all([
      this.prisma.fieldVisit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          borrower: {
            select: { id: true, fullName: true, phone: true, segment: true },
          },
          application: { select: { id: true, reqId: true, status: true } },
        },
      }),
      this.prisma.fieldVisit.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async markSchedulesOverdue() {
    const now = new Date();
    const overdueSchedules = await this.prisma.repaymentSchedule.findMany({
      where: {
        status: RepaymentScheduleStatus.SCHEDULED,
        dueDate: { lt: now },
      },
      include: { loanAccount: true },
    });

    let schedulesMarkedDue = 0;
    let schedulesMarkedLate = 0;
    let delinquenciesOpened = 0;

    for (const schedule of overdueSchedules) {
      const daysPastDue = Math.floor(
        (now.getTime() - schedule.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const outstandingBalance = this.roundMoney(
        schedule.totalDue - schedule.amountPaid,
      );
      const isLate = daysPastDue > 0 && outstandingBalance > 0;

      await this.prisma.repaymentSchedule.update({
        where: { id: schedule.id },
        data: {
          status: isLate
            ? RepaymentScheduleStatus.LATE
            : RepaymentScheduleStatus.DUE,
        },
      });

      if (isLate) {
        schedulesMarkedLate++;
      } else {
        schedulesMarkedDue++;
      }

      if (
        isLate &&
        schedule.loanAccount.status !== LoanAccountStatus.WRITTEN_OFF
      ) {
        const existingDelinquency =
          await this.prisma.delinquencyEvent.findFirst({
            where: {
              loanAccountId: schedule.loanAccountId,
              scheduleId: schedule.id,
              status: { in: ['OPEN', 'ESCALATED'] },
            },
          });

        if (!existingDelinquency) {
          await this.openDelinquency(schedule.loanAccountId, {
            scheduleId: schedule.id,
            dpd: daysPastDue,
            overdueAmount: outstandingBalance,
            severity:
              daysPastDue >= 90
                ? 'DEFAULT'
                : daysPastDue >= 30
                  ? 'HIGH'
                  : 'WATCH',
            reason: `Auto-detected: ${daysPastDue} DPD on installment #${schedule.installmentNumber}`,
          });

          delinquenciesOpened++;
        }
      }
    }

    await this.audit.log({
      eventType: 'MICRO_SCHEDULES_MARKED_OVERDUE',
      entityType: 'RepaymentSchedule',
      entityId: 'batch',
      newValue: {
        schedulesMarkedDue,
        schedulesMarkedLate,
        delinquenciesOpened,
        runAt: now.toISOString(),
      },
    });

    return {
      schedulesMarkedDue,
      schedulesMarkedLate,
      delinquenciesOpened,
      totalProcessed: overdueSchedules.length,
    };
  }

  async submitSupervisorDecision(
    applicationId: string,
    dto: SubmitSupervisorDecisionDto,
    actor?: User,
  ) {
    const application =
      await this.prisma.microLoanApplication.findUniqueOrThrow({
        where: { id: applicationId },
        include: {
          policySnapshot: true,
          scorecards: { orderBy: { createdAt: 'desc' }, take: 1 },
          decisions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });

    if (application.status !== MicroLoanApplicationStatus.SUPERVISOR_REVIEW) {
      throw new BadRequestException(
        'APPLICATION_NOT_IN_SUPERVISOR_REVIEW: Only applications in SUPERVISOR_REVIEW status can receive a supervisor decision.',
      );
    }

    const scorecard = application.scorecards[0];
    if (!scorecard) {
      throw new BadRequestException(
        'SCORECARD_REQUIRED: No scorecard found for this application.',
      );
    }
    if (!application.policySnapshot) {
      throw new BadRequestException(
        'POLICY_SNAPSHOT_REQUIRED: Cannot decide an application without an applied policy snapshot.',
      );
    }

    const recommendedStatus = this.statusFromRecommendation(
      scorecard.recommendation,
    );
    const status = dto.status ?? recommendedStatus;
    if (status !== recommendedStatus && !dto.overrideReason) {
      throw new BadRequestException(
        'OVERRIDE_REASON_REQUIRED: Decision status differs from scorecard recommendation.',
      );
    }

    const policy = this.readPolicySnapshot(application.policySnapshot.snapshot);
    const maxAmount = this.readNumber(
      policy,
      'maxAmount',
      application.requestedAmount,
    );
    const minAmount = this.readNumber(policy, 'minAmount', 0);
    const allowedTenors = this.readNumberArray(policy, 'allowedTenors', [30]);
    const rateMin = this.readNumber(policy, 'interestRateMin', 0);
    const rateMax = this.readNumber(policy, 'interestRateMax', rateMin);
    const isPositiveDecision =
      status === DecisionStatus.APPROVE ||
      status === DecisionStatus.APPROVE_WITH_CONDITIONS;
    const approvedAmount = isPositiveDecision
      ? Math.max(
          minAmount,
          Math.min(
            dto.approvedAmount ?? application.requestedAmount,
            maxAmount,
          ),
        )
      : undefined;
    const tenorDays = isPositiveDecision
      ? (dto.tenorDays ?? allowedTenors[0])
      : undefined;
    const interestRate = isPositiveDecision
      ? (dto.interestRate ?? this.roundMoney((rateMin + rateMax) / 2))
      : undefined;

    if (
      isPositiveDecision &&
      tenorDays != null &&
      !allowedTenors.includes(tenorDays)
    ) {
      throw new BadRequestException(
        'TENOR_NOT_ALLOWED: tenorDays is not allowed by the applied policy snapshot.',
      );
    }

    const reasons = this.extractReasonRecords(scorecard.reasonCodes);
    const decision = await this.prisma.microLoanDecision.create({
      data: {
        applicationId,
        borrowerId: application.borrowerId,
        scorecardId: scorecard.id,
        policySnapshotId: application.policySnapshot?.id,
        status,
        approvedAmount,
        tenorDays,
        interestRate,
        overrideFlag: status !== recommendedStatus || dto.overrideFlag === true,
        overrideReason: dto.overrideReason,
        decidedById: actor?.id,
        decidedAt: new Date(),
        decisionType: 'SUPERVISOR_REVIEW',
        conditions: this.toJson(dto.conditions),
        auditMetadata: this.toJson({ supervisorReview: true }),
        reasons: { create: reasons },
      },
      include: { reasons: true },
    });

    await this.prisma.microLoanApplication.update({
      where: { id: applicationId },
      data: { status: this.applicationStatusFromDecision(status) },
    });

    await this.audit.log({
      eventType: 'MICRO_SUPERVISOR_DECISION_SUBMITTED',
      entityType: 'MicroLoanDecision',
      entityId: decision.id,
      actorId: actor?.id,
      newValue: {
        applicationId,
        status,
        approvedAmount,
        tenorDays,
        decisionType: 'SUPERVISOR_REVIEW',
      },
    });

    return decision;
  }

  async cancelApplication(
    applicationId: string,
    dto: CancelApplicationDto,
    actor?: User,
  ) {
    const application =
      await this.prisma.microLoanApplication.findUniqueOrThrow({
        where: { id: applicationId },
      });

    const cancellableStatuses: MicroLoanApplicationStatus[] = [
      MicroLoanApplicationStatus.DRAFT,
      MicroLoanApplicationStatus.SUBMITTED,
      MicroLoanApplicationStatus.FIELD_REVIEW_REQUIRED,
      MicroLoanApplicationStatus.FIELD_REVIEWED,
      MicroLoanApplicationStatus.SCORED,
      MicroLoanApplicationStatus.SUPERVISOR_REVIEW,
    ];
    if (!cancellableStatuses.includes(application.status)) {
      throw new BadRequestException(
        'APPLICATION_NOT_CANCELLABLE: Only pre-decision applications can be cancelled.',
      );
    }

    const updated = await this.prisma.microLoanApplication.update({
      where: { id: applicationId },
      data: { status: MicroLoanApplicationStatus.CANCELLED },
    });

    await this.audit.log({
      eventType: 'MICRO_APPLICATION_CANCELLED',
      entityType: 'MicroLoanApplication',
      entityId: applicationId,
      actorId: actor?.id,
      previousValue: { status: application.status },
      newValue: { status: updated.status, reason: dto.reason },
    });

    return updated;
  }

  async reapply(rejectedApplicationId: string, dto: ReapplyDto, actor?: User) {
    const previous = await this.prisma.microLoanApplication.findUniqueOrThrow({
      where: { id: rejectedApplicationId },
    });

    if (
      previous.status !== MicroLoanApplicationStatus.REJECTED &&
      previous.status !== MicroLoanApplicationStatus.EXPIRED
    ) {
      throw new BadRequestException(
        'REAPPLY_INVALID_STATUS: Can only re-apply from REJECTED or EXPIRED applications.',
      );
    }
    if (previous.borrowerId !== dto.borrowerId) {
      throw new BadRequestException(
        'REAPPLY_BORROWER_MISMATCH: Re-application borrower must match the original.',
      );
    }

    const application = await this.createApplication(
      {
        borrowerId: dto.borrowerId,
        policyId: dto.policyId,
        requestedAmount: dto.requestedAmount,
        purpose: dto.purpose ?? `Re-application from ${previous.reqId}`,
        productType: dto.productType,
        channel: dto.channel ?? 'BRANCH',
      },
      actor,
    );

    await this.audit.log({
      eventType: 'MICRO_REAPPLICATION_CREATED',
      entityType: 'MicroLoanApplication',
      entityId: application.id,
      actorId: actor?.id,
      newValue: {
        previousApplicationId: rejectedApplicationId,
        previousReqId: previous.reqId,
        newApplicationId: application.id,
      },
    });

    return { application, previousApplicationId: rejectedApplicationId };
  }

  async declineOffer(offerId: string, dto: DeclineOfferDto, actor?: User) {
    const offer = await this.prisma.loanOffer.findUniqueOrThrow({
      where: { id: offerId },
    });
    if (offer.status !== LoanOfferStatus.ISSUED) {
      throw new BadRequestException(
        'OFFER_NOT_ISSUED: Only issued offers can be declined.',
      );
    }

    const updated = await this.prisma.loanOffer.update({
      where: { id: offerId },
      data: { status: LoanOfferStatus.DECLINED },
    });

    await this.audit.log({
      eventType: 'MICRO_LOAN_OFFER_DECLINED',
      entityType: 'LoanOffer',
      entityId: offerId,
      actorId: actor?.id,
      previousValue: { status: offer.status },
      newValue: { status: updated.status, reason: dto.reason },
    });

    return updated;
  }

  async cancelOffer(offerId: string, dto: CancelOfferDto, actor?: User) {
    const offer = await this.prisma.loanOffer.findUniqueOrThrow({
      where: { id: offerId },
    });
    if (
      offer.status !== LoanOfferStatus.ISSUED &&
      offer.status !== LoanOfferStatus.DRAFT
    ) {
      throw new BadRequestException(
        'OFFER_NOT_CANCELLABLE: Only ISSUED or DRAFT offers can be cancelled.',
      );
    }

    const updated = await this.prisma.loanOffer.update({
      where: { id: offerId },
      data: { status: LoanOfferStatus.CANCELLED },
    });

    await this.audit.log({
      eventType: 'MICRO_LOAN_OFFER_CANCELLED',
      entityType: 'LoanOffer',
      entityId: offerId,
      actorId: actor?.id,
      previousValue: { status: offer.status },
      newValue: { status: updated.status, reason: dto.reason },
    });

    return updated;
  }

  async expireStaleOffers() {
    const now = new Date();
    const expiredOffers = await this.prisma.loanOffer.findMany({
      where: {
        status: LoanOfferStatus.ISSUED,
        expiresAt: { lt: now },
      },
    });

    let expiredCount = 0;
    for (const offer of expiredOffers) {
      await this.prisma.loanOffer.update({
        where: { id: offer.id },
        data: { status: LoanOfferStatus.EXPIRED },
      });
      expiredCount++;
    }

    if (expiredCount > 0) {
      await this.audit.log({
        eventType: 'MICRO_STALE_OFFERS_EXPIRED',
        entityType: 'LoanOffer',
        entityId: 'batch',
        newValue: { expiredCount, runAt: now.toISOString() },
      });
    }

    return { expiredCount, totalProcessed: expiredOffers.length };
  }

  async retryDisbursement(
    failedDisbursementId: string,
    dto: RetryDisbursementDto,
    actor?: User,
  ) {
    const failed = await this.prisma.disbursement.findUniqueOrThrow({
      where: { id: failedDisbursementId },
      include: { loanOffer: true },
    });

    if (failed.status !== DisbursementStatus.FAILED) {
      throw new BadRequestException(
        'DISBURSEMENT_NOT_FAILED: Only failed disbursements can be retried.',
      );
    }

    const offer = failed.loanOffer;
    if (offer.status !== LoanOfferStatus.ACCEPTED) {
      throw new BadRequestException(
        'OFFER_NOT_ACCEPTED: Cannot retry disbursement for a non-accepted offer.',
      );
    }

    const amount = dto.amount ?? failed.amount;

    const retry = await this.prisma.disbursement.create({
      data: {
        loanOfferId: offer.id,
        applicationId: failed.applicationId,
        borrowerId: failed.borrowerId,
        amount,
        currency: failed.currency,
        channel: dto.channel,
        provider: dto.provider,
        providerReference: dto.providerReference,
        requestedBy: actor?.id,
      },
    });

    await this.audit.log({
      eventType: 'MICRO_DISBURSEMENT_RETRY_CREATED',
      entityType: 'Disbursement',
      entityId: retry.id,
      actorId: actor?.id,
      newValue: { failedDisbursementId, newDisbursementId: retry.id, amount },
    });

    return retry;
  }

  async updateBorrowerStatus(
    borrowerId: string,
    dto: UpdateBorrowerStatusDto,
    actor?: User,
  ) {
    const borrower = await this.prisma.retailBorrower.findUniqueOrThrow({
      where: { id: borrowerId },
    });
    const previousStatus = borrower.status;

    if (
      dto.status === BorrowerStatus.ACTIVE &&
      previousStatus !== BorrowerStatus.PROSPECT &&
      previousStatus !== BorrowerStatus.SUSPENDED
    ) {
      throw new BadRequestException(
        'BORROWER_STATUS_TRANSITION_INVALID: Can only activate PROSPECT or SUSPENDED borrowers.',
      );
    }
    if (
      dto.status === BorrowerStatus.SUSPENDED &&
      previousStatus !== BorrowerStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'BORROWER_STATUS_TRANSITION_INVALID: Can only suspend ACTIVE borrowers.',
      );
    }
    if (
      dto.status === BorrowerStatus.CLOSED &&
      previousStatus !== BorrowerStatus.ACTIVE &&
      previousStatus !== BorrowerStatus.SUSPENDED
    ) {
      throw new BadRequestException(
        'BORROWER_STATUS_TRANSITION_INVALID: Can only close ACTIVE or SUSPENDED borrowers.',
      );
    }

    const updated = await this.prisma.retailBorrower.update({
      where: { id: borrowerId },
      data: { status: dto.status },
    });

    await this.audit.log({
      eventType: 'MICRO_BORROWER_STATUS_CHANGED',
      entityType: 'RetailBorrower',
      entityId: borrowerId,
      actorId: actor?.id,
      previousValue: { status: previousStatus },
      newValue: { status: updated.status, reason: dto.reason },
    });

    return updated;
  }

  private nextEscalationTier(
    currentSeverity: string | null,
    dpd: number,
  ): string {
    if (dpd >= 90 || currentSeverity === 'HIGH') return 'DEFAULT';
    if (dpd >= 30 || currentSeverity === 'WATCH') return 'HIGH';
    return 'WATCH';
  }

  private readRecord(
    value: Prisma.JsonValue | undefined,
    key: string,
  ): Record<string, unknown> | null {
    const parent = this.asRecord(value);
    const child = parent[key];
    if (typeof child === 'object' && child !== null && !Array.isArray(child))
      return child as Record<string, unknown>;
    return null;
  }

  private readNumberFromRecord(
    record: Record<string, unknown> | null,
    key: string,
    fallback: number,
  ): number {
    if (!record) return fallback;
    return this.readNumber(record, key, fallback);
  }

  private async ensureBorrower(id: string) {
    return this.prisma.retailBorrower.findUniqueOrThrow({ where: { id } });
  }

  private assertPolicyCanOriginate(
    policy: MicroLoanPolicy,
    requestedAmount: number,
  ) {
    this.validatePolicyIntegrity(policy);
    if (policy.status !== PolicyStatus.ACTIVE) {
      throw new BadRequestException(
        'POLICY_NOT_ACTIVE: MicroLoanPolicy must be ACTIVE to originate applications.',
      );
    }
    if (
      requestedAmount < policy.minAmount ||
      requestedAmount > policy.maxAmount
    ) {
      throw new BadRequestException(
        'REQUESTED_AMOUNT_OUTSIDE_POLICY: requestedAmount is outside product policy caps.',
      );
    }
  }

  private validatePolicyIntegrity(policy: MicroLoanPolicy) {
    if (
      policy.minAmount <= 0 ||
      policy.maxAmount <= 0 ||
      policy.minAmount > policy.maxAmount
    ) {
      throw new BadRequestException(
        'POLICY_AMOUNT_RANGE_INVALID: minAmount/maxAmount must be positive and ordered.',
      );
    }
    if (
      policy.interestRateMin < 0 ||
      policy.interestRateMax < 0 ||
      policy.interestRateMin > policy.interestRateMax
    ) {
      throw new BadRequestException(
        'POLICY_RATE_RANGE_INVALID: interestRateMin must be <= interestRateMax.',
      );
    }
    const allowedTenors = this.readNumberArray(
      { allowedTenors: policy.allowedTenors },
      'allowedTenors',
      [],
    );
    if (
      allowedTenors.length === 0 ||
      allowedTenors.some((tenor) => tenor <= 0)
    ) {
      throw new BadRequestException(
        'POLICY_TENORS_INVALID: allowedTenors must contain positive tenor days.',
      );
    }
  }

  private isConsentCurrentlyActive(consent: {
    status: string;
    expiresAt?: Date | string | null;
  }) {
    if (consent.status !== 'GRANTED') return false;
    if (!consent.expiresAt) return true;
    return new Date(consent.expiresAt).getTime() > Date.now();
  }

  private async assertScheduleBelongsToLoan(
    scheduleId: string,
    loanAccountId: string,
  ) {
    const schedule = await this.prisma.repaymentSchedule.findUniqueOrThrow({
      where: { id: scheduleId },
    });
    if (schedule.loanAccountId !== loanAccountId) {
      throw new BadRequestException(
        'SCHEDULE_LOAN_MISMATCH: Repayment schedule must belong to the selected loan account.',
      );
    }
    return schedule;
  }

  private async assertActiveConsentForAnyPurpose(
    borrowerId: string,
    sourceType: ConsentSourceType,
    purposes: ConsentPurpose[],
    consentGrantId?: string,
  ) {
    const now = new Date();
    const consent = await this.prisma.consentGrant.findFirst({
      where: {
        ...(consentGrantId ? { id: consentGrantId } : {}),
        borrowerId,
        sourceType,
        purpose: { in: purposes },
        status: 'GRANTED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    if (!consent) {
      throw new BadRequestException(
        `ACTIVE_CONSENT_REQUIRED: ${sourceType} consent is required for ${purposes.join(' or ')}.`,
      );
    }
    return consent;
  }

  private policyToSnapshot(policy: MicroLoanPolicy): Prisma.InputJsonObject {
    return {
      policyId: policy.id,
      name: policy.name,
      version: policy.version,
      productType: policy.productType,
      segment: policy.segment,
      minAmount: policy.minAmount,
      maxAmount: policy.maxAmount,
      currency: policy.currency,
      allowedTenors: policy.allowedTenors,
      interestRateMin: policy.interestRateMin,
      interestRateMax: policy.interestRateMax,
      feeRules: policy.feeRules,
      minScore: policy.minScore,
      maxDebtBurdenRatio: policy.maxDebtBurdenRatio,
      requiresGuarantor: policy.requiresGuarantor,
      requiresFieldVisit: policy.requiresFieldVisit,
      requiresMobileMoneyConsent: policy.requiresMobileMoneyConsent,
      renewalRules: policy.renewalRules,
      progressiveLendingRules: policy.progressiveLendingRules,
      coolingOffPeriodDays: policy.coolingOffPeriodDays,
      capturedAt: new Date().toISOString(),
    };
  }

  private buildRepaymentSchedule(
    offer: {
      tenorDays: number;
      repaymentFrequency: RepaymentFrequency;
      interestRate: number;
    },
    amount: number,
  ) {
    const installmentCount = this.installmentCount(
      offer.tenorDays,
      offer.repaymentFrequency,
    );
    const intervalDays = this.installmentIntervalDays(
      offer.tenorDays,
      offer.repaymentFrequency,
      installmentCount,
    );
    const totalInterest =
      amount * (offer.interestRate / 100) * (offer.tenorDays / 365);
    const principalDue = this.roundMoney(amount / installmentCount);
    const interestDue = this.roundMoney(totalInterest / installmentCount);

    return Array.from({ length: installmentCount }, (_, index) => {
      const isLast = index === installmentCount - 1;
      const principal = isLast
        ? this.roundMoney(amount - principalDue * (installmentCount - 1))
        : principalDue;
      const interest = isLast
        ? this.roundMoney(totalInterest - interestDue * (installmentCount - 1))
        : interestDue;
      return {
        installmentNumber: index + 1,
        dueDate: this.addDays(
          new Date(),
          offer.repaymentFrequency === RepaymentFrequency.BULLET
            ? offer.tenorDays
            : intervalDays * (index + 1),
        ),
        principalDue: principal,
        interestDue: interest,
        feesDue: 0,
        totalDue: this.roundMoney(principal + interest),
      };
    });
  }

  private installmentCount(tenorDays: number, frequency: RepaymentFrequency) {
    if (frequency === RepaymentFrequency.DAILY) return Math.max(1, tenorDays);
    if (frequency === RepaymentFrequency.WEEKLY)
      return Math.max(1, Math.ceil(tenorDays / 7));
    if (frequency === RepaymentFrequency.BIWEEKLY)
      return Math.max(1, Math.ceil(tenorDays / 14));
    if (frequency === RepaymentFrequency.MONTHLY)
      return Math.max(1, Math.ceil(tenorDays / 30));
    return 1;
  }

  private installmentIntervalDays(
    tenorDays: number,
    frequency: RepaymentFrequency,
    installmentCount: number,
  ) {
    if (frequency === RepaymentFrequency.DAILY) return 1;
    if (frequency === RepaymentFrequency.WEEKLY) return 7;
    if (frequency === RepaymentFrequency.BIWEEKLY) return 14;
    if (frequency === RepaymentFrequency.MONTHLY) return 30;
    return Math.max(1, Math.ceil(tenorDays / installmentCount));
  }

  private recommendFromScore(
    totalScore: number,
    minScore: number,
    requiresFieldVisit: boolean,
    completedVisit: boolean,
    requiresGuarantor: boolean,
    guarantorCount: number,
  ) {
    if (requiresFieldVisit && !completedVisit)
      return ScorecardRecommendation.FIELD_REVIEW_REQUIRED;
    if (totalScore >= minScore && requiresGuarantor && guarantorCount === 0)
      return ScorecardRecommendation.APPROVE_WITH_GUARANTOR;
    if (totalScore >= minScore)
      return ScorecardRecommendation.APPROVE_SMALL_LIMIT;
    if (totalScore >= minScore - 15)
      return ScorecardRecommendation.SUPERVISOR_REVIEW;
    return ScorecardRecommendation.DECLINE_FOR_NOW;
  }

  private scorecardReasons(input: {
    requiresFieldVisit: boolean;
    completedVisit: boolean;
    requiresGuarantor: boolean;
    guarantorCount: number;
    hasMobileMoneyConsent: boolean;
    netMonthlyIncome: number;
    totalScore: number;
    minScore: number;
  }): ReasonCode[] {
    const reasons: ReasonCode[] = [];
    if (input.requiresFieldVisit && !input.completedVisit) {
      reasons.push({
        code: 'FIELD_VISIT_REQUIRED',
        label: 'Field visit is required before approval.',
        severity: 'WARNING',
      });
    }
    if (input.requiresGuarantor && input.guarantorCount === 0) {
      reasons.push({
        code: 'GUARANTOR_REQUIRED',
        label: 'Policy requires a guarantor for this segment.',
        severity: 'WARNING',
      });
    }
    if (!input.hasMobileMoneyConsent) {
      reasons.push({
        code: 'MOBILE_MONEY_CONSENT_MISSING',
        label: 'Mobile money data is unavailable due to missing consent.',
        severity: 'INFO',
      });
    }
    if (input.netMonthlyIncome <= 0) {
      reasons.push({
        code: 'CASHFLOW_NOT_ESTABLISHED',
        label: 'Declared cashflow is missing or non-positive.',
        severity: 'WARNING',
      });
    }
    reasons.push({
      code:
        input.totalScore >= input.minScore
          ? 'SCORE_ABOVE_POLICY_MINIMUM'
          : 'SCORE_BELOW_POLICY_MINIMUM',
      label: `Thin-file score ${input.totalScore} vs policy minimum ${input.minScore}.`,
      severity: input.totalScore >= input.minScore ? 'INFO' : 'WARNING',
    });
    return reasons;
  }

  private statusFromRecommendation(
    recommendation: ScorecardRecommendation,
  ): DecisionStatus {
    if (recommendation === ScorecardRecommendation.APPROVE_SMALL_LIMIT)
      return DecisionStatus.APPROVE;
    if (recommendation === ScorecardRecommendation.APPROVE_WITH_GUARANTOR)
      return DecisionStatus.APPROVE_WITH_CONDITIONS;
    if (recommendation === ScorecardRecommendation.DECLINE_FOR_NOW)
      return DecisionStatus.REJECT;
    return DecisionStatus.SEND_TO_REVIEW;
  }

  private applicationStatusFromDecision(
    status: DecisionStatus,
  ): MicroLoanApplicationStatus {
    if (status === DecisionStatus.APPROVE)
      return MicroLoanApplicationStatus.APPROVED;
    if (status === DecisionStatus.APPROVE_WITH_CONDITIONS)
      return MicroLoanApplicationStatus.APPROVED_WITH_CONDITIONS;
    if (status === DecisionStatus.REJECT)
      return MicroLoanApplicationStatus.REJECTED;
    return MicroLoanApplicationStatus.SUPERVISOR_REVIEW;
  }

  private extractReasonRecords(
    reasonCodes: Prisma.JsonValue,
  ): Prisma.DecisionReasonCreateWithoutDecisionInput[] {
    if (!Array.isArray(reasonCodes)) return [];
    return reasonCodes.map((item) => {
      const reason = this.asRecord(item);
      return {
        code:
          typeof reason.code === 'string' ? reason.code : 'SCORECARD_REASON',
        label:
          typeof reason.label === 'string' ? reason.label : 'Scorecard reason',
        severity:
          typeof reason.severity === 'string' ? reason.severity : 'INFO',
        source: typeof reason.source === 'string' ? reason.source : 'SCORECARD',
        details: this.toJson(this.asRecord(reason.details)),
      };
    });
  }

  private mapAlternativeSourceToConsentSource(
    sourceType: AlternativeDataSourceType,
  ): ConsentSourceType | null {
    const map: Partial<Record<AlternativeDataSourceType, ConsentSourceType>> = {
      MOBILE_MONEY: ConsentSourceType.MOBILE_MONEY,
      AIRTIME: ConsentSourceType.DEVICE_DATA,
      FIELD_DATA: ConsentSourceType.FIELD_DATA,
      CREDIT_BUREAU: ConsentSourceType.CREDIT_BUREAU,
      OCR_DOCUMENT: ConsentSourceType.OCR_DOCUMENT,
      DEVICE_DATA: ConsentSourceType.DEVICE_DATA,
      GROUP_DATA: ConsentSourceType.GROUP_DATA,
      GUARANTOR_DATA: ConsentSourceType.GUARANTOR_DATA,
    };
    return map[sourceType] ?? null;
  }

  private readPolicySnapshot(
    value: Prisma.JsonValue | undefined,
  ): Record<string, unknown> {
    return this.asRecord(value);
  }

  private readNumber(
    record: Record<string, unknown>,
    key: string,
    fallback: number,
  ) {
    const value = record[key];
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : fallback;
  }

  private readBoolean(
    record: Record<string, unknown>,
    key: string,
    fallback: boolean,
  ) {
    const value = record[key];
    return typeof value === 'boolean' ? value : fallback;
  }

  private readNumberArray(
    record: Record<string, unknown>,
    key: string,
    fallback: number[],
  ) {
    const value = record[key];
    if (!Array.isArray(value)) return fallback;
    const numbers = value.filter(
      (item): item is number =>
        typeof item === 'number' && Number.isFinite(item),
    );
    return numbers.length > 0 ? numbers : fallback;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    return value === undefined ? undefined : (value as Prisma.InputJsonValue);
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }

  private roundScore(value: number) {
    return Math.round(value * 10) / 10;
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private generateReference(prefix: string) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${suffix}`;
  }
}
