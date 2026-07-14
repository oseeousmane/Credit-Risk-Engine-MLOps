'use client'

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { ArrowRight } from 'lucide-react'

const ifrsData = [
  { name: 'Stage 1 (Performing)', value: 78, color: '#16A34A' },
  { name: 'Stage 2 (Underperforming)', value: 17, color: '#F59E0B' },
  { name: 'Stage 3 (Non-performing)', value: 5, color: '#DC2626' },
]

const portfolioData = [
  { name: 'Retail', value: 35, color: '#1D4ED8' },
  { name: 'SME', value: 25, color: '#F59E0B' },
  { name: 'Corporate', value: 30, color: '#16A34A' },
  { name: 'Microfinance', value: 10, color: '#8B5CF6' },
]

export default function PortfolioDonuts() {
  return (
    <>
      {/* IFRS 9 Donut */}
      <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-corp-textPrimary mb-4">IFRS 9 Portfolio Composition</h3>
          <div className="flex items-center gap-2">
            <div className="w-[120px] h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ifrsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {ifrsData.map((entry, index) => (
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
              {ifrsData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] font-medium text-corp-textSecondary">{item.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-corp-textPrimary">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-2 border-t border-corp-border pt-4 mt-4 mb-4">
            <div>
              <div className="text-[10px] text-corp-textSecondary mb-1">Cost of Risk</div>
              <div className="text-[14px] font-bold text-corp-textPrimary">0.82%</div>
            </div>
            <div>
              <div className="text-[10px] text-corp-textSecondary mb-1">Coverage Ratio</div>
              <div className="text-[14px] font-bold text-corp-textPrimary">91%</div>
            </div>
            <div>
              <div className="text-[10px] text-corp-textSecondary mb-1">NPL Ratio</div>
              <div className="text-[14px] font-bold text-corp-textPrimary">4.1%</div>
            </div>
          </div>
          <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors">
            View IFRS 9 dashboard <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Portfolio Composition Donut */}
      <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-corp-textPrimary mb-4">Portfolio Composition</h3>
          <div className="flex items-center gap-2 mt-8">
            <div className="w-[140px] h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={portfolioData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {portfolioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex-1 space-y-3 pl-4">
              {portfolioData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[12px] font-medium text-corp-textSecondary">{item.name}</span>
                  </div>
                  <span className="text-[12px] font-bold text-corp-textPrimary">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
