'use client'
import { useState, useEffect } from 'react'
import { CheckCircle2, ArrowRight, Loader2, GitMerge, TrendingUp, Clock, Activity, FileText, X, ChevronRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '@/lib/api-client'

function useCountUp(target: number, duration = 1200, delay = 0) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let isMounted = true
    let reqId: number

    const t = setTimeout(() => {
      const s = performance.now()
      const step = (now: number) => {
        if (!isMounted) return
        const p = Math.min((now - s) / duration, 1)
        setV(Math.floor((1 - Math.pow(1 - p, 3)) * target))
        if (p < 1) reqId = requestAnimationFrame(step)
        else setV(target)
      }
      reqId = requestAnimationFrame(step)
    }, delay)

    return () => {
      isMounted = false
      clearTimeout(t)
      if (reqId) cancelAnimationFrame(reqId)
    }
  }, [target, duration, delay])
  return v
}

function KPICards({ totalNew, inReview, exposureSum }: { totalNew: number, inReview: number, exposureSum: number }) {
  const animatedNew = useCountUp(totalNew, 800, 100)
  const animatedReview = useCountUp(inReview, 800, 200)
  const animatedExp = useCountUp(exposureSum, 900, 300)

  const cards = [
    {
      label: 'New Apps',
      value: `${animatedNew}`,
      icon: Activity, iconColor: 'text-[#3ECF8E]', iconBg: 'bg-[#3ECF8E]/10 border-[#3ECF8E]/20',
      accent: '#3ECF8E'
    },
    {
      label: 'In Review',
      value: `${animatedReview}`,
      icon: Clock, iconColor: 'text-amber-400', iconBg: 'bg-amber-500/10 border-amber-500/20',
      accent: '#f59e0b'
    },
    {
      label: 'Pipeline Exposure',
      value: `$${animatedExp.toFixed(1)}M`,
      icon: TrendingUp, iconColor: 'text-[#3ECF8E]', iconBg: 'bg-[#3ECF8E]/10 border-[#3ECF8E]/20',
      accent: '#3ECF8E'
    }
  ]

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <div key={i} className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden group hover:border-white/[0.1] transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ background: `${c.accent}15`, transform: 'translate(40%, -40%)' }} />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">{c.label}</span>
              <div className={`w-7 h-7 rounded-lg ${c.iconBg} border flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 ${c.iconColor}`} />
              </div>
            </div>
            <div className="text-[28px] font-bold text-white tabular-nums tracking-tight leading-none mb-1">{c.value}</div>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: `linear-gradient(to right, transparent, ${c.accent}80, transparent)` }} />
          </div>
        )
      })}
    </div>
  )
}

type FilterStage = 'ALL' | 'DOCS' | 'SCORING' | 'REVIEW' | 'APPROVED'

