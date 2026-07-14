'use client'

import { motion } from 'framer-motion'
import { Filter, Bot, LineChart } from 'lucide-react'

export function RulesEngineSection() {
  return (
    <section className="py-28 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-400">The Brain</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-medium text-white tracking-tight mb-5">
            Where AI meets Policy
          </h2>
          <p className="text-[15px] font-medium text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Machine learning shouldn't be a black box. Our hybrid decision engine combines 
            predictive quantitative scoring with your strict deterministic credit policies.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="p-8 rounded-2xl bg-surface-0 border border-white/[0.03] hover:border-white/[0.08] transition-colors group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Bot className="w-32 h-32" />
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-6 bg-white/[0.03] border border-white/[0.08] group-hover:bg-brand-400/10 group-hover:border-brand-400/20 transition-colors duration-500">
              <Bot className="w-4 h-4 text-zinc-400 group-hover:text-brand-400 transition-colors duration-500" />
            </div>
            <h3 className="text-lg font-medium text-zinc-200 group-hover:text-white transition-colors duration-500 mb-3">1. Quantitative Scoring</h3>
            <p className="text-[14px] font-medium text-zinc-500 leading-relaxed mb-4">
              XGBoost and Neural Network models evaluate alternative data and financials to generate a base Probability of Default (PD).
            </p>
            <div className="mt-auto inline-flex items-center text-[12px] font-mono text-brand-400">
              PD_1Y: 1.42%
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="p-8 rounded-2xl bg-surface-0 border border-white/[0.03] hover:border-white/[0.08] transition-colors group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Filter className="w-32 h-32" />
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-6 bg-white/[0.03] border border-white/[0.08] group-hover:bg-brand-400/10 group-hover:border-brand-400/20 transition-colors duration-500">
              <Filter className="w-4 h-4 text-zinc-400 group-hover:text-brand-400 transition-colors duration-500" />
            </div>
            <h3 className="text-lg font-medium text-zinc-200 group-hover:text-white transition-colors duration-500 mb-3">2. Policy Overlays</h3>
            <p className="text-[14px] font-medium text-zinc-500 leading-relaxed mb-4">
              Les règles déterministes servent de garde-fous. Ex. : « Rejeter auto si DPD &gt; 30 j » ou « Escalader si exposition &gt; 6,5 Mds XAF ».
            </p>
            <div className="mt-auto inline-flex items-center text-[12px] font-mono text-zinc-300">
              if (DPD &gt; 30) {'{'} reject() {'}'}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="p-8 rounded-2xl bg-surface-0 border border-white/[0.03] hover:border-white/[0.08] transition-colors group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <LineChart className="w-32 h-32" />
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-6 bg-white/[0.03] border border-white/[0.08] group-hover:bg-brand-400/10 group-hover:border-brand-400/20 transition-colors duration-500">
              <LineChart className="w-4 h-4 text-zinc-400 group-hover:text-brand-400 transition-colors duration-500" />
            </div>
            <h3 className="text-lg font-medium text-zinc-200 group-hover:text-white transition-colors duration-500 mb-3">3. Explainable AI (SHAP)</h3>
            <p className="text-[14px] font-medium text-zinc-500 leading-relaxed mb-4">
              Every decision is mathematically explained. Regulators and analysts can see exactly which features drove the approval or rejection.
            </p>
            <div className="mt-auto inline-flex flex-col w-full gap-2">
              <div className="w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden flex">
                <div className="h-full bg-brand-400/30 w-[40%] transition-colors group-hover:bg-brand-400/50" />
                <div className="h-full bg-brand-400/80 w-[60%] transition-colors group-hover:bg-brand-400" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
