'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { ArchitectureSection } from '@/components/landing/ArchitectureSection'
import { ApiSection } from '@/components/landing/ApiSection'
import { RulesEngineSection } from '@/components/landing/RulesEngineSection'
import { TechStackSection } from '@/components/landing/TechStackSection'
import { IntegrationsSection } from '@/components/landing/IntegrationsSection'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/LanguageContext'

const t = {
  en: {
    badge: 'The Platform',
    titleLine1: 'The Engine Behind',
    titleLine2: 'Modern Credit Risk',
    desc: 'A highly extensible, API-first architecture designed to ingest complex data, run quantitative models, and orchestrate institutional workflows.',
    cta: 'Request a Technical Demo',
  },
  fr: {
    badge: 'La Plateforme',
    titleLine1: 'Le Moteur Derrière le',
    titleLine2: 'Risque de Crédit Moderne',
    desc: 'Une architecture API-first hautement extensible conçue pour ingérer des données complexes, exécuter des modèles quantitatifs et orchestrer des workflows institutionnels.',
    cta: 'Demander une Démo Technique',
  },
}

function SectionDivider() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  )
}

export default function PlatformPage() {
  const { locale } = useLanguage()
  const tx = t[locale]

  return (
    <main className="antialiased pt-32 pb-24 min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative max-w-4xl mx-auto px-6 text-center mb-32 pt-20">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage:'linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)', backgroundSize:'32px 32px',
            maskImage:'radial-gradient(ellipse 80% 80% at 50% 40%, black 20%, transparent 100%)',WebkitMaskImage:'radial-gradient(ellipse 80% 80% at 50% 40%, black 20%, transparent 100%)' }} />
        <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-brand-400/[0.12] blur-[120px] rounded-[100%] mix-blend-screen opacity-60 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8 cursor-default shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-300">{tx.badge}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[4rem] font-medium tracking-tight leading-[1.1] mb-8 max-w-5xl mx-auto">
            <span className="text-white block">{tx.titleLine1}</span>
            <span className="text-brand-400 block">{tx.titleLine2}</span>
          </h1>
          <p className="text-[18px] text-zinc-400 leading-relaxed font-light max-w-2xl mx-auto">
            {tx.desc}
          </p>
        </motion.div>
      </div>

      <ArchitectureSection />
      
      <SectionDivider />

      <RulesEngineSection />

      <SectionDivider />

      <ApiSection />

      <SectionDivider />

      <IntegrationsSection />

      <TechStackSection />

      <div className="max-w-4xl mx-auto px-6 text-center mt-32 relative overflow-hidden bg-surface-0 border border-white/[0.03] rounded-3xl p-16">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-400/[0.02] rounded-full blur-[100px] pointer-events-none" />
        <Link href={`/${locale}/contact`} className="relative z-10 inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-400 text-surface-0 rounded-md font-semibold text-[13px] hover:bg-brand-400/90 transition-all duration-300 shadow-[0_0_24px_rgba(59,123,255,0.2)]">
          {tx.cta}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </main>
  )
}
