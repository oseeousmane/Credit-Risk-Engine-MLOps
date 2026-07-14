import React from 'react'
import { Hexagon, Calendar, Download } from 'lucide-react'

import Topbar from '@/components/dashboard/Topbar'
import FooterStrip from '@/components/dashboard/FooterStrip'
import ScoringKpiRow from '@/components/scoring/ScoringKpiRow'
import ScoreDistribution from '@/components/scoring/ScoreDistribution'
import SegmentDistribution from '@/components/scoring/SegmentDistribution'
import RiskFactors from '@/components/scoring/RiskFactors'
import ExplainableAi from '@/components/scoring/ExplainableAi'
import DecisionCenter from '@/components/scoring/DecisionCenter'
import ModelPerformance from '@/components/scoring/ModelPerformance'
import MonitoringAlerts from '@/components/scoring/MonitoringAlerts'
import GeographicScore from '@/components/scoring/GeographicScore'
import ScoreTrends from '@/components/scoring/ScoreTrends'

export default function CreditScoringPage() {
  return (
    <div className="flex-1 flex flex-col h-full bg-corp-bg">
      <Topbar />

      <main className="flex-1 overflow-y-auto p-8 scrollbar-hide relative z-0">
        <div className="max-w-[1920px] mx-auto">

          {/* Page Header */}
          <div className="flex items-start justify-between">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 bg-blue-50/80 rounded-xl flex items-center justify-center border border-blue-100/50 shadow-sm">
                <Hexagon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-corp-textPrimary tracking-tight">Credit Scoring</h1>
                <p className="text-sm text-corp-textSecondary font-medium mt-1">
                  Scoring performance and analytics • Data as of May 19, 2025
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
          <ScoringKpiRow />

          {/* Section 1: Score Distribution + Segment + Risk Factors */}
          <div className="grid grid-cols-3 gap-6 mt-6">
            <ScoreDistribution />
            <SegmentDistribution />
            <RiskFactors />
          </div>

          {/* Section 2: Explainable AI + Decision Center + Model Performance */}
          <div className="grid grid-cols-4 gap-6 mt-6">
            <ExplainableAi />
            <DecisionCenter />
            <ModelPerformance />
          </div>

          {/* Section 3: Monitoring Alerts + Geographic + Score Trends */}
          <div className="grid grid-cols-4 gap-6 mt-6">
            <MonitoringAlerts />
            <GeographicScore />
            <ScoreTrends />
          </div>

          {/* Footer */}
          <FooterStrip />

        </div>
      </main>
    </div>
  )
}
