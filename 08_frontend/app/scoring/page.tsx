'use client'
import * as React from 'react'
import { useState } from 'react'
import { Play, RotateCcw, Loader2, AlertTriangle, BrainCircuit, ShieldCheck, TrendingUp, Activity } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '@/lib/api-client'

const SECTORS = ['Agriculture', 'Energy', 'Manufacturing', 'Retail', 'Technology', 'Transport', 'Healthcare', 'Finance', 'Real Estate', 'Other']
const RATINGS = ['AAA', 'AA_PLUS', 'AA', 'AA_MINUS', 'A_PLUS', 'A', 'A_MINUS', 'BBB_PLUS', 'BBB', 'BBB_MINUS', 'BB_PLUS', 'BB', 'B', 'CCC']
const RISK_LEVELS = ['LOW', 'MED', 'HIGH', 'CRITICAL']
const FACILITY_TYPES = ['TERM_LOAN', 'REVOLVING_CREDIT', 'TRADE_FINANCE', 'GUARANTEE', 'LEASING']
const COLLATERAL_TYPES = ['REAL_ESTATE', 'EQUIPMENT', 'RECEIVABLES', 'CASH', 'NONE']

const DEFAULT_FORM = {
  requestedAmount: 10,
  exposure: 10,
  pdCurrent: 2.5,
  riskLevel: 'MED',
  sector: 'Manufacturing',
  internalRating: 'BBB',
  yearsInBusiness: 8,
  watchlistFlag: false,
  revenue: 50,
  ebitda: 8,
  totalDebt: 20,
  operatingCashFlow: 6,
  collateralValue: 15,
  collateralType: 'REAL_ESTATE',
  tenorMonths: 36,
  facilityType: 'TERM_LOAN',
  daysPastDue: 0,
  missedPayments24m: 0,
  bureauScore: 680,
}

