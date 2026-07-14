import React from 'react'
import Sidebar from '@/components/dashboard/Sidebar'

export const metadata = {
  title: 'Credit Scoring - ORE',
  description: 'Scoring performance and analytics',
}

export default function CreditScoringLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-corp-bg text-corp-textPrimary font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
