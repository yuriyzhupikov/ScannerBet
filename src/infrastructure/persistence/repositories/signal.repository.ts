import { Injectable } from '@nestjs/common';

import { SpreadSignalDraft } from '../../../domain/signal/spread-detector.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SignalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createOpenMany(signals: SpreadSignalDraft[]): Promise<number> {
    let created = 0;

    for (const signal of signals) {
      try {
        await this.prisma.signal.create({
          data: {
            instrumentKey: signal.instrumentKey,
            dimensionKey: signal.dimensionKey,
            labelKey: signal.labelKey,
            minQuoteId: signal.minQuoteId,
            maxQuoteId: signal.maxQuoteId,
            minValue: signal.minValue,
            maxValue: signal.maxValue,
            spreadPct: signal.spreadPct,
            thresholdPct: signal.thresholdPct,
            status: 'OPEN',
          },
        });
        created += 1;
      } catch (error) {
        if (!this.isUniqueConstraint(error)) {
          throw error;
        }
      }
    }

    return created;
  }

  list(status: string | undefined, take: number) {
    return this.prisma.signal.findMany({
      where: status ? { status } : undefined,
      orderBy: {
        detectedAt: 'desc',
      },
      take,
    });
  }

  ignore(id: string) {
    return this.prisma.signal.update({
      where: { id },
      data: {
        status: 'IGNORED',
        closedAt: new Date(),
      },
    });
  }

  countOpen() {
    return this.prisma.signal.count({
      where: { status: 'OPEN' },
    });
  }

  private isUniqueConstraint(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}

