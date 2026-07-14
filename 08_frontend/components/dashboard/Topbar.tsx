import React from 'react'
import { Search, Bell, ShieldCheck, ChevronDown } from 'lucide-react'

export default function Topbar() {
  return (
    <header className="h-[72px] bg-white border-b border-corp-border flex items-center justify-between px-6 flex-shrink-0 z-10 relative">
      {/* Left side text */}
      <div className="flex flex-col">
        <h1 className="text-[14px] font-bold text-corp-textPrimary tracking-tight">
          RISK INTELLIGENCE PLATFORM
        </h1>
        <div className="text-[12px] text-corp-textSecondary font-medium flex items-center gap-1.5 mt-0.5">
          <span>Credit Risk</span>
          <span className="text-gray-300">•</span>
          <span>IFRS 9</span>
          <span className="text-gray-300">•</span>
          <span>Regulatory Compliance</span>
        </div>
      </div>

      {/* Center Search */}
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative group">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-corp-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search exposures, entities, reports..."
            className="w-full bg-corp-bg border border-corp-border rounded-lg pl-10 pr-12 py-2 text-sm text-corp-textPrimary focus:outline-none focus:ring-2 focus:ring-corp-primary/20 focus:border-corp-primary transition-all placeholder-gray-400"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 font-mono text-[10px] font-medium text-gray-500 bg-white border border-gray-200 rounded">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-5">
        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-corp-textPrimary transition-colors rounded-full hover:bg-gray-100">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-corp-primary rounded-full ring-2 ring-white flex items-center justify-center text-[9px] font-bold text-white">3</span>
          <span className="sr-only">Notifications</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-corp-border" />

        {/* COBAC Badge */}
        <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#DCFCE7] px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4 text-corp-success" />
          <span className="text-[11px] font-bold text-corp-textPrimary uppercase tracking-wide">
            COBAC Certified
          </span>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-2 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-corp-sidebar flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
            {/* Realistically would be an image, using initials fallback */}
            <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-corp-textPrimary leading-none">A. Kouassi</span>
            <span className="text-[11px] font-medium text-corp-textSecondary mt-1 leading-none">CRO</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-corp-textPrimary transition-colors" />
        </div>
      </div>
    </header>
  )
}
