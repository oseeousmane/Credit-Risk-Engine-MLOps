import { PrismaClient, Role, RiskRating, RiskLevel, IFRS9Stage, PipelineStage, DecisionStatus, ModelStatus, AlertSeverity, LifecycleStatus, DeploymentStatus, ArtifactCategory } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Secure bcrypt hash (cost factor 12) â€” matches auth.service.ts
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

async function main() {
  console.log('ðŸš€ Seeding RiskEngine database...')

  // â”€â”€ 0. Clean slate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await prisma.alert.deleteMany()
  await prisma.scenario.deleteMany()
  await prisma.modelMetrics.deleteMany()
  await prisma.modelVersion.deleteMany()
  await prisma.modelRegistry.deleteMany()
  await prisma.document.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.auditEvent.deleteMany()
  await prisma.decision.deleteMany()
  await prisma.application.deleteMany()
  await prisma.exposure.deleteMany()
  await prisma.counterparty.deleteMany()
  await prisma.user.deleteMany()

  // â”€â”€ 1. Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const passwordHash = await hashPassword('Demo@2026!')

  const analyst = await prisma.user.create({
    data: { email: 'analyst@riskengine.com', name: 'Sarah Jenkins', passwordHash, role: Role.ANALYST }
  })
  const riskManager = await prisma.user.create({
    data: { email: 'manager@riskengine.com', name: 'Marc Dupont', passwordHash, role: Role.MANAGER }
  })
  const croLegacyHash = 'ffb1b29ce2d3abdc65af1d79fac500124dc20adc24f3916f3ad8be2bb8f8a9f4' // SHA-256 for Demo@2026!
  const cro = await prisma.user.create({
    data: { email: 'cro@riskengine.com', name: 'Elena Rostova', passwordHash: croLegacyHash, passwordAlgorithm: 'SHA256', role: Role.CRO }
  })
  const admin = await prisma.user.create({
    data: { email: 'admin@riskengine.com', name: 'System Admin', passwordHash, passwordAlgorithm: 'BCRYPT', role: Role.ADMIN }
  })
  // CLIENT user â€” will be updated with counterpartyId later
  const clientUser = await prisma.user.create({
    data: { email: 'tom.eriksen@glp-group.com', name: 'Tom Eriksen', passwordHash, role: Role.CLIENT }
  })

  console.log(`âœ… Users: ${analyst.email}, ${riskManager.email}, ${cro.email}, ${clientUser.email}`)

  // â”€â”€ 2. Counterparties â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const cp1 = await prisma.counterparty.create({
    data: {
      lei: '5493006MHB84DD0ZWV18',
      name: 'Acme Heavy Industries',
      sector: 'Manufacturing',
      geography: 'North America',
      internalRating: RiskRating.AA_MINUS,
      riskLevel: RiskLevel.LOW,
      ifrs9Stage: IFRS9Stage.STAGE_1,
      // Financials
      revenue: 450.0,
      ebitda: 120.0,
      netProfit: 85.0,
      totalAssets: 1200.0,
      totalDebt: 320.0,
      currentRatio: 2.1,
      leverageRatio: 2.6,
      inventoryTurnover: 8.5,
      // Behavioral
      daysPastDue: 0,
      missedPayments24m: 0,
      creditHistoryYears: 15.5,
      bureauScore: 820,

      exposure: 42.5, expLimit: 65.0, pd1y: 0.12, expectedLoss: 0.05, facilityUtilization: 65,
      analystId: analyst.id,
      exposures: { create: [{ amount: 30.0, facilityType: 'Revolver' }, { amount: 12.5, facilityType: 'Term Loan' }] }
    }
  })

  // CLIENT counterparty â€” matches clientUser
  const cp2 = await prisma.counterparty.create({
    data: {
      lei: '894500YHB84XCV0ZWT42',
      name: 'Global Logistics Partners LLC',
      sector: 'Transportation',
      geography: 'CEMAC / Europe',
      internalRating: RiskRating.A,
      riskLevel: RiskLevel.MED,
      ifrs9Stage: IFRS9Stage.STAGE_1,
      // Financials
      revenue: 85.0,
      ebitda: 12.5,
      netProfit: 4.2,
      totalAssets: 150.0,
      totalDebt: 45.0,
      currentRatio: 1.4,
      leverageRatio: 3.6,
      // Behavioral
      daysPastDue: 12,
      missedPayments24m: 1,
      creditHistoryYears: 4.2,
      bureauScore: 685,

      exposure: 10.7, expLimit: 20.0, pd1y: 1.40, expectedLoss: 0.67, facilityUtilization: 52,
      analystId: analyst.id,
      exposures: { create: [{ amount: 8.5, facilityType: 'Credit Line' }, { amount: 2.2, facilityType: 'Equipment Loan' }] }
    }
  })

  // Link client user to CP
  await prisma.user.update({ where: { id: clientUser.id }, data: { counterpartyId: cp2.id } })

  const cp3 = await prisma.counterparty.create({
    data: {
      lei: '333500KHB84DDF0ZWQ11',
      name: 'Apex Retail Holdings',
      sector: 'Retail',
      geography: 'North America',
      internalRating: RiskRating.BB_PLUS,
      riskLevel: RiskLevel.CRITICAL,
      ifrs9Stage: IFRS9Stage.STAGE_3,
      exposure: 312.0, expLimit: 312.0, pd1y: 5.80, expectedLoss: 18.09, facilityUtilization: 100,
      analystId: riskManager.id, watchlistFlag: true,
    }
  })

  const cp4 = await prisma.counterparty.create({
    data: {
      lei: '549300ABCXYZ0128CEMAC',
      name: 'Cocoa Export SA',
      sector: 'Agriculture',
      geography: 'CEMAC',
      internalRating: RiskRating.BBB,
      riskLevel: RiskLevel.MED,
      ifrs9Stage: IFRS9Stage.STAGE_2,
      exposure: 87.0, expLimit: 100.0, pd1y: 2.85, expectedLoss: 1.87, facilityUtilization: 87,
      analystId: riskManager.id, watchlistFlag: true,
    }
  })

  const cp5 = await prisma.counterparty.create({
    data: {
      lei: '549300DEF1230ZWT65MM',
      name: 'TechCorp Ventures',
      sector: 'Technology',
      geography: 'Europe',
      internalRating: RiskRating.A_PLUS,
      riskLevel: RiskLevel.LOW,
      ifrs9Stage: IFRS9Stage.STAGE_1,
      exposure: 65.0, expLimit: 120.0, pd1y: 0.35, expectedLoss: 0.12, facilityUtilization: 54,
      analystId: analyst.id,
    }
  })

  console.log(`âœ… Counterparties: ${cp1.name}, ${cp2.name}, ${cp3.name}, ${cp4.name}, ${cp5.name}`)

  // â”€â”€ 3. Applications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const app1 = await prisma.application.create({
    data: {
      reqId: 'REQ-2026-001', requestedAmount: 15.0, priority: true,
      slaDeadline: new Date(Date.now() + 24 * 3600 * 1000),
      currentStage: PipelineStage.SCORED, pd: 0.12,
      counterpartyId: cp1.id, ownerId: analyst.id,
    }
  })

  // CLIENT applications â€” linked to cp2 (Global Logistics Partners)
  const app2 = await prisma.application.create({
    data: {
      reqId: 'APP-2026-001', requestedAmount: 8.5, priority: false,
      slaDeadline: new Date('2026-04-28'),
      facilityType: 'Credit Line',
      tenorMonths: 36,
      repaymentSource: 'CASH_FLOW',
      amortizationType: 'LINEAR',
      gracePeriodMonths: 6,
      currentStage: PipelineStage.COMMITTEE_REVIEW, pd: 1.40,
      counterpartyId: cp2.id, ownerId: riskManager.id,
    }
  })

  const app3 = await prisma.application.create({
    data: {
      reqId: 'APP-2026-002', requestedAmount: 2.2, priority: false,
      slaDeadline: new Date(Date.now() + 3 * 24 * 3600 * 1000),
      currentStage: PipelineStage.DOCUMENTS_PENDING, pd: 1.40,
      counterpartyId: cp2.id, ownerId: analyst.id,
    }
  })

  const app4 = await prisma.application.create({
    data: {
      reqId: 'REQ-2026-003', requestedAmount: 200.0, priority: false,
      slaDeadline: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      currentStage: PipelineStage.DOCUMENTS_PENDING, pd: 5.80,
      counterpartyId: cp3.id, ownerId: riskManager.id,
    }
  })

  console.log(`âœ… Applications: ${app1.reqId}, ${app2.reqId}, ${app3.reqId}, ${app4.reqId}`)

  // â”€â”€ 4. Decisions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await prisma.decision.create({
    data: {
      applicationId: app1.id, counterpartyId: cp1.id,
      status: DecisionStatus.APPROVE, decisionType: 'AUTO',
      justification: 'PD of 0.12% is well below policy threshold.',
      overrideFlag: false,
      scoringSnapshot: {
        payloadQualityScore: 92,
        qualityBand: 'HIGH',
        featureLineage: { rawCount: 140, derivedCount: 15, imputedCount: 3, imputedFeatures: ['liquidity_ratio_90d', 'market_sentiment'] }
      },
      decidedById: analyst.id, decidedAt: new Date(),
    }
  })

  await prisma.decision.create({
    data: {
      applicationId: app2.id, counterpartyId: cp2.id,
      status: DecisionStatus.APPROVE, decisionType: 'MANUAL',
      overrideFlag: true,
      overrideReason: 'Strategic client in CEMAC region. Exceptions approved by regional CRO.',
      justification: 'Medium-risk counterparty with elevated exposure. Escalate skipped due to manual override.',
      scoringSnapshot: {
        payloadQualityScore: 68,
        qualityBand: 'MEDIUM',
        featureLineage: { rawCount: 110, derivedCount: 20, imputedCount: 28, imputedFeatures: ['cash_flow_volatility', 'tax_liabilities', 'unlisted_equity'] }
      },
      decidedById: cro.id, decidedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    }
  })

  await prisma.decision.create({
    data: {
      applicationId: app4.id, counterpartyId: cp3.id,
      status: DecisionStatus.REJECT, decisionType: 'AUTO',
      justification: 'PD of 5.80% exceeds maximum acceptable threshold of 6%. Auto-reject.',
      overrideFlag: false,
      scoringSnapshot: {
        payloadQualityScore: 32,
        qualityBand: 'LOW',
        featureLineage: { rawCount: 75, derivedCount: 10, imputedCount: 73, imputedFeatures: ['audited_ebitda', 'director_credit_score', 'supplier_payment_days'] }
      },
      decidedById: riskManager.id, decidedAt: new Date(),
    }
  })

  // Generate 45 additional pseudo-random decisions to populate Feature Lineage charts
  const histDecisions = [];
  const baseDate = new Date();
  for (let i = 30; i >= 0; i--) {
    for (let j = 0; j < 2; j++) {
      const dDate = new Date(baseDate.getTime() - (i + Math.random()) * 24 * 3600 * 1000);
      const qualityBase = 45 + ((30 - i) * 1.5) + (Math.random() * 20);
      const qualityScore = Math.min(100, Math.round(qualityBase));
      const qBand = qualityScore >= 75 ? 'HIGH' : qualityScore >= 50 ? 'MEDIUM' : 'LOW';
      const raw = Math.round((qualityScore / 100) * 158);
      const imputed = Math.max(0, 158 - raw - 20);
      const imputedFeats = [];
      if (imputed > 0) imputedFeats.push('dti_proxy');
      if (imputed > 10) imputedFeats.push('cash_flow_est');
      if (imputed > 20) imputedFeats.push('tax_liabilities_est');

      const pseudoAppId = `APP-HIST-${i}-${j}`;
      histDecisions.push({
        applicationId: pseudoAppId,
        counterpartyId: cp5.id,
        status: DecisionStatus.APPROVE,
        decisionType: 'AUTO',
        decidedById: analyst.id,
        decidedAt: dDate,
        createdAt: dDate,
        scoringSnapshot: {
          payloadQualityScore: qualityScore,
          qualityBand: qBand,
          featureLineage: { rawCount: raw, derivedCount: 20, imputedCount: imputed, imputedFeatures: imputedFeats }
        }
      });
    }
  }
  // To satisfy schema (Application must exist), we must create Applications first for the history
  const histApps = histDecisions.map(d => ({
    reqId: d.applicationId,
    requestedAmount: 10.0,
    slaDeadline: new Date(),
    currentStage: PipelineStage.APPROVED,
    counterpartyId: cp5.id,
  }));
  await prisma.application.createMany({ data: histApps });
  // Now fetch their actual DB IDs to link
  const appsCreated = await prisma.application.findMany({ where: { reqId: { startsWith: 'APP-HIST-' } } });
  const appMap = new Map(appsCreated.map(a => [a.reqId, a.id]));
  const finalDecisions = histDecisions.map(d => ({ ...d, applicationId: appMap.get(d.applicationId)! }));
  await prisma.decision.createMany({ data: finalDecisions });

  // â”€â”€ 5. MLOps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const registry = await prisma.modelRegistry.create({
    data: { name: 'Core PD Model (XGBoost)', type: 'XGBOOST', description: 'Primary PD inference engine. Basel II/III compliant.' }
  })
  const regLGD = await prisma.modelRegistry.create({
    data: { name: 'LGD Estimator (Logistic)', type: 'LOG_REG', description: 'Loss Given Default model.' }
  })

  const v1 = await prisma.modelVersion.create({
    data: {
      modelId: registry.id,
      versionTag: 'v4.2.0',
      status: ModelStatus.HEALTHY,
      lifecycleStatus: LifecycleStatus.CHAMPION,
      deploymentStatus: DeploymentStatus.PRODUCTION,
      artifactCategory: ArtifactCategory.PROD_CHAMPION,
      auc: 0.82, ks: 0.45, psi: 0.05
    }
  })
  const v2 = await prisma.modelVersion.create({
    data: {
      modelId: registry.id,
      versionTag: 'v4.3.0-shadow',
      status: ModelStatus.HEALTHY,
      lifecycleStatus: LifecycleStatus.CHALLENGER,
      deploymentStatus: DeploymentStatus.SHADOW,
      artifactCategory: ArtifactCategory.PROD_CHAMPION,
      auc: 0.84, ks: 0.47, psi: 0.04
    }
  })

  const prodChampion = await prisma.modelVersion.create({
    data: {
      modelId: registry.id,
      versionTag: 'xgboost_v2_prod_champion_candidate',
      status: ModelStatus.HEALTHY,
      lifecycleStatus: LifecycleStatus.CHALLENGER,
      deploymentStatus: DeploymentStatus.SHADOW,
      artifactCategory: ArtifactCategory.PROD_CHAMPION,
      auc: 0.755, ks: 0.40, psi: 0.04,
      oot_auc: 0.743,
      oot_ks: 0.38,
      oot_psi: 0.082,
      oot_period_start: new Date('2025-01-01'),
      oot_period_end: new Date('2025-06-30'),
      validationStatus: 'VALIDATED_PASS_WITH_CAVEATS',
      trainingTimestamp: new Date('2024-06-30'),
      featureSchemaVersion: 'v2.0.0_158_features'
    }
  })

  const v3 = await prisma.modelVersion.create({
    data: {
      modelId: regLGD.id,
      versionTag: 'v2.1.0',
      status: ModelStatus.HEALTHY,
      lifecycleStatus: LifecycleStatus.CHAMPION,
      deploymentStatus: DeploymentStatus.PRODUCTION,
      artifactCategory: ArtifactCategory.PROD_CHAMPION,
      auc: 0.77, ks: 0.38, psi: 0.13
    }
  })

  // Generate 30 days of historical snapshots for v1
  let currentAuc = 0.89;
  let currentKs = 0.52;
  const now = Date.now();
  for (let i = 30; i >= 0; i--) {
    // slight random walk drift down
    currentAuc = currentAuc - (Math.random() * 0.005) + (Math.random() * 0.002);
    currentKs = currentKs - (Math.random() * 0.004) + (Math.random() * 0.001);

    await prisma.modelMetrics.create({
      data: {
        modelVersionId: v1.id,
        inferenceVolume: Math.floor(14000 + Math.random() * 1000),
        errorRate: 0.01 + Math.random() * 0.01,
        latencyP50: 110 + Math.random() * 20,
        latencyP99: 400 + Math.random() * 50,
        auc: currentAuc,
        ks: currentKs,
        psi: 0.02 + (30 - i) * 0.001, // PSI slowly creeps up
        loggedAt: new Date(now - i * 24 * 3600 * 1000),
        criticalFeatures: [
          { name: 'leverage_ratio', psi: 0.04 + (30 - i) * 0.001, status: 'OK' },
          { name: 'dti', psi: 0.10 + (30 - i) * 0.004, status: (30 - i) > 20 ? 'Warn' : 'OK' },
        ]
      }
    })
  }

  await prisma.modelMetrics.create({
    data: {
      modelVersionId: v2.id,
      inferenceVolume: 14500, errorRate: 0.018, latencyP50: 105, latencyP99: 390,
      auc: 0.84, ks: 0.47, psi: 0.04,
      criticalFeatures: [{ name: 'leverage_ratio', psi: 0.06, status: 'OK' }, { name: 'dti', psi: 0.19, status: 'OK' }]
    }
  })

  // â”€â”€ 6. Alerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await prisma.alert.createMany({
    data: [
      { severity: AlertSeverity.WARNING, message: 'DTI feature PSI: 0.22 â€” elevated drift detected', detail: 'Model v4.2.0 Â· Feature: dti Â· Action: monitor', createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000) },
      { severity: AlertSeverity.INFO, message: 'Shadow model v4.3.0 outperforms production on all metrics', detail: 'AUC delta: +0.02 Â· Consider promotion after 30-day observation', createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000) },
      { severity: AlertSeverity.CRITICAL, message: 'Apex Retail Holdings: SLA breach imminent', detail: 'REQ-2026-003 SLA expires in 2h. Escalate immediately.', createdAt: new Date() },
      { severity: AlertSeverity.WARNING, message: 'FALLBACK engine engaged during API timeout', detail: 'Python scoring cluster timeout. Fallback rule engine returned proxy score.', createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000) },
      { severity: AlertSeverity.CRITICAL, message: 'FALLBACK engine engaged (Model 503)', detail: 'Cluster offline. Fallback rule engine used for 14 decisions.', createdAt: new Date(Date.now() - 12 * 24 * 3600 * 1000) },
    ]
  })

  // â”€â”€ 7. Audit Events & Notifications & Documents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await prisma.auditEvent.createMany({
    data: [
      { eventType: 'PIPELINE_STAGE_CHANGED', entityType: 'Application', entityId: app2.id, actorId: analyst.id, previousValue: { stage: 'KYC_DATA_VAL' }, newValue: { stage: 'COMMITTEE_REVIEW' } },
      { eventType: 'DECISION_SUBMITTED', entityType: 'Decision', entityId: app1.id, actorId: analyst.id, previousValue: { status: 'PENDING' }, newValue: { status: 'APPROVE' } },
      { eventType: 'DECISION_SUBMITTED', entityType: 'Decision', entityId: app4.id, actorId: riskManager.id, previousValue: { status: 'PENDING' }, newValue: { status: 'REJECT' } },

      // Override Audit Event
      { eventType: 'DECISION_OVERRIDE', entityType: 'Decision', entityId: app2.id, actorId: cro.id, previousValue: { status: 'SEND_TO_REVIEW' }, newValue: { status: 'APPROVE', overrideReason: 'Strategic client in CEMAC region. Exceptions approved by regional CRO.' }, timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000) },

      // Fallback Engine Audits
      { eventType: 'FALLBACK_ENGINE_USED', entityType: 'System', entityId: 'sys-scoring', previousValue: { engine: 'PYTHON' }, newValue: { engine: 'FALLBACK', reason: 'Connection Timeout', affectedDecisions: 1 }, timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000) },
      { eventType: 'FALLBACK_ENGINE_USED', entityType: 'System', entityId: 'sys-scoring', previousValue: { engine: 'PYTHON' }, newValue: { engine: 'FALLBACK', reason: 'Service 503', affectedDecisions: 14 }, timestamp: new Date(Date.now() - 12 * 24 * 3600 * 1000) },

      // Degradation Timeline
      { eventType: 'MODEL_STATUS_CHANGED', entityType: 'ModelVersion', entityId: v1.id, actorId: admin.id, previousValue: { status: 'HEALTHY' }, newValue: { status: 'WARNING', psi: 0.11, reasons: ['PSI=0.11 exceeds WARNING threshold (0.10)'] }, timestamp: new Date(Date.now() - 8 * 24 * 3600 * 1000) },
      { eventType: 'MODEL_STATUS_CHANGED', entityType: 'ModelVersion', entityId: v1.id, actorId: admin.id, previousValue: { status: 'WARNING' }, newValue: { status: 'DEGRADED', psi: 0.26, reasons: ['PSI=0.26 exceeds CRITICAL threshold (0.25)'] }, timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000) },
    ]
  })

  // Notifications for the Client User
  await prisma.notification.createMany({
    data: [
      { userId: clientUser.id, title: 'Document Required', message: 'Please upload your Q1 2026 Management Accounts for application APP-2026-002.', type: 'action', isRead: false, appReqId: 'APP-2026-002' },
      { userId: clientUser.id, title: 'Committee Review Scheduled', message: 'Your application APP-2026-001 has been scheduled for committee review.', type: 'info', isRead: false, appReqId: 'APP-2026-001' },
      { userId: clientUser.id, title: 'Welcome to the Client Portal', message: 'Your account has been set up successfully.', type: 'success', isRead: true }
    ]
  })

  // Documents for the Client Counterparty
  await prisma.document.createMany({
    data: [
      { type: 'LEGAL', name: 'Articles of Incorporation', status: 'VALIDATED', isRequired: true, counterpartyId: cp2.id, applicationId: app2.id },
      { type: 'FINANCIAL', name: 'Audited Financial Statements 2024', status: 'VALIDATED', isRequired: true, counterpartyId: cp2.id, applicationId: app2.id },
      { type: 'FINANCIAL', name: 'Bank Statements (12 months)', status: 'VALIDATED', isRequired: true, counterpartyId: cp2.id, applicationId: app2.id },
      { type: 'FINANCIAL', name: 'Q1 2026 Management Accounts', status: 'REQUIRED', isRequired: true, counterpartyId: cp2.id, applicationId: app3.id },
      { type: 'LEGAL', name: 'Directors\' Resolution', status: 'VALIDATED', isRequired: true, counterpartyId: cp2.id, applicationId: app2.id },
      { type: 'BUSINESS', name: 'Business Plan 2026â€“2028', status: 'REQUIRED', isRequired: false, counterpartyId: cp2.id, applicationId: app3.id },
    ]
  })

  // â”€â”€ 8. Stress Scenario â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await prisma.scenario.create({
    data: {
      name: 'Adverse 2026 â€” CEMAC Shock',
      horizon: '12M',
      pdDelta: 2.1,
      expectedLoss: 47.5,
      rwaImpact: 380.0,
      parameters: { unemploymentShock: 3.5, creditSpreadBps: 200, realGDPGrowth: -1.2 }
    }
  })

  // â”€â”€ 9. Compliance Items (Dynamic) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await prisma.complianceItem.createMany({
    data: [
      {
        label: 'IFRS 9 Staging Logic',
        status: 'COMPLIANT',
        detail: 'Validated against COBAC Circular No. 01/2022. 3-stage impairment model active.',
        referenceDoc: 'COBAC Circular No. 01/2022',
        lastValidated: new Date('2026-03-15'),
        dueDate: new Date('2026-09-15'),
        sortOrder: 1,
      },
      {
        label: 'Basel III Capital Buffers',
        status: 'COMPLIANT',
        detail: 'CET1 ratio at 14.2% (minimum 8%). Conservation buffer: 2.5% maintained.',
        referenceDoc: 'Basel III Framework, BIS 2023',
        lastValidated: new Date('2026-03-01'),
        dueDate: new Date('2026-12-01'),
        sortOrder: 2,
      },
      {
        label: 'MRM Governance Policy',
        status: 'REVIEW',
        detail: 'Annual model review due in 47 days. Champion/Challenger results pending validation.',
        referenceDoc: 'Internal MRM Charter v1.4',
        lastValidated: new Date('2025-12-01'),
        dueDate: new Date('2026-06-01'),
        sortOrder: 3,
      },
      {
        label: 'Explainability (XAI / SHAP)',
        status: 'COMPLIANT',
        detail: 'SHAP v0.45 integrated. All model outputs include XAI driver attribution.',
        referenceDoc: 'EBA Guidelines on ML Explainability',
        lastValidated: new Date('2026-02-28'),
        sortOrder: 4,
      },
      {
        label: 'Data Lineage & Quality',
        status: 'REVIEW',
        detail: 'Data lineage tracking active. 14 LEI records missing â€” escalated to Data Governance.',
        sortOrder: 5,
      },
      {
        label: 'COBAC Prudential Reporting',
        status: 'COMPLIANT',
        detail: 'Q1 2026 COBAC submission completed. Next: Q2 2026.',
        referenceDoc: 'COBAC RÃ¨glement No. 01/03',
        lastValidated: new Date('2026-04-01'),
        dueDate: new Date('2026-07-01'),
        sortOrder: 6,
      },
    ]
  })

  // â”€â”€ 10. Tech Documents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await prisma.techDocument.createMany({
    data: [
      {
        name: 'IFRS 9 Model Methodology',
        version: 'v3.2',
        fileType: 'pdf',
        description: 'Full IFRS 9 ECL methodology documentation including staging rules and forward-looking adjustments.',
        isPublic: false,
      },
      {
        name: 'MRM Governance Charter',
        version: 'v1.4',
        fileType: 'pdf',
        description: 'Model Risk Management governance policy. Covers model lifecycle, validation, and approval process.',
        isPublic: false,
      },
      {
        name: 'PD Model Source Code (LightGBM)',
        version: 'v4.2.1',
        fileType: 'py',
        description: 'Source code for the Production PD Model. Available for regulatory inspection.',
        isPublic: false,
      },
      {
        name: 'Audit Charter 2026',
        version: 'Final',
        fileType: 'doc',
        description: 'Annual audit charter defining scope, obligations, and risk appetite.',
        isPublic: false,
      },
    ]
  })

  // â”€â”€ 11. Admin Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await prisma.adminSetting.createMany({
    skipDuplicates: true,
    data: [
      { key: 'xai_visibility', value: 'FULL', label: 'XAI Driver Visibility', group: 'scoring_policy' },
      { key: 'auto_approve_enabled', value: 'true', label: 'Auto-Approve Enabled', group: 'scoring_policy' },
      { key: 'auto_approve_max_pd', value: '0.5', label: 'Auto-Approve Max PD (%)', group: 'scoring_policy' },
      { key: 'auto_reject_min_pd', value: '6.0', label: 'Auto-Reject Min PD (%)', group: 'scoring_policy' },
      { key: 'review_min_exposure', value: '100', label: 'Escalation Threshold ($M)', group: 'scoring_policy' },
      { key: 'alert_threshold', value: 'HIGH', label: 'Alert Severity Threshold', group: 'notifications' },
      { key: 'maintenance_mode', value: 'false', label: 'Maintenance Mode', group: 'system' },
      { key: 'scoring_service_url', value: 'http://localhost:8000', label: 'Scoring Service URL', group: 'integrations' },
    ]
  })

  console.log('âœ… MLOps, Alerts, Audit events, Scenarios, Compliance, Admin settings seeded')
  console.log('\nðŸŽ‰ Database seeded successfully!\n')
  console.log('Demo login credentials:')
  console.log('  Internal â†’ analyst@riskengine.com / Demo@2026!')
  console.log('  Internal â†’ cro@riskengine.com / Demo@2026!')
  console.log('  Client   â†’ tom.eriksen@glp-group.com / Demo@2026!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
