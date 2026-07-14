import React from 'react'
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'

const riskAppetiteItems = [
  { metric: 'PD Portfolio', limit: '≤ 2.0%', current: '1.78%', status: 'ok' },
  { metric: 'NPL Ratio', limit: '≤ 5.0%', current: '4.1%', status: 'ok' },
  { metric: 'ECL', limit: '≤ 400M', current: '388M', status: 'ok' },
  { metric: 'Sector Concentration', limit: '≤ 25%', current: '28%', status: 'warning' },
  { metric: 'Single Obligor', limit: '≤ 10%', current: '7.2%', status: 'ok' },
]

export default function RiskAppetite() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm flex flex-col justify-between h-full">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary mb-4">RISK APPETITE STATUS</h3>
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="pb-3 text-[10px] font-bold text-corp-textSecondary uppercase border-b border-corp-border/50">Metric</th>
              <th className="pb-3 text-[10px] font-bold text-corp-textSecondary uppercase border-b border-corp-border/50 text-right">Limit</th>
              <th className="pb-3 text-[10px] font-bold text-corp-textSecondary uppercase border-b border-corp-border/50 text-right">Current</th>
              <th className="pb-3 text-[10px] font-bold text-corp-textSecondary uppercase border-b border-corp-border/50 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {riskAppetiteItems.map((item) => (
              <tr key={item.metric} className="border-b border-corp-border/50 last:border-0">
                <td className="py-2.5 text-[11px] font-medium text-corp-textPrimary">{item.metric}</td>
                <td className="py-2.5 text-[11px] font-medium text-corp-textSecondary text-right">{item.limit}</td>
                <td className={`py-2.5 text-[11px] font-bold text-right ${item.status === 'warning' ? 'text-corp-warning' : 'text-corp-textPrimary'}`}>
                  {item.current}
                </td>
                <td className="py-2.5 text-center">
                  <div className="flex justify-center">
                    {item.status === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 text-corp-success" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-corp-warning" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-6 pt-4 border-t border-corp-border">
        View risk appetite details <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
