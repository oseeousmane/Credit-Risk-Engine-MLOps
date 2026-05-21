'use client'
import Link from 'next/link'
import { ArrowRight, TrendingUp, X } from 'lucide-react'
import { useState } from 'react'
import { useLanguage } from '@/lib/LanguageContext'

export function HeroHeader() {
  const [barVisible, setBarVisible] = useState(true)
  const { locale } = useLanguage()

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
      {/* Announcement Bar */}
      {barVisible && (
        <div className="relative bg-gradient-to-r from-[#0d1f13] via-[#0a1a2e] to-[#0d1f13] border-b border-[#3ECF8E]/20 px-4 py-2.5 flex items-center justify-center gap-3">
          <div className="absolute inset-0 bg-gradient-to-r from-[#3ECF8E]/5 via-blue-500/5 to-[#3ECF8E]/5" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse shadow-[0_0_8px_#3ECF8E] relative z-10" />
          <p className="text-[12px] font-medium text-zinc-300 relative z-10 text-center">
            Octaix Risk Engine now supports{' '}
            <span className="text-[#3ECF8E] font-bold">Enterprise Credit + Microfinance Pilot Workflows</span>
          </p>
          <Link
            href={`/${locale}/modules`}
            className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-white/70 hover:text-white transition-colors relative z-10 border border-white/10 hover:border-white/30 px-2.5 py-1 rounded-full"
          >
            Learn More <ArrowRight className="w-3 h-3" />
          </Link>
          <button
            onClick={() => setBarVisible(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors z-10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-[#030303]/80 backdrop-blur-xl border-b border-white/[0.05] px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href={`/${locale}/home`} className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#3ECF8E] to-emerald-600 flex items-center justify-center shadow-[0_0_20px_rgba(62,207,142,0.3)] group-hover:shadow-[0_0_30px_rgba(62,207,142,0.5)] transition-all">
            <TrendingUp className="w-4 h-4 text-[#030303]" />
          </div>
          <div>
            <span className="text-[15px] font-bold text-white tracking-tight leading-none block">Octaix</span>
            <span className="text-[9px] font-bold text-[#3ECF8E]/70 uppercase tracking-[0.2em] leading-none">Risk Engine</span>
          </div>
        </Link>

        {/* Center Nav */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { label: 'Platform', href: `/${locale}/platform` },
            { label: 'Modules', href: `/${locale}/modules` },
            { label: 'Monitoring', href: '/monitoring' },
            { label: 'Docs', href: `/${locale}/docs` },
            { label: 'Pricing', href: `/${locale}/contact` },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2 text-[13px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-all"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <Link
          href={`/${locale}/contact`}
          className="inline-flex items-center gap-2 px-5 py-2 bg-[#3ECF8E] text-[#030303] text-[13px] font-bold rounded-lg hover:bg-[#3ECF8E]/90 transition-all shadow-[0_0_20px_rgba(62,207,142,0.2)] hover:shadow-[0_0_30px_rgba(62,207,142,0.4)] hover:scale-105 active:scale-95"
        >
          Request Demo
        </Link>
      </nav>
    </div>
  )
}
