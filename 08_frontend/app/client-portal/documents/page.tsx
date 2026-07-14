'use client'

import { Upload, CheckCircle2, Clock, AlertTriangle, FileText, X, Loader2, FolderOpen, ArrowUpFromLine } from 'lucide-react'
import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchClient } from '@/lib/api-client'
import { motion, AnimatePresence } from 'framer-motion'

// ── Config ─────────────────────────────────────────────────────────────────────
const DOC_STATUS: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  validated:          { label: 'Verified',   color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', icon: CheckCircle2 },
  pending_validation: { label: 'In Review',  color: 'text-brand-400',    bg: 'bg-brand-400/8',    border: 'border-brand-400/20',    icon: Clock },
  pending_upload:     { label: 'Required',   color: 'text-amber-400',   bg: 'bg-amber-500/8',   border: 'border-amber-500/20',   icon: AlertTriangle },
  rejected:           { label: 'Rejected',   color: 'text-red-400',     bg: 'bg-red-500/8',     border: 'border-red-500/20',     icon: X },
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
  return <div className={`bg-white/[0.04] animate-pulse rounded-2xl ${className}`} />
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ['client-documents'],
    queryFn: () => fetchClient('/client/documents'),
  })

  const docs: any[] = documents
  const verified        = docs.filter(d => d.status === 'validated').length
  const pendingUpload   = docs.filter(d => d.status === 'pending_upload').length
  const inReview        = docs.filter(d => d.status === 'pending_validation').length
  const rejected        = docs.filter(d => d.status === 'rejected').length
  const total           = docs.length || 1
  const completionPct   = Math.round((verified / total) * 100)

  return (
    <div className="relative space-y-7 pb-12 min-h-screen">
      
      {/* ── Ambient Glows (Glassmorphism) ────────────────────────────────────── */}
      <div className="absolute top-[-50px] right-[-100px] w-[500px] h-[500px] bg-brand-400/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 space-y-7">
        
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-600">Documents</span>
          </div>
          <h1 className="text-3xl font-medium text-white tracking-tight">Document Centre</h1>
          <p className="text-zinc-500 text-[13px] mt-1">Manage all files related to your credit applications</p>
        </motion.div>

        {/* ── Summary Bar ─────────────────────────────────────────────────────── */}
        {!isLoading && (
          <motion.div variants={itemVariants} className="bg-[#0a0a0a]/90 backdrop-blur-md border border-white/[0.06] rounded-[24px] p-6 relative overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-gradient-to-r from-brand-400/[0.03] to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-5 relative z-10">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500 mb-1">Completion</div>
                <div className="text-3xl font-medium text-white tracking-tight">{completionPct}%</div>
              </div>
              <div className="flex gap-6 text-right text-[12px]">
                <div>
                  <div className="text-zinc-500 mb-1 font-medium">Verified</div>
                  <div className="text-emerald-400 font-medium text-[15px]">{verified}</div>
                </div>
                <div>
                  <div className="text-zinc-500 mb-1 font-medium">In Review</div>
                  <div className="text-brand-400 font-medium text-[15px]">{inReview}</div>
                </div>
                <div>
                  <div className="text-zinc-500 mb-1 font-medium">Required</div>
                  <div className="text-amber-400 font-medium text-[15px]">{pendingUpload}</div>
                </div>
                {rejected > 0 && (
                  <div>
                    <div className="text-zinc-500 mb-1 font-medium">Rejected</div>
                    <div className="text-red-400 font-medium text-[15px]">{rejected}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-4 relative z-10">
              <div
                className="h-full bg-gradient-to-r from-brand-400/50 to-brand-400 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${completionPct}%` }}
              />
            </div>

            {pendingUpload > 0 && (
              <div className="flex items-center gap-3 text-[12px] text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 relative z-10 font-medium">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {pendingUpload} document{pendingUpload > 1 ? 's' : ''} still required — please upload to proceed with your application.
              </div>
            )}
          </motion.div>
        )}

        {/* ── Main Layout ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Document List */}
          <div className="lg:col-span-8 space-y-4">
            <motion.div variants={itemVariants} className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500 mb-2">
              All Documents
            </motion.div>

            {isLoading ? (
              <motion.div variants={itemVariants} className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
              </motion.div>
            ) : error ? (
              <motion.div variants={itemVariants} className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 text-center">
                <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-[14px] text-red-400 font-medium">Could not load documents</p>
                <p className="text-[12px] text-zinc-500 mt-1">{(error as Error).message}</p>
              </motion.div>
            ) : docs.length === 0 ? (
              <motion.div variants={itemVariants} className="bg-[#0a0a0a] border border-dashed border-white/[0.07] rounded-[24px] p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto mb-5">
                  <FolderOpen className="w-6 h-6 text-zinc-600" />
                </div>
                <p className="text-[14px] font-medium text-white tracking-tight mb-1">No documents found</p>
                <p className="text-[13px] text-zinc-500">Documents will appear here once your application is submitted.</p>
              </motion.div>
            ) : (
              <motion.div variants={containerVariants} className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {docs.map((doc) => {
                    const cfg = DOC_STATUS[doc.status as keyof typeof DOC_STATUS] ?? DOC_STATUS.pending_upload
                    const StatusIcon = cfg.icon
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={doc.id}
                        className={`bg-[#0a0a0a]/80 backdrop-blur-md border rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 md:gap-5 transition-all group ${
                          doc.status === 'pending_upload' ? 'border-amber-500/20 hover:border-amber-500/35 hover:bg-[#0c0c0c]' :
                          doc.status === 'rejected'       ? 'border-red-500/20 hover:border-red-500/35 hover:bg-[#0c0c0c]' :
                                                            'border-white/[0.06] hover:border-white/[0.12] hover:bg-[#0c0c0c]'
                        }`}
                      >
                        {/* File icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${cfg.bg} border ${cfg.border}`}>
                          <FileText className={`w-5 h-5 ${cfg.color}`} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1">
                            <span className="text-[14px] font-medium text-white tracking-tight">{doc.name}</span>
                            {!doc.required && (
                              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-full">
                                Optional
                              </span>
                            )}
                          </div>
                          <div className="text-[12.5px] text-zinc-500">{doc.description}</div>
                          {doc.status === 'rejected' && doc.rejectionReason && (
                            <div className="text-[12px] text-red-400 mt-2 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-1.5 font-medium inline-block">
                              ⚠ {doc.rejectionReason}
                            </div>
                          )}
                          {doc.uploadedAt && (
                            <div className="text-[11px] text-zinc-600 font-medium mt-2">
                              Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 flex-shrink-0 mt-2 md:mt-0">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium uppercase tracking-wider border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {cfg.label}
                          </span>
                          {(doc.status === 'pending_upload' || doc.status === 'rejected') ? (
                            <button className="flex items-center gap-1.5 px-4 py-2 bg-brand-400/10 border border-brand-400/20 text-brand-400 rounded-xl text-[12px] font-medium hover:bg-brand-400/20 transition-all shadow-[0_0_15px_rgba(59,123,255,0.1)]">
                              <Upload className="w-3.5 h-3.5" />
                              Upload
                            </button>
                          ) : doc.fileUrl ? (
                            <button className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.03] border border-white/[0.08] text-zinc-300 rounded-xl text-[12px] font-medium hover:bg-white/[0.06] hover:text-white transition-all">
                              View
                            </button>
                          ) : null}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          {/* Upload Panel */}
          <div className="lg:col-span-4 space-y-6">
            <motion.div variants={itemVariants} className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500 mb-2">
              Upload
            </motion.div>

            {/* Drop Zone */}
            <motion.div
              variants={itemVariants}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false) }}
              className={`border-2 border-dashed rounded-[24px] p-8 text-center cursor-pointer transition-all duration-300 ${
                dragging
                  ? 'border-brand-400/60 bg-brand-400/10 shadow-[0_0_30px_rgba(59,123,255,0.15)]'
                  : 'border-white/[0.08] bg-[#0a0a0a]/80 backdrop-blur-md hover:border-brand-400/40 hover:bg-brand-400/5'
              }`}
            >
              <input ref={fileRef} type="file" className="hidden" multiple accept=".pdf,.png,.jpg,.docx" />
              <div className="w-14 h-14 rounded-2xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center mx-auto mb-5 transition-transform group-hover:scale-110">
                <ArrowUpFromLine className="w-6 h-6 text-brand-400" />
              </div>
              <div className="text-[14px] font-medium text-white tracking-tight mb-1">Drop files here</div>
              <div className="text-[12.5px] text-zinc-500 mb-5">or click to browse your computer</div>
              <button
                onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                className="px-5 py-2.5 bg-brand-400/15 border border-brand-400/30 text-brand-400 text-[12px] font-medium rounded-xl hover:bg-brand-400/25 transition-all shadow-[0_0_15px_rgba(59,123,255,0.1)]"
              >
                Browse Files
              </button>
              <div className="mt-6 space-y-1 text-[11px] font-medium text-zinc-600">
                <div>PDF, PNG, JPG, DOCX supported</div>
                <div>Maximum 15 MB per file</div>
              </div>
            </motion.div>

            {/* Tips */}
            <motion.div variants={itemVariants} className="bg-brand-400/[0.03] border border-brand-400/15 rounded-[24px] p-6">
              <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-brand-400 mb-4">
                Document Tips
              </div>
              <ul className="space-y-3 text-[12.5px] text-zinc-400">
                {[
                  'Ensure all documents are dated and signed',
                  'PDFs preferred for financial statements',
                  'Scans must be clear and fully legible',
                  'Bank statements must show company name',
                ].map(tip => (
                  <li key={tip} className="flex items-start gap-2.5">
                    <span className="text-brand-400 font-bold flex-shrink-0 mt-0.5">·</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Support */}
            <motion.div variants={itemVariants} className="bg-[#0a0a0a]/80 backdrop-blur-md border border-white/[0.06] rounded-[24px] p-6">
              <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500 mb-3">
                Need Help?
              </div>
              <p className="text-[12.5px] text-zinc-400 mb-4 leading-relaxed">
                Contact your relationship manager for guidance on document requirements.
              </p>
              <button className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.07] rounded-xl text-[12.5px] text-zinc-300 font-medium hover:bg-white/[0.06] hover:text-white transition-all">
                Contact Support
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
