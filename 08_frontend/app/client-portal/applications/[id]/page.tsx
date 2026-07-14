'use client'

import { CheckCircle2, Clock, AlertTriangle, Upload, FileText, MessageSquare, ArrowLeft, Download, CircleDot, ArrowRight, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { fetchClient } from '@/lib/api-client'

// ── Shared Config ──────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2; dot: string }> = {
  approved:           { label: 'Approved',       color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', icon: CheckCircle2,  dot: 'bg-emerald-400' },
  under_review:       { label: 'Under Review',   color: 'text-blue-400',    bg: 'bg-blue-500/8',    border: 'border-blue-500/20',    icon: Clock,         dot: 'bg-blue-400' },
  documents_required: { label: 'Docs Required',  color: 'text-amber-400',   bg: 'bg-amber-500/8',   border: 'border-amber-500/20',   icon: AlertTriangle, dot: 'bg-amber-400' },
  rejected:           { label: 'Not Approved',   color: 'text-red-400',     bg: 'bg-red-500/8',     border: 'border-red-500/20',     icon: XCircle,       dot: 'bg-red-400' },
}

const DOC_STATUS: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  validated:          { label: 'Verified', color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', icon: CheckCircle2 },
  pending_upload:     { label: 'Required', color: 'text-amber-400',   bg: 'bg-amber-500/8',   border: 'border-amber-500/20',   icon: AlertTriangle },
  pending_validation: { label: 'In Review', color: 'text-blue-400',   bg: 'bg-blue-500/8',    border: 'border-blue-500/20',    icon: Clock },
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-white/[0.04] animate-pulse rounded-2xl ${className}`} />
}

// ── PIPELINE MAPPING ───────────────────────────────────────────────────────────
const PIPELINE_MAPPING: Record<string, number> = {
  'SUBMITTED': 0,
  'DOCUMENTS_PENDING': 1,
  'DOCUMENTS_VALIDATED': 1,
  'SCORED': 2,
  'ANALYST_REVIEW': 3,
  'MANAGER_REVIEW': 3,
  'COMMITTEE_REVIEW': 3,
  'APPROVED': 4,
  'APPROVED_WITH_CONDITIONS': 4,
  'REJECTED': 4,
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function ApplicationDetailPage() {
  const params = useParams()
  const id     = params.id as string

  // Note: in a real implementation we would fetch `/client/applications/${id}`
  const { data: appData, isLoading, error } = useQuery({
    queryKey: ['client-apps', id],
    queryFn: async () => {
      const all = await fetchClient('/client/applications')
      const target = all.find((a: any) => a.id === id)
      if (!target) throw new Error('Application not found')
      return target
    }
  })

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl page-enter">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="col-span-2 h-[400px]" />
          <Skeleton className="col-span-1 h-[400px]" />
        </div>
      </div>
    )
  }

  if (error || !appData) {
    return (
      <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-16 text-center max-w-2xl mx-auto mt-10">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-[15px] font-bold text-red-300 mb-2">Could not find application</p>
        <p className="text-[13px] text-zinc-500 mb-6">The link might be broken or you do not have permission.</p>
        <Link href="/client-portal/applications" className="px-5 py-2.5 bg-white/[0.04] text-zinc-300 rounded-xl hover:bg-white/[0.08] transition-all text-[13px] font-medium">
          Back to Applications
        </Link>
      </div>
    )
  }

  const cfg = STATUS[appData.status] ?? STATUS.under_review
  const StatusIcon = cfg.icon

  // Mock timeline logic based on current stage for presentation
  const stageIndex = PIPELINE_MAPPING[appData.currentStage] ?? 0
  const steps = [
    { label: 'Application Submitted',  desc: 'Your request was received', date: new Date(appData.submittedDate).toLocaleDateString() },
    { label: 'Documents Verified',     desc: 'All required documents reviewed', date: stageIndex >= 1 ? 'Internal' : 'Pending' },
    { label: 'Credit Assessment',      desc: 'Financial profile evaluation',  date: stageIndex >= 2 ? 'Internal' : 'Pending' },
    { label: 'Committee Review',       desc: 'Final panel decision',          date: stageIndex >= 3 ? 'Internal' : 'Pending' },
    { label: 'Final Decision',         desc: 'Completed',                     date: appData.eta || 'Pending' }
  ]

  // Mock documents
  const mockDocs = [
    { name: 'Articles of Incorporation', status: 'validated' },
    { name: 'Bank Statements (12M)', status: 'validated' },
    { name: 'Q1 2026 Accounts', status: appData.status === 'documents_required' ? 'pending_upload' : 'pending_validation' },
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto page-enter">
      
      {/* ── Top Nav ──────────────────────────────────────────────────────────── */}
      <Link href="/client-portal/applications" className="inline-flex items-center gap-2 text-[12px] text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Applications
      </Link>

      {/* ── Main Header Overlay ──────────────────────────────────────────────── */}
      <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-[24px] p-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className={`absolute top-0 right-0 w-[400px] h-[400px] ${cfg.bg} blur-3xl opacity-30 pointer-events-none rounded-full translate-x-1/2 -translate-y-1/2`} />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-mono text-zinc-700 bg-white/[0.04] border border-white/[0.05] px-2.5 py-1 rounded-md">
                {appData.id}
              </span>
              <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">{appData.type || 'Facility Request'}</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                <StatusIcon className="w-3 h-3" />
                {cfg.label}
              </span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">{appData.title}</h1>
            <p className="text-zinc-500 text-[14px] max-w-xl">{appData.purpose || 'Working capital and operational expansion facility.'}</p>
          </div>
          
          <div className="md:text-right flex-shrink-0">
            <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-1">Requested Amount</div>
            <div className="text-4xl font-black text-white tracking-tight">
              {new Intl.NumberFormat('fr-CM', { style: 'currency', currency: appData.currency || 'XAF', maximumFractionDigits: 0 }).format(appData.requestedAmount)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-white/[0.06] relative z-10">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1">Submitted</div>
            <div className="text-[13px] font-medium text-zinc-200">{new Date(appData.submittedDate).toLocaleDateString('en-GB')}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1">Status Update</div>
            <div className={`text-[13px] font-semibold flex items-center gap-1.5 ${cfg.color}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {appData.nextStep}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1">Expected Decision</div>
            <div className="text-[13px] font-medium text-zinc-200">{appData.eta || 'TBD'}</div>
          </div>
        </div>
      </div>

      {appData.metadata && Object.keys(appData.metadata).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-[24px] p-7">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-5">Business Context</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-[13px]">
              <div>
                <div className="text-zinc-500 mb-1">Company</div>
                <div className="font-semibold text-white">{appData.metadata.companyName || '—'}</div>
              </div>
              <div>
                <div className="text-zinc-500 mb-1">Industry</div>
                <div className="font-semibold text-white">{appData.metadata.industry || '—'}</div>
              </div>
              <div>
                <div className="text-zinc-500 mb-1">Annual Revenue</div>
                <div className="font-semibold text-white">{appData.metadata.annualRevenue ? `$${appData.metadata.annualRevenue}M` : '—'}</div>
              </div>
              <div>
                <div className="text-zinc-500 mb-1">EBITDA</div>
                <div className="font-semibold text-white">{appData.metadata.ebitda ? `$${appData.metadata.ebitda}M` : '—'}</div>
              </div>
            </div>
          </div>
          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-[24px] p-7">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-5">Financial Profile</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-[13px]">
              <div>
                <div className="text-zinc-500 mb-1">Existing Debt</div>
                <div className="font-semibold text-white">{appData.metadata.existingDebt ? `$${appData.metadata.existingDebt}M` : '—'}</div>
              </div>
              <div>
                <div className="text-zinc-500 mb-1">Main Bank</div>
                <div className="font-semibold text-white">{appData.metadata.mainBank || '—'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-zinc-500 mb-1">Collateral</div>
                <div className="font-semibold text-white">{appData.metadata.collateral || '—'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Two Columns ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COL: Timeline & Messages */}
        <div className="col-span-1 lg:col-span-7 space-y-6">
          
          {/* Timeline Box */}
          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-3xl p-7">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-6">Application Timeline</h2>
            
            <div className="relative pl-6">
              <div className="absolute left-[11px] top-4 bottom-4 w-px bg-white/[0.06]" />
              <div className="space-y-7">
                {steps.map((step, i) => {
                  const done = i < stageIndex
                  const current = i === stageIndex
                  const isRejected = appData.status === 'rejected' && current

                  return (
                    <div key={i} className="flex gap-4 relative">
                      {/* Node */}
                      <div className={`absolute -left-[30px] w-5 h-5 rounded-full border-[3px] flex items-center justify-center bg-[#0d0d0d] transition-all ${
                        done        ? 'border-emerald-500 bg-emerald-500/10' :
                        isRejected  ? 'border-red-500 bg-red-500/10' :
                        current     ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.3)]' :
                                      'border-white/[0.1]'
                      }`}>
                        {done && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {current && !isRejected && <CircleDot className="w-2.5 h-2.5 text-blue-400" />}
                        {isRejected && <XCircle className="w-3 h-3 text-red-400" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 -mt-1.5">
                        <div className="flex items-center justify-between gap-4">
                          <div className={`text-[14px] font-semibold transition-colors ${
                            done ? 'text-zinc-400' : current && isRejected ? 'text-red-400' : current ? 'text-white' : 'text-zinc-600'
                          }`}>
                            {step.label}
                          </div>
                          <div className={`text-[11px] font-mono ${done || current ? 'text-zinc-500' : 'text-zinc-700'}`}>
                            {step.date}
                          </div>
                        </div>
                        <div className={`text-[12px] mt-1 ${current && isRejected ? 'text-red-400/80' : 'text-zinc-500'}`}>
                          {step.desc}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Secure Messages Box */}
          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-3xl p-7 flex flex-col h-[400px]">
             <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-6 flex-shrink-0">Secure Communications</h2>
             
             <div className="flex-1 overflow-y-auto space-y-5 pr-2 mb-4 scrollbar-thin">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[11px] font-bold flex-shrink-0">
                    RM
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-bold text-zinc-200">Relationship Manager</span>
                      <span className="text-[10px] text-zinc-600">Apr 16, 2026</span>
                    </div>
                    <div className="bg-white/[0.04] border border-white/[0.05] rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl p-3.5 text-[13px] text-zinc-400 leading-relaxed max-w-[85%]">
                      Hello, your application has been received. Please upload the Q1 Management Accounts in the documents section to proceed to credit assessment.
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/[0.1] flex items-center justify-center text-zinc-300 text-[11px] font-bold flex-shrink-0">
                    YOU
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 mb-1 flex-row-reverse">
                      <span className="text-[12px] font-bold text-zinc-200">You</span>
                      <span className="text-[10px] text-zinc-600">Apr 16, 2026</span>
                    </div>
                    <div className="bg-blue-600 border border-blue-500 text-white rounded-tr-sm rounded-tl-2xl rounded-bl-2xl rounded-br-2xl p-3.5 text-[13px] leading-relaxed max-w-[85%]">
                      Thank you. I will have our CFO upload them before end of day.
                    </div>
                  </div>
                </div>
             </div>

             <div className="flex gap-2 flex-shrink-0 bg-white/[0.02] p-1.5 rounded-2xl border border-white/[0.05]">
               <input
                 type="text"
                 placeholder="Send a secure message to your RM..."
                 className="flex-1 bg-transparent border-none text-[13px] text-white px-3 placeholder-zinc-600 focus:outline-none focus:ring-0"
               />
               <button className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-md flex-shrink-0">
                 <MessageSquare className="w-4 h-4" />
               </button>
             </div>
          </div>
        </div>

        {/* RIGHT COL: Documents & Actions */}
        <div className="col-span-1 lg:col-span-5 space-y-6">
          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-3xl p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Required Documents</h2>
              <Link href="/client-portal/documents" className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="space-y-2 mb-6">
              {mockDocs.map((doc, i) => {
                const config = DOC_STATUS[doc.status] ?? DOC_STATUS.pending_validation
                const Icon = config.icon
                return (
                  <div key={i} className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                    doc.status === 'pending_upload' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/[0.02] border-white/[0.05]'
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className={`w-4 h-4 flex-shrink-0 ${doc.status === 'pending_upload' ? 'text-amber-400' : 'text-zinc-600'}`} />
                      <span className={`text-[12px] font-medium truncate ${doc.status === 'pending_upload' ? 'text-amber-200' : 'text-zinc-300'}`}>{doc.name}</span>
                    </div>
                    <span className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold shrink-0 ${config.color}`}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </span>
                  </div>
                )
              })}
            </div>

            <button className="w-full h-11 flex items-center justify-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-xl text-[13px] font-semibold hover:bg-blue-600/30 transition-all mb-3">
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
            <button className="w-full h-11 flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.08] text-zinc-300 rounded-xl text-[13px] font-semibold hover:bg-white/[0.08] transition-all">
              <Download className="w-4 h-4" />
              Download Application summary (PDF)
            </button>
          </div>

          <div className="bg-gradient-to-br from-blue-900/40 to-[#0d0d0d] border border-blue-500/20 rounded-3xl p-7">
             <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-4">
               <AlertTriangle className="w-5 h-5 text-blue-400" />
             </div>
             <h3 className="text-[14px] font-bold text-white mb-2">Need assistance?</h3>
             <p className="text-[13px] text-zinc-400 mb-5 leading-relaxed">
               Your relationship manager is available to assist you with this application step.
             </p>
             <div className="text-[12px] font-bold text-zinc-300">Jean-Marc Olé</div>
             <div className="text-[11px] text-zinc-500">j.ole@riskengine-bank.com · +237 222 123 456</div>
          </div>
        </div>

      </div>
    </div>
  )
}
