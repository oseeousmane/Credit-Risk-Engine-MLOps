'use client'
import { Scale, Shield, Brain, FileCheck, Activity, Users } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

const content = {
  en: [
    { icon: Scale, label: 'IFRS 9 Ready' },
    { icon: Shield, label: 'Basel III Aligned' },
    { icon: Brain, label: 'Explainable AI' },
    { icon: FileCheck, label: 'Audit Trail' },
    { icon: Activity, label: 'MLOps Monitoring' },
    { icon: Users, label: 'Role-Based Workflows' },
  ],
  fr: [
    { icon: Scale, label: 'IFRS 9 Conforme' },
    { icon: Shield, label: 'Bâle III Aligné' },
    { icon: Brain, label: 'IA Explicable' },
    { icon: FileCheck, label: 'Piste d\'Audit' },
    { icon: Activity, label: 'Monitoring MLOps' },
    { icon: Users, label: 'Workflows par Rôles' },
  ],
}

export function TrustStrip() {
  const { locale } = useLanguage()
  const items = content[locale]

  return (
    <section className="relative py-10 border-b border-white/[0.03] bg-surface-0">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 lg:justify-between">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-3 group cursor-default">
              <div className="flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                <item.icon className="w-5 h-5 text-zinc-600 group-hover:text-brand-400 transition-all duration-500 drop-shadow-[0_0_0_rgba(59,123,255,0)] group-hover:drop-shadow-[0_0_12px_rgba(59,123,255,0.4)]" strokeWidth={1.5} />
              </div>
              <span className="text-[12px] font-medium text-zinc-500 tracking-wide transition-colors duration-500 group-hover:text-zinc-300">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
