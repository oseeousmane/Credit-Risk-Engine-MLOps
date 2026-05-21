'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

type Locale = 'en' | 'fr'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
})

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: ReactNode
  initialLocale: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const router = useRouter()
  const pathname = usePathname()

  const setLocale = (newLocale: Locale) => {
    if (newLocale === locale) return

    // Set cookie for middleware
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`
    setLocaleState(newLocale)

    // Swap locale in the current URL path
    // e.g. /en/home -> /fr/home
    const segments = pathname.split('/')
    if (segments[1] === 'en' || segments[1] === 'fr') {
      segments[1] = newLocale
    }
    router.push(segments.join('/'))
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
