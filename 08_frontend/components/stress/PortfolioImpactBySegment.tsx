'use client'

import React from 'react'

export default function PortfolioImpactBySegment() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-2 flex flex-col justify-between">
      <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide mb-5">PORTFOLIO IMPACT BY SEGMENT</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="pb-2 border-b border-corp-border"></th>
              <th colSpan={3} className="text-center pb-2 border-b border-corp-border text-[9px] font-bold text-corp-textSecondary uppercase tracking-widest bg-gray-50/50">BASELINE</th>
              <th colSpan={3} className="text-center pb-2 border-b border-corp-border text-[9px] font-bold text-corp-textSecondary uppercase tracking-widest bg-red-50/30">SEVERE STRESS</th>
              <th colSpan={2} className="text-center pb-2 border-b border-corp-border text-[9px] font-bold text-corp-textSecondary uppercase tracking-widest">IMPACT</th>
            </tr>
            <tr className="text-[10px] font-bold text-corp-textPrimary">
              <th className="py-2 border-b border-corp-border text-corp-textSecondary">Segment</th>
              <th className="py-2 border-b border-corp-border text-center bg-gray-50/50">PD (%)</th>
              <th className="py-2 border-b border-corp-border text-center bg-gray-50/50">ECL (M XAF)</th>
              <th className="py-2 border-b border-corp-border text-center bg-gray-50/50 border-r border-corp-border">NPL (%)</th>
              <th className="py-2 border-b border-corp-border text-center bg-red-50/30">PD (%)</th>
              <th className="py-2 border-b border-corp-border text-center bg-red-50/30">ECL (M XAF)</th>
              <th className="py-2 border-b border-corp-border text-center bg-red-50/30 border-r border-corp-border">NPL (%)</th>
              <th className="py-2 border-b border-corp-border text-center">Impact (ECL)</th>
              <th className="py-2 border-b border-corp-border text-center">Δ (%)</th>
            </tr>
          </thead>
          <tbody className="text-[11px] font-medium text-corp-textPrimary">
            <tr>
              <td className="py-2.5 border-b border-corp-border font-semibold">Retail</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-gray-50/50">2.1%</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-blue-50 text-corp-textPrimary">98 M</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-gray-50/50 border-r border-corp-border">3.2%</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-amber-50">4.8%</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-amber-100 text-corp-textPrimary">176 M</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-amber-50 border-r border-corp-border">6.7%</td>
              <td className="py-2.5 border-b border-corp-border text-center font-bold text-red-500">+78 M</td>
              <td className="py-2.5 border-b border-corp-border text-center font-bold text-red-500">+79%</td>
            </tr>
            <tr>
              <td className="py-2.5 border-b border-corp-border font-semibold">SME</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-gray-50/50">3.8%</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-blue-100 text-corp-textPrimary">156 M</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-gray-50/50 border-r border-corp-border">6.1%</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-red-50">8.2%</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-red-100 text-corp-textPrimary">262 M</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-red-50 border-r border-corp-border">11.2%</td>
              <td className="py-2.5 border-b border-corp-border text-center font-bold text-red-500">+106 M</td>
              <td className="py-2.5 border-b border-corp-border text-center font-bold text-red-500">+68%</td>
            </tr>
            <tr>
              <td className="py-2.5 border-b border-corp-border font-semibold">Corporate</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-gray-50/50">1.4%</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-blue-50 text-corp-textPrimary">112 M</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-gray-50/50 border-r border-corp-border">2.5%</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-amber-50">3.1%</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-amber-100 text-corp-textPrimary">168 M</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-amber-50 border-r border-corp-border">4.6%</td>
              <td className="py-2.5 border-b border-corp-border text-center font-bold text-red-500">+56 M</td>
              <td className="py-2.5 border-b border-corp-border text-center font-bold text-red-500">+50%</td>
            </tr>
            <tr>
              <td className="py-2.5 border-b border-corp-border font-semibold">Agriculture</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-gray-50/50">5.2%</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-blue-50 text-corp-textPrimary">82 M</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-gray-50/50 border-r border-corp-border">8.4%</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-red-100">11.6%</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-red-100 text-corp-textPrimary">156 M</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-red-100 border-r border-corp-border">16.2%</td>
              <td className="py-2.5 border-b border-corp-border text-center font-bold text-red-500">+74 M</td>
              <td className="py-2.5 border-b border-corp-border text-center font-bold text-red-500">+90%</td>
            </tr>
            <tr>
              <td className="py-2.5 border-b border-corp-border font-semibold">Microfinance</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-gray-50/50">6.3%</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-blue-50 text-corp-textPrimary">48 M</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-gray-50/50 border-r border-corp-border">9.7%</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-red-100">12.3%</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-red-100 text-corp-textPrimary">78 M</td>
              <td className="py-2.5 border-b border-corp-border text-center bg-red-100 border-r border-corp-border">17.4%</td>
              <td className="py-2.5 border-b border-corp-border text-center font-bold text-red-500">+30 M</td>
              <td className="py-2.5 border-b border-corp-border text-center font-bold text-red-500">+63%</td>
            </tr>
            <tr className="font-bold">
              <td className="py-3 text-corp-textPrimary">Total</td>
              <td className="py-3 text-center">1.78%</td>
              <td className="py-3 text-center">388 M</td>
              <td className="py-3 text-center border-r border-corp-border">4.1%</td>
              <td className="py-3 text-center">4.12%</td>
              <td className="py-3 text-center">573 M</td>
              <td className="py-3 text-center border-r border-corp-border">7.8%</td>
              <td className="py-3 text-center text-red-500">+185 M</td>
              <td className="py-3 text-center text-red-500">+48%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
