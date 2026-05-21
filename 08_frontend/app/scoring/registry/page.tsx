'use client'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Server, Activity, ShieldAlert, Cpu, CheckCircle2, AlertTriangle, Play, Archive, RefreshCw } from 'lucide-react'
import { SectionHeader } from '@/components/ui'
import { fetchApi } from '@/lib/api-client'

export default function ModelRegistryPage() {
  const versionsQuery = useQuery({
    queryKey: ['registry-versions'],
    queryFn: () => fetchApi('/registry/versions'),
    refetchInterval: 30000,
  })

  const championQuery = useQuery({
    queryKey: ['registry-champion'],
    queryFn: () => fetchApi('/registry/champion'),
    refetchInterval: 30000,
  })

  const versions = versionsQuery.data || []
  const champion = championQuery.data

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'CHAMPION': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      case 'CHALLENGER': return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      case 'SHADOW': return 'bg-purple-500/10 text-purple-400 border-purple-500/30'
      case 'ARCHIVED': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
      case 'DEGRADED': return 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      case 'REVIEW_REQUIRED': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'CHAMPION': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      case 'CHALLENGER': return <Play className="w-4 h-4 text-blue-400" />
      case 'SHADOW': return <Activity className="w-4 h-4 text-purple-400" />
      case 'ARCHIVED': return <Archive className="w-4 h-4 text-zinc-400" />
      case 'DEGRADED': return <ShieldAlert className="w-4 h-4 text-rose-400" />
      case 'REVIEW_REQUIRED': return <AlertTriangle className="w-4 h-4 text-amber-400" />
      default: return <Server className="w-4 h-4 text-zinc-400" />
    }
  }

  return (
    <div className="p-6 space-y-6 page-enter pb-10">
      <SectionHeader
        title="Model Registry & Governance"
        subtitle="Lifecycle observability, champion-challenger orchestration, and MRM status."
        actions={
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/[0.08] rounded-lg text-[12px] font-semibold text-white transition-colors flex items-center gap-2" onClick={() => versionsQuery.refetch()}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Registry
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-6">
        {/* Active Champion Panel */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Active Champion</h2>
          {championQuery.isLoading ? (
            <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-6 h-[250px] flex items-center justify-center">
              <Activity className="w-6 h-6 animate-spin text-zinc-600" />
            </div>
          ) : !champion ? (
            <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-6 h-[250px] flex flex-col items-center justify-center text-zinc-500">
              <Server className="w-8 h-8 mb-2 opacity-50" />
              <div className="text-sm">No Active Champion Model</div>
            </div>
          ) : (
            <div className="bg-[#0d0d0d] border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <CheckCircle2 className="w-24 h-24 text-emerald-500" />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Champion
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">v{champion.versionTag}</div>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{champion.modelName}</h3>
                <p className="text-xs text-zinc-400 mb-6 line-clamp-2">{champion.description}</p>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs border-b border-white/[0.04] pb-2">
                    <span className="text-zinc-500">Algorithm</span>
                    <span className="text-zinc-300 font-mono">{champion.algorithm}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-white/[0.04] pb-2">
                    <span className="text-zinc-500">Feature Schema</span>
                    <span className="text-zinc-300 font-mono">{champion.featureSchemaVersion}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-white/[0.04] pb-2">
                    <span className="text-zinc-500">Deployed At</span>
                    <span className="text-zinc-300">{new Date(champion.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Metrics (Placeholder for future hookup) */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-[#0d0d0d] border border-white/[0.08] p-4 rounded-xl">
                <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Health Status</div>
                <div className="text-sm font-bold text-emerald-400">HEALTHY</div>
             </div>
             <div className="bg-[#0d0d0d] border border-white/[0.08] p-4 rounded-xl">
                <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Last Review</div>
                <div className="text-sm font-bold text-white">7 days ago</div>
             </div>
          </div>
        </div>

        {/* All Models List */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          <div className="flex justify-between items-end">
             <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Registry Inventory</h2>
             <span className="text-[10px] text-zinc-500">{versions.length} Total Versions</span>
          </div>
          
          <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden flex-1 min-h-[400px]">
             {versionsQuery.isLoading ? (
                <div className="flex h-full items-center justify-center"><Activity className="w-6 h-6 animate-spin text-zinc-600" /></div>
             ) : versions.length === 0 ? (
                <div className="flex h-full items-center justify-center text-zinc-600">No models in registry.</div>
             ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-black">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Model Name</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Algorithm</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Deployed</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {versions.map((v: any) => (
                      <tr key={v.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Cpu className="w-4 h-4 text-zinc-600" />
                            <div>
                              <div className="text-sm font-semibold text-white">{v.modelName}</div>
                              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{v.versionTag}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest border ${getStatusColor(v.status)}`}>
                            {getStatusIcon(v.status)}
                            {v.status}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className="text-xs text-zinc-400 font-mono bg-white/[0.04] px-2 py-1 rounded">{v.algorithm}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-400">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-[11px] font-bold text-blue-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            View Details →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             )}
          </div>
        </div>
      </div>
    </div>
  )
}
