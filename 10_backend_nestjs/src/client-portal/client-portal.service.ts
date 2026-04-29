import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { plainToInstance } from 'class-transformer';
import { ClientApplicationDto } from './dto/client-application.dto';
import { ClientDocumentDto, UploadDocumentDto } from './dto/client-document.dto';
import { ClientNotificationDto } from './dto/client-notification.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';

@Injectable()
export class ClientPortalService {
  constructor(private readonly prisma: PrismaService) {}

  // Strict Data Sanitization Maps
  private safeApplicationStatus(internalStatus: string): string {
    const map: Record<string, string> = {
      SUBMITTED:        'under_review',
      DOCUMENTS_PENDING:'documents_required',
      DOCUMENTS_VALIDATED:'under_review',
      SCORED:           'under_review',
      ANALYST_REVIEW:   'under_review',
      MANAGER_REVIEW:   'under_review',
      COMMITTEE_REVIEW: 'under_review',
      APPROVED:         'approved',
      APPROVED_WITH_CONDITIONS: 'approved',
      REJECTED:         'rejected',
    }
    return map[internalStatus] ?? 'under_review'
  }

  private safeApplicationStatusLabel(internalStatus: string): string {
    const map: Record<string, string> = {
      SUBMITTED:        'Under Review',
      DOCUMENTS_PENDING:'Action Required',
      DOCUMENTS_VALIDATED:'Under Review',
      SCORED:           'Under Review',
      ANALYST_REVIEW:   'Under Review',
      MANAGER_REVIEW:   'Under Review',
      COMMITTEE_REVIEW: 'Under Review',
      APPROVED:         'Approved',
      APPROVED_WITH_CONDITIONS: 'Approved',
      REJECTED:         'Not Approved',
    }
    return map[internalStatus] ?? 'Under Review'
  }

  private safeDecisionLabel(internalDecision: string): string {
    const map: Record<string, string> = {
      APPROVE:                  'Approved',
      APPROVE_WITH_CONDITIONS:  'Approved (With Conditions)',
      SEND_TO_REVIEW:           'Under Review',
      REJECT:                   'Application not approved',
      PENDING:                  'Pending Review',
    }
    return map[internalDecision] ?? 'Under Review'
  }

  // â”€â”€â”€ Applications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getClientApplications(counterpartyId: string): Promise<ClientApplicationDto[]> {
    const apps = await this.prisma.application.findMany({
      where: { counterpartyId },
      orderBy: { createdAt: 'desc' },
      include: {
        decision: true,
        owner: { select: { name: true } },
      },
    });

    const mapped = apps.map(app => ({
      id: app.reqId,
      internalId: app.id,
      title: `Credit Application ${app.reqId}`,
      type: 'Facility Request',
      requestedAmount: app.requestedAmount,
      currency: 'USD',
      status: this.safeApplicationStatus(app.currentStage),
      statusLabel: this.safeApplicationStatusLabel(app.currentStage),
      submittedDate: app.createdAt,
      lastUpdated: app.updatedAt,
      slaDeadline: app.slaDeadline,
      nextStep: app.currentStage === 'DOCUMENTS_PENDING' ? 'Please upload required documents' : 'Awaiting Bank Review',
      eta: app.currentStage === 'APPROVED' || app.currentStage === 'REJECTED' ? 'Completed' : '~ 5-7 days',
      relationshipManager: app.owner?.name ?? 'Your Relationship Manager',
      decisionSummary: app.decision ? this.safeDecisionLabel(app.decision.status) : 'A decision is pending.',
      decision: app.decision ? {
        status: this.safeDecisionLabel(app.decision.status),
        decidedAt: app.decision.decidedAt,
      } : null,
      metadata: app.metadata,
    }));

