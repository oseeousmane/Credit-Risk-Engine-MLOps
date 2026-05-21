import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  AlternativeDataSourceType,
  BorrowerSegment,
  BorrowerStatus,
  CollectionActionStatus,
  CollectionActionType,
  ConsentCaptureChannel,
  ConsentPurpose,
  ConsentSourceType,
  DecisionStatus,
  DelinquencyStatus,
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
} from '@prisma/client';
import { PaginationDto } from '../../common/dto/query.dto';

export class MicrofinanceQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(BorrowerSegment)
  segment?: BorrowerSegment;

  @IsOptional()
  @IsEnum(MicroLoanApplicationStatus)
  status?: MicroLoanApplicationStatus;
}

export class CreateInformalBusinessProfileDto {
  @IsString()
  activityType!: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  locationType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  yearsInActivity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyRevenueEstimate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyExpenseEstimate?: number;

  @IsOptional()
  @IsString()
  seasonalityNotes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockValueEstimate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  employeeCount?: number;

  @IsOptional()
  @IsString()
  declaredIncomeSource?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateRetailBorrowerDto {
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  nationalIdNumber?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  geography?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(BorrowerSegment)
  segment?: BorrowerSegment;

  @IsOptional()
  @IsBoolean()
  identityVerified?: boolean;

  @IsOptional()
  @IsString()
  kycLevel?: string;

  @IsOptional()
  @IsObject()
  riskFlags?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateInformalBusinessProfileDto)
  informalBusinessProfile?: CreateInformalBusinessProfileDto;
}

export class GrantConsentDto {
  @IsEnum(ConsentSourceType)
  sourceType!: ConsentSourceType;

  @IsEnum(ConsentPurpose)
  purpose!: ConsentPurpose;

  @IsString()
  consentTextVersion!: string;

