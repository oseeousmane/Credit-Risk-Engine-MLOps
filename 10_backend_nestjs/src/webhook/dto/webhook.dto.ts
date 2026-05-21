import { IsString, IsUrl, IsArray, IsOptional, IsBoolean, ArrayNotEmpty } from 'class-validator';

export const WEBHOOK_EVENTS = [
  'decision.approved',
  'decision.approved_with_conditions',
  'decision.rejected',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export class CreateWebhookDto {
  @IsUrl({ require_tld: false })
  url: string;

  @IsString()
  secret: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  events: string[];

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
