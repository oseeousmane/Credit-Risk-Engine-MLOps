'use client'
import { Users, Briefcase, Crown, Building2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/LanguageContext'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
} as const
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
} as const

const content = {
  en: {
    badge: 'Role-Based Experience',
    title: 'Designed for Every Layer of the Credit Workflow',
    desc: 'Each role gets a tailored experience — from operational case execution to executive portfolio oversight.',
    roles: [
      { icon: Users, role: 'Analysts', description: 'Review applications, validate documents, prepare decisions, and move cases forward with confidence.', tasks: ['Case review', 'Document validation', 'Scoring execution', 'Decision preparation'] },
      { icon: Briefcase, role: 'Managers', description: 'Supervise teams, manage bottlenecks, monitor SLA risk, and control approval workflows.', tasks: ['Team oversight', 'SLA monitoring', 'Escalation handling', 'Approval workflows'] },
      { icon: Crown, role: 'CROs', description: 'Monitor portfolio risk, expected loss, stress scenarios, and major alerts through an executive command view.', tasks: ['Portfolio exposure', 'ECL monitoring', 'Stress scenarios', 'Executive dashboards'] },
      { icon: Building2, role: 'Clients', description: 'Track applications, submit documents, and follow next steps through a secure, client-safe portal.', tasks: ['Application tracking', 'Document upload', 'Status updates', 'Secure messaging'] },
    ],
  },
  fr: {
    badge: 'Expérience Basée sur les Rôles',
    title: 'Conçu pour Chaque Niveau du Workflow de Crédit',
    desc: 'Chaque rôle bénéficie d\'une expérience sur mesure — de l\'exécution opérationnelle des dossiers à la supervision exécutive du portefeuille.',
    roles: [
      { icon: Users, role: 'Analystes', description: 'Examinez les demandes, validez les documents, préparez les décisions et faites avancer les dossiers en toute confiance.', tasks: ['Revue des dossiers', 'Validation documents', 'Exécution du scoring', 'Préparation décisions'] },
      { icon: Briefcase, role: 'Managers', description: 'Supervisez les équipes, gérez les goulots d\'étranglement, surveillez le risque de SLA et contrôlez les workflows d\'approbation.', tasks: ['Supervision d\'équipe', 'Suivi des SLA', 'Gestion des escalades', 'Workflows d\'approbation'] },
      { icon: Crown, role: 'CROs', description: 'Surveillez le risque du portefeuille, la perte attendue, les scénarios de stress et les alertes majeures via une vue exécutive.', tasks: ['Exposition portefeuille', 'Monitoring ECL', 'Scénarios de stress', 'Tableaux de bord exécutifs'] },
      { icon: Building2, role: 'Clients', description: 'Suivez les demandes, soumettez des documents et consultez les prochaines étapes via un portail client sécurisé.', tasks: ['Suivi des demandes', 'Chargement documents', 'Mises à jour statut', 'Messagerie sécurisée'] },
    ],
  },
}

export function RoleSection() {
  const { locale } = useLanguage()
  const t = content[locale]

  return (
    <section className="py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#3ECF8E]/[0.01] via-transparent to-transparent" />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#3ECF8E] mb-4">{t.badge}</div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-medium text-white mb-5 tracking-tight">{t.title}</h2>
          <p className="text-[15px] font-medium text-zinc-400 max-w-2xl mx-auto leading-relaxed">{t.desc}</p>
        </div>

        <motion.div
          className="grid sm:grid-cols-2 gap-5"
          variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }}
        >
          {t.roles.map((r) => (
            <motion.div
              key={r.role}
              variants={itemVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative bg-[#050505] border border-white/[0.03] rounded-2xl p-7 overflow-hidden transition-all duration-500 hover:border-white/[0.08]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#3ECF8E]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center flex-shrink-0 group-hover:bg-[#3ECF8E]/10 group-hover:border-[#3ECF8E]/20 transition-all duration-500">
                  <r.icon className="w-5 h-5 text-zinc-500 group-hover:text-[#3ECF8E] transition-colors duration-500" />
                </div>
                <div className="mt-1">
                  <h3 className="text-[17px] font-medium tracking-tight text-zinc-200 group-hover:text-white transition-colors duration-500 mb-1.5">{r.role}</h3>
                  <p className="text-[14px] text-zinc-500 font-medium leading-relaxed group-hover:text-zinc-400 transition-colors duration-500">{r.description}</p>
                </div>
              </div>
              <div className="relative z-10 flex flex-wrap gap-2">
                {r.tasks.map((task) => (
                  <span key={task} className="text-[11px] font-medium text-zinc-500 bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-1.5 group-hover:text-[#3ECF8E]/90 group-hover:bg-[#3ECF8E]/10 group-hover:border-[#3ECF8E]/20 transition-all duration-500">
                    {task}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
