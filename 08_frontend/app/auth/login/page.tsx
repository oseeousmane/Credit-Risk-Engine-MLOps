'use client'
import * as React from 'react'
import { useState } from 'react'
import { TrendingUp, ShieldCheck } from 'lucide-react'
import { fetchApi } from '@/lib/api-client'
import { useRouter } from 'next/navigation'

export default function InternalLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      localStorage.setItem('internal_token', data.access_token)
      localStorage.setItem('internal_user', JSON.stringify(data.user))
      router.push('/')
      
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('Demo@2026')
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-400/10 border border-brand-400/25 flex items-center justify-center shadow-[0_0_24px_rgba(59,123,255,0.2)] mb-4">
            <TrendingUp className="w-6 h-6 text-brand-400" />
          </div>
          <h1 className="text-2xl font-black text-white" style={{letterSpacing: '-0.03em'}}>ORE</h1>
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.18em] mt-1">Octaix Risk Engine · Accès Interne</p>
        </div>

        <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-400/8 rounded-full blur-[80px]" />
          
          <h2 className="text-lg font-bold text-white mb-2 relative">Secure Access</h2>
          <p className="text-[12px] text-zinc-500 mb-8 relative">Please authenticate using your corporate credentials.</p>

          <form onSubmit={handleLogin} className="space-y-4 relative">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-2">Corporate Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#141414] border border-white/[0.08] text-sm text-white rounded-lg px-4 py-3 outline-none focus:border-brand-400/50 focus:shadow-[0_0_0_3px_rgba(59,123,255,0.08)] transition-all"
                placeholder="Ex: analyst@riskengine.com"
              />
            </div>
            
            <div className="mb-6">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#141414] border border-white/[0.08] text-sm text-white rounded-lg px-4 py-3 outline-none focus:border-brand-400/50 focus:shadow-[0_0_0_3px_rgba(59,123,255,0.08)] transition-all"
                placeholder="••••••••••"
              />
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-400 hover:opacity-90 text-[#0a0a0a] font-bold py-3 rounded-lg transition-all shadow-[0_0_24px_rgba(59,123,255,0.25)] hover:shadow-[0_0_36px_rgba(59,123,255,0.35)] disabled:opacity-50 disabled:cursor-not-allowed text-[14px]"
              style={{letterSpacing: '-0.01em'}}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink-0 mx-4 text-zinc-600 text-xs font-medium uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/oidc/login`;
              }}
              className="w-full bg-transparent hover:bg-white/[0.03] text-white border border-white/[0.1] hover:border-white/[0.2] font-bold py-3 rounded-lg transition-all text-[14px] flex items-center justify-center gap-2"
              style={{letterSpacing: '-0.01em'}}
            >
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              Enterprise SSO
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.06] relative">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 text-center">Demo Personas</p>
            <div className="flex justify-center gap-2">
              <button type="button" onClick={() => fillDemo('analyst@riskengine.com')} className="text-[10px] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 px-3 py-1.5 rounded-full transition-colors border border-white/[0.05]">Analyst</button>
              <button type="button" onClick={() => fillDemo('manager@riskengine.com')} className="text-[10px] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 px-3 py-1.5 rounded-full transition-colors border border-white/[0.05]">Manager</button>
              <button type="button" onClick={() => fillDemo('cro@riskengine.com')} className="text-[10px] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 px-3 py-1.5 rounded-full transition-colors border border-white/[0.05]">CRO</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
