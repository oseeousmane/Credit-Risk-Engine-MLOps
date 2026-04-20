"use client"

import * as React from "react"
import { useI18n } from "@/lib/i18n"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Search, Filter, Download, MoreHorizontal, CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock Data
const portfolioData = [
  { id: "CL-98234", income: "€85,000", riskLevel: "Low", pd: 1.2, stage: "Stage 1", decision: "accept" },
  { id: "CL-12044", income: "€42,000", riskLevel: "Medium", pd: 6.5, stage: "Stage 1", decision: "accept" },
  { id: "CL-55091", income: "€31,000", riskLevel: "High", pd: 14.8, stage: "Stage 2", decision: "review" },
  { id: "CL-77210", income: "€105,000", riskLevel: "Low", pd: 0.8, stage: "Stage 1", decision: "accept" },
  { id: "CL-33902", income: "€28,000", riskLevel: "Critical", pd: 24.5, stage: "Stage 3", decision: "reject" },
  { id: "CL-88123", income: "€54,000", riskLevel: "Medium", pd: 5.1, stage: "Stage 1", decision: "accept" },
  { id: "CL-44019", income: "€62,000", riskLevel: "Medium", pd: 7.2, stage: "Stage 1", decision: "review" },
]

const riskBarData = [
  { range: "0-2%", count: 450 },
  { range: "2-5%", count: 320 },
  { range: "5-10%", count: 180 },
  { range: "10-20%", count: 90 },
  { range: ">20%", count: 25 },
]

export default function PortfolioPage() {
  const { t } = useI18n()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 rounded-lg shadow-xl">
          <p className="text-xs text-[var(--text-muted)] mb-1">PD Range: {label}</p>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {payload[0].value} Clients
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 animate-fade-up pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{t("portfolioAnalysis")}</h1>
          <p className="text-[var(--text-muted)] mt-1">Deep dive into current portfolio metrics and individual client states.</p>
        </div>
        <div className="flex gap-3">
           <button className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg text-sm font-medium hover:bg-[var(--bg-elevated)] transition-colors shadow-sm">
              <Download className="w-4 h-4" /> Export CSV
           </button>
           <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
              <Filter className="w-4 h-4" /> Advanced Filters
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
         {/* Simple Chart */}
         <div className="lg:col-span-12 glass-panel p-6">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Risk Distribution Overview
            </h3>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={riskBarData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis dataKey="range" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'var(--bg-elevated)', opacity: 0.4}} content={<CustomTooltip/>} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                 </BarChart>
              </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Table Section */}
      <div className="glass-panel border-none overflow-hidden flex flex-col">
         {/* Filters Row */}
         <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/40 flex flex-wrap gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-sm">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
               <input 
                  type="text" 
                  placeholder="Search by Client ID..." 
                  className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
               />
            </div>
            <div className="flex items-center gap-3">
               <select className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option value="">{t("decision")} : All</option>
                  <option value="accept">{t("accept")}</option>
                  <option value="review">{t("review")}</option>
                  <option value="reject">{t("reject")}</option>
               </select>
               <select className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option value="">{t("ifrs9Stage")} : All</option>
                  <option value="stage1">{t("stage1")}</option>
                  <option value="stage2">{t("stage2")}</option>
                  <option value="stage3">{t("stage3")}</option>
               </select>
            </div>
         </div>

         {/* Data Table */}
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[var(--text-secondary)]">
               <thead className="bg-[var(--bg-elevated)]/50 text-xs uppercase text-[var(--text-muted)] font-semibold border-b border-[var(--border-subtle)]">
                  <tr>
                     <th className="px-6 py-4">Client ID</th>
                     <th className="px-6 py-4">{t("income")}</th>
                     <th className="px-6 py-4">Risk Level</th>
                     <th className="px-6 py-4">PD Score</th>
                     <th className="px-6 py-4">{t("ifrs9Stage")}</th>
                     <th className="px-6 py-4">{t("decision")}</th>
                     <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[var(--border-subtle)]">
                  {portfolioData.map((row) => (
                     <tr key={row.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-[var(--text-primary)]">{row.id}</td>
                        <td className="px-6 py-4">{row.income}</td>
                        <td className="px-6 py-4">
                           <span className={cn(
                              "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase",
                              row.riskLevel === "Low" ? "bg-emerald-500/10 text-emerald-500" :
                              row.riskLevel === "Medium" ? "bg-amber-500/10 text-amber-500" :
                              "bg-rose-500/10 text-rose-500"
                           )}>
                              {row.riskLevel}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                              <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1.5 max-w-[60px]">
                                 <div 
                                    className={cn("h-1.5 rounded-full", row.pd < 5 ? "bg-emerald-500" : row.pd < 15 ? "bg-amber-500" : "bg-rose-500")} 
                                    style={{ width: `${Math.min(row.pd * 4, 100)}%` }}
                                 />
                              </div>
                              <span className="font-medium text-[var(--text-primary)]">{row.pd}%</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold">{t(row.stage.toLowerCase().replace(" ", ""))}</td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-1.5">
                              {row.decision === "accept" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                              {row.decision === "review" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                              {row.decision === "reject" && <XCircle className="w-4 h-4 text-rose-500" />}
                              <span className={cn(
                                 "text-xs font-bold uppercase",
                                 row.decision === "accept" ? "text-emerald-500" :
                                 row.decision === "review" ? "text-amber-500" :
                                 "text-rose-500"
                              )}>
                                 {t(row.decision)}
                              </span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button className="p-1 hover:bg-[var(--bg-elevated)] rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                              <MoreHorizontal className="w-5 h-5" />
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         
         <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Showing 1 to 7 of 480 entries</span>
            <div className="flex items-center gap-2">
               <button className="px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50">Prev</button>
               <button className="px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded hover:bg-[var(--bg-elevated)] transition-colors">Next</button>
            </div>
         </div>
      </div>
    </div>
  )
}
