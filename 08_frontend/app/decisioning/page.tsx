'use client'
import * as React from 'react'
import { useState } from 'react'
import { Info, CheckCircle2, SlidersHorizontal, Loader2, AlertCircle, ChevronDown } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionHeader, KPIBlock, StatusBadge } from '@/components/ui'
import { fetchApi } from '@/lib/api-client'

export default function DecisioningPage() {
  const queryClient = useQueryClient()
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [justification, setJustification] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Fetch all applications pending committee review
  const { data: pipelineGroups, isLoading: loadingPipeline } = useQuery({
    queryKey: ['pipeline-groups'],
    queryFn: () => fetchApi('/pipeline/board'),
  })

  // Fetch AI evaluation for selected app
  const evaluationQuery = useQuery({
    queryKey: ['evaluation', selectedAppId],
    queryFn: () => fetchApi(`/decisions/evaluate/${selectedAppId}`),
    enabled: !!selectedAppId,
  })

  // Decision submission mutation
  const submitDecision = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason: string }) =>
      fetchApi(`/decisions/submit/${selectedAppId}`, {
        method: 'POST',
        body: JSON.stringify({ overrideStatus: status, overrideReason: reason }),
      }),
    onSuccess: (data) => {
      setSuccessMsg(`Decision recorded: ${data.decision?.status}`)
      setJustification('')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['pipeline-groups'] })
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to submit decision')
    },
  })

  const reviewApps = [
    ...(pipelineGroups?.COMMITTEE_REVIEW || []),
    ...(pipelineGroups?.SCORED || []),
  ]

  const selectedApp = reviewApps.find((a: any) => a.id === selectedAppId)
  const evaluation = evaluationQuery.data
  const xaiDrivers: any[] = evaluation?.xaiDrivers || []

  const handleDecision = (status: string) => {
    if (!justification.trim()) {
      setError('A mandatory justification is required for all decisions.')
      return
    }
    setError('')
    setSuccessMsg('')
    submitDecision.mutate({ status, reason: justification })
  }

  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-6 page-enter pb-10">
      {/* Application Selector */}
      <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Select Application for Review</h2>
          {loadingPipeline && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
        </div>
        {reviewApps.length === 0 && !loadingPipeline ? (
          <p className="text-zinc-500 text-sm">No applications currently in Committee Review or Scoring stage.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {reviewApps.map((app: any) => (
              <button
                key={app.id}
                onClick={() => { setSelectedAppId(app.id); setSuccessMsg(''); setError(''); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                  selectedAppId === app.id
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {app.counterparty?.name || 'Unknown'} — {app.reqId}
                <span className={`ml-2 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${app.currentStage === 'COMMITTEE_REVIEW' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {app.currentStage}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!selectedAppId && (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/[0.06] rounded-2xl">
          <ChevronDown className="w-8 h-8 text-zinc-600 mb-3 animate-bounce" />
          <p className="text-zinc-500 text-sm">Select an application above to start the decisioning process.</p>
        </div>
      )}

      {selectedAppId && selectedApp && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded uppercase tracking-widest">
                  Credit Decision
                </span>
                <span className="text-zinc-500 text-sm">Req ID: {selectedApp.reqId}</span>
                <StatusBadge status={selectedApp.currentStage} />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight mb-2">{selectedApp.counterparty?.name}</h1>
              {evaluationQuery.isLoading ? (
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Running AI evaluation...
                </div>
              ) : evaluation ? (
                <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
                  AI Recommendation: <span className={`font-bold ${evaluation.recommendation === 'APPROVE' ? 'text-emerald-400' : evaluation.recommendation === 'REJECT' ? 'text-rose-400' : 'text-amber-400'}`}>{evaluation.recommendation}</span>
                  {' — '}{evaluation.rationale}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 mt-4">
            {/* Left: Model Output & XAI */}
            <div className="col-span-8 flex flex-col gap-6">
              {/* KPIs from live app data */}
              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-7">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Model Output & Benchmarks</h2>
                  <Info className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="grid grid-cols-3 gap-8">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">Probability of Default</span>
                    <div className="flex items-end gap-3 mb-6">
                      <span className="text-5xl font-black tabular-nums">{(selectedApp.pd ?? 0).toFixed(2)}<span className="text-3xl text-zinc-500">%</span></span>
                    </div>
                    <div className="mt-auto">
                      <div className="h-1.5 bg-white/[0.06] rounded-full relative">
                        <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(((selectedApp.pd ?? 0) / 6) * 100, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-[9px] text-zinc-600 mt-1">
                        <span>0%</span><span>{(selectedApp.pd ?? 0).toFixed(2)}%</span><span>6% (Reject)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">Requested Amount</span>
                    <div className="flex items-end gap-1 mb-6">
                      <span className="text-5xl font-black tabular-nums">${(selectedApp.requestedAmount ?? 0).toFixed(1)}</span>
                      <span className="text-3xl font-black text-zinc-500 mb-0.5">M</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">Counterparty Rating</span>
                    <div className="text-5xl font-black">{selectedApp.counterparty?.internalRating}</div>
                    <div className="mt-3"><StatusBadge status={selectedApp.counterparty?.internalRating?.includes('A') ? 'STABLE' : 'REVIEW'} /></div>
                  </div>
                </div>
              </div>

              {/* XAI Drivers */}
              {evaluationQuery.isLoading ? (
                <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-7 flex items-center justify-center min-h-[200px]">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                </div>
              ) : xaiDrivers.length > 0 ? (
                <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-7">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">XAI: Key Risk Drivers</h2>
                    <span className="text-[10px] font-mono text-zinc-500 bg-white/[0.04] px-2 py-1 rounded">SHAP Values</span>
                  </div>
                  <div className="grid grid-cols-2 gap-10">
                    <div className="flex flex-col gap-6">
                      <h3 className="text-sm font-semibold text-rose-400 flex items-center gap-2"><span className="text-lg">↗</span> Risk Increasing Factors</h3>
                      {xaiDrivers.filter((d: any) => d.direction === 'negative').map((d: any) => (
                        <div key={d.label}>
                          <div className="flex justify-between text-xs mb-2">
                            <span className="text-zinc-300">{d.label}</span>
                            <span className="text-rose-400 font-mono">+{Math.abs(d.impact).toFixed(2)}</span>
                          </div>
                          <div className="h-1.5 bg-white/[0.04] rounded-full flex justify-end">
                            <div className="h-full bg-rose-500/80 rounded-full" style={{ width: `${Math.min(Math.abs(d.impact) * 100, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-6">
                      <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2"><span className="text-lg">↘</span> Risk Reducing Factors</h3>
                      {xaiDrivers.filter((d: any) => d.direction === 'positive').map((d: any) => (
                        <div key={d.label}>
                          <div className="flex justify-between text-xs mb-2">
                            <span className="text-zinc-300">{d.label}</span>
                            <span className="text-emerald-400 font-mono">-{Math.abs(d.impact).toFixed(2)}</span>
                          </div>
                          <div className="h-1.5 bg-white/[0.04] rounded-full">
                            <div className="h-full bg-emerald-500/80 rounded-full" style={{ width: `${Math.min(Math.abs(d.impact) * 100, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Right: Decision Control */}
            <div className="col-span-4">
              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-7 sticky top-4">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6">Decision Control</h2>

                {/* AI Recommendation Badge */}
                {evaluation && (
                  <div className={`p-3 rounded-xl mb-6 border text-sm font-semibold flex items-center gap-2 ${
                    evaluation.recommendation === 'APPROVE' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                    evaluation.recommendation === 'REJECT' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                    'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}>
                    <CheckCircle2 className="w-4 h-4" />
                    AI Recommends: {evaluation.recommendation}
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => handleDecision('APPROVE')}
                    disabled={submitDecision.isPending}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors text-emerald-400 disabled:opacity-50"
                  >
                    <span className="font-semibold text-sm">Approve</span>
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDecision('APPROVE_WITH_CONDITIONS')}
                    disabled={submitDecision.isPending}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-blue-500/50 bg-blue-500/10 transition-colors text-blue-400 disabled:opacity-50"
                  >
                    <span className="font-semibold text-sm">Approve with Conditions</span>
                    <SlidersHorizontal className="w-5 h-5" />
                  </button>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => handleDecision('SEND_TO_REVIEW')}
                      disabled={submitDecision.isPending}
                      className="flex-1 p-3 rounded-xl border border-white/[0.08] bg-black hover:bg-white/[0.05] transition-colors text-sm font-semibold text-zinc-300 disabled:opacity-50"
                    >
                      Send to Review
                    </button>
                    <button
                      onClick={() => handleDecision('REJECT')}
                      disabled={submitDecision.isPending}
                      className="flex-1 p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 transition-colors text-sm font-semibold text-rose-400 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 mb-2 block">
                    Mandatory Justification <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={justification}
                    onChange={e => setJustification(e.target.value)}
                    className="w-full h-24 bg-[#141414] border border-white/[0.08] rounded-xl p-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-blue-500/50 resize-none"
                    placeholder="Enter rationale, policy references, or override reason..."
                  />
                </div>

                {error && (
                  <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2 text-rose-400 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}
                {successMsg && (
                  <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-400 text-xs">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {successMsg}
                  </div>
                )}
                {submitDecision.isPending && (
                  <div className="mt-3 flex items-center gap-2 text-zinc-500 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting decision to audit trail...
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
