import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class TriggerIngestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceId?: string;
}

