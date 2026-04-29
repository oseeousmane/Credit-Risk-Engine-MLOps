import { Test, TestingModule } from '@nestjs/testing';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';
import { ForbiddenException } from '@nestjs/common';

// â”€â”€ Mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const mockService = {
  getClientApplications: jest.fn(),
  getClientApplicationById: jest.fn(),
  submitNewApplication: jest.fn(),
  getClientDocuments: jest.fn(),
  uploadDocument: jest.fn(),
  getClientNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
};

const clientUser = {
  id: 'user-client-001',
  email: 'tom.eriksen@glp-group.com',
  role: 'CLIENT',
  counterpartyId: 'cp-uuid-001',
};

const analystUser = {
  id: 'user-analyst-001',
  email: 'analyst@riskengine.com',
  role: 'ANALYST',
  counterpartyId: null,
};

const clientWithNoCounterparty = {
  ...clientUser,
  counterpartyId: null,
};

// â”€â”€ Test Suite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('ClientPortalController â€” RBAC & Ownership', () => {
  let controller: ClientPortalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientPortalController],
      providers: [
        { provide: ClientPortalService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<ClientPortalController>(ClientPortalController);
    jest.clearAllMocks();
  });

  describe('getApplications', () => {
    it('should return applications when user is a valid CLIENT with counterpartyId', async () => {
      const mockApps = [{ id: 'APP-2025-0001', status: 'under_review' }];
      mockService.getClientApplications.mockResolvedValue(mockApps);

      const result = await controller.getApplications({ user: clientUser } as any);

      expect(result).toEqual(mockApps);
      // CRITICAL: Must be filtered by counterpartyId, not by userId
      expect(mockService.getClientApplications).toHaveBeenCalledWith('cp-uuid-001');
    });

    it('should throw ForbiddenException when user role is ANALYST (not CLIENT)', async () => {
      // validateClient throws synchronously â€” wrap in async lambda to catch
      let thrown: Error | null = null;
      try {
        await controller.getApplications({ user: analystUser } as any);
      } catch (e) {
        thrown = e as Error;
      }
      expect(thrown).toBeInstanceOf(ForbiddenException);
      // Service must NOT be called when access is denied
      expect(mockService.getClientApplications).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when CLIENT has no counterpartyId linked', async () => {
      let thrown: Error | null = null;
      try {
        await controller.getApplications({ user: clientWithNoCounterparty } as any);
      } catch (e) {
        thrown = e as Error;
      }
      expect(thrown).toBeInstanceOf(ForbiddenException);
      expect(mockService.getClientApplications).not.toHaveBeenCalled();
    });
  });

  describe('getDocuments', () => {
    it('should return documents filtered by counterpartyId for valid CLIENT', async () => {
      const mockDocs = [{ id: 'doc-001', type: 'FINANCIALS', status: 'pending_validation' }];
      mockService.getClientDocuments.mockResolvedValue(mockDocs);

      const result = await controller.getDocuments({ user: clientUser } as any);

      expect(result).toEqual(mockDocs);
      expect(mockService.getClientDocuments).toHaveBeenCalledWith('cp-uuid-001');
    });

    it('should block ANALYST from accessing client documents', async () => {
      let thrown: Error | null = null;
      try {
        await controller.getDocuments({ user: analystUser } as any);
      } catch (e) {
        thrown = e as Error;
      }
      expect(thrown).toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getNotifications', () => {
    it('should return notifications for valid CLIENT (by userId)', async () => {
      const mockNotifs = [{ id: 'notif-001', title: 'Application Received' }];
      mockService.getClientNotifications.mockResolvedValue(mockNotifs);

      const result = await controller.getNotifications({ user: clientUser } as any);

      expect(result).toEqual(mockNotifs);
      // Notifications are scoped by userId (not counterpartyId)
      expect(mockService.getClientNotifications).toHaveBeenCalledWith('user-client-001');
    });
  });

  describe('submitApplication', () => {
    it('should call service with correct counterpartyId and userId', async () => {
      mockService.submitNewApplication.mockResolvedValue({ success: true, applicationId: 'APP-2025-0099' });

      await controller.submitApplication(
        { requestedAmount: 5_000_000 } as any,
        { user: clientUser } as any,
      );

      expect(mockService.submitNewApplication).toHaveBeenCalledWith(
        'cp-uuid-001',     // counterpartyId from token â€” not from body
        'user-client-001', // userId from token
        expect.objectContaining({ requestedAmount: 5_000_000 }),
      );
    });

    it('should prevent non-CLIENT from submitting applications', async () => {
      let thrown: Error | null = null;
      try {
        await controller.submitApplication(
          { requestedAmount: 5_000_000 } as any,
          { user: analystUser } as any,
        );
      } catch (e) {
        thrown = e as Error;
      }
      expect(thrown).toBeInstanceOf(ForbiddenException);
    });
  });
});
