'use client'

import React from 'react'
import { ArrowRight, Check, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const metrics = [
  { metric: 'NPL Ratio', limit: '≤ 5.0%', current: '4.1%', status: 'OK', vsLast30: '-0.3pp', vsDir: 'down' },
  { metric: 'ECL', limit: '≤ 400 M', current: '388 M', status: 'OK', vsLast30: '-3.5%', vsDir: 'down' },
  { metric: 'Sector Concentration', limit: '≤ 25%', current: '28%', status: 'Warning', vsLast30: '+3pp', vsDir: 'up' },
  { metric: 'PD Portfolio', limit: '≤ 2.0%', current: '1.78%', status: 'OK', vsLast30: '-0.12pp', vsDir: 'down' },
  { metric: 'Single Obligor', limit: '≤ 10%', current: '7.2%', status: 'OK', vsLast30: '-0.8pp', vsDir: 'down' },
]

export default function RiskAppetiteMonitoring() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-1 flex flex-col justify-between">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">RISK APPETITE MONITORING</h3>
        
        <div className="flex text-[10px] font-bold text-corp-textSecondary mb-3 border-b border-corp-border pb-2 mt-5">
          <div className="flex-1">Metric</div>
          <div className="w-[60px] text-center">Limit</div>
          <div className="w-[60px] text-center">Current</div>
          <div className="w-[50px] text-center">Status</div>
          <div className="w-[80px] text-right">vs. last 30 days</div>
        </div>

        <div className="space-y-4">
          {metrics.map((m) => (
            <div key={m.metric} className="flex items-center">
              <div className="text-[11px] font-medium text-corp-textPrimary flex-1">{m.metric}</div>
              <div className="w-[60px] text-[11px] font-bold text-corp-textSecondary text-center">{m.limit}</div>
              <div className="w-[60px] text-[11px] font-bold text-corp-textPrimary text-center">{m.current}</div>
              <div className="w-[50px] flex justify-center">
                {m.status === 'OK' ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-[10px]">
                    !
                  </div>
                )}
              </div>
              <div className="w-[80px] flex justify-end items-center gap-1">
                <span className={`text-[11px] font-bold ${m.vsDir === 'down' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {m.vsLast30}
                </span>
                {m.vsDir === 'down' ? (
                  <ArrowDownRight className="w-3 h-3 text-emerald-500" />
                ) : (
                  <ArrowUpRight className="w-3 h-3 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-5 pt-4 border-t border-corp-border">
        View all risk appetite details <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
