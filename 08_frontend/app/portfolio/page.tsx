'use client'
import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
  Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  Filter, Download, ChevronLeft, ChevronRight, Bot, Loader2,
  BarChart2, Building2, ArrowUpRight, PieChart as PieChartIcon,
  TrendingUp, AlertTriangle, X,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { KPIBlock, StatusBadge, LiveBadge, SectionHeader, Sparkline } from '@/components/ui'
import { fetchApi } from '@/lib/api-client'

const RISK_LEVELS = ['ALL', 'LOW', 'MED', 'HIGH', 'CRITICAL'] as const
const BAR_COLORS = ['#3b82f6', '#3ECF8E', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1']

function DonutChart({ segments, total, size = 130 }: { segments: { name: string; value: number; color: string }[]; total: number; size?: number }) {
  const cx = 60, cy = 60, R = 52, r = 34, gap = 0.04
  let angle = -Math.PI / 2
  const arcs = segments.map(seg => {
    if (total === 0) return { d: '', color: seg.color }
    const sweep = (seg.value / total) * 2 * Math.PI - gap
    if (sweep <= 0) return { d: '', color: seg.color }
    const end = angle + sweep
    const [x1, y1] = [cx + R * Math.cos(angle), cy + R * Math.sin(angle)]
    const [x2, y2] = [cx + R * Math.cos(end), cy + R * Math.sin(end)]
    const [x3, y3] = [cx + r * Math.cos(end), cy + r * Math.sin(end)]
    const [x4, y4] = [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
    const la = sweep > Math.PI ? 1 : 0
    const d = `M${x1} ${y1} A${R} ${R} 0 ${la} 1 ${x2} ${y2} L${x3} ${y3} A${r} ${r} 0 ${la} 0 ${x4} ${y4}Z`
    angle = end + gap
    return { d, color: seg.color }
  })
  return (
    <svg viewBox="0 0 120 120" style={{ width: size, height: size }} className="flex-shrink-0">
      {arcs.map((a, i) => a.d ? <path key={i} d={a.d} fill={a.color} /> : null)}
      <text x="60" y="57" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="inherit">
        {`${total.toFixed(1)} Mds`}
      </text>
      <text x="60" y="68" textAnchor="middle" fill="#52525b" fontSize="6.5" fontFamily="inherit" letterSpacing="1">TOTAL</text>
    </svg>
  )
}
const SECTORS = ['ALL', 'Aerospace', 'Utilities', 'Healthcare', 'Transport', 'Technology', 'Energy', 'Retail', 'Transportation', 'Manufacturing']

export default function PortfolioPage() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const PAGE_SIZE   = 8

  // ── Filter state lives in the URL (persistent, shareable) ─────────────────
  const filterRisk   = searchParams.get('risk')   ?? 'ALL'
  const filterSector = searchParams.get('sector') ?? 'ALL'
  const search       = searchParams.get('q')      ?? ''
  const page         = Number(searchParams.get('page') ?? '1')

  // Selected entity stays in local state (not sharable intent)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const pushFilters = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (!v || v === 'ALL' || v === '1') params.delete(k)
      else params.set(k, v)
    })
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const setFilterRisk   = (v: string)   => pushFilters({ risk: v,   page: '1' })
  const setFilterSector = (v: string)   => pushFilters({ sector: v, page: '1' })
  const setSearch       = (v: string)   => pushFilters({ q: v,      page: '1' })
  const setPage         = (v: number)   => pushFilters({ page: String(v) })
  const resetFilters    = ()            => router.push('?', { scroll: false })

  const activeFilterCount = [
    filterRisk !== 'ALL',
    filterSector !== 'ALL',
    search !== '',
  ].filter(Boolean).length

  const kpQuery = useQuery({
    queryKey: ['portfolio-kpis'],
    queryFn: () => fetchApi('/counterparties/kpis'),
  })

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

  const stageDist = analytics?.stageDistribution
    ? analytics.stageDistribution.map((item: any) => ({
        name: item.stage.replace('_', ' '),
        value: item.totalExposure,
        color: item.stage === 'STAGE_1' ? '#3ECF8E' : item.stage === 'STAGE_2' ? '#f59e0b' : '#ef4444',
      }))
    : []

  const totalExposure = stageDist.reduce((sum: number, s: any) => sum + s.value, 0)

  const sectorDist = analytics?.eclBySector
    ? analytics.eclBySector.map((item: any) => ({ name: item.sector, ecl: item.totalECL }))
    : []

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-6 page-enter pb-10">
      <SectionHeader
        title="Portfolio Explorer"
        badge={<LiveBadge label="LIVE COMP" />}
        actions={
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2">
            <input
              placeholder="Search entities..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="bg-transparent text-[12px] text-zinc-400 placeholder-zinc-600 outline-none w-40"
            />
          </div>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-4">
        {kpQuery.isLoading ? (
          <div className="col-span-3 h-32 flex items-center justify-center border border-white/[0.06] rounded-2xl bg-[#0d0d0d]">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
          </div>
        ) : (
          <>
            <KPIBlock
              label="Total Exposure"
              value={<span className="tabular-nums">{(() => { const v = kpis?.totalExposure || 0; return `${v.toFixed(1)} Mds XAF` })()}</span>}
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
              sub={<span className="flex items-center gap-1 text-amber-400 text-[11px] font-semibold"><AlertTriangle className="w-3 h-3" aria-hidden="true" /> 2 added today</span>}
              accent="rose"
              size="lg"
            >
              <div className="flex -space-x-2 mt-2">
                {['SJ', 'MD', 'CL', 'AR'].map(a => (
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
        <div className="grid grid-cols-3 gap-4">
          {/* IFRS 9 Donut */}
          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
              <div>
                <div className="text-[13px] font-bold text-white">IFRS 9 Stage Distribution</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Exposure by impairment stage</div>
              </div>
              <PieChartIcon className="w-3.5 h-3.5 text-zinc-600" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-5 py-5 gap-5">
              <DonutChart segments={stageDist} total={totalExposure} size={150} />
              <div className="w-full space-y-3">
                {stageDist.map((s: any) => {
                  const pct = totalExposure > 0 ? (s.value / totalExposure) * 100 : 0
                  const absVal = `${s.value.toFixed(1)} Mds XAF`
                  return (
                    <div key={s.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                          <span className="text-[11px] font-semibold text-zinc-300">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-zinc-500 tabular-nums">{absVal}</span>
                          <span className="text-[11px] font-bold tabular-nums w-10 text-right" style={{ color: s.color }}>{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: s.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ECL by Sector — horizontal bars */}
          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
              <div>
                <div className="text-[13px] font-bold text-white">ECL by Sector</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">IFRS 9 expected credit loss</div>
              </div>
              <BarChart2 className="w-3.5 h-3.5 text-zinc-600" />
            </div>
            <div className="px-4 py-3">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={sectorDist} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#52525b' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}M`} />
                  <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 9, fill: '#71717a' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  />
                  <Bar dataKey="ecl" name="ECL ($M)" radius={[0, 3, 3, 0]}>
                    {sectorDist.map((_: any, i: number) => (
                      <Cell key={`bar-${i}`} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.9} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Concentrations */}
          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
              <div>
                <div className="text-[13px] font-bold text-white">Top Concentrations</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Largest exposures in portfolio</div>
              </div>
              <TrendingUp className="w-3.5 h-3.5 text-zinc-600" />
            </div>
            <div className="p-4 space-y-0.5">
              {[...counterparties]
                .sort((a: any, b: any) => b.exposure - a.exposure)
                .slice(0, 5)
                .map((c: any, i: number) => {
                  const totalExp = kpis?.totalExposure || 1
                  const pct = (c.exposure / totalExp) * 100
                  const barW = Math.min(pct * 2, 100)
                  return (
                    <div
                      key={c.id}
                      onClick={() => router.push(`/counterparty/${String(c.id)}`)}
                      className="flex items-center gap-2.5 py-2.5 border-b border-white/[0.03] last:border-0 cursor-pointer group"
                    >
                      <span className="text-[9px] font-bold text-zinc-600 w-3.5 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">{c.name}</span>
                          <span className="text-[11px] font-bold tabular-nums text-white ml-2 flex-shrink-0">{c.exposure.toFixed(1)} Mds</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${barW}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                          </div>
                          <span className="text-[9px] text-zinc-600 tabular-nums flex-shrink-0">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* Table + Side Panel */}
      <div className="flex gap-4">

        {/* Table Panel */}
        <div className="flex-1 bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col min-h-[500px]">

          {/* Table header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
            <div>
              <div className="text-[13px] font-bold text-white">Counterparty Register</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Full exposure ledger — click any row to expand detail</div>
            </div>
            <div className="flex items-center gap-2">
              {cpQuery.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600" />}
              <button
                onClick={resetFilters}
                className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors px-2"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  const rows = counterparties.map((c: any) =>
                    `${c.name},${c.sector},${c.exposure},${c.pd1y},${c.riskLevel}`
                  ).join('\n')
                  const blob = new Blob([`Name,Sector,Exposure,PD1Y,RiskLevel\n${rows}`], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = 'portfolio.csv'; a.click()
                  URL.revokeObjectURL(url)
                }}
                className="flex items-center gap-1.5 text-[11px] text-zinc-400 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 hover:bg-white/[0.08] transition-colors"
              >
                <Download className="w-3 h-3" /> Export
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-5 py-2.5 border-b border-white/[0.04] bg-white/[0.01] flex items-center gap-3 flex-wrap">
            {/* Risk level pills */}
            <div className="flex gap-1 flex-wrap">
              {RISK_LEVELS.map(r => (
                <button
                  key={r}
                  onClick={() => setFilterRisk(r)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${
                    filterRisk === r
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                  }`}
                >
                  {r === 'ALL' ? 'Tous niveaux' : r}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-white/[0.06]" />
            {/* Sector select */}
            <select
              value={filterSector}
              onChange={e => setFilterSector(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-[11px] rounded-lg px-3 py-1.5 outline-none hover:border-white/[0.12] transition-colors cursor-pointer"
            >
              {SECTORS.map(s => <option key={s} value={s} className="bg-[#111]">{s === 'ALL' ? 'Tous secteurs' : s}</option>)}
            </select>
            {/* Active filter badge */}
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg hover:bg-amber-500/20 transition-colors"
              >
                <Filter className="w-3 h-3" aria-hidden="true" />
                {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''} actif{activeFilterCount > 1 ? 's' : ''}
                <X className="w-3 h-3" aria-label="Réinitialiser les filtres" />
              </button>
            )}
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto relative">
            {cpQuery.isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                    {['Entity Name', 'Sector', 'Exposure', 'PD (1Y)', 'Risk Rating', 'Trend'].map(h => (
                      <th key={h} className="px-5 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-zinc-600 whitespace-nowrap">{h}</th>
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
                        className={`border-b border-white/[0.03] cursor-pointer transition-colors group ${
                          isSelected ? 'bg-blue-500/[0.06] border-l-2 border-l-blue-500/60' : 'hover:bg-white/[0.025]'
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.05] flex items-center justify-center text-[8px] font-bold text-zinc-400 flex-shrink-0">
                              {(c.name ?? 'XX').slice(0, 2).toUpperCase()}
                            </div>
                            <span
                              onClick={e => { e.stopPropagation(); router.push(`/counterparty/${String(c.id)}`) }}
                              className={`text-[12px] font-semibold truncate max-w-[180px] transition-colors cursor-pointer hover:text-brand-400 ${isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}
                            >
                              {c.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[11px] text-zinc-500">{c.sector}</td>
                        <td className="px-5 py-3.5 font-mono font-bold text-white tabular-nums text-[11px]">
                          {(c.exposure ?? 0).toFixed(1)} Mds XAF
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`font-mono font-bold tabular-nums text-[11px] ${riskColor(c.riskLevel)}`}>
                            {c.pd1y.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={c.riskLevel} />
                        </td>
                        <td className="px-5 py-3.5">
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
              <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
                <Filter className="w-7 h-7 mb-3 opacity-40" />
                <p className="text-sm">No counterparties match the current filters.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between">
            <span className="text-[11px] text-zinc-600">
              {(page - 1) * PAGE_SIZE + Math.min(1, counterparties.length)}–{Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total} entities
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded text-zinc-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 flex items-center justify-center rounded text-[11px] font-medium transition-colors ${
                    page === p ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page === pagination.totalPages || pagination.totalPages === 0}
                className="w-7 h-7 flex items-center justify-center rounded text-zinc-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Entity Detail Panel */}
        {selectedId && (
          <div className="w-[340px] flex-shrink-0 bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
            {selectedQuery.isLoading ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
              </div>
            ) : selectedQuery.data ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-white leading-none">{selectedQuery.data.name}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Tier 1 · {selectedQuery.data.sector}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="w-6 h-6 flex items-center justify-center rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors text-xs"
                  >
                    ✕
                  </button>
                </div>

                {/* KPI grid */}
                <div className="p-4 grid grid-cols-2 gap-2.5 border-b border-white/[0.05]">
                  {[
                    { label: 'Current Exp.', value: `${(selectedQuery.data.exposure ?? 0).toFixed(1)} Mds XAF` },
                    { label: 'Exp. Limit', value: selectedQuery.data.expLimit > 0 ? `${(selectedQuery.data.expLimit).toFixed(1)} Mds XAF` : '—' },
                    {
                      label: 'PD (1Y)',
                      value: `${(selectedQuery.data.pd1y ?? 0).toFixed(2)}%`,
                      color: selectedQuery.data.riskLevel === 'LOW' ? 'text-emerald-400' : selectedQuery.data.riskLevel === 'MED' ? 'text-amber-400' : 'text-rose-400',
                    },
                    { label: 'Expected Loss', value: `${(selectedQuery.data.expectedLoss ?? 0).toFixed(2)} Mds XAF` },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                      <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">{label}</div>
                      <div className={`text-[15px] font-bold tabular-nums leading-none ${color ?? 'text-white'}`}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Facility Utilization */}
                <div className="px-5 py-4 border-b border-white/[0.05]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">Facility Utilization</span>
                    <span className="text-[13px] font-bold text-white tabular-nums">
                      {selectedQuery.data.expLimit > 0
                        ? `${((selectedQuery.data.exposure / selectedQuery.data.expLimit) * 100).toFixed(1)}%`
                        : '—'}
                    </span>
                  </div>
                  {selectedQuery.data.expLimit > 0 && (
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-700"
                        style={{ width: `${Math.min((selectedQuery.data.exposure / selectedQuery.data.expLimit) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Algorithmic Insights */}
                <div className="px-5 py-4 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Bot className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">Algorithmic Insights</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Facility utilization at{' '}
                    <span className="text-white font-semibold">
                      {selectedQuery.data.expLimit > 0
                        ? `${((selectedQuery.data.exposure / selectedQuery.data.expLimit) * 100).toFixed(1)}%`
                        : '—'}
                    </span>
                    . Expected loss computed via real-time endpoints.
                  </p>
                </div>

                {/* CTA */}
                <div className="p-4 mt-auto">
                  <button
                    onClick={() => router.push(`/counterparty/${String(selectedQuery.data.id)}`)}
                    className="w-full flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    View Full Report <ArrowUpRight className="w-3.5 h-3.5" />
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
