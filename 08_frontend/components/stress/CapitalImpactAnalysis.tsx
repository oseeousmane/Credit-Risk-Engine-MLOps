'use client'

import React from 'react'

export default function CapitalImpactAnalysis() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-1 flex flex-col justify-between">
      <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide mb-6">CAPITAL IMPACT ANALYSIS</h3>
      
      <div className="flex justify-between items-start mb-2 px-2">
        <div className="text-center">
          <div className="text-[10px] font-bold text-corp-textSecondary mb-1">BEFORE STRESS</div>
          <div className="text-[20px] font-black text-corp-textPrimary leading-none">15.2%</div>
          <div className="text-[10px] font-medium text-corp-textSecondary mt-1">CAR</div>
        </div>

        {/* Gauge Chart SVG */}
        <div className="relative w-32 h-16 flex justify-center -mt-2">
          <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
            {/* Background Arc */}
            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#F1F5F9" strokeWidth="16" strokeLinecap="round" />
            
            {/* Colored Segments */}
            {/* Red (0-8) -> 8% */}
            {/* Orange (8-10.5) -> 2.5% */}
            {/* Green (10.5+) */}
            {/* To keep it simple, let's just make it a gradient or 3 segments */}
            <path d="M 10 50 A 40 40 0 0 1 30 20" fill="none" stroke="#EF4444" strokeWidth="16" />
            <path d="M 30 20 A 40 40 0 0 1 50 10" fill="none" stroke="#F59E0B" strokeWidth="16" />
            <path d="M 50 10 A 40 40 0 0 1 90 50" fill="none" stroke="#10B981" strokeWidth="16" />
            
            {/* Regulatory Minimum Line at 10.5% (approx middle) */}
            <line x1="50" y1="10" x2="50" y2="2" stroke="#1E293B" strokeWidth="2" strokeDasharray="2 2" />
            
            {/* Needle (pointing to 13.8%) */}
            <g transform="rotate(50, 50, 50)">
              <polygon points="48,50 52,50 50,15" fill="#1E293B" />
              <circle cx="50" cy="50" r="4" fill="#1E293B" />
            </g>
          </svg>
          <div className="absolute -bottom-8 text-center w-full">
            <div className="text-[9px] font-bold text-corp-textSecondary">Regulatory Minimum</div>
            <div className="text-[11px] font-black text-corp-textPrimary">10.5%</div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-[10px] font-bold text-corp-textSecondary mb-1">AFTER SEVERE STRESS</div>
          <div className="text-[20px] font-black text-corp-textPrimary leading-none">13.8%</div>
          <div className="text-[10px] font-medium text-corp-textSecondary mt-1">CAR</div>
        </div>
      </div>

      <div className="mt-14 pt-4 border-t border-corp-border flex justify-between">
        <div className="text-center">
          <div className="text-[10px] font-bold text-corp-textSecondary mb-1">BUFFER BEFORE</div>
          <div className="text-[14px] font-black text-emerald-500">5.1%</div>
        </div>
        <div className="text-center border-x border-corp-border px-8">
          <div className="text-[10px] font-bold text-corp-textSecondary mb-1">Δ BUFFER</div>
          <div className="text-[14px] font-black text-red-500">-3.0pp</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-bold text-corp-textSecondary mb-1">BUFFER AFTER</div>
          <div className="text-[14px] font-black text-amber-500">2.1%</div>
        </div>
      </div>
    </div>
  )
}
