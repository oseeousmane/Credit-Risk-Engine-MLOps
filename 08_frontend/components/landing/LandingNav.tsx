'use client'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { TrendingUp, ChevronDown, Shield, LayoutGrid, BookOpen, Users, Cpu, BarChart3, Lock, FileText, X, Menu } from 'lucide-react'
import { LanguageSwitcher } from '@/components/landing/LanguageSwitcher'
import type { Locale } from '@/lib/dictionaries'

const getPlatformLinks = (lang: Locale) => [
  { icon: LayoutGrid, label: lang === 'fr' ? 'Modules Plateforme' : 'Platform Modules', desc: lang === 'fr' ? 'Pipeline, scoring, décisioning' : 'Pipeline, scoring, decisioning', href: `/${lang}/modules` },
  { icon: BarChart3, label: lang === 'fr' ? 'Analyses des Risques' : 'Risk Analytics', desc: lang === 'fr' ? 'PD, LGD, EAD, ECL' : 'PD, LGD, EAD, ECL reporting', href: `/${lang}/platform` },
  { icon: Cpu, label: lang === 'fr' ? 'Moteur MLOps' : 'MLOps Engine', desc: lang === 'fr' ? 'Registre de modèles & drift' : 'Model registry & drift monitoring', href: `/${lang}/modules` },
]

const getComplianceLinks = (lang: Locale) => [
  { icon: Shield, label: lang === 'fr' ? 'Sécurité & Audit' : 'Security & Audit', desc: lang === 'fr' ? 'Piste d\'audit immuable & RBAC' : 'Immutable audit trail & RBAC', href: `/${lang}/security` },
  { icon: Lock, label: lang === 'fr' ? 'Conformité Réglementaire' : 'Regulatory Compliance', desc: lang === 'fr' ? 'IFRS 9 / Bâle III / COBAC' : 'IFRS 9 / Basel III / COBAC', href: `/${lang}/security` },
  { icon: FileText, label: lang === 'fr' ? 'Documentation' : 'Documentation', desc: lang === 'fr' ? 'Docs techniques & MRM' : 'Technical & MRM docs', href: `/${lang}/docs` },
]

