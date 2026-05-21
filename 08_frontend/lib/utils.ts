import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { RiskLevel } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmt(n: number, decimals = 1): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(decimals)}T`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(decimals)}B`
  return `$${n.toFixed(decimals)}M`
}

export function fmtPct(n: number, decimals = 2): string {
  return `${n.toFixed(decimals)}%`
}

export function fmtMs(n: number): string {
  return `${n}ms`
}

export function riskLevelColor(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    LOW: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    MED: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    HIGH: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    CRITICAL: 'text-red-400 bg-red-600/10 border-red-600/40 animate-pulse',
  }
  return map[level]
}

export function riskLevelDot(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    LOW: 'bg-emerald-400',
    MED: 'bg-amber-400',
    HIGH: 'bg-rose-400',
    CRITICAL: 'bg-red-500',
  }
  return map[level]
}

export function stageBg(stage: number): string {
  return stage === 1 ? 'border-blue-500/40' : stage === 2 ? 'border-amber-500/40' : 'border-rose-500/40'
}

export function stageText(stage: number): string {
  return stage === 1 ? 'text-blue-400' : stage === 2 ? 'text-amber-400' : 'text-rose-400'
}
