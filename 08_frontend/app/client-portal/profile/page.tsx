'use client'

import { Building2, Globe, Users, Phone, Mail, MapPin, Edit3, CheckCircle2, Shield, User } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const PROFILE = {
  legalName: 'Trans-CEMAC Logistique SARL',
  tradingName: 'GLP Group',
  registrationNumber: 'RC-2014-00872',
  lei: '549300ABCXYZ0123456789',
  sector: 'Transportation & Logistics',
  incorporationCountry: 'Cameroon',
  operatingCountries: ['Cameroon', 'Nigeria', 'Gabon', 'DR Congo'],
  employeeCount: '250–500',
  annualTurnover: '30–40 Mds XAF',
  website: 'www.glp-group.com',
  address: '14 Avenue du Général de Gaulle, Douala, Cameroon',
  contacts: [
    { name: 'Jean-Baptiste Mbarga', title: 'Directeur Général', email: 'jb.mbarga@glp-group.com', phone: '+237 699 001 234', primary: true },
    { name: 'Aïcha Ngoma', title: 'Chief Financial Officer', email: 'a.ngoma@glp-group.com', phone: '+237 699 005 678', primary: false },
  ],
  bankingRelationship: {
    clientSince: 'January 2020',
    relationshipManager: 'Jean-Marc Olé',
    rmEmail: 'j.ole@riskengine-bank.com',
    rmPhone: '+237 222 123 456',
    tier: 'Corporate Premier',
  },
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
} as const

