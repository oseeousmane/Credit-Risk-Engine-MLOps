'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '@/lib/api-client'
import {
  GitMerge, Activity, Bell, TrendingUp, TrendingDown, AlertTriangle,
  Clock, BarChart2, FileText, MoreHorizontal, ArrowUpRight,
  CheckCircle2, Zap, Eye, Loader2, RefreshCw, Shield,
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200, delay = 0) {
  const [v, setV] = useState(0)
  const prevRef = useRef(0)

  useEffect(() => {
    if (target === prevRef.current) return
    prevRef.current = target
    let alive = true
    let reqId: number
    const startVal = v
    const t = setTimeout(() => {
      const s = performance.now()
      const tick = (now: number) => {
        if (!alive) return
        const p = Math.min((now - s) / duration, 1)
        setV(startVal + Math.floor((1 - Math.pow(1 - p, 3)) * (target - startVal)))
        if (p < 1) reqId = requestAnimationFrame(tick)
        else setV(target)
      }
      reqId = requestAnimationFrame(tick)
    }, delay)
    return () => { alive = false; clearTimeout(t); if (reqId) cancelAnimationFrame(reqId) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])
  return v
}

/** Smart format: M for millions, B for billions */
function fmtExposure(v: number | null | undefined): string {
  if (v == null) return '—'
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}B`
  return `$${v.toFixed(1)}M`
}

function fmtPct(v: number | null | undefined, d = 2): string {
  return v == null ? '—' : `${(v * 100).toFixed(d)}%`
}

function safeDate(val: any, style: 'short' | 'time' = 'time'): string {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return '—'
  return style === 'short'
    ? d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
    : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ── KPI Cards ──────────────────────────────────────────────────────────────────
function KPICards({ kpis, summary }: { kpis: any; summary: any }) {
  const exposureRaw = kpis?.totalExposure ?? 0
  const eclRaw      = kpis?.totalEL ?? 0
  const pdRaw       = kpis?.avgPD ?? 0          // already in % form, e.g. 2.1040 = 2.10%
  const pendingRaw  = summary?.pendingDecisions ?? 0
  const coverageRatio = exposureRaw > 0 ? (eclRaw / exposureRaw) * 100 : 0

  // count-up targets in integer space
  const exposureInt = useCountUp(Math.round(exposureRaw * 10), 900, 200)
  const eclInt      = useCountUp(Math.round(eclRaw * 10),      1000, 300)
  const pdInt       = useCountUp(Math.round(pdRaw * 100),      900,  400)  // ×100 for int precision
  const decisions   = useCountUp(pendingRaw,                   800,  500)

  const overrideRate = summary?.overrideRate ?? null
  const gini         = summary?.model?.gini ?? null

  const cards = [
    {
      label: 'Total Portfolio (EAD)',
      value: exposureRaw > 0 ? fmtExposure(exposureInt / 10) : fmtExposure(exposureRaw),
      delta: summary?.model?.status ?? 'ML actif',
      deltaUp: true,
      sub: 'Exposition au Risque',
      icon: TrendingUp,
      iconColor: 'text-[#3ECF8E]',
      iconBg: 'bg-[#3ECF8E]/10 border-[#3ECF8E]/20',
      accent: '#3ECF8E',
      badge: null,
    },
    {
      label: 'ECL Portefeuille (IFRS 9)',
      value: eclRaw > 0 ? fmtExposure(eclInt / 10) : fmtExposure(eclRaw),
      delta: `Coverage ${coverageRatio.toFixed(2)}%`,
      deltaUp: coverageRatio >= 1,
      sub: 'Provision stock cumulée',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      accent: '#f59e0b',
      badge: coverageRatio >= 1
        ? { text: 'OK', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
        : { text: 'FAIBLE', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    },
    {
      label: 'PD Moyen Portfolio',
      value: pdRaw > 0 ? `${(pdInt / 100).toFixed(2)}%` : '—',
      delta: gini != null ? `Gini ${gini.toFixed(1)}%` : 'ML actif',
      deltaUp: gini != null ? gini >= 45 : true,
      sub: 'portfolio-wide (1Y)',
      icon: Activity,
      iconColor: 'text-[#3ECF8E]',
      iconBg: 'bg-[#3ECF8E]/10 border-[#3ECF8E]/20',
      accent: '#3ECF8E',
      badge: null,
    },
    {
      label: 'Pending Decisions',
      value: `${decisions}`,
      delta: overrideRate != null ? `Override ${overrideRate.toFixed(1)}%` : 'en attente',
      deltaUp: (overrideRate ?? 0) <= 15,
      sub: 'awaiting approval',
      icon: Clock,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-500/10 border-rose-500/20',
      accent: '#f43f5e',
      badge: pendingRaw > 20
        ? { text: 'URGENT', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/20' }
        : null,
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
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">{c.label}</span>
                {c.badge && (
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${c.badge.cls}`}>{c.badge.text}</span>
                )}
              </div>
              <div className={`w-7 h-7 rounded-lg ${c.iconBg} border flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${c.iconColor}`} />
              </div>
            </div>
            <div className="text-[28px] font-bold text-white tabular-nums tracking-tight leading-none mb-2">{c.value}</div>
            <div className="flex items-center gap-1.5">
              {c.deltaUp ? <TrendingUp className="w-3 h-3 text-[#3ECF8E]" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
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

// ── IFRS 9 Donut + ECL Trend ───────────────────────────────────────────────────
function PortfolioOverview({ kpis, summary, eclTrend }: { kpis: any; summary: any; eclTrend: any[] }) {
  const [progress, setProgress] = useState(0)
  const [mounted, setMounted]   = useState(false)
  const [hoveredSeg, setHoveredSeg] = useState<number | null>(null)
  const [hoverX, setHoverX]     = useState<number | null>(null)

  useEffect(() => {
    let alive = true; let reqId: number
    setMounted(true)
    const s = performance.now()
    const go = (now: number) => {
      if (!alive) return
      const p = Math.min((now - s) / 1400, 1)
      setProgress(1 - Math.pow(1 - p, 3))
      if (p < 1) reqId = requestAnimationFrame(go)
    }
    reqId = requestAnimationFrame(go)
    return () => { alive = false; if (reqId) cancelAnimationFrame(reqId) }
  }, [kpis])

  const total = kpis?.totalCounterparties ?? 0
  const s1Pct = kpis?.stage1Pct ?? 0
  const s2Pct = kpis?.stage2Pct ?? 0
  const s3Pct = kpis?.stage3Pct ?? 0
  const s2Count = summary?.stage2Count ?? Math.round(total * s2Pct / 100)
  const s3Count = summary?.stage3Count ?? Math.round(total * s3Pct / 100)
  const s1Count = total - s2Count - s3Count

  const segments = [
    { label: 'Stage 1', value: s1Pct, count: s1Count, color: '#3ECF8E', sub: 'Sain · 12M ECL' },
    { label: 'Stage 2', value: s2Pct, count: s2Count, color: '#f59e0b', sub: 'SICR détecté' },
    { label: 'Stage 3', value: s3Pct, count: s3Count, color: '#f43f5e', sub: 'Défaut · LT ECL' },
  ]
  const pctTotal = segments.reduce((s, d) => s + d.value, 0) || 100
  let cumAngle = -90
  const R = 52, cx = 75, cy = 75, th = 18

  const donutPaths = segments.map(seg => {
    const angle = (seg.value / pctTotal) * 360 * progress
    const sRad = (cumAngle * Math.PI) / 180
    const eRad = ((cumAngle + angle) * Math.PI) / 180
    cumAngle += (seg.value / pctTotal) * 360
    const x1 = cx + R * Math.cos(sRad),  y1 = cy + R * Math.sin(sRad)
    const x2 = cx + R * Math.cos(eRad),  y2 = cy + R * Math.sin(eRad)
    const ri = R - th
    const xi1 = cx + ri * Math.cos(sRad), yi1 = cy + ri * Math.sin(sRad)
    const xi2 = cx + ri * Math.cos(eRad), yi2 = cy + ri * Math.sin(eRad)
    const lg = angle > 180 ? 1 : 0
    return { ...seg, d: `M ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ri} ${ri} 0 ${lg} 0 ${xi1} ${yi1} Z` }
  })

  const W = 100, H = 60
  const eclData   = eclTrend.length > 0 ? eclTrend.map((p: any) => p.cumulativeEcl ?? 0) : [0]
  const eclLabels = eclTrend.length > 0 ? eclTrend.map((p: any) => p.label ?? '') : ['—']
  const maxEcl    = Math.max(...eclData, 1)
  const pts: [number, number][] = eclData.map((v, i) => [
    eclData.length > 1 ? (i / (eclData.length - 1)) * W : W / 2,
    H - (v / maxEcl) * H * progress,
  ])
  const linePath  = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
  const areaPath  = `${linePath} L ${W} ${H} L 0 ${H} Z`
  const xLabels   = eclLabels.length <= 1
    ? eclLabels
    : [...new Set([0, Math.floor(eclLabels.length / 3), Math.floor(eclLabels.length * 2 / 3), eclLabels.length - 1])].map(i => eclLabels[i])

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {/* Donut — IFRS 9 */}
      <div className="col-span-2 bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[13px] font-bold text-white">Allocation IFRS 9</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Répartition stades · {total} contreparties</div>
          </div>
          <button className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] transition-all">
            <MoreHorizontal className="w-3.5 h-3.5 text-zinc-500" />
          </button>
        </div>
        <div className="flex items-center gap-4">
          {mounted ? (
            <svg viewBox="0 0 150 150" className="w-[120px] h-[120px] flex-shrink-0">
              {donutPaths.map((seg, i) => (
                <path key={i} d={seg.d} fill={seg.color}
                  opacity={hoveredSeg === null || hoveredSeg === i ? '0.9' : '0.25'}
                  onMouseEnter={() => setHoveredSeg(i)}
                  onMouseLeave={() => setHoveredSeg(null)}
                  className="transition-opacity cursor-pointer"
                />
              ))}
              {hoveredSeg !== null ? (
                <>
                  <text x={cx} y={cy - 8} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold" fontFamily="monospace">
                    {segments[hoveredSeg].value.toFixed(1)}%
                  </text>
                  <text x={cx} y={cy + 5} textAnchor="middle" fontSize="5.5" fill={segments[hoveredSeg].color} fontFamily="sans-serif" fontWeight="bold">
                    {segments[hoveredSeg].count} cpties
                  </text>
                  <text x={cx} y={cy + 14} textAnchor="middle" fontSize="4.5" fill="#71717a" fontFamily="sans-serif">
                    {segments[hoveredSeg].sub}
                  </text>
                </>
              ) : (
                <>
                  <text x={cx} y={cy - 4} textAnchor="middle" fontSize="9" fill="white" fontWeight="bold" fontFamily="monospace">IFRS 9</text>
                  <text x={cx} y={cy + 8} textAnchor="middle" fontSize="5" fill="#71717a" fontFamily="sans-serif">Stages</text>
                </>
              )}
            </svg>
          ) : <div className="w-[120px] h-[120px] rounded-full bg-white/[0.03] flex-shrink-0" />}
          <div className="space-y-2.5 flex-1">
            {segments.map((s, i) => (
              <div key={i}
                className={`flex items-center justify-between cursor-pointer p-1.5 -mx-1 rounded-lg transition-colors ${hoveredSeg === i ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
                onMouseEnter={() => setHoveredSeg(i)}
                onMouseLeave={() => setHoveredSeg(null)}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <div>
                    <div className={`text-[11px] font-semibold ${hoveredSeg === i ? 'text-white' : 'text-zinc-400'}`}>{s.label}</div>
                    {hoveredSeg === i && <div className="text-[9px] text-zinc-600">{s.count} contreparties</div>}
                  </div>
                </div>
                <span className="text-[11px] font-bold tabular-nums" style={{ color: s.color }}>{s.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ECL trend — real data */}
      <div className="col-span-3 bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5 relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[13px] font-bold text-white">ECL Trend — 12 mois</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              {eclTrend.length > 0
                ? eclTrend[0]?.source === 'counterparties'
                  ? `Données contreparties · ${eclTrend.length} mois · ECL cumulé portfolio`
                  : `Données ML scorées · ${eclTrend.length} mois · scoringSnapshot`
                : 'En attente de données ECL'}
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
            <span className="text-[8px] text-[#3ECF8E] font-bold">LIVE</span>
          </div>
        </div>
        <div className="relative h-[105px]">
          {mounted && (
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
              className="w-full h-full cursor-crosshair"
              onMouseMove={e => {
                const r = e.currentTarget.getBoundingClientRect()
                setHoverX(((e.clientX - r.left) / r.width) * W)
              }}
              onMouseLeave={() => setHoverX(null)}
            >
              <defs>
                <linearGradient id="eclGradAdmin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3ECF8E" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3ECF8E" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[20, 40, 60, 80].map(y => (
                <line key={y} x1="0" y1={H - (y / 100) * H} x2={W} y2={H - (y / 100) * H}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="2 3" />
              ))}
              <path d={areaPath} fill="url(#eclGradAdmin)" />
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
                    <rect x={Math.min(Math.max(pt[0] - 16, 0), W - 32)} y={Math.max(pt[1] - 13, 0)} width="32" height="10" rx="2" fill="#000" stroke="#3ECF8E" strokeWidth="0.5" opacity="0.9" />
                    <text x={Math.min(Math.max(pt[0], 16), W - 16)} y={Math.max(pt[1] - 7, 6)} fontSize="3.5" fill="#3ECF8E" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                      {fmtExposure(eclData[idx])} · {eclLabels[idx]}
                    </text>
                  </g>
                )
              })()}
              {hoverX === null && progress > 0.9 && pts.length > 0 && (
                <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill="#3ECF8E"
                  style={{ filter: 'drop-shadow(0 0 6px #3ECF8E)' }} />
              )}
            </svg>
          )}
        </div>
        <div className="flex justify-between mt-2 px-1">
          {xLabels.map((m, i) => <span key={i} className="text-[9px] text-zinc-600 font-mono">{m}</span>)}
        </div>
      </div>
    </div>
  )
}

// ── Top 5 Concentrations ───────────────────────────────────────────────────────
function TopConcentrations({ data, isLoading, kpis }: { data: any[]; isLoading: boolean; kpis: any }) {
  const stageColor = (s: string) =>
    s === 'STAGE_3' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
    s === 'STAGE_2' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'

  const riskColor = (r: string) =>
    r === 'CRITICAL' ? 'text-red-400' : r === 'HIGH' ? 'text-rose-400' : r === 'MED' ? 'text-amber-400' : 'text-emerald-400'

  return (
    <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden mb-6">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-amber-400" />
          <div>
            <div className="text-[13px] font-bold text-white">Top 5 Concentrations</div>
            <div className="text-[10px] text-zinc-500">Expositions les plus élevées — surveillance Basel II Pillar 1</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600" />}
          <Link href="/counterparty"
            className="text-[11px] font-semibold text-[#3ECF8E] hover:text-[#3ECF8E]/80 transition-colors flex items-center gap-1">
            Voir tout <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-20"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-20 text-zinc-600 text-sm">Aucune contrepartie disponible</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                {['Rang', 'Contrepartie', 'Secteur', 'EAD', '% Portfolio', 'PD (1Y)', 'ECL', 'Stage', 'Risque'].map((h, i) => (
                  <th key={h} className={`px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-zinc-600 whitespace-nowrap ${i === 0 ? 'w-12' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((c: any, i: number) => (
                <Link href={`/counterparty/${c.id}`} key={c.id} legacyBehavior>
                  <tr className="border-b border-white/[0.03] hover:bg-white/[0.025] transition-colors cursor-pointer group">
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-black tabular-nums ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        #{i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.05] flex items-center justify-center text-[8px] font-bold text-zinc-400 flex-shrink-0">
                          {(c.name ?? 'XX').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[12px] font-semibold text-white truncate max-w-[160px] group-hover:text-[#3ECF8E] transition-colors">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-[11px]">{c.sector ?? '—'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-white whitespace-nowrap">{fmtExposure(c.exposure)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-amber-500/60" style={{ width: `${Math.min(c.pct * 5, 100)}%` }} />
                        </div>
                        <span className="font-mono text-[10px] text-zinc-400">{c.pct?.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono whitespace-nowrap">
                      <span className={`font-bold ${(c.pd1y ?? 0) > 6 ? 'text-rose-400' : (c.pd1y ?? 0) > 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {c.pd1y != null ? `${c.pd1y.toFixed(2)}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-400 whitespace-nowrap">{fmtExposure(c.ecl)}</td>
                    <td className="px-4 py-3">
                      {c.ifrs9Stage ? (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${stageColor(c.ifrs9Stage)}`}>
                          {c.ifrs9Stage.replace('_', ' ')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold ${riskColor(c.riskLevel ?? '')}`}>{c.riskLevel ?? '—'}</span>
                    </td>
                  </tr>
                </Link>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
        <div className="flex items-center justify-center h-24"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>
      ) : queue.length === 0 ? (
        <div className="flex items-center justify-center h-20 text-zinc-600 text-sm gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Aucune décision en attente
        </div>
      ) : (
        <>
          <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-white/[0.01] border-b border-white/[0.04]">
            {['Case ID', 'Counterparty', 'Amount', 'Rating', 'PD', 'Stage', 'Âge', 'Status'].map((h, i) => (
              <div key={h} className={`text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-600 ${
                i === 1 ? 'col-span-3' : i === 7 ? 'col-span-2 text-right' : ''
              }`}>{h}</div>
            ))}
          </div>
          <div className="divide-y divide-white/[0.03]">
            {queue.slice(0, 7).map((d: any) => (
              <div key={d.id} onClick={() => router.push('/decisioning')}
                className={`grid grid-cols-12 gap-2 items-center px-5 py-3.5 hover:bg-white/[0.02] transition-all cursor-pointer group ${d.slaBreached ? 'bg-rose-500/[0.03]' : ''}`}>
                <div className="text-[11px] font-mono text-zinc-500">{d.reqId ?? d.id?.slice(0, 8)}</div>
                <div className="col-span-3 flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.05] flex items-center justify-center text-[8px] font-bold text-zinc-400 flex-shrink-0">
                    {(d.counterpartyName ?? 'XX').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[12px] font-semibold text-white truncate">{d.counterpartyName ?? '—'}</span>
                </div>
                <div className="text-[12px] font-mono text-zinc-300 font-semibold">
                  {d.requestedAmount != null ? fmtExposure(d.requestedAmount) : '—'}
                </div>
                <div>
                  {d.internalRating ? (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      d.internalRating.startsWith('A') ? 'text-[#3ECF8E] bg-[#3ECF8E]/10 border-[#3ECF8E]/20' :
                      d.internalRating.startsWith('BB') ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
                      'text-rose-400 bg-rose-400/10 border-rose-400/20'
                    }`}>{d.internalRating}</span>
                  ) : <span className="text-zinc-700 text-[10px]">—</span>}
                </div>
                <div className="font-mono font-bold whitespace-nowrap">
                  <span className={d.pd != null ? (d.pd > 6 ? 'text-rose-400' : d.pd > 3 ? 'text-amber-400' : 'text-emerald-400') : 'text-zinc-600'}>
                    {d.pd != null ? `${d.pd.toFixed(2)}%` : '—'}
                  </span>
                </div>
                <div>
                  {d.ifrs9Stage ? (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      d.ifrs9Stage === 'STAGE_3' ? 'bg-rose-500/20 text-rose-400' :
                      d.ifrs9Stage === 'STAGE_2' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-emerald-500/10 text-emerald-500'
                    }`}>{d.ifrs9Stage.replace('_', ' ')}</span>
                  ) : '—'}
                </div>
                <div className="font-mono whitespace-nowrap">
                  <span className={d.ageInDays >= 7 ? 'text-rose-400 font-bold' : d.ageInDays >= 3 ? 'text-amber-400' : 'text-zinc-500'}>
                    {d.ageInDays != null ? `${d.ageInDays}j` : '—'}
                  </span>
                  {d.slaBreached && <span className="ml-1 text-[8px] font-bold text-rose-400">SLA</span>}
                </div>
                <div className="col-span-2 text-right relative flex items-center justify-end">
                  <span className={`text-[9px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wide transition-opacity group-hover:opacity-0 ${stageStyle[d.status] ?? stageStyle.PENDING}`}>
                    {d.status}
                  </span>
                  <div className="absolute right-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); router.push('/decisioning') }}
                      className="w-6 h-6 rounded bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 text-[#3ECF8E] flex items-center justify-center hover:bg-[#3ECF8E]/20 transition-colors">
                      <CheckCircle2 className="w-3 h-3" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); router.push('/decisioning') }}
                      className="w-6 h-6 rounded bg-white/[0.04] border border-white/[0.08] text-zinc-400 flex items-center justify-center hover:bg-white/[0.1] hover:text-white transition-colors">
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Right Panel ────────────────────────────────────────────────────────────────
function RightPanel({ alerts, auditEvents, summary }: { alerts: any[]; auditEvents: any[]; summary: any }) {
  const router = useRouter()

  const activityIcon = (action: string) => {
    if (!action) return { Icon: Eye, color: 'text-zinc-500' }
    const a = action.toUpperCase()
    if (a.includes('APPROV'))  return { Icon: CheckCircle2,  color: 'text-[#3ECF8E]' }
    if (a.includes('SCORE') || a.includes('DECISION')) return { Icon: Zap, color: 'text-blue-400' }
    if (a.includes('OVERRIDE') || a.includes('ALERT')) return { Icon: AlertTriangle, color: 'text-amber-400' }
    return { Icon: Eye, color: 'text-purple-400' }
  }

  const alertDot   = (s: string) => s === 'CRITICAL' ? 'bg-rose-400' : s === 'WARNING' ? 'bg-amber-400' : 'bg-blue-400'
  const alertColor = (s: string) => s === 'CRITICAL' ? 'text-rose-400' : s === 'WARNING' ? 'text-amber-400' : 'text-blue-400'

  const team = [
    { name: 'Kevin Park',  role: 'Risk Analyst',  initials: 'KP', color: 'from-blue-500 to-blue-700' },
    { name: 'Maya Torres', role: 'Senior Analyst', initials: 'MT', color: 'from-purple-500 to-purple-700' },
    { name: 'Nkechi Obi',  role: 'Credit Manager', initials: 'NO', color: 'from-amber-500 to-amber-700' },
  ]

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
          <div className="flex items-center justify-center h-16 text-zinc-600 text-xs gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Aucune alerte active
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {alerts.slice(0, 5).map((a: any) => (
              <button key={a.id} onClick={() => router.push('/admin/alert-center')}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-all cursor-pointer group text-left">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${alertDot(a.severity)}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-[10.5px] font-medium leading-snug ${alertColor(a.severity)}`}>{a.message}</div>
                  <div className="text-[9px] text-zinc-600 mt-0.5">{safeDate(a.createdAt, 'short')}</div>
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
          <Link href="/compliance" className="text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors">Voir tout</Link>
        </div>
        {auditEvents.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-zinc-600 text-xs">Aucune activité récente</div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {auditEvents.slice(0, 4).map((a: any, i: number) => {
              const { Icon, color } = activityIcon(a.eventType)
              return (
                <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-all cursor-pointer">
                  <div className="w-6 h-6 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-3 h-3 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10.5px] font-semibold text-white leading-tight truncate">{a.eventType ?? '—'}</div>
                    <div className="text-[9px] text-zinc-500 mt-0.5 truncate">{a.entityType ?? ''}</div>
                  </div>
                  <span className="text-[8px] text-zinc-600 font-mono flex-shrink-0">{safeDate(a.createdAt, 'time')}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ML Model */}
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
              { label: 'Gini',          value: summary.model?.gini != null ? `${summary.model.gini.toFixed(1)}%` : '—', ok: (summary.model?.gini ?? 0) >= 45, threshold: 'floor 45%' },
              { label: 'AUC',           value: summary.model?.auc  != null ? summary.model.auc.toFixed(3) : '—',        ok: (summary.model?.auc ?? 0) >= 0.7,  threshold: 'min 0.700' },
              { label: 'PSI',           value: summary.model?.psi  != null ? summary.model.psi.toFixed(4) : '—',        ok: (summary.model?.psi ?? 1) < 0.10,  threshold: 'max 0.100' },
              { label: 'Override Rate', value: summary.overrideRate != null ? `${summary.overrideRate.toFixed(1)}%` : '—', ok: (summary.overrideRate ?? 100) <= 15, threshold: 'max 15%' },
            ].map(m => (
              <div key={m.label} className="flex items-center justify-between px-4 py-2.5 group hover:bg-white/[0.02] transition-colors">
                <div>
                  <div className="text-[10px] text-zinc-500">{m.label}</div>
                  <div className="text-[8px] text-zinc-700 mt-0.5">{m.threshold}</div>
                </div>
                <span className={`text-[11px] font-mono font-bold ${m.ok ? 'text-emerald-400' : 'text-amber-400'}`}>{m.value}</span>
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
                <div className="text-[11px] font-semibold text-white">{m.name}</div>
                <div className="text-[9px] text-zinc-500">{m.role}</div>
              </div>
              <Link href="/decisioning" onClick={e => e.stopPropagation()}
                className="w-6 h-6 rounded-md bg-white/[0.05] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-all opacity-0 group-hover:opacity-100">
                <FileText className="w-2.5 h-2.5 text-zinc-400" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminOverviewPage() {
  const router = useRouter()

  const [userName, setUserName] = useState('Elena')
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('internal_user') ?? '{}')
      setUserName(u.firstName ?? u.name ?? u.email?.split('@')[0] ?? 'Elena')
    } catch { /* ignore */ }
  }, [])

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  const kpiQ       = useQuery({ queryKey: ['counterparty-kpis'],            queryFn: () => fetchApi('/counterparties/kpis'),                     refetchInterval: 60_000 })
  const summaryQ   = useQuery({ queryKey: ['monitoring-dashboard-summary'], queryFn: () => fetchApi('/monitoring/dashboard-summary'),            refetchInterval: 60_000 })
  const eclTrendQ  = useQuery({ queryKey: ['ecl-trend'],                    queryFn: () => fetchApi('/compliance/reports/ecl-trend?months=12')                         })
  const alertsQ    = useQuery({ queryKey: ['monitoring-alerts'],            queryFn: () => fetchApi('/monitoring/alerts?resolved=false'),        refetchInterval: 30_000 })
  const auditQ     = useQuery({ queryKey: ['audit-recent'],                 queryFn: () => fetchApi('/compliance/audit?page=1&limit=4'),         refetchInterval: 60_000 })
  const queueQ     = useQuery({ queryKey: ['decisions-queue'],              queryFn: () => fetchApi('/decisions/queue?limit=10'),                refetchInterval: 30_000 })
  const topExpQ    = useQuery({ queryKey: ['top-exposures'],                queryFn: () => fetchApi('/counterparties/top-exposures?limit=5'),    refetchInterval: 120_000 })

  const kpis       = kpiQ.data
  const summary    = summaryQ.data
  const eclTrend   = eclTrendQ.data ?? []
  const alerts     = alertsQ.data ?? []
  const auditRaw   = auditQ.data
  const auditItems = Array.isArray(auditRaw) ? auditRaw : (auditRaw?.data ?? [])
  const queue      = queueQ.data ?? []
  const topExp     = topExpQ.data ?? []

  const isLoading  = kpiQ.isLoading || summaryQ.isLoading
  const hasError   = kpiQ.isError || summaryQ.isError

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <main className="flex-1 p-6 flex gap-5 overflow-hidden">
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
                className="px-4 py-2 bg-white/[0.03] border border-white/[0.1] text-white text-[12px] font-bold rounded-lg hover:bg-white/[0.08] transition-all flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Export Report
              </Link>
              <Link href="/stress-testing"
                className="px-5 py-2.5 bg-[#3ECF8E] text-[#0a0a0a] text-[12px] font-bold rounded-lg hover:bg-[#3ECF8E]/90 transition-all shadow-[0_0_20px_rgba(62,207,142,0.25)] hover:scale-105 active:scale-95 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> Run Stress Test
              </Link>
            </div>
          </div>

          <KPICards kpis={kpis} summary={summary} />
          <PortfolioOverview kpis={kpis} summary={summary} eclTrend={eclTrend} />
          <TopConcentrations data={topExp} isLoading={topExpQ.isLoading} kpis={kpis} />
          <DecisionTable queue={queue} isLoading={queueQ.isLoading} router={router} />
        </div>

        <RightPanel alerts={alerts} auditEvents={auditItems} summary={summary} />
      </main>
    </div>
  )
}
