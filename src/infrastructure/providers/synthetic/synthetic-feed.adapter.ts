import { Injectable } from '@nestjs/common';

import { FetchQuotesInput, QuoteBatch, QuoteProviderPort, RawQuoteItem } from '../../../domain/ingestion/quote-provider.port';
import { stableHash } from '../provider-hash';

@Injectable()
export class SyntheticFeedAdapter implements QuoteProviderPort {
  readonly sourceId = 'synthetic-feed';

  async fetchQuotes(input: FetchQuotesInput): Promise<QuoteBatch> {
    const receivedAt = new Date();
    const observedAt = new Date(Math.floor(receivedAt.getTime() / 60_000) * 60_000);
    const minute = Math.floor(observedAt.getTime() / 60_000);
    const sourceOffset = this.offset(input.sourceKey ?? this.sourceId);

    const items: RawQuoteItem[] = [
      this.item('FX:EURUSD', 'EUR/USD', 1.085, minute, sourceOffset, observedAt),
      this.item('COMMODITY:XAU', 'Gold demo ounce', 2325, minute, sourceOffset + 3, observedAt),
      this.item('INDEX:SAFE-DEMO', 'Safe demo index', 1000, minute, sourceOffset + 7, observedAt),
    ];

    const raw = {
      adapter: this.sourceId,
      sourceKey: input.sourceKey,
      requestedAt: input.requestedAt.toISOString(),
      items,
    };

    return {
      sourceId: this.sourceId,
      sourceVersion: '2026-06-safe-mvp',
      receivedAt,
      rawHash: stableHash(raw),
      rawPayloadRef: `memory://${this.sourceId}/${receivedAt.toISOString()}`,
      items,
    };
  }

  private item(
    instrumentKey: string,
    displayName: string,
    base: number,
    minute: number,
    offset: number,
    observedAt: Date,
  ): RawQuoteItem {
    const wave = Math.sin((minute + offset) / 10) * 0.004;
    const sourceSkew = offset * 0.00002;
    const numericValue = base * (1 + wave + sourceSkew);

    return {
      instrumentKey,
      providerInstrumentKey: instrumentKey,
      quoteTimestamp: observedAt.toISOString(),
      numericValue: numericValue.toFixed(8),
      precision: 8,
      rawValue: {
        displayName,
        value: numericValue.toFixed(8),
      },
    };
  }

  private offset(sourceKey: string): number {
    return [...sourceKey].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 17;
  }
}

