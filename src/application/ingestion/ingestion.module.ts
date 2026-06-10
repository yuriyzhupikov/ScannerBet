import { Module } from '@nestjs/common';

import { PersistenceModule } from '../../infrastructure/persistence/persistence.module';
import { ProviderModule } from '../../infrastructure/providers/provider.module';
import { QueueInfrastructureModule } from '../../infrastructure/queue/queue-infrastructure.module';
import { ProcessProviderBatchUseCase } from './process-provider-batch.use-case';
import { TriggerIngestionUseCase } from './trigger-ingestion.use-case';

@Module({
  imports: [PersistenceModule, ProviderModule, QueueInfrastructureModule],
  providers: [TriggerIngestionUseCase, ProcessProviderBatchUseCase],
  exports: [TriggerIngestionUseCase, ProcessProviderBatchUseCase],
})
export class IngestionModule {}

