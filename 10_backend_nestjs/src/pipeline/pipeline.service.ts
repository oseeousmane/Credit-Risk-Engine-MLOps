import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PipelineStage, Role, User } from '@prisma/client';
import { paginate } from '../common/pagination';
import { PaginationDto } from '../common/dto/query.dto';

const STAGE_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  SUBMITTED: ['DOCUMENTS_PENDING', 'REJECTED'],
  DOCUMENTS_PENDING: ['DOCUMENTS_VALIDATED', 'REJECTED'],
  DOCUMENTS_VALIDATED: ['SCORED', 'REJECTED'],
  SCORED: ['ANALYST_REVIEW', 'REJECTED'],
  ANALYST_REVIEW: ['MANAGER_REVIEW', 'REJECTED'],
  MANAGER_REVIEW: ['COMMITTEE_REVIEW', 'APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED'],
  COMMITTEE_REVIEW: ['APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED'],
  APPROVED: [],
  APPROVED_WITH_CONDITIONS: [],
  REJECTED: [],
};

const STAGE_ROLES: Record<PipelineStage, Role[]> = {
  SUBMITTED: [Role.ANALYST, Role.MANAGER, Role.CRO],
  DOCUMENTS_PENDING: [Role.ANALYST, Role.MANAGER, Role.CRO],
  DOCUMENTS_VALIDATED: [Role.ANALYST, Role.MANAGER, Role.CRO], // System usually triggers SCORED, but analysts can push it
  SCORED: [Role.ANALYST, Role.MANAGER, Role.CRO],
  ANALYST_REVIEW: [Role.ANALYST, Role.MANAGER, Role.CRO],
  MANAGER_REVIEW: [Role.MANAGER, Role.CRO],
  COMMITTEE_REVIEW: [Role.CRO],
  APPROVED: [],
  APPROVED_WITH_CONDITIONS: [],
  REJECTED: [],
};

@Injectable()
export class PipelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: PaginationDto & { stage?: string }) {
    const { page = 1, limit = 20, stage } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (stage) where.currentStage = stage;

    const [data, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { slaDeadline: 'asc' }],
        include: {
          counterparty: { select: { name: true, sector: true, internalRating: true } },
          owner: { select: { name: true } },
        },
      }),
      this.prisma.application.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async moveStage(applicationId: string, newStage: PipelineStage, actor: User) {
    const app = await this.prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: { documents: true }
    });

    const previousStage = app.currentStage;

    // Validate Transition Matrix
    if (!STAGE_TRANSITIONS[previousStage].includes(newStage)) {
      throw new BadRequestException(`INVALID_STAGE_TRANSITION: Cannot move from ${previousStage} to ${newStage}`);
    }

    // Validate Role Capabilities
    if (!STAGE_ROLES[previousStage].includes(actor.role as Role) && actor.role !== Role.ADMIN) {
      throw new ForbiddenException(`ROLE_NOT_ALLOWED: Role ${actor.role} does not have authority to move from ${previousStage}`);
    }

    // Required Conditions per stage
    if (newStage === 'SCORED') {
      const requiredDocs = app.documents.filter(d => d.isRequired);
      const allValidated = requiredDocs.length > 0 && requiredDocs.every(d => d.status === 'VALIDATED');
      if (!allValidated) {
        throw new BadRequestException('REQUIRED_DOCUMENTS_NOT_VALIDATED: Cannot score application without all required documents validated.');
      }
    }

    if (newStage === 'ANALYST_REVIEW') {
      if (!app.pd || app.pd === 0) {
        throw new BadRequestException('SCORING_NOT_AVAILABLE: Cannot move to Analyst Review without a valid score.');
      }
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: { currentStage: newStage, updatedBy: actor.id },
    });

    // Create immutable audit trail for this stage transition
    await this.audit.log({
      eventType: 'APPLICATION_STAGE_CHANGED',
      entityType: 'Application',
      entityId: applicationId,
      actorId: actor.id,
      previousValue: { stage: previousStage },
      newValue: { stage: newStage },
    });

    return updated;
  }

  async getStageGroups() {
    const allApps = await this.prisma.application.findMany({
      orderBy: [{ priority: 'desc' }, { slaDeadline: 'asc' }],
      include: {
        counterparty: { select: { name: true, sector: true, internalRating: true } },
        owner: { select: { name: true } },
      },
    });

    const stages: Record<string, typeof allApps> = {
      SUBMITTED: [],
      DOCUMENTS_PENDING: [],
      DOCUMENTS_VALIDATED: [],
      SCORED: [],
      ANALYST_REVIEW: [],
      MANAGER_REVIEW: [],
      COMMITTEE_REVIEW: [],
      APPROVED: [],
      APPROVED_WITH_CONDITIONS: [],
      REJECTED: []
    };

    for (const app of allApps) {
      if (stages[app.currentStage]) {
        stages[app.currentStage].push(app);
      }
    }

    return stages;
  }

  // ================= DOCUMENT VALIDATION =================

  async validateDocument(documentId: string, actor: User, comment?: string) {
    const doc = await this.prisma.document.findUniqueOrThrow({
      where: { id: documentId }
    });

    if (doc.uploadedById === actor.id) {
      throw new ForbiddenException('MAKER_CHECKER_VIOLATION: You cannot validate a document you uploaded.');
    }

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'VALIDATED',
        validatedById: actor.id,
        validatedAt: new Date(),
        validationComment: comment,
        rejectionReason: null
      }
    });

    await this.audit.log({
      eventType: 'DOCUMENT_VALIDATED',
      entityType: 'Document',
      entityId: documentId,
      actorId: actor.id,
      previousValue: { status: doc.status },
      newValue: { status: 'VALIDATED', comment }
    });

    return updated;
  }

  async rejectDocument(documentId: string, actor: User, reason: string) {
    if (!reason) {
      throw new BadRequestException('REJECTION_REASON_REQUIRED: You must provide a reason for rejecting the document.');
    }

    const doc = await this.prisma.document.findUniqueOrThrow({
      where: { id: documentId }
    });

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'REJECTED',
        validatedById: actor.id,
        validatedAt: new Date(),
        rejectionReason: reason
      }
    });

    await this.audit.log({
      eventType: 'DOCUMENT_REJECTED',
      entityType: 'Document',
      entityId: documentId,
      actorId: actor.id,
      previousValue: { status: doc.status },
      newValue: { status: 'REJECTED', reason }
    });

    return updated;
  }
}
