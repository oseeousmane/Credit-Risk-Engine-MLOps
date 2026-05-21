import { Test, TestingModule } from '@nestjs/testing';
import { MicrofinanceService } from './microfinance.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MobileMoneyAdapter } from './adapters/mobile-money.adapter';
import { NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

describe('MicrofinanceService (Pilot)', () => {
  let service: MicrofinanceService;
  let mobileMoney: MobileMoneyAdapter;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MicrofinanceService,
        {
          provide: PrismaService,
          useValue: {
            repaymentSchedule: { findMany: jest.fn(), update: jest.fn() },
            delinquencyEvent: { findFirst: jest.fn(), create: jest.fn() },
            loanOffer: { findMany: jest.fn(), update: jest.fn() },
            transactionRecord: { create: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(false) },
        },
        MobileMoneyAdapter,
      ],
    }).compile();

    service = module.get<MicrofinanceService>(MicrofinanceService);
    mobileMoney = module.get<MobileMoneyAdapter>(MobileMoneyAdapter);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should run markSchedulesOverdue idempotently', async () => {
    // Mock 1 schedule overdue but already has a delinquency
    const mockDate = new Date('2026-05-01');
    jest.spyOn(prisma.repaymentSchedule, 'findMany').mockResolvedValue([
      {
        id: 'sched-1',
        loanAccountId: 'loan-1',
        installmentNumber: 1,
        dueDate: new Date('2026-04-01'),
        totalDue: 1000,
        amountPaid: 0,
        principalDue: 1000,
        interestDue: 0,
        feesDue: 0,
        status: 'SCHEDULED',
        createdAt: mockDate,
        updatedAt: mockDate,
        paidAt: null,
        loanAccount: { status: 'ACTIVE' } as any
      }
    ]);
    jest.spyOn(prisma.delinquencyEvent, 'findFirst').mockResolvedValue({ id: 'delinq-1' } as any);

    const result = await service.markSchedulesOverdue();
    expect(result.schedulesMarkedLate).toBe(1);
    expect(result.delinquenciesOpened).toBe(0); // Idempotent!
    expect(prisma.delinquencyEvent.create).not.toHaveBeenCalled();
  });

  it('should run expireStaleOffers idempotently', async () => {
    const mockDate = new Date();
    jest.spyOn(prisma.loanOffer, 'findMany').mockResolvedValue([
      { id: 'offer-1', status: 'ISSUED', expiresAt: new Date(Date.now() - 1000) } as any
    ]);
    
    const result = await service.expireStaleOffers();
    expect(result.expiredCount).toBe(1);
    
    // If run again and findMany returns nothing because status changed to EXPIRED
    jest.spyOn(prisma.loanOffer, 'findMany').mockResolvedValue([]);
    const result2 = await service.expireStaleOffers();
    expect(result2.expiredCount).toBe(0);
  });

  it('should block live mode disbursement without real integration', async () => {
    // Force live mode
    Object.defineProperty(mobileMoney, 'isLiveMode', { value: true });

    await expect(
      mobileMoney.disburseFunds('+23769000000', 50000, 'tx-1')
    ).rejects.toThrow(NotImplementedException);
  });
});
