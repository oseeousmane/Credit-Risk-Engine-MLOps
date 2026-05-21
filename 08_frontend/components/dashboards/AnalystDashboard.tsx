'use client'
import * as React from 'react'
import { Activity, Clock, CheckCircle2, ChevronRight, FileText, AlertCircle, Play } from 'lucide-react'
import { SectionHeader, KPIBlock, AlertBlock, Btn, StatusBadge } from '@/components/ui'
import Link from 'next/link'
import { motion } from 'framer-motion'

export function AnalystDashboard() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  } as const

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0, duration: 0.5 } }
  } as const

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-6 space-y-6 pb-10">
      <SectionHeader
        title="My Queue"
        subtitle="OPERATIONAL PIPELINE"
        actions={
          <Btn variant="primary" size="md" className="group">
            <Play className="w-3.5 h-3.5 fill-current" /> Start Next Priority Case
          </Btn>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <KPIBlock label="Assigned Cases" value="14" accent="blue">
            <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> 4 priority cases
            </div>
          </KPIBlock>
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPIBlock label="Pending Documents" value="6" accent="amber">
             <div className="text-[11px] text-zinc-500 mt-1">Awaiting client uploads via portal</div>
          </KPIBlock>
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPIBlock label="Pending My Decision" value="3" accent="emerald">
             <div className="text-[11px] text-zinc-500 mt-1 text-emerald-400 font-medium">Ready for Scoring</div>
          </KPIBlock>
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPIBlock label="SLA Warning" value="2" accent="rose">
             <div className="text-[11px] text-zinc-500 mt-1 text-rose-400">&lt; 24h to target decision</div>
          </KPIBlock>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
           <div className="flex justify-between items-center">
             <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Urgent Cases (SLA &lt; 48H)</h3>
             <span className="text-[10px] font-bold text-[#3ECF8E] bg-[#3ECF8E]/10 px-2 py-0.5 rounded uppercase tracking-widest">SORTED BY PRIORITY</span>
           </div>
           <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-xl overflow-hidden">
             {[
               { id: 'APP-2026-782', name: 'TechLogix GmbH', stage: 'Required Documents', sla: '6 hrs', urgent: true, p: 1 },
               { id: 'APP-2026-801', name: 'Alpha Minerals Ltd', stage: 'Scoring Ready', sla: '14 hrs', urgent: true, p: 2 },
               { id: 'APP-2026-804', name: 'Blue Horizon Logistics', stage: 'KYC Validation', sla: '22 hrs', urgent: false, p: 3 },
             ].map((app, i) => (
                <Link key={i} href="/pipeline" className="flex items-center justify-between p-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors group relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-[#3ECF8E] transition-colors" />
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-8">
                       <span className="text-[10px] text-zinc-600 font-bold">#{app.p}</span>
                    </div>
                    <div className={`w-10 h-10 rounded-xl bg-[#111] border border-white/[0.08] flex items-center justify-center shadow-inner ${app.urgent ? 'shadow-[inset_0_0_10px_rgba(244,63,94,0.1)]' : ''}`}>
                       <FileText className={`w-4 h-4 ${app.urgent ? 'text-rose-400' : 'text-blue-400'}`} />
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-white mb-0.5 group-hover:text-[#3ECF8E] transition-colors">{app.name}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{app.id} <span className="mx-1">•</span> {app.stage}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md border ${app.urgent ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.15)]' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                      <Clock className="w-3 h-3" /> {app.sla} left
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-[#3ECF8E] transition-colors" />
                  </div>
                </Link>
             ))}
           </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-4">
           <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Action Required</h3>
           <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-xl p-6 space-y-4">
             <AlertBlock severity="WARNING" title="Missing Financials" body="Alpha Minerals Q1 2026 accounts not yet uploaded." />
             <AlertBlock severity="INFO" title="Policy Update" body="New thresholds active for short-term trade finance limits." />
           </div>
           
           <div className="bg-[#3ECF8E]/5 border border-[#3ECF8E]/20 rounded-xl p-5 relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-[#3ECF8E]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
             <h4 className="text-[11px] font-bold text-[#3ECF8E] uppercase tracking-widest mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Ready for Booking
             </h4>
             <p className="text-sm font-medium text-white">Global Ports PLC</p>
             <p className="text-xs text-zinc-400 mt-1">Approved by committee. Awaiting final signature.</p>
             <button className="mt-4 w-full bg-[#3ECF8E]/10 hover:bg-[#3ECF8E]/20 text-[#3ECF8E] text-[12px] font-bold py-2 rounded-lg transition-colors border border-[#3ECF8E]/30">
                Review Documents
             </button>
           </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
