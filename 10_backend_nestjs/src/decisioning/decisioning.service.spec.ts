import { Test, TestingModule } from '@nestjs/testing';
import { DecisioningService } from './decisioning.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ScoringService } from '../scoring/scoring.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { RiskMathService } from '../risk-math/risk-math.service';
import { MonitoringService } from '../monitoring/monitoring.service';
import { WebhookDispatcherService } from '../webhook/webhook-dispatcher.service';
import { ForbiddenException } from '@nestjs/common';

// â”€â”€ Mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const baseApp = {
  id: 'app-uuid-001',
  reqId: 'APP-2025-0001',
  requestedAmount: 25_000_000,
  currentStage: 'COMMITTEE_REVIEW',
  counterpartyId: 'cp-uuid-001',
  pd: 1.5,
  priority: false,
  slaDeadline: new Date(),
  ownerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: null,
  updatedBy: null,
  counterparty: {
    id: 'cp-uuid-001',
    riskLevel: 'LOW',
    internalRating: 'BBB',
  },
};

const pythonScoreResult = {
  recommendation: 'APPROVE' as const,
  confidence: 0.92,
  pdScore: 1.5,
  rationale: 'PD is well below policy threshold.',
  xaiDrivers: [{ label: 'PD', impact: -0.15, direction: 'positive', category: 'Credit Risk' }],
  modelVersion: 'xgb_v2.4.1',
  scoredBy: 'ML_MODEL' as const,
  engine: 'PYTHON' as const,
  imputedFeaturesCount: 0,
  inferenceTimestamp: '2026-04-25T00:00:00.000Z',
};

const fallbackScoreResult = {
  ...pythonScoreResult,
  scoredBy: 'RULE_ENGINE' as const,
  engine: 'FALLBACK' as const,
  modelVersion: 'rule_engine_v1',
  imputedFeaturesCount: 0,
};

const mockDecision = {
  id: 'decision-uuid-001',
  applicationId: 'app-uuid-001',
  status: 'APPROVE',
  decisionType: 'ML_AUTO',
  overrideFlag: false,
  overrideReason: null,
};

