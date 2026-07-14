'use client'

import React from 'react'
import { ArrowRight } from 'lucide-react'

export default function PortfolioMigrationMatrix() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-1 flex flex-col justify-between">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">PORTFOLIO MIGRATION MATRIX (12 MONTHS)</h3>
        <p className="text-[11px] text-corp-textSecondary mb-5">Exposure (M XAF)</p>

        <div className="relative mt-2">
          {/* Top Axis Label */}
          <div className="absolute -top-4 left-[40%] text-[9px] font-bold text-corp-textSecondary uppercase tracking-widest">
            CURRENT STATE
          </div>
          {/* Left Axis Label */}
          <div className="absolute top-[40%] -left-6 text-[9px] font-bold text-corp-textSecondary uppercase tracking-widest origin-center -rotate-90">
            ORIGINATION STATE
          </div>

          <table className="w-full text-right ml-4">
            <thead>
              <tr className="text-[10px] font-bold text-corp-textPrimary border-b border-corp-border">
                <th className="text-left font-semibold text-corp-textSecondary pb-2 w-[80px]"></th>
                <th className="pb-2 w-[70px]">Performing</th>
                <th className="pb-2 w-[70px]">Watchlist</th>
                <th className="pb-2 w-[70px]">NPL</th>
                <th className="pb-2 w-[70px] pl-2">Total</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-medium text-corp-textPrimary">
              <tr>
                <td className="text-left py-3 font-semibold text-corp-textPrimary border-b border-corp-border">Performing</td>
                <td className="py-3 bg-blue-100 border-b border-white font-bold text-blue-800">6,240</td>
                <td className="py-3 bg-blue-50 border-b border-white text-corp-textPrimary">620</td>
                <td className="py-3 bg-blue-50 border-b border-white text-corp-textPrimary">150</td>
                <td className="py-3 font-bold border-b border-corp-border text-corp-textSecondary">7,010</td>
              </tr>
              <tr>
                <td className="text-left py-3 font-semibold text-corp-textPrimary border-b border-corp-border">Watchlist</td>
                <td className="py-3 bg-amber-50 border-b border-white text-corp-textPrimary">480</td>
                <td className="py-3 bg-amber-100 border-b border-white font-bold text-amber-700">520</td>
                <td className="py-3 bg-amber-50 border-b border-white text-corp-textPrimary">200</td>
                <td className="py-3 font-bold border-b border-corp-border text-corp-textSecondary">1,200</td>
              </tr>
              <tr>
                <td className="text-left py-3 font-semibold text-corp-textPrimary border-b border-corp-border">NPL</td>
                <td className="py-3 bg-red-50 border-b border-white text-corp-textPrimary">120</td>
                <td className="py-3 bg-red-50 border-b border-white text-corp-textPrimary">180</td>
                <td className="py-3 bg-red-100 border-b border-white font-bold text-red-700">190</td>
                <td className="py-3 font-bold border-b border-corp-border text-corp-textSecondary">490</td>
              </tr>
              <tr className="font-bold text-[12px]">
                <td className="text-left py-3 text-corp-textSecondary">Total</td>
                <td className="py-3 text-corp-textPrimary">6,840</td>
                <td className="py-3 text-corp-textPrimary">1,320</td>
                <td className="py-3 text-corp-textPrimary">540</td>
                <td className="py-3 text-corp-textPrimary">8,700</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-5 pt-4 border-t border-corp-border">
        View full migration analysis <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
