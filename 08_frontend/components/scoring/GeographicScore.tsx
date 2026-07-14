'use client'

import React from 'react'
import { ArrowRight } from 'lucide-react'

const countries = [
  { name: 'Cameroun', score: 684, count: '6 720', color: '#1D4ED8' },
  { name: 'Gabon', score: 691, count: '2 312', color: '#16A34A' },
  { name: 'Congo', score: 671, count: '1 815', color: '#F59E0B' },
  { name: 'Tchad', score: 658, count: '1 134', color: '#DC2626' },
  { name: 'RCA', score: 642, count: '845', color: '#8B5CF6' },
  { name: 'Guinée Équatoriale', score: 689, count: '221', color: '#EC4899' },
]

export default function GeographicScore() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-2 flex flex-col justify-between">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">GEOGRAPHIC SCORE ANALYSIS</h3>
        <p className="text-[11px] text-corp-textSecondary mb-5">Score moyen par pays (Nombre d'applications)</p>

        <div className="grid grid-cols-2 gap-6 items-center">
          {/* CEMAC Region Map - Styled like the mockup */}
          <div className="relative flex items-center justify-center pl-2">
            <svg viewBox="0 0 400 350" className="w-full h-auto max-h-[180px]">
              {/* Other countries / surrounding landmass (light grey/beige) */}
              <path d="M50,150 L100,100 L200,80 L280,110 L350,140 L380,220 L330,300 L250,330 L150,300 L80,260 Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
              
              {/* Tchad (Grey) */}
              <path d="M180,80 L280,110 L300,160 L240,200 L180,180 L160,130 Z" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />
              
              {/* RCA (Grey) */}
              <path d="M240,200 L300,160 L350,200 L330,260 L280,240 L250,220 Z" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />
              
              {/* Congo (Grey) */}
              <path d="M190,260 L280,240 L260,300 L200,320 L170,290 Z" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />

              {/* Cameroun (Blue) */}
              <path d="M160,130 L180,180 L240,200 L250,220 L190,260 L140,230 L120,170 Z" fill="#1D4ED8" fillOpacity="0.8" stroke="#FFFFFF" strokeWidth="1.5" />
              
              {/* Gabon (Green) */}
              <path d="M140,230 L190,260 L170,290 L130,280 L100,250 Z" fill="#16A34A" fillOpacity="0.8" stroke="#FFFFFF" strokeWidth="1.5" />

              {/* Guinée Équatoriale (Grey) */}
              <path d="M100,250 L130,280 L110,310 L80,280 Z" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />
            </svg>
          </div>

          {/* Country Data Table */}
          <div className="space-y-3.5">
            {countries.map((c) => (
              <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-[12px] font-medium text-corp-textPrimary">{c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-black text-corp-textPrimary tabular-nums">{c.score}</span>
                  <span className="text-[10px] text-corp-textSecondary font-medium">({c.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-5 pt-4 border-t border-corp-border">
        Voir l'analyse géographique <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
