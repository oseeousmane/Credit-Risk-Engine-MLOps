'use client'
import { useState } from 'react'
import { ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionHeader } from '@/components/ui'
import { fetchApi } from '@/lib/api-client'

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

type SevKey = 'CRITICAL' | 'WARNING' | 'INFO'

const SEV_CFG: Record<SevKey, { Icon: typeof ShieldAlert; label: string; border: string; badge: string; iconColor: string; iconBg: string }> = {
  CRITICAL: {
    Icon: ShieldAlert,
    label: 'Critical',
    border: 'border-l-rose-500',
    badge: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10',
  },
  WARNING: {
    Icon: AlertTriangle,
    label: 'Warning',
    border: 'border-l-amber-500',
    badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
  },
  INFO: {
    Icon: AlertCircle,
    label: 'Info',
    border: 'border-l-blue-500',
    badge: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
  },
}

export default function AlertCenterPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'active' | 'resolved'>('active')

  const alertsQuery = useQuery({
    queryKey: ['alerts', filter],
    queryFn: () => fetchApi(`/monitoring/alerts?resolved=${filter === 'resolved'}`),
    refetchInterval: 30000,
  })

  const alerts: any[] = alertsQuery.data || []
  const critical = alerts.filter((a) => a.severity === 'CRITICAL').length
  const warning = alerts.filter((a) => a.severity === 'WARNING').length

  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-6 page-enter pb-10">
      <SectionHeader
        title="Alert Center"
        subtitle="Real-time system events, compliance breaches, and threshold alerts."
        actions={
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['alerts'] })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.04] text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Active Alerts</div>
          <div className="text-4xl font-black text-white tabular-nums">{alerts.length}</div>
        </div>
        <div className={`bg-[#0d0d0d] border rounded-xl p-5 ${critical > 0 ? 'border-rose-500/30' : 'border-white/[0.08]'}`}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Critical</div>
          <div className={`text-4xl font-black tabular-nums ${critical > 0 ? 'text-rose-400' : 'text-white'}`}>{critical}</div>
        </div>
        <div className={`bg-[#0d0d0d] border rounded-xl p-5 ${warning > 0 ? 'border-amber-500/30' : 'border-white/[0.08]'}`}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Warnings</div>
          <div className={`text-4xl font-black tabular-nums ${warning > 0 ? 'text-amber-400' : 'text-white'}`}>{warning}</div>
        </div>
      </div>

      {/* Alert list */}
      <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] bg-[#0a0a0a] flex items-center justify-between">
          <div className="flex gap-1 bg-black border border-white/[0.06] rounded-lg p-1">
            {(['active', 'resolved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-colors uppercase tracking-widest ${
                  filter === f ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {alertsQuery.isLoading && <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />}
        </div>

        <div className="divide-y divide-white/[0.04]">
          {alertsQuery.isLoading ? (
            <div className="py-20 flex items-center justify-center text-zinc-600">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/40" />
              <p className="text-sm font-medium text-zinc-500">No {filter} alerts</p>
            </div>
          ) : (
            alerts.map((alert: any) => {
              const cfg = SEV_CFG[(alert.severity as SevKey)] ?? SEV_CFG.INFO
              const { Icon } = cfg
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-5 px-6 py-5 border-l-2 ${cfg.border} hover:bg-white/[0.02] transition-colors`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.iconBg}`}>
                    <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${cfg.badge}`}>
                        <Icon className="w-2.5 h-2.5 flex-shrink-0" aria-hidden="true" />
                        {cfg.label}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-600">{timeAgo(alert.createdAt)}</span>
                    </div>
                    <p className="text-sm font-semibold text-white leading-snug">{alert.message}</p>
                    {alert.detail && (
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{alert.detail}</p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
