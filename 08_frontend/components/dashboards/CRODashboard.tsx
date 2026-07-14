'use client'
import * as React from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import {
  Download, AlertCircle, Loader2, RefreshCw, TrendingUp, TrendingDown,
  ShieldAlert, Brain, Clock, Users, BarChart2, Activity, AlertTriangle,
  Info, Zap, Flame, CheckCircle2, ArrowRight,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { KPIBlock, StatusBadge, LiveBadge, SectionHeader, Btn } from '@/components/ui'
import { fetchApi } from '@/lib/api-client'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined, digits = 1) =>
  v == null ? '—' : v.toFixed(digits)

const fmtM = (v: number | null | undefined) =>
  v == null ? '—' : `${v.toFixed(1)} Mds XAF`

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0, duration: 0.45 } },
} as const

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
} as const

// ── Sub-components ────────────────────────────────────────────────────────────

function EclTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0a0a0a] border border-white/[0.1] rounded-xl p-3 shadow-xl text-xs backdrop-blur-md">
      <p className="text-zinc-500 font-mono uppercase tracking-wider mb-1">{label}</p>
      <p className="text-brand-400 font-bold">{fmtM(payload[0]?.value)} ECL cumulé</p>
      {payload[1] && <p className="text-blue-400">{fmtM(payload[1]?.value)} nouvelles originations</p>}
    </div>
  )
}

