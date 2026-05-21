import { fetchApi } from './api-client'

export type BorrowerSegment = 'FORMAL' | 'SEMI_FORMAL' | 'INFORMAL' | 'THIN_FILE'
export type ConsentSourceType = 'MOBILE_MONEY' | 'DEVICE_DATA' | 'FIELD_DATA' | 'OCR_DOCUMENT' | 'CREDIT_BUREAU' | 'KYC_IDENTITY' | 'GPS_LOCATION' | 'GUARANTOR_DATA' | 'GROUP_DATA'
export type ConsentPurpose = 'UNDERWRITING' | 'AFFORDABILITY_ASSESSMENT' | 'FRAUD_PREVENTION' | 'COLLECTIONS' | 'PORTFOLIO_MONITORING' | 'MODEL_MONITORING' | 'MODEL_TRAINING' | 'REGULATORY_REPORTING'
export type MicroLoanApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'FIELD_REVIEW_REQUIRED' | 'FIELD_REVIEWED' | 'SCORED' | 'SUPERVISOR_REVIEW' | 'APPROVED' | 'APPROVED_WITH_CONDITIONS' | 'REJECTED' | 'CANCELLED' | 'EXPIRED'
export type DecisionStatus = 'APPROVE' | 'APPROVE_WITH_CONDITIONS' | 'SEND_TO_REVIEW' | 'REJECT' | 'PENDING'
export type LoanOfferStatus = 'DRAFT' | 'ISSUED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED'
export type DisbursementStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REVERSED'
export type LoanAccountStatus = 'PENDING_DISBURSEMENT' | 'ACTIVE' | 'CLOSED' | 'DEFAULTED' | 'WRITTEN_OFF' | 'CANCELLED'
export type RepaymentScheduleStatus = 'SCHEDULED' | 'DUE' | 'PAID' | 'PARTIALLY_PAID' | 'LATE' | 'DEFAULTED' | 'WAIVED'
export type CollectionActionType = 'SMS_REMINDER' | 'PHONE_CALL' | 'WHATSAPP_MESSAGE' | 'FIELD_VISIT' | 'PROMISE_TO_PAY' | 'RESTRUCTURING_PROPOSAL' | 'GUARANTOR_CONTACT' | 'GROUP_ESCALATION' | 'LEGAL_NOTICE' | 'WRITE_OFF_RECOMMENDATION'

export interface Paginated<T> {
  data: T[]
  meta?: {
    total: number
    page: number
    limit: number
    lastPage: number
  }
}

export interface InformalBusinessProfile {
  id?: string
  businessName?: string | null
  activityType: string
  sector?: string | null
  locationType?: string | null
  yearsInActivity?: number | null
  monthlyRevenueEstimate?: number | null
  monthlyExpenseEstimate?: number | null
  stockValueEstimate?: number | null
  seasonalityNotes?: string | null
}

export interface ConsentGrant {
  id: string
  borrowerId: string
  sourceType: ConsentSourceType
  purpose: ConsentPurpose
  status: 'GRANTED' | 'REVOKED' | 'EXPIRED'
  grantedAt: string
  expiresAt?: string | null
  captureChannel: string
  consentTextVersion: string
}

export interface RetailBorrower {
  id: string
  externalId?: string | null
  fullName: string
  phone?: string | null
  nationalIdNumber?: string | null
  geography?: string | null
  address?: string | null
  segment: BorrowerSegment
  status: string
  identityVerified: boolean
  kycLevel?: string | null
  informalBusinessProfile?: InformalBusinessProfile | null
  consents?: ConsentGrant[]
  applications?: MicroLoanApplication[]
  loanAccounts?: LoanAccount[]
  delinquencyEvents?: DelinquencyEvent[]
  groupMemberships?: unknown[]
}

export interface MicroLoanPolicy {
  id: string
  name: string
  version: string
  productType: string
  segment: BorrowerSegment
  minAmount: number
  maxAmount: number
  currency: string
  allowedTenors: number[]
  interestRateMin: number
  interestRateMax: number
  minScore: number
  requiresGuarantor: boolean
  requiresFieldVisit: boolean
  requiresMobileMoneyConsent: boolean
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED'
}

export interface ProductPolicySnapshot {
  id: string
  policyName: string
  policyVersion: string
  snapshot: MicroLoanPolicy & Record<string, unknown>
}

export interface FieldVisit {
  id: string
  applicationId: string
  status: 'PLANNED' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  outcome?: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED' | 'FRAUD_SUSPECTED' | null
  visitType?: string | null
  assignedToId?: string | null
  scheduledAt?: string | null
  completedAt?: string | null
  agentConfidenceScore?: number | null
  observations?: Record<string, unknown> | null
}