export default function ProfilePage() {
  const [editing, setEditing] = useState(false)

  return (
    <div className="relative space-y-7 max-w-5xl mx-auto pb-12 min-h-screen">
      
      {/* ── Ambient Glows ────────────────────────────────────────────────────── */}
      <div className="absolute top-[-50px] right-[-100px] w-[500px] h-[500px] bg-brand-400/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 space-y-7">
        
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-3.5 h-3.5 text-brand-400" />
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Company Profile</span>
            </div>
            <h1 className="text-3xl font-medium text-white tracking-tight">Organization Settings</h1>
            <p className="text-[13px] text-zinc-500 mt-1.5">Manage your company information and banking relationship</p>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
              editing
                ? 'bg-brand-400 text-white hover:bg-brand-400/90 shadow-brand'
                : 'bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.08] hover:text-white'
            }`}
          >
            {editing ? <><CheckCircle2 className="w-4 h-4" /> Save Changes</> : <><Edit3 className="w-4 h-4" /> Edit Profile</>}
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* ── Left Column ────────────────────────────────────────────────────── */}
          <div className="col-span-1 lg:col-span-8 space-y-6 lg:space-y-8">
            
            {/* Identity Box */}
            <motion.div variants={itemVariants} className="bg-[#0a0a0a]/90 backdrop-blur-md border border-white/[0.06] rounded-[24px] p-8 md:p-10 relative overflow-hidden group">
              {/* Background glow */}
              <div className={`absolute -top-10 -right-10 w-[300px] h-[300px] bg-brand-400/5 blur-[80px] pointer-events-none rounded-full transition-opacity opacity-50 group-hover:opacity-100`} />
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-400/[0.02] to-transparent pointer-events-none" />

              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center text-[#0a0a0a] text-3xl font-black shadow-[0_0_30px_rgba(59,123,255,0.3)] flex-shrink-0">
                    {PROFILE.legalName.substring(0, 3)}
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-medium text-white tracking-tight mb-1.5">{PROFILE.legalName}</h2>
                    <p className="text-[14px] text-zinc-400 font-medium">{PROFILE.tradingName} · {PROFILE.sector}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-400 bg-brand-400/10 border border-brand-400/20 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(59,123,255,0.1)]">
                        {PROFILE.bankingRelationship.tier}
                      </span>
                      <span className="text-[12px] text-zinc-500 font-medium">Client Since {PROFILE.bankingRelationship.clientSince}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                  {[
                    { label: 'Registration Number', value: PROFILE.registrationNumber },
                    { label: 'Legal Entity Identifier (LEI)', value: PROFILE.lei, mono: true },
                    { label: 'Primary Sector', value: PROFILE.sector },
                    { label: 'Country of Incorporation', value: PROFILE.incorporationCountry },
                    { label: 'Annual Turnover (est.)', value: PROFILE.annualTurnover },
                    { label: 'Employees', value: PROFILE.employeeCount },
                  ].map(field => (
                    <div key={field.label}>
                      <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-1">{field.label}</div>
                      <div className={`text-[15px] font-medium text-zinc-200 ${field.mono ? 'font-mono tracking-tight text-brand-400' : ''}`}>{field.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-white/[0.06]">
                  <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 mb-3">Operating Countries</div>
                  <div className="flex flex-wrap gap-2.5">
                    {PROFILE.operatingCountries.map(c => (
                      <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] transition-colors text-zinc-300 text-[13px] rounded-lg font-medium">
                        <Globe className="w-4 h-4 text-zinc-500" />
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center gap-5 text-[13.5px] text-zinc-400 font-medium">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-400" />
                    {PROFILE.address}
                  </div>
                  <div className="hidden sm:block w-1 h-1 rounded-full bg-zinc-700" />
                  <div className="flex items-center gap-2 hover:text-brand-400 transition-colors cursor-pointer">
                    <Globe className="w-4 h-4 text-brand-400" />
                    {PROFILE.website}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contacts Box */}
            <motion.div variants={itemVariants} className="bg-[#0a0a0a]/90 backdrop-blur-md border border-white/[0.06] rounded-[24px] p-8 md:p-10">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-4 h-4 text-brand-400" />
                <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Authorized Contacts</h3>
              </div>
              <div className="space-y-4">
                {PROFILE.contacts.map((contact, i) => (
                  <div key={i} className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 md:p-6 rounded-2xl border transition-all ${
                    contact.primary ? 'bg-brand-400/5 border-brand-400/20 shadow-[0_0_15px_rgba(59,123,255,0.05)]' : 'bg-white/[0.02] border-white/[0.05] hover:border-white/[0.1]'
                  }`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-[15px] font-bold flex-shrink-0 transition-colors ${
                      contact.primary ? 'bg-brand-400 text-[#0a0a0a] shadow-[0_0_15px_rgba(59,123,255,0.3)]' : 'bg-white/[0.05] text-zinc-400'
                    }`}>
                      {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[15px] font-medium text-white tracking-tight">{contact.name}</span>
                        {contact.primary && (
                          <span className="text-[9px] bg-brand-400/10 text-brand-400 border border-brand-400/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] text-zinc-500 font-medium mb-3">{contact.title}</div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                        <div className="flex items-center gap-2 text-[12.5px] text-zinc-400">
                          <Mail className="w-3.5 h-3.5 text-zinc-600" />
                          {contact.email}
                        </div>
                        <div className="flex items-center gap-2 text-[12.5px] text-zinc-400">
                          <Phone className="w-3.5 h-3.5 text-zinc-600" />
                          {contact.phone}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── Right Column ───────────────────────────────────────────────────── */}
          <div className="col-span-1 lg:col-span-4 space-y-6 lg:space-y-8">
            
            {/* RM Card */}
            <motion.div variants={itemVariants} className="bg-gradient-to-br from-brand-400/10 via-brand-400/[0.02] to-[#0a0a0a] border border-brand-400/20 rounded-[24px] p-8 relative overflow-hidden group">
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-brand-400/[0.05] to-transparent pointer-events-none" />
              <div className="text-[10px] font-bold text-brand-400/80 uppercase tracking-widest mb-6 relative z-10">Your Banking Team</div>
              <div className="w-16 h-16 rounded-2xl bg-brand-400/10 border border-brand-400/30 flex items-center justify-center text-[18px] text-brand-400 font-bold mb-5 shadow-[0_0_20px_rgba(59,123,255,0.2)] relative z-10 transition-transform group-hover:scale-105">
                {PROFILE.bankingRelationship.relationshipManager.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="font-medium text-[18px] text-white tracking-tight relative z-10">{PROFILE.bankingRelationship.relationshipManager}</div>
              <div className="text-brand-400/70 text-[13px] font-medium mt-1 relative z-10">Relationship Manager · Corporate</div>
              
              <div className="mt-8 space-y-3.5 relative z-10">
                <div className="flex items-center gap-3 text-[13px] text-zinc-300 font-medium">
                  <Mail className="w-4 h-4 text-brand-400" />
                  {PROFILE.bankingRelationship.rmEmail}
                </div>
                <div className="flex items-center gap-3 text-[13px] text-zinc-300 font-medium">
                  <Phone className="w-4 h-4 text-brand-400" />
                  {PROFILE.bankingRelationship.rmPhone}
                </div>
              </div>
              <button className="mt-8 w-full py-3 bg-brand-400 hover:bg-brand-400/90 rounded-xl text-[13px] text-[#0a0a0a] font-bold transition-all shadow-[0_0_20px_rgba(59,123,255,0.3)] relative z-10">
                Send a Secure Message
              </button>
            </motion.div>

            {/* Compliance Status Card */}
            <motion.div variants={itemVariants} className="bg-[#0a0a0a]/90 backdrop-blur-md border border-white/[0.06] rounded-[24px] p-8">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 mb-6">Banking Compliance</h3>
              <div className="space-y-4">
                {[
                  { label: 'KYC Renewed', value: 'Verified', green: true },
                  { label: 'AML Status', value: 'Clear', green: true },
                  { label: 'Tier', value: PROFILE.bankingRelationship.tier, blue: true },
                  { label: 'Last Review', value: 'Jan 2026' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between pb-4 border-b border-white/[0.03] last:border-0 last:pb-0">
                    <span className="text-[13px] text-zinc-500 font-medium">{item.label}</span>
                    <div className={`text-[13px] font-bold flex items-center gap-2 ${
                      item.green ? 'text-emerald-400' : 
                      item.blue ? 'text-brand-400' : 
                      'text-zinc-300'
                    }`}>
                      {item.green && <CheckCircle2 className="w-4 h-4" />}
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-brand-400/[0.03] border border-brand-400/10 rounded-xl flex gap-3">
                <Shield className="w-5 h-5 text-brand-400 flex-shrink-0" />
                <p className="text-[12px] text-zinc-400 leading-relaxed font-medium">
                  Your account is in good standing and meets all current regulatory compliance requirements.
                </p>
              </div>
            </motion.div>

          </div>
        </div>
      </motion.div>
    </div>
  )
}
