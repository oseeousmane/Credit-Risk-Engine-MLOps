import { Controller, Get, Post, Param, Body, Req, UseGuards, ForbiddenException, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClientPortalService } from './client-portal.service';
import { Role } from '@prisma/client';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { UploadDocumentDto } from './dto/client-document.dto';

/**
 * CLIENT PORTAL CONTROLLER
 *
 * Enforcing strict RBAC and Ownership:
 * 1. User must be Role.CLIENT
 * 2. User must possess a counterpartyId
 * 3. All service operations implicitly filter by counterpartyId
 */
@UseGuards(AuthGuard('jwt'))
@Controller('client')
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  private validateClient(user: any): string {
    if (user.role !== Role.CLIENT) {
      throw new ForbiddenException('This endpoint is restricted to CLIENT users only');
    }
    if (!user.counterpartyId) {
      throw new ForbiddenException('No verified counterparty linked to this client account');
    }
    return user.counterpartyId;
  }

  // ================= APPLICATIONS =================

  @Get('applications')
  getApplications(@Req() req: any) {
    const cpId = this.validateClient(req.user);
    return this.clientPortalService.getClientApplications(cpId);
  }

  @Get('applications/:id')
  getApplicationById(@Param('id') id: string, @Req() req: any) {
    const cpId = this.validateClient(req.user);
    return this.clientPortalService.getClientApplicationById(cpId, id);
  }

  @Post('applications')
  submitApplication(@Body() body: SubmitApplicationDto, @Req() req: any) {
    const cpId = this.validateClient(req.user);
    return this.clientPortalService.submitNewApplication(cpId, req.user.id, body);
  }

  // ================= DOCUMENTS =================

  @Get('documents')
  getDocuments(@Req() req: any) {
    const cpId = this.validateClient(req.user);
    return this.clientPortalService.getClientDocuments(cpId);
  }

  @Post('documents/upload')
  uploadDocument(@Body() body: UploadDocumentDto, @Req() req: any) {
    const cpId = this.validateClient(req.user);
    return this.clientPortalService.uploadDocument(cpId, req.user.id, body);
  }

  // ================= NOTIFICATIONS =================

  @Get('notifications')
  getNotifications(@Req() req: any) {
    this.validateClient(req.user); // Must be a client
    return this.clientPortalService.getClientNotifications(req.user.id); // Query by user ID natively
  }

  @Patch('notifications/:id/read')
  markNotificationRead(@Param('id') id: string, @Req() req: any) {
    this.validateClient(req.user);
    return this.clientPortalService.markNotificationAsRead(req.user.id, id);
  }
}
