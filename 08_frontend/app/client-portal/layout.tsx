import type { Metadata } from 'next'
import ClientPortalAuthWrapper from './AuthWrapper'

export const metadata: Metadata = {
  title: 'Portail Client | ORE — Octaix Risk Engine',
  description: 'Portail client sécurisé Octaix Risk Engine (ORE) pour le dépôt et le suivi des demandes de crédit institutionnelles. Conforme COBAC / Bâle III.',
}

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#060608] min-h-screen">
      <ClientPortalAuthWrapper>
        {children}
      </ClientPortalAuthWrapper>
    </div>
  )
}
