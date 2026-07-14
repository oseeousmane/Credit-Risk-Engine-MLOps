'use client'

import { Shield, Lock, FileCheck, Eye, Server, Database, Key, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/LanguageContext'
import { ComplianceMockup } from '@/components/landing/ModulesMockups'

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
    badge: 'Enterprise Security',
    titleLine1: 'Governance',
    titleLine2: '& Trust',
    subtitle: 'Built for highly regulated banking environments. From strict Role-Based Access Control to immutable audit trails, security is embedded in every layer of the platform.',
    certifications: ['SOC 2 Type II Certified', 'ISO 27001 Compliant', 'GDPR & CCPA Ready', 'AES-256 Encryption'],
    pillarsTitle: 'Core Security Architecture',
    pillarsSubtitle: 'Zero-trust principles applied across the entire credit lifecycle.',
    pillars: [
      { title: 'Role-Based Access Control (RBAC)', desc: 'Granular permissions ensuring analysts, risk managers, and executives only see what they need. Complete isolation between internal platform logic and the external client portal.' },
      { title: 'Immutable Audit Trails', desc: 'Every state change, ML inference, and human override is cryptographically logged. Easily export compliance-ready histories for regulators and internal auditors.' },
      { title: 'Explainable AI (XAI)', desc: 'No black boxes. Our ML models output SHAP values for every decision, ensuring that credit officers can always mathematically explain why a specific risk score was assigned.' },
      { title: 'End-to-End Encryption', desc: 'All client financial data and proprietary scoring logic is encrypted at rest (AES-256) and in transit (TLS 1.3), utilizing enterprise-grade key management systems.' },
    ],
    deployBadge: 'Deployment Flexibility',
    deployTitle: 'Data Sovereignty & Control',
    deployDesc: 'We understand that Tier 1 financial institutions have strict data residency requirements. The Credit Risk Engine can be deployed in a way that respects your organizational boundaries.',
    deployOptions: ['Virtual Private Cloud (VPC) Deployment', 'On-Premise Air-Gapped Options', 'Bring Your Own Key (BYOK) Support'],
    deployLink: 'Discuss deployment options',
    ctaText: 'Require full documentation for your infosec team?',
    ctaBtn: 'Request Security Whitepaper',
  },
  fr: {
    badge: 'Sécurité Entreprise',
    titleLine1: 'Gouvernance',
    titleLine2: '& Confiance',
    subtitle: 'Conçu pour les environnements bancaires hautement réglementés. Du contrôle d\'accès strict basé sur les rôles aux pistes d\'audit immuables, la sécurité est intégrée dans chaque couche de la plateforme.',
    certifications: ['SOC 2 Type II Certifié', 'Conforme ISO 27001', 'RGPD & CCPA Ready', 'Chiffrement AES-256'],
    pillarsTitle: 'Architecture de Sécurité Principale',
    pillarsSubtitle: 'Principes Zero-Trust appliqués tout au long du cycle de vie du crédit.',
    pillars: [
      { title: 'Contrôle d\'Accès Basé sur les Rôles (RBAC)', desc: 'Permissions granulaires garantissant que les analystes, gestionnaires de risques et dirigeants ne voient que ce dont ils ont besoin. Isolation complète entre la logique interne de la plateforme et le portail client externe.' },
      { title: 'Pistes d\'Audit Immuables', desc: 'Chaque changement d\'état, inférence ML et dérogation humaine est journalisé cryptographiquement. Exportez facilement des historiques conformes pour les régulateurs et les auditeurs internes.' },
      { title: 'IA Explicable (XAI)', desc: 'Pas de boîtes noires. Nos modèles ML produisent des valeurs SHAP pour chaque décision, garantissant que les agents de crédit peuvent toujours expliquer mathématiquement pourquoi un score de risque spécifique a été attribué.' },
      { title: 'Chiffrement de Bout en Bout', desc: 'Toutes les données financières des clients et la logique de scoring propriétaire sont chiffrées au repos (AES-256) et en transit (TLS 1.3), utilisant des systèmes de gestion de clés de niveau entreprise.' },
    ],
    deployBadge: 'Flexibilité de Déploiement',
    deployTitle: 'Souveraineté des Données & Contrôle',
    deployDesc: 'Nous comprenons que les institutions financières de Tier 1 ont des exigences strictes en matière de résidence des données. Le Credit Risk Engine peut être déployé d\'une manière qui respecte vos frontières organisationnelles.',
    deployOptions: ['Déploiement en Cloud Privé Virtuel (VPC)', 'Options On-Premise à Air Gap', 'Support Bring Your Own Key (BYOK)'],
    deployLink: 'Discuter des options de déploiement',
    ctaText: 'Besoin de documentation complète pour votre équipe infosec ?',
    ctaBtn: 'Demander le Livre Blanc Sécurité',
  },
}

const pillarIcons = [Lock, FileCheck, Eye, Key]
const deployIcons = [Server, Database, Lock]

