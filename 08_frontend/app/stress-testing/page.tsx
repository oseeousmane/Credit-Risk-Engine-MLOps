import React from 'react'
import { ShieldCheck, Calendar, Download } from 'lucide-react'

import Topbar from '@/components/dashboard/Topbar'
import FooterStrip from '@/components/dashboard/FooterStrip'

import StressKpiRow from '@/components/stress/StressKpiRow'
import StressScenarioImpact from '@/components/stress/StressScenarioImpact'
import ScenarioControls from '@/components/stress/ScenarioControls'
import PortfolioImpactBySegment from '@/components/stress/PortfolioImpactBySegment'
import CapitalImpactAnalysis from '@/components/stress/CapitalImpactAnalysis'
import TopStressDrivers from '@/components/stress/TopStressDrivers'
import SectorVulnerability from '@/components/stress/SectorVulnerability'
import GeographicImpact from '@/components/stress/GeographicImpact'
import RegulatoryAssessment from '@/components/stress/RegulatoryAssessment'
import StressRecommendations from '@/components/stress/StressRecommendations'
import EarlyWarningIndicators from '@/components/stress/EarlyWarningIndicators'

export default function StressTestingPage() {
  return (
    <div className="flex-1 flex flex-col h-full bg-corp-bg">
      <Topbar />

      <main className="flex-1 overflow-y-auto p-8 scrollbar-hide relative z-0">
        <div className="max-w-[1920px] mx-auto">

          {/* Page Header */}
          <div className="flex items-start justify-between">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 bg-blue-50/80 rounded-xl flex items-center justify-center border border-blue-100/50 shadow-sm">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-corp-textPrimary tracking-tight">Stress Testing Center</h1>
                <p className="text-sm text-corp-textSecondary font-medium mt-1">
                  Forward-Looking Risk Assessment & Regulatory Simulation • Data as of May 19, 2025
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
          <StressKpiRow />

          {/* Row 1: Line Chart + Scenario Selector */}
          <div className="grid grid-cols-3 gap-6 mt-6">
            <StressScenarioImpact />
            <ScenarioControls />
          </div>

          {/* Row 2: Table + Gauge + Bar Charts */}
          <div className="grid grid-cols-4 gap-6 mt-6">
            <PortfolioImpactBySegment />
            <CapitalImpactAnalysis />
            <TopStressDrivers />
          </div>

          {/* Row 3: Heatmap Map + Regulatory + Recommendations + Indicators */}
          <div className="grid grid-cols-5 gap-6 mt-6">
            <SectorVulnerability />
            <GeographicImpact />
            <RegulatoryAssessment />
            <StressRecommendations />
            <EarlyWarningIndicators />
          </div>

          {/* Footer */}
          <FooterStrip />

        </div>
      </main>
    </div>
  )
}
