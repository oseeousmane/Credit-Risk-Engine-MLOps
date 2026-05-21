'use client'
import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { INTERNAL_TOKEN_KEY } from '@/lib/api-client'
import {
  TrendingUp, PieChart, Users, GitMerge, Activity,
  FlaskConical, ShieldCheck, Settings,
  Zap, BarChart3, Bell, LayoutDashboard, LogOut, HelpCircle, FileText,
  AlertTriangle, HandCoins
} from 'lucide-react'

type InternalUser = {
  name?: string
  role?: 'ANALYST' | 'MANAGER' | 'CRO' | 'ADMIN' | string
}

function getNavGroupsByRole(role: string) {
  switch (role) {
    case 'ANALYST':
      return [
        {
          label: 'Operations',
          items: [
            { name: 'My Queue', href: '/', icon: LayoutDashboard },
            { name: 'Deal Pipeline', href: '/pipeline', icon: GitMerge, badge: 'LIVE' },
            { name: 'Counterparty 360', href: '/counterparty', icon: Users },
            { name: 'Microfinance Ops', href: '/microfinance', icon: HandCoins, badge: 'LIVE' },
          ]
        },
        {
          label: 'Tools',
          items: [
            { name: 'Monitoring', href: '/monitoring', icon: Activity },
          ]
        }
      ]
    case 'MANAGER':
      return [
        {
          label: 'Oversight',
          items: [
            { name: 'Team Dashboard', href: '/', icon: LayoutDashboard },
            { name: 'Pipeline & Approvals', href: '/pipeline', icon: GitMerge, badge: 'LIVE' },
            { name: 'Decisioning Queue', href: '/decisioning', icon: Zap },
            { name: 'Microfinance Ops', href: '/microfinance', icon: HandCoins, badge: 'LIVE' },
          ]
        },
        {
          label: 'Risk & Strategy',
          items: [
            { name: 'Portfolio Overview', href: '/portfolio', icon: PieChart },
            { name: 'Counterparty 360', href: '/counterparty', icon: Users },
            { name: 'Compliance', href: '/compliance', icon: ShieldCheck },
          ]
        }
      ]
    case 'CRO':
      return [
        {
          label: 'Executive Command',
          items: [
            { name: 'Risk Intelligence', href: '/', icon: TrendingUp, badge: 'LIVE' },
            { name: 'Portfolio Exposure', href: '/portfolio', icon: PieChart },
            { name: 'Major Alerts', href: '/admin/alert-center', icon: AlertTriangle, badge: 'ONLINE' },
            { name: 'Microfinance Risk', href: '/microfinance', icon: HandCoins, badge: 'LIVE' },
          ]
        },
        {
          label: 'Advanced Analytics',
          items: [
            { name: 'Counterparty 360', href: '/counterparty', icon: Users },
            { name: 'Stress Testing', href: '/stress-testing', icon: FlaskConical },
            { name: 'Monitoring', href: '/monitoring', icon: Activity },
          ]
        }
      ]
    case 'ADMIN':
    default:
      return [
        {
          label: 'System Admin',
          items: [
            { name: 'System Core', href: '/', icon: LayoutDashboard },
            { name: 'Microfinance Ops', href: '/microfinance', icon: HandCoins, badge: 'LIVE' },
            { name: 'Model Registry', href: '/admin/model-registry', icon: BarChart3 },
            { name: 'Alert Center Config', href: '/admin/alert-center', icon: Bell },
            { name: 'Platform Settings', href: '/admin', icon: Settings },
          ]
        },
        {
          label: 'Testing',
          items: [
            { name: 'Client Portal Sandbox', href: '/client-portal', icon: FileText, badge: 'CLIENT' },
          ]
        }
      ]
  }
}

