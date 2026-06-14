import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export type MetricsCounts = {
  sources: number;
  snapshots: number;
  normalizedQuotes: number;
  openAlerts: number;
};

@Injectable()
export class SystemRepository {
  constructor(private readonly prisma: PrismaService) {}

  isDatabaseHealthy(): Promise<boolean> {
    return this.prisma.isHealthy();
  }

  async getMetricsCounts(): Promise<MetricsCounts> {
    const [sources, snapshots, normalizedQuotes, openAlerts, openSignals] = await Promise.all([
      this.prisma.providerSource.count(),
      this.prisma.quoteSnapshot.count(),
      this.prisma.normalizedQuote.count(),
      this.prisma.discrepancyAlert.count({ where: { status: 'OPEN' } }),
      this.prisma.signal.count({ where: { status: 'OPEN' } }),
    ]);

    return {
      sources,
      snapshots,
      normalizedQuotes,
      openAlerts: openAlerts + openSignals,
    };
  }
}
