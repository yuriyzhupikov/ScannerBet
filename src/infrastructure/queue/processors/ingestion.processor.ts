import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';

import { DetectDiscrepanciesUseCase } from '../../../application/detection/detect-discrepancies.use-case';
import { ProcessProviderBatchUseCase } from '../../../application/ingestion/process-provider-batch.use-case';
import { INGESTION_QUEUE, POLL_PROVIDER_SOURCE_JOB } from '../queue.constants';

type PollProviderSourceJobData = {
  runId: string;
  sourceId: string;
  requestedAt: string;
  correlationId: string;
};

@Injectable()
@Processor(INGESTION_QUEUE)
export class IngestionProcessor extends WorkerHost {
  constructor(
    private readonly processProviderBatch: ProcessProviderBatchUseCase,
    private readonly detectDiscrepancies: DetectDiscrepanciesUseCase,
  ) {
    super();
  }

  override async process(job: Job<PollProviderSourceJobData>): Promise<unknown> {
    if (job.name !== POLL_PROVIDER_SOURCE_JOB) {
      return undefined;
    }

    const result = await this.processProviderBatch.execute({
      runId: job.data.runId,
      sourceId: job.data.sourceId,
      requestedAt: new Date(job.data.requestedAt),
      correlationId: job.data.correlationId,
    });

    const detections = [];
    for (const instrumentId of result.instrumentIds) {
      detections.push(await this.detectDiscrepancies.execute({ instrumentId }));
    }

    return {
      ...result,
      detections,
    };
  }
}

