'use client'
import * as React from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { AlertSeverity } from '@/lib/types'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { motion } from 'framer-motion'

// ─── StatusBadge ─────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
  className?: string
}

const statusMap: Record<string, string> = {
  Stable: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  Alert: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  Negative: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  Watch: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Positive: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  VERIFIED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  REVIEW: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  ONLINE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  DEGRADED: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  OFFLINE: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  Active: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  APPROVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  DECLINE: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  REVIEW_BADGE: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  MED: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  HIGH: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  CRITICAL: 'bg-red-600/10 text-red-400 border-red-600/40',
  PRIORITY: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
}

export function StatusBadge({ status, size = 'sm', className }: StatusBadgeProps) {
  const colors = statusMap[status] ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded border px-2 font-mono font-semibold uppercase tracking-wider',
      size === 'sm' ? 'text-[10px] py-0.5' : 'text-xs py-1',
      colors, className
    )}>
      {(status === 'Alert' || status === 'CRITICAL' || status === 'PRIORITY') && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {status}
    </span>
  )
}

// ─── KPIBlock ─────────────────────────────────────────────────────────────────
interface KPIBlockProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  delta?: number
  deltaLabel?: string
  accent?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'none'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  children?: ReactNode
}

const accentGlow: Record<string, string> = {
  blue:    'from-[#3ECF8E]/5 to-transparent group-hover:from-[#3ECF8E]/10',
  emerald: 'from-[#3ECF8E]/5 to-transparent group-hover:from-[#3ECF8E]/10',
  amber:   'from-amber-500/5 to-transparent group-hover:from-amber-500/10',
  rose:    'from-rose-500/5 to-transparent group-hover:from-rose-500/10',
  purple:  'from-purple-500/5 to-transparent group-hover:from-purple-500/10',
  none:    '',
}

export function KPIBlock({
  label, value, sub, delta, deltaLabel, accent = 'none', size = 'md', className, children
}: KPIBlockProps) {
  const isPositive = (delta ?? 0) < 0
  return (
    <div className={cn(
      'relative group rounded-xl border border-white/[0.08] bg-[#0d0d0d] p-5 flex flex-col gap-2 overflow-hidden transition-all duration-300 hover:border-white/[0.15]',
      className
    )}>
      {accent !== 'none' && (
        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-100 transition-all duration-500 pointer-events-none', accentGlow[accent])} />
      )}
      <span className="relative text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">{label}</span>
      <div className={cn(
        'relative font-black tracking-tight text-white leading-none',
        size === 'sm' ? 'text-2xl' : size === 'md' ? 'text-3xl' : size === 'lg' ? 'text-4xl' : 'text-5xl'
      )}>
        {value}
      </div>
      {delta !== undefined && (
        <div className={cn(
          'relative flex items-center gap-1 text-xs font-semibold',
          isPositive ? 'text-emerald-400' : 'text-rose-400'
        )}>
          {isPositive ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
          {delta > 0 ? '+' : ''}{delta}{deltaLabel ?? ''}
        </div>
      )}
      {sub && <div className="relative text-[11px] text-zinc-500 mt-auto">{sub}</div>}
      {children}
    </div>
  )
}

// ─── ChartContainer ───────────────────────────────────────────────────────────
interface ChartContainerProps {
  title: string
  subtitle?: string
  badge?: ReactNode
  action?: ReactNode
  height?: number
  className?: string
  children: ReactNode
}

export function ChartContainer({
  title, subtitle, badge, action, height = 260, className, children
}: ChartContainerProps) {
  return (
    <div className={cn(
      'rounded-xl border border-white/[0.08] bg-[#0d0d0d] p-6 flex flex-col gap-4 transition-all duration-300 hover:border-white/[0.12]',
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
            {badge}
          </div>
          {subtitle && <p className="text-[11px] text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div style={{ height }} className="w-full">
        {children}
      </div>
    </div>
  )
}

// ─── AlertBlock ───────────────────────────────────────────────────────────────
interface AlertBlockProps {
  severity: AlertSeverity
  title: string
  body: string
  time?: string
  action?: ReactNode
}

const alertColors: Record<AlertSeverity, string> = {
  CRITICAL: 'border-l-rose-500 bg-rose-500/5 shadow-[0_0_15px_rgba(244,63,94,0.15)]',
  WARNING:  'border-l-amber-500 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
  INFO:     'border-l-[#3ECF8E] bg-[#3ECF8E]/5 shadow-[0_0_15px_rgba(62,207,142,0.15)]',
}
const alertTitleColors: Record<AlertSeverity, string> = {
  CRITICAL: 'text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]',
  WARNING:  'text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]',
  INFO:     'text-[#3ECF8E] drop-shadow-[0_0_5px_rgba(62,207,142,0.5)]',
}

export function AlertBlock({ severity, title, body, time, action }: AlertBlockProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        'border-l-2 rounded-r-xl p-4 flex flex-col gap-1.5 relative overflow-hidden transition-colors hover:bg-white/[0.04]',
        alertColors[severity]
      )}
    >
      {severity === 'CRITICAL' && (
        <motion.div
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent pointer-events-none"
        />
      )}
      <div className="flex items-center justify-between relative z-10">
        <span className={cn('text-xs font-bold uppercase tracking-wider flex items-center gap-2', alertTitleColors[severity])}>
          {(severity === 'CRITICAL' || severity === 'WARNING') && (
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          )}
          {severity}
        </span>
        {time && <span className="text-[10px] text-zinc-500">{time}</span>}
      </div>
      <p className="text-sm font-medium text-white relative z-10">{title}</p>
      <p className="text-[11px] text-zinc-400 leading-relaxed relative z-10">{body}</p>
      {action && <div className="mt-1 relative z-10">{action}</div>}
    </motion.div>
  )
}

// ─── SidePanel ────────────────────────────────────────────────────────────────
interface SidePanelProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  width?: number
}

