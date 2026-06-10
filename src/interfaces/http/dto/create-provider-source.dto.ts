import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Reference to a secret manager entry. Never submit raw credentials.' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  secretRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  rateLimitPolicy?: Record<string, unknown>;
}
