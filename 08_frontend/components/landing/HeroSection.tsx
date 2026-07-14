'use client'
import Link from 'next/link'
import { TrendingUp, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/LanguageContext'

function useCountUp(target: number, duration = 1400, delay = 0) {
  const [v, setValue] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      const s = performance.now()
      const step = (now: number) => {
        const p = Math.min((now - s) / duration, 1)
        setValue(Math.floor((1 - Math.pow(1 - p, 3)) * target))
        if (p < 1) requestAnimationFrame(step)
        else setValue(target)
      }
      requestAnimationFrame(step)
    }, delay)
    return () => clearTimeout(t)
  }, [target, duration, delay])
  return v
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar() {
  const nav = ['Dashboard', 'Scoring', 'Pipeline', 'Decisions', 'Monitoring', 'Portfolio', 'Compliance']
  return (
    <div className="w-[170px] flex-shrink-0 border-r border-[#E2EAF2] bg-white flex flex-col">
      <div className="px-4 py-3.5 border-b border-[#F1F5F9] flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#3B7BFF] flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-[13px] font-semibold text-[#0F172A] tracking-tight">ORE</span>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-px">
        {nav.map((label, i) => (
          <div key={label} className={`px-3 py-[7px] rounded-lg text-[12px] cursor-pointer transition-all ${
            i === 0
              ? 'bg-[#EEF3FF] text-[#3B7BFF] font-semibold'
              : 'text-[#64748B] font-medium hover:bg-[#F8FAFC] hover:text-[#0F172A]'
          }`}>
            {label}
          </div>
        ))}
      </nav>
      <div className="px-3 py-3.5 border-t border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#3B7BFF] flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">AK</div>
          <div>
            <div className="text-[10.5px] font-semibold text-[#0F172A] leading-none">A. Kouassi</div>
            <div className="text-[9px] text-[#3B7BFF] mt-0.5 font-medium">CRO · COBAC</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────
function KPIStrip() {
  const exp     = useCountUp(85,  1000, 200)
  const pd      = useCountUp(178, 1100, 350)
  const pending = useCountUp(43,  900,  500)
  const gini    = useCountUp(57,  1200, 650)

  const kpis = [
    { label: 'TOTAL EXPOSURE',  value: `${(exp / 10).toFixed(1)} Md XAF`, change: '+2.8%',     ok: true,  sub: 'Limit utilisation 71%' },
    { label: 'AVG PD (1Y)',     value: `${(pd / 100).toFixed(2)}%`,        change: '−0.12pp',  ok: true,  sub: 'vs. 5% appetite' },
    { label: 'IN REVIEW',       value: `${pending}`,                        change: '9 urgent', ok: false, sub: 'Decision queue' },
    { label: 'MODEL GINI',      value: `${gini}%`,                         change: 'pd_xgb_v1',ok: true,  sub: 'PSI 0.13' },
  ]

  return (
    <div className="grid grid-cols-4 gap-2.5 flex-shrink-0">
      {kpis.map((k, i) => (
        <div key={i} className="bg-white rounded-xl border border-[#E8EFF6] p-3 hover:border-[#C7D7EA] transition-colors">
          <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#94A3B8] mb-2">{k.label}</div>
          <div className="text-[19px] font-semibold text-[#0F172A] tabular-nums tracking-tight leading-none mb-1">{k.value}</div>
          <div className={`text-[10px] font-semibold mb-1.5 ${k.ok ? 'text-[#3B7BFF]' : 'text-[#EF4444]'}`}>{k.change}</div>
          <div className="text-[8.5px] text-[#94A3B8]">{k.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ─── ECL Chart ────────────────────────────────────────────────────────────────
const ECL_DATA = [
  { m: 'Jan', v: 48 }, { m: 'Fév', v: 44 }, { m: 'Mar', v: 58 },
  { m: 'Avr', v: 52 }, { m: 'Mai', v: 67 }, { m: 'Jun', v: 61 },
  { m: 'Jul', v: 55 }, { m: 'Aoû', v: 71 }, { m: 'Sep', v: 65 },
  { m: 'Oct', v: 79 }, { m: 'Nov', v: 74 }, { m: 'Déc', v: 88 },
]

function ECLChart() {
  const [p, setP] = useState(0)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    const s = performance.now()
    const go = (now: number) => {
      const prog = Math.min((now - s) / 1600, 1)
      setP(1 - Math.pow(1 - prog, 3))
      if (prog < 1) requestAnimationFrame(go)
    }
    requestAnimationFrame(go)
  }, [])

  const W = 340, H = 130, PL = 30, PB = 18, PT = 14, PR = 8
  const plotW = W - PL - PR, plotH = H - PT - PB
  const max = 100, n = ECL_DATA.length
  const slotW = plotW / n

  const xOf = (i: number) => PL + i * slotW + slotW / 2
  const yOf = (v: number) => PT + plotH - (v / max) * plotH * p
  const parYOf = (v: number) => PT + plotH - (v * 0.78 / max) * plotH * p

  const pts: [number, number][] = ECL_DATA.map((d, i) => [xOf(i), yOf(d.v)])

  let smooth = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1], [cx, cy] = pts[i]
    const cpx = (px + cx) / 2
    smooth += ` C ${cpx} ${py}, ${cpx} ${cy}, ${cx} ${cy}`
  }
  const areaPath = `${smooth} L ${pts[n-1][0]} ${PT+plotH} L ${pts[0][0]} ${PT+plotH} Z`

  let parSmooth = `M ${pts[0][0]} ${parYOf(ECL_DATA[0].v)}`
  for (let i = 1; i < pts.length; i++) {
    const [px] = pts[i - 1], [cx] = pts[i]
    const py2 = parYOf(ECL_DATA[i-1].v), cy2 = parYOf(ECL_DATA[i].v)
    const cpx = (px + cx) / 2
    parSmooth += ` C ${cpx} ${py2}, ${cpx} ${cy2}, ${cx} ${cy2}`
  }

  const last = pts[n - 1]

  return (
    <div className="bg-white rounded-xl border border-[#E8EFF6] p-3.5 flex flex-col flex-1 min-h-0">
      <div className="flex items-start justify-between mb-2.5 flex-shrink-0">
        <div>
          <div className="text-[12px] font-semibold text-[#0F172A]">ECL & PAR trend</div>
          <div className="text-[9px] text-[#94A3B8] mt-0.5">IFRS 9 provisions · FY 2026 · XAF</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-[2px] rounded-full bg-[#3B7BFF]" />
            <span className="text-[8px] text-[#94A3B8] font-mono">ECL</span>
            <span className="text-[10px] font-bold text-[#3B7BFF]">88M</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-[2px] rounded-full bg-[#10B981]" />
            <span className="text-[8px] text-[#94A3B8] font-mono">PAR</span>
            <span className="text-[10px] font-bold text-[#10B981]">64%</span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {mounted ? (
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="eclGradLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B7BFF" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#3B7BFF" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[25, 50, 75].map(v => {
              const y = PT + plotH - (v / max) * plotH
              return (
                <g key={v}>
                  <line x1={PL} y1={y} x2={W-PR} y2={y} stroke="#F1F5F9" strokeWidth="1" />
                  <text x={PL-3} y={y+1} fontSize="5" fill="#CBD5E1" textAnchor="end" fontFamily="monospace" dominantBaseline="middle">${v}M</text>
                </g>
              )
            })}
            <line x1={PL} y1={PT+plotH} x2={W-PR} y2={PT+plotH} stroke="#E2E8F0" strokeWidth="0.5" />

            <path d={areaPath} fill="url(#eclGradLight)" />
            <path d={parSmooth} fill="none" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
            <path d={smooth} fill="none" stroke="#3B7BFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {ECL_DATA.map((d, i) => (i % 3 === 0 || i === n - 1) && (
              <text key={d.m} x={xOf(i)} y={H - 2} fontSize="5" fill="#CBD5E1" textAnchor="middle" fontFamily="monospace">{d.m}</text>
            ))}

            {p > 0.88 && (
              <g>
                <line x1={last[0]} y1={last[1] + 3} x2={last[0]} y2={PT + plotH} stroke="#3B7BFF" strokeWidth="0.7" strokeDasharray="2 2.5" opacity="0.3" />
                <rect x={last[0] - 24} y={last[1] - 14} width="48" height="12" rx="3" fill="#3B7BFF" opacity="0.95" />
                <text x={last[0]} y={last[1] - 6} fontSize="5" fill="white" textAnchor="middle" fontFamily="monospace" fontWeight="bold">88M XAF — peak</text>
                <circle cx={last[0]} cy={last[1]} r="3" fill="#3B7BFF" />
                <circle cx={last[0]} cy={last[1]} r="6" fill="#3B7BFF" opacity="0.15" />
              </g>
            )}
          </svg>
        ) : <div className="w-full h-full bg-[#F8FAFC] rounded-lg" />}
      </div>
    </div>
  )
}

