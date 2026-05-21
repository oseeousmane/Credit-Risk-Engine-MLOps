import type { Metadata } from 'next'
import ClientPortalAuthWrapper from './AuthWrapper'

export const metadata: Metadata = {
  title: 'Client Portal | RiskEngine Enterprise',
  description: 'Secure enterprise client portal for institutional credit applications',
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
