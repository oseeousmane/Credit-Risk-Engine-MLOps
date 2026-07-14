'use client'

import React from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

const recommendations = [
  { text: "Réduire l'exposition sur le secteur Construction" },
  { text: "Renforcer le provisionnement sur le segment PME" },
  { text: "Réviser les hypothèses macroéconomiques utilisées" },
  { text: "Maintenir un buffer réglementaire supérieur à 2%" },
  { text: "Renforcer le monitoring des secteurs sensibles" },
]

export default function StressRecommendations() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-1 flex flex-col justify-between">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">EXECUTIVE RECOMMENDATIONS</h3>
        <p className="text-[11px] text-corp-textSecondary mb-5">AI-powered recommendations</p>

        <div className="space-y-3.5">
          {recommendations.map((rec, i) => (
            <div key={i} className="flex gap-2.5 items-start">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] font-bold text-corp-textPrimary leading-snug">{rec.text}</div>
            </div>
          ))}
        </div>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-5 pt-4 border-t border-corp-border">
        Voir toutes les recommandations <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
