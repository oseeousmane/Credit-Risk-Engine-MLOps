import { Test, TestingModule } from '@nestjs/testing';
import { RiskMathService } from './risk-math.service';
import { PrismaService } from '../prisma/prisma.service';
import { IFRS9Stage } from '@prisma/client';

describe('RiskMathService', () => {
  let service: RiskMathService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RiskMathService, { provide: PrismaService, useValue: {} }],
    }).compile();
    service = module.get<RiskMathService>(RiskMathService);
  });

  // â”€â”€ ECL Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('calculateECL â€” LGD Segments', () => {
    it('should apply 45% LGD for unsecured investment-grade (MED/LOW)', () => {
      const result = service.calculateECL(10, 1, 'MED', false);
      expect(result.lgd).toBe(0.45);
      expect(result.lgdMethod).toBe('UNSECURED_INVESTMENT_GRADE');
      expect(result.expectedLoss).toBeCloseTo(0.045, 4);
    });

    it('should apply 70% LGD for unsecured SME (HIGH risk)', () => {
      const result = service.calculateECL(10, 1, 'HIGH', false);
      expect(result.lgd).toBe(0.70);
      expect(result.lgdMethod).toBe('UNSECURED_SME_TIER');
    });

    it('should apply 85% LGD for unsecured CRITICAL risk', () => {
      const result = service.calculateECL(10, 1, 'CRITICAL', false);
      expect(result.lgd).toBe(0.85);
      expect(result.lgdMethod).toBe('UNSECURED_CRITICAL_SEGMENT');
    });

    it('should apply 25% standard LGD for RESIDENTIAL_REAL_ESTATE collateral', () => {
      const result = service.calculateECL(5, 10, 'HIGH', true, 'RESIDENTIAL_REAL_ESTATE');
      expect(result.lgd).toBe(0.25);
      expect(result.lgdMethod).toContain('SECURED_RESIDENTIAL_REAL_ESTATE_STANDARD');
    });

    it('should apply LTV adjustment when LTV is low (over-collateralized)', () => {
      // $20M collateral vs $10M loan â†’ LTV = 50%
      // New logic: LGD = rawLGD * (LTV + 0.2) = 0.25 * (0.5 + 0.2) = 0.175
      const result = service.calculateECL(5, 10, 'HIGH', true, 'RESIDENTIAL_REAL_ESTATE', 20);
      expect(result.lgd).toBeCloseTo(0.175, 3);
      expect(result.lgdMethod).toContain('LTV_50%');
    });

    it('should apply 5% LGD floor for CASH collateral (Basel)', () => {
      const result = service.calculateECL(5, 10, 'HIGH', true, 'CASH');
      expect(result.lgd).toBe(0.05);
    });
  });

  describe('calculateECL â€” EAD Calculation (Basel III CCF)', () => {
    it('should apply 100% CCF for TERM_LOAN (fully drawn)', () => {
      const result = service.calculateECL(5, 10, 'LOW', false, null, null, 0, 'TERM_LOAN');
      expect(result.ead).toBe(10);
      expect(result.eadMethod).toContain('FULLY_DRAWN');
    });

    it('should apply 40% CCF for REVOLVING_LINE undrawn portion', () => {
      // Drawn: $10M, Undrawn: $5M, CCF=40% â†’ EAD = 10 + 5*0.4 = 12M
      const result = service.calculateECL(5, 10, 'LOW', false, null, null, 5, 'REVOLVING_LINE');
      expect(result.ead).toBe(12);
      expect(result.eadMethod).toContain('BASEL_III_EAD');
    });
  });

  // â”€â”€ IFRS 9 Staging Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('assignStage â€” SICR Rules', () => {
    it('should assign STAGE_1 for normal conditions with no SICR', () => {
      const result = service.assignStage(2.0, 1.8, 0, false, false);
      expect(result.currentStage).toBe(IFRS9Stage.STAGE_1);
      expect(result.sicrTriggered).toBe(false);
    });

    it('should trigger STAGE_2 on SICR: PD doubled (2x increase)', () => {
      // 1.0 -> 2.0 is a 2x increase and absolute increase of 1.0%
      const result = service.assignStage(2.0, 1.0, 0, false, false);
      expect(result.currentStage).toBe(IFRS9Stage.STAGE_2);
      expect(result.sicrTriggered).toBe(true);
      expect(result.stagingReasons.some(r => r.includes('relative increase >= 2.0x'))).toBe(true);
    });

    it('should trigger STAGE_2 on 30 DPD Backstop', () => {
      const result = service.assignStage(1.0, 1.0, 31, false, false);
      expect(result.currentStage).toBe(IFRS9Stage.STAGE_2);
      expect(result.stagingReasons.some(r => r.includes('30 DPD Backstop'))).toBe(true);
    });

    it('should trigger STAGE_3 if DPD >= 90', () => {
      const result = service.assignStage(5.0, 1.0, 95, false, false);
      expect(result.currentStage).toBe(IFRS9Stage.STAGE_3);
    });

    it('should trigger STAGE_3 if PD >= 20% (unlikely-to-pay backstop)', () => {
      // Threshold changed from 100% (inoperative) to 20% per BCBS 2017 guidance.
      const result = service.assignStage(25.0, 1.0, 0, false, false);
      expect(result.currentStage).toBe(IFRS9Stage.STAGE_3);
      expect(result.stagingReasons.some(r => r.includes('unlikely-to-pay backstop'))).toBe(true);
    });

    it('should NOT trigger STAGE_3 on PD < 20% without DPD', () => {
      const result = service.assignStage(15.0, 1.0, 0, false, false);
      expect(result.currentStage).not.toBe(IFRS9Stage.STAGE_3);
    });
  });
});
