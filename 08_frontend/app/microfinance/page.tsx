'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  CheckCheck,
  ClipboardCheck,
  Eye,
  FileText,
  FileX,
  HandCoins,
  HeartPulse,
  Loader2,
  MapPin,
  PhoneCall,
  Plus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { Btn, KPIBlock, LiveBadge, ProgressBar, SectionHeader, SidePanel } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  CollectionActionType,
  ConsentCoverageReport,
  DecisionStatus,
  FairnessReport,
  FieldVisit,
  LoanOffer,
  MicroLoanApplication,
  MicroLoanPolicy,
  PortfolioAnalytics,
  RetailBorrower,
  hasActiveConsent,
  microfinanceApi,
  money,
} from '@/lib/microfinance'

type ActivePanel = 'none' | 'borrower' | 'application'
type MutationAction<T> = { mutate: (variables: T) => void; isPending: boolean }
type WorkspaceActions = {
  planFieldVisit: MutationAction<string>
  completeFieldVisit: MutationAction<FieldVisit>
  runScorecard: MutationAction<string>
  submitDecision: MutationAction<string>
  createOffer: MutationAction<string>
  acceptOffer: MutationAction<string>
  createDisbursement: MutationAction<string>
  completeDisbursement: MutationAction<string>
  recordRepayment: MutationAction<void>
  openDelinquency: MutationAction<void>
  createCollection: MutationAction<void>
  completeCollectionAction: MutationAction<string>
  cureDelinquency: MutationAction<string>
  escalateDelinquency: MutationAction<string>
  writeOffLoanAccount: MutationAction<string>
  renewLoan: MutationAction<string>
}

const statusTone: Record<string, string> = {
  SUBMITTED: 'border-white/10 bg-white/5 text-white/70',
  FIELD_REVIEW_REQUIRED: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  FIELD_REVIEWED: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
  SCORED: 'border-purple-500/25 bg-purple-500/10 text-purple-300',
  SUPERVISOR_REVIEW: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  APPROVED: 'border-[#3ECF8E]/25 bg-[#3ECF8E]/10 text-[#3ECF8E]',
  APPROVED_WITH_CONDITIONS: 'border-[#3ECF8E]/25 bg-[#3ECF8E]/10 text-[#3ECF8E]',
  REJECTED: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  ACTIVE: 'border-[#3ECF8E]/25 bg-[#3ECF8E]/10 text-[#3ECF8E]',
  CLOSED: 'border-zinc-500/25 bg-zinc-500/10 text-zinc-300',
  DEFAULTED: 'border-rose-500/30 bg-rose-500/15 text-rose-200',
  WRITTEN_OFF: 'border-zinc-500/30 bg-zinc-500/15 text-zinc-200',
  OPEN: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  ESCALATED: 'border-orange-500/25 bg-orange-500/10 text-orange-300',
  CURED: 'border-[#3ECF8E]/25 bg-[#3ECF8E]/10 text-[#3ECF8E]',
  ACCEPTED: 'border-[#3ECF8E]/25 bg-[#3ECF8E]/10 text-[#3ECF8E]',
  ISSUED: 'border-[#3ECF8E]/25 bg-[#3ECF8E]/10 text-[#3ECF8E]',
  SUCCESS: 'border-[#3ECF8E]/25 bg-[#3ECF8E]/10 text-[#3ECF8E]',
  PENDING: 'border-white/10 bg-white/5 text-white/70',
}

const segmentLabels = {
  FORMAL: 'Formal',
  SEMI_FORMAL: 'Semi-formal',
  INFORMAL: 'Informal',
  THIN_FILE: 'Thin-file',
}

function pill(status: string) {
  return cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest', statusTone[status] ?? 'border-zinc-500/25 bg-zinc-500/10 text-zinc-300')
}

function latestDecision(app: MicroLoanApplication | undefined) {
  return app?.decisions?.[0]
}

function latestOffer(app: MicroLoanApplication | undefined) {
  return app?.offers?.[0] ?? latestDecision(app)?.offers?.[0]
}

function latestDisbursement(offer: LoanOffer | undefined) {
  return offer?.disbursements?.[0]
}

function openSchedule(app: MicroLoanApplication | undefined) {
  return app?.loanAccount?.repaymentSchedules?.find(schedule => schedule.status !== 'PAID')
}

function firstPlannedVisit(app: MicroLoanApplication | undefined) {
  return app?.fieldVisits?.find(visit => visit.status === 'PLANNED')
}

function firstOpenDelinquency(app: MicroLoanApplication | undefined) {
  return app?.loanAccount?.delinquencyEvents?.find(event => event.status === 'OPEN' || event.status === 'ESCALATED')
}

function recommendationToDecision(recommendation?: string): DecisionStatus | undefined {
  if (recommendation === 'APPROVE_SMALL_LIMIT') return 'APPROVE'
  if (recommendation === 'APPROVE_WITH_GUARANTOR') return 'APPROVE_WITH_CONDITIONS'
  if (recommendation === 'DECLINE_FOR_NOW') return 'REJECT'
  if (recommendation) return 'SEND_TO_REVIEW'
  return undefined
}

function Guardrail({ label, passed, detail }: { label: string; passed: boolean; detail: string }) {
  return (
    <div className={cn('rounded-xl border p-3', passed ? 'border-emerald-500/20 bg-emerald-500/[0.06]' : 'border-amber-500/20 bg-amber-500/[0.06]')}>
      <div className="flex items-center gap-2">
        {passed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />}
        <span className="text-xs font-bold text-white">{label}</span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{detail}</p>
    </div>
  )
}

