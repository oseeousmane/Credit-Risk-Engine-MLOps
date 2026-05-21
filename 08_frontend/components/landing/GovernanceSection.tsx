'use client'
import { Users, FileSearch, Lock, Lightbulb, BarChart2, ClipboardCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/LanguageContext'

const pillars = [
  {
    icon: Users,
    title: 'Role-Based Access Control',
    desc: 'Analyst, Manager, CRO, Admin, and Client roles with strict permission boundaries enforced at the API and UI layer.',
  },
  {
    icon: FileSearch,
    title: 'Full Audit Trail',
    desc: 'Every decision, action, and model output is timestamped and logged — queryable for regulatory review at any time.',
  },
  {
    icon: Lock,
    title: 'Internal / Client Data Separation',
    desc: 'Client portal operates in complete isolation from internal risk data. No cross-contamination of sensitive information.',
  },
  {
    icon: Lightbulb,
    title: 'Explainable Decisions',
    desc: 'Model outputs are accompanied by SHAP-style risk drivers and human-readable decision rationale for regulatory transparency.',
  },
  {
    icon: BarChart2,
    title: 'Governed Model Operations',
    desc: 'Model versions, champion/challenger comparisons, drift alerts, and rollback readiness are fully tracked through the MLOps layer.',
  },
  {
    icon: ClipboardCheck,
    title: 'Compliance-Ready Workflow Design',
    desc: 'Structured workflows aligned with IFRS 9, Basel III, and COBAC expectations — with required approval steps and override documentation.',
  },
]

export function GovernanceSection() {
  const { locale } = useLanguage()
  const header = locale === 'fr'
    ? { badge: 'Gouvernance & Controle', title: 'Securite et Gouvernance', titleHighlight: 'par Design', desc: 'Concu pour les environnements reglementes, Credit Risk Engine combine le controle base sur les roles, l\'auditabilite, les workflows de decision explicables et les operations de modeles gouvernees sur l\'ensemble du cycle de vie du credit.' }
    : { badge: 'Governance & Control', title: 'Security and Governance', titleHighlight: 'by Design', desc: 'Built for regulated environments, Credit Risk Engine combines role-based control, auditability, explainable decision workflows, and governed model operations across the full credit lifecycle.' }
  return (
    <section className="py-28 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: copy */}
          <div className="lg:sticky lg:top-24">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#3ECF8E] mb-5">{header.badge}</div>
            <h2 className="text-3xl sm:text-4xl font-medium text-white mb-5 tracking-tight leading-tight">
              {header.title}{' '}
              <span className="text-zinc-500">{header.titleHighlight}</span>
            </h2>
            <p className="text-zinc-400 text-[15px] font-medium leading-relaxed mb-8">{header.desc}</p>
            {/* Visual accent block */}
            <div className="bg-[#3ECF8E]/[0.02] border border-[#3ECF8E]/[0.06] rounded-2xl p-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'JWT Auth', val: 'Token 15min TTL' },
                  { label: 'Access Control', val: 'RBAC enforced' },
                  { label: 'Audit Log', val: 'Full trace' },
                  { label: 'Data Isolation', val: 'Client-safe' },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{item.label}</span>
                    <span className="text-[13px] font-medium text-zinc-300">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: governance cards */}
          <div className="grid gap-4">
            {pillars.map((p, i) => (
              <motion.div 
                key={p.title} 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group relative flex items-start gap-4 bg-[#050505] border border-white/[0.03] rounded-xl p-5 hover:border-white/[0.08] transition-all duration-500 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#3ECF8E]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 w-9 h-9 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#3ECF8E]/10 group-hover:border-[#3ECF8E]/20 transition-all duration-500">
                  <p.icon className="w-4 h-4 text-zinc-500 group-hover:text-[#3ECF8E] transition-colors duration-500" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-[15px] font-medium tracking-tight text-zinc-200 group-hover:text-white transition-colors duration-500 mb-1">{p.title}</h3>
                  <p className="text-[13px] font-medium text-zinc-500 group-hover:text-zinc-400 transition-colors duration-500 leading-relaxed">{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
