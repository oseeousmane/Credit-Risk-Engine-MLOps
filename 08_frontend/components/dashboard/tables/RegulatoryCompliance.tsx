import React from 'react'
import { ArrowRight } from 'lucide-react'

const complianceItems = [
  { name: 'COBAC R-2010/01', status: 'Compliant', type: 'success' },
  { name: 'IFRS 9', status: 'Compliant', type: 'success' },
  { name: 'Basel III Pillar 2', status: 'Under Review', type: 'warning' },
  { name: 'Model Validation', status: 'Approved', type: 'success' },
]

export default function RegulatoryCompliance() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm flex flex-col justify-between h-full">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary mb-1">Regulatory Compliance Center</h3>
        <p className="text-[11px] text-corp-textSecondary mb-6">Compliance status overview</p>
        
        <div className="space-y-4">
          {complianceItems.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${item.type === 'success' ? 'bg-corp-success' : 'bg-corp-warning'}`} />
                <span className="text-[12px] font-medium text-corp-textPrimary">{item.name}</span>
              </div>
              
              {item.status === 'Compliant' ? (
                <div className="px-2 py-1 rounded text-[10px] font-bold bg-corp-success/10 text-corp-success border border-corp-success/20">
                  {item.status}
                </div>
              ) : (
                <div className={`text-[11px] font-bold ${
                  item.type === 'success' ? 'text-corp-success' : 'text-corp-warning'
                }`}>
                  {item.status}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-6 pt-4 border-t border-corp-border">
        View compliance center <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
