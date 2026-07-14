'use client'
import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Download, Activity, Target, FileText, Loader2, AlertCircle, AlertTriangle, Building2, TrendingUp, ShieldAlert, ArrowLeft, Wallet, Scale, BarChart3 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '@/lib/api-client'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Bar } from 'recharts'

export default function CounterpartyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [activeTab, setActiveTab] = React.useState('overview')

  const { data: cp, isLoading, isError } = useQuery({
    queryKey: ['counterparty', id],
    queryFn: () => fetchApi(`/counterparties/${id}`),
    enabled: !!id,
  })

  const tabs = ['Overview', 'Financials', 'Models & Ratings', 'Documents']

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Loading Counterparty</span>
      </div>
    )
  }

  if (isError || !cp) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] border border-white/[0.08] rounded-2xl m-6 bg-[#0d0d0d]">
        <AlertCircle className="w-10 h-10 text-rose-500 mb-4" />
        <h2 className="text-white font-bold text-lg mb-2">Counterparty Not Found</h2>
        <p className="text-zinc-500 text-sm">Unable to load counterparty data. Please verify the ID or try again.</p>
      </div>
    )
  }

  const ifrs9Label = cp.ifrs9Stage === 'STAGE_1' ? 'Stage 1' : cp.ifrs9Stage === 'STAGE_2' ? 'Stage 2' : 'Stage 3'

  return (
    <div className="w-full max-w-6xl mx-auto relative pb-20 pt-2">
      <button 
        onClick={() => router.push('/counterparty')}
        className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Directory
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black text-white tracking-tight leading-none">{cp.name}</h1>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              cp.watchlistFlag 
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
              : 'bg-brand-400/10 border-brand-400/20 text-brand-400'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${cp.watchlistFlag ? 'bg-rose-500 animate-pulse' : 'bg-brand-400'}`} />
              <span className="text-[9px] font-bold uppercase tracking-widest">{cp.watchlistFlag ? 'WATCHLIST' : 'STABLE'}</span>
            </div>
            <span className="font-mono font-bold text-white px-2 py-1 bg-white/[0.04] border border-white/[0.05] rounded text-[11px]">{cp.internalRating}</span>
          </div>
          <p className="text-[12px] text-zinc-500 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5" /> LEI: {cp.lei} • {cp.sector} • {cp.geography}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-[12px] font-bold text-white transition-colors flex items-center gap-2">
            <Target className="w-4 h-4" /> Run Quick Screen
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 border border-blue-500 rounded-xl text-[12px] font-bold text-white transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
            Approve Facility
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/[0.06] mb-8 bg-[#0A0A0A] p-1 rounded-xl w-fit border border-white/[0.04]">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t.toLowerCase())}
            className={`px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all ${
              activeTab === t.toLowerCase() 
              ? 'bg-white/[0.08] text-white shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.1] transition-colors relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-blue-500/10 translate-x-1/3 -translate-y-1/3" />
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> Current Exposure
              </div>
              <div className="text-3xl font-black text-white tabular-nums">{cp.exposure.toFixed(1)} Mds XAF</div>
              <div className="text-[11px] text-zinc-500 mt-2 font-medium">Limite : <span className="text-zinc-300">{cp.expLimit.toFixed(1)} Mds XAF</span></div>
            </div>
            
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.1] transition-colors relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-brand-400/10 translate-x-1/3 -translate-y-1/3" />
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-brand-400" /> PD (1Y)</div>
                <span className="text-[9px] text-brand-400 font-bold bg-brand-400/10 px-1.5 py-0.5 rounded">MODEL OUTPUT</span>
              </div>
              <div className="text-3xl font-black tabular-nums text-brand-400">{cp.pd1y.toFixed(2)}%</div>
              <div className="text-[11px] text-zinc-500 mt-2 font-medium">Implied Rating: <span className="text-zinc-300">{cp.internalRating}</span></div>
            </div>
            
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.1] transition-colors relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-amber-500/10 translate-x-1/3 -translate-y-1/3" />
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Expected Loss
              </div>
              <div className="text-3xl font-black text-white tabular-nums">
                ${cp.expectedLoss >= 1 ? cp.expectedLoss.toFixed(1) + 'M' : (cp.expectedLoss * 1000).toFixed(1) + 'K'}
              </div>
              <div className="text-[11px] text-zinc-500 mt-2 font-medium">IFRS 9: <span className="text-amber-400">{ifrs9Label}</span></div>
            </div>
            
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.1] transition-colors relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-rose-500/10 translate-x-1/3 -translate-y-1/3" />
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Risk Level
              </div>
              <div className="text-3xl font-black tabular-nums text-white uppercase">{cp.riskLevel}</div>
              <div className="text-[11px] text-zinc-500 mt-2 font-medium">Model Confidence: <span className="text-zinc-300">High</span></div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Left Column */}
            <div className="col-span-8 space-y-6">
              {/* PD Chart */}
              <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">PD Evolution vs Sector Benchmark</h2>
                  <div className="flex gap-2 bg-white/[0.03] p-1 rounded-lg border border-white/[0.06]">
                    <button className="bg-white/[0.08] text-white px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest">1Y</button>
                    <button className="text-zinc-500 hover:text-white px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-colors">3Y</button>
                  </div>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { t: 'Jan', cp: cp.pd1y * 1.15, bm: 2.9 },
                      { t: 'Feb', cp: cp.pd1y * 1.10, bm: 2.8 },
                      { t: 'Mar', cp: cp.pd1y * 1.05, bm: 2.8 },
                      { t: 'Apr', cp: cp.pd1y * 1.02, bm: 2.8 },
                      { t: 'May', cp: cp.pd1y * 1.01, bm: 2.7 },
                      { t: 'Jun', cp: cp.pd1y, bm: 2.8 },
                    ]} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#52525b', fontWeight: 600 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#52525b', fontWeight: 600 }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(2)}%`} />
                      <Tooltip contentStyle={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.06)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }} labelStyle={{ color: '#71717a', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }} />
                      <Line type="monotone" dataKey="cp" stroke="#3ECF8E" strokeWidth={3} dot={false} name={`${cp.name} PD`} />
                      <Line type="monotone" dataKey="bm" stroke="#52525b" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Sector Benchmark" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Exposures from DB */}
              {cp.exposures && cp.exposures.length > 0 && (
                <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden">
                  <div className="px-6 py-5 flex justify-between items-center border-b border-white/[0.06] bg-[#0A0A0A]">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Active Facilities</h2>
                    <span className="text-[9px] font-bold bg-brand-400/10 border border-brand-400/20 text-brand-400 px-2 py-1 rounded uppercase tracking-widest">ACTIVE</span>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                        <th className="font-medium pb-4 pt-4 pl-6 text-[10px] uppercase tracking-widest text-zinc-500">Facility Type</th>
                        <th className="font-medium pb-4 pt-4 text-[10px] uppercase tracking-widest text-zinc-500">Currency</th>
                        <th className="font-medium pb-4 pt-4 pr-6 text-[10px] uppercase tracking-widest text-zinc-500 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cp.exposures.map((exp: any) => (
                        <tr key={exp.id} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 pl-6 font-bold text-[13px] text-white tracking-tight">{exp.facilityType}</td>
                          <td className="py-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{exp.currency || 'XAF'}</td>
                          <td className="py-4 pr-6 text-right font-black tabular-nums text-white">{exp.amount.toFixed(1)} Mds</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="col-span-4 space-y-6">
              <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden group hover:border-white/[0.1] transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-blue-500/10 translate-x-1/2 -translate-y-1/2" />
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-6">Facility Utilization</h2>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-4xl font-black text-white tabular-nums tracking-tighter">{cp.facilityUtilization}%</span>
                  <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1.5 bg-blue-500/10 px-2 py-0.5 rounded">Drawn</span>
                </div>
                <div className="h-[100px] mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[{v:55},{v:58},{v:60},{v:62},{v:cp.facilityUtilization}]} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={3} fill="url(#utilGrad)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Total Limit</span>
                    <span className="font-bold text-white tabular-nums">{cp.expLimit.toFixed(1)} Mds XAF</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Tiré</span>
                    <span className="font-bold text-white tabular-nums">{cp.exposure.toFixed(1)} Mds XAF</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/[0.06] pt-4">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full border border-zinc-500" /> Non tiré</span>
                    <span className="font-bold text-white tabular-nums">{Math.max(0, cp.expLimit - cp.exposure).toFixed(1)} Mds XAF</span>
                  </div>
                </div>
              </div>

              {/* Analyst Info */}
              {cp.analyst && (
                <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-5">Assigned Analyst</h2>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg shadow-inner">
                      {cp.analyst.name?.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[14px] font-bold text-white tracking-tight">{cp.analyst.name}</div>
                      <div className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wider">{cp.analyst.role} • {cp.analyst.email}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'financials' && (
        <div className="space-y-6 pt-2">
          {/* Financial KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500/10 translate-x-1/2 -translate-y-1/2" />
               <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                 <Wallet className="w-3.5 h-3.5 text-blue-400" /> LTM Revenue
               </div>
               <div className="text-3xl font-black text-white tabular-nums">818 Mds XAF</div>
               <div className="text-[11px] text-brand-400 mt-2 font-bold">+8.4% YoY</div>
            </div>
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden group">
               <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                 <BarChart3 className="w-3.5 h-3.5 text-purple-400" /> EBITDA Margin
               </div>
               <div className="text-3xl font-black text-white tabular-nums">24.5%</div>
               <div className="text-[11px] text-brand-400 mt-2 font-bold">+120 bps</div>
            </div>
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden group">
               <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                 <Scale className="w-3.5 h-3.5 text-amber-400" /> Net Debt / EBITDA
               </div>
               <div className="text-3xl font-black text-white tabular-nums">2.1x</div>
               <div className="text-[11px] text-zinc-400 mt-2 font-medium">Covenant: <span className="text-white">3.5x</span></div>
            </div>
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden group">
               <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                 <Activity className="w-3.5 h-3.5 text-emerald-400" /> Interest Coverage
               </div>
               <div className="text-3xl font-black text-white tabular-nums">5.4x</div>
               <div className="text-[11px] text-zinc-400 mt-2 font-medium">Strong Liquidity</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-6">Revenue & Margin Evolution</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={[
                    { year: '2021', rev: 980, margin: 21 },
                    { year: '2022', rev: 1050, margin: 22 },
                    { year: '2023', rev: 1120, margin: 23 },
                    { year: '2024', rev: 1180, margin: 23.5 },
                    { year: 'LTM', rev: 1240, margin: 24.5 },
                  ]} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#52525b', fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#52525b', fontWeight: 600 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#52525b', fontWeight: 600 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.06)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }} labelStyle={{ color: '#71717a', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }} />
                    <Bar yAxisId="left" dataKey="rev" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue ($M)" barSize={32} />
                    <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#3ECF8E" strokeWidth={3} dot={{ r: 4, fill: '#3ECF8E', strokeWidth: 0 }} name="EBITDA Margin" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-white/[0.06] bg-[#0A0A0A]">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Income Statement Summary</h2>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                      <th className="font-medium pb-3 pt-3 pl-6 text-[10px] uppercase tracking-widest text-zinc-500">Metric ($M)</th>
                      <th className="font-medium pb-3 pt-3 text-[10px] uppercase tracking-widest text-zinc-500 text-right">2022</th>
                      <th className="font-medium pb-3 pt-3 text-[10px] uppercase tracking-widest text-zinc-500 text-right">2023</th>
                      <th className="font-medium pb-3 pt-3 pr-6 text-[10px] uppercase tracking-widest text-zinc-500 text-right">2024</th>
                    </tr>
                  </thead>
                  <tbody className="text-[13px]">
                    {[
                      { name: 'Revenue', d22: 1050, d23: 1120, d24: 1180, highlight: false },
                      { name: 'COGS', d22: 420, d23: 430, d24: 440, highlight: false },
                      { name: 'Gross Profit', d22: 630, d23: 690, d24: 740, highlight: true },
                      { name: 'SG&A', d22: 399, d23: 432, d24: 462, highlight: false },
                      { name: 'EBITDA', d22: 231, d23: 258, d24: 278, highlight: true },
                      { name: 'D&A', d22: 85, d23: 90, d24: 95, highlight: false },
                      { name: 'EBIT', d22: 146, d23: 168, d24: 183, highlight: true },
                    ].map((row, i) => (
                      <tr key={i} className={`border-b border-white/[0.02] last:border-0 hover:bg-white/[0.02] transition-colors ${row.highlight ? 'font-bold text-white bg-white/[0.01]' : 'text-zinc-400 font-medium'}`}>
                        <td className={`py-3.5 pl-6 ${row.highlight ? 'text-white' : ''}`}>{row.name}</td>
                        <td className="py-3.5 text-right tabular-nums">{row.d22}</td>
                        <td className="py-3.5 text-right tabular-nums">{row.d23}</td>
                        <td className="py-3.5 pr-6 text-right tabular-nums">{row.d24}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'models & ratings' && (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1 bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6">
               <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-6">Risk Profile Radar</h2>
               <div className="h-[280px] -mt-4">
                 <ResponsiveContainer width="100%" height="100%">
                   <RadarChart data={[
                     { subject: 'Liquidity', A: 90, fullMark: 100 },
                     { subject: 'Leverage', A: 75, fullMark: 100 },
                     { subject: 'Profitability', A: 85, fullMark: 100 },
                     { subject: 'Market Pos.', A: 80, fullMark: 100 },
                     { subject: 'Management', A: 70, fullMark: 100 },
                     { subject: 'ESG', A: 65, fullMark: 100 },
                   ]}>
                     <PolarGrid stroke="rgba(255,255,255,0.05)" />
                     <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} />
                     <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                     <Radar name="Company" dataKey="A" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.2} />
                   </RadarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div className="col-span-1 bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6">
               <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-6">Rating History</h2>
               <div className="relative border-l-2 border-white/[0.06] ml-3 mt-4 space-y-8">
                 <div className="relative pl-6">
                   <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                   <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Current • Nov 2025</div>
                   <div className="text-xl font-black text-white">{cp.internalRating}</div>
                   <div className="text-[12px] text-zinc-400 mt-1 leading-relaxed">Upgraded due to strong deleveraging and robust EBITDA margins in Q3.</div>
                 </div>
                 <div className="relative pl-6">
                   <div className="absolute w-3 h-3 bg-zinc-700 rounded-full -left-[7px] top-1" />
                   <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Feb 2024</div>
                   <div className="text-xl font-black text-zinc-400">BBB</div>
                   <div className="text-[12px] text-zinc-500 mt-1">Stable outlook affirmed during annual review.</div>
                 </div>
                 <div className="relative pl-6">
                   <div className="absolute w-3 h-3 bg-zinc-700 rounded-full -left-[7px] top-1" />
                   <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Aug 2022</div>
                   <div className="text-xl font-black text-zinc-400">BBB-</div>
                   <div className="text-[12px] text-zinc-500 mt-1">Initial rating assignment.</div>
                 </div>
               </div>
            </div>

            <div className="col-span-1 bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 flex flex-col">
               <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-6">IFRS 9 Parameters</h2>
               
               <div className="space-y-4 flex-1">
                 <div className="bg-[#0A0A0A] border border-white/[0.04] p-4 rounded-xl">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Loss Given Default (LGD)</div>
                    <div className="text-2xl font-black text-white tabular-nums">45.0%</div>
                    <div className="text-[11px] text-zinc-500 mt-1">Senior Unsecured Baseline</div>
                 </div>
                 <div className="bg-[#0A0A0A] border border-white/[0.04] p-4 rounded-xl">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Exposure at Default (EAD)</div>
                    <div className="text-2xl font-black text-white tabular-nums">{(cp.exposure * 1.05).toFixed(1)} Mds XAF</div>
                    <div className="text-[11px] text-zinc-500 mt-1">Includes 5% CCF on undrawn lines</div>
                 </div>
                 <div className="bg-[#0A0A0A] border border-white/[0.04] p-4 rounded-xl">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">IFRS 9 Staging</div>
                    <div className="text-2xl font-black text-amber-400 uppercase">{ifrs9Label}</div>
                    <div className="text-[11px] text-zinc-500 mt-1">No SICR detected in last 12M</div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-4 pt-4">
          {cp.documents && cp.documents.length > 0 ? (
            cp.documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-5 bg-[#0d0d0d] border border-white/[0.06] rounded-2xl hover:border-white/[0.1] transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-white tracking-tight">{doc.name}</div>
                    <div className="text-[11px] text-zinc-500 mt-1 font-medium uppercase tracking-wider">{doc.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${doc.status === 'VALIDATED' ? 'bg-brand-400/10 border-brand-400/20 text-brand-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                    {doc.status}
                  </span>
                  {doc.fileUrl && (
                    <button className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.1] transition-all">
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-48 border border-dashed border-white/[0.06] rounded-2xl bg-[#0d0d0d]">
              <FileText className="w-8 h-8 text-zinc-600 mb-3" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">No documents found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
