'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '@/lib/api-client'
import {
  GitMerge, Activity, Bell,
  TrendingUp, TrendingDown, AlertTriangle, Clock,
  BarChart2, FileText, MoreHorizontal, ArrowUpRight,
  CheckCircle2, Zap, Eye, Loader2, RefreshCw,
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, delay = 0) {
  const [v, setV] = useState(0)
  const prevTarget = useRef(0)

  useEffect(() => {
    if (target === prevTarget.current) return
    prevTarget.current = target
    let isMounted = true
    let reqId: number
    const startVal = v

    const t = setTimeout(() => {
      const s = performance.now()
      const step = (now: number) => {
        if (!isMounted) return
        const p = Math.min((now - s) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        setV(startVal + Math.floor(eased * (target - startVal)))
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return v
}

function fmt(v: number | null | undefined, d = 1) {
  return v == null ? '—' : v.toFixed(d)
}

// ── KPI Cards ──────────────────────────────────────────────────────────────────
function KPICards({ kpis, summary }: { kpis: any; summary: any }) {
  const exposureRaw = kpis?.totalExposure ?? 0      // already in millions
  const eclRaw      = kpis?.totalEL ?? 0
  const avgPdRaw    = Math.round((kpis?.avgPd ?? 0) * 100)  // store as int cents for count-up
  const pendingRaw  = summary?.pendingDecisions ?? 0

  const exposure = useCountUp(Math.round(exposureRaw * 10), 900, 200)   // ×10 → display /10
  const ecl      = useCountUp(Math.round(eclRaw * 10),      1000, 300)
  const pd       = useCountUp(avgPdRaw,                     900,  400)
  const decisions= useCountUp(pendingRaw,                   800,  500)

  const cards = [
    {
      label: 'Total Portfolio',
      value: exposureRaw > 0
        ? `$${(exposure / 10).toFixed(1)}B`
        : kpis ? `$${fmt(kpis.totalExposure / 1000, 1)}B` : '—',
      delta: '+3.2%', deltaUp: true,
      sub: 'vs last quarter',
      icon: TrendingUp, iconColor: 'text-[#3ECF8E]', iconBg: 'bg-[#3ECF8E]/10 border-[#3ECF8E]/20',
      accent: '#3ECF8E',
    },
    {
      label: 'ECL Portefeuille (IFRS 9)',
      value: eclRaw > 0
        ? `$${(ecl / 10).toFixed(1)}M`
        : kpis ? `$${fmt(kpis.totalEL, 1)}M` : '—',
      delta: 'Stock cumulé', deltaUp: false,
      sub: 'Provision IFRS 9',
      icon: AlertTriangle, iconColor: 'text-amber-400', iconBg: 'bg-amber-500/10 border-amber-500/20',
      accent: '#f59e0b',
    },
    {
      label: 'PD Moyen Portfolio',
      value: kpis?.avgPd != null
        ? `${(pd / 100).toFixed(2)}%`
        : '—',
      delta: summary?.model?.gini != null ? `Gini ${fmt(summary.model.gini)}%` : 'ML actif',
      deltaUp: true,
      sub: 'portfolio-wide (1Y)',
      icon: Activity, iconColor: 'text-[#3ECF8E]', iconBg: 'bg-[#3ECF8E]/10 border-[#3ECF8E]/20',
      accent: '#3ECF8E',
    },
    {
      label: 'Pending Decisions',
      value: pendingRaw > 0 ? `${decisions}` : kpis ? '0' : '—',
      delta: summary?.pendingDecisions != null
        ? `${summary.pendingDecisions > 20 ? 'urgente' : 'normal'}`
        : '',
      deltaUp: (summary?.pendingDecisions ?? 0) <= 20,
      sub: 'awaiting approval',
      icon: Clock, iconColor: 'text-rose-400', iconBg: 'bg-rose-500/10 border-rose-500/20',
      accent: '#f43f5e',
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <div key={i} className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden group hover:border-white/[0.1] transition-all duration-300 cursor-pointer">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: `${c.accent}15`, transform: 'translate(40%, -40%)' }} />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">{c.label}</span>
              <div className={`w-7 h-7 rounded-lg ${c.iconBg} border flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 ${c.iconColor}`} />
              </div>
            </div>
            <div className="text-[28px] font-bold text-white tabular-nums tracking-tight leading-none mb-2">{c.value}</div>
            <div className="flex items-center gap-1.5">
              {c.deltaUp
                ? <TrendingUp className="w-3 h-3 text-[#3ECF8E]" />
                : <TrendingDown className="w-3 h-3 text-rose-400" />}
              <span className={`text-[10px] font-bold ${c.deltaUp ? 'text-[#3ECF8E]' : 'text-rose-400'}`}>{c.delta}</span>
              <span className="text-[10px] text-zinc-600">{c.sub}</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: `linear-gradient(to right, transparent, ${c.accent}80, transparent)` }} />
          </div>
        )
      })}
    </div>
  )
}

// ── Portfolio Overview (IFRS 9 stages donut + ECL trend) ─────────────────────
function PortfolioOverview({ kpis, eclTrend }: { kpis: any; eclTrend: any[] }) {
  const [progress, setProgress] = useState(0)
  const [mounted, setMounted]   = useState(false)
  const [hoveredSeg, setHoveredSeg] = useState<number | null>(null)
  const [hoverX, setHoverX]     = useState<number | null>(null)

  useEffect(() => {
    let isMounted = true
    let reqId: number
    setMounted(true)
    const s = performance.now()
    const animate = (now: number) => {
      if (!isMounted) return
      const p = Math.min((now - s) / 1400, 1)
      setProgress(1 - Math.pow(1 - p, 3))
      if (p < 1) reqId = requestAnimationFrame(animate)
    }
    reqId = requestAnimationFrame(animate)
    return () => { isMounted = false; if (reqId) cancelAnimationFrame(reqId) }
  }, [kpis])

  const s1 = kpis?.stage1Pct ?? 72
  const s2 = kpis?.stage2Pct ?? 20
  const s3 = kpis?.stage3Pct ?? 8

  const segments = [
    { label: 'Stage 1', value: s1, color: '#3ECF8E', sub: 'Sain · 12M ECL' },
    { label: 'Stage 2', value: s2, color: '#f59e0b', sub: 'SICR détecté' },
    { label: 'Stage 3', value: s3, color: '#f43f5e', sub: 'Défaut · LT ECL' },
  ]
  const total = segments.reduce((sum, d) => sum + d.value, 0) || 100
  let cumAngle = -90
  const R = 52, cx = 75, cy = 75, thickness = 18

  const donutPaths = segments.map(seg => {
    const angle = (seg.value / total) * 360 * progress
    const startRad = (cumAngle * Math.PI) / 180
    const endRad   = ((cumAngle + angle) * Math.PI) / 180
    cumAngle += (seg.value / total) * 360
    const x1 = cx + R * Math.cos(startRad), y1 = cy + R * Math.sin(startRad)
    const x2 = cx + R * Math.cos(endRad),   y2 = cy + R * Math.sin(endRad)
    const large = angle > 180 ? 1 : 0
    const ri = R - thickness
    const xi1 = cx + ri * Math.cos(startRad), yi1 = cy + ri * Math.sin(startRad)
    const xi2 = cx + ri * Math.cos(endRad),   yi2 = cy + ri * Math.sin(endRad)
    return { ...seg, d: `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ri} ${ri} 0 ${large} 0 ${xi1} ${yi1} Z` }
  })

  // ECL trend chart
  const W = 100, H = 60
  const eclData = eclTrend.length > 0
    ? eclTrend.map((p: any) => p.cumulativeEcl ?? 0)
    : [0]
  const eclLabels = eclTrend.length > 0
    ? eclTrend.map((p: any) => p.label ?? '')
    : ['—']
  const maxEcl = Math.max(...eclData, 1)
  const pts: [number, number][] = eclData.map((v, i) => [
    eclData.length > 1 ? (i / (eclData.length - 1)) * W : W / 2,
    H - (v / maxEcl) * H * progress,
  ])
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
  const areaPath = `${linePath} L ${W} ${H} L 0 ${H} Z`

  const xAxisLabels = (() => {
    if (eclLabels.length <= 1) return eclLabels
    const indices = [0, Math.floor(eclLabels.length / 3), Math.floor((eclLabels.length * 2) / 3), eclLabels.length - 1]
    return [...new Set(indices)].map(i => eclLabels[i])
  })()

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {/* Donut — IFRS 9 allocation */}
      <div className="col-span-2 bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[13px] font-bold text-white">Allocation IFRS 9</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Répartition stades · {kpis?.totalCounterparties ?? '—'} contreparties
            </div>
          </div>
          <button className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] transition-all">
            <MoreHorizontal className="w-3.5 h-3.5 text-zinc-500" />
          </button>
        </div>
        <div className="flex items-center gap-4">
          {mounted ? (
            <svg viewBox="0 0 150 150" className="w-[120px] h-[120px] flex-shrink-0">
              {donutPaths.map((seg, i) => (
                <path
                  key={i} d={seg.d} fill={seg.color}
                  opacity={hoveredSeg === null || hoveredSeg === i ? '0.9' : '0.3'}
                  onMouseEnter={() => setHoveredSeg(i)}
                  onMouseLeave={() => setHoveredSeg(null)}
                  className="transition-opacity cursor-pointer"
                />
              ))}
              <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fill="white" fontWeight="bold" fontFamily="monospace">
                {hoveredSeg !== null ? `${segments[hoveredSeg].value.toFixed(1)}%` : 'IFRS 9'}
              </text>
              <text x={cx} y={cy + 8} textAnchor="middle" fontSize="6" fill="#71717a" fontFamily="sans-serif">
                {hoveredSeg !== null ? segments[hoveredSeg].label : 'Stages'}
              </text>
            </svg>
          ) : <div className="w-[120px] h-[120px] rounded-full bg-white/[0.03] flex-shrink-0" />}
          <div className="space-y-2.5 flex-1">
            {segments.map((s, i) => (
              <div key={i}
                className={`flex items-center justify-between cursor-pointer p-1 -mx-1 rounded transition-colors ${hoveredSeg === i ? 'bg-white/[0.06]' : ''}`}
                onMouseEnter={() => setHoveredSeg(i)}
                onMouseLeave={() => setHoveredSeg(null)}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <div>
                    <span className={`text-[11px] font-medium ${hoveredSeg === i ? 'text-white' : 'text-zinc-400'}`}>{s.label}</span>
                    {hoveredSeg === i && <div className="text-[9px] text-zinc-600">{s.sub}</div>}
                  </div>
                </div>
                <span className="text-[11px] font-bold tabular-nums" style={{ color: s.color }}>{s.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ECL trend area chart — real data */}
      <div className="col-span-3 bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5 relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[13px] font-bold text-white">ECL Trend — 12 mois</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              {eclTrend.length > 0
                ? `Données réelles · ${eclTrend.length} mois · scoringSnapshot`
                : 'En attente de décisions ML scorées'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
              <span className="text-[8px] text-[#3ECF8E] font-bold">LIVE</span>
            </div>
          </div>
        </div>
        <div className="relative h-[105px]">
          {mounted ? (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="w-full h-full cursor-crosshair relative z-10"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setHoverX(((e.clientX - rect.left) / rect.width) * W)
              }}
              onMouseLeave={() => setHoverX(null)}
            >
              <defs>
                <linearGradient id="areaGreenAdmin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3ECF8E" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3ECF8E" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[20, 40, 60, 80].map(y => (
                <line key={y} x1="0" y1={H - (y / 100) * H} x2={W} y2={H - (y / 100) * H}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="2 3" />
              ))}
              <path d={areaPath} fill="url(#areaGreenAdmin)" />
              <path d={linePath} fill="none" stroke="#3ECF8E" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0 0 4px rgba(62,207,142,0.7))' }} />

              {hoverX !== null && progress > 0.9 && pts.length > 1 && (() => {
                const idx = Math.min(Math.max(Math.round((hoverX / W) * (pts.length - 1)), 0), pts.length - 1)
                const pt = pts[idx]
                return (
                  <g>
                    <line x1={pt[0]} y1={0} x2={pt[0]} y2={H} stroke="rgba(255,255,255,0.2)" strokeDasharray="1 2" strokeWidth="0.5" />
                    <circle cx={pt[0]} cy={pt[1]} r="2.5" fill="#3ECF8E" style={{ filter: 'drop-shadow(0 0 6px #3ECF8E)' }} />
                    <circle cx={pt[0]} cy={pt[1]} r="5" fill="#3ECF8E" opacity="0.2" />
                    <rect x={Math.min(Math.max(pt[0] - 14, 0), W - 28)} y={Math.max(pt[1] - 12, 0)} width="28" height="9" rx="1.5" fill="#000" stroke="#3ECF8E" strokeWidth="0.5" opacity="0.9" />
                    <text x={Math.min(Math.max(pt[0], 14), W - 14)} y={Math.max(pt[1] - 6.5, 5.5)} fontSize="3.5" fill="#3ECF8E" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                      ${eclData[idx]?.toFixed(2)}M
                    </text>
                  </g>
                )
              })()}

              {hoverX === null && progress > 0.9 && pts.length > 0 && (
                <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill="#3ECF8E"
                  style={{ filter: 'drop-shadow(0 0 6px #3ECF8E)' }} />
              )}
            </svg>
          ) : <div className="h-full bg-white/[0.02] rounded-xl" />}
        </div>
        <div className="flex justify-between mt-2 px-1">
          {xAxisLabels.map((m, i) => (
            <span key={i} className="text-[9px] text-zinc-600 font-mono">{m}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Decision Table ─────────────────────────────────────────────────────────────
function DecisionTable({ queue, isLoading, router }: { queue: any[]; isLoading: boolean; router: any }) {
  const stageStyle: Record<string, string> = {
    APPROVED:       'text-[#3ECF8E] bg-[#3ECF8E]/10 border-[#3ECF8E]/20',
    REVIEW:         'text-amber-400 bg-amber-400/10 border-amber-400/20',
    SEND_TO_REVIEW: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    SCORING:        'text-blue-400 bg-blue-400/10 border-blue-400/20',
    PENDING:        'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
    DECLINED:       'text-rose-400 bg-rose-400/10 border-rose-400/20',
  }

  return (
    <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <GitMerge className="w-4 h-4 text-[#3ECF8E]" />
          <div>
            <div className="text-[13px] font-bold text-white">Decision Queue</div>
            <div className="text-[10px] text-zinc-500">Active credit decisions requiring action</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600" />}
          {queue.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
              <span className="text-[10px] text-zinc-400 font-medium">{queue.length} open</span>
            </div>
          )}
          <Link href="/decisioning"
            className="text-[11px] font-semibold text-[#3ECF8E] hover:text-[#3ECF8E]/80 transition-colors flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
        </div>
      ) : queue.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-zinc-600 text-sm gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Aucune décision en attente
        </div>
      ) : (
        <>
          <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-white/[0.01] border-b border-white/[0.04]">
            {['Case ID', 'Counterparty', 'Amount', 'Rating', 'PD', 'Analyst', 'Status'].map((h, i) => (
              <div key={h} className={`text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-600 ${
                i === 1 ? 'col-span-3' : i === 6 ? 'col-span-2 text-right' : ''
              }`}>{h}</div>
            ))}
          </div>
          <div className="divide-y divide-white/[0.03]">
            {queue.slice(0, 7).map((d: any) => {
              const pdVal = d.pd ?? null
              const ratingStr = d.internalRating ?? ''
              const isUp = pdVal != null && pdVal > 3
              return (
                <div key={d.id}
                  onClick={() => router.push('/decisioning')}
                  className={`grid grid-cols-12 gap-2 items-center px-5 py-3.5 hover:bg-white/[0.02] transition-all cursor-pointer group ${d.slaBreached ? 'bg-rose-500/[0.03]' : ''}`}>
                  <div className="text-[11px] font-mono text-zinc-500">{d.reqId ?? d.id?.slice(0, 8)}</div>
                  <div className="col-span-3 flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.05] flex items-center justify-center text-[8px] font-bold text-zinc-400 flex-shrink-0">
                      {(d.counterpartyName ?? 'XX').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[12px] font-semibold text-white truncate">{d.counterpartyName ?? '—'}</span>
                  </div>
                  <div className="text-[12px] font-mono text-zinc-300 font-semibold">
                    {d.requestedAmount != null ? `$${(d.requestedAmount).toFixed(1)}M` : '—'}
                  </div>
                  <div>
                    {ratingStr ? (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                        ratingStr.startsWith('A') ? 'text-[#3ECF8E] bg-[#3ECF8E]/10 border-[#3ECF8E]/20' :
                        ratingStr.startsWith('BB') ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
                        'text-rose-400 bg-rose-400/10 border-rose-400/20'
                      }`}>{ratingStr}</span>
                    ) : <span className="text-zinc-700 text-[10px]">—</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[12px] font-mono ${pdVal != null ? (pdVal > 6 ? 'text-rose-400' : pdVal > 3 ? 'text-amber-400' : 'text-zinc-300') : 'text-zinc-600'}`}>
                      {pdVal != null ? `${pdVal.toFixed(2)}%` : '—'}
                    </span>
                    {pdVal != null && <span className={isUp ? 'text-rose-400 text-[10px]' : 'text-[#3ECF8E] text-[10px]'}>{isUp ? '↑' : '↓'}</span>}
                  </div>
                  <div className="text-[11px] text-zinc-500 font-medium truncate">{d.analystName ?? '—'}</div>
                  <div className="col-span-2 text-right relative flex items-center justify-end">
                    <span className={`text-[9px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wide transition-opacity group-hover:opacity-0 ${stageStyle[d.status] ?? stageStyle.PENDING}`}>
                      {d.status}
                    </span>
                    <div className="absolute right-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button title="Voir" onClick={(e) => { e.stopPropagation(); router.push('/decisioning') }}
                        className="w-6 h-6 rounded bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 text-[#3ECF8E] flex items-center justify-center hover:bg-[#3ECF8E]/20 transition-colors">
                        <CheckCircle2 className="w-3 h-3" />
                      </button>
                      <button title="Détails" onClick={(e) => { e.stopPropagation(); router.push('/decisioning') }}
                        className="w-6 h-6 rounded bg-white/[0.04] border border-white/[0.08] text-zinc-400 flex items-center justify-center hover:bg-white/[0.1] hover:text-white transition-colors">
                        <MoreHorizontal className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Right Panel ────────────────────────────────────────────────────────────────
function RightPanel({ alerts, auditEvents, summary }: { alerts: any[]; auditEvents: any[]; summary: any }) {
  const router = useRouter()

  const team = [
    { name: 'Kevin Park',   role: 'Risk Analyst',   initials: 'KP', color: 'from-blue-500 to-blue-700' },
    { name: 'Maya Torres',  role: 'Senior Analyst',  initials: 'MT', color: 'from-purple-500 to-purple-700' },
    { name: 'Nkechi Obi',   role: 'Credit Manager',  initials: 'NO', color: 'from-amber-500 to-amber-700' },
  ]

  const alertDot = (sev: string) =>
    sev === 'CRITICAL' ? 'bg-rose-400' : sev === 'WARNING' ? 'bg-amber-400' : 'bg-blue-400'
  const alertColor = (sev: string) =>
    sev === 'CRITICAL' ? 'text-rose-400' : sev === 'WARNING' ? 'text-amber-400' : 'text-blue-400'

  const activityIcon = (action: string) => {
    if (action?.includes('APPROV') || action?.includes('APPROVED')) return { Icon: CheckCircle2, color: 'text-[#3ECF8E]' }
    if (action?.includes('SCORE') || action?.includes('SCORING'))   return { Icon: Zap,          color: 'text-blue-400'  }
    if (action?.includes('OVERRIDE'))                                return { Icon: AlertTriangle, color: 'text-amber-400' }
    return { Icon: Eye, color: 'text-purple-400' }
  }

  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col gap-4">

      {/* Alerts */}
      <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-[#3ECF8E]" />
            <span className="text-[12px] font-bold text-white">Alerts</span>
          </div>
          {alerts.length > 0 && (
            <Link href="/admin/alert-center"
              className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full hover:bg-rose-500/20 transition-colors">
              {alerts.length} new
            </Link>
          )}
        </div>
        {alerts.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-zinc-600 text-xs gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Aucune alerte active
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {alerts.slice(0, 5).map((a: any) => (
              <button key={a.id} onClick={() => router.push('/admin/alert-center')}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-all cursor-pointer group text-left">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${alertDot(a.severity)}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-[10.5px] font-medium leading-tight ${alertColor(a.severity)}`}>{a.message}</div>
                  <div className="text-[9px] text-zinc-600 mt-0.5">
                    {new Date(a.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
                <ArrowUpRight className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Activities */}
      <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[12px] font-bold text-white">Activities</span>
          </div>
          <Link href="/compliance" className="text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors">
            Voir tout
          </Link>
        </div>
        {auditEvents.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-zinc-600 text-xs">Aucune activité récente</div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {auditEvents.slice(0, 4).map((a: any, i: number) => {
              const { Icon, color } = activityIcon(a.action)
              return (
                <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-all cursor-pointer group">
                  <div className="w-6 h-6 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-3 h-3 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10.5px] font-semibold text-white leading-tight truncate">{a.action}</div>
                    <div className="text-[9px] text-zinc-500 mt-0.5 truncate">{a.entityType ?? a.detail ?? ''}</div>
                  </div>
                  <span className="text-[8px] text-zinc-600 font-mono flex-shrink-0">
                    {new Date(a.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MRM Model status */}
      {summary && (
        <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-white/[0.05]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[12px] font-bold text-white">ML Model</span>
              </div>
              <Link href="/monitoring"
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  summary.model?.status === 'HEALTHY'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                }`}>
                {summary.model?.status ?? 'N/A'}
              </Link>
            </div>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {[
              { label: 'Gini', value: summary.model?.gini != null ? `${fmt(summary.model.gini)}%` : '—', ok: (summary.model?.gini ?? 0) >= 45 },
              { label: 'AUC',  value: summary.model?.auc  != null ? fmt(summary.model.auc, 3) : '—', ok: (summary.model?.auc ?? 0) >= 0.7 },
              { label: 'PSI',  value: summary.model?.psi  != null ? fmt(summary.model.psi, 4) : '—', ok: (summary.model?.psi ?? 1) < 0.10 },
              { label: 'Override Rate', value: summary.overrideRate != null ? `${fmt(summary.overrideRate)}%` : '—', ok: (summary.overrideRate ?? 100) <= 15 },
            ].map(m => (
              <div key={m.label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[10px] text-zinc-500">{m.label}</span>
                <span className={`text-[10px] font-mono font-bold ${m.ok ? 'text-emerald-400' : 'text-amber-400'}`}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team */}
      <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-4 py-3.5 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[12px] font-bold text-white">Risk Team</span>
          </div>
        </div>
        <div className="divide-y divide-white/[0.03]">
          {team.map((m, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-all cursor-pointer group">
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${m.color} flex items-center justify-center text-[9px] font-black text-white flex-shrink-0`}>
                {m.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-white leading-none">{m.name}</div>
                <div className="text-[9px] text-zinc-500 mt-0.5">{m.role}</div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href="/decisioning"
                  className="w-6 h-6 rounded-md bg-white/[0.05] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-all">
                  <FileText className="w-2.5 h-2.5 text-zinc-400" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminOverviewPage() {
  const router = useRouter()

  const [userName, setUserName] = useState('CRO')
  useEffect(() => {
    try {
      const stored = localStorage.getItem('internal_user')
      if (stored) {
        const u = JSON.parse(stored)
        setUserName(u.firstName ?? u.name ?? u.email?.split('@')[0] ?? 'CRO')
      }
    } catch { /* ignore */ }
  }, [])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

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

  const auditQ = useQuery({
    queryKey: ['audit-recent'],
    queryFn: () => fetchApi('/compliance/audit?page=1&limit=4'),
    refetchInterval: 60_000,
  })

  const queueQ = useQuery({
    queryKey: ['decisions-queue'],
    queryFn: () => fetchApi('/decisions/queue?limit=10'),
    refetchInterval: 30_000,
  })

  const kpis       = kpiQ.data
  const summary    = summaryQ.data
  const eclTrend   = eclTrendQ.data ?? []
  const alerts     = alertsQ.data ?? []
  const auditItems = auditQ.data?.data ?? auditQ.data ?? []
  const queue      = queueQ.data ?? []

  const isLoading  = kpiQ.isLoading || summaryQ.isLoading
  const hasError   = kpiQ.isError || summaryQ.isError

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <main className="flex-1 p-6 flex gap-5 overflow-hidden">
        {/* Center content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-[22px] font-bold text-white tracking-tight leading-none">
                {greeting}, {userName} 👋
              </h1>
              <p className="text-[12px] text-zinc-500 mt-1.5">
                CRO Dashboard · {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} · Portfolio review is ready
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasError && (
                <button onClick={() => { kpiQ.refetch(); summaryQ.refetch() }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[12px] font-bold rounded-lg hover:bg-amber-500/20 transition-all">
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              )}
              {isLoading && <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />}
              <Link href="/compliance"
                className="px-4 py-2 bg-white/[0.03] border border-white/[0.1] text-white text-[12px] font-bold rounded-lg hover:bg-white/[0.08] transition-all backdrop-blur-md flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Export Report
              </Link>
              <Link href="/stress-testing"
                className="px-5 py-2.5 bg-[#3ECF8E] text-[#0a0a0a] text-[12px] font-bold rounded-lg hover:bg-[#3ECF8E]/90 transition-all shadow-[0_0_20px_rgba(62,207,142,0.25)] hover:shadow-[0_0_30px_rgba(62,207,142,0.4)] hover:scale-105 active:scale-95 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> Run Stress Test
              </Link>
            </div>
          </div>

          <KPICards kpis={kpis} summary={summary} />
          <PortfolioOverview kpis={kpis} eclTrend={eclTrend} />
          <DecisionTable queue={queue} isLoading={queueQ.isLoading} router={router} />
        </div>

        {/* Right panel */}
        <RightPanel alerts={alerts} auditEvents={auditItems} summary={summary} />
      </main>
    </div>
  )
}
