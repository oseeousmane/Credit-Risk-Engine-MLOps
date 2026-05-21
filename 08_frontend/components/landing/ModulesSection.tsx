'use client'
import { TrendingUp, PieChart, Zap, Activity, FlaskConical, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/LanguageContext'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
} as const
const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
} as const

const content = {
  en: {
    badge: 'Platform Modules',
    title: 'One Platform. Full Credit Risk Coverage.',
    desc: 'Every module designed for institutional credit workflows, from origination to monitoring.',
    modules: [
      { icon: TrendingUp, name: 'Risk Intelligence', description: 'Executive visibility into exposure, probability of default, expected loss, and portfolio signals.' },
      { icon: PieChart, name: 'Portfolio Management', description: 'Analyze counterparties, concentrations, risk segments, and exposure evolution across the active book.' },
      { icon: Zap, name: 'Decisioning', description: 'Support faster and more consistent credit approvals with explainable, role-based decision workflows.' },
      { icon: Activity, name: 'Monitoring & Model Ops', description: 'Track drift, latency, model quality, and operational alerts across live scoring pipelines.' },
      { icon: FlaskConical, name: 'Stress Testing', description: 'Simulate macroeconomic shocks and assess impact on PD, expected loss, and portfolio resilience.' },
      { icon: ShieldCheck, name: 'Compliance & Audit', description: 'Maintain traceable workflows, validation history, and audit-ready controls for regulated environments.' },
    ],
  },
  fr: {
    badge: 'Modules Plateforme',
    title: 'Une Plateforme. Couverture Complète du Risque de Crédit.',
    desc: 'Chaque module conçu pour les workflows de crédit institutionnel, de l\'origination à la surveillance.',
    modules: [
      { icon: TrendingUp, name: 'Intelligence des Risques', description: 'Visibilité exécutive sur l\'exposition, la probabilité de défaut, la perte attendue et les signaux de portefeuille.' },
      { icon: PieChart, name: 'Gestion de Portefeuille', description: 'Analysez les contreparties, concentrations, segments de risque et l\'évolution des expositions sur le livre actif.' },
      { icon: Zap, name: 'Décisioning', description: 'Soutenez des approbations de crédit plus rapides et cohérentes avec des workflows de décision basés sur les rôles.' },
      { icon: Activity, name: 'Monitoring & Ops Modèles', description: 'Suivez la dérive, la latence, la qualité des modèles et les alertes opérationnelles sur les pipelines de scoring en direct.' },
      { icon: FlaskConical, name: 'Stress Testing', description: 'Simulez des chocs macroéconomiques et évaluez l\'impact sur la PD, la perte attendue et la résilience du portefeuille.' },
      { icon: ShieldCheck, name: 'Conformité & Audit', description: 'Maintenez des workflows traçables, un historique de validation et des contrôles prêts pour l\'audit dans les environnements réglementés.' },
    ],
  },
}

export function ModulesSection() {
  const { locale } = useLanguage()
  const t = content[locale]

  return (
    <section className="py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#3ECF8E]/[0.01] to-transparent" />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#3ECF8E] mb-4">{t.badge}</div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-medium text-white mb-5 tracking-tight">{t.title}</h2>
          <p className="text-[15px] font-medium text-zinc-400 max-w-2xl mx-auto leading-relaxed">{t.desc}</p>
        </div>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }}
        >
          {t.modules.map((mod) => (
            <motion.div
              key={mod.name}
              variants={itemVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative bg-[#050505] border border-white/[0.03] rounded-2xl p-6 overflow-hidden transition-all duration-500 hover:border-white/[0.08]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#3ECF8E]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 w-11 h-11 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-5 group-hover:bg-[#3ECF8E]/10 group-hover:border-[#3ECF8E]/20 transition-all duration-500">
                <mod.icon className="w-5 h-5 text-zinc-500 group-hover:text-[#3ECF8E] transition-colors duration-500" />
              </div>
              <h3 className="relative z-10 text-[15px] font-medium tracking-tight text-zinc-200 group-hover:text-white transition-colors duration-500 mb-2">{mod.name}</h3>
              <p className="relative z-10 text-[14px] font-medium text-zinc-500 leading-relaxed transition-colors duration-500 group-hover:text-zinc-400">{mod.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
