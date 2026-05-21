'use client'

import { Book, FileText, Code2, ArrowRight, Search, Terminal, Component, Clock, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/LanguageContext'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
} as const
const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
} as const
const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
} as const
const listItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
} as const

const translations = {
  en: {
    badge: 'Developer & User Hub',
    titleLine1: 'Documentation',
    titleLine2: '& Resources',
    subtitle: 'Everything you need to integrate, deploy, and master the Credit Risk Engine. Explore our guides, API references, and compliance methodologies.',
    searchPlaceholder: 'Search documentation, API endpoints, guides...',
    popularLabel: 'Popular:',
    popularTopics: ['API Authentication', 'IFRS 9 Staging', 'MLOps Pipelines', 'Role-Based Access', 'Stress Testing Scenarios'],
    featuredTitle: 'Featured Guides',
    guides: [
      { title: 'Platform Guide', desc: 'Comprehensive overview of modules, user roles, data architecture, and UI navigation.', meta: '15 min', metaIcon: 'clock', cta: 'Read', href: 'platform-guide' },
      { title: 'API Reference', desc: 'RESTful endpoints for integrating scoring workflows and exposure data into internal systems.', meta: 'Updated v2.1', metaIcon: 'calendar', cta: 'Endpoints', href: 'api-reference' },
      { title: 'Compliance', desc: 'Detailed guides on ECL calculation methodologies, staging criteria, and reporting standards.', meta: '20 min', metaIcon: 'clock', cta: 'Methodology', href: 'compliance-ifrs9' },
    ],
    devTitle: 'Developer Resources',
    devResources: [
      { title: 'Python SDK', desc: 'Official Python client for data scientists. Interact with the MLOps engine and submit custom models directly from Jupyter.' },
      { title: 'UI Component Library', desc: 'React components to embed Risk Engine charts and decisioning workflows directly into your internal portals.' },
    ],
    ctaText: "Can't find what you're looking for?",
    ctaBtn: 'Contact Enterprise Support',
  },
  fr: {
    badge: 'Hub Développeur & Utilisateur',
    titleLine1: 'Documentation',
    titleLine2: '& Ressources',
    subtitle: 'Tout ce dont vous avez besoin pour intégrer, déployer et maîtriser le Credit Risk Engine. Explorez nos guides, références API et méthodologies de conformité.',
    searchPlaceholder: 'Rechercher dans la documentation, endpoints API, guides...',
    popularLabel: 'Populaire :',
    popularTopics: ['Authentification API', 'Staging IFRS 9', 'Pipelines MLOps', 'Accès Basé sur les Rôles', 'Scénarios de Stress Test'],
    featuredTitle: 'Guides Phares',
    guides: [
      { title: 'Guide Plateforme', desc: 'Vue d\'ensemble complète des modules, rôles utilisateurs, architecture des données et navigation UI.', meta: '15 min', metaIcon: 'clock', cta: 'Lire', href: 'platform-guide' },
      { title: 'Référence API', desc: 'Endpoints RESTful pour intégrer les workflows de scoring et les données d\'exposition dans les systèmes internes.', meta: 'Mis à jour v2.1', metaIcon: 'calendar', cta: 'Endpoints', href: 'api-reference' },
      { title: 'Conformité', desc: 'Guides détaillés sur les méthodologies de calcul ECL, critères de staging et normes de reporting.', meta: '20 min', metaIcon: 'clock', cta: 'Méthodologie', href: 'compliance-ifrs9' },
    ],
    devTitle: 'Ressources Développeurs',
    devResources: [
      { title: 'SDK Python', desc: 'Client Python officiel pour les data scientists. Interagissez avec le moteur MLOps et soumettez des modèles personnalisés directement depuis Jupyter.' },
      { title: 'Bibliothèque de Composants UI', desc: 'Composants React pour intégrer les graphiques Risk Engine et les workflows de décisioning directement dans vos portails internes.' },
    ],
    ctaText: 'Vous ne trouvez pas ce que vous cherchez ?',
    ctaBtn: 'Contacter le Support Entreprise',
  },
}

const guideIcons = [Book, Code2, FileText]
const devIcons = [Terminal, Component]

