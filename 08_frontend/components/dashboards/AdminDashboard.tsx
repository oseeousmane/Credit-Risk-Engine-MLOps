'use client'
import * as React from 'react'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Users, ShieldAlert, Cpu, Bell, Lock, Loader2, Save, Server, Activity, ArrowUpRight } from 'lucide-react'
import { SectionHeader, KPIBlock, Toggle } from '@/components/ui'
import { fetchApi } from '@/lib/api-client'
import { motion } from 'framer-motion'

const generateTelemetry = () => Array.from({ length: 40 }, () => Math.floor(Math.random() * 40) + 60)

export function AdminDashboard() {
  const queryClient = useQueryClient()
  
  const [xaiVisible, setXaiVisible] = useState(true)
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(true)
  const [alertThreshold, setAlertThreshold] = useState('HIGH')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  
  // Simulated high-frequency telemetry
  const [cpuTelemetry, setCpuTelemetry] = useState<number[]>(generateTelemetry())
  const [ramTelemetry, setRamTelemetry] = useState<number[]>(generateTelemetry())

  useEffect(() => {
    const interval = setInterval(() => {
      setCpuTelemetry(prev => [...prev.slice(1), Math.floor(Math.random() * 30) + 70])
      setRamTelemetry(prev => [...prev.slice(1), Math.floor(Math.random() * 20) + 60])
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => fetchApi('/admin/settings'),
  })

  useEffect(() => {
    if (settings) {
      setXaiVisible(settings.xaiVisibility === 'FULL')
      setAutoApproveEnabled(settings.autoApproveEnabled)
      setAlertThreshold(settings.alertThreshold)
      setMaintenanceMode(settings.maintenanceMode)
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: (newSettings: any) => 
      fetchApi('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(newSettings),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-settings'], data)
    }
  })

  const handleSave = () => {
    saveMutation.mutate({
      xaiVisibility: xaiVisible ? 'FULL' : 'HIDDEN',
      autoApproveEnabled,
      alertThreshold,
      maintenanceMode,
    })
  }

  const handleDiscard = () => {
    if (settings) {
      setXaiVisible(settings.xaiVisibility === 'FULL')
      setAutoApproveEnabled(settings.autoApproveEnabled)
      setAlertThreshold(settings.alertThreshold)
      setMaintenanceMode(settings.maintenanceMode)
    }
  }

  // Sparkline Component
  const TelemetrySparkline = ({ data, color }: { data: number[], color: string }) => {
    const max = 100
    const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d / max) * 100}`).join(' ')
    return (
      <svg className="w-full h-12 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke={color} strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        {/* Glow effect */}
        <polyline points={points} fill="none" stroke={color} strokeWidth="6" vectorEffect="non-scaling-stroke" opacity="0.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1200px] mx-auto p-6 space-y-6 pb-10"
    >
      <SectionHeader
        title="System Core"
        subtitle="INFRASTRUCTURE TOPOLOGY & GOVERNANCE"
        actions={
          <div className="flex gap-3">
            <button 
              onClick={handleDiscard}
              disabled={saveMutation.isPending || isLoading}
              className="px-5 py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] rounded-md text-[13px] font-medium tracking-tight text-white transition-colors disabled:opacity-50"
            >
              Discard Changes
            </button>
            <button 
              onClick={handleSave}
              disabled={saveMutation.isPending || isLoading}
              className="px-5 py-2 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-[#0a0a0a] rounded-md text-[13px] font-semibold transition-colors shadow-[0_0_24px_rgba(62,207,142,0.15)] flex items-center gap-2 disabled:opacity-50"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin text-[#0a0a0a]" /> : <Save className="w-4 h-4 text-[#0a0a0a]" />}
              Save Configuration
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPIBlock label="Cluster Uptime" value="99.98%" accent="emerald">
           <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> All systems nominal
           </div>
        </KPIBlock>
        <KPIBlock label="Query Throughput" value="1,240" accent="blue">
           <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
             <ArrowUpRight className="w-3 h-3 text-blue-400" /> +12% vs last hour
           </div>
        </KPIBlock>
        <KPIBlock label="Active Threats" value="0" accent="emerald">
           <div className="text-[11px] text-zinc-500 mt-1">WAF & DDoS mitigation active</div>
        </KPIBlock>
        <KPIBlock label="Inference Engine" value="Online" accent="emerald">
           <div className="text-[11px] text-zinc-500 mt-1 uppercase text-emerald-400 tracking-wider">FastAPI Proxy</div>
        </KPIBlock>
      </div>

      <div className="grid grid-cols-12 gap-6 mt-8">
        {/* Left Col: Telemetry */}
        <div className="col-span-4 flex flex-col gap-6">
          <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
            <h2 className="flex items-center justify-between text-[14px] font-medium tracking-tight text-white mb-6">
              <span className="flex items-center gap-2"><Cpu className="w-4 h-4 text-blue-400" /> CPU Telemetry</span>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{cpuTelemetry[cpuTelemetry.length-1]}%</span>
            </h2>
            <TelemetrySparkline data={cpuTelemetry} color="#60a5fa" />
          </div>

          <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
            <h2 className="flex items-center justify-between text-[14px] font-medium tracking-tight text-white mb-6">
              <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-purple-400" /> RAM Utilization</span>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">{ramTelemetry[ramTelemetry.length-1]}%</span>
            </h2>
            <TelemetrySparkline data={ramTelemetry} color="#c084fc" />
          </div>

          <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-6">
             <h2 className="flex items-center gap-2 text-[14px] font-medium tracking-tight text-white mb-6">
               <ShieldAlert className="w-4 h-4 text-rose-400" /> Security Audit Log
             </h2>
             <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[1px] before:bg-white/[0.08]">
               {[
                 { msg: 'New RBAC policy deployed by AR', time: '10s ago', type: 'info' },
                 { msg: 'Failed auth: supervisor@riskengine.com', time: '2m ago', type: 'alert' },
                 { msg: 'System backup completed (EU-West)', time: '1h ago', type: 'success' },
               ].map((log, i) => (
                 <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i} 
                    className="relative pl-8"
                  >
                   <div className={`absolute left-0 top-1.5 w-[23px] h-[23px] rounded-full flex items-center justify-center bg-[#0a0a0a] border border-white/[0.1] ${log.type === 'alert' ? 'shadow-[0_0_8px_rgba(244,63,94,0.5)] border-rose-500/50' : ''}`}>
                     <div className={`w-2 h-2 rounded-full ${log.type === 'alert' ? 'bg-rose-500' : log.type === 'success' ? 'bg-[#3ECF8E]' : 'bg-blue-400'}`} />
                   </div>
                   <div className="text-[12px] text-zinc-300 font-medium">{log.msg}</div>
                   <div className="text-[10px] text-zinc-500 mt-0.5">{log.time}</div>
                 </motion.div>
               ))}
             </div>
          </div>
        </div>

        {/* Right Col: Configs */}
        <div className="col-span-8 flex flex-col gap-6">
           <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-7">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-medium tracking-tight text-white mb-1">
                    <Server className="w-5 h-5 text-zinc-500" /> Model Governance
                  </h2>
                  <p className="text-xs text-zinc-500">Active inference engines and threshold rules.</p>
                </div>
                <div className="flex items-center gap-2 bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 rounded-full px-3 py-1 text-[11px] font-medium text-[#3ECF8E] shadow-[0_0_15px_rgba(62,207,142,0.1)]">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" /> V4.2 Online
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                 <div className="bg-white/[0.02] border border-white/[0.04] p-5 rounded-xl flex flex-col justify-center focus-within:border-white/[0.15] transition-colors">
                    <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-3 block">ACTIVE RISK MODEL</label>
                    <select className="bg-transparent text-[13px] font-medium tracking-tight text-white outline-none cursor-pointer">
                      <option className="bg-[#0d0d0d]">XGBoost Corporate PD v4.2</option>
                      <option className="bg-[#0d0d0d]">LGD Recovery Model v2.1</option>
                      <option className="bg-[#0d0d0d]">RandomForest Commercial v3.0</option>
                    </select>
                 </div>
                 <div className="bg-white/[0.02] border border-white/[0.04] p-5 rounded-xl flex flex-col justify-center focus-within:border-white/[0.15] transition-colors">
                    <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-3 block">IFRS 9 STAGING LOGIC</label>
                    <select className="bg-transparent text-[13px] font-medium tracking-tight text-white outline-none cursor-pointer">
                      <option className="bg-[#0d0d0d]">Strict (SICR &gt; 250bps)</option>
                      <option className="bg-[#0d0d0d]">Standard (SICR &gt; 300bps)</option>
                      <option className="bg-[#0d0d0d]">Lenient (Regulatory Override)</option>
                    </select>
                 </div>
              </div>

              <div className="space-y-3">
                 <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl text-[13px] font-medium tracking-tight text-zinc-300 hover:bg-white/[0.03] transition-colors">
                   <span>Enable Auto-Approval Flow (PD &lt; 0.5%)</span>
                   <Toggle checked={autoApproveEnabled} onChange={setAutoApproveEnabled} />
                 </div>
                 <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl text-[13px] font-medium tracking-tight text-zinc-300 hover:bg-white/[0.03] transition-colors">
                   <span>Require XAI Drivers for Overrides</span>
                   <Toggle checked={true} onChange={() => {}} />
                 </div>
                 <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl text-[13px] font-medium tracking-tight text-zinc-300 hover:bg-white/[0.03] transition-colors">
                   <span>XAI Component Visibility</span>
                   <Toggle checked={xaiVisible} onChange={setXaiVisible} />
                 </div>
                 <div className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl text-[13px] font-medium tracking-tight text-rose-300 hover:bg-rose-500/10 transition-colors">
                   <span>System Maintenance Mode</span>
                   <Toggle checked={maintenanceMode} onChange={setMaintenanceMode} />
                 </div>
              </div>
           </div>

           <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-7">
              <div className="flex items-center gap-2 mb-6">
                 <Bell className="w-5 h-5 text-zinc-500" />
                 <h2 className="text-lg font-medium tracking-tight text-white">Global Alert Threshold</h2>
              </div>

              <div className="flex gap-4">
                 {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((level) => (
                   <button 
                     key={level}
                     onClick={() => setAlertThreshold(level)}
                     className={`flex-1 py-3 text-[11px] font-bold tracking-widest rounded-xl border transition-all duration-300 ${
                       alertThreshold === level 
                         ? 'bg-[#3ECF8E]/10 text-[#3ECF8E] border-[#3ECF8E]/30 shadow-[0_0_20px_rgba(62,207,142,0.15)] scale-105' 
                         : 'bg-white/[0.02] text-zinc-500 border-white/[0.05] hover:bg-white/[0.06]'
                     }`}
                   >
                     {level}
                   </button>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  )
}
