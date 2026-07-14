'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'

const content = {
  en: {
    line1: 'Built for Modern Banks.',
    line2: 'Designed for Explainable Credit Risk Operations.',
    desc: 'Bring decisioning, monitoring, compliance, and portfolio intelligence into one enterprise-grade platform.',
    cta1: 'Start your project',
    cta2: 'Request a demo',
  },
  fr: {
    line1: 'Conçu pour les Banques Modernes.',
    line2: 'Pensé pour des Opérations de Risque de Crédit Explicables.',
    desc: 'Réunissez le décisioning, la surveillance, la conformité et l\'intelligence de portefeuille dans une plateforme de niveau entreprise.',
    cta1: 'Démarrer votre projet',
    cta2: 'Demander une démo',
  },
}

export function CTASection() {
  const { locale } = useLanguage()
  const t = content[locale]

  return (
    <section className="py-28 relative">
      <div className="max-w-5xl mx-auto px-6">
        <div className="relative text-center py-20 px-8 rounded-3xl overflow-hidden border border-white/[0.03] bg-surface-0">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-400/[0.02] to-transparent pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-400/[0.05] rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-medium text-white mb-5 tracking-tight leading-tight mx-auto max-w-3xl">
              {t.line1}
              <br />
              <span className="text-zinc-500">{t.line2}</span>
            </h2>
            <p className="text-[15px] font-medium text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">{t.desc}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href={`/${locale}/contact`} className="inline-flex items-center justify-center px-4 py-2 bg-brand-400 text-[#0a0a0a] text-[13px] font-semibold rounded-md hover:bg-brand-400/90 transition-colors">
                {t.cta1}
              </Link>
              <Link href={`/${locale}/contact`} className="inline-flex items-center justify-center px-4 py-2 bg-white/[0.05] text-white border border-white/[0.1] text-[13px] font-semibold rounded-md hover:bg-white/[0.08] transition-colors">
                {t.cta2}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
