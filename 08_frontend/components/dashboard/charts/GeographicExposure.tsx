import React from 'react'
import { ArrowRight } from 'lucide-react'

const geographicExposure = [
  { name: 'Cameroun', value: 52 },
  { name: 'Gabon', value: 18 },
  { name: 'Congo', value: 14 },
  { name: 'Tchad', value: 9 },
  { name: 'RCA', value: 5 },
  { name: 'Guinée Équatoriale', value: 2 },
]

export default function GeographicExposure() {
  const maxValue = Math.max(...geographicExposure.map(d => d.value))

  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm flex flex-col justify-between h-full">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary mb-1 uppercase tracking-wide">GEOGRAPHIC EXPOSURE</h3>
        <p className="text-[11px] text-corp-textSecondary mb-6">Exposure by country (XAF)</p>
        
        <div className="space-y-3.5">
          {geographicExposure.map((item) => (
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
                {item.value}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-6 pt-4 border-t border-corp-border">
        View geographic analysis <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
