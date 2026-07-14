'use client'

import {
  CheckCircle2, Clock, FileText, Bell, AlertTriangle,
  ArrowRight, Shield, Plus, ChevronRight,
  Calendar, CircleDot, TrendingUp, FolderOpen,
  Phone, Mail, UserCircle2
} from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { fetchClient } from '@/lib/api-client'
import { formatDistanceToNow } from '@/lib/date-utils'
import { motion } from 'framer-motion'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { usePortalLocale } from '@/lib/portal-locale'

// ── Config ─────────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2; dot: string }> = {
  approved:           { label: 'Approved',       color: 'text-emerald-400', bg: 'bg-emerald-500/8',  border: 'border-emerald-500/20', icon: CheckCircle2,  dot: 'bg-emerald-400' },
  under_review:       { label: 'Under Review',   color: 'text-blue-400',    bg: 'bg-blue-500/8',     border: 'border-blue-500/20',    icon: Clock,         dot: 'bg-blue-400' },
  documents_required: { label: 'Action Required',color: 'text-amber-400',   bg: 'bg-amber-500/8',    border: 'border-amber-500/20',   icon: AlertTriangle, dot: 'bg-amber-400' },
  rejected:           { label: 'Not Approved',   color: 'text-red-400',     bg: 'bg-red-500/8',      border: 'border-red-500/20',     icon: AlertTriangle, dot: 'bg-red-400' },
}

const SPARKLINE_DATA = [
  { value: 10 }, { value: 15 }, { value: 12 }, { value: 20 }, { value: 25 }, { value: 22 }, { value: 30 }
]

