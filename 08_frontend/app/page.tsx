'use client'
import * as React from 'react'
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { AnalystDashboard } from '@/components/dashboards/AnalystDashboard'
import { ManagerDashboard } from '@/components/dashboards/ManagerDashboard'
import { CRODashboard } from '@/components/dashboards/CRODashboard'
import { AdminDashboard } from '@/components/dashboards/AdminDashboard'

export default function RootDashboardPage() {
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('internal_user')
      if (stored) {
        const user = JSON.parse(stored)
        setRole(user.role || 'ANALYST')
      } else {
        setRole('ANALYST') // fallback
      }
    } catch {
      setRole('ANALYST')
    }
  }, [])

  if (!role) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (role === 'CRO') return <CRODashboard />
  if (role === 'ADMIN') return <AdminDashboard />
  if (role === 'MANAGER') return <ManagerDashboard />
  
  return <AnalystDashboard />
}
