import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AlternativeDataSourceType,
  BorrowerSegment,
  CollectionActionStatus,
  ConsentPurpose,
  ConsentSourceType,
  DecisionStatus,
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
import { PaginationDto } from '../common/dto/query.dto';
import { paginate } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import {
  AcceptLoanOfferDto,
  CompleteDisbursementDto,
  CompleteFieldVisitDto,
  CreateAlternativeDataFeatureSnapshotDto,
  CreateCollectionActionDto,
  CreateDisbursementDto,
  CreateFieldVisitDto,
  CreateLoanOfferDto,
  CreateMicroLoanApplicationDto,
  CreateMicroLoanPolicyDto,
  CreateMobileMoneySnapshotDto,
  CreateRetailBorrowerDto,
  GrantConsentDto,
  MicrofinanceQueryDto,
  OpenDelinquencyDto,
  RecordRepaymentDto,
  SubmitMicroLoanDecisionDto,
} from './dto/microfinance.dto';

type ReasonCode = {
  code: string;
  label: string;
  severity?: string;
  source?: string;
  details?: Record<string, unknown>;
};

@Injectable()
export class MicrofinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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
        delinquencyEvents: { where: { status: 'OPEN' }, orderBy: { openedAt: 'desc' } },
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
      newValue: { borrowerId, sourceType: consent.sourceType, purpose: consent.purpose },
    });

    return consent;
  }

  async revokeConsent(consentId: string, actor?: User) {
    const existing = await this.prisma.consentGrant.findUniqueOrThrow({ where: { id: consentId } });
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
      throw new BadRequestException('POLICY_AMOUNT_RANGE_INVALID: minAmount must be <= maxAmount.');
    }
    if (dto.interestRateMin > dto.interestRateMax) {
      throw new BadRequestException('POLICY_RATE_RANGE_INVALID: interestRateMin must be <= interestRateMax.');
    }
    if (dto.allowedTenors.length === 0) {
      throw new BadRequestException('POLICY_TENORS_REQUIRED: allowedTenors cannot be empty.');
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
      newValue: { name: policy.name, version: policy.version, status: policy.status },
    });

    return policy;
  }

  async activatePolicy(policyId: string, actor?: User) {
    const previous = await this.prisma.microLoanPolicy.findUniqueOrThrow({ where: { id: policyId } });
    this.validatePolicyIntegrity(previous);
    const updated = await this.prisma.microLoanPolicy.update({
      where: { id: policyId },
      data: { status: PolicyStatus.ACTIVE, approvedBy: actor?.id, approvedAt: new Date() },
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
      ? await this.prisma.microLoanPolicy.findUniqueOrThrow({ where: { id: dto.policyId } })
      : await this.prisma.microLoanPolicy.findFirst({
          where: { status: PolicyStatus.ACTIVE, segment, productType },
          orderBy: { approvedAt: 'desc' },
        });

    if (!policy) {
      throw new BadRequestException('ACTIVE_POLICY_REQUIRED: No active MicroLoanPolicy matches this segment and product type.');
    }
    if (policy.segment !== segment || policy.productType !== productType) {
      throw new BadRequestException('POLICY_SCOPE_MISMATCH: Policy segment/product type must match the application.');
    }

    this.assertPolicyCanOriginate(policy, dto.requestedAmount);
    if (policy.requiresMobileMoneyConsent) {
      await this.assertActiveConsentForAnyPurpose(dto.borrowerId, ConsentSourceType.MOBILE_MONEY, [
        ConsentPurpose.UNDERWRITING,
        ConsentPurpose.AFFORDABILITY_ASSESSMENT,
      ]);
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
      newValue: { borrowerId: dto.borrowerId, requestedAmount: dto.requestedAmount, policyId: policy.id },
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
          borrower: { select: { id: true, fullName: true, phone: true, segment: true } },
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
        borrower: { include: { informalBusinessProfile: true, consents: true, groupMemberships: true } },
        policy: true,
        policySnapshot: true,
        fieldVisits: { orderBy: { createdAt: 'desc' } },
        guarantors: true,
        scorecards: { orderBy: { createdAt: 'desc' } },
        decisions: { orderBy: { createdAt: 'desc' }, include: { reasons: true, offers: true } },
        offers: { orderBy: { createdAt: 'desc' }, include: { disbursements: true, loanAccount: true } },
        disbursements: { orderBy: { createdAt: 'desc' } },
        loanAccount: { include: { repaymentSchedules: true, delinquencyEvents: true } },
      },
    });
  }

  async createFieldVisit(applicationId: string, dto: CreateFieldVisitDto, actor?: User) {
    const application = await this.prisma.microLoanApplication.findUniqueOrThrow({ where: { id: applicationId } });
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

  async completeFieldVisit(visitId: string, dto: CompleteFieldVisitDto, actor?: User) {
    const existing = await this.prisma.fieldVisit.findUniqueOrThrow({ where: { id: visitId } });
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
    const application = await this.prisma.microLoanApplication.findUniqueOrThrow({
      where: { id: applicationId },
      include: {
        borrower: {
          include: {
            informalBusinessProfile: true,
            consents: true,
            groupMemberships: { where: { active: true } },
            mobileMoneySnapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
            loanAccounts: { include: { repaymentEvents: true, delinquencyEvents: true } },
          },
        },
        policySnapshot: true,
        fieldVisits: { orderBy: { completedAt: 'desc' } },
        guarantors: true,
      },
    });

    if (!application.policySnapshot) {
      throw new BadRequestException('POLICY_SNAPSHOT_REQUIRED: Cannot score an application without an applied policy snapshot.');
    }
    const policy = this.readPolicySnapshot(application.policySnapshot.snapshot);
    const minScore = this.readNumber(policy, 'minScore', 60);
    const requiresFieldVisit = this.readBoolean(policy, 'requiresFieldVisit', true);
    const requiresGuarantor = this.readBoolean(policy, 'requiresGuarantor', false);
    const completedVisit = application.fieldVisits.find((visit) => visit.status === FieldVisitStatus.COMPLETED);
    const mobileMoney = application.borrower.mobileMoneySnapshots[0];
    const hasMobileMoneyConsent = application.borrower.consents.some(
      (consent) => consent.sourceType === ConsentSourceType.MOBILE_MONEY && this.isConsentCurrentlyActive(consent),
    );
    const hasGoodRepaymentHistory = application.borrower.loanAccounts.some(
      (account) => account.repaymentEvents.length > 0 && account.delinquencyEvents.length === 0,
    );
    const hasDelinquency = application.borrower.loanAccounts.some((account) => account.delinquencyEvents.length > 0);

    const profile = application.borrower.informalBusinessProfile;
    const netMonthlyIncome = Math.max(
      0,
      (profile?.monthlyRevenueEstimate ?? 0) - (profile?.monthlyExpenseEstimate ?? 0),
    );

    const identityScore = application.borrower.identityVerified ? 15 : application.borrower.nationalIdNumber ? 9 : 4;
    const activityStabilityScore = (profile?.yearsInActivity ?? 0) >= 2 ? 20 : (profile?.yearsInActivity ?? 0) >= 1 ? 14 : 7;
    const cashflowScore = netMonthlyIncome <= 0
      ? 5
      : application.requestedAmount <= netMonthlyIncome * 2
      ? 20
      : application.requestedAmount <= netMonthlyIncome * 4
      ? 13
      : 6;
    const mobileMoneyScore = !hasMobileMoneyConsent
      ? 3
      : mobileMoney && mobileMoney.activeDays >= 20 && mobileMoney.transactionCount >= 20
      ? 15
      : mobileMoney
      ? 10
      : 6;
    const repaymentHistoryScore = hasDelinquency ? 4 : hasGoodRepaymentHistory ? 15 : 8;
    const guarantorGroupScore = application.guarantors.length > 0 || application.borrower.groupMemberships.length > 0 ? 10 : 4;
    const fieldConfidenceScore = completedVisit?.agentConfidenceScore != null
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
    const recommendation = this.recommendFromScore(totalScore, minScore, requiresFieldVisit, Boolean(completedVisit), requiresGuarantor, application.guarantors.length);

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
        status: recommendation === ScorecardRecommendation.FIELD_REVIEW_REQUIRED
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

  async submitDecision(applicationId: string, dto: SubmitMicroLoanDecisionDto, actor?: User) {
    const application = await this.prisma.microLoanApplication.findUniqueOrThrow({
      where: { id: applicationId },
      include: {
        policySnapshot: true,
        scorecards: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    const scorecard = application.scorecards[0];
    if (!scorecard) {
      throw new BadRequestException('SCORECARD_REQUIRED: Run the thin-file scorecard before submitting a decision.');
    }
    if (!application.policySnapshot) {
      throw new BadRequestException('POLICY_SNAPSHOT_REQUIRED: Cannot decide an application without an applied policy snapshot.');
    }

    const recommendedStatus = this.statusFromRecommendation(scorecard.recommendation);
    const status = dto.status ?? recommendedStatus;
    if (status !== recommendedStatus && !dto.overrideReason) {
      throw new BadRequestException('OVERRIDE_REASON_REQUIRED: Decision status differs from scorecard recommendation.');
    }

    const policy = this.readPolicySnapshot(application.policySnapshot.snapshot);
    const maxAmount = this.readNumber(policy, 'maxAmount', application.requestedAmount);
    const minAmount = this.readNumber(policy, 'minAmount', 0);
    const allowedTenors = this.readNumberArray(policy, 'allowedTenors', [30]);
    const rateMin = this.readNumber(policy, 'interestRateMin', 0);
    const rateMax = this.readNumber(policy, 'interestRateMax', rateMin);
    const isPositiveDecision = status === DecisionStatus.APPROVE || status === DecisionStatus.APPROVE_WITH_CONDITIONS;
    const approvedAmount = isPositiveDecision
      ? Math.max(minAmount, Math.min(dto.approvedAmount ?? application.requestedAmount, maxAmount))
      : undefined;
    const tenorDays = isPositiveDecision ? (dto.tenorDays ?? allowedTenors[0]) : undefined;
    const interestRate = isPositiveDecision ? (dto.interestRate ?? this.roundMoney((rateMin + rateMax) / 2)) : undefined;

    if (isPositiveDecision && tenorDays != null && !allowedTenors.includes(tenorDays)) {
      throw new BadRequestException('TENOR_NOT_ALLOWED: tenorDays is not allowed by the applied policy snapshot.');
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
        auditMetadata: this.toJson({ recommendedStatus, scorecardRecommendation: scorecard.recommendation }),
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
    if (decision.status !== DecisionStatus.APPROVE && decision.status !== DecisionStatus.APPROVE_WITH_CONDITIONS) {
      throw new BadRequestException('DECISION_NOT_APPROVED: Only approved decisions can issue loan offers.');
    }
    if (decision.approvedAmount == null || decision.tenorDays == null || decision.interestRate == null) {
      throw new BadRequestException('DECISION_TERMS_INCOMPLETE: approvedAmount, tenorDays and interestRate are required.');
    }

    const policy = this.readPolicySnapshot(decision.policySnapshot?.snapshot);
    const approvedAmount = dto.approvedAmount ?? decision.approvedAmount;
    const tenorDays = dto.tenorDays ?? decision.tenorDays;
    const interestRate = dto.interestRate ?? decision.interestRate;
    const rateMin = this.readNumber(policy, 'interestRateMin', decision.interestRate);
    const rateMax = this.readNumber(policy, 'interestRateMax', decision.interestRate);

    if (approvedAmount <= 0 || approvedAmount > decision.approvedAmount) {
      throw new BadRequestException('OFFER_AMOUNT_EXCEEDS_DECISION: Offer amount cannot exceed the approved decision amount.');
    }
    if (tenorDays !== decision.tenorDays) {
      throw new BadRequestException('OFFER_TENOR_MISMATCH: Offer tenor must match the approved decision tenor.');
    }
    if (interestRate < rateMin || interestRate > rateMax || interestRate > decision.interestRate) {
      throw new BadRequestException('OFFER_RATE_OUTSIDE_POLICY: Offer rate must stay within policy and decision terms.');
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
        requiresGuarantor: dto.requiresGuarantor ?? this.readBoolean(policy, 'requiresGuarantor', false),
        requiresCollateral: dto.requiresCollateral ?? false,
        fees: this.toJson(dto.fees),
        conditions: this.toJson(dto.conditions ?? this.asRecord(decision.conditions)),
        status: LoanOfferStatus.ISSUED,
        issuedAt: new Date(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : this.addDays(new Date(), 7),
        auditMetadata: this.toJson({ issuedBy: actor?.id }),
      },
    });

    await this.audit.log({
      eventType: 'MICRO_LOAN_OFFER_ISSUED',
      entityType: 'LoanOffer',
      entityId: offer.id,
      actorId: actor?.id,
      newValue: { decisionId, approvedAmount: offer.approvedAmount, expiresAt: offer.expiresAt },
    });

    return offer;
  }

  async acceptOffer(offerId: string, dto: AcceptLoanOfferDto, actor?: User) {
    const offer = await this.prisma.loanOffer.findUniqueOrThrow({ where: { id: offerId } });
    if (offer.status !== LoanOfferStatus.ISSUED) {
      throw new BadRequestException('OFFER_NOT_ISSUED: Only issued offers can be accepted.');
    }
    if (offer.expiresAt && offer.expiresAt < new Date()) {
      await this.prisma.loanOffer.update({ where: { id: offerId }, data: { status: LoanOfferStatus.EXPIRED } });
      throw new BadRequestException('OFFER_EXPIRED: Loan offer has expired.');
    }

    const updated = await this.prisma.loanOffer.update({
      where: { id: offerId },
      data: { status: LoanOfferStatus.ACCEPTED, acceptedAt: new Date(), acceptedBy: actor?.id ?? dto.acceptedBy },
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

  async createDisbursement(offerId: string, dto: CreateDisbursementDto, actor?: User) {
    const offer = await this.prisma.loanOffer.findUniqueOrThrow({
      where: { id: offerId },
      include: { disbursements: true },
    });
    if (offer.status !== LoanOfferStatus.ACCEPTED) {
      throw new BadRequestException('OFFER_NOT_ACCEPTED: Disbursement requires an accepted loan offer.');
    }
    if (offer.disbursements.some((item) => item.status === DisbursementStatus.PENDING || item.status === DisbursementStatus.SUCCESS)) {
      throw new BadRequestException('DISBURSEMENT_ALREADY_EXISTS: This offer already has a pending or successful disbursement.');
    }
    const amount = dto.amount ?? offer.approvedAmount;
    if (amount <= 0) {
      throw new BadRequestException('DISBURSEMENT_AMOUNT_INVALID: amount must be positive.');
    }
    if (amount > offer.approvedAmount) {
      throw new BadRequestException('DISBURSEMENT_AMOUNT_EXCEEDS_OFFER: amount cannot exceed approvedAmount.');
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

    return disbursement;
  }

  async completeDisbursement(disbursementId: string, dto: CompleteDisbursementDto, actor?: User) {
    const disbursement = await this.prisma.disbursement.findUniqueOrThrow({
      where: { id: disbursementId },
      include: { loanOffer: true },
    });

    if (disbursement.status === DisbursementStatus.SUCCESS || disbursement.loanAccountId) {
      throw new BadRequestException('DISBURSEMENT_ALREADY_COMPLETED: This disbursement already created a loan account.');
    }
    if (disbursement.status === DisbursementStatus.REVERSED || disbursement.status === DisbursementStatus.FAILED) {
      throw new BadRequestException('DISBURSEMENT_FINAL_STATE: Final disbursements cannot transition backward.');
    }

    if (dto.status !== DisbursementStatus.SUCCESS) {
      if (dto.status !== DisbursementStatus.PROCESSING && dto.status !== DisbursementStatus.FAILED) {
        throw new BadRequestException('DISBURSEMENT_STATUS_INVALID: Only PROCESSING, FAILED, or SUCCESS are valid completion transitions.');
      }
      if (dto.status === DisbursementStatus.FAILED && !dto.failureReason) {
        throw new BadRequestException('DISBURSEMENT_FAILURE_REASON_REQUIRED: failureReason is required when marking a disbursement failed.');
      }
      const updated = await this.prisma.disbursement.update({
        where: { id: disbursementId },
        data: {
          status: dto.status,
          providerReference: dto.providerReference ?? disbursement.providerReference,
          failureReason: dto.failureReason,
        },
      });
      await this.audit.log({
        eventType: 'MICRO_DISBURSEMENT_STATUS_CHANGED',
        entityType: 'Disbursement',
        entityId: disbursementId,
        actorId: actor?.id,
        previousValue: { status: disbursement.status },
        newValue: { status: updated.status, failureReason: updated.failureReason },
      });
      return updated;
    }

    const schedules = this.buildRepaymentSchedule(disbursement.loanOffer, disbursement.amount);
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
          providerReference: dto.providerReference ?? disbursement.providerReference,
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
      newValue: { status: result.disbursement.status, loanAccountId: result.account.id },
    });

    return result;
  }

  async recordRepayment(loanAccountId: string, dto: RecordRepaymentDto, actor?: User) {
    const account = await this.prisma.loanAccount.findUniqueOrThrow({
      where: { id: loanAccountId },
      include: { repaymentSchedules: { orderBy: { installmentNumber: 'asc' } } },
    });
    const schedule = dto.scheduleId
      ? account.repaymentSchedules.find((item) => item.id === dto.scheduleId)
      : account.repaymentSchedules.find((item) => item.status !== RepaymentScheduleStatus.PAID);

    if (!schedule) {
      throw new NotFoundException('REPAYMENT_SCHEDULE_NOT_FOUND: No open schedule found for this repayment.');
    }
    if (schedule.status === RepaymentScheduleStatus.PAID) {
      throw new BadRequestException('REPAYMENT_SCHEDULE_ALREADY_PAID: Cannot post repayment to a paid installment.');
    }

    const scheduleOutstanding = this.roundMoney(schedule.totalDue - schedule.amountPaid);
    if (dto.amount <= 0 || dto.amount > scheduleOutstanding) {
      throw new BadRequestException('REPAYMENT_AMOUNT_INVALID: amount must be positive and cannot exceed the selected installment outstanding balance.');
    }

    const newAmountPaid = schedule.amountPaid + dto.amount;
    const scheduleStatus = newAmountPaid >= schedule.totalDue
      ? RepaymentScheduleStatus.PAID
      : RepaymentScheduleStatus.PARTIALLY_PAID;
    const nonPrincipalDue = schedule.interestDue + schedule.feesDue;
    const unpaidNonPrincipal = Math.max(0, nonPrincipalDue - schedule.amountPaid);
    const principalPaidSoFar = Math.max(0, schedule.amountPaid - nonPrincipalDue);
    const principalRemaining = Math.max(0, schedule.principalDue - principalPaidSoFar);
    const principalReduction = Math.min(Math.max(0, dto.amount - unpaidNonPrincipal), principalRemaining, account.outstandingPrincipal);
    const newOutstanding = Math.max(0, account.outstandingPrincipal - principalReduction);

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
        data: { amountPaid: newAmountPaid, status: scheduleStatus, paidAt: scheduleStatus === RepaymentScheduleStatus.PAID ? new Date() : undefined },
      });
      const updatedAccount = await tx.loanAccount.update({
        where: { id: account.id },
        data: { outstandingPrincipal: newOutstanding, status: newOutstanding === 0 ? LoanAccountStatus.CLOSED : account.status },
      });
      return { event, schedule: updatedSchedule, account: updatedAccount };
    });

    await this.audit.log({
      eventType: 'MICRO_REPAYMENT_POSTED',
      entityType: 'RepaymentEvent',
      entityId: result.event.id,
      actorId: actor?.id,
      newValue: { loanAccountId, amount: dto.amount, outstandingPrincipal: result.account.outstandingPrincipal },
    });

    return result;
  }

  async openDelinquency(loanAccountId: string, dto: OpenDelinquencyDto, actor?: User) {
    const account = await this.prisma.loanAccount.findUniqueOrThrow({ where: { id: loanAccountId } });
    if (dto.scheduleId) {
      await this.assertScheduleBelongsToLoan(dto.scheduleId, loanAccountId);
      const existing = await this.prisma.delinquencyEvent.findFirst({
        where: { loanAccountId, scheduleId: dto.scheduleId, status: 'OPEN' },
      });
      if (existing) {
        throw new BadRequestException('DELINQUENCY_ALREADY_OPEN: This schedule already has an open delinquency event.');
      }
    }
    const delinquency = await this.prisma.delinquencyEvent.create({
      data: {
        loanAccountId,
        scheduleId: dto.scheduleId,
        borrowerId: account.borrowerId,
        dpd: dto.dpd,
        overdueAmount: dto.overdueAmount,
        severity: dto.severity ?? (dto.dpd >= 90 ? 'DEFAULT' : dto.dpd >= 30 ? 'HIGH' : 'WATCH'),
        reason: dto.reason,
        metadata: this.toJson(dto.metadata),
      },
    });

    await this.prisma.$transaction([
      ...(dto.scheduleId
        ? [this.prisma.repaymentSchedule.update({ where: { id: dto.scheduleId }, data: { status: RepaymentScheduleStatus.LATE } })]
        : []),
      ...(dto.dpd >= 90
        ? [this.prisma.loanAccount.update({ where: { id: loanAccountId }, data: { status: LoanAccountStatus.DEFAULTED } })]
        : []),
    ]);

    await this.audit.log({
      eventType: 'MICRO_DELINQUENCY_OPENED',
      entityType: 'DelinquencyEvent',
      entityId: delinquency.id,
      actorId: actor?.id,
      newValue: { loanAccountId, dpd: dto.dpd, overdueAmount: dto.overdueAmount },
    });

    return delinquency;
  }

  async createCollectionAction(delinquencyId: string, dto: CreateCollectionActionDto, actor?: User) {
    const delinquency = await this.prisma.delinquencyEvent.findUniqueOrThrow({ where: { id: delinquencyId } });
    if (dto.scheduleId) {
      await this.assertScheduleBelongsToLoan(dto.scheduleId, delinquency.loanAccountId);
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
        completedAt: dto.status === CollectionActionStatus.COMPLETED ? new Date() : undefined,
        outcome: dto.outcome,
        promiseToPayDate: dto.promiseToPayDate ? new Date(dto.promiseToPayDate) : undefined,
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
      newValue: { delinquencyId, actionType: action.actionType, status: action.status },
    });

    return action;
  }

  async createMobileMoneySnapshot(dto: CreateMobileMoneySnapshotDto, actor?: User) {
    await this.assertActiveConsentForAnyPurpose(dto.borrowerId, ConsentSourceType.MOBILE_MONEY, [
      ConsentPurpose.UNDERWRITING,
      ConsentPurpose.AFFORDABILITY_ASSESSMENT,
    ], dto.consentGrantId);

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
      newValue: { borrowerId: dto.borrowerId, provider: dto.provider, transactionCount: snapshot.transactionCount },
    });

    return snapshot;
  }

  async createAlternativeDataFeatureSnapshot(dto: CreateAlternativeDataFeatureSnapshotDto, actor?: User) {
    const consentSource = this.mapAlternativeSourceToConsentSource(dto.sourceType);
    if (consentSource) {
      await this.assertActiveConsentForAnyPurpose(dto.borrowerId, consentSource, [ConsentPurpose.UNDERWRITING], dto.consentGrantId);
    }
    if (dto.applicationId) {
      const application = await this.prisma.microLoanApplication.findUniqueOrThrow({ where: { id: dto.applicationId } });
      if (application.borrowerId !== dto.borrowerId) {
        throw new BadRequestException('APPLICATION_BORROWER_MISMATCH: Alternative data snapshot borrower must match the application borrower.');
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
      newValue: { borrowerId: dto.borrowerId, sourceType: dto.sourceType, payloadQualityScore: dto.payloadQualityScore },
    });

    return snapshot;
  }

  async getPortfolioSummary() {
    const [borrowers, applications, activeLoans, delinquencyEvents, collectionActions, disbursements] = await Promise.all([
      this.prisma.retailBorrower.count(),
      this.prisma.microLoanApplication.count(),
      this.prisma.loanAccount.findMany({ where: { status: LoanAccountStatus.ACTIVE }, select: { outstandingPrincipal: true, principalAmount: true } }),
      this.prisma.delinquencyEvent.count({ where: { status: 'OPEN' } }),
      this.prisma.collectionAction.count({ where: { status: 'PLANNED' } }),
      this.prisma.disbursement.aggregate({ where: { status: DisbursementStatus.SUCCESS }, _sum: { amount: true }, _count: true }),
    ]);

    return {
      borrowers,
      applications,
      activeLoanCount: activeLoans.length,
      totalPrincipal: this.roundMoney(activeLoans.reduce((sum, loan) => sum + loan.principalAmount, 0)),
      outstandingPrincipal: this.roundMoney(activeLoans.reduce((sum, loan) => sum + loan.outstandingPrincipal, 0)),
      openDelinquencies: delinquencyEvents,
      plannedCollectionActions: collectionActions,
      successfulDisbursements: disbursements._count,
      disbursedAmount: this.roundMoney(disbursements._sum.amount ?? 0),
      generatedAt: new Date().toISOString(),
    };
  }

  private async ensureBorrower(id: string) {
    return this.prisma.retailBorrower.findUniqueOrThrow({ where: { id } });
  }

  private assertPolicyCanOriginate(policy: MicroLoanPolicy, requestedAmount: number) {
    this.validatePolicyIntegrity(policy);
    if (policy.status !== PolicyStatus.ACTIVE) {
      throw new BadRequestException('POLICY_NOT_ACTIVE: MicroLoanPolicy must be ACTIVE to originate applications.');
    }
    if (requestedAmount < policy.minAmount || requestedAmount > policy.maxAmount) {
      throw new BadRequestException('REQUESTED_AMOUNT_OUTSIDE_POLICY: requestedAmount is outside product policy caps.');
    }
  }

  private validatePolicyIntegrity(policy: MicroLoanPolicy) {
    if (policy.minAmount <= 0 || policy.maxAmount <= 0 || policy.minAmount > policy.maxAmount) {
      throw new BadRequestException('POLICY_AMOUNT_RANGE_INVALID: minAmount/maxAmount must be positive and ordered.');
    }
    if (policy.interestRateMin < 0 || policy.interestRateMax < 0 || policy.interestRateMin > policy.interestRateMax) {
      throw new BadRequestException('POLICY_RATE_RANGE_INVALID: interestRateMin must be <= interestRateMax.');
    }
    const allowedTenors = this.readNumberArray({ allowedTenors: policy.allowedTenors }, 'allowedTenors', []);
    if (allowedTenors.length === 0 || allowedTenors.some((tenor) => tenor <= 0)) {
      throw new BadRequestException('POLICY_TENORS_INVALID: allowedTenors must contain positive tenor days.');
    }
  }

  private isConsentCurrentlyActive(consent: { status: string; expiresAt?: Date | string | null }) {
    if (consent.status !== 'GRANTED') return false;
    if (!consent.expiresAt) return true;
    return new Date(consent.expiresAt).getTime() > Date.now();
  }

  private async assertScheduleBelongsToLoan(scheduleId: string, loanAccountId: string) {
    const schedule = await this.prisma.repaymentSchedule.findUniqueOrThrow({ where: { id: scheduleId } });
    if (schedule.loanAccountId !== loanAccountId) {
      throw new BadRequestException('SCHEDULE_LOAN_MISMATCH: Repayment schedule must belong to the selected loan account.');
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
      throw new BadRequestException(`ACTIVE_CONSENT_REQUIRED: ${sourceType} consent is required for ${purposes.join(' or ')}.`);
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
      allowedTenors: policy.allowedTenors as Prisma.InputJsonValue,
      interestRateMin: policy.interestRateMin,
      interestRateMax: policy.interestRateMax,
      feeRules: policy.feeRules as Prisma.InputJsonValue,
      minScore: policy.minScore,
      maxDebtBurdenRatio: policy.maxDebtBurdenRatio,
      requiresGuarantor: policy.requiresGuarantor,
      requiresFieldVisit: policy.requiresFieldVisit,
      requiresMobileMoneyConsent: policy.requiresMobileMoneyConsent,
      renewalRules: policy.renewalRules as Prisma.InputJsonValue,
      progressiveLendingRules: policy.progressiveLendingRules as Prisma.InputJsonValue,
      coolingOffPeriodDays: policy.coolingOffPeriodDays,
      capturedAt: new Date().toISOString(),
    };
  }

  private buildRepaymentSchedule(offer: { tenorDays: number; repaymentFrequency: RepaymentFrequency; interestRate: number }, amount: number) {
    const installmentCount = this.installmentCount(offer.tenorDays, offer.repaymentFrequency);
    const intervalDays = this.installmentIntervalDays(offer.tenorDays, offer.repaymentFrequency, installmentCount);
    const totalInterest = amount * (offer.interestRate / 100) * (offer.tenorDays / 365);
    const principalDue = this.roundMoney(amount / installmentCount);
    const interestDue = this.roundMoney(totalInterest / installmentCount);

    return Array.from({ length: installmentCount }, (_, index) => {
      const isLast = index === installmentCount - 1;
      const principal = isLast ? this.roundMoney(amount - principalDue * (installmentCount - 1)) : principalDue;
      const interest = isLast ? this.roundMoney(totalInterest - interestDue * (installmentCount - 1)) : interestDue;
      return {
        installmentNumber: index + 1,
        dueDate: this.addDays(new Date(), offer.repaymentFrequency === RepaymentFrequency.BULLET ? offer.tenorDays : intervalDays * (index + 1)),
        principalDue: principal,
        interestDue: interest,
        feesDue: 0,
        totalDue: this.roundMoney(principal + interest),
      };
    });
  }

  private installmentCount(tenorDays: number, frequency: RepaymentFrequency) {
    if (frequency === RepaymentFrequency.DAILY) return Math.max(1, tenorDays);
    if (frequency === RepaymentFrequency.WEEKLY) return Math.max(1, Math.ceil(tenorDays / 7));
    if (frequency === RepaymentFrequency.BIWEEKLY) return Math.max(1, Math.ceil(tenorDays / 14));
    if (frequency === RepaymentFrequency.MONTHLY) return Math.max(1, Math.ceil(tenorDays / 30));
    return 1;
  }

  private installmentIntervalDays(tenorDays: number, frequency: RepaymentFrequency, installmentCount: number) {
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
    if (requiresFieldVisit && !completedVisit) return ScorecardRecommendation.FIELD_REVIEW_REQUIRED;
    if (totalScore >= minScore && requiresGuarantor && guarantorCount === 0) return ScorecardRecommendation.APPROVE_WITH_GUARANTOR;
    if (totalScore >= minScore) return ScorecardRecommendation.APPROVE_SMALL_LIMIT;
    if (totalScore >= minScore - 15) return ScorecardRecommendation.SUPERVISOR_REVIEW;
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
      reasons.push({ code: 'FIELD_VISIT_REQUIRED', label: 'Field visit is required before approval.', severity: 'WARNING' });
    }
    if (input.requiresGuarantor && input.guarantorCount === 0) {
      reasons.push({ code: 'GUARANTOR_REQUIRED', label: 'Policy requires a guarantor for this segment.', severity: 'WARNING' });
    }
    if (!input.hasMobileMoneyConsent) {
      reasons.push({ code: 'MOBILE_MONEY_CONSENT_MISSING', label: 'Mobile money data is unavailable due to missing consent.', severity: 'INFO' });
    }
    if (input.netMonthlyIncome <= 0) {
      reasons.push({ code: 'CASHFLOW_NOT_ESTABLISHED', label: 'Declared cashflow is missing or non-positive.', severity: 'WARNING' });
    }
    reasons.push({
      code: input.totalScore >= input.minScore ? 'SCORE_ABOVE_POLICY_MINIMUM' : 'SCORE_BELOW_POLICY_MINIMUM',
      label: `Thin-file score ${input.totalScore} vs policy minimum ${input.minScore}.`,
      severity: input.totalScore >= input.minScore ? 'INFO' : 'WARNING',
    });
    return reasons;
  }

  private statusFromRecommendation(recommendation: ScorecardRecommendation): DecisionStatus {
    if (recommendation === ScorecardRecommendation.APPROVE_SMALL_LIMIT) return DecisionStatus.APPROVE;
    if (recommendation === ScorecardRecommendation.APPROVE_WITH_GUARANTOR) return DecisionStatus.APPROVE_WITH_CONDITIONS;
    if (recommendation === ScorecardRecommendation.DECLINE_FOR_NOW) return DecisionStatus.REJECT;
    return DecisionStatus.SEND_TO_REVIEW;
  }

  private applicationStatusFromDecision(status: DecisionStatus): MicroLoanApplicationStatus {
    if (status === DecisionStatus.APPROVE) return MicroLoanApplicationStatus.APPROVED;
    if (status === DecisionStatus.APPROVE_WITH_CONDITIONS) return MicroLoanApplicationStatus.APPROVED_WITH_CONDITIONS;
    if (status === DecisionStatus.REJECT) return MicroLoanApplicationStatus.REJECTED;
    return MicroLoanApplicationStatus.SUPERVISOR_REVIEW;
  }

  private extractReasonRecords(reasonCodes: Prisma.JsonValue): Prisma.DecisionReasonCreateWithoutDecisionInput[] {
    if (!Array.isArray(reasonCodes)) return [];
    return reasonCodes.map((item) => {
      const reason = this.asRecord(item);
      return {
        code: String(reason.code ?? 'SCORECARD_REASON'),
        label: String(reason.label ?? 'Scorecard reason'),
        severity: String(reason.severity ?? 'INFO'),
        source: String(reason.source ?? 'SCORECARD'),
        details: this.toJson(this.asRecord(reason.details)),
      };
    });
  }

  private mapAlternativeSourceToConsentSource(sourceType: AlternativeDataSourceType): ConsentSourceType | null {
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

  private readPolicySnapshot(value: Prisma.JsonValue | undefined): Record<string, unknown> {
    return this.asRecord(value);
  }

  private readNumber(record: Record<string, unknown>, key: string, fallback: number) {
    const value = record[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  private readBoolean(record: Record<string, unknown>, key: string, fallback: boolean) {
    const value = record[key];
    return typeof value === 'boolean' ? value : fallback;
  }

  private readNumberArray(record: Record<string, unknown>, key: string, fallback: number[]) {
    const value = record[key];
    if (!Array.isArray(value)) return fallback;
    const numbers = value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
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