// ── Animations ─────────────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
} as const

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-white/[0.04] animate-pulse rounded-lg ${className}`} />
}

function getGreetingPeriod(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ClientPortalDashboard() {
  const { t } = usePortalLocale()

  const {
    data: applications = [], isLoading: loadingApps, error: appsError
  } = useQuery({ queryKey: ['client-apps'], queryFn: () => fetchClient('/client/applications') })

  const {
    data: notifications = [], isLoading: loadingNotes
  } = useQuery({ queryKey: ['client-notifications'], queryFn: () => fetchClient('/client/notifications') })

  let firstName = 'there'
  let companyName = 'Your Company'
  if (typeof window !== 'undefined') {
    try {
      const u = JSON.parse(localStorage.getItem('client_user') || '{}')
      if (u.name) firstName = u.name.split(' ')[0]
      if (u.clientFirm?.name) companyName = u.clientFirm.name
    } catch {}
  }

  const activeApps     = (applications as any[]).filter(a => ['under_review', 'documents_required'].includes(a.status))
  const actionRequired = (applications as any[]).filter(a => a.status === 'documents_required')
  const unread         = (notifications as any[]).filter(n => !n.isRead)
  const primaryApp     = (applications as any[])[0]

  function stepIndexFromStatus(status: string): number {
    if (status === 'documents_required') return 1
    if (status === 'under_review')       return 2
    if (status === 'approved')           return 4
    if (status === 'rejected')           return 4
    return 0
  }

  const stepIndex = primaryApp ? stepIndexFromStatus(primaryApp.status) : -1
  const loading   = loadingApps || loadingNotes
  const period    = getGreetingPeriod()

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative pb-10 overflow-x-hidden min-h-screen">
      <div className="absolute top-[-100px] left-[-150px] w-[500px] h-[500px] bg-brand-400/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-100px] w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 space-y-8">

        {/* ── Welcome ─────────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-3.5 h-3.5 text-brand-400" />
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">{t.workspace}</span>
            </div>
            <h1 className="text-2xl font-medium text-white tracking-tight">
              {t.greeting(firstName, period)}
            </h1>
            <p className="text-zinc-500 text-[13px] mt-1">
              {companyName} · {t.portalSubtitle}
            </p>
          </div>
          <Link
            href="/client-portal/applications/new"
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-brand-400 hover:bg-brand-400/90 text-[#0a0a0a] rounded-md text-[13px] font-semibold transition-all shadow-[0_0_24px_rgba(59,123,255,0.15)] hover:shadow-[0_0_36px_rgba(59,123,255,0.25)]"
          >
            <Plus className="w-4 h-4" />
            {t.newApplication}
          </Link>
        </motion.div>

        {/* ── Action Required Banner ────────────────────────────────────────── */}
        {actionRequired.length > 0 && (
          <motion.div variants={itemVariants}>
            <Link href="/client-portal/documents" className="block">
              <div className="flex items-center gap-4 px-5 py-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl hover:border-amber-500/30 transition-all group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0 relative z-10">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 relative z-10">
                  <div className="text-[13px] font-medium tracking-tight text-amber-400">{t.actionRequired}</div>
                  <div className="text-[12px] text-amber-400/70 mt-0.5">
                    {t.actionRequiredDesc(actionRequired.length)}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-400/50 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all relative z-10" />
              </div>
            </Link>
          </motion.div>
        )}

        {/* ── KPI Cards ────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          ) : (
            [
              {
                label:     t.kpi.activeApps,
                value:     activeApps.length,
                icon:      FileText,
                accent:    'blue',
                colorCode: '#3b82f6',
                hint:      t.kpi.activeAppsHint,
                href:      '/client-portal/applications',
              },
              {
                label:     t.kpi.pendingDocs,
                value:     actionRequired.length,
                icon:      FolderOpen,
                accent:    'amber',
                colorCode: '#f59e0b',
                hint:      t.kpi.pendingDocsHint(actionRequired.length > 0),
                href:      '/client-portal/documents',
              },
              {
                label:     t.kpi.unread,
                value:     unread.length,
                icon:      Bell,
                accent:    'indigo',
                colorCode: '#6366f1',
                hint:      t.kpi.unreadHint(unread.length > 0),
                href:      '/client-portal/notifications',
              },
            ].map((kpi, i) => {
              const Icon = kpi.icon
              const palette = {
                blue:   { card: 'border-white/[0.06] hover:border-brand-400/30',   icon: 'bg-brand-400/10 text-brand-400',   val: 'text-white', hint: 'text-zinc-500' },
                amber:  { card: 'border-white/[0.06] hover:border-amber-500/30',   icon: 'bg-amber-500/10 text-amber-400',   val: 'text-white', hint: 'text-zinc-500' },
                indigo: { card: 'border-white/[0.06] hover:border-white/[0.12]',   icon: 'bg-white/[0.04] text-zinc-400',    val: 'text-white', hint: 'text-zinc-500' },
              }[kpi.accent] ?? {}
              const dynamicData = SPARKLINE_DATA.map(d => ({ value: d.value * (1 + (i * 0.2)) }))
              return (
                <Link key={kpi.label} href={kpi.href}>
                  <div className={`bg-[#0a0a0a] border rounded-2xl p-5 hover:bg-[#0c0c0c] transition-all cursor-pointer group relative overflow-hidden ${(palette as any).card}`}>
                    <div className="absolute bottom-0 left-0 right-0 h-16 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dynamicData}>
                          <Area type="monotone" dataKey="value" stroke="none" fill={kpi.colorCode} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="relative z-10">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${(palette as any).icon}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className={`text-3xl font-medium tracking-tight leading-none mb-1 ${(palette as any).val}`}>
                        {kpi.value}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-medium tracking-tight mb-1">{kpi.label}</div>
                      <div className={`text-[11px] font-medium tracking-tight flex items-center gap-1 ${(palette as any).hint}`}>
                        {kpi.hint}
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </motion.div>

        {/* ── Main Grid ────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-12 gap-6">

          {/* LEFT: Recent Applications */}
          <div className="col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                {t.recentApplications}
              </h2>
              <Link href="/client-portal/applications" className="text-[12px] text-brand-400 hover:text-brand-400/80 font-medium flex items-center gap-1 transition-colors">
                {t.viewAll} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loadingApps ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
              </div>
            ) : appsError ? (
              <div className="bg-red-500/8 border border-red-500/20 rounded-2xl p-6 text-center">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-[13px] text-red-400 font-medium">{t.error.loadApps}</p>
                <p className="text-[12px] text-zinc-600 mt-1">{(appsError as Error).message}</p>
              </div>
            ) : (applications as any[]).length === 0 ? (
              <div className="bg-[#0a0a0a] border border-dashed border-white/[0.07] rounded-2xl p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-zinc-600" />
                </div>
                <p className="text-[13px] font-medium tracking-tight text-zinc-300 mb-1">{t.error.noApps}</p>
                <p className="text-[12px] text-zinc-500 mb-5">{t.error.noAppsHint}</p>
                <Link
                  href="/client-portal/applications/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-400/10 border border-brand-400/20 rounded-md text-[13px] font-medium text-brand-400 hover:bg-brand-400/20 transition-all"
                >
                  <Plus className="w-4 h-4" /> {t.newApplication}
                </Link>
              </div>
            ) : (
              (applications as any[]).slice(0, 3).map((app: any) => {
                const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.under_review
                const StatusIcon = cfg.icon
                return (
                  <Link key={app.id} href={`/client-portal/applications/${app.id}`} className="block">
                    <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-5 hover:border-brand-400/25 hover:bg-[#0c0c0c] transition-all group cursor-pointer">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-mono text-zinc-500 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.05]">
                              {app.id}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                              <StatusIcon className="w-2.5 h-2.5" />
                              {cfg.label}
                            </span>
                          </div>
                          <div className="font-medium tracking-tight text-white text-[14px] mb-1">{app.title}</div>
                          <div className="text-xl font-medium tracking-tight text-white">
                            {new Intl.NumberFormat('fr-CM', { style: 'currency', currency: app.currency || 'XAF', notation: 'compact' }).format(app.requestedAmount)}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all mt-1 flex-shrink-0" />
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          <span className="text-[12px] text-zinc-500">{app.nextStep}</span>
                        </div>
                        {app.eta && (
                          <div className="flex items-center gap-1 text-[11px] text-zinc-600">
                            <Calendar className="w-3 h-3" />
                            {app.eta}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>

          {/* RIGHT: Sidebar */}
          <div className="col-span-5 space-y-5">

            {/* Application Timeline */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-4 h-4 text-brand-400" />
                <h3 className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500">
                  {t.appProgress}
                </h3>
              </div>
              {!primaryApp ? (
                <div className="text-[12px] text-zinc-700 text-center py-4">{t.noActiveApps}</div>
              ) : (
                <>
                  <div className="text-[10px] font-mono text-zinc-700 mb-4">{primaryApp.id}</div>
                  <div className="relative pl-4">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/[0.06]" />
                    <div className="space-y-5">
                      {t.pipeline.map((label, i) => {
                        const done    = i < stepIndex
                        const current = i === stepIndex
                        return (
                          <div key={i} className="flex items-center gap-3 relative">
                            <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 -ml-[1px] transition-all duration-500 ${
                              done    ? 'bg-brand-400 border-brand-400 shadow-[0_0_8px_rgba(59,123,255,0.4)]' :
                              current ? 'bg-brand-400 border-brand-400 shadow-[0_0_10px_rgba(59,123,255,0.5)] ring-4 ring-brand-400/15' :
                                        'bg-[#0a0a0a] border-white/[0.1]'
                            }`}>
                              {done    && <CheckCircle2 className="w-2 h-2 text-[#0a0a0a]" />}
                              {current && <CircleDot className="w-2 h-2 text-[#0a0a0a]" />}
                            </div>
                            <span className={`text-[12px] font-medium tracking-tight transition-colors ${
                              done    ? 'text-zinc-600 line-through' :
                              current ? 'text-white' :
                                        'text-zinc-500'
                            }`}>
                              {label}
                            </span>
                            {current && (
                              <motion.span
                                initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                                className="ml-auto text-[9px] font-medium tracking-wider text-brand-400 bg-brand-400/10 border border-brand-400/20 px-2 py-0.5 rounded-full"
                              >
                                Active
                              </motion.span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Notifications Preview */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-zinc-500" />
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500">{t.notifications}</h3>
                </div>
                {unread.length > 0 && (
                  <span className="text-[10px] font-medium text-brand-400 bg-brand-400/10 border border-brand-400/20 px-2 py-0.5 rounded-full">
                    {unread.length} {t.newUpdates}
                  </span>
                )}
              </div>
              <div className="divide-y divide-white/[0.03]">
                {loadingNotes ? (
                  <div className="p-5 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                  </div>
                ) : (notifications as any[]).length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-7 h-7 text-zinc-800 mx-auto mb-2" />
                    <p className="text-[12px] text-zinc-600">{t.noNotifications}</p>
                  </div>
                ) : (
                  (notifications as any[]).slice(0, 4).map((n: any) => {
                    const dot = n.type === 'action' ? 'bg-amber-400' : n.type === 'success' ? 'bg-emerald-400' : 'bg-blue-400'
                    return (
                      <div key={n.id} className={`px-5 py-3.5 flex items-start gap-3 hover:bg-white/[0.02] transition-colors ${n.isRead ? 'opacity-50' : ''}`}>
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-zinc-200 leading-snug">{n.title}</p>
                          <p className="text-[11px] text-zinc-600 mt-0.5">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="px-5 py-3 border-t border-white/[0.04]">
                <Link href="/client-portal/notifications" className="text-[12px] text-brand-400 hover:text-brand-400/80 font-medium tracking-tight flex items-center gap-1 transition-colors">
                  {t.viewAllNotifications} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* ── Contact RM Card ──────────────────────────────────────────── */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full blur-[40px]" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <UserCircle2 className="w-4 h-4 text-zinc-500" />
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500">
                    {t.support.title}
                  </h3>
                </div>
                <p className="text-[12px] text-zinc-400 mb-4 leading-relaxed">{t.support.subtitle}</p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <UserCircle2 className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                    <div>
                      <span className="text-[11px] text-zinc-600">{t.support.rmLabel} — </span>
                      <span className="text-[12px] font-semibold text-zinc-300">Jean-Marc Olé</span>
                    </div>
                  </div>
                  <a
                    href="mailto:j.ole@riskengine.cm"
                    className="flex items-center gap-2.5 group"
                  >
                    <Mail className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                    <span className="text-[12px] text-zinc-400 group-hover:text-brand-400 transition-colors font-medium">
                      j.ole@riskengine.cm
                    </span>
                  </a>
                  <a
                    href="tel:+237222123456"
                    className="flex items-center gap-2.5 group"
                  >
                    <Phone className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                    <span className="text-[12px] text-zinc-400 group-hover:text-brand-400 transition-colors font-medium">
                      +237 222 123 456
                    </span>
                  </a>
                  <div className="flex items-center gap-2.5 pt-1 border-t border-white/[0.04]">
                    <Clock className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                    <span className="text-[11px] text-zinc-600">{t.support.hours}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust & Security Panel */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px] group-hover:bg-emerald-500/10 transition-colors" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-zinc-500" />
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500">{t.trust.title}</h3>
                </div>
                <div className="space-y-2.5">
                  {t.trust.items.map(item => (
                    <div key={item} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0 mt-0.5" />
                      <span className="text-[12px] text-zinc-400 leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </motion.div>

      </motion.div>
    </div>
  )
}

