'use client'

import React from 'react'
import { Activity, Database, ShieldCheck, Percent, Umbrella, TrendingUp } from 'lucide-react'

export default function PortfolioKpiRow() {
  return (
    <div className="grid grid-cols-6 gap-4 mt-6">
      {/* Portfolio Health */}
      <div className="bg-corp-card border border-corp-border rounded-xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 text-white">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-corp-textSecondary tracking-wide uppercase leading-none mb-1">
              PORTFOLIO HEALTH
            </div>
            <div className="text-[22px] font-black text-emerald-500 tracking-tight leading-none mb-2">
              GOOD
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] text-corp-textSecondary">vs. last 30 days</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 rounded">Stable</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI 2 */}
      <div className="bg-corp-card border border-corp-border rounded-xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-corp-textSecondary tracking-wide uppercase leading-none mb-1">
              TOTAL EXPOSURE
            </div>
            <div className="text-[22px] font-black text-corp-textPrimary tracking-tight leading-none">
              8.5 <span className="text-sm font-bold">Md XAF</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] font-bold text-emerald-500">↑ 2.8%</span>
              <span className="text-[10px] text-corp-textSecondary">vs. last 30 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI 3 */}
      <div className="bg-corp-card border border-corp-border rounded-xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-corp-textSecondary tracking-wide uppercase leading-none mb-1 line-clamp-1">
              EXPECTED CREDIT LOSS (ECL)
            </div>
            <div className="text-[22px] font-black text-corp-textPrimary tracking-tight leading-none">
              388 <span className="text-sm font-bold">M XAF</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] font-bold text-emerald-500">↓ -3.5%</span>
              <span className="text-[10px] text-corp-textSecondary">vs. last 30 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI 4 */}
      <div className="bg-corp-card border border-corp-border rounded-xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Percent className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-corp-textSecondary tracking-wide uppercase leading-none mb-1">
              NPL RATIO
            </div>
            <div className="text-[22px] font-black text-corp-textPrimary tracking-tight leading-none">
              4.1%
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] font-bold text-emerald-500">↓ -0.3pp</span>
              <span className="text-[10px] text-corp-textSecondary">vs. last 30 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI 5 */}
      <div className="bg-corp-card border border-corp-border rounded-xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Umbrella className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-corp-textSecondary tracking-wide uppercase leading-none mb-1">
              COVERAGE RATIO
            </div>
            <div className="text-[22px] font-black text-corp-textPrimary tracking-tight leading-none">
              91%
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] font-bold text-emerald-500">↑ +1.2pp</span>
              <span className="text-[10px] text-corp-textSecondary">vs. last 30 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI 6 */}
      <div className="bg-corp-card border border-corp-border rounded-xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-corp-textSecondary tracking-wide uppercase leading-none mb-1">
              RISK TREND
            </div>
            <div className="text-[22px] font-black text-corp-textPrimary tracking-tight leading-none">
              Stable
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] text-corp-textSecondary">vs. last 30 days</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
