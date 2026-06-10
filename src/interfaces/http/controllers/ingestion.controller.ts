import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { TriggerIngestionUseCase } from '../../../application/ingestion/trigger-ingestion.use-case';
import { AdminGuard } from '../../../infrastructure/access/admin.guard';
import { getCorrelationId, RequestWithCorrelationId } from '../../../infrastructure/observability/correlation-id.middleware';
import { IngestionRunRepository } from '../../../infrastructure/persistence/repositories/ingestion-run.repository';
import { TriggerIngestionDto } from '../dto/trigger-ingestion.dto';

@ApiTags('ingestion')
@Controller('ingestion/runs')
export class IngestionController {
  constructor(
    private readonly triggerIngestion: TriggerIngestionUseCase,
    private readonly ingestionRuns: IngestionRunRepository,
  ) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  run(@Body() dto: TriggerIngestionDto, @Req() req: RequestWithCorrelationId) {
    return this.triggerIngestion.execute({
      sourceId: dto.sourceId,
      correlationId: getCorrelationId(req),
    });
  }

  @Get()
  list() {
    return this.ingestionRuns.listRecent(100);
  }
}
