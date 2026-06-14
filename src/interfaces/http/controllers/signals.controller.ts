import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AdminGuard } from '../../../infrastructure/access/admin.guard';
import { SignalRepository } from '../../../infrastructure/persistence/repositories/signal.repository';

@ApiTags('signals')
@Controller('signals')
export class SignalsController {
  constructor(private readonly signals: SignalRepository) {}

  @Get()
  list(@Query('status') status?: string, @Query('take') take?: string) {
    const limit = Math.min(Number(take ?? 100), 500);
    return this.signals.list(status, Number.isFinite(limit) ? limit : 100);
  }

  @Post(':id/ignore')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  ignore(@Param('id') id: string) {
    return this.signals.ignore(id);
  }
}
