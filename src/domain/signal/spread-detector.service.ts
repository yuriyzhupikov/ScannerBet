import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

export type QuoteForSignal = {
  id: string;
  sourceKey: string;
  instrumentKey: string;
  dimensionKey: string;
  labelKey: string;
  numericValue: string;
  observedAt: Date;
};

export type SpreadSignalDraft = {
  instrumentKey: string;
  dimensionKey: string;
  labelKey: string;
  minQuoteId: string;
  maxQuoteId: string;
  minValue: string;
  maxValue: string;
  spreadPct: string;
  thresholdPct: string;
};

@Injectable()
export class SpreadDetectorService {
  detect(quotes: QuoteForSignal[], thresholdPct = '0.035'): SpreadSignalDraft[] {
    const groups = new Map<string, QuoteForSignal[]>();
    for (const quote of quotes) {
      const key = `${quote.instrumentKey}|${quote.dimensionKey}|${quote.labelKey}`;
      groups.set(key, [...(groups.get(key) ?? []), quote]);
    }

    const signals: SpreadSignalDraft[] = [];
    const threshold = new Decimal(thresholdPct);

    for (const group of groups.values()) {
      if (new Set(group.map((quote) => quote.sourceKey)).size < 2) {
        continue;
      }

      const sorted = [...group].sort((left, right) => new Decimal(left.numericValue).cmp(right.numericValue));
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const minValue = new Decimal(min.numericValue);
      const maxValue = new Decimal(max.numericValue);
      const midpoint = minValue.plus(maxValue).div(2);
      if (midpoint.lte(0)) {
        continue;
      }

      const spreadPct = maxValue.minus(minValue).div(midpoint);
      if (spreadPct.gte(threshold)) {
        signals.push({
          instrumentKey: min.instrumentKey,
          dimensionKey: min.dimensionKey,
          labelKey: min.labelKey,
          minQuoteId: min.id,
          maxQuoteId: max.id,
          minValue: minValue.toFixed(8),
          maxValue: maxValue.toFixed(8),
          spreadPct: spreadPct.toFixed(8),
          thresholdPct: threshold.toFixed(8),
        });
      }
    }

    return signals;
  }
}

