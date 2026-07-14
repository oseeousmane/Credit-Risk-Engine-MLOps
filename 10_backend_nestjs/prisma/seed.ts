import {
  PrismaClient, Role, RiskRating, RiskLevel, IFRS9Stage,
  PipelineStage, DecisionStatus, AlertSeverity, ModelStatus,
  LifecycleStatus, DeploymentStatus, ArtifactCategory, ComplianceStatus,
  BorrowerSegment, BorrowerStatus, MicroLoanProductType,
  MicroLoanApplicationStatus, RepaymentFrequency, LoanOfferStatus,
  ScorecardRecommendation, ConsentSourceType, ConsentPurpose,
  ConsentStatus, ConsentCaptureChannel, PolicyStatus,
} from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const hashPw = (p: string) => bcrypt.hash(p, 12)
const ago  = (d: number) => new Date(Date.now() - d * 86_400_000)
const ahead = (d: number) => new Date(Date.now() + d * 86_400_000)

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Seed bloqué en production.'); process.exit(1)
  }
  console.log('🌱 Seeding CEMAC institutional risk database…')

  // ── 0. Clean ────────────────────────────────────────────────────────────────
  // Clear circular refs before bulk delete
  await prisma.user.updateMany({ data: { counterpartyId: null } })
  await prisma.counterparty.updateMany({ data: { analystId: null } })

  await prisma.shadowScoreLog.deleteMany()
  await prisma.ifrs9StagingAudit.deleteMany()
  await prisma.modelMetrics.deleteMany()
  await prisma.modelVersion.deleteMany()
  await prisma.modelRegistry.deleteMany()
  await prisma.alert.deleteMany()
  await prisma.scenario.deleteMany()
  await prisma.auditEvent.deleteMany()
  await prisma.document.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.decision.deleteMany()
  await prisma.application.deleteMany()
  await prisma.exposure.deleteMany()
  await prisma.complianceItem.deleteMany()
  await prisma.techDocument.deleteMany()
  await prisma.adminSetting.deleteMany()

  // Microfinance hierarchy (reverse FK order)
  await prisma.collectionAction.deleteMany()
  await prisma.delinquencyEvent.deleteMany()
  await prisma.repaymentEvent.deleteMany()
  await prisma.repaymentSchedule.deleteMany()
  await prisma.alternativeDataFeatureSnapshot.deleteMany()
  await prisma.mobileMoneySnapshot.deleteMany()
  await prisma.disbursement.deleteMany()
  await prisma.loanAccount.deleteMany()
  await prisma.decisionReason.deleteMany()
  await prisma.loanOffer.deleteMany()
  await prisma.microLoanDecision.deleteMany()
  await prisma.thinFileScorecard.deleteMany()
  await prisma.guarantor.deleteMany()
  await prisma.fieldVisit.deleteMany()
  await prisma.productPolicySnapshot.deleteMany()
  await prisma.microLoanApplication.deleteMany()
  await prisma.consentGrant.deleteMany()
  await prisma.informalBusinessProfile.deleteMany()
  await prisma.groupMembership.deleteMany()
  await prisma.retailBorrower.deleteMany()
  await prisma.microLoanPolicy.deleteMany()
  await prisma.fairnessMetric.deleteMany()

  await prisma.counterparty.deleteMany()
  await prisma.user.deleteMany()
  console.log('🗑️  Base nettoyée')

  // ── 1. Utilisateurs internes ─────────────────────────────────────────────────
  const pw = await hashPw('Demo@2026')
  const analyst  = await prisma.user.create({ data: { email: 'analyst@riskengine.com',  name: 'Kofi Mensah',           passwordHash: pw, role: Role.ANALYST  } })
  const manager  = await prisma.user.create({ data: { email: 'manager@riskengine.com',  name: 'Isabelle Nkemdirim',    passwordHash: pw, role: Role.MANAGER  } })
  const cro      = await prisma.user.create({ data: { email: 'cro@riskengine.com',      name: 'Dr. Alain Kouassi',     passwordHash: pw, role: Role.CRO      } })
  const admin    = await prisma.user.create({ data: { email: 'admin@riskengine.com',    name: 'Système ORE',           passwordHash: pw, role: Role.ADMIN    } })
  const clientU  = await prisma.user.create({ data: { email: 'amadou.traore@ondomveco.ga', name: 'Amadou Traoré',      passwordHash: pw, role: Role.CLIENT   } })
  console.log('✅ 5 utilisateurs créés')

  // ── 2. Contreparties CEMAC (20) ──────────────────────────────────────────────
  // Montants en millions USD équivalent (compatibles format $M du frontend)
  const mkCp = (data: Parameters<typeof prisma.counterparty.create>[0]['data']) =>
    prisma.counterparty.create({ data })

  const cpSABC = await mkCp({
    lei: 'CM5493001SABC84DD0CM', name: 'Société Anonyme des Brasseries du Cameroun (SABC)',
    sector: 'Industrie & Boissons', geography: 'Cameroun', industry: 'Brasserie & boissons',
    internalRating: RiskRating.BBB_PLUS, riskLevel: RiskLevel.LOW, ifrs9Stage: IFRS9Stage.STAGE_1,
    yearsInBusiness: 68,
    revenue: 320, ebitda: 88, netProfit: 54, totalAssets: 480, totalDebt: 115,
    operatingCashFlow: 72, currentRatio: 1.85, leverageRatio: 1.31, inventoryTurnover: 6.4,
    daysPastDue: 0, missedPayments24m: 0, creditHistoryYears: 35, bureauScore: 795,
    exposure: 45, expLimit: 75, pd1y: 0.45, expectedLoss: 0.20, facilityUtilization: 60,
    analystId: analyst.id,
    exposures: { create: [{ amount: 30, facilityType: 'Prêt à terme 5 ans', currency: 'XAF' }, { amount: 15, facilityType: 'Ligne revolving', currency: 'XAF' }] },
  })

  const cpMTN = await mkCp({
    lei: 'CM5493002MTN84DD0CM1', name: 'MTN Cameroun S.A.',
    sector: 'Télécommunications', geography: 'Cameroun', industry: 'Télécoms mobiles',
    internalRating: RiskRating.A_MINUS, riskLevel: RiskLevel.LOW, ifrs9Stage: IFRS9Stage.STAGE_1,
    yearsInBusiness: 26,
    revenue: 510, ebitda: 175, netProfit: 95, totalAssets: 720, totalDebt: 180,
    operatingCashFlow: 148, currentRatio: 1.62, leverageRatio: 1.03,
    daysPastDue: 0, missedPayments24m: 0, creditHistoryYears: 20, bureauScore: 812,
    exposure: 80, expLimit: 120, pd1y: 0.35, expectedLoss: 0.28, facilityUtilization: 67,
    analystId: analyst.id,
    exposures: { create: [{ amount: 50, facilityType: 'Facilité infrastructure réseau', currency: 'XAF' }, { amount: 30, facilityType: 'Ligne financement capex', currency: 'XAF' }] },
  })

  const cpOrange = await mkCp({
    lei: 'CM5493003ORANGE0ZWT1', name: 'Orange Cameroun S.A.',
    sector: 'Télécommunications', geography: 'Cameroun', industry: 'Télécoms mobiles & data',
    internalRating: RiskRating.BBB_PLUS, riskLevel: RiskLevel.LOW, ifrs9Stage: IFRS9Stage.STAGE_1,
    yearsInBusiness: 24,
    revenue: 380, ebitda: 120, netProfit: 62, totalAssets: 580, totalDebt: 140,
    operatingCashFlow: 105, currentRatio: 1.55, leverageRatio: 1.17,
    daysPastDue: 0, missedPayments24m: 0, creditHistoryYears: 18, bureauScore: 788,
    exposure: 60, expLimit: 100, pd1y: 0.42, expectedLoss: 0.25, facilityUtilization: 60,
    analystId: analyst.id,
    exposures: { create: [{ amount: 40, facilityType: 'Prêt à terme 5 ans', currency: 'XAF' }, { amount: 20, facilityType: 'Facilité de caisse', currency: 'XAF' }] },
  })

  const cpTotal = await mkCp({
    lei: 'GA5493004TOTAL0ZWT4G', name: 'TotalEnergies EP Gabon',
    sector: 'Pétrole & Gaz', geography: 'Gabon', industry: 'Exploration-Production offshore',
    internalRating: RiskRating.A_PLUS, riskLevel: RiskLevel.LOW, ifrs9Stage: IFRS9Stage.STAGE_1,
    yearsInBusiness: 55,
    revenue: 1850, ebitda: 620, netProfit: 380, totalAssets: 3200, totalDebt: 480,
    operatingCashFlow: 540, currentRatio: 2.10, leverageRatio: 0.77,
    daysPastDue: 0, missedPayments24m: 0, creditHistoryYears: 45, bureauScore: 835,
    exposure: 120, expLimit: 200, pd1y: 0.18, expectedLoss: 0.22, facilityUtilization: 60,
    analystId: manager.id,
    exposures: { create: [{ amount: 80, facilityType: 'Financement de projet pétrolier', currency: 'XAF' }, { amount: 40, facilityType: 'Ligne opérationnelle', currency: 'XAF' }] },
  })

  const cpBGFI = await mkCp({
    lei: 'GA5493005BGFI84DD0GA', name: 'BGFI Bank Corporation S.A.',
    sector: 'Banque & Finance', geography: 'Gabon', industry: 'Banque commerciale panafricaine',
    internalRating: RiskRating.BBB_PLUS, riskLevel: RiskLevel.LOW, ifrs9Stage: IFRS9Stage.STAGE_1,
    yearsInBusiness: 30,
    revenue: 220, ebitda: 95, netProfit: 48, totalAssets: 4200, totalDebt: 3600,
    operatingCashFlow: 82, currentRatio: 1.18, leverageRatio: 37.9,
    daysPastDue: 0, missedPayments24m: 0, creditHistoryYears: 28, bureauScore: 801,
    exposure: 35, expLimit: 60, pd1y: 0.55, expectedLoss: 0.19, facilityUtilization: 58,
    analystId: manager.id,
    exposures: { create: [{ amount: 35, facilityType: 'Ligne interbancaire sénior', currency: 'XAF' }] },
  })

  const cpCIMEN = await mkCp({
    lei: 'CM5493006CIMENCAM0CM', name: 'CIMENCAM S.A. (Cimenteries du Cameroun)',
    sector: 'Construction & BTP', geography: 'Cameroun', industry: 'Fabrication de ciment',
    internalRating: RiskRating.BBB, riskLevel: RiskLevel.LOW, ifrs9Stage: IFRS9Stage.STAGE_1,
    yearsInBusiness: 55,
    revenue: 180, ebitda: 52, netProfit: 28, totalAssets: 320, totalDebt: 95,
    operatingCashFlow: 44, currentRatio: 1.72, leverageRatio: 1.83, inventoryTurnover: 5.2,
    daysPastDue: 0, missedPayments24m: 0, creditHistoryYears: 40, bureauScore: 775,
    exposure: 38, expLimit: 65, pd1y: 0.78, expectedLoss: 0.30, facilityUtilization: 58,
    analystId: analyst.id,
    exposures: { create: [{ amount: 25, facilityType: 'Prêt équipement industriel', currency: 'XAF' }, { amount: 13, facilityType: 'Facilité de caisse', currency: 'XAF' }] },
  })

  const cpPort = await mkCp({
    lei: 'CM5493007PAD84DD0CM2', name: 'Port Autonome de Douala (PAD)',
    sector: 'Transport & Logistique', geography: 'Cameroun', industry: 'Infrastructure portuaire',
    internalRating: RiskRating.BBB_MINUS, riskLevel: RiskLevel.MED, ifrs9Stage: IFRS9Stage.STAGE_1,
    yearsInBusiness: 72,
    revenue: 145, ebitda: 60, netProfit: 32, totalAssets: 580, totalDebt: 190,
    operatingCashFlow: 52, currentRatio: 1.32, leverageRatio: 3.17,
    daysPastDue: 8, missedPayments24m: 0, creditHistoryYears: 30, bureauScore: 762,
    exposure: 55, expLimit: 80, pd1y: 0.95, expectedLoss: 0.52, facilityUtilization: 69,
    analystId: analyst.id,
    exposures: { create: [{ amount: 40, facilityType: 'Financement dragages & infrastructure', currency: 'XAF' }, { amount: 15, facilityType: 'Caution bancaire', currency: 'XAF' }] },
  })

  const cpPERENco = await mkCp({
    lei: 'CM5493008PERENCO0CM1', name: 'PERENCO Cameroun',
    sector: 'Pétrole & Gaz', geography: 'Cameroun', industry: 'Exploration-Production offshore',
    internalRating: RiskRating.BBB_PLUS, riskLevel: RiskLevel.LOW, ifrs9Stage: IFRS9Stage.STAGE_1,
    yearsInBusiness: 28,
    revenue: 680, ebitda: 240, netProfit: 145, totalAssets: 1250, totalDebt: 280,
    operatingCashFlow: 210, currentRatio: 1.90, leverageRatio: 1.17,
    daysPastDue: 0, missedPayments24m: 0, creditHistoryYears: 22, bureauScore: 805,
    exposure: 90, expLimit: 150, pd1y: 0.48, expectedLoss: 0.43, facilityUtilization: 60,
    analystId: manager.id,
    exposures: { create: [{ amount: 60, facilityType: 'Reserve-based lending', currency: 'XAF' }, { amount: 30, facilityType: 'Ligne exploration', currency: 'XAF' }] },
  })

  const cpSNH = await mkCp({
    lei: 'CM5493009SNH84DD0CM1', name: 'Société Nationale des Hydrocarbures (SNH)',
    sector: 'Pétrole & Gaz', geography: 'Cameroun', industry: 'Compagnie pétrolière nationale',
    internalRating: RiskRating.BBB_PLUS, riskLevel: RiskLevel.LOW, ifrs9Stage: IFRS9Stage.STAGE_1,
    yearsInBusiness: 45,
    revenue: 2100, ebitda: 780, netProfit: 420, totalAssets: 5800, totalDebt: 620,
    operatingCashFlow: 680, currentRatio: 1.75, leverageRatio: 0.79,
    daysPastDue: 0, missedPayments24m: 0, creditHistoryYears: 40, bureauScore: 825,
    exposure: 150, expLimit: 250, pd1y: 0.62, expectedLoss: 0.93, facilityUtilization: 60,
    analystId: manager.id,
    exposures: { create: [{ amount: 100, facilityType: 'Garantie souveraine', currency: 'XAF' }, { amount: 50, facilityType: 'Facilité de pont', currency: 'XAF' }] },
  })

  const cpAFB = await mkCp({
    lei: 'CM5493010AFB84DD0CM1', name: 'Afriland First Bank S.A.',
    sector: 'Banque & Finance', geography: 'Cameroun', industry: 'Banque commerciale & développement',
    internalRating: RiskRating.BBB_MINUS, riskLevel: RiskLevel.MED, ifrs9Stage: IFRS9Stage.STAGE_1,
    yearsInBusiness: 38,
    revenue: 155, ebitda: 68, netProfit: 32, totalAssets: 2900, totalDebt: 2500,
    operatingCashFlow: 58, currentRatio: 1.12, leverageRatio: 36.8,
    daysPastDue: 0, missedPayments24m: 0, creditHistoryYears: 32, bureauScore: 770,
    exposure: 28, expLimit: 50, pd1y: 0.88, expectedLoss: 0.25, facilityUtilization: 56,
    analystId: analyst.id,
    exposures: { create: [{ amount: 28, facilityType: 'Ligne interbancaire sénior', currency: 'XAF' }] },
  })

  // Speculative grade (Stage 2 / watchlist)
  const cpSODE = await mkCp({
    lei: 'CM5493011SODECOTON0C', name: 'SODECOTON (Sté Développement du Coton)',
    sector: 'Agro-industrie', geography: 'Cameroun', industry: 'Égrenage coton & intrants agricoles',
    internalRating: RiskRating.BB_PLUS, riskLevel: RiskLevel.MED, ifrs9Stage: IFRS9Stage.STAGE_2, watchlistFlag: true,
    yearsInBusiness: 55,
    revenue: 95, ebitda: 18, netProfit: 4.5, totalAssets: 180, totalDebt: 85,
    operatingCashFlow: 12, currentRatio: 1.18, leverageRatio: 4.72, inventoryTurnover: 3.8,
    daysPastDue: 15, missedPayments24m: 1, creditHistoryYears: 28, bureauScore: 645,
    exposure: 22, expLimit: 35, pd1y: 2.15, expectedLoss: 0.47, facilityUtilization: 63,
    analystId: analyst.id,
    exposures: { create: [{ amount: 22, facilityType: 'Crédit campagne coton', currency: 'XAF' }] },
  })

  const cpSOCA = await mkCp({
    lei: 'CM5493012SOCAPALM0CM', name: 'SOCAPALM (Sté Camerounaise de Palmeraies)',
    sector: 'Agro-industrie', geography: 'Cameroun', industry: 'Hévéaculture & huile de palme',
    internalRating: RiskRating.BB, riskLevel: RiskLevel.MED, ifrs9Stage: IFRS9Stage.STAGE_2, watchlistFlag: true,
    yearsInBusiness: 48,
    revenue: 72, ebitda: 12, netProfit: 2.1, totalAssets: 145, totalDebt: 78,
    operatingCashFlow: 8.5, currentRatio: 1.05, leverageRatio: 6.5, inventoryTurnover: 4.2,
    daysPastDue: 22, missedPayments24m: 2, creditHistoryYears: 25, bureauScore: 612,
    exposure: 18, expLimit: 25, pd1y: 3.20, expectedLoss: 0.58, facilityUtilization: 72,
    analystId: analyst.id,
    exposures: { create: [{ amount: 18, facilityType: 'Prêt de consolidation', currency: 'XAF' }] },
  })

  const cpCICAM = await mkCp({
    lei: 'CM5493013CICAM84DD0C', name: 'CICAM S.A. (Cotonnière Industrielle du Cameroun)',
    sector: 'Industrie Textile', geography: 'Cameroun', industry: 'Filature & tissage industriel',
    internalRating: RiskRating.BB_PLUS, riskLevel: RiskLevel.HIGH, ifrs9Stage: IFRS9Stage.STAGE_2, watchlistFlag: true,
    yearsInBusiness: 62,
    revenue: 42, ebitda: 6.5, netProfit: -1.2, totalAssets: 95, totalDebt: 58,
    operatingCashFlow: 3.8, currentRatio: 0.92, leverageRatio: 8.92, inventoryTurnover: 3.1,
    daysPastDue: 35, missedPayments24m: 3, creditHistoryYears: 30, bureauScore: 582,
    exposure: 12, expLimit: 15, pd1y: 4.50, expectedLoss: 0.54, facilityUtilization: 80,
    analystId: manager.id,
    exposures: { create: [{ amount: 12, facilityType: 'Ligne fonds de roulement', currency: 'XAF' }] },
  })

  const cpCAMTEL = await mkCp({
    lei: 'CM5493014CAMTEL0ZWT4', name: 'CAMTEL (Cameroon Telecommunications)',
    sector: 'Télécommunications', geography: 'Cameroun', industry: 'Téléphonie fixe & internet national',
    internalRating: RiskRating.BB_PLUS, riskLevel: RiskLevel.MED, ifrs9Stage: IFRS9Stage.STAGE_2,
    yearsInBusiness: 30,
    revenue: 88, ebitda: 15, netProfit: 0.8, totalAssets: 380, totalDebt: 195,
    operatingCashFlow: 10.5, currentRatio: 1.08, leverageRatio: 13.0,
    daysPastDue: 18, missedPayments24m: 1, creditHistoryYears: 20, bureauScore: 638,
    exposure: 25, expLimit: 40, pd1y: 2.80, expectedLoss: 0.70, facilityUtilization: 63,
    analystId: manager.id,
    exposures: { create: [{ amount: 25, facilityType: 'Prêt modernisation réseau', currency: 'XAF' }] },
  })

  const cpGOC = await mkCp({
    lei: 'GA5493015GOC84DD0GA1', name: 'Gabon Oil Company (GOC)',
    sector: 'Pétrole & Gaz', geography: 'Gabon', industry: 'Compagnie nationale pétrolière gabonaise',
    internalRating: RiskRating.BBB_MINUS, riskLevel: RiskLevel.MED, ifrs9Stage: IFRS9Stage.STAGE_1,
    yearsInBusiness: 18,
    revenue: 420, ebitda: 145, netProfit: 65, totalAssets: 980, totalDebt: 380,
    operatingCashFlow: 122, currentRatio: 1.40, leverageRatio: 2.62,
    daysPastDue: 5, missedPayments24m: 0, creditHistoryYears: 12, bureauScore: 755,
    exposure: 48, expLimit: 80, pd1y: 1.10, expectedLoss: 0.53, facilityUtilization: 60,
    analystId: manager.id,
    exposures: { create: [{ amount: 48, facilityType: 'Bridge facility champ Rabi', currency: 'XAF' }] },
  })

  const cpCOTCO = await mkCp({
    lei: 'TD5493016COTCO84DD0T', name: 'COTCO (Cameroon Oil Transportation Company)',
    sector: 'Pétrole & Gaz', geography: 'Cameroun / Tchad', industry: 'Transport pétrole par oléoduc',
    internalRating: RiskRating.BBB, riskLevel: RiskLevel.LOW, ifrs9Stage: IFRS9Stage.STAGE_1,
    yearsInBusiness: 24,
    revenue: 285, ebitda: 130, netProfit: 72, totalAssets: 1480, totalDebt: 420,
    operatingCashFlow: 115, currentRatio: 1.60, leverageRatio: 3.23,
    daysPastDue: 0, missedPayments24m: 0, creditHistoryYears: 20, bureauScore: 778,
    exposure: 65, expLimit: 110, pd1y: 0.90, expectedLoss: 0.59, facilityUtilization: 59,
    analystId: manager.id,
    exposures: { create: [{ amount: 65, facilityType: 'Financement infrastructure pipeline', currency: 'XAF' }] },
  })

  const cpSOSUCAM = await mkCp({
    lei: 'CM5493017SOSUCAM0CM1', name: 'SOSUCAM (Sté Sucrière du Cameroun)',
    sector: 'Agro-industrie', geography: 'Cameroun', industry: 'Sucrerie & raffinerie',
    internalRating: RiskRating.BB, riskLevel: RiskLevel.MED, ifrs9Stage: IFRS9Stage.STAGE_2, watchlistFlag: true,
    yearsInBusiness: 52,
    revenue: 65, ebitda: 8, netProfit: -2.5, totalAssets: 120, totalDebt: 72,
    operatingCashFlow: 5.2, currentRatio: 0.98, leverageRatio: 9.0, inventoryTurnover: 5.8,
    daysPastDue: 28, missedPayments24m: 2, creditHistoryYears: 22, bureauScore: 598,
    exposure: 10, expLimit: 15, pd1y: 3.80, expectedLoss: 0.38, facilityUtilization: 67,
    analystId: analyst.id,
    exposures: { create: [{ amount: 10, facilityType: 'Restructuration dette', currency: 'XAF' }] },
  })

  // Distressed (Stage 3)
  const cpSONARA = await mkCp({
    lei: 'CM5493018SONARA0ZWT3', name: 'SONARA (Société Nationale de Raffinage)',
    sector: 'Pétrole & Gaz', geography: 'Cameroun', industry: 'Raffinage du pétrole brut',
    internalRating: RiskRating.B, riskLevel: RiskLevel.CRITICAL, ifrs9Stage: IFRS9Stage.STAGE_3, watchlistFlag: true,
    yearsInBusiness: 46,
    revenue: 320, ebitda: -25, netProfit: -85, totalAssets: 580, totalDebt: 480,
    operatingCashFlow: -18, currentRatio: 0.62, leverageRatio: -19.2,
    daysPastDue: 92, missedPayments24m: 6, creditHistoryYears: 35, bureauScore: 420,
    exposure: 185, expLimit: 185, pd1y: 8.90, expectedLoss: 16.47, facilityUtilization: 100,
    analystId: manager.id,
    exposures: { create: [{ amount: 120, facilityType: 'Prêt restructuration senior sécurisé', currency: 'XAF' }, { amount: 65, facilityType: 'Billets trésorerie garantis', currency: 'XAF' }] },
  })

  const cpICC = await mkCp({
    lei: 'CM5493019ICC84DD0CM1', name: 'Industries Chimiques du Cameroun (ICC)',
    sector: 'Industrie Chimique', geography: 'Cameroun', industry: 'Produits chimiques industriels',
    internalRating: RiskRating.CCC, riskLevel: RiskLevel.CRITICAL, ifrs9Stage: IFRS9Stage.STAGE_3, watchlistFlag: true,
    yearsInBusiness: 35,
    revenue: 28, ebitda: -8, netProfit: -22, totalAssets: 85, totalDebt: 95,
    operatingCashFlow: -12, currentRatio: 0.48, leverageRatio: -11.9,
    daysPastDue: 180, missedPayments24m: 8, creditHistoryYears: 18, bureauScore: 295,
    exposure: 42, expLimit: 42, pd1y: 12.50, expectedLoss: 5.25, facilityUtilization: 100,
    analystId: manager.id,
    exposures: { create: [{ amount: 42, facilityType: 'Exposition restructurée Stage 3', currency: 'XAF' }] },
  })

  // Client counterparty (portail)
  const cpOndo = await mkCp({
    lei: 'GA5493020ONDO84DD0GA', name: 'Groupe Ondo Commerce S.A.',
    sector: 'Commerce & Distribution', geography: 'Gabon / CEMAC', industry: 'Import-export, grande distribution',
    internalRating: RiskRating.A, riskLevel: RiskLevel.MED, ifrs9Stage: IFRS9Stage.STAGE_1,
    yearsInBusiness: 18,
    revenue: 115, ebitda: 22, netProfit: 9.5, totalAssets: 195, totalDebt: 68,
    operatingCashFlow: 18, currentRatio: 1.45, leverageRatio: 3.09, inventoryTurnover: 7.2,
    daysPastDue: 5, missedPayments24m: 0, creditHistoryYears: 12, bureauScore: 710,
    exposure: 15, expLimit: 30, pd1y: 1.25, expectedLoss: 0.19, facilityUtilization: 50,
    analystId: analyst.id,
    exposures: { create: [{ amount: 10, facilityType: 'Ligne crédit documentaire', currency: 'XAF' }, { amount: 5, facilityType: 'Facilité de caisse', currency: 'XAF' }] },
  })

  await prisma.user.update({ where: { id: clientU.id }, data: { counterpartyId: cpOndo.id } })
  console.log('✅ 20 contreparties CEMAC créées')

  // ── 3. Applications pipeline (25) ────────────────────────────────────────────
  // SUBMITTED (3)
  const appS1 = await prisma.application.create({ data: { reqId: 'REQ-2026-001', requestedAmount: 15, priority: false, slaDeadline: ahead(10), facilityType: 'TERM_LOAN', tenorMonths: 36, interestRate: 8.5, collateralValue: 20, collateralType: 'REAL_ESTATE', repaymentSource: 'CASH_FLOW', amortizationType: 'LINEAR', currentStage: PipelineStage.SUBMITTED, pd: 0, counterpartyId: cpSABC.id, ownerId: analyst.id } })
  const appS2 = await prisma.application.create({ data: { reqId: 'REQ-2026-002', requestedAmount: 8, priority: false, slaDeadline: ahead(12), facilityType: 'REVOLVER', tenorMonths: 12, currentStage: PipelineStage.SUBMITTED, pd: 0, counterpartyId: cpCICAM.id, ownerId: analyst.id } })
  const appS3 = await prisma.application.create({ data: { reqId: 'REQ-2026-003', requestedAmount: 30, priority: true, slaDeadline: ahead(7), facilityType: 'TERM_LOAN', tenorMonths: 60, currentStage: PipelineStage.SUBMITTED, pd: 0, counterpartyId: cpGOC.id, ownerId: analyst.id } })

  // DOCUMENTS_PENDING (3)
  const appDP1 = await prisma.application.create({ data: { reqId: 'REQ-2026-004', requestedAmount: 20, priority: false, slaDeadline: ahead(8), facilityType: 'TERM_LOAN', tenorMonths: 48, collateralValue: 28, collateralType: 'EQUIPMENT', currentStage: PipelineStage.DOCUMENTS_PENDING, pd: 0, counterpartyId: cpCIMEN.id, ownerId: analyst.id } })
  const appDP2 = await prisma.application.create({ data: { reqId: 'REQ-2026-005', requestedAmount: 12, priority: false, slaDeadline: ahead(5), facilityType: 'CREDIT_LINE', tenorMonths: 24, currentStage: PipelineStage.DOCUMENTS_PENDING, pd: 0, counterpartyId: cpSODE.id, ownerId: analyst.id } })
  const appDP3 = await prisma.application.create({ data: { reqId: 'REQ-2026-006', requestedAmount: 45, priority: true, slaDeadline: ahead(3), facilityType: 'TERM_LOAN', tenorMonths: 84, currentStage: PipelineStage.DOCUMENTS_PENDING, pd: 0, counterpartyId: cpCOTCO.id, ownerId: manager.id } })

  // DOCUMENTS_VALIDATED (2)
  const appDV1 = await prisma.application.create({ data: { reqId: 'REQ-2026-007', requestedAmount: 25, priority: false, slaDeadline: ahead(9), facilityType: 'TERM_LOAN', tenorMonths: 60, collateralValue: 32, collateralType: 'REAL_ESTATE', currentStage: PipelineStage.DOCUMENTS_VALIDATED, pd: 0, counterpartyId: cpPort.id, ownerId: analyst.id } })
  const appDV2 = await prisma.application.create({ data: { reqId: 'REQ-2026-008', requestedAmount: 18, priority: false, slaDeadline: ahead(6), facilityType: 'REVOLVER', tenorMonths: 18, currentStage: PipelineStage.DOCUMENTS_VALIDATED, pd: 0, counterpartyId: cpSOCA.id, ownerId: analyst.id } })

  // SCORED (3)
  const appSC1 = await prisma.application.create({ data: { reqId: 'REQ-2026-009', requestedAmount: 50, priority: true, slaDeadline: ahead(4), facilityType: 'TERM_LOAN', tenorMonths: 72, collateralValue: 65, collateralType: 'REAL_ESTATE', currentStage: PipelineStage.SCORED, pd: 0.48, pdAtOrigination: 0.48, counterpartyId: cpPERENco.id, ownerId: analyst.id } })
  const appSC2 = await prisma.application.create({ data: { reqId: 'REQ-2026-010', requestedAmount: 22, priority: false, slaDeadline: ahead(6), facilityType: 'CREDIT_LINE', tenorMonths: 24, currentStage: PipelineStage.SCORED, pd: 2.15, pdAtOrigination: 2.15, counterpartyId: cpCAMTEL.id, ownerId: analyst.id } })
  const appSC3 = await prisma.application.create({ data: { reqId: 'REQ-2026-011', requestedAmount: 10, priority: false, slaDeadline: ahead(5), facilityType: 'TERM_LOAN', tenorMonths: 36, currentStage: PipelineStage.SCORED, pd: 3.80, pdAtOrigination: 3.80, counterpartyId: cpSOSUCAM.id, ownerId: analyst.id } })

  // ANALYST_REVIEW (3)
  const appAR1 = await prisma.application.create({ data: { reqId: 'REQ-2026-012', requestedAmount: 35, priority: false, slaDeadline: ahead(7), facilityType: 'TERM_LOAN', tenorMonths: 60, collateralValue: 48, collateralType: 'REAL_ESTATE', currentStage: PipelineStage.ANALYST_REVIEW, pd: 0.42, pdAtOrigination: 0.42, counterpartyId: cpOrange.id, ownerId: analyst.id } })
  const appAR2 = await prisma.application.create({ data: { reqId: 'REQ-2026-013', requestedAmount: 28, priority: false, slaDeadline: ahead(8), facilityType: 'REVOLVER', tenorMonths: 36, currentStage: PipelineStage.ANALYST_REVIEW, pd: 0.88, pdAtOrigination: 0.88, counterpartyId: cpAFB.id, ownerId: analyst.id } })
  const appAR3 = await prisma.application.create({ data: { reqId: 'REQ-2026-014', requestedAmount: 8, priority: false, slaDeadline: ahead(6), facilityType: 'CREDIT_LINE', tenorMonths: 12, currentStage: PipelineStage.ANALYST_REVIEW, pd: 4.50, pdAtOrigination: 4.50, counterpartyId: cpCICAM.id, ownerId: analyst.id } })

  // MANAGER_REVIEW (2)
  const appMR1 = await prisma.application.create({ data: { reqId: 'REQ-2026-015', requestedAmount: 75, priority: true, slaDeadline: ahead(3), facilityType: 'TERM_LOAN', tenorMonths: 84, collateralValue: 90, collateralType: 'REAL_ESTATE', currentStage: PipelineStage.MANAGER_REVIEW, pd: 0.55, pdAtOrigination: 0.55, counterpartyId: cpBGFI.id, ownerId: manager.id } })
  const appMR2 = await prisma.application.create({ data: { reqId: 'REQ-2026-016', requestedAmount: 40, priority: false, slaDeadline: ahead(5), facilityType: 'TERM_LOAN', tenorMonths: 60, currentStage: PipelineStage.MANAGER_REVIEW, pd: 1.10, pdAtOrigination: 1.10, counterpartyId: cpGOC.id, ownerId: manager.id } })

  // COMMITTEE_REVIEW (2)
  const appCR1 = await prisma.application.create({ data: { reqId: 'REQ-2026-017', requestedAmount: 100, priority: true, slaDeadline: ahead(2), facilityType: 'TERM_LOAN', tenorMonths: 120, collateralValue: 140, collateralType: 'REAL_ESTATE', currentStage: PipelineStage.COMMITTEE_REVIEW, pd: 0.35, pdAtOrigination: 0.35, counterpartyId: cpMTN.id, ownerId: manager.id } })
  const appCR2 = await prisma.application.create({ data: { reqId: 'REQ-2026-018', requestedAmount: 60, priority: false, slaDeadline: ahead(4), facilityType: 'TERM_LOAN', tenorMonths: 84, currentStage: PipelineStage.COMMITTEE_REVIEW, pd: 0.62, pdAtOrigination: 0.62, counterpartyId: cpSNH.id, ownerId: manager.id } })

  // CLIENT applications (Groupe Ondo — portail client)
  const appClient1 = await prisma.application.create({ data: { reqId: 'APP-2026-001', requestedAmount: 10, priority: false, slaDeadline: ahead(30), facilityType: 'CREDIT_LINE', tenorMonths: 36, repaymentSource: 'CASH_FLOW', amortizationType: 'LINEAR', gracePeriodMonths: 3, currentStage: PipelineStage.COMMITTEE_REVIEW, pd: 1.25, pdAtOrigination: 1.25, counterpartyId: cpOndo.id, ownerId: manager.id } })
  const appClient2 = await prisma.application.create({ data: { reqId: 'APP-2026-002', requestedAmount: 5, priority: false, slaDeadline: ahead(20), facilityType: 'EQUIPMENT_LOAN', tenorMonths: 24, currentStage: PipelineStage.DOCUMENTS_PENDING, pd: 1.25, counterpartyId: cpOndo.id, ownerId: analyst.id } })

  // APPROVED (4)
  const appAP1 = await prisma.application.create({ data: { reqId: 'REQ-2025-045', requestedAmount: 80, priority: false, slaDeadline: ago(5), facilityType: 'TERM_LOAN', tenorMonths: 72, currentStage: PipelineStage.APPROVED, pd: 0.18, pdAtOrigination: 0.18, counterpartyId: cpTotal.id, ownerId: manager.id, createdAt: ago(30) } })
  const appAP2 = await prisma.application.create({ data: { reqId: 'REQ-2025-046', requestedAmount: 42, priority: false, slaDeadline: ago(8), facilityType: 'REVOLVER', tenorMonths: 36, currentStage: PipelineStage.APPROVED, pd: 0.45, pdAtOrigination: 0.45, counterpartyId: cpSABC.id, ownerId: analyst.id, createdAt: ago(25) } })
  const appAP3 = await prisma.application.create({ data: { reqId: 'REQ-2025-047', requestedAmount: 55, priority: false, slaDeadline: ago(3), facilityType: 'TERM_LOAN', tenorMonths: 60, currentStage: PipelineStage.APPROVED, pd: 0.78, pdAtOrigination: 0.78, counterpartyId: cpCIMEN.id, ownerId: analyst.id, createdAt: ago(20) } })
  const appAP4 = await prisma.application.create({ data: { reqId: 'REQ-2025-048', requestedAmount: 90, priority: false, slaDeadline: ago(1), facilityType: 'TERM_LOAN', tenorMonths: 84, currentStage: PipelineStage.APPROVED, pd: 0.90, pdAtOrigination: 0.90, counterpartyId: cpCOTCO.id, ownerId: manager.id, createdAt: ago(15) } })

  // REJECTED (1)
  const appRJ1 = await prisma.application.create({ data: { reqId: 'REQ-2026-019', requestedAmount: 185, priority: false, slaDeadline: ago(2), facilityType: 'TERM_LOAN', tenorMonths: 60, currentStage: PipelineStage.REJECTED, pd: 8.90, pdAtOrigination: 8.90, counterpartyId: cpSONARA.id, ownerId: manager.id, createdAt: ago(10) } })

  // APPROVED_WITH_CONDITIONS (1)
  const appAWC = await prisma.application.create({ data: { reqId: 'REQ-2025-050', requestedAmount: 22, priority: false, slaDeadline: ago(4), facilityType: 'TERM_LOAN', tenorMonths: 48, currentStage: PipelineStage.APPROVED_WITH_CONDITIONS, pd: 2.80, pdAtOrigination: 2.80, counterpartyId: cpCAMTEL.id, ownerId: manager.id, createdAt: ago(12) } })

  console.log('✅ 25 applications pipeline créées')

  // ── 4. Decisions ─────────────────────────────────────────────────────────────
  const snapHigh = (pd: number) => ({ payloadQualityScore: 88, qualityBand: 'HIGH', featureLineage: { rawCount: 148, derivedCount: 15, imputedCount: 2, imputedFeatures: [] }, pdScore: pd })
  const snapMed  = (pd: number) => ({ payloadQualityScore: 65, qualityBand: 'MEDIUM', featureLineage: { rawCount: 112, derivedCount: 22, imputedCount: 28, imputedFeatures: ['cash_flow_volatility', 'tax_liabilities'] }, pdScore: pd })
  const snapLow  = (pd: number) => ({ payloadQualityScore: 32, qualityBand: 'LOW', featureLineage: { rawCount: 72, derivedCount: 10, imputedCount: 76, imputedFeatures: ['audited_ebitda', 'director_score', 'supplier_days'] }, pdScore: pd })

  await prisma.decision.createMany({ data: [
    // Scored apps
    { applicationId: appSC1.id, counterpartyId: cpPERENco.id, status: DecisionStatus.APPROVE, decisionType: 'AUTO', justification: 'PD 0.48% sous le seuil d\'appétit. Collatéral robuste. Score de qualité élevé.', overrideFlag: false, scoringSnapshot: snapHigh(0.48), decidedById: analyst.id, decidedAt: new Date() },
    { applicationId: appSC2.id, counterpartyId: cpCAMTEL.id, status: DecisionStatus.SEND_TO_REVIEW, decisionType: 'AUTO', justification: 'PD 2.15% dans la zone orange. Endettement élevé. Escalade vers Manager.', overrideFlag: false, scoringSnapshot: snapMed(2.15), decidedById: analyst.id, decidedAt: new Date() },
    { applicationId: appSC3.id, counterpartyId: cpSOSUCAM.id, status: DecisionStatus.SEND_TO_REVIEW, decisionType: 'AUTO', justification: 'PD 3.80%, trésorerie négative. Stage 2. Comité requis.', overrideFlag: false, scoringSnapshot: snapMed(3.80), decidedById: analyst.id, decidedAt: new Date() },
    // Approved
    { applicationId: appAP1.id, counterpartyId: cpTotal.id, status: DecisionStatus.APPROVE, decisionType: 'MANUAL_COMMITTEE', justification: 'Financement validé par comité de crédit. Garantie TotalEnergies Group.', overrideFlag: false, scoringSnapshot: snapHigh(0.18), decidedById: cro.id, decidedAt: ago(5) },
    { applicationId: appAP2.id, counterpartyId: cpSABC.id, status: DecisionStatus.APPROVE, decisionType: 'AUTO', justification: 'PD 0.45%, exposition bien dans les limites. Auto-approuvé.', overrideFlag: false, scoringSnapshot: snapHigh(0.45), decidedById: manager.id, decidedAt: ago(8) },
    { applicationId: appAP3.id, counterpartyId: cpCIMEN.id, status: DecisionStatus.APPROVE, decisionType: 'AUTO', justification: 'Entreprise solide, ratio de couverture satisfaisant.', overrideFlag: false, scoringSnapshot: snapHigh(0.78), decidedById: analyst.id, decidedAt: ago(3) },
    { applicationId: appAP4.id, counterpartyId: cpCOTCO.id, status: DecisionStatus.APPROVE, decisionType: 'MANUAL_COMMITTEE', justification: 'Pipeline stratégique. Revenus réguliers assurés par contrats long terme.', overrideFlag: false, scoringSnapshot: snapHigh(0.90), decidedById: cro.id, decidedAt: ago(1) },
    // Rejected
    { applicationId: appRJ1.id, counterpartyId: cpSONARA.id, status: DecisionStatus.REJECT, decisionType: 'AUTO', justification: 'PD 8.90% dépasse le seuil maximal de 8%. Trésorerie négative. Stage 3.', overrideFlag: false, scoringSnapshot: snapLow(8.90), decidedById: manager.id, decidedAt: ago(2) },
    // AWC (with override)
    { applicationId: appAWC.id, counterpartyId: cpCAMTEL.id, status: DecisionStatus.APPROVE_WITH_CONDITIONS, decisionType: 'MANUAL_COMMITTEE', justification: 'Approbation conditionnelle: sûreté additionnelle et rapport trimestriel requis.', overrideFlag: true, overrideReason: 'Entreprise d\'État CEMAC — exception stratégique approuvée par DRG.', scoringSnapshot: snapMed(2.80), decidedById: cro.id, decidedAt: ago(4) },
    // Client portal
    { applicationId: appClient1.id, counterpartyId: cpOndo.id, status: DecisionStatus.APPROVE, decisionType: 'MANUAL', justification: 'Client stratégique zone CEMAC. Collatéral immobilier validé.', overrideFlag: false, scoringSnapshot: snapMed(1.25), decidedById: manager.id, decidedAt: ago(2) },
  ]})

  // 30 jours d'historique pour les graphiques Monitoring
  const histAppsData = Array.from({ length: 62 }, (_, i) => ({
    reqId: `HIST-${String(i).padStart(3,'0')}`,
    requestedAmount: 10 + Math.random() * 40,
    slaDeadline: ago(30 - Math.floor(i / 2)),
    currentStage: PipelineStage.APPROVED,
    counterpartyId: cpMTN.id,
    pd: 0.3 + Math.random() * 0.8,
  }))
  await prisma.application.createMany({ data: histAppsData })
  const histApps = await prisma.application.findMany({ where: { reqId: { startsWith: 'HIST-' } } })
  const histDecsData = histApps.map((a, i) => {
    const dayOffset = Math.floor(i / 2)
    const quality = Math.min(100, Math.round(52 + (i * 0.8) + Math.random() * 18))
    return {
      applicationId: a.id, counterpartyId: cpMTN.id,
      status: DecisionStatus.APPROVE, decisionType: 'AUTO',
      decidedById: analyst.id, decidedAt: ago(30 - dayOffset),
      createdAt: ago(30 - dayOffset),
      scoringSnapshot: {
        payloadQualityScore: quality,
        qualityBand: quality >= 75 ? 'HIGH' : quality >= 50 ? 'MEDIUM' : 'LOW',
        featureLineage: {
          rawCount: Math.round((quality / 100) * 157),
          derivedCount: 20,
          imputedCount: Math.max(0, 157 - Math.round((quality / 100) * 157) - 20),
          imputedFeatures: quality < 60 ? ['dti_proxy', 'cash_flow_est'] : [],
        }
      }
    }
  })
  await prisma.decision.createMany({ data: histDecsData })
  console.log('✅ Decisions + 30j historique créés')

  // ── 5. MLOps ─────────────────────────────────────────────────────────────────
  const regPD = await prisma.modelRegistry.create({ data: { name: 'Modèle PD Zone CEMAC (XGBoost)', type: 'XGBOOST', description: 'Moteur PD principal. Conforme Bâle II/III. Entraîné sur données CEMAC 2018-2024.' } })
  const regLGD = await prisma.modelRegistry.create({ data: { name: 'Estimateur LGD (Régression Logistique)', type: 'LOG_REG', description: 'Modèle Loss Given Default. Calibré sur le portefeuille COBAC.' } })

  const vChamp = await prisma.modelVersion.create({ data: {
    modelId: regPD.id, versionTag: 'pd_xgb_v4.2',
    status: ModelStatus.HEALTHY, lifecycleStatus: LifecycleStatus.CHAMPION, deploymentStatus: DeploymentStatus.PRODUCTION, artifactCategory: ArtifactCategory.PROD_CHAMPION,
    auc: 0.823, ks: 0.452, psi: 0.048,
    oot_auc: 0.811, oot_ks: 0.438, oot_psi: 0.061,
    oot_period_start: new Date('2025-01-01'), oot_period_end: new Date('2025-06-30'),
    validationStatus: 'VALIDATED_PASS', trainingTimestamp: new Date('2024-09-15'), featureSchemaVersion: 'v3.1.0_158_features', deployedAt: new Date('2024-10-01'),
  }})
  const vChall = await prisma.modelVersion.create({ data: {
    modelId: regPD.id, versionTag: 'pd_xgb_v4.3-shadow',
    status: ModelStatus.HEALTHY, lifecycleStatus: LifecycleStatus.CHALLENGER, deploymentStatus: DeploymentStatus.SHADOW, artifactCategory: ArtifactCategory.PROD_CHAMPION,
    auc: 0.841, ks: 0.471, psi: 0.038,
    oot_auc: 0.829, oot_ks: 0.458, oot_psi: 0.042,
    oot_period_start: new Date('2025-07-01'), oot_period_end: new Date('2025-12-31'),
    validationStatus: 'VALIDATED_PASS', trainingTimestamp: new Date('2025-03-10'), featureSchemaVersion: 'v3.2.0_162_features',
  }})
  const vLGD = await prisma.modelVersion.create({ data: {
    modelId: regLGD.id, versionTag: 'lgd_lr_v2.1',
    status: ModelStatus.HEALTHY, lifecycleStatus: LifecycleStatus.CHAMPION, deploymentStatus: DeploymentStatus.PRODUCTION, artifactCategory: ArtifactCategory.PROD_CHAMPION,
    auc: 0.768, ks: 0.381, psi: 0.072, validationStatus: 'VALIDATED_PASS',
  }})

  // 31 jours de métriques pour le champion
  let auc = 0.842, ks = 0.462
  const metricsData = Array.from({ length: 31 }, (_, i) => {
    auc = Math.max(0.78, auc - Math.random() * 0.003 + Math.random() * 0.001)
    ks  = Math.max(0.40, ks  - Math.random() * 0.002 + Math.random() * 0.001)
    const psi = 0.025 + i * 0.0012 + Math.random() * 0.005
    return {
      modelVersionId: vChamp.id,
      inferenceVolume: Math.round(12000 + Math.random() * 2500),
      errorRate: 0.008 + Math.random() * 0.008,
      latencyP50: 95 + Math.random() * 25, latencyP99: 380 + Math.random() * 60,
      auc, ks, psi,
      avgPayloadQuality: 72 + Math.random() * 15,
      avgImputedCount: 8 + Math.random() * 12,
      loggedAt: ago(30 - i),
      criticalFeatures: [
        { name: 'ratio_endettement', psi: 0.03 + i * 0.001, status: psi > 0.15 ? 'Warn' : 'OK' },
        { name: 'dpd_90j', psi: 0.08 + i * 0.003, status: psi > 0.20 ? 'Warn' : 'OK' },
        { name: 'leverage_ebitda', psi: 0.02 + i * 0.0008, status: 'OK' },
      ]
    }
  })
  await prisma.modelMetrics.createMany({ data: metricsData })
  await prisma.modelMetrics.create({ data: { modelVersionId: vChall.id, inferenceVolume: 14200, errorRate: 0.012, latencyP50: 102, latencyP99: 395, auc: 0.841, ks: 0.471, psi: 0.038, criticalFeatures: [{ name: 'ratio_endettement', psi: 0.045, status: 'OK' }] } })

  // Shadow score logs (comparaison champion vs challenger)
  const shadowLogs = histApps.slice(0, 15).map(a => ({
    applicationId: a.id,
    championVersion: 'pd_xgb_v4.2', championPdScore: 1.2 + Math.random() * 2, championRecommendation: 'APPROVE',
    shadowVersion: 'pd_xgb_v4.3-shadow', shadowPdScore: 1.1 + Math.random() * 2, shadowPdDelta: (Math.random() - 0.5) * 0.4,
    recommendationMatch: Math.random() > 0.12,
    pdDeltaAbsPercent: Math.random() * 0.25,
  }))
  await prisma.shadowScoreLog.createMany({ data: shadowLogs })
  console.log('✅ MLOps: 2 registres, 3 versions, 31j métriques, shadow logs')

  // ── 6. Alertes ──────────────────────────────────────────────────────────────
  await prisma.alert.createMany({ data: [
    { severity: AlertSeverity.CRITICAL, message: 'SONARA : SLA dépassé — décision requise sous 2h', detail: 'REQ-2026-019 · Exposition 185M · Stage 3 · PD 8.90%. Escalader au DRG.', createdAt: new Date(), isResolved: false },
    { severity: AlertSeverity.WARNING, message: 'Dérive PSI dpd_90j : 0.218 — seuil d\'alerte dépassé', detail: 'Modèle pd_xgb_v4.2 · Feature dpd_90j · PSI actuel 0.218 > seuil 0.15. Surveiller.', createdAt: ago(2), isResolved: false },
    { severity: AlertSeverity.INFO, message: 'Challenger pd_xgb_v4.3 surpasse le champion sur toutes les métriques', detail: 'AUC delta: +0.018 · KS delta: +0.019 · PSI plus bas. Promotion possible après 30j observation.', createdAt: ago(3), isResolved: false },
    { severity: AlertSeverity.WARNING, message: 'CICAM S.A. : 3ème incident de paiement en 24 mois — watchlist', detail: 'Contrepartie CM5493013 · DPD actuel 35j · Mise en Stage 2 confirmée.', createdAt: ago(5), isResolved: false },
    { severity: AlertSeverity.CRITICAL, message: 'Moteur de fallback activé — cluster scoring injoignable', detail: '14 décisions traitées par règles de substitution. Qualité dégradée. Vérifier FastAPI port 8000.', createdAt: ago(12), isResolved: true },
    { severity: AlertSeverity.INFO, message: 'Rapport COBAC Q1 2026 soumis avec succès', detail: 'Transmission BEAC confirmée · Accusé de réception #COBAC-2026-Q1-CM-0482.', createdAt: ago(8), isResolved: true },
  ]})

  // ── 7. Événements d'audit ──────────────────────────────────────────────────
  await prisma.auditEvent.createMany({ data: [
    { eventType: 'PIPELINE_STAGE_CHANGED', entityType: 'Application', entityId: appCR1.id, actorId: analyst.id, previousValue: { stage: 'MANAGER_REVIEW' }, newValue: { stage: 'COMMITTEE_REVIEW' }, timestamp: ago(1) },
    { eventType: 'DECISION_SUBMITTED', entityType: 'Decision', entityId: appAP1.id, actorId: cro.id, previousValue: { status: 'PENDING' }, newValue: { status: 'APPROVE' }, timestamp: ago(5) },
    { eventType: 'DECISION_OVERRIDE', entityType: 'Decision', entityId: appAWC.id, actorId: cro.id, previousValue: { status: 'SEND_TO_REVIEW' }, newValue: { status: 'APPROVE_WITH_CONDITIONS', overrideReason: 'Exception stratégique CEMAC' }, timestamp: ago(4) },
    { eventType: 'DECISION_SUBMITTED', entityType: 'Decision', entityId: appRJ1.id, actorId: manager.id, previousValue: { status: 'PENDING' }, newValue: { status: 'REJECT' }, timestamp: ago(2) },
    { eventType: 'FALLBACK_ENGINE_USED', entityType: 'System', entityId: 'sys-scoring', previousValue: { engine: 'PYTHON_ML' }, newValue: { engine: 'FALLBACK_RULES', reason: 'FastAPI 503', affectedDecisions: 14 }, timestamp: ago(12) },
    { eventType: 'MODEL_STATUS_CHANGED', entityType: 'ModelVersion', entityId: vChamp.id, actorId: admin.id, previousValue: { status: 'HEALTHY' }, newValue: { status: 'WARNING', psi: 0.218, reasons: ['PSI dpd_90j=0.218 > seuil 0.15'] }, timestamp: ago(2) },
    { eventType: 'COUNTERPARTY_WATCHLIST', entityType: 'Counterparty', entityId: cpCICAM.id, actorId: manager.id, previousValue: { watchlist: false }, newValue: { watchlist: true, reason: 'DPD 35j, 3 incidents 24M' }, timestamp: ago(5) },
    { eventType: 'IFRS9_STAGE_TRANSITION', entityType: 'Counterparty', entityId: cpSONARA.id, actorId: admin.id, previousValue: { stage: 'STAGE_2' }, newValue: { stage: 'STAGE_3', sicrTriggered: true }, timestamp: ago(15) },
  ]})

  // ── 8. Notifications client ──────────────────────────────────────────────────
  await prisma.notification.createMany({ data: [
    { userId: clientU.id, title: 'Document requis', message: 'Veuillez télécharger vos Comptes de gestion T1 2026 pour le dossier APP-2026-002.', type: 'action', isRead: false, appReqId: 'APP-2026-002' },
    { userId: clientU.id, title: 'Passage en Comité de Crédit', message: 'Votre dossier APP-2026-001 a été soumis au comité de crédit. Décision attendue sous 48h.', type: 'info', isRead: false, appReqId: 'APP-2026-001' },
    { userId: clientU.id, title: 'Dossier APP-2026-001 approuvé', message: 'Félicitations. Votre ligne de crédit documentaire de 10M a été approuvée. Contrat en préparation.', type: 'success', isRead: true, appReqId: 'APP-2026-001' },
    { userId: clientU.id, title: 'Bienvenue sur le Portail Client ORE', message: 'Votre accès a été configuré. Vous pouvez déposer vos dossiers et suivre leur avancement en temps réel.', type: 'success', isRead: true },
  ]})

  // Documents client
  await prisma.document.createMany({ data: [
    { type: 'LEGAL', name: 'Statuts constitutifs et Kbis RCCM', status: 'VALIDATED', isRequired: true, counterpartyId: cpOndo.id, applicationId: appClient1.id },
    { type: 'FINANCIAL', name: 'États financiers audités 2024', status: 'VALIDATED', isRequired: true, counterpartyId: cpOndo.id, applicationId: appClient1.id },
    { type: 'FINANCIAL', name: 'Relevés bancaires 12 mois', status: 'VALIDATED', isRequired: true, counterpartyId: cpOndo.id, applicationId: appClient1.id },
    { type: 'LEGAL', name: 'Résolution du Conseil d\'Administration', status: 'VALIDATED', isRequired: true, counterpartyId: cpOndo.id, applicationId: appClient1.id },
    { type: 'FINANCIAL', name: 'Comptes de gestion T1 2026', status: 'REQUIRED', isRequired: true, counterpartyId: cpOndo.id, applicationId: appClient2.id },
    { type: 'BUSINESS', name: 'Plan d\'affaires 2026-2029', status: 'REQUIRED', isRequired: false, counterpartyId: cpOndo.id, applicationId: appClient2.id },
  ]})
  console.log('✅ Alertes, audit, notifications, documents')

  // ── 9. IFRS 9 Staging Audits ─────────────────────────────────────────────────
  await prisma.ifrs9StagingAudit.createMany({ data: [
    { stagingId: 'IFRS9-2026-001', applicationId: appAP1.id, counterpartyId: cpTotal.id, stage: IFRS9Stage.STAGE_1, previousStage: IFRS9Stage.STAGE_1, sicrTriggered: false, stagingReasons: ['PD actuelle 0.18% < PD origination 0.22%', 'Aucun DPD', 'Qualité collatéral intacte'], pdCurrent: 0.18, pdOrigination: 0.22, lgdEstimate: 0.35, lgdMethod: 'REGULATORY_LGD', eadEstimate: 80, eirUsed: 0.0825, eclProvision: 0.50, eclHorizon: '12_MONTH', rwaEstimate: 12.8, modelVersion: 'pd_xgb_v4.2', scoredBy: 'PYTHON_MODEL', requestId: appAP1.id, createdAt: ago(5) },
    { stagingId: 'IFRS9-2026-002', applicationId: appMR1.id, counterpartyId: cpBGFI.id, stage: IFRS9Stage.STAGE_1, sicrTriggered: false, stagingReasons: ['PD 0.55% sous seuil SICR 1.5%', 'Secteur financier stable'], pdCurrent: 0.55, pdOrigination: 0.55, lgdEstimate: 0.40, lgdMethod: 'REGULATORY_LGD', eadEstimate: 75, eirUsed: 0.0890, eclProvision: 1.65, eclHorizon: '12_MONTH', rwaEstimate: 9.6, modelVersion: 'pd_xgb_v4.2', scoredBy: 'PYTHON_MODEL', createdAt: new Date() },
    { stagingId: 'IFRS9-2026-003', counterpartyId: cpSODE.id, stage: IFRS9Stage.STAGE_2, previousStage: IFRS9Stage.STAGE_1, sicrTriggered: true, stagingReasons: ['SICR déclenché: PD 2.15% vs origination 0.95% (ratio 2.26×)', 'DPD 15j', 'Baisse marge EBITDA > 30%'], pdCurrent: 2.15, pdOrigination: 0.95, lgdEstimate: 0.45, lgdMethod: 'WORKOUT_LGD', eadEstimate: 22, eirUsed: 0.0920, eclProvision: 2.13, eclHorizon: 'LIFETIME', rwaEstimate: 4.4, modelVersion: 'pd_xgb_v4.2', scoredBy: 'PYTHON_MODEL', createdAt: ago(20) },
    { stagingId: 'IFRS9-2026-004', counterpartyId: cpSONARA.id, stage: IFRS9Stage.STAGE_3, previousStage: IFRS9Stage.STAGE_2, sicrTriggered: true, stagingReasons: ['Défaut objectif: DPD 92j > 90j seuil COBAC', 'Trésorerie opérationnelle négative 3 trimestres consécutifs', 'Covenant financier violé'], pdCurrent: 0.999, pdOrigination: 2.50, lgdEstimate: 0.75, lgdMethod: 'SPECIALIST_LGD', eadEstimate: 185, eirUsed: 0.1050, eclProvision: 138.75, eclHorizon: 'LIFETIME', rwaEstimate: 185.0, modelVersion: 'pd_xgb_v4.2', scoredBy: 'RULE_ENGINE', createdAt: ago(15) },
    { stagingId: 'IFRS9-2026-005', counterpartyId: cpICC.id, stage: IFRS9Stage.STAGE_3, sicrTriggered: true, stagingReasons: ['Défaut objectif: DPD 180j', 'Actifs nets négatifs', 'Procédure de redressement judiciaire en cours'], pdCurrent: 0.999, pdOrigination: 4.20, lgdEstimate: 0.85, lgdMethod: 'SPECIALIST_LGD', eadEstimate: 42, eirUsed: 0.1180, eclProvision: 35.70, eclHorizon: 'LIFETIME', modelVersion: 'pd_xgb_v4.2', scoredBy: 'RULE_ENGINE', createdAt: ago(30) },
    { stagingId: 'IFRS9-2026-006', counterpartyId: cpCAMTEL.id, stage: IFRS9Stage.STAGE_2, previousStage: IFRS9Stage.STAGE_1, sicrTriggered: true, stagingReasons: ['Ratio dette/EBITDA dégradé: 13× > seuil 8×', 'Sous-performance sectorielle', 'DPD 18j'], pdCurrent: 2.80, pdOrigination: 1.05, lgdEstimate: 0.42, lgdMethod: 'WORKOUT_LGD', eadEstimate: 25, eirUsed: 0.0950, eclProvision: 2.94, eclHorizon: 'LIFETIME', modelVersion: 'pd_xgb_v4.2', scoredBy: 'PYTHON_MODEL', createdAt: ago(10) },
  ]})

  // ── 10. Scénarios de stress ──────────────────────────────────────────────────
  await prisma.scenario.createMany({ data: [
    { name: 'Choc pétrole CEMAC — baisse 40%', horizon: '12M', pdDelta: 2.8, expectedLoss: 62.4, rwaImpact: 520, parameters: { oilPriceShock: -40, gdpGrowthCEMAC: -2.1, unemploymentDelta: 4.2, creditSpreadBps: 250, xafDepreciation: 0 } },
    { name: 'Scénario adverse COBAC 2026', horizon: '12M', pdDelta: 1.9, expectedLoss: 42.5, rwaImpact: 355, parameters: { gdpGrowthCEMAC: -1.2, unemploymentDelta: 3.5, creditSpreadBps: 180, realGDPGrowth: -1.2 } },
    { name: 'Stress test Bâle III — Pilier 2', horizon: '24M', pdDelta: 3.5, expectedLoss: 98.2, rwaImpact: 780, parameters: { gdpGrowthCEMAC: -3.0, oilPriceShock: -55, inflationSpike: 8.5, creditSpreadBps: 380, sovereignDowngrade: true } },
  ]})

  // ── 11. Compliance COBAC ─────────────────────────────────────────────────────
  await prisma.complianceItem.createMany({ data: [
    { label: 'IFRS 9 — Provisionnement ECL (3 stages)', status: ComplianceStatus.COMPLIANT, detail: 'Modèle validé, staging automatisé, provisions calculées mensuellement. Conforme Circulaire COBAC 01/2022.', referenceDoc: 'Circulaire COBAC No. 01/2022', lastValidated: new Date('2026-03-15'), dueDate: new Date('2026-09-15'), sortOrder: 1 },
    { label: 'Bâle III — Fonds Propres & CET1', status: ComplianceStatus.COMPLIANT, detail: 'Ratio CET1 : 14.2% (minimum COBAC 8%). Conservation buffer 2.5% maintenu.', referenceDoc: 'Règlement COBAC R-2016/02 — Bâle III', lastValidated: new Date('2026-03-01'), dueDate: new Date('2026-12-01'), sortOrder: 2 },
    { label: 'Gouvernance des Modèles (MRM Charter)', status: ComplianceStatus.REVIEW, detail: 'Revue annuelle due dans 47 jours. Résultats Champion/Challenger en cours de validation par comité.', referenceDoc: 'Charte MRM Interne v1.4', lastValidated: new Date('2025-12-01'), dueDate: new Date('2026-06-15'), sortOrder: 3 },
    { label: 'Explicabilité IA — SHAP/XAI', status: ComplianceStatus.COMPLIANT, detail: 'SHAP v0.45 intégré. Toutes les décisions incluent attribution des facteurs de risque.', referenceDoc: 'Recommandations EBA sur l\'explicabilité des modèles ML', lastValidated: new Date('2026-02-28'), sortOrder: 4 },
    { label: 'Reporting Prudentiel COBAC — Q1 2026', status: ComplianceStatus.COMPLIANT, detail: 'Transmission BEAC confirmée. Accusé réception #COBAC-2026-Q1-CM-0482. Prochain: Q2 2026.', referenceDoc: 'Règlement COBAC R-2001/01 — Reporting', lastValidated: new Date('2026-04-01'), dueDate: new Date('2026-07-01'), sortOrder: 5 },
    { label: 'Qualité et Traçabilité des Données', status: ComplianceStatus.REVIEW, detail: '12 identifiants LEI manquants escaladés à la Gouvernance des Données. Lineage tracking actif.', sortOrder: 6 },
    { label: 'Calibration LGD — Revue annuelle', status: ComplianceStatus.FAILED, detail: 'Backtesting LGD sur cohorte 2022-2025 montre un biais de +12pp. Recalibration requise avant Q3.', referenceDoc: 'Directive COBAC — Validation des Modèles', lastValidated: new Date('2025-09-01'), dueDate: new Date('2026-06-30'), sortOrder: 7 },
    { label: 'Dispositif LCB-FT — Filtrage AML/KYC', status: ComplianceStatus.COMPLIANT, detail: 'Screening FATF et listes BEAC intégrés. 0 alerte non traitée. Audit annuel: avril 2026.', referenceDoc: 'Règlement COBAC R-2005/01 — LCB-FT', lastValidated: new Date('2026-04-15'), dueDate: new Date('2027-04-15'), sortOrder: 8 },
  ]})

  // ── 12. Documents techniques ─────────────────────────────────────────────────
  await prisma.techDocument.createMany({ data: [
    { name: 'Méthodologie IFRS 9 — Modèle ECL', version: 'v3.2', fileType: 'pdf', description: 'Documentation complète de la méthodologie ECL IFRS 9. Staging, horizons, FLI.', isPublic: false },
    { name: 'Charte Gouvernance des Modèles MRM', version: 'v1.4', fileType: 'pdf', description: 'Politique MRM. Cycle de vie, validation, champion/challenger, escalade.', isPublic: false },
    { name: 'Code Source Modèle PD — XGBoost', version: 'v4.2.1', fileType: 'py', description: 'Code source du modèle PD production. Disponible pour inspection réglementaire COBAC.', isPublic: false },
    { name: 'Charte d\'Audit 2026', version: 'Final', fileType: 'doc', description: 'Charte audit annuelle — périmètre, obligations, appétit au risque.', isPublic: false },
    { name: 'Rapport de Validation OOT — pd_xgb_v4.2', version: 'v1.0', fileType: 'pdf', description: 'Résultats validation out-of-time. AUC, KS, PSI, stabilité populationnelle.', isPublic: false },
  ]})

  // ── 13. Paramètres admin ─────────────────────────────────────────────────────
  await prisma.adminSetting.createMany({ skipDuplicates: true, data: [
    { key: 'xai_visibility', value: 'FULL', label: 'Visibilité XAI', group: 'scoring_policy' },
    { key: 'auto_approve_enabled', value: 'true', label: 'Auto-approbation activée', group: 'scoring_policy' },
    { key: 'auto_approve_max_pd', value: '0.5', label: 'PD max auto-approbation (%)', group: 'scoring_policy' },
    { key: 'auto_reject_min_pd', value: '8.0', label: 'PD min auto-rejet (%)', group: 'scoring_policy' },
    { key: 'review_min_exposure', value: '50', label: 'Seuil escalade comité (M)', group: 'scoring_policy' },
    { key: 'alert_threshold', value: 'WARNING', label: 'Seuil sévérité alertes', group: 'notifications' },
    { key: 'maintenance_mode', value: 'false', label: 'Mode maintenance', group: 'system' },
    { key: 'scoring_service_url', value: 'http://localhost:8000', label: 'URL service scoring', group: 'integrations' },
    { key: 'cobac_entity_code', value: 'CM-AFB-0042', label: 'Code entité COBAC', group: 'regulatory' },
    { key: 'ecl_currency', value: 'XAF', label: 'Devise ECL (BEAC)', group: 'regulatory' },
  ]})
  console.log('✅ IFRS9 audits, scénarios, compliance, documents, settings')

  // ── 14. Microfinance ─────────────────────────────────────────────────────────
  // Politiques produits
  const polIndiv = await prisma.microLoanPolicy.create({ data: {
    name: 'Crédit Commerce Individuel', version: 'v2.1', productType: MicroLoanProductType.INDIVIDUAL, segment: BorrowerSegment.SEMI_FORMAL,
    minAmount: 50000, maxAmount: 2000000, currency: 'XAF',
    allowedTenors: [30, 60, 90, 120, 180], interestRateMin: 2.5, interestRateMax: 5.0,
    minScore: 55, maxDebtBurdenRatio: 0.40, requiresGuarantor: false, requiresFieldVisit: true, requiresMobileMoneyConsent: true,
    status: PolicyStatus.ACTIVE, approvedBy: 'Isabelle Nkemdirim', approvedAt: new Date('2026-01-15'),
    coolingOffPeriodDays: 3,
  }})
  const polGroupe = await prisma.microLoanPolicy.create({ data: {
    name: 'Crédit Groupe Solidarité', version: 'v1.3', productType: MicroLoanProductType.GROUP, segment: BorrowerSegment.INFORMAL,
    minAmount: 25000, maxAmount: 800000, currency: 'XAF',
    allowedTenors: [30, 60, 90], interestRateMin: 2.0, interestRateMax: 3.5,
    minScore: 45, requiresGuarantor: false, requiresFieldVisit: true,
    status: PolicyStatus.ACTIVE, approvedBy: 'Isabelle Nkemdirim', approvedAt: new Date('2026-01-15'),
  }})
  const polAgri = await prisma.microLoanPolicy.create({ data: {
    name: 'Crédit Agricole Saisonnier', version: 'v1.0', productType: MicroLoanProductType.AGRI, segment: BorrowerSegment.INFORMAL,
    minAmount: 100000, maxAmount: 3000000, currency: 'XAF',
    allowedTenors: [90, 180, 270], interestRateMin: 2.0, interestRateMax: 4.0,
    minScore: 50, requiresGuarantor: true, requiresFieldVisit: true,
    status: PolicyStatus.ACTIVE, approvedBy: 'Isabelle Nkemdirim', approvedAt: new Date('2026-02-01'),
  }})
  const polMerchant = await prisma.microLoanPolicy.create({ data: {
    name: 'Crédit Marchand Digital', version: 'v1.1', productType: MicroLoanProductType.MERCHANT, segment: BorrowerSegment.SEMI_FORMAL,
    minAmount: 100000, maxAmount: 5000000, currency: 'XAF',
    allowedTenors: [30, 60, 90, 180], interestRateMin: 3.0, interestRateMax: 6.0,
    minScore: 60, requiresGuarantor: false, requiresFieldVisit: false, requiresMobileMoneyConsent: true,
    status: PolicyStatus.ACTIVE, approvedBy: 'Dr. Alain Kouassi', approvedAt: new Date('2026-03-01'),
  }})

  // 15 emprunteurs retail zone CEMAC
  const borrowers = await Promise.all([
    // Commerçantes (Douala)
    prisma.retailBorrower.create({ data: { fullName: 'Marie-Claire Nkou Essama', phone: '+237690001001', nationalIdNumber: 'CM-ID-2891045', dateOfBirth: new Date('1985-03-12'), gender: 'F', geography: 'Douala, Cameroun', address: 'Marché central Akwa, Stand 142', segment: BorrowerSegment.SEMI_FORMAL, status: BorrowerStatus.ACTIVE, identityVerified: true, kycLevel: 'STANDARD' } }),
    prisma.retailBorrower.create({ data: { fullName: 'Aminata Diallo', phone: '+237690001002', nationalIdNumber: 'CM-ID-4521987', dateOfBirth: new Date('1979-07-24'), gender: 'F', geography: 'Douala, Cameroun', address: 'Marché Sandaga, Allée B Stand 28', segment: BorrowerSegment.INFORMAL, status: BorrowerStatus.ACTIVE, identityVerified: true, kycLevel: 'BASIC' } }),
    prisma.retailBorrower.create({ data: { fullName: 'Ousmane Bah', phone: '+237690001003', nationalIdNumber: 'CM-ID-3102456', dateOfBirth: new Date('1974-11-08'), gender: 'M', geography: 'Yaoundé, Cameroun', address: 'Marché Mfoundi, Tissu & textile, B22', segment: BorrowerSegment.SEMI_FORMAL, status: BorrowerStatus.ACTIVE, identityVerified: true, kycLevel: 'STANDARD' } }),
    // Agriculteurs (Centre / Est Cameroun)
    prisma.retailBorrower.create({ data: { fullName: 'Pierre Essomba Mballa', phone: '+237690001004', nationalIdNumber: 'CM-ID-5897231', dateOfBirth: new Date('1968-02-14'), gender: 'M', geography: 'Mbalmayo, Cameroun', address: 'Village Nkol-Essomba, BP 12', segment: BorrowerSegment.INFORMAL, status: BorrowerStatus.ACTIVE, identityVerified: false, kycLevel: 'BASIC' } }),
    prisma.retailBorrower.create({ data: { fullName: 'Hamidou Sow', phone: '+237690001005', nationalIdNumber: 'CM-ID-2200789', dateOfBirth: new Date('1971-09-30'), gender: 'M', geography: 'Maroua, Cameroun', address: 'Quartier Domayo, parcelle 45', segment: BorrowerSegment.INFORMAL, status: BorrowerStatus.ACTIVE, identityVerified: true, kycLevel: 'BASIC' } }),
    // Artisans & services
    prisma.retailBorrower.create({ data: { fullName: 'Cécile Ondoua Ateba', phone: '+237690001006', nationalIdNumber: 'CM-ID-6412037', dateOfBirth: new Date('1988-05-19'), gender: 'F', geography: 'Yaoundé, Cameroun', address: 'Biyem-Assi, rue 3.212', segment: BorrowerSegment.SEMI_FORMAL, status: BorrowerStatus.ACTIVE, identityVerified: true, kycLevel: 'STANDARD' } }),
    prisma.retailBorrower.create({ data: { fullName: 'Rodrigue Mpouki Nganga', phone: '+242068001001', nationalIdNumber: 'CG-ID-8821045', dateOfBirth: new Date('1982-12-03'), gender: 'M', geography: 'Brazzaville, Congo', address: 'Poto-Poto, rue Kinsoundi', segment: BorrowerSegment.SEMI_FORMAL, status: BorrowerStatus.ACTIVE, identityVerified: true, kycLevel: 'STANDARD' } }),
    prisma.retailBorrower.create({ data: { fullName: 'Fatima Al-Hassan', phone: '+235660001001', nationalIdNumber: 'TD-ID-4401822', dateOfBirth: new Date('1975-06-08'), gender: 'F', geography: 'N\'Djamena, Tchad', address: 'Marché central NDJ, Secteur D', segment: BorrowerSegment.INFORMAL, status: BorrowerStatus.ACTIVE, identityVerified: true, kycLevel: 'BASIC' } }),
    // Gabon
    prisma.retailBorrower.create({ data: { fullName: 'Jean-Baptiste Mba Nguema', phone: '+241077001001', nationalIdNumber: 'GA-ID-3390245', dateOfBirth: new Date('1980-04-22'), gender: 'M', geography: 'Libreville, Gabon', address: 'Quartier Lalala, lot 88', segment: BorrowerSegment.SEMI_FORMAL, status: BorrowerStatus.ACTIVE, identityVerified: true, kycLevel: 'STANDARD' } }),
    prisma.retailBorrower.create({ data: { fullName: 'Fatoumata Bah Diallo', phone: '+241077001002', nationalIdNumber: 'GA-ID-7712034', dateOfBirth: new Date('1990-08-15'), gender: 'F', geography: 'Port-Gentil, Gabon', address: 'Quartier Charbonnages, rue 12', segment: BorrowerSegment.INFORMAL, status: BorrowerStatus.ACTIVE, identityVerified: false, kycLevel: 'BASIC' } }),
    // Emprunteurs avec historique de remboursement
    prisma.retailBorrower.create({ data: { fullName: 'Chantal Mfoungué Biya', phone: '+237690001007', nationalIdNumber: 'CM-ID-9023145', dateOfBirth: new Date('1986-10-07'), gender: 'F', geography: 'Douala, Cameroun', address: 'Akwa Nord, rue de la Joie 8', segment: BorrowerSegment.SEMI_FORMAL, status: BorrowerStatus.ACTIVE, identityVerified: true, kycLevel: 'ENHANCED' } }),
    prisma.retailBorrower.create({ data: { fullName: 'Modibo Koné', phone: '+237690001008', nationalIdNumber: 'CM-ID-3304892', dateOfBirth: new Date('1991-01-25'), gender: 'M', geography: 'Yaoundé, Cameroun', address: 'Melen, derrière pharmacie', segment: BorrowerSegment.THIN_FILE, status: BorrowerStatus.ACTIVE, identityVerified: true, kycLevel: 'BASIC' } }),
    prisma.retailBorrower.create({ data: { fullName: 'Sylvie Atangana Mendo', phone: '+237690001009', nationalIdNumber: 'CM-ID-8120367', dateOfBirth: new Date('1983-03-30'), gender: 'F', geography: 'Bafoussam, Cameroun', address: 'Marché A, Stand fruits légumes', segment: BorrowerSegment.FORMAL, status: BorrowerStatus.ACTIVE, identityVerified: true, kycLevel: 'STANDARD' } }),
    prisma.retailBorrower.create({ data: { fullName: 'Alain Ondo Minko', phone: '+241077001003', nationalIdNumber: 'GA-ID-5521089', dateOfBirth: new Date('1977-07-19'), gender: 'M', geography: 'Libreville, Gabon', address: 'Owendo, zone portuaire', segment: BorrowerSegment.INFORMAL, status: BorrowerStatus.SUSPENDED, identityVerified: true, kycLevel: 'BASIC' } }),
    prisma.retailBorrower.create({ data: { fullName: 'Grace Nzinga Ndele', phone: '+242068001002', nationalIdNumber: 'CG-ID-4401287', dateOfBirth: new Date('1993-11-12'), gender: 'F', geography: 'Pointe-Noire, Congo', address: 'Lumumba, marché 2', segment: BorrowerSegment.SEMI_FORMAL, status: BorrowerStatus.ACTIVE, identityVerified: true, kycLevel: 'STANDARD' } }),
  ])

  const [bMarieclaire, bAminata, bOusmane, bPierre, bHamidou, bCecile, bRodrigue, bFatima, bJeanBaptiste, bFatoumata, bChantal, bModibo, bSylvie, bAlain, bGrace] = borrowers

  // Profils d'activité informelle
  await prisma.informalBusinessProfile.createMany({ data: [
    { borrowerId: bAminata.id, activityType: 'Commerce tissu & pagnes', sector: 'Commerce', locationType: 'MARKET_STALL', yearsInActivity: 8, monthlyRevenueEstimate: 350000, monthlyExpenseEstimate: 180000, stockValueEstimate: 1200000, employeeCount: 1 },
    { borrowerId: bPierre.id, activityType: 'Culture cacao & vivrier', sector: 'Agriculture', locationType: 'FIELD', yearsInActivity: 20, monthlyRevenueEstimate: 280000, monthlyExpenseEstimate: 120000, seasonalityNotes: 'Pic oct-déc (récolte principale)', stockValueEstimate: 800000 },
    { borrowerId: bHamidou.id, activityType: 'Élevage bovin & vente bétail', sector: 'Agriculture', locationType: 'FIELD', yearsInActivity: 15, monthlyRevenueEstimate: 420000, monthlyExpenseEstimate: 250000, seasonalityNotes: 'Ventes peaks: Tabaski & fin d\'année', stockValueEstimate: 2500000 },
    { borrowerId: bModibo.id, activityType: 'Transport moto-taxi (Mototaxi)', sector: 'Transport', locationType: 'MOBILE_VENDOR', yearsInActivity: 3, monthlyRevenueEstimate: 180000, monthlyExpenseEstimate: 95000 },
    { borrowerId: bFatoumata.id, activityType: 'Vente fruits & légumes en gros', sector: 'Commerce', locationType: 'MARKET_STALL', yearsInActivity: 6, monthlyRevenueEstimate: 310000, monthlyExpenseEstimate: 195000, stockValueEstimate: 450000 },
  ]})

  // Consentements (Mobile Money + Field data)
  const consents = await prisma.consentGrant.createMany({ data: [
    { borrowerId: bMarieclaire.id, sourceType: ConsentSourceType.MOBILE_MONEY, purpose: ConsentPurpose.UNDERWRITING, status: ConsentStatus.GRANTED, consentTextVersion: 'v2.0-XAF-2026', captureChannel: ConsentCaptureChannel.MOBILE_APP },
    { borrowerId: bAminata.id, sourceType: ConsentSourceType.FIELD_DATA, purpose: ConsentPurpose.UNDERWRITING, status: ConsentStatus.GRANTED, consentTextVersion: 'v2.0-XAF-2026', captureChannel: ConsentCaptureChannel.FIELD_AGENT },
    { borrowerId: bCecile.id, sourceType: ConsentSourceType.MOBILE_MONEY, purpose: ConsentPurpose.UNDERWRITING, status: ConsentStatus.GRANTED, consentTextVersion: 'v2.0-XAF-2026', captureChannel: ConsentCaptureChannel.BRANCH },
    { borrowerId: bChantal.id, sourceType: ConsentSourceType.MOBILE_MONEY, purpose: ConsentPurpose.UNDERWRITING, status: ConsentStatus.GRANTED, consentTextVersion: 'v2.0-XAF-2026', captureChannel: ConsentCaptureChannel.MOBILE_APP },
    { borrowerId: bSylvie.id, sourceType: ConsentSourceType.MOBILE_MONEY, purpose: ConsentPurpose.UNDERWRITING, status: ConsentStatus.GRANTED, consentTextVersion: 'v2.0-XAF-2026', captureChannel: ConsentCaptureChannel.BRANCH },
    { borrowerId: bOusmane.id, sourceType: ConsentSourceType.MOBILE_MONEY, purpose: ConsentPurpose.UNDERWRITING, status: ConsentStatus.GRANTED, consentTextVersion: 'v2.0-XAF-2026', captureChannel: ConsentCaptureChannel.MOBILE_APP },
  ]})

  // 12 demandes microfinance (statuts variés)
  const mkReq = (n: number) => `MFI-2026-${String(n).padStart(3,'0')}`

  const mf1  = await prisma.microLoanApplication.create({ data: { reqId: mkReq(1),  borrowerId: bMarieclaire.id, policyId: polIndiv.id, requestedAmount: 500000, currency: 'XAF', purpose: 'Renouvellement stock pagnes importés', productType: MicroLoanProductType.INDIVIDUAL, segment: BorrowerSegment.SEMI_FORMAL, channel: 'BRANCH', status: MicroLoanApplicationStatus.APPROVED, priority: false } })
  const mf2  = await prisma.microLoanApplication.create({ data: { reqId: mkReq(2),  borrowerId: bAminata.id, policyId: polIndiv.id, requestedAmount: 250000, currency: 'XAF', purpose: 'Achat stock tissu wax Holland', productType: MicroLoanProductType.INDIVIDUAL, segment: BorrowerSegment.INFORMAL, channel: 'FIELD_AGENT', status: MicroLoanApplicationStatus.SCORED, priority: false } })
  const mf3  = await prisma.microLoanApplication.create({ data: { reqId: mkReq(3),  borrowerId: bOusmane.id, policyId: polIndiv.id, requestedAmount: 800000, currency: 'XAF', purpose: 'Extension point de vente, achat vitrine', productType: MicroLoanProductType.INDIVIDUAL, segment: BorrowerSegment.SEMI_FORMAL, channel: 'MOBILE_APP', status: MicroLoanApplicationStatus.SUPERVISOR_REVIEW, priority: false } })
  const mf4  = await prisma.microLoanApplication.create({ data: { reqId: mkReq(4),  borrowerId: bPierre.id, policyId: polAgri.id, requestedAmount: 1200000, currency: 'XAF', purpose: 'Achat intrants campagne cacao 2026', productType: MicroLoanProductType.AGRI, segment: BorrowerSegment.INFORMAL, channel: 'FIELD_AGENT', status: MicroLoanApplicationStatus.FIELD_REVIEW_REQUIRED, priority: false } })
  const mf5  = await prisma.microLoanApplication.create({ data: { reqId: mkReq(5),  borrowerId: bHamidou.id, policyId: polAgri.id, requestedAmount: 2500000, currency: 'XAF', purpose: 'Achat 12 têtes de bétail (Tabaski)', productType: MicroLoanProductType.AGRI, segment: BorrowerSegment.INFORMAL, channel: 'FIELD_AGENT', status: MicroLoanApplicationStatus.APPROVED, priority: false } })
  const mf6  = await prisma.microLoanApplication.create({ data: { reqId: mkReq(6),  borrowerId: bCecile.id, policyId: polMerchant.id, requestedAmount: 1500000, currency: 'XAF', purpose: 'Équipement cuisine & agrandissement restaurant', productType: MicroLoanProductType.MERCHANT, segment: BorrowerSegment.SEMI_FORMAL, channel: 'BRANCH', status: MicroLoanApplicationStatus.APPROVED, priority: true } })
  const mf7  = await prisma.microLoanApplication.create({ data: { reqId: mkReq(7),  borrowerId: bRodrigue.id, policyId: polIndiv.id, requestedAmount: 450000, currency: 'XAF', purpose: 'Matériel électrique & outils professionnels', productType: MicroLoanProductType.INDIVIDUAL, segment: BorrowerSegment.SEMI_FORMAL, channel: 'BRANCH', status: MicroLoanApplicationStatus.SUBMITTED, priority: false } })
  const mf8  = await prisma.microLoanApplication.create({ data: { reqId: mkReq(8),  borrowerId: bFatima.id, policyId: polIndiv.id, requestedAmount: 600000, currency: 'XAF', purpose: 'Fonds de roulement import marchandises', productType: MicroLoanProductType.INDIVIDUAL, segment: BorrowerSegment.INFORMAL, channel: 'FIELD_AGENT', status: MicroLoanApplicationStatus.REJECTED, priority: false } })
  const mf9  = await prisma.microLoanApplication.create({ data: { reqId: mkReq(9),  borrowerId: bJeanBaptiste.id, policyId: polMerchant.id, requestedAmount: 3000000, currency: 'XAF', purpose: 'Achat équipement menuiserie industrielle', productType: MicroLoanProductType.MERCHANT, segment: BorrowerSegment.SEMI_FORMAL, channel: 'BRANCH', status: MicroLoanApplicationStatus.SCORED, priority: true } })
  const mf10 = await prisma.microLoanApplication.create({ data: { reqId: mkReq(10), borrowerId: bChantal.id, policyId: polIndiv.id, requestedAmount: 350000, currency: 'XAF', purpose: 'Produits coiffure & mobilier salon', productType: MicroLoanProductType.INDIVIDUAL, segment: BorrowerSegment.SEMI_FORMAL, channel: 'MOBILE_APP', status: MicroLoanApplicationStatus.APPROVED, priority: false } })
  const mf11 = await prisma.microLoanApplication.create({ data: { reqId: mkReq(11), borrowerId: bModibo.id, policyId: polIndiv.id, requestedAmount: 180000, currency: 'XAF', purpose: 'Réparation moto & casque homologué', productType: MicroLoanProductType.INDIVIDUAL, segment: BorrowerSegment.THIN_FILE, channel: 'USSD', status: MicroLoanApplicationStatus.SCORED, priority: false } })
  const mf12 = await prisma.microLoanApplication.create({ data: { reqId: mkReq(12), borrowerId: bSylvie.id, policyId: polIndiv.id, requestedAmount: 700000, currency: 'XAF', purpose: 'Agrandissement point de vente marché', productType: MicroLoanProductType.INDIVIDUAL, segment: BorrowerSegment.FORMAL, channel: 'BRANCH', status: MicroLoanApplicationStatus.APPROVED, priority: false } })

  // Scorecards (pour apps scored / approved)
  const mkScore = (appId: string, borId: string, total: number, rec: ScorecardRecommendation) =>
    prisma.thinFileScorecard.create({ data: {
      applicationId: appId, borrowerId: borId,
      identityScore: Math.round(total * 0.90 + Math.random() * 5),
      activityStabilityScore: Math.round(total * 0.85 + Math.random() * 8),
      cashflowScore: Math.round(total * (0.75 + Math.random() * 0.15)),
      mobileMoneyScore: Math.round(total * 0.80 + Math.random() * 10),
      repaymentHistoryScore: Math.round(total * 0.95 + Math.random() * 4),
      guarantorGroupScore: Math.round(total * 0.70 + Math.random() * 15),
      fieldConfidenceScore: Math.round(total * 0.88 + Math.random() * 8),
      totalScore: total,
      recommendation: rec,
      reasonCodes: total >= 70
        ? [{ code: 'STABLE_CASHFLOW', label: 'Flux trésorerie stables', severity: 'INFO' }, { code: 'KNOWN_CLIENT', label: 'Client connu 6 mois+', severity: 'INFO' }]
        : [{ code: 'THIN_HISTORY', label: 'Historique crédit limité', severity: 'WARN' }, { code: 'IRREGULAR_INCOME', label: 'Revenus irréguliers', severity: 'WARN' }],
      featureSnapshot: { mobileMoney: { cashIn90d: 750000 + Math.random() * 500000, activeDays90d: 42 + Math.floor(Math.random() * 20) } }
    }})

  const sc1  = await mkScore(mf1.id,  bMarieclaire.id, 78, ScorecardRecommendation.APPROVE_SMALL_LIMIT)
  const sc2  = await mkScore(mf2.id,  bAminata.id,     62, ScorecardRecommendation.APPROVE_WITH_GUARANTOR)
  const sc3  = await mkScore(mf3.id,  bOusmane.id,     71, ScorecardRecommendation.SUPERVISOR_REVIEW)
  const sc5  = await mkScore(mf5.id,  bHamidou.id,     74, ScorecardRecommendation.FIELD_REVIEW_REQUIRED)
  const sc6  = await mkScore(mf6.id,  bCecile.id,      82, ScorecardRecommendation.APPROVE_SMALL_LIMIT)
  const sc9  = await mkScore(mf9.id,  bJeanBaptiste.id,75, ScorecardRecommendation.APPROVE_SMALL_LIMIT)
  const sc10 = await mkScore(mf10.id, bChantal.id,     80, ScorecardRecommendation.APPROVE_SMALL_LIMIT)
  const sc11 = await mkScore(mf11.id, bModibo.id,      55, ScorecardRecommendation.APPROVE_WITH_GUARANTOR)
  const sc12 = await mkScore(mf12.id, bSylvie.id,      85, ScorecardRecommendation.APPROVE_SMALL_LIMIT)

  // Décisions microfinance
  await prisma.microLoanDecision.createMany({ data: [
    { applicationId: mf1.id, borrowerId: bMarieclaire.id, scorecardId: sc1.id, status: DecisionStatus.APPROVE, decisionType: 'HUMAN_IN_THE_LOOP', approvedAmount: 500000, tenorDays: 90, interestRate: 3.5, decidedById: manager.id, decidedAt: ago(5) },
    { applicationId: mf5.id, borrowerId: bHamidou.id, scorecardId: sc5.id, status: DecisionStatus.APPROVE, decisionType: 'HUMAN_IN_THE_LOOP', approvedAmount: 2000000, tenorDays: 180, interestRate: 3.0, decidedById: analyst.id, decidedAt: ago(3) },
    { applicationId: mf6.id, borrowerId: bCecile.id, scorecardId: sc6.id, status: DecisionStatus.APPROVE, decisionType: 'HUMAN_IN_THE_LOOP', approvedAmount: 1500000, tenorDays: 120, interestRate: 4.0, decidedById: manager.id, decidedAt: ago(2) },
    { applicationId: mf8.id, borrowerId: bFatima.id, status: DecisionStatus.REJECT, decisionType: 'HUMAN_IN_THE_LOOP', overrideReason: 'Identité non vérifiée. Profil activité non documenté. Visite terrain non concluante.', decidedById: analyst.id, decidedAt: ago(10) },
    { applicationId: mf10.id, borrowerId: bChantal.id, scorecardId: sc10.id, status: DecisionStatus.APPROVE, decisionType: 'HUMAN_IN_THE_LOOP', approvedAmount: 350000, tenorDays: 60, interestRate: 3.5, decidedById: analyst.id, decidedAt: ago(1) },
    { applicationId: mf12.id, borrowerId: bSylvie.id, scorecardId: sc12.id, status: DecisionStatus.APPROVE, decisionType: 'HUMAN_IN_THE_LOOP', approvedAmount: 700000, tenorDays: 90, interestRate: 3.0, decidedById: manager.id, decidedAt: ago(4) },
  ]})

  console.log('✅ Microfinance: 4 politiques, 15 emprunteurs, 12 demandes, scorecards, décisions')

  // ── Résumé final ────────────────────────────────────────────────────────────
  console.log('\n🎉 Base de données CEMAC seedée avec succès!\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Accès interne (Demo@2026):')
  console.log('    analyst@riskengine.com  →  ANALYST')
  console.log('    manager@riskengine.com  →  MANAGER')
  console.log('    cro@riskengine.com      →  CRO')
  console.log('    admin@riskengine.com    →  ADMIN')
  console.log('  Portail client (Demo@2026):')
  console.log('    amadou.traore@ondomveco.ga  →  Groupe Ondo Commerce')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
