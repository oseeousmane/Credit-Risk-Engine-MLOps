'use client'

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const data = [
  { name: 'Approuvés', value: 71, count: '9 161', color: '#16A34A' },
  { name: 'Sous conditions', value: 19, count: '2 441', color: '#F59E0B' },
  { name: 'Refusés', value: 10, count: '1 285', color: '#DC2626' },
]

export default function DecisionCenter() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm">
      <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">DECISION CENTER</h3>
      <p className="text-[11px] text-corp-textSecondary mb-4">Répartition des décisions</p>

      <div className="flex items-center gap-4">
        <div className="w-[110px] h-[110px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={50}
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
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-bold text-corp-textPrimary">{item.value}%</span>
                <span className="text-[10px] text-corp-textSecondary">({item.count})</span>
              </div>
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
