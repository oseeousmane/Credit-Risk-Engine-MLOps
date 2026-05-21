'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { fetchApi } from '@/lib/api-client'

export function InternalAuthWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    // ── LOCAL DEV BYPASS ── skip all auth checks
    setIsAuthenticated(true)
    setIsLoading(false)
  }, [pathname])

  if (isLoading || (!isAuthenticated && !pathname.startsWith('/client-portal'))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080808]" suppressHydrationWarning>
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
