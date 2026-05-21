'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Shield, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api-client'

export default function ClientLoginPage() {
  const [email, setEmail] = useState('tom.eriksen@glp-group.com')
  const [password, setPassword] = useState('Demo@2026!')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Login failed')
      }

      if (data.user?.role !== 'CLIENT') {
        throw new Error('Access denied. This portal is for corporate clients only.')
      }

      localStorage.setItem('client_token', data.access_token)
      localStorage.setItem('client_user', JSON.stringify(data.user))
      
      router.push('/client-portal')
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-50 rounded-full blur-3xl opacity-60"></div>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative z-10">
        <div className="bg-gradient-to-br from-blue-700 to-indigo-900 p-8 text-center text-white relative">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Shield className="w-24 h-24" />
          </div>
          <div className="w-14 h-14 bg-white/20 backdrop-blur border border-white/30 rounded-2xl flex items-center justify-center mx-auto mb-4 relative z-10">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1 relative z-10">Client Portal</h1>
          <p className="text-blue-100 text-sm relative z-10">Secure Corporate Credit Management</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-6 border border-red-100 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Corporate Email</label>
              <div className="relative">
                <input
                  type="email"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input
                  type="password"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  readOnly={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Secure Login <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            <div className="relative mt-6 mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-500 font-medium">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.location.href = `${API_BASE_URL}/auth/oidc/login`}
              className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Shield className="w-4 h-4 text-blue-600" />
              Sign in with Enterprise SSO
            </button>
          </form>
          
          <div className="mt-8 text-center text-xs text-gray-400">
            <p>Demo credentials pre-filled.</p>
            <p className="mt-1">By logging in, you agree to our Terms of Service.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
