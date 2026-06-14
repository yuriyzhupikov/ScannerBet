import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SpreadDetectorService } from '../../domain/signal/spread-detector.service';
import { QuoteRepository } from '../../infrastructure/persistence/repositories/quote.repository';
import { SignalRepository } from '../../infrastructure/persistence/repositories/signal.repository';

export type AffectedQuoteGroup = {
  instrumentKey: string;
  dimensionKey: string;
  labelKey: string;
};

@Injectable()
export class SignalRecalculationService {
  constructor(
    private readonly quotes: QuoteRepository,
    private readonly signals: SignalRepository,
    private readonly detector: SpreadDetectorService,
    private readonly config: ConfigService,
  ) {}

  async recalculate(groups: AffectedQuoteGroup[]): Promise<{ createdSignals: number }> {
    const dedupedGroups = [...new Map(groups.map((group) => [`${group.instrumentKey}|${group.dimensionKey}|${group.labelKey}`, group])).values()];
    const windowSeconds = Number(this.config.get('SIGNAL_WINDOW_SECONDS', 120));
    const since = new Date(Date.now() - windowSeconds * 1000);
    const quotes = await this.quotes.findRecentCanonicalForGroups(dedupedGroups, since);
    const drafts = this.detector.detect(
      quotes.flatMap((quote) => {
        if (!quote.instrumentKey || !quote.dimensionKey || !quote.labelKey) {
          return [];
        }

        return [
          {
            id: quote.id,
            sourceKey: quote.source.sourceKey,
            instrumentKey: quote.instrumentKey,
            dimensionKey: quote.dimensionKey,
            labelKey: quote.labelKey,
            numericValue: quote.numericValue.toString(),
            observedAt: quote.observedAt,
          },
        ];
      }),
      String(this.config.get('DEFAULT_SPREAD_THRESHOLD_PCT', '0.035')),
    );

    return {
      createdSignals: await this.signals.createOpenMany(drafts),
    };
  }
}

