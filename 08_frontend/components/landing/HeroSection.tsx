'use client'
import Link from 'next/link'
import { Shield, Activity, TrendingUp, AlertTriangle, Clock, Zap, GitMerge, BarChart2, FileText, Settings, Bell, Users, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/LanguageContext'

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now()
      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1)
        const e = 1 - Math.pow(1 - p, 3)
        setValue(Math.floor(e * target))
        if (p < 1) requestAnimationFrame(step)
        else setValue(target)
      }
      requestAnimationFrame(step)
    }, delay)
    return () => clearTimeout(timeout)
  }, [target, duration, delay])
  return value
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function MockupSidebar() {
  const navItems = [
    { icon: BarChart2, label: 'Dashboard', active: true },
    { icon: GitMerge,  label: 'Pipeline',  active: false },
    { icon: FileText,  label: 'Decisions', active: false },
    { icon: Activity,  label: 'Monitoring',active: false },
    { icon: Users,     label: 'Portfolio', active: false },
    { icon: Bell,      label: 'Alerts',    active: false },
    { icon: Settings,  label: 'Settings',  active: false },
  ]
  return (
    <div className="w-[160px] flex-shrink-0 border-r border-white/[0.06] bg-[#070707] flex flex-col">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/[0.06] flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#3ECF8E] to-emerald-600 flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-[#030303]" />
        </div>
        <span className="text-[12px] font-bold text-white tracking-tight">Octaix</span>
      </div>
      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                item.active
                  ? 'bg-[#3ECF8E]/10 text-[#3ECF8E]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[11px] font-semibold">{item.label}</span>
              {item.active && <div className="ml-auto w-1 h-1 rounded-full bg-[#3ECF8E]" />}
            </div>
          )
        })}
      </nav>
      {/* User */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#3ECF8E] to-emerald-800 flex items-center justify-center text-[9px] font-black text-[#030303]">ER</div>
          <div>
            <div className="text-[10px] font-bold text-white leading-none">E. Rostova</div>
            <div className="text-[9px] text-[#3ECF8E] mt-0.5">CRO</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────
function MockupKPIs() {
  const exposure = useCountUp(24, 900, 300)
  const pd       = useCountUp(182, 1000, 400)
  const pending  = useCountUp(47, 800, 500)

  const cards = [
    {
      label: 'Total Exposure', value: `$${(exposure / 10).toFixed(1)}B`,
      badge: '↑ +3.2%', badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      sub: 'vs Q1 2026', subColor: 'text-zinc-600',
      icon: TrendingUp, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10 border-blue-500/20',
      bar: { value: (exposure / 10 / 3.5) * 100, color: 'from-blue-500 to-blue-400', glow: 'rgba(59,130,246,0.5)', label: 'Limit utilization', pct: '72%' },
      spark: '0,18 10,15 25,16 40,11 55,13 70,8 85,10 100,6', sparkColor: '#3B82F6',
      hover: 'hover:border-blue-500/20',
    },
    {
      label: 'Avg PD (1Y)', value: `${(pd / 100).toFixed(2)}%`,
      badge: '↓ −0.14pp', badgeColor: 'text-[#3ECF8E] bg-[#3ECF8E]/10 border-[#3ECF8E]/20',
      sub: 'portfolio-wide', subColor: 'text-zinc-600',
      icon: Activity, iconColor: 'text-[#3ECF8E]', iconBg: 'bg-[#3ECF8E]/10 border-[#3ECF8E]/20',
      bar: { value: (pd / 100 / 5) * 100, color: 'from-[#3ECF8E] to-emerald-400', glow: 'rgba(62,207,142,0.5)', label: 'Risk threshold', pct: `${(pd/100).toFixed(2)}% / 5%` },
      spark: '0,16 12,14 25,12 38,15 50,10 62,8 75,11 88,7 100,5', sparkColor: '#3ECF8E',
      hover: 'hover:border-[#3ECF8E]/20',
    },
    {
      label: 'Pending Decisions', value: `${pending}`,
      badge: '12 urgent', badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      sub: '35 standard', subColor: 'text-zinc-600',
      icon: Clock, iconColor: 'text-amber-400', iconBg: 'bg-amber-500/10 border-amber-500/20',
      bar: { value: (12 / 47) * 100, color: 'from-rose-500 to-rose-400', glow: 'rgba(239,68,68,0.5)', label: 'Urgent ratio', pct: '25%' },
      spark: '0,14 15,12 30,15 45,10 60,14 75,9 90,11 100,8', sparkColor: '#f59e0b',
      hover: 'hover:border-amber-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2.5 mb-3">
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <div key={i} className={`relative bg-[#0a0a0a] border border-white/[0.07] rounded-xl p-3 overflow-hidden group ${c.hover} transition-all duration-300`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {/* Row 1: label + icon */}
            <div className="flex items-center justify-between mb-2 relative z-10">
              <span className="text-[8.5px] font-bold uppercase tracking-[0.15em] text-zinc-500">{c.label}</span>
              <div className={`w-5 h-5 rounded-md ${c.iconBg} border flex items-center justify-center`}>
                <Icon className={`w-2.5 h-2.5 ${c.iconColor}`} />
              </div>
            </div>
            {/* Row 2: value + badge */}
            <div className="flex items-baseline gap-2 mb-2 relative z-10">
              <span className="text-[22px] font-bold text-white tabular-nums tracking-tight leading-none">{c.value}</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[8px] font-bold ${c.badgeColor}`}>{c.badge}</span>
              <span className={`text-[8px] ${c.subColor}`}>{c.sub}</span>
            </div>
            {/* Row 3: progress bar */}
            <div className="relative z-10">
              <div className="flex justify-between mb-1">
                <span className="text-[7.5px] text-zinc-600 font-medium">{c.bar.label}</span>
                <span className="text-[7.5px] text-zinc-500 font-bold tabular-nums">{c.bar.pct}</span>
              </div>
              <div className="h-[2.5px] bg-white/[0.05] rounded-full overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r ${c.bar.color}`}
                  style={{ width: `${Math.min(c.bar.value, 100)}%`, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)', boxShadow: `0 0 6px ${c.bar.glow}` }} />
              </div>
            </div>
            {/* Sparkline */}
            <svg className="absolute bottom-0 left-0 right-0 h-8 w-full opacity-[0.08] pointer-events-none" viewBox="0 0 100 20" preserveAspectRatio="none">
              <polyline points={c.spark} fill="none" stroke={c.sparkColor} strokeWidth="1.5" />
            </svg>
          </div>
        )
      })}
    </div>
  )
}

