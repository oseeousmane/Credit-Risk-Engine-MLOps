'use client'
import { TrendingUp, ExternalLink, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const footerColumns = [
  {
    title: 'Platform',
    links: [
      { name: 'Risk Intelligence', href: '/modules' },
      { name: 'Portfolio Management', href: '/modules' },
      { name: 'Decision Engine', href: '/modules' },
      { name: 'MLOps Monitoring', href: '/modules' },
      { name: 'Stress Testing', href: '/modules' },
      { name: 'Audit & Traceability', href: '/security' },
    ],
  },
  {
    title: 'Documentation',
    links: [
      { name: 'Technical Docs', href: '/docs' },
      { name: 'API Reference', href: '/docs' },
      { name: 'Prisma Schema', href: '/docs' },
      { name: 'Security Whitepaper', href: '/security' },
      { name: 'IFRS 9 Methodology', href: '/docs' },
    ],
  },
  {
    title: 'Governance',
    links: [
      { name: 'Compliance Portal', href: '/security' },
      { name: 'Trust Center', href: '/security' },
      { name: 'Institutional Access', href: '/contact' },
      { name: 'Support Operations', href: '/contact' },
    ],
  },
]

const complianceBadges = ['IFRS 9', 'Basel III', 'ISO 27001', 'GDPR']

export function Footer() {
  return (
    <footer className="border-t border-white/[0.05] bg-surface-0">
      <div className="max-w-7xl mx-auto px-6">
        {/* Main footer grid */}
        <div className="py-24 grid grid-cols-1 md:grid-cols-6 gap-12">
          {/* Brand block — spans 3 cols */}
          <div className="md:col-span-3 lg:pr-20">
            {/* Logo */}
            <div className="flex items-center gap-3.5 mb-8">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-400 to-[#20a466] flex items-center justify-center shadow-[0_0_30px_rgba(59,123,255,0.15)] ring-1 ring-white/[0.1]">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-[17px] font-bold text-white tracking-tight leading-none">Octaix Risk Engine</div>
                <div className="text-[11px] text-brand-400 font-bold mt-1 uppercase tracking-widest">Enterprise Edition v4.2</div>
              </div>
            </div>

            <p className="text-[15px] text-zinc-400 font-medium leading-relaxed max-w-sm mb-10">
              The professional credit platform for institutional banking. Unifying quantitative decisioning, historical telemetry, and regulatory MLOps.
            </p>

            {/* Compliance badges */}
            <div className="flex flex-wrap gap-3 mb-10">
              {complianceBadges.map((b) => (
                <span key={b} className="text-[10px] font-bold text-zinc-300 border border-white/[0.1] rounded-lg px-3 py-1.5 uppercase tracking-wider bg-white/[0.03]">
                  {b}
                </span>
              ))}
            </div>

            <Link href="/contact" className="group inline-flex items-center gap-2 text-[15px] text-white hover:text-brand-400 font-bold transition-all duration-300">
              Consult with our Risk Specialists
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Link columns */}
          {footerColumns.map((col) => (
            <div key={col.title} suppressHydrationWarning className="md:col-span-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-white mb-8" suppressHydrationWarning>{col.title}</div>
              <div className="space-y-4" suppressHydrationWarning>
                {col.links.map((link) => (
                  <Link key={link.name} href={link.href} className="block text-[14px] text-zinc-500 hover:text-white transition-colors font-medium">
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="py-8 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-6" suppressHydrationWarning>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6" suppressHydrationWarning>
            <span className="text-[13px] text-zinc-500 font-medium" suppressHydrationWarning>
              © <span suppressHydrationWarning>{new Date().getFullYear()}</span> Octaix Risk Engine. Global Institutional Platform.
            </span>
            <span className="hidden sm:block w-px h-3.5 bg-white/[0.1]" />
            <span className="text-[12px] text-zinc-600 font-semibold tracking-wide">Deployment ID: OX-602-REL</span>
          </div>
          <div className="flex items-center gap-8" suppressHydrationWarning>
            {['Trust Center', 'Status', 'Legal'].map((item) => (
              <span key={item} className="text-[13px] font-bold text-zinc-600 hover:text-zinc-200 cursor-pointer transition-colors uppercase tracking-widest">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
