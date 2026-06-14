import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { parseQuoteEnvelope, RawQuoteEnvelope } from '../schemas/quote-envelope.schema';

export type AuthorizedRestPullParams = {
  sourceKey: string;
  baseUrl: string;
  cursor?: string | null;
  timeoutMs: number;
  apiKey: string;
};

export type AuthorizedRestPullResult = {
  envelope: RawQuoteEnvelope;
  payloadHash: string;
};

@Injectable()
export class AuthorizedRestSourceAdapter {
  async pull(params: AuthorizedRestPullParams): Promise<AuthorizedRestPullResult> {
    const url = new URL('/v1/quotes', params.baseUrl);
    if (params.cursor) {
      url.searchParams.set('cursor', params.cursor);
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-api-key': params.apiKey,
        'x-source-key': params.sourceKey,
      },
      signal: AbortSignal.timeout(params.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Upstream ${params.sourceKey} returned HTTP ${response.status}.`);
    }

    const rawText = await response.text();
    const payloadHash = createHash('sha256').update(rawText).digest('hex');
    const envelope = parseQuoteEnvelope(JSON.parse(rawText));

    if (envelope.sourceKey !== params.sourceKey) {
      throw new Error(`Envelope sourceKey mismatch: ${envelope.sourceKey}.`);
    }

    return {
      envelope,
      payloadHash,
    };
  }
}

