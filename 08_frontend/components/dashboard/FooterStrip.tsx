import React from 'react'
import { CheckCircle2, ShieldCheck, Database, FileBarChart, Users, Clock } from 'lucide-react'

export default function FooterStrip() {
  return (
    <div className="bg-white border-t border-corp-border flex items-center justify-between px-6 py-4 flex-shrink-0 mt-8 mb-4 rounded-xl shadow-sm mx-1">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-corp-primary" />
        <div>
          <div className="text-[14px] font-black text-corp-textPrimary tracking-tight">247</div>
          <div className="text-[10px] text-corp-textSecondary font-medium">Active Exposures</div>
        </div>
      </div>

      <div className="w-px h-8 bg-corp-border" />

      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-corp-primary" />
        <div>
          <div className="text-[14px] font-black text-corp-textPrimary tracking-tight">32</div>
          <div className="text-[10px] text-corp-textSecondary font-medium">Approved Models</div>
        </div>
      </div>

      <div className="w-px h-8 bg-corp-border" />

      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-corp-primary" />
        <div>
          <div className="text-[14px] font-black text-corp-textPrimary tracking-tight">18</div>
          <div className="text-[10px] text-corp-textSecondary font-medium">Users Online</div>
        </div>
      </div>

      <div className="w-px h-8 bg-corp-border" />

      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6 text-corp-primary" />
        <div>
          <div className="text-[14px] font-black text-corp-textPrimary tracking-tight">02:35 PM</div>
          <div className="text-[10px] text-corp-textSecondary font-medium">Last Data Refresh</div>
        </div>
      </div>

      <div className="w-px h-8 bg-corp-border" />

      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-6 h-6 text-corp-success" />
        <div>
          <div className="text-[14px] font-black text-corp-textPrimary tracking-tight">99.8%</div>
          <div className="text-[10px] text-corp-textSecondary font-medium">Platform Availability</div>
        </div>
      </div>

      <div className="w-px h-8 bg-corp-border" />

      <div className="flex items-center gap-3">
        <FileBarChart className="w-6 h-6 text-corp-primary" />
        <div>
          <div className="text-[14px] font-black text-corp-textPrimary tracking-tight">100%</div>
          <div className="text-[10px] text-corp-textSecondary font-medium">COBAC Compliance Coverage</div>
        </div>
      </div>
    </div>
  )
}
