'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  TrendingUp, FileText, Bell, User, LayoutDashboard,
  LogOut, Loader2, Shield, ChevronRight, HelpCircle,
  FolderOpen, Building2, Sparkles, Home, Lock, Server, CheckCircle2
} from 'lucide-react'
import { fetchClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

// ── Navigation ─────────────────────────────────────────────────────────────────
const navItems = [
  { href: '/client-portal',               label: 'Dashboard',         icon: LayoutDashboard, exact: true },
  { href: '/client-portal/applications',  label: 'My Applications',   icon: FileText },
  { href: '/client-portal/documents',     label: 'Documents',         icon: FolderOpen },
  { href: '/client-portal/notifications', label: 'Notifications',     icon: Bell },
  { href: '/client-portal/profile',       label: 'Company Profile',   icon: Building2 },
]

// ── Types ──────────────────────────────────────────────────────────────────────
interface PortalUser {
  id: string
  name: string
  email: string
  role: string
  clientFirm?: { name: string }
}

// ── Main Layout ────────────────────────────────────────────────────────────────
export default function ClientPortalAuthWrapper({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [isAuth,     setIsAuth]     = useState(false)
  const [isLoading,  setIsLoading]  = useState(true)
  const [user,       setUser]       = useState<PortalUser | null>(null)

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        // Bypass token check for local testing
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5Acmlza2VuZ2luZS5jb20iLCJyb2xlIjoiQURNSU4iLCJuYW1lIjoiTG9jYWwgQWRtaW4iLCJjb3VudGVycGFydHlJZCI6bnVsbCwiaWF0IjoxNzc3NjY2MjUyLCJleHAiOjI3MjQzOTQyNTJ9.mdxmvbD0NE1JmUL8qyaRvnVyVsPMHIumekZOB-6qIzY';

        const me = await fetchClient('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        setUser(me)
        setIsAuth(true)

        // cached user for child pages
        const cached = localStorage.getItem('client_user')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (!user) setUser(parsed)
        }
      } catch {
        localStorage.removeItem('client_token')
        router.push('/client-portal/login')
      } finally {
        setIsLoading(false)
      }
    }
    verifyAuth()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem('client_token')
    localStorage.removeItem('client_user')
    router.push('/client-portal/login')
  }

  // Login page — no chrome
  if (pathname === '/client-portal/login') return <>{children}</>

  // Full-screen auth loading
  if (isLoading || !isAuth) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3ECF8E] to-emerald-900 flex items-center justify-center shadow-[0_0_30px_rgba(62,207,142,0.35)]">
            <TrendingUp className="w-6 h-6 text-[#0a0a0a]" />
          </div>
          <Loader2 className="w-6 h-6 text-[#3ECF8E] animate-spin" />
        </div>
      </div>
    )
  }

  // Derived display values
  const displayName    = user?.name    ?? 'Client User'
  const companyName    = user?.clientFirm?.name ?? 'Your Company'
  const userInitials   = displayName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-screen bg-[#060608] font-sans text-white flex flex-col">

      {/* ── Secure Session Banner ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#3ECF8E]/10 via-[#3ECF8E]/5 to-transparent border-b border-[#3ECF8E]/10 px-6 py-2 flex items-center justify-center gap-2">
        <Shield className="w-3.5 h-3.5 text-[#3ECF8E] flex-shrink-0" />
        <span className="text-[11px] text-[#3ECF8E]/80 font-bold uppercase tracking-widest">
          Secure Authenticated Session · RiskEngine Client Portal · COBAC/Basel III Compliant
        </span>
      </div>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-16 border-b border-white/[0.05] bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="h-full max-w-screen-xl mx-auto px-6 flex items-center gap-8">

          {/* Brand */}
          <Link href="/client-portal" className="flex items-center gap-3 flex-shrink-0 group">
            <div className="w-10 h-10 rounded-[12px] bg-gradient-to-tr from-[#3ECF8E] to-emerald-700 flex items-center justify-center shadow-[0_0_20px_rgba(62,207,142,0.3)] transition-transform group-hover:scale-105">
              <TrendingUp className="w-5 h-5 text-[#0a0a0a]" />
            </div>
            <div>
              <div className="text-[15px] font-bold text-white tracking-tight leading-none group-hover:text-[#3ECF8E] transition-colors">RiskEngine</div>
              <div className="text-[9.5px] font-bold text-[#3ECF8E]/80 uppercase tracking-[0.2em] leading-none mt-1">Client Portal</div>
            </div>
          </Link>

          {/* Divider */}
          <div className="w-px h-6 bg-white/[0.08]" />

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-2 flex-1">
            {navItems.map(item => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-300 overflow-hidden group',
                    active
                      ? 'text-[#3ECF8E]'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  )}
                >
                  {/* Subtle active background */}
                  {active && (
                    <motion.div 
                      layoutId="active-nav-bg"
                      className="absolute inset-0 bg-[#3ECF8E]/10 rounded-xl"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  
                  <Icon className={cn('w-4 h-4 flex-shrink-0 relative z-10 transition-colors', active ? 'text-[#3ECF8E]' : 'text-zinc-500 group-hover:text-zinc-300')} />
                  <span className="relative z-10">{item.label}</span>
                  
                  {/* Bottom indicator line */}
                  {active && (
                    <motion.div 
                      layoutId="active-nav-indicator"
                      className="absolute bottom-0 left-4 right-4 h-[2px] bg-[#3ECF8E] rounded-full shadow-[0_0_10px_rgba(62,207,142,0.5)]"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Right: user */}
          <div className="flex items-center gap-4 ml-auto flex-shrink-0">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[13px] font-bold text-white tracking-tight leading-none">{displayName}</span>
              <span className="text-[11px] font-medium text-[#3ECF8E] mt-1">{companyName}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3ECF8E] to-emerald-800 flex items-center justify-center text-[#0a0a0a] text-[13px] font-black shadow-[0_0_15px_rgba(62,207,142,0.2)] flex-shrink-0 border border-[#3ECF8E]/30">
              {userInitials}
            </div>
            <div className="w-px h-6 bg-white/[0.08] mx-1" />
            <Link
              href="/home"
              title="Back to Website"
              className="p-2.5 text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all"
            >
              <Home className="w-4 h-4" />
            </Link>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-2.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-8">
        {children}
      </main>

      {/* ── Premium Footer ────────────────────────────────────────────────────── */}
      <footer className="flex-shrink-0 bg-[#0a0a0a] border-t border-white/[0.04] relative overflow-hidden">
        {/* Top subtle glow line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3ECF8E]/20 to-transparent" />
        
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-10">
            {/* Branding Column */}
            <div className="col-span-1 md:col-span-2">
              <Link href="/client-portal" className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#3ECF8E] to-emerald-700 flex items-center justify-center shadow-[0_0_15px_rgba(62,207,142,0.2)]">
                  <TrendingUp className="w-4 h-4 text-[#0a0a0a]" />
                </div>
                <div>
                  <div className="text-[15px] font-bold text-white tracking-tight leading-none">RiskEngine</div>
                </div>
              </Link>
              <p className="text-[13px] text-zinc-500 font-medium leading-relaxed max-w-sm mb-6">
                Next-generation institutional credit engine providing transparent, high-fidelity quantitative risk analysis for global enterprises.
              </p>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-[#3ECF8E]/5 border border-[#3ECF8E]/20 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#3ECF8E] uppercase tracking-wider">
                  <Server className="w-3.5 h-3.5" />
                  Systems Operational
                </div>
                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-lg text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5" />
                  AES-256 Encrypted
                </div>
              </div>
            </div>

            {/* Links Columns */}
            <div>
              <h4 className="text-[11px] font-bold text-zinc-300 uppercase tracking-[0.15em] mb-4">Platform</h4>
              <ul className="space-y-3">
                <li><Link href="/client-portal" className="text-[13px] text-zinc-500 hover:text-[#3ECF8E] transition-colors font-medium">Dashboard</Link></li>
                <li><Link href="/client-portal/applications" className="text-[13px] text-zinc-500 hover:text-[#3ECF8E] transition-colors font-medium">Applications</Link></li>
                <li><Link href="/client-portal/documents" className="text-[13px] text-zinc-500 hover:text-[#3ECF8E] transition-colors font-medium">Document Centre</Link></li>
                <li><Link href="/client-portal/profile" className="text-[13px] text-zinc-500 hover:text-[#3ECF8E] transition-colors font-medium">Company Profile</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-zinc-300 uppercase tracking-[0.15em] mb-4">Compliance</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-[13px] text-zinc-500 hover:text-[#3ECF8E] transition-colors font-medium">Regulatory Framework</a></li>
                <li><a href="#" className="text-[13px] text-zinc-500 hover:text-[#3ECF8E] transition-colors font-medium">Security Whitepaper</a></li>
                <li><a href="#" className="text-[13px] text-zinc-500 hover:text-[#3ECF8E] transition-colors font-medium">Privacy Policy</a></li>
                <li><a href="#" className="text-[13px] text-zinc-500 hover:text-[#3ECF8E] transition-colors font-medium">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-zinc-600" />
              <span className="text-[12px] font-medium text-zinc-500">© 2026 RiskEngine. All rights reserved.</span>
            </div>
            
            <div className="flex items-center gap-4 text-[12px] font-medium text-zinc-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#3ECF8E]" /> Basel III Ready</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#3ECF8E]" /> SOC 2 Type II</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
