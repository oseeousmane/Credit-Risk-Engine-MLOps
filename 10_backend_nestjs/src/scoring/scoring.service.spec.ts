import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ScoringService } from './scoring.service';
import { OrchestrationService } from './orchestration.service';

describe('ScoringService (Unit)', () => {
  let scoringService: ScoringService;
  let orchestrationService: OrchestrationService;

  beforeEach(async () => {
    // Mock OrchestrationService
    const mockOrchestrator = {
      getActiveModelVersion: jest.fn().mockResolvedValue('xgboost_active_v1'),
      ingestModelMetrics: jest.fn(),
      triggerRetrainingJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringService,
        { provide: OrchestrationService, useValue: mockOrchestrator },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:8000') } },
      ],
    }).compile();

    scoringService = module.get<ScoringService>(ScoringService);
    orchestrationService = module.get<OrchestrationService>(OrchestrationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(scoringService).toBeDefined();
    expect(orchestrationService).toBeDefined();
  });

  describe('score() with Python Fallback', () => {
    it('should invoke the local rule engine if Python fetch fails networkly', async () => {
      // Mock fetch to simulate network error / Connection Refused
      global.fetch = jest.fn(() => Promise.reject(new Error('Connection refused'))) as jest.Mock;

      const req = {
        applicationId: 'APP-TEST-001',
        pdCurrent: 0.2, // Very low PD -> Should AUTO APPROVE by rules
        exposure: 10,  // Low exposure
        riskLevel: 'LOW',
      };

      const result = await scoringService.score(req);

      expect(orchestrationService.getActiveModelVersion).toHaveBeenCalledWith('XGBOOST');
      expect(result.engine).toBe('FALLBACK');
      expect(result.recommendation).toBe('APPROVE');
      expect(result.scoredBy).toBe('RULE_ENGINE');
      expect(result.activeVersion).toBe('rule_engine_v1');
    });

    it('should auto-reject via local rule engine if PD is extremely high on fallback', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Timeout'))) as jest.Mock;

      const req = {
        applicationId: 'APP-TEST-002',
        pdCurrent: 8.5, // > 6.0 policy MAX
        exposure: 2,
        riskLevel: 'HIGH',
      };

      const result = await scoringService.score(req);

      expect(result.engine).toBe('FALLBACK');
      expect(result.recommendation).toBe('REJECT');
      expect(result.rationale).toContain('exceeds maximum acceptable threshold');
    });
  });
});
