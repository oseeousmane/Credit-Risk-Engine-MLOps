'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, PieChart, Activity, TrendingUp,
  ShieldCheck, FileText, Database, Users, History,
  Settings, ChevronRight, Star, Hexagon, Gauge
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  {
    title: 'RISK ANALYTICS',
    items: [
      { name: 'Credit Scoring', href: '/credit-scoring', icon: Hexagon },
      { name: 'Portfolio Risk', href: '/portfolio-risk', icon: PieChart },
      { name: 'Stress Testing', href: '/stress-testing', icon: Activity },
      { name: 'Scenario Analysis', href: '#', icon: TrendingUp },
    ],
  },
  {
    title: 'MODEL RISK',
    items: [
      { name: 'Model Monitoring', href: '#', icon: Gauge },
      { name: 'Model Validation', href: '#', icon: ShieldCheck },
      { name: 'Model Governance', href: '#', icon: FileText },
    ],
  },
  {
    title: 'COMPLIANCE',
    items: [
      { name: 'IFRS 9', href: '#', icon: FileText },
      { name: 'Basel III', href: '#', icon: ShieldCheck },
      { name: 'COBAC', href: '#', icon: ShieldCheck },
      { name: 'Regulatory Center', href: '#', icon: FileText },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { name: 'Data Management', href: '#', icon: Database },
      { name: 'Users & Access', href: '#', icon: Users },
      { name: 'Audit Trail', href: '#', icon: History },
      { name: 'System Settings', href: '#', icon: Settings },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  
  const isOverview = pathname === '/overview'

  return (
    <aside className="w-[260px] flex-shrink-0 bg-[#070D1B] text-white flex flex-col h-full border-r border-white/[0.06]">
      {/* Logo Area */}
      <div className="h-[72px] px-6 flex items-center gap-3 border-b border-white/[0.06]">
        <div className="text-[28px] font-black tracking-tight">ORE</div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 mt-6 scrollbar-hide">
        {/* Overview Item */}
        <Link 
          href="/overview"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-[13px] mb-6 transition-colors",
            isOverview 
              ? "bg-corp-primary text-white shadow-[0_4px_12px_rgba(29,78,216,0.3)]" 
              : "text-white/70 hover:text-white hover:bg-white/5"
          )}
        >
          <LayoutDashboard className={cn("w-4 h-4", isOverview ? "text-white" : "text-white/50")} />
          Overview
        </Link>

        {navigation.map((group) => (
          <div key={group.title} className="mb-6">
            <h3 className="px-3 text-[10px] font-bold text-white/40 tracking-[0.1em] mb-2">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-corp-primary text-white shadow-[0_4px_12px_rgba(29,78,216,0.3)]"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-white/50")} />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Access Bottom Card */}
      <div className="p-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors flex flex-col gap-2 relative overflow-hidden">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-white" />
            <span className="text-sm font-semibold text-white">Quick Access</span>
          </div>
          <p className="text-xs text-white/60">
            Reports, exports and custom analytics
          </p>
          <ChevronRight className="w-4 h-4 text-white/60 absolute right-4 top-1/2 -translate-y-1/2" />
        </div>
      </div>
    </aside>
  )
}
