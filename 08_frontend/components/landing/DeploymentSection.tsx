'use client'

import { motion } from 'framer-motion'
import { Cloud, Server, Shield } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

const deploymentOptions = [
  {
    title: 'Secure SaaS',
    icon: Cloud,
    desc: 'Fully managed multi-tenant environment with strict logical data separation and KMS-managed encryption keys.',
    badge: 'Fastest Setup'
  },
  {
    title: 'Private Cloud (VPC)',
    icon: Shield,
    desc: 'Deploy inside your own AWS, GCP, or Azure Virtual Private Cloud. We manage the control plane, you control the data plane.',
    badge: 'Enterprise Default'
  },
  {
    title: 'On-Premise',
    icon: Server,
    desc: 'For highly restricted environments. Deploy via Docker/Kubernetes on your own physical hardware or air-gapped network.',
    badge: 'Maximum Control'
  }
]

export function DeploymentSection() {
  const { locale } = useLanguage()
  const header = locale === 'fr'
    ? { badge: 'Architecture', title: 'Un deploiement adapte a votre appetit au risque.', desc: 'Nous comprenons que la souverainete et la residentialite des donnees sont non negociables pour les institutions financieres. Credit Risk Engine offre des modeles de deploiement flexibles bases sur des principes zero-trust.' }
    : { badge: 'Architecture', title: 'Deployment that meets your risk appetite.', desc: 'We understand that data sovereignty and residency are non-negotiable for financial institutions. Credit Risk Engine offers flexible deployment models built around zero-trust principles.' }
  return (
    <section className="py-28 relative bg-[#020202]">
      {/* Top/bottom borders */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-400 mb-4">{header.badge}</div>
            <h2 className="text-3xl sm:text-4xl font-medium text-white mb-6 tracking-tight leading-tight">{header.title}</h2>
            <p className="text-[15px] font-medium text-zinc-400 leading-relaxed mb-8">{header.desc}</p>
            <div className="flex gap-4">
              <div className="px-3 py-1.5 rounded-md bg-white/[0.02] border border-white/[0.04] text-[11px] font-bold tracking-wider text-zinc-300">SOC 2 TYPE II</div>
              <div className="px-3 py-1.5 rounded-md bg-white/[0.02] border border-white/[0.04] text-[11px] font-bold tracking-wider text-zinc-300">ISO 27001</div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-4">
            {deploymentOptions.map((opt, i) => (
              <motion.div 
                key={opt.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group relative flex items-start gap-5 p-6 bg-surface-0 border border-white/[0.03] hover:border-white/[0.08] rounded-2xl transition-all duration-500 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-brand-400/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="relative z-10 w-12 h-12 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center flex-shrink-0 group-hover:bg-brand-400/10 group-hover:border-brand-400/20 transition-all duration-500">
                  <opt.icon className="w-5 h-5 text-zinc-500 group-hover:text-brand-400 transition-colors" />
                </div>
                <div className="relative z-10 flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[16px] font-medium text-zinc-200 group-hover:text-white transition-colors">{opt.title}</h3>
                    <span className="text-[10px] font-semibold text-brand-400 bg-brand-400/10 px-2 py-0.5 rounded uppercase tracking-wider">{opt.badge}</span>
                  </div>
                  <p className="text-[13px] font-medium text-zinc-500 leading-relaxed">{opt.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
