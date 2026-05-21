'use client'
import * as React from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { AlertTriangle, Activity, SlidersHorizontal, Download, Loader2, ShieldAlert, Bell, Cpu, Wifi, WifiOff, AlertCircle, ArrowRight, GaugeCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { SectionHeader } from '@/components/ui'
import { fetchApi } from '@/lib/api-client'
import { useMonitoringSSE } from '@/lib/use-monitoring-sse'

// ── Types ──────────────────────────────────────────────────────────────────────
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
  const [stressScenario, setStressScenario] = React.useState(false)
  const { connectionState, lastEvent } = useMonitoringSSE()

  // Latest snapshot per model version
  const metricsQuery = useQuery({
    queryKey: ['monitoring-metrics'],
    queryFn: () => fetchApi('/monitoring/metrics'),
    refetchInterval: 30000,
  })

  // PHASE C: Real historical time-series from the backend
  const historyQuery = useQuery({
    queryKey: ['monitoring-history'],
    queryFn: () => fetchApi('/monitoring/metrics/history?limit=20'),
    refetchInterval: 60000,
  })

  // PHASE B: Python scoring engine health
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

  // Build chart data from REAL backend history
  const perfTrend = history.length > 0
    ? [...history].reverse().map((log, i) => ({
        t: i === history.length - 1 ? 'Now' : new Date(log.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        auc: log.auc,
        ks: log.ks,
        psi: log.psi,
      }))
    : primaryModel?.auc
      ? [{ t: 'Now', auc: primaryModel.auc, ks: primaryModel.ks, psi: primaryModel.psi }]
      : []

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 page-enter pb-20">
      <SectionHeader
        title="Monitoring & Operations Control"
        subtitle="Real-time MLOps telemetry, scoring inference streams, and automated fallback tracking."
        actions={
          <div className="flex gap-4 items-center">
            {/* Scoring engine status badge */}
            {scoringHealth && (
              <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border font-bold text-[11px] uppercase tracking-widest shadow-lg ${
                scoringHealth.status === 'PYTHON_ONLINE'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-amber-500/10'
              }`}>
                {scoringHealth.engine === 'PYTHON' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                {scoringHealth.status === 'PYTHON_ONLINE' ? 'Python Core Online' : 'Rule Engine Fallback'}
                <div className="w-px h-3 bg-current opacity-30 mx-1" />
                <span className="font-mono text-zinc-300">{scoringHealth.latencyMs}ms</span>
              </div>
            )}
            {/* SSE live connection indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest ${
              connectionState === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : connectionState === 'connecting'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connectionState === 'connected' ? 'bg-emerald-400 animate-pulse' : connectionState === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`} />
              {connectionState === 'connected' ? 'Live' : connectionState === 'connecting' ? 'Connecting' : 'Offline'}
            </div>
            <button className="px-5 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-[12px] font-bold uppercase tracking-widest text-zinc-300 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> Export Logs
            </button>
          </div>
        }
      />

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-4 gap-5">
        {metricsQuery.isLoading ? (
          <div className="col-span-4 h-32 flex items-center justify-center border border-white/[0.04] rounded-2xl bg-[#0a0a0a]">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
          </div>
        ) : (
          <>
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden group hover:border-white/[0.12] transition-colors">
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 transition-opacity ${primaryModel?.status === 'ONLINE' ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`} />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">ML Pipeline Status</span>
                <span className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor] ${primaryModel?.status === 'ONLINE' ? 'bg-emerald-400 text-emerald-400' : 'bg-amber-400 text-amber-400'}`} />
              </div>
              <div className="text-4xl font-black text-white tracking-tight mb-1 relative z-10">{primaryModel?.status || 'N/A'}</div>
              <div className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 inline-flex mt-1">v.{primaryModel?.version || '1.0.0'}</div>
            </div>

            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden group hover:border-white/[0.12] transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Inference Volume</span>
                <Activity className="w-4 h-4 text-blue-400 opacity-80" />
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black text-white tracking-tight leading-none">
                  {primaryModel?.latestLog ? Math.round(primaryModel.latestLog.inferenceVolume / 1000) + 'k' : '—'}
                </span>
                <span className="text-sm text-zinc-500 font-bold uppercase tracking-wider">/ hr</span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Live from Gateway
              </div>
            </div>

            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden group hover:border-white/[0.12] transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Error Rate</span>
                <AlertTriangle className={`w-4 h-4 ${primaryModel?.latestLog?.errorRate > 0.05 ? 'text-rose-400' : 'text-zinc-600'}`} />
              </div>
              <div className={`text-4xl font-black tracking-tight mb-1 tabular-nums ${primaryModel?.latestLog?.errorRate > 0.05 ? 'text-rose-400' : 'text-white'}`}>
                {primaryModel?.latestLog ? (primaryModel.latestLog.errorRate * 100).toFixed(2) + '%' : '—'}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70 mt-2">Well within threshold</div>
            </div>

            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between group hover:border-white/[0.12] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Network Latencies</span>
                <Cpu className="w-4 h-4 text-purple-400 opacity-80" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">P50</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white tabular-nums leading-none">
                      {primaryModel?.latestLog ? Math.round(primaryModel.latestLog.latencyP50) : '—'}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-600">ms</span>
                  </div>
                </div>
                <div className="w-full h-px bg-white/[0.04]" />
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">P99</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-amber-400 tabular-nums leading-none">
                      {primaryModel?.latestLog ? Math.round(primaryModel.latestLog.latencyP99) : '—'}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-600">ms</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Real Historical Performance Area Chart */}
        <div className="col-span-8 bg-[#0d0d0d] border border-white/[0.06] rounded-3xl p-7 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-500/[0.03] to-transparent pointer-events-none" />
          
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.15em] text-zinc-300">Model Performance History</h2>
              <p className="text-[11px] font-medium text-zinc-500 mt-1">Live AUC tracking from inference stream</p>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Current AUC</span>
                <span className="text-lg font-black text-blue-400 font-mono leading-none bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">{primaryModel?.auc?.toFixed(4) || '—'}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Current KS</span>
                <span className="text-lg font-black text-white font-mono leading-none bg-white/[0.04] px-2 py-1 rounded border border-white/[0.08]">{primaryModel?.ks?.toFixed(4) || '—'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-h-[320px] -mx-4 -mb-2 relative z-10">
            {historyQuery.isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500/50" />
              </div>
            ) : perfTrend.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                <GaugeCircle className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-xs font-medium uppercase tracking-widest">No historical data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={perfTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aucGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#71717a', fontWeight: 600 }} tickLine={false} axisLine={false} dy={10} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#71717a', fontWeight: 600 }} tickLine={false} axisLine={false} dx={-10} tickFormatter={v => v.toFixed(3)} />
                  <Tooltip
                    content={({ active, payload }) => active && payload?.length ? (
                      <div className="bg-[#000] border border-white/[0.1] p-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-2">{payload[0].payload.t}</span>
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-[9px] text-zinc-500 block uppercase tracking-widest mb-0.5">AUC</span>
                            <span className="text-sm font-black text-blue-400 font-mono">{Number(payload[0].value).toFixed(4)}</span>
                          </div>
                          {payload[0].payload.ks && (
                            <div>
                              <span className="text-[9px] text-zinc-500 block uppercase tracking-widest mb-0.5">KS</span>
                              <span className="text-sm font-black text-white font-mono">{Number(payload[0].payload.ks).toFixed(4)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="auc" stroke="#3b82f6" strokeWidth={3} fill="url(#aucGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Drift, Quality & Alert Center Combined */}
        <div className="col-span-4 flex flex-col gap-6">
          {/* Drift & Quality */}
          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-3xl p-7">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Drift & Integrity</h2>
              <SlidersHorizontal className="w-4 h-4 text-zinc-600" />
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Global PSI</span>
                  <span className="text-amber-400 font-black font-mono text-lg leading-none">{primaryModel?.psi?.toFixed(3) || '—'}</span>
                </div>
                <div className="h-2 bg-[#000] border border-white/[0.08] rounded-full overflow-hidden p-0.5">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-1000 relative" style={{ width: `${Math.min((primaryModel?.psi || 0) * 400, 100)}%` }}>
                     <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" />
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Data Quality Score</span>
                  <span className="text-purple-400 font-black font-mono text-lg leading-none">
                    {latestQuality != null ? `${latestQuality.toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="h-2 bg-[#000] border border-white/[0.08] rounded-full overflow-hidden p-0.5">
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-1000" style={{ width: latestQuality != null ? `${Math.min(latestQuality, 100)}%` : '0%' }} />
                </div>
              </div>
            </div>

            {/* Model Versions List */}
            {models.length > 1 && (
              <div className="mt-8 pt-6 border-t border-white/[0.04]">
                <h3 className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Model Registry</h3>
                <div className="space-y-2">
                  {models.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between bg-black p-3 rounded-xl border border-white/[0.04] hover:border-white/[0.1] transition-colors">
                      <span className="text-[12px] font-bold text-white">{m.modelName}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${m.status === 'ONLINE' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : m.isShadow ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-zinc-500 bg-white/[0.04] border-white/[0.08]'}`}>
                        {m.isShadow ? 'SHADOW' : m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Alerts */}
          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-3xl overflow-hidden flex flex-col flex-1">
            <div className="px-7 py-5 flex justify-between items-center border-b border-white/[0.04] bg-[#0a0a0a]">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Bell className="w-3.5 h-3.5" /> Action Required
              </h2>
              <div className="flex gap-1.5">
                {criticalCount > 0 && <span className="bg-rose-500/10 text-rose-400 text-[10px] font-black px-2 py-0.5 rounded border border-rose-500/20 animate-pulse">{criticalCount} CRIT</span>}
                {warningCount > 0 && <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded border border-amber-500/20">{warningCount} WARN</span>}
              </div>
            </div>
            <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
              {alertsQuery.isLoading ? (
                <div className="flex items-center justify-center h-full min-h-[100px]"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-zinc-600">
                  <ShieldAlert className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No active alerts</p>
                </div>
              ) : (
                <div className="space-y-1.5 p-2">
                  {alerts.map((a: any) => (
                    <div key={a.id} className="border border-white/[0.04] bg-black p-4 rounded-xl hover:bg-white/[0.02] hover:border-white/[0.1] transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${a.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}`}>
                          <AlertCircle className="w-3 h-3" /> {a.severity}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-600">{new Date(a.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <h4 className="text-[12px] font-semibold text-white mb-3 leading-snug">{a.message}</h4>
                      <button className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors flex items-center gap-1">
                        Investigate <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Governance & Stability Console */}
      <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-3xl flex flex-col min-h-[300px] overflow-hidden">
        <div className="px-8 py-5 border-b border-white/[0.04] bg-[#0a0a0a]">
           <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">System Degradation & Audit Console</h2>
        </div>
        
        <div className="grid grid-cols-2 divide-x divide-white/[0.04] flex-1">
          {/* Degradation Timeline */}
          <div className="p-8 space-y-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-4 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> State Transitions
            </h3>
            {degradationQuery.isLoading ? (
               <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
            ) : degradationTimeline.length === 0 ? (
               <div className="text-xs font-mono text-zinc-600">No degradation events recorded. System optimal.</div>
            ) : (
               <div className="space-y-5 overflow-y-auto max-h-[300px] pr-4 custom-scrollbar">
                 {degradationTimeline.map((event: any, i: number) => (
                   <div key={event.id || `deg-${i}`} className="relative pl-6 border-l border-amber-500/20">
                     <div className="absolute w-2 h-2 rounded-full bg-amber-500/50 border border-amber-400 -left-[4.5px] top-1.5 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                     <div className="flex items-center gap-3 mb-1">
                       <span className="text-[10px] font-mono text-zinc-500 bg-black px-1.5 py-0.5 rounded border border-white/[0.04]">
                         {event.timestamp ? new Date(event.timestamp).toLocaleString() : new Date().toLocaleString()}
                       </span>
                       <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">{event.status}</span>
                     </div>
                     <div className="text-[13px] text-white font-medium mb-1">Threshold breach detected</div>
                     <div className="text-[11px] text-zinc-500 leading-relaxed bg-white/[0.02] p-2 rounded-lg border border-white/[0.04]">
                       {event.reason || 'Automated mitigation protocol initiated due to sustained latency or error rate deviation.'}
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>

          {/* Fallback History */}
          <div className="p-8 space-y-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5" /> Rule-Engine Fallback Logs
            </h3>
            {fallbackQuery.isLoading ? (
               <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
            ) : fallbackHistory.length === 0 ? (
               <div className="text-xs font-mono text-zinc-600">Primary ML Engine active 100%. No fallbacks required.</div>
            ) : (
               <div className="space-y-3 overflow-y-auto max-h-[300px] pr-4 custom-scrollbar">
                 {fallbackHistory.map((fb: any, i: number) => (
                   <div key={fb.id || `fb-${i}`} className="bg-black border border-white/[0.06] p-4 rounded-xl hover:border-white/[0.1] transition-colors group">
                     <div className="flex justify-between items-center mb-2">
                       <span className="text-[11px] font-bold text-white group-hover:text-blue-400 transition-colors">
                         {fb.detail || fb.message || 'System Fallback Engaged'}
                       </span>
                       <span className="text-[10px] font-mono text-zinc-600 bg-white/[0.04] px-1.5 py-0.5 rounded">
                         {fb.createdAt ? new Date(fb.createdAt).toLocaleTimeString() : 'N/A'}
                       </span>
                     </div>
                     <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                       Rule Engine activated due to ML timeout or error.
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
