'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Providers from './providers'
import { InternalAuthWrapper } from '@/components/InternalAuthWrapper'
import {
  LayoutDashboard, GitMerge, Activity, Users, Shield, Bell,
  TrendingUp, BarChart2, Zap, Eye, FileText, Search, MoreHorizontal, ChevronRight
} from 'lucide-react'

function Sidebar() {
  const pathname = usePathname()

  const operations = [
    { icon: LayoutDashboard, label: 'Overview',       href: '/admin' },
    { icon: GitMerge,        label: 'Deal Pipeline',  href: '/pipeline', badge: 'LIVE' },
    { icon: Users,           label: 'Counterparty',   href: '/counterparty' },
    { icon: Activity,        label: 'Microfinance',   href: '/microfinance', badge: 'LIVE' },
  ]
  const tools = [
    { icon: BarChart2,       label: 'Portfolio',      href: '/portfolio' },
    { icon: Zap,             label: 'Decisioning',    href: '/decisioning' },
    { icon: Eye,             label: 'Monitoring',     href: '/monitoring' },
  ]
  const settings = [
    { icon: Bell,            label: 'Alerts',         href: '/admin/alert-center', badge: '5' },
    { icon: Shield,          label: 'Compliance',     href: '/compliance' },
    { icon: FileText,        label: 'Docs',           href: '/internal-docs' },
  ]

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname?.startsWith(href)
  }

  return (
    <aside className="w-[220px] flex-shrink-0 bg-[#070707] border-r border-white/[0.06] flex flex-col h-screen sticky top-0 z-50">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#3ECF8E] to-emerald-600 flex items-center justify-center shadow-[0_0_20px_rgba(62,207,142,0.3)]">
          <TrendingUp className="w-4 h-4 text-[#030303]" />
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
          <span className="text-[11px] text-zinc-600 font-medium flex-1">Search...</span>
          <span className="text-[9px] text-zinc-700 border border-white/[0.06] px-1.5 py-0.5 rounded font-mono">⌘K</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Operations */}
        <div className="px-3 pt-4 pb-2">
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600 px-2 mb-2">Operations</div>
          <nav className="space-y-0.5">
            {operations.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    active ? 'bg-[#3ECF8E]/10 text-[#3ECF8E]' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[12px] font-semibold flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="text-[8px] font-bold bg-[#3ECF8E]/10 text-[#3ECF8E] border border-[#3ECF8E]/20 px-1 py-0.5 rounded uppercase">{item.badge}</span>
                  )}
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3ECF8E]" />}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Tools */}
        <div className="px-3 pt-2 pb-2">
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600 px-2 mb-2">Tools</div>
          <nav className="space-y-0.5">
            {tools.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    active ? 'bg-[#3ECF8E]/10 text-[#3ECF8E]' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[12px] font-semibold flex-1">{item.label}</span>
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3ECF8E]" />}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Settings */}
        <div className="px-3 pt-2 pb-2">
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600 px-2 mb-2">Settings</div>
          <nav className="space-y-0.5">
            {settings.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    active ? 'bg-[#3ECF8E]/10 text-[#3ECF8E]' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[12px] font-semibold flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-full">{item.badge}</span>
                  )}
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3ECF8E]" />}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* User */}
      <div className="mt-auto px-4 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3ECF8E] to-emerald-700 flex items-center justify-center text-[10px] font-black text-[#030303] flex-shrink-0 shadow-[0_0_12px_rgba(62,207,142,0.3)]">ER</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-white truncate">Elena Rostova</div>
            <div className="text-[9px] text-[#3ECF8E] font-semibold mt-0.5">Chief Risk Officer</div>
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
  let pageName = 'Overview'
  if (pathname?.includes('/pipeline')) pageName = 'Deal Pipeline'
  else if (pathname?.includes('/portfolio')) pageName = 'Portfolio'
  else if (pathname?.includes('/counterparty')) pageName = 'Counterparty'
  else if (pathname?.includes('/decisioning')) pageName = 'Decisioning'
  else if (pathname?.includes('/monitoring')) pageName = 'Monitoring'
  else if (pathname?.includes('/alert-center')) pageName = 'Alert Center'

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0d0d0d]/90 backdrop-blur-sm sticky top-0 z-10 flex-shrink-0">
      <div className="flex items-center gap-2 text-[12px] text-zinc-500">
        <LayoutDashboard className="w-3.5 h-3.5" />
        <ChevronRight className="w-3 h-3" />
        <span className="text-white font-semibold">{pageName}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-zinc-500 font-medium">Today — {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        <div className="w-px h-4 bg-white/[0.08]" />
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
          <span className="text-[10px] text-[#3ECF8E] font-bold">All Systems Operational</span>
        </div>
      </div>
    </header>
  )
}

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  const publicPaths = ['/home', '/platform', '/modules', '/security', '/about', '/contact', '/docs']
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
    <InternalAuthWrapper>
      <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden" suppressHydrationWarning>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <AdminHeader />
          <div className="flex-1 overflow-auto">
            <Providers>{children}</Providers>
          </div>
        </div>
      </div>
    </InternalAuthWrapper>
  )
}
