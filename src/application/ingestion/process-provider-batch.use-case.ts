import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { DecimalQuote } from '../../domain/shared/value-objects/decimal-quote';
import { IngestionRunRepository } from '../../infrastructure/persistence/repositories/ingestion-run.repository';
import { ProviderSourceRepository } from '../../infrastructure/persistence/repositories/provider-source.repository';
import { QuoteRepository } from '../../infrastructure/persistence/repositories/quote.repository';
import { stableHash } from '../../infrastructure/providers/provider-hash';
import { ProviderRegistry } from '../../infrastructure/providers/provider-registry';

export type ProcessProviderBatchCommand = {
  runId: string;
  sourceId: string;
  requestedAt: Date;
  correlationId: string;
};

export type ProcessProviderBatchResult = {
  runId: string;
  sourceId: string;
  insertedSnapshots: number;
  skippedDuplicates: number;
  instrumentIds: string[];
};

@Injectable()
export class ProcessProviderBatchUseCase {
  constructor(
    private readonly providerSources: ProviderSourceRepository,
    private readonly ingestionRuns: IngestionRunRepository,
    private readonly quotes: QuoteRepository,
    private readonly providers: ProviderRegistry,
  ) {}

  async execute(command: ProcessProviderBatchCommand): Promise<ProcessProviderBatchResult> {
    const source = await this.providerSources.findById(command.sourceId);

    if (!source) {
      throw new NotFoundException(`ProviderSource ${command.sourceId} was not found.`);
    }

    if (source.status !== 'ACTIVE') {
      throw new BadRequestException(`ProviderSource ${source.sourceKey} is not ACTIVE.`);
    }

    await this.ingestionRuns.markRunning(command.runId);

    try {
      const provider = this.providers.resolve(source);
      const batch = await provider.fetchQuotes({
        requestedAt: command.requestedAt,
        correlationId: command.correlationId,
        sourceKey: source.sourceKey,
      });

      const rawPayload = await this.quotes.upsertRawPayload({
        sourceId: source.id,
        rawHash: batch.rawHash,
        payloadRef: batch.rawPayloadRef,
        receivedAt: batch.receivedAt,
        payload: {
          sourceId: batch.sourceId,
          sourceVersion: batch.sourceVersion,
          itemCount: batch.items.length,
          nextCursorPresent: Boolean(batch.nextCursor),
        },
      });

      let insertedSnapshots = 0;
      let skippedDuplicates = 0;
      const instrumentIds = new Set<string>();

      for (const item of batch.items) {
        const observedAt = new Date(item.quoteTimestamp);
        const numericValue = DecimalQuote.from(item.numericValue).toString();
        const instrument = await this.quotes.upsertInstrument({
          instrumentKey: item.instrumentKey,
          displayName: item.providerInstrumentKey ?? item.instrumentKey,
        });

        await this.quotes.upsertProviderInstrumentMapping({
          sourceId: source.id,
          instrumentId: instrument.id,
          providerInstrumentKey: item.providerInstrumentKey ?? item.instrumentKey,
          displayName: item.providerInstrumentKey,
        });

        const itemRawHash = stableHash({
          providerId: source.id,
          instrumentKey: item.instrumentKey,
          quoteTimestamp: observedAt.toISOString(),
          rawHash: batch.rawHash,
          rawValue: item.rawValue ?? item.numericValue,
        });

        const snapshot = await this.quotes.createSnapshotOrNull({
          sourceId: source.id,
          instrumentId: instrument.id,
          rawPayloadId: rawPayload.id,
          observedAt,
          numericValue,
          rawValue: item.rawValue ?? { numericValue },
          rawHash: itemRawHash,
        });

        instrumentIds.add(instrument.id);

        if (!snapshot) {
          skippedDuplicates += 1;
          continue;
        }

        await this.quotes.createNormalizedQuote({
          snapshotId: snapshot.id,
          sourceId: source.id,
          instrumentId: instrument.id,
          observedAt,
          sourceTimestamp: observedAt,
          numericValue,
          precision: item.precision ?? 8,
        });

        insertedSnapshots += 1;
      }

      await this.ingestionRuns.markSucceeded(command.runId);

      return {
        runId: command.runId,
        sourceId: source.id,
        insertedSnapshots,
        skippedDuplicates,
        instrumentIds: [...instrumentIds],
      };
    } catch (error) {
      await this.ingestionRuns.markFailed(
        command.runId,
        this.classifyError(error),
        error instanceof Error ? error.message : 'Unknown ingestion error',
      );

      throw error;
    }
  }

  private classifyError(error: unknown): string {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return 'SOURCE_TIMEOUT';
    }

    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('rate limit') || message.includes('429')) {
      return 'SOURCE_RATE_LIMITED';
    }

    if (message.includes('schema') || message.includes('validation')) {
      return 'SOURCE_SCHEMA_DRIFT';
    }

    return 'NORMALIZATION_FAILED';
  }
}
