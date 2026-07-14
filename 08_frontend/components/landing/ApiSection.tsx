'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Terminal } from 'lucide-react'

const codeTokens = [
  { text: "curl", className: "text-brand-400" },
  { text: " -X POST ", className: "text-zinc-300" },
  { text: "https://api.octaix.com/v1/decisioning/score", className: "text-brand-400/80" },
  { text: " \\\n", className: "text-zinc-300" },
  { text: "  -H ", className: "text-zinc-300" },
  { text: "\"Authorization: Bearer sk_live_...\"", className: "text-zinc-400" },
  { text: " \\\n", className: "text-zinc-300" },
  { text: "  -H ", className: "text-zinc-300" },
  { text: "\"Content-Type: application/json\"", className: "text-zinc-400" },
  { text: " \\\n", className: "text-zinc-300" },
  { text: "  -d ", className: "text-zinc-300" },
  { text: "'{\n", className: "text-zinc-300" },
  { text: "    \"counterparty_id\"", className: "text-zinc-400" },
  { text: ": ", className: "text-zinc-300" },
  { text: "\"CP-9482\"", className: "text-brand-400" },
  { text: ",\n", className: "text-zinc-300" },
  { text: "    \"requested_facility\"", className: "text-zinc-400" },
  { text: ": ", className: "text-zinc-300" },
  { text: "5000000", className: "text-brand-400" },
  { text: ",\n", className: "text-zinc-300" },
  { text: "    \"run_shap_explainability\"", className: "text-zinc-400" },
  { text: ": ", className: "text-zinc-300" },
  { text: "true\n", className: "text-brand-400" },
  { text: "  }'", className: "text-zinc-300" },
]

function AnimatedTerminal() {
  const [cursor, setCursor] = useState(0)
  const [showResponse, setShowResponse] = useState(false)
  const [startTyping, setStartTyping] = useState(false)
  
  const totalLength = codeTokens.reduce((acc, t) => acc + t.text.length, 0)

  useEffect(() => {
    if (startTyping && cursor < totalLength) {
      const timeout = setTimeout(() => setCursor(c => c + 1), Math.random() * 20 + 10)
      return () => clearTimeout(timeout)
    }
    if (startTyping && cursor >= totalLength) {
      const timeout = setTimeout(() => setShowResponse(true), 500)
      return () => clearTimeout(timeout)
    }
  }, [cursor, totalLength, startTyping])

  let charsLeft = cursor

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      onViewportEnter={() => setTimeout(() => setStartTyping(true), 800)}
      transition={{ duration: 0.8 }}
      className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-surface-0 shadow-2xl"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] bg-[#0c0c0c]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        </div>
        <div className="mx-auto flex items-center gap-2 text-[12px] font-mono text-zinc-500">
          <Terminal className="w-3.5 h-3.5" /> POST /v1/decisioning/score
        </div>
      </div>
      <div className="p-6 overflow-x-auto text-[13px] font-mono leading-loose bg-[#0a0a0a] min-h-[320px]">
        <pre className="whitespace-pre-wrap break-all">
          {codeTokens.map((t, i) => {
            if (charsLeft <= 0) return null
            const sliceLen = Math.min(charsLeft, t.text.length)
            charsLeft -= sliceLen
            return (
              <span key={i} className={t.className}>
                {t.text.slice(0, sliceLen)}
              </span>
            )
          })}
          {(!showResponse || cursor < totalLength) && (
            <span className="animate-pulse bg-brand-400 w-2 h-4 inline-block ml-1 align-middle opacity-80" />
          )}
        </pre>
      </div>
      <div className={`border-t border-white/[0.05] bg-[#0c0c0c] p-4 text-[13px] font-mono transition-opacity duration-500 ${showResponse ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-zinc-500">// Response:</span>
        <br/>
        <span className="text-brand-400">{'{'} "status": "APPROVED", "pd_1y": 0.012, "lgd": 0.45 {'}'}</span>
      </div>
    </motion.div>
  )
}

export function ApiSection() {
  return (
    <section className="py-28 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-400">API-First</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-medium text-white tracking-tight mb-6">
              Built for Developers
            </h2>
            <p className="text-[15px] font-medium text-zinc-400 leading-relaxed mb-6">
              100% of the platform's functionality is accessible via our RESTful API. 
              Whether you need to trigger a credit scoring run from Salesforce, or ingest real-time limits into your Core Banking System, our developer experience is second to none.
            </p>
            <ul className="space-y-4 mb-8">
              {[
                "OpenAPI Specification (Swagger)",
                "Real-time Webhooks for event driven flows",
                "Idempotent endpoints for safe retries",
                "Granular API Keys & OAuth 2.0"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-[14px] font-medium text-zinc-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <AnimatedTerminal />
          
        </div>
      </div>
    </section>
  )
}
