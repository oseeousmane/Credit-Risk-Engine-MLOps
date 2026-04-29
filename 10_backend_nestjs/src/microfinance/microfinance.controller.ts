import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PolicyStatus, Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  AcceptLoanOfferDto,
  CompleteDisbursementDto,
  CompleteFieldVisitDto,
  CreateAlternativeDataFeatureSnapshotDto,
  CreateCollectionActionDto,
  CreateDisbursementDto,
  CreateFieldVisitDto,
  CreateLoanOfferDto,
  CreateMicroLoanApplicationDto,
  CreateMicroLoanPolicyDto,
  CreateMobileMoneySnapshotDto,
  CreateRetailBorrowerDto,
  GrantConsentDto,
  MicrofinanceQueryDto,
  OpenDelinquencyDto,
  RecordRepaymentDto,
  SubmitMicroLoanDecisionDto,
} from './dto/microfinance.dto';
import { MicrofinanceService } from './microfinance.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ANALYST, Role.MANAGER, Role.CRO, Role.ADMIN)
@Controller('microfinance')
export class MicrofinanceController {
  constructor(private readonly microfinanceService: MicrofinanceService) {}

  @Get('portfolio/summary')
  getPortfolioSummary() {
    return this.microfinanceService.getPortfolioSummary();
  }

  @Get('borrowers')
  findBorrowers(@Query() query: MicrofinanceQueryDto) {
    return this.microfinanceService.findBorrowers(query);
  }

  @Post('borrowers')
  createBorrower(@Body() dto: CreateRetailBorrowerDto, @Req() req: any) {
    return this.microfinanceService.createBorrower(dto, req.user);
  }

  @Get('borrowers/:id')
  findBorrower(@Param('id') id: string) {
    return this.microfinanceService.findBorrower(id);
  }

  @Post('borrowers/:id/consents')
  grantConsent(@Param('id') borrowerId: string, @Body() dto: GrantConsentDto, @Req() req: any) {
    return this.microfinanceService.grantConsent(borrowerId, dto, req.user);
  }

  @Patch('consents/:id/revoke')
  revokeConsent(@Param('id') consentId: string, @Req() req: any) {
    return this.microfinanceService.revokeConsent(consentId, req.user);
  }

  @Get('policies')
  findPolicies(@Query('status') status?: PolicyStatus) {
    return this.microfinanceService.findPolicies(status);
  }

  @Roles(Role.CRO, Role.ADMIN)
  @Post('policies')
  createPolicy(@Body() dto: CreateMicroLoanPolicyDto, @Req() req: any) {
    return this.microfinanceService.createPolicy(dto, req.user);
  }

  @Roles(Role.CRO, Role.ADMIN)
  @Patch('policies/:id/activate')
  activatePolicy(@Param('id') policyId: string, @Req() req: any) {
    return this.microfinanceService.activatePolicy(policyId, req.user);
  }

  @Get('applications')
  findApplications(@Query() query: MicrofinanceQueryDto) {
    return this.microfinanceService.findApplications(query);
  }

  @Post('applications')
  createApplication(@Body() dto: CreateMicroLoanApplicationDto, @Req() req: any) {
    return this.microfinanceService.createApplication(dto, req.user);
  }

  @Get('applications/:id')
  findApplication(@Param('id') applicationId: string) {
    return this.microfinanceService.findApplication(applicationId);
  }

  @Post('applications/:id/field-visits')
  createFieldVisit(@Param('id') applicationId: string, @Body() dto: CreateFieldVisitDto, @Req() req: any) {
    return this.microfinanceService.createFieldVisit(applicationId, dto, req.user);
  }

  @Patch('field-visits/:id/complete')
  completeFieldVisit(@Param('id') visitId: string, @Body() dto: CompleteFieldVisitDto, @Req() req: any) {
    return this.microfinanceService.completeFieldVisit(visitId, dto, req.user);
  }

  @Post('applications/:id/scorecard')
  runScorecard(@Param('id') applicationId: string, @Req() req: any) {
    return this.microfinanceService.runScorecard(applicationId, req.user);
  }

  @Post('applications/:id/decisions')
  submitDecision(@Param('id') applicationId: string, @Body() dto: SubmitMicroLoanDecisionDto, @Req() req: any) {
    return this.microfinanceService.submitDecision(applicationId, dto, req.user);
  }

  @Post('decisions/:id/offers')
  createOffer(@Param('id') decisionId: string, @Body() dto: CreateLoanOfferDto, @Req() req: any) {
    return this.microfinanceService.createOffer(decisionId, dto, req.user);
  }

  @Patch('offers/:id/accept')
  acceptOffer(@Param('id') offerId: string, @Body() dto: AcceptLoanOfferDto, @Req() req: any) {
    return this.microfinanceService.acceptOffer(offerId, dto, req.user);
  }

  @Roles(Role.MANAGER, Role.CRO, Role.ADMIN)
  @Post('offers/:id/disbursements')
  createDisbursement(@Param('id') offerId: string, @Body() dto: CreateDisbursementDto, @Req() req: any) {
    return this.microfinanceService.createDisbursement(offerId, dto, req.user);
  }

  @Roles(Role.MANAGER, Role.CRO, Role.ADMIN)
  @Patch('disbursements/:id/complete')
  completeDisbursement(@Param('id') disbursementId: string, @Body() dto: CompleteDisbursementDto, @Req() req: any) {
    return this.microfinanceService.completeDisbursement(disbursementId, dto, req.user);
  }

  @Post('loan-accounts/:id/repayments')
  recordRepayment(@Param('id') loanAccountId: string, @Body() dto: RecordRepaymentDto, @Req() req: any) {
    return this.microfinanceService.recordRepayment(loanAccountId, dto, req.user);
  }

  @Post('loan-accounts/:id/delinquencies')
  openDelinquency(@Param('id') loanAccountId: string, @Body() dto: OpenDelinquencyDto, @Req() req: any) {
    return this.microfinanceService.openDelinquency(loanAccountId, dto, req.user);
  }

  @Post('delinquencies/:id/collection-actions')
  createCollectionAction(@Param('id') delinquencyId: string, @Body() dto: CreateCollectionActionDto, @Req() req: any) {
    return this.microfinanceService.createCollectionAction(delinquencyId, dto, req.user);
  }

  @Post('mobile-money-snapshots')
  createMobileMoneySnapshot(@Body() dto: CreateMobileMoneySnapshotDto, @Req() req: any) {
    return this.microfinanceService.createMobileMoneySnapshot(dto, req.user);
  }

  @Post('alternative-data/features')
  createAlternativeDataFeatureSnapshot(@Body() dto: CreateAlternativeDataFeatureSnapshotDto, @Req() req: any) {
    return this.microfinanceService.createAlternativeDataFeatureSnapshot(dto, req.user);
  }
}
