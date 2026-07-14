import React from 'react'
import { ArrowRight } from 'lucide-react'

const riskDrivers = [
  { name: 'Debt Burden', value: 22 },
  { name: 'Payment Delays', value: 17 },
  { name: 'Sector Exposure', value: 12 },
  { name: 'Macroeconomic Factors', value: 8 },
  { name: 'Behavioural Risk', value: 5 },
]

export default function RiskDrivers() {
  const maxValue = Math.max(...riskDrivers.map(d => d.value))

  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm flex flex-col justify-between h-full">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary mb-1 uppercase tracking-wide">TOP RISK DRIVERS</h3>
        <p className="text-[11px] text-corp-textSecondary mb-6">Impact on portfolio PD</p>
        
        <div className="space-y-3.5">
          {riskDrivers.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <div className="w-[110px] text-[11px] font-medium text-corp-textPrimary truncate">
                {item.name}
              </div>
              <div className="flex-1 h-2 bg-corp-bg rounded-full overflow-hidden">
                <div 
                  className="h-full bg-corp-primary rounded-full"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
              <div className="w-8 text-[11px] font-bold text-corp-textPrimary text-right">
                +{item.value}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-6 pt-4 border-t border-corp-border">
        View all risk drivers <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
