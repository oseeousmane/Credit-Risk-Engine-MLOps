import React from 'react'
import Sidebar from '@/components/dashboard/Sidebar'

export const metadata = {
  title: 'Portfolio Risk - ORE',
  description: 'Portfolio risk overview and analysis',
}

export default function PortfolioRiskLayout({
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
