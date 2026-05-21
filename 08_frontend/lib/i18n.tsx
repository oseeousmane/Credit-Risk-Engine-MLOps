"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

type SupportedLang = "en" | "fr"

type Dictionary = {
  [key: string]: string
}

const dictionaries: Record<SupportedLang, Dictionary> = {
  en: {
    dashboard: "Dashboard",
    scoring: "Scoring",
    portfolio: "Portfolio",
    monitoring: "Monitoring",
    settings: "Settings",
    search: "Search...",
    admin: "Admin",
    analyst: "Credit Analyst",
    defaultRate: "Default Rate",
    approvalRate: "Approval Rate",
    expectedLoss: "Expected Loss",
    avgPD: "Avg PD",
    riskDistribution: "Risk Distribution",
    ifrs9Stage: "IFRS 9 Stage",
    pdDistribution: "PD Distribution",
    expectedLossTrend: "Expected Loss Trend",
    simpleMode: "Simple Mode",
    expertMode: "Expert Mode",
    income: "Income",
    age: "Age",
    employmentStatus: "Employment Status",
    loanAmount: "Loan Amount",
    result: "Decision Result",
    decision: "Decision",
    shapExplanation: "Model Explanation (SHAP)",
    portfolioAnalysis: "Portfolio Analysis",
    mlopsMonitoring: "MLOps Monitoring",
    language: "Language",
    theme: "Theme",
    lowersRisk: "Lowers Risk",
    increasesRisk: "Increases Risk",
    review: "REVIEW",
    accept: "ACCEPT",
    reject: "REJECT",
    stage1: "Stage 1",
    stage2: "Stage 2",
    stage3: "Stage 3",
  },
  fr: {
    dashboard: "Tableau de Bord",
    scoring: "Scoring Client",
    portfolio: "Portefeuille",
    monitoring: "Suivi MLOps",
    settings: "Paramètres",
    search: "Rechercher...",
    admin: "Administrateur",
    analyst: "Analyste Crédit",
    defaultRate: "Taux de Défaut",
    approvalRate: "Taux d'Approbation",
    expectedLoss: "Perte Attendue",
    avgPD: "PD Moyenne",
    riskDistribution: "Distribution du Risque",
    ifrs9Stage: "Stade IFRS 9",
    pdDistribution: "Distribution des PD",
    expectedLossTrend: "Tendance Perte Attendue",
    simpleMode: "Mode Simplifié",
    expertMode: "Mode Expert",
    income: "Revenus",
    age: "Âge",
    employmentStatus: "Statut d'Emploi",
    loanAmount: "Montant du Prêt",
    result: "Résultat Décision",
    decision: "Décision",
    shapExplanation: "Explication du Modèle (SHAP)",
    portfolioAnalysis: "Analyse de Portefeuille",
    mlopsMonitoring: "Suivi du Modèle",
    language: "Langue",
    theme: "Thème",
    lowersRisk: "Diminue le risque",
    increasesRisk: "Augmente le risque",
    review: "À REVOIR",
    accept: "ACCEPTÉ",
    reject: "REJETÉ",
    stage1: "Stade 1",
    stage2: "Stade 2",
    stage3: "Stade 3",
  }
}

type I18nContextType = {
  lang: SupportedLang
  setLang: (lang: SupportedLang) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => null,
  t: (key: string) => key,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SupportedLang>("en")

  useEffect(() => {
    const saved = localStorage.getItem("ui-lang") as SupportedLang
    if (saved && ["en", "fr"].includes(saved)) {
      setLangState(saved)
    }
  }, [])

  const setLang = (newLang: SupportedLang) => {
    setLangState(newLang)
    localStorage.setItem("ui-lang", newLang)
  }

  const t = (key: string) => {
    return dictionaries[lang][key] || key
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
