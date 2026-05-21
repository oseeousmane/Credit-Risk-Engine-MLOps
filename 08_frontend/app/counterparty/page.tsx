'use client'
import * as React from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, ChevronRight, Loader2, Building2, AlertTriangle, TrendingUp, Activity, LayoutGrid, List } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Sparkline } from '@/components/ui'
import { fetchApi } from '@/lib/api-client'
import type { Counterparty } from '@/lib/types'

function useCountUp(target: number, duration = 1200, delay = 0) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let isMounted = true
    let reqId: number

    const t = setTimeout(() => {
      const s = performance.now()
      const step = (now: number) => {
        if (!isMounted) return
        const p = Math.min((now - s) / duration, 1)
        setV(Math.floor((1 - Math.pow(1 - p, 3)) * target))
        if (p < 1) reqId = requestAnimationFrame(step)
        else setV(target)
      }
      reqId = requestAnimationFrame(step)
    }, delay)

    return () => {
      isMounted = false
      clearTimeout(t)
      if (reqId) cancelAnimationFrame(reqId)
    }
  }, [target, duration, delay])
  return v
}

function KPICards({ kpis }: { kpis: any }) {
  const animatedTotal = useCountUp(kpis?.totalCounterparties || 0, 800, 100)
  const animatedWatchlist = useCountUp(kpis?.watchlistEntities || 0, 800, 200)
  const exposureRaw = kpis?.totalExposure || 0
  const animatedExp = useCountUp(Math.round(exposureRaw), 900, 300)
  const avgPd = kpis?.avgPD || 0

  const fmtExp = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${v.toFixed(1)}M`

  const cards = [
    {
      label: 'Total Counterparties',
      value: `${animatedTotal}`,
      icon: Building2, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10 border-blue-500/20',
      accent: '#3B82F6'
    },
    {
      label: 'Watchlist',
      value: `${animatedWatchlist}`,
      icon: AlertTriangle, iconColor: 'text-rose-400', iconBg: 'bg-rose-500/10 border-rose-500/20',
      accent: '#f43f5e'
    },
    {
      label: 'Total Exposure',
      value: fmtExp(animatedExp > 0 ? animatedExp : exposureRaw),
      icon: TrendingUp, iconColor: 'text-amber-400', iconBg: 'bg-amber-500/10 border-amber-500/20',
      accent: '#f59e0b'
    },
    {
      label: 'Avg PD (1Y)',
      value: `${avgPd.toFixed(2)}%`,
      icon: Activity, iconColor: 'text-purple-400', iconBg: 'bg-purple-500/10 border-purple-500/20',
      accent: '#a855f7'
    }
  ]

  return (
    <div className="grid grid-cols-4 gap-4 mb-8">
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <div key={i} className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden group hover:border-white/[0.1] transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ background: `${c.accent}15`, transform: 'translate(40%, -40%)' }} />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">{c.label}</span>
              <div className={`w-7 h-7 rounded-lg ${c.iconBg} border flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 ${c.iconColor}`} />
              </div>
            </div>
            <div className="text-[28px] font-bold text-white tabular-nums tracking-tight leading-none mb-1">{c.value}</div>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: `linear-gradient(to right, transparent, ${c.accent}80, transparent)` }} />
          </div>
        )
      })}
    </div>
  )
}

export default function CounterpartyListPage() {
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const queryParams = new URLSearchParams()
  queryParams.append('limit', '50')
  if (search) queryParams.append('search', search)

  const cpQuery = useQuery({
    queryKey: ['counterparties', search],
    queryFn: () => fetchApi(`/counterparties?${queryParams.toString()}`),
  })

  const kpQuery = useQuery({
    queryKey: ['portfolio-kpis'],
    queryFn: () => fetchApi('/counterparties/kpis'),
  })

  const counterparties = cpQuery.data?.data || []
  const kpis = kpQuery.data

  return (
    <div className="w-full max-w-6xl mx-auto relative pb-20 pt-2">
      {/* Top Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight leading-none text-white">Counterparty 360</h1>
          <p className="text-[12px] text-zinc-500 mt-1.5 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5" /> Full entity profiles, exposure, and risk trajectory
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-[#0A0A0A] border border-white/[0.06] rounded-xl p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 bg-[#0A0A0A] border border-white/[0.06] rounded-xl px-3 py-2 focus-within:border-white/[0.15] transition-colors shadow-sm">
            <Search className="w-4 h-4 text-zinc-500" />
            <input
              placeholder="Search entities or LEI..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-[13px] text-white placeholder-zinc-600 outline-none w-56 font-medium"
            />
          </div>
        </div>
      </div>

      <KPICards kpis={kpis} />

      {/* Main Content Area */}
      <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col relative min-h-[400px]">
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between bg-[#0A0A0A]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Active Directory</h3>
          {!cpQuery.isLoading && <span className="text-[10px] font-bold bg-white/[0.04] px-2 py-1 rounded text-zinc-500 uppercase tracking-widest">{counterparties.length} entities</span>}
        </div>
        
        {cpQuery.isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0d]/50 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-3">
               <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Loading Directory</span>
            </div>
          </div>
        ) : counterparties.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-zinc-500">
             <Building2 className="w-8 h-8 text-zinc-700 mb-3" />
             <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">No counterparties found</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                  {['Entity', 'Sector', 'Internal Rtg', 'Exposure', 'PD (1Y)', 'Status', 'Trend', ''].map((h, i) => (
                    <th key={i} className={`font-medium pb-4 pt-4 text-[10px] uppercase tracking-widest text-zinc-500 whitespace-nowrap ${i===0 ? 'pl-6' : ''} ${i===7 ? 'pr-6 text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {counterparties.map((c: any) => (
                  <tr key={c.id} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.02] transition-colors group">
                    <td className="py-5 pl-6">
                      <div className="font-bold text-[13px] text-white tracking-tight whitespace-nowrap">{c.name}</div>
                      <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">{c.analyst?.name || 'Unassigned'}</div>
                    </td>
                    <td className="py-5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">{c.sector}</td>
                    <td className="py-5">
                      <span className="font-mono font-bold text-white px-2 py-1 bg-white/[0.04] border border-white/[0.05] rounded text-[11px]">{c.internalRating}</span>
                    </td>
                    <td className="py-5">
                      <div className="text-[14px] font-black tabular-nums text-white whitespace-nowrap">${c.exposure}M</div>
                    </td>
                    <td className="py-5">
                      <div className={`text-[14px] font-black tabular-nums whitespace-nowrap ${
                        c.riskLevel === 'LOW' ? 'text-emerald-400' : c.riskLevel === 'MED' ? 'text-amber-400' : 'text-rose-400'
                      }`}>{c.pd1y.toFixed(2)}%</div>
                    </td>
                    <td className="py-5">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                        c.watchlistFlag 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                        : 'bg-[#3ECF8E]/10 border-[#3ECF8E]/20 text-[#3ECF8E]'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${c.watchlistFlag ? 'bg-rose-500 animate-pulse' : 'bg-[#3ECF8E]'}`} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">{c.watchlistFlag ? 'WATCHLIST' : 'STABLE'}</span>
                      </div>
                    </td>
                    <td className="py-5 w-24">
                      <Sparkline
                        data={[4, 4.5, 4.2, 5.1, 5.8, 5.3]}
                        color={c.riskLevel === 'LOW' ? '#10b981' : c.riskLevel === 'MED' ? '#f59e0b' : '#f43f5e'}
                      />
                    </td>
                    <td className="py-5 pr-6 text-right">
                      <Link href={`/counterparty/${c.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.02] text-zinc-500 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-3 gap-5 bg-[#060606]">
            {counterparties.map((c: any) => (
              <Link href={`/counterparty/${c.id}`} key={c.id} className="bg-[#0A0A0A] border border-white/[0.04] hover:border-white/[0.12] hover:bg-white/[0.02] rounded-2xl p-5 transition-all group flex flex-col relative overflow-hidden shadow-lg hover:shadow-2xl">
                {/* Background ambient glow based on risk */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{ background: c.riskLevel === 'LOW' ? '#10b98115' : c.riskLevel === 'MED' ? '#f59e0b15' : '#f43f5e15', transform: 'translate(30%, -30%)' }} />
                
                <div className="flex justify-between items-start mb-5 relative z-10">
                  <div>
                    <div className="font-bold text-[15px] text-white tracking-tight">{c.name}</div>
                    <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">{c.sector}</div>
                  </div>
                  <span className="font-mono font-bold text-white px-2 py-1 bg-white/[0.04] border border-white/[0.05] rounded text-[10px]">{c.internalRating}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-5 relative z-10">
                  <div className="bg-[#0d0d0d] border border-white/[0.04] rounded-xl p-3">
                    <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Exposure</div>
                    <div className="text-[15px] font-black tabular-nums text-white">${c.exposure}M</div>
                  </div>
                  <div className="bg-[#0d0d0d] border border-white/[0.04] rounded-xl p-3">
                    <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">PD (1Y)</div>
                    <div className={`text-[15px] font-black tabular-nums ${c.riskLevel === 'LOW' ? 'text-emerald-400' : c.riskLevel === 'MED' ? 'text-amber-400' : 'text-rose-400'}`}>
                      {c.pd1y.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/[0.04] relative z-10">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border ${
                      c.watchlistFlag 
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                      : 'bg-[#3ECF8E]/10 border-[#3ECF8E]/20 text-[#3ECF8E]'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${c.watchlistFlag ? 'bg-rose-500 animate-pulse' : 'bg-[#3ECF8E]'}`} />
                      <span className="text-[8px] font-bold uppercase tracking-widest">{c.watchlistFlag ? 'WATCHLIST' : 'STABLE'}</span>
                  </div>
                  <div className="w-20 opacity-70 group-hover:opacity-100 transition-opacity">
                     <Sparkline data={[4, 4.5, 4.2, 5.1, 5.8, 5.3]} color={c.riskLevel === 'LOW' ? '#10b981' : c.riskLevel === 'MED' ? '#f59e0b' : '#f43f5e'} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
