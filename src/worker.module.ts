import { Module } from '@nestjs/common';

import { AppModule } from './app.module';
import { IngestionProcessor } from './infrastructure/queue/processors/ingestion.processor';

@Module({
  imports: [AppModule],
  providers: [IngestionProcessor],
})
export class WorkerModule {}

