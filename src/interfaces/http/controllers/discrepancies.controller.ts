import { Body, Controller, Get, Headers, NotFoundException, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ReviewAlertUseCase } from '../../../application/detection/review-alert.use-case';
import { AdminGuard } from '../../../infrastructure/access/admin.guard';
import { DiscrepancyAlertRepository } from '../../../infrastructure/persistence/repositories/discrepancy-alert.repository';
import { ReviewAlertDto } from '../dto/review-alert.dto';

@ApiTags('discrepancies')
@Controller('discrepancies')
export class DiscrepanciesController {
  constructor(
    private readonly alerts: DiscrepancyAlertRepository,
    private readonly reviewAlert: ReviewAlertUseCase,
  ) {}

  @Get()
  list(@Query('status') status?: string, @Query('take') take?: string) {
    const limit = Math.min(Number(take ?? 100), 500);

    return this.alerts.list(status, Number.isFinite(limit) ? limit : 100);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const alert = await this.alerts.findDetailsById(id);

    if (!alert) {
      throw new NotFoundException(`Alert ${id} was not found.`);
    }

    return alert;
  }

  @Patch(':id/review')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  review(@Param('id') id: string, @Body() dto: ReviewAlertDto, @Headers('x-user-id') userId?: string) {
    return this.reviewAlert.execute({
      alertId: id,
      action: dto.action,
      actorId: userId ?? 'api-admin',
      note: dto.note,
    });
  }
}
