'use client'
import * as React from 'react'
import { Activity, Clock, ShieldCheck, Users, ChevronRight, BarChart3, AlertTriangle, TrendingDown } from 'lucide-react'
import { SectionHeader, KPIBlock, AlertBlock, Btn, ProgressBar } from '@/components/ui'
import Link from 'next/link'
import { motion } from 'framer-motion'

export function ManagerDashboard() {
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
        title="Team Oversight"
        subtitle="OPERATIONAL PERFORMANCE & SUPERVISION"
        actions={
          <div className="flex gap-3">
            <Btn variant="secondary" size="md">
              <BarChart3 className="w-3.5 h-3.5" /> Performance Report
            </Btn>
            <Btn variant="primary" size="md">
              <Users className="w-3.5 h-3.5" /> Manage Load
            </Btn>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <KPIBlock label="Total Team Backlog" value="42" accent="blue">
             <div className="text-[11px] text-zinc-500 mt-1">Across 3 active analysts</div>
          </KPIBlock>
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPIBlock label="Required Approvals" value="8" accent="purple">
             <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" /> 2 escalations pending
             </div>
          </KPIBlock>
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPIBlock label="SLA Breaches" value="1" accent="rose">
             <div className="text-[11px] text-zinc-500 mt-1 text-rose-400 font-medium">Critical attention required</div>
          </KPIBlock>
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPIBlock label="Avg Processing Time" value="1.4d" accent="emerald" delta={-0.2} deltaLabel="d vs last week">
             <div className="text-[11px] text-zinc-500 mt-1 capitalize text-emerald-400 font-medium">Beating Target: 2.0d</div>
          </KPIBlock>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
           <div className="flex items-center justify-between">
             <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Escalations & Approvals Queue</h3>
             <span className="text-[10px] bg-white/[0.05] text-zinc-400 px-2 py-0.5 rounded border border-white/[0.1]">LIVE FEED</span>
           </div>
           <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-xl overflow-hidden">
             {[
               { id: 'APP-2026-785', name: 'Zeta Constructors', type: 'Escalation', reason: 'High PD (3.8%) - Near Limit', assignee: 'JD' },
               { id: 'APP-2026-680', name: 'Global Ports PLC', type: 'Approval', reason: 'Committee Ready', assignee: 'MK' },
               { id: 'APP-2026-793', name: 'Northern Telecom', type: 'SLA Breach', reason: 'Stuck in KYC for 55h', assignee: 'JD' },
             ].map((app, i) => (
                <Link key={i} href="/pipeline" className="flex items-center justify-between p-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.04] transition-colors group relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-brand-400 transition-colors" />
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center border border-white/[0.1] text-[10px] font-bold text-white shadow-md">
                       {app.assignee}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-white mb-0.5">{app.name}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{app.id} <span className="mx-1">•</span> {app.reason}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                      app.type === 'Escalation' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.15)]' 
                      : app.type === 'SLA Breach' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.15)]'
                      : 'bg-purple-500/10 border-purple-500/20 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
                    }`}>
                      {app.type}
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-brand-400 transition-colors" />
                  </div>
                </Link>
             ))}
           </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-4">
           <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Pipeline Velocity & Load</h3>
           <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-xl p-6">
              <div className="space-y-5">
                {[
                  { stage: 'KYC & Data Val', count: 18, pct: 45, color: 'bg-blue-500' },
                  { stage: 'Scoring', count: 12, pct: 30, color: 'bg-brand-400' },
                  { stage: 'Committee Review', count: 8, pct: 20, color: 'bg-purple-500' },
                  { stage: 'Ready for Booking', count: 2, pct: 5, color: 'bg-zinc-400' },
                ].map((s, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-2 text-[11px] font-semibold text-zinc-400">
                       <span className="uppercase tracking-wider">{s.stage}</span>
                       <span className="text-white bg-white/[0.05] px-2 py-0.5 rounded border border-white/[0.1]">{s.count}</span>
                    </div>
                    <ProgressBar value={s.pct} max={100} color={s.color} />
                  </div>
                ))}
              </div>
           </div>

           <AlertBlock severity="WARNING" title="Capacity Alert" body="Analyst JD is currently overloaded (16 active cases vs team avg of 9). Consider load balancing." />
        </motion.div>
      </div>
    </motion.div>
  )
}
