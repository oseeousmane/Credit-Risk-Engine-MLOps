'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────
type Locale = 'en' | 'fr'

interface PortalStrings {
  // Session banner
  sessionBanner: string
  // Header
  brandName: string
  brandTagline: string
  // Nav labels
  nav: {
    dashboard: string
    applications: string
    documents: string
    notifications: string
    profile: string
  }
  // Header actions
  backToSite: string
  signOut: string
  // Dashboard
  workspace: string
  greeting: (name: string, period: 'morning' | 'afternoon' | 'evening') => string
  period: { morning: string; afternoon: string; evening: string }
  portalSubtitle: string
  newApplication: string
  actionRequired: string
  actionRequiredDesc: (count: number) => string
  // KPI cards
  kpi: {
    activeApps: string
    activeAppsHint: string
    pendingDocs: string
    pendingDocsHint: (hasItems: boolean) => string
    unread: string
    unreadHint: (hasItems: boolean) => string
  }
  // Sections
  recentApplications: string
  viewAll: string
  appProgress: string
  noActiveApps: string
  notifications: string
  newUpdates: string
  allRead: string
  noNotifications: string
  viewAllNotifications: string
  // Pipeline steps
  pipeline: string[]
  // Trust panel
  trust: {
    title: string
    items: string[]
  }
  // Support card
  support: {
    title: string
    subtitle: string
    rmLabel: string
    hoursLabel: string
    hours: string
    emailLabel: string
    phoneLabel: string
  }
  // Footer
  footer: {
    description: string
    operational: string
    encrypted: string
    platform: string
    compliance: string
    links: {
      platform: { dashboard: string; applications: string; documents: string; profile: string }
      compliance: { framework: string; whitepaper: string; privacy: string; terms: string }
    }
    copyright: string
    badge1: string
    badge2: string
  }
  // Error / empty
  error: { loadApps: string; noApps: string; noAppsHint: string; broken: string; noPermission: string; back: string }
}

