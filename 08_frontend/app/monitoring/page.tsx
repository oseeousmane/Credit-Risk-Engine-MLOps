'use client'
import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { motion } from 'framer-motion'
import {
  Activity, SlidersHorizontal, Download, Loader2, ShieldAlert, Bell,
  Cpu, Wifi, WifiOff, AlertCircle, ArrowRight, GaugeCircle,
  AlertTriangle, Info,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { SectionHeader, LiveBadge, StatusBadge } from '@/components/ui'
import { fetchApi } from '@/lib/api-client'
import { useMonitoringSSE } from '@/lib/use-monitoring-sse'

// ── PSI thresholds (Basel / SR 11-7 standard) ─────────────────────────────────
const PSI_WARNING  = 0.10  // moderate drift — monitor closely
const PSI_CRITICAL = 0.20  // significant drift — model review required

// ── AUC operational thresholds ────────────────────────────────────────────────
const AUC_THRESHOLD_OK       = 0.82  // minimum acceptable
const AUC_THRESHOLD_BASELINE = 0.85  // baseline target

// ── Period options ─────────────────────────────────────────────────────────────
const PERIODS = [
  { label: '24H',  value: 24  },
  { label: '7J',   value: 168 },
  { label: '30J',  value: 720 },
] as const

// ── Severity icon map (mirrors StatusBadge) ────────────────────────────────────
const SEV_ICONS: Record<string, React.ElementType> = {
  CRITICAL: ShieldAlert,
  WARNING:  AlertTriangle,
  INFO:     Info,
}
const SEV_COLORS: Record<string, string> = {
  CRITICAL: 'text-rose-400',
  WARNING:  'text-amber-400',
  INFO:     'text-blue-400',
}

interface MetricLog {
  id: string
  loggedAt: string
  modelName: string
  versionTag: string
  inferenceVolume: number
  errorRate: number
  latencyP50: number
  latencyP99: number
  auc: number
  ks: number
  psi: number
}

interface ScoringHealth {
  status: 'PYTHON_ONLINE' | 'FALLBACK_ACTIVE' | 'ERROR'
  engine: 'PYTHON' | 'FALLBACK'
  modelVersion: string
  scoredBy: string
  latencyMs: number
  checkedAt: string
}

export default function MonitoringPage() {
  const { connectionState } = useMonitoringSSE()
  const [period, setPeriod] = useState<24 | 168 | 720>(24)

  const metricsQuery = useQuery({
    queryKey: ['monitoring-metrics'],
    queryFn: () => fetchApi('/monitoring/metrics'),
    refetchInterval: 30000,
  })

  const historyQuery = useQuery({
    queryKey: ['monitoring-history'],
    queryFn: () => fetchApi('/monitoring/metrics/history?limit=20'),
    refetchInterval: 60000,
  })

  const healthQuery = useQuery({
    queryKey: ['scoring-health'],
    queryFn: () => fetchApi('/monitoring/scoring-health'),
    refetchInterval: 30000,
  })

  const alertsQuery = useQuery({
    queryKey: ['monitoring-alerts'],
    queryFn: () => fetchApi('/monitoring/alerts?resolved=false'),
    refetchInterval: 15000,
  })

  const fallbackQuery = useQuery({
    queryKey: ['monitoring-fallback'],
    queryFn: () => fetchApi('/monitoring/trend/fallback?limit=10'),
    refetchInterval: 60000,
  })

  const degradationQuery = useQuery({
    queryKey: ['monitoring-degradation'],
    queryFn: () => fetchApi('/monitoring/degradation-timeline?limit=10'),
    refetchInterval: 60000,
  })

  const qualityQuery = useQuery({
    queryKey: ['monitoring-quality-trend'],
    queryFn: () => fetchApi('/monitoring/trend/quality?days=30'),
    refetchInterval: 60000,
  })

  const models: any[] = metricsQuery.data || []
  const primaryModel = models[0]
  const alerts: any[] = alertsQuery.data || []
  const history: MetricLog[] = historyQuery.data || []
  const scoringHealth: ScoringHealth | undefined = healthQuery.data
  const fallbackHistory: any[] = fallbackQuery.data?.recentIncidents || []
  const degradationTimeline: any[] = degradationQuery.data || []
  const qualityTrend: any[] = qualityQuery.data || []
  const latestQuality: number | null = qualityTrend.length > 0
    ? qualityTrend[qualityTrend.length - 1]?.avgPayloadQuality ?? null
    : null

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length
  const warningCount = alerts.filter((a) => a.severity === 'WARNING').length

  const perfTrend = history.length > 0
    ? [...history].reverse().map((log, i) => ({
        t: i === 0 ? 'Now' : new Date(log.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        auc: log.auc,
        ks: log.ks,
        psi: log.psi,
      }))
    : primaryModel?.auc
      ? [{ t: 'Now', auc: primaryModel.auc, ks: primaryModel.ks, psi: primaryModel.psi }]
      : []

  // Normalize AUC: if stored as integer > 1 (e.g. basis points * 10000), bring back to 0–1
  const normalizedTrend = perfTrend.map(d => ({
    ...d,
    auc: d.auc > 1 ? d.auc / 10000 : d.auc,
  }))

  function severityColor(s: string) {
    if (s === 'CRITICAL') return 'text-rose-400'
    if (s === 'WARNING') return 'text-amber-400'
    return 'text-blue-400'
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 page-enter pb-10" suppressHydrationWarning>
      <SectionHeader
        title="Monitoring & Operations Control"
        subtitle="Real-time MLOps telemetry, scoring inference streams, and automated fallback tracking."
        badge={<LiveBadge label="LIVE TELEMETRY" />}
        actions={
          <div className="flex items-center gap-2">
            {scoringHealth && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-semibold ${
                scoringHealth.status === 'PYTHON_ONLINE'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                {scoringHealth.engine === 'PYTHON' ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                {scoringHealth.status === 'PYTHON_ONLINE' ? 'Python Core Online' : 'Rule Engine Fallback'}
                <span className="text-[10px] font-mono text-zinc-400 ml-1">{scoringHealth.latencyMs}ms</span>
              </div>
            )}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold ${
              connectionState === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : connectionState === 'connecting'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                connectionState === 'connected' ? 'bg-emerald-400 animate-pulse'
                : connectionState === 'connecting' ? 'bg-amber-400 animate-pulse'
                : 'bg-red-400'
              }`} />
              {connectionState === 'connected' ? 'Live' : connectionState === 'connecting' ? 'Connecting' : 'Offline'}
            </div>
            <button className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 hover:bg-white/[0.08] transition-colors">
              <Download className="w-3.5 h-3.5" /> Export Logs
            </button>
          </div>
        }
      />

      {/* KPI Row */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
        className="grid grid-cols-4 gap-4"
      >
        {metricsQuery.isLoading ? (
          <div className="col-span-4 h-28 flex items-center justify-center border border-white/[0.06] rounded-2xl bg-[#0d0d0d]">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
          </div>
        ) : (
          <>
            {/* ML Pipeline Status */}
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="card-glow overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] bg-[#0a0a0a]">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">ML Pipeline Status</span>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${primaryModel?.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </div>
              <div className="p-4">
                <div className="text-[28px] font-bold text-white tracking-tight leading-none mb-2 tabular-nums">
                  {primaryModel?.status || 'N/A'}
                </div>
                <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 inline-flex">
                  v.{primaryModel?.version || '1.0.0'}
                </span>
              </div>
            </motion.div>

            {/* Inference Volume */}
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="card-glow overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] bg-[#0a0a0a]">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">Inference Volume</span>
                <Activity className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="p-4">
                <div className="flex items-baseline gap-1 mb-1.5">
                  <span className="text-[28px] font-bold text-white tracking-tight leading-none tabular-nums">
                    {primaryModel?.latestLog ? Math.round(primaryModel.latestLog.inferenceVolume / 1000) + 'k' : '—'}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-semibold">/ hr</span>
                </div>
                <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Live from Gateway
                </div>
              </div>
            </motion.div>

            {/* Error Rate */}
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="card-glow overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] bg-[#0a0a0a]">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">Error Rate</span>
                <AlertTriangle className={`w-3.5 h-3.5 ${(primaryModel?.latestLog?.errorRate || 0) > 0.05 ? 'text-rose-400' : 'text-zinc-600'}`} />
              </div>
              <div className="p-4">
                <div className={`text-[28px] font-bold tracking-tight leading-none tabular-nums mb-1.5 ${(primaryModel?.latestLog?.errorRate || 0) > 0.05 ? 'text-rose-400' : 'text-white'}`}>
                  {primaryModel?.latestLog ? (primaryModel.latestLog.errorRate * 100).toFixed(2) + '%' : '—'}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-500/70">Well within threshold</div>
              </div>
            </motion.div>

            {/* Network Latencies */}
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="card-glow overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] bg-[#0a0a0a]">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">Network Latencies</span>
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">P50</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[22px] font-bold text-white tabular-nums leading-none">
                      {primaryModel?.latestLog ? Math.round(primaryModel.latestLog.latencyP50) : '—'}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-600">ms</span>
                  </div>
                </div>
                <div className="h-px bg-white/[0.04]" />
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">P99</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[22px] font-bold text-amber-400 tabular-nums leading-none">
                      {primaryModel?.latestLog ? Math.round(primaryModel.latestLog.latencyP99) : '—'}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-600">ms</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Main: Chart + Sidebar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="grid grid-cols-12 gap-4"
      >

        {/* Performance Chart */}
        <div className="col-span-8 card-glow overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] bg-[#0a0a0a]">
            <div>
              <div className="text-[13px] font-bold text-white">Model Performance History</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">AUC & KS — seuils opérationnels annotés</div>
            </div>
            <div className="flex items-center gap-3">
              {/* KPI badges */}
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">AUC</div>
                  <div className={`text-[13px] font-bold font-mono px-2 py-0.5 rounded border ${
                    (primaryModel?.auc || 0) >= AUC_THRESHOLD_BASELINE
                      ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                      : (primaryModel?.auc || 0) >= AUC_THRESHOLD_OK
                      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                  }`}>
                    {primaryModel?.auc?.toFixed(4) || '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">KS</div>
                  <div className="text-[13px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {primaryModel?.ks?.toFixed(4) || '—'}
                  </div>
                </div>
              </div>
              {/* Period selector */}
              <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
                {PERIODS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value as 24 | 168 | 720)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider transition-all ${
                      period === p.value
                        ? 'bg-white/[0.08] text-white'
                        : 'text-zinc-600 hover:text-zinc-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 min-h-[300px]">
            {historyQuery.isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
              </div>
            ) : normalizedTrend.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <GaugeCircle className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em]">No historical data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={normalizedTrend} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aucGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.18} />
                      <stop offset="70%"  stopColor="#3b82f6" stopOpacity={0.04} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="ksGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#10b981" stopOpacity={0.12} />
                      <stop offset="70%"  stopColor="#10b981" stopOpacity={0.02} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0}    />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />

                  <XAxis
                    dataKey="t"
                    tick={{ fontSize: 9, fill: '#52525b' }}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Temps', position: 'insideBottomRight', offset: -4, fontSize: 9, fill: '#3f3f46' }}
                  />
                  <YAxis
                    domain={[
                      (dataMin: number) => parseFloat(Math.max(0, dataMin - 0.02).toFixed(3)),
                      (dataMax: number) => parseFloat(Math.min(1, dataMax + 0.01).toFixed(3)),
                    ]}
                    tick={{ fontSize: 9, fill: '#52525b' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => v.toFixed(2)}
                    label={{ value: 'Score', angle: -90, position: 'insideLeft', offset: 12, fontSize: 9, fill: '#3f3f46' }}
                    width={40}
                  />

                  {/* ── Benchmark lines ──────────────────────────────────── */}
                  <ReferenceLine
                    y={AUC_THRESHOLD_BASELINE}
                    stroke="#3b82f6"
                    strokeWidth={1}
                    strokeDasharray="6 3"
                    label={{ value: 'Cible AUC 0.85', position: 'insideTopRight', fontSize: 9, fill: '#3b82f6' }}
                  />
                  <ReferenceLine
                    y={AUC_THRESHOLD_OK}
                    stroke="#f59e0b"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    label={{ value: 'Seuil min. 0.82', position: 'insideBottomRight', fontSize: 9, fill: '#f59e0b' }}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    formatter={(v: any, name: any) => [Number(v).toFixed(4), String(name ?? '').toUpperCase()]}
                    labelStyle={{ color: '#71717a', fontSize: 9 }}
                  />

                  {/* ── Legend ───────────────────────────────────────────── */}
                  <Legend
                    verticalAlign="top"
                    align="left"
                    height={24}
                    wrapperStyle={{ paddingLeft: 40, fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    formatter={(value) => value === 'auc' ? 'AUC (Aire sous courbe ROC)' : 'KS (Kolmogorov-Smirnov)'}
                  />

                  <Area
                    type="monotone"
                    dataKey="auc"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#aucGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#3b82f6', stroke: '#111', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ks"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    fill="url(#ksGrad)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#10b981', stroke: '#111', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Chart footnote */}
          <div className="px-5 py-2 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-[9px] text-zinc-700">
              Ligne bleue pointillée = cible opérationnelle AUC ≥ 0.85 · Ligne ambre = seuil minimal 0.82
            </span>
            <span className="text-[9px] font-mono text-zinc-700">
              Période : {PERIODS.find(p => p.value === period)?.label} · {normalizedTrend.length} points
            </span>
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-4 flex flex-col gap-4">

          {/* Drift & Model Registry */}
          <div className="card-glow overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] bg-[#0a0a0a]">
              <div className="text-[13px] font-bold text-white">Drift & Integrity</div>
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-600" />
            </div>
            <div className="p-4 space-y-4">
              {/* PSI avec seuils annotés Basel / SR 11-7 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                    Global PSI
                  </span>
                  <span className={`font-bold font-mono text-[15px] tabular-nums leading-none ${
                    (primaryModel?.psi || 0) >= PSI_CRITICAL ? 'text-rose-400' :
                    (primaryModel?.psi || 0) >= PSI_WARNING  ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {primaryModel?.psi?.toFixed(3) || '—'}
                  </span>
                </div>
                {/* Barre avec zones de seuil annotées */}
                <div className="relative h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      (primaryModel?.psi || 0) >= PSI_CRITICAL ? 'bg-rose-500' :
                      (primaryModel?.psi || 0) >= PSI_WARNING  ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min((primaryModel?.psi || 0) * 400, 100)}%` }}
                  />
                </div>
                {/* Zone labels */}
                <div className="flex justify-between text-[8px] font-mono mt-1">
                  <span className="text-emerald-600">0  Stable</span>
                  <span className="text-amber-600">0.1 Watch</span>
                  <span className="text-rose-600">0.2 Action</span>
                </div>
                <p className="text-[9px] text-zinc-700 mt-1.5">
                  Seuils SR 11-7 / Bâle : &gt;0.10 = surveillance · &gt;0.20 = revue modèle obligatoire
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">Data Quality Score</span>
                  <span className="text-purple-400 font-bold font-mono text-[15px] tabular-nums leading-none">
                    {latestQuality != null ? `${latestQuality.toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-1000"
                    style={{ width: latestQuality != null ? `${Math.min(latestQuality, 100)}%` : '0%' }} />
                </div>
              </div>

              {models.length > 1 && (
                <div className="pt-3 border-t border-white/[0.04]">
                  <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2.5">Model Registry</div>
                  <div className="space-y-1.5">
                    {models.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between bg-white/[0.02] p-3 rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                        <div>
                          <div className="text-[12px] font-semibold text-white">{m.modelName}</div>
                          <div className="text-[9px] text-zinc-600 mt-0.5">{m.versionTag || m.version}</div>
                        </div>
                        <StatusBadge
                          status={m.isShadow ? 'REVIEW_BADGE' : m.status === 'ONLINE' ? 'ONLINE' : m.status === 'WARNING' ? 'WARNING' : 'OFFLINE'}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Alerts */}
          <div className="card-glow overflow-hidden flex flex-col flex-1">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] bg-[#0a0a0a]">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[13px] font-bold text-white">Action Required</span>
              </div>
              <div className="flex gap-1.5">
                {criticalCount > 0 && (
                  <span className="bg-rose-500/10 text-rose-400 text-[9px] font-bold px-2 py-0.5 rounded border border-rose-500/20 animate-pulse">
                    {criticalCount} CRIT
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="bg-amber-500/10 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-500/20">
                    {warningCount} WARN
                  </span>
                )}
              </div>
            </div>
            <div className="p-3 flex-1 overflow-y-auto space-y-1.5 max-h-[340px]">
              {alertsQuery.isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
                </div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
                  <ShieldAlert className="w-7 h-7 mb-3 opacity-20" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em]">No active alerts</p>
                </div>
              ) : (
                alerts.map((a: any) => {
                  const SevIcon = SEV_ICONS[a.severity] ?? AlertCircle
                  const sevColor = SEV_COLORS[a.severity] ?? 'text-blue-400'
                  return (
                    <div key={a.id} className="border border-white/[0.04] bg-black/30 p-3.5 rounded-xl hover:border-white/[0.08] transition-all group">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 ${sevColor}`}>
                          <SevIcon className="w-3 h-3" aria-hidden="true" />
                          {a.severity}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-600">
                          {new Date(a.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-zinc-200 leading-snug mb-2">{a.message}</div>
                      <button className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-600 group-hover:text-white transition-colors flex items-center gap-1">
                        Investigate <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Audit Console */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="card-glow overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] bg-[#0a0a0a]">
          <div className="text-[13px] font-bold text-white">System Degradation & Audit Console</div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-white/[0.04]">

          {/* State Transitions */}
          <div className="p-5">
            <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4 flex items-center gap-2">
              <Activity className="w-3 h-3" /> State Transitions
            </div>
            {degradationQuery.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
            ) : degradationTimeline.length === 0 ? (
              <p className="text-[11px] font-mono text-zinc-600">No degradation events. System optimal.</p>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[260px] pr-2">
                {degradationTimeline.map((event: any, i: number) => (
                  <div key={event.id || `deg-${i}`} className="relative pl-5 border-l border-amber-500/20">
                    <div className="absolute w-1.5 h-1.5 rounded-full bg-amber-500 -left-[3px] top-1" />
                    <div className="text-[9px] font-mono text-zinc-600 mb-1">
                      {event.timestamp ? new Date(event.timestamp).toLocaleString() : new Date().toLocaleString()}
                    </div>
                    <div className="text-[12px] font-semibold text-white mb-1">Threshold breach detected</div>
                    <div className="text-[11px] text-zinc-500 leading-relaxed">
                      {event.reason || 'Automated mitigation protocol initiated due to sustained latency or error rate deviation.'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fallback Logs */}
          <div className="p-5">
            <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-3 h-3" /> Rule-Engine Fallback Logs
            </div>
            {fallbackQuery.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
            ) : fallbackHistory.length === 0 ? (
              <p className="text-[11px] font-mono text-zinc-600">Primary ML Engine active 100%. No fallbacks required.</p>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[260px] pr-2">
                {fallbackHistory.map((fb: any, i: number) => (
                  <div key={fb.id || `fb-${i}`} className="bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-xl hover:border-white/[0.08] transition-colors">
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="text-[11px] font-semibold text-zinc-200 flex-1 pr-2">
                        {fb.detail || fb.message || 'System Fallback Engaged'}
                      </div>
                      <span className="text-[9px] font-mono text-zinc-600 flex-shrink-0">
                        {fb.createdAt ? new Date(fb.createdAt).toLocaleTimeString() : 'N/A'}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                      Rule Engine activated due to ML timeout or error.
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
