import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Mon Prêt | ORE Microfinance',
  description: 'Suivez votre demande de prêt et gérez votre dossier facilement.',
}

export default function MicrofinancePortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#060608] text-white">
      {children}
    </div>
  )
}
