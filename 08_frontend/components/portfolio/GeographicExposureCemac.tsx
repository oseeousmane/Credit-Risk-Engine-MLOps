'use client'

import React from 'react'

const countries = [
  { name: 'Cameroun', exposure: '4.4', share: '52%', color: '#1D4ED8' },
  { name: 'Gabon', exposure: '1.5', share: '18%', color: '#16A34A' },
  { name: 'Congo', exposure: '1.2', share: '14%', color: '#F59E0B' },
  { name: 'Tchad', exposure: '0.8', share: '9%', color: '#DC2626' },
  { name: 'RCA', exposure: '0.4', share: '5%', color: '#8B5CF6' },
  { name: 'Guinée Équatoriale', exposure: '0.2', share: '2%', color: '#EC4899' },
]

export default function GeographicExposureCemac() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-1 flex flex-col justify-between">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">GEOGRAPHIC EXPOSURE (CEMAC)</h3>
        
        <div className="grid grid-cols-2 gap-4 items-center mt-4">
          {/* CEMAC Map SVG */}
          <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 400 350" className="w-full h-auto max-h-[160px]">
              {/* Other countries / surrounding landmass (light grey/beige) */}
              <path d="M50,150 L100,100 L200,80 L280,110 L350,140 L380,220 L330,300 L250,330 L150,300 L80,260 Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
              
              {/* Tchad (Grey) */}
              <path d="M180,80 L280,110 L300,160 L240,200 L180,180 L160,130 Z" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />
              
              {/* RCA (Grey) */}
              <path d="M240,200 L300,160 L350,200 L330,260 L280,240 L250,220 Z" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />
              
              {/* Congo (Grey) */}
              <path d="M190,260 L280,240 L260,300 L200,320 L170,290 Z" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />

              {/* Cameroun (Blue) */}
              <path d="M160,130 L180,180 L240,200 L250,220 L190,260 L140,230 L120,170 Z" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="1" />
              
              {/* Gabon (Green) */}
              <path d="M140,230 L190,260 L170,290 L130,280 L100,250 Z" fill="#A7F3D0" stroke="#10B981" strokeWidth="1" />

              {/* Guinée Équatoriale (Grey) */}
              <path d="M100,250 L130,280 L110,310 L80,280 Z" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />
            </svg>
          </div>

          {/* Country Data Table */}
          <div className="space-y-3">
            {countries.map((c) => (
              <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-[11px] font-medium text-corp-textPrimary">{c.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-corp-textPrimary">{c.exposure} Md</span>
                  <span className="text-[11px] font-bold text-corp-textPrimary w-8 text-right">{c.share}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-corp-border pt-2 mt-4 ml-[50%] pl-4">
            <span className="text-[11px] font-bold text-corp-textPrimary">Total</span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-corp-textPrimary">8.5 Md</span>
              <span className="text-[11px] font-bold text-corp-textPrimary w-8 text-right">100%</span>
            </div>
        </div>
      </div>
    </div>
  )
}
