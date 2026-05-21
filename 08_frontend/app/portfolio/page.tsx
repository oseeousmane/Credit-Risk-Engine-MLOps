'use client'
import * as React from 'react'
import { useState } from 'react'
import { LineChart, Line, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { Filter, Download, ChevronLeft, ChevronRight, Bot, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  KPIBlock, StatusBadge, LiveBadge, SectionHeader, SidePanel, Sparkline,
  ProgressBar
} from '@/components/ui'
import { fetchApi } from '@/lib/api-client'
import { riskLevelColor, fmtPct, fmt } from '@/lib/utils'

const RISK_LEVELS = ['ALL', 'LOW', 'MED', 'HIGH', 'CRITICAL'] as const
const SECTORS = ['ALL', 'Aerospace', 'Utilities', 'Healthcare', 'Transport', 'Technology', 'Energy', 'Retail', 'Transportation', 'Manufacturing']

export default function PortfolioPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterRisk, setFilterRisk] = useState<string>('ALL')
  const [filterSector, setFilterSector] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8

  const kpQuery = useQuery({
    queryKey: ['portfolio-kpis'],
    queryFn: () => fetchApi('/counterparties/kpis'),
  })

  // Build query string
  const queryParams = new URLSearchParams()
  queryParams.append('page', page.toString())
  queryParams.append('limit', PAGE_SIZE.toString())
  if (filterRisk !== 'ALL') queryParams.append('riskLevel', filterRisk)
  if (filterSector !== 'ALL') queryParams.append('sector', filterSector)
  if (search) queryParams.append('search', search)

  const cpQuery = useQuery({
    queryKey: ['counterparties', page, filterRisk, filterSector, search],
    queryFn: () => fetchApi(`/counterparties?${queryParams.toString()}`),
  })

  const selectedQuery = useQuery({
    queryKey: ['counterparty-detail', selectedId],
    queryFn: () => fetchApi(`/counterparties/${selectedId}`),
    enabled: !!selectedId,
  })

  const analyticsQuery = useQuery({
    queryKey: ['portfolio-analytics'],
    queryFn: () => fetchApi('/scenarios/portfolio-analytics'),
  })

  function riskColor(level: string) {
    if (level === 'LOW') return 'text-emerald-400'
    if (level === 'MED') return 'text-amber-400'
    if (level === 'HIGH') return 'text-rose-400'
    return 'text-red-400'
  }

  const kpis = kpQuery.data
  const counterparties = cpQuery.data?.data || []
  const pagination = cpQuery.data?.meta || { total: 0, totalPages: 1 }

  const analytics = analyticsQuery.data
  const stageDist: { name: string; value: number; color: string }[] = analytics?.stageDistribution
    ? analytics.stageDistribution.map((item: any) => ({
        name: item.stage.replace('_', ' '),
        value: item.totalExposure,
        color: item.stage === 'STAGE_1' ? '#10b981' : item.stage === 'STAGE_2' ? '#f59e0b' : '#ef4444'
      }))
    : []
  const sectorDist: { name: string; ecl: number }[] = analytics?.eclBySector
    ? analytics.eclBySector.map((item: any) => ({ name: item.sector, ecl: item.totalECL }))
    : []

  return (
    <div className="p-6 space-y-6 page-enter pb-10">
      <SectionHeader
        title="Portfolio Explorer"
        badge={<LiveBadge label="LIVE COMP" />}
        actions={
          <>
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2">
              <input
                placeholder="Search entities..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="bg-transparent text-[12px] text-zinc-400 placeholder-zinc-700 outline-none w-40"
              />
            </div>
          </>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-4">
        {kpQuery.isLoading ? (
          <div className="col-span-3 h-32 flex items-center justify-center border border-white/[0.08] rounded-2xl bg-[#0d0d0d]">
             <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            <KPIBlock
              label="Total Exposure"
              value={<span className="tabular-nums">${((kpis?.totalExposure || 0) / 1000).toFixed(1)}B</span>}
              delta={2.4}
              deltaLabel="% vs last quarter"
              accent="blue"
              size="lg"
            >
              <div className="h-8 mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[{v:12.1},{v:12.8},{v:13.4},{v:13.1},{v:13.7},{v:14.2}]}>
                    <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </KPIBlock>
            <KPIBlock
              label="Portfolio Avg PD"
              value={<span className="tabular-nums">{(kpis?.avgPD || 0).toFixed(2)}%</span>}
              delta={4}
              deltaLabel="bps 30d"
              accent="amber"
              size="lg"
            >
              <div className="h-8 mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[{v:1.74},{v:1.78},{v:1.80},{v:1.82},{v:1.83},{v:1.84}]}>
                    <Line type="monotone" dataKey="v" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </KPIBlock>
            <KPIBlock
              label="Watchlist Entities"
              value={<span className="tabular-nums">{kpis?.watchlistEntities || 0}</span>}
              sub={<span className="text-amber-400 text-[11px] font-semibold">⚠ 2 added today</span>}
              accent="rose"
              size="lg"
            >
              <div className="flex -space-x-2 mt-2">
                {['SJ','MD','CL','AR'].map(a => (
                  <div key={a} className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white border-2 border-[#0d0d0d]">
                    {a}
                  </div>
                ))}
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-400 border-2 border-[#0d0d0d]">
                  +{Math.max(0, (kpis?.watchlistEntities || 0) - 4)}
                </div>
              </div>
            </KPIBlock>
          </>
        )}
      </div>

      {/* Analytics Charts */}
      {analytics && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 bg-[#0d0d0d] border border-white/[0.08] rounded-xl p-5 flex flex-col">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">IFRS 9 Stage Distribution (Exposure)</h3>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stageDist} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                    {stageDist.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)' }} itemStyle={{ color: '#fff' }} />
                  <Legend verticalAlign="bottom" height={20} iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#a1a1aa' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="col-span-8 bg-[#0d0d0d] border border-white/[0.08] rounded-xl p-5 flex flex-col">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Expected Credit Loss by Sector</h3>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorDist} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#52525b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#52525b' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}M`} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)' }} itemStyle={{ color: '#fff' }} cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                  <Bar dataKey="ecl" name="ECL ($M)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Main: Table + Side Panel */}
      <div className="flex gap-4">
        {/* Table Panel */}
        <div className="flex-1 rounded-xl border border-white/[0.08] bg-[#0d0d0d] flex flex-col min-h-[500px]">
          {/* Filters */}
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-3">
            <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
              {RISK_LEVELS.map(r => (
                <button
                  key={r}
                  onClick={() => { setFilterRisk(r); setPage(1) }}
                  className={`flex-shrink-0 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${
                    filterRisk === r
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                  }`}
                >
                  {r === 'ALL' ? 'Risk Level' : r}
                  {r !== 'ALL' && filterRisk !== r && ' ▾'}
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-white/[0.06]" />
            <select
              value={filterSector}
              onChange={e => { setFilterSector(e.target.value); setPage(1) }}
              className="bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-[11px] rounded-lg px-3 py-1.5 outline-none"
            >
              {SECTORS.map(s => <option key={s} value={s}>{s === 'ALL' ? 'Sector ▾' : s}</option>)}
            </select>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 cursor-pointer hover:text-white">
              <Filter className="w-3 h-3" /> More Filters
            </div>
            <div className="flex-1" />
            <button onClick={() => { setFilterRisk('ALL'); setFilterSector('ALL'); setSearch(''); setPage(1) }}
              className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors">
              Reset
            </button>
            <button className="flex items-center gap-1.5 text-[11px] text-zinc-400 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 hover:bg-white/[0.08]">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>

          <div className="flex-1 overflow-x-auto relative">
            {cpQuery.isLoading ? (
               <div className="absolute inset-0 flex items-center justify-center">
                 <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
               </div>
            ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      {['Entity Name','Sector','Exposure','PD (1Y)','Risk Rating','Trend'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {counterparties.map((c: any) => {
                      const isSelected = selectedId === c.id
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedId(c.id)}
                          className={`border-b border-white/[0.03] cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-500/[0.07] border-l-2 border-l-blue-500' : 'hover:bg-white/[0.025]'
                          }`}
                        >
                          <td className="px-5 py-3.5 font-semibold text-white whitespace-nowrap">{c.name}</td>
                          <td className="px-5 py-3.5 text-zinc-400">{c.sector}</td>
                          <td className="px-5 py-3.5 font-mono font-semibold text-white tabular-nums">${c.exposure}M</td>
                          <td className="px-5 py-3.5">
                            <span className={`font-mono font-bold tabular-nums ${riskColor(c.riskLevel)}`}>
                              {c.pd1y.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={c.riskLevel} />
                          </td>
                          <td className="px-5 py-3.5">
                             {/* Fake trend data, normally from backend TS data */}
                            <Sparkline
                              data={[4, 4.5, 4.2, 5.1, 5.8, 5.3]}
                              color={c.riskLevel === 'LOW' ? '#10b981' : c.riskLevel === 'MED' ? '#f59e0b' : '#f43f5e'}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
            )}
            
            {!cpQuery.isLoading && counterparties.length === 0 && (
               <div className="flex flex-col items-center justify-center p-10 text-zinc-500">
                  <Filter className="w-8 h-8 mb-3 opacity-50" />
                  <p className="text-sm">No counterparties found matching the criteria.</p>
               </div>
            )}
          </div>

          {/* Pagination */}
          <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] text-zinc-600">
              Showing {(page - 1) * PAGE_SIZE + Math.min(1, counterparties.length)} to {Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total} entries
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded text-zinc-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-7 h-7 flex items-center justify-center rounded text-[12px] font-medium transition-colors ${
                    page === p ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-white hover:bg-white/[0.06]'
                  }`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages || pagination.totalPages === 0}
                className="w-7 h-7 flex items-center justify-center rounded text-zinc-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Entity Detail Panel */}
        {selectedId && (
          <div className="w-[320px] flex-shrink-0 rounded-xl border border-white/[0.08] bg-[#0d0d0d] flex flex-col relative overflow-hidden">
            {selectedQuery.isLoading ? (
               <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
               </div>
            ) : selectedQuery.data ? (
              <>
                 {/* Header */}
                 <div className="p-5 border-b border-white/[0.06] relative">
                   <button onClick={() => setSelectedId(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-xs">✕</button>
                   <div className="flex items-start justify-between mb-3">
                     <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/></svg>
                     </div>
                     <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1 uppercase tracking-wider">AI Verified</span>
                   </div>
                   <h2 className="text-base font-bold text-white leading-snug pr-4">{selectedQuery.data.name}</h2>
                   <p className="text-[11px] text-zinc-500 mt-1">Tier 1 · {selectedQuery.data.sector}</p>
                 </div>

                 {/* KPIs */}
                 <div className="p-4 grid grid-cols-2 gap-3 border-b border-white/[0.06]">
                   {[
                     { label: 'CURRENT EXP', value: `$${selectedQuery.data.exposure}M` },
                     { label: 'EXP LIMIT', value: `$${selectedQuery.data.expLimit}M` },
                     { label: 'PD (1Y)', value: `${selectedQuery.data.pd1y.toFixed(2)}%`, color: selectedQuery.data.riskLevel === 'LOW' ? 'text-emerald-400' : selectedQuery.data.riskLevel === 'MED' ? 'text-amber-400' : 'text-rose-400' },
                     { label: 'EXPECTED LOSS', value: `$${selectedQuery.data.expectedLoss}M` },
                   ].map(({ label, value, color }) => (
                     <div key={label} className="bg-white/[0.03] rounded-lg p-3">
                       <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-1">{label}</div>
                       <div className={`text-base font-black tabular-nums ${color ?? 'text-white'}`}>{value}</div>
                     </div>
                   ))}
                 </div>

                 {/* Algorithmic Insights */}
                 <div className="p-4 border-b border-white/[0.06]">
                   <div className="flex items-center gap-2 mb-3">
                     <Bot className="w-3.5 h-3.5 text-blue-400" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Algorithmic Insights</span>
                   </div>
                   <div className="text-[12px] text-zinc-400 leading-relaxed">
                     Facility utilization is currently at <span className="text-white font-semibold">{selectedQuery.data.facilityUtilization}%</span>. 
                     Expected loss computed via real-time endpoints.
                   </div>
                 </div>

                 {/* Footer CTA */}
                 <div className="p-4 mt-auto">
                   <button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-bold py-2.5 rounded-lg transition-colors">
                     View Full Report
                   </button>
                 </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