// Severity — icône + couleur + texte (triple redondance WCAG)
const SEV_CFG = {
  CRITICAL: { Icon: ShieldAlert, color: 'text-rose-400',  bg: 'bg-rose-500/10',  border: 'border-rose-500/20'  },
  WARNING:  { Icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  INFO:     { Icon: Info,          color: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/20'  },
} as const

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEV_CFG[severity as keyof typeof SEV_CFG] ?? SEV_CFG.INFO
  const { Icon, color, bg, border } = cfg
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${color} ${bg} ${border}`}>
      <Icon className="w-2.5 h-2.5 flex-shrink-0" aria-hidden="true" />
      {severity}
    </span>
  )
}

function PriorityBadge({ priority, sla }: { priority: string; sla: boolean }) {
  if (sla) return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400">
      <Flame className="w-2.5 h-2.5" aria-hidden="true" /> SLA BREACH
    </span>
  )
  if (priority === 'URGENT') return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400">
      <Zap className="w-2.5 h-2.5" aria-hidden="true" /> URGENT
    </span>
  )
  if (priority === 'HIGH') return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400">
      <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" /> HIGH
    </span>
  )
  return <span className="text-[9px] font-mono text-zinc-600">—</span>
}

function ModelHealthPill({ status, auc }: { status: string | null; auc: number | null }) {
  const ok = status === 'HEALTHY'
  return (
    <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
      {status ?? 'N/A'} {auc != null ? `· AUC ${(auc).toFixed(3)}` : ''}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CRODashboard() {
  // ── Data fetching ─────────────────────────────────────────────────────────
  const kpiQ = useQuery({
    queryKey: ['counterparty-kpis'],
    queryFn: () => fetchApi('/counterparties/kpis'),
    refetchInterval: 60_000,
  })

  const summaryQ = useQuery({
    queryKey: ['monitoring-dashboard-summary'],
    queryFn: () => fetchApi('/monitoring/dashboard-summary'),
    refetchInterval: 60_000,
  })

  const eclTrendQ = useQuery({
    queryKey: ['ecl-trend'],
    queryFn: () => fetchApi('/compliance/reports/ecl-trend?months=12'),
  })

  const alertsQ = useQuery({
    queryKey: ['monitoring-alerts'],
    queryFn: () => fetchApi('/monitoring/alerts?resolved=false'),
    refetchInterval: 30_000,
  })

  const queueQ = useQuery({
    queryKey: ['decisions-queue'],
    queryFn: () => fetchApi('/decisions/queue?limit=10'),
    refetchInterval: 30_000,
  })

  const kpis = kpiQ.data
  const summary = summaryQ.data
  const eclTrend: any[] = eclTrendQ.data ?? []
  const alerts: any[] = alertsQ.data?.slice(0, 5) ?? []
  const queue: any[] = queueQ.data ?? []

  // Coverage ratio computed client-side
  const coverageRatio = kpis?.totalExposure > 0
    ? ((kpis.totalEL / kpis.totalExposure) * 100).toFixed(2)
    : null

  // ECL trend fallback: if no real data yet, show flat line at current EL
  const chartData = eclTrend.length > 0
    ? eclTrend
    : kpis
      ? [{ label: 'Now', cumulativeEcl: kpis.totalEL, newEcl: 0 }]
      : []

  const isAnyLoading = kpiQ.isLoading || summaryQ.isLoading
  const refetchAll = () => { kpiQ.refetch(); summaryQ.refetch(); eclTrendQ.refetch(); alertsQ.refetch(); queueQ.refetch() }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-5 pb-12">

      {/* ── Header ── */}
      <SectionHeader
        title="Risk Intelligence"
        subtitle="CRO COMMAND CENTER — IFRS 9 / COBAC"
        badge={<LiveBadge />}
        actions={
          <div className="flex items-center gap-3">
            {summary && (
              <ModelHealthPill
                status={summary.model?.status ?? null}
                auc={summary.model?.auc ?? null}
              />
            )}
            {(kpiQ.isError || summaryQ.isError) && (
              <button onClick={refetchAll} className="flex items-center gap-2 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 hover:bg-amber-500/20 transition-colors">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            )}
            <Btn variant="secondary" size="md">
              <Download className="w-3.5 h-3.5" /> Export Report
            </Btn>
          </div>
        }
      />

      {/* ── Row 1: 6 KPI cards ── */}
      <div className="grid grid-cols-6 gap-3">
        {isAnyLoading ? (
          <div className="col-span-6 flex items-center justify-center h-24">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
          </div>
        ) : (
          <>
            <motion.div variants={item} className="col-span-1">
              <KPIBlock
                label="Portfolio EAD"
                value={<span className="tabular-nums text-2xl">{fmtM(kpis?.totalExposure)}</span>}
                accent="emerald"
                icon={<BarChart2 className="w-4 h-4" />}
              />
            </motion.div>

            <motion.div variants={item} className="col-span-1">
              <KPIBlock
                label="ECL Portefeuille (IFRS 9)"
                value={<span className="tabular-nums text-2xl">{fmtM(kpis?.totalEL)}</span>}
                accent="rose"
                icon={<TrendingUp className="w-4 h-4" />}
                sub={<span className="text-[10px] text-zinc-600">Provision stock cumulée</span>}
              />
            </motion.div>

            <motion.div variants={item} className="col-span-1">
              <KPIBlock
                label="Coverage Ratio ECL/EAD"
                value={<span className="tabular-nums text-2xl">{coverageRatio != null ? `${coverageRatio}%` : '—'}</span>}
                accent={parseFloat(coverageRatio ?? '0') < 1 ? 'amber' : 'emerald'}
                icon={<Activity className="w-4 h-4" />}
                sub={<span className="text-[10px] text-zinc-600">Seuil prudentiel ≥ 1%</span>}
              />
            </motion.div>

            <motion.div variants={item} className="col-span-1">
              <KPIBlock
                label="Override Rate (30j)"
                value={<span className={`tabular-nums text-2xl ${(summary?.overrideRate ?? 0) > 15 ? 'text-rose-400' : (summary?.overrideRate ?? 0) > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {summary ? `${fmt(summary.overrideRate)}%` : '—'}
                </span>}
                accent="amber"
                icon={<ShieldAlert className="w-4 h-4" />}
                sub={<span className="text-[10px] text-zinc-600">{summary?.overrideCount ?? '—'} / {summary?.totalDecisions30d ?? '—'} décisions</span>}
              />
            </motion.div>

            <motion.div variants={item} className="col-span-1">
              <KPIBlock
                label="Modèle ML — Gini"
                value={<span className={`tabular-nums text-2xl ${(summary?.model?.gini ?? 0) >= 45 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {summary?.model?.gini != null ? `${fmt(summary.model.gini)}%` : '—'}
                </span>}
                accent="blue"
                icon={<Brain className="w-4 h-4" />}
                sub={<span className="text-[10px] text-zinc-600">Floor MRM: 45% | PSI {summary?.model?.psi != null ? fmt(summary.model.psi, 3) : '—'}</span>}
              />
            </motion.div>

            <motion.div variants={item} className="col-span-1">
              <KPIBlock
                label="Watchlist + Stage 2/3"
                value={<span className={`tabular-nums text-2xl ${(summary?.stageAtRiskCount ?? 0) > 5 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {summary ? summary.stageAtRiskCount : '—'}
                </span>}
                accent="rose"
                icon={<AlertTriangle className="w-4 h-4" />}
                sub={<span className="text-[10px] text-zinc-600">S2: {summary?.stage2Count ?? '—'} · S3: {summary?.stage3Count ?? '—'} · WL: {summary?.watchlistCount ?? '—'}</span>}
              />
            </motion.div>
          </>
        )}
      </div>

      {/* ── Row 2: ECL Trend + IFRS 9 Stages ── */}
      <div className="grid grid-cols-12 gap-4">

        {/* ECL Trend — données réelles */}
        <motion.div variants={item} className="col-span-8 card-glow p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-sm font-bold text-white">ECL Évolution — Stock Provisions</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {eclTrend.length > 0
                  ? `Données réelles sur ${eclTrend.length} mois depuis les snapshots de décision`
                  : 'En attente de décisions avec scoringSnapshot.ecl — données insuffisantes'}
              </p>
            </div>
            {eclTrendQ.isLoading && <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />}
          </div>

          {eclTrend.length === 0 && !eclTrendQ.isLoading && (
            <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-[11px] text-amber-400">
                Aucun historique ECL disponible — soumettre des décisions avec scoring ML pour alimenter le graphique.
              </p>
            </div>
          )}

          <div className="h-[200px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="eclGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3ECF8E" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3ECF8E" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#52525b' }} tickLine={false} axisLine={false} dy={6} />
                <YAxis tick={{ fontSize: 10, fill: '#52525b' }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(1)} Mds`} />
                <Tooltip content={<EclTooltip />} cursor={{ stroke: 'rgba(59,123,255,0.15)', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="cumulativeEcl" stroke="#3ECF8E" strokeWidth={2.5}
                  fill="url(#eclGrad)" dot={false} activeDot={{ r: 5, fill: '#3ECF8E' }} name="ECL cumulé" />
                <Area type="monotone" dataKey="newEcl" stroke="#60a5fa" strokeWidth={1.5}
                  fill="url(#newGrad)" dot={false} activeDot={{ r: 4, fill: '#60a5fa' }} name="Nouvelles originations" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500"><span className="w-3 h-0.5 bg-brand-400 inline-block rounded" /> ECL stock cumulé</span>
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500"><span className="w-3 h-0.5 bg-blue-400 inline-block rounded" /> Nouvelles originations ECL</span>
          </div>
        </motion.div>

        {/* IFRS 9 Stage Allocation */}
        <motion.div variants={item} className="col-span-4 card-glow p-5">
          <h3 className="text-sm font-bold text-white mb-0.5">Allocation IFRS 9</h3>
          <p className="text-[10px] text-zinc-500 mb-4">Répartition par stade de dépréciation</p>

          {kpiQ.isLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>
          ) : (
            <>
              <div className="space-y-3">
                {[
                  { stage: 'Stage 1', pct: kpis?.stage1Pct ?? 0, color: '#3ECF8E', label: 'Sain (12M ECL)', count: summary?.stage2Count != null ? kpis?.totalCounterparties - summary.stage2Count - summary.stage3Count : null },
                  { stage: 'Stage 2', pct: kpis?.stage2Pct ?? 0, color: '#f59e0b', label: 'SICR détecté', count: summary?.stage2Count },
                  { stage: 'Stage 3', pct: kpis?.stage3Pct ?? 0, color: '#f43f5e', label: 'Défaut (LT ECL)', count: summary?.stage3Count },
                ].map(({ stage, pct, color, label, count }) => (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-zinc-300">{stage}</span>
                      <div className="flex items-center gap-2">
                        {count != null && <span className="text-[10px] text-zinc-600">{count} cpties</span>}
                        <span className="text-[11px] font-mono font-bold" style={{ color }}>{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(pct, 1)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                    <p className="text-[9px] text-zinc-600 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Coverage Ratio bar */}
              <div className="mt-4 pt-4 border-t border-white/[0.04]">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-zinc-500">Coverage Ratio</span>
                  <span className={`font-mono font-bold ${parseFloat(coverageRatio ?? '0') >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>{coverageRatio ?? '—'}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${Math.min(parseFloat(coverageRatio ?? '0') * 10, 100)}%` }} />
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ── Row 3: Alerts + Override/Fallback metrics ── */}
      <div className="grid grid-cols-12 gap-4">

        {/* Real alerts from /monitoring/alerts */}
        <motion.div variants={item} className="col-span-5 card-glow p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">Alertes Actives</h3>
            </div>
            {alertsQ.isLoading && <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />}
            {alerts.length > 0 && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400">{alerts.length} actives</span>
            )}
          </div>

          {alerts.length === 0 && !alertsQ.isLoading ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-zinc-500 text-xs">Aucune alerte active</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* CRO view — max 3 alertes, triées par sévérité */}
              {[...alerts]
                .sort((a, b) => {
                  const order: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 }
                  return (order[a.severity] ?? 3) - (order[b.severity] ?? 3)
                })
                .slice(0, 3)
                .map((a: any) => {
                  const cfg = SEV_CFG[a.severity as keyof typeof SEV_CFG] ?? SEV_CFG.INFO
                  const { Icon, color, bg, border } = cfg
                  return (
                    <div key={a.id} className={`flex gap-2.5 p-3 rounded-lg border ${border} ${bg}`}>
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${color}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <SeverityBadge severity={a.severity} />
                          <span className="text-[9px] font-mono text-zinc-700">
                            {new Date(a.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-zinc-200 truncate">{a.message}</p>
                        {a.detail && <p className="text-[10px] text-zinc-600 mt-0.5 line-clamp-1">{a.detail}</p>}
                      </div>
                    </div>
                  )
                })}
              {alerts.length > 3 && (
                <p className="text-[10px] text-zinc-600 text-center pt-1 flex items-center justify-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  {alerts.length - 3} alerte{alerts.length - 3 > 1 ? 's' : ''} supplémentaire{alerts.length - 3 > 1 ? 's' : ''} — voir Alert Center
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Override Rate + Fallback + Model metrics */}
        <motion.div variants={item} className="col-span-7 card-glow p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Gouvernance MRM</h3>
            <span className="text-[10px] text-zinc-600 ml-auto">Basel II Pillar 2 · IFRS 9 §B5.5</span>
          </div>

          {summaryQ.isLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Override Rate bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-400 font-medium">Override Rate (30j)</span>
                  <span className={`font-mono font-bold ${(summary?.overrideRate ?? 0) > 15 ? 'text-rose-400' : (summary?.overrideRate ?? 0) > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {summary ? `${fmt(summary.overrideRate)}%` : '—'}
                  </span>
                </div>
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(summary?.overrideRate ?? 0, 100)}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full rounded-full ${(summary?.overrideRate ?? 0) > 15 ? 'bg-rose-500/60' : (summary?.overrideRate ?? 0) > 5 ? 'bg-amber-500/60' : 'bg-emerald-500/60'}`} />
                </div>
                <p className="text-[9px] text-zinc-600">Seuil MRM: ≤ 15% · {summary?.overrideCount ?? '—'}/{summary?.totalDecisions30d ?? '—'} décisions</p>
              </div>

              {/* Fallback Rate */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-400 font-medium">Fallback Engine Rate</span>
                  <span className={`font-mono font-bold ${(summary?.fallbackRate ?? 0) > 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {summary ? `${fmt(summary.fallbackRate)}%` : '—'}
                  </span>
                </div>
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(summary?.fallbackRate ?? 0, 100)}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full rounded-full ${(summary?.fallbackRate ?? 0) > 10 ? 'bg-rose-500/60' : 'bg-emerald-500/60'}`} />
                </div>
                <p className="text-[9px] text-zinc-600">
                  Flag: <span className={summary?.fallbackGovernanceFlag === 'REVIEW_REQUIRED' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>{summary?.fallbackGovernanceFlag ?? '—'}</span>
                </p>
              </div>

              {/* Model AUC / Gini */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-400 font-medium">Modèle Gini</span>
                  <span className={`font-mono font-bold ${(summary?.model?.gini ?? 0) >= 45 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {summary?.model?.gini != null ? `${fmt(summary.model.gini)}%` : '—'}
                  </span>
                </div>
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(summary?.model?.gini ?? 0, 100)}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full rounded-full ${(summary?.model?.gini ?? 0) >= 45 ? 'bg-emerald-500/60' : 'bg-amber-500/60'}`} />
                </div>
                <p className="text-[9px] text-zinc-600">Floor MRM 45% · AUC {summary?.model?.auc != null ? fmt(summary.model.auc, 3) : '—'} · KS {summary?.model?.ks != null ? fmt(summary.model.ks, 3) : '—'}</p>
              </div>

              {/* PSI */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-400 font-medium">PSI (drift)</span>
                  <span className={`font-mono font-bold ${(summary?.model?.psi ?? 0) > 0.25 ? 'text-rose-400' : (summary?.model?.psi ?? 0) > 0.10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {summary?.model?.psi != null ? fmt(summary.model.psi, 4) : '—'}
                  </span>
                </div>
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((summary?.model?.psi ?? 0) * 400, 100)}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full rounded-full ${(summary?.model?.psi ?? 0) > 0.25 ? 'bg-rose-500/60' : (summary?.model?.psi ?? 0) > 0.10 ? 'bg-amber-500/60' : 'bg-emerald-500/60'}`} />
                </div>
                <p className="text-[9px] text-zinc-600">Warn: 0.10 · Critical: 0.25 · {summary?.model?.status ?? '—'}</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Row 4: Decision Queue with SLA + Priority ── */}
      <motion.div variants={item} className="card-glow overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-bold text-white">File d'Attente Décisions</h3>
            {summary?.pendingDecisions != null && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${summary.pendingDecisions > 20 ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' : 'border-zinc-700 text-zinc-500'}`}>
                {summary.pendingDecisions} en attente
              </span>
            )}
          </div>
          {queueQ.isLoading && <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />}
        </div>

        {queueQ.isError ? (
          <div className="flex items-center gap-2 p-5 text-zinc-500 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            Impossible de charger la file — backend hors ligne.
          </div>
        ) : queue.length === 0 && !queueQ.isLoading ? (
          <div className="flex items-center justify-center h-20 text-zinc-600 text-sm">
            <Activity className="w-4 h-4 mr-2" /> Aucune décision en attente
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Contrepartie', 'Montant', 'PD', 'Stage IFRS 9', 'Âge / SLA', 'Priorité'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-zinc-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queue.map((d: any) => {
                  const pdColor = d.pd != null
                    ? d.pd > 6 ? 'text-rose-400' : d.pd > 3 ? 'text-amber-400' : 'text-emerald-400'
                    : 'text-zinc-600'
                  const ifrs9Status = d.ifrs9Stage === 'STAGE_3' ? 'HIGH'
                    : d.ifrs9Stage === 'STAGE_2' ? 'MED'
                    : 'LOW'
                  return (
                    <tr key={d.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${d.slaBreached ? 'bg-rose-500/[0.03]' : ''}`}>
                      {/* Contrepartie + ref */}
                      <td className="px-4 py-3 max-w-[180px]">
                        <div className="font-medium text-white truncate">{d.counterpartyName ?? '—'}</div>
                        <div className="text-[9px] font-mono text-zinc-600 mt-0.5">{d.reqId ?? d.id?.slice(0, 8)}</div>
                      </td>
                      {/* Montant */}
                      <td className="px-4 py-3 font-mono font-semibold text-white whitespace-nowrap">
                        {d.requestedAmount != null ? fmtM(d.requestedAmount) : '—'}
                      </td>
                      {/* PD — couleur + valeur + icône pour daltoniens */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 font-mono font-bold text-[11px] ${pdColor}`}>
                          {d.pd != null && d.pd > 4 && <AlertTriangle className="w-3 h-3" aria-hidden="true" />}
                          {d.pd != null ? `${fmt(d.pd, 2)}%` : '—'}
                        </span>
                      </td>
                      {/* Stage IFRS 9 — StatusBadge partagé */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {d.ifrs9Stage
                          ? <StatusBadge status={ifrs9Status} size="sm" />
                          : <span className="text-zinc-600">—</span>
                        }
                      </td>
                      {/* Âge */}
                      <td className="px-4 py-3 font-mono whitespace-nowrap">
                        <span className={
                          d.slaBreached ? 'text-rose-400 font-bold' :
                          d.ageInDays >= 7 ? 'text-amber-400 font-bold' :
                          d.ageInDays >= 3 ? 'text-amber-400' : 'text-zinc-400'
                        }>
                          {d.ageInDays ?? '—'}j
                        </span>
                      </td>
                      {/* Priorité */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <PriorityBadge priority={d.priority} sla={d.slaBreached} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

    </motion.div>
  )
}
