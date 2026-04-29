import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringService } from './monitoring.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ScoringService } from '../scoring/scoring.service';

// â”€â”€â”€ Mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const mockPrisma = {
  modelVersion: {
    findMany: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
  alert: {
    create: jest.fn().mockResolvedValue({ id: 'alert-001' }),
  },
  modelMetrics: {
    create: jest.fn().mockResolvedValue({ id: 'metrics-001' }),
  },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockScoring = {};

const makeModel = (id: string, status: string, psi: number) => ({
  id,
  status,
  psi,
  registry: { name: 'PD Model', type: 'XGBOOST' },
  versionTag: 'v4.2.0',
});

// â”€â”€â”€ Suite A: PSI-Based Drift Automation (evaluateModelDrift) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('MonitoringService â€” A: PSI-based Drift Automation (evaluateModelDrift)', () => {
  let service: MonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: ScoringService, useValue: mockScoring },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    jest.clearAllMocks();
  });

  it('should NOT change status for a HEALTHY model with PSI < 0.10', async () => {
    mockPrisma.modelVersion.findMany.mockResolvedValue([makeModel('m1', 'HEALTHY', 0.05)]);
    await service.evaluateModelDrift();
    expect(mockPrisma.modelVersion.update).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
    expect(mockPrisma.alert.create).not.toHaveBeenCalled();
  });

  it('should DEGRADE HEALTHY â†’ WARNING when PSI > 0.10 â€” creates Alert + AuditEvent', async () => {
    mockPrisma.modelVersion.findMany.mockResolvedValue([makeModel('m1', 'HEALTHY', 0.15)]);
    await service.evaluateModelDrift();

    expect(mockPrisma.modelVersion.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'WARNING' }),
    }));
    // âœ… Scenario: PSI degradation generates Alert
    expect(mockPrisma.alert.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ severity: 'WARNING' }),
    }));
    // âœ… Scenario: PSI degradation generates AuditEvent
    expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'MODEL_STATUS_CHANGED',
      newValue: expect.objectContaining({ status: 'WARNING' }),
    }));
  });

  it('should DEGRADE WARNING â†’ DEGRADED when PSI > 0.25 â€” creates CRITICAL Alert + AuditEvent', async () => {
    mockPrisma.modelVersion.findMany.mockResolvedValue([makeModel('m1', 'WARNING', 0.31)]);
    await service.evaluateModelDrift();

    expect(mockPrisma.modelVersion.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'DEGRADED' }),
    }));
    // âœ… CRITICAL severity alert
    expect(mockPrisma.alert.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ severity: 'CRITICAL' }),
    }));
    // âœ… AuditEvent captures full before/after state
    expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'MODEL_STATUS_CHANGED',
      previousValue: expect.objectContaining({ status: 'WARNING' }),
      newValue: expect.objectContaining({ status: 'DEGRADED' }),
    }));
  });

  it('should RECOVER WARNING â†’ HEALTHY when PSI drops back below 0.10', async () => {
    mockPrisma.modelVersion.findMany.mockResolvedValue([makeModel('m1', 'WARNING', 0.07)]);
    await service.evaluateModelDrift();
    expect(mockPrisma.modelVersion.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'HEALTHY' }),
    }));
  });

  it('should generate CRITICAL alert when PSI jumps from HEALTHY directly past critical threshold', async () => {
    mockPrisma.modelVersion.findMany.mockResolvedValue([makeModel('m1', 'HEALTHY', 0.28)]);
    await service.evaluateModelDrift();
    expect(mockPrisma.alert.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ severity: 'CRITICAL' }),
    }));
  });

  it('should process multiple models independently in one cron run', async () => {
    mockPrisma.modelVersion.findMany.mockResolvedValue([
      makeModel('m1', 'HEALTHY', 0.05),  // no change
      makeModel('m2', 'HEALTHY', 0.15),  // â†’ WARNING
      makeModel('m3', 'WARNING', 0.30),  // â†’ DEGRADED
    ]);
    await service.evaluateModelDrift();
    expect(mockPrisma.modelVersion.update).toHaveBeenCalledTimes(2);
    expect(mockPrisma.alert.create).toHaveBeenCalledTimes(2);
    expect(mockAudit.log).toHaveBeenCalledTimes(2);
  });

  it('should do nothing if there are no active models to evaluate', async () => {
    mockPrisma.modelVersion.findMany.mockResolvedValue([]);
    await service.evaluateModelDrift();
    expect(mockPrisma.modelVersion.update).not.toHaveBeenCalled();
    expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
  });
});

