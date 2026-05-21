'use client'
import * as React from 'react'
import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { Plus, Zap, LayoutDashboard, Brain, AlertTriangle, Loader2, Play, CheckCircle2, TrendingUp, TrendingDown, Users } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { SectionHeader, Sparkline } from '@/components/ui'
import { fetchApi } from '@/lib/api-client'

const DEFAULT_PARAMS = {
  unemploymentShock: 3,
  creditSpreadBps: 250,
  realGDPGrowth: -2,
  horizon: '1Y',
}

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

export default function StressTestingPage() {
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [result, setResult] = useState<any>(null)
  const [activeView, setActiveView] = useState<'engine' | 'overview'>('engine')

  const scenariosQuery = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => fetchApi('/scenarios'),
  })

  const runMutation = useMutation({
    mutationFn: (p: typeof params) =>
      fetchApi('/scenarios/run', {
        method: 'POST',
        body: JSON.stringify(p),
      }),
    onSuccess: (data) => setResult(data),
  })

  const savedScenarios: any[] = scenariosQuery.data || []

  const stageData = result ? [
    { name: 'Stage 1', baseline: result.stageDistribution.baseline.s1, adverse: result.stageDistribution.adverse.s1, color: '#3b82f6' },
    { name: 'Stage 2', baseline: result.stageDistribution.baseline.s2, adverse: result.stageDistribution.adverse.s2, color: '#f59e0b' },
    { name: 'Stage 3', baseline: result.stageDistribution.baseline.s3, adverse: result.stageDistribution.adverse.s3, color: '#f43f5e' },
  ] : []

  const animatedStressEL = useCountUp(result?.summary?.totalStressEL || 0, 1000, 100)
  const animatedRwaImpact = useCountUp(result?.summary?.rwaImpact || 0, 1000, 200)
  const animatedMigrated = useCountUp(result?.summary?.migratedEntities || 0, 1000, 300)

  return (
    <div className="flex h-full page-enter">
      {/* Left Sidebar */}
      <div className="w-[300px] bg-[#0d0d0d] border-r border-white/[0.06] flex-shrink-0 flex flex-col z-10 relative shadow-2xl">
        <div className="p-6 w-full flex-shrink-0">
          <button
            onClick={() => runMutation.mutate(params)}
            disabled={runMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] border border-blue-500/50"
          >
            {runMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> RUNNING SIMULATION</>
              : <><Zap className="w-4 h-4" /> RUN SIMULATION</>
            }
          </button>
        </div>

        <div className="px-4 pb-5 border-b border-white/[0.04] flex flex-col gap-1.5">
          <button
            onClick={() => setActiveView('overview')}
            className={`w-full px-4 py-2.5 flex items-center gap-3 text-[13px] font-semibold rounded-xl transition-all cursor-pointer ${activeView === 'overview' ? 'text-white bg-white/[0.06] shadow-inner' : 'text-zinc-500 hover:text-white hover:bg-white/[0.04]'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Saved Scenarios
          </button>
          <button
            onClick={() => setActiveView('engine')}
            className={`w-full px-4 py-2.5 flex items-center gap-3 text-[13px] font-semibold rounded-xl transition-all cursor-pointer ${activeView === 'engine' ? 'text-blue-400 bg-blue-500/10 shadow-[inset_2px_0_0_#3b82f6]' : 'text-zinc-500 hover:text-white hover:bg-white/[0.04]'}`}
          >
            <Play className="w-4 h-4" /> Scenario Engine
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-6">Macroeconomic Shocks</h3>

          <div className="space-y-8">
            {[
              { label: 'Unemployment Shock', key: 'unemploymentShock', suffix: '%', min: 0, max: 10, step: 0.5, color: '#f43f5e', icon: TrendingUp },
              { label: 'Credit Spread (Bps)', key: 'creditSpreadBps', suffix: 'bps', min: 0, max: 500, step: 25, color: '#f59e0b', icon: TrendingUp },
              { label: 'Real GDP Growth', key: 'realGDPGrowth', suffix: '%', min: -10, max: 5, step: 0.5, color: '#10b981', icon: TrendingDown },
            ].map(({ label, key, suffix, min, max, step, color, icon: Icon }) => (
              <div key={key} className="group">
                <div className="flex justify-between items-end mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{label}</span>
                  </div>
                  <span className="text-sm font-black tabular-nums" style={{ color }}>{params[key as keyof typeof params]}{suffix}</span>
                </div>
                <div className="relative h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-1">
                  <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-200" style={{ backgroundColor: color, width: `${((params[key as keyof typeof params] as number) - min) / (max - min) * 100}%` }} />
                </div>
                <input
                  type="range" min={min} max={max} step={step}
                  value={params[key as keyof typeof params] as number}
                  onChange={e => setParams(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 opacity-0 absolute -mt-2.5 cursor-pointer"
                />
              </div>
            ))}

            <div className="pt-2 border-t border-white/[0.04]">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-3">Time Horizon</label>
              <div className="flex bg-black border border-white/[0.06] rounded-xl p-1">
                {['1Y', '2Y', '3Y'].map(h => (
                  <button
                    key={h}
                    onClick={() => setParams(p => ({ ...p, horizon: h }))}
                    className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-colors ${params.horizon === h ? 'bg-white/[0.08] text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Previous Scenarios */}
          {savedScenarios.length > 0 && (
            <div className="mt-10 pt-6 border-t border-white/[0.04]">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Recent Runs</h3>
              <div className="space-y-2">
                {savedScenarios.slice(0, 5).map((s: any) => (
                  <div key={s.id} className="p-3 bg-black border border-white/[0.04] hover:border-white/[0.12] hover:bg-white/[0.02] rounded-xl transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[12px] font-bold text-zinc-300 group-hover:text-white transition-colors">{s.name}</div>
                      <span className="text-[9px] font-mono text-zinc-600 bg-white/[0.04] px-1.5 py-0.5 rounded">{s.horizon}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500">EL: <span className="font-semibold text-rose-400/80">${s.expectedLoss?.toFixed(1)}M</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 pb-20 custom-scrollbar">
        <SectionHeader
          title="Macroeconomic Scenario Engine"
          subtitle={`IFRS 9 Regulatory Stress Testing — Horizon: ${params.horizon}`}
          badge={
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" /> Adverse Condition
            </div>
          }
        />

        {!result && !runMutation.isPending && (
          <div className="flex flex-col items-center justify-center min-h-[500px] border border-white/[0.04] rounded-3xl bg-[#0a0a0a] relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/[0.03] via-transparent to-transparent pointer-events-none transition-opacity duration-1000 opacity-50 group-hover:opacity-100" />
            <Brain className="w-16 h-16 text-zinc-800 mb-6" />
            <h3 className="text-lg font-bold text-white mb-2">Engine Ready for Simulation</h3>
            <p className="text-zinc-500 text-sm font-medium mb-8 max-w-sm text-center">Configure the macroeconomic shocks in the side panel and initialize the stress test.</p>
            <button
              onClick={() => runMutation.mutate(params)}
              className="px-6 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-all"
            >
              Initialize Baseline
            </button>
          </div>
        )}

        {runMutation.isPending && (
          <div className="flex flex-col items-center justify-center min-h-[500px] border border-white/[0.04] rounded-3xl bg-[#0a0a0a] relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/[0.05] via-transparent to-transparent pointer-events-none animate-pulse" />
             <div className="relative">
                <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-ping opacity-20" />
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6 relative z-10" />
             </div>
            <h3 className="text-lg font-bold text-white mb-2">Simulating Portfolio Stress...</h3>
            <p className="text-zinc-500 text-sm font-medium">Applying {params.unemploymentShock}% unemployment shock across vectors.</p>
          </div>
        )}

        {result && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-5">
              <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden group hover:border-white/[0.1] transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Total ECL (Stressed)</div>
                <div className="text-4xl font-black text-rose-400 tabular-nums tracking-tight mb-1">${animatedStressEL.toFixed(1)}M</div>
                <div className="text-xs font-semibold text-rose-500/70">+18.2% vs Baseline</div>
              </div>
              
              <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden group hover:border-white/[0.1] transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">RWA Impact</div>
                <div className="text-4xl font-black text-amber-400 tabular-nums tracking-tight mb-1">+${animatedRwaImpact}M</div>
                <div className="text-xs font-semibold text-amber-500/70">Capital Requirement ↑</div>
              </div>
              
              <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden group hover:border-white/[0.1] transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Stage Migrations</div>
                <div className="text-4xl font-black text-white tabular-nums tracking-tight mb-1">{animatedMigrated}</div>
                <div className="text-xs font-semibold text-zinc-500">Entities downgraded</div>
              </div>
              
              <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-500/[0.02] group-hover:bg-emerald-500/[0.04] transition-colors" />
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
                <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-1">Status</div>
                <div className="text-xs font-medium text-emerald-500/70">Simulation Completed</div>
              </div>
            </div>

            {/* Stage Migration Chart */}
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-7 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
              <div className="flex items-center justify-between mb-8 relative z-10">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">IFRS 9 Stage Migration Analysis</h2>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-white/[0.08]" /><span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Baseline</span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-rose-500/80" /><span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Stressed</span></div>
                </div>
              </div>
              <div className="h-[320px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageData} barGap={12} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a', fontWeight: 600 }} tickLine={false} axisLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a', fontWeight: 600 }} tickLine={false} axisLine={false} dx={-10} tickFormatter={(v) => `$${v / 1000}B`} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                      contentStyle={{ backgroundColor: '#000', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', padding: '12px' }} 
                      itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 600 }} 
                      labelStyle={{ color: '#a1a1aa', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}
                    />
                    <Bar dataKey="baseline" name="Baseline Exposure" fill="rgba(255,255,255,0.08)" radius={[6,6,0,0]} maxBarSize={60} />
                    <Bar dataKey="adverse" name="Stressed Exposure" radius={[6,6,0,0]} maxBarSize={60}>
                      {stageData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Impacted Counterparties */}
            {result.counterpartyDetails?.length > 0 && (
              <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="px-7 py-5 border-b border-white/[0.06] bg-[#0a0a0a] flex justify-between items-center">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Top Impacted Counterparties</h2>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-1 rounded">High Vulnerability</span>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                        {['Entity', 'Base PD', 'Stressed PD', 'Δ PD', 'Migration', 'Stressed ECL'].map((h, i) => (
                          <th key={h} className={`px-7 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-600 whitespace-nowrap ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.counterpartyDetails.slice(0, 10).map((c: any) => (
                        <tr key={c.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors group">
                          <td className="px-7 py-5">
                            <div className="font-bold text-[13px] text-white tracking-tight">{c.name}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider">{c.sector || 'Corporate'}</div>
                          </td>
                          <td className="px-7 py-5">
                             <span className="font-mono text-xs font-semibold text-zinc-400 bg-white/[0.03] px-2 py-1 rounded border border-white/[0.05]">{c.basePD.toFixed(2)}%</span>
                          </td>
                          <td className="px-7 py-5">
                             <span className="font-mono text-xs font-black text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">{c.stressedPD.toFixed(2)}%</span>
                          </td>
                          <td className="px-7 py-5">
                            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                              <TrendingUp className="w-3.5 h-3.5" /> +{c.pdDelta.toFixed(2)}%
                            </div>
                          </td>
                          <td className="px-7 py-5">
                            {c.stressMigrated ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded">{c.baseStage}</span>
                                <span className="text-zinc-600 text-[10px]">→</span>
                                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded animate-pulse">{c.newStage}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">No Migration</span>
                            )}
                          </td>
                          <td className="px-7 py-5 text-right">
                            <div className="text-[15px] font-black text-white tabular-nums">${c.expectedLoss.toFixed(1)}M</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