export default function PipelinePage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'standard' | 'priority'>('standard')
  const [filterStage, setFilterStage] = useState<FilterStage>('ALL')
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('ANALYST')
  
  useEffect(() => {
    try {
      const stored = localStorage.getItem('internal_user')
      if (stored) setUserRole(JSON.parse(stored).role || 'ANALYST')
    } catch {}
  }, [])

  const [overrideReason, setOverrideReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  const { data: stages, isLoading } = useQuery({
    queryKey: ['pipeline-groups'],
    queryFn: () => fetchApi('/pipeline/board'),
  })

  const moveStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string, stage: string }) => 
      fetchApi(`/pipeline/${id}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-groups'] })
  })

  const scoreMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/decisions/submit/${id}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-groups'] })
    }
  })

  const manualDecisionMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string, status: string, reason: string }) =>
      fetchApi(`/decisions/submit/${id}`, {
        method: 'POST',
        body: JSON.stringify({ overrideStatus: status, overrideReason: reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-groups'] })
      setOverrideReason('')
      setIsRejecting(false)
      setSelectedAppId(null)
    }
  })

  const allApps = stages ? Object.values(stages).flat() : []
  const selectedApp: any = allApps.find((a: any) => a.id === selectedAppId)

  const filterMap: Record<FilterStage, (s: string) => boolean> = {
    ALL: () => true,
    DOCS: (s) => ['SUBMITTED', 'DOCUMENTS_PENDING', 'DOCUMENTS_VALIDATED'].includes(s),
    SCORING: (s) => ['SCORED'].includes(s),
    REVIEW: (s) => ['ANALYST_REVIEW', 'MANAGER_REVIEW', 'COMMITTEE_REVIEW'].includes(s),
    APPROVED: (s) => ['APPROVED', 'APPROVED_WITH_CONDITIONS'].includes(s),
  }

  const filteredApps = allApps.filter((app: any) => filterMap[filterStage](app.currentStage))

  const totalNew = (stages?.SUBMITTED?.length || 0) + (stages?.DOCUMENTS_PENDING?.length || 0);
  const inReview = (stages?.MANAGER_REVIEW?.length || 0) + (stages?.COMMITTEE_REVIEW?.length || 0);
  const exposureSum = allApps.reduce((sum: number, app: any) => sum + (app.requestedAmount || 0), 0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedAppId(null);
        setIsRejecting(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getStageColor = (stage: string) => {
    if (stage.includes('REVIEW')) return 'bg-amber-400'
    if (stage.includes('DOC') || stage === 'SUBMITTED') return 'bg-white'
    return 'bg-[#3ECF8E]'
  }

  return (
    <div className="w-full max-w-6xl mx-auto relative pb-20">
      {/* Top Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight leading-none text-white">Deal Pipeline</h1>
          <p className="text-[12px] text-zinc-500 mt-1.5 flex items-center gap-2">
            <GitMerge className="w-3.5 h-3.5" /> Institutional credit flow and underwriting
          </p>
        </div>
        <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
          <button 
            onClick={() => setActiveTab('standard')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'standard' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
          >
            Standard View
          </button>
          <button 
            onClick={() => setActiveTab('priority')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'priority' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'text-zinc-500 hover:text-white'}`}
          >
            AI Prioritized
          </button>
        </div>
      </div>

      <KPICards totalNew={totalNew} inReview={inReview} exposureSum={exposureSum} />

      {/* Minimalist Data Table Section */}
      <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-2 bg-[#0A0A0A]">
          {(['ALL', 'DOCS', 'SCORING', 'REVIEW', 'APPROVED'] as FilterStage[]).map(stage => (
            <button
              key={stage}
              onClick={() => setFilterStage(stage)}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all ${
                filterStage === stage 
                ? 'bg-white text-black shadow-md' 
                : 'bg-white/[0.03] text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300 border border-white/[0.04]'
              }`}
            >
              {stage}
            </button>
          ))}
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                <th className="font-medium pb-4 pt-4 pl-6 text-[10px] uppercase tracking-widest text-zinc-500 w-[120px]">Case ID</th>
                <th className="font-medium pb-4 pt-4 text-[10px] uppercase tracking-widest text-zinc-500">Counterparty</th>
                <th className="font-medium pb-4 pt-4 text-[10px] uppercase tracking-widest text-zinc-500 w-[140px]">Exposure</th>
                <th className="font-medium pb-4 pt-4 text-[10px] uppercase tracking-widest text-zinc-500 w-[120px]">PD (1Y)</th>
                <th className="font-medium pb-4 pt-4 text-[10px] uppercase tracking-widest text-zinc-500 w-[180px]">Current Stage</th>
                <th className="font-medium pb-4 pt-4 text-[10px] uppercase tracking-widest text-zinc-500 text-right pr-6 w-[80px]">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 className="w-6 h-6 text-[#3ECF8E] animate-spin mx-auto mb-4" />
                    <span className="text-zinc-500 text-xs font-medium tracking-widest uppercase">Loading Pipeline</span>
                  </td>
                </tr>
              ) : filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="text-zinc-500 text-xs font-medium tracking-widest uppercase mb-1">No Applications</div>
                    <div className="text-[10px] text-zinc-600">Try changing your filters or checking a different stage.</div>
                  </td>
                </tr>
              ) : filteredApps.map((app: any) => (
                <tr 
                  key={app.id} 
                  onClick={() => setSelectedAppId(app.id)}
                  className={`border-b border-white/[0.02] last:border-0 cursor-pointer transition-colors group ${
                    selectedAppId === app.id ? 'bg-[#3ECF8E]/[0.05]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <td className="py-5 pl-6">
                    <span className="text-[10px] font-mono font-medium text-zinc-400 bg-white/[0.03] border border-white/[0.05] px-2 py-1 rounded">{app.reqId}</span>
                  </td>
                  <td className="py-5 pr-4">
                    <div className="font-bold text-[13px] text-white tracking-tight flex items-center gap-2">
                      {app.counterparty?.name || 'Unknown'}
                      {app.priority && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{app.counterparty?.sector || ''}</div>
                  </td>
                  <td className="py-5">
                    <div className="text-[14px] font-black tabular-nums text-white">${app.requestedAmount}M</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Requested</div>
                  </td>
                  <td className="py-5">
                    <div className="text-[14px] font-black tabular-nums text-[#3ECF8E]">{(app.pd ?? 0).toFixed(2)}%</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">RTG: <span className="text-white">{app.counterparty?.internalRating}</span></div>
                  </td>
                  <td className="py-5">
                    <div className="inline-flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.05] px-2.5 py-1 rounded-full">
                      <span className={`w-1.5 h-1.5 rounded-full ${getStageColor(app.currentStage)}`} />
                      <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">{app.currentStage.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td className="py-5 pr-6 text-right relative">
                     <div className="flex items-center justify-end">
                       <div className={`w-8 h-8 rounded-full inline-flex items-center justify-center transition-opacity ${selectedAppId === app.id ? 'opacity-0' : 'opacity-100 group-hover:opacity-0 bg-white/[0.02] text-zinc-500'}`}>
                         <ChevronRight className="w-4 h-4" />
                       </div>
                       
                       <div className={`absolute right-6 flex items-center gap-1.5 transition-opacity ${selectedAppId === app.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                         <button 
                           title="Review Application"
                           onClick={(e) => { e.stopPropagation(); setSelectedAppId(app.id); }}
                           className="px-3 py-1.5 rounded-lg bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 text-[#3ECF8E] font-bold text-[10px] uppercase tracking-wider hover:bg-[#3ECF8E]/20 transition-all flex items-center gap-1.5"
                         >
                           <Activity className="w-3 h-3" /> Review
                         </button>
                       </div>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Floating Modal Card */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => { setSelectedAppId(null); setIsRejecting(false); }}
          />
          
          <div className="relative w-full max-w-[600px] bg-[#0d0d0d] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header / Banner */}
            <div className="p-6 border-b border-white/[0.06] bg-[#0A0A0A] relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#3ECF8E]/40 to-transparent" />
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="font-mono bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded text-[10px] text-zinc-400">{selectedApp.reqId}</span>
                    <span className={`uppercase tracking-widest text-[9px] font-bold ${selectedApp.currentStage.includes('REVIEW') ? 'text-amber-400' : 'text-[#3ECF8E]'}`}>
                      {selectedApp.currentStage.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-white">{selectedApp.counterparty?.name}</h2>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider mt-1">{selectedApp.counterparty?.sector}</p>
                </div>
                <button 
                  onClick={() => { setSelectedAppId(null); setIsRejecting(false); }} 
                  className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.1] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/[0.04] flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Exposure</span>
                  <span className="text-xl font-black tabular-nums text-white">${selectedApp.requestedAmount}M</span>
                </div>
                <div className="p-4 bg-[#3ECF8E]/[0.03] rounded-2xl border border-[#3ECF8E]/20 flex flex-col relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#3ECF8E]/10 to-transparent pointer-events-none" />
                  <span className="relative text-[10px] font-bold text-[#3ECF8E] uppercase tracking-widest mb-1">PD (1Y)</span>
                  <span className="relative text-xl font-black tabular-nums text-[#3ECF8E]">{(selectedApp.pd ?? 0).toFixed(2)}%</span>
                </div>
                <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/[0.04] flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Rating</span>
                  <span className="text-xl font-black tabular-nums text-white">{selectedApp.counterparty?.internalRating}</span>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-6 bg-[#060606] max-h-[40vh] overflow-y-auto custom-scrollbar">
              {isRejecting ? (
                <div className="animate-fade-in">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-white mb-2">Decision Justification</h3>
                  <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed">You are creating an audit trail. Please provide the exact policy breaches or qualitative concerns.</p>
                  <textarea 
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Enter justification here..."
                    className="w-full bg-[#0d0d0d] border border-white/[0.08] text-[13px] text-white rounded-xl p-4 outline-none focus:border-[#3ECF8E]/50 min-h-[120px] transition-colors resize-none placeholder:text-zinc-700"
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4">Underwriting Workflow</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 flex flex-col gap-1 relative overflow-hidden">
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3ECF8E]" />
                         <span className="text-[9px] text-zinc-500 uppercase tracking-wider pl-1">KYC / AML</span>
                         <span className="text-xs font-bold text-white pl-1">Cleared</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-700" />
                      <div className="flex-1 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 flex flex-col gap-1 relative overflow-hidden">
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3ECF8E]" />
                         <span className="text-[9px] text-zinc-500 uppercase tracking-wider pl-1">Documents</span>
                         <span className="text-xs font-bold text-white pl-1">Validated</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-700" />
                      <div className="flex-1 bg-white/[0.01] border border-white/[0.02] rounded-xl p-3 flex flex-col gap-1">
                         <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Pricing</span>
                         <span className="text-xs font-medium text-zinc-500">Pending</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#3ECF8E]/[0.02] border border-[#3ECF8E]/10 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#3ECF8E] mt-0.5" />
                    <div>
                      <h4 className="text-[13px] font-bold text-[#3ECF8E]">MLOps Recommendation: Approve</h4>
                      <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">Model confidence is high. Financials demonstrate robust liquidity. Probability of Default (PD) is firmly within the risk appetite framework.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-white/[0.06] bg-[#0A0A0A] flex flex-col gap-3">
               {['CRO', 'ADMIN'].includes(userRole) && (
                 <div className="w-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold tracking-widest text-[9px] uppercase py-3 px-4 rounded-xl flex items-center justify-center gap-2">
                   Executive read-only view
                 </div>
               )}

               {selectedApp.currentStage === 'DOCUMENTS_PENDING' && userRole === 'ANALYST' && (
                  <button 
                    disabled={moveStageMutation.isPending}
                    onClick={() => moveStageMutation.mutate({ id: selectedApp.id, stage: 'DOCUMENTS_VALIDATED' })}
                    className="w-full bg-white/[0.05] hover:bg-white/[0.1] text-white font-semibold py-3.5 px-4 rounded-xl transition-colors border border-white/[0.1] text-sm shadow-sm flex items-center justify-center gap-2"
                  >
                    {moveStageMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : 'Mark Docs Validated'}
                  </button>
               )}

               {selectedApp.currentStage === 'DOCUMENTS_VALIDATED' && userRole === 'ANALYST' && (
                  <button 
                    disabled={scoreMutation.isPending}
                    onClick={() => scoreMutation.mutate(selectedApp.id)}
                    className="w-full bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-[#030303] font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(62,207,142,0.2)]"
                  >
                    {scoreMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Scoring...</> : <><ArrowRight className="w-4 h-4" /> Execute MLOps Scoring</>}
                  </button>
               )}

               {selectedApp.currentStage === 'SCORED' && userRole === 'ANALYST' && (
                  <button 
                    disabled={moveStageMutation.isPending}
                    onClick={() => moveStageMutation.mutate({ id: selectedApp.id, stage: 'ANALYST_REVIEW' })}
                    className="w-full bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-[#030303] font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(62,207,142,0.2)]"
                  >
                    {moveStageMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : 'Move to Analyst Review'}
                  </button>
               )}

               {selectedApp.currentStage === 'ANALYST_REVIEW' && userRole === 'ANALYST' && (
                  <button 
                    disabled={moveStageMutation.isPending}
                    onClick={() => moveStageMutation.mutate({ id: selectedApp.id, stage: 'MANAGER_REVIEW' })}
                    className="w-full bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-[#030303] font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(62,207,142,0.2)]"
                  >
                    {moveStageMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : 'Submit to Manager'}
                  </button>
               )}

              {selectedApp.currentStage === 'MANAGER_REVIEW' && userRole === 'MANAGER' && !isRejecting && (
                <div className="flex gap-3">
                  <button onClick={() => setIsRejecting(true)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.1] text-white font-semibold py-3.5 px-4 rounded-xl transition-colors text-sm border border-white/[0.1]">
                    Reject
                  </button>
                  <button 
                    disabled={manualDecisionMutation.isPending}
                    onClick={() => manualDecisionMutation.mutate({ id: selectedApp.id, status: 'APPROVE', reason: 'Manager Approval' })}
                    className="flex-1 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-[#030303] font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(62,207,142,0.2)]"
                  >
                    {manualDecisionMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Approving...</> : 'Approve'}
                  </button>
                </div>
              )}

              {selectedApp.currentStage === 'COMMITTEE_REVIEW' && userRole === 'ANALYST' && (
                <div className="w-full bg-white/[0.02] border border-white/[0.04] text-zinc-500 text-[10px] font-bold tracking-[0.1em] uppercase py-3.5 px-4 rounded-xl flex items-center justify-center text-center">
                  Pending Manager Approval
                </div>
              )}

              {isRejecting && userRole === 'MANAGER' && (
                  <div className="flex flex-col gap-3 animate-fade-in mt-4">
                    <button 
                      disabled={!overrideReason || manualDecisionMutation.isPending}
                      onClick={() => manualDecisionMutation.mutate({ id: selectedApp.id, status: 'REJECT', reason: overrideReason })}
                      className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-rose-600/50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(225,29,72,0.2)]"
                    >
                      {manualDecisionMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : 'Confirm Rejection'}
                    </button>
                    <button onClick={() => setIsRejecting(false)} className="w-full bg-transparent hover:bg-white/[0.05] text-zinc-400 hover:text-white font-semibold py-2 px-4 rounded-xl transition-colors text-xs">
                      Cancel
                    </button>
                  </div>
              )}
              
              <button className="w-full text-zinc-500 hover:text-white font-semibold py-2 transition-colors text-[11px] flex items-center justify-center gap-1.5 mt-2">
                <FileText className="w-3.5 h-3.5" /> View Full Application File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
