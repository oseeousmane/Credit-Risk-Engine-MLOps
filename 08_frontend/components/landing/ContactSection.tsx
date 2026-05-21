'use client'
import { ArrowRight, Mail, Building2, Globe, Shield } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'

const t = {
  en: { 
    badge: 'Institutional Inquiries',
    title: 'Connect with Our Risk Specialists', 
    desc: 'Deploy institutional-grade credit risk intelligence. Our team of quant engineers and risk specialists is ready to assist with your platform evaluation and integration requirements.', 
    benefits: [
      'Custom implementation blueprints',
      'Architecture & MLOps strategy',
      'Regulatory compliance review'
    ],
    inquiriesLabel: 'Corporate Headquarters', 
    globalLabel: 'Global Reach', 
    globalValue: 'Active in NA, EMEA & APAC', 
    cta1: 'Request Institutional Demo', 
    cta2: 'Schedule Technical Review', 
    responseTime: 'Typical response time for institutional inquiries is under 4 business hours.',
    securityLabel: 'Secure. Encrypted. Compliant.'
  },
  fr: { 
    badge: 'Demandes Institutionnelles',
    title: 'Connectez avec nos Spécialistes Risque', 
    desc: 'Déployez une intelligence de risque crédit de classe institutionnelle. Notre équipe d\'ingénieurs quantitatifs est prête à vous accompagner dans l\'évaluation et l\'intégration de la plateforme.', 
    benefits: [
      'Plans d\'implémentation sur mesure',
      'Stratégie Architecture & MLOps',
      'Revue de conformité réglementaire'
    ],
    inquiriesLabel: 'Siège Social', 
    globalLabel: 'Présence Mondiale', 
    globalValue: 'Actif en AM, EMEA & APAC', 
    cta1: 'Demander une Démo Institutionnelle', 
    cta2: 'Planifier une Revue Technique', 
    responseTime: 'Le temps de réponse typique pour les demandes institutionnelles est inférieur à 4 heures ouvrables.',
    securityLabel: 'Sécurisé. Chiffré. Conforme.'
  },
}

export function ContactSection() {
  const { locale } = useLanguage()
  const tx = t[locale]
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-medium text-white mb-4 tracking-tight">{tx.title}</h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">{tx.desc}</p>
        </div>

        <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
          <div className="grid md:grid-cols-2 divide-x divide-white/[0.05]">
            <div className="p-10 lg:p-12">
              <div className="space-y-8">
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <Mail className="w-4 h-4 text-[#3ECF8E]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">{tx.inquiriesLabel}</div>
                    <div className="text-[14px] font-medium text-white">enterprise@riskengine.bank</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <Globe className="w-4 h-4 text-[#3ECF8E]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">{tx.globalLabel}</div>
                    <div className="text-[14px] font-medium text-white">{tx.globalValue}</div>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-2 text-zinc-500">
                  <Shield className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{tx.securityLabel}</span>
                </div>
              </div>
            </div>

            <div className="p-10 lg:p-12 bg-white/[0.01] flex flex-col justify-center gap-4">
              <Link href={`/${locale}/contact`} className="flex items-center justify-center px-6 py-4 bg-[#3ECF8E] text-[#0a0a0a] text-[14px] font-bold rounded-lg hover:bg-[#3ECF8E]/90 transition-all">
                {tx.cta1}
              </Link>
              <Link href={`/${locale}/contact`} className="flex items-center justify-center px-6 py-4 bg-white/[0.03] border border-white/[0.08] text-white text-[14px] font-bold rounded-lg hover:bg-white/[0.06] transition-all">
                {tx.cta2}
              </Link>
              <p className="text-[12px] text-zinc-500 text-center mt-2 leading-relaxed">
                {tx.responseTime}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
