"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import { useI18n } from "@/lib/i18n"
import { 
  LayoutDashboard, 
  UserSquare2, 
  PieChart, 
  Activity,
  Sun, 
  Moon,
  Languages
} from "lucide-react"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { lang, setLang, t } = useI18n()

  const navItems = [
    { name: t("dashboard"), href: "/", icon: LayoutDashboard },
    { name: t("scoring"), href: "/scoring", icon: UserSquare2 },
    { name: t("portfolio"), href: "/portfolio", icon: PieChart },
    { name: t("monitoring"), href: "/monitoring", icon: Activity },
  ]

  return (
    <div className="w-full h-full bg-[var(--bg-card)] border-r border-[var(--border-subtle)] flex flex-col z-50 glass-panel border-none rounded-none">
      
      {/* Brand */}
      <div className="h-[65px] flex items-center px-6 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg">
            <div className="w-3 h-3 bg-white rounded-full opacity-90 shadow-inner" />
          </div>
          <span className="font-bold tracking-tight text-[var(--text-primary)] text-lg">Risk Engine</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                isActive 
                  ? "bg-blue-500/10 text-[var(--text-primary)] font-semibold shadow-inner" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              )}
              <Icon className={cn(
                "w-5 h-5 transition-transform duration-300 group-hover:scale-110", 
                isActive ? "text-blue-500 drop-shadow-md" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
              )} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer Controls */}
      <div className="p-4 border-t border-[var(--border-subtle)] space-y-4 bg-gradient-to-t from-[var(--bg-secondary)] to-transparent">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{t("settings")}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg border border-[var(--border-subtle)] transition-colors text-xs font-medium shadow-sm"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
            {t("theme")}
          </button>
          
          <button 
            onClick={() => setLang(lang === "en" ? "fr" : "en")}
            className="flex-none px-3 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg border border-[var(--border-subtle)] transition-colors text-xs font-medium shadow-sm flex items-center justify-center gap-1.5"
          >
            <Languages className="w-4 h-4 text-emerald-500" />
            <span className="uppercase">{lang}</span>
          </button>
        </div>

        <div className="flex items-center gap-3 px-3 py-2 mt-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--border-subtle)] shadow-sm backdrop-blur-md">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-inner">
            AR
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{t("admin")}</span>
            <span className="text-[11px] text-[var(--text-muted)] tracking-wide">Risk Manager</span>
          </div>
        </div>
      </div>
    </div>
  )
}