// ─── Portfolio Chart ──────────────────────────────────────────────────────────
const BAR_DATA = [
  { month: 'Jan', ecl: 52, par: 38 },
  { month: 'Feb', ecl: 48, par: 35 },
  { month: 'Mar', ecl: 61, par: 42 },
  { month: 'Apr', ecl: 55, par: 40 },
  { month: 'May', ecl: 70, par: 52 },
  { month: 'Jun', ecl: 63, par: 47 },
  { month: 'Jul', ecl: 58, par: 44 },
  { month: 'Aug', ecl: 74, par: 55 },
  { month: 'Sep', ecl: 68, par: 50 },
  { month: 'Oct', ecl: 80, par: 60 },
  { month: 'Nov', ecl: 75, par: 57 },
  { month: 'Dec', ecl: 88, par: 64 },
]

function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], curr = pts[i]
    const cpx = (prev[0] + curr[0]) / 2
    d += ` C ${cpx} ${prev[1]}, ${cpx} ${curr[1]}, ${curr[0]} ${curr[1]}`
  }
  return d
}

function MockupChart({ fullHeight }: { fullHeight?: boolean }) {
  const [progress, setProgress] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const start = performance.now()
    const animate = (now: number) => {
      const p = Math.min((now - start) / 1500, 1)
      setProgress(1 - Math.pow(1 - p, 3))
      if (p < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [])

  if (!mounted) return <div className={`${fullHeight ? 'h-full' : 'h-[160px]'} bg-white/[0.02] rounded-xl border border-white/[0.05]`} />

  const W = 280, H = 120, PAD_L = 26, PAD_B = 16, PAD_T = 14, PAD_R = 6
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B
  const maxECL = 100
  const n = BAR_DATA.length
  const slotW = plotW / n
  const barW = slotW * 0.38

  const xOf = (i: number) => PAD_L + i * slotW + slotW / 2
  const yOf = (v: number) => PAD_T + plotH - (v / maxECL) * plotH * progress

  const eclPts: [number, number][] = BAR_DATA.map((d, i) => [xOf(i), yOf(d.ecl)])
  const eclPath = smoothPath(eclPts)
  const areaPath = `${eclPath} L ${eclPts[eclPts.length - 1][0]} ${PAD_T + plotH} L ${eclPts[0][0]} ${PAD_T + plotH} Z`

  const lastX = eclPts[n - 1][0]
  const lastY = eclPts[n - 1][1]
  const yTicks = [25, 50, 75, 100]

  return (
    <div className={`bg-[#070707] border border-white/[0.06] rounded-xl p-3 flex flex-col ${fullHeight ? 'h-full' : ''}`}>

      {/* Header */}
      <div className="flex items-start justify-between mb-2 flex-shrink-0">
        <div>
          <div className="text-[11px] font-bold text-white leading-none">ECL &amp; PAR Trend</div>
          <div className="text-[8.5px] text-zinc-500 mt-0.5 tracking-wide">Expected Credit Loss vs Portfolio-at-Risk · FY 2026</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[2px] rounded-full bg-[#3ECF8E] shadow-[0_0_4px_#3ECF8E]" />
              <span className="text-[8px] text-zinc-400 font-mono uppercase">ECL</span>
              <span className="text-[11px] font-bold text-[#3ECF8E] tabular-nums leading-none">$88M</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[2px] rounded-full bg-blue-400/60" />
              <span className="text-[8px] text-zinc-500 font-mono uppercase">PAR</span>
              <span className="text-[11px] font-bold text-blue-400 tabular-nums leading-none">64%</span>
            </div>
          </div>
          <div className="flex flex-col items-center px-2 py-1.5 bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 rounded-lg">
            <span className="text-[9px] text-[#3ECF8E] font-bold leading-none">↑ 10%</span>
            <span className="text-[7px] text-[#3ECF8E]/60 mt-0.5 font-medium">vs Q1</span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className={`flex-1 ${fullHeight ? 'min-h-[120px]' : 'h-[140px]'}`}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="eclArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3ECF8E" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3ECF8E" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Y-axis ticks */}
          {yTicks.map(v => {
            const y = PAD_T + plotH - (v / maxECL) * plotH
            return (
              <g key={v}>
                <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="2 3" />
                <text x={PAD_L - 2} y={y + 1} fontSize="4.5" fill="rgba(255,255,255,0.22)"
                  textAnchor="end" fontFamily="monospace" dominantBaseline="middle">
                  ${v}M
                </text>
              </g>
            )
          })}

          {/* X-axis baseline */}
          <line x1={PAD_L} y1={PAD_T + plotH} x2={W - PAD_R} y2={PAD_T + plotH}
            stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />

          {/* PAR Bars */}
          {BAR_DATA.map((d, i) => {
            const bh = (d.par / maxECL) * plotH * progress
            const bx = xOf(i) - barW / 2
            const by = PAD_T + plotH - bh
            return <rect key={i} x={bx} y={by} width={barW} height={bh} rx="1.5" fill="url(#barGrad)" />
          })}

          {/* ECL area */}
          <path d={areaPath} fill="url(#eclArea)" />

          {/* ECL line */}
          <path d={eclPath} fill="none" stroke="#3ECF8E" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 3px rgba(62,207,142,0.7))' }} />

          {/* Month labels */}
          {BAR_DATA.map((d, i) =>
            i % 3 === 0 ? (
              <text key={d.month} x={xOf(i)} y={H - 2}
                fontSize="4.5" fill="rgba(255,255,255,0.28)"
                textAnchor="middle" fontFamily="monospace">
                {d.month}
              </text>
            ) : null
          )}

          {/* Peak callout */}
          {progress > 0.9 && (
            <g>
              <line x1={lastX} y1={lastY + 3} x2={lastX} y2={PAD_T + plotH}
                stroke="#3ECF8E" strokeWidth="0.6" strokeDasharray="1.5 2" opacity="0.35" />
              <circle cx={lastX} cy={lastY} r="2.5" fill="#3ECF8E"
                style={{ filter: 'drop-shadow(0 0 4px #3ECF8E)' }} />
              <circle cx={lastX} cy={lastY} r="5" fill="#3ECF8E" opacity="0.12" />
              <rect x={lastX - 15} y={lastY - 13} width="30" height="10"
                rx="2" fill="#111" stroke="#3ECF8E" strokeWidth="0.5" opacity="0.95" />
              <text x={lastX} y={lastY - 6.5}
                fontSize="4.5" fill="#3ECF8E" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                $88M — peak
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}





// ─── Decision Queue (right panel) ────────────────────────────────────────────
function MockupDecisionPanel() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 4000)
    return () => clearInterval(id)
  }, [])
  const items = [
    { id: 'DC-4821', entity: 'Acme Heavy',   amount: '$12.0M', rating: 'BBB', stage: tick % 3 === 0 ? 'APPROVED' : 'APPROVED', color: 'text-[#3ECF8E] bg-[#3ECF8E]/10' },
    { id: 'DC-4820', entity: 'GLP Partners', amount: '$8.5M',  rating: 'BB+', stage: 'REVIEW',   color: 'text-amber-400 bg-amber-400/10' },
    { id: 'DC-4818', entity: 'Meridian Cap', amount: '$24.0M', rating: 'A-',  stage: tick % 2 === 0 ? 'SCORING' : 'REVIEW', color: 'text-blue-400 bg-blue-400/10' },
    { id: 'DC-4815', entity: 'Orion Finance',amount: '$5.2M',  rating: 'BB',  stage: 'PENDING',  color: 'text-zinc-400 bg-zinc-400/10' },
  ]
  return (
    <div className="bg-[#070707] border border-white/[0.06] rounded-xl overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-center gap-2">
          <GitMerge className="w-3.5 h-3.5 text-[#3ECF8E]" />
          <span className="text-[11px] font-bold text-white">Active Decision Queue</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/[0.03] rounded-full border border-white/[0.05]">
          <span className="w-1 h-1 rounded-full bg-[#3ECF8E] animate-pulse" />
          <span className="text-[9px] text-zinc-400">47 open</span>
        </div>
      </div>
      <div className="divide-y divide-white/[0.03] flex-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2.5 px-3.5 py-3 hover:bg-white/[0.03] transition-all cursor-pointer group">
            <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.05] flex items-center justify-center text-[9px] font-bold text-zinc-400 flex-shrink-0">{item.entity.slice(0,2).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-white truncate leading-none mb-0.5">{item.entity}</div>
              <div className="text-[10px] text-zinc-500 font-mono">{item.id} · {item.amount}</div>
            </div>
            <span className="text-[10px] font-bold text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">{item.rating}</span>
            <span className={`text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${item.color} transition-all duration-700`}>{item.stage}</span>
            <ChevronRight className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Model Health Panel ───────────────────────────────────────────────────────
function MockupModelHealth() {
  const auc = useCountUp(94, 800, 600)
  const ks  = useCountUp(71, 900, 700)
  const psi = 12
  return (
    <div className="bg-[#070707] border border-white/[0.06] rounded-xl p-3.5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-bold text-white">Model Health</span>
        </div>
        <span className="text-[8px] font-bold text-[#3ECF8E] bg-[#3ECF8E]/10 px-2 py-0.5 rounded-full border border-[#3ECF8E]/20">Champion v4.2</span>
      </div>
      <div className="space-y-2.5">
        {[
          { label: 'AUC-ROC', value: auc, max: 100, color: '#3ECF8E', display: `${auc}%` },
          { label: 'KS Stat', value: ks,  max: 100, color: '#3B82F6', display: `${ks}%` },
          { label: 'PSI',     value: psi, max: 50,  color: '#f59e0b', display: `${psi}` },
        ].map((m) => (
          <div key={m.label}>
            <div className="flex justify-between mb-1">
              <span className="text-[9px] font-semibold text-zinc-500">{m.label}</span>
              <span className="text-[9px] font-bold text-zinc-300 tabular-nums">{m.display}</span>
            </div>
            <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((m.value / m.max) * 100, 100)}%`, background: m.color, boxShadow: `0 0 8px ${m.color}60` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Hero ────────────────────────────────────────────────────────────────
export function HeroSection() {
  const { locale } = useLanguage()
  const t = {
    en: {
      badge: 'Enterprise Credit Risk Platform · v4.2',
      line1: 'AI-Powered Credit Risk',
      line2: 'Platform for Enterprise Banking',
      desc: 'Unify credit decisioning, portfolio intelligence, monitoring, stress testing, and compliance in one institutional-grade platform.',
      cta1: 'Request Demo',
      cta2: 'Explore Platform',
      sub: 'Built for analysts, managers, CROs, and regulated credit operations.',
    },
    fr: {
      badge: 'Plateforme de Risque de Credit · v4.2',
      line1: 'Plateforme de Risque de Credit',
      line2: 'Propulsee par l\'IA pour la Banque',
      desc: 'Unifiez la decision de credit, l\'intelligence portefeuille, la surveillance et la conformite dans une plateforme institutionnelle.',
      cta1: 'Demander une Demo',
      cta2: 'Explorer la Plateforme',
      sub: 'Concu pour les analystes, gestionnaires, CROs et operations de credit reglementees.',
    },
  }[locale]

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 bg-[#030303]">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 30%, black 20%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 30%, black 20%, transparent 100%)'
          }}
        />
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-r from-[#3ECF8E]/20 to-blue-500/20 blur-[120px] rounded-[100%] mix-blend-screen opacity-80 animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-[40%] right-[10%] w-[500px] h-[500px] bg-blue-600/[0.08] blur-[140px] rounded-[100%] mix-blend-screen opacity-60" />
      </div>

      <div className="relative z-10 w-full px-6 py-28 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.1] hover:bg-white/[0.06] transition-all duration-300 mb-8 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.03)] backdrop-blur-sm">
          <Zap className="w-3.5 h-3.5 text-[#3ECF8E]" />
          <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-[0.2em]">{t.badge}</span>
        </div>

        {/* H1 */}
        <h1 className="text-4xl sm:text-5xl lg:text-[4.5rem] font-medium tracking-tight leading-[1.05] mb-6 max-w-5xl mx-auto">
          <span className="text-white block pb-2">{t.line1}</span>
          <span className="bg-gradient-to-r from-[#3ECF8E] to-[#20a466] bg-clip-text text-transparent block drop-shadow-[0_0_30px_rgba(62,207,142,0.3)]">{t.line2}</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light">{t.desc}</p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Link href={`/${locale}/contact`} className="inline-flex items-center justify-center px-6 py-3 bg-[#3ECF8E] text-[#0a0a0a] text-sm font-bold rounded-lg hover:bg-[#3ECF8E]/90 transition-all shadow-[0_0_30px_rgba(62,207,142,0.25)] hover:shadow-[0_0_40px_rgba(62,207,142,0.4)] hover:scale-105 active:scale-95">
            {t.cta1}
          </Link>
          <Link href={`/${locale}/modules`} className="inline-flex items-center justify-center px-6 py-3 bg-white/[0.03] text-white border border-white/[0.1] text-sm font-bold rounded-lg hover:bg-white/[0.08] transition-all backdrop-blur-md hover:border-white/[0.2]">
            {t.cta2}
          </Link>
        </div>
        <p className="text-[13px] text-zinc-500 mb-20 font-medium tracking-wide">{t.sub}</p>

        {/* ── Redesigned Product Mockup ────────────────────────────────────── */}
        <div className="relative max-w-[1180px] mx-auto">
          {/* Ambient glow */}
          <div className="absolute -inset-2 bg-gradient-to-b from-[#3ECF8E]/15 via-blue-500/8 to-transparent blur-3xl rounded-[3rem] opacity-80 pointer-events-none" />
          
          {/* macOS-style outer frame */}
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.12] shadow-[0_60px_160px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.04)] bg-[#111111]">
            
            {/* Browser chrome bar */}
            <div className="flex items-center gap-0 px-5 h-11 border-b border-white/[0.08] bg-[#0d0d0d] flex-shrink-0">
              {/* Traffic lights */}
              <div className="flex items-center gap-1.5 mr-4">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57] shadow-[0_0_8px_rgba(255,95,87,0.6)]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-[0_0_8px_rgba(255,189,46,0.6)]" />
                <div className="w-3 h-3 rounded-full bg-[#28C840] shadow-[0_0_8px_rgba(40,200,64,0.6)]" />
              </div>
              {/* URL bar */}
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 bg-[#080808] border border-white/[0.07] rounded-md px-4 py-1 max-w-xs w-full">
                  <Shield className="w-3 h-3 text-[#3ECF8E] flex-shrink-0" />
                  <span className="text-[11px] text-zinc-400 font-mono truncate">octaix.risk-engine.internal</span>
                </div>
              </div>
              {/* Status indicator */}
              <div className="flex items-center gap-1.5 ml-4 px-2.5 py-1 bg-[#3ECF8E]/10 rounded-full border border-[#3ECF8E]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
                <span className="text-[9px] text-[#3ECF8E] font-bold uppercase tracking-wider">Live</span>
              </div>
            </div>

            {/* App content: sidebar + main */}
            <div className="flex h-[620px]">
              <MockupSidebar />

              {/* Main content area */}
              <div className="flex-1 bg-[#0a0a0a] overflow-hidden p-5 flex flex-col gap-0">
                {/* Welcome bar */}
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <div>
                    <h2 className="text-[13px] font-bold text-white leading-none">Good evening, Elena <span className="text-zinc-500 font-normal text-[12px]">— CRO · Q2 2026</span></h2>
                    <p className="text-[10px] text-zinc-500 mt-1">Portfolio review ready · <span className="text-[#3ECF8E]">All systems operational</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                      <span className="text-[10px] text-zinc-400 font-medium">Last 30 days</span>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                      <Bell className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                  </div>
                </div>

                {/* Two-column layout */}
                <div className="flex gap-4 flex-1 min-h-0">
                  {/* Left: KPIs + Chart — fills full height, chart grows to fill remaining */}
                  <div className="flex-1 flex flex-col gap-3 min-h-0">
                    <div className="flex-shrink-0">
                      <MockupKPIs />
                    </div>
                    <div className="flex-1 min-h-0">
                      <MockupChart fullHeight />
                    </div>
                  </div>

                  {/* Right: Decision Queue + Model Health — fills full height */}
                  <div className="w-[260px] flex-shrink-0 flex flex-col gap-3 min-h-0">
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <MockupDecisionPanel />
                    </div>
                    <div className="flex-shrink-0">
                      <MockupModelHealth />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