// ── Translations ───────────────────────────────────────────────────────────────
const strings: Record<Locale, PortalStrings> = {
  en: {
    sessionBanner: 'Secure Authenticated Session · ORE Client Portal · COBAC / Basel III Compliant',
    brandName: 'ORE',
    brandTagline: 'Client Portal',
    nav: {
      dashboard: 'Dashboard',
      applications: 'My Applications',
      documents: 'Documents',
      notifications: 'Notifications',
      profile: 'Company Profile',
    },
    backToSite: 'Back to Website',
    signOut: 'Sign out',
    workspace: 'Client Workspace',
    greeting: (name, p) => `Good ${p}, ${name}`,
    period: { morning: 'morning', afternoon: 'afternoon', evening: 'evening' },
    portalSubtitle: 'Institutional Credit Portal',
    newApplication: 'New Application',
    actionRequired: 'Action Required — Documents Pending',
    actionRequiredDesc: (n) => `${n} application${n > 1 ? 's' : ''} require${n === 1 ? 's' : ''} additional documents to proceed.`,
    kpi: {
      activeApps: 'Active Applications',
      activeAppsHint: 'In progress',
      pendingDocs: 'Pending Documents',
      pendingDocsHint: (has) => has ? 'Action required' : 'All uploaded',
      unread: 'Unread Notifications',
      unreadHint: (has) => has ? 'New updates' : 'All read',
    },
    recentApplications: 'Recent Applications',
    viewAll: 'View all',
    appProgress: 'Application Progress',
    noActiveApps: 'No active applications',
    notifications: 'Notifications',
    newUpdates: 'New updates',
    allRead: 'All read',
    noNotifications: 'No notifications',
    viewAllNotifications: 'View all notifications',
    pipeline: ['Submitted', 'Documents Verified', 'Credit Assessment', 'Committee Review', 'Final Decision'],
    trust: {
      title: 'Security & Trust',
      items: [
        'End-to-end encrypted communications',
        'Regulatory compliance — COBAC / Basel III',
        'Dedicated relationship manager assigned',
        '24-hour standard processing commitment',
      ],
    },
    support: {
      title: 'Need assistance?',
      subtitle: 'Your relationship manager is available during business hours.',
      rmLabel: 'Relationship Manager',
      hoursLabel: 'Business hours',
      hours: 'Mon – Fri, 08:00 – 17:00 WAT',
      emailLabel: 'Email',
      phoneLabel: 'Phone',
    },
    footer: {
      description: 'Next-generation institutional credit engine providing transparent, high-fidelity quantitative risk analysis for enterprises across the CEMAC zone.',
      operational: 'Systems Operational',
      encrypted: 'AES-256 Encrypted',
      platform: 'Platform',
      compliance: 'Compliance',
      links: {
        platform: { dashboard: 'Dashboard', applications: 'Applications', documents: 'Document Centre', profile: 'Company Profile' },
        compliance: { framework: 'Regulatory Framework', whitepaper: 'Security Whitepaper', privacy: 'Privacy Policy', terms: 'Terms of Service' },
      },
      copyright: '© 2026 ORE. All rights reserved.',
      badge1: 'Basel III Ready',
      badge2: 'SOC 2 Type II',
    },
    error: {
      loadApps: 'Could not load applications',
      noApps: 'No applications yet',
      noAppsHint: 'Start by submitting your first facility request.',
      broken: 'Could not find application',
      noPermission: 'The link might be broken or you do not have permission.',
      back: 'Back to Applications',
    },
  },

  fr: {
    sessionBanner: 'Session Authentifiée Sécurisée · Portail Client ORE · Conforme COBAC / Bâle III',
    brandName: 'ORE',
    brandTagline: 'Portail Client',
    nav: {
      dashboard: 'Tableau de bord',
      applications: 'Mes Demandes',
      documents: 'Documents',
      notifications: 'Notifications',
      profile: 'Profil Entreprise',
    },
    backToSite: 'Retour au site',
    signOut: 'Déconnexion',
    workspace: 'Espace Client',
    greeting: (name, p) => {
      const greet = p === 'morning' ? 'Bonjour' : p === 'afternoon' ? 'Bon après-midi' : 'Bonsoir'
      return `${greet}, ${name}`
    },
    period: { morning: 'morning', afternoon: 'afternoon', evening: 'evening' },
    portalSubtitle: 'Portail de Crédit Institutionnel',
    newApplication: 'Nouvelle Demande',
    actionRequired: 'Action Requise — Documents en Attente',
    actionRequiredDesc: (n) => `${n} demande${n > 1 ? 's' : ''} nécessite${n === 1 ? '' : 'nt'} des documents supplémentaires.`,
    kpi: {
      activeApps: 'Demandes Actives',
      activeAppsHint: 'En cours',
      pendingDocs: 'Documents en Attente',
      pendingDocsHint: (has) => has ? 'Action requise' : 'Tous déposés',
      unread: 'Notifications Non Lues',
      unreadHint: (has) => has ? 'Nouvelles mises à jour' : 'Tout lu',
    },
    recentApplications: 'Demandes Récentes',
    viewAll: 'Voir tout',
    appProgress: 'Avancement de la Demande',
    noActiveApps: 'Aucune demande active',
    notifications: 'Notifications',
    newUpdates: 'Nouvelles mises à jour',
    allRead: 'Tout lu',
    noNotifications: 'Aucune notification',
    viewAllNotifications: 'Voir toutes les notifications',
    pipeline: ['Soumise', 'Documents Vérifiés', 'Évaluation Crédit', 'Revue Comité', 'Décision Finale'],
    trust: {
      title: 'Sécurité & Confiance',
      items: [
        'Communications chiffrées de bout en bout',
        'Conformité réglementaire — COBAC / Bâle III',
        'Chargé de relation dédié assigné',
        'Engagement de traitement standard sous 24 heures',
      ],
    },
    support: {
      title: 'Besoin d\'aide ?',
      subtitle: 'Votre chargé de relation est disponible aux heures ouvrables.',
      rmLabel: 'Chargé de Relation',
      hoursLabel: 'Heures d\'ouverture',
      hours: 'Lun – Ven, 08h00 – 17h00 WAT',
      emailLabel: 'E-mail',
      phoneLabel: 'Téléphone',
    },
    footer: {
      description: 'Moteur de crédit institutionnel de nouvelle génération offrant une analyse quantitative du risque transparente et haute-fidélité pour les entreprises de la zone CEMAC.',
      operational: 'Systèmes Opérationnels',
      encrypted: 'Chiffrement AES-256',
      platform: 'Plateforme',
      compliance: 'Conformité',
      links: {
        platform: { dashboard: 'Tableau de bord', applications: 'Demandes', documents: 'Centre de Documents', profile: 'Profil Entreprise' },
        compliance: { framework: 'Cadre Réglementaire', whitepaper: 'Livre Blanc Sécurité', privacy: 'Politique de Confidentialité', terms: 'Conditions d\'Utilisation' },
      },
      copyright: '© 2026 ORE. Tous droits réservés.',
      badge1: 'Bâle III Prêt',
      badge2: 'SOC 2 Type II',
    },
    error: {
      loadApps: 'Impossible de charger les demandes',
      noApps: 'Aucune demande pour l\'instant',
      noAppsHint: 'Commencez par soumettre votre première demande de financement.',
      broken: 'Demande introuvable',
      noPermission: 'Le lien est peut-être invalide ou vous n\'avez pas les droits d\'accès.',
      back: 'Retour aux Demandes',
    },
  },
}

// ── Context ────────────────────────────────────────────────────────────────────
interface PortalLocaleCtx {
  locale: Locale
  t: PortalStrings
  setLocale: (l: Locale) => void
}

const PortalLocaleContext = createContext<PortalLocaleCtx>({
  locale: 'fr',
  t: strings.fr,
  setLocale: () => {},
})

export function PortalLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')

  useEffect(() => {
    const saved = localStorage.getItem('portal_locale') as Locale | null
    if (saved === 'en' || saved === 'fr') setLocaleState(saved)
  }, [])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('portal_locale', l)
  }

  return (
    <PortalLocaleContext.Provider value={{ locale, t: strings[locale], setLocale }}>
      {children}
    </PortalLocaleContext.Provider>
  )
}

export function usePortalLocale() {
  return useContext(PortalLocaleContext)
}
