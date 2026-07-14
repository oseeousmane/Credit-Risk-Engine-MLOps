import React from 'react'
import { Shield, Calendar, Download } from 'lucide-react'

import Topbar from '@/components/dashboard/Topbar'
import FooterStrip from '@/components/dashboard/FooterStrip'

import PortfolioKpiRow from '@/components/portfolio/PortfolioKpiRow'
import PortfolioEvolution from '@/components/portfolio/PortfolioEvolution'
import PortfolioComposition from '@/components/portfolio/PortfolioComposition'
import RiskConcentration from '@/components/portfolio/RiskConcentration'
import GeographicExposureCemac from '@/components/portfolio/GeographicExposureCemac'
import PortfolioMigrationMatrix from '@/components/portfolio/PortfolioMigrationMatrix'
import TopEmergingRisks from '@/components/portfolio/TopEmergingRisks'
import RiskAppetiteMonitoring from '@/components/portfolio/RiskAppetiteMonitoring'
import ExecutiveRecommendations from '@/components/portfolio/ExecutiveRecommendations'
import EarlyWarningDashboard from '@/components/portfolio/EarlyWarningDashboard'

export default function PortfolioRiskPage() {
  return (
    <div className="flex-1 flex flex-col h-full bg-corp-bg">
      <Topbar />

      <main className="flex-1 overflow-y-auto p-8 scrollbar-hide relative z-0">
        <div className="max-w-[1920px] mx-auto">

          {/* Page Header */}
          <div className="flex items-start justify-between">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 bg-blue-50/80 rounded-xl flex items-center justify-center border border-blue-100/50 shadow-sm">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-corp-textPrimary tracking-tight">Portfolio Risk</h1>
                <p className="text-sm text-corp-textSecondary font-medium mt-1">
                  Portfolio risk overview and analysis • Data as of May 19, 2025
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 bg-white border border-corp-border px-4 py-2 rounded-lg text-sm font-semibold text-corp-textPrimary hover:bg-gray-50 transition-colors shadow-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                Last 30 days
              </button>
              <button className="flex items-center gap-2 bg-[#0B1325] hover:bg-black px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors shadow-sm">
                <Download className="w-4 h-4" />
                Export Report
              </button>
            </div>
          </div>

          {/* KPI Row */}
          <PortfolioKpiRow />

          {/* Section 1: Evolution + Composition + Concentration */}
          <div className="grid grid-cols-4 gap-6 mt-6">
            <PortfolioEvolution />
            <PortfolioComposition />
            <RiskConcentration />
          </div>

          {/* Section 2: Geographic + Migration + Emerging Risks */}
          <div className="grid grid-cols-3 gap-6 mt-6">
            <GeographicExposureCemac />
            <PortfolioMigrationMatrix />
            <TopEmergingRisks />
          </div>

          {/* Section 3: Risk Appetite + Recommendations + Early Warning */}
          <div className="grid grid-cols-3 gap-6 mt-6">
            <RiskAppetiteMonitoring />
            <ExecutiveRecommendations />
            <EarlyWarningDashboard />
          </div>

          {/* Footer */}
          <FooterStrip />

        </div>
      </main>
    </div>
  )
}
