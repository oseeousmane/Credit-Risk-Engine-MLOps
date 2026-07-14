'use client'

import React from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, ReferenceLine, Tooltip } from 'recharts'

const contributionData = [
  { name: 'Revenus stables', value: 16 },
  { name: 'Hist. remboursement', value: 18 },
  { name: 'Ancienneté entreprise', value: 12 },
  { name: 'Endettement', value: -8 },
  { name: 'Secteur d\'activité', value: -4 },
]

const positiveFactors = [
  { label: 'Revenus stables', value: '+15' },
  { label: 'Historique de remboursement', value: '+18' },
  { label: 'Ancienneté de l\'entreprise', value: '+12' },
]

const negativeFactors = [
  { label: 'Endettement légèrement élevé', value: '-8' },
  { label: 'Concentration sectorielle', value: '-5' },
]

export default function ExplainableAi() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-2 grid grid-cols-2 gap-6">
      {/* Left: Explainable AI Details */}
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">EXPLAINABLE AI (XAI)</h3>
        <p className="text-[11px] text-corp-textSecondary mb-5">Détail des facteurs influençant le score</p>

        {/* Client Info */}
        <div className="flex items-center gap-6 mb-5 pb-4 border-b border-corp-border">
          <div>
            <span className="text-[10px] text-corp-textSecondary block">Client ID</span>
            <span className="text-[13px] font-bold text-corp-textPrimary">SME-2026-847</span>
          </div>
          <div>
            <span className="text-[10px] text-corp-textSecondary block">Score</span>
            <span className="text-[13px] font-bold text-corp-textPrimary">742</span>
          </div>
          <div>
            <span className="text-[10px] text-corp-textSecondary block">Classe</span>
            <span className="text-[13px] font-bold text-corp-textPrimary">Standard</span>
          </div>
        </div>

        {/* Positive Factors */}
        <div className="mb-4">
          <h4 className="text-[10px] font-bold text-corp-success uppercase tracking-wider mb-2">FACTEURS POSITIFS</h4>
          <div className="space-y-2">
            {positiveFactors.map((f) => (
              <div key={f.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-corp-success" />
                  <span className="text-[12px] font-medium text-corp-textPrimary">{f.label}</span>
                </div>
                <span className="text-[11px] font-bold text-corp-success">{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Negative Factors */}
        <div>
          <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2">FACTEURS NÉGATIFS</h4>
          <div className="space-y-2">
            {negativeFactors.map((f) => (
              <div key={f.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-[12px] font-medium text-corp-textPrimary">{f.label}</span>
                </div>
                <span className="text-[11px] font-bold text-red-500">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Waterfall-style bar chart */}
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">CONTRIBUTION AU SCORE</h3>
        <p className="text-[11px] text-corp-textSecondary mb-4">(Points)</p>

        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={contributionData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <XAxis type="number" domain={[-20, 50]} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} width={110} />
              <ReferenceLine x={0} stroke="#E2E8F0" strokeWidth={1} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '11px' }}
              />
              <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={16}>
                {contributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#16A34A' : '#DC2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
