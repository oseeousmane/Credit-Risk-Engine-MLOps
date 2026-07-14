'use client'

import { motion } from 'framer-motion'
import { Link2, Database, ShieldCheck, Zap } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

const integrations = [
  { name: 'Core Banking', desc: 'Temenos, Mambu, Avaloq', icon: Database },
  { name: 'Data Cloud', desc: 'Snowflake, Databricks, AWS', icon: Zap },
  { name: 'CRM & Origination', desc: 'Salesforce, Microsoft Dynamics', icon: Link2 },
  { name: 'Risk & Identity', desc: 'LexisNexis, Refinitiv, S&P', icon: ShieldCheck },
]

export function IntegrationsSection() {
  const { locale } = useLanguage()
  const header = locale === 'fr'
    ? { badge: 'Ecosysteme', title: 'S\'integre a Votre Architecture Existante', desc: 'Credit Risk Engine est concu pour etre au centre de votre architecture. Nous nous connectons en transparence a vos systemes bancaires centraux, lacs de donnees et APIs de risque tierces.' }
    : { badge: 'Ecosystem', title: 'Integrates with Your Existing Stack', desc: 'Credit Risk Engine is designed to sit at the center of your architecture. We connect seamlessly to your core banking systems, data lakes, and third-party risk APIs.' }
  return (
    <section className="py-28 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-400">{header.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-medium text-white tracking-tight mb-5">{header.title}</h2>
          <p className="text-[15px] font-medium text-zinc-400 max-w-2xl mx-auto leading-relaxed">{header.desc}</p>
        </div>

        <div className="relative p-1 rounded-3xl bg-surface-0 border border-white/[0.03]">
          {/* Decorative network lines */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" 
               style={{ 
                 backgroundImage: 'radial-gradient(circle at center, rgba(59,123,255,0.5) 1px, transparent 1px)', 
                 backgroundSize: '32px 32px' 
               }} 
          />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-400/20 to-transparent transform -translate-y-1/2" />
          
          <div className="relative z-10 grid md:grid-cols-4 gap-px bg-white/[0.02]">
            {integrations.map((integration, i) => (
              <motion.div 
                key={integration.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group p-8 bg-surface-0 hover:bg-[#080808] transition-colors duration-500 flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-5 group-hover:bg-brand-400/10 group-hover:border-brand-400/20 transition-all duration-500 shadow-sm relative">
                  <div className="absolute inset-0 bg-brand-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <integration.icon className="w-5 h-5 text-zinc-500 group-hover:text-brand-400 transition-colors relative z-10" />
                </div>
                <h3 className="text-[15px] font-medium text-zinc-200 mb-2">{integration.name}</h3>
                <p className="text-[12px] font-medium text-zinc-500">{integration.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
