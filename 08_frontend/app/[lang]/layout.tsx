import React from 'react'
import { LandingNav } from '@/components/landing/LandingNav'
import { Footer } from '@/components/landing/Footer'
import { LanguageProvider } from '@/lib/LanguageContext'
import type { Locale } from '@/lib/dictionaries'

const locales = ['en', 'fr']

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const locale = locales.includes(lang) ? (lang as Locale) : 'en'

  return (
    <LanguageProvider initialLocale={locale}>
      <div className="flex flex-col min-h-screen bg-[#060606] text-white">
        <LandingNav lang={locale} />
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </div>
    </LanguageProvider>
  )
}
