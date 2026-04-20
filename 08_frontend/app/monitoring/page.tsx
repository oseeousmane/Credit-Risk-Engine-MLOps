"use client"

import * as React from "react"
import { useI18n } from "@/lib/i18n"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from "recharts"
import { Activity, ShieldAlert, Cpu, Database, AlertCircle, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock Data
const psiData = [
  { month: "Jan", psi: 0.05 },
  { month: "Feb", psi: 0.06 },
  { month: "Mar", psi: 0.08 },
  { month: "Apr", psi: 0.12 },
  { month: "May", psi: 0.15 },
  { month: "Jun", psi: 0.11 },
  { month: "Jul", psi: 0.09 },
  { month: "Aug", psi: 0.14 },
  { month: "Sep", psi: 0.22 }, // Drift breach
  { month: "Oct", psi: 0.04 }, // Recalibration
  { month: "Nov", psi: 0.05 },
  { month: "Dec", psi: 0.06 },
]

const logsData = [
  { time: "10:42:01", id: "REQ-992", status: "200 OK", latency: "124ms", pd: "4.2%" },
  { time: "10:41:55", id: "REQ-991", status: "200 OK", latency: "112ms", pd: "2.1%" },
  { time: "10:41:40", id: "REQ-990", status: "200 OK", latency: "135ms", pd: "18.5%" },
  { time: "10:40:12", id: "REQ-989", status: "500 ERR", latency: "850ms", pd: "N/A" },
  { time: "10:39:50", id: "REQ-988", status: "200 OK", latency: "98ms",  pd: "1.0%" },
]

export default function MonitoringPage() {
  const { t } = useI18n()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const isBreached = val >= 0.20;
      return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 rounded-lg shadow-xl">
          <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--text-primary)]">PSI: {val}</span>
            {isBreached && <span className="text-[10px] bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded font-bold">BREACH</span>}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 animate-fade-up pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{t("mlopsMonitoring")}</h1>
          <p className="text-[var(--text-muted)] mt-1">Real-time model performance, data drift detection, and inference logs.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-500">API ON</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        <div className="glass-panel p-5 flex items-center gap-4 group hover:border-[var(--border-active)] transition-colors">
          <div className="p-3 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Global PSI</div>
            <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">0.06 <span className="text-sm font-medium text-emerald-500 ml-1">Stable</span></div>
          </div>
        </div>

        <div className="glass-panel p-5 flex items-center gap-4 group hover:border-[var(--border-active)] transition-colors">
          <div className="p-3 bg-amber-500/10 rounded-xl group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Feature Drift</div>
            <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">2 <span className="text-sm font-medium text-amber-500 ml-1">Warnings</span></div>
          </div>
        </div>

        <div className="glass-panel p-5 flex items-center gap-4 group hover:border-[var(--border-active)] transition-colors">
          <div className="p-3 bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform">
            <Cpu className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Avg Latency</div>
            <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">118<span className="text-sm font-medium text-[var(--text-muted)] ml-1">ms</span></div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PSI Chart */}
        <div className="lg:col-span-2 glass-panel p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              Population Stability Index (PSI) over Time
            </h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
               <span className="flex items-center gap-1.5 text-rose-500"><div className="w-3 h-0.5 bg-rose-500"/> Threshold (0.20)</span>
               <span className="flex items-center gap-1.5 text-blue-500"><div className="w-2 h-2 rounded-full bg-blue-500"/> PSI</span>
            </div>
          </div>
          
          <div className="flex-1 min-h-[250px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={psiData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPsi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0.20} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5} />
                <Area type="monotone" dataKey="psi" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPsi)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20 flex gap-3 text-xs text-[var(--text-secondary)]">
            <AlertCircle className="w-4 h-4 text-blue-500 flex-none" />
            <p>PSI measures how much a population has shifted over time or between two different samples of a population in a single number. A value above 0.20 indicates significant population change requiring model retraining.</p>
          </div>
        </div>

        {/* Prediction Logs */}
        <div className="glass-panel w-full flex flex-col border-none overflow-hidden">
          <div className="p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/50">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              Live Inference Logs
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
             <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-elevated)]/30 text-[10px] uppercase text-[var(--text-muted)]">
                   <tr>
                      <th className="px-4 py-2 font-medium">Time</th>
                      <th className="px-4 py-2 font-medium">Req ID</th>
                      <th className="px-4 py-2 font-medium">Status / Score</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)] font-mono">
                   {logsData.map((log, i) => (
                      <tr key={i} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                         <td className="px-4 py-3">{log.time}</td>
                         <td className="px-4 py-3 text-[var(--text-primary)] flex items-center gap-1 group cursor-pointer">{log.id} <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></td>
                         <td className="px-4 py-3">
                            <div className="flex items-center justify-between">
                               <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                  log.status.includes("200") ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                               )}>{log.status}</span>
                               <span>{log.pd}</span>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
          <div className="p-3 text-center border-t border-[var(--border-subtle)]">
             <button className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-wider">View All Logs</button>
          </div>
        </div>

      </div>

    </div>
  )
}
