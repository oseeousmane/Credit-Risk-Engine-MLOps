'use client'

import { motion } from 'framer-motion'
import { Server, Database, Layers, Layout, Cpu, GitBranch, Box, FileCode2 } from 'lucide-react'

const stacks = [
  {
    category: 'Experience (Frontend)',
    icon: Layout,
    items: [
      { name: 'Next.js 14', desc: 'App Router & SSR' },
      { name: 'React 18', desc: 'Concurrent Rendering' },
      { name: 'Tailwind CSS', desc: 'Utility-first Styling' },
      { name: 'Framer Motion', desc: 'Micro-animations' },
    ]
  },
  {
    category: 'Orchestration (Backend)',
    icon: Server,
    items: [
      { name: 'NestJS 11', desc: 'Enterprise Node.js' },
      { name: 'TypeScript', desc: 'Strict Type Safety' },
      { name: 'Prisma ORM', desc: 'Schema Governance' },
      { name: 'Redis', desc: 'Session & State Caching' },
    ]
  },
  {
    category: 'Intelligence (Risk Engine)',
    icon: Cpu,
    items: [
      { name: 'Python 3.11', desc: 'Quant Environment' },
      { name: 'XGBoost', desc: 'Predictive PD Modeling' },
      { name: 'FastAPI', desc: 'Low-latency Inference' },
      { name: 'SHAP', desc: 'Explainability Math' },
    ]
  },
  {
    category: 'Data & Persistence',
    icon: Database,
    items: [
      { name: 'Supabase', desc: 'Managed Infrastructure' },
      { name: 'PostgreSQL', desc: 'Relational Database' },
      { name: 'S3 / Storage', desc: 'Object Persistence' },
      { name: 'Kafka / Webhooks', desc: 'Event Streaming' },
    ]
  }
]

export function TechStackSection() {
  return (
    <section className="py-28 relative border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-16 items-start">
          
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="sticky top-28"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#3ECF8E]">Infrastructure</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-medium text-white tracking-tight mb-6">
              Institutional-Grade Stack
            </h2>
            <p className="text-[15px] font-medium text-zinc-400 leading-relaxed mb-6">
              We don't build black boxes or lock you into proprietary esoteric languages. Credit Risk Engine is built on top of the industry's most robust, open, and scalable technologies.
            </p>
            <div className="p-5 bg-[#050505] border border-white/[0.04] rounded-xl flex items-start gap-4">
              <FileCode2 className="w-5 h-5 text-[#3ECF8E] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[14px] font-medium text-zinc-200 mb-1">Developer Ergonomics</h4>
                <p className="text-[13px] text-zinc-500 leading-relaxed">
                  Every component is fully typed. Extend the schema via Prisma, or swap out the ML engine by respecting the standard inference contract.
                </p>
              </div>
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {stacks.map((stack, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-6 bg-[#050505] border border-white/[0.03] hover:border-white/[0.08] transition-colors rounded-2xl group"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.08] group-hover:bg-[#3ECF8E]/10 group-hover:border-[#3ECF8E]/20 transition-colors duration-500">
                    <stack.icon className="w-4 h-4 text-zinc-400 group-hover:text-[#3ECF8E] transition-colors duration-500" />
                  </div>
                  <h3 className="text-[15px] font-medium tracking-tight text-white">{stack.category}</h3>
                </div>
                
                <div className="space-y-4">
                  {stack.items.map((item, j) => (
                    <div key={j} className="flex justify-between items-center border-b border-white/[0.03] pb-3 last:border-0 last:pb-0">
                      <span className="text-[14px] font-medium text-zinc-300">{item.name}</span>
                      <span className="text-[12px] font-mono text-zinc-500">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
