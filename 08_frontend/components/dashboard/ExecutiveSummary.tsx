import React from 'react'
import { Activity, ClipboardCheck } from 'lucide-react'

export default function ExecutiveSummary() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-6 shadow-sm mt-4">
      <h2 className="text-[11px] font-bold text-corp-textPrimary uppercase tracking-wider mb-4">
        EXECUTIVE RISK SUMMARY
      </h2>
      
      <div className="grid grid-cols-4 gap-6">
        {/* Column 1: Portfolio Health */}
        <div className="flex items-center gap-4 border-r border-corp-border pr-6">
          <div className="w-12 h-12 rounded-full bg-corp-success/10 flex items-center justify-center border border-corp-success/20">
            <Activity className="w-6 h-6 text-corp-success" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-corp-textSecondary uppercase tracking-wide">
              PORTFOLIO HEALTH
            </div>
            <div className="text-3xl font-black text-corp-success tracking-tight mt-0.5">
              GOOD
            </div>
          </div>
        </div>

        {/* Column 2: Bullet points 1 */}
        <div className="flex flex-col justify-center space-y-2.5">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-corp-success mt-1.5 flex-shrink-0" />
            <span className="text-[13px] font-medium text-corp-textPrimary">PD moyen stable à 1.78%</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-corp-success mt-1.5 flex-shrink-0" />
            <span className="text-[13px] font-medium text-corp-textPrimary">ECL en baisse de 3.5%</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-corp-success mt-1.5 flex-shrink-0" />
            <span className="text-[13px] font-medium text-corp-textPrimary">Aucun dépassement majeur de l'appétit au risque</span>
          </div>
        </div>

        {/* Column 3: Bullet points 2 */}
        <div className="flex flex-col justify-center space-y-2.5 border-r border-corp-border pr-6">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-corp-success mt-1.5 flex-shrink-0" />
            <span className="text-[13px] font-medium text-corp-textPrimary">IFRS 9 conforme</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-corp-success mt-1.5 flex-shrink-0" />
            <span className="text-[13px] font-medium text-corp-textPrimary">Surveillance renforcée du segment PME</span>
          </div>
        </div>

        {/* Column 4: Recommendation */}
        <div className="flex gap-4">
          <div className="mt-0.5 w-10 h-10 rounded-lg flex items-center justify-center">
            <ClipboardCheck className="w-8 h-8 text-gray-400 stroke-[1.5]" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-corp-textSecondary uppercase tracking-wide mb-1.5">
              RECOMMENDATION
            </div>
            <p className="text-[13px] font-medium text-corp-textPrimary leading-relaxed">
              Maintenir la stratégie actuelle tout en renforçant le monitoring des secteurs à forte volatilité.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
