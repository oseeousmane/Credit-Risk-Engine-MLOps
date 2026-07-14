import type { Metadata } from 'next'
import './globals.css'
import AppLayoutClient from './AppLayoutClient'

export const metadata: Metadata = {
  title: 'Octaix Risk Engine | Institutional Credit Risk Platform',
  description: 'Octaix Risk Engine (ORE) — plateforme de risque de crédit institutionnel. IFRS 9 · Bâle III · Conforme COBAC. Zone CEMAC.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-[#060606] text-white antialiased" suppressHydrationWarning>
        <AppLayoutClient>{children}</AppLayoutClient>
      </body>
    </html>
  )
}
