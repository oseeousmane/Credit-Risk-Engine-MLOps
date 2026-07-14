'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Providers from './providers'
import { InternalAuthWrapper } from '@/components/InternalAuthWrapper'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, GitMerge, Activity, Users, Shield, Bell,
  TrendingUp, BarChart2, Zap, Eye, FileText, Search, MoreHorizontal, ChevronRight
} from 'lucide-react'
import { ThemeProvider } from '@/lib/theme'
import { ThemeToggle } from '@/components/ThemeToggle'

function Sidebar() {
  const pathname = usePathname()

  const operations = [
    { icon: LayoutDashboard, label: 'Vue d\'ensemble', href: '/admin' },
    { icon: GitMerge,        label: 'Pipeline Crédit', href: '/pipeline', badge: 'LIVE' },
    { icon: Users,           label: 'Contreparties',   href: '/counterparty' },
    { icon: Activity,        label: 'Microfinance',    href: '/microfinance', badge: 'LIVE' },
  ]
  const tools = [
    { icon: BarChart2,       label: 'Portefeuille',    href: '/portfolio' },
    { icon: Zap,             label: 'Décisions',       href: '/decisioning' },
    { icon: Eye,             label: 'Monitoring',      href: '/monitoring' },
  ]
  const settings = [
    { icon: Bell,            label: 'Alertes',         href: '/admin/alert-center', badge: '5' },
    { icon: Shield,          label: 'Conformité',      href: '/compliance' },
    { icon: FileText,        label: 'Documentation',   href: '/internal-docs' },
  ]

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname?.startsWith(href)
  }

  return (
    <aside className="w-[240px] flex-shrink-0 bg-black/40 backdrop-blur-2xl border-r border-white/[0.08] flex flex-col h-screen sticky top-0 z-50 relative overflow-hidden">
      {/* Background glow for sidebar */}
      <div className="absolute top-0 left-0 w-full h-64 bg-brand-400/[0.03] blur-[60px] pointer-events-none" />
      
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/[0.04] flex items-center gap-3 relative z-10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-400 to-brand-500 flex items-center justify-center shadow-[0_0_24px_rgba(59,123,255,0.4)]">
          <TrendingUp className="w-4.5 h-4.5 text-black" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-white tracking-tight leading-none">Octaix</div>
          <div className="text-[9px] text-zinc-500 mt-0.5 font-medium tracking-widest uppercase">Risk Engine</div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 hover:bg-white/[0.06] transition-all cursor-text">
          <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
          <span className="text-[11px] text-zinc-600 font-medium flex-1">Rechercher...</span>
          <span className="text-[9px] text-zinc-700 border border-white/[0.06] px-1.5 py-0.5 rounded font-mono">⌘K</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Operations */}
        <div className="px-3 pt-4 pb-2">
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600 px-2 mb-2">Opérations</div>
          <nav className="space-y-0.5">
            {operations.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    active ? 'bg-brand-400/10 text-brand-400' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[12px] font-semibold flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="text-[8px] font-bold bg-brand-400/10 text-brand-400 border border-brand-400/20 px-1 py-0.5 rounded uppercase">{item.badge}</span>
                  )}
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Tools */}
        <div className="px-3 pt-2 pb-2">
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600 px-2 mb-2">Outils</div>
          <nav className="space-y-0.5">
            {tools.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    active ? 'bg-brand-400/10 text-brand-400' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[12px] font-semibold flex-1">{item.label}</span>
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Settings */}
        <div className="px-3 pt-2 pb-2">
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600 px-2 mb-2">Paramètres</div>
          <nav className="space-y-0.5">
            {settings.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    active ? 'bg-brand-400/10 text-brand-400' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[12px] font-semibold flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-full">{item.badge}</span>
                  )}
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* User */}
      <div className="mt-auto px-4 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow-[0_0_12px_rgba(59,123,255,0.3)]">MO</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-white truncate">Marie-Claire Owono</div>
            <div className="text-[9px] text-brand-400 font-semibold mt-0.5">Directrice des Risques</div>
          </div>
          <MoreHorizontal className="w-4 h-4 text-zinc-600 cursor-pointer hover:text-zinc-300 transition-colors" />
        </div>
      </div>
    </aside>
  )
}

function AdminHeader() {
  const pathname = usePathname()
  
  // Try to determine the page name from the URL
  let pageName = 'Vue d\'ensemble'
  if (pathname?.includes('/pipeline')) pageName = 'Pipeline Crédit'
  else if (pathname?.includes('/portfolio')) pageName = 'Portefeuille'
  else if (pathname?.includes('/counterparty')) pageName = 'Contreparties'
  else if (pathname?.includes('/decisioning')) pageName = 'Décisions'
  else if (pathname?.includes('/monitoring')) pageName = 'Monitoring'
  else if (pathname?.includes('/alert-center')) pageName = 'Centre d\'alertes'

  return (
    <div className="flex-shrink-0 sticky top-0 z-10">
      <div className="bg-amber-400/[0.05] border-b border-amber-400/[0.10] px-8 py-1 flex items-center justify-center gap-2">
        <span className="w-1 h-1 rounded-full bg-amber-400/50 flex-shrink-0" />
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-400/60">
          Environnement de démonstration — Données synthétiques · Non contractuel
        </span>
      </div>
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/[0.06] bg-black/40 backdrop-blur-2xl">
        <div className="flex items-center gap-2.5 text-[12px] text-zinc-500">
          <LayoutDashboard className="w-4 h-4" />
          <ChevronRight className="w-3 h-3 text-zinc-700" />
          <span className="text-white font-bold tracking-wide">{pageName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-500 font-medium tracking-wide">{new Date().toLocaleDateString('fr-CM', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <div className="w-px h-4 bg-white/[0.08]" />
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shadow-[0_0_8px_rgba(59,123,255,0.8)] animate-pulse" />
            <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">Systèmes opérationnels</span>
          </div>
          <div className="w-px h-4 bg-white/[0.08]" />
          <ThemeToggle />
        </div>
      </header>
    </div>
  )
}

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  const publicPaths = ['/home', '/platform', '/modules', '/security', '/about', '/contact', '/docs', '/overview', '/credit-scoring', '/portfolio-risk', '/stress-testing']
  const localePrefixes = ['/en/', '/fr/']
  const isPublicMarketing = publicPaths.some(p => pathname?.startsWith(p)) ||
    localePrefixes.some(prefix => pathname?.startsWith(prefix)) ||
    pathname === '/en' || pathname === '/fr'
  
  // If we are in the client portal, auth page, or public marketing pages, render without internal sidebar/header
  if (pathname?.startsWith('/client-portal') || pathname?.startsWith('/auth/login') || pathname?.startsWith('/auth/callback') || isPublicMarketing) {
    return <Providers>{children}</Providers>
  }

  // New Internal Bank Application Layout (CRO Dashboard Standard)
  return (
    <ThemeProvider>
      <InternalAuthWrapper>
        <div className="flex h-screen bg-[#050505] text-white overflow-hidden relative" suppressHydrationWarning>
          {/* Global Ambient Lights */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
            <AdminHeader />
            <div className="flex-1 overflow-auto bg-[#0a0a0a]/50">
              <Providers>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: 10, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.99 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="min-h-full"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </Providers>
            </div>
          </div>
        </div>
      </InternalAuthWrapper>
    </ThemeProvider>
  )
}
