'use client'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

const content = {
  en: {
    title: 'Legacy Credit Operations Were Never Built for',
    titleHighlight: 'AI-Native Risk Management',
    desc: 'Fragmented systems, manual approvals, limited explainability, and weak auditability slow down modern credit operations. Credit Risk Engine brings everything into one unified platform.',
    problemLabel: 'The Problem',
    solutionLabel: 'The Solution',
    problems: [
      'Fragmented credit systems across teams',
      'Manual approval workflows with no audit trail',
      'Limited model explainability for regulators',
      'No unified view of portfolio risk exposure',
    ],
    solutions: [
      'One platform for the full credit lifecycle',
      'Role-based decisioning with traceable audit',
      'Explainable AI with SHAP-style risk drivers',
      'Real-time portfolio intelligence and monitoring',
    ],
  },
  fr: {
    title: 'Les Opérations de Crédit Traditionnelles N\'étaient Pas Faites pour',
    titleHighlight: 'la Gestion des Risques Native à l\'IA',
    desc: 'Les systèmes fragmentés, les approbations manuelles, l\'explicabilité limitée et la faible auditabilité ralentissent les opérations de crédit modernes. Credit Risk Engine unifie tout en une seule plateforme.',
    problemLabel: 'Le Problème',
    solutionLabel: 'La Solution',
    problems: [
      'Systèmes de crédit fragmentés entre les équipes',
      'Workflows d\'approbation manuels sans piste d\'audit',
      'Explicabilité des modèles limitée pour les régulateurs',
      'Aucune vue unifiée de l\'exposition au risque du portefeuille',
    ],
    solutions: [
      'Une plateforme pour l\'ensemble du cycle de vie du crédit',
      'Décisioning basé sur les rôles avec audit traçable',
      'IA explicable avec pilotes de risque style SHAP',
      'Intelligence de portefeuille et surveillance en temps réel',
    ],
  },
}

export function ProblemSection() {
  const { locale } = useLanguage()
  const t = content[locale]

  return (
    <section className="py-28 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-medium text-white mb-5 tracking-tight">
            {t.title}{' '}
            <span className="text-zinc-500">{t.titleHighlight}</span>
          </h2>
          <p className="text-zinc-400 text-[15px] max-w-3xl mx-auto leading-relaxed font-medium">{t.desc}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Problems */}
          <div className="bg-[#0a0a0a] border border-white/[0.04] rounded-2xl p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-zinc-500" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">{t.problemLabel}</span>
            </div>
            <div className="relative z-10 space-y-5">
              {t.problems.map((p) => (
                <div key={p} className="flex items-start gap-3">
                  <div className="w-1 h-1 rounded-full bg-zinc-600 mt-2.5 flex-shrink-0" />
                  <span className="text-[14px] font-medium text-zinc-500 leading-relaxed tracking-tight">{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Solutions */}
          <div className="bg-[#0a0a0a] border border-[#3ECF8E]/[0.12] rounded-2xl p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#3ECF8E]/[0.03] to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-[#3ECF8E]" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#3ECF8E]">{t.solutionLabel}</span>
            </div>
            <div className="relative z-10 space-y-5">
              {t.solutions.map((s) => (
                <div key={s} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#3ECF8E]/70 mt-0.5 flex-shrink-0" />
                  <span className="text-[14px] font-medium text-zinc-200 leading-relaxed tracking-tight">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