export interface ThinFileScorecard {
  id: string
  totalScore: number
  recommendation: string
  identityScore: number
  activityStabilityScore: number
  cashflowScore: number
  mobileMoneyScore: number
  repaymentHistoryScore: number
  guarantorGroupScore: number
  fieldConfidenceScore: number
  reasonCodes: Array<{ code: string; label: string; severity?: string }>
  createdAt: string
}

export interface DecisionReason {
  id: string
  code: string
  label: string
  severity: string
  source: string
}

export interface MicroLoanDecision {
  id: string
  status: DecisionStatus
  approvedAmount?: number | null
  tenorDays?: number | null
  interestRate?: number | null
  overrideFlag: boolean
  overrideReason?: string | null
  decidedAt?: string | null
  reasons?: DecisionReason[]
  offers?: LoanOffer[]
}

export interface LoanOffer {
  id: string
  approvedAmount: number
  currency: string
  tenorDays: number
  interestRate: number
  repaymentFrequency: string
  requiresGuarantor: boolean
  requiresCollateral: boolean
  status: LoanOfferStatus
  issuedAt?: string | null
  acceptedAt?: string | null
  expiresAt?: string | null
  disbursements?: Disbursement[]
  loanAccount?: LoanAccount | null
}

export interface Disbursement {
  id: string
  amount: number
  currency: string
  channel: string
  provider?: string | null
  providerReference?: string | null
  status: DisbursementStatus
  disbursedAt?: string | null
  failureReason?: string | null
  loanAccountId?: string | null
}

export interface RepaymentSchedule {
  id: string
  installmentNumber: number
  dueDate: string
  principalDue: number
  interestDue: number
  totalDue: number
  amountPaid: number
  status: RepaymentScheduleStatus
}

export interface RepaymentEvent {
  id: string
  amount: number
  channel: string
  receivedAt: string
}

export interface DelinquencyEvent {
  id: string
  loanAccountId: string
  dpd: number
  overdueAmount: number
  status: string
  severity: string
  openedAt: string
  collectionActions?: CollectionAction[]
}

export interface CollectionAction {
  id: string
  actionType: CollectionActionType
  status: 'PLANNED' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  scheduledAt?: string | null
  completedAt?: string | null
  outcome?: string | null
  promiseToPayDate?: string | null
  promiseToPayAmount?: number | null
  notes?: string | null
}

export interface LoanAccount {
  id: string
  accountNumber: string
  principalAmount: number
  outstandingPrincipal: number
  currency: string
  status: LoanAccountStatus
  openedAt: string
  repaymentSchedules?: RepaymentSchedule[]
  repaymentEvents?: RepaymentEvent[]
  delinquencyEvents?: DelinquencyEvent[]
}

export interface MicroLoanApplication {
  id: string
  reqId: string
  borrowerId: string
  borrower?: RetailBorrower
  policy?: MicroLoanPolicy | null
  policySnapshot?: ProductPolicySnapshot | null
  requestedAmount: number
  currency: string
  purpose?: string | null
  productType: string
  segment: BorrowerSegment
  channel?: string | null
  status: MicroLoanApplicationStatus
  priority: boolean
  createdAt: string
  fieldVisits?: FieldVisit[]
  guarantors?: unknown[]
  scorecards?: ThinFileScorecard[]
  decisions?: MicroLoanDecision[]
  offers?: LoanOffer[]
  disbursements?: Disbursement[]
  loanAccount?: LoanAccount | null
}

export interface MicrofinanceSummary {
  borrowers: number
  applications: number
  activeLoanCount: number
  totalPrincipal: number
  outstandingPrincipal: number
  openDelinquencies: number
  plannedCollectionActions: number
  successfulDisbursements: number
  disbursedAmount: number
  generatedAt: string
}

export interface FairnessSegmentRow {
  segment: BorrowerSegment
  totalDecisions: number
  approved: number
  rejected: number
  approvalRate: number
  rejectionRate: number
  delinquencyEvents: number
  altDataSnapshotCount: number
  avgAltDataPayloadQuality: number
  avgAltDataImputedCount: number
}

export interface FairnessReport {
  windowStart: string
  windowEnd: string
  segments: FairnessSegmentRow[]
}

export interface ConsentCoverageReport {
  total: number
  granted: number
  revoked: number
  expired: number
  coverageRate: number
  bySource: Array<{ sourceType: ConsentSourceType; count: number }>
}