function QualityBadge({ band }: { band: string }) {
  const cfg = {
    HIGH:   { color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', label: 'HIGH QUALITY' },
    MEDIUM: { color: 'bg-amber-500/10 border-amber-500/30 text-amber-400', label: 'MEDIUM QUALITY' },
    LOW:    { color: 'bg-rose-500/10 border-rose-500/30 text-rose-400', label: 'LOW QUALITY' },
  }[band] ?? { color: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400', label: band }
  return <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${cfg.color}`}>{cfg.label}</span>
}

function RecommendationBadge({ rec }: { rec: string }) {
  const cfg: Record<string, string> = {
    APPROVE: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    APPROVE_WITH_CONDITIONS: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    SEND_TO_REVIEW: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    REJECT: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
  }
  return (
    <span className={`text-sm font-bold px-3 py-1.5 rounded-lg border ${cfg[rec] ?? 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400'}`}>
      {rec.replace(/_/g, ' ')}
    </span>
  )
}

type FormState = typeof DEFAULT_FORM

export default function ScoringPage() {
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM })

  const mutation = useMutation({
    mutationFn: (payload: FormState) => fetchApi('/scoring/adhoc', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  })

  const set = (k: keyof FormState, v: any) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleScore = () => mutation.mutate(form)
  const handleReset = () => { setForm({ ...DEFAULT_FORM }); mutation.reset() }

  const result = mutation.data
  const xai: any[] = result?.xaiDrivers ?? []
  const riskDrivers = xai.filter((d: any) => d.direction === 'negative').slice(0, 5)
  const mitigants = xai.filter((d: any) => d.direction === 'positive').slice(0, 5)
  const maxImpact = Math.max(...xai.map((d: any) => Math.abs(d.impact)), 0.001)

  return (
    <div className="max-w-[1280px] mx-auto p-6 pb-16 space-y-6 page-enter">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Scoring Sandbox</h1>
          <p className="text-zinc-500 text-sm mt-1">Évaluation PD ad-hoc — moteur Python + SHAP, sans application préalable</p>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.04] text-sm font-medium transition-colors">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          )}
          <button
            onClick={handleScore}
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {mutation.isPending ? 'Scoring...' : 'Run Score'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">

        {/* ── Left: Form ── */}
        <div className="col-span-4 space-y-4">

          {/* Facility */}
          <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Facilité de Crédit</h3>
            <div className="space-y-3">
              <Field label="Montant demandé ($M)" value={form.requestedAmount} onChange={v => set('requestedAmount', +v)} type="number" />
              <Field label="Exposition totale ($M)" value={form.exposure} onChange={v => set('exposure', +v)} type="number" />
              <Field label="PD courante (%)" value={form.pdCurrent} onChange={v => set('pdCurrent', +v)} type="number" step="0.1" />
              <SelectField label="Niveau de risque" value={form.riskLevel} onChange={v => set('riskLevel', v)} options={RISK_LEVELS} />
              <SelectField label="Type de facilité" value={form.facilityType} onChange={v => set('facilityType', v)} options={FACILITY_TYPES} />
              <Field label="Durée (mois)" value={form.tenorMonths} onChange={v => set('tenorMonths', +v)} type="number" />
              <SelectField label="Type de collatéral" value={form.collateralType} onChange={v => set('collateralType', v)} options={COLLATERAL_TYPES} />
              <Field label="Valeur collatéral ($M)" value={form.collateralValue} onChange={v => set('collateralValue', +v)} type="number" />
            </div>
          </div>

          {/* Counterparty */}
          <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Contrepartie</h3>
            <div className="space-y-3">
              <SelectField label="Secteur" value={form.sector} onChange={v => set('sector', v)} options={SECTORS} />
              <SelectField label="Rating interne" value={form.internalRating} onChange={v => set('internalRating', v)} options={RATINGS} />
              <SelectField label="Niveau de risque" value={form.riskLevel} onChange={v => set('riskLevel', v)} options={RISK_LEVELS} />
              <Field label="Années d'activité" value={form.yearsInBusiness} onChange={v => set('yearsInBusiness', +v)} type="number" />
              <div className="flex items-center justify-between py-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Watchlist</span>
                <button
                  onClick={() => set('watchlistFlag', !form.watchlistFlag)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${form.watchlistFlag ? 'bg-rose-500' : 'bg-zinc-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all shadow ${form.watchlistFlag ? 'left-5' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Données Financières ($M)</h3>
            <div className="space-y-3">
              <Field label="Chiffre d'affaires" value={form.revenue} onChange={v => set('revenue', +v)} type="number" />
              <Field label="EBITDA" value={form.ebitda} onChange={v => set('ebitda', +v)} type="number" />
              <Field label="Dette totale" value={form.totalDebt} onChange={v => set('totalDebt', +v)} type="number" />
              <Field label="Cash flow opérationnel" value={form.operatingCashFlow} onChange={v => set('operatingCashFlow', +v)} type="number" />
            </div>
          </div>

          {/* Behavior */}
          <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Historique de Crédit</h3>
            <div className="space-y-3">
              <Field label="Jours en retard (DPD)" value={form.daysPastDue} onChange={v => set('daysPastDue', +v)} type="number" />
              <Field label="Impayés (24 mois)" value={form.missedPayments24m} onChange={v => set('missedPayments24m', +v)} type="number" />
              <Field label="Score bureau" value={form.bureauScore} onChange={v => set('bureauScore', +v)} type="number" />
            </div>
          </div>
        </div>

        {/* ── Right: Results ── */}
        <div className="col-span-8 space-y-4">

          {mutation.isError && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center gap-3 text-rose-400 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              {(mutation.error as Error).message}
            </div>
          )}

          {!result && !mutation.isPending && !mutation.isError && (
            <div className="bg-[#0d0d0d] border-2 border-dashed border-white/[0.06] rounded-2xl flex flex-col items-center justify-center min-h-[400px] text-center gap-4">
              <BrainCircuit className="w-12 h-12 text-zinc-700" />
              <div>
                <p className="text-zinc-400 font-semibold">Prêt à scorer</p>
                <p className="text-zinc-600 text-sm mt-1">Configurez la facilité et la contrepartie, puis cliquez sur Run Score</p>
              </div>
            </div>
          )}

          {mutation.isPending && (
            <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl flex flex-col items-center justify-center min-h-[400px] gap-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-zinc-400 text-sm font-medium">Calcul PD en cours — moteur Python...</p>
            </div>
          )}

          {result && (
            <>
              {/* KPI Row */}
              <div className="grid grid-cols-4 gap-4">
                <KPICard label="PD Score" value={`${result.pdScore?.toFixed(2)}%`}
                  color={result.pdScore > 6 ? 'text-rose-400' : result.pdScore > 3 ? 'text-amber-400' : 'text-emerald-400'}
                  icon={<Activity className="w-4 h-4" />} />
                <KPICard label="Recommandation" value={<RecommendationBadge rec={result.recommendation} />}
                  icon={<ShieldCheck className="w-4 h-4" />} />
                <KPICard label="Confiance" value={`${(result.confidence * 100).toFixed(0)}%`}
                  color="text-blue-400" icon={<TrendingUp className="w-4 h-4" />} />
                <KPICard label="Qualité données" value={<QualityBadge band={result.qualityBand} />}
                  icon={<BrainCircuit className="w-4 h-4" />} />
              </div>

              {/* Rationale */}
              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-5">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Rationale</h3>
                <p className="text-sm text-zinc-300 leading-relaxed">{result.rationale}</p>
                <div className="mt-3 flex items-center gap-3 text-[10px] text-zinc-600">
                  <span>Moteur: <span className="text-zinc-400 font-mono">{result.engine}</span></span>
                  <span>•</span>
                  <span>Version: <span className="text-zinc-400 font-mono">{result.modelVersion}</span></span>
                  <span>•</span>
                  <span>Scoré par: <span className="text-zinc-400 font-mono">{result.scoredBy}</span></span>
                </div>
              </div>

              {/* XAI Drivers */}
              {xai.length > 0 && (
                <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Facteurs SHAP</h3>
                    <span className="text-[10px] font-mono text-zinc-600 bg-white/[0.04] px-2 py-1 rounded">
                      {result.featureLineage?.imputedCount ?? 0} features imputées / {(result.featureLineage?.rawCount ?? 0) + (result.featureLineage?.derivedCount ?? 0) + (result.featureLineage?.imputedCount ?? 0)} total
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-xs font-semibold text-rose-400 mb-3 flex items-center gap-1">↗ Facteurs aggravants</p>
                      <div className="space-y-3">
                        {riskDrivers.length === 0 ? <p className="text-zinc-600 text-xs">Aucun</p> : riskDrivers.map((d: any) => (
                          <div key={d.label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-zinc-300 font-medium truncate mr-2">{d.label}</span>
                              <span className="text-rose-400 font-mono flex-shrink-0">+{Math.abs(d.impact).toFixed(3)}</span>
                            </div>
                            <div className="h-1.5 bg-white/[0.04] rounded-full">
                              <div className="h-full bg-rose-500/70 rounded-full transition-all duration-500"
                                style={{ width: `${(Math.abs(d.impact) / maxImpact) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-emerald-400 mb-3 flex items-center gap-1">↘ Facteurs atténuants</p>
                      <div className="space-y-3">
                        {mitigants.length === 0 ? <p className="text-zinc-600 text-xs">Aucun</p> : mitigants.map((d: any) => (
                          <div key={d.label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-zinc-300 font-medium truncate mr-2">{d.label}</span>
                              <span className="text-emerald-400 font-mono flex-shrink-0">-{Math.abs(d.impact).toFixed(3)}</span>
                            </div>
                            <div className="h-1.5 bg-white/[0.04] rounded-full">
                              <div className="h-full bg-emerald-500/70 rounded-full transition-all duration-500"
                                style={{ width: `${(Math.abs(d.impact) / maxImpact) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Lineage */}
              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-5">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Lignée des Features</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'RAW', count: result.featureLineage?.rawCount ?? 0, color: 'bg-emerald-500' },
                    { label: 'DÉRIVÉES', count: result.featureLineage?.derivedCount ?? 0, color: 'bg-blue-500' },
                    { label: 'IMPUTÉES', count: result.featureLineage?.imputedCount ?? 0, color: 'bg-amber-500' },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="bg-white/[0.02] rounded-xl p-4">
                      <div className={`w-2 h-2 rounded-full ${color} mb-2`} />
                      <div className="text-2xl font-black text-white tabular-nums">{count}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">{label}</div>
                    </div>
                  ))}
                </div>
                {result.featureLineage?.imputedFeatures?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/[0.04]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Features imputées (top 10)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.featureLineage.imputedFeatures.slice(0, 10).map((f: string) => (
                        <span key={f} className="text-[9px] font-mono bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', step }: {
  label: string; value: any; onChange: (v: string) => void; type?: string; step?: string
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">{label}</label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#141414] border border-white/[0.08] text-sm text-white rounded-lg px-3 py-2 outline-none focus:border-blue-500/50 transition-colors"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: readonly string[]
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#141414] border border-white/[0.08] text-sm text-white rounded-lg px-3 py-2 outline-none focus:border-blue-500/50 transition-colors"
      >
        {options.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
      </select>
    </div>
  )
}

function KPICard({ label, value, color, icon }: { label: string; value: React.ReactNode; color?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{label}</span>
        <span className="text-zinc-600">{icon}</span>
      </div>
      <div className={`text-lg font-black tabular-nums ${color ?? 'text-white'}`}>{value}</div>
    </div>
  )
}
