'use client'

import { FileText, ArrowLeft, Download } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/LanguageContext'

const translations = {
  en: {
    back: 'Back to Documentation',
    title: 'Compliance & IFRS 9',
    downloadBtn: 'Download PDF Whitepaper',
    intro: 'Credit Risk Engine provides out-of-the-box compliance with IFRS 9 and Basel III guidelines. This document summarizes our algorithmic approach to ECL provisioning and staging.',
    eclTitle: 'ECL Calculation Methodology',
    eclDesc: 'Our Expected Credit Loss (ECL) is calculated using point-in-time parameters adjusted for forward-looking macroeconomic scenarios.',
    stagingTitle: 'Staging Criteria',
    stagingIntro: 'The platform automatically categorizes exposures into three stages based on Significant Increase in Credit Risk (SICR):',
    stages: [
      { label: 'Stage 1 (Performing)', desc: '12-month ECL recognized. No significant deterioration since initial recognition.' },
      { label: 'Stage 2 (Underperforming)', desc: 'Lifetime ECL recognized. Triggered by quantitative (e.g., PD threshold breach) or qualitative (e.g., watch list) SICR indicators.' },
      { label: 'Stage 3 (Non-Performing)', desc: 'Lifetime ECL recognized based on default events (e.g., >90 days past due).' },
    ],
    validationNote: 'Model Validation: Our underlying models undergo rigorous external validation and are shipped with comprehensive Model Risk Management (MRM) documentation for your internal audit teams.',
  },
  fr: {
    back: 'Retour à la Documentation',
    title: 'Conformité & IFRS 9',
    downloadBtn: 'Télécharger le Livre Blanc PDF',
    intro: 'Credit Risk Engine fournit une conformité native avec les directives IFRS 9 et Bâle III. Ce document résume notre approche algorithmique pour le provisionnement ECL et le staging.',
    eclTitle: 'Méthodologie de Calcul ECL',
    eclDesc: 'Notre Perte de Crédit Attendue (ECL) est calculée en utilisant des paramètres au point dans le temps ajustés pour des scénarios macroéconomiques prospectifs.',
    stagingTitle: 'Critères de Staging',
    stagingIntro: 'La plateforme catégorise automatiquement les expositions en trois stages basés sur l\'Augmentation Significative du Risque de Crédit (ASRC) :',
    stages: [
      { label: 'Stage 1 (Performant)', desc: 'ECL sur 12 mois comptabilisé. Pas de détérioration significative depuis la comptabilisation initiale.' },
      { label: 'Stage 2 (Sous-performant)', desc: 'ECL sur toute la durée de vie comptabilisé. Déclenché par des indicateurs ASRC quantitatifs (ex : dépassement de seuil PD) ou qualitatifs (ex : liste de surveillance).' },
      { label: 'Stage 3 (Non-Performant)', desc: 'ECL sur toute la durée de vie comptabilisé sur la base d\'événements de défaut (ex : >90 jours de retard).' },
    ],
    validationNote: 'Validation des Modèles : Nos modèles sous-jacents sont soumis à une validation externe rigoureuse et sont livrés avec une documentation complète de Gestion du Risque de Modèle (GRM) pour vos équipes d\'audit interne.',
  },
}

export default function CompliancePage() {
  const { locale } = useLanguage()
  const t = translations[locale]

  return (
    <main className="antialiased pt-32 pb-24 min-h-screen">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="max-w-4xl mx-auto px-6 mb-12">
        <Link href={`/${locale}/docs`} className="inline-flex items-center gap-2 text-[13px] font-semibold text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t.back}
        </Link>
      </motion.div>

      <div className="max-w-4xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="bg-surface-0 border border-white/[0.03] rounded-3xl p-10 sm:p-16 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-50 flex items-start justify-between flex-wrap gap-8 mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
              <FileText className="w-8 h-8 text-brand-400" />
            </div>
            <button
              onClick={() => alert(locale === 'fr' ? 'Téléchargement du Livre Blanc démarré (Mock)' : 'Whitepaper download started (Mock)')}
              className="flex items-center gap-2 px-6 py-3 bg-brand-400 hover:bg-brand-400/90 border border-brand-400/50 rounded-lg text-white text-[14px] font-bold transition-all shadow-brand hover:shadow-[0_0_30px_rgba(59,123,255,0.4)] cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" /> {t.downloadBtn}
            </button>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 text-white">{t.title}</h1>
          <div className="prose prose-invert max-w-none text-zinc-300">
            <p className="text-lg leading-relaxed mb-8 text-zinc-400">{t.intro}</p>

            <h3 className="text-xl font-bold text-white mt-12 mb-4">{t.eclTitle}</h3>
            <p className="mb-6">{t.eclDesc}</p>
            <div className="bg-[#020202] border border-white/[0.03] p-6 rounded-lg mb-8 flex justify-center text-brand-400 font-serif italic text-lg shadow-inner">
              ECL = PD × LGD × EAD × Discount Factor
            </div>

            <h3 className="text-xl font-bold text-white mt-12 mb-4">{t.stagingTitle}</h3>
            <p className="mb-6">{t.stagingIntro}</p>
            <ul className="list-disc pl-6 space-y-2 mb-8">
              {t.stages.map((stage, i) => (
                <li key={i}><strong>{stage.label}:</strong> {stage.desc}</li>
              ))}
            </ul>

            <div className="mt-16 p-6 bg-emerald-500/[0.05] border border-emerald-500/[0.1] rounded-xl">
              <p className="text-[14px] text-emerald-200 m-0"><strong>{locale === 'fr' ? 'Validation des Modèles :' : 'Model Validation:'}</strong> {t.validationNote}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
