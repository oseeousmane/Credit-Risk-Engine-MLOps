'use client'

import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'Dec', ecl: 20, par: 15 },
  { name: 'Jan', ecl: 35, par: 25 },
  { name: 'Feb', ecl: 30, par: 40 },
  { name: 'Mar', ecl: 48, par: 42 },
  { name: 'Apr', ecl: 25, par: 20 },
  { name: 'May', ecl: 45, par: 35 },
  { name: 'Jun', ecl: 40, par: 65 },
  { name: 'Jul', ecl: 60, par: 42 },
  { name: 'Aug', ecl: 55, par: 70 },
  { name: 'Sep', ecl: 68, par: 62 },
  { name: 'Oct', ecl: 88, par: 75 },
  { name: 'Nov', ecl: 82, par: 95 },
]

export default function EclParTrend() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-2 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-[13px] font-bold text-corp-textPrimary">ECL & PAR Trend</h3>
          <p className="text-[11px] text-corp-textSecondary mt-0.5">IFRS 9 provisions • FY 2026 • XAF</p>
        </div>
        <div className="flex gap-2">
          <button className="text-[11px] font-bold px-2.5 py-1 rounded bg-corp-bg text-corp-textPrimary border border-corp-border">Monthly</button>
          <button className="text-[11px] font-bold px-2.5 py-1 rounded text-corp-textSecondary hover:bg-corp-bg border border-transparent">Quarterly</button>
          <button className="text-[11px] font-bold px-2 py-1 rounded text-corp-textSecondary hover:bg-corp-bg border border-transparent">...</button>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-corp-success" />
          <span className="text-[11px] font-bold text-corp-textSecondary uppercase">ECL</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-corp-primary" />
          <span className="text-[11px] font-bold text-corp-textSecondary uppercase">PAR</span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#64748B' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#64748B' }}
              tickFormatter={(value) => `${value}M`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
              itemStyle={{ fontWeight: 'bold' }}
            />
            <Line 
              type="monotone" 
              dataKey="ecl" 
              name="ECL"
              stroke="#16A34A" 
              strokeWidth={2} 
              dot={{ r: 3, fill: '#16A34A', strokeWidth: 2, stroke: '#FFFFFF' }} 
              activeDot={{ r: 5 }} 
            />
            <Line 
              type="monotone" 
              dataKey="par" 
              name="PAR"
              stroke="#1D4ED8" 
              strokeWidth={2} 
              dot={{ r: 3, fill: '#1D4ED8', strokeWidth: 2, stroke: '#FFFFFF' }} 
              activeDot={{ r: 5 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
