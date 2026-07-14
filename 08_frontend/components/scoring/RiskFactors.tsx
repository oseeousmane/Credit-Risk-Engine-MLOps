'use client'

import React from 'react'

const factors = [
  { name: 'Debt Burden', impact: '+28%', color: '#DC2626' },
  { name: 'Payment Delays', impact: '+19%', color: '#DC2626' },
  { name: 'Income Instability', impact: '+14%', color: '#F59E0B' },
  { name: 'Recent Inquiries', impact: '+8%', color: '#F59E0B' },
  { name: 'Sector Exposure', impact: '+6%', color: '#16A34A' },
]

export default function RiskFactors() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">PRINCIPAUX FACTEURS DE RISQUE</h3>
        <span className="text-[10px] font-semibold text-corp-textSecondary">Impact moyen</span>
      </div>
      <p className="text-[11px] text-corp-textSecondary mb-5">Impact moyen sur le score</p>

      <div className="space-y-4">
        {factors.map((f) => (
          <div key={f.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color }} />
              <span className="text-[12px] font-medium text-corp-textPrimary">{f.name}</span>
            </div>
            <span className="text-[12px] font-bold" style={{ color: f.color }}>{f.impact}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
