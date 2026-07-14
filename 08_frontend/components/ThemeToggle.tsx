'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/theme'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      onClick={toggleTheme}
      title={isLight ? 'Passer en mode sombre' : 'Mode présentation (clair) — pour salle de comité ou projecteur'}
      aria-label={isLight ? 'Mode sombre' : 'Mode présentation'}
      className={`p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-all ${className}`}
    >
      {isLight
        ? <Moon  className="w-4 h-4" aria-hidden="true" />
        : <Sun   className="w-4 h-4" aria-hidden="true" />
      }
    </button>
  )
}
