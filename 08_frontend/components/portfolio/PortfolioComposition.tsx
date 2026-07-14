'use client'

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const data = [
  { name: 'Corporate', value: 32, color: '#1D4ED8' },
  { name: 'SME', value: 28, color: '#16A34A' },
  { name: 'Retail', value: 30, color: '#F59E0B' },
  { name: 'Microfinance', value: 10, color: '#DC2626' },
]

export default function PortfolioComposition() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm">
      <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide mb-6">PORTFOLIO COMPOSITION</h3>

      <div className="flex items-center gap-6 mt-4">
        <div className="w-[140px] h-[140px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
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

        <div className="flex-1 space-y-3.5">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[12px] font-medium text-corp-textPrimary">{item.name}</span>
              </div>
              <span className="text-[13px] font-black text-corp-textPrimary">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-corp-border pt-4 mt-6">
        <span className="text-[12px] font-bold text-corp-textPrimary">Total</span>
        <span className="text-[13px] font-black text-corp-textPrimary">100%</span>
      </div>
    </div>
  )
}
