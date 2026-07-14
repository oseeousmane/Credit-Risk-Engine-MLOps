'use client'

import React from 'react'
import { ArrowRight } from 'lucide-react'

const topMetrics = [
  { label: 'AUC', value: '0.84', sublabel: 'Calibration' },
  { label: 'KS', value: '43%', sublabel: 'Stability Index' },
  { label: 'Gini', value: '57%', sublabel: 'Model Status' },
  { label: 'PSI', value: '0.12', sublabel: 'Monitoring' },
]

const bottomMetrics = [
  { value: 'Stable', bg: 'bg-blue-50', color: 'text-blue-700', border: 'border-blue-200' },
  { value: '98%', bg: 'bg-white', color: 'text-corp-textPrimary', border: 'border-corp-border' },
  { value: 'Stable', bg: 'bg-green-50', color: 'text-green-700', border: 'border-green-200' },
  { value: 'Active', bg: 'bg-green-50', color: 'text-green-700', border: 'border-green-200' },
]

export default function ModelPerformance() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">MODEL PERFORMANCE</h3>
        <p className="text-[11px] text-corp-textSecondary mb-5">Performance du modèle de scoring</p>

        <div className="grid grid-cols-4 gap-3">
          {topMetrics.map((m, i) => (
            <div key={m.label} className="text-center">
              <div className="text-[10px] text-corp-textSecondary mb-1">{m.label}</div>
              <div className="text-[20px] font-black text-corp-textPrimary leading-none">{m.value}</div>
              <div className="text-[9px] text-corp-textSecondary mt-2">{m.sublabel}</div>
              <div className={`mt-1 inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${bottomMetrics[i].bg} ${bottomMetrics[i].color} border ${bottomMetrics[i].border}`}>
                {bottomMetrics[i].value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-5 pt-4 border-t border-corp-border">
        Voir le détail du modèle <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
