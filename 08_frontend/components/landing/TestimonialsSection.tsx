import { motion } from 'framer-motion'
import { Quote, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

const content = {
  en: {
    badge: 'Social Proof',
    title: 'Trusted by Institutional Risk Teams',
    testimonials: [
      { quote: 'The platform gave our risk and operations teams a unified operating layer across complex decisioning and portfolio oversight — perfectly aligned with COBAC requirements.', author: 'Fatima Aliou-Diallo', role: 'Chief Risk Officer', context: 'Grande Banque Équatoriale', verified: true },
      { quote: 'Unparalleled traceability. We reduced operational friction by 40% while maintaining strict audit compliance across all lending stages under IFRS 9.', author: 'Étienne Nkolo', role: 'Head of Credit Operations', context: 'Caisse de Crédit Centrafricain', verified: true },
      { quote: 'The combination of executive visibility and granular workflow control is exactly what modern CEMAC institutions need to compete with global banks.', author: 'Adeline Biyong', role: 'Director of Risk Strategy', context: 'Banque du Golfe de Guinée', verified: true },
    ],
  },
  fr: {
    badge: 'Preuve Sociale',
    title: 'Approuvé par les Équipes de Risque Institutionnelles',
    testimonials: [
      { quote: 'La plateforme offre à nos équipes une couche opérationnelle unifiée pour le décisionnel et la supervision du portefeuille — parfaitement alignée avec les exigences COBAC.', author: 'Fatima Aliou-Diallo', role: 'Directrice des Risques', context: 'Grande Banque Équatoriale', verified: true },
      { quote: 'Une traçabilité inégalée. Nous avons réduit les frictions opérationnelles de 40% tout en maintenant une conformité d\'audit stricte selon IFRS 9.', author: 'Étienne Nkolo', role: 'Resp. des Opérations de Crédit', context: 'Caisse de Crédit Centrafricain', verified: true },
      { quote: 'La combinaison d\'une visibilité exécutive et d\'un contrôle granulaire est exactement ce dont les institutions CEMAC ont besoin pour s\'aligner sur les standards mondiaux.', author: 'Adeline Biyong', role: 'Directrice de la Stratégie Risque', context: 'Banque du Golfe de Guinée', verified: true },
    ],
  },
}

export function TestimonialsSection() {
  const { locale } = useLanguage()
  const t = content[locale]

  return (
    <section className="py-32 relative overflow-hidden bg-[#030303]">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-brand-400/[0.02] blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[11px] font-bold uppercase tracking-[0.3em] text-brand-400 mb-5"
          >
            {t.badge}
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-medium text-white tracking-tight leading-tight max-w-3xl mx-auto"
          >
            {t.title}
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
          {t.testimonials.map((tm, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="group relative flex flex-col justify-between p-10 bg-surface-0 border border-white/[0.05] rounded-[2rem] transition-all duration-700 hover:bg-[#080808] hover:border-brand-400/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            >
              {/* Background Quote Mark */}
              <div className="absolute top-8 right-8 text-white/[0.02] group-hover:text-brand-400/[0.03] transition-colors duration-700">
                <Quote className="w-24 h-24 rotate-12" />
              </div>

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-brand-400/10 flex items-center justify-center mb-10 group-hover:bg-brand-400/20 transition-colors duration-500">
                  <Quote className="w-5 h-5 text-brand-400" />
                </div>
                <p className="text-[18px] leading-relaxed text-zinc-300 font-medium mb-12 group-hover:text-white transition-colors duration-500">
                  &ldquo;{tm.quote}&rdquo;
                </p>
              </div>

              <div className="relative z-10 flex items-center gap-4 pt-8 border-t border-white/[0.05]">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.08] flex items-center justify-center text-[15px] font-bold text-zinc-300 group-hover:text-white group-hover:border-brand-400/30 transition-all duration-500">
                    {tm.author.charAt(0)}
                  </div>
                  {tm.verified && (
                    <div className="absolute -bottom-1 -right-1 bg-surface-0 rounded-full p-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[15px] font-bold text-white mb-0.5">{tm.author}</div>
                  <div className="text-[12px] font-medium text-zinc-500 group-hover:text-zinc-400 transition-colors">{tm.role}</div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-brand-400/80 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-brand-400" />
                    {tm.context}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
