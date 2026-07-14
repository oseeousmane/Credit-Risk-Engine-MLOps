import React from 'react'
import Sidebar from '@/components/dashboard/Sidebar'

export const metadata = {
  title: 'Stress Testing - ORE',
  description: 'Forward-Looking Risk Assessment & Regulatory Simulation',
}

export default function StressTestingLayout({
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
