'use client'

import React from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

const assessments = [
  { label: 'COBAC Capital Adequacy', status: 'Compliant', bg: 'bg-emerald-50', color: 'text-emerald-600', border: 'border-emerald-200' },
  { label: 'IFRS 9 Provisioning', status: 'Compliant', bg: 'bg-emerald-50', color: 'text-emerald-600', border: 'border-emerald-200' },
  { label: 'Basel III Requirements', status: 'Compliant', bg: 'bg-emerald-50', color: 'text-emerald-600', border: 'border-emerald-200' },
  { label: 'Capital Buffer', status: 'Watch', bg: 'bg-amber-50', color: 'text-amber-600', border: 'border-amber-200' },
  { label: 'Liquidity Coverage Ratio', status: 'Compliant', bg: 'bg-emerald-50', color: 'text-emerald-600', border: 'border-emerald-200' },
]

export default function RegulatoryAssessment() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm col-span-1 flex flex-col justify-between">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary uppercase tracking-wide">REGULATORY ASSESSMENT</h3>
        <p className="text-[11px] text-corp-textSecondary mb-5">Compliance under Severe Stress</p>

        <div className="space-y-4">
          {assessments.map((a, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {a.status === 'Compliant' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
                <span className="text-[11px] font-medium text-corp-textPrimary">{a.label}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${a.bg} ${a.color} ${a.border}`}>
                {a.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
