import { Test, TestingModule } from '@nestjs/testing';
import { PipelineService } from './pipeline.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role, PipelineStage, DocumentStatus } from '@prisma/client';

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const makeUser = (role: Role, id = 'user-001') => ({ id, role } as any);

const makeApp = (stage: PipelineStage, docs: any[] = []) => ({
  id: 'app-001',
  currentStage: stage,
  pd: 2.5,
  documents: docs,
});

const makeDoc = (status: DocumentStatus, uploadedById = 'user-001', isRequired = true) => ({
  id: 'doc-001',
  status,
  isRequired,
  uploadedById,
});

// â”€â”€ Mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const mockPrisma = {
  application: {
    findUniqueOrThrow: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
  document: {
    findUniqueOrThrow: jest.fn(),
    update: jest.fn().mockResolvedValue({ id: 'doc-001', status: 'VALIDATED' }),
  },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

// â”€â”€ Test Suite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe('PipelineService â€” Backend Governance', () => {
  let service: PipelineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<PipelineService>(PipelineService);
    jest.clearAllMocks();
  });

  // â”€â”€ A. Illegal Stage Transitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('A â€” Illegal Stage Transitions', () => {
    it('should REJECT skipping from SUBMITTED directly to SCORED', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(makeApp('SUBMITTED'));
      const actor = makeUser(Role.ANALYST);
      await expect(service.moveStage('app-001', 'SCORED', actor))
        .rejects.toThrow(BadRequestException);
    });

    it('should REJECT moving from SCORED back to SUBMITTED (reverse transition)', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(makeApp('SCORED'));
      const actor = makeUser(Role.ANALYST);
      await expect(service.moveStage('app-001', 'SUBMITTED', actor))
        .rejects.toThrow(BadRequestException);
    });

    it('should REJECT skipping from DOCUMENTS_PENDING directly to ANALYST_REVIEW', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(makeApp('DOCUMENTS_PENDING'));
      const actor = makeUser(Role.MANAGER);
      await expect(service.moveStage('app-001', 'ANALYST_REVIEW', actor))
        .rejects.toThrow(BadRequestException);
    });

    it('should ALLOW a valid SUBMITTED â†’ DOCUMENTS_PENDING transition', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(makeApp('SUBMITTED'));
      const actor = makeUser(Role.ANALYST);
      await expect(service.moveStage('app-001', 'DOCUMENTS_PENDING', actor))
        .resolves.not.toThrow();
    });
  });

  // â”€â”€ B. Role-Based Transition Authority â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('B â€” Role-Based Transition Authority', () => {
    it('should BLOCK CLIENT role from moving any stage', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(makeApp('SUBMITTED'));
      const actor = makeUser(Role.CLIENT);
      await expect(service.moveStage('app-001', 'DOCUMENTS_PENDING', actor))
        .rejects.toThrow(ForbiddenException);
    });

    it('should BLOCK ANALYST from approving at COMMITTEE_REVIEW stage', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(makeApp('COMMITTEE_REVIEW', []));
      const actor = makeUser(Role.ANALYST);
      await expect(service.moveStage('app-001', 'APPROVED', actor))
        .rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW CRO to approve at COMMITTEE_REVIEW', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(makeApp('COMMITTEE_REVIEW', []));
      const actor = makeUser(Role.CRO);
      await expect(service.moveStage('app-001', 'APPROVED', actor))
        .resolves.not.toThrow();
    });

    it('should ALLOW ADMIN to bypass stage role restrictions', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(makeApp('SUBMITTED'));
      const actor = makeUser(Role.ADMIN);
      await expect(service.moveStage('app-001', 'DOCUMENTS_PENDING', actor))
        .resolves.not.toThrow();
    });
  });

  // â”€â”€ C. Document Gate Before Scoring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('C â€” Document Gate (DOCUMENTS_VALIDATED â†’ SCORED)', () => {
    it('should BLOCK scoring if a required document is UPLOADED (not yet validated)', async () => {
      const docs = [makeDoc('UPLOADED'), makeDoc('VALIDATED')];
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(makeApp('DOCUMENTS_VALIDATED', docs));
      const actor = makeUser(Role.ANALYST);
      await expect(service.moveStage('app-001', 'SCORED', actor))
        .rejects.toThrow(BadRequestException);
    });

    it('should BLOCK scoring if required document is PENDING_VALIDATION', async () => {
      const docs = [makeDoc('PENDING_VALIDATION')];
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(makeApp('DOCUMENTS_VALIDATED', docs));
      const actor = makeUser(Role.ANALYST);
      await expect(service.moveStage('app-001', 'SCORED', actor))
        .rejects.toThrow(BadRequestException);
    });

    it('should BLOCK scoring if there are NO required documents at all', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(makeApp('DOCUMENTS_VALIDATED', []));
      const actor = makeUser(Role.ANALYST);
      await expect(service.moveStage('app-001', 'SCORED', actor))
        .rejects.toThrow(BadRequestException);
    });

    it('should ALLOW scoring when ALL required documents are VALIDATED', async () => {
      const docs = [makeDoc('VALIDATED'), makeDoc('VALIDATED', 'user-002')];
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(makeApp('DOCUMENTS_VALIDATED', docs));
      const actor = makeUser(Role.ANALYST);
      await expect(service.moveStage('app-001', 'SCORED', actor))
        .resolves.not.toThrow();
    });

    it('should IGNORE non-required documents when checking the gate', async () => {
      const docs = [
        makeDoc('VALIDATED', 'user-001', true),            // required + validated âœ“
        makeDoc('UPLOADED', 'user-002', false),            // not required â€” ignored
      ];
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(makeApp('DOCUMENTS_VALIDATED', docs));
      const actor = makeUser(Role.ANALYST);
      await expect(service.moveStage('app-001', 'SCORED', actor))
        .resolves.not.toThrow();
    });
  });

  // â”€â”€ D. Maker / Checker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('D â€” Maker/Checker Document Validation', () => {
    it('should BLOCK self-validation (uploader = validator)', async () => {
      mockPrisma.document.findUniqueOrThrow.mockResolvedValue(makeDoc('PENDING_VALIDATION', 'user-001'));
      const actor = makeUser(Role.ANALYST, 'user-001'); // same user as uploader
      await expect(service.validateDocument('doc-001', actor, 'OK'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW validation by a different user', async () => {
      mockPrisma.document.findUniqueOrThrow.mockResolvedValue(makeDoc('PENDING_VALIDATION', 'user-999'));
      const actor = makeUser(Role.ANALYST, 'user-001'); // different from uploader
      await expect(service.validateDocument('doc-001', actor, 'Looks good'))
        .resolves.not.toThrow();
    });

    it('should BLOCK rejection without a reason', async () => {
      mockPrisma.document.findUniqueOrThrow.mockResolvedValue(makeDoc('PENDING_VALIDATION', 'user-999'));
      const actor = makeUser(Role.MANAGER, 'user-001');
      await expect(service.rejectDocument('doc-001', actor, ''))
        .rejects.toThrow(BadRequestException);
    });

    it('should emit DOCUMENT_VALIDATED AuditEvent on success', async () => {
      mockPrisma.document.findUniqueOrThrow.mockResolvedValue(makeDoc('PENDING_VALIDATION', 'user-999'));
      const actor = makeUser(Role.ANALYST, 'user-001');
      await service.validateDocument('doc-001', actor, 'All good');
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
        eventType: 'DOCUMENT_VALIDATED',
        entityType: 'Document',
        entityId: 'doc-001',
      }));
    });

    it('should emit DOCUMENT_REJECTED AuditEvent on rejection', async () => {
      mockPrisma.document.findUniqueOrThrow.mockResolvedValue(makeDoc('PENDING_VALIDATION', 'user-999'));
      mockPrisma.document.update.mockResolvedValue({ id: 'doc-001', status: 'REJECTED' });
      const actor = makeUser(Role.MANAGER, 'user-001');
      await service.rejectDocument('doc-001', actor, 'Missing signature');
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
        eventType: 'DOCUMENT_REJECTED',
        entityType: 'Document',
      }));
    });
  });

  // â”€â”€ E. Audit Trail on Stage Transition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('E â€” AuditEvent generation on stage transitions', () => {
    it('should emit APPLICATION_STAGE_CHANGED with previousValue and newValue', async () => {
      mockPrisma.application.findUniqueOrThrow.mockResolvedValue(makeApp('SUBMITTED'));
      const actor = makeUser(Role.ANALYST);
      await service.moveStage('app-001', 'DOCUMENTS_PENDING', actor);
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
        eventType: 'APPLICATION_STAGE_CHANGED',
        previousValue: { stage: 'SUBMITTED' },
        newValue: { stage: 'DOCUMENTS_PENDING' },
      }));
    });
  });
});
