'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, ShieldCheck, FileText, FileCode2, Loader2, CheckCircle2, AlertTriangle, XCircle, RotateCcw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { SectionHeader } from '@/components/ui'
import { fetchApi } from '@/lib/api-client'

// ── Status helpers ─────────────────────────────────────────────────────────

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  COMPLIANT:      { color: 'text-emerald-400', icon: CheckCircle2, label: 'Conforme' },
  REVIEW:         { color: 'text-amber-400',   icon: AlertTriangle, label: 'En révision' },
  FAILED:         { color: 'text-rose-400',    icon: XCircle,       label: 'Non conforme' },
  NOT_APPLICABLE: { color: 'text-zinc-500',    icon: CheckCircle2,  label: 'N/A' },
}

const fileIcon = (type: string) => {
  if (type === 'pdf') return <FileText className="w-5 h-5" />
  if (type === 'py')  return <FileCode2 className="w-5 h-5" />
  return <FileText className="w-5 h-5" />
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-CM', { day: '2-digit', month: 'short', year: 'numeric' })
}

function timeAgo(d: string | null | undefined) {
  if (!d) return 'Jamais'
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Il y a 1 jour'
  if (days < 30) return `Il y a ${days} jours`
  return `Il y a ${Math.floor(days / 30)} mois`
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<'regulatory' | 'audit'>('regulatory')
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

      <div className="flex items-center gap-6 border-b border-white/[0.08] px-2 mt-4">
        <button
          onClick={() => setActiveTab('regulatory')}
          className={`relative pb-3 text-[13px] font-bold transition-colors ${
            activeTab === 'regulatory' ? 'text-brand-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Regulatory & Validation
          {activeTab === 'regulatory' && (
            <motion.div layoutId="compliance-tab-indicator" className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-brand-400 shadow-[0_0_8px_rgba(59,123,255,0.6)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`relative pb-3 text-[13px] font-bold transition-colors ${
            activeTab === 'audit' ? 'text-brand-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Systemic Audit Trail
          {activeTab === 'audit' && (
            <motion.div layoutId="compliance-tab-indicator" className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-brand-400 shadow-[0_0_8px_rgba(59,123,255,0.6)]" />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'regulatory' && (
          <motion.div
            key="regulatory"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-12 gap-8 mt-6"
          >
            {/* Left Column: Regulatory Status */}
            <div className="col-span-6 card-glow p-8 flex flex-col">
              <div className="flex items-center gap-2 mb-8 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-brand-400" /> Regulatory Status
              </div>

              {itemsQuery.isLoading ? (
                <div className="flex flex-1 items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
                </div>
              ) : complianceItems.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-4">No compliance items found.</p>
              ) : (
                <div className="space-y-6 flex-1 overflow-y-auto pr-2">
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
                        <p className="text-xs text-zinc-500 leading-relaxed">{item.detail}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-[10px] text-zinc-600 uppercase tracking-widest">{item.referenceDoc}</span>
                          <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
                            {item.lastValidated ? `Validated: ${formatDate(item.lastValidated)}` : 'Pending validation'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Docs & Overrides */}
            <div className="col-span-6 flex flex-col gap-8">
              {/* Tech Docs */}
              <div className="card-glow p-8">
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
                      <div key={doc.id} className="flex gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-white/[0.1] transition-colors cursor-pointer group">
                        <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-500 group-hover:text-brand-400 transition-colors flex-shrink-0">
                          {fileIcon(doc.fileType)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white mb-0.5 group-hover:text-brand-400 transition-colors">{doc.name}</h4>
                          <p className="text-[11px] text-zinc-500">{doc.version} • {timeAgo(doc.updatedAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Override Activity Report */}
              <div className="card-glow p-8 flex-1">
                <div className="flex items-center gap-2 mb-6 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Override Activity Report
                </div>
                {overrideQuery.isLoading ? (
                   <Loader2 className="w-5 h-5 animate-spin text-zinc-600 mx-auto py-4" />
                ) : overrideQuery.data?.totalOverrides === 0 ? (
                   <p className="text-zinc-500 text-sm text-center py-4">No manual overrides recorded.</p>
                ) : (
                   <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
                           <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Total Overrides</div>
                           <div className="text-2xl font-bold text-white">{overrideQuery.data?.totalOverrides || 0}</div>
                        </div>
                        <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
                           <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Approvals</div>
                           <div className="text-2xl font-bold text-emerald-400">
                             {overrideQuery.data?.overrideDecisions?.filter((o: any) => o.finalStatus?.startsWith('APPROVE')).length || 0}
                           </div>
                        </div>
                     </div>
                     <div className="space-y-4">
                       {overrideQuery.data?.overrideDecisions?.slice(0, 5).map((o: any) => (
                         <div key={o.decisionId} className="border-b border-white/[0.06] pb-4 last:border-0 last:pb-0">
                           <div className="flex justify-between items-center mb-1.5">
                             <span className="text-xs font-bold text-white">App {o.applicationId?.slice(0,8)}</span>
                             <span className="text-[10px] font-mono text-zinc-500">{new Date(o.decidedAt).toLocaleDateString()}</span>
                           </div>
                           <div className="text-[11px] text-zinc-400 mb-1.5">
                             <span className="text-zinc-500">Overridden by:</span> {o.decidedBy}
                           </div>
                           <div className="text-[11px] text-amber-400/80 italic leading-relaxed">"{o.overrideReason}"</div>
                         </div>
                       ))}
                     </div>
                   </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'audit' && (
          <motion.div
            key="audit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-6"
          >
            {/* Full Width Audit Trail */}
            <div className="card-glow p-8 flex flex-col h-[75vh]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-6 border-b border-white/[0.06] gap-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Systemic Audit Trail
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
                          ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                          : 'text-zinc-500 hover:text-white border border-transparent'
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
                      <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand-400" />
                      <p className="text-sm">Retrieving immutable audit logs...</p>
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 text-sm">No audit events found.</div>
                  ) : filteredEvents.map((evt: any) => {
                    const isAlert = evt.newValue?.severity === 'CRITICAL'
                    const isDecision = evt.eventType?.includes('DECISION')
                    return (
                      <div key={evt.id} className="relative pl-12 group">
                        <div className={`absolute left-[-21px] top-6 w-3 h-3 rounded-full border-[3px] border-[#0a0a0a] shadow-[0_0_0_1px_rgba(255,255,255,0.08)] z-10 ${
                          isAlert ? 'bg-rose-500' : isDecision ? 'bg-emerald-500' : 'bg-blue-400'
                        }`} />

                        <div className={`p-6 rounded-xl border transition-all ${
                          isAlert ? 'border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                        }`}>
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                                isAlert
                                  ? 'bg-rose-500 text-white'
                                  : isDecision
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
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

                          <div className="flex items-center gap-6 pt-4 border-t border-white/[0.06]">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-[10px] text-white font-bold shadow-inner">
                                {evt.actor?.name?.[0]?.toUpperCase() || 'S'}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] text-zinc-500 uppercase tracking-widest mb-0.5">Actor</span>
                                <span className="text-xs font-mono text-zinc-300">
                                  {evt.actor?.name || 'SYSTEM'} {evt.actor?.role ? `(${evt.actor.role})` : ''}
                                </span>
                              </div>
                            </div>

                            {(evt.newValue?.overrideReason) && (
                              <div className="ml-4 text-xs text-zinc-400 italic border-l border-white/[0.08] pl-4">
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
                  <div className="mt-12 flex justify-center pb-6">
                    <button className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 hover:text-white transition-colors flex items-center gap-2">
                      Load Older Events →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
