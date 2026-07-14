'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

const leaders = [
  {
    name: 'Alexander V.',
    role: 'Chief Executive Officer',
    background: 'Former Managing Director, Global Risk at Tier 1 Investment Bank',
    initials: 'AV'
  },
  {
    name: 'Dr. Sarah C.',
    role: 'Chief Quantitative Officer',
    background: 'Ph.D. in Operations Research. Lead AI Architect at major Fintech.',
    initials: 'SC'
  },
  {
    name: 'Michael R.',
    role: 'Chief Technology Officer',
    background: 'Former Staff Engineer at Stripe. Scaled distributed systems to billions in volume.',
    initials: 'MR'
  },
  {
    name: 'Elena T.',
    role: 'Head of Compliance',
    background: 'Ex-Regulator (FCA). Expert in Basel III & IFRS 9 global frameworks.',
    initials: 'ET'
  }
]

export function LeadershipSection() {
  return (
    <section className="py-24 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-400">Leadership</span>
          </div>
          <h2 className="text-3xl font-medium text-white tracking-tight">
            Built by Industry Veterans
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {leaders.map((leader, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-8 bg-surface-0 border border-white/[0.03] rounded-2xl hover:border-white/[0.08] hover:bg-[#080808] transition-all duration-500 group relative shadow-xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-400/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              {/* Avatar placeholder */}
              <div className="relative z-10 w-16 h-16 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-6 group-hover:border-brand-400/30 group-hover:bg-brand-400/10 transition-colors duration-500">
                <span className="text-[16px] font-medium text-zinc-500 group-hover:text-brand-400 transition-colors duration-500">{leader.initials}</span>
              </div>
              
              <h3 className="relative z-10 text-xl font-medium text-white mb-1">{leader.name}</h3>
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-400 mb-4">{leader.role}</p>
              <p className="text-[13px] font-medium text-zinc-500 leading-relaxed mb-6">
                {leader.background}
              </p>
              
              <div className="relative z-10 mt-auto">
                <a href="#" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-400 hover:text-brand-400/80 transition-colors">
                  View Profile <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
