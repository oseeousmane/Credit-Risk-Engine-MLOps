'use client'
import { Brain, Search, Activity, FlaskConical, FileCheck, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/LanguageContext'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
} as const
const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
} as const

const content = {
  en: {
    badge: 'AI & Risk Engineering',
    title: 'Built for Explainable, Auditable,',
    titleHighlight: 'AI-Driven Credit Operations',
    desc: 'Credit Risk Engine combines predictive modeling, explainable AI, model monitoring, and role-based governance to support modern risk teams in regulated banking environments.',
    highlights: [
      { icon: Brain, label: 'PD / LGD / EAD-ready architecture', desc: 'Core credit risk parameters computed natively' },
      { icon: Search, label: 'Explainable AI with SHAP-style drivers', desc: 'Transparent model decisions for regulators' },
      { icon: Activity, label: 'Drift detection and model monitoring', desc: 'Continuous PSI, AUC, and KS tracking' },
      { icon: FlaskConical, label: 'Macro stress testing and simulation', desc: 'GDP, rates, unemployment scenario shocks' },
      { icon: FileCheck, label: 'Audit-ready decision workflows', desc: 'Every action traced and timestamped' },
      { icon: Lock, label: 'Secure internal / client separation', desc: 'Strict role isolation and portal isolation' },
    ],
  },
  fr: {
    badge: 'IA & Ingénierie des Risques',
    title: 'Conçu pour des Opérations de Crédit Explicables, Auditables,',
    titleHighlight: 'Pilotées par l\'IA',
    desc: 'Credit Risk Engine combine la modélisation prédictive, l\'IA explicable, la surveillance des modèles et la gouvernance basée sur les rôles pour soutenir les équipes de risque modernes dans les environnements bancaires réglementés.',
    highlights: [
      { icon: Brain, label: 'Architecture PD / LGD / EAD native', desc: 'Paramètres de risque de crédit calculés nativement' },
      { icon: Search, label: 'IA explicable avec pilotes style SHAP', desc: 'Décisions de modèle transparentes pour les régulateurs' },
      { icon: Activity, label: 'Détection de dérive et monitoring des modèles', desc: 'Suivi continu PSI, AUC et KS' },
      { icon: FlaskConical, label: 'Stress testing macro et simulation', desc: 'Chocs scénarios PIB, taux, chômage' },
      { icon: FileCheck, label: 'Workflows de décision prêts pour l\'audit', desc: 'Chaque action tracée et horodatée' },
      { icon: Lock, label: 'Séparation sécurisée interne / client', desc: 'Isolation stricte des rôles et des portails' },
    ],
  },
}

export function CredibilitySection() {
  const { locale } = useLanguage()
  const t = content[locale]

  return (
    <section className="py-28 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.03] bg-surface-0">
          <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-brand-400/[0.03] rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-brand-400/[0.02] rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10 p-10 sm:p-14">
            <div className="max-w-3xl mb-12">
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-400 mb-5">{t.badge}</div>
              <h2 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-medium text-white mb-5 tracking-tight leading-tight">
                {t.title}{' '}
                <span className="text-brand-400">{t.titleHighlight}</span>
              </h2>
              <p className="text-zinc-400 text-[15px] font-medium leading-relaxed">{t.desc}</p>
            </div>

            <motion.div
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }}
            >
              {t.highlights.map((h) => (
                <motion.div
                  key={h.label}
                  variants={itemVariants}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.08] hover:bg-white/[0.02] transition-all duration-300 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-surface-0 border border-white/[0.04] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-brand-400/10 group-hover:border-brand-400/20 transition-colors duration-300 shadow-sm">
                    <h.icon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-brand-400 transition-colors duration-300" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium tracking-tight text-zinc-300 group-hover:text-white transition-colors duration-300 leading-snug mb-1">{h.label}</div>
                    <div className="text-[12px] font-medium text-zinc-500 leading-snug">{h.desc}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
