"use client"

import * as React from "react"
import { useI18n } from "@/lib/i18n"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell as PieCell
} from "recharts"
import { TrendingUp, TrendingDown, Activity, AlertOctagon, CheckCircle2, ShieldAlert } from "lucide-react"

// Mock Data
const expectedLossTrend = [
  { month: "Jan", value: 1.8 },
  { month: "Feb", value: 2.1 },
  { month: "Mar", value: 2.5 },
  { month: "Apr", value: 2.2 },
  { month: "May", value: 2.4 },
  { month: "Jun", value: 2.3 },
]

const pdDistribution = [
  { decile: "0-1%", value: 400 },
  { decile: "1-2%", value: 300 },
  { decile: "2-3%", value: 250 },
  { decile: "3-4%", value: 200 },
  { decile: "4-5%", value: 150 },
  { decile: "5-6%", value: 100 },
  { decile: "6-7%", value: 80 },
  { decile: "7-8%", value: 50 },
  { decile: "8-9%", value: 30 },
  { decile: "9-10%", value: 20 },
]

const ifrs9Stage = [
  { name: "Stage 1", value: 75, color: "#10b981" },
  { name: "Stage 2", value: 20, color: "#f59e0b" },
  { name: "Stage 3", value: 5, color: "#f43f5e" },
]

export default function DashboardPage() {
  const { t } = useI18n()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] p-3 rounded-xl shadow-[var(--shadow-intense)] backdrop-blur-xl">
          <p className="text-xs text-[var(--text-muted)] mb-1.5 uppercase font-semibold tracking-wider font-mono">{label}</p>
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {payload[0].value} {payload[0].name === "value" ? "Users" : "M €"}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-8 animate-fade-up pb-10">
      
      {/* ── HERO KPI ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Dominant KPI: Expected Loss (Span 2) */}
        <div className="lg:col-span-2 glass-panel p-8 relative overflow-hidden group flex flex-col justify-between border-transparent bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-secondary)] before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/10 before:to-transparent before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-500">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-blue-500/30 transition-colors duration-700" />
          
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
                <TrendingDown className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">{t("expectedLoss")}</div>
            </div>
          </div>
          
          <div className="relative z-10 flex items-end gap-5 mt-4">
            <div className="text-6xl font-black text-[var(--text-primary)] tracking-tighter drop-shadow-sm">
              €2.3<span className="text-4xl text-[var(--text-muted)]">M</span>
            </div>
            <div className="flex items-center text-sm font-bold text-emerald-500 mb-2 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 shadow-sm">
              <TrendingDown className="w-4 h-4 mr-1" /> -5% YoY
            </div>
          </div>
          
          <div className="relative z-10 flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] mt-6 pt-4 border-t border-[var(--border-subtle)]">
            <ShieldAlert className="w-4 h-4"/> Estimated capital depletion over 12m. (Basel III)
          </div>
        </div>

        {/* KPI: Avg PD (Span 1) */}
        <div className="glass-panel p-6 relative overflow-hidden group flex flex-col">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none" />
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">{t("avgPD")}</div>
          <div className="mt-auto flex items-end gap-3 pb-2 border-b border-[var(--border-subtle)]">
            <div className="text-4xl font-black text-[var(--text-primary)] tracking-tight">3.2<span className="text-2xl text-[var(--text-muted)]">%</span></div>
            <div className="text-xs font-semibold text-rose-500 mb-1">+0.4%</div>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-3">Portfolio average PD</div>
        </div>

        {/* KPI: Default Rate (Span 1) */}
        <div className="glass-panel p-6 relative overflow-hidden group flex flex-col">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-[40px] pointer-events-none" />
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">{t("defaultRate")}</div>
          <div className="mt-auto flex items-end gap-3 pb-2 border-b border-[var(--border-subtle)]">
            <div className="text-4xl font-black text-[var(--text-primary)] tracking-tight">4.1<span className="text-2xl text-[var(--text-muted)]">%</span></div>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-3">Observed defaults 90d</div>
        </div>

      </div>

      {/* ── CHARTS ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Expected Loss Trend */}
        <div className="glass-panel lg:col-span-8 p-7 flex flex-col group">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">{t("expectedLossTrend")}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">12 Months Projection based on Macro factors</p>
            </div>
            <div className="text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-elevated)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] shadow-sm">Projection</div>
          </div>
          <div className="flex-1 min-h-[300px] w-full relative z-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={expectedLossTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02}/>
                  </linearGradient>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                     <stop offset="0%" stopColor="#3b82f6" />
                     <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-subtle)" strokeOpacity={0.5} />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}M`} dx={-10} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-subtle)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="value" stroke="url(#lineGradient)" strokeWidth={4} fillOpacity={1} fill="url(#colorLoss)" activeDot={{ r: 6, strokeWidth: 2, fill: "var(--bg-card)", stroke: "#3b82f6" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: IFRS 9 Stage Pie */}
        <div className="glass-panel lg:col-span-4 p-7 flex flex-col group relative overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-emerald-500/20 transition-colors duration-700" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight mb-2 relative z-10">{t("ifrs9Stage")}</h3>
          <p className="text-xs text-[var(--text-muted)] mb-8 relative z-10">Portfolio Segmentation</p>
          
          <div className="h-[220px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                   <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                     <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.3" floodColor="#000" />
                   </filter>
                </defs>
                <Pie data={ifrs9Stage} innerRadius={70} outerRadius={95} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={6}>
                  {ifrs9Stage.map((entry, index) => (
                    <PieCell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0px 4px 10px ${entry.color}40)` }} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Improved Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-28 h-28 bg-[var(--bg-card)] rounded-full shadow-inner flex flex-col items-center justify-center border border-[var(--border-subtle)]">
                <span className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">1.2<span className="text-lg">K</span></span>
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Contracts</span>
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-4 pt-6 relative z-10">
            {ifrs9Stage.map((stage) => (
              <div key={stage.name} className="flex items-center justify-between group/row hover:bg-[var(--bg-elevated)] p-2 rounded-lg transition-colors -mx-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: stage.color, boxShadow: `0 0 10px ${stage.color}60` }} />
                  <span className="text-sm font-medium text-[var(--text-secondary)] group-hover/row:text-[var(--text-primary)] transition-colors">{t(stage.name.toLowerCase().replace(" ", ""))}</span>
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-card)] px-2 py-0.5 rounded shadow-sm border border-[var(--border-subtle)]">{stage.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── RISK DISTRIBUTION ── */}
      <div className="glass-panel p-7 group">
        <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight mb-2">{t("pdDistribution")}</h3>
        <p className="text-xs text-[var(--text-muted)] mb-8">Granular view of the portfolio risk deciles</p>
        
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pdDistribution} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-subtle)" strokeOpacity={0.5} />
              <XAxis dataKey="decile" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
              <Tooltip content={<CustomTooltip />} cursor={{fill: 'var(--bg-elevated)', opacity: 0.5}} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={36} className="transition-all duration-300 hover:brightness-125">
                {pdDistribution.map((entry, index) => (
                  <PieCell key={`cell-${index}`} fill={index > 6 ? "#f43f5e" : index > 3 ? "#f59e0b" : "#10b981"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
