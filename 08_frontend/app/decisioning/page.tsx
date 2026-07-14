'use client'
import { useState } from 'react'
import {
  Info, CheckCircle2, SlidersHorizontal, Loader2, AlertCircle,
  TrendingUp, TrendingDown, Brain, FileText, Users, Zap,
  ShieldAlert, AlertTriangle, ArrowRight, HelpCircle
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionHeader, StatusBadge } from '@/components/ui'
import { fetchApi } from '@/lib/api-client'

// ── Constants ──────────────────────────────────────────────────────────────────
const MIN_JUSTIFICATION_CHARS = 30

// PD thresholds — used for scale annotation and color
const PD_ZONES = [
  { max: 2,   label: 'Auto-Approve Zone',    color: 'text-emerald-400', bar: 'bg-emerald-500' },
  { max: 4,   label: 'Committee Zone',       color: 'text-amber-400',   bar: 'bg-amber-500'   },
  { max: 100, label: 'Rejection Zone',       color: 'text-rose-400',    bar: 'bg-rose-500'    },
]

function pdZone(pd: number) {
  return PD_ZONES.find(z => pd < z.max) ?? PD_ZONES[2]
}

// ── Step Badge ─────────────────────────────────────────────────────────────────
function StepBadge({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-[9px] font-black text-zinc-400 flex-shrink-0">
        {n}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</span>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function DecisioningPage() {
  const queryClient = useQueryClient()
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [justification, setJustification]  = useState('')
  const [error, setError]                  = useState('')
  const [successMsg, setSuccessMsg]        = useState('')

  const { data: pipelineGroups, isLoading: loadingPipeline } = useQuery({
    queryKey: ['pipeline-groups'],
    queryFn: () => fetchApi('/pipeline/board'),
  })

  const evaluationQuery = useQuery({
    queryKey: ['evaluation', selectedAppId],
    queryFn: () => fetchApi(`/decisions/evaluate/${selectedAppId}`),
    enabled: !!selectedAppId,
  })

  const submitDecision = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason: string }) =>
      fetchApi(`/decisions/submit/${selectedAppId}`, {
        method: 'POST',
        body: JSON.stringify({ overrideStatus: status, overrideReason: reason }),
      }),
    onSuccess: (data) => {
      setSuccessMsg(`Décision enregistrée : ${data.decision?.status}`)
      setJustification('')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['pipeline-groups'] })
    },
    onError: (err: any) => {
      setError(err.message || 'Erreur lors de la soumission')
    },
  })

  const reviewApps = [
    ...(pipelineGroups?.COMMITTEE_REVIEW || []),
    ...(pipelineGroups?.SCORED || []),
  ]

  const selectedApp  = reviewApps.find((a: any) => a.id === selectedAppId)
  const evaluation   = evaluationQuery.data
  const xaiDrivers: any[] = evaluation?.xaiDrivers || []

  const handleDecision = (status: string) => {
    if (justification.trim().length < MIN_JUSTIFICATION_CHARS) {
      setError(`La justification doit contenir au minimum ${MIN_JUSTIFICATION_CHARS} caractères.`)
      return
    }
    setError('')
    setSuccessMsg('')
    submitDecision.mutate({ status, reason: justification })
  }

  const pdValue  = selectedApp?.pd ?? 0
  const zone     = pdZone(pdValue)
  const charsFilled = justification.trim().length
  const charsOk     = charsFilled >= MIN_JUSTIFICATION_CHARS
  const charsPct    = Math.min((charsFilled / MIN_JUSTIFICATION_CHARS) * 100, 100)

  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-6 page-enter pb-10">

      <SectionHeader
        title="Decisioning"
        subtitle="Human-in-the-loop credit committee — every decision is audit-trailed and override-governed."
      />

      {/* ── Application Selector ────────────────────────────────────────────── */}
      <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <div>
            <div className="text-[13px] font-bold text-white">Applications en attente de décision</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Comité de crédit et dossiers scorés</div>
          </div>
          {loadingPipeline && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600" />}
        </div>
        <div className="p-4">
          {reviewApps.length === 0 && !loadingPipeline ? (
            <p className="text-sm text-zinc-600 py-1">Aucune application en attente de décision.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {reviewApps.map((app: any) => {
                const isSelected   = selectedAppId === app.id
                const isCommittee  = app.currentStage === 'COMMITTEE_REVIEW'
                const StageIcon    = isCommittee ? Users : Zap
                return (
                  <button
                    key={app.id}
                    onClick={() => { setSelectedAppId(app.id); setSuccessMsg(''); setError('') }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-white/[0.06] border-white/[0.18]'
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div>
                      <div className={`text-[13px] font-bold leading-none ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                        {app.counterparty?.name || 'Unknown'}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-1">{app.reqId}</div>
                    </div>
                    {/* Stage badge — icon + color + text (triple redundancy WCAG) */}
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                      isCommittee
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    }`}>
                      <StageIcon className="w-2.5 h-2.5" aria-hidden="true" />
                      {isCommittee ? 'Comité' : 'Scoré'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!selectedAppId && (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/[0.06] rounded-2xl">
          <FileText className="w-10 h-10 text-zinc-700 mb-4" />
          <p className="text-sm text-zinc-500">Sélectionnez un dossier ci-dessus pour démarrer la décision.</p>
          <p className="text-[11px] text-zinc-700 mt-1">Toutes les décisions sont enregistrées dans la piste d'audit immuable.</p>
        </div>
      )}

      {/* ── Decision Workspace ──────────────────────────────────────────────── */}
      {selectedAppId && selectedApp && (
        <>
          {/* Application header */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border text-blue-400 bg-blue-500/10 border-blue-500/20">
              <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />
              Décision de Crédit
            </span>
            <span className="text-[10px] font-mono text-zinc-500">{selectedApp.reqId}</span>
            <StatusBadge status={selectedApp.currentStage} />
            <ArrowRight className="w-3 h-3 text-zinc-700" />
            {evaluationQuery.isLoading ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                <Loader2 className="w-3 h-3 animate-spin" /> Évaluation IA en cours…
              </span>
            ) : evaluation ? (
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                evaluation.recommendation === 'APPROVE' ? 'text-emerald-400' :
                evaluation.recommendation === 'REJECT'  ? 'text-rose-400'    : 'text-amber-400'
              }`}>
                <Brain className="w-3.5 h-3.5" />
                Recommandation IA : {evaluation.recommendation}
              </span>
            ) : null}
          </div>

          <h2 className="text-3xl font-black text-white -mt-3" style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {selectedApp.counterparty?.name}
          </h2>

          <div className="grid grid-cols-12 gap-6">

            {/* ── LEFT : Étapes 1 & 2 ────────────────────────────────────────── */}
            <div className="col-span-8 flex flex-col gap-5">

              {/* ── Étape 1 — Synthèse modèle ─────────────────────────────── */}
              <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
                  <StepBadge n="1" label="Synthèse du modèle" />
                  <span className="text-[9px] font-mono text-zinc-600">Pipeline de production</span>
                </div>
                <div className="grid grid-cols-3 divide-x divide-white/[0.05]">

                  {/* PD */}
                  <div className="p-6">
                    <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4">
                      Probabilité de Défaut (PD)
                    </div>
                    <div className={`text-[40px] font-bold tabular-nums tracking-tight leading-none ${zone.color}`}>
                      {pdValue.toFixed(2)}<span className="text-xl text-zinc-500 ml-1">%</span>
                    </div>
                    {/* PD scale with annotated zones */}
                    <div className="mt-5">
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${zone.bar}`}
                          style={{ width: `${Math.min((pdValue / 6) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono mt-1.5">
                        <span className="text-emerald-600">0% Auto</span>
                        <span className="text-amber-600">2% Comité</span>
                        <span className="text-rose-600">4% Rejet</span>
                      </div>
                    </div>
                    <div className={`mt-3 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                      zone.color === 'text-emerald-400' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      zone.color === 'text-amber-400'   ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                          'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                      {zone.color === 'text-rose-400' ? <ShieldAlert className="w-3 h-3" /> :
                       zone.color === 'text-amber-400' ? <AlertTriangle className="w-3 h-3" /> :
                       <CheckCircle2 className="w-3 h-3" />}
                      {zone.label}
                    </div>
                  </div>

                  {/* Montant */}
                  <div className="p-6">
                    <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4">
                      Montant Demandé
                    </div>
                    <div className="text-[40px] font-bold tabular-nums tracking-tight leading-none text-white">
                      ${(selectedApp.requestedAmount ?? 0).toFixed(1)}
                      <span className="text-xl text-zinc-500 ml-1">M</span>
                    </div>
                  </div>

                  {/* Notation */}
                  <div className="p-6">
                    <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4">
                      Notation Interne
                    </div>
                    <div className="text-[40px] font-bold tracking-tight leading-none text-white">
                      {selectedApp.counterparty?.internalRating ?? '—'}
                    </div>
                    <div className="mt-3">
                      <StatusBadge status={selectedApp.counterparty?.internalRating?.includes('A') ? 'Stable' : 'REVIEW'} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Étape 2 — Facteurs de risque (SHAP) ──────────────────── */}
              {evaluationQuery.isLoading ? (
                <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl flex items-center justify-center min-h-[200px]">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
                </div>
              ) : xaiDrivers.length > 0 ? (
                <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
                    <StepBadge n="2" label="Facteurs clés de risque" />
                    {/* SHAP explainer — visible par défaut */}
                    <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5">
                      <HelpCircle className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                      <span className="text-[10px] text-zinc-500">
                        Valeurs SHAP — contribution de chaque variable au score PD. Positif = hausse du risque.
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
                    {/* Risk Increasing */}
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <TrendingUp className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-rose-400">
                          Facteurs aggravants
                        </span>
                      </div>
                      <div className="space-y-5">
                        {xaiDrivers.filter((d: any) => d.direction === 'negative').map((d: any) => (
                          <div key={d.label}>
                            <div className="flex justify-between mb-1.5">
                              <span className="text-[11px] font-medium text-zinc-300">{d.label}</span>
                              <span className="text-[11px] font-mono font-bold text-rose-400" aria-label={`Impact : +${Math.abs(d.impact).toFixed(2)}`}>
                                +{Math.abs(d.impact).toFixed(2)}
                              </span>
                            </div>
                            <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden" role="presentation">
                              <div
                                className="h-full bg-rose-500/70 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(Math.abs(d.impact) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Risk Reducing */}
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <TrendingDown className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-400">
                          Facteurs atténuants
                        </span>
                      </div>
                      <div className="space-y-5">
                        {xaiDrivers.filter((d: any) => d.direction === 'positive').map((d: any) => (
                          <div key={d.label}>
                            <div className="flex justify-between mb-1.5">
                              <span className="text-[11px] font-medium text-zinc-300">{d.label}</span>
                              <span className="text-[11px] font-mono font-bold text-emerald-400" aria-label={`Impact : -${Math.abs(d.impact).toFixed(2)}`}>
                                −{Math.abs(d.impact).toFixed(2)}
                              </span>
                            </div>
                            <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden" role="presentation">
                              <div
                                className="h-full bg-emerald-500/70 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(Math.abs(d.impact) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* ── RIGHT : Étape 3 — Décision (sticky) ───────────────────────── */}
            <div className="col-span-4">
              <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden sticky top-4">
                <div className="px-5 py-4 border-b border-white/[0.05]">
                  <StepBadge n="3" label="Décision" />
                  <p className="text-[10px] text-zinc-600 mt-1">
                    Rédigez votre justification, puis sélectionnez une issue.
                  </p>
                </div>

                <div className="p-5 space-y-4">

                  {/* AI Recommendation */}
                  {evaluation && (
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                      evaluation.recommendation === 'APPROVE'
                        ? 'bg-emerald-500/[0.07] border-emerald-500/20'
                        : evaluation.recommendation === 'REJECT'
                        ? 'bg-rose-500/[0.07] border-rose-500/20'
                        : 'bg-amber-500/[0.07] border-amber-500/20'
                    }`}>
                      <Brain className={`w-4 h-4 flex-shrink-0 ${
                        evaluation.recommendation === 'APPROVE' ? 'text-emerald-400' :
                        evaluation.recommendation === 'REJECT'  ? 'text-rose-400'    : 'text-amber-400'
                      }`} aria-hidden="true" />
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-0.5">
                          Recommandation IA
                        </div>
                        <div className={`text-[13px] font-bold ${
                          evaluation.recommendation === 'APPROVE' ? 'text-emerald-400' :
                          evaluation.recommendation === 'REJECT'  ? 'text-rose-400'    : 'text-amber-400'
                        }`}>
                          {evaluation.recommendation}
                        </div>
                        {evaluation.rationale && (
                          <div className="text-[10px] text-zinc-600 mt-0.5 leading-snug">{evaluation.rationale}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── JUSTIFICATION — avant les boutons ────────────────── */}
                  <div>
                    <label
                      htmlFor="justification"
                      className="flex items-center justify-between mb-2"
                    >
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                        Justification obligatoire
                        <span className="text-rose-400 ml-1">*</span>
                      </span>
                      {/* Char progress indicator */}
                      <span className={`text-[10px] font-mono tabular-nums transition-colors ${
                        charsOk ? 'text-emerald-400' : charsFilled > 0 ? 'text-amber-400' : 'text-zinc-700'
                      }`}>
                        {charsFilled}/{MIN_JUSTIFICATION_CHARS}
                      </span>
                    </label>
                    <textarea
                      id="justification"
                      value={justification}
                      onChange={e => { setJustification(e.target.value); if (error) setError('') }}
                      rows={4}
                      aria-required="true"
                      aria-describedby="justif-hint"
                      className={`w-full bg-black border rounded-xl p-3.5 text-sm text-white placeholder-zinc-700 outline-none transition-colors resize-none ${
                        charsOk
                          ? 'border-emerald-500/30 focus:border-emerald-500/60'
                          : error
                          ? 'border-rose-500/50 focus:border-rose-500/70'
                          : 'border-white/[0.08] focus:border-white/[0.2]'
                      }`}
                      placeholder="Rédigez votre analyse, les références de politique applicables, ou le motif de dérogation…"
                    />
                    {/* Min-char progress bar */}
                    <div className="mt-1.5 h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${charsOk ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${charsPct}%` }}
                      />
                    </div>
                    <p id="justif-hint" className="text-[10px] text-zinc-700 mt-1">
                      Minimum {MIN_JUSTIFICATION_CHARS} caractères — enregistré dans la piste d'audit.
                    </p>
                  </div>

                  {/* ── Decision Buttons — après la justification ─────────── */}
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => handleDecision('APPROVE')}
                      disabled={submitDecision.isPending || !charsOk}
                      className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] hover:bg-emerald-500/[0.14] hover:border-emerald-500/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                    >
                      <span className="text-sm font-semibold text-emerald-400 group-hover:text-emerald-300">
                        Approuver
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleDecision('APPROVE_WITH_CONDITIONS')}
                      disabled={submitDecision.isPending || !charsOk}
                      className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-blue-500/30 bg-blue-500/[0.08] hover:bg-blue-500/[0.14] hover:border-blue-500/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                    >
                      <span className="text-sm font-semibold text-blue-400 group-hover:text-blue-300">
                        Approuver avec conditions
                      </span>
                      <SlidersHorizontal className="w-4 h-4 text-blue-400" aria-hidden="true" />
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleDecision('SEND_TO_REVIEW')}
                        disabled={submitDecision.isPending || !charsOk}
                        className="px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.14] transition-all text-sm font-semibold text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Renvoyer
                      </button>
                      <button
                        onClick={() => handleDecision('REJECT')}
                        disabled={submitDecision.isPending || !charsOk}
                        className="px-4 py-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.06] hover:bg-rose-500/[0.12] hover:border-rose-500/50 transition-all text-sm font-semibold text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Rejeter
                      </button>
                    </div>
                    {!charsOk && charsFilled === 0 && (
                      <p className="text-[10px] text-zinc-700 text-center">
                        Rédigez votre justification pour activer les boutons.
                      </p>
                    )}
                  </div>

                  {/* ── Feedback ──────────────────────────────────────────── */}
                  {error && (
                    <div className="flex items-center gap-2.5 p-3 bg-rose-500/[0.08] border border-rose-500/20 rounded-xl text-rose-400 text-[11px]" role="alert">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                      {error}
                    </div>
                  )}
                  {successMsg && (
                    <div className="flex items-center gap-2.5 p-3 bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl text-emerald-400 text-[11px]" role="status">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                      {successMsg}
                    </div>
                  )}
                  {submitDecision.isPending && (
                    <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      Enregistrement dans la piste d'audit…
                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
