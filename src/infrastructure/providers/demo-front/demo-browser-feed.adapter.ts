import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FetchQuotesInput, QuoteBatch, QuoteProviderPort, RawQuoteItem } from '../../../domain/ingestion/quote-provider.port';
import { stableHash } from '../provider-hash';

type DemoFrontResponse = {
  items: RawQuoteItem[];
};

@Injectable()
export class DemoBrowserFeedAdapter implements QuoteProviderPort {
  readonly sourceId = 'demo-front-feed';

  constructor(private readonly config: ConfigService) {}

  async fetchQuotes(input: FetchQuotesInput): Promise<QuoteBatch> {
    const configuredUrl = this.config.get<string>('DEMO_FRONT_FEED_URL');

    if (!configuredUrl) {
      return this.localFallback(input);
    }

    const url = new URL(configuredUrl);
    if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
      throw new BadRequestException('DEMO_FRONT_FEED_URL must point to a local authorized demo feed.');
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-correlation-id': input.correlationId,
      },
      signal: AbortSignal.timeout(2_500),
    });

    if (!response.ok) {
      throw new Error(`Demo front feed returned HTTP ${response.status}`);
    }

    const payload = (await response.json()) as DemoFrontResponse;
    const receivedAt = new Date();
    const items = payload.items.map((item) => ({
      ...item,
      quoteTimestamp: new Date(item.quoteTimestamp).toISOString(),
    }));

    return {
      sourceId: this.sourceId,
      sourceVersion: 'local-demo-front',
      receivedAt,
      rawHash: stableHash({ url: url.toString(), items }),
      rawPayloadRef: url.toString(),
      items,
    };
  }

  private async localFallback(input: FetchQuotesInput): Promise<QuoteBatch> {
    const receivedAt = new Date();
    const observedAt = new Date(Math.floor(receivedAt.getTime() / 60_000) * 60_000);
    const sourceOffset = (input.sourceKey?.length ?? 1) * 0.0005;

    const items: RawQuoteItem[] = [
      {
        instrumentKey: 'FX:EURUSD',
        providerInstrumentKey: 'demo:eur-usd',
        quoteTimestamp: observedAt.toISOString(),
        numericValue: (1.086 + sourceOffset).toFixed(8),
        precision: 8,
        rawValue: { label: 'Local demo EUR/USD' },
      },
      {
        instrumentKey: 'COMMODITY:XAU',
        providerInstrumentKey: 'demo:xau',
        quoteTimestamp: observedAt.toISOString(),
        numericValue: (2328 + sourceOffset * 100).toFixed(8),
        precision: 8,
        rawValue: { label: 'Local demo gold ounce' },
      },
      {
        instrumentKey: 'INDEX:SAFE-DEMO',
        providerInstrumentKey: 'demo:safe-index',
        quoteTimestamp: observedAt.toISOString(),
        numericValue: (1001 + sourceOffset * 10).toFixed(8),
        precision: 8,
        rawValue: { label: 'Local demo index' },
      },
    ];

    return {
      sourceId: this.sourceId,
      sourceVersion: 'local-fallback',
      receivedAt,
      rawHash: stableHash({ adapter: this.sourceId, sourceKey: input.sourceKey, items }),
      rawPayloadRef: `memory://${this.sourceId}/${receivedAt.toISOString()}`,
      items,
    };
  }
}

