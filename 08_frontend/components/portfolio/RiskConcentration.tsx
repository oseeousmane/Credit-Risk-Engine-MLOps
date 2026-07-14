'use client'

import React from 'react'
import { Building2, ShoppingCart, Truck, Leaf, Factory, LayoutGrid } from 'lucide-react'

const sectors = [
  { name: 'Commerce', icon: ShoppingCart, exposure: '2.0', share: 24, color: '#1D4ED8' },
  { name: 'Construction (BTP)', icon: Building2, exposure: '1.5', share: 18, color: '#10B981' },
  { name: 'Transport', icon: Truck, exposure: '1.3', share: 15, color: '#F59E0B' },
  { name: 'Agriculture', icon: Leaf, exposure: '1.0', share: 12, color: '#8B5CF6' },
  { name: 'Industry', icon: Factory, exposure: '0.8', share: 10, color: '#06B6D4' },
  { name: 'Others', icon: LayoutGrid, exposure: '1.8', share: 21, color: '#94A3B8' },
]

export default function RiskConcentration() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm">
      <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">RISK CONCENTRATION BY SECTOR</h3>
      <p className="text-[11px] text-corp-textSecondary mb-4">Exposure concentration (%)</p>

      <div className="flex text-[10px] font-bold text-corp-textSecondary mb-3 border-b border-corp-border pb-2">
        <div className="flex-1">Sector</div>
        <div className="w-[80px] text-right">Exposure</div>
        <div className="w-[60px] text-right">Share</div>
      </div>

      <div className="space-y-3.5">
        {sectors.map((s) => (
          <div key={s.name} className="flex items-center">
            {/* Sector Name & Icon */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <s.icon className="w-3.5 h-3.5 text-corp-textSecondary flex-shrink-0" />
              <span className="text-[11px] font-medium text-corp-textPrimary truncate mr-4">{s.name}</span>
            </div>
            
            {/* Bar */}
            <div className="w-[100px] bg-gray-100 rounded-full h-[6px] mr-4 flex-shrink-0">
              <div
                className="h-full rounded-full"
                style={{ width: `${s.share}%`, backgroundColor: s.color }}
              />
            </div>

            {/* Values */}
            <div className="flex items-center justify-end">
              <span className="w-[60px] text-[11px] font-bold text-corp-textPrimary text-right">
                {s.exposure} <span className="text-[9px] font-semibold text-corp-textSecondary">Md</span>
              </span>
              <span className="w-[40px] text-[11px] font-bold text-corp-textPrimary text-right">
                {s.share}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-corp-border pt-3 mt-4">
        <span className="text-[12px] font-bold text-corp-textPrimary">Total</span>
        <div className="flex gap-4">
          <span className="text-[12px] font-bold text-corp-textPrimary mr-4">8.5 Md</span>
          <span className="text-[12px] font-bold text-corp-textPrimary w-[40px] text-right">100%</span>
        </div>
      </div>
    </div>
  )
}