export default function DocsPage() {
  const { locale } = useLanguage()
  const t = translations[locale]

  return (
    <main className="antialiased min-h-screen bg-[#050505]">
      
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage:'linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)', backgroundSize:'32px 32px',
            maskImage:'radial-gradient(ellipse 80% 80% at 50% 40%, black 20%, transparent 100%)',WebkitMaskImage:'radial-gradient(ellipse 80% 80% at 50% 40%, black 20%, transparent 100%)' }} />
        <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#3ECF8E]/[0.12] blur-[120px] rounded-[100%] mix-blend-screen opacity-60 pointer-events-none" />

        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-4xl mx-auto px-6 text-center relative z-10 mb-8">
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8 cursor-default shadow-sm">
            <Book className="w-3.5 h-3.5 text-[#3ECF8E]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-300">{t.badge}</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl lg:text-[4rem] font-medium tracking-tight leading-[1.1] mb-8 max-w-5xl mx-auto">
            <span className="text-white block">{t.titleLine1}</span>
            <span className="text-[#3ECF8E] block">{t.titleLine2}</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-[18px] text-zinc-400 leading-relaxed font-light max-w-2xl mx-auto mb-12">
            {t.subtitle}
          </motion.p>
          
          {/* Search Bar */}
          <motion.div variants={itemVariants} className="relative max-w-xl mx-auto mb-8 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-zinc-500 group-focus-within:text-[#3ECF8E] transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-4 bg-[#0a0a0a] border border-white/[0.05] hover:border-white/[0.1] focus:border-[#3ECF8E]/50 focus:bg-[#0c0c0c] focus:shadow-[0_0_20px_rgba(62,207,142,0.1)] rounded-xl text-white placeholder-zinc-500 transition-all outline-none text-[15px]"
              placeholder={t.searchPlaceholder}
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded bg-white/[0.05] border border-white/[0.1] text-[10px] font-medium text-zinc-400">
                <span className="text-[12px]">⌘</span> K
              </kbd>
            </div>
          </motion.div>

          {/* Popular Topics */}
          <motion.div variants={listContainerVariants} initial="hidden" animate="visible" className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
            <span className="text-[12px] text-zinc-500 font-medium mr-2">{t.popularLabel}</span>
            {t.popularTopics.map((topic, i) => (
              <motion.span variants={listItemVariants} key={i} className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.1] text-[12px] text-zinc-300 cursor-pointer transition-colors">
                {topic}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Featured Guides ────────────────────────────────────────────────── */}
      <section className="py-20 relative border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10">
            <h2 className="text-2xl font-medium tracking-tight text-white">{t.featuredTitle}</h2>
          </motion.div>
          
          <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} className="grid md:grid-cols-3 gap-6">
            {t.guides.map((guide, i) => {
              const Icon = guideIcons[i]
              return (
                <motion.div key={i} variants={itemVariants} whileHover={{ y: -6, transition: { duration: 0.2 } }}>
                  <Link href={`/${locale}/docs/${guide.href}`} className="relative flex flex-col h-full p-8 bg-[#080808] border border-white/[0.03] hover:border-white/[0.08] rounded-2xl transition-all duration-500 group overflow-hidden shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#3ECF8E]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    
                    <div className="relative z-10 w-12 h-12 rounded-xl flex items-center justify-center bg-white/[0.02] border border-white/[0.04] group-hover:bg-[#3ECF8E]/10 group-hover:border-[#3ECF8E]/20 transition-all duration-500 mb-6">
                      <Icon className="w-5 h-5 text-zinc-500 group-hover:text-[#3ECF8E] transition-colors" />
                    </div>
                    
                    <h3 className="relative z-10 text-xl font-medium tracking-tight text-zinc-200 group-hover:text-white transition-colors duration-500 mb-3">{guide.title}</h3>
                    <p className="relative z-10 text-[15px] font-medium text-zinc-500 group-hover:text-zinc-400 transition-colors duration-500 leading-relaxed mb-8 flex-1">{guide.desc}</p>
                    
                    <div className="relative z-10 flex items-center justify-between mt-auto pt-6 border-t border-white/[0.04]">
                      <div className="flex items-center gap-3 text-[12px] font-medium text-zinc-500">
                        <span className="flex items-center gap-1.5">
                          {guide.metaIcon === 'clock' ? <Clock className="w-3.5 h-3.5" /> : <CalendarDays className="w-3.5 h-3.5" />}
                          {guide.meta}
                        </span>
                      </div>
                      <div className="text-[13px] font-semibold text-[#3ECF8E] flex items-center gap-1.5">
                        {guide.cta} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Developer Resources ────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10">
            <h2 className="text-2xl font-medium tracking-tight text-white">{t.devTitle}</h2>
          </motion.div>

          <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} className="grid md:grid-cols-2 gap-6">
            {t.devResources.map((res, i) => {
              const Icon = devIcons[i]
              return (
                <motion.div key={i} variants={itemVariants} whileHover={{ y: -4, transition: { duration: 0.2 } }}>
                  <div className="flex items-start gap-5 p-8 bg-[#080808] border border-white/[0.03] rounded-2xl hover:border-white/[0.08] transition-all duration-300 cursor-pointer group shadow-xl">
                    <div className="w-12 h-12 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#3ECF8E]/10 group-hover:border-[#3ECF8E]/20 transition-all duration-300">
                      <Icon className="w-5 h-5 text-zinc-500 group-hover:text-[#3ECF8E] transition-colors" />
                    </div>
                    <div>
                      <h4 className="text-[16px] font-medium text-white mb-2">{res.title}</h4>
                      <p className="text-[14px] font-medium text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">{res.desc}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-32 mt-12">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
          className="relative bg-[#080808] border border-white/[0.03] rounded-3xl p-16 text-center overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-[#3ECF8E]/[0.02] rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl font-medium tracking-tight text-white mb-4">
              {t.ctaText}
            </h2>
            <p className="text-[15px] text-zinc-400 mb-8 max-w-lg mx-auto leading-relaxed">
              Our engineering team is available to assist with custom integrations, API keys, and deployment architectures.
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
