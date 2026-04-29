import { IsNotEmpty, IsNumber, IsString, IsOptional, IsObject } from 'class-validator';

export class SubmitApplicationDto {
  @IsString()
  @IsNotEmpty()
  facilityType: string;

  @IsNumber()
  @IsNotEmpty()
  requestedAmount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  tenureMonths: string;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
