"use client"

import * as React from "react"
import { Play, RotateCcw, AlertTriangle, Fingerprint, BrainCircuit } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts"
import { useI18n } from "@/lib/i18n"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// Fake SHAP simulation based on features
const generateShap = (data: any, t: any) => {
  return [
    { feature: "EXT_SOURCE_2", value: data.EXT_SOURCE_2 > 0.5 ? -0.15 : 0.20, name: "External Source 2" },
    { feature: "DTI_RATIO", value: data.AMT_ANNUITY / data.AMT_INCOME_TOTAL > 0.3 ? 0.25 : -0.10, name: t("loanAmount") + " Ratio" },
    { feature: "DAYS_BIRTH", value: data.DAYS_BIRTH > -10000 ? 0.08 : -0.05, name: t("age") },
    { feature: "NAME_CONTRACT_TYPE", value: data.NAME_CONTRACT_TYPE === "Cash loans" ? 0.02 : -0.02, name: "Contract Type" },
    { feature: "DAYS_EMPLOYED", value: data.DAYS_EMPLOYED < -2000 ? -0.12 : 0.15, name: t("employmentStatus") },
  ].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
}

export default function ScoringPage() {
  const { t } = useI18n()
  const [isExpertMode, setIsExpertMode] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [result, setResult] = React.useState<any>(null)
  const [error, setError] = React.useState<string | null>(null)
  
  const [formData, setFormData] = React.useState({
    SK_ID_CURR: 100002,
    NAME_CONTRACT_TYPE: "Cash loans",
    CODE_GENDER: "M",
    FLAG_OWN_CAR: "N",
    FLAG_OWN_REALTY: "Y",
    CNT_CHILDREN: 0,
    AMT_INCOME_TOTAL: 250000,
    AMT_CREDIT: 400000,
    AMT_ANNUITY: 25000,
    DAYS_BIRTH: -9461,
    DAYS_EMPLOYED: -637,
    EXT_SOURCE_2: 0.26,
    EXT_SOURCE_3: 0.13
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: isNaN(Number(value)) || value === "" || name.includes("NAME") || name.includes("CODE") || name.includes("FLAG") ? value : Number(value) }))
  }

  const handleScore = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      await new Promise(r => setTimeout(r, 1200)) // Fake latency
      
      const dti = formData.AMT_ANNUITY / formData.AMT_INCOME_TOTAL
      const pd = Math.min(Math.max((dti * 0.4) + (formData.EXT_SOURCE_2 > 0.5 ? -0.05 : 0.08) + 0.02, 0.01), 0.99)
      
      const responseData = {
        probability: pd,
        expectedLoss: pd * formData.AMT_CREDIT * 0.45, // EL = PD * EAD * LGD (assumed 45%)
        decision: pd > 0.12 ? "reject" : pd > 0.08 ? "review" : "accept",
        stage: pd > 0.12 ? "stage2" : "stage1",
        features_used: 15
      }

      setResult({
        ...responseData,
        shap: generateShap(formData, t)
      })

    } catch (err: any) {
      setError(err.message || "Network Error.")
    } finally {
      setIsLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPositive = data.value > 0;
      return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 rounded-lg shadow-xl">
          <p className="text-sm font-bold text-[var(--text-primary)] mb-1">
            {isExpertMode ? data.feature : data.name}
          </p>
          <p className={cn("text-xs font-semibold", isPositive ? "text-emerald-500" : "text-rose-500")}>
            {isPositive ? t("lowersRisk") : t("increasesRisk")} : {Math.abs(data.value * 100).toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-up pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{t("scoring")}</h1>
          <p className="text-[var(--text-muted)] mt-1">Individual credit applicant evaluation.</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm">
            <span className={cn("text-xs font-semibold tracking-wide uppercase transition-colors", !isExpertMode ? "text-blue-500" : "text-[var(--text-muted)]")}>{t("simpleMode")}</span>
            <div 
              className={cn("w-10 h-5 rounded-full relative transition-colors duration-300", isExpertMode ? "bg-purple-500" : "bg-blue-500")}
              onClick={() => setIsExpertMode(!isExpertMode)}
            >
              <div className={cn("w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all shadow-md", isExpertMode ? "left-5" : "left-1")} />
            </div>
            <span className={cn("text-xs font-semibold tracking-wide uppercase transition-colors", isExpertMode ? "text-purple-500" : "text-[var(--text-muted)]")}>{t("expertMode")}</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel : Inputs */}
        <div className="lg:col-span-4 glass-panel flex flex-col h-full border-none">
          <div className="p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/50 rounded-t-xl">
            <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <UserSquare2Icon className="w-5 h-5 text-blue-500" />
              Applicant Data
            </h3>
          </div>
          <div className="p-6 space-y-5 flex-1">
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t("income")} (€)
              </label>
              <Input name="AMT_INCOME_TOTAL" type="number" className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] focus-visible:ring-blue-500" value={formData.AMT_INCOME_TOTAL} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t("loanAmount")} (€)
              </label>
              <Input name="AMT_CREDIT" type="number" className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] focus-visible:ring-blue-500" value={formData.AMT_CREDIT} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Annual Annuity (€)
              </label>
              <Input name="AMT_ANNUITY" type="number" className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] focus-visible:ring-blue-500" value={formData.AMT_ANNUITY} onChange={handleChange} />
            </div>

            {!isExpertMode && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  External Score (/10)
                </label>
                <Input name="EXT_SOURCE_2" type="number" step="0.1" className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] focus-visible:ring-blue-500" value={formData.EXT_SOURCE_2 * 10} onChange={(e) => setFormData(p => ({...p, EXT_SOURCE_2: Number(e.target.value)/10}))} />
              </div>
            )}

            {isExpertMode && (
              <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/20 space-y-4 shadow-inner mt-6">
                <h4 className="text-xs font-bold text-purple-400 flex items-center gap-2"><Fingerprint className="w-4 h-4"/> Raw DB Feeds</h4>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-[var(--text-muted)] uppercase">EXT_SOURCE_2 [0-1]</label>
                  <Input name="EXT_SOURCE_2" type="number" step="0.01" className="font-mono text-xs bg-[var(--bg-card)] border-[var(--border-subtle)] focus-visible:ring-purple-500" value={formData.EXT_SOURCE_2} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-[var(--text-muted)] uppercase">DAYS_BIRTH (int)</label>
                  <Input name="DAYS_BIRTH" type="number" className="font-mono text-xs bg-[var(--bg-card)] border-[var(--border-subtle)] focus-visible:ring-purple-500" value={formData.DAYS_BIRTH} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-[var(--text-muted)] uppercase">DAYS_EMPLOYED (int)</label>
                  <Input name="DAYS_EMPLOYED" type="number" className="font-mono text-xs bg-[var(--bg-card)] border-[var(--border-subtle)] focus-visible:ring-purple-500" value={formData.DAYS_EMPLOYED} onChange={handleChange} />
                </div>
              </div>
            )}

          </div>
          <div className="p-5 bg-[var(--bg-card)]/50 border-t border-[var(--border-subtle)] rounded-b-xl flex gap-3">
            <Button 
               onClick={handleScore} 
               className="flex-1 font-bold shadow-lg bg-blue-600 hover:bg-blue-700 text-white transition-all" 
               disabled={isLoading}
            >
              {isLoading ? <span className="animate-pulse flex items-center"><BrainCircuit className="animate-spin w-4 h-4 mr-2"/> Processing...</span> :  <span className="flex items-center gap-2"><Play className="w-4 h-4 fill-current"/> Interpret Score</span>}
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.location.reload()} className="border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)]"><RotateCcw className="w-4 h-4 text-[var(--text-primary)]" /></Button>
          </div>
        </div>

        {/* Right Panel : Output */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main Decision Matrix */}
          <div className="glass-panel p-8 border-none min-h-[200px] flex items-center justify-center">
              {!result && !isLoading && !error && (
                <div className="flex flex-col items-center justify-center py-8 text-center text-[var(--text-muted)]">
                  <BrainCircuit className="w-16 h-16 mb-4 opacity-20 text-blue-500" />
                  <p className="font-medium text-[var(--text-primary)]">Ready for Evaluation</p>
                  <p className="text-xs mt-2 max-w-sm">Input the applicant's metrics and click Interpret Score to run the model inference.</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 flex items-start gap-3 w-full">
                  <AlertTriangle className="w-5 h-5 flex-none mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Inference Error</h4>
                    <p className="text-xs mt-1">{error}</p>
                  </div>
                </div>
              )}

              {result && (
                <div className="flex flex-col md:flex-row items-center gap-10 w-full animate-fade-up">
                  {/* Circular Indicator */}
                  <div className="relative w-48 h-48 flex-none rounded-full flex items-center justify-center bg-[var(--bg-card)] shadow-inner"
                       style={{ border: `4px solid ${result.decision === "reject" ? '#f43f5e' : result.decision === "review" ? '#f59e0b' : '#10b981'}` }}>
                    <div className="text-center">
                      <span className="block text-5xl font-black text-[var(--text-primary)]">{(result.probability * 100).toFixed(1)}<span className="text-xl text-[var(--text-muted)]">%</span></span>
                      <span className="text-xs font-bold tracking-wider text-[var(--text-muted)] uppercase mt-2 block">PD Score</span>
                    </div>
                  </div>

                  {/* Badges & Metrics */}
                  <div className="flex-1 space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{t("result")}</h4>
                      <h3 className="text-3xl font-black flex items-center gap-3">
                        {result.decision === "accept" && <span className="text-emerald-500 bg-emerald-500/10 px-4 py-1.5 rounded-lg">{t("accept")}</span>}
                        {result.decision === "review" && <span className="text-amber-500 bg-amber-500/10 px-4 py-1.5 rounded-lg">{t("review")}</span>}
                        {result.decision === "reject" && <span className="text-rose-500 bg-rose-500/10 px-4 py-1.5 rounded-lg">{t("reject")}</span>}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
                          <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">{t("expectedLoss")}</div>
                          <div className="text-lg font-bold text-rose-500 mt-1">€{result.expectedLoss.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                       </div>
                       <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
                          <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">{t("ifrs9Stage")}</div>
                          <div className="text-lg font-bold text-[var(--text-primary)] mt-1">{t(result.stage)}</div>
                       </div>
                    </div>
                  </div>
                </div>
              )}
          </div>

          {/* XAI SHAP Explanation */}
          {result && (
            <div className="glass-panel flex-1 flex flex-col animate-fade-up border-none" style={{ animationDelay: '0.1s'}}>
              <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/50 rounded-t-xl">
                <h3 className="text-base font-bold flex items-center gap-3 text-[var(--text-primary)]">
                  <BrainCircuit className="w-5 h-5 text-purple-500" />
                  {t("shapExplanation")}
                </h3>
              </div>
              <div className="p-6 flex-1 min-h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.shap} layout="vertical" margin={{ top: 0, right: 30, left: isExpertMode ? 50 : 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                      <XAxis type="number" stroke="var(--text-muted)" fontSize={11} domain={['-dataMax - 0.05', 'dataMax + 0.05']} tickFormatter={(v) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2))}/>
                      <YAxis dataKey={isExpertMode ? "feature" : "name"} type="category" stroke="var(--text-primary)" fontSize={11} tickLine={false} axisLine={false} width={100} />
                      <Tooltip cursor={{fill: 'var(--bg-elevated)', opacity: 0.4}} content={<CustomTooltip />} />
                      <ReferenceLine x={0} stroke="var(--text-secondary)" strokeWidth={2} />
                      <Bar dataKey="value" radius={4} barSize={24}>
                        {result.shap.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#10b981' : '#f43f5e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function UserSquare2Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 21v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
