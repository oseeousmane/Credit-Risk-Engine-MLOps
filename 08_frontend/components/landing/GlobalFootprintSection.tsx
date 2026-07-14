'use client'

import { motion } from 'framer-motion'
import { MapPin, Globe, Server } from 'lucide-react'

const regions = [
  {
    city: 'London',
    type: 'Global HQ',
    desc: 'Engineering & Quantitative Research'
  },
  {
    city: 'New York',
    type: 'Americas Hub',
    desc: 'Enterprise Sales & Integration Support'
  },
  {
    city: 'Singapore',
    type: 'APAC Hub',
    desc: 'Regional Operations & Compliance'
  }
]

export function GlobalFootprintSection() {
  return (
    <section className="py-24 relative bg-[#020202]">
      {/* Top and Bottom subtle borders */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
      
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-16 items-center">
          
          <div className="md:w-1/3">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-400 mb-4">Global Scale</div>
            <h2 className="text-3xl font-medium text-white tracking-tight mb-6">
              Local Presence,<br/>Global Sovereignty
            </h2>
            <p className="text-[14px] font-medium text-zinc-400 leading-relaxed mb-8">
              Operating in major financial hubs to provide follow-the-sun support. 
              Our distributed data centers ensure strict compliance with regional data residency laws (GDPR, CCPA).
            </p>
            <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-300">
              <Server className="w-4 h-4 text-brand-400" />
              <span>Multi-Region AWS & GCP Deployments</span>
            </div>
          </div>

          <div className="md:w-2/3 grid sm:grid-cols-3 gap-6">
            {regions.map((region, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-6 bg-surface-0 border border-white/[0.03] rounded-2xl"
              >
                <div className="w-8 h-8 rounded bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-4">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <h3 className="text-white font-medium mb-1">{region.city}</h3>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400 mb-3">{region.type}</p>
                <p className="text-[13px] font-medium text-zinc-500 leading-relaxed">
                  {region.desc}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
