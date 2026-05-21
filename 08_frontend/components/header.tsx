'use client'
import * as React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell, Search, Settings, Moon, Home } from 'lucide-react'
import { motion } from 'framer-motion'

const pageTitles: Record<string, string> = {
  '/': 'Risk Intelligence',
  '/portfolio': 'Portfolio Explorer',
  '/counterparty': 'Counterparty 360',
  '/decisioning': 'Decisioning',
  '/pipeline': 'Deal Pipeline',
  '/monitoring': 'Monitoring & Operations',
  '/microfinance': 'Microfinance Command',
  '/stress-testing': 'Stress Testing Lab',
  '/compliance': 'Compliance & Audit',
  '/admin/model-registry': 'Model Registry',
  '/admin/alert-center': 'Alert Center',
  '/admin': 'Admin Settings',
}

export function Header() {
  const pathname = usePathname()
  const title = Object.entries(pageTitles).sort((a, b) => b[0].length - a[0].length).find(([k]) =>
    pathname === k || (k !== '/' && pathname.startsWith(k))
  )?.[1] ?? 'RiskEngine'

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06] bg-[#080808] sticky top-0 z-40 flex-shrink-0">
      {/* Left: Search */}
      <div className="flex items-center gap-4">
        <motion.div 
          initial={{ width: 256 }}
          whileFocus={{ width: 320 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
          className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 group focus-within:border-[#3ECF8E]/50 focus-within:bg-[#3ECF8E]/[0.02] transition-colors overflow-hidden"
        >
          <Search className="w-3.5 h-3.5 text-zinc-600 group-focus-within:text-[#3ECF8E] flex-shrink-0 transition-colors" />
          <input
            placeholder="Search entity or CUSIP... (Cmd+K)"
            className="bg-transparent text-[13px] text-zinc-300 placeholder-zinc-600 outline-none flex-1 min-w-0"
          />
          <div className="hidden group-focus-within:flex items-center gap-1">
            <span className="text-[9px] font-bold text-zinc-500 bg-white/[0.05] border border-white/[0.1] px-1.5 py-0.5 rounded tracking-widest uppercase">↵</span>
          </div>
        </motion.div>
      </div>

      {/* Center: Title */}
      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          key={title}
          className="text-[13px] font-bold text-white tracking-tight"
        >
          {title}
        </motion.div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Link href="/home" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.04] text-zinc-500 hover:text-zinc-200 transition-colors border border-white/[0.06]" title="Back to Website">
          <Home className="w-3.5 h-3.5" />
        </Link>
        <button className="text-[11px] font-bold text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors border border-white/[0.06] tracking-widest">
          EN/FR
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.04] text-zinc-500 hover:text-zinc-200 transition-colors border border-white/[0.06]">
          <Moon className="w-3.5 h-3.5" />
        </button>
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.04] text-zinc-500 hover:text-[#3ECF8E] transition-colors border border-white/[0.06] group">
          <Bell className="w-3.5 h-3.5 group-hover:animate-swing" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.04] text-zinc-500 hover:text-zinc-200 transition-colors border border-white/[0.06]">
          <Settings className="w-3.5 h-3.5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-[#3ECF8E]/15 border border-[#3ECF8E]/25 flex items-center justify-center text-[#3ECF8E] text-[11px] font-black cursor-pointer">
          AR
        </div>
      </div>
    </header>
  )
}
