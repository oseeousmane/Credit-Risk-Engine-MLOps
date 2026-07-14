import React from 'react'
import { Calendar, Download, Users } from 'lucide-react'

import Topbar from '@/components/dashboard/Topbar'
import ExecutiveSummary from '@/components/dashboard/ExecutiveSummary'
import KpiRow from '@/components/dashboard/KpiRow'
import EclParTrend from '@/components/dashboard/charts/EclParTrend'
import PortfolioDonuts from '@/components/dashboard/charts/PortfolioDonuts'
import RiskDistribution from '@/components/dashboard/charts/RiskDistribution'
import PdMigration from '@/components/dashboard/charts/PdMigration'
import RegulatoryCompliance from '@/components/dashboard/tables/RegulatoryCompliance'
import RiskAppetite from '@/components/dashboard/tables/RiskAppetite'
import EmergingRisks from '@/components/dashboard/lists/EmergingRisks'
import RiskDrivers from '@/components/dashboard/charts/RiskDrivers'
import GeographicExposure from '@/components/dashboard/charts/GeographicExposure'
import ActivityTimeline from '@/components/dashboard/lists/ActivityTimeline'
import FooterStrip from '@/components/dashboard/FooterStrip'

export default function OverviewPage() {
  return (
    <div className="flex-1 flex flex-col h-full bg-corp-bg">
      <Topbar />
      
      <main className="flex-1 overflow-y-auto p-8 scrollbar-hide relative z-0">
        <div className="max-w-[1920px] mx-auto">
          
          {/* Page Header */}
          <div className="flex items-start justify-between">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 bg-orange-50/80 rounded-xl flex items-center justify-center border border-orange-100/50 shadow-sm">
                <Users className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-corp-textPrimary tracking-tight">Portfolio Risk Overview</h1>
                <p className="text-sm text-corp-textSecondary font-medium mt-1">
                  Executive summary • Data as of May 19, 2025
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

          <ExecutiveSummary />
          
          <KpiRow />

          {/* MAIN GRID */}
          <div className="flex flex-col gap-6 mt-6">
            
            {/* Section 1 */}
            <div className="grid grid-cols-4 gap-6">
              <EclParTrend />
              <PortfolioDonuts />
            </div>

            {/* Section 2 */}
            <div className="grid grid-cols-4 gap-6">
              <RiskDistribution />
              <PdMigration />
              <RegulatoryCompliance />
              <RiskAppetite />
            </div>

            {/* Section 3 */}
            <div className="grid grid-cols-4 gap-6">
              <EmergingRisks />
              <RiskDrivers />
              <GeographicExposure />
              <ActivityTimeline />
            </div>

          </div>

          <FooterStrip />
          
        </div>
      </main>
    </div>
  )
}
