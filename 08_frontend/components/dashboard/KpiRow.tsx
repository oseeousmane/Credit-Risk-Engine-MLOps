import React from 'react'
import { Database, LineChart, ShieldCheck, Award, ArrowUp, ArrowDown } from 'lucide-react'

const kpis = [
  {
    title: 'TOTAL EXPOSURE',
    value: '8.5 Md XAF',
    trend: '+2.8%',
    trendType: 'up',
    trendColor: 'text-corp-success',
    icon: Database,
  },
  {
    title: 'PROBABILITY OF DEFAULT (1Y)',
    value: '1.78%',
    trend: '-0.12pp',
    trendType: 'down',
    trendColor: 'text-corp-success', // Down is good for PD
    icon: LineChart,
  },
  {
    title: 'EXPECTED CREDIT LOSS',
    value: '388 M XAF',
    trend: '-3.5%',
    trendType: 'down',
    trendColor: 'text-corp-success', // Down is good for ECL
    icon: ShieldCheck,
  },
  {
    title: 'PORTFOLIO QUALITY',
    value: 'AA-',
    trend: 'Stable',
    trendType: 'neutral',
    trendColor: 'text-corp-primary',
    icon: Award,
  },
]

export default function KpiRow() {
  return (
    <div className="grid grid-cols-4 gap-6 mt-6">
      {kpis.map((kpi, index) => (
        <div key={index} className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-corp-primary/10 flex items-center justify-center border border-corp-primary/20">
              <kpi.icon className="w-5 h-5 text-corp-primary" />
            </div>
            <div className="text-[11px] font-bold text-corp-textPrimary uppercase tracking-wide">
              {kpi.title}
            </div>
          </div>
          
          <div className="text-3xl font-bold text-corp-textPrimary tracking-tight mb-3">
            {kpi.value}
          </div>
          
          <div className="flex items-center gap-2 text-[12px] font-medium text-corp-textSecondary">
            {kpi.trendType === 'up' && <ArrowUp className={`w-4 h-4 ${kpi.trendColor}`} />}
            {kpi.trendType === 'down' && <ArrowDown className={`w-4 h-4 ${kpi.trendColor}`} />}
            {kpi.trendType === 'neutral' && <div className={`w-2 h-2 rounded-full bg-corp-primary ml-1 mr-1`} />}
            
            <span className={`font-semibold ${kpi.trendColor}`}>{kpi.trend}</span>
            <span>vs. last 30 days</span>
          </div>
        </div>
      ))}
    </div>
  )
}
