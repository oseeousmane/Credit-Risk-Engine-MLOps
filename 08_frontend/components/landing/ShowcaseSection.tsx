'use client'
import { TrendingUp, Zap, Activity, Building2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const screens = [
  {
    id: 'risk',
    title: 'Risk Intelligence',
    description: 'Executive portfolio overview with real-time exposure, ECL, and stage migration signals.',
    icon: TrendingUp,
    color: 'blue',
    tag: 'CRO Command View',
    metrics: [
      { label: 'Total Exposure', value: '1 580 Mds XAF', status: 'warn' },
      { label: 'ECL Stage 2', value: '12,3 Mds XAF', status: 'warn' },
      { label: 'Avg. PD', value: '1,82%', status: 'ok' },
      { label: 'Stage 3', value: '3 contreparties', status: 'alert' },
    ],
    rows: [
      { name: 'SOCOME Industries SA',   rating: 'BBB', pd: '1,2%', stage: 'S1', exposure: '8,0 Mds XAF',  bar: 72 },
      { name: 'Trans-CEMAC Logistique', rating: 'BB+', pd: '3,8%', stage: 'S2', exposure: '5,6 Mds XAF',  bar: 58 },
      { name: 'Hydrocam Energy Group',  rating: 'A−',  pd: '0,7%', stage: 'S1', exposure: '15,8 Mds XAF', bar: 88 },
    ],
  },
  {
    id: 'decision',
    title: 'Decisioning Workspace',
    description: 'Role-based approval interface with scoring output, risk drivers, and audit trail.',
    icon: Zap,
    color: 'amber',
    tag: 'Analyst / Manager View',
    metrics: [
      { label: 'Application', value: 'DC-4821', status: 'ok' },
      { label: 'ML Score', value: '724 / 1000', status: 'ok' },
      { label: 'Model PD', value: '1.24%', status: 'ok' },
      { label: 'Decision', value: 'Pending', status: 'warn' },
    ],
    drivers: [
      { factor: 'Debt-to-Income Ratio', impact: 'Negative', weight: 68 },
      { factor: 'Payment History (24m)', impact: 'Positive', weight: 85 },
      { factor: 'Collateral Coverage', impact: 'Positive', weight: 72 },
      { factor: 'Sector Concentration', impact: 'Neutral', weight: 45 },
    ],
  },
  {
    id: 'monitoring',
    title: 'Model Monitoring',
    description: 'Live model health tracking with AUC, PSI drift detection, and alert surfacing.',
    icon: Activity,
    color: 'emerald',
    tag: 'MLOps View',
    metrics: [
      { label: 'Model AUC', value: '0.847', status: 'ok' },
      { label: 'PSI Score', value: '0.12', status: 'warn' },
      { label: 'Latency p95', value: '42ms', status: 'ok' },
      { label: 'Drift Alert', value: 'Moderate', status: 'warn' },
    ],
    bars: [82, 84, 83, 85, 84, 83, 82, 80, 79, 78, 77, 76, 75, 74, 73, 72, 74, 75, 77, 79],
  },
]

const statusColor: Record<string, string> = {
  ok: 'text-emerald-400',
  warn: 'text-amber-400',
  alert: 'text-rose-400',
}

const accentMap: Record<string, { icon: string; border: string; tag: string }> = {
  blue:    { icon: 'text-brand-400',    border: 'border-brand-400/20',    tag: 'bg-brand-400/10 text-brand-400' },
  amber:   { icon: 'text-amber-400',   border: 'border-amber-500/20',   tag: 'bg-amber-500/10 text-amber-400' },
  emerald: { icon: 'text-emerald-400', border: 'border-emerald-500/20', tag: 'bg-emerald-500/10 text-emerald-400' },
}

export function ShowcaseSection() {
  return (
    <section className="py-32 relative reveal-section">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-400 mb-4">Product Views</div>
          <h2 className="text-3xl sm:text-4xl font-medium text-white mb-5 tracking-tight">
            See the Platform in Action
          </h2>
          <p className="text-[15px] font-medium text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            From executive portfolio oversight to operational decisioning and client collaboration, 
            every module is designed to work as part of one unified credit risk system.
          </p>
          <Link href="/modules" className="inline-flex items-center gap-1.5 text-[13px] text-brand-400 hover:text-brand-400/80 font-medium transition-colors">
            Explore Product Modules <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Showcase cards */}
        <div className="space-y-12">
          {screens.map((screen, idx) => {
            const acc = accentMap[screen.color]
            return (
              <motion.div 
                key={screen.id} 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: idx * 0.15, ease: [0.16, 1, 0.3, 1] as const }}
                className={`card-hover-lift group relative bg-surface-0 border border-white/[0.03] shadow-2xl rounded-2xl overflow-hidden transition-all duration-500 hover:border-white/[0.08] ${idx % 2 === 1 ? 'ml-0 lg:ml-12' : 'mr-0 lg:mr-12'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-400/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                {/* Header bar */}
                <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.03] bg-white/[0.01]">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg bg-white/[0.04] border ${acc.border} flex items-center justify-center`}>
                      <screen.icon className={`w-3.5 h-3.5 ${acc.icon}`} />
                    </div>
                    <span className="text-[14px] font-bold text-zinc-200">{screen.title}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${acc.tag}`}>{screen.tag}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400/60 animate-pulse" />
                    <span className="text-[10px] text-zinc-600 font-mono">riskengine.bank</span>
                  </div>
                </div>

                {/* KPI strip */}
                <div className="relative z-10 grid grid-cols-4 divide-x divide-white/[0.03] border-b border-white/[0.03] bg-[#080808]">
                  {screen.metrics.map((m) => (
                    <div key={m.label} className="px-5 py-4 group/kpi hover:bg-white/[0.01] transition-colors">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1.5 group-hover/kpi:text-zinc-500 transition-colors">{m.label}</div>
                      <div className={`text-[16px] font-medium tabular-nums ${statusColor[m.status]}`}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* Content area */}
                <div className="relative z-10 p-6">
                  {screen.rows && (
                    <div className="space-y-2">
                      {screen.rows.map((r) => (
                        <div key={r.name} className="flex items-center gap-4 px-4 py-3.5 bg-white/[0.01] rounded-xl border border-white/[0.03] hover:bg-white/[0.03] hover:border-white/[0.06] transition-all duration-300">
                          <span className="text-[13px] text-zinc-400 flex-1 font-medium transition-colors group-hover:text-zinc-300">{r.name}</span>
                          <span className="text-[12px] font-medium text-zinc-500 w-10">{r.rating}</span>
                          <span className="text-[12px] text-zinc-600 w-14 font-mono">PD {r.pd}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${r.stage === 'S1' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>{r.stage}</span>
                          <span className="text-[12px] text-zinc-500 w-16 text-right font-mono">{r.exposure}</span>
                          <div className="w-24 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                            <div className="h-full bg-brand-400/40 rounded-full" style={{ width: `${r.bar}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {screen.drivers && (
                    <div className="space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 mb-4">Risk Drivers (SHAP)</div>
                      {screen.drivers.map((d) => (
                        <div key={d.factor} className="flex items-center gap-4">
                          <span className="text-[13px] text-zinc-400 flex-1">{d.factor}</span>
                          <span className={`text-[11px] font-semibold w-16 text-right ${d.impact === 'Positive' ? 'text-emerald-400' : d.impact === 'Negative' ? 'text-rose-400' : 'text-zinc-500'}`}>{d.impact}</span>
                          <div className="w-32 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${d.impact === 'Positive' ? 'bg-emerald-500/50' : d.impact === 'Negative' ? 'bg-rose-500/50' : 'bg-zinc-500/50'}`} style={{ width: `${d.weight}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {screen.bars && (
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 mb-4">AUC Trend — 20 inference cycles</div>
                      <div className="h-20 flex items-end gap-0.5">
                        {screen.bars.map((h, i) => (
                          <div key={i} className="flex-1 bg-emerald-500/25 hover:bg-emerald-500/40 rounded-t transition-colors" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-[10px] text-zinc-700">Cycle 1</span>
                        <span className="text-[10px] text-zinc-700">Cycle 20</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description footer */}
                <div className="px-6 pb-6 pt-2">
                  <p className="text-[14px] text-zinc-500 font-medium">{screen.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
