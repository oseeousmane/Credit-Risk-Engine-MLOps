'use client'

import { useLanguage } from '@/lib/LanguageContext'

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()

  return (
    <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
      <button
        onClick={() => setLocale('en')}
        className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-widest transition-all duration-200 ${
          locale === 'en'
            ? 'bg-brand-400/15 text-brand-400 border border-brand-400/20'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale('fr')}
        className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-widest transition-all duration-200 ${
          locale === 'fr'
            ? 'bg-brand-400/15 text-brand-400 border border-brand-400/20'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        FR
      </button>
    </div>
  )
}
