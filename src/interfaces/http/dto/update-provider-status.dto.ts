import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

import { PROVIDER_SOURCE_STATUSES, ProviderSourceStatus } from '../../../domain/catalog/provider-source.entity';

export class UpdateProviderStatusDto {
  @ApiProperty({ enum: PROVIDER_SOURCE_STATUSES })
  @IsIn(PROVIDER_SOURCE_STATUSES)
  status!: ProviderSourceStatus;

  @IsOptional()
  @IsBoolean()
  authorizationApproved?: boolean;
}