export function SidePanel({ open, onClose, title, subtitle, children, width = 380 }: SidePanelProps) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full bg-[#0f0f0f] border-l border-white/[0.08] z-50 flex flex-col transition-transform duration-300 ease-in-out overflow-y-auto',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width }}
      >
        {(title || subtitle) && (
          <div className="p-6 border-b border-white/[0.08] flex items-start justify-between gap-4">
            <div>
              {title && <h2 className="text-lg font-bold text-white">{title}</h2>}
              {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition-colors mt-0.5 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </>
  )
}

// ─── LiveBadge ───────────────────────────────────────────────────────────────────
export function LiveBadge({ label = 'LIVE COMPUTATION' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#3ECF8E] bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 rounded-md px-2.5 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
      {label}
    </span>
  )
}

// ─── SectionHeader ─────────────────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string
  subtitle?: string
  badge?: ReactNode
  actions?: ReactNode
  className?: string
}

export function SectionHeader({ title, subtitle, badge, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          {badge}
          <h1
            className="text-3xl font-black text-white"
            style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}
          >
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
    </div>
  )
}

// ─── DataTable ───────────────────────────────────────────────────────────────
interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  activeId?: string
  idKey?: keyof T
  emptyLabel?: string
  className?: string
}

export function DataTable<T>({
  columns, data, onRowClick, activeId, idKey, emptyLabel = 'No data', className
}: DataTableProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 whitespace-nowrap',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-zinc-600 text-sm">
                {emptyLabel}
              </td>
            </tr>
          )}
          {data.map((row, i) => {
            const id = idKey ? String(row[idKey]) : String(i)
            const isActive = activeId === id
            return (
              <tr
                key={id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-white/[0.04] transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-white/[0.03]',
                  isActive && 'bg-[#3ECF8E]/[0.06] border-l-2 border-l-[#3ECF8E]'
                )}
              >
                {columns.map(col => (
                  <td key={col.key} className={cn('px-4 py-3 text-white/80 whitespace-nowrap', col.className)}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── MiniSparkline (inline SVG) ───────────────────────────────────────────────
export function Sparkline({ data, color = '#f59e0b', width = 60, height = 24 }: {
  data: number[]; color?: string; width?: number; height?: number
}) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const pts = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = 'bg-blue-500', className }: {
  value: number; max?: number; color?: string; className?: string
}) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className={cn('h-1.5 bg-white/[0.06] rounded-full overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── Toggle ──────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-10 h-5 rounded-full transition-colors duration-200',
        checked ? 'bg-[#3ECF8E]' : 'bg-white/[0.08]'
      )}
    >
      <span className={cn(
        'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
        checked ? 'translate-x-5' : 'translate-x-0'
      )} />
    </button>
  )
}

// ─── Btn ─────────────────────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  className?: string
}

export function Btn({ variant = 'secondary', size = 'md', children, className, ...props }: BtnProps) {
  const base = 'inline-flex items-center gap-2 font-semibold rounded-[10px] transition-all duration-150 whitespace-nowrap select-none cursor-pointer'
  const sizes = {
    sm: 'text-[12px] px-3 py-1.5',
    md: 'text-[13px] px-4 py-2',
    lg: 'text-[14px] px-5 py-2.5',
  }
  const variants = {
    primary:   'bg-[#3ECF8E] text-[#0a0a0a] border border-transparent hover:opacity-90 active:scale-[0.98] shadow-[0_0_28px_rgba(62,207,142,0.2)]',
    secondary: 'bg-white/[0.06] text-white border border-white/[0.14] hover:bg-white/[0.09] hover:border-white/[0.2] active:scale-[0.98]',
    ghost:     'bg-transparent text-zinc-400 border border-transparent hover:text-white hover:bg-white/[0.04]',
    danger:    'bg-rose-500/10 text-rose-400 border border-rose-500/25 hover:bg-rose-500/20 active:scale-[0.98]',
  }
  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  )
}
