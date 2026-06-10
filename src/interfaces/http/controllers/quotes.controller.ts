import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { QuoteRepository } from '../../../infrastructure/persistence/repositories/quote.repository';

@ApiTags('quotes')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuoteRepository) {}

  @Get()
  list(@Query('instrumentKey') instrumentKey?: string, @Query('sourceId') sourceId?: string, @Query('take') take?: string) {
    const limit = Math.min(Number(take ?? 100), 500);

    return this.quotes.listSnapshots({
      instrumentKey,
      sourceId,
      take: Number.isFinite(limit) ? limit : 100,
    });
  }
}
