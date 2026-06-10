import { Injectable } from '@nestjs/common';

import { FetchQuotesInput, QuoteBatch, QuoteProviderPort, RawQuoteItem } from '../../../domain/ingestion/quote-provider.port';
import { stableHash } from '../provider-hash';

@Injectable()
export class AuthorizedApiAdapterStub implements QuoteProviderPort {
  readonly sourceId = 'authorized-api-stub';

  async fetchQuotes(input: FetchQuotesInput): Promise<QuoteBatch> {
    const receivedAt = new Date();
    const observedAt = new Date(Math.floor(receivedAt.getTime() / 60_000) * 60_000);
    const sourceOffset = ((input.sourceKey?.charCodeAt(0) ?? 65) % 11) / 100_000;

    const items: RawQuoteItem[] = [
      {
        instrumentKey: 'FX:EURUSD',
        providerInstrumentKey: 'authorized-stub:eur-usd',
        quoteTimestamp: observedAt.toISOString(),
        numericValue: (1.0845 + sourceOffset).toFixed(8),
        precision: 8,
        rawValue: { stub: true, valueKind: 'authorized-demo' },
      },
      {
        instrumentKey: 'COMMODITY:XAU',
        providerInstrumentKey: 'authorized-stub:xau',
        quoteTimestamp: observedAt.toISOString(),
        numericValue: (2324 + sourceOffset * 100).toFixed(8),
        precision: 8,
        rawValue: { stub: true, valueKind: 'authorized-demo' },
      },
    ];

    return {
      sourceId: this.sourceId,
      sourceVersion: 'stub-only',
      receivedAt,
      rawHash: stableHash({ adapter: this.sourceId, sourceKey: input.sourceKey, items }),
      rawPayloadRef: `memory://${this.sourceId}/${receivedAt.toISOString()}`,
      items,
    };
  }
}

