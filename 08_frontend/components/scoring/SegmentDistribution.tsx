'use client'

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const data = [
  { name: 'Prime (Low Risk)', value: 42, color: '#16A34A' },
  { name: 'Standard (Medium Risk)', value: 31, color: '#1D4ED8' },
  { name: 'Watchlist (Elevated Risk)', value: 18, color: '#F59E0B' },
  { name: 'High Risk', value: 9, color: '#DC2626' },
]

export default function SegmentDistribution() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm">
      <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">RÉPARTITION PAR SEGMENT DE SCORE</h3>
      <p className="text-[11px] text-corp-textSecondary mb-4">Segmentation des clients par classe de risque</p>

      <div className="flex items-center gap-4">
        <div className="w-[130px] h-[130px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={58}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '11px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-3">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] font-medium text-corp-textSecondary">{item.name}</span>
              </div>
              <span className="text-[12px] font-bold text-corp-textPrimary">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-corp-border pt-3 mt-4">
        <span className="text-[11px] font-bold text-corp-textPrimary">Total</span>
        <span className="text-[12px] font-bold text-corp-textPrimary">100%</span>
      </div>
    </div>
  )
}
