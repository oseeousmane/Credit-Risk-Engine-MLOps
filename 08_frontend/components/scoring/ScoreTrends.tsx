'use client'

import React from 'react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'

const data = [
  { month: 'Déc', score: 630 },
  { month: 'Jan', score: 645 },
  { month: 'Fév', score: 640 },
  { month: 'Mar', score: 645 },
  { month: 'Avr', score: 658 },
  { month: 'Mai', score: 642 },
  { month: 'Jun', score: 660 },
  { month: 'Jul', score: 665 },
  { month: 'Août', score: 668 },
  { month: 'Sep', score: 672 },
  { month: 'Oct', score: 680 },
  { month: 'Nov', score: 682 },
]

export default function ScoreTrends() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">SCORE TRENDS</h3>
          <div className="flex items-center gap-2">
            <span className="text-[18px] font-black text-corp-textPrimary">682 pts</span>
            <span className="text-[10px] font-bold text-corp-success bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">▲ Actuel</span>
          </div>
        </div>
        <p className="text-[11px] text-corp-textSecondary mb-4">Évolution du score moyen</p>

        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16A34A" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[620, 700]}
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '11px' }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#16A34A"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorScore)"
                activeDot={{ r: 5, fill: '#16A34A', stroke: '#fff', strokeWidth: 2 }}
                dot={{ r: 3, fill: '#16A34A', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
