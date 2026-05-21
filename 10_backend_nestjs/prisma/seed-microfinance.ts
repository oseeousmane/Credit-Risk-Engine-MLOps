import { PrismaClient, BorrowerSegment, MicroLoanApplicationStatus, DecisionStatus, LoanOfferStatus, RepaymentFrequency, LoanAccountStatus, RepaymentScheduleStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Microfinance Pilot Data...');
  
  // Clean up existing pilot data (ordered by FK dependency)
  await prisma.transactionRecord.deleteMany({});
  await prisma.collectionAction.deleteMany({});
  await prisma.delinquencyEvent.deleteMany({});
  await prisma.repaymentEvent.deleteMany({});
  await prisma.repaymentSchedule.deleteMany({});
  await prisma.loanAccount.deleteMany({});
  await prisma.disbursement.deleteMany({});
  await prisma.loanOffer.deleteMany({});
  await prisma.decisionReason.deleteMany({});
  await prisma.microLoanDecision.deleteMany({});
  await prisma.thinFileScorecard.deleteMany({});
  await prisma.fieldVisit.deleteMany({});
  await prisma.productPolicySnapshot.deleteMany({});
  await prisma.microLoanApplication.deleteMany({});
  await prisma.microLoanPolicy.deleteMany({ where: { name: 'Pilot Nano Loan' }});
  // Clean up pilot borrower (cascade deletes informalBusinessProfile)
  await prisma.informalBusinessProfile.deleteMany({ where: { borrower: { externalId: 'B-P-001' } } });
  await prisma.retailBorrower.deleteMany({ where: { externalId: 'B-P-001' } });
  
  // 1. Policy
  const policy = await prisma.microLoanPolicy.create({
    data: {
      name: 'Pilot Nano Loan',
      version: '1.0',
      productType: 'INDIVIDUAL',
      segment: BorrowerSegment.THIN_FILE,
      minAmount: 5000,
      maxAmount: 100000,
      currency: 'XAF',
      allowedTenors: [30, 60, 90],
      interestRateMin: 5,
      interestRateMax: 15,
      minScore: 50,
      maxDebtBurdenRatio: 40,
      status: 'ACTIVE',
      requiresFieldVisit: false,
    }
  });

  // 2. Borrower
  const borrower = await prisma.retailBorrower.create({
    data: {
      externalId: 'B-P-001',
      fullName: 'Amina Diallo (Pilot)',
      phone: '+237690000001',
      segment: BorrowerSegment.THIN_FILE,
      identityVerified: true,
      informalBusinessProfile: {
        create: {
          activityType: 'Retail',
          locationType: 'MARKET_STALL',
          monthlyRevenueEstimate: 150000,
          monthlyExpenseEstimate: 80000,
          yearsInActivity: 3,
        }
      }
    }
  });

  // 3. Application
  const application = await prisma.microLoanApplication.create({
    data: {
      reqId: 'MLA-PILOT-001',
      borrowerId: borrower.id,
      policyId: policy.id,
      requestedAmount: 50000,
      currency: 'XAF',
      purpose: 'Inventory purchase',
      productType: 'INDIVIDUAL',
      segment: BorrowerSegment.THIN_FILE,
      status: MicroLoanApplicationStatus.APPROVED,
    }
  });

  await prisma.productPolicySnapshot.create({
    data: {
      policyId: policy.id,
      policyName: policy.name,
      policyVersion: policy.version,
      snapshot: policy as any,
      applicationId: application.id,
    }
  });

  // 4. Scorecard & Decision
  const scorecard = await prisma.thinFileScorecard.create({
    data: {
      applicationId: application.id,
      borrowerId: borrower.id,
      identityScore: 15,
      activityStabilityScore: 20,
      cashflowScore: 20,
      mobileMoneyScore: 10,
      repaymentHistoryScore: 8,
      guarantorGroupScore: 4,
      fieldConfidenceScore: 0,
      totalScore: 77,
      recommendation: 'APPROVE_SMALL_LIMIT',
      reasonCodes: [],
    }
  });

  const decision = await prisma.microLoanDecision.create({
    data: {
      applicationId: application.id,
      borrowerId: borrower.id,
      scorecardId: scorecard.id,
      status: DecisionStatus.APPROVE,
      approvedAmount: 50000,
      tenorDays: 30,
      interestRate: 10,
      overrideFlag: false,
    }
  });

  // 5. Offer & Disbursement
  const offer = await prisma.loanOffer.create({
    data: {
      applicationId: application.id,
      borrowerId: borrower.id,
      decisionId: decision.id,
      approvedAmount: 50000,
      currency: 'XAF',
      tenorDays: 30,
      interestRate: 10,
      repaymentFrequency: RepaymentFrequency.WEEKLY,
      status: LoanOfferStatus.ACCEPTED,
      acceptedAt: new Date(),
    }
  });

  const disbursement = await prisma.disbursement.create({
    data: {
      loanOfferId: offer.id,
      applicationId: application.id,
      borrowerId: borrower.id,
      amount: 50000,
      currency: 'XAF',
      channel: 'MOBILE_MONEY',
      provider: 'MTN',
      providerReference: 'MOMO-SEED-TX-001',
      status: 'SUCCESS',
      disbursedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
    }
  });

  // 6. Loan Account & Schedules (Overdue scenario)
  const loanAccount = await prisma.loanAccount.create({
    data: {
      accountNumber: 'MLN-PILOT-001',
      loanOfferId: offer.id,
      applicationId: application.id,
      borrowerId: borrower.id,
      principalAmount: 50000,
      outstandingPrincipal: 50000,
      currency: 'XAF',
      status: LoanAccountStatus.ACTIVE,
      openedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      disbursement: { connect: { id: disbursement.id } }
    }
  });

  // Create 4 weekly installments
  for (let i = 1; i <= 4; i++) {
    const isPastDue = i <= 2; // Make first two past due
    await prisma.repaymentSchedule.create({
      data: {
        loanAccountId: loanAccount.id,
        installmentNumber: i,
        dueDate: new Date(Date.now() - (35 - i * 7) * 24 * 60 * 60 * 1000),
        principalDue: 12500,
        interestDue: 1250,
        totalDue: 13750,
        status: isPastDue ? RepaymentScheduleStatus.LATE : RepaymentScheduleStatus.SCHEDULED,
      }
    });
  }

  // 7. Delinquency (Since the first two are late)
  const lateSchedule = await prisma.repaymentSchedule.findFirst({
    where: { loanAccountId: loanAccount.id, installmentNumber: 1 }
  });

  if (lateSchedule) {
    const delinquency = await prisma.delinquencyEvent.create({
      data: {
        loanAccountId: loanAccount.id,
        scheduleId: lateSchedule.id,
        borrowerId: borrower.id,
        dpd: 28, // 35 - 7
        overdueAmount: 13750,
        status: 'OPEN',
        severity: 'WATCH',
        reason: 'Auto-detected: 28 DPD on installment #1',
        openedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      }
    });

    await prisma.collectionAction.create({
      data: {
        loanAccountId: loanAccount.id,
        scheduleId: lateSchedule.id,
        delinquencyEventId: delinquency.id,
        borrowerId: borrower.id,
        actionType: 'PHONE_CALL',
        status: 'PLANNED',
        scheduledAt: new Date(),
        notes: 'Call to check on missing first installment',
      }
    });
  }

  console.log('Microfinance Pilot Data Seeded Successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
