'use client'

import { CheckCircle2, Clock, AlertTriangle, XCircle, Search, Plus, Loader2, FileText, ArrowRight, SlidersHorizontal, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchClient } from '@/lib/api-client'
import { formatDistanceToNow } from '@/lib/date-utils'
import { motion, AnimatePresence } from 'framer-motion'

// ── Config ─────────────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2; dot: string }> = {
  approved:           { label: 'Approved',       color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', icon: CheckCircle2,  dot: 'bg-emerald-400' },
  under_review:       { label: 'Under Review',   color: 'text-brand-400',   bg: 'bg-brand-400/8',    border: 'border-brand-400/20',    icon: Clock,         dot: 'bg-brand-400' },
  documents_required: { label: 'Action Required',color: 'text-amber-400',   bg: 'bg-amber-500/8',   border: 'border-amber-500/20',   icon: AlertTriangle, dot: 'bg-amber-400' },
  rejected:           { label: 'Not Approved',   color: 'text-red-400',     bg: 'bg-red-500/8',     border: 'border-red-500/20',     icon: XCircle,       dot: 'bg-red-400' },
}

const FILTERS = ['All', 'Under Review', 'Action Required', 'Approved', 'Not Approved']

// ── Animations ─────────────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
} as const

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-white/[0.04] animate-pulse rounded-2xl ${className}`} />
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function ApplicationsPage() {
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('All')

  const { data: applications = [], isLoading, error } = useQuery({
    queryKey: ['client-apps'],
    queryFn: () => fetchClient('/client/applications'),
  })

  const filtered = (applications as any[]).filter(app => {
    const matchSearch = (app.title ?? '').toLowerCase().includes(search.toLowerCase()) || (app.id ?? '').includes(search)
    const matchFilter = filter === 'All' || STATUS[app.status]?.label === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="relative space-y-7 pb-12 min-h-screen">
      
      {/* ── Ambient Glows (Glassmorphism) ────────────────────────────────────── */}
      <div className="absolute top-[-50px] left-[-100px] w-[600px] h-[600px] bg-brand-400/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-150px] w-[500px] h-[500px] bg-blue-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 space-y-7">
        
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-3.5 h-3.5 text-brand-400" />
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Applications</span>
            </div>
            <h1 className="text-3xl font-medium text-white tracking-tight">My Applications</h1>
            <p className="text-zinc-500 text-[13px] mt-1">Track and manage your facility requests</p>
          </div>
          <Link
            href="/client-portal/applications/new"
            className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-brand-400 hover:bg-brand-400/90 text-[#0a0a0a] rounded-xl text-[13px] font-semibold transition-all shadow-[0_0_24px_rgba(59,123,255,0.15)] hover:shadow-[0_0_36px_rgba(59,123,255,0.25)]"
          >
            <Plus className="w-4 h-4" />
            New Application
          </Link>
        </motion.div>

        {/* ── Filters Bar ────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="bg-[#0a0a0a]/80 backdrop-blur-md border border-white/[0.06] rounded-2xl p-4 flex flex-wrap items-center gap-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-400/5 to-transparent opacity-50" />
          
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm z-10">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by title or reference..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white/[0.03] border border-white/[0.06] rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-400/30 focus:border-brand-400/30 transition-all hover:bg-white/[0.05]"
            />
          </div>

          {/* Status filters */}
          <div className="flex items-center gap-1.5 flex-wrap z-10">
            <SlidersHorizontal className="w-4 h-4 text-zinc-600 mr-2" />
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  filter === f
                    ? 'bg-brand-400/15 border border-brand-400/30 text-brand-400 shadow-[0_0_15px_rgba(59,123,255,0.15)]'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Total count */}
          <div className="ml-auto text-[12px] font-medium text-zinc-600 flex-shrink-0 z-10">
            <span className="text-zinc-300">{filtered.length}</span> result{filtered.length !== 1 ? 's' : ''}
          </div>
        </motion.div>

        {/* ── Loading Skeletons ───────────────────────────────────────────────── */}
        {isLoading && (
          <motion.div variants={itemVariants} className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
          </motion.div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────────── */}
        {error && (
          <motion.div variants={itemVariants} className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[40px]" />
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3 relative z-10" />
            <p className="text-[14px] font-medium text-red-400 mb-1 relative z-10">Could not load applications</p>
            <p className="text-[12px] text-zinc-500 relative z-10">{(error as Error).message}</p>
          </motion.div>
        )}

        {/* ── Application Cards ───────────────────────────────────────────────── */}
        {!isLoading && !error && (
          <motion.div variants={containerVariants} className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((app: any) => {
                const cfg = STATUS[app.status] ?? STATUS.under_review
                const StatusIcon = cfg.icon

                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    key={app.id}
                  >
                    <Link href={`/client-portal/applications/${app.id}`} className="block group">
                      <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-5 hover:border-brand-400/30 hover:bg-[#0c0c0e] transition-all relative overflow-hidden">
                        
                        {/* Hover glow effect */}
                        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-400/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        <div className="flex items-start justify-between gap-4 relative z-10">
                          <div className="flex-1 min-w-0">
                            {/* Top row: ID + status */}
                            <div className="flex items-center gap-2.5 mb-2.5">
                              <span className="text-[10px] font-mono text-zinc-500 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.05]">
                                {app.id}
                              </span>
                              <span className="text-[10px] text-zinc-700">·</span>
                              <span className="text-[11px] font-medium text-zinc-500">{app.type || 'Facility Request'}</span>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                                <StatusIcon className="w-2.5 h-2.5" />
                                {cfg.label}
                              </span>
                            </div>

                            {/* Title + Amount */}
                            <div className="flex items-baseline gap-4 mb-4">
                              <h3 className="text-[16px] font-medium text-white tracking-tight">{app.title}</h3>
                              <span className="text-xl font-medium text-white/90 tracking-tight">
                                {new Intl.NumberFormat('fr-CM', { style: 'currency', currency: app.currency || 'XAF', notation: 'compact', maximumFractionDigits: 0 }).format(app.requestedAmount)}
                              </span>
                            </div>

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-zinc-500">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                                Submitted {new Date(app.submittedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-zinc-600" />
                                Updated {formatDistanceToNow(new Date(app.lastUpdated))} ago
                              </div>
                              <div className={`flex items-center gap-1.5 ${cfg.color} bg-white/[0.02] px-2.5 py-1 rounded border border-white/[0.04]`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
                                <span className="font-medium tracking-tight">Next: {app.nextStep}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end justify-center gap-4 flex-shrink-0 h-full pt-4">
                            {app.eta && (
                              <div className="text-[11px] text-zinc-500 font-medium bg-white/[0.03] px-2 py-1 rounded-md border border-white/[0.05]">
                                ETA: {app.eta}
                              </div>
                            )}
                            <div className="w-8 h-8 rounded-full bg-white/[0.03] flex items-center justify-center group-hover:bg-brand-400/10 transition-colors">
                              <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Empty state */}
            {filtered.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                className="bg-[#0a0a0a] border border-dashed border-white/[0.08] rounded-2xl p-16 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto mb-5">
                  <Search className="w-6 h-6 text-zinc-600" />
                </div>
                <p className="text-[14px] font-medium text-white tracking-tight mb-1">No applications found</p>
                <p className="text-[13px] text-zinc-500 mb-6">Try adjusting your search terms or filters.</p>
                {filter !== 'All' && (
                  <button onClick={() => setFilter('All')} className="text-[12px] font-medium text-brand-400 hover:text-brand-400/80 bg-brand-400/10 px-4 py-2 rounded-lg border border-brand-400/20 transition-colors">
                    Clear Filters
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
