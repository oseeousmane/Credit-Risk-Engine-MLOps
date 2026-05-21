'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

const content = {
  en: {
    badge: 'FAQ',
    title: 'Common Questions',
    faqs: [
      { q: 'How long does a typical implementation take?', a: 'For SaaS deployments, the core platform is available immediately. Full integration with your Core Banking System (e.g., Temenos) and historical data ingestion typically takes 6 to 12 weeks depending on data cleanliness and institutional readiness.' },
      { q: 'Can we bring our own Python models (BYOM)?', a: 'Yes. The MLOps Engine allows data science teams to deploy custom Python models (scikit-learn, XGBoost, PyTorch) via our Model Registry API. We automatically wrap them in our explainability (SHAP) and monitoring (PSI) layers.' },
      { q: 'How is IFRS 9 / ECL compliance handled?', a: 'The platform natively computes 12-month and Lifetime Expected Credit Loss (ECL). It automatically manages Stage 1, 2, and 3 migrations based on configurable triggers (e.g., 30 DPD, qualitative overlays) and generates audit-ready disclosure reports.' },
      { q: 'Do you support multi-entity or cross-border deployments?', a: 'Absolutely. The platform supports complex parent-child entity hierarchies and multi-jurisdiction deployments. Role-Based Access Control (RBAC) ensures data visibility is strictly isolated by legal entity or region.' },
    ],
  },
  fr: {
    badge: 'FAQ',
    title: 'Questions Frequentes',
    faqs: [
      { q: 'Combien de temps prend une implementation classique ?', a: 'Pour les deploiements SaaS, la plateforme centrale est disponible immediatement. L\'integration complete avec votre Systeme Bancaire Central (ex. Temenos) et l\'ingestion des donnees historiques prend generalement 6 a 12 semaines selon la qualite des donnees.' },
      { q: 'Pouvons-nous apporter nos propres modeles Python (BYOM) ?', a: 'Oui. Le Moteur MLOps permet aux equipes de data science de deployer des modeles Python personnalises (scikit-learn, XGBoost, PyTorch) via notre API de Registre de Modeles. Nous les integrons automatiquement dans nos couches d\'explicabilite (SHAP) et de monitoring (PSI).' },
      { q: 'Comment la conformite IFRS 9 / ECL est-elle geree ?', a: 'La plateforme calcule nativement la Perte de Credit Attendue (ECL) sur 12 mois et a vie. Elle gere automatiquement les migrations Stage 1, 2 et 3 sur la base de declencheurs configurables et genere des rapports de divulgation prets pour l\'audit.' },
      { q: 'Supportez-vous les deploiements multi-entites ou transfrontaliers ?', a: 'Absolument. La plateforme supporte des hierarchies d\'entites parent-enfant complexes et des deploiements multi-juridictions. Le Controle d\'Acces Base sur les Roles (RBAC) garantit que la visibilite des donnees est strictement isolee par entite juridique ou region.' },
    ],
  },
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const { locale } = useLanguage()
  const t = content[locale]

  return (
    <section className="py-32 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#3ECF8E]/[0.03] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#3ECF8E] mb-5"
          >
            {t.badge}
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl font-medium text-white tracking-tight"
          >
            {t.title}
          </motion.h2>
        </div>

        <div className="grid gap-4">
          {t.faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`group border rounded-2xl transition-all duration-500 ${
                openIndex === i 
                ? 'bg-[#0a0a0a] border-[#3ECF8E]/20 shadow-[0_0_30px_rgba(62,207,142,0.05)]' 
                : 'bg-white/[0.02] border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.04]'
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex items-center justify-between w-full p-7 text-left outline-none"
              >
                <span className={`text-[17px] font-medium tracking-tight transition-colors duration-300 ${openIndex === i ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                  {faq.q}
                </span>
                <div className={`flex-shrink-0 ml-4 p-2 rounded-full transition-all duration-500 ${openIndex === i ? 'bg-[#3ECF8E]/10 text-[#3ECF8E] rotate-180' : 'bg-white/[0.05] text-zinc-500'}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>
              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                  >
                    <div className="px-7 pb-8">
                      <div className="h-px w-full bg-gradient-to-r from-[#3ECF8E]/20 to-transparent mb-6" />
                      <p className="text-[15px] font-medium text-zinc-400 leading-relaxed max-w-3xl">
                        {faq.a}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
