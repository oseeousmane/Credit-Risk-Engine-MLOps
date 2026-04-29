import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class CounterpartyQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsEnum(['LOW', 'MED', 'HIGH', 'CRITICAL'])
  riskLevel?: string;

  @IsOptional()
  @IsEnum(['STAGE_1', 'STAGE_2', 'STAGE_3'])
  ifrs9Stage?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'exposure';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