// â”€â”€â”€ Suite B: Metrics Ingestion & Alert Generation (ingestMetrics) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('MonitoringService â€” B: Metrics Ingestion via ingestMetrics()', () => {
  let service: MonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: ScoringService, useValue: mockScoring },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    jest.clearAllMocks();
    mockPrisma.modelVersion.update.mockResolvedValue({});
  });

  it('should store a metric log without alerts when PSI is healthy (< 0.10)', async () => {
    const result = await service.ingestMetrics('model-001', {
      inferenceVolume: 500,
      errorRate: 0.01,
      latencyP50: 45,
      latencyP99: 120,
      criticalFeatures: [{ psi: 0.05 }],
      auc: 0.82,
      ks: 0.42,
    });

    expect(mockPrisma.modelMetrics.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
    expect(result).toHaveProperty('log');
  });

  it('should generate WARNING alert when ingested PSI is between 0.10 and 0.25', async () => {
    await service.ingestMetrics('model-001', {
      inferenceVolume: 500,
      errorRate: 0.02,
      latencyP50: 50,
      latencyP99: 130,
      criticalFeatures: [{ psi: 0.15 }],
    });

    expect(mockPrisma.alert.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ severity: 'WARNING' }),
    }));
    // WARNING via ingestMetrics does NOT write an AuditEvent (only CRITICAL does)
    expect(mockAudit.log).not.toHaveBeenCalled();
  });

  it('should generate CRITICAL alert AND AuditEvent when ingested PSI exceeds 0.25', async () => {
    await service.ingestMetrics('model-001', {
      inferenceVolume: 500,
      errorRate: 0.05,
      latencyP50: 60,
      latencyP99: 200,
      criticalFeatures: [{ psi: 0.30 }],
    });

    // âœ… Scenario: PSI critical ingestion generates CRITICAL Alert
    expect(mockPrisma.alert.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ severity: 'CRITICAL' }),
    }));
    // âœ… Scenario: PSI critical ingestion generates AuditEvent (MODEL_DRIFT_ALERT)
    expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'MODEL_DRIFT_ALERT',
      entityType: 'ModelVersion',
      entityId: 'model-001',
      newValue: expect.objectContaining({ severity: 'CRITICAL' }),
    }));
  });

  it('should pick the MAX PSI from multiple criticalFeatures entries', async () => {
    await service.ingestMetrics('model-001', {
      inferenceVolume: 500,
      errorRate: 0.01,
      latencyP50: 40,
      latencyP99: 110,
      criticalFeatures: [{ psi: 0.05 }, { psi: 0.28 }, { psi: 0.10 }],
    });

    // Max is 0.28 â†’ CRITICAL
    expect(mockPrisma.alert.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ severity: 'CRITICAL' }),
    }));
    expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'MODEL_DRIFT_ALERT',
    }));
  });

  it('should not trigger any alert when criticalFeatures array is empty', async () => {
    await service.ingestMetrics('model-001', {
      inferenceVolume: 100,
      errorRate: 0.0,
      latencyP50: 30,
      latencyP99: 90,
      criticalFeatures: [],
    });

    expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
  });
});

