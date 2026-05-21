'use client'

import * as React from 'react'
import { SectionHeader, StatusBadge } from '@/components/ui'
import { Cpu, Server, Activity } from 'lucide-react'

export default function ModelRegistryPage() {
  return (
    <div className="p-6 space-y-6 page-enter pb-10">
      <SectionHeader title="Model Registry" subtitle="MLOps endpoints, version control, and production inference mapping." />
      
      <div className="grid grid-cols-2 gap-6 mt-8">
         <div className="bg-[#0d0d0d] p-6 rounded-xl border border-white/[0.08]">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                   <Cpu className="w-5 h-5 text-blue-400" />
                 </div>
                 <div>
                   <h3 className="text-sm font-bold text-white">XGBoost Corporate PD</h3>
                   <p className="text-xs text-zinc-500">v4.2.1-prod</p>
                 </div>
               </div>
               <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">ONLINE</span>
            </div>
            <div className="space-y-3">
               <div className="flex justify-between text-xs pb-3 border-b border-white/[0.04]">
                 <span className="text-zinc-500">Inference Endpoint</span>
                 <span className="text-zinc-300 font-mono">/mlops/predict/xgb-corp</span>
               </div>
               <div className="flex justify-between text-xs pb-3 border-b border-white/[0.04]">
                 <span className="text-zinc-500">Latency (p99)</span>
                 <span className="text-amber-400">142ms</span>
               </div>
               <div className="flex justify-between text-xs">
                 <span className="text-zinc-500">Traffic Allocation</span>
                 <span className="text-blue-400 font-bold">100%</span>
               </div>
            </div>
            <div className="mt-6 flex gap-3">
               <button className="flex-1 bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold py-2 rounded-lg transition-colors border border-white/[0.1]">View Metrics</button>
               <button className="flex-1 bg-[#141414] text-xs font-semibold py-2 rounded-lg text-zinc-500 cursor-not-allowed">Rollback</button>
            </div>
         </div>

         <div className="bg-[#0d0d0d] p-6 rounded-xl border border-white/[0.08] opacity-60">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                   <Server className="w-5 h-5 text-purple-400" />
                 </div>
                 <div>
                   <h3 className="text-sm font-bold text-white">LLM unstructured Evaluator</h3>
                   <p className="text-xs text-zinc-500">v1.0.0-beta</p>
                 </div>
               </div>
               <span className="text-[10px] font-bold text-zinc-500 bg-white/[0.05] px-2 py-1 rounded border border-white/[0.1]">SHADOW</span>
            </div>
            <div className="space-y-3">
               <div className="flex justify-between text-xs pb-3 border-b border-white/[0.04]">
                 <span className="text-zinc-500">Inference Endpoint</span>
                 <span className="text-zinc-300 font-mono">/mlops/predict/llm-eval</span>
               </div>
               <div className="flex justify-between text-xs pb-3 border-b border-white/[0.04]">
                 <span className="text-zinc-500">Latency (p99)</span>
                 <span className="text-rose-400">2400ms</span>
               </div>
               <div className="flex justify-between text-xs">
                 <span className="text-zinc-500">Traffic Allocation</span>
                 <span className="text-purple-400 font-bold">10% (Shadow)</span>
               </div>
            </div>
             <div className="mt-6 flex gap-3">
               <button className="flex-1 bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold py-2 rounded-lg transition-colors border border-white/[0.1]">Promote to A/B</button>
            </div>
         </div>
      </div>
    </div>
  )
}
