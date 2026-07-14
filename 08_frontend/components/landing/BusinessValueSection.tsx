'use client'
import { TrendingDown, ScanLine, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/LanguageContext'

const pillars = [
  {
    icon: TrendingDown,
    tag: 'Decisioning Velocity',
    title: 'Faster Credit Turnaround',
    description: 'Reduce time-to-decision through structured role-based workflows, automated scoring pipelines, and configurable approval thresholds — without sacrificing governance.',
    stats: [
      { label: 'Decision Stages', value: 'Tracked' },
      { label: 'SLA Monitoring', value: 'Real-time' },
    ],
  },
  {
    icon: ScanLine,
    tag: 'Risk Visibility',
    title: 'Portfolio-Wide Risk Oversight',
    description: 'Gain full visibility into exposure concentration, PD migration, Expected Credit Loss, and IFRS 9 staging across your entire active credit book.',
    stats: [
      { label: 'PD / LGD / EAD', value: 'Computed' },
      { label: 'IFRS 9 Staging', value: 'Automated' },
    ],
  },
  {
    icon: BookOpen,
    tag: 'Compliance Readiness',
    title: 'Audit-Ready Decision Workflows',
    description: 'Every credit decision, model output, and approval action is traceable. Structured audit trails, explainability metadata, and role-based access controls included by design.',
    stats: [
      { label: 'Decision Audit Log', value: 'Full trace' },
      { label: 'COBAC / Basel III', value: 'Aligned' },
    ],
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
} as const

export function BusinessValueSection() {
  const { locale } = useLanguage()
  const header = locale === 'fr'
    ? { badge: 'Impact Operationnel', title: 'Aller Plus Vite. Decider Mieux. Rester Conforme.', desc: 'Concu pour reduire les frictions dans les operations de credit reglementees sans compromettre la gouvernance ou l\'explicabilite.' }
    : { badge: 'Operational Impact', title: 'Move Faster. Decide Better. Stay Audit-Ready.', desc: 'Designed to reduce friction in regulated credit operations without compromising on governance or explainability.' }
  return (
    <section className="py-28 relative">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-400 mb-4">{header.badge}</div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-medium text-white mb-5 tracking-tight">{header.title}</h2>
          <p className="text-[15px] font-medium text-zinc-400 max-w-xl mx-auto leading-relaxed">{header.desc}</p>
        </div>

        {/* Pillar cards */}
        <motion.div 
          className="grid md:grid-cols-3 gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {pillars.map((p) => (
            <motion.div 
              key={p.title} 
              variants={itemVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative bg-surface-0 border border-white/[0.03] rounded-2xl p-7 hover:border-white/[0.08] transition-all duration-500 flex flex-col overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-400/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="relative z-10 flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center group-hover:bg-brand-400/10 group-hover:border-brand-400/20 transition-all duration-500">
                  <p.icon className="w-4.5 h-4.5 text-zinc-500 group-hover:text-brand-400 transition-colors duration-500" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600 group-hover:text-brand-400/80 transition-colors duration-500">{p.tag}</span>
              </div>
              <h3 className="relative z-10 text-[17px] font-medium tracking-tight text-zinc-200 group-hover:text-white transition-colors duration-500 mb-2">{p.title}</h3>
              <p className="relative z-10 text-[14px] font-medium text-zinc-500 leading-relaxed mb-6 flex-1 group-hover:text-zinc-400 transition-colors duration-500">{p.description}</p>
              <div className="relative z-10 grid grid-cols-2 gap-3 pt-5 border-t border-white/[0.03]">
                {p.stats.map((s) => (
                  <div key={s.label}>
                    <div className="text-[12px] font-medium text-zinc-300">{s.value}</div>
                    <div className="text-[11px] font-medium text-zinc-600 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
