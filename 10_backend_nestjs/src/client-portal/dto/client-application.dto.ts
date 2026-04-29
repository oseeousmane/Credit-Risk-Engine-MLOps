import { Expose, Type } from 'class-transformer';

export class ClientDecisionDto {
  @Expose()
  status: string;

  @Expose()
  decidedAt: Date;
}

export class ClientApplicationDto {
  @Expose()
  id: string;

  @Expose()
  internalId: string;

  @Expose()
  title: string;

  @Expose()
  type: string;

  @Expose()
  requestedAmount: number;

  @Expose()
  currency: string;

  @Expose()
  purpose: string;

  @Expose()
  status: string;

  @Expose()
  statusLabel: string;

  @Expose()
  submittedDate: Date;

  @Expose()
  lastUpdated: Date;

  @Expose()
  slaDeadline: Date;

  @Expose()
  nextStep: string;

  @Expose()
  eta: string;

  @Expose()
  relationshipManager: string;

  @Expose()
  decisionSummary: string;

  @Expose()
  @Type(() => ClientDecisionDto)
  decision?: ClientDecisionDto;

  @Expose()
  metadata?: Record<string, any>;
}
