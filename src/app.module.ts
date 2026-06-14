import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CatalogModule } from './application/catalog/catalog.module';
import { DetectionModule } from './application/detection/detection.module';
import { IngestionModule } from './application/ingestion/ingestion.module';
import { AccessModule } from './infrastructure/access/access.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';
import { CorrelationIdMiddleware } from './infrastructure/observability/correlation-id.middleware';
import { PersistenceModule } from './infrastructure/persistence/persistence.module';
import { ProviderModule } from './infrastructure/providers/provider.module';
import { QueueInfrastructureModule } from './infrastructure/queue/queue-infrastructure.module';
import { DiscrepanciesController } from './interfaces/http/controllers/discrepancies.controller';
import { HealthController } from './interfaces/http/controllers/health.controller';
import { IngestionController } from './interfaces/http/controllers/ingestion.controller';
import { MetricsController } from './interfaces/http/controllers/metrics.controller';
import { LatestQuotesController } from './interfaces/http/controllers/latest-quotes.controller';
import { SignalsController } from './interfaces/http/controllers/signals.controller';
import { SourceIngestionController } from './interfaces/http/controllers/source-ingestion.controller';
import { QuotesController } from './interfaces/http/controllers/quotes.controller';
import { SourcesController } from './interfaces/http/controllers/sources.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PersistenceModule,
    ObservabilityModule,
    AccessModule,
    QueueInfrastructureModule,
    ProviderModule,
    CatalogModule,
    DetectionModule,
    IngestionModule,
  ],
  controllers: [
    HealthController,
    MetricsController,
    SourcesController,
    IngestionController,
    QuotesController,
    DiscrepanciesController,
    SourceIngestionController,
    LatestQuotesController,
    SignalsController,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
