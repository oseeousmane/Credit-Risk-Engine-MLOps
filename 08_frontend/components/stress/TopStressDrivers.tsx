'use client'

import React from 'react'
import { TrendingUp, Activity, PieChart, DollarSign, Layers } from 'lucide-react'

const drivers = [
  { name: 'Inflation', icon: TrendingUp, impact: '+35%', value: 85, color: '#DC2626' },
  { name: 'Interest Rate Shock', icon: Activity, impact: '+28%', value: 70, color: '#EF4444' },
  { name: 'GDP Contraction', icon: PieChart, impact: '+21%', value: 50, color: '#F59E0B' },
  { name: 'Currency Risk', icon: DollarSign, impact: '+14%', value: 35, color: '#F59E0B' },
  { name: 'Sector Concentration', icon: Layers, impact: '+11%', value: 25, color: '#8B5CF6' },
]

export default function TopStressDrivers() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-1 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">TOP STRESS DRIVERS</h3>
        <span className="text-[10px] font-bold text-corp-textSecondary">Impact on ECL</span>
      </div>

      <div className="space-y-4">
        {drivers.map((d, i) => (
          <div key={i} className="flex items-center">
            <div className="w-[160px] flex items-center gap-2">
              <d.icon className="w-3.5 h-3.5 text-corp-textSecondary flex-shrink-0" />
              <span className="text-[11px] font-medium text-corp-textPrimary truncate">{d.name}</span>
            </div>
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full">
                <div 
                  className="h-full rounded-full" 
                  style={{ width: `${d.value}%`, backgroundColor: d.color }} 
                />
              </div>
              <span className="w-10 text-right text-[11px] font-bold text-corp-textPrimary">
                {d.impact}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
