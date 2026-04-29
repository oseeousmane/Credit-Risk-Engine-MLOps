import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RegistryService } from './registry.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const makeVersion = (overrides: Partial<any> = {}) => ({
  id: 'v1',
  modelId: 'model-1',
  versionTag: 'v2.0.0',
  status: 'HEALTHY',
  lifecycleStatus: 'CHAMPION',
  deploymentStatus: 'PRODUCTION',
  auc: 0.82,
  ks: 0.55,
  psi: 0.05,
  createdAt: new Date(),
  registry: { name: 'PD_MODEL' },
  metricsLogs: [],
  ...overrides,
});

// â”€â”€â”€ Mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildPrisma(overrides: any = {}) {
  return {
    modelVersion: {
      findMany: jest.fn().mockResolvedValue([makeVersion()]),
      findFirst: jest.fn().mockResolvedValue(makeVersion()),
      findUnique: jest.fn().mockResolvedValue(makeVersion()),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...makeVersion(), ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      ...overrides.modelVersion,
    },
    alert: {
      create: jest.fn().mockResolvedValue({ id: 'alert-1' }),
      ...overrides.alert,
    },
  };
}

function buildAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

// â”€â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('RegistryService â€” MLOps Orchestration (Phase 4)', () => {
  let service: RegistryService;
  let prisma: ReturnType<typeof buildPrisma>;
  let audit: ReturnType<typeof buildAudit>;

  const init = async (prismaOverrides: any = {}) => {
    prisma = buildPrisma(prismaOverrides);
    audit = buildAudit();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistryService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<RegistryService>(RegistryService);
  };

  // â”€â”€ getAllVersions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('getAllVersions()', () => {
    it('should return enriched version list with champion/challenger flags', async () => {
      await init();
      const result = await service.getAllVersions();
      expect(result).toHaveLength(1);
      expect(result[0].isChampion).toBe(true);
      expect(result[0].isChallenger).toBe(false);
      expect(result[0].registryName).toBe('PD_MODEL');
    });

    it('should mark shadow+non-archived versions as challengers', async () => {
      await init({
        modelVersion: {
          findMany: jest.fn().mockResolvedValue([
            makeVersion({ status: 'WARNING', lifecycleStatus: 'CHALLENGER', deploymentStatus: 'SHADOW' }),
          ]),
        },
      });
      const result = await service.getAllVersions();
      expect(result[0].isChallenger).toBe(true);
      expect(result[0].isChampion).toBe(false);
    });
  });

  // â”€â”€ getChampion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('getChampion()', () => {
    it('should return the active champion model', async () => {
      await init();
      const result = await service.getChampion();
      expect(result.champion).toBeDefined();
      expect(result.champion!.versionTag).toBe('v2.0.0');
    });

    it('should return null champion if no HEALTHY model exists', async () => {
      await init({
        modelVersion: { findFirst: jest.fn().mockResolvedValue(null) },
      });
      const result = await service.getChampion();
      expect(result.champion).toBeNull();
    });
  });

  // â”€â”€ compareVersions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('compareVersions()', () => {
    it('should correctly identify the winner based on AUC', async () => {
      const vA = makeVersion({ id: 'vA', versionTag: 'v2.0.0', auc: 0.85 });
      const vB = makeVersion({ id: 'vB', versionTag: 'v1.9.0', auc: 0.78 });

      await init({
        modelVersion: {
          findUnique: jest.fn()
            .mockResolvedValueOnce(vA)
            .mockResolvedValueOnce(vB),
        },
      });

      const result = await service.compareVersions('vA', 'vB');
      expect(result.comparison.winner).toBe('A');
      expect(result.comparison.aucDelta).toBeCloseTo(0.07, 2);
      expect(result.comparison.recommendation).toContain('v2.0.0');
    });

    it('should throw NotFoundException if either version is missing', async () => {
      await init({
        modelVersion: {
          findUnique: jest.fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(makeVersion()),
        },
      });

      await expect(service.compareVersions('bad-id', 'vB')).rejects.toThrow(NotFoundException);
    });
  });

  // â”€â”€ promoteToChampion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('promoteToChampion()', () => {
    it('should promote candidate and demote existing champion', async () => {
      const currentChampion = makeVersion({ id: 'old-champ', versionTag: 'v1.0.0' });
      const candidate = makeVersion({ id: 'new-champ', versionTag: 'v2.0.0', status: 'WARNING', lifecycleStatus: 'CHALLENGER', deploymentStatus: 'SHADOW' });

      await init({
        modelVersion: {
          findUnique: jest.fn().mockResolvedValue(candidate),
          findMany: jest.fn().mockResolvedValue([currentChampion]),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          update: jest.fn().mockResolvedValue({ ...candidate, status: 'HEALTHY', lifecycleStatus: 'CHAMPION', deploymentStatus: 'PRODUCTION' }),
        },
      });

      const result = await service.promoteToChampion('new-champ', 'actor-1');

      expect(prisma.modelVersion.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: { lifecycleStatus: 'ARCHIVED', deploymentStatus: 'DISABLED' },
      }));
      expect(audit.log).toHaveBeenCalledTimes(1);
      expect(prisma.alert.create).toHaveBeenCalledTimes(1);
      expect(result.promoted.status).toBe('HEALTHY');
    });

    it('should throw BadRequestException when promoting an ARCHIVED model', async () => {
      await init({
        modelVersion: {
          findUnique: jest.fn().mockResolvedValue(makeVersion({ lifecycleStatus: 'ARCHIVED' })),
          findMany: jest.fn().mockResolvedValue([]),
        },
      });

      await expect(service.promoteToChampion('v1', 'actor-1')).rejects.toThrow(BadRequestException);
    });
  });

  // â”€â”€ markAsChallenger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('markAsChallenger()', () => {
    it('should set isShadow=true and write audit log', async () => {
      await init({
        modelVersion: {
          findUnique: jest.fn().mockResolvedValue(makeVersion({ lifecycleStatus: 'CHALLENGER', deploymentStatus: 'DISABLED' })),
          update: jest.fn().mockResolvedValue(makeVersion({ lifecycleStatus: 'CHALLENGER', deploymentStatus: 'SHADOW' })),
        },
      });

      const result = await service.markAsChallenger('v1', 'actor-1');
      expect(result.updated.status).toBe('CHALLENGER');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'MODEL_MARKED_CHALLENGER' })
      );
    });

    it('should throw BadRequestException for archived model', async () => {
      await init({
        modelVersion: { findUnique: jest.fn().mockResolvedValue(makeVersion({ lifecycleStatus: 'ARCHIVED' })) },
      });

      await expect(service.markAsChallenger('v1')).rejects.toThrow(BadRequestException);
    });
  });

  // â”€â”€ archiveModel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('archiveModel()', () => {
    it('should archive a non-champion model and write audit log', async () => {
      await init({
        modelVersion: {
          findUnique: jest.fn().mockResolvedValue(makeVersion({ lifecycleStatus: 'CHALLENGER', deploymentStatus: 'SHADOW' })),
          update: jest.fn().mockResolvedValue(makeVersion({ lifecycleStatus: 'ARCHIVED', deploymentStatus: 'DISABLED' })),
        },
      });

      const result = await service.archiveModel('v1', 'actor-1');
      expect(result.archived.status).toBe('ARCHIVED');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'MODEL_ARCHIVED' })
      );
    });

    it('should prevent archiving the active champion', async () => {
      await init({
        modelVersion: {
          findUnique: jest.fn().mockResolvedValue(makeVersion({ lifecycleStatus: 'CHAMPION', deploymentStatus: 'PRODUCTION' })),
        },
      });

      await expect(service.archiveModel('v1')).rejects.toThrow(BadRequestException);
    });
  });

  // â”€â”€ requestReview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('requestReview()', () => {
    it('should set status to DEGRADED and create a WARNING alert', async () => {
      await init({
        modelVersion: {
          findUnique: jest.fn().mockResolvedValue(makeVersion()),
          update: jest.fn().mockResolvedValue(makeVersion({ status: 'DEGRADED' })),
        },
      });

      const result = await service.requestReview('v1', 'PSI exceeded 0.25 threshold');
      expect(result.status).toBe('DEGRADED');
      expect(prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ severity: 'WARNING' }) })
      );
    });
  });

  // â”€â”€ requestRetraining â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('requestRetraining()', () => {
    it('should emit a RETRAINING_REQUESTED audit event without calling update', async () => {
      await init({
        modelVersion: {
          findUnique: jest.fn().mockResolvedValue(makeVersion()),
        },
      });

      const result = await service.requestRetraining('v1', 'Scheduled monthly retrain', 'actor-1');
      expect(result.reason).toBe('Scheduled monthly retrain');
      expect(result.orchestrationHook ?? result.message).toBeDefined();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'RETRAINING_REQUESTED' })
      );
      // update must NOT be called â€” retraining doesn't change model status
      expect(prisma.modelVersion.update).not.toHaveBeenCalled();
    });
  });
});