export function Sidebar() {
  const pathname = usePathname()
  const [user] = useState<InternalUser | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const stored = localStorage.getItem('internal_user')
      return stored ? JSON.parse(stored) as InternalUser : null
    } catch {
      return null
    }
  })

  const role = user?.role || 'ANALYST'
  const initials = user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase() : '?'
  
  const formattedRole = {
    'ANALYST': 'Risk Analyst',
    'MANAGER': 'Portfolio Manager',
    'ADMIN': 'System Admin',
    'CRO': 'Chief Risk Officer'
  }[role as string] || role

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  function handleLogout() {
    localStorage.removeItem(INTERNAL_TOKEN_KEY)
    localStorage.removeItem('internal_user')
    window.location.href = '/auth/login'
  }

  const navGroups = getNavGroupsByRole(role)

  return (
    <div className="w-full h-full flex flex-col bg-[#080808] border-r border-white/[0.06]">
      {/* Brand */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#3ECF8E]/10 border border-[#3ECF8E]/25 flex items-center justify-center shadow-[0_0_20px_rgba(62,207,142,0.15)]">
          <TrendingUp className="w-4 h-4 text-[#3ECF8E]" />
        </div>
        <div>
          <div className="text-sm font-black text-white tracking-tight leading-none" style={{letterSpacing: '-0.02em'}}>RiskEngine</div>
          <div className="text-[10px] text-zinc-600 leading-none mt-0.5 uppercase tracking-widest">Enterprise v4.2</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            <div className="px-2 mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-700">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 overflow-hidden',
                      active ? 'text-white' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active-bg"
                        className="absolute inset-0 bg-[#3ECF8E]/[0.08] rounded-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    {active && (
                      <motion.div
                        layoutId="sidebar-active-indicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#3ECF8E] rounded-r-full shadow-[0_0_10px_rgba(62,207,142,0.8)]"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    <Icon className={cn(
                      'w-4 h-4 flex-shrink-0 transition-colors relative z-10',
                      active ? 'text-[#3ECF8E]' : 'text-zinc-600 group-hover:text-zinc-400'
                    )} />
                    <span className="flex-1 truncate relative z-10">{item.name}</span>
                    {item.badge === 'LIVE' && (
                      <span className="relative z-10 flex items-center gap-1 text-[9px] font-bold text-[#3ECF8E] bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 rounded px-1.5 py-0.5 uppercase tracking-wider">
                        <span className="w-1 h-1 rounded-full bg-[#3ECF8E] animate-pulse shadow-[0_0_8px_rgba(62,207,142,0.8)]" />
                        Live
                      </span>
                    )}
                    {item.badge === 'ONLINE' && (
                      <span className="relative z-10 flex items-center gap-1 text-[9px] font-bold text-[#3ECF8E] bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 rounded px-1.5 py-0.5 uppercase tracking-wider">
                        <span className="w-1 h-1 rounded-full bg-[#3ECF8E] animate-pulse shadow-[0_0_8px_rgba(62,207,142,0.8)]" />
                        Online
                      </span>
                    )}
                    {item.badge === 'CLIENT' && (
                      <span className="relative z-10 text-[9px] font-bold text-zinc-400 bg-white/[0.06] border border-white/[0.1] rounded px-1.5 py-0.5 uppercase tracking-wider">
                        Portal
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.06] space-y-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Link href="/internal-docs" className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors">
            <HelpCircle className="w-3.5 h-3.5" /> Docs
          </Link>
        </div>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="w-8 h-8 rounded-full bg-[#3ECF8E]/15 border border-[#3ECF8E]/25 flex items-center justify-center text-[#3ECF8E] text-[11px] font-black flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-zinc-300 leading-none truncate">{user?.name || 'Risk Analyst'}</div>
            <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{formattedRole}</div>
          </div>
          <button type="button" onClick={handleLogout} className="flex-shrink-0" aria-label="Log out">
            <LogOut className="w-3.5 h-3.5 text-zinc-700 hover:text-zinc-400 cursor-pointer transition-colors" />
          </button>
        </div>
      </div>
    </div>
  )
}
