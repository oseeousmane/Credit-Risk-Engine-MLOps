'use client'

import { ArrowRight, Building2, Shield, BrainCircuit, LayoutDashboard } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/LanguageContext'

const translations = {
  en: {
    badge: 'Enterprise Sales',
    titleLine1: 'Request',
    titleLine2: 'a Demo',
    subtitle: 'See how Credit Risk Engine helps modern banks unify decisioning, monitoring, compliance, and portfolio intelligence.',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Work Email',
    emailPlaceholder: 'name@bank.com',
    company: 'Company',
    role: 'Role',
    roleOptions: ['Select your role', 'Chief Risk Officer', 'Portfolio Manager', 'Credit Analyst', 'IT / Engineering', 'Other'],
    interest: 'Primary Interest',
    interestOptions: ['Select primary interest', 'Full Platform Demo', 'Decisioning & Origination', 'Portfolio Monitoring & Early Warning', 'IFRS 9 / Compliance Reporting', 'Client Portal Experience'],
    message: 'Message (Optional)',
    submit: 'Request a Custom Demo',
    nextTitle: 'What happens next',
    steps: [
      { title: 'Our team reviews your request', desc: 'We assign an enterprise engineer specialized in your region and use case.' },
      { title: 'We tailor the demo', desc: 'Your demo environment is pre-configured with mock data relevant to your portfolio type.' },
      { title: 'Schedule a walkthrough', desc: 'A live, interactive session to explore the platform architecture and modules.' },
    ],
    whyTitle: 'Why Credit Risk Engine?',
    whyFeatures: ['Enterprise-ready workflows', 'Explainable AI (SHAP)', 'Role-based governance', 'Compliance-aligned design'],
    testimonial: '"Whether you\'re evaluating the platform for credit operations, executive risk oversight, or explainable AI workflows, our team can help you assess the right fit."',
  },
  fr: {
    badge: 'Ventes Entreprise',
    titleLine1: 'Demander',
    titleLine2: 'une Démo',
    subtitle: 'Découvrez comment Credit Risk Engine aide les banques modernes à unifier la décision, la surveillance, la conformité et l\'intelligence de portefeuille.',
    firstName: 'Prénom',
    lastName: 'Nom',
    email: 'Email Professionnel',
    emailPlaceholder: 'nom@banque.fr',
    company: 'Entreprise',
    role: 'Rôle',
    roleOptions: ['Sélectionnez votre rôle', 'Directeur des Risques (CRO)', 'Gestionnaire de Portefeuille', 'Analyste Crédit', 'IT / Ingénierie', 'Autre'],
    interest: 'Intérêt Principal',
    interestOptions: ['Sélectionnez votre intérêt', 'Démo Plateforme Complète', 'Décisioning & Origination', 'Surveillance Portefeuille & Alerte Précoce', 'IFRS 9 / Reporting Conformité', 'Expérience Portail Client'],
    message: 'Message (Optionnel)',
    submit: 'Demander une Démo Personnalisée',
    nextTitle: 'Que se passe-t-il ensuite ?',
    steps: [
      { title: 'Notre équipe examine votre demande', desc: 'Nous attribuons un ingénieur entreprise spécialisé dans votre région et votre cas d\'usage.' },
      { title: 'Nous personnalisons la démo', desc: 'Votre environnement de démo est pré-configuré avec des données pertinentes pour votre type de portefeuille.' },
      { title: 'Planification d\'une démonstration', desc: 'Une session interactive en direct pour explorer l\'architecture et les modules de la plateforme.' },
    ],
    whyTitle: 'Pourquoi Credit Risk Engine ?',
    whyFeatures: ['Workflows prêts pour l\'entreprise', 'IA Explicable (SHAP)', 'Gouvernance par rôles', 'Conception conforme à la réglementation'],
    testimonial: '"Que vous évaluiez la plateforme pour les opérations de crédit, la supervision des risques exécutifs ou les workflows d\'IA explicable, notre équipe peut vous aider à trouver la solution adaptée."',
  },
}

const whyIcons = [LayoutDashboard, BrainCircuit, Building2, Shield]

