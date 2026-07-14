'use client'

import React, { useState } from 'react'
import { Bell, CheckCircle2, AlertTriangle, Loader2, Clock, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchClient } from '@/lib/api-client'
import { formatDistanceToNow } from '@/lib/date-utils'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

// ── Config ─────────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { dot: string; bg: string; border: string; iconBase: string }> = {
  action:  { dot: 'bg-amber-400',  bg: 'bg-amber-500/5',  border: 'border-amber-500/20', iconBase: 'text-amber-400' },
  success: { dot: 'bg-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', iconBase: 'text-emerald-400' },
  info:    { dot: 'bg-brand-400',   bg: 'bg-brand-400/5',   border: 'border-brand-400/20', iconBase: 'text-brand-400' },
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
} as const

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-white/[0.04] animate-pulse rounded-[20px] ${className}`} />
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['client-notifications'],
    queryFn: () => fetchClient('/client/notifications'),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => fetchClient(`/client/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = (notifications as any[]).filter(n => !n.isRead)
      await Promise.all(unread.map(n => fetchClient(`/client/notifications/${n.id}/read`, { method: 'PATCH' })))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-notifications'] }),
  })

  const allNotifications: any[] = notifications
  const unreadCount = allNotifications.filter(n => !n.isRead).length
  const displayed = filter === 'unread' ? allNotifications.filter(n => !n.isRead) : allNotifications

  return (
    <div className="max-w-3xl mx-auto space-y-7 pb-12 relative min-h-screen">

      {/* ── Ambient Glows (Glassmorphism) ────────────────────────────────────── */}
      <div className="absolute top-[-50px] right-[-100px] w-[500px] h-[500px] bg-brand-400/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 space-y-7">
        
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-3.5 h-3.5 text-brand-400" />
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Notifications</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-medium text-white tracking-tight">Notification Centre</h1>
              {unreadCount > 0 && (
                <span className="bg-brand-400/10 border border-brand-400/20 text-brand-400 text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 shadow-[0_0_15px_rgba(59,123,255,0.15)]">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="text-zinc-500 text-[13px] mt-1.5">Alerts, document requests, and decision updates</p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-white/[0.08] text-zinc-300 rounded-xl text-[12.5px] font-medium hover:bg-white/[0.07] hover:text-white transition-all disabled:opacity-50"
            >
              {markAllReadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Mark all read
            </button>
          )}
        </motion.div>

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="bg-[#0a0a0a]/80 backdrop-blur-md p-1.5 rounded-[16px] border border-white/[0.06] flex items-center gap-1 w-fit relative overflow-hidden">
          <button
            onClick={() => setFilter('all')}
            className={`px-5 py-2 rounded-xl text-[12.5px] font-medium transition-all ${
              filter === 'all'
                ? 'bg-brand-400 border border-brand-400/50 shadow-[0_0_15px_rgba(59,123,255,0.2)] text-[#0a0a0a]'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            All ({allNotifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-5 py-2 rounded-xl text-[12.5px] font-medium transition-all ${
              filter === 'unread'
                ? 'bg-brand-400 border border-brand-400/50 shadow-[0_0_15px_rgba(59,123,255,0.2)] text-[#0a0a0a]'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </motion.div>

        {/* ── List ───────────────────────────────────────────────────────────── */}
        {isLoading ? (
          <motion.div variants={itemVariants} className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[100px]" />)}
          </motion.div>
        ) : displayed.length === 0 ? (
          <motion.div variants={itemVariants} className="bg-[#0a0a0a]/80 backdrop-blur-md border border-dashed border-white/[0.08] rounded-[24px] p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto mb-5">
              <Bell className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-[15px] font-medium text-white tracking-tight mb-1">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-[13px] text-zinc-500">
              Important updates about your applications will appear here.
            </p>
          </motion.div>
        ) : (
          <motion.div variants={containerVariants} className="space-y-3">
            <AnimatePresence mode="popLayout">
              {displayed.map((notif) => {
                const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info
                const unread = !notif.isRead

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={notif.id}
                    onClick={() => unread && markReadMutation.mutate(notif.id)}
                    className={`relative overflow-hidden border rounded-[20px] p-5 md:p-6 flex flex-col sm:flex-row sm:items-start gap-5 transition-all group ${
                      unread
                        ? `cursor-pointer bg-[#0a0a0a]/90 backdrop-blur-md border-white/[0.1] hover:border-brand-400/30 hover:bg-[#0c0c0c] shadow-[0_4px_24px_rgba(0,0,0,0.2)]`
                        : `bg-[#0a0a0a]/40 border-white/[0.03] opacity-70`
                    }`}
                  >
                    {/* Active left border indicator for unread */}
                    {unread && <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${cfg.dot} rounded-l-[20px] shadow-[0_0_10px_${cfg.dot}]`} />}

                    {/* Left col: Dot + Icon area */}
                    <div className="flex items-start gap-3 flex-shrink-0">
                      {unread ? (
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${cfg.bg} border ${cfg.border}`}>
                          {notif.type === 'action'  && <AlertTriangle className={`w-5 h-5 ${cfg.iconBase}`} />}
                          {notif.type === 'success' && <CheckCircle2 className={`w-5 h-5 ${cfg.iconBase}`} />}
                          {notif.type === 'info'    && <Clock className={`w-5 h-5 ${cfg.iconBase}`} />}
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/[0.02] border border-white/[0.04]">
                          {notif.type === 'action'  && <AlertTriangle className="w-5 h-5 text-zinc-600" />}
                          {notif.type === 'success' && <CheckCircle2 className="w-5 h-5 text-zinc-600" />}
                          {notif.type === 'info'    && <Clock className="w-5 h-5 text-zinc-600" />}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <p className={`text-[15px] font-medium tracking-tight ${unread ? 'text-white' : 'text-zinc-400'}`}>
                          {notif.title}
                        </p>
                        <span className="text-[11px] text-zinc-500 font-medium whitespace-nowrap">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </span>
                      </div>

                      <p className={`text-[13px] leading-relaxed mb-3 ${unread ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        {notif.message}
                      </p>

                      {notif.appReqId && (
                        <Link
                          href={`/client-portal/applications/${notif.appReqId}`}
                          onClick={e => e.stopPropagation()}
                          className={`inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${
                            unread
                              ? 'text-brand-400 bg-brand-400/5 border-brand-400/20 hover:bg-brand-400/15 shadow-[0_0_10px_rgba(59,123,255,0.1)]'
                              : 'text-zinc-500 bg-white/[0.02] border-white/[0.05] hover:text-zinc-300 hover:bg-white/[0.04]'
                          }`}
                        >
                          View Application <CheckCircle2 className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
