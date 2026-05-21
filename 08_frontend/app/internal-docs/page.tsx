'use client'

import * as React from 'react'
import { BookOpen, Search, FileText, Code, ShieldCheck } from 'lucide-react'
import { SectionHeader } from '@/components/ui'

export default function DocsPage() {
  return (
    <div className="p-6 space-y-6 page-enter pb-10">
      <SectionHeader
        title="Knowledge Base"
        subtitle="Platform documentation, methodology, and API reference."
        actions={
           <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2">
            <Search className="w-3.5 h-3.5 text-zinc-600" />
            <input
              placeholder="Search docs..."
              className="bg-transparent text-[12px] text-zinc-400 placeholder-zinc-700 outline-none w-44"
            />
          </div>
        }
      />
      
      <div className="grid grid-cols-3 gap-6 mt-8">
         <div className="bg-[#0d0d0d] p-6 rounded-xl border border-white/[0.08] hover:border-white/[0.15] cursor-pointer transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
               <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">IFRS 9 Methodology</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">Detailed mathematical breakdown of PD, LGD, EAD components and stage migration logic.</p>
         </div>

         <div className="bg-[#0d0d0d] p-6 rounded-xl border border-white/[0.08] hover:border-white/[0.15] cursor-pointer transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
               <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">MRM Governance</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">COBAC / Basel validations and Model Risk Management approval procedures.</p>
         </div>

         <div className="bg-[#0d0d0d] p-6 rounded-xl border border-white/[0.08] hover:border-white/[0.15] cursor-pointer transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
               <Code className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Developer API</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">Integration points, DTO schemas, and webhooks documentation for the core engine.</p>
         </div>
      </div>
    </div>
  )
}
