'use client'
import * as React from 'react'
import { useState } from 'react'
import { Download, ShieldCheck, FileText, FileCode2, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { SectionHeader, StatusBadge } from '@/components/ui'
import { fetchApi } from '@/lib/api-client'

// ── Status helpers ─────────────────────────────────────────────────────────

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  COMPLIANT: { color: 'text-emerald-400', icon: CheckCircle2, label: 'Compliant' },
  REVIEW:    { color: 'text-amber-400',   icon: AlertTriangle, label: 'In Review' },
  FAILED:    { color: 'text-rose-400',    icon: XCircle,       label: 'Failed' },
  NOT_APPLICABLE: { color: 'text-zinc-500', icon: CheckCircle2, label: 'N/A' },
}

const fileIcon = (type: string) => {
  if (type === 'pdf') return <FileText className="w-5 h-5" />
  if (type === 'py')  return <FileCode2 className="w-5 h-5" />
  return <FileText className="w-5 h-5" />
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function timeAgo(d: string | null | undefined) {
  if (!d) return 'Not yet'
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  return `${Math.floor(days / 30)} months ago`
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'MODEL_UPDATE' | 'DECISION'>('all')

  // Fetch compliance items from DB
  const itemsQuery = useQuery({
    queryKey: ['compliance-items'],
    queryFn: () => fetchApi('/compliance/items'),
  })

  // Fetch tech documents from DB
  const docsQuery = useQuery({
    queryKey: ['compliance-docs'],
    queryFn: () => fetchApi('/compliance/documents'),
  })

  // Fetch audit events from DB (paginated, first 50)
  const auditQuery = useQuery({
    queryKey: ['compliance-audit'],
    queryFn: () => fetchApi('/compliance/audit?limit=50'),
  })

  const fallbackQuery = useQuery({
    queryKey: ['compliance-fallback'],
    queryFn: () => fetchApi('/compliance/reports/fallback-incidents'),
  })

  const overrideQuery = useQuery({
    queryKey: ['compliance-override'],
    queryFn: () => fetchApi('/compliance/reports/overrides'),
  })

  const complianceItems: any[] = itemsQuery.data || []
  const techDocs: any[] = docsQuery.data || []
  const auditPage: any   = auditQuery.data || { data: [], total: 0 }
  const auditEvents: any[] = auditPage.data || []

  const filteredEvents = activeFilter === 'all'
    ? auditEvents
    : auditEvents.filter((e: any) => e.eventType?.includes(activeFilter))

  // ── Export handler ────────────────────────────────────────────────────────

  const handleExportAudit = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('internal_token') : null
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/compliance/export/audit`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return alert('Export failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_trail_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-6 page-enter pb-10">
      <SectionHeader
        title="Compliance & Audit"
        subtitle="Regulatory adherence and systemic model validation logs."
        actions={
          <button
            onClick={handleExportAudit}
            className="px-5 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] rounded-lg text-sm font-semibold text-white transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export Audit CSV
          </button>
        }
      />

      <div className="grid grid-cols-12 gap-8 mt-8">
        {/* Left Column */}
        <div className="col-span-4 flex flex-col gap-8">

          {/* Regulatory Status — DB driven */}
          <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-7">
            <div className="flex items-center gap-2 mb-8 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-blue-400" /> Regulatory Status
            </div>

            {itemsQuery.isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
              </div>
            ) : complianceItems.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-4">No compliance items found.</p>
            ) : (
              <div className="space-y-6">
                {complianceItems.map((item, idx) => {
                  const cfg = statusConfig[item.status] ?? statusConfig.REVIEW
                  const Icon = cfg.icon
                  return (
                    <div key={item.id} className={`${idx !== complianceItems.length - 1 ? 'border-b border-white/[0.06] pb-6' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-white text-sm">{item.label}</span>
                        <div className={`flex items-center gap-1 text-[11px] font-bold ${cfg.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500">{item.detail}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-zinc-600">{item.referenceDoc}</span>
                        <span className="text-[10px] text-zinc-600">
                          {item.lastValidated ? `Validated: ${formatDate(item.lastValidated)}` : 'Pending validation'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Tech Docs — DB driven */}
          <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-7">
            <div className="flex items-center justify-between mb-6 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-500" /> Tech Docs
              </div>
              <span className="text-zinc-600">{techDocs.length} files</span>
            </div>

            {docsQuery.isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
              </div>
            ) : (
              <div className="space-y-4">
                {techDocs.map(doc => (
                  <div key={doc.id} className="flex gap-4 p-3 bg-white/[0.03] rounded-xl border border-white/[0.04] hover:border-white/[0.1] transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors flex-shrink-0">
                      {fileIcon(doc.fileType)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-0.5">{doc.name}</h4>
                      <p className="text-[11px] text-zinc-500">{doc.version} • {timeAgo(doc.updatedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Override Activity Report */}
          <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-7">
            <div className="flex items-center gap-2 mb-6 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Override Activity Report
            </div>
            {overrideQuery.isLoading ? (
               <Loader2 className="w-5 h-5 animate-spin text-zinc-600 mx-auto py-4" />
            ) : overrideQuery.data?.totalOverrides === 0 ? (
               <p className="text-zinc-500 text-sm text-center py-4">No manual overrides recorded.</p>
            ) : (
               <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.04]">
                       <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Total Overrides</div>
                       <div className="text-xl font-bold text-white">{overrideQuery.data?.totalOverrides || 0}</div>
                    </div>
                    <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.04]">
                       <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Approvals</div>
                       <div className="text-xl font-bold text-emerald-400">{overrideQuery.data?.totalApproved || 0}</div>
                    </div>
                 </div>
                 <div className="space-y-3">
                   {overrideQuery.data?.recentOverrides?.slice(0, 5).map((o: any) => (
                     <div key={o.id} className="border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
                       <div className="flex justify-between items-center mb-1">
                         <span className="text-xs font-bold text-white">App {o.applicationId?.slice(0,8)}</span>
                         <span className="text-[10px] font-mono text-zinc-500">{new Date(o.createdAt).toLocaleDateString()}</span>
                       </div>
                       <div className="text-[11px] text-zinc-400 mb-1">
                         <span className="text-zinc-500">Overridden by:</span> {o.decisionMakerId}
                       </div>
                       <div className="text-[11px] text-amber-400 italic">"{o.overrideReason}"</div>
                     </div>
                   ))}
                 </div>
               </div>
            )}
          </div>
        </div>

        {/* Right Column — Audit Trail */}
        <div className="col-span-8 bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-8 flex flex-col">
          <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/[0.06]">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400 flex items-center gap-2">
              <RotateCcwIcon /> Systemic Audit Trail
              {auditPage.total > 0 && (
                <span className="ml-2 text-zinc-600">({auditPage.total} total events)</span>
              )}
            </div>
            <div className="flex gap-2">
              {(['all', 'MODEL_UPDATE', 'DECISION'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeFilter === f
                      ? 'bg-white/[0.08] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All Events' : f === 'MODEL_UPDATE' ? 'Model Changes' : 'Decisions'}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex-1 pl-4 overflow-y-auto">
            <div className="absolute left-6 top-4 bottom-10 w-px bg-white/[0.08]" />

            <div className="space-y-10">
              {auditQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                  <p className="text-sm">Retrieving immutable audit logs...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-sm">No audit events found.</div>
              ) : filteredEvents.map((evt: any) => {
                const isAlert = evt.newValue?.severity === 'CRITICAL'
                const isDecision = evt.eventType?.includes('DECISION')
                return (
                  <div key={evt.id} className="relative pl-12 group">
                    <div className={`absolute left-[-21px] top-6 w-3 h-3 rounded-full border-[3px] border-[#0d0d0d] shadow-[0_0_0_1px_rgba(255,255,255,0.08)] z-10 ${
                      isAlert ? 'bg-rose-500' : isDecision ? 'bg-emerald-500' : 'bg-blue-400'
                    }`} />

                    <div className={`p-6 rounded-xl border transition-all ${
                      isAlert ? 'border-rose-500/20 bg-rose-500/5' : 'border-white/[0.06] bg-black hover:border-white/[0.15]'
                    }`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                            isAlert
                              ? 'bg-rose-500 text-white'
                              : isDecision
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {evt.eventType?.replace(/_/g, ' ')}
                          </span>
                          <h3 className={`text-sm font-bold ${isAlert ? 'text-rose-400' : 'text-white'}`}>
                            {evt.entityType} — {evt.entityId.slice(0, 8)}…
                          </h3>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono tracking-wider">
                          {new Date(evt.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-400 leading-relaxed mb-4">
                        {evt.newValue?.message || `${evt.eventType?.replace(/_/g, ' ')} on ${evt.entityType}`}
                        {evt.newValue?.status && (
                          <span className="ml-2 font-mono text-zinc-300">→ {evt.newValue.status}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-6 pt-3 border-t border-white/[0.06]">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-[10px] text-white font-bold">
                            {evt.actor?.name?.[0]?.toUpperCase() || 'S'}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Actor</span>
                            <span className="text-xs font-mono text-zinc-300">
                              {evt.actor?.name || 'SYSTEM'} {evt.actor?.role ? `(${evt.actor.role})` : ''}
                            </span>
                          </div>
                        </div>

                        {(evt.newValue?.overrideReason) && (
                          <div className="ml-4 text-xs text-zinc-400 italic">
                            "{evt.newValue.overrideReason}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {auditPage.pages > 1 && (
              <div className="mt-10 flex justify-center pb-4">
                <button className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 hover:text-white transition-colors flex items-center gap-2">
                  Load Older Events →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function RotateCcwIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}
