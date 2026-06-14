import { Module } from '@nestjs/common';

import { PrismaService } from './prisma/prisma.service';
import { DiscrepancyAlertRepository } from './repositories/discrepancy-alert.repository';
import { IngestionRunRepository } from './repositories/ingestion-run.repository';
import { ProviderSourceRepository } from './repositories/provider-source.repository';
import { QuoteRepository } from './repositories/quote.repository';
import { SignalRepository } from './repositories/signal.repository';
import { SystemRepository } from './repositories/system.repository';

const repositories = [
  ProviderSourceRepository,
  IngestionRunRepository,
  QuoteRepository,
  DiscrepancyAlertRepository,
  SignalRepository,
  SystemRepository,
];

@Module({
  providers: [PrismaService, ...repositories],
  exports: repositories,
})
export class PersistenceModule {}
