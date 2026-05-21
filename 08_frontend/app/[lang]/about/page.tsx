'use client'

import { TrendingUp, Shield, Zap, ArrowRight, Eye, Code2 } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { LeadershipSection } from '@/components/landing/LeadershipSection'
import { GlobalFootprintSection } from '@/components/landing/GlobalFootprintSection'
import { InvestorsSection } from '@/components/landing/InvestorsSection'
import { useLanguage } from '@/lib/LanguageContext'

const translations = {
  en: {
    badge: 'The Company',
    titleLine1: 'About',
    titleLine2: 'Credit Risk Engine',
    subtitle: 'We are redefining how institutional capital is deployed by bridging the gap between advanced data science and rigorous credit governance.',
    stats: [
      { value: '$10B+', label: 'Exposure Monitored' },
      { value: '< 50ms', label: 'Decision Latency' },
      { value: '100%', label: 'Audit Readiness' },
    ],
    storyTitle: 'Our Story',
    story: [
      'Historically, enterprise credit risk has been managed through fragmented systems: spreadsheets for analysts, legacy platforms for decisioning, and manual reporting for compliance. This fragmentation introduces latency, operational risk, and limits the strategic value of risk data.',
      'Credit Risk Engine was built to solve this. Our platform provides a single, unified operating layer for the entire credit lifecycle. By combining algorithmic scoring and Explainable AI (XAI) with human-in-the-loop workflows, we empower banks to make faster, more accurate decisions without compromising on regulatory rigor.',
      'Today, our technology helps leading financial institutions monitor global exposure, automate complex decision pipelines, and maintain impeccable audit readiness.',
    ],
    valuesTitle: 'Our Core Values',
    valuesSubtitle: 'The principles that guide our engineering and design decisions.',
    values: [
      { title: 'Transparency First', description: 'We believe in Explainable AI (XAI). No black boxes. Every credit decision must be mathematically explainable to auditors and regulators.' },
      { title: 'Regulatory Rigor', description: 'Compliance is not an afterthought. Built from day one to natively support IFRS 9, Basel III, and strict banking data sovereignty.' },
      { title: 'Developer Velocity', description: 'We provide modern, RESTful APIs and SDKs that allow institutional engineering teams to integrate complex risk models in days, not months.' },
      { title: 'High Performance', description: 'Built on a Rust/Node architecture designed to process massive parallel stress-test simulations with sub-second latency.' },
    ],
    ctaTitle: 'Ready to transform your risk operations?',
    ctaDesc: 'Get in touch with our team of risk experts and engineers to explore how we can support your institution.',
    ctaBtn: 'Talk to our Experts',
  },
  fr: {
    badge: 'L\'Entreprise',
    titleLine1: 'À Propos',
    titleLine2: 'Credit Risk Engine',
    subtitle: 'Nous redéfinissons le déploiement des capitaux institutionnels en comblant le fossé entre la data science avancée et la gouvernance rigoureuse du crédit.',
    stats: [
      { value: '$10B+', label: 'Exposition Surveillée' },
      { value: '< 50ms', label: 'Latence de Décision' },
      { value: '100%', label: 'Conformité Audit' },
    ],
    storyTitle: 'Notre Histoire',
    story: [
      'Historiquement, le risque de crédit en entreprise a été géré via des systèmes fragmentés : tableurs pour les analystes, plateformes obsolètes pour la décision, et reporting manuel pour la conformité. Cette fragmentation introduit de la latence, un risque opérationnel et limite la valeur stratégique des données de risque.',
      'Credit Risk Engine a été conçu pour résoudre ce problème. Notre plateforme offre une couche opérationnelle unifiée pour l\'ensemble du cycle de vie du crédit. En combinant le scoring algorithmique et l\'IA Explicable (XAI) avec des workflows impliquant l\'humain, nous permettons aux banques de prendre des décisions plus rapides et précises sans compromettre la rigueur réglementaire.',
      'Aujourd\'hui, notre technologie aide les principales institutions financières à surveiller l\'exposition globale, automatiser les pipelines de décision complexes et maintenir une préparation audit irréprochable.',
    ],
    valuesTitle: 'Nos Valeurs Fondamentales',
    valuesSubtitle: 'Les principes qui guident nos décisions d\'ingénierie et de conception.',
    values: [
      { title: 'Transparence Avant Tout', description: 'Nous croyons en l\'IA Explicable (XAI). Pas de boîtes noires. Chaque décision de crédit doit être mathématiquement explicable aux auditeurs et régulateurs.' },
      { title: 'Rigueur Réglementaire', description: 'La conformité n\'est pas une réflexion après coup. Conçu dès le premier jour pour prendre en charge nativement IFRS 9, Bâle III et la souveraineté stricte des données bancaires.' },
      { title: 'Vélocité des Développeurs', description: 'Nous fournissons des APIs RESTful modernes et des SDKs qui permettent aux équipes d\'ingénierie institutionnelles d\'intégrer des modèles de risque complexes en jours, pas en mois.' },
      { title: 'Haute Performance', description: 'Conçu sur une architecture Rust/Node capable de traiter des simulations massives de stress tests en parallèle avec une latence inférieure à la seconde.' },
    ],
    ctaTitle: 'Prêt à transformer vos opérations de risque ?',
    ctaDesc: 'Contactez notre équipe d\'experts en risque et d\'ingénieurs pour explorer comment nous pouvons soutenir votre institution.',
    ctaBtn: 'Parler à nos Experts',
  },
}

