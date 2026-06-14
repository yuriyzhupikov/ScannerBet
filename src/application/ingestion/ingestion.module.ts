import { Module } from '@nestjs/common';

import { SourcePolicyService } from '../../domain/source/source-policy.service';
import { SpreadDetectorService } from '../../domain/signal/spread-detector.service';
import { PersistenceModule } from '../../infrastructure/persistence/persistence.module';
import { ProviderModule } from '../../infrastructure/providers/provider.module';
import { QueueInfrastructureModule } from '../../infrastructure/queue/queue-infrastructure.module';
import { AuthorizedRestSourceAdapter } from '../../infrastructure/sources/authorized-rest/authorized-rest-source.adapter';
import { NormalizeEnvelopeUseCase } from '../normalization/normalize-envelope.use-case';
import { SignalRecalculationService } from '../signal-detection/signal-recalculation.service';
import { ProcessProviderBatchUseCase } from './process-provider-batch.use-case';
import { ProcessQuoteEnvelopeUseCase } from './process-quote-envelope.use-case';
import { PullSourceUseCase } from './pull-source.use-case';
import { TriggerIngestionUseCase } from './trigger-ingestion.use-case';

@Module({
  imports: [PersistenceModule, ProviderModule, QueueInfrastructureModule],
  providers: [
    SourcePolicyService,
    SpreadDetectorService,
    AuthorizedRestSourceAdapter,
    NormalizeEnvelopeUseCase,
    SignalRecalculationService,
    TriggerIngestionUseCase,
    ProcessProviderBatchUseCase,
    ProcessQuoteEnvelopeUseCase,
    PullSourceUseCase,
  ],
  exports: [TriggerIngestionUseCase, ProcessProviderBatchUseCase, ProcessQuoteEnvelopeUseCase, PullSourceUseCase],
})
export class IngestionModule {}
