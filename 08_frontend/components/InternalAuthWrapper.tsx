'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { fetchApi, INTERNAL_TOKEN_KEY } from '@/lib/api-client'

export function InternalAuthWrapper({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<'loading' | 'ok' | 'unauth'>('loading')
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(INTERNAL_TOKEN_KEY) : null
    if (!token) {
      setStatus('unauth')
      return
    }

    fetchApi('/auth/me')
      .then(() => setStatus('ok'))
      .catch((err: any) => {
        // Only evict the token on an explicit auth rejection (401 / "Session expired").
        // Network errors (backend unreachable) should not log the user out.
        const isAuthError =
          err?.message?.toLowerCase().includes('session') ||
          err?.message?.toLowerCase().includes('unauthorized') ||
          err?.message?.includes('401')
        if (isAuthError) {
          localStorage.removeItem(INTERNAL_TOKEN_KEY)
          setStatus('unauth')
        } else {
          // Backend unreachable but token exists — allow access in degraded mode.
          setStatus('ok')
        }
      })
  }, [pathname])

  React.useEffect(() => {
    if (status === 'unauth') {
      router.push('/auth/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080808]" suppressHydrationWarning>
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (status === 'unauth') {
    return null
  }

  return <>{children}</>
}
