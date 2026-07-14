'use client'

import React from 'react'

const countries = [
  { name: 'Cameroon', color: '#10B981', impact: '+56%', level: 'High', levelColor: 'text-red-500' },
  { name: 'Gabon', color: '#F59E0B', impact: '+41%', level: 'High', levelColor: 'text-red-500' },
  { name: 'Congo', color: '#F59E0B', impact: '+40%', level: 'High', levelColor: 'text-red-500' },
  { name: 'Chad', color: '#DC2626', impact: '+62%', level: 'Very High', levelColor: 'text-red-600' },
  { name: 'Central African Rep.', color: '#DC2626', impact: '+75%', level: 'Very High', levelColor: 'text-red-600' },
  { name: 'Equatorial Guinea', color: '#10B981', impact: '+30%', level: 'Medium', levelColor: 'text-amber-500' },
]

export default function GeographicImpact() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-1 flex flex-col justify-between">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">GEOGRAPHIC IMPACT (SEVERE STRESS)</h3>
        <p className="text-[11px] text-corp-textSecondary mb-4">Increase in ECL by Country</p>
        
        <div className="flex gap-4 items-center">
          {/* CEMAC Map SVG (Heatmap Colors) */}
          <div className="relative flex-1 flex items-center justify-center">
            <svg viewBox="0 0 400 350" className="w-full h-auto max-h-[160px]">
              {/* Surrounding landmass (light grey/beige) */}
              <path d="M50,150 L100,100 L200,80 L280,110 L350,140 L380,220 L330,300 L250,330 L150,300 L80,260 Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
              
              {/* Chad (Red) */}
              <path d="M180,80 L280,110 L300,160 L240,200 L180,180 L160,130 Z" fill="#FCA5A5" stroke="#DC2626" strokeWidth="1" />
              
              {/* RCA (Red) */}
              <path d="M240,200 L300,160 L350,200 L330,260 L280,240 L250,220 Z" fill="#FCA5A5" stroke="#DC2626" strokeWidth="1" />
              
              {/* Congo (Yellow) */}
              <path d="M190,260 L280,240 L260,300 L200,320 L170,290 Z" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1" />

              {/* Cameroon (Green) */}
              <path d="M160,130 L180,180 L240,200 L250,220 L190,260 L140,230 L120,170 Z" fill="#A7F3D0" stroke="#10B981" strokeWidth="1" />
              
              {/* Gabon (Yellow) */}
              <path d="M140,230 L190,260 L170,290 L130,280 L100,250 Z" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1" />

              {/* Guinée Équatoriale (Green) */}
              <path d="M100,250 L130,280 L110,310 L80,280 Z" fill="#A7F3D0" stroke="#10B981" strokeWidth="1" />
            </svg>
          </div>

          {/* Country Data Table */}
          <div className="flex-1">
            <div className="flex text-[9px] font-bold text-corp-textSecondary border-b border-corp-border pb-2 mb-2">
              <div className="flex-1">Country</div>
              <div className="w-[50px] text-center">ECL Impact</div>
              <div className="w-[60px] text-right">Level</div>
            </div>
            <div className="space-y-2.5">
              {countries.map((c) => (
                <div key={c.name} className="flex items-center">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-[10px] font-medium text-corp-textPrimary truncate pr-2">{c.name}</span>
                  </div>
                  <div className="w-[50px] text-[10px] font-bold text-corp-textPrimary text-center">
                    {c.impact}
                  </div>
                  <div className={`w-[60px] text-[10px] font-bold text-right ${c.levelColor}`}>
                    {c.level}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
