'use client'
import { Cpu, Server, CheckCircle2, Archive, Loader2, ArrowUpCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionHeader } from '@/components/ui'
import { fetchApi } from '@/lib/api-client'

type LifecycleKey = 'CHAMPION' | 'CHALLENGER' | 'ARCHIVED'

const LIFECYCLE_CFG: Record<LifecycleKey, { label: string; badge: string; Icon: typeof CheckCircle2 }> = {
  CHAMPION:   { label: 'Champion',   badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', Icon: CheckCircle2 },
  CHALLENGER: { label: 'Challenger', badge: 'text-blue-400 bg-blue-500/10 border-blue-500/30',         Icon: ArrowUpCircle },
  ARCHIVED:   { label: 'Archived',   badge: 'text-zinc-500 bg-white/[0.04] border-white/[0.08]',       Icon: Archive },
}

function MetricPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">{label}</span>
      <span className={`text-sm font-black tabular-nums ${color ?? 'text-white'}`}>{value}</span>
    </div>
  )
}

export default function ModelRegistryPage() {
  const queryClient = useQueryClient()

  const registryQuery = useQuery({
    queryKey: ['model-registry'],
    queryFn: () => fetchApi('/model-registry'),
  })

  const rollbackMutation = useMutation({
    mutationFn: (registryId: string) =>
      fetchApi(`/model-registry/${registryId}/rollback`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['model-registry'] }),
  })

  const promoteMutation = useMutation({
    mutationFn: (versionId: string) =>
      fetchApi(`/model-registry/versions/${versionId}/promote`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['model-registry'] }),
  })

  const registries: any[] = registryQuery.data || []

  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-6 page-enter pb-10">
      <SectionHeader
        title="Model Registry"
        subtitle="MLOps governance — version control, promotion gates, and production inference mapping."
      />

      {registryQuery.isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
        </div>
      ) : registries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/[0.06] rounded-2xl text-zinc-600 mt-8">
          <Server className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">No model registries found.</p>
        </div>
      ) : (
        <div className="space-y-6 mt-8">
          {registries.map((registry: any) => {
            const champion   = registry.versions?.find((v: any) => v.lifecycleStatus === 'CHAMPION')
            const challengers: any[] = registry.versions?.filter((v: any) => v.lifecycleStatus === 'CHALLENGER') ?? []
            const hasArchived: boolean = (registry.versions?.filter((v: any) => v.lifecycleStatus === 'ARCHIVED').length ?? 0) > 0

            return (
              <div key={registry.id} className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden">

                {/* Registry header */}
                <div className="px-7 py-5 border-b border-white/[0.06] bg-[#0a0a0a] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                      <Cpu className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{registry.name}</h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                        {registry.type} · {registry.versions?.length ?? 0} versions
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => rollbackMutation.mutate(registry.id)}
                    disabled={rollbackMutation.isPending || !hasArchived}
                    className="px-4 py-2 text-xs font-bold text-zinc-400 border border-white/[0.08] rounded-lg hover:text-white hover:bg-white/[0.04] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {rollbackMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    Rollback
                  </button>
                </div>

                {/* Champion section */}
                {champion ? (
                  <div className="px-7 py-6 border-b border-white/[0.04]">
                    <div className="flex items-center gap-3 mb-5">
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded border text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                        Production Champion
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">{champion.versionTag}</span>
                      {champion.deployedAt && (
                        <span className="text-[10px] text-zinc-600">
                          · Deployed {new Date(champion.deployedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-6 gap-6">
                      <MetricPill label="AUC" value={champion.auc != null ? champion.auc.toFixed(3) : '—'} color="text-emerald-400" />
                      <MetricPill label="KS Stat" value={champion.ks != null ? champion.ks.toFixed(3) : '—'} color="text-blue-400" />
                      <MetricPill label="PSI" value={champion.psi != null ? champion.psi.toFixed(3) : '—'} color={champion.psi > 0.1 ? 'text-amber-400' : 'text-white'} />
                      <MetricPill label="OOT AUC" value={champion.oot_auc != null ? champion.oot_auc.toFixed(3) : '—'} />
                      <MetricPill label="OOT KS" value={champion.oot_ks != null ? champion.oot_ks.toFixed(3) : '—'} />
                      <MetricPill
                        label="Status"
                        value={champion.status ?? '—'}
                        color={champion.status === 'HEALTHY' ? 'text-emerald-400' : 'text-amber-400'}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="px-7 py-5 border-b border-white/[0.04] text-zinc-600 text-sm">
                    No champion version deployed.
                  </div>
                )}

                {/* Challengers */}
                {challengers.length > 0 && (
                  <div className="px-7 py-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-4">
                      Challenger Versions
                    </p>
                    <div className="space-y-3">
                      {challengers.map((v: any) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:border-white/[0.1] transition-colors"
                        >
                          <div className="flex items-center gap-6">
                            <span className="text-xs font-mono text-zinc-300 bg-white/[0.04] px-2.5 py-1 rounded border border-white/[0.06]">
                              {v.versionTag}
                            </span>
                            <div className="flex gap-6">
                              <MetricPill label="AUC" value={v.auc != null ? v.auc.toFixed(3) : '—'} />
                              <MetricPill label="KS" value={v.ks != null ? v.ks.toFixed(3) : '—'} />
                              <MetricPill label="OOT AUC" value={v.oot_auc != null ? v.oot_auc.toFixed(3) : '—'} />
                              <MetricPill label="OOT KS" value={v.oot_ks != null ? v.oot_ks.toFixed(3) : '—'} />
                            </div>
                          </div>
                          <button
                            onClick={() => promoteMutation.mutate(v.id)}
                            disabled={promoteMutation.isPending}
                            className="px-4 py-1.5 text-xs font-bold text-blue-400 border border-blue-500/30 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {promoteMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                            Promote to Champion
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
