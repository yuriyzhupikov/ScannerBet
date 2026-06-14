import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min } from 'class-validator';

import { PROVIDER_SOURCE_STATUSES, PROVIDER_SOURCE_TYPES, ProviderSourceStatus, ProviderSourceType } from '../../../domain/catalog/provider-source.entity';

export class CreateProviderSourceDto {
  @ApiProperty({ example: 'synthetic-a' })
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-zA-Z0-9:_-]+$/)
  sourceKey!: string;

  @ApiProperty({ enum: PROVIDER_SOURCE_TYPES })
  @IsIn(PROVIDER_SOURCE_TYPES)
  type!: ProviderSourceType;

  @ApiPropertyOptional({ enum: PROVIDER_SOURCE_STATUSES, default: 'PAUSED' })
  @IsOptional()
  @IsIn(PROVIDER_SOURCE_STATUSES)
  status?: ProviderSourceStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  authorizationApproved?: boolean;

  @ApiPropertyOptional({ example: 'https://partner-a.internal.example' })
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  baseUrl?: string;

  @ApiPropertyOptional({ example: ['partner-a.internal.example'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedHosts?: string[];

  @ApiPropertyOptional({ default: 'API_KEY' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  authType?: string;

  @ApiPropertyOptional({ description: 'Reference to a secret manager entry. Never submit raw credentials.' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  secretRef?: string;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  rateLimitPerMinute?: number;

  @ApiPropertyOptional({ default: 3000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(120000)
  timeoutMs?: number;

  @ApiPropertyOptional({ default: 15000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(86400000)
  staleAfterMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  rateLimitPolicy?: Record<string, unknown>;
}
