'use client'

import React from 'react'
import { ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react'

const alerts = [
  { message: 'Hausse du taux de défaut sur le segment PME', status: 'Watch', statusColor: 'text-corp-warning', statusBg: 'bg-amber-50 border-amber-200' },
  { message: 'Drift détecté sur la variable Revenu Annuel', status: 'Watch', statusColor: 'text-corp-warning', statusBg: 'bg-amber-50 border-amber-200' },
  { message: 'Modèle conforme aux seuils de performance', status: 'OK', statusColor: 'text-corp-success', statusBg: 'bg-green-50 border-green-200' },
  { message: 'Calibration du modèle stable', status: 'OK', statusColor: 'text-corp-success', statusBg: 'bg-green-50 border-green-200' },
]

export default function MonitoringAlerts() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">MONITORING ALERTS</h3>
        <p className="text-[11px] text-corp-textSecondary mb-5">Alertes et monitoring du modèle</p>

        <div className="space-y-3">
          {alerts.map((a, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {a.status === 'Watch' ? (
                  <AlertTriangle className="w-4 h-4 text-corp-warning flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-corp-success flex-shrink-0" />
                )}
                <span className="text-[12px] font-medium text-corp-textPrimary truncate">{a.message}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${a.statusBg} ${a.statusColor} flex-shrink-0`}>
                {a.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-5 pt-4 border-t border-corp-border">
        Voir toutes les alertes <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