export default function SecurityPage() {
  const { locale } = useLanguage()
  const t = translations[locale]

  return (
    <main className="antialiased min-h-screen bg-surface-0">
      
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage:'linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)', backgroundSize:'32px 32px',
            maskImage:'radial-gradient(ellipse 80% 80% at 50% 40%, black 20%, transparent 100%)',WebkitMaskImage:'radial-gradient(ellipse 80% 80% at 50% 40%, black 20%, transparent 100%)' }} />
        <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-brand-400/[0.12] blur-[120px] rounded-[100%] mix-blend-screen opacity-60 pointer-events-none" />

        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8 cursor-default shadow-sm">
            <Shield className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-300">{t.badge}</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl lg:text-[4rem] font-medium tracking-tight leading-[1.1] mb-8 max-w-5xl mx-auto">
            <span className="text-white block">{t.titleLine1}</span>
            <span className="text-brand-400 block">{t.titleLine2}</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-[18px] text-zinc-400 leading-relaxed font-light max-w-2xl mx-auto mb-12">
            {t.subtitle}
          </motion.p>
        </motion.div>
      </section>

      {/* ── Certifications Strip ─────────────────────────────────────────── */}
      <div className="border-y border-white/[0.04] bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <motion.div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6" variants={listContainerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {t.certifications.map((cert, idx) => (
              <motion.div variants={listItemVariants} key={idx} className="flex items-center gap-2.5 text-zinc-300">
                <CheckCircle2 className="w-5 h-5 text-brand-400" />
                <span className="text-[15px] font-medium tracking-tight">{cert}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Security Pillars & Mockup ────────────────────────────────────── */}
      <section className="py-32 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-24">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-400">Architecture</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-white mb-5">{t.pillarsTitle}</h2>
            <p className="text-zinc-400 text-[15px] max-w-2xl mx-auto">{t.pillarsSubtitle}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <div className="space-y-10">
                {t.pillars.slice(0, 2).map((pillar, i) => {
                  const Icon = pillarIcons[i]
                  return (
                    <div key={i} className="group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.08] group-hover:bg-brand-400/10 group-hover:border-brand-400/20 transition-colors duration-500">
                          <Icon className="w-4 h-4 text-zinc-400 group-hover:text-brand-400 transition-colors duration-500" />
                        </div>
                        <h3 className="text-xl font-medium tracking-tight text-zinc-200 group-hover:text-white transition-colors">{pillar.title}</h3>
                      </div>
                      <p className="text-[15px] font-medium text-zinc-500 leading-relaxed pl-[52px]">{pillar.desc}</p>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
              <ComplianceMockup />
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="flex justify-center order-2 lg:order-1">
                <div className="relative w-64 h-64">
                  <div className="absolute inset-0 border border-brand-400/20 rounded-full animate-[spin_10s_linear_infinite]" />
                  <div className="absolute inset-4 border border-brand-400/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                  <div className="absolute inset-8 border border-white/5 rounded-full" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Shield className="w-16 h-16 text-brand-400 drop-shadow-[0_0_15px_rgba(59,123,255,0.3)]" />
                  </div>
                </div>
            </motion.div>
             <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="order-1 lg:order-2">
              <div className="space-y-10">
                {t.pillars.slice(2, 4).map((pillar, i) => {
                  const Icon = pillarIcons[i+2]
                  return (
                    <div key={i} className="group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.08] group-hover:bg-brand-400/10 group-hover:border-brand-400/20 transition-colors duration-500">
                          <Icon className="w-4 h-4 text-zinc-400 group-hover:text-brand-400 transition-colors duration-500" />
                        </div>
                        <h3 className="text-xl font-medium tracking-tight text-zinc-200 group-hover:text-white transition-colors">{pillar.title}</h3>
                      </div>
                      <p className="text-[15px] font-medium text-zinc-500 leading-relaxed pl-[52px]">{pillar.desc}</p>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Deployment Flexibility ────────────────────────────────────────── */}
      <section className="py-24">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-6xl mx-auto px-6">
          <div className="relative rounded-3xl border border-white/[0.03] bg-[#080808] overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-400/[0.02] rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 p-12 md:p-16 text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-400/10 border border-brand-400/20 mb-6 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-400">{t.deployBadge}</span>
              </div>
              <h3 className="text-3xl font-medium tracking-tight text-white mb-6">{t.deployTitle}</h3>
              <p className="text-zinc-400 font-medium text-[15px] leading-relaxed mb-10">{t.deployDesc}</p>
              
              <motion.div variants={listContainerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-wrap justify-center gap-4 mb-10">
                {t.deployOptions.map((opt, i) => {
                  const Icon = deployIcons[i]
                  return (
                    <motion.div key={i} variants={listItemVariants} className="flex items-center gap-2.5 px-4 py-2 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                      <Icon className="w-4 h-4 text-brand-400" />
                      <span className="text-[13px] font-medium text-zinc-300">{opt}</span>
                    </motion.div>
                  )
                })}
              </motion.div>
              
              <Link href={`/${locale}/contact`} className="inline-flex items-center gap-2 text-[14px] font-semibold text-brand-400 hover:text-brand-400/80 transition-colors">
                {t.deployLink} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
          className="relative bg-surface-0 border border-white/[0.03] rounded-3xl p-16 text-center overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-brand-400/[0.02] rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl font-medium tracking-tight text-white mb-4">
              {t.ctaText}
            </h2>
            <p className="text-[15px] text-zinc-400 mb-8 max-w-lg mx-auto leading-relaxed">
              Review our comprehensive architecture documentation, SOC 2 reports, and penetration testing summaries.
            </p>
            <Link href={`/${locale}/contact`} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-400 text-surface-0 rounded-md font-semibold text-[13px] hover:bg-brand-400/90 transition-all shadow-[0_0_30px_rgba(59,123,255,0.25)]">
              {t.ctaBtn} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      </section>

    </main>
  )
}
