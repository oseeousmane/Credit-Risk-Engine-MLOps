'use client'
import * as React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, Cell
} from 'recharts'
import { ShieldAlert, FileSearch, Database, Activity, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { SectionHeader } from '@/components/ui'
import { fetchApi } from '@/lib/api-client'

export default function FeatureQualityPage() {
  const missingQuery = useQuery({
    queryKey: ['feature-analytics-missing'],
    queryFn: () => fetchApi('/feature-analytics/missing-features'),
  })

  const segQuery = useQuery({
    queryKey: ['feature-analytics-segmentation'],
    queryFn: () => fetchApi('/feature-analytics/segmentation'),
  })

  const lineageQuery = useQuery({
    queryKey: ['feature-analytics-lineage-trend'],
    queryFn: () => fetchApi('/feature-analytics/lineage-trend'),
  })

  const summaryQuery = useQuery({
    queryKey: ['feature-analytics-summary'],
    queryFn: () => fetchApi('/feature-analytics/summary'),
  })

  const missingFeatures = missingQuery.data || []
  const segmentation = segQuery.data || { bySector: [], byRiskLevel: [] }
  const lineageTrend = lineageQuery.data || []
  const summary = summaryQuery.data

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#111] border border-white/[0.1] p-3 rounded-lg text-xs shadow-2xl">
          <p className="text-zinc-400 mb-2 font-mono">{label}</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-zinc-300">{p.name}:</span>
              <span className="text-white font-bold">{p.value.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="p-6 space-y-6 page-enter pb-10">
      <SectionHeader
        title="Feature Quality & Lineage Analytics"
        subtitle="MRM-grade observability into raw data inputs, derived ratios, and imputed proxies."
        actions={
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-lg text-[12px] font-semibold text-blue-400 transition-colors">
              Export Lineage Report
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {summaryQuery.isLoading ? (
           <div className="col-span-4 h-28 flex items-center justify-center border border-white/[0.08] rounded-xl bg-[#0d0d0d]">
             <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
           </div>
        ) : (
          <>
            <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Global Payload Quality</span>
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-emerald-400 tracking-tight mb-1">{summary?.avgQualityScore?.toFixed(1) || '—'}%</div>
              <div className="text-xs text-zinc-500">Average over 30 days</div>
            </div>
            
            <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Avg Features Imputed</span>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-3xl font-black text-amber-400 tracking-tight mb-1">{summary?.avgImputedCount?.toFixed(0) || '—'}</div>
              <div className="text-xs text-zinc-500">Out of 158 total features</div>
            </div>

            <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">High Quality Payloads</span>
                <Database className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-3xl font-black text-white tracking-tight mb-1">{summary?.qualityDistribution?.HIGH || 0}</div>
              <div className="text-xs text-zinc-500">Inference Requests</div>
            </div>

            <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Low Quality Payloads</span>
                <FileSearch className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-3xl font-black text-rose-400 tracking-tight mb-1">{summary?.qualityDistribution?.LOW || 0}</div>
              <div className="text-xs text-zinc-500">Inference Requests</div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Lineage Trend */}
        <div className="col-span-8 bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-6 flex flex-col min-h-[350px]">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-6">Lineage Ratios Over Time (RAW vs DERIVED vs IMPUTED)</h2>
          <div className="flex-1">
            {lineageQuery.isLoading ? (
               <div className="flex h-full items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>
            ) : lineageTrend.length === 0 ? (
               <div className="flex h-full items-center justify-center text-zinc-600 text-sm">No lineage data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineageTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#52525b' }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 'auto']} tick={{ fontSize: 10, fill: '#52525b' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
                  <Line type="monotone" dataKey="avgRaw" name="RAW Features" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="avgDerived" name="DERIVED Features" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="avgImputed" name="IMPUTED Features" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Missing Features */}
        <div className="col-span-4 bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-6 flex flex-col min-h-[350px]">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-6">Top 10 Missing Features</h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
             {missingQuery.isLoading ? (
               <div className="flex h-full items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>
             ) : missingFeatures.length === 0 ? (
               <div className="flex h-full items-center justify-center text-zinc-600 text-sm">No missing feature data</div>
             ) : missingFeatures.map((feat: any, idx: number) => (
                <div key={feat.featureName} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-zinc-400 truncate max-w-[180px]">{feat.featureName}</span>
                    <span className="text-amber-400 font-bold">{feat.missCount}x</span>
                  </div>
                  <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500/50" 
                      style={{ width: `${Math.min((feat.missCount / (summary?.totalInferences || 1)) * 100, 100)}%` }} 
                    />
                  </div>
                </div>
             ))}
          </div>
        </div>
      </div>

      {/* Segmentation */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-6 flex flex-col min-h-[300px]">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-6">Payload Quality by Sector (Data Completeness)</h2>
          <div className="flex-1">
            {segQuery.isLoading ? (
               <div className="flex h-full items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>
            ) : segmentation.bySector.length === 0 ? (
               <div className="flex h-full items-center justify-center text-zinc-600 text-sm">No segmentation data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentation.bySector} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="sector" tick={{ fontSize: 10, fill: '#52525b' }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#52525b' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="avgScore" name="Avg Quality Score (%)" radius={[4, 4, 0, 0]}>
                    {segmentation.bySector.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.avgScore > 75 ? '#10b981' : entry.avgScore > 50 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
