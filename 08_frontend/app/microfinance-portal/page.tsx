'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchClient } from '@/lib/api-client'
import {
  CheckCircle2, Clock, AlertTriangle, Phone, Mail,
  Upload, ChevronRight, TrendingUp, Shield,
  FileText, Loader2, Calendar, Banknote,
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

// ── Helpers ────────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function formatAmount(n: number, currency = 'XAF'): string {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

// ── Étapes du parcours emprunteur ─────────────────────────────────────────────
const STEPS = [
  { key: 'submitted',  label: 'Demande envoyée' },
  { key: 'review',     label: 'En cours d\'examen' },
  { key: 'decision',   label: 'Décision rendue' },
  { key: 'active',     label: 'Prêt actif' },
]

function stepFromStatus(status: string): number {
  if (status === 'documents_required') return 1
  if (status === 'under_review')       return 1
  if (status === 'approved')           return 2
  if (status === 'rejected')           return 2
  if (status === 'ACTIVE')             return 3
  return 0
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.04] ${className}`} />
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function MicrofinancePortalPage() {

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['mf-client-apps'],
    queryFn: () => fetchClient('/client/applications'),
  })

  const { data: notifications = [] } = useQuery({
    queryKey: ['mf-client-notifs'],
    queryFn: () => fetchClient('/client/notifications'),
  })

  // Nom de l'emprunteur depuis le cache de session
  let prenom = 'vous'
  if (typeof window !== 'undefined') {
    try {
      const u = JSON.parse(localStorage.getItem('client_user') || '{}')
      if (u.name) prenom = u.name.split(' ')[0]
    } catch {}
  }

  const apps      = applications as any[]
  const primaryApp = apps[0]
  const stepIndex  = primaryApp ? stepFromStatus(primaryApp.status) : -1
  const actionApp  = apps.find((a: any) => a.status === 'documents_required')
  const unread     = (notifications as any[]).filter(n => !n.isRead)

  return (
    <div className="min-h-screen bg-[#060608] font-sans">

      {/* ── Bandeau sécurité ──────────────────────────────────────────────── */}
      <div className="bg-brand-400/10 border-b border-brand-400/10 px-4 py-2 flex items-center justify-center gap-2">
        <Shield className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
        <span className="text-[11px] text-brand-400/80 font-bold uppercase tracking-widest">
          Session sécurisée · ORE Microfinance
        </span>
      </div>

      {/* ── En-tête ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-xl border-b border-white/[0.05] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-400 to-brand-500 flex items-center justify-center shadow-[0_0_16px_rgba(59,123,255,0.3)]">
            <TrendingUp className="w-4 h-4 text-[#0a0a0a]" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-white leading-none">ORE Microfinance</div>
            <div className="text-[10px] text-brand-400/70 uppercase tracking-widest mt-0.5">Mon espace</div>
          </div>
        </div>
        {unread.length > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] text-amber-400 font-bold">{unread.length} message{unread.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </header>

      {/* ── Contenu principal ─────────────────────────────────────────────── */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-16">

        {/* Salutation */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {getGreeting()}, {prenom} 👋
          </h1>
          <p className="text-zinc-500 text-[13px] mt-1">Voici l'état de votre dossier.</p>
        </motion.div>

        {/* ── Action urgente ────────────────────────────────────────────── */}
        {actionApp && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }}>
            <Link href="/client-portal/documents" className="block">
              <div className="flex items-center gap-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 group hover:border-amber-500/50 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="text-[14px] font-bold text-amber-400">Action requise</div>
                  <div className="text-[12px] text-amber-400/70 mt-0.5">
                    Des documents sont attendus pour traiter votre dossier.
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-amber-400/50 group-hover:text-amber-400 transition-colors" />
              </div>
            </Link>
          </motion.div>
        )}

        {/* ── Avancement du dossier ─────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}>
          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-5">
              Avancement de votre demande
            </h2>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8" />)}
              </div>
            ) : !primaryApp ? (
              <div className="text-center py-6">
                <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-[13px] text-zinc-500">Aucune demande en cours.</p>
                <Link
                  href="/client-portal/applications/new"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-brand-400/10 border border-brand-400/20 rounded-xl text-[13px] font-semibold text-brand-400 hover:bg-brand-400/20 transition-all"
                >
                  Faire une demande
                </Link>
              </div>
            ) : (
              <>
                {/* Référence dossier */}
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-[10px] font-mono text-zinc-600 bg-white/[0.03] border border-white/[0.05] px-2 py-0.5 rounded">
                    {primaryApp.id}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    primaryApp.status === 'approved'           ? 'text-emerald-400 bg-emerald-500/10' :
                    primaryApp.status === 'rejected'           ? 'text-red-400 bg-red-500/10'         :
                    primaryApp.status === 'documents_required' ? 'text-amber-400 bg-amber-500/10'     :
                                                                 'text-blue-400 bg-blue-500/10'
                  }`}>
                    {primaryApp.status === 'approved'           ? '✓ Approuvé'      :
                     primaryApp.status === 'rejected'           ? '✗ Non approuvé'  :
                     primaryApp.status === 'documents_required' ? '! Action requise' :
                                                                  'En cours'}
                  </span>
                </div>

                {/* Étapes visuelles */}
                <div className="relative pl-5">
                  <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-white/[0.05]" />
                  <div className="space-y-5">
                    {STEPS.map((step, i) => {
                      const done    = i < stepIndex
                      const current = i === stepIndex
                      return (
                        <div key={step.key} className="flex items-center gap-4 relative">
                          {/* Indicateur */}
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 -ml-[2px] transition-all ${
                            done    ? 'bg-brand-400 border-brand-400' :
                            current ? 'bg-brand-400 border-brand-400 ring-4 ring-brand-400/15' :
                                      'bg-[#0d0d0d] border-white/[0.12]'
                          }`}>
                            {done && <CheckCircle2 className="w-2.5 h-2.5 text-[#0a0a0a]" />}
                          </div>

                          {/* Label */}
                          <span className={`text-[14px] font-semibold transition-colors ${
                            done    ? 'text-zinc-600 line-through'   :
                            current ? 'text-white'                   :
                                      'text-zinc-600'
                          }`}>
                            {step.label}
                          </span>

                          {/* Badge "En cours" */}
                          {current && (
                            <span className="ml-auto text-[10px] font-bold text-brand-400 bg-brand-400/10 border border-brand-400/20 px-2 py-0.5 rounded-full">
                              En cours
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* ETA */}
                {primaryApp.eta && stepIndex < 3 && (
                  <div className="mt-5 flex items-center gap-2 text-[12px] text-zinc-500">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    Réponse estimée : <span className="text-zinc-300 font-semibold ml-1">{primaryApp.eta}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* ── Montant demandé ───────────────────────────────────────────── */}
        {primaryApp && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }}>
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center flex-shrink-0">
                <Banknote className="w-6 h-6 text-brand-400" />
              </div>
              <div>
                <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Montant demandé</div>
                <div className="text-2xl font-bold text-white">
                  {formatAmount(primaryApp.requestedAmount, primaryApp.currency || 'XAF')}
                </div>
                {primaryApp.title && (
                  <div className="text-[12px] text-zinc-500 mt-0.5">{primaryApp.title}</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Documents à fournir ───────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}>
          <Link href="/client-portal/documents" className="block">
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5 hover:border-brand-400/20 transition-all group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-zinc-500" />
                  <span className="text-[13px] font-semibold text-white">Mes documents</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-[12px] text-zinc-500">
                Déposez vos justificatifs directement depuis votre téléphone.
              </p>
              <p className="text-[11px] text-zinc-600 mt-1">
                Formats acceptés : Photo, PDF, JPEG
              </p>
            </div>
          </Link>
        </motion.div>

        {/* ── Contacter l'agent ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.25 } }}>
          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center text-[#0a0a0a] text-[11px] font-black">JO</div>
              <div>
                <div className="text-[13px] font-semibold text-white">Jean-Marc Olé</div>
                <div className="text-[11px] text-zinc-500">Votre agent de crédit</div>
              </div>
            </div>

            {/* CTA téléphone — le plus important pour la microfinance */}
            <a
              href="tel:+237222123456"
              className="w-full flex items-center justify-center gap-3 bg-brand-400 hover:bg-brand-400/90 text-[#0a0a0a] font-bold text-[15px] py-4 rounded-2xl transition-all shadow-[0_0_24px_rgba(59,123,255,0.2)] hover:shadow-[0_0_36px_rgba(59,123,255,0.35)] active:scale-[0.98]"
            >
              <Phone className="w-5 h-5" />
              Appeler l'agent
            </a>

            <div className="grid grid-cols-2 gap-3">
              <a
                href="mailto:j.ole@ore-microfinance.cm"
                className="flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.06] text-zinc-300 font-semibold text-[13px] py-3 rounded-xl hover:bg-white/[0.08] transition-all"
              >
                <Mail className="w-4 h-4" />
                E-mail
              </a>
              <Link
                href="/client-portal/notifications"
                className="flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.06] text-zinc-300 font-semibold text-[13px] py-3 rounded-xl hover:bg-white/[0.08] transition-all"
              >
                <Clock className="w-4 h-4" />
                Messages
              </Link>
            </div>

            <p className="text-[11px] text-zinc-600 text-center">
              Disponible lun–ven · 08h00–17h00 (WAT)
            </p>
          </div>
        </motion.div>

        {/* ── Sécurité & confiance ──────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}>
          <div className="bg-[#0a0a0a] border border-white/[0.04] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-3.5 h-3.5 text-zinc-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Vos données sont protégées</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600">
              {[
                'Chiffrement bout-en-bout',
                'Conforme COBAC',
                'Données non partagées',
                'Session sécurisée',
              ].map(item => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-zinc-700 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </main>

      {/* ── Pied de page ─────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] px-4 py-4 text-center">
        <p className="text-[11px] text-zinc-600">
          © 2026 Octaix Risk Engine · Microfinance Zone CEMAC
        </p>
      </footer>
    </div>
  )
}
