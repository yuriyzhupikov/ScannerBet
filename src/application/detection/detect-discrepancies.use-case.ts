import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DiscrepancyDetector, DetectionResult, DiscrepancyRule } from '../../domain/detection/discrepancy-detector.service';
import { DiscrepancyAlertRepository } from '../../infrastructure/persistence/repositories/discrepancy-alert.repository';
import { QuoteRepository } from '../../infrastructure/persistence/repositories/quote.repository';

export type DetectDiscrepanciesCommand = {
  instrumentId: string;
  ruleKey?: string;
  thresholdBps?: number;
  windowSeconds?: number;
  now?: Date;
};

@Injectable()
export class DetectDiscrepanciesUseCase {
  constructor(
    private readonly quotes: QuoteRepository,
    private readonly alerts: DiscrepancyAlertRepository,
    private readonly detector: DiscrepancyDetector,
    private readonly config: ConfigService,
  ) {}

  async execute(command: DetectDiscrepanciesCommand): Promise<DetectionResult> {
    const instrument = await this.quotes.findInstrumentById(command.instrumentId);

    if (!instrument) {
      throw new NotFoundException(`Instrument ${command.instrumentId} was not found.`);
    }

    const rule = this.rule(command);
    const now = command.now ?? new Date();
    const since = new Date(now.getTime() - rule.windowSeconds * 1000);

    const quotes = await this.quotes.findComparableWindow(command.instrumentId, since, now);

    const result = this.detector.detect(
      quotes.map((quote) => ({
        id: quote.id,
        sourceId: quote.sourceId,
        numericValue: quote.numericValue.toString(),
        observedAt: quote.observedAt,
      })),
      rule,
    );

    if (!result.hasAlert) {
      return result;
    }

    const existingAlert = await this.alerts.findOpenRecent(command.instrumentId, rule.ruleKey, since);

    if (existingAlert) {
      return {
        ...result,
        alertId: existingAlert.id,
        reusedExistingAlert: true,
      };
    }

    const alert = await this.alerts.createOpen({
      instrumentId: command.instrumentId,
      ruleKey: rule.ruleKey,
      thresholdBps: rule.thresholdBps.toFixed(8),
      maxDifferenceBps: result.differenceBps,
      evidence: result.evidence,
      auditMetadata: {
        ruleKey: rule.ruleKey,
        differenceBps: result.differenceBps,
        comparableSourceCount: result.comparableSourceCount,
      },
    });

    return {
      ...result,
      alertId: alert.id,
    };
  }

  private rule(command: DetectDiscrepanciesCommand): DiscrepancyRule {
    return {
      ruleKey: command.ruleKey ?? 'default-threshold-bps',
      thresholdBps: command.thresholdBps ?? Number(this.config.get('DISCREPANCY_THRESHOLD_BPS', 50)),
      windowSeconds: command.windowSeconds ?? Number(this.config.get('DISCREPANCY_WINDOW_SECONDS', 120)),
    };
  }
}
