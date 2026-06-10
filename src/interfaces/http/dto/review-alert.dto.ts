import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { ReviewAlertAction } from '../../../application/detection/review-alert.use-case';

export class ReviewAlertDto {
  @ApiProperty({ enum: ['ACKNOWLEDGE', 'RESOLVE', 'REJECT'] })
  @IsIn(['ACKNOWLEDGE', 'RESOLVE', 'REJECT'])
  action!: ReviewAlertAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
