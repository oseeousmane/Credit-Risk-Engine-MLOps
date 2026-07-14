'use client'

import React from 'react'
import { Target, TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react'

const assumptions = [
  { label: 'Inflation', icon: Target, value: '+5.0%', dir: 'up' },
  { label: 'Interest Rate', icon: TrendingUp, value: '+3.0%', dir: 'up' },
  { label: 'GDP Growth', icon: TrendingDown, value: '-2.0%', dir: 'down' },
  { label: 'FX Devaluation', icon: DollarSign, value: '-8.0%', dir: 'down' },
  { label: 'Unemployment', icon: Users, value: '+4.0%', dir: 'up' },
]

export default function ScenarioControls() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-1 flex flex-col justify-between">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide mb-4">SCENARIO SELECTOR</h3>
        
        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="w-4 h-4 rounded-sm bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="text-[12px] font-bold text-corp-textPrimary">Baseline Scenario</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="w-4 h-4 rounded-sm bg-blue-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="text-[12px] font-bold text-corp-textPrimary">Mild Stress</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="w-4 h-4 rounded-sm bg-amber-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="text-[12px] font-bold text-corp-textPrimary">Moderate Stress</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="w-4 h-4 rounded-sm bg-red-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="text-[12px] font-bold text-corp-textPrimary">Severe Stress</span>
          </label>
        </div>

        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide mb-4">STRESS ASSUMPTIONS</h3>
        
        <div className="space-y-3">
          {assumptions.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                  <item.icon className="w-3 h-3 text-corp-textSecondary" />
                </div>
                <span className="text-[11px] font-medium text-corp-textPrimary">{item.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-corp-textPrimary">{item.value}</span>
                {item.dir === 'up' ? (
                  <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                ) : (
                  <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