const valueIcons = [Eye, Shield, Code2, Zap]

export default function AboutPage() {
  const { locale } = useLanguage()
  const t = translations[locale]

  return (
    <main className="antialiased pt-32 pb-24 min-h-screen">
      {/* Hero */}
      <section className="relative pt-36 pb-24 overflow-hidden mb-16">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage:'linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)', backgroundSize:'32px 32px',
            maskImage:'radial-gradient(ellipse 80% 80% at 50% 40%, black 20%, transparent 100%)',WebkitMaskImage:'radial-gradient(ellipse 80% 80% at 50% 40%, black 20%, transparent 100%)' }} />
        <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#3ECF8E]/[0.12] blur-[120px] rounded-[100%] mix-blend-screen opacity-60 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8 cursor-default shadow-sm"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#3ECF8E]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-300">{t.badge}</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-[4rem] font-medium tracking-tight leading-[1.1] mb-8"
          >
            <span className="text-white block">{t.titleLine1}</span>
            <span className="text-[#3ECF8E] block">{t.titleLine2}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[18px] text-zinc-400 leading-relaxed font-light max-w-2xl mx-auto"
          >
            {t.subtitle}
          </motion.p>
        </div>
      </section>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
        className="max-w-5xl mx-auto px-6 mb-32"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.stats.map((stat, i) => (
            <div key={i} className="group bg-[#050505] border border-white/[0.03] hover:border-white/[0.08] rounded-3xl p-8 text-center flex flex-col justify-center min-h-[160px] shadow-xl relative overflow-hidden transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-[#3ECF8E]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative z-10 text-4xl font-medium tracking-tight text-white mb-3 group-hover:text-[#3ECF8E] transition-colors duration-500">{stat.value}</div>
              <div className="relative z-10 text-[11px] text-zinc-500 font-bold uppercase tracking-[0.25em]">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Story */}
      <motion.div
        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto px-6 mb-24"
      >
        <div className="bg-[#050505] border border-white/[0.03] rounded-3xl p-10 sm:p-16 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#3ECF8E]/[0.02] rounded-full blur-[100px]" />
          <h2 className="text-2xl font-medium tracking-tight text-white mb-8 relative z-10">{t.storyTitle}</h2>
          <div className="space-y-6 text-[16px] text-zinc-400 leading-relaxed relative z-10">
            {t.story.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      </motion.div>

      <LeadershipSection />
      <GlobalFootprintSection />
      <InvestorsSection />

      {/* Values */}
      <div className="max-w-6xl mx-auto px-6 mt-16 mb-32 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#3ECF8E]">Our Culture</span>
          </div>
          <h2 className="text-3xl font-medium tracking-tight text-white mb-4">{t.valuesTitle}</h2>
          <p className="text-zinc-400 text-[16px] max-w-2xl mx-auto">{t.valuesSubtitle}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {t.values.map((v, i) => {
            const Icon = valueIcons[i]
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative p-10 bg-[#080808] border border-white/[0.03] hover:border-white/[0.08] rounded-2xl transition-all duration-500 group overflow-hidden shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#3ECF8E]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="flex items-start gap-5 relative z-10">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/[0.02] border border-white/[0.04] group-hover:bg-[#3ECF8E]/10 group-hover:border-[#3ECF8E]/20 transition-all duration-500 shrink-0">
                    <Icon className="w-5 h-5 text-zinc-500 group-hover:text-[#3ECF8E] transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium tracking-tight text-zinc-200 group-hover:text-white transition-colors duration-500 mb-3">{v.title}</h3>
                    <p className="text-[15px] font-medium text-zinc-500 group-hover:text-zinc-400 transition-colors duration-500 leading-relaxed">{v.description}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
          className="relative bg-[#080808] border border-white/[0.03] rounded-3xl p-16 text-center overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-[#3ECF8E]/[0.02] rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl font-medium tracking-tight text-white mb-4">
              {t.ctaTitle}
            </h2>
            <p className="text-[15px] text-zinc-400 mb-8 max-w-lg mx-auto leading-relaxed">
              {t.ctaDesc}
            </p>
            <Link href={`/${locale}/contact`} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#3ECF8E] text-[#050505] rounded-md font-semibold text-[13px] hover:bg-[#3ECF8E]/90 transition-all shadow-[0_0_30px_rgba(62,207,142,0.25)]">
              {t.ctaBtn} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  )
}
