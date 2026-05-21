// ─────────────────────────────────────────────
// Core Domain Types
// ─────────────────────────────────────────────

export type RiskRating = 'AAA' | 'AA+' | 'AA' | 'AA-' | 'A+' | 'A' | 'A-' | 'BBB+' | 'BBB' | 'BBB-' | 'BB+' | 'BB' | 'B' | 'CCC' | 'D'
export type RiskLevel = 'LOW' | 'MED' | 'HIGH' | 'CRITICAL'
export type IFRS9Stage = 1 | 2 | 3
export type DecisionStatus = 'APPROVE' | 'APPROVE_WITH_CONDITIONS' | 'SEND_TO_REVIEW' | 'REJECT'
export type PipelineStage = 'KYC_DATA_VAL' | 'SCORING' | 'COMMITTEE_REVIEW' | 'FINAL_APPROVAL'
export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO'
export type ModelStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE'
export type InferenceDecision = 'APPROVE' | 'DECLINE' | 'REVIEW'

export interface Counterparty {
  id: string
  name: string
  sector: string
  riskRating: RiskRating
  riskLevel: RiskLevel
  exposure: number // in millions
  expLimit: number
  pd1y: number // percentage
  expectedLoss: number // in millions
  ifrs9Stage: IFRS9Stage
  outlook: 'Stable' | 'Negative' | 'Positive' | 'Watch'
  lastReview: string
  analyst: string
  facilityUtilization: number // percentage
  cet1Impact: number
  rwaImpact: number
  pdDelta: number // bps
  trend: number[]
}

export interface PortfolioKPI {
  totalExposure: number
  avgPD: number
  watchlistEntities: number
  elChange: number
  pdChange: number
  watchlistChange: number
}

export interface Application {
  id: string
  reqId: string
  counterpartyName: string
  sector: string
  exposure: number
  pd: number
  rating: RiskRating
  stage: PipelineStage
  priority: boolean
  slaHours: number
  analyst: string
  analystAvatar: string
  aiRiskDrivers: { label: string; positive: boolean; description: string }[]
}

export interface Decision {
  id: string
  reqId: string
  counterpartyId: string
  counterpartyName: string
  status: DecisionStatus
  pd: number
  pdDelta: number
  expectedLoss: number
  peerGroupPD: number
  portfolioAvgEL: number
  postApprovalExposure: number
  rwaImpact: number
  capConsumption: number
  sectorConcentrationBefore: number
  sectorConcentrationAfter: number
  baselineScenarioPD: number
  adverseScenarioPD: number
  xaiDrivers: {
    label: string
    category: string
    impact: number
    direction: 'positive' | 'negative'
  }[]
  justification?: string
}

export interface ModelMetrics {
  auc: number
  ks: number
  gini: number
  psi: number
  missingValueRate: number
  status: ModelStatus
  version: string
  inferenceVolume: number
  errorRate: number
  latencyP50: number
  latencyP99: number
  criticalFeatures: { name: string; psi: number; status: 'High' | 'Warn' | 'OK' }[]
}

export interface Scenario {
  id: string
  name: string
  horizon: string
  base: string
  pdDelta: number
  expectedLoss: number
  rwaImpact: number
  cet1Ratio: number
  bufferRemaining: number
  parameters: {
    unemploymentShock: number
    creditSpreadBps: number
    realGDPGrowth: number
  }
  stageMigration: {
    baseline: { s1: number; s2: number; s3: number }
    adverse: { s1: number; s2: number; s3: number }
  }
  strategicInsights: string[]
  topRiskDrivers: { name: string; impact: number; cet1Bps: number }[]
}

export interface ComplianceItem {
  id: string
  label: string
  status: 'VERIFIED' | 'REVIEW' | 'FAILED'
  detail: string
  lastValidated: string
}

export interface AuditEvent {
  id: string
  type: 'MODEL_UPDATE' | 'VALIDATION_RUN' | 'DATA_ALERT' | 'DECISION'
  title: string
  description: string
  timestamp: string
  author?: string
  approver?: string
  severity?: AlertSeverity
}

export interface InferenceRecord {
  id: string
  timestamp: string
  reqId: string
  score: number
  decision: InferenceDecision
  flagged: boolean
}

export interface AlertRecord {
  id: string
  severity: AlertSeverity
  message: string
  detail: string
  time: string
}
