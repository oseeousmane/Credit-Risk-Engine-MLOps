import React from 'react'
import { ArrowRight, Activity, Calculator, Database, FlaskConical } from 'lucide-react'

const activityLog = [
  { action: 'Model monitoring completed', time: '2 min ago', icon: Activity },
  { action: 'IFRS 9 calculation completed', time: '15 min ago', icon: Calculator },
  { action: 'New exposures imported', time: '1 hour ago', icon: Database },
  { action: 'Stress test scenario updated', time: '3 hours ago', icon: FlaskConical },
]

export default function ActivityTimeline() {
  return (
    <div className="bg-corp-card border border-corp-border rounded-xl p-5 shadow-sm flex flex-col justify-between h-full">
      <div>
        <h3 className="text-[13px] font-bold text-corp-textPrimary mb-1 uppercase tracking-wide">ACTIVITY & UPDATES</h3>
        <p className="text-[11px] text-corp-textSecondary mb-6">Recent system activity</p>
        
        <div className="space-y-4">
          {activityLog.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-corp-primary/10 flex items-center justify-center border border-corp-primary/20">
                  <item.icon className="w-3 h-3 text-corp-primary" />
                </div>
                <span className="text-[12px] font-medium text-corp-textPrimary">{item.action}</span>
              </div>
              <span className="text-[11px] text-corp-textSecondary">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="flex items-center justify-center w-full gap-1.5 text-[11px] font-bold text-corp-primary hover:text-corp-primary/80 transition-colors mt-6 pt-4 border-t border-corp-border">
        View all activity <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
