'use client'

import React from 'react'
import { BarChart3, Target, CheckCircle2, AlertTriangle, ClipboardList } from 'lucide-react'

const kpis = [
  {
    label: 'APPLICATIONS ANALYSÉES',
    value: '12 847',
    trend: '+8.2%',
    trendDir: 'up' as const,
    sub: 'vs. last 30 days',
    icon: BarChart3,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    label: 'SCORE MOYEN',
    value: '682',
    trend: '+15 pts',
    trendDir: 'up' as const,
    sub: 'vs. last 30 days',
    icon: Target,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    label: "TAUX D'APPROBATION",
    value: '71%',
    trend: '+3.6pp',
    trendDir: 'up' as const,
    sub: 'vs. last 30 days',
    icon: CheckCircle2,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    label: 'PD MOYEN',
    value: '1.78%',
    trend: '-0.12pp',
    trendDir: 'down' as const,
    sub: 'vs. last 30 days',
    icon: AlertTriangle,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    label: 'DÉCISIONS SOUS REVUE',
    value: '43',
    trend: '+7',
    trendDir: 'up' as const,
    sub: 'vs. last 30 days',
    icon: ClipboardList,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
]

export default function ScoringKpiRow() {
  return (
    <div className="grid grid-cols-5 gap-4 mt-6">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-corp-card border border-corp-border rounded-xl p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg ${kpi.iconBg} flex items-center justify-center flex-shrink-0`}>
              <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-corp-textSecondary tracking-wide uppercase leading-none mb-2">
                {kpi.label}
              </div>
              <div className="text-[22px] font-black text-corp-textPrimary tracking-tight leading-none">
                {kpi.value}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className={`text-[11px] font-bold ${
                  kpi.trendDir === 'up' ? 'text-corp-success' : 'text-corp-success'
                }`}>
                  ↑ {kpi.trend}
                </span>
                <span className="text-[10px] text-corp-textSecondary">{kpi.sub}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
