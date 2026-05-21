import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PolicyStatus, Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  AcceptLoanOfferDto,
  AltDataLineageQueryDto,
  CancelApplicationDto,
  CancelOfferDto,
  CollectionActionQueryDto,
  CompleteCollectionActionDto,
  CompleteDisbursementDto,
  CompleteFieldVisitDto,
  ConsentCoverageDto,
  CreateAlternativeDataFeatureSnapshotDto,
  CreateCollectionActionDto,
  CreateDisbursementDto,
  CreateFieldVisitDto,
  CreateLoanOfferDto,
  CreateMicroLoanApplicationDto,
  CreateMicroLoanPolicyDto,
  CreateMobileMoneySnapshotDto,
  CreateRetailBorrowerDto,
  CureDelinquencyDto,
  DeclineOfferDto,
  DelinquencyQueryDto,
  DisbursementQueryDto,
  EscalateDelinquencyDto,
  FairnessWindowDto,
  FieldVisitQueryDto,
  GrantConsentDto,
  LoanAccountQueryDto,
  MicrofinanceQueryDto,
  OpenDelinquencyDto,
  PortfolioAnalyticsQueryDto,
  ReapplyDto,
  RecordRepaymentDto,
  RenewLoanDto,
  RetryDisbursementDto,
  SubmitMicroLoanDecisionDto,
  SubmitSupervisorDecisionDto,
  UpdateBorrowerStatusDto,
  WriteOffLoanAccountDto,
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

  @Get('portfolio/analytics')
  getPortfolioAnalytics(@Query() query: PortfolioAnalyticsQueryDto) {
    return this.microfinanceService.getPortfolioAnalytics(query);
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

  @Patch('borrowers/:id/status')
  updateBorrowerStatus(
    @Param('id') borrowerId: string,
    @Body() dto: UpdateBorrowerStatusDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.updateBorrowerStatus(
      borrowerId,
      dto,
      req.user,
    );
  }

  @Post('borrowers/:id/consents')
  grantConsent(
    @Param('id') borrowerId: string,
    @Body() dto: GrantConsentDto,
    @Req() req: any,
  ) {
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
  createApplication(
    @Body() dto: CreateMicroLoanApplicationDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.createApplication(dto, req.user);
  }

  @Get('applications/:id')
  findApplication(@Param('id') applicationId: string) {
    return this.microfinanceService.findApplication(applicationId);
  }

  @Patch('applications/:id/cancel')
  cancelApplication(
    @Param('id') applicationId: string,
    @Body() dto: CancelApplicationDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.cancelApplication(
      applicationId,
      dto,
      req.user,
    );
  }

  @Post('applications/:id/reapply')
  reapply(
    @Param('id') rejectedApplicationId: string,
    @Body() dto: ReapplyDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.reapply(
      rejectedApplicationId,
      dto,
      req.user,
    );
  }

  @Post('applications/:id/field-visits')
  createFieldVisit(
    @Param('id') applicationId: string,
    @Body() dto: CreateFieldVisitDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.createFieldVisit(
      applicationId,
      dto,
      req.user,
    );
  }

  @Get('field-visits')
  findFieldVisits(@Query() query: FieldVisitQueryDto) {
    return this.microfinanceService.findFieldVisits(query);
  }

  @Patch('field-visits/:id/complete')
  completeFieldVisit(
    @Param('id') visitId: string,
    @Body() dto: CompleteFieldVisitDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.completeFieldVisit(visitId, dto, req.user);
  }

  @Post('applications/:id/scorecard')
  runScorecard(@Param('id') applicationId: string, @Req() req: any) {
    return this.microfinanceService.runScorecard(applicationId, req.user);
  }

  @Post('applications/:id/decisions')
  submitDecision(
    @Param('id') applicationId: string,
    @Body() dto: SubmitMicroLoanDecisionDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.submitDecision(
      applicationId,
      dto,
      req.user,
    );
  }

  @Roles(Role.MANAGER, Role.CRO, Role.ADMIN)
  @Post('applications/:id/supervisor-decision')
  submitSupervisorDecision(
    @Param('id') applicationId: string,
    @Body() dto: SubmitSupervisorDecisionDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.submitSupervisorDecision(
      applicationId,
      dto,
      req.user,
    );
  }

  @Post('decisions/:id/offers')
  createOffer(
    @Param('id') decisionId: string,
    @Body() dto: CreateLoanOfferDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.createOffer(decisionId, dto, req.user);
  }

  @Patch('offers/:id/accept')
  acceptOffer(
    @Param('id') offerId: string,
    @Body() dto: AcceptLoanOfferDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.acceptOffer(offerId, dto, req.user);
  }

  @Patch('offers/:id/decline')
  declineOffer(
    @Param('id') offerId: string,
    @Body() dto: DeclineOfferDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.declineOffer(offerId, dto, req.user);
  }

  @Roles(Role.MANAGER, Role.CRO, Role.ADMIN)
  @Patch('offers/:id/cancel')
  cancelOffer(
    @Param('id') offerId: string,
    @Body() dto: CancelOfferDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.cancelOffer(offerId, dto, req.user);
  }

  @Roles(Role.MANAGER, Role.CRO, Role.ADMIN)
  @Post('offers/:id/disbursements')
  createDisbursement(
    @Param('id') offerId: string,
    @Body() dto: CreateDisbursementDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.createDisbursement(offerId, dto, req.user);
  }

  @Get('disbursements')
  findDisbursements(@Query() query: DisbursementQueryDto) {
    return this.microfinanceService.findDisbursements(query);
  }

  @Roles(Role.MANAGER, Role.CRO, Role.ADMIN)
  @Patch('disbursements/:id/complete')
  completeDisbursement(
    @Param('id') disbursementId: string,
    @Body() dto: CompleteDisbursementDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.completeDisbursement(
      disbursementId,
      dto,
      req.user,
    );
  }

  @Roles(Role.MANAGER, Role.CRO, Role.ADMIN)
  @Post('disbursements/:id/retry')
  retryDisbursement(
    @Param('id') failedDisbursementId: string,
    @Body() dto: RetryDisbursementDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.retryDisbursement(
      failedDisbursementId,
      dto,
      req.user,
    );
  }

  @Get('loan-accounts')
  findLoanAccounts(@Query() query: LoanAccountQueryDto) {
    return this.microfinanceService.findLoanAccounts(query);
  }

  @Get('loan-accounts/:id')
  findLoanAccount(@Param('id') loanAccountId: string) {
    return this.microfinanceService.findLoanAccount(loanAccountId);
  }

  @Post('loan-accounts/:id/repayments')
  recordRepayment(
    @Param('id') loanAccountId: string,
    @Body() dto: RecordRepaymentDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.recordRepayment(
      loanAccountId,
      dto,
      req.user,
    );
  }

  @Get('delinquencies')
  findDelinquencies(@Query() query: DelinquencyQueryDto) {
    return this.microfinanceService.findDelinquencies(query);
  }

  @Post('loan-accounts/:id/delinquencies')
  openDelinquency(
    @Param('id') loanAccountId: string,
    @Body() dto: OpenDelinquencyDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.openDelinquency(
      loanAccountId,
      dto,
      req.user,
    );
  }

  @Get('collection-actions')
  findCollectionActions(@Query() query: CollectionActionQueryDto) {
    return this.microfinanceService.findCollectionActions(query);
  }

  @Post('delinquencies/:id/collection-actions')
  createCollectionAction(
    @Param('id') delinquencyId: string,
    @Body() dto: CreateCollectionActionDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.createCollectionAction(
      delinquencyId,
      dto,
      req.user,
    );
  }

  @Patch('collection-actions/:id/complete')
  completeCollectionAction(
    @Param('id') actionId: string,
    @Body() dto: CompleteCollectionActionDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.completeCollectionAction(
      actionId,
      dto,
      req.user,
    );
  }

  @Roles(Role.MANAGER, Role.CRO, Role.ADMIN)
  @Post('loan-accounts/:id/renew')
  renewLoan(
    @Param('id') closedLoanAccountId: string,
    @Body() dto: RenewLoanDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.renewLoan(
      closedLoanAccountId,
      dto,
      req.user,
    );
  }

  @Roles(Role.MANAGER, Role.CRO, Role.ADMIN)
  @Patch('delinquencies/:id/escalate')
  escalateDelinquency(
    @Param('id') delinquencyId: string,
    @Body() dto: EscalateDelinquencyDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.escalateDelinquency(
      delinquencyId,
      dto,
      req.user,
    );
  }

  @Roles(Role.MANAGER, Role.CRO, Role.ADMIN)
  @Patch('delinquencies/:id/cure')
  cureDelinquency(
    @Param('id') delinquencyId: string,
    @Body() dto: CureDelinquencyDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.cureDelinquency(
      delinquencyId,
      dto,
      req.user,
    );
  }

  @Roles(Role.CRO, Role.ADMIN)
  @Patch('loan-accounts/:id/write-off')
  writeOffLoanAccount(
    @Param('id') loanAccountId: string,
    @Body() dto: WriteOffLoanAccountDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.writeOffLoanAccount(
      loanAccountId,
      dto,
      req.user,
    );
  }

  @Roles(Role.ADMIN)
  @Post('schedules/mark-overdue')
  markSchedulesOverdue() {
    return this.microfinanceService.markSchedulesOverdue();
  }

  @Roles(Role.ADMIN)
  @Post('offers/expire-stale')
  expireStaleOffers() {
    return this.microfinanceService.expireStaleOffers();
  }

  @Post('mobile-money-snapshots')
  createMobileMoneySnapshot(
    @Body() dto: CreateMobileMoneySnapshotDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.createMobileMoneySnapshot(dto, req.user);
  }

  @Post('alternative-data/features')
  createAlternativeDataFeatureSnapshot(
    @Body() dto: CreateAlternativeDataFeatureSnapshotDto,
    @Req() req: any,
  ) {
    return this.microfinanceService.createAlternativeDataFeatureSnapshot(
      dto,
      req.user,
    );
  }

  @Get('fairness')
  getFairnessMetrics(@Query() query: FairnessWindowDto) {
    return this.microfinanceService.getFairnessMetrics(query);
  }

  @Get('consent-coverage')
  getConsentCoverage(@Query() query: ConsentCoverageDto) {
    return this.microfinanceService.getConsentCoverage(query);
  }

  @Get('alternative-data/lineage')
  getAltDataLineage(@Query() query: AltDataLineageQueryDto) {
    return this.microfinanceService.getAltDataLineage(query);
  }
}
