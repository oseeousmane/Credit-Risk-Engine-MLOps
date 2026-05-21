'use client'

import { HeroSection } from '@/components/landing/HeroSection'
import { TrustStrip } from '@/components/landing/TrustStrip'
import { ProblemSection } from '@/components/landing/ProblemSection'
import { ModulesSection } from '@/components/landing/ModulesSection'
import { RoleSection } from '@/components/landing/RoleSection'
import { ShowcaseSection } from '@/components/landing/ShowcaseSection'
import { WorkflowSection } from '@/components/landing/WorkflowSection'
import { CredibilitySection } from '@/components/landing/CredibilitySection'
import { GovernanceSection } from '@/components/landing/GovernanceSection'
import { BusinessValueSection } from '@/components/landing/BusinessValueSection'
import { TestimonialsSection } from '@/components/landing/TestimonialsSection'
import { ContactSection } from '@/components/landing/ContactSection'
import { CTASection } from '@/components/landing/CTASection'
import { IntegrationsSection } from '@/components/landing/IntegrationsSection'
import { DeploymentSection } from '@/components/landing/DeploymentSection'
import { FAQSection } from '@/components/landing/FAQSection'
import { motion } from 'framer-motion'

import { useEffect } from 'react'

function SectionDivider() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  )
}

function Reveal({ children, delay = 0, id }: { children: React.ReactNode, delay?: number, id?: string }) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] as const }}
    >
      {children}
    </motion.div>
  )
}

export default function HomePage() {
  return (
    <main className="antialiased overflow-clip">
      {/* 1. Hero (Self-animated, no Reveal wrapper needed) */}
      <HeroSection />

      {/* 2. Trust strip */}
      <Reveal delay={0.2}>
        <TrustStrip />
      </Reveal>

      {/* 3. Problem / Solution */}
      <Reveal>
        <ProblemSection />
      </Reveal>
      <SectionDivider />

      {/* 4. Modules */}
      <Reveal id="modules">
        <ModulesSection />
      </Reveal>
      <SectionDivider />

      {/* 5. Role-Based */}
      <Reveal id="roles">
        <RoleSection />
      </Reveal>
      <SectionDivider />

      {/* 6. Product Showcase */}
      <Reveal>
        <ShowcaseSection />
      </Reveal>
      <SectionDivider />

      {/* 7. Workflow */}
      <Reveal>
        <WorkflowSection />
      </Reveal>
      <SectionDivider />

      {/* 8. AI / Risk Credibility */}
      <Reveal id="credibility">
        <CredibilitySection />
      </Reveal>
      <SectionDivider />

      {/* 9. Security / Governance */}
      <Reveal>
        <GovernanceSection />
      </Reveal>
      <SectionDivider />

      {/* 10. Business Impact */}
      <Reveal>
        <BusinessValueSection />
      </Reveal>
      <SectionDivider />

      {/* 11. Integrations */}
      <Reveal>
        <IntegrationsSection />
      </Reveal>
      <SectionDivider />

      {/* 12. Deployment */}
      <Reveal>
        <DeploymentSection />
      </Reveal>
      <SectionDivider />

      {/* 13. Testimonials */}
      <Reveal>
        <TestimonialsSection />
      </Reveal>
      <SectionDivider />

      {/* 14. FAQ */}
      <Reveal>
        <FAQSection />
      </Reveal>
      <SectionDivider />

      {/* 15. Contact */}
      <Reveal>
        <ContactSection />
      </Reveal>
      <SectionDivider />

      {/* 16. Final CTA */}
      <Reveal>
        <CTASection />
      </Reveal>
    </main>
  )
}
