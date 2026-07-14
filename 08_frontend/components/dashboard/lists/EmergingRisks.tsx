import React from 'react'
import { ArrowRight, ArrowUp } from 'lucide-react'

const emergingRisks = [
  { sector: 'Construction', trend: '+18%', impact: 'Watch', impactColor: 'text-corp-warning' },
  { sector: 'Transport', trend: '+12%', impact: 'Watch', impactColor: 'text-corp-warning' },
  { sector: 'Agriculture', trend: '+9%', impact: 'Monitor', impactColor: 'text-corp-warning' },
  { sector: 'Commerce', trend: '+4%', impact: 'Stable', impactColor: 'text-corp-success' },
]

export default function EmergingRisks() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm flex flex-col justify-between h-full">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary mb-4 uppercase tracking-wide">EMERGING RISKS</h3>
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="pb-3 text-[10px] font-bold text-corp-textSecondary uppercase border-b border-corp-border/50">Sector</th>
              <th className="pb-3 text-[10px] font-bold text-corp-textSecondary uppercase border-b border-corp-border/50 text-right">Trend</th>
              <th className="pb-3 text-[10px] font-bold text-corp-textSecondary uppercase border-b border-corp-border/50 text-right">Impact</th>
            </tr>
          </thead>
          <tbody>
            {emergingRisks.map((item) => (
              <tr key={item.sector} className="border-b border-corp-border/50 last:border-0">
                <td className="py-2.5 text-[11px] font-medium text-corp-textPrimary">{item.sector}</td>
                <td className="py-2.5 text-[11px] font-bold text-corp-danger text-right flex items-center justify-end gap-1">
                  <ArrowUp className="w-3 h-3" />
                  {item.trend}
                </td>
                <td className={`py-2.5 text-[11px] font-bold text-right ${item.impactColor}`}>
                  {item.impact}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-6 pt-4 border-t border-corp-border">
        View full early warning <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
