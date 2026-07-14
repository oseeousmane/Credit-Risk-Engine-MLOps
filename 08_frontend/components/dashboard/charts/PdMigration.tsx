import React from 'react'
import { ArrowRight } from 'lucide-react'

const matrix = [
  { row: 'A (≤1%)',    a: 80,  b: 12, c: 6,  d: 2 },
  { row: 'B (1-3%)',   a: 4,   b: 72, c: 18, d: 6 },
  { row: 'C (3-10%)',  a: 1,   b: 6,  c: 66, d: 27 },
  { row: 'D (>10%)',   a: -1,  b: 2,  c: 10, d: 88 }, // -1 means <1%
]

function getHeatmapColor(value: number, isDiagonal: boolean) {
  if (value === -1) return 'bg-transparent text-gray-400'
  if (isDiagonal) return 'bg-corp-primary/20 font-bold text-corp-primary'
  if (value > 20) return 'bg-corp-primary/10 font-medium text-corp-textPrimary'
  if (value > 5) return 'bg-corp-primary/5 font-medium text-corp-textPrimary'
  return 'bg-transparent text-corp-textSecondary'
}

export default function PdMigration() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary mb-1">PD Migration Matrix</h3>
        <p className="text-[11px] text-corp-textSecondary mb-6">12 months migration matrix (%)</p>
        
        <div className="flex relative">
          {/* Y Axis Label */}
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-bold text-corp-textSecondary uppercase tracking-widest origin-center whitespace-nowrap">
            FUTURE PD
          </div>
          
          <div className="flex-1 pl-4 overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr>
                  <th colSpan={5} className="pb-2 text-[9px] font-bold text-corp-textSecondary uppercase tracking-widest border-b border-corp-border/50">
                    CURRENT PD
                  </th>
                </tr>
                <tr>
                  <th className="py-2 px-1 text-[10px] font-semibold text-corp-textSecondary w-[20%]"></th>
                  <th className="py-2 px-1 text-[10px] font-semibold text-corp-textPrimary w-[20%]">A (≤1%)</th>
                  <th className="py-2 px-1 text-[10px] font-semibold text-corp-textPrimary w-[20%]">B (1-3%)</th>
                  <th className="py-2 px-1 text-[10px] font-semibold text-corp-textPrimary w-[20%]">C (3-10%)</th>
                  <th className="py-2 px-1 text-[10px] font-semibold text-corp-textPrimary w-[20%]">D (&gt;10%)</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={row.row}>
                    <td className="py-1.5 px-1 text-[10px] font-semibold text-corp-textPrimary text-right pr-3">
                      {row.row}
                    </td>
                    <td className="p-0.5">
                      <div className={`w-full py-1.5 rounded text-[11px] ${getHeatmapColor(row.a, i === 0)}`}>
                        {row.a === -1 ? '<1%' : `${row.a}%`}
                      </div>
                    </td>
                    <td className="p-0.5">
                      <div className={`w-full py-1.5 rounded text-[11px] ${getHeatmapColor(row.b, i === 1)}`}>
                        {row.b === -1 ? '<1%' : `${row.b}%`}
                      </div>
                    </td>
                    <td className="p-0.5">
                      <div className={`w-full py-1.5 rounded text-[11px] ${getHeatmapColor(row.c, i === 2)}`}>
                        {row.c === -1 ? '<1%' : `${row.c}%`}
                      </div>
                    </td>
                    <td className="p-0.5">
                      <div className={`w-full py-1.5 rounded text-[11px] ${getHeatmapColor(row.d, i === 3)}`}>
                        {row.d === -1 ? '<1%' : `${row.d}%`}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-6 pt-4 border-t border-corp-border">
        View full migration analysis <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
