import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { RawQuoteEnvelope } from '../../infrastructure/sources/schemas/quote-envelope.schema';

export type NormalizedQuoteInput = {
  sourceKey: string;
  externalId: string;
  providerInstrumentKey: string;
  instrumentKey: string;
  displayName: string;
  dimensionKey: string;
  labelKey: string;
  numericValue: string;
  observedAt: Date;
  quoteHash: string;
  rawValue: Record<string, unknown>;
};

@Injectable()
export class NormalizeEnvelopeUseCase {
  execute(envelope: RawQuoteEnvelope): NormalizedQuoteInput[] {
    return envelope.items.map((item) => {
      const startsAt = item.instrument.startsAt?.slice(0, 10) ?? 'na';
      const instrumentKey = slugify(`${item.instrument.name}-${startsAt}`);
      const dimensionKey = slugify(item.dimension);
      const labelKey = slugify(item.label);
      const quoteHash = createHash('sha256')
        .update(`${envelope.sourceKey}:${item.externalId}:${item.numericValue}:${item.observedAt}`)
        .digest('hex');

      return {
        sourceKey: envelope.sourceKey,
        externalId: item.externalId,
        providerInstrumentKey: item.instrument.externalId,
        instrumentKey,
        displayName: item.instrument.name,
        dimensionKey,
        labelKey,
        numericValue: item.numericValue,
        observedAt: new Date(item.observedAt),
        quoteHash,
        rawValue: {
          externalId: item.externalId,
          instrument: item.instrument,
          dimension: item.dimension,
          label: item.label,
          numericValue: item.numericValue,
          observedAt: item.observedAt,
          metadata: item.metadata ?? {},
        },
      };
    });
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

