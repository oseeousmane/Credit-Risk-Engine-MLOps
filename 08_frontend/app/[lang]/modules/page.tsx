'use client'

import { useState, useEffect, useRef } from 'react'
import { TrendingUp, Zap, Activity, Shield, Users, Database, ArrowRight, CheckCircle2, Layers, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/LanguageContext'
import { RiskMockup, DecisioningMockup, MonitoringMockup, ComplianceMockup, CounterpartyMockup, StressMockup } from '@/components/landing/ModulesMockups'

// ─── Data ─────────────────────────────────────────────────────────────────────
const MODULES = [
  {
    id: 'risk',
    icon: TrendingUp,
    title: 'Risk Intelligence',
    persona: 'CRO',
    desc: 'Executive portfolio oversight with real-time exposure, ECL staging, and predictive signals across your entire credit book.',
    features: ['Real-time Exposure & Limit Utilization', 'Automated Stage 1/2/3 Migration Tracking', 'Predictive Early Warning Signals (EWS)', 'Dynamic Concentration Risk Heatmaps'],
    Mockup: RiskMockup,
  },
  {
    id: 'decisioning',
    icon: Zap,
    title: 'Decisioning',
    persona: 'Analyst / Manager',
    desc: 'Algorithmic credit scoring with SHAP explainability integrated into human-in-the-loop approval workflows.',
    features: ['Algorithmic Credit Scoring (PD, LGD, EAD)', 'SHAP Value Explainability for every decision', 'Automated Routing & Escalation Matrices', 'Maker / Checker enforcement with full audit'],
    Mockup: DecisioningMockup,
  },
  {
    id: 'monitoring',
    icon: Activity,
    title: 'Model Monitoring',
    persona: 'MLOps',
    desc: 'Live MLOps dashboards tracking model performance, data drift (PSI/KS/AUC), and automated governance triggers.',
    features: ['Live Data Drift & Concept Drift Detection', 'AUC / KS / PSI time-series history', 'Shadow Deployment & Champion-Challenger', 'Performance Degradation Alerts'],
    Mockup: MonitoringMockup,
  },
  {
    id: 'compliance',
    icon: Shield,
    title: 'Compliance & Audit',
    persona: 'Risk Manager',
    desc: 'Immutable audit trails, automated IFRS 9 / Basel III reporting, and strict role-based governance for every action.',
    features: ['Cryptographically Immutable Audit Trails', 'Automated IFRS 9 ECL Provisioning Reports', 'Strict Separation of Duties (Maker/Checker)', 'One-click Regulatory Export Capabilities'],
    Mockup: ComplianceMockup,
  },
  {
    id: 'counterparty',
    icon: Users,
    title: 'Counterparty 360',
    persona: 'Analyst',
    desc: 'Unified view of corporate entities — parent-child hierarchies, historical financials, and aggregated risk limits.',
    features: ['Global Entity Resolution & Hierarchy Mapping', 'Historical Financials & Covenant Tracking', 'Aggregated Group-level Risk Limits', 'KYC / AML Integration Hooks'],
    Mockup: CounterpartyMockup,
  },
  {
    id: 'stress',
    icon: Database,
    title: 'Stress Testing',
    persona: 'CRO / Risk Manager',
    desc: 'Simulate macroeconomic shocks against your portfolio to evaluate capital adequacy, stage migrations, and ECL impact.',
    features: ['Custom Macroeconomic Scenario Modeling', 'PD Migration & Stage Shift Propagation', 'RWA & Capital Adequacy Impact', 'Automated Stress Test Reporting (CCAR/EBA)'],
    Mockup: StressMockup,
  },
]

const STATS = [
  { value: '6',        label: 'Integrated Modules' },
  { value: '4',        label: 'User Roles' },
  { value: 'IFRS 9',   label: 'Compliant' },
  { value: 'Basel III',label: 'Aligned' },
  { value: '90+',      label: 'Tests Passing' },
  { value: '<50ms',    label: 'Scoring Latency' },
]

// ─── Variants ─────────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: d, ease: [0.16,1,0.3,1] as const } }),
}
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const listItem = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.35 } } }

function SectionDivider() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  )
}

