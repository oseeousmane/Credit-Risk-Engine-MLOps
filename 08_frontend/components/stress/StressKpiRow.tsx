'use client'

import React from 'react'
import { Activity, ActivitySquare, ShieldCheck, Database, Umbrella } from 'lucide-react'

export default function StressKpiRow() {
  return (
    <div className="grid grid-cols-6 gap-4 mt-6">
      {/* Baseline Scenario */}
      <div className="bg-corp-card border border-corp-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-[10px] font-bold text-corp-textSecondary tracking-wide uppercase leading-tight">
              BASELINE SCENARIO
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Stable</span>
        </div>
        <div className="mt-3">
          <div className="text-[10px] text-corp-textSecondary mb-0.5 font-medium">PD</div>
          <div className="text-[22px] font-black text-corp-textPrimary tracking-tight leading-none mb-2">
            1.78%
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-corp-textSecondary">vs. last 30 days</span>
            <span className="text-[10px] font-bold text-emerald-500">-0.12pp ↓</span>
          </div>
        </div>
      </div>

      {/* Moderate Stress */}
      <div className="bg-corp-card border border-corp-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border border-amber-500 text-amber-500 flex items-center justify-center bg-amber-50">
              <ActivitySquare className="w-4 h-4" />
            </div>
            <div className="text-[10px] font-bold text-corp-textSecondary tracking-wide uppercase leading-tight">
              MODERATE STRESS
            </div>
          </div>
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Watch</span>
        </div>
        <div className="mt-3">
          <div className="text-[10px] text-corp-textSecondary mb-0.5 font-medium">PD</div>
          <div className="text-[22px] font-black text-corp-textPrimary tracking-tight leading-none mb-2">
            2.35%
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-corp-textSecondary">vs. last 30 days</span>
            <span className="text-[10px] font-bold text-red-500">+0.57pp ↑</span>
          </div>
        </div>
      </div>

      {/* Severe Stress */}
      <div className="bg-corp-card border border-corp-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border border-red-500 text-red-500 flex items-center justify-center bg-red-50">
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-[10px] font-bold text-corp-textSecondary tracking-wide uppercase leading-tight">
              SEVERE STRESS
            </div>
          </div>
          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Critical</span>
        </div>
        <div className="mt-3">
          <div className="text-[10px] text-corp-textSecondary mb-0.5 font-medium">PD</div>
          <div className="text-[22px] font-black text-corp-textPrimary tracking-tight leading-none mb-2">
            4.12%
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-corp-textSecondary">vs. last 30 days</span>
            <span className="text-[10px] font-bold text-red-500">+2.34pp ↑</span>
          </div>
        </div>
      </div>

      {/* ECL */}
      <div className="bg-corp-card border border-corp-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
            <Database className="w-4 h-4" />
          </div>
          <div className="text-[10px] font-bold text-corp-textSecondary tracking-wide uppercase leading-tight">
            EXPECTED CREDIT LOSS (ECL)
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-[16px] font-black text-corp-textPrimary tracking-tight">388 <span className="text-[10px]">M XAF</span></span>
            <span className="text-[14px] text-corp-textSecondary">→</span>
            <span className="text-[16px] font-black text-corp-textPrimary tracking-tight">573 <span className="text-[10px]">M XAF</span></span>
          </div>
          <div className="text-[12px] font-bold text-red-500 mb-0.5">+185 M XAF</div>
          <div className="text-[10px] text-corp-textSecondary">vs. Baseline</div>
        </div>
      </div>

      {/* CAR */}
      <div className="bg-corp-card border border-corp-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-[10px] font-bold text-corp-textSecondary tracking-wide uppercase leading-tight">
            CAPITAL ADEQUACY RATIO
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-[18px] font-black text-corp-textPrimary tracking-tight">15.2%</span>
            <span className="text-[14px] text-corp-textSecondary">→</span>
            <span className="text-[18px] font-black text-corp-textPrimary tracking-tight">13.8%</span>
          </div>
          <div className="text-[12px] font-bold text-red-500 mb-0.5">-1.4pp</div>
          <div className="text-[10px] text-corp-textSecondary">vs. Baseline</div>
        </div>
      </div>

      {/* Buffer */}
      <div className="bg-corp-card border border-corp-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
            <Umbrella className="w-4 h-4" />
          </div>
          <div className="text-[10px] font-bold text-corp-textSecondary tracking-wide uppercase leading-tight">
            REGULATORY BUFFER
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-[18px] font-black text-corp-textPrimary tracking-tight">5.1%</span>
            <span className="text-[14px] text-corp-textSecondary">→</span>
            <span className="text-[18px] font-black text-corp-textPrimary tracking-tight">2.1%</span>
          </div>
          <div className="text-[12px] font-bold text-red-500 mb-0.5">-3.0pp</div>
          <div className="text-[10px] text-corp-textSecondary">vs. Baseline</div>
        </div>
      </div>

    </div>
  )
}
