import type { Metadata } from 'next'
import './globals.css'
import AppLayoutClient from './AppLayoutClient'

export const metadata: Metadata = {
  title: 'RiskEngine | Enterprise Credit Risk Platform',
  description: 'Institutional-grade AI-powered credit risk platform. IFRS 9 · Basel III · COBAC compliant.',
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
