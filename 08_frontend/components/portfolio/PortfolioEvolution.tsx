'use client'

import React from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts'
import { MoreHorizontal } from 'lucide-react'

const data = [
  { month: 'Jun 23', exposure: 4.8, ecl: 2.2, npl: 1.5 },
  { month: 'Jul 23', exposure: 5.1, ecl: 2.4, npl: 1.6 },
  { month: 'Aug 23', exposure: 5.5, ecl: 2.7, npl: 1.8 },
  { month: 'Sep 23', exposure: 5.2, ecl: 2.3, npl: 1.7 },
  { month: 'Oct 23', exposure: 5.6, ecl: 2.5, npl: 1.6 },
  { month: 'Nov 23', exposure: 5.8, ecl: 2.4, npl: 1.5 },
  { month: 'Dec 23', exposure: 6.2, ecl: 2.8, npl: 1.7 },
  { month: 'Jan 24', exposure: 6.0, ecl: 2.6, npl: 1.6 },
  { month: 'Feb 24', exposure: 6.5, ecl: 3.1, npl: 1.9 },
  { month: 'Mar 24', exposure: 6.8, ecl: 3.4, npl: 2.1 },
  { month: 'Apr 24', exposure: 7.2, ecl: 3.8, npl: 2.0 },
  { month: 'May 24', exposure: 7.0, ecl: 3.5, npl: 1.8 },
  { month: 'Jun 24', exposure: 7.5, ecl: 4.1, npl: 1.9 },
  { month: 'Jul 24', exposure: 7.3, ecl: 3.9, npl: 1.7 },
  { month: 'Aug 24', exposure: 7.8, ecl: 4.2, npl: 1.6 },
  { month: 'Sep 24', exposure: 8.2, ecl: 4.0, npl: 1.5 },
  { month: 'Oct 24', exposure: 8.5, ecl: 3.8, npl: 1.4 },
  { month: 'Nov 24', exposure: 7.9, ecl: 3.6, npl: 1.3 },
  { month: 'Dec 24', exposure: 8.4, ecl: 3.5, npl: 1.2 },
  { month: 'Jan 25', exposure: 8.0, ecl: 3.3, npl: 1.1 },
  { month: 'Feb 25', exposure: 8.3, ecl: 3.2, npl: 1.0 },
  { month: 'Mar 25', exposure: 8.5, ecl: 3.1, npl: 0.9 },
  { month: 'Apr 25', exposure: 8.7, ecl: 2.9, npl: 0.8 },
]

export default function PortfolioEvolution() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-2 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">PORTFOLIO EVOLUTION (24 MONTHS)</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 mr-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-[10px] font-semibold text-corp-textSecondary">Total Exposure (Md XAF)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold text-corp-textSecondary">ECL (M XAF)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] font-semibold text-corp-textSecondary">NPL Ratio (%)</span>
            </div>
          </div>
          <select className="text-[11px] border border-corp-border rounded px-2 py-1 bg-gray-50 text-corp-textPrimary font-medium outline-none">
            <option>Monthly</option>
          </select>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              interval={1}
            />
            {/* Left Y Axis for Exposure and ECL */}
            <YAxis
              yAxisId="left"
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tickFormatter={(val) => `${val}.0B`}
              tick={{ fontSize: 9, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
            />
            {/* Right Y Axis for NPL Ratio */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tickFormatter={(val) => `${val}%`}
              tick={{ fontSize: 9, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '11px' }}
            />
            <Line yAxisId="left" type="monotone" dataKey="exposure" stroke="#2563EB" strokeWidth={2} dot={{ r: 2.5, fill: '#2563EB', strokeWidth: 0 }} activeDot={{ r: 4 }} />
            <Line yAxisId="left" type="monotone" dataKey="ecl" stroke="#10B981" strokeWidth={2} dot={{ r: 2.5, fill: '#10B981', strokeWidth: 0 }} activeDot={{ r: 4 }} />
            <Line yAxisId="right" type="monotone" dataKey="npl" stroke="#EF4444" strokeWidth={2} dot={{ r: 2.5, fill: '#EF4444', strokeWidth: 0 }} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
