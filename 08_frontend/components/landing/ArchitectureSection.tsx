'use client'

import { motion } from 'framer-motion'
import { Database, BrainCircuit, GitMerge, Layout } from 'lucide-react'

const layers = [
  {
    id: 'experience',
    title: 'Experience Layer',
    icon: Layout,
    desc: 'React/Next.js composable UIs. Role-specific dashboards for Analysts, CROs, and a Secure Client Portal.',
    color: '#ffffff'
  },
  {
    id: 'workflow',
    title: 'Workflow & Governance Layer',
    icon: GitMerge,
    desc: 'State machine orchestration, Maker/Checker approvals, and immutable audit logging (SOC2/IFRS9 ready).',
    color: '#a1a1aa' // zinc-400
  },
  {
    id: 'intelligence',
    title: 'Intelligence Layer',
    icon: BrainCircuit,
    desc: 'Quantitative engine running PD/LGD/EAD models. Integrated SHAP explainability and PSI monitoring.',
    color: '#3ECF8E'
  },
  {
    id: 'data',
    title: 'Data & Integration Layer',
    icon: Database,
    desc: 'High-throughput ingestion pipelines connecting to Core Banking, CRM, and alternative data providers.',
    color: '#52525b' // zinc-600
  }
]

export function ArchitectureSection() {
  return (
    <section className="py-28 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#3ECF8E]">The Layer Cake</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-medium text-white tracking-tight mb-5">
            Composable Architecture
          </h2>
          <p className="text-[15px] font-medium text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            A modular, unopinionated stack designed to scale. Swap out components, bring your own models, or connect existing UIs via our headless APIs.
          </p>
        </div>

        <div className="max-w-4xl mx-auto relative">
          {/* Vertical connecting line */}
          <div className="absolute left-[39px] md:left-1/2 top-8 bottom-8 w-px bg-gradient-to-b from-transparent via-white/[0.1] to-transparent md:-translate-x-1/2" />
          
          <div className="space-y-6">
            {layers.map((layer, i) => (
              <motion.div
                key={layer.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="relative flex flex-col md:flex-row items-start md:items-center gap-6 group"
              >
                {/* Left side (empty on desktop for zig-zag, or just aligned) - Let's do a simple stacked list but centered icon */}
                <div className="hidden md:block md:w-1/2 md:text-right md:pr-12">
                  <h3 className="text-lg font-medium text-white mb-2">{layer.title}</h3>
                  <p className="text-[14px] font-medium text-zinc-500 leading-relaxed">{layer.desc}</p>
                </div>

                {/* Center Icon */}
                <div className="relative z-10 w-20 h-20 rounded-2xl bg-[#050505] border border-white/[0.05] flex items-center justify-center flex-shrink-0 group-hover:border-[#3ECF8E]/20 group-hover:bg-[#3ECF8E]/5 transition-all duration-500 shadow-xl mx-0 md:mx-auto">
                  <layer.icon className="w-8 h-8 transition-colors duration-500" style={{ color: layer.color }} />
                  <div className="absolute inset-0 bg-[#3ECF8E]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                {/* Right side (Mobile view, and Desktop alternate) */}
                <div className="md:w-1/2 md:pl-12 md:hidden">
                  <h3 className="text-lg font-medium text-white mb-2">{layer.title}</h3>
                  <p className="text-[14px] font-medium text-zinc-500 leading-relaxed">{layer.desc}</p>
                </div>
                
                {/* Desktop empty spacer for symmetry since we aligned left side above */}
                <div className="hidden md:block md:w-1/2 md:pl-12 opacity-0 select-none pointer-events-none">
                  <h3 className="text-lg font-medium mb-2">{layer.title}</h3>
                  <p className="text-[14px]">{layer.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
