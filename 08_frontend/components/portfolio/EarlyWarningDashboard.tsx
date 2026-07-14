'use client'

import React from 'react'
import { ArrowRight, TrendingUp, AlertTriangle, Percent, ShieldCheck } from 'lucide-react'

const indicators = [
  { 
    label: 'Stress Sector Alert', 
    sub: 'Construction (BTP)',
    status: 'High', 
    icon: TrendingUp,
    color: 'text-red-500',
    stroke: '#EF4444',
    bgStroke: '#FEE2E2',
    progress: 85
  },
  { 
    label: 'Credit Quality Trend', 
    sub: 'Deteriorating',
    status: 'Watch', 
    icon: AlertTriangle,
    color: 'text-amber-500',
    stroke: '#F59E0B',
    bgStroke: '#FEF3C7',
    progress: 60
  },
  { 
    label: 'Liquidity Risk', 
    sub: 'Stable',
    status: 'Low', 
    icon: Percent,
    color: 'text-emerald-500',
    stroke: '#10B981',
    bgStroke: '#D1FAE5',
    progress: 20
  },
  { 
    label: 'Model Stability', 
    sub: 'Stable',
    status: 'OK', 
    icon: ShieldCheck,
    color: 'text-emerald-500',
    stroke: '#10B981',
    bgStroke: '#D1FAE5',
    progress: 100
  },
]

export default function EarlyWarningDashboard() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-1 flex flex-col justify-between">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">EARLY WARNING DASHBOARD</h3>
        <div className="h-4"></div> {/* Spacer */}

        <div className="grid grid-cols-4 gap-2 mt-4">
          {indicators.map((ind, i) => {
            const radius = 22;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (ind.progress / 100) * circumference;

            return (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="relative w-14 h-14 mb-3 flex items-center justify-center">
                  {/* SVG Progress Ring */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 50 50">
                    <circle
                      cx="25"
                      cy="25"
                      r={radius}
                      fill="none"
                      stroke={ind.bgStroke}
                      strokeWidth="3.5"
                    />
                    <circle
                      cx="25"
                      cy="25"
                      r={radius}
                      fill="none"
                      stroke={ind.stroke}
                      strokeWidth="3.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Icon */}
                  <ind.icon className={`w-5 h-5 ${ind.color} relative z-10`} />
                </div>
                <div className="text-[10px] font-medium text-corp-textSecondary leading-tight mb-0.5 min-h-[24px]">
                  {ind.label}<br/>{ind.sub}
                </div>
                <div className={`text-[11px] font-bold mt-2 ${ind.color}`}>
                  {ind.status}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-5 pt-4 border-t border-corp-border">
        View full early warning dashboard <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
