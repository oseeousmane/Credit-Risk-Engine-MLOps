'use client'

import React from 'react'
import { ArrowRight, Target, ShieldCheck, Users, CheckCircle2 } from 'lucide-react'

const recommendations = [
  { 
    title: 'Renforcer le suivi du secteur Construction (BTP)', 
    desc: "Hausse significative de l'ECL et du risque de défaut.", 
    icon: Target, 
    bg: 'bg-emerald-50', 
    color: 'text-emerald-600' 
  },
  { 
    title: "Maintenir les limites d'exposition sur le segment Corporate", 
    desc: 'Concentrations globales sous contrôle.', 
    icon: ShieldCheck, 
    bg: 'bg-blue-50', 
    color: 'text-blue-600' 
  },
  { 
    title: "Revoir l'appétit au risque sur le segment PME", 
    desc: 'Croissance plus rapide que la moyenne du portefeuille.', 
    icon: Users, 
    bg: 'bg-amber-50', 
    color: 'text-amber-600' 
  },
  { 
    title: 'Maintenir la couverture IFRS 9 actuelle', 
    desc: 'Le ratio de couverture est dans les bonnes pratiques.', 
    icon: CheckCircle2, 
    bg: 'bg-emerald-50', 
    color: 'text-emerald-600' 
  },
]

export default function ExecutiveRecommendations() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-1 flex flex-col justify-between">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">EXECUTIVE RECOMMENDATIONS</h3>
        <p className="text-[11px] text-corp-textSecondary mb-5">AI-powered insights and recommendations</p>

        <div className="space-y-4">
          {recommendations.map((rec, i) => (
            <div key={i} className="flex gap-3">
              <div className={`w-8 h-8 rounded-full ${rec.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <rec.icon className={`w-4 h-4 ${rec.color}`} />
              </div>
              <div>
                <div className="text-[12px] font-bold text-corp-textPrimary mb-0.5 leading-tight">{rec.title}</div>
                <div className="text-[11px] text-corp-textSecondary leading-snug">{rec.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-5 pt-4 border-t border-corp-border">
        View all recommendations <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
