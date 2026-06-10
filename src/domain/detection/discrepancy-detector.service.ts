import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

export type ComparableQuote = {
  id: string;
  sourceId: string;
  numericValue: string;
  observedAt: Date;
};

export type DiscrepancyRule = {
  ruleKey: string;
  thresholdBps: number;
  windowSeconds: number;
};

export type DiscrepancyEvidenceCandidate = {
  normalizedQuoteId: string;
  sourceId: string;
  numericValue: string;
  observedAt: Date;
  differenceBps: string;
};

export type DetectionResult =
  | {
      hasAlert: false;
      reason: 'INSUFFICIENT_SOURCES' | 'BELOW_THRESHOLD';
      comparableSourceCount: number;
      differenceBps?: string;
    }
  | {
      hasAlert: true;
      rule: DiscrepancyRule;
      minValue: string;
      maxValue: string;
      differenceBps: string;
      comparableSourceCount: number;
      evidence: DiscrepancyEvidenceCandidate[];
      alertId?: string;
      reusedExistingAlert?: boolean;
    };

@Injectable()
export class DiscrepancyDetector {
  detect(quotes: ComparableQuote[], rule: DiscrepancyRule): DetectionResult {
    const latestBySource = this.latestQuotePerSource(quotes);
    const comparable = [...latestBySource.values()];

    if (comparable.length < 2) {
      return {
        hasAlert: false,
        reason: 'INSUFFICIENT_SOURCES',
        comparableSourceCount: comparable.length,
      };
    }

    const sorted = comparable
      .map((quote) => ({ quote, value: new Decimal(quote.numericValue) }))
      .sort((left, right) => left.value.comparedTo(right.value));

    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const midpoint = min.value.plus(max.value).dividedBy(2);
    const differenceBps = max.value.minus(min.value).dividedBy(midpoint).times(10_000);

    if (differenceBps.lt(rule.thresholdBps)) {
      return {
        hasAlert: false,
        reason: 'BELOW_THRESHOLD',
        comparableSourceCount: comparable.length,
        differenceBps: differenceBps.toFixed(8),
      };
    }

    return {
      hasAlert: true,
      rule,
      minValue: min.value.toFixed(8),
      maxValue: max.value.toFixed(8),
      differenceBps: differenceBps.toFixed(8),
      comparableSourceCount: comparable.length,
      evidence: sorted.map(({ quote, value }) => ({
        normalizedQuoteId: quote.id,
        sourceId: quote.sourceId,
        numericValue: value.toFixed(8),
        observedAt: quote.observedAt,
        differenceBps: value.minus(min.value).dividedBy(midpoint).times(10_000).toFixed(8),
      })),
    };
  }

  private latestQuotePerSource(quotes: ComparableQuote[]): Map<string, ComparableQuote> {
    return quotes.reduce((latest, quote) => {
      const previous = latest.get(quote.sourceId);
      if (!previous || quote.observedAt > previous.observedAt) {
        latest.set(quote.sourceId, quote);
      }
      return latest;
    }, new Map<string, ComparableQuote>());
  }
}

