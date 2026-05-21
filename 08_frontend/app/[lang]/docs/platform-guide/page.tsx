'use client'

import { Book, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/LanguageContext'

const translations = {
  en: {
    back: 'Back to Documentation',
    title: 'Platform Guide',
    intro: 'Welcome to the Credit Risk Engine platform guide. This document outlines the core architecture, data ingestion pipelines, and role-based workflows that power our enterprise risk operating system.',
    archTitle: 'Architecture Overview',
    archDesc: 'The platform is built on a microservices architecture using NestJS for the core backend, communicating via gRPC with Python-based ML inference engines. Data is persisted in an encrypted PostgreSQL database with strict row-level security policies enforcing tenant isolation.',
    rbacTitle: 'Role-Based Access Control (RBAC)',
    rbacIntro: 'Access is strictly governed by IAM roles:',
    roles: [
      { name: 'Risk Analyst', desc: 'Can initiate credit applications, upload documents, and view individual counterparty scores.' },
      { name: 'Portfolio Manager', desc: 'Can approve/reject applications within limit thresholds and view team performance dashboards.' },
      { name: 'Chief Risk Officer (CRO)', desc: 'Has read-only access to global portfolio exposures, stress testing modules, and aggregate risk reports.' },
      { name: 'System Admin', desc: 'Configures organizational settings, manages users, and oversees ML model deployments.' },
    ],
    noteText: 'Full documentation is available within the internal portal after enterprise deployment.',
  },
  fr: {
    back: 'Retour à la Documentation',
    title: 'Guide Plateforme',
    intro: 'Bienvenue dans le guide de la plateforme Credit Risk Engine. Ce document présente l\'architecture principale, les pipelines d\'ingestion de données et les workflows basés sur les rôles qui alimentent notre système d\'exploitation des risques d\'entreprise.',
    archTitle: 'Vue d\'ensemble de l\'Architecture',
    archDesc: 'La plateforme est construite sur une architecture de microservices utilisant NestJS pour le backend principal, communiquant via gRPC avec des moteurs d\'inférence ML basés sur Python. Les données sont persistées dans une base de données PostgreSQL chiffrée avec des politiques strictes de sécurité au niveau des lignes.',
    rbacTitle: 'Contrôle d\'Accès Basé sur les Rôles (RBAC)',
    rbacIntro: 'L\'accès est strictement régi par les rôles IAM :',
    roles: [
      { name: 'Analyste Risque', desc: 'Peut initier des demandes de crédit, télécharger des documents et consulter les scores individuels des contreparties.' },
      { name: 'Gestionnaire de Portefeuille', desc: 'Peut approuver/rejeter les demandes dans les seuils de limite et consulter les tableaux de bord de performance de l\'équipe.' },
      { name: 'Directeur des Risques (CRO)', desc: 'Dispose d\'un accès en lecture seule aux expositions globales du portefeuille, aux modules de stress test et aux rapports de risque agrégés.' },
      { name: 'Administrateur Système', desc: 'Configure les paramètres organisationnels, gère les utilisateurs et supervise les déploiements de modèles ML.' },
    ],
    noteText: 'La documentation complète est disponible dans le portail interne après le déploiement en entreprise.',
  },
}

export default function PlatformGuidePage() {
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
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="bg-[#050505] border border-white/[0.03] rounded-3xl p-10 sm:p-16 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10 w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-8">
            <Book className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="relative z-10 text-3xl sm:text-4xl font-bold tracking-tight mb-6 text-white">{t.title}</h1>
          <div className="relative z-10 prose prose-invert max-w-none text-zinc-300">
            <p className="text-lg leading-relaxed mb-8 text-zinc-400">{t.intro}</p>

            <h3 className="text-xl font-bold text-white mt-12 mb-4">{t.archTitle}</h3>
            <p className="mb-6">{t.archDesc}</p>

            <h3 className="text-xl font-bold text-white mt-12 mb-4">{t.rbacTitle}</h3>
            <p className="mb-6">{t.rbacIntro}</p>
            <ul className="list-disc pl-6 space-y-2 mb-8">
              {t.roles.map((role, i) => (
                <li key={i}><strong>{role.name}:</strong> {role.desc}</li>
              ))}
            </ul>

            <div className="mt-16 p-6 bg-blue-500/[0.05] border border-blue-500/[0.1] rounded-xl">
              <p className="text-[14px] text-blue-200 m-0"><strong>Note:</strong> {t.noteText}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