function DropdownMenu({ label, items, isOpen, onToggle }: {
  label: string
  items: ReturnType<typeof getPlatformLinks>
  isOpen: boolean
  onToggle: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle()
    }
    if (isOpen) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [isOpen, onToggle])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1 text-[13px] font-medium transition-colors ${isOpen ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
      >
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#3ECF8E]' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-72 animate-fade-in-down">
          {/* Arrow */}
          <div className="flex justify-center mb-1">
            <div className="w-2 h-2 rotate-45 bg-[#111] border-l border-t border-white/10" />
          </div>
          <div className="bg-[#050505] border border-white/[0.04] rounded-2xl overflow-hidden shadow-[0_24px_48px_rgba(0,0,0,0.6)]">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  onClick={onToggle}
                  className="flex items-start gap-3.5 p-4 hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-center flex-shrink-0 group-hover:bg-[#3ECF8E]/10 group-hover:border-[#3ECF8E]/20 transition-colors mt-0.5 shadow-sm">
                    <Icon className="w-4 h-4 text-zinc-500 group-hover:text-[#3ECF8E] transition-colors" />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-zinc-200 group-hover:text-white transition-colors">{item.label}</div>
                    <div className="text-[11px] text-zinc-600 mt-0.5">{item.desc}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function LandingNav({ lang = 'en' }: { lang?: Locale }) {
  const [scrolled, setScrolled] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const PLATFORM_LINKS = getPlatformLinks(lang)
  const COMPLIANCE_LINKS = getComplianceLinks(lang)

  // Labels based on locale
  const t = {
    platform: lang === 'fr' ? 'Plateforme' : 'Platform',
    compliance: lang === 'fr' ? 'Conformité' : 'Compliance',
    docs: lang === 'fr' ? 'Docs' : 'Docs',
    about: lang === 'fr' ? 'À Propos' : 'About',
    live: 'Live',
    signIn: lang === 'fr' ? 'Connexion' : 'Sign In',
    requestDemo: lang === 'fr' ? 'Demander une Démo' : 'Request Demo',
  }

  useEffect(() => {
    const handler = () => {
      setScrolled(window.scrollY > 20)
      if (window.scrollY > 20) setOpenMenu(null)
    }
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const toggle = (menu: string) => setOpenMenu(prev => prev === menu ? null : menu)

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.04] shadow-sm'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-[68px] flex items-center justify-between">

          {/* ── Logo ─────────────────────────────────────────── */}
          <Link href={`/${lang}/home`} className="flex items-center gap-3 group flex-shrink-0">
            <div className="relative w-8 h-8 rounded-full bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 flex items-center justify-center shadow-[0_0_12px_rgba(62,207,142,0.15)] group-hover:shadow-[0_0_16px_rgba(62,207,142,0.25)] transition-shadow">
              <TrendingUp className="w-4 h-4 text-[#3ECF8E]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[14px] font-black text-white tracking-[-0.03em]">RiskEngine</span>
            </div>
          </Link>

          {/* ── Desktop Nav ───────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-8">
            <DropdownMenu
              label={t.platform}
              items={PLATFORM_LINKS}
              isOpen={openMenu === 'platform'}
              onToggle={() => toggle('platform')}
            />
            <DropdownMenu
              label={t.compliance}
              items={COMPLIANCE_LINKS}
              isOpen={openMenu === 'compliance'}
              onToggle={() => toggle('compliance')}
            />
            <Link
              href={`/${lang}/docs`}
              className="text-[13px] font-medium text-zinc-400 hover:text-white transition-colors"
            >
              {t.docs}
            </Link>
            <Link
              href={`/${lang}/about`}
              className="text-[13px] font-medium text-zinc-400 hover:text-white transition-colors"
            >
              {t.about}
            </Link>
          </div>

          {/* ── CTA + Language Switcher ──────────────────────── */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            {/* Status pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{t.live}</span>
            </div>

            {/* Language Switcher */}
            <LanguageSwitcher />

            <Link
              href="/auth/login"
              className="text-[13px] text-zinc-400 hover:text-white transition-colors font-medium px-3 py-2"
            >
              {t.signIn}
            </Link>

            <Link
              href={`/${lang}/contact`}
              className="group flex items-center gap-1.5 px-3 py-1.5 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 rounded-md text-[#0a0a0a] font-semibold text-[13px] transition-all"
            >
              {t.requestDemo}
            </Link>
          </div>

          {/* ── Mobile Hamburger ─────────────────────────────── */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-400 hover:text-white transition-colors"
            onClick={() => setMobileOpen(v => !v)}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* ── Mobile Menu ───────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-[68px] left-0 right-0 bg-[#050505] border-b border-white/[0.04] p-6 space-y-1 animate-fade-in shadow-2xl">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 px-2 mb-3">{t.platform}</div>
            {PLATFORM_LINKS.map(item => {
              const Icon = item.icon
              return (
                <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors">
                  <Icon className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-300">{item.label}</span>
                </Link>
              )
            })}
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 px-2 pt-4 mb-3">{t.compliance}</div>
            {COMPLIANCE_LINKS.map(item => {
              const Icon = item.icon
              return (
                <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors">
                  <Icon className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-300">{item.label}</span>
                </Link>
              )
            })}
            <div className="pt-4 pb-2">
              <LanguageSwitcher />
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/auth/login" onClick={() => setMobileOpen(false)}
                className="w-full text-center py-3 rounded-xl border border-white/[0.08] text-zinc-300 text-sm font-medium hover:bg-white/[0.04] transition-colors">
                {t.signIn}
              </Link>
              <Link href={`/${lang}/contact`} onClick={() => setMobileOpen(false)}
                className="w-full text-center py-3 rounded-xl bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-[#050505] text-sm font-semibold transition-colors">
                {t.requestDemo}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
