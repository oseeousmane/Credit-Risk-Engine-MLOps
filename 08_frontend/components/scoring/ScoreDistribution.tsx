'use client'

import React from 'react'

const brackets = [
  { label: '850+', pct: 18, color: '#1D4ED8' },
  { label: '750 - 850', pct: 27, color: '#1D4ED8' },
  { label: '650 - 750', pct: 34, color: '#1D4ED8' },
  { label: '550 - 650', pct: 14, color: '#1D4ED8' },
  { label: '< 550', pct: 7, color: '#DC2626' },
]

export default function ScoreDistribution() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm">
      <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">SCORE DISTRIBUTION</h3>
      <p className="text-[11px] text-corp-textSecondary mb-5">Distribution des scores de crédit</p>

      <div className="space-y-3">
        {brackets.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-corp-textSecondary w-[70px] text-right flex-shrink-0">{b.label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-[14px] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${b.pct * 2.5}%`, backgroundColor: b.color }}
              />
            </div>
            <span className="text-[11px] font-bold text-corp-textPrimary w-[32px] text-right">{b.pct}%</span>
          </div>
        ))}
      </div>

      {/* X Axis labels */}
      <div className="flex justify-between mt-3 pl-[82px] pr-[32px]">
        {['0%', '10%', '20%', '30%', '40%'].map((l) => (
          <span key={l} className="text-[9px] text-corp-textSecondary">{l}</span>
        ))}
      </div>
    </div>
  )
}