    // plainToInstance enforces the @Expose() fields and strips everything else out (like PD, internal IDs, etc.)
    return plainToInstance(ClientApplicationDto, mapped, { excludeExtraneousValues: true });
  }

  async getClientApplicationById(counterpartyId: string, appReqId: string): Promise<ClientApplicationDto> {
    const app = await this.prisma.application.findUnique({
      where: { reqId: appReqId },
      include: {
        decision: true,
        owner: { select: { name: true } },
      },
    });

    if (!app || app.counterpartyId !== counterpartyId) {
      throw new NotFoundException('Application not found or access denied');
    }

    const mapped = {
      id: app.reqId,
      internalId: app.id,
      title: `Credit Application ${app.reqId}`,
      type: 'Facility Request',
      requestedAmount: app.requestedAmount,
      currency: 'USD',
      status: this.safeApplicationStatus(app.currentStage),
      statusLabel: this.safeApplicationStatusLabel(app.currentStage),
      submittedDate: app.createdAt,
      lastUpdated: app.updatedAt,
      slaDeadline: app.slaDeadline,
      nextStep: app.currentStage === 'DOCUMENTS_PENDING' ? 'Please upload required documents' : 'Awaiting Bank Review',
      eta: app.currentStage === 'APPROVED' || app.currentStage === 'REJECTED' ? 'Completed' : '~ 5-7 days',
      relationshipManager: app.owner?.name ?? 'Your Relationship Manager',
      decisionSummary: app.decision ? this.safeDecisionLabel(app.decision.status) : 'A decision is pending.',
      decision: app.decision ? {
        status: this.safeDecisionLabel(app.decision.status),
        decidedAt: app.decision.decidedAt,
      } : null,
      metadata: app.metadata,
    };

    return plainToInstance(ClientApplicationDto, mapped, { excludeExtraneousValues: true });
  }

  async submitNewApplication(counterpartyId: string, userId: string, dto: SubmitApplicationDto) {
    const reqId = `APP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    const app = await this.prisma.application.create({
      data: {
        reqId,
        requestedAmount: dto.requestedAmount,
        slaDeadline: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 day SLA default
        currentStage: 'SUBMITTED',
        counterpartyId,
        priority: false,
        pd: 0,
        createdBy: userId,
        metadata: dto.metadata || {},
      },
    });

    return {
      success: true,
      applicationId: app.reqId,
      message: 'Your application has been received. Our team will contact you.',
    };
  }

  // â”€â”€â”€ Documents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getClientDocuments(counterpartyId: string): Promise<ClientDocumentDto[]> {
    const docs = await this.prisma.document.findMany({
      where: { counterpartyId },
      include: { application: true },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = docs.map(doc => ({
      id: doc.id,
      type: doc.type,
      name: doc.name,
      description: doc.description,
      status: doc.status.toLowerCase(),
      rejectionReason: doc.rejectionReason,
      isRequired: doc.isRequired,
      appReqId: doc.application?.reqId,
      uploadedAt: doc.uploadedAt,
    }));

    return plainToInstance(ClientDocumentDto, mapped, { excludeExtraneousValues: true });
  }

  async uploadDocument(counterpartyId: string, userId: string, dto: UploadDocumentDto): Promise<ClientDocumentDto> {
    let appId = null;
    if (dto.applicationId) {
      const app = await this.prisma.application.findUnique({ where: { reqId: dto.applicationId } });
      // Strictly enforce ownership check on the referenced application
      if (app && app.counterpartyId === counterpartyId) {
        appId = app.id;
      }
    }

    const doc = await this.prisma.document.create({
      data: {
        name: dto.name,
        type: dto.type,
        status: 'PENDING_VALIDATION',
        fileUrl: '/storage/simulated_upload.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1540000,
        counterpartyId,
        applicationId: appId,
        uploadedById: userId,
        uploadedAt: new Date(),
      },
      include: { application: true },
    });

    const mapped = {
      id: doc.id,
      type: doc.type,
      name: doc.name,
      status: doc.status.toLowerCase(),
      appReqId: doc.application?.reqId,
      uploadedAt: doc.uploadedAt,
    };

    return plainToInstance(ClientDocumentDto, mapped, { excludeExtraneousValues: true });
  }

  // â”€â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getClientNotifications(userId: string): Promise<ClientNotificationDto[]> {
    const notes = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return plainToInstance(ClientNotificationDto, notes, { excludeExtraneousValues: true });
  }

  async markNotificationAsRead(userId: string, id: string) {
    const note = await this.prisma.notification.findUnique({ where: { id } });
    if (!note || note.userId !== userId) throw new NotFoundException('Notification not found or access denied');

    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return { success: true };
  }
}
