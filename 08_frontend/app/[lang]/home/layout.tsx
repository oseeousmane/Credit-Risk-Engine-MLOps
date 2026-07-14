import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Credit Risk Engine — AI-Powered Credit Risk Platform for Enterprise Banking',
  description: 'Unify credit decisioning, portfolio intelligence, monitoring, stress testing, and compliance in one institutional-grade platform. Built for analysts, managers, CROs, and regulated credit operations.',
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070D1B] text-white">
      {children}
    </div>
  )
}