const mockPrisma = {
  application: {
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  decision: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  counterparty: {
    update: jest.fn(),
  },
  alert: {
    create: jest.fn(),
  },
};

const mockAudit = {
  log: jest.fn().mockResolvedValue({ id: 'audit-001' }),
};

const mockScoring = {
  score: jest.fn(),
};

const mockPipeline = {
  moveStage: jest.fn().mockResolvedValue({ id: 'app-uuid-001', currentStage: 'FINAL_APPROVAL' }),
};

const mockMonitoring = {
  ingestScoringEvent: jest.fn().mockResolvedValue({ id: 'metrics-001' }),
};

const analyst = { id: 'user-001', role: 'ANALYST' };
const riskManager = { id: 'user-002', role: 'MANAGER' };

// â”€â”€ Test Suite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('DecisioningService', () => {
  let service: DecisioningService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecisioningService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: ScoringService, useValue: mockScoring },
        { provide: PipelineService, useValue: mockPipeline },
        { provide: MonitoringService, useValue: mockMonitoring },
        {
          provide: RiskMathService,
          useValue: {
            calculateECL: jest.fn().mockReturnValue({ expectedLoss: 0 }),
            assignStage: jest.fn().mockReturnValue({ currentStage: 'STAGE_1' }),
          },
        },
        {
          provide: WebhookDispatcherService,
          useValue: { dispatch: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<DecisioningService>(DecisioningService);
    jest.clearAllMocks();
  });

  describe('evaluateApplication', () => {
    it('should call scoring service and return evaluation result', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(baseApp);
      mockScoring.score.mockResolvedValue(pythonScoreResult);

      const result = await service.evaluateApplication('app-uuid-001');

      expect(result.recommendation).toBe('APPROVE');
      expect(result.scoredBy).toBe('ML_MODEL');
      expect(result.engine).toBe('PYTHON');
      expect(mockScoring.score).toHaveBeenCalledWith(
        expect.objectContaining({ applicationId: 'app-uuid-001' }),
      );
    });

    it('should return fallback engine indicator when Python is unavailable', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(baseApp);
      mockScoring.score.mockResolvedValue(fallbackScoreResult);

      const result = await service.evaluateApplication('app-uuid-001');

      expect(result.engine).toBe('FALLBACK');
      expect(result.scoredBy).toBe('RULE_ENGINE');
    });
  });

  describe('submitDecision â€” RBAC', () => {
    it('should throw ForbiddenException when ANALYST tries to override', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(baseApp);
      mockScoring.score.mockResolvedValue(pythonScoreResult);

      await expect(
        service.submitDecision('app-uuid-001', analyst, 'REJECT' as any, 'Override by analyst'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow MANAGER to approve', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(baseApp);
      mockScoring.score.mockResolvedValue(pythonScoreResult);
      mockPrisma.decision.upsert.mockResolvedValue(mockDecision);

      const result = await service.submitDecision('app-uuid-001', riskManager);

      expect(result.decision.status).toBe('APPROVE');
      expect(mockPipeline.moveStage).toHaveBeenCalledWith(
        'app-uuid-001',
        'APPROVED',
        expect.objectContaining({ role: 'MANAGER' }),
      );
    });
  });

  describe('submitDecision â€” override logic', () => {
    it('should throw ForbiddenException when override reason is missing', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(baseApp);
      // Python recommends APPROVE, user wants to REJECT (override) â€” but no reason
      mockScoring.score.mockResolvedValue({ ...pythonScoreResult, recommendation: 'APPROVE' });

      await expect(
        service.submitDecision('app-uuid-001', riskManager, 'REJECT' as any, undefined),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed with override when justification is provided', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(baseApp);
      mockScoring.score.mockResolvedValue({ ...pythonScoreResult, recommendation: 'APPROVE' });
      mockPrisma.decision.upsert.mockResolvedValue({
        ...mockDecision,
        status: 'REJECT',
        overrideFlag: true,
        decisionType: 'MANUAL_COMMITTEE',
      });

      const result = await service.submitDecision(
        'app-uuid-001',
        riskManager,
        'REJECT' as any,
        'Risk concentration too high per policy rev 2026-Q1',
      );

      expect(result.isOverride).toBe(true);
      expect(result.decision.overrideFlag).toBe(true);
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'DECISION_OVERRIDE' }),
      );
    });
  });

  describe('submitDecision â€” audit trail', () => {
    it('should always write an audit event after any successful decision', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(baseApp);
      mockScoring.score.mockResolvedValue(pythonScoreResult);
      mockPrisma.decision.upsert.mockResolvedValue(mockDecision);

      await service.submitDecision('app-uuid-001', riskManager);

      expect(mockAudit.log).toHaveBeenCalledTimes(1);
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'DECISION_SUBMITTED',
          entityType: 'Decision',
          actorId: riskManager.id,
        }),
      );
    });

    it('should advance pipeline stage to APPROVED on APPROVE', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(baseApp);
      mockScoring.score.mockResolvedValue(pythonScoreResult); // APPROVE
      mockPrisma.decision.upsert.mockResolvedValue(mockDecision);

      await service.submitDecision('app-uuid-001', riskManager);

      expect(mockPipeline.moveStage).toHaveBeenCalledWith(
        'app-uuid-001', 'APPROVED', expect.anything(),
      );
    });

    it('should advance pipeline to REJECTED on REJECT decision', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(baseApp);
      mockScoring.score.mockResolvedValue({ ...pythonScoreResult, recommendation: 'REJECT' });
      mockPrisma.decision.upsert.mockResolvedValue({ ...mockDecision, status: 'REJECT' });

      await service.submitDecision('app-uuid-001', riskManager);

      expect(mockPipeline.moveStage).toHaveBeenCalledWith(
        'app-uuid-001', 'REJECTED', expect.anything(),
      );
    });

    it('should explicitly alert and audit when the fallback engine is used', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(baseApp);
      // Simulate fallback response
      mockScoring.score.mockResolvedValue({ ...fallbackScoreResult, recommendation: 'APPROVE' });
      mockPrisma.decision.upsert.mockResolvedValue(mockDecision);

      await service.submitDecision('app-uuid-001', riskManager);

      // Verify explicit fallback audit event
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'FALLBACK_ENGINE_USED',
          entityType: 'Decision',
          newValue: expect.objectContaining({ engine: 'FALLBACK' })
        }),
      );

      // Verify explicitly generated alert
      expect(mockPrisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: 'WARNING',
            message: 'Decision finalized using FALLBACK Rule Engine.'
          })
        })
      );
    });
  });
});
