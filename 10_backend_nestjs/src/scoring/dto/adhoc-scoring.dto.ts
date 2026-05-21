import { IsNumber, IsString, IsBoolean, IsOptional, Min, Max, IsIn } from 'class-validator';

const RISK_LEVELS = ['LOW', 'MED', 'HIGH', 'CRITICAL'] as const;
const FACILITY_TYPES = ['TERM_LOAN', 'REVOLVING_CREDIT', 'TRADE_FINANCE', 'GUARANTEE', 'LEASING'] as const;
const COLLATERAL_TYPES = ['REAL_ESTATE', 'EQUIPMENT', 'RECEIVABLES', 'CASH', 'NONE'] as const;

export class AdhocScoringDto {
  @IsOptional() @IsNumber() @Min(0) @Max(100)    pdCurrent?: number;
  @IsOptional() @IsNumber() @Min(0)              exposure?: number;
  @IsOptional() @IsIn(RISK_LEVELS)               riskLevel?: string;
  @IsOptional() @IsNumber() @Min(0)              requestedAmount?: number;
  @IsOptional() @IsString()                      sector?: string;
  @IsOptional() @IsString()                      internalRating?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(200)    yearsInBusiness?: number;
  @IsOptional() @IsBoolean()                     watchlistFlag?: boolean;
  @IsOptional() @IsNumber()                      revenue?: number;
  @IsOptional() @IsNumber()                      ebitda?: number;
  @IsOptional() @IsNumber()                      totalDebt?: number;
  @IsOptional() @IsNumber()                      operatingCashFlow?: number;
  @IsOptional() @IsNumber() @Min(0)              collateralValue?: number;
  @IsOptional() @IsIn(COLLATERAL_TYPES)          collateralType?: string;
  @IsOptional() @IsNumber() @Min(1) @Max(360)    tenorMonths?: number;
  @IsOptional() @IsIn(FACILITY_TYPES)            facilityType?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(3650)   daysPastDue?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(24)     missedPayments24m?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1000)   bureauScore?: number;
}