// â”€â”€â”€ Suite C: Phase 4 â€” Scoring Event Ingestion & Quality Trending â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('MonitoringService â€” C: Phase 4 Quality Trend & Fallback Governance', () => {
  let service: MonitoringService;

  const makeMetricsLog = (loggedAt: Date, avgPayloadQuality: number, avgImputedCount: number, errorRate: number) => ({
    loggedAt, avgPayloadQuality, avgImputedCount, errorRate,
  });

  const buildModule = async (prismaOverrides: any = {}) => {
    const prisma = {
      modelVersion: {
        findMany: jest.fn().mockResolvedValue([{
          id: 'mv-1', versionTag: 'v2.0.0', status: 'HEALTHY', isShadow: false,
          auc: 0.82, ks: 0.55, psi: 0.04,
          registry: { name: 'PD_MODEL' },
          metricsLogs: [{ id: 'log-1', loggedAt: new Date(), inferenceVolume: 10, errorRate: 0 }],
        }]),
        findFirst: jest.fn().mockResolvedValue({ id: 'mv-1' }),
        update: jest.fn().mockResolvedValue({}),
        ...prismaOverrides.modelVersion,
      },
      modelMetrics: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'ml-1' }),
        count: jest.fn().mockResolvedValue(0),
        ...prismaOverrides.modelMetrics,
      },
      alert: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'alert-1' }),
        ...prismaOverrides.alert,
      },
      auditEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        ...prismaOverrides.auditEvent,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: ScoringService,
          useValue: { score: jest.fn().mockResolvedValue({ engine: 'PYTHON', modelVersion: 'v2.0.0', scoredBy: 'PYTHON_XGBOOST' }) },
        },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    return prisma;
  };

  it('should persist errorRate=0 for PYTHON engine inference events', async () => {
    const prisma = await buildModule();
    await service.ingestScoringEvent({ engine: 'PYTHON', payloadQualityScore: 72, imputedFeaturesCount: 8, qualityBand: 'HIGH', latencyMs: 135 });
    expect(prisma.modelMetrics.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ errorRate: 0.0, avgPayloadQuality: 72, avgImputedCount: 8 }) })
    );
  });

  it('should persist errorRate=1 for FALLBACK engine events', async () => {
    const prisma = await buildModule();
    await service.ingestScoringEvent({ engine: 'FALLBACK', payloadQualityScore: 20, imputedFeaturesCount: 40, qualityBand: 'LOW' });
    expect(prisma.modelMetrics.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ errorRate: 1.0 }) })
    );
  });

  it('should skip ModelMetrics creation if no champion model is found', async () => {
    const prisma = await buildModule({
      modelVersion: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn(), update: jest.fn() },
    });
    await service.ingestScoringEvent({ engine: 'PYTHON', payloadQualityScore: 70, imputedFeaturesCount: 5, qualityBand: 'HIGH' });
    expect(prisma.modelMetrics.create).not.toHaveBeenCalled();
  });

  it('should aggregate trend logs by day and compute daily averages correctly', async () => {
    const today = new Date();
    const logs = [makeMetricsLog(today, 70, 8, 0), makeMetricsLog(today, 80, 5, 0)];
    await buildModule({ modelMetrics: { findMany: jest.fn().mockResolvedValue(logs), create: jest.fn(), count: jest.fn() } });
    const result = await service.getPayloadQualityTrend(undefined, 7);
    const bucket = result.find(r => r.date === today.toISOString().split('T')[0]);
    expect(bucket).toBeDefined();
    expect(bucket!.avgPayloadQuality).toBeCloseTo(75, 0);
    expect(bucket!.fallbackRate).toBe(0);
  });

  it('should set fallbackRate=1 when all inferences on a day were FALLBACK', async () => {
    const today = new Date();
    await buildModule({ modelMetrics: { findMany: jest.fn().mockResolvedValue([makeMetricsLog(today, 20, 30, 1)]), create: jest.fn(), count: jest.fn() } });
    const result = await service.getPayloadQualityTrend();
    const bucket = result.find(r => r.date === today.toISOString().split('T')[0]);
    expect(bucket?.fallbackRate).toBe(1);
  });

  it('should flag REVIEW_REQUIRED when fallback rate exceeds 10%', async () => {
    await buildModule({
      modelMetrics: { findMany: jest.fn(), create: jest.fn(), count: jest.fn().mockResolvedValueOnce(20).mockResolvedValueOnce(50) },
      alert: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
    });
    const result = await service.getFallbackHistory();
    expect(result.fallbackRate).toBeCloseTo(0.40, 2);
    expect(result.governanceFlag).toBe('REVIEW_REQUIRED');
  });

  it('should return ACCEPTABLE fallback governance flag when rate is under 10%', async () => {
    await buildModule({
      modelMetrics: { findMany: jest.fn(), create: jest.fn(), count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(200) },
      alert: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
    });
    const result = await service.getFallbackHistory();
    expect(result.governanceFlag).toBe('ACCEPTABLE');
  });

  it('should filter degradation timeline to only include DEGRADED and WARNING events', async () => {
    await buildModule({
      auditEvent: {
        findMany: jest.fn().mockResolvedValue([
          { timestamp: new Date(), entityId: 'mv-1', previousValue: { status: 'HEALTHY' }, newValue: { status: 'DEGRADED', psi: 0.28, reasons: ['PSI critical'] } },
          { timestamp: new Date(), entityId: 'mv-1', previousValue: { status: 'DEGRADED' }, newValue: { status: 'HEALTHY', psi: 0.05, reasons: [] } },
        ]),
      },
    });
    const result = await service.getDegradationTimeline();
    expect(result.length).toBe(1);
    expect(result[0].newStatus).toBe('DEGRADED');
  });

  it('should return empty degradation timeline when no drift events exist', async () => {
    await buildModule({ auditEvent: { findMany: jest.fn().mockResolvedValue([]) } });
    const result = await service.getDegradationTimeline();
    expect(result).toHaveLength(0);
  });
});
