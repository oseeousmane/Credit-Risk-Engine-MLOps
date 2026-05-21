'use client'
import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard, GitMerge, Activity, Users, Shield, Bell, Settings,
  ChevronRight, TrendingUp, TrendingDown, AlertTriangle, Clock,
  BarChart2, FileText, Search, MoreHorizontal, ArrowUpRight,
  CheckCircle2, Circle, Zap, Eye
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────
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

// ── KPI Cards ──────────────────────────────────────────────────────────────────
function KPICards() {
  const exposure = useCountUp(24, 900, 200)
  const ecl      = useCountUp(187, 1000, 300)
  const pd       = useCountUp(182, 900, 400)
  const decisions= useCountUp(47, 800, 500)

  const cards = [
    {
      label: 'Total Portfolio',
      value: `$${(exposure / 10).toFixed(1)}B`,
      delta: '+3.2%', deltaUp: true,
      sub: 'vs last quarter',
      icon: TrendingUp, iconColor: 'text-[#3ECF8E]', iconBg: 'bg-[#3ECF8E]/10 border-[#3ECF8E]/20',
      accent: '#3ECF8E',
    },
    {
      label: 'ECL This Quarter',
      value: `$${(ecl / 10).toFixed(1)}M`,
      delta: '+1.1%', deltaUp: false,
      sub: 'Expected Credit Loss',
      icon: AlertTriangle, iconColor: 'text-amber-400', iconBg: 'bg-amber-500/10 border-amber-500/20',
      accent: '#f59e0b',
    },
    {
      label: 'Avg PD (1Y)',
      value: `${(pd / 100).toFixed(2)}%`,
      delta: '-0.14pp', deltaUp: true,
      sub: 'portfolio-wide',
      icon: Activity, iconColor: 'text-[#3ECF8E]', iconBg: 'bg-[#3ECF8E]/10 border-[#3ECF8E]/20',
      accent: '#3ECF8E',
    },
    {
      label: 'Pending Decisions',
      value: `${decisions}`,
      delta: '12 urgent', deltaUp: false,
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
            {/* Subtle animated bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: `linear-gradient(to right, transparent, ${c.accent}80, transparent)` }} />
          </div>
        )
      })}
    </div>
  )
}

// ── Portfolio Overview Chart (Donut + Area) ────────────────────────────────────
function PortfolioOverview() {
  const [progress, setProgress] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [hoveredSeg, setHoveredSeg] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState<number | null>(null)

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

    return () => {
      isMounted = false
      if (reqId) cancelAnimationFrame(reqId)
    }
  }, [])

  // Donut data
  const segments = [
    { label: 'Corporate', value: 42, color: '#3ECF8E' },
    { label: 'SME',       value: 31, color: '#10b981' },
    { label: 'Real Est.', value: 17, color: '#8B5CF6' },
    { label: 'Micro',     value: 10, color: '#f59e0b' },
  ]
  const total = segments.reduce((s, d) => s + d.value, 0)
  let cumAngle = -90
  const R = 52, cx = 75, cy = 75, thickness = 18

  const donutPaths = segments.map(seg => {
    const angle = (seg.value / total) * 360 * progress
    const startRad = (cumAngle * Math.PI) / 180
    const endRad = ((cumAngle + angle) * Math.PI) / 180
    cumAngle += (seg.value / total) * 360
    const x1 = cx + R * Math.cos(startRad), y1 = cy + R * Math.sin(startRad)
    const x2 = cx + R * Math.cos(endRad),   y2 = cy + R * Math.sin(endRad)
    const large = angle > 180 ? 1 : 0
    const ri = R - thickness
    const xi1 = cx + ri * Math.cos(startRad), yi1 = cy + ri * Math.sin(startRad)
    const xi2 = cx + ri * Math.cos(endRad),   yi2 = cy + ri * Math.sin(endRad)
    return { ...seg, d: `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ri} ${ri} 0 ${large} 0 ${xi1} ${yi1} Z` }
  })

  // Area chart data
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const eclData = [52,48,61,55,70,63,58,74,68,80,75,88]
  const W = 100, H = 60
  const pts: [number,number][] = eclData.map((v, i) => [(i / 11) * W, H - (v / 100) * H * progress])
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
  const areaPath = `${linePath} L ${W} ${H} L 0 ${H} Z`

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {/* Donut card */}
      <div className="col-span-2 bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[13px] font-bold text-white">Portfolio Breakdown</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">By segment · $2.4B total</div>
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
                  opacity={hoveredSeg === null || hoveredSeg === i ? "0.9" : "0.3"} 
                  onMouseEnter={() => setHoveredSeg(i)}
                  onMouseLeave={() => setHoveredSeg(null)}
                  className="transition-opacity cursor-pointer hover:filter hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                />
              ))}
              {/* Center text */}
              <text x={cx} y={cy - 6} textAnchor="middle" fontSize="14" fill="white" fontWeight="bold" fontFamily="monospace">
                {hoveredSeg !== null ? `${segments[hoveredSeg].value}%` : '$2.4B'}
              </text>
              <text x={cx} y={cy + 8} textAnchor="middle" fontSize="6" fill="#71717a" fontFamily="sans-serif">
                {hoveredSeg !== null ? segments[hoveredSeg].label : 'Portfolio'}
              </text>
            </svg>
          ) : <div className="w-[120px] h-[120px] rounded-full bg-white/[0.03] flex-shrink-0" />}
          <div className="space-y-2.5 flex-1">
            {segments.map((s, i) => (
              <div 
                key={i} 
                className={`flex items-center justify-between cursor-pointer p-1 -mx-1 rounded transition-colors ${hoveredSeg === i ? 'bg-white/[0.06]' : ''}`}
                onMouseEnter={() => setHoveredSeg(i)}
                onMouseLeave={() => setHoveredSeg(null)}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className={`text-[11px] font-medium ${hoveredSeg === i ? 'text-white' : 'text-zinc-400'}`}>{s.label}</span>
                </div>
                <span className="text-[11px] font-bold tabular-nums" style={{ color: s.color }}>{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Area chart card */}
      <div className="col-span-3 bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5 relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[13px] font-bold text-white">ECL Trend — FY 2026</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Expected Credit Loss monthly evolution</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#3ECF8E]">↑ 10% vs Q1</span>
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
                const x = e.clientX - rect.left
                setHoverX((x / rect.width) * W)
              }}
              onMouseLeave={() => setHoverX(null)}
            >
              <defs>
                <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3ECF8E" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3ECF8E" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[20, 40, 60, 80].map(y => (
                <line key={y} x1="0" y1={H - (y / 100) * H} x2={W} y2={H - (y / 100) * H}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="2 3" />
              ))}
              <path d={areaPath} fill="url(#areaGreen)" />
              <path d={linePath} fill="none" stroke="#3ECF8E" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0 0 4px rgba(62,207,142,0.7))' }} />
                
              {hoverX !== null && progress > 0.9 && (() => {
                 const idx = Math.min(Math.max(Math.round((hoverX / W) * (pts.length - 1)), 0), pts.length - 1)
                 const pt = pts[idx]
                 return (
                   <g>
                     <line x1={pt[0]} y1={0} x2={pt[0]} y2={H} stroke="rgba(255,255,255,0.2)" strokeDasharray="1 2" strokeWidth="0.5" />
                     <circle cx={pt[0]} cy={pt[1]} r="2.5" fill="#3ECF8E" style={{ filter: 'drop-shadow(0 0 6px #3ECF8E)' }} />
                     <circle cx={pt[0]} cy={pt[1]} r="5" fill="#3ECF8E" opacity="0.2" />
                     <rect x={Math.min(Math.max(pt[0] - 12, 0), W - 24)} y={Math.max(pt[1] - 12, 0)} width="24" height="9" rx="1.5" fill="#000" stroke="#3ECF8E" strokeWidth="0.5" opacity="0.9" />
                     <text x={Math.min(Math.max(pt[0], 12), W - 12)} y={Math.max(pt[1] - 6.5, 5.5)} fontSize="3.5" fill="#3ECF8E" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                       ${eclData[idx]}M ({months[idx]})
                     </text>
                   </g>
                 )
              })()}

              {hoverX === null && progress > 0.9 && (
                <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill="#3ECF8E"
                  style={{ filter: 'drop-shadow(0 0 6px #3ECF8E)' }} />
              )}
            </svg>
          ) : <div className="h-full bg-white/[0.02] rounded-xl" />}
        </div>
        <div className="flex justify-between mt-2 px-1">
          {['Jan','Apr','Jul','Oct','Dec'].map(m => (
            <span key={m} className="text-[9px] text-zinc-600 font-mono">{m}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Decision Table ─────────────────────────────────────────────────────────────
function DecisionTable() {
  const decisions = [
    { id: 'DC-4821', entity: 'Acme Heavy Industries',    amount: '$12.0M', rating: 'BBB', pd: '1.2%', stage: 'APPROVED', analyst: 'K. Park',   delta: 'down' },
    { id: 'DC-4820', entity: 'Global Logistics Partners', amount: '$8.5M',  rating: 'BB+', pd: '3.8%', stage: 'REVIEW',   analyst: 'M. Torres', delta: 'up'   },
    { id: 'DC-4818', entity: 'Meridian Capital Group',   amount: '$24.0M', rating: 'A-',  pd: '0.7%', stage: 'SCORING',  analyst: 'N. Obi',    delta: 'down' },
    { id: 'DC-4815', entity: 'Orion Finance Ltd.',       amount: '$5.2M',  rating: 'BB',  pd: '4.1%', stage: 'PENDING',  analyst: 'L. Chen',   delta: 'up'   },
    { id: 'DC-4812', entity: 'Vantage Retail Group',     amount: '$3.8M',  rating: 'B+',  pd: '5.6%', stage: 'REVIEW',   analyst: 'R. Singh',  delta: 'up'   },
  ]

  const stageStyle: Record<string, string> = {
    APPROVED: 'text-[#3ECF8E] bg-[#3ECF8E]/10 border-[#3ECF8E]/20',
    REVIEW:   'text-amber-400 bg-amber-400/10 border-amber-400/20',
    SCORING:  'text-blue-400 bg-blue-400/10 border-blue-400/20',
    PENDING:  'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
            <span className="text-[10px] text-zinc-400 font-medium">47 open</span>
          </div>
          <button className="text-[11px] font-semibold text-[#3ECF8E] hover:text-[#3ECF8E]/80 transition-colors flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-white/[0.01] border-b border-white/[0.04]">
        {['Case ID', 'Counterparty', 'Amount', 'Rating', 'PD', 'Analyst', 'Status'].map((h, i) => (
          <div key={h} className={`text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-600 ${
            i === 1 ? 'col-span-3' : i === 6 ? 'col-span-2 text-right' : ''
          }`}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/[0.03]">
        {decisions.map((d) => (
          <div key={d.id} className="grid grid-cols-12 gap-2 items-center px-5 py-3.5 hover:bg-white/[0.02] transition-all cursor-pointer group">
            <div className="text-[11px] font-mono text-zinc-500">{d.id}</div>
            <div className="col-span-3 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.05] flex items-center justify-center text-[8px] font-bold text-zinc-400 flex-shrink-0">
                {d.entity.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-[12px] font-semibold text-white truncate">{d.entity}</span>
            </div>
            <div className="text-[12px] font-mono text-zinc-300 font-semibold">{d.amount}</div>
            <div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                d.rating.includes('A') ? 'text-[#3ECF8E] bg-[#3ECF8E]/10 border-[#3ECF8E]/20' :
                d.rating.includes('BB') ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
                'text-rose-400 bg-rose-400/10 border-rose-400/20'
              }`}>{d.rating}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-mono text-zinc-300">{d.pd}</span>
              <span className={d.delta === 'down' ? 'text-[#3ECF8E] text-[10px]' : 'text-rose-400 text-[10px]'}>
                {d.delta === 'down' ? '↓' : '↑'}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 font-medium">{d.analyst}</div>
            <div className="col-span-2 text-right relative flex items-center justify-end">
              <span className={`text-[9px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wide transition-opacity group-hover:opacity-0 ${stageStyle[d.stage]}`}>
                {d.stage}
              </span>
              <div className="absolute right-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button title="Approve" className="w-6 h-6 rounded bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 text-[#3ECF8E] flex items-center justify-center hover:bg-[#3ECF8E]/20 transition-colors"><CheckCircle2 className="w-3 h-3" /></button>
                <button title="Review" className="w-6 h-6 rounded bg-white/[0.04] border border-white/[0.08] text-zinc-400 flex items-center justify-center hover:bg-white/[0.1] hover:text-white transition-colors"><MoreHorizontal className="w-3 h-3" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Right Panel ────────────────────────────────────────────────────────────────
function RightPanel() {
  const alerts = [
    { type: 'risk',    msg: 'DC-4820: PD breached 3.5% threshold', time: '2m ago',  color: 'text-rose-400', bg: 'bg-rose-500/10', dot: 'bg-rose-400' },
    { type: 'info',   msg: 'Model v4.2 retraining completed',       time: '18m ago', color: 'text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-400' },
    { type: 'ok',     msg: 'DC-4821 approved — $12M committed',     time: '1h ago',  color: 'text-[#3ECF8E]', bg: 'bg-[#3ECF8E]/10', dot: 'bg-[#3ECF8E]' },
    { type: 'warn',   msg: 'Stage 2 migration: +3 counterparties',  time: '2h ago',  color: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-400' },
    { type: 'info',   msg: '132 scoring jobs completed successfully', time: '3h ago', color: 'text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-400' },
  ]

  const activities = [
    { icon: CheckCircle2, label: 'Auto-approval rule updated',  sub: 'PD threshold: 0.5%', color: 'text-[#3ECF8E]', time: '5m' },
    { icon: Eye,          label: 'Stress test scenario run',    sub: 'Macro shock: -200bps', color: 'text-blue-400', time: '34m' },
    { icon: AlertTriangle,label: 'Override logged: DC-4820',    sub: 'Manual review flagged', color: 'text-amber-400', time: '1h' },
    { icon: Zap,          label: 'Pipeline batch processed',    sub: '47 new applications', color: 'text-purple-400', time: '2h' },
  ]

  const team = [
    { name: 'Kevin Park',   role: 'Risk Analyst',  initials: 'KP', color: 'from-blue-500 to-blue-700' },
    { name: 'Maya Torres',  role: 'Senior Analyst', initials: 'MT', color: 'from-purple-500 to-purple-700' },
    { name: 'Nkechi Obi',   role: 'Credit Manager', initials: 'NO', color: 'from-amber-500 to-amber-700' },
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
          <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">5 new</span>
        </div>
        <div className="divide-y divide-white/[0.03]">
          {alerts.map((a, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-all cursor-pointer group">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${a.dot}`} />
              <div className="flex-1 min-w-0">
                <div className={`text-[10.5px] font-medium leading-tight ${a.color}`}>{a.msg}</div>
                <div className="text-[9px] text-zinc-600 mt-0.5">{a.time}</div>
              </div>
              <ChevronRight className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
            </div>
          ))}
        </div>
      </div>

      {/* Activities */}
      <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[12px] font-bold text-white">Activities</span>
          </div>
        </div>
        <div className="divide-y divide-white/[0.03]">
          {activities.map((a, i) => {
            const Icon = a.icon
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-all cursor-pointer group">
                <div className={`w-6 h-6 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-3 h-3 ${a.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10.5px] font-semibold text-white leading-tight">{a.label}</div>
                  <div className="text-[9px] text-zinc-500 mt-0.5">{a.sub}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[8px] text-zinc-600 font-mono flex-shrink-0">{a.time}</span>
                  <ChevronRight className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Team */}
      <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-4 py-3.5 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
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
                <button className="w-6 h-6 rounded-md bg-white/[0.05] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-all">
                  <FileText className="w-2.5 h-2.5 text-zinc-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CRODashboard() {
  return (
    <div className="flex-1 flex flex-col min-w-0">



        {/* Page content */}
        <main className="flex-1 p-6 flex gap-5 overflow-hidden">
          {/* Center content */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            {/* Page title */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-bold text-white tracking-tight leading-none">Good evening, Elena 👋</h1>
                <p className="text-[12px] text-zinc-500 mt-1.5">CRO Dashboard · Q2 2026 · Portfolio review is ready</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 bg-white/[0.03] border border-white/[0.1] text-white text-[12px] font-bold rounded-lg hover:bg-white/[0.08] transition-all backdrop-blur-md">
                  Export Report
                </button>
                <button className="px-5 py-2.5 bg-[#3ECF8E] text-[#0a0a0a] text-[12px] font-bold rounded-lg hover:bg-[#3ECF8E]/90 transition-all shadow-[0_0_20px_rgba(62,207,142,0.25)] hover:shadow-[0_0_30px_rgba(62,207,142,0.4)] hover:scale-105 active:scale-95">
                  Run Stress Test
                </button>
              </div>
            </div>

            <KPICards />
            <PortfolioOverview />
            <DecisionTable />
          </div>

          {/* Right panel */}
          <RightPanel />
        </main>
    </div>
  )
}

