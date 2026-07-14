'use client'

import { motion } from 'framer-motion'
import { Building2, Landmark, ShieldCheck } from 'lucide-react'

export function InvestorsSection() {
  return (
    <section className="py-16 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-10 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-400">
            Backed by Leading Institutions
          </span>
        </div>
        
        <div className="flex flex-wrap justify-center items-center gap-12 sm:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
          
          <div className="flex items-center gap-3 text-zinc-400">
            <Building2 className="w-6 h-6" />
            <span className="text-lg font-bold tracking-tight">Sequoia Capital</span>
          </div>

          <div className="flex items-center gap-3 text-zinc-400">
            <Landmark className="w-6 h-6" />
            <span className="text-lg font-bold tracking-tight">A16Z Fintech</span>
          </div>

          <div className="flex items-center gap-3 text-zinc-400">
            <ShieldCheck className="w-6 h-6" />
            <span className="text-lg font-bold tracking-tight">Index Ventures</span>
          </div>

        </div>
      </div>
    </section>
  )
}
