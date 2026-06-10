import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';

import { IngestionRunRepository } from '../../infrastructure/persistence/repositories/ingestion-run.repository';
import { ProviderSourceRepository } from '../../infrastructure/persistence/repositories/provider-source.repository';
import { INGESTION_QUEUE, POLL_PROVIDER_SOURCE_JOB } from '../../infrastructure/queue/queue.constants';

export type TriggerIngestionCommand = {
  sourceId?: string;
  correlationId: string;
};

export type TriggerIngestionResult = {
  queued: number;
  runIds: string[];
};

@Injectable()
export class TriggerIngestionUseCase {
  constructor(
    private readonly providerSources: ProviderSourceRepository,
    private readonly ingestionRuns: IngestionRunRepository,
    @InjectQueue(INGESTION_QUEUE) private readonly queue: Queue,
  ) {}

  async execute(command: TriggerIngestionCommand): Promise<TriggerIngestionResult> {
    const sources = command.sourceId ? [await this.findSource(command.sourceId)] : await this.providerSources.listActiveOrdered();

    const runIds: string[] = [];

    for (const source of sources) {
      const run = await this.ingestionRuns.createQueued(source.id, command.correlationId);

      await this.queue.add(
        POLL_PROVIDER_SOURCE_JOB,
        {
          runId: run.id,
          sourceId: source.id,
          requestedAt: run.requestedAt.toISOString(),
          correlationId: command.correlationId,
        },
        {
          jobId: run.id,
          removeOnComplete: {
            age: 3600,
            count: 1000,
          },
          removeOnFail: {
            age: 86400,
            count: 1000,
          },
        },
      );

      runIds.push(run.id);
    }

    return {
      queued: runIds.length,
      runIds,
    };
  }

  private async findSource(sourceId: string) {
    const source = await this.providerSources.findById(sourceId);

    if (!source) {
      throw new NotFoundException(`ProviderSource ${sourceId} was not found.`);
    }

    return source;
  }
}
