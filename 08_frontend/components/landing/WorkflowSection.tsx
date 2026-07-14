'use client'
import { FileText, Brain, CheckCircle2, Activity, ShieldCheck, Bell } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/LanguageContext'

const steps = [
  {
    icon: FileText,
    step: '01',
    label: 'Application',
    desc: 'Client submits credit application through the secure portal or internal origination pipeline.',
    color: 'blue',
  },
  {
    icon: Brain,
    step: '02',
    label: 'ML Scoring',
    desc: 'Automated PD, LGD, EAD computation via the MLOps scoring engine with explainability metadata.',
    color: 'indigo',
  },
  {
    icon: CheckCircle2,
    step: '03',
    label: 'Decisioning',
    desc: 'Role-based approval workflow — analyst prepares, manager approves, with full audit trail.',
    color: 'amber',
  },
  {
    icon: Activity,
    step: '04',
    label: 'Monitoring',
    desc: 'Post-approval tracking of model drift, performance, and counterparty risk signals.',
    color: 'emerald',
  },
  {
    icon: ShieldCheck,
    step: '05',
    label: 'Compliance',
    desc: 'Regulatory alignment checks, IFRS 9 staging updates, and audit-ready reporting.',
    color: 'purple',
  },
  {
    icon: Bell,
    step: '06',
    label: 'Client Update',
    desc: 'Secure client-facing notification and application status update via the Client Portal.',
    color: 'cyan',
  },
]

const colorMap: Record<string, { icon: string; number: string; connector: string; dot: string }> = {
  blue:    { icon: 'text-brand-400',    number: 'text-brand-400/40',   connector: 'bg-brand-400/20',    dot: 'bg-brand-400' },
  indigo:  { icon: 'text-indigo-400',  number: 'text-indigo-500/40', connector: 'bg-indigo-500/20',  dot: 'bg-indigo-400' },
  amber:   { icon: 'text-amber-400',   number: 'text-amber-500/40',  connector: 'bg-amber-500/20',   dot: 'bg-amber-400' },
  emerald: { icon: 'text-emerald-400', number: 'text-emerald-500/40',connector: 'bg-emerald-500/20', dot: 'bg-emerald-400' },
  purple:  { icon: 'text-purple-400',  number: 'text-purple-500/40', connector: 'bg-purple-500/20',  dot: 'bg-purple-400' },
  cyan:    { icon: 'text-cyan-400',    number: 'text-cyan-500/40',   connector: 'bg-cyan-500/20',    dot: 'bg-cyan-400' },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
} as const

const nodeVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
} as const

const lineVariants = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.6, ease: 'easeInOut' as const } }
} as const

export function WorkflowSection() {
  const { locale } = useLanguage()
  const header = locale === 'fr'
    ? { badge: 'Cycle de Vie du Credit', title: 'Un Workflow Unifie sur l\'ensemble du Cycle de Vie du Credit', desc: 'Credit Risk Engine connecte l\'origination, le scoring, l\'approbation, la surveillance et la gouvernance dans un modele operationnel continu pour les equipes de credit modernes.' }
    : { badge: 'Credit Lifecycle', title: 'One Unified Workflow Across the Credit Lifecycle', desc: 'Credit Risk Engine connects origination, scoring, approval, monitoring, and governance into one continuous operating model for modern credit teams.' }
  return (
    <section className="py-28 relative reveal-section">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-400 mb-4">{header.badge}</div>
          <h2 className="text-3xl sm:text-4xl font-medium text-white mb-5 tracking-tight">{header.title}</h2>
          <p className="text-[15px] font-medium text-zinc-400 max-w-2xl mx-auto leading-relaxed">{header.desc}</p>
        </div>

        {/* Desktop: horizontal flow */}
        <div className="hidden lg:block">
          <motion.div 
            className="relative flex items-start gap-0"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {steps.map((s, i) => {
              const c = colorMap[s.color]
              return (
                <div key={s.label} className="flex-1 flex flex-col items-center relative">
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <motion.div 
                      variants={lineVariants}
                      className="absolute top-7 left-[calc(50%+28px)] w-[calc(100%-56px)] h-[2px] bg-gradient-to-r from-white/[0.08] to-white/[0.02] origin-left" 
                    />
                  )}
                  {/* Node */}
                  <motion.div variants={nodeVariants} className="relative z-10 flex flex-col items-center">
                    <motion.div 
                      whileHover={{ scale: 1.05, y: -2 }}
                      className="group relative w-14 h-14 rounded-2xl bg-surface-0 border border-white/[0.04] flex items-center justify-center mb-5 overflow-hidden transition-all duration-500 hover:border-white/[0.1] hover:shadow-lg"
                    >
                      <div className={`absolute inset-0 bg-${s.color}-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                      <s.icon className={`relative z-10 w-5 h-5 text-zinc-500 group-hover:${c.icon} transition-colors duration-500`} />
                    </motion.div>
                    <div className={`text-[10px] font-bold tracking-widest uppercase mb-1.5 ${c.number}`}>Step {s.step}</div>
                    <div className="text-[14px] font-medium text-zinc-200 text-center mb-2">{s.label}</div>
                    <div className="text-[13px] text-zinc-500 text-center leading-relaxed max-w-[150px]">{s.desc}</div>
                  </motion.div>
                </div>
              )
            })}
          </motion.div>
        </div>

        {/* Mobile: vertical flow */}
        <div className="lg:hidden space-y-0">
          {steps.map((s, i) => {
            const c = colorMap[s.color]
            return (
              <div key={s.label} className="flex gap-5">
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-xl bg-surface-0 border border-white/[0.04] flex items-center justify-center flex-shrink-0`}>
                    <s.icon className={`w-4 h-4 text-zinc-400`} />
                  </div>
                  {i < steps.length - 1 && <div className="w-px flex-1 bg-white/[0.04] my-3" />}
                </div>
                {/* Content */}
                <div className="pb-10 pt-1">
                  <div className={`text-[10px] font-bold tracking-widest uppercase mb-1.5 ${c.number}`}>Step {s.step}</div>
                  <div className="text-[15px] font-medium text-zinc-200 mb-1.5">{s.label}</div>
                  <div className="text-[14px] text-zinc-500 leading-relaxed">{s.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
