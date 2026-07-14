'use client'

import React from 'react'
import { ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const risks = [
  { sector: 'Construction (BTP)', change: '+18%', changeDir: 'up', impact: 'High', impactBg: 'bg-red-50 text-red-600 border-red-200', trendColor: '#DC2626' },
  { sector: 'Transport', change: '+12%', changeDir: 'up', impact: 'High', impactBg: 'bg-red-50 text-red-600 border-red-200', trendColor: '#DC2626' },
  { sector: 'Agriculture', change: '+8%', changeDir: 'up', impact: 'Medium', impactBg: 'bg-amber-50 text-amber-600 border-amber-200', trendColor: '#F59E0B' },
  { sector: 'Commerce', change: '+4%', changeDir: 'up', impact: 'Low', impactBg: 'bg-green-50 text-green-600 border-green-200', trendColor: '#16A34A' },
  { sector: 'Telecom', change: '-2%', changeDir: 'down', impact: 'Low', impactBg: 'bg-green-50 text-green-600 border-green-200', trendColor: '#16A34A' },
]

export default function TopEmergingRisks() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-1 flex flex-col justify-between">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">TOP EMERGING RISKS</h3>
        <p className="text-[11px] text-corp-textSecondary mb-5">Change in ECL (vs. last 30 days)</p>

        <div className="flex text-[10px] font-bold text-corp-textSecondary mb-3 border-b border-corp-border pb-2">
          <div className="flex-1">Sector</div>
          <div className="w-[60px] text-center">Change</div>
          <div className="w-[80px] text-center">Impact</div>
          <div className="w-[60px] text-right">Trend</div>
        </div>

        <div className="space-y-3">
          {risks.map((r, i) => (
            <div key={r.sector} className="flex items-center">
              <div className="text-[11px] font-medium text-corp-textPrimary flex-1 truncate pr-2">{r.sector}</div>
              <div className="w-[60px] flex items-center justify-center gap-1">
                <span className={`text-[11px] font-bold ${r.changeDir === 'up' ? 'text-corp-textPrimary' : 'text-corp-textPrimary'}`}>
                  {r.change}
                </span>
                {r.changeDir === 'up' ? (
                  <ArrowUpRight className="w-3 h-3 text-red-500" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-green-500" />
                )}
              </div>
              <div className="w-[80px] flex justify-center">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${r.impactBg}`}>
                  {r.impact}
                </span>
              </div>
              <div className="w-[60px] flex justify-end">
                {/* SVG Sparkline placeholder based on trend color */}
                <svg width="40" height="15" viewBox="0 0 40 15">
                  <path 
                    d={i < 2 ? "M0,10 L10,12 L20,6 L30,8 L40,2" : i === 2 ? "M0,10 L10,8 L20,9 L30,5 L40,4" : "M0,5 L10,8 L20,7 L30,10 L40,12"} 
                    fill="none" 
                    stroke={r.trendColor} 
                    strokeWidth="1.5" 
                  />
                  <circle 
                    cx="40" 
                    cy={i < 2 ? 2 : i === 2 ? 4 : 12} 
                    r="2" 
                    fill={r.trendColor} 
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-5 pt-4 border-t border-corp-border">
        View all emerging risks <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
