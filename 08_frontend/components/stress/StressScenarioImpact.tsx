'use client'

import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'

const data = [
  { month: 'May 24', baseline: 1.0, mild: 1.5, moderate: 2.0, severe: 2.8 },
  { month: 'Jun 24', baseline: 1.1, mild: 1.5, moderate: 2.1, severe: 3.1 },
  { month: 'Jul 24', baseline: 1.1, mild: 1.6, moderate: 2.3, severe: 3.3 },
  { month: 'Aug 24', baseline: 1.2, mild: 1.6, moderate: 2.4, severe: 3.5 },
  { month: 'Sep 24', baseline: 1.3, mild: 1.8, moderate: 2.6, severe: 4.1 },
  { month: 'Oct 24', baseline: 1.4, mild: 1.9, moderate: 2.9, severe: 4.5 },
  { month: 'Nov 24', baseline: 1.5, mild: 2.0, moderate: 3.0, severe: 4.8 },
  { month: 'Dec 24', baseline: 1.6, mild: 2.2, moderate: 3.2, severe: 5.2 },
  { month: 'Jan 25', baseline: 1.7, mild: 2.2, moderate: 3.4, severe: 5.4 },
  { month: 'Feb 25', baseline: 1.75, mild: 2.3, moderate: 3.5, severe: 5.4 },
  { month: 'Mar 25', baseline: 1.78, mild: 2.35, moderate: 3.5, severe: 5.5 },
  { month: 'Apr 25', baseline: 1.78, mild: 2.35, moderate: 3.4, severe: 5.2 },
  { month: 'May 25', baseline: 1.78, mild: 2.35, moderate: 3.3, severe: 4.9 },
]

export default function StressScenarioImpact() {
  const [activeTab, setActiveTab] = useState('PD (%)')

  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-2 flex flex-col justify-between">
      <div className="flex flex-col mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">STRESS SCENARIO IMPACT OVER TIME (12 MONTHS)</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-0.5 bg-emerald-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold text-corp-textSecondary">Baseline</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-0.5 bg-blue-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[10px] font-semibold text-corp-textSecondary">Mild Stress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-0.5 bg-amber-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[10px] font-semibold text-corp-textSecondary">Moderate Stress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-0.5 bg-red-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-[10px] font-semibold text-corp-textSecondary">Severe Stress</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {['PD (%)', 'ECL (M XAF)', 'NPL Ratio (%)'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-[10px] font-bold rounded-full transition-colors ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-corp-textSecondary hover:bg-gray-100'}`}
            >
              {tab}
            </button>
          ))}
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
            <YAxis
              domain={[0, 6]}
              ticks={[0, 1, 2, 3, 4, 5, 6]}
              tickFormatter={(val) => `${val}%`}
              tick={{ fontSize: 9, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '11px' }}
            />
            <Line type="monotone" dataKey="baseline" stroke="#10B981" strokeWidth={2} dot={{ r: 2.5, fill: '#10B981', strokeWidth: 0 }} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="mild" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2.5, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="moderate" stroke="#F59E0B" strokeWidth={2} dot={{ r: 2.5, fill: '#F59E0B', strokeWidth: 0 }} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="severe" stroke="#EF4444" strokeWidth={2} dot={{ r: 2.5, fill: '#EF4444', strokeWidth: 0 }} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