// ─── IFRS 9 Staging ───────────────────────────────────────────────────────────
function IFRS9Panel() {
  const [prog, setProg] = useState(0)
  useEffect(() => {
    const s = performance.now()
    const go = (now: number) => {
      const p2 = Math.min((now - s) / 1200, 1)
      setProg(1 - Math.pow(1 - p2, 3))
      if (p2 < 1) requestAnimationFrame(go)
    }
    const t = setTimeout(() => requestAnimationFrame(go), 400)
    return () => clearTimeout(t)
  }, [])

  const stages = [
    { label: 'Stage 1', pct: 78, color: '#10B981' },
    { label: 'Stage 2', pct: 17, color: '#F59E0B' },
    { label: 'Stage 3', pct: 5,  color: '#EF4444' },
  ]

  return (
    <div className="bg-white rounded-xl border border-[#E8EFF6] p-3.5 mb-2.5 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11.5px] font-semibold text-[#0F172A]">IFRS 9 staging</div>
        <span className="text-[9px] font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">347 exp.</span>
      </div>
      <div className="space-y-2.5">
        {stages.map(s => (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-[#374151]">{s.label}</span>
              <span className="text-[10px] font-bold tabular-nums" style={{ color: s.color }}>{s.pct}%</span>
            </div>
            <div className="h-[5px] bg-[#F1F5F9] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${s.pct * prog}%`, background: s.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Compliance Panel ─────────────────────────────────────────────────────────
function CompliancePanel() {
  const items = [
    { label: 'COBAC R-2010/01',    status: 'OK',      dot: '#10B981', statusColor: '#059669', statusBg: '#ECFDF5' },
    { label: 'IFRS 9 staging',     status: 'OK',      dot: '#10B981', statusColor: '#059669', statusBg: '#ECFDF5' },
    { label: 'Basel III Pillar 2', status: 'WATCH',   dot: '#F59E0B', statusColor: '#D97706', statusBg: '#FFFBEB' },
    { label: 'LGD calibration',    status: 'PENDING', dot: '#CBD5E1', statusColor: '#94A3B8', statusBg: '#F8FAFC' },
  ]
  return (
    <div className="bg-white rounded-xl border border-[#E8EFF6] p-3.5 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11.5px] font-semibold text-[#0F172A]">Regulatory compliance</div>
        <span className="text-[9px] text-[#94A3B8]">Updated today</span>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.dot }} />
              <span className="text-[10px] text-[#374151] truncate">{item.label}</span>
            </div>
            <span className="text-[8.5px] font-bold px-2 py-0.5 rounded ml-2 flex-shrink-0"
              style={{ color: item.statusColor, background: item.statusBg }}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
export function HeroSection() {
  const { locale } = useLanguage()

  const copy = {
    en: {
      badge: 'IFRS 9 · Basel III · COBAC-Compliant · CEMAC Zone',
      h1a: 'Enterprise Credit Risk Intelligence',
      h1b: 'for African Financial Institutions',
      desc: 'Unify data, models, decisions and governance in one platform — purpose-built for CEMAC banks and MFIs navigating COBAC regulation, IFRS 9 provisioning, and Basel III capital requirements.',
      cta1: 'Book a Demo',
      cta2: 'Explore Platform',
      sub: 'Trusted by credit analysts, risk managers, CROs and COBAC-regulated institutions.',
    },
    fr: {
      badge: 'IFRS 9 · Bâle III · Conforme COBAC · Zone CEMAC',
      h1a: 'Intelligence Risque de Crédit Institutionnel',
      h1b: 'pour les Institutions Financières Africaines',
      desc: 'Unifiez données, modèles, décisions et gouvernance dans une seule plateforme — conçue pour les banques et EMF de la zone CEMAC face aux exigences COBAC, IFRS 9 et Bâle III.',
      cta1: 'Demander une Démo',
      cta2: 'Explorer la Plateforme',
      sub: 'Au service des analystes crédit, gestionnaires des risques, DRG et institutions réglementées COBAC.',
    },
  }[locale]

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 bg-[#070D1B]">

      {/* Background — subtle grid, single subdued glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 20%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 20%, transparent 100%)',
          }}
        />
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-blue-600/[0.08] blur-[160px] rounded-full" />
        <div className="absolute top-[40%] right-[8%] w-[300px] h-[300px] bg-indigo-600/[0.05] blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full px-6 py-20 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-brand-300 bg-brand-50 mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shadow-[0_0_6px_rgba(59,123,255,0.6)]" />
          <span className="text-[10.5px] font-semibold text-brand-400 uppercase tracking-[0.2em]">{copy.badge}</span>
        </div>

        {/* H1 — max 3 lines */}
        <h1 className="text-[1.9rem] sm:text-[2.4rem] lg:text-[3rem] xl:text-[3.2rem] font-medium tracking-tight leading-[1.14] mb-6 max-w-6xl mx-auto">
          <span className="text-white block">{copy.h1a}</span>
          <span className="text-[#64748B] block">{copy.h1b}</span>
        </h1>

        {/* Description */}
        <p className="text-[1rem] text-[#64748B] max-w-xl mx-auto mb-10 leading-relaxed font-medium">{copy.desc}</p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
          <Link href={`/${locale}/contact`}
            className="inline-flex items-center justify-center px-6 py-3 bg-brand-400 text-white text-[13px] font-semibold rounded-lg hover:bg-brand-500 transition-all shadow-[0_0_24px_rgba(59,123,255,0.3)] hover:shadow-[0_0_36px_rgba(59,123,255,0.45)] hover:scale-[1.02] active:scale-[0.98]">
            {copy.cta1}
          </Link>
          <Link href={`/${locale}/modules`}
            className="inline-flex items-center justify-center gap-1.5 px-6 py-3 bg-white/[0.04] text-white border border-white/[0.1] text-[13px] font-medium rounded-lg hover:bg-white/[0.07] hover:border-white/[0.18] transition-all">
            {copy.cta2}
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </Link>
        </div>
        <p className="text-[11.5px] text-[#475569] mb-16 font-medium">{copy.sub}</p>

        {/* ── Product Mockup ── */}
        <div className="relative max-w-[1060px] mx-auto">
          {/* Outer glow */}
          <div className="absolute -inset-6 bg-gradient-to-b from-blue-500/[0.07] via-transparent to-transparent blur-3xl rounded-[3rem] pointer-events-none" />

          {/* Window frame */}
          <div className="relative rounded-[16px] overflow-hidden border border-white/[0.14]
            shadow-[0_60px_160px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.05)]">

            {/* Chrome bar — light macOS style */}
            <div className="flex items-center px-4 h-9 border-b border-[#D9E4EE] bg-[#EDF2F7]">
              <div className="flex items-center gap-1.5 mr-4">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 bg-white border border-[#D9E4EE] rounded-md px-3 py-0.5 max-w-[260px] w-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] flex-shrink-0" />
                  <span className="text-[10px] text-[#64748B] font-mono truncate">risk.ore.finance — COBAC Certified</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-4 px-2.5 py-0.5 bg-[#ECFDF5] rounded-full border border-[#A7F3D0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                <span className="text-[9px] text-[#059669] font-bold uppercase tracking-wider">LIVE</span>
              </div>
            </div>

            {/* App shell */}
            <div className="flex h-[540px]">
              <Sidebar />

              {/* Main area */}
              <div className="flex-1 bg-[#F8FAFC] overflow-hidden flex flex-col min-w-0">

                {/* Page header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8EFF6] bg-white flex-shrink-0">
                  <div>
                    <div className="text-[14px] font-semibold text-[#0F172A] leading-none">Risk overview</div>
                    <div className="text-[10px] text-[#94A3B8] mt-0.5">
                      Portfolio ready ·{' '}
                      <span className="text-[#3B7BFF] font-medium">347 active exposures</span>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[10px] font-medium text-[#374151] cursor-default">
                    Last 30 days
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex min-h-0 overflow-hidden">

                  {/* Left: KPIs + Chart */}
                  <div className="flex flex-col gap-3 p-4 flex-1 min-w-0">
                    <KPIStrip />
                    <ECLChart />
                  </div>

                  {/* Right: IFRS9 + Compliance */}
                  <div className="w-[230px] flex-shrink-0 flex flex-col p-3 border-l border-[#E8EFF6] gap-0">
                    <IFRS9Panel />
                    <CompliancePanel />
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
