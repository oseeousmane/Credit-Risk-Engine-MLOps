'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, DollarSign, Briefcase, FileText, FilePlus, Building2, Globe, Users, TrendingUp, Landmark, ShieldCheck, CheckCircle2, AlertCircle, FileUp, Info, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { fetchClient } from '@/lib/api-client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'

const STEPS = [
  { id: 1, title: 'Facility' },
  { id: 2, title: 'Business Info' },
  { id: 3, title: 'Financials' },
  { id: 4, title: 'Documents' },
  { id: 5, title: 'Review' },
]

const stepVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
  exit: { opacity: 0, y: -15, transition: { duration: 0.2 } }
}

export default function NewApplicationPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    // Step 1
    requestedAmount: '',
    currency: 'XAF',
    facilityType: 'Term Loan',
    tenureMonths: '12',
    repaymentStructure: 'Amortizing',
    purpose: '',
    
    // Step 2
    companyName: '',
    industry: 'Technology',
    country: 'United States',
    annualRevenue: '',
    ebitda: '',
    employees: '',
    yearsInBusiness: '',

    // Step 3
    existingDebt: '',
    leverage: '',
    mainBank: '',
    existingFacilities: 'None',
    collateral: '',
    financialPosition: '',
  })

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      return fetchClient('/client/applications', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-apps'] })
      router.push(`/client-portal/applications/${data.applicationId}`)
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to submit application')
    }
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const validateStep = () => {
    setError(null)
    if (currentStep === 1) {
      if (!formData.requestedAmount || isNaN(Number(formData.requestedAmount)) || Number(formData.requestedAmount) <= 0) {
        setError('Please enter a valid requested amount.')
        return false
      }
      if (!formData.purpose) {
        setError('Please describe the purpose of the facility.')
        return false
      }
    } else if (currentStep === 2) {
      if (!formData.companyName || !formData.annualRevenue) {
        setError('Please provide company name and annual revenue.')
        return false
      }
    } else if (currentStep === 3) {
      if (!formData.existingDebt || !formData.collateral) {
        setError('Please outline existing debt and available collateral.')
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 5))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    setError(null)
    setCurrentStep(prev => Math.max(prev - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep()) return
    
    // Core DTO Fields
    const amount = parseFloat(formData.requestedAmount) * 1_000_000 // Convert millions to raw
    
    const payload = {
      requestedAmount: amount,
      currency: formData.currency,
      facilityType: formData.facilityType,
      tenureMonths: formData.tenureMonths,
      purpose: formData.purpose,
      metadata: {
        companyName: formData.companyName,
        industry: formData.industry,
        country: formData.country,
        annualRevenue: formData.annualRevenue,
        ebitda: formData.ebitda,
        employees: formData.employees,
        yearsInBusiness: formData.yearsInBusiness,
        existingDebt: formData.existingDebt,
        leverage: formData.leverage,
        mainBank: formData.mainBank,
        existingFacilities: formData.existingFacilities,
        collateral: formData.collateral,
        financialPosition: formData.financialPosition,
        uploadedDocuments: uploadedDocs
      }
    }

    submitMutation.mutate(payload)
  }

  const handleMockUpload = (docName: string) => {
    if (!uploadedDocs.includes(docName)) {
      setUploadedDocs([...uploadedDocs, docName])
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-7 pb-12 relative min-h-screen">
      
      {/* ── Ambient Glows (Glassmorphism) ────────────────────────────────────── */}
      <div className="absolute top-[-50px] left-[-100px] w-[500px] h-[500px] bg-brand-400/[0.03] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-150px] w-[400px] h-[400px] bg-blue-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

      {/* ── Header & Stepper ──────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/client-portal/applications"
              className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05] transition-colors text-zinc-500 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <FilePlus className="w-3.5 h-3.5 text-brand-400" />
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">New Request</span>
            </div>
          </div>
          <h1 className="text-3xl font-medium text-white tracking-tight ml-10">Credit Application</h1>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 md:gap-3 bg-[#0a0a0a]/80 backdrop-blur-md border border-white/[0.06] p-2.5 rounded-2xl">
          {STEPS.map((step, idx) => {
            const isActive = step.id === currentStep
            const isPast = step.id < currentStep
            return (
              <React.Fragment key={step.id}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 ${
                  isActive ? 'bg-brand-400/15 border border-brand-400/30 shadow-[0_0_15px_rgba(59,123,255,0.15)]' : 
                  isPast ? 'bg-white/[0.03] border border-white/[0.05]' : 'opacity-40 border border-transparent'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                    isActive ? 'bg-brand-400 text-[#0a0a0a]' :
                    isPast ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {isPast ? <CheckCircle2 className="w-3 h-3 text-brand-400" /> : step.id}
                  </div>
                  <span className={`text-[12px] font-medium hidden sm:block transition-colors ${isActive ? 'text-brand-400' : isPast ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {step.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-4 h-px transition-colors ${isPast ? 'bg-zinc-600' : 'bg-white/[0.05]'}`} />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* ── Main Form Area ────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-[#0a0a0a]/90 backdrop-blur-md border border-white/[0.06] rounded-[24px] shadow-sm overflow-hidden relative">
          
          <div className="p-8 md:p-10 relative z-10">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-8 bg-red-500/10 text-red-400 p-4 rounded-xl text-[13px] font-medium border border-red-500/20 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {/* STEP 1: FACILITY */}
              {currentStep === 1 && (
                <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
                  <div>
                    <h2 className="text-xl font-medium text-white tracking-tight mb-1">Facility Details</h2>
                    <p className="text-[13px] text-zinc-500">Specify the structural parameters of your requested credit facility.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-2">Requested Amount (M)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                        <input type="number" step="0.1" name="requestedAmount" value={formData.requestedAmount} onChange={handleChange} placeholder="e.g. 15.5" className="w-full pl-10 pr-4 py-3 bg-[#0d0d0d] border border-white/[0.06] rounded-xl focus:ring-1 focus:ring-brand-400/30 focus:border-brand-400/30 text-white font-medium transition-all" />
                      </div>
                      <p className="text-[11px] text-zinc-600 mt-2">Enter amount in millions.</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-2">Currency</label>
                      <select name="currency" value={formData.currency} onChange={handleChange} className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/[0.06] rounded-xl focus:ring-1 focus:ring-brand-400/30 focus:border-brand-400/30 text-white font-medium appearance-none transition-all">
                        <option>XAF</option><option>EUR</option><option>USD</option><option>GBP</option>
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-2">Facility Type</label>
                      <select name="facilityType" value={formData.facilityType} onChange={handleChange} className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/[0.06] rounded-xl focus:ring-1 focus:ring-brand-400/30 focus:border-brand-400/30 text-white font-medium appearance-none transition-all">
                        <option>Term Loan</option><option>Revolving Credit Facility</option><option>Trade Finance</option><option>Overdraft</option>
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-2">Tenor (Months)</label>
                      <select name="tenureMonths" value={formData.tenureMonths} onChange={handleChange} className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/[0.06] rounded-xl focus:ring-1 focus:ring-brand-400/30 focus:border-brand-400/30 text-white font-medium appearance-none transition-all">
                        <option>12</option><option>24</option><option>36</option><option>48</option><option>60</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-2">Purpose of Facility</label>
                      <textarea name="purpose" rows={3} value={formData.purpose} onChange={handleChange} placeholder="Briefly describe the business purpose..." className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/[0.06] rounded-xl focus:ring-1 focus:ring-brand-400/30 focus:border-brand-400/30 text-white font-medium resize-none transition-all" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: BUSINESS INFO */}
              {currentStep === 2 && (
                <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
                  <div>
                    <h2 className="text-xl font-medium text-white tracking-tight mb-1">Business Profile</h2>
                    <p className="text-[13px] text-zinc-500">Provide contextual information about the borrowing entity.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-2">Company Legal Name</label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                        <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="ex. : SOCOME Industries SA" className="w-full pl-10 pr-4 py-3 bg-[#0d0d0d] border border-white/[0.06] rounded-xl focus:ring-1 focus:ring-brand-400/30 focus:border-brand-400/30 text-white font-medium transition-all" />
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-2">Industry Sector</label>
                      <select name="industry" value={formData.industry} onChange={handleChange} className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/[0.06] rounded-xl focus:ring-1 focus:ring-brand-400/30 focus:border-brand-400/30 text-white font-medium appearance-none transition-all">
                        <option>Technology</option><option>Manufacturing</option><option>Real Estate</option><option>Energy</option><option>Logistics</option>
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-2">Region / Country</label>
                      <div className="relative">
                        <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                        <input type="text" name="country" value={formData.country} onChange={handleChange} placeholder="e.g. United States" className="w-full pl-10 pr-4 py-3 bg-[#0d0d0d] border border-white/[0.06] rounded-xl focus:ring-1 focus:ring-brand-400/30 focus:border-brand-400/30 text-white font-medium transition-all" />
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-2">Annual Revenue (M)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                        <input type="number" name="annualRevenue" value={formData.annualRevenue} onChange={handleChange} placeholder="e.g. 50" className="w-full pl-10 pr-4 py-3 bg-[#0d0d0d] border border-white/[0.06] rounded-xl focus:ring-1 focus:ring-brand-400/30 focus:border-brand-400/30 text-white font-medium transition-all" />
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-2">Employees</label>
                      <div className="relative">
                        <Users className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                        <input type="number" name="employees" value={formData.employees} onChange={handleChange} placeholder="e.g. 250" className="w-full pl-10 pr-4 py-3 bg-[#0d0d0d] border border-white/[0.06] rounded-xl focus:ring-1 focus:ring-brand-400/30 focus:border-brand-400/30 text-white font-medium transition-all" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: FINANCIAL PROFILE */}
              {currentStep === 3 && (
                <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
                  <div>
                    <h2 className="text-xl font-medium text-white tracking-tight mb-1">Financial & Risk Profile</h2>
                    <p className="text-[13px] text-zinc-500">Outline the current capital structure and available collateral.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-2">Existing Debt (M)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                        <input type="number" name="existingDebt" value={formData.existingDebt} onChange={handleChange} placeholder="e.g. 25" className="w-full pl-10 pr-4 py-3 bg-[#0d0d0d] border border-white/[0.06] rounded-xl focus:ring-1 focus:ring-brand-400/30 focus:border-brand-400/30 text-white font-medium transition-all" />
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-2">Main Banking Relationship</label>
                      <div className="relative">
                        <Landmark className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                        <input type="text" name="mainBank" value={formData.mainBank} onChange={handleChange} placeholder="e.g. Chase Bank" className="w-full pl-10 pr-4 py-3 bg-[#0d0d0d] border border-white/[0.06] rounded-xl focus:ring-1 focus:ring-brand-400/30 focus:border-brand-400/30 text-white font-medium transition-all" />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-2">Collateral / Security Offered</label>
                      <textarea name="collateral" rows={2} value={formData.collateral} onChange={handleChange} placeholder="e.g. 1st lien on equipment, real estate..." className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/[0.06] rounded-xl focus:ring-1 focus:ring-brand-400/30 focus:border-brand-400/30 text-white font-medium resize-none transition-all" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-2">Financial Position Summary</label>
                      <textarea name="financialPosition" rows={2} value={formData.financialPosition} onChange={handleChange} placeholder="Brief note on liquidity and profitability trends..." className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/[0.06] rounded-xl focus:ring-1 focus:ring-brand-400/30 focus:border-brand-400/30 text-white font-medium resize-none transition-all" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: DOCUMENTS */}
              {currentStep === 4 && (
                <motion.div key="step4" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
                  <div>
                    <h2 className="text-xl font-medium text-white tracking-tight mb-1">Supporting Documents</h2>
                    <p className="text-[13px] text-zinc-500">Provide the required documentation to expedite the review process.</p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { title: 'Annual Financial Statements', req: true },
                      { title: 'YTD Management Accounts', req: true },
                      { title: 'Business Plan / Facility Note', req: false },
                      { title: 'Collateral Appraisals', req: false },
                    ].map((doc, idx) => {
                      const isUploaded = uploadedDocs.includes(doc.title)
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                          key={doc.title} 
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${isUploaded ? 'bg-brand-400/5 border-brand-400/20 shadow-[0_0_15px_rgba(59,123,255,0.05)]' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15]'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isUploaded ? 'bg-brand-400/10' : 'bg-brand-400/10'}`}>
                              {isUploaded ? <CheckCircle2 className="w-5 h-5 text-brand-400" /> : <FileText className="w-5 h-5 text-brand-400" />}
                            </div>
                            <div>
                              <div className="text-[14px] font-medium text-white tracking-tight">{doc.title}</div>
                              <div className="text-[11px] font-medium text-zinc-500 mt-0.5 uppercase tracking-wider">{doc.req ? 'Required' : 'Optional'}</div>
                            </div>
                          </div>
                          {isUploaded ? (
                            <span className="text-[12px] font-medium text-brand-400 px-3 py-1 rounded bg-brand-400/10 border border-brand-400/20">Attached</span>
                          ) : (
                            <button type="button" onClick={() => handleMockUpload(doc.title)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] text-[12px] font-medium text-zinc-300 transition-all">
                              <FileUp className="w-3.5 h-3.5" />
                              Upload
                            </button>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* STEP 5: REVIEW */}
              {currentStep === 5 && (
                <motion.div key="step5" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
                  <div>
                    <h2 className="text-xl font-medium text-white tracking-tight mb-1">Review & Submit</h2>
                    <p className="text-[13px] text-zinc-500">Please review your application details before final submission.</p>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Summary Block 1 */}
                    <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-6 relative overflow-hidden group">
                      <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-brand-400/[0.02] to-transparent pointer-events-none" />
                      <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-5 flex items-center justify-between relative z-10">
                        <span>Facility Request</span>
                        <button type="button" onClick={() => setCurrentStep(1)} className="text-brand-400 hover:text-brand-400/80 transition-colors">Edit</button>
                      </div>
                      <div className="grid grid-cols-2 gap-y-5 gap-x-6 text-[13px] relative z-10">
                        <div>
                          <div className="text-zinc-500 mb-1">Amount</div>
                          <div className="font-medium text-white text-[15px]">{formData.currency} {formData.requestedAmount}M</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 mb-1">Type</div>
                          <div className="font-medium text-white text-[15px]">{formData.facilityType}</div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-zinc-500 mb-1">Purpose</div>
                          <div className="font-medium text-zinc-300 leading-relaxed">{formData.purpose || '—'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Summary Block 2 */}
                    <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-6 relative overflow-hidden">
                      <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-brand-400/[0.02] to-transparent pointer-events-none" />
                      <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-5 flex items-center justify-between relative z-10">
                        <span>Business Context</span>
                        <button type="button" onClick={() => setCurrentStep(2)} className="text-brand-400 hover:text-brand-400/80 transition-colors">Edit</button>
                      </div>
                      <div className="grid grid-cols-2 gap-y-5 gap-x-6 text-[13px] relative z-10">
                        <div>
                          <div className="text-zinc-500 mb-1">Company</div>
                          <div className="font-medium text-white text-[15px]">{formData.companyName || '—'}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 mb-1">Industry</div>
                          <div className="font-medium text-white text-[15px]">{formData.industry}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 mb-1">Annual Revenue</div>
                          <div className="font-medium text-white text-[15px]">{formData.annualRevenue ? `$${formData.annualRevenue}M` : '—'}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 mb-1">Existing Debt</div>
                          <div className="font-medium text-white text-[15px]">{formData.existingDebt ? `$${formData.existingDebt}M` : '—'}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Declaration */}
                    <div className="flex items-start gap-4 p-5 bg-brand-400/[0.03] border border-brand-400/20 rounded-xl">
                      <ShieldCheck className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[12px] text-zinc-400 leading-relaxed font-medium">
                        By submitting this application, I confirm that the information provided is accurate and complete to the best of my knowledge. I understand that the bank may request further documentation during the underwriting process.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* ── Footer Actions ────────────────────────────────────────────── */}
            <div className="pt-8 mt-8 border-t border-white/[0.06] flex items-center justify-between relative z-10">
              {currentStep > 1 ? (
                <button type="button" onClick={handleBack} className="px-5 py-2.5 rounded-xl font-medium text-[13px] text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all border border-transparent">
                  Back
                </button>
              ) : (
                <Link href="/client-portal/applications" className="px-5 py-2.5 rounded-xl font-medium text-[13px] text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all border border-transparent">
                  Cancel
                </Link>
              )}
              
              <div className="flex items-center gap-3">
                <button type="button" className="px-5 py-2.5 rounded-xl font-medium text-[13px] text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all hidden sm:block border border-transparent">
                  Save Draft
                </button>
                {currentStep < 5 ? (
                  <button type="button" onClick={handleNext} className="px-6 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-[13px] font-semibold transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] flex items-center gap-2">
                    Continue <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button type="button" onClick={handleSubmit} disabled={submitMutation.isPending} className="px-6 py-2.5 bg-brand-400 hover:bg-brand-400/90 text-[#0a0a0a] rounded-xl text-[13px] font-semibold transition-all shadow-[0_0_20px_rgba(59,123,255,0.3)] flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                    {submitMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin text-[#0a0a0a]" /> Submitting...</>
                    ) : (
                      'Submit Request'
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Side Panel ────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
          <div className="bg-[#0a0a0a]/80 backdrop-blur-md border border-white/[0.06] rounded-[24px] p-7 sticky top-24 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-400/10 rounded-full blur-[40px] pointer-events-none" />
            
            <div className="w-12 h-12 rounded-2xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center mb-6 relative z-10">
              <Info className="w-6 h-6 text-brand-400" />
            </div>
            <h3 className="text-[16px] font-medium text-white tracking-tight mb-2 relative z-10">What happens next?</h3>
            <p className="text-[13px] text-zinc-400 leading-relaxed mb-8 relative z-10">
              Your application will be routed to your designated Relationship Manager and the Credit Risk team for preliminary review.
            </p>
            
            <div className="space-y-5 relative z-10">
              {[
                { step: '1', title: 'Preliminary Review', desc: 'SLA: 24-48 hours' },
                { step: '2', title: 'Document Validation', desc: 'Analyst verification' },
                { step: '3', title: 'Credit Committee', desc: 'Final decisioning' },
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[11px] font-medium text-zinc-500 flex-shrink-0 mt-0.5">
                    {s.step}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-zinc-200">{s.title}</div>
                    <div className="text-[12px] text-zinc-500 mt-0.5">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/[0.06] relative z-10">
              <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500 mb-3">Secure Connection</div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-brand-400" />
                <span className="text-[12px] font-medium text-zinc-400">End-to-End Encrypted (AES-256)</span>
              </div>
            </div>
          </div>
        </motion.div>
        
      </div>
    </div>
  )
}