export default function ContactPage() {
  const { locale } = useLanguage()
  const t = translations[locale]

  return (
    <main className="antialiased min-h-screen bg-[#050505] relative overflow-hidden">
      {/* Global Background Grid & Glow for the top section */}
      <div className="absolute top-0 left-0 right-0 h-[800px] pointer-events-none opacity-[0.04] z-0"
        style={{ backgroundImage:'linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)', backgroundSize:'32px 32px',
          maskImage:'radial-gradient(ellipse 100% 100% at 50% 0%, black 40%, transparent 100%)',WebkitMaskImage:'radial-gradient(ellipse 100% 100% at 50% 0%, black 40%, transparent 100%)' }} />
      <div className="absolute top-[-10%] left-0 w-[800px] h-[600px] bg-[#3ECF8E]/[0.08] blur-[150px] rounded-[100%] mix-blend-screen opacity-50 pointer-events-none z-0" />

      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-[1fr,450px] gap-16 pt-36 pb-32 relative z-10">

        {/* ── Left Side (Form) ──────────────────────────────────────────────── */}
        <div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#3ECF8E]">{t.badge}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[4rem] font-medium tracking-tight leading-[1.1] mb-6">
              <span className="text-white block">{t.titleLine1}</span>
              <span className="text-[#3ECF8E] block">{t.titleLine2}</span>
            </h1>
            <p className="text-[18px] text-zinc-400 leading-relaxed font-light mb-12 max-w-xl">{t.subtitle}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <div className="bg-[#080808] border border-white/[0.03] hover:border-white/[0.05] transition-colors rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#3ECF8E]/[0.02] to-transparent opacity-100 pointer-events-none" />
              <form className="space-y-6 relative z-10" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2 group">
                    <label className="text-[13px] font-medium text-zinc-400 group-focus-within:text-[#3ECF8E] transition-colors">{t.firstName}</label>
                    <input type="text" className="w-full bg-[#030303] border border-white/[0.04] rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#3ECF8E]/50 focus:bg-[#0a0a0a] focus:shadow-[0_0_15px_rgba(62,207,142,0.1)] transition-all" />
                  </div>
                  <div className="space-y-2 group">
                    <label className="text-[13px] font-medium text-zinc-400 group-focus-within:text-[#3ECF8E] transition-colors">{t.lastName}</label>
                    <input type="text" className="w-full bg-[#030303] border border-white/[0.04] rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#3ECF8E]/50 focus:bg-[#0a0a0a] focus:shadow-[0_0_15px_rgba(62,207,142,0.1)] transition-all" />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[13px] font-medium text-zinc-400 group-focus-within:text-[#3ECF8E] transition-colors">{t.email}</label>
                  <input type="email" placeholder={t.emailPlaceholder} className="w-full bg-[#030303] border border-white/[0.04] rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-[#3ECF8E]/50 focus:bg-[#0a0a0a] focus:shadow-[0_0_15px_rgba(62,207,142,0.1)] transition-all" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2 group">
                    <label className="text-[13px] font-medium text-zinc-400 group-focus-within:text-[#3ECF8E] transition-colors">{t.company}</label>
                    <input type="text" className="w-full bg-[#030303] border border-white/[0.04] rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#3ECF8E]/50 focus:bg-[#0a0a0a] focus:shadow-[0_0_15px_rgba(62,207,142,0.1)] transition-all" />
                  </div>
                  <div className="space-y-2 group">
                    <label className="text-[13px] font-medium text-zinc-400 group-focus-within:text-[#3ECF8E] transition-colors">{t.role}</label>
                    <select className="w-full bg-[#030303] border border-white/[0.04] rounded-xl px-4 py-3.5 text-zinc-300 focus:text-white focus:outline-none focus:border-[#3ECF8E]/50 focus:bg-[#0a0a0a] focus:shadow-[0_0_15px_rgba(62,207,142,0.1)] transition-all appearance-none cursor-pointer">
                      {t.roleOptions.map((opt, i) => (
                        <option key={i} value={i === 0 ? '' : opt.toLowerCase()} className="bg-[#050505]">{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[13px] font-medium text-zinc-400 group-focus-within:text-[#3ECF8E] transition-colors">{t.interest}</label>
                  <select className="w-full bg-[#030303] border border-white/[0.04] rounded-xl px-4 py-3.5 text-zinc-300 focus:text-white focus:outline-none focus:border-[#3ECF8E]/50 focus:bg-[#0a0a0a] focus:shadow-[0_0_15px_rgba(62,207,142,0.1)] transition-all appearance-none cursor-pointer">
                    {t.interestOptions.map((opt, i) => (
                      <option key={i} value={i === 0 ? '' : opt.toLowerCase()} className="bg-[#050505]">{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[13px] font-medium text-zinc-400 group-focus-within:text-[#3ECF8E] transition-colors">{t.message}</label>
                  <textarea rows={4} className="w-full bg-[#030303] border border-white/[0.04] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3ECF8E]/50 focus:bg-[#0a0a0a] focus:shadow-[0_0_15px_rgba(62,207,142,0.1)] transition-all resize-none"></textarea>
                </div>

                <button className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 rounded-xl text-[#050505] font-semibold text-[14px] transition-all duration-300 mt-6 group shadow-[0_0_24px_rgba(62,207,142,0.2)]">
                  {t.submit}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>

        {/* ── Right Side (Info Blocks) ──────────────────────────────────────── */}
        <div className="space-y-8 pt-8 lg:pt-0">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <div className="bg-[#080808] border border-white/[0.03] rounded-3xl p-8 shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{t.nextTitle}</span>
                </div>
                <ul className="space-y-8">
                  {t.steps.map((step, i) => (
                    <li key={i} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <span className="text-[13px] font-bold text-[#3ECF8E]">{i + 1}</span>
                      </div>
                      <div>
                        <h4 className="text-[15px] font-medium tracking-tight text-white mb-1.5">{step.title}</h4>
                        <p className="text-[13px] text-zinc-500 leading-relaxed">{step.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            <div className="bg-[#080808] border border-white/[0.03] rounded-3xl p-8 shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#3ECF8E]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{t.whyTitle}</span>
                </div>
                <div className="space-y-6">
                  {t.whyFeatures.map((feat, i) => {
                    const Icon = whyIcons[i]
                    return (
                      <div key={i} className="flex items-center gap-4 text-zinc-300">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-[#3ECF8E]" />
                        </div>
                        <span className="text-[14px] font-medium">{feat}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-8 pt-6 border-t border-white/[0.03]">
                  <p className="text-[13px] text-zinc-500 italic font-medium leading-relaxed">
                    {t.testimonial}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
