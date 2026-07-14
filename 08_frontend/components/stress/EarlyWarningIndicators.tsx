'use client'

import React from 'react'
import { ArrowRight, Flame, TrendingUp, DollarSign, Droplets, Map } from 'lucide-react'

const indicators = [
  { label: 'Inflation Risk', icon: Flame, status: 'High', bg: 'bg-red-50', color: 'text-red-600', border: 'border-red-200' },
  { label: 'Interest Rate Risk', icon: TrendingUp, status: 'High', bg: 'bg-red-50', color: 'text-red-600', border: 'border-red-200' },
  { label: 'FX Risk', icon: DollarSign, status: 'Medium', bg: 'bg-amber-50', color: 'text-amber-600', border: 'border-amber-200' },
  { label: 'Liquidity Risk', icon: Droplets, status: 'Low', bg: 'bg-emerald-50', color: 'text-emerald-600', border: 'border-emerald-200' },
  { label: 'Political Risk', icon: Map, status: 'Medium', bg: 'bg-amber-50', color: 'text-amber-600', border: 'border-amber-200' },
]

export default function EarlyWarningIndicators() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-1 flex flex-col justify-between">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">EARLY WARNING INDICATORS</h3>
        <p className="text-[11px] text-corp-textSecondary mb-5">Key risk indicators</p>

        <div className="space-y-4">
          {indicators.map((ind, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ind.icon className="w-3.5 h-3.5 text-corp-textSecondary" />
                <span className="text-[11px] font-medium text-corp-textPrimary">{ind.label}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border w-16 text-center ${ind.bg} ${ind.color} ${ind.border}`}>
                {ind.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-5 pt-4 border-t border-corp-border">
        Voir tous les indicateurs <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
