'use client'

import { Code2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/LanguageContext'

const translations = {
  en: {
    back: 'Back to Documentation',
    title: 'API Reference',
    intro: 'Integrate the Credit Risk Engine directly into your internal systems. Our RESTful API allows you to programmatically submit applications, retrieve live risk scores, and sync portfolio exposure data.',
    authTitle: 'Authentication',
    authDesc: 'All API requests require a Bearer token in the Authorization header. You can generate an API key from the Developer Settings panel in your admin dashboard.',
    endpointsTitle: 'Core Endpoints',
    endpoints: [
      { method: 'POST', path: '/v1/applications/score', desc: 'Submit a new credit application for instant scoring.' },
      { method: 'GET', path: '/v1/counterparties/{id}', desc: 'Retrieve real-time exposure limits and ECL stage.' },
      { method: 'GET', path: '/v1/portfolio/summary', desc: 'Fetch aggregated metrics for executive dashboards.' },
    ],
    swaggerNote: 'Looking for the OpenAPI spec? Clients receive access to our interactive Swagger UI and Postman collections during onboarding.',
  },
  fr: {
    back: 'Retour à la Documentation',
    title: 'Référence API',
    intro: 'Intégrez directement le Credit Risk Engine dans vos systèmes internes. Notre API RESTful vous permet de soumettre programmatiquement des demandes, récupérer des scores de risque en temps réel et synchroniser les données d\'exposition du portefeuille.',
    authTitle: 'Authentification',
    authDesc: 'Toutes les requêtes API nécessitent un token Bearer dans l\'en-tête Authorization. Vous pouvez générer une clé API depuis le panneau Paramètres Développeur de votre tableau de bord admin.',
    endpointsTitle: 'Endpoints Principaux',
    endpoints: [
      { method: 'POST', path: '/v1/applications/score', desc: 'Soumettre une nouvelle demande de crédit pour un scoring instantané.' },
      { method: 'GET', path: '/v1/counterparties/{id}', desc: 'Récupérer les limites d\'exposition en temps réel et le stage ECL.' },
      { method: 'GET', path: '/v1/portfolio/summary', desc: 'Obtenir les métriques agrégées pour les tableaux de bord exécutifs.' },
    ],
    swaggerNote: 'Vous cherchez la spec OpenAPI ? Les clients reçoivent l\'accès à notre interface Swagger UI interactive et aux collections Postman lors de l\'intégration.',
  },
}

export default function ApiReferencePage() {
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
          <div className="relative z-10 w-16 h-16 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mb-8">
            <Code2 className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="relative z-10 text-3xl sm:text-4xl font-bold tracking-tight mb-6 text-white">{t.title}</h1>
          <div className="relative z-10 prose prose-invert max-w-none text-zinc-300">
            <p className="text-lg leading-relaxed mb-8 text-zinc-400">{t.intro}</p>

            <h3 className="text-xl font-bold text-white mt-12 mb-4">{t.authTitle}</h3>
            <p className="mb-6">{t.authDesc}</p>
            <div className="bg-[#020202] border border-white/[0.03] p-4 rounded-lg mb-8 font-mono text-[13px] text-zinc-400">
              Authorization: Bearer sk_live_...
            </div>

            <h3 className="text-xl font-bold text-white mt-12 mb-4">{t.endpointsTitle}</h3>
            <div className="space-y-4 mb-8">
              {t.endpoints.map((ep, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-[#020202] border border-white/[0.03] rounded-lg">
                  <div className={`w-16 flex-shrink-0 text-[11px] font-bold uppercase ${ep.method === 'POST' ? 'text-emerald-400' : 'text-blue-400'}`}>{ep.method}</div>
                  <div className="font-mono text-[13px] text-zinc-300">{ep.path}</div>
                  <div className="text-[13px] text-zinc-500 sm:ml-auto">{ep.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-16 p-6 bg-purple-500/[0.05] border border-purple-500/[0.1] rounded-xl">
              <p className="text-[14px] text-purple-200 m-0"><strong>{locale === 'fr' ? 'Spec OpenAPI ?' : 'Looking for the OpenAPI spec?'}</strong> {t.swaggerNote}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
