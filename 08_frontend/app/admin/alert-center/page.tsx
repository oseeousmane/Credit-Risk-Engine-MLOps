'use client'

import * as React from 'react'
import { SectionHeader, StatusBadge } from '@/components/ui'
import { AlertCircle, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react'

export default function AlertCenterPage() {
  const mockAlerts = [
    { id: 1, type: 'CRITICAL', msg: 'Stage 3 Migration Breach - Apex Retail', time: '10 mins ago' },
    { id: 2, type: 'WARNING', msg: 'Model Drift Warning: LGD Retail Model', time: '1 hour ago' },
    { id: 3, type: 'INFO', msg: 'System Backup Completed successfully', time: '4 hours ago' }
  ]

  return (
    <div className="p-6 space-y-6 page-enter pb-10">
      <SectionHeader title="Alert Center" subtitle="Real-time system events, compliance breaches, and threshold alerts." />
      
      <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-xl overflow-hidden mt-8">
        <div className="p-4 border-b border-white/[0.06] bg-white/[0.02]">
          <h2 className="text-sm font-bold text-white">Active Alerts</h2>
        </div>
        <div className="p-2 space-y-2">
           {mockAlerts.map(a => (
             <div key={a.id} className="flex items-center justify-between p-4 bg-[#141414] hover:bg-white/[0.05] rounded-lg border border-white/[0.04] transition-colors">
               <div className="flex items-center gap-4">
                 {a.type === 'CRITICAL' && <ShieldAlert className="w-5 h-5 text-rose-400" />}
                 {a.type === 'WARNING' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                 {a.type === 'INFO' && <AlertCircle className="w-5 h-5 text-blue-400" />}
                 <div>
                   <div className="text-sm font-semibold text-white">{a.msg}</div>
                   <div className="text-xs text-zinc-500 mt-0.5">{a.time}</div>
                 </div>
               </div>
               <button className="text-xs font-semibold text-zinc-400 hover:text-white bg-white/[0.05] px-3 py-1.5 rounded-lg border border-white/[0.1] transition-colors">Acknowledge</button>
             </div>
           ))}
        </div>
      </div>
    </div>
  )
}
