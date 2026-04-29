import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ClientDocumentDto {
  @Expose()
  id: string;

  @Expose()
  type: string;

  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  status: string;

  @Expose()
  rejectionReason: string;

  @Expose()
  isRequired: boolean;

  @Expose()
  appReqId: string;

  @Expose()
  uploadedAt: Date;
}

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsOptional()
  applicationId?: string;

  // Simulated file payload for demo
  @IsString()
  @IsNotEmpty()
  fileContent: string;
}
