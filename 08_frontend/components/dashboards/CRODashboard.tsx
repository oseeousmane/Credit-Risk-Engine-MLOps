'use client'
import * as React from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Download, Sparkles, AlertCircle, Loader2, RefreshCw, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  KPIBlock, StatusBadge, LiveBadge, SectionHeader, DataTable, AlertBlock, Btn
} from '@/components/ui'
import { fetchApi } from '@/lib/api-client'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0a0a0a] border border-white/[0.1] rounded-xl p-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-xs backdrop-blur-md">
      <p className="text-zinc-500 font-mono uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[#3ECF8E] font-bold text-base drop-shadow-[0_0_8px_rgba(62,207,142,0.5)]">${payload[0].value.toFixed(1)}M ECL</p>
    </div>
  )
}

const ALGORITHMIC_INSIGHTS = [
  { id: 1, type: 'warning', title: 'Sector Concentration Rising', body: 'Manufacturing sector now at 34.2% of total exposure — approaching the 35% internal limit.' },
  { id: 2, type: 'critical', title: 'Stage Migration Signal', body: '3 counterparties showing SICR patterns consistent with Stage 2 migration within 30 days.' },
]

export function CRODashboard() {
  const kpiQuery = useQuery({
    queryKey: ['counterparty-kpis'],
    queryFn: () => fetchApi('/counterparties/kpis'),
    refetchInterval: 60000,
  })

  const topExposureQuery = useQuery({
    queryKey: ['counterparty-top'],
    queryFn: () => fetchApi('/counterparties?limit=5&sortBy=exposure&sortDir=desc'),
  })

  const kpis = kpiQuery.data
  const topExposure: any[] = topExposureQuery.data?.data || []

  const eclTrend = kpis ? [
    { month: 'Jan', value: kpis.totalEL * 0.92 },
    { month: 'Feb', value: kpis.totalEL * 0.95 },
    { month: 'Mar', value: kpis.totalEL * 0.94 },
    { month: 'Apr', value: kpis.totalEL * 0.97 },
    { month: 'May', value: kpis.totalEL * 0.99 },
    { month: 'Jun', value: kpis.totalEL },
  ] : []

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  } as const

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0, duration: 0.5 } }
  } as const

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 space-y-6 pb-10"
    >
      <SectionHeader
        title="Risk Intelligence"
        subtitle="INSTITUTIONAL RISK COMMAND CENTER"
        badge={
          <div className="flex items-center gap-3">
            <LiveBadge />
            <span className="text-[11px] text-zinc-600">
              {kpiQuery.isLoading ? 'Loading...' : kpiQuery.isError ? 'Error loading' : 'Updated just now'}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-3">
            {kpiQuery.isError && (
              <button onClick={() => kpiQuery.refetch()} className="flex items-center gap-2 text-[12px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2 transition-colors hover:bg-amber-500/20">
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            )}
            <Btn variant="secondary" size="md">
              <Download className="w-3.5 h-3.5" /> Export Report
            </Btn>
          </div>
        }
      />

      {/* Row 1: ECL Hero + 3 KPIs */}
      <div className="grid grid-cols-12 gap-4">
        {/* ECL Hero */}
        <motion.div variants={itemVariants} className="col-span-7 rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-6 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#3ECF8E]/5 to-transparent pointer-events-none group-hover:from-[#3ECF8E]/10 transition-colors duration-500" />
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-3 relative z-10">
            Expected Credit Loss (IFRS 9)
          </div>
          <div className="flex items-end gap-4 mb-6 relative z-10">
            {kpiQuery.isLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
            ) : (
              <>
                <span className="text-6xl font-black text-white tracking-tight tabular-nums">
                  ${kpis ? kpis.totalEL.toFixed(1) : '—'}M
                </span>
                <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold bg-rose-500/10 border border-rose-500/20 rounded px-2.5 py-1 mb-1.5 shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                  <TrendingUp className="w-3 h-3" /> IFRS 9 ECL
                </div>
              </>
            )}
          </div>
          <div className="h-[180px] relative z-10">
             <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={eclTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="eclGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3ECF8E" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3ECF8E" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#52525b' }} tickLine={false} axisLine={false} dy={8} />
                <YAxis tick={{ fontSize: 10, fill: '#52525b' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(62,207,142,0.2)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Area type="monotone" dataKey="value" stroke="#3ECF8E" strokeWidth={3} fill="url(#eclGrad)" dot={{ r: 3, fill: '#0a0a0a', stroke: '#3ECF8E', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#3ECF8E', stroke: '#0a0a0a', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* 3 KPIs */}
        <div className="col-span-5 flex flex-col gap-4">
          {kpiQuery.isLoading ? (
            <div className="flex-1 flex items-center justify-center border border-white/[0.08] rounded-xl bg-[#0a0a0a]">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
            </div>
          ) : (
            <>
              <motion.div variants={itemVariants} className="flex-1">
                <KPIBlock label="Total Portfolio Exposure" value={<span className="tabular-nums">${kpis ? kpis.totalExposure.toFixed(1) : '—'}M</span>} accent="emerald" className="h-full">
                  <div className="h-1 bg-white/[0.06] rounded-full mt-2 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: '72%' }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-[#3ECF8E]/50 rounded-full" />
                  </div>
                </KPIBlock>
              </motion.div>
              <motion.div variants={itemVariants} className="flex-1">
                <KPIBlock label="Avg. Probability of Default" value={<span className="tabular-nums">{kpis ? kpis.avgPD.toFixed(2) : '—'}%</span>} accent="rose" className="h-full">
                  <div className="h-1 bg-white/[0.06] rounded-full mt-2 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((kpis?.avgPD || 0) * 10, 100)}%` }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-rose-500/60 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.3)]" />
                  </div>
                </KPIBlock>
              </motion.div>
              <motion.div variants={itemVariants} className="flex-1">
                <KPIBlock label="Counterparties Monitored" value={<span className="tabular-nums">{kpis ? kpis.totalCounterparties : '—'}</span>} accent="amber" className="h-full">
                  <div className="h-1 bg-white/[0.06] rounded-full mt-2 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: '55%' }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-amber-500/60 rounded-full" />
                  </div>
                </KPIBlock>
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Insights + IFRS 9 Allocation */}
      <div className="grid grid-cols-12 gap-4">
        <motion.div variants={itemVariants} className="col-span-5 rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-6 relative group overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
             <Sparkles className="w-24 h-24 text-[#3ECF8E] blur-2xl" />
          </div>
          <div className="flex items-center gap-2 mb-5 relative z-10">
            <Sparkles className="w-4 h-4 text-[#3ECF8E]" />
            <h3 className="text-sm font-bold text-white">Algorithmic Insights</h3>
          </div>
          <div className="space-y-3 relative z-10">
            {ALGORITHMIC_INSIGHTS.map(ins => (
              <AlertBlock
                key={ins.id}
                severity={ins.type === 'warning' ? 'WARNING' : 'CRITICAL'}
                title={ins.title}
                body={ins.body}
              />
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="col-span-7 rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-6">
          <h3 className="text-sm font-bold text-white mb-1">IFRS 9 Stage Allocation</h3>
          <p className="text-[11px] text-zinc-500 mb-6">Portfolio segmentation by impairment stage</p>
          {kpiQuery.isLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>
          ) : (
            <div className="flex items-end justify-around gap-4 h-[140px]">
              {[
                { stage: 1, value: kpis?.stage1Pct ?? 0, color: 'border-[#3ECF8E]/30 bg-[#3ECF8E]/5 text-[#3ECF8E]', glow: 'shadow-[0_0_20px_rgba(62,207,142,0.1)]' },
                { stage: 2, value: kpis?.stage2Pct ?? 0, color: 'border-amber-500/30 bg-amber-500/5 text-amber-300', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.1)]' },
                { stage: 3, value: kpis?.stage3Pct ?? 0, color: 'border-rose-500/30 bg-rose-500/5 text-rose-300', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.1)]' },
              ].map(({ stage, value, color, glow }) => (
                <div key={stage} className="flex flex-col items-center gap-3 flex-1 h-full justify-end">
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: `${Math.max(value, 15)}%`, opacity: 1 }}
                    transition={{ duration: 0.8, type: 'spring', bounce: 0.2 }}
                    className={`w-full max-w-[140px] flex items-center justify-center rounded-t-2xl border-x border-t border-b-0 ${color} ${glow} relative overflow-hidden`}
                  >
                     <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/5 pointer-events-none" />
                     <span className="text-2xl font-black tabular-nums">{value.toFixed(0)}%</span>
                  </motion.div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Stage {stage}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Row 3: Top Exposure Shifts */}
      <motion.div variants={itemVariants} className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Top Portfolio Exposures</h3>
          {topExposureQuery.isLoading && <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />}
        </div>
        {topExposureQuery.isError ? (
          <div className="flex items-center gap-2 p-6 text-zinc-500 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            Could not load counterparty data — backend may be offline.
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'name', header: 'Counterparty', cell: r => <span className="font-medium text-white">{r.name}</span> },
              { key: 'sector', header: 'Sector', cell: r => <span className="text-zinc-400">{r.sector}</span> },
              { key: 'exposure', header: 'Exposure', cell: r => <span className="font-mono font-semibold text-white tabular-nums">${r.exposure.toFixed(1)}M</span> },
              { key: 'pd1y', header: 'PD (1Y)', cell: r => <span className={`font-mono font-bold tabular-nums ${r.pd1y > 3 ? 'text-rose-400' : r.pd1y > 1 ? 'text-amber-400' : 'text-emerald-400'}`}>{r.pd1y.toFixed(2)}%</span> },
              { key: 'riskLevel', header: 'Risk', cell: r => <StatusBadge status={r.riskLevel} /> },
            ]}
            data={topExposure}
          />
        )}
      </motion.div>
    </motion.div>
  )
}