function WorkflowStep({ icon: Icon, title, body, children }: { icon: React.ElementType; title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3ECF8E]/20 bg-[#3ECF8E]/10 text-[#3ECF8E]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-white">{title}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{body}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export default function MicrofinancePage() {
  const queryClient = useQueryClient()
  const [currentRole] = React.useState(() => {
    if (typeof window === 'undefined') return 'ANALYST'
    try {
      const user = JSON.parse(localStorage.getItem('internal_user') ?? '{}')
      return typeof user.role === 'string' ? user.role : 'ANALYST'
    } catch {
      return 'ANALYST'
    }
  })
  const [selectedBorrowerId, setSelectedBorrowerId] = React.useState<string | null>(null)
  const [selectedApplicationId, setSelectedApplicationId] = React.useState<string | null>(null)
  const [activePanel, setActivePanel] = React.useState<ActivePanel>('none')
  const [search, setSearch] = React.useState('')
  const [error, setError] = React.useState('')
  const [notice, setNotice] = React.useState('')

  const [borrowerForm, setBorrowerForm] = React.useState({
    fullName: '', phone: '', geography: 'Douala', segment: 'INFORMAL', activityType: 'Market trading', monthlyRevenueEstimate: '180000', monthlyExpenseEstimate: '80000', yearsInActivity: '2',
  })
  const [applicationForm, setApplicationForm] = React.useState({ borrowerId: '', policyId: '', requestedAmount: '100000', purpose: 'Working capital for inventory' })
  const [fieldConfidence, setFieldConfidence] = React.useState('80')
  const [decisionForm, setDecisionForm] = React.useState({ status: 'APPROVE_WITH_CONDITIONS' as DecisionStatus, approvedAmount: '100000', tenorDays: '30', interestRate: '4.0', overrideReason: '' })
  const [collectionAction, setCollectionAction] = React.useState<CollectionActionType>('PHONE_CALL')
  const [writeOffReason, setWriteOffReason] = React.useState('')
  const [renewAmount, setRenewAmount] = React.useState('')
  const [supervisorForm, setSupervisorForm] = React.useState({ status: 'APPROVE' as DecisionStatus, rationale: '', approvedAmount: '', tenorDays: '30', interestRate: '4.0' })
  const [supervisorTargetId, setSupervisorTargetId] = React.useState<string | null>(null)

  const invalidateAll = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['microfinance'] })
  }, [queryClient])

  const summaryQuery = useQuery({ queryKey: ['microfinance', 'summary'], queryFn: microfinanceApi.summary })
  const policiesQuery = useQuery({ queryKey: ['microfinance', 'policies'], queryFn: microfinanceApi.policies })
  const fairnessQuery = useQuery({ queryKey: ['microfinance', 'fairness'], queryFn: () => microfinanceApi.fairnessMetrics() })
  const consentQuery = useQuery({ queryKey: ['microfinance', 'consent-coverage'], queryFn: () => microfinanceApi.consentCoverage() })
  const lineageQuery = useQuery({ queryKey: ['microfinance', 'alt-data-lineage'], queryFn: () => microfinanceApi.altDataLineage('limit=20') })
  const analyticsQuery = useQuery({ queryKey: ['microfinance', 'portfolio-analytics'], queryFn: () => microfinanceApi.portfolioAnalytics() })
  const borrowersQuery = useQuery({
    queryKey: ['microfinance', 'borrowers', search],
    queryFn: () => microfinanceApi.borrowers(new URLSearchParams({ limit: '30', ...(search ? { search } : {}) }).toString()),
  })
  const applicationsQuery = useQuery({ queryKey: ['microfinance', 'applications'], queryFn: () => microfinanceApi.applications('limit=30') })
  const borrowerQuery = useQuery({ queryKey: ['microfinance', 'borrower', selectedBorrowerId], queryFn: () => microfinanceApi.borrower(selectedBorrowerId!), enabled: Boolean(selectedBorrowerId) })
  const applicationQuery = useQuery({ queryKey: ['microfinance', 'application', selectedApplicationId], queryFn: () => microfinanceApi.application(selectedApplicationId!), enabled: Boolean(selectedApplicationId) })

  const borrowers = borrowersQuery.data?.data ?? []
  const applications = applicationsQuery.data?.data ?? []
  const borrower = borrowerQuery.data
  const app = applicationQuery.data ?? applications.find(item => item.id === selectedApplicationId)
  const policy = app?.policy ?? policiesQuery.data?.[0]
  const schedule = openSchedule(app)
  const delinquency = firstOpenDelinquency(app)
  const mobileMoneyConsent = hasActiveConsent(app?.borrower ?? borrower, 'MOBILE_MONEY', 'UNDERWRITING')
  const completedVisit = Boolean(app?.fieldVisits?.some(visit => visit.status === 'COMPLETED'))
  const guarantorOk = !policy?.requiresGuarantor || Boolean(app?.guarantors?.length)
  const canDisburse = ['MANAGER', 'CRO', 'ADMIN'].includes(currentRole)
  const canManageCollections = ['MANAGER', 'CRO', 'ADMIN'].includes(currentRole)
  const canWriteOff = ['CRO', 'ADMIN'].includes(currentRole)
  const isSupervisor = ['MANAGER', 'CRO', 'ADMIN'].includes(currentRole)

  const createBorrower = useMutation({
    mutationFn: () => microfinanceApi.createBorrower({
      fullName: borrowerForm.fullName,
      phone: borrowerForm.phone || undefined,
      geography: borrowerForm.geography || undefined,
      segment: borrowerForm.segment,
      identityVerified: false,
      informalBusinessProfile: {
        activityType: borrowerForm.activityType,
        monthlyRevenueEstimate: Number(borrowerForm.monthlyRevenueEstimate || 0),
        monthlyExpenseEstimate: Number(borrowerForm.monthlyExpenseEstimate || 0),
        yearsInActivity: Number(borrowerForm.yearsInActivity || 0),
      },
    }),
    onSuccess: created => { setSelectedBorrowerId(created.id); setActivePanel('none'); setNotice('Borrower profile created. Grant consent before using alternative data.'); invalidateAll() },
    onError: (err: Error) => setError(err.message),
  })

  const grantMobileMoneyConsent = useMutation({
    mutationFn: (borrowerId: string) => microfinanceApi.grantConsent(borrowerId, { sourceType: 'MOBILE_MONEY', purpose: 'UNDERWRITING', consentTextVersion: 'microfinance-alt-data-v1', captureChannel: 'FIELD_AGENT' }),
    onSuccess: () => { setNotice('Mobile money underwriting consent granted.'); invalidateAll() },
    onError: (err: Error) => setError(err.message),
  })

  const createApplication = useMutation({
    mutationFn: () => microfinanceApi.createApplication({
      borrowerId: applicationForm.borrowerId || selectedBorrowerId,
      policyId: applicationForm.policyId || policiesQuery.data?.[0]?.id,
      requestedAmount: Number(applicationForm.requestedAmount),
      purpose: applicationForm.purpose,
      channel: 'FIELD_AGENT',
    }),
    onSuccess: created => { setSelectedApplicationId(created.id); setActivePanel('none'); setNotice('Micro-loan application created. Continue with field underwriting.'); invalidateAll() },
    onError: (err: Error) => setError(err.message),
  })

  const planFieldVisit = useMutation({ mutationFn: (applicationId: string) => microfinanceApi.createFieldVisit(applicationId, { visitType: 'INITIAL', scheduledAt: new Date().toISOString() }), onSuccess: () => { setNotice('Field visit planned.'); invalidateAll() }, onError: (err: Error) => setError(err.message) })
  const completeFieldVisit = useMutation({
    mutationFn: (visit: FieldVisit) => microfinanceApi.completeFieldVisit(visit.id, { outcome: 'VERIFIED', agentConfidenceScore: Number(fieldConfidence), observations: { lightweightUX: true, capturedBy: 'field-agent' } }),
    onSuccess: () => { setNotice('Field visit completed and audit trail updated.'); invalidateAll() },
    onError: (err: Error) => setError(err.message),
  })
  const runScorecard = useMutation({ mutationFn: (applicationId: string) => microfinanceApi.runScorecard(applicationId), onSuccess: () => { setNotice('Thin-file scorecard generated. Human decision still required.'); invalidateAll() }, onError: (err: Error) => setError(err.message) })
  const submitDecision = useMutation({
    mutationFn: (applicationId: string) => {
      const recommendedStatus = recommendationToDecision(app?.scorecards?.[0]?.recommendation)
      if (recommendedStatus && decisionForm.status !== recommendedStatus && !decisionForm.overrideReason) {
        throw new Error(`Override reason required. Scorecard recommends ${recommendedStatus}.`)
      }
      return microfinanceApi.submitDecision(applicationId, { status: decisionForm.status, approvedAmount: Number(decisionForm.approvedAmount), tenorDays: Number(decisionForm.tenorDays), interestRate: Number(decisionForm.interestRate), overrideReason: decisionForm.overrideReason || undefined, conditions: { humanInTheLoop: true, rulesFirst: true, guardrailsReviewed: true } })
    },
    onSuccess: () => { setNotice('Decision submitted with human-in-the-loop audit metadata.'); invalidateAll() },
    onError: (err: Error) => setError(err.message),
  })
  const createOffer = useMutation({ mutationFn: (decisionId: string) => microfinanceApi.createOffer(decisionId, { repaymentFrequency: 'WEEKLY' }), onSuccess: () => { setNotice('Loan offer issued. Client acceptance is required before disbursement.'); invalidateAll() }, onError: (err: Error) => setError(err.message) })
  const acceptOffer = useMutation({ mutationFn: (offerId: string) => microfinanceApi.acceptOffer(offerId), onSuccess: () => { setNotice('Loan offer accepted. Disbursement can now be initiated.'); invalidateAll() }, onError: (err: Error) => setError(err.message) })
  const createDisbursement = useMutation({ mutationFn: (offerId: string) => microfinanceApi.createDisbursement(offerId, { channel: 'MOBILE_MONEY', provider: 'SANDBOX_MOMO' }), onSuccess: () => { setNotice('Disbursement request created. Mark success once provider confirms.'); invalidateAll() }, onError: (err: Error) => setError(err.message) })
  const completeDisbursement = useMutation({ mutationFn: (id: string) => microfinanceApi.completeDisbursement(id, { status: 'SUCCESS', providerReference: `MM-${Date.now()}` }), onSuccess: () => { setNotice('Disbursement confirmed. Loan account and repayment schedule created.'); invalidateAll() }, onError: (err: Error) => setError(err.message) })
  const recordRepayment = useMutation({ mutationFn: () => microfinanceApi.recordRepayment(app!.loanAccount!.id, { scheduleId: schedule?.id, amount: schedule ? schedule.totalDue - schedule.amountPaid : 0, channel: 'MOBILE_MONEY', provider: 'SANDBOX_MOMO' }), onSuccess: (result: any) => { const reconciled = result?.delinquencyReconciliation?.count ?? 0; setNotice(reconciled > 0 ? `Repayment posted. ${reconciled} delinquency event(s) auto-cured by backend.` : 'Repayment posted and loan balance updated.'); invalidateAll() }, onError: (err: Error) => setError(err.message) })
  const openDelinquency = useMutation({ mutationFn: () => microfinanceApi.openDelinquency(app!.loanAccount!.id, { scheduleId: schedule?.id, dpd: 7, overdueAmount: schedule ? schedule.totalDue - schedule.amountPaid : 0, reason: 'Missed scheduled instalment' }), onSuccess: () => { setNotice('Delinquency event opened. Create a collection action next.'); invalidateAll() }, onError: (err: Error) => setError(err.message) })
  const createCollection = useMutation({ mutationFn: () => microfinanceApi.createCollectionAction(delinquency!.id, { actionType: collectionAction, scheduledAt: new Date().toISOString(), notes: 'Back-office planned action from Microfinance Command.' }), onSuccess: () => { setNotice('Collection action created and assigned to operations queue.'); invalidateAll() }, onError: (err: Error) => setError(err.message) })

  const completeCollectionAction = useMutation({ mutationFn: (actionId: string) => microfinanceApi.completeCollectionAction(actionId, { status: 'COMPLETED', outcome: 'Resolved', notes: 'Completed via Microfinance Command.' }), onSuccess: () => { setNotice('Collection action marked as completed.'); invalidateAll() }, onError: (err: Error) => setError(err.message) })
  const cureDelinquency = useMutation({ mutationFn: (delinquencyId: string) => microfinanceApi.cureDelinquency(delinquencyId, { reason: 'Overdue balance resolved — cured via Microfinance Command.' }), onSuccess: () => { setNotice('Delinquency cured. Loan account status will update if no remaining open delinquencies.'); invalidateAll() }, onError: (err: Error) => setError(err.message) })
  const escalateDelinquency = useMutation({ mutationFn: (delinquencyId: string) => microfinanceApi.escalateDelinquency(delinquencyId, { reason: 'Escalated via Microfinance Command — failed collection actions.' }), onSuccess: () => { setNotice('Delinquency escalated. Severity and loan account status updated.'); invalidateAll() }, onError: (err: Error) => setError(err.message) })
  const writeOffLoanAccount = useMutation({ mutationFn: (loanAccountId: string) => microfinanceApi.writeOffLoanAccount(loanAccountId, { reason: writeOffReason || 'Written off via Microfinance Command — recovery unlikely.' }), onSuccess: () => { setNotice('Loan account written off. All open delinquencies closed.'); setWriteOffReason(''); invalidateAll() }, onError: (err: Error) => setError(err.message) })
  const renewLoan = useMutation({ mutationFn: (loanAccountId: string) => microfinanceApi.renewLoan(loanAccountId, { borrowerId: app?.borrower?.id ?? '', requestedAmount: Number(renewAmount || app?.requestedAmount || 100000), purpose: `Renewal of loan ${app?.loanAccount?.accountNumber ?? ''}`, channel: 'FIELD_AGENT' }), onSuccess: (result) => { setRenewAmount(''); setNotice(`Renewal application created: ${result.application.reqId}`); setSelectedApplicationId(result.application.id); invalidateAll() }, onError: (err: Error) => setError(err.message) })

  const submitSupervisorDecision = useMutation({
    mutationFn: (applicationId: string) => microfinanceApi.submitSupervisorDecision(applicationId, {
      status: supervisorForm.status,
      approvedAmount: Number(supervisorForm.approvedAmount || app?.requestedAmount || 100000),
      tenorDays: Number(supervisorForm.tenorDays || 30),
      interestRate: Number(supervisorForm.interestRate || 4.0),
      overrideReason: supervisorForm.rationale,
      overrideFlag: true,
      conditions: { supervisorReview: true, humanInTheLoop: true },
    }),
    onSuccess: (decision) => { setSupervisorTargetId(null); setNotice(`Supervisor decision submitted: ${decision.status}`); invalidateAll() },
    onError: (err: Error) => setError(err.message),
  })

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 pb-10 md:p-6">
      <SectionHeader
        title="Microfinance Command"
        subtitle="Operational back-office for informal, thin-file and field-underwritten borrowers."
        badge={<LiveBadge label="FOUNDATION V1" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Btn size="sm" onClick={() => setActivePanel('borrower')}><UserPlus className="h-4 w-4" /> New borrower</Btn>
            <Btn size="sm" variant="primary" onClick={() => setActivePanel('application')}><Plus className="h-4 w-4" /> New micro-loan</Btn>
          </div>
        }
      />

      {(error || notice) && (
        <div className={cn('rounded-xl border px-4 py-3 text-sm', error ? 'border-rose-500/25 bg-rose-500/10 text-rose-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300')}>
          <div className="flex items-center justify-between gap-3">
            <span>{error || notice}</span>
            <button onClick={() => { setError(''); setNotice('') }} className="text-xs text-white/60 hover:text-white">Dismiss</button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPIBlock label="Borrowers" value={summaryQuery.isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : summaryQuery.data?.borrowers ?? 0} accent="emerald" />
        <KPIBlock label="Applications" value={summaryQuery.data?.applications ?? 0} sub="Origination queue" accent="emerald" />
        <KPIBlock label="Outstanding" value={money(summaryQuery.data?.outstandingPrincipal)} sub={`${summaryQuery.data?.activeLoanCount ?? 0} active loans`} accent="emerald" />
        <KPIBlock label="Collections" value={summaryQuery.data?.openDelinquencies ?? 0} sub={`${summaryQuery.data?.plannedCollectionActions ?? 0} planned actions`} accent="rose" />
      </div>

      <PortfolioAnalyticsPanel analytics={analyticsQuery.data} isLoading={analyticsQuery.isLoading} />

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="space-y-4">
          <FairnessPanel fairness={fairnessQuery.data} isLoading={fairnessQuery.isLoading} />
          <ConsentCoveragePanel coverage={consentQuery.data} isLoading={consentQuery.isLoading} />
        </section>
        <section className="space-y-5">
          <AltDataLineagePanel records={lineageQuery.data?.data} isLoading={lineageQuery.isLoading} />
        </section>
      </div>

      {isSupervisor && <SupervisorReviewQueue applications={applications.filter(a => a.status === 'SUPERVISOR_REVIEW')} supervisorForm={supervisorForm} setSupervisorForm={setSupervisorForm} supervisorTargetId={supervisorTargetId} setSupervisorTargetId={setSupervisorTargetId} isPending={submitSupervisorDecision.isPending} onSubmit={(id) => submitSupervisorDecision.mutate(id)} />}

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[13px] font-bold text-white">Borrowers</h2>
                <p className="text-[11px] text-zinc-500">Informal profiles, consent, applications and servicing exposure.</p>
              </div>
              <Users className="h-5 w-5 text-[#3ECF8E]" />
            </div>
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search borrower, phone or ID" className="mb-3 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#3ECF8E]/40" />
            <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
              {borrowersQuery.isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>}
              {borrowers.map(item => (
                <button key={item.id} onClick={() => { setSelectedBorrowerId(item.id); setSelectedApplicationId(null) }} className={cn('group w-full rounded-xl border p-3 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#3ECF8E]/40 hover:bg-white/[0.04]', selectedBorrowerId === item.id ? 'border-[#3ECF8E]/50 bg-[#3ECF8E]/[0.08] shadow-[0_0_15px_rgba(62,207,142,0.15)]' : 'border-white/[0.07] bg-white/[0.025]')}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-white transition-colors group-hover:text-[#3ECF8E]">{item.fullName}</div>
                      <div className="mt-1 text-[11px] text-zinc-500">{item.phone ?? 'No phone'} · {segmentLabels[item.segment]}</div>
                    </div>
                    <span className={pill(item.status)}>{item.status}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-zinc-500">
                    <span>{item.identityVerified ? 'KYC verified' : 'KYC pending'}</span>
                    <span>{hasActiveConsent(item, 'MOBILE_MONEY', 'UNDERWRITING') ? 'MoMo consent' : 'No MoMo'}</span>
                    <span>{item.applications?.length ?? 0} apps</span>
                  </div>
                </button>
              ))}
              {!borrowersQuery.isLoading && borrowers.length === 0 && <div className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center text-sm text-zinc-500">No borrowers yet. Create the first informal profile.</div>}
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <BorrowerProfile borrower={borrower} isLoading={borrowerQuery.isLoading} onGrantConsent={() => borrower && grantMobileMoneyConsent.mutate(borrower.id)} onCreateApplication={() => { if (borrower) setApplicationForm(prev => ({ ...prev, borrowerId: borrower.id })); setActivePanel('application') }} />
          <ApplicationsRail applications={applications} selectedId={selectedApplicationId} isLoading={applicationsQuery.isLoading} onSelect={(id) => { const selected = applications.find(item => item.id === id); setSelectedApplicationId(id); setSelectedBorrowerId(selected?.borrowerId ?? selected?.borrower?.id ?? null) }} />
          <ApplicationWorkspace
            app={app}
            policy={policy}
            isLoading={applicationQuery.isLoading}
            guardrails={{ mobileMoneyConsent, completedVisit, guarantorOk }}
            fieldConfidence={fieldConfidence}
            setFieldConfidence={setFieldConfidence}
            decisionForm={decisionForm}
            setDecisionForm={setDecisionForm}
            collectionAction={collectionAction}
            setCollectionAction={setCollectionAction}
            canDisburse={canDisburse}
            canManageCollections={canManageCollections}
            canWriteOff={canWriteOff}
            writeOffReason={writeOffReason}
            setWriteOffReason={setWriteOffReason}
            renewAmount={renewAmount}
            setRenewAmount={setRenewAmount}
            actions={{ planFieldVisit, completeFieldVisit, runScorecard, submitDecision, createOffer, acceptOffer, createDisbursement, completeDisbursement, recordRepayment, openDelinquency, createCollection, completeCollectionAction, cureDelinquency, escalateDelinquency, writeOffLoanAccount, renewLoan }}
          />
        </section>
      </div>

      <SidePanel open={activePanel === 'borrower'} onClose={() => setActivePanel('none')} title="New informal borrower" subtitle="Back-office onboarding profile, not borrower-facing app." width={420}>
        <div className="space-y-4">
          <Field label="Full name" value={borrowerForm.fullName} onChange={value => setBorrowerForm(prev => ({ ...prev, fullName: value }))} />
          <Field label="Phone" value={borrowerForm.phone} onChange={value => setBorrowerForm(prev => ({ ...prev, phone: value }))} />
          <Field label="Geography" value={borrowerForm.geography} onChange={value => setBorrowerForm(prev => ({ ...prev, geography: value }))} />
          <SelectField label="Segment" value={borrowerForm.segment} options={[['INFORMAL', 'Informal'], ['THIN_FILE', 'Thin-file'], ['SEMI_FORMAL', 'Semi-formal']]} onChange={value => setBorrowerForm(prev => ({ ...prev, segment: value }))} />
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Informal activity</div>
            <div className="space-y-3">
              <Field label="Activity type" value={borrowerForm.activityType} onChange={value => setBorrowerForm(prev => ({ ...prev, activityType: value }))} />
              <Field label="Monthly revenue estimate" value={borrowerForm.monthlyRevenueEstimate} onChange={value => setBorrowerForm(prev => ({ ...prev, monthlyRevenueEstimate: value }))} />
              <Field label="Monthly expense estimate" value={borrowerForm.monthlyExpenseEstimate} onChange={value => setBorrowerForm(prev => ({ ...prev, monthlyExpenseEstimate: value }))} />
              <Field label="Years in activity" value={borrowerForm.yearsInActivity} onChange={value => setBorrowerForm(prev => ({ ...prev, yearsInActivity: value }))} />
            </div>
          </div>
          <Btn variant="primary" className="w-full justify-center" disabled={!borrowerForm.fullName || createBorrower.isPending} onClick={() => createBorrower.mutate()}>{createBorrower.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Create borrower</Btn>
        </div>
      </SidePanel>

      <SidePanel open={activePanel === 'application'} onClose={() => setActivePanel('none')} title="New micro-loan application" subtitle="Policy-governed origination for field-assisted lending." width={440}>
        <div className="space-y-4">
          <SelectField label="Borrower" value={applicationForm.borrowerId || selectedBorrowerId || ''} options={borrowers.map(item => [item.id, `${item.fullName} · ${item.phone ?? 'no phone'}`])} onChange={value => setApplicationForm(prev => ({ ...prev, borrowerId: value }))} />
          <SelectField label="Product policy" value={applicationForm.policyId || policiesQuery.data?.[0]?.id || ''} options={(policiesQuery.data ?? []).map(policyItem => [policyItem.id, `${policyItem.name} ${policyItem.version}`])} onChange={value => setApplicationForm(prev => ({ ...prev, policyId: value }))} />
          <Field label="Requested amount" value={applicationForm.requestedAmount} onChange={value => setApplicationForm(prev => ({ ...prev, requestedAmount: value }))} />
          <Field label="Purpose" value={applicationForm.purpose} onChange={value => setApplicationForm(prev => ({ ...prev, purpose: value }))} />
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-[11px] leading-relaxed text-amber-200/80">
            If the selected policy requires mobile money consent, the backend blocks origination until a valid granular consent exists.
          </div>
          <PolicyHint policy={policiesQuery.data?.find(policyItem => policyItem.id === (applicationForm.policyId || policiesQuery.data?.[0]?.id))} amount={Number(applicationForm.requestedAmount || 0)} />
          <Btn variant="primary" className="w-full justify-center" disabled={createApplication.isPending || !(applicationForm.borrowerId || selectedBorrowerId)} onClick={() => createApplication.mutate()}>{createApplication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Create application</Btn>
        </div>
      </SidePanel>
    </div>
  )
}

function BorrowerProfile({ borrower, isLoading, onGrantConsent, onCreateApplication }: { borrower?: RetailBorrower; isLoading: boolean; onGrantConsent: () => void; onCreateApplication: () => void }) {
  if (isLoading) return <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-500" /></div>
  if (!borrower) return <div className="rounded-2xl border border-dashed border-white/[0.08] bg-[#0d0d0d] p-8 text-center text-sm text-zinc-500">Select a borrower to see consent, profile and exposure guardrails.</div>
  const revenue = borrower.informalBusinessProfile?.monthlyRevenueEstimate ?? 0
  const expenses = borrower.informalBusinessProfile?.monthlyExpenseEstimate ?? 0
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="mb-2 flex items-center gap-2"><span className={pill(borrower.segment)}>{segmentLabels[borrower.segment]}</span><span className={pill(borrower.status)}>{borrower.status}</span></div>
          <h2 className="text-[22px] font-bold tracking-tight text-white">{borrower.fullName}</h2>
          <p className="mt-1 text-sm text-zinc-500">{borrower.phone ?? 'No phone'} · {borrower.geography ?? 'No geography'} · {borrower.informalBusinessProfile?.activityType ?? 'No activity profile'}</p>
        </div>
        <div className="flex flex-wrap gap-2"><Btn size="sm" onClick={onGrantConsent}><Smartphone className="h-4 w-4" /> Grant MoMo consent</Btn><Btn size="sm" variant="primary" onClick={onCreateApplication}><Plus className="h-4 w-4" /> New application</Btn></div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Guardrail label="KYC" passed={borrower.identityVerified} detail={borrower.identityVerified ? 'Identity verified.' : 'Identity pending verification.'} />
        <Guardrail label="Mobile money consent" passed={hasActiveConsent(borrower, 'MOBILE_MONEY', 'UNDERWRITING')} detail="Granular consent required before alternative data ingestion." />
        <Guardrail label="Field data consent" passed={hasActiveConsent(borrower, 'FIELD_DATA') || hasActiveConsent(borrower, 'MOBILE_MONEY', 'UNDERWRITING')} detail="Field observations remain audit-trailed." />
        <Guardrail label="Cashflow" passed={revenue > expenses && revenue > 0} detail={`Declared net: ${money(Math.max(0, revenue - expenses))}/mo`} />
      </div>
    </div>
  )
}

function ApplicationsRail({ applications, selectedId, isLoading, onSelect }: { applications: MicroLoanApplication[]; selectedId: string | null; isLoading: boolean; onSelect: (id: string) => void }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-4">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-[13px] font-bold text-white">Micro-loan queue</h2>{isLoading && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}</div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {applications.map(app => (
          <button key={app.id} onClick={() => onSelect(app.id)} className={cn('group min-w-[250px] rounded-xl border p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#3ECF8E]/40 hover:bg-white/[0.04]', selectedId === app.id ? 'border-[#3ECF8E]/50 bg-[#3ECF8E]/[0.08] shadow-[0_0_15px_rgba(62,207,142,0.15)]' : 'border-white/[0.07] bg-white/[0.025]')}>
            <div className="flex items-start justify-between mb-2">
              <span className={pill(app.status)}>{app.status.replaceAll('_', ' ')}</span>
              <ArrowRight className="h-4 w-4 text-[#3ECF8E] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
            <div className="font-bold text-white transition-colors group-hover:text-[#3ECF8E]">{app.borrower?.fullName ?? app.reqId}</div>
            <div className="mt-1 text-[11px] text-zinc-500">{app.reqId} · {money(app.requestedAmount, app.currency)}</div>
          </button>
        ))}
        {!isLoading && applications.length === 0 && <div className="min-w-full rounded-xl border border-dashed border-white/[0.08] p-6 text-center text-sm text-zinc-500">No micro-loan applications yet.</div>}
      </div>
    </div>
  )
}

function PolicyHint({ policy, amount }: { policy?: MicroLoanPolicy; amount: number }) {
  if (!policy) {
    return <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-[11px] leading-relaxed text-amber-200/80">No active policy selected. Application creation will be rejected by the backend.</div>
  }
  const withinCaps = amount >= policy.minAmount && amount <= policy.maxAmount
  return (
    <div className={cn('rounded-xl border p-3 text-[11px] leading-relaxed', withinCaps ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-200/80' : 'border-rose-500/20 bg-rose-500/[0.06] text-rose-200/80')}>
      Policy caps: {money(policy.minAmount, policy.currency)} to {money(policy.maxAmount, policy.currency)} · tenors {policy.allowedTenors.join('/')} days · min score {policy.minScore}.
    </div>
  )
}

function ApplicationWorkspace({ app, policy, isLoading, guardrails, fieldConfidence, setFieldConfidence, decisionForm, setDecisionForm, collectionAction, setCollectionAction, canDisburse, canManageCollections, canWriteOff, writeOffReason, setWriteOffReason, renewAmount, setRenewAmount, actions }: {
  app?: MicroLoanApplication
  policy?: MicroLoanPolicy | null
  isLoading: boolean
  guardrails: { mobileMoneyConsent: boolean; completedVisit: boolean; guarantorOk: boolean }
  fieldConfidence: string
  setFieldConfidence: (value: string) => void
  decisionForm: { status: DecisionStatus; approvedAmount: string; tenorDays: string; interestRate: string; overrideReason: string }
  setDecisionForm: React.Dispatch<React.SetStateAction<{ status: DecisionStatus; approvedAmount: string; tenorDays: string; interestRate: string; overrideReason: string }>>
  collectionAction: CollectionActionType
  setCollectionAction: (value: CollectionActionType) => void
  canDisburse: boolean
  canManageCollections: boolean
  canWriteOff: boolean
  writeOffReason: string
  setWriteOffReason: (value: string) => void
  renewAmount: string
  setRenewAmount: (value: string) => void
  actions: WorkspaceActions
}) {
  if (isLoading) return <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-500" /></div>
  if (!app) return <div className="rounded-2xl border border-dashed border-white/[0.08] bg-[#0d0d0d] p-8 text-center text-sm text-zinc-500">Select a micro-loan application to process the operational lifecycle.</div>

  const plannedVisit = firstPlannedVisit(app)
  const scorecard = app.scorecards?.[0]
  const decision = latestDecision(app)
  const offer = latestOffer(app)
  const disbursement = latestDisbursement(offer)
  const schedule = openSchedule(app)
  const delinquency = firstOpenDelinquency(app)
  const plannedActions = app.loanAccount?.delinquencyEvents?.flatMap(event => event.collectionActions ?? []).filter(action => action.status === 'PLANNED') ?? []

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2"><span className={pill(app.status)}>{app.status.replaceAll('_', ' ')}</span><span className={pill(app.segment)}>{segmentLabels[app.segment]}</span></div>
            <h2 className="text-[22px] font-bold tracking-tight text-white">{app.borrower?.fullName ?? app.reqId}</h2>
            <p className="mt-1 text-sm text-zinc-500">{app.reqId} · {app.purpose ?? 'No purpose'} · {money(app.requestedAmount, app.currency)}</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-right"><div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Applied policy</div><div className="mt-1 text-sm font-bold text-white">{policy?.name ?? app.policySnapshot?.policyName ?? 'No active policy'}</div><div className="text-[11px] text-zinc-500">Min score {policy?.minScore ?? app.policySnapshot?.snapshot?.minScore ?? 'n/a'}</div></div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Guardrail label="Consent" passed={!policy?.requiresMobileMoneyConsent || guardrails.mobileMoneyConsent} detail="Mobile money consent is source/purpose specific." />
          <Guardrail label="Field visit" passed={!policy?.requiresFieldVisit || guardrails.completedVisit} detail="Terrain verification before serious approval." />
          <Guardrail label="Guarantor" passed={guardrails.guarantorOk} detail="Policy requirements are surfaced before decision." />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <WorkflowStep icon={MapPin} title="1. Field underwriting" body="Lightweight mobile-friendly action card for field agents and supervisors.">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Agent confidence score" value={fieldConfidence} onChange={setFieldConfidence} />
            <div className="flex gap-2 self-end"><Btn onClick={() => actions.planFieldVisit.mutate(app.id)} disabled={actions.planFieldVisit.isPending}>{actions.planFieldVisit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />} Plan</Btn><Btn variant="primary" disabled={!plannedVisit || actions.completeFieldVisit.isPending} onClick={() => plannedVisit && actions.completeFieldVisit.mutate(plannedVisit)}>{actions.completeFieldVisit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Complete</Btn></div>
          </div>
          <div className="mt-3 text-[11px] text-zinc-500">Visits: {app.fieldVisits?.length ?? 0} · Completed: {app.fieldVisits?.filter(visit => visit.status === 'COMPLETED').length ?? 0}</div>
        </WorkflowStep>

        <WorkflowStep icon={ClipboardCheck} title="2. Thin-file scorecard" body="Rules-first scoring. It recommends; it does not auto-decide.">
          <div className="flex flex-wrap items-center gap-3"><Btn variant="primary" onClick={() => actions.runScorecard.mutate(app.id)} disabled={actions.runScorecard.isPending}>{actions.runScorecard.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Run scorecard</Btn>{scorecard && <span className="text-sm text-white">Score <b>{scorecard.totalScore}</b> · {scorecard.recommendation.replaceAll('_', ' ')}</span>}</div>
          {scorecard && <div className="mt-4 grid gap-2"><ProgressBar value={scorecard.totalScore} color="bg-[#3ECF8E]" /><div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 sm:grid-cols-4"><span>KYC {scorecard.identityScore}</span><span>Cashflow {scorecard.cashflowScore}</span><span>MoMo {scorecard.mobileMoneyScore}</span><span>Field {scorecard.fieldConfidenceScore}</span></div></div>}
        </WorkflowStep>

        <WorkflowStep icon={ShieldCheck} title="3. Human decision" body="Human-in-the-loop remains mandatory before offer creation.">
          <div className="grid gap-3 sm:grid-cols-4"><SelectField label="Decision" value={decisionForm.status} options={[['APPROVE', 'Approve'], ['APPROVE_WITH_CONDITIONS', 'Approve with conditions'], ['SEND_TO_REVIEW', 'Supervisor review'], ['REJECT', 'Reject']]} onChange={value => setDecisionForm(prev => ({ ...prev, status: value as DecisionStatus }))} /><Field label="Amount" value={decisionForm.approvedAmount} onChange={value => setDecisionForm(prev => ({ ...prev, approvedAmount: value }))} /><Field label="Tenor days" value={decisionForm.tenorDays} onChange={value => setDecisionForm(prev => ({ ...prev, tenorDays: value }))} /><Field label="Rate %" value={decisionForm.interestRate} onChange={value => setDecisionForm(prev => ({ ...prev, interestRate: value }))} /></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"><Field label="Override reason" value={decisionForm.overrideReason} onChange={value => setDecisionForm(prev => ({ ...prev, overrideReason: value }))} /><div className="flex items-end gap-3"><Btn variant="primary" disabled={!scorecard || actions.submitDecision.isPending} onClick={() => actions.submitDecision.mutate(app.id)}>{actions.submitDecision.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Submit decision</Btn>{decision && <span className={pill(decision.status)}>{decision.status}</span>}</div></div>
        </WorkflowStep>

        <WorkflowStep icon={Banknote} title="4. Offer and disbursement" body="Approval is not disbursement. Offer acceptance is a hard gate.">
          <div className="flex flex-wrap gap-2"><Btn disabled={!decision || !['APPROVE', 'APPROVE_WITH_CONDITIONS'].includes(decision.status) || actions.createOffer.isPending} onClick={() => decision && actions.createOffer.mutate(decision.id)}>{actions.createOffer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Issue offer</Btn><Btn disabled={!offer || offer.status !== 'ISSUED'} onClick={() => offer && actions.acceptOffer.mutate(offer.id)}>{actions.acceptOffer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Accept offer</Btn><Btn disabled={!canDisburse || !offer || offer.status !== 'ACCEPTED'} onClick={() => offer && actions.createDisbursement.mutate(offer.id)}>{actions.createDisbursement.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />} Disburse</Btn><Btn variant="primary" disabled={!canDisburse || !disbursement || disbursement.status === 'SUCCESS'} onClick={() => disbursement && actions.completeDisbursement.mutate(disbursement.id)}>{actions.completeDisbursement.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />} Confirm success</Btn></div>
          {!canDisburse && <div className="mt-2 text-[11px] text-amber-300/80">Disbursement actions require Manager, CRO, or Admin role.</div>}
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className={pill(offer?.status ?? 'PENDING')}>Offer {offer?.status ?? 'pending'}</span><span className={pill(disbursement?.status ?? 'PENDING')}>Disb {disbursement?.status ?? 'pending'}</span></div>
        </WorkflowStep>

        <WorkflowStep icon={Wallet} title="5. Loan account and repayment" body="Loan account activates only after successful disbursement. Backend auto-cures delinquency when repayment clears the overdue balance.">
          {app.loanAccount ? <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-3"><Metric label="Account" value={app.loanAccount.accountNumber} /><Metric label="Outstanding" value={money(app.loanAccount.outstandingPrincipal, app.loanAccount.currency)} /><Metric label="Next due" value={schedule ? money(schedule.totalDue - schedule.amountPaid, app.loanAccount.currency) : 'None'} /></div><Btn disabled={!schedule || actions.recordRepayment.isPending} onClick={() => actions.recordRepayment.mutate()}>{actions.recordRepayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />} Post next repayment</Btn>{delinquency && <div className="text-[11px] text-amber-300/80">Delinquent — full repayment will auto-cure this delinquency event via backend reconciliation.</div>}</div> : <div className="text-sm text-zinc-500">No active loan account yet.</div>}
        </WorkflowStep>

        <WorkflowStep icon={PhoneCall} title="6. Delinquency and collections" body="Collections are first-class workflow records. Cure, escalate, and complete actions close the lifecycle loop.">
          {app.loanAccount ? <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Btn variant="danger" disabled={!schedule || Boolean(delinquency) || actions.openDelinquency.isPending} onClick={() => actions.openDelinquency.mutate()}>{actions.openDelinquency.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />} Open delinquency</Btn>
              <SelectField label="Action" value={collectionAction} options={[['PHONE_CALL', 'Phone call'], ['SMS_REMINDER', 'SMS reminder'], ['FIELD_VISIT', 'Field visit'], ['PROMISE_TO_PAY', 'Promise to pay'], ['GUARANTOR_CONTACT', 'Guarantor contact']]} onChange={value => setCollectionAction(value as CollectionActionType)} compact />
              <Btn disabled={!delinquency || actions.createCollection.isPending} onClick={() => actions.createCollection.mutate()}>{actions.createCollection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create action</Btn>
            </div>
            {delinquency && <div className="flex flex-wrap gap-2">
              <Btn disabled={!canManageCollections || actions.cureDelinquency.isPending} onClick={() => actions.cureDelinquency.mutate(delinquency.id)}>{actions.cureDelinquency.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartPulse className="h-4 w-4" />} Cure</Btn>
              <Btn disabled={!canManageCollections || actions.escalateDelinquency.isPending} onClick={() => actions.escalateDelinquency.mutate(delinquency.id)}>{actions.escalateDelinquency.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />} Escalate</Btn>
            </div>}
            {plannedActions.length > 0 && <div className="space-y-2">{plannedActions.map(action => <div key={action.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"><span className="text-[11px] text-zinc-400">{action.actionType.replaceAll('_', ' ')} · planned</span><Btn size="sm" disabled={actions.completeCollectionAction.isPending} onClick={() => actions.completeCollectionAction.mutate(action.id)}>{actions.completeCollectionAction.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />} Done</Btn></div>)}</div>}
            <div className="text-[11px] text-zinc-500">Delinquency: {delinquency ? `${delinquency.status} · ${delinquency.dpd} DPD · ${money(delinquency.overdueAmount)}` : 'none'} · Planned actions: {plannedActions.length}</div>
          </div> : <div className="text-sm text-zinc-500">Collections become available after loan activation.</div>}
        </WorkflowStep>

        <WorkflowStep icon={RotateCcw} title="7. Renewal and recovery governance" body="Progressive renewal for closed loans. Write-off for defaulted accounts. Both are role-gated and audit-controlled.">
          {app.loanAccount ? <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3"><Metric label="Loan status" value={<span className={pill(app.loanAccount.status)}>{app.loanAccount.status}</span>} /><Metric label="Principal" value={money(app.loanAccount.principalAmount, app.loanAccount.currency)} /><Metric label="Outstanding" value={money(app.loanAccount.outstandingPrincipal, app.loanAccount.currency)} /></div>
            <div className="flex flex-wrap gap-2">
              <Btn disabled={!canManageCollections || app.loanAccount.status !== 'CLOSED' || actions.renewLoan.isPending} onClick={() => actions.renewLoan.mutate(app.loanAccount!.id)}>{actions.renewLoan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Renew loan</Btn>
              <Btn variant="danger" disabled={!canWriteOff || !['DEFAULTED', 'ACTIVE'].includes(app.loanAccount.status) || actions.writeOffLoanAccount.isPending} onClick={() => actions.writeOffLoanAccount.mutate(app.loanAccount!.id)}>{actions.writeOffLoanAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileX className="h-4 w-4" />} Write off</Btn>
            </div>
            <Field label="Write-off reason (CRO/Admin)" value={writeOffReason} onChange={setWriteOffReason} />
            <Field label="Renewal amount" value={renewAmount} onChange={setRenewAmount} />
            {!canWriteOff && <div className="text-[11px] text-amber-300/80">Write-off requires CRO or Admin role. Renewal requires Manager, CRO, or Admin.</div>}
          </div> : <div className="text-sm text-zinc-500">Renewal and recovery governance become available after loan activation.</div>}
        </WorkflowStep>
      </div>
    </div>
  )
}

function SupervisorReviewQueue({ applications, supervisorForm, setSupervisorForm, supervisorTargetId, setSupervisorTargetId, isPending, onSubmit }: {
  applications: MicroLoanApplication[]
  supervisorForm: { status: DecisionStatus; rationale: string; approvedAmount: string; tenorDays: string; interestRate: string }
  setSupervisorForm: React.Dispatch<React.SetStateAction<{ status: DecisionStatus; rationale: string; approvedAmount: string; tenorDays: string; interestRate: string }>>
  supervisorTargetId: string | null
  setSupervisorTargetId: (id: string | null) => void
  isPending: boolean
  onSubmit: (applicationId: string) => void
}) {
  if (applications.length === 0) return null
  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-5">
      <div className="mb-4 flex items-center gap-3"><Eye className="h-5 w-5 text-amber-400" /><div><h2 className="text-[13px] font-bold text-white">Supervisor Review Queue</h2><p className="mt-1 text-[11px] text-zinc-500">{applications.length} application(s) awaiting final supervisor decision. Written rationale is mandatory.</p></div></div>
      <div className="space-y-3">
        {applications.map(application => (
          <div key={application.id} className="rounded-xl border border-white/[0.06] bg-[#0d0d0d] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={pill(application.status)}>{application.status.replaceAll('_', ' ')}</span>
                <div className="mt-2 font-bold text-white">{application.borrower?.fullName ?? application.reqId}</div>
                <div className="text-[11px] text-zinc-500">{application.reqId} · {money(application.requestedAmount, application.currency)}</div>
              </div>
              <Btn size="sm" variant="primary" onClick={() => setSupervisorTargetId(supervisorTargetId === application.id ? null : application.id)}>Review</Btn>
            </div>
            {supervisorTargetId === application.id && (
              <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
                <div className="grid gap-3 sm:grid-cols-3"><SelectField label="Decision" value={supervisorForm.status} options={[['APPROVE', 'Approve'], ['APPROVE_WITH_CONDITIONS', 'Approve with conditions'], ['REJECT', 'Reject']]} onChange={value => setSupervisorForm(prev => ({ ...prev, status: value as DecisionStatus }))} /><Field label="Amount" value={supervisorForm.approvedAmount} onChange={value => setSupervisorForm(prev => ({ ...prev, approvedAmount: value }))} /><Field label="Rate %" value={supervisorForm.interestRate} onChange={value => setSupervisorForm(prev => ({ ...prev, interestRate: value }))} /></div>
                <Field label="Rationale (mandatory)" value={supervisorForm.rationale} onChange={value => setSupervisorForm(prev => ({ ...prev, rationale: value }))} />
                <Btn variant="primary" disabled={!supervisorForm.rationale || isPending} onClick={() => onSubmit(application.id)}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Submit supervisor decision</Btn>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PortfolioAnalyticsPanel({ analytics, isLoading }: { analytics?: PortfolioAnalytics; isLoading: boolean }) {
  if (isLoading) return <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-500" /></div>
  if (!analytics) return null
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-bold text-white">Portfolio Analytics</h2>
          <p className="mt-1 text-[11px] text-zinc-500">PAR, aging and collection efficiency for pilot operations oversight.</p>
        </div>
        <span className="rounded-full border border-[#3ECF8E]/20 bg-[#3ECF8E]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#3ECF8E]">Live</span>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <Metric label="PAR 30 ratio" value={`${analytics.par30Ratio.toFixed(1)}%`} />
        <Metric label="PAR 90 ratio" value={`${analytics.par90Ratio.toFixed(1)}%`} />
        <Metric label="Collection efficiency" value={`${analytics.collectionEfficiency.toFixed(1)}%`} />
        <Metric label="Active / Defaulted" value={`${analytics.activeLoanCount} / ${analytics.defaultedLoanCount}`} />
        <Metric label="Disbursed (window)" value={money(analytics.disbursedAmount)} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">1-7 DPD</div><div className="mt-1 text-sm font-bold text-amber-300 tabular-nums">{analytics.agingBuckets.dpd1to7}</div></div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">8-30 DPD</div><div className="mt-1 text-sm font-bold text-orange-300 tabular-nums">{analytics.agingBuckets.dpd8to30}</div></div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">31-90 DPD</div><div className="mt-1 text-sm font-bold text-rose-300 tabular-nums">{analytics.agingBuckets.dpd31to90}</div></div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">90+ DPD</div><div className="mt-1 text-sm font-bold text-rose-200 tabular-nums">{analytics.agingBuckets.dpd90Plus}</div></div>
      </div>
    </div>
  )
}

function FairnessPanel({ fairness, isLoading }: { fairness?: FairnessReport; isLoading: boolean }) {
  if (isLoading) return <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-500" /></div>
  if (!fairness) return <div className="rounded-2xl border border-dashed border-white/[0.08] bg-[#0d0d0d] p-6 text-center text-sm text-zinc-500">Fairness metrics loading...</div>
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-5">
      <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#3ECF8E]" /><h2 className="text-[13px] font-bold text-white">Inclusion Monitoring</h2></div>
      <p className="text-[11px] text-zinc-500 mb-4">Approval, rejection, delinquency and data burden by segment. No overclaim — these are operational signals, not fairness verdicts.</p>
      <div className="space-y-3">
        {fairness.segments.map(row => (
          <div key={row.segment} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-2 flex items-center justify-between"><span className={pill(row.segment)}>{segmentLabels[row.segment]}</span><span className="text-[11px] text-zinc-500">{row.totalDecisions} decisions</span></div>
            <div className="grid grid-cols-3 gap-3 text-[11px]">
              <div><span className="text-zinc-500">Approval</span><div className="font-bold text-emerald-300">{row.approvalRate}%</div></div>
              <div><span className="text-zinc-500">Rejection</span><div className="font-bold text-rose-300">{row.rejectionRate}%</div></div>
              <div><span className="text-zinc-500">Delinquency</span><div className="font-bold text-amber-300">{row.delinquencyEvents}</div></div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-[10px] text-zinc-500">
              <span>Alt-data quality: {row.avgAltDataPayloadQuality.toFixed(1)}</span>
              <span>Avg imputed: {row.avgAltDataImputedCount.toFixed(1)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConsentCoveragePanel({ coverage, isLoading }: { coverage?: ConsentCoverageReport; isLoading: boolean }) {
  if (isLoading) return <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-500" /></div>
  if (!coverage) return null
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-5">
      <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-400" /><h2 className="text-[13px] font-bold text-white">Consent Coverage</h2></div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center"><div className="text-[10px] text-zinc-500">Total</div><div className="text-xl font-bold tabular-nums tracking-tight text-white">{coverage.total}</div></div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 text-center"><div className="text-[10px] text-zinc-500">Active</div><div className="text-xl font-bold tabular-nums tracking-tight text-[#3ECF8E]">{coverage.granted}</div></div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-3 text-center"><div className="text-[10px] text-zinc-500">Revoked</div><div className="text-xl font-bold tabular-nums tracking-tight text-rose-300">{coverage.revoked}</div></div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 text-center"><div className="text-[10px] text-zinc-500">Coverage</div><div className="text-xl font-bold tabular-nums tracking-tight text-amber-300">{coverage.coverageRate}%</div></div>
      </div>
      <div className="space-y-2">
        {coverage.bySource.map(source => (
          <div key={source.sourceType} className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">{source.sourceType}</span>
            <span className="font-bold text-white">{source.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AltDataLineagePanel({ records, isLoading }: { records?: any[]; isLoading: boolean }) {
  if (isLoading) return <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-500" /></div>
  if (!records || records.length === 0) return <div className="rounded-2xl border border-dashed border-white/[0.08] bg-[#0d0d0d] p-6 text-center text-sm text-zinc-500">No alternative data lineage records yet. Snapshots appear when consent-gated data is ingested.</div>
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-5">
      <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-400" /><h2 className="text-[13px] font-bold text-white">Alternative Data Lineage</h2></div>
      <p className="text-[11px] text-zinc-500 mb-4">Every alternative-data snapshot is consent-gated and lineage-tracked. This is sandbox readiness, not live telco integration.</p>
      <div className="space-y-2">
        {records.map(record => (
          <div key={record.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2"><span className={pill(record.sourceType)}>{record.sourceType}</span><span className="text-[11px] text-zinc-400">{record.borrower.fullName}</span></div>
              <span className="text-[10px] text-zinc-500">{new Date(record.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[10px] text-zinc-500">
              <span>Quality: <b className="text-white">{record.payloadQualityScore}</b></span>
              <span>Raw: <b className="text-white">{record.rawCount}</b></span>
              <span>Derived: <b className="text-white">{record.derivedCount}</b></span>
              <span>Imputed: <b className="text-white">{record.imputedCount}</b></span>
            </div>
            {record.consentGrant && <div className="mt-1 text-[10px] text-emerald-400/80">Consent: {record.consentGrant.status} · {record.consentGrant.purpose}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</span><input value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#3ECF8E]/40" /></label>
}

function SelectField({ label, value, options, onChange, compact }: { label: string; value: string; options: string[][]; onChange: (value: string) => void; compact?: boolean }) {
  return <label className={compact ? 'min-w-[170px]' : 'block'}><span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</span><select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#3ECF8E]/40">{options.map(([optionValue, labelText]) => <option key={optionValue} value={optionValue}>{labelText}</option>)}</select></label>
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"><div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</div><div className="mt-1 truncate text-sm font-black text-white">{value}</div></div>
}