  @IsEnum(ConsentCaptureChannel)
  captureChannel!: ConsentCaptureChannel;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  evidenceUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateMicroLoanPolicyDto {
  @IsString()
  name!: string;

  @IsString()
  version!: string;

  @IsEnum(MicroLoanProductType)
  productType!: MicroLoanProductType;

  @IsEnum(BorrowerSegment)
  segment!: BorrowerSegment;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  allowedTenors!: number[];

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  interestRateMin!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  interestRateMax!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minScore!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDebtBurdenRatio?: number;

  @IsOptional()
  @IsBoolean()
  requiresGuarantor?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresFieldVisit?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresMobileMoneyConsent?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  coolingOffPeriodDays?: number;

  @IsOptional()
  @IsEnum(PolicyStatus)
  status?: PolicyStatus;

  @IsOptional()
  @IsObject()
  feeRules?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  renewalRules?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  progressiveLendingRules?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateMicroLoanApplicationDto {
  @IsString()
  borrowerId!: string;

  @IsOptional()
  @IsString()
  policyId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  requestedAmount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsEnum(MicroLoanProductType)
  productType?: MicroLoanProductType;

  @IsOptional()
  @IsEnum(BorrowerSegment)
  segment?: BorrowerSegment;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsBoolean()
  priority?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateFieldVisitDto {
  @IsOptional()
  @IsString()
  visitType?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class CompleteFieldVisitDto {
  @IsEnum(FieldVisitOutcome)
  outcome!: FieldVisitOutcome;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  agentConfidenceScore?: number;

  @IsOptional()
  @IsObject()
  observations?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  photos?: unknown[];
}

export class SubmitMicroLoanDecisionDto {
  @IsOptional()
  @IsEnum(DecisionStatus)
  status?: DecisionStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  approvedAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenorDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  interestRate?: number;

  @IsOptional()
  @IsBoolean()
  overrideFlag?: boolean;

  @IsOptional()
  @IsString()
  overrideReason?: string;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;
}

export class CreateLoanOfferDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  approvedAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenorDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  interestRate?: number;

  @IsOptional()
  @IsEnum(RepaymentFrequency)
  repaymentFrequency?: RepaymentFrequency;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  requiresGuarantor?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresCollateral?: boolean;

  @IsOptional()
  @IsObject()
  fees?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;
}

export class UpdateLoanOfferStatusDto {
  @IsEnum(LoanOfferStatus)
  status!: LoanOfferStatus;
}

export class AcceptLoanOfferDto {
  @IsOptional()
  @IsString()
  acceptedBy?: string;
}

export class CreateDisbursementDto {
  @IsEnum(DisbursementChannel)
  channel!: DisbursementChannel;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  providerReference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount?: number;
}

export class CompleteDisbursementDto {
  @IsEnum(DisbursementStatus)
  status!: DisbursementStatus;

  @IsOptional()
  @IsString()
  providerReference?: string;

  @IsOptional()
  @IsString()
  failureReason?: string;
}

export class RecordRepaymentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsEnum(RepaymentChannel)
  channel!: RepaymentChannel;

  @IsOptional()
  @IsString()
  scheduleId?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  providerReference?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class OpenDelinquencyDto {
  @IsOptional()
  @IsString()
  scheduleId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  dpd!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  overdueAmount!: number;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateCollectionActionDto {
  @IsEnum(CollectionActionType)
  actionType!: CollectionActionType;

  @IsOptional()
  @IsEnum(CollectionActionStatus)
  status?: CollectionActionStatus;

  @IsOptional()
  @IsString()
  scheduleId?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsDateString()
  promiseToPayDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  promiseToPayAmount?: number;

  @IsOptional()
  @IsDateString()
  nextActionAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMobileMoneySnapshotDto {
  @IsString()
  borrowerId!: string;

  @IsOptional()
  @IsString()
  consentGrantId?: string;

  @IsString()
  provider!: string;

  @IsOptional()
  @IsString()
  walletNumberMasked?: string;

  @IsDateString()
  statementStart!: string;

  @IsDateString()
  statementEnd!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cashInTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cashOutTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  avgBalance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  transactionCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  activeDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salaryLikeInflows?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  merchantPaymentCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reversalsCount?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateAlternativeDataFeatureSnapshotDto {
  @IsString()
  borrowerId!: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsString()
  consentGrantId?: string;

  @IsEnum(AlternativeDataSourceType)
  sourceType!: AlternativeDataSourceType;

  @IsString()
  featureSchemaVersion!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  payloadQualityScore!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  rawCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  derivedCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  imputedCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  declaredCount?: number;

  @IsObject()
  features!: Record<string, unknown>;

  @IsObject()
  lineage!: Record<string, unknown>;
}

export class RenewLoanDto {
  @IsString()
  borrowerId!: string;

  @IsOptional()
  @IsString()
  policyId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  requestedAmount!: number;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  channel?: string;
}

export class EscalateDelinquencyDto {
  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CureDelinquencyDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class WriteOffLoanAccountDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CompleteCollectionActionDto {
  @IsEnum(CollectionActionStatus)
  status!: CollectionActionStatus;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsDateString()
  nextActionAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class FairnessWindowDto {
  @IsOptional()
  @IsDateString()
  windowStart?: string;

  @IsOptional()
  @IsDateString()
  windowEnd?: string;

  @IsOptional()
  @IsEnum(BorrowerSegment)
  segment?: BorrowerSegment;
}

export class ConsentCoverageDto {
  @IsOptional()
  @IsEnum(BorrowerSegment)
  segment?: BorrowerSegment;

  @IsOptional()
  @IsEnum(ConsentSourceType)
  sourceType?: ConsentSourceType;
}

export class AltDataLineageQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  borrowerId?: string;

  @IsOptional()
  @IsEnum(AlternativeDataSourceType)
  sourceType?: AlternativeDataSourceType;

  @IsOptional()
  @IsString()
  applicationId?: string;
}

export class LoanAccountQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(BorrowerSegment)
  segment?: BorrowerSegment;

  @IsOptional()
  @IsEnum(LoanAccountStatus)
  status?: LoanAccountStatus;
}

export class DelinquencyQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(BorrowerSegment)
  segment?: BorrowerSegment;

  @IsOptional()
  @IsEnum(DelinquencyStatus)
  status?: DelinquencyStatus;
}

export class CollectionActionQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(BorrowerSegment)
  segment?: BorrowerSegment;

  @IsOptional()
  @IsEnum(CollectionActionStatus)
  status?: CollectionActionStatus;
}

export class PortfolioAnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  windowStart?: string;

  @IsOptional()
  @IsDateString()
  windowEnd?: string;
}

export class CancelApplicationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SubmitSupervisorDecisionDto {
  @IsEnum(DecisionStatus)
  status!: DecisionStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  approvedAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenorDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  interestRate?: number;

  @IsOptional()
  @IsBoolean()
  overrideFlag?: boolean;

  @IsOptional()
  @IsString()
  overrideReason?: string;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;
}

export class DeclineOfferDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelOfferDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateBorrowerStatusDto {
  @IsEnum(BorrowerStatus)
  status!: BorrowerStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class DisbursementQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(DisbursementStatus)
  status?: DisbursementStatus;

  @IsOptional()
  @IsString()
  borrowerId?: string;
}

export class FieldVisitQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(FieldVisitStatus)
  status?: FieldVisitStatus;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}

export class ReapplyDto {
  @IsString()
  borrowerId!: string;

  @IsOptional()
  @IsString()
  policyId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  requestedAmount!: number;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsEnum(MicroLoanProductType)
  productType?: MicroLoanProductType;

  @IsOptional()
  @IsString()
  channel?: string;
}

export class RetryDisbursementDto {
  @IsEnum(DisbursementChannel)
  channel!: DisbursementChannel;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  providerReference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount?: number;
}
