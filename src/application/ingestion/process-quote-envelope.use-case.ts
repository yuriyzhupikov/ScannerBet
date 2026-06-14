import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { NormalizeEnvelopeUseCase } from '../normalization/normalize-envelope.use-case';
import { SignalRecalculationService } from '../signal-detection/signal-recalculation.service';
import { DecimalQuote } from '../../domain/shared/value-objects/decimal-quote';
import { ProviderSourceRepository } from '../../infrastructure/persistence/repositories/provider-source.repository';
import { QuoteRepository } from '../../infrastructure/persistence/repositories/quote.repository';
import { RawQuoteEnvelope } from '../../infrastructure/sources/schemas/quote-envelope.schema';

export type ProcessQuoteEnvelopeCommand = {
  sourceKey: string;
  idempotencyKey: string;
  payloadHash: string;
  payloadRef: string;
  envelope: RawQuoteEnvelope;
};

export type ProcessQuoteEnvelopeResult = {
  rawPayloadId: string;
  insertedQuotes: number;
  skippedDuplicates: number;
  skippedStale: number;
  createdSignals: number;
};

@Injectable()
export class ProcessQuoteEnvelopeUseCase {
  constructor(
    private readonly providerSources: ProviderSourceRepository,
    private readonly quotes: QuoteRepository,
    private readonly normalizer: NormalizeEnvelopeUseCase,
    private readonly signals: SignalRecalculationService,
  ) {}

  async execute(command: ProcessQuoteEnvelopeCommand): Promise<ProcessQuoteEnvelopeResult> {
    const source = await this.providerSources.findBySourceKey(command.sourceKey);
    if (!source) {
      throw new NotFoundException(`Source ${command.sourceKey} was not found.`);
    }

    if (source.status !== 'ACTIVE') {
      throw new BadRequestException(`Source ${command.sourceKey} is not ACTIVE.`);
    }

    if (command.envelope.sourceKey !== command.sourceKey) {
      throw new BadRequestException(`Envelope sourceKey mismatch: ${command.envelope.sourceKey}.`);
    }

    const rawPayload = await this.quotes.upsertRawPayload({
      sourceId: source.id,
      rawHash: command.payloadHash,
      idempotencyKey: command.idempotencyKey,
      payloadRef: command.payloadRef,
      receivedAt: new Date(),
      status: 'VALIDATED',
      payload: command.envelope,
    });

    let insertedQuotes = 0;
    let skippedDuplicates = 0;
    let skippedStale = 0;
    let maxLagMs = 0;
    const affectedGroups: Array<{ instrumentKey: string; dimensionKey: string; labelKey: string }> = [];

    for (const item of this.normalizer.execute(command.envelope)) {
      const now = Date.now();
      if (item.observedAt.getTime() - now > 60_000 || now - item.observedAt.getTime() > source.staleAfterMs) {
        skippedStale += 1;
        continue;
      }

      DecimalQuote.from(item.numericValue);

      const instrument = await this.quotes.upsertInstrument({
        instrumentKey: item.instrumentKey,
        displayName: item.displayName,
      });

      await this.quotes.upsertProviderInstrumentMapping({
        sourceId: source.id,
        instrumentId: instrument.id,
        providerInstrumentKey: item.providerInstrumentKey,
        displayName: item.displayName,
      });

      const snapshot = await this.quotes.createSnapshotOrNull({
        sourceId: source.id,
        instrumentId: instrument.id,
        rawPayloadId: rawPayload.id,
        observedAt: item.observedAt,
        numericValue: item.numericValue,
        rawValue: item.rawValue,
        rawHash: item.quoteHash,
      });

      if (!snapshot) {
        skippedDuplicates += 1;
        continue;
      }

      const normalized = await this.quotes.createNormalizedQuoteOrNull({
        snapshotId: snapshot.id,
        sourceId: source.id,
        instrumentId: instrument.id,
        externalId: item.externalId,
        instrumentKey: item.instrumentKey,
        dimensionKey: item.dimensionKey,
        labelKey: item.labelKey,
        quoteHash: item.quoteHash,
        observedAt: item.observedAt,
        sourceTimestamp: item.observedAt,
        numericValue: item.numericValue,
        precision: 8,
      });

      if (!normalized) {
        skippedDuplicates += 1;
        continue;
      }

      insertedQuotes += 1;
      maxLagMs = Math.max(maxLagMs, Date.now() - item.observedAt.getTime());
      affectedGroups.push({
        instrumentKey: item.instrumentKey,
        dimensionKey: item.dimensionKey,
        labelKey: item.labelKey,
      });
    }

    await this.quotes.updateRawPayloadStatus(rawPayload.id, skippedStale > 0 && insertedQuotes === 0 ? 'REJECTED' : 'NORMALIZED');
    await this.providerSources.updateCursor(source.id, command.envelope.cursor ?? source.cursor);
    await this.providerSources.markSuccess(source.id, maxLagMs || null);
    const signalResult = await this.signals.recalculate(affectedGroups);

    return {
      rawPayloadId: rawPayload.id,
      insertedQuotes,
      skippedDuplicates,
      skippedStale,
      createdSignals: signalResult.createdSignals,
    };
  }
}