// ─── Sticky Module Nav ────────────────────────────────────────────────────────
function ModuleNav({ active }: { active: string }) {
  const { locale } = useLanguage()
  return (
    <div className="sticky top-16 z-40 bg-[#050505]/90 backdrop-blur-md border-b border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-3">
          {MODULES.map(m => (
            <a key={m.id} href={`#${m.id}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold whitespace-nowrap transition-all duration-200 border ${
                active === m.id
                  ? 'bg-[#3ECF8E]/10 border-[#3ECF8E]/30 text-[#3ECF8E]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}>
              <m.icon className="w-3 h-3" />
              {m.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ModulesPage() {
  const { locale } = useLanguage()
  const [activeModule, setActiveModule] = useState('risk')

  // IntersectionObserver for sticky nav
  useEffect(() => {
    const observers: IntersectionObserver[] = []
    MODULES.forEach(m => {
      const el = document.getElementById(m.id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveModule(m.id) },
        { rootMargin: '-40% 0px -50% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])

  return (
    <main className="antialiased min-h-screen bg-[#050505]">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 overflow-hidden">
        {/* Grid bg */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage:'linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)', backgroundSize:'32px 32px',
            maskImage:'radial-gradient(ellipse 80% 80% at 50% 40%, black 20%, transparent 100%)',WebkitMaskImage:'radial-gradient(ellipse 80% 80% at 50% 40%, black 20%, transparent 100%)' }} />
        <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#3ECF8E]/[0.12] blur-[120px] rounded-[100%] mix-blend-screen opacity-60 pointer-events-none" />

        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-4xl mx-auto px-6 text-center">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8 cursor-default">
            <Layers className="w-3 h-3 text-[#3ECF8E]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-300">Platform Architecture</span>
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-[4rem] font-medium tracking-tight leading-[1.1] mb-6">
            <span className="text-white block">Explore</span>
            <span className="text-[#3ECF8E] block">Product Modules</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-xl text-zinc-400 leading-relaxed max-w-2xl mx-auto mb-10">
            A deeply integrated suite covering the entire credit lifecycle — from origination and scoring to monitoring, compliance, and portfolio governance.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={`/${locale}/contact`} className="inline-flex items-center justify-center px-4 py-2 bg-[#3ECF8E] text-[#0a0a0a] text-[13px] font-semibold rounded-md hover:bg-[#3ECF8E]/90 transition-colors shadow-[0_0_24px_rgba(62,207,142,0.2)]">
              Request Demo
            </Link>
            <Link href={`/${locale}/platform`} className="inline-flex items-center justify-center px-4 py-2 bg-white/[0.05] text-white border border-white/[0.1] text-[13px] font-semibold rounded-md hover:bg-white/[0.08] transition-colors">
              View Architecture <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats Strip ──────────────────────────────────────────────────── */}
      <div className="border-y border-white/[0.04] bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-3 md:grid-cols-6 gap-6">
          {STATS.map((s, i) => (
            <motion.div key={i} initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay: i*0.06, duration:0.5 }} className="text-center">
              <div className="text-[18px] font-bold text-[#3ECF8E] mb-0.5">{s.value}</div>
              <div className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Module Cards Grid ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once:true, margin:'-50px' }}
          variants={{ hidden:{ opacity:0 }, visible:{ opacity:1, transition:{ staggerChildren:0.09 } } }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULES.map(m => (
            <motion.a key={m.id} href={`#${m.id}`}
              variants={{ hidden:{ opacity:0, y:24 }, visible:{ opacity:1, y:0, transition:{ duration:0.6, ease:[0.16,1,0.3,1] as const } } }}
              whileHover={{ y:-5, transition:{ duration:0.2 } }}
              className="group relative flex flex-col p-7 bg-[#080808] border border-white/[0.04] hover:border-white/[0.10] rounded-2xl transition-all duration-400 overflow-hidden cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-[#3ECF8E]/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative z-10 flex items-start justify-between mb-5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.05] group-hover:bg-[#3ECF8E]/10 group-hover:border-[#3ECF8E]/20 transition-all duration-300">
                  <m.icon className="w-4 h-4 text-zinc-500 group-hover:text-[#3ECF8E] transition-colors" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-700 border border-white/[0.04] px-2 py-1 rounded-full bg-white/[0.02]">{m.persona}</span>
              </div>
              <h3 className="relative z-10 text-[17px] font-medium tracking-tight text-zinc-200 group-hover:text-white transition-colors mb-2">{m.title}</h3>
              <p className="relative z-10 text-[13px] text-zinc-500 group-hover:text-zinc-400 leading-relaxed flex-1 mb-4 transition-colors">{m.desc}</p>
              <div className="relative z-10 flex items-center gap-1.5 text-[12px] font-semibold text-[#3ECF8E] mt-auto">
                Explore <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.a>
          ))}
        </motion.div>
      </section>

      <SectionDivider />

      {/* ── Sticky Nav ───────────────────────────────────────────────────── */}
      <ModuleNav active={activeModule} />

      {/* ── Deep Dive Sections ───────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6">
        {MODULES.map((m, idx) => {
          const isEven = idx % 2 === 0
          return (
            <section key={m.id} id={m.id} className="py-28 scroll-mt-28">
              <div className={`grid md:grid-cols-2 gap-16 items-center ${!isEven ? 'md:[&>*:first-child]:order-2' : ''}`}>

                {/* Text side */}
                <motion.div initial={{ opacity:0, x: isEven ? -30 : 30 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true, margin:'-80px' }} transition={{ duration:0.7, ease:[0.16,1,0.3,1] }}>
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3ECF8E]">Module {String(idx+1).padStart(2,'0')}</div>
                    <div className="h-px flex-1 bg-white/[0.05]" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-700 border border-white/[0.04] px-2 py-0.5 rounded-full">{m.persona}</span>
                  </div>
                  <h2 className="text-3xl font-medium tracking-tight text-white mb-5">{m.title}</h2>
                  <p className="text-[15px] text-zinc-400 leading-relaxed mb-7">{m.desc}</p>
                  <motion.ul variants={stagger} initial="hidden" whileInView="visible" viewport={{ once:true }} className="space-y-3 mb-8">
                    {m.features.map((f, i) => (
                      <motion.li key={i} variants={listItem} className="flex items-start gap-3 text-[14px] text-zinc-300">
                        <CheckCircle2 className="w-4 h-4 text-[#3ECF8E] mt-0.5 flex-shrink-0" />
                        {f}
                      </motion.li>
                    ))}
                  </motion.ul>
                  <Link href={`/${locale}/contact`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3ECF8E] hover:text-[#3ECF8E]/80 transition-colors">
                    Request a demo of this module <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </motion.div>

                {/* Mockup side */}
                <motion.div initial={{ opacity:0, scale:0.96 }} whileInView={{ opacity:1, scale:1 }} viewport={{ once:true, margin:'-80px' }} transition={{ duration:0.8 }}>
                  <m.Mockup />
                </motion.div>
              </div>

              {idx < MODULES.length - 1 && (
                <div className="mt-28 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
              )}
            </section>
          )
        })}
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <motion.div initial={{ opacity:0, y:30 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.8 }}
          className="relative bg-[#080808] border border-white/[0.05] rounded-3xl p-16 text-center overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#3ECF8E]/[0.03] rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#3ECF8E]/[0.02] rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#3ECF8E]">Ready to Get Started</span>
            </div>
            <h2 className="text-3xl font-medium tracking-tight text-white mb-4">
              Ready to unify your<br /><span className="text-[#3ECF8E]">credit lifecycle?</span>
            </h2>
            <p className="text-[15px] text-zinc-400 mb-8 max-w-lg mx-auto leading-relaxed">
              Connect with our enterprise team to discuss how Credit Risk Engine can integrate into your existing architecture.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href={`/${locale}/contact`} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#3ECF8E] text-[#050505] rounded-md font-semibold text-[13px] hover:bg-[#3ECF8E]/90 transition-all shadow-[0_0_30px_rgba(62,207,142,0.25)]">
                Request a Custom Demo <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link href={`/${locale}/platform`} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/[0.05] text-white border border-white/[0.1] rounded-md font-semibold text-[13px] hover:bg-white/[0.08] transition-colors">
                Explore Platform Architecture
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

    </main>
  )
}