export interface AltDataLineageRecord {
  id: string
  borrowerId: string
  sourceType: string
  featureSchemaVersion: string
  payloadQualityScore: number
  rawCount: number
  derivedCount: number
  imputedCount: number
  createdAt: string
  borrower: { id: string; fullName: string; segment: BorrowerSegment }
  consentGrant: { id: string; sourceType: ConsentSourceType; status: string; purpose: ConsentPurpose } | null
}

export interface PortfolioAnalytics {
  windowStart: string
  windowEnd: string
  activeLoanCount: number
  defaultedLoanCount: number
  writtenOffLoanCount: number
  outstandingPrincipal: number
  par30Outstanding: number
  par90Outstanding: number
  par30Ratio: number
  par90Ratio: number
  openDelinquencyCount: number
  agingBuckets: { dpd1to7: number; dpd8to30: number; dpd31to90: number; dpd90Plus: number }
  collectionEfficiency: number
  completedCollections: number
  totalCollections: number
  disbursementCount: number
  disbursedAmount: number
  generatedAt: string
}

export const microfinanceApi = {
  summary: () => fetchApi('/microfinance/portfolio/summary') as Promise<MicrofinanceSummary>,
  borrowers: (query = 'limit=30') => fetchApi(`/microfinance/borrowers?${query}`) as Promise<Paginated<RetailBorrower>>,
  borrower: (id: string) => fetchApi(`/microfinance/borrowers/${id}`) as Promise<RetailBorrower>,
  createBorrower: (payload: Record<string, unknown>) => fetchApi('/microfinance/borrowers', { method: 'POST', body: JSON.stringify(payload) }) as Promise<RetailBorrower>,
  grantConsent: (borrowerId: string, payload: Record<string, unknown>) => fetchApi(`/microfinance/borrowers/${borrowerId}/consents`, { method: 'POST', body: JSON.stringify(payload) }) as Promise<ConsentGrant>,
  policies: () => fetchApi('/microfinance/policies?status=ACTIVE') as Promise<MicroLoanPolicy[]>,
  applications: (query = 'limit=30') => fetchApi(`/microfinance/applications?${query}`) as Promise<Paginated<MicroLoanApplication>>,
  application: (id: string) => fetchApi(`/microfinance/applications/${id}`) as Promise<MicroLoanApplication>,
  createApplication: (payload: Record<string, unknown>) => fetchApi('/microfinance/applications', { method: 'POST', body: JSON.stringify(payload) }) as Promise<MicroLoanApplication>,
  createFieldVisit: (applicationId: string, payload: Record<string, unknown>) => fetchApi(`/microfinance/applications/${applicationId}/field-visits`, { method: 'POST', body: JSON.stringify(payload) }) as Promise<FieldVisit>,
  completeFieldVisit: (visitId: string, payload: Record<string, unknown>) => fetchApi(`/microfinance/field-visits/${visitId}/complete`, { method: 'PATCH', body: JSON.stringify(payload) }) as Promise<FieldVisit>,
  runScorecard: (applicationId: string) => fetchApi(`/microfinance/applications/${applicationId}/scorecard`, { method: 'POST' }) as Promise<ThinFileScorecard>,
  submitDecision: (applicationId: string, payload: Record<string, unknown>) => fetchApi(`/microfinance/applications/${applicationId}/decisions`, { method: 'POST', body: JSON.stringify(payload) }) as Promise<MicroLoanDecision>,
  submitSupervisorDecision: (applicationId: string, payload: Record<string, unknown>) => fetchApi(`/microfinance/applications/${applicationId}/supervisor-decision`, { method: 'POST', body: JSON.stringify(payload) }) as Promise<MicroLoanDecision>,
  createOffer: (decisionId: string, payload: Record<string, unknown>) => fetchApi(`/microfinance/decisions/${decisionId}/offers`, { method: 'POST', body: JSON.stringify(payload) }) as Promise<LoanOffer>,
  acceptOffer: (offerId: string, payload: Record<string, unknown> = {}) => fetchApi(`/microfinance/offers/${offerId}/accept`, { method: 'PATCH', body: JSON.stringify(payload) }) as Promise<LoanOffer>,
  createDisbursement: (offerId: string, payload: Record<string, unknown>) => fetchApi(`/microfinance/offers/${offerId}/disbursements`, { method: 'POST', body: JSON.stringify(payload) }) as Promise<Disbursement>,
  completeDisbursement: (disbursementId: string, payload: Record<string, unknown>) => fetchApi(`/microfinance/disbursements/${disbursementId}/complete`, { method: 'PATCH', body: JSON.stringify(payload) }) as Promise<{ account: LoanAccount; disbursement: Disbursement }>,
  recordRepayment: (loanAccountId: string, payload: Record<string, unknown>) => fetchApi(`/microfinance/loan-accounts/${loanAccountId}/repayments`, { method: 'POST', body: JSON.stringify(payload) }),
  openDelinquency: (loanAccountId: string, payload: Record<string, unknown>) => fetchApi(`/microfinance/loan-accounts/${loanAccountId}/delinquencies`, { method: 'POST', body: JSON.stringify(payload) }) as Promise<DelinquencyEvent>,
  createCollectionAction: (delinquencyId: string, payload: Record<string, unknown>) => fetchApi(`/microfinance/delinquencies/${delinquencyId}/collection-actions`, { method: 'POST', body: JSON.stringify(payload) }) as Promise<CollectionAction>,
  renewLoan: (closedLoanAccountId: string, payload: Record<string, unknown>) => fetchApi(`/microfinance/loan-accounts/${closedLoanAccountId}/renew`, { method: 'POST', body: JSON.stringify(payload) }) as Promise<{ application: MicroLoanApplication; renewalRules: Record<string, unknown> }>,
  escalateDelinquency: (delinquencyId: string, payload: Record<string, unknown>) => fetchApi(`/microfinance/delinquencies/${delinquencyId}/escalate`, { method: 'PATCH', body: JSON.stringify(payload) }) as Promise<DelinquencyEvent>,
  cureDelinquency: (delinquencyId: string, payload?: Record<string, unknown>) => fetchApi(`/microfinance/delinquencies/${delinquencyId}/cure`, { method: 'PATCH', body: JSON.stringify(payload ?? {}) }) as Promise<DelinquencyEvent>,
  writeOffLoanAccount: (loanAccountId: string, payload: Record<string, unknown>) => fetchApi(`/microfinance/loan-accounts/${loanAccountId}/write-off`, { method: 'PATCH', body: JSON.stringify(payload) }) as Promise<LoanAccount>,
  completeCollectionAction: (actionId: string, payload: Record<string, unknown>) => fetchApi(`/microfinance/collection-actions/${actionId}/complete`, { method: 'PATCH', body: JSON.stringify(payload) }) as Promise<CollectionAction>,
  loanAccounts: (query = 'limit=30') => fetchApi(`/microfinance/loan-accounts?${query}`) as Promise<Paginated<LoanAccount>>,
  delinquencies: (query = 'limit=30') => fetchApi(`/microfinance/delinquencies?${query}`) as Promise<Paginated<DelinquencyEvent>>,
  collectionActions: (query = 'limit=30') => fetchApi(`/microfinance/collection-actions?${query}`) as Promise<Paginated<CollectionAction>>,
  portfolioAnalytics: (query = '') => fetchApi(`/microfinance/portfolio/analytics?${query}`) as Promise<PortfolioAnalytics>,
  fairnessMetrics: (query = '') => fetchApi(`/microfinance/fairness?${query}`) as Promise<FairnessReport>,
  consentCoverage: (query = '') => fetchApi(`/microfinance/consent-coverage?${query}`) as Promise<ConsentCoverageReport>,
  altDataLineage: (query = '') => fetchApi(`/microfinance/alternative-data/lineage?${query}`) as Promise<Paginated<AltDataLineageRecord>>,
}

export function hasActiveConsent(borrower: RetailBorrower | undefined, sourceType: ConsentSourceType, purpose?: ConsentPurpose) {
  return Boolean(borrower?.consents?.some(consent =>
    consent.status === 'GRANTED' &&
    consent.sourceType === sourceType &&
    (!consent.expiresAt || new Date(consent.expiresAt).getTime() > Date.now()) &&
    (!purpose || consent.purpose === purpose)
  ))
}

export function money(amount: number | undefined | null, currency = 'XAF') {
  const value = amount ?? 0
  return new Intl.NumberFormat('fr-CM', { maximumFractionDigits: 0 }).format(value) + ` ${currency}`
}

export function latest<T extends { createdAt?: string | null; issuedAt?: string | null; openedAt?: string | null }>(items: T[] | undefined) {
  return [...(items ?? [])].sort((a, b) => {
    const left = a.createdAt ?? a.issuedAt ?? a.openedAt ?? ''
    const right = b.createdAt ?? b.issuedAt ?? b.openedAt ?? ''
    return right.localeCompare(left)
  })[0]
}
