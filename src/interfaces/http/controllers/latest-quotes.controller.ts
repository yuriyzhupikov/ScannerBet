import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { QuoteRepository } from '../../../infrastructure/persistence/repositories/quote.repository';

@ApiTags('production-quotes')
@Controller('quotes/latest')
export class LatestQuotesController {
  constructor(private readonly quotes: QuoteRepository) {}

  @Get()
  list(@Query('instrumentKey') instrumentKey?: string, @Query('dimensionKey') dimensionKey?: string, @Query('take') take?: string) {
    const limit = Math.min(Number(take ?? 100), 500);
    return this.quotes.listLatestCanonical({
      instrumentKey,
      dimensionKey,
      take: Number.isFinite(limit) ? limit : 100,
    });
  }
}
