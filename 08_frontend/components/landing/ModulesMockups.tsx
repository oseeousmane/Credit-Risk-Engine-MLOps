'use client'
import { useState, useEffect } from 'react'
import { Activity, Shield, FileText, Building2, AlertTriangle, BarChart3, GitMerge } from 'lucide-react'

// ─── Shared Shell ─────────────────────────────────────────────────────────────
function MockupShell({ title, label, module: mod, children }: {
  title: string; label: string; module: string; children: React.ReactNode
}) {
  return (
    <div className="relative">
      <div className="absolute -inset-2 bg-[#3ECF8E]/5 blur-2xl rounded-3xl" />
      <div className="relative bg-[#0a0a0a] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
        {/* Window bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.05] bg-[#0c0c0c]">
          <div className="flex gap-1.5">
            {[0,1,2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-zinc-700" />)}
          </div>
          <div className="flex items-center gap-2 mx-auto">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.03] rounded-md border border-white/[0.04]">
              <Shield className="w-3 h-3 text-zinc-500" />
              <span className="text-[11px] text-zinc-400 font-mono">{title} · {label}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
            <span className="text-[10px] text-[#3ECF8E] font-medium uppercase tracking-wider">{mod}</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white/[0.025] border border-white/[0.05] rounded-lg p-3">
      <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">{label}</div>
      <div className={`text-[14px] font-bold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[9px] text-zinc-700 mt-0.5">{sub}</div>}
    </div>
  )
}

// ─── Risk Intelligence Mockup ─────────────────────────────────────────────────
export function RiskMockup() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setActive(a => (a + 1) % 3), 2500)
    return () => clearInterval(id)
  }, [])
  const entities = [
    { name: 'Acme Heavy Industries',     rating: 'BBB', pd: '1.2%', stage: 'S1', exp: '$12.0M', green: false },
    { name: 'Global Logistics Partners', rating: 'BB+', pd: '3.8%', stage: 'S2', exp: '$8.5M',  green: false },
    { name: 'Meridian Capital Group',    rating: 'A−',  pd: '0.7%', stage: 'S1', exp: '$24.0M', green: true  },
  ]
  return (
    <MockupShell title="riskengine.bank" label="Portfolio Intelligence" module="CRO View">
      <div className="px-4 pt-4 pb-2 grid grid-cols-4 gap-2">
        <KpiCard label="Total Exposure" value="$2.4B"  sub="+3.2% vs prev. quarter" />
        <KpiCard label="ECL Stage 2"    value="$18.7M" sub="+1.1% Expected Credit Loss" />
        <KpiCard label="Avg. PD"        value="1.82%"  sub="−0.14pp portfolio-wide" color="text-[#3ECF8E]" />
        <KpiCard label="Stage 3"        value="3"      sub="entities" />
      </div>
      <div className="px-4 pb-4">
        <div className="bg-white/[0.015] border border-white/[0.04] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
            <div className="flex items-center gap-2"><GitMerge className="w-3 h-3 text-zinc-500" /><span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Active Portfolio</span></div>
            <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" /><span className="text-[10px] text-[#3ECF8E] font-medium">Live</span></div>
          </div>
          {entities.map((e, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] last:border-0 transition-colors duration-500 ${active === i ? 'bg-white/[0.03]' : ''}`}>
              <span className="text-[12px] text-zinc-200 font-medium flex-1 truncate">{e.name}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${e.green ? 'text-[#3ECF8E] border-[#3ECF8E]/30 bg-[#3ECF8E]/10' : 'text-amber-400 border-amber-400/30 bg-amber-400/10'}`}>{e.rating}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${e.stage === 'S2' ? 'text-amber-400 bg-amber-400/10' : 'text-zinc-400 bg-white/[0.04]'}`}>{e.stage}</span>
              <span className="text-[10px] text-zinc-500 font-mono">PD {e.pd}</span>
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  )
}

// ─── Decisioning Mockup ───────────────────────────────────────────────────────
export function DecisioningMockup() {
  const [score, setScore] = useState(724)
  const [lit, setLit] = useState(-1)
  useEffect(() => {
    const id = setInterval(() => {
      setScore(s => Math.max(600, Math.min(999, s + Math.floor(Math.random() * 6 - 2))))
      setLit(Math.floor(Math.random() * 4))
      setTimeout(() => setLit(-1), 700)
    }, 2800)
    return () => clearInterval(id)
  }, [])
  const drivers = [
    { label: 'Debt-to-Income Ratio',   impact: 'Negative', bar: 72 },
    { label: 'Payment History (24m)',  impact: 'Positive',  bar: 88 },
    { label: 'Collateral Coverage',    impact: 'Positive',  bar: 64 },
    { label: 'Sector Concentration',   impact: 'Neutral',   bar: 35 },
  ]
  return (
    <MockupShell title="riskengine.bank" label="Decision Workspace" module="Analyst / Manager">
      <div className="px-4 pt-4 pb-2 grid grid-cols-3 gap-2">
        <KpiCard label="Application" value="DC-4821" />
        <KpiCard label="ML Score" value={`${score} / 1000`} color="text-[#3ECF8E]" />
        <KpiCard label="Model PD" value="1.24%" />
      </div>
      <div className="px-4 pb-2">
        <div className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Risk Drivers (SHAP)</span>
          </div>
          <div className="space-y-2.5">
            {drivers.map((d, i) => (
              <div key={i} className={`transition-opacity duration-300 ${lit === i ? 'opacity-100' : 'opacity-60'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-zinc-300 font-medium">{d.label}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${d.impact === 'Positive' ? 'text-[#3ECF8E] bg-[#3ECF8E]/10' : d.impact === 'Negative' ? 'text-rose-400 bg-rose-400/10' : 'text-zinc-400 bg-white/[0.04]'}`}>{d.impact}</span>
                </div>
                <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${d.impact === 'Positive' ? 'bg-[#3ECF8E]/60' : d.impact === 'Negative' ? 'bg-rose-400/60' : 'bg-zinc-500/60'}`} style={{ width: `${d.bar}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 pb-4 flex gap-2">
        <div className="flex-1 flex items-center justify-center py-2 bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 rounded-lg"><span className="text-[11px] font-bold text-[#3ECF8E] uppercase tracking-widest">Approve</span></div>
        <div className="flex-1 flex items-center justify-center py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg"><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Escalate</span></div>
      </div>
    </MockupShell>
  )
}

// ─── Monitoring Mockup ────────────────────────────────────────────────────────
export function MonitoringMockup() {
  const [bars, setBars] = useState([82,84,85,83,86,84,87,85,86,84,85,83,82,84,85,83,82,80,79,78])
  const [auc, setAuc] = useState(847)
  useEffect(() => {
    const id = setInterval(() => {
      setBars(prev => { const s = prev.slice(1); const n = Math.max(70, Math.min(95, s[s.length-1] + Math.random()*4-2)); return [...s, Math.round(n)] })
      setAuc(a => Math.max(820, Math.min(875, a + Math.floor(Math.random()*6-3))))
    }, 1400)
    return () => clearInterval(id)
  }, [])
  return (
    <MockupShell title="riskengine.bank" label="Model Operations" module="MLOps View">
      <div className="px-4 pt-4 pb-2 grid grid-cols-4 gap-2">
        <KpiCard label="Model AUC"   value={`0.${auc}`} color="text-[#3ECF8E]" />
        <KpiCard label="PSI Score"   value="0.12" />
        <KpiCard label="Latency p95" value="42ms" />
        <KpiCard label="Drift Alert" value="Moderate" color="text-amber-400" />
      </div>
      <div className="px-4 pb-3">
        <div className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Activity className="w-3 h-3 text-zinc-500" /><span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">AUC Trend — 20 inference cycles</span></div>
            <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" /><span className="text-[10px] text-[#3ECF8E] font-medium">Live</span></div>
          </div>
          <div className="flex items-end gap-0.5 h-20">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end">
                <div className={`rounded-t-sm transition-all duration-1000 ${h < 80 ? 'bg-rose-400/50' : h < 84 ? 'bg-amber-400/40' : 'bg-[#3ECF8E]/40'}`} style={{ height: `${(h-60)*3}%`, opacity: 0.4+(i/bars.length)*0.6 }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] text-zinc-700">Cycle 1</span>
            <span className="text-[9px] text-zinc-700">Cycle 20</span>
          </div>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-400/[0.06] border border-amber-400/20 rounded-lg">
          <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
          <span className="text-[11px] text-amber-300/80 font-medium">PSI drift detected on EXT_SOURCE_2 — review recommended</span>
        </div>
      </div>
    </MockupShell>
  )
}

// ─── Compliance Mockup ────────────────────────────────────────────────────────
export function ComplianceMockup() {
  const [tick, setTick] = useState(0)
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 2000); return () => clearInterval(id) }, [])
  const trails = [
    { action: 'DECISION_APPROVED',  actor: 'mgr.chen',       time: '14:32:01', type: 'approve' },
    { action: 'SCORING_EXECUTED',   actor: 'system',          time: '14:31:48', type: 'score'   },
    { action: 'DOCUMENT_VALIDATED', actor: 'ana.dupont',      time: '14:30:22', type: 'doc'     },
    { action: 'STAGE_MIGRATION',    actor: 'system (IFRS9)',  time: '14:29:55', type: 'ifrs'    },
  ]
  return (
    <MockupShell title="riskengine.bank" label="Compliance Console" module="Governance">
      <div className="px-4 pt-4 pb-2 grid grid-cols-3 gap-2">
        <KpiCard label="IFRS 9 Stage 1" value="187" sub="entities" color="text-[#3ECF8E]" />
        <KpiCard label="Stage 2" value="24" sub="entities" color="text-amber-400" />
        <KpiCard label="Audit Entries" value={tick % 2 === 0 ? '4,821' : '4,822'} sub="this quarter" />
      </div>
      <div className="px-4 pb-4">
        <div className="bg-white/[0.015] border border-white/[0.04] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
            <div className="flex items-center gap-2"><FileText className="w-3 h-3 text-zinc-500" /><span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Audit Trail</span></div>
            <span className="text-[10px] text-zinc-600">Immutable · Append-only</span>
          </div>
          {trails.map((t, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.03] last:border-0 transition-colors ${tick % 4 === i ? 'bg-white/[0.025]' : ''}`}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.type === 'approve' ? 'bg-[#3ECF8E]' : t.type === 'score' ? 'bg-blue-400' : t.type === 'ifrs' ? 'bg-amber-400' : 'bg-zinc-500'}`} />
              <span className="text-[10px] font-mono text-zinc-400 flex-1">{t.action}</span>
              <span className="text-[10px] text-zinc-600 font-mono">{t.actor}</span>
              <span className="text-[10px] text-zinc-700 font-mono">{t.time}</span>
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  )
}

// ─── Counterparty Mockup ──────────────────────────────────────────────────────
export function CounterpartyMockup() {
  return (
    <MockupShell title="riskengine.bank" label="Entity Intelligence" module="Counterparty 360">
      <div className="px-4 pt-4 pb-4">
        <div className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/[0.07] flex items-center justify-center"><Building2 className="w-4 h-4 text-zinc-400" /></div>
            <div><div className="text-[13px] font-semibold text-white">Acme Heavy Industries</div><div className="text-[10px] text-zinc-600">LEI: 549300EXAMPLE · Manufacturing</div></div>
            <span className="ml-auto text-[10px] font-bold px-2 py-1 rounded bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 text-[#3ECF8E]">BBB</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[['Revenue','$340M'],['EBITDA','$48M'],['Leverage','3.2x'],['Total Debt','$154M'],['DPD 90d','0'],['Facilities','3 active']].map(([l,v],i) => (
              <div key={i} className="text-center bg-white/[0.02] rounded-lg p-2">
                <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">{l}</div>
                <div className="text-[12px] font-bold text-zinc-200">{v}</div>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2">Group Hierarchy</div>
            {[{name:'Acme Group Holding SA',lvl:0,type:'Parent'},{name:'Acme Heavy Industries',lvl:1,type:'Active'},{name:'Acme Logistics Ltd',lvl:1,type:'Subsidiary'}].map((e,i) => (
              <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${e.lvl*16}px` }}>
                {e.lvl > 0 && <div className="w-3 h-px bg-white/[0.08]" />}
                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border flex-1 ${e.type === 'Active' ? 'bg-[#3ECF8E]/[0.06] border-[#3ECF8E]/20' : 'bg-white/[0.02] border-white/[0.04]'}`}>
                  <span className="text-[11px] text-zinc-300 font-medium">{e.name}</span>
                  <span className={`ml-auto text-[9px] font-bold ${e.type === 'Active' ? 'text-[#3ECF8E]' : 'text-zinc-600'}`}>{e.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockupShell>
  )
}

// ─── Stress Testing Mockup ────────────────────────────────────────────────────
export function StressMockup() {
  const [s, setS] = useState(0)
  useEffect(() => { const id = setInterval(() => setS(x => (x+1)%3), 3000); return () => clearInterval(id) }, [])
  const scenarios = [
    { label: 'Baseline', pdUp: '+0%',   ecl: '$0',      rwa: '+0%',  mig: '0' },
    { label: 'Adverse',  pdUp: '+38%',  ecl: '+$12.4M', rwa: '+18%', mig: '14' },
    { label: 'Severe',   pdUp: '+85%',  ecl: '+$28.1M', rwa: '+41%', mig: '37' },
  ]
  const sc = scenarios[s]
  const shocks = [['GDP Growth','2.1%',s===1?'−0.8%':s===2?'−3.2%':'2.1%'],['Unemployment','5.2%',s===1?'8.4%':s===2?'12.1%':'5.2%'],['Credit Spread','120bps',s===1?'280bps':s===2?'480bps':'120bps']]
  return (
    <MockupShell title="riskengine.bank" label="Scenario Engine" module="Stress Testing">
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-1.5 mb-4">
          {scenarios.map((sc2,i) => (
            <button key={i} onClick={() => setS(i)} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${i===s ? i===0 ? 'bg-[#3ECF8E]/10 border-[#3ECF8E]/30 text-[#3ECF8E]' : i===1 ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' : 'bg-rose-400/10 border-rose-400/30 text-rose-400' : 'bg-white/[0.02] border-white/[0.04] text-zinc-600'}`}>{sc2.label}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[['PD Uplift',sc.pdUp],['ECL Delta',sc.ecl],['RWA Impact',sc.rwa],['Stage Migrations',`${sc.mig} entities`]].map(([l,v],i) => (
            <div key={i} className={`bg-white/[0.025] border rounded-lg p-3 transition-all duration-500 ${s>0 ? 'border-amber-400/20' : 'border-white/[0.05]'}`}>
              <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">{l}</div>
              <div className={`text-[15px] font-bold tabular-nums transition-all duration-500 ${s===2&&i>0?'text-rose-400':s===1&&i>0?'text-amber-400':'text-[#3ECF8E]'}`}>{v}</div>
            </div>
          ))}
        </div>
        <div className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-3.5">
          <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2.5">Macro Shock Inputs</div>
          <div className="space-y-2">
            {shocks.map(([label, base, stressed], i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-600 font-mono line-through">{base}</span>
                  <span className={`text-[11px] font-bold font-mono transition-all duration-500 ${s===0?'text-[#3ECF8E]':s===1?'text-amber-400':'text-rose-400'}`}>{stressed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 pb-4 mt-2" />
    </MockupShell>
  )
}
