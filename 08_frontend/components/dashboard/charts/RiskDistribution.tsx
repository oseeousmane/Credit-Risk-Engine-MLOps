import React from 'react'

const data = [
  { segment: 'Retail', low: 28, med: 12, high: 4 },
  { segment: 'SME', low: 10, med: 27, high: 9 },
  { segment: 'Corporate', low: 7, med: 12, high: 6 },
  { segment: 'Public', low: 3, med: 3, high: 2 },
  { segment: 'Other', low: 2, med: 2, high: 1 },
]

// Simple color scaler based on value
function getHeatmapColor(value: number) {
  if (value > 25) return 'bg-corp-primary/30'
  if (value > 15) return 'bg-corp-primary/20'
  if (value > 8) return 'bg-corp-primary/10'
  if (value > 3) return 'bg-corp-primary/5'
  return 'bg-transparent'
}

export default function RiskDistribution() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm flex flex-col h-full">
      <h3 className="text-[13px] font-bold text-corp-textPrimary mb-1">Portfolio Risk Distribution</h3>
      <p className="text-[11px] text-corp-textSecondary mb-4">Exposure by risk level and segment (XAF)</p>
      
      <div className="flex-1 w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="pb-2 text-[10px] font-bold text-corp-textSecondary uppercase w-1/4"></th>
              <th className="pb-2 text-[10px] font-bold text-corp-textSecondary uppercase text-center w-1/4">LOW RISK</th>
              <th className="pb-2 text-[10px] font-bold text-corp-textSecondary uppercase text-center w-1/4">MEDIUM RISK</th>
              <th className="pb-2 text-[10px] font-bold text-corp-textSecondary uppercase text-center w-1/4">HIGH RISK</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.segment} className="border-b border-corp-border/50 last:border-0">
                <td className="py-2.5 text-[11px] font-bold text-corp-textPrimary">{row.segment}</td>
                <td className="p-1">
                  <div className={`w-full py-1.5 text-center rounded text-[11px] font-medium text-corp-textPrimary ${getHeatmapColor(row.low)}`}>
                    {row.low}%
                  </div>
                </td>
                <td className="p-1">
                  <div className={`w-full py-1.5 text-center rounded text-[11px] font-medium text-corp-textPrimary ${getHeatmapColor(row.med)}`}>
                    {row.med}%
                  </div>
                </td>
                <td className="p-1">
                  <div className={`w-full py-1.5 text-center rounded text-[11px] font-medium text-corp-textPrimary ${getHeatmapColor(row.high)}`}>
                    {row.high}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 pt-4 border-t border-corp-border flex items-center justify-between text-[10px] text-corp-textSecondary font-medium">
        <span>Low Exposure</span>
        <div className="h-1.5 flex-1 mx-4 rounded-full bg-gradient-to-r from-corp-primary/5 via-corp-primary/20 to-corp-primary/40" />
        <span>High Exposure</span>
      </div>
    </div>
  )
}
