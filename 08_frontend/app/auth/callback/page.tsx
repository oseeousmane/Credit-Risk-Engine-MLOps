'use client'
import * as React from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TrendingUp, ShieldCheck } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api-client'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Verifying identity...')
  const [error, setError] = useState('')

  useEffect(() => {
    const processToken = async () => {
      try {
        setStatus('Retrieving profile...')

        let accessToken: string | null = searchParams.get('token')
        let user: any = null

        if (accessToken) {
          // Legacy URL-token path (kept for forward compatibility)
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          if (!res.ok) throw new Error('Failed to retrieve profile')
          user = await res.json()
        } else {
          // OIDC cookie path: backend set an HttpOnly auth_token cookie and
          // redirected here without a URL token. Exchange the cookie for an
          // explicit access_token + user profile via /auth/session.
          const res = await fetch(`${API_BASE_URL}/auth/session`, {
            credentials: 'include',
          })
          if (!res.ok) {
            setError('No authentication token found. Please log in again.')
            return
          }
          const session = await res.json()
          accessToken = session.access_token
          user = session.user
        }

        // Role-based routing and token storage
        if (user.role === 'CLIENT') {
          localStorage.setItem('client_token', accessToken!)
          localStorage.setItem('client_user', JSON.stringify(user))
          setStatus('Authentication successful. Redirecting to Client Portal...')
          setTimeout(() => router.push('/client-portal'), 500)
        } else {
          localStorage.setItem('internal_token', accessToken!)
          localStorage.setItem('internal_user', JSON.stringify(user))
          setStatus('Authentication successful. Redirecting...')
          setTimeout(() => router.push('/'), 500)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve profile')
      }
    }

    processToken()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-8 relative overflow-hidden flex flex-col items-center text-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-400/8 rounded-full blur-[80px]" />
        
        <div className="w-12 h-12 rounded-xl bg-brand-400/10 border border-brand-400/25 flex items-center justify-center shadow-[0_0_24px_rgba(59,123,255,0.2)] mb-6 animate-pulse">
          <TrendingUp className="w-6 h-6 text-brand-400" />
        </div>
        
        <h2 className="text-lg font-bold text-white mb-2 relative">Enterprise SSO</h2>
        
        {error ? (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg flex items-center gap-2 mt-4 text-left w-full">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        ) : (
          <p className="text-[12px] text-brand-400 mt-2 relative font-medium flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {status}
          </p>
        )}

        {error && (
          <button 
            onClick={() => router.push('/auth/login')}
            className="mt-6 w-full bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold py-2 rounded-lg transition-all border border-white/[0.05] text-[13px]"
          >
            Return to Login
          </button>
        )}
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-8 relative flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-brand-400/10 border border-brand-400/25 flex items-center justify-center animate-pulse mb-6">
            <TrendingUp className="w-6 h-6 text-brand-400" />
          </div>
          <p className="text-[12px] text-brand-400 font-medium">Loading authentication module...</p>
        </div>
      </div>
    }>
      <CallbackHandler />
    </React.Suspense>
  )
}
