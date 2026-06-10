import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export type DiscrepancyEvidenceRecordInput = {
  normalizedQuoteId: string;
  sourceId: string;
  numericValue: string;
  observedAt: Date;
  differenceBps: string;
};

export type CreateOpenDiscrepancyAlertInput = {
  instrumentId: string;
  ruleKey: string;
  thresholdBps: string;
  maxDifferenceBps: string;
  evidence: DiscrepancyEvidenceRecordInput[];
  auditMetadata: Record<string, unknown>;
};

export type ReviewDiscrepancyAlertInput = {
  alertId: string;
  actorId: string;
  action: string;
  previousStatus: string;
  nextStatus: string;
  note?: string;
};

@Injectable()
export class DiscrepancyAlertRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.discrepancyAlert.findUnique({
      where: { id },
    });
  }

  findOpenRecent(instrumentId: string, ruleKey: string, since: Date) {
    return this.prisma.discrepancyAlert.findFirst({
      where: {
        instrumentId,
        ruleKey,
        status: 'OPEN',
        openedAt: {
          gte: since,
        },
      },
      orderBy: {
        openedAt: 'desc',
      },
    });
  }

  createOpen(input: CreateOpenDiscrepancyAlertInput) {
    return this.prisma.discrepancyAlert.create({
      data: {
        instrumentId: input.instrumentId,
        ruleKey: input.ruleKey,
        status: 'OPEN',
        thresholdBps: input.thresholdBps,
        maxDifferenceBps: input.maxDifferenceBps,
        evidence: {
          create: input.evidence,
        },
        auditEvents: {
          create: {
            actorId: 'system',
            action: 'DISCREPANCY_ALERT_OPENED',
            metadata: input.auditMetadata as Prisma.InputJsonValue,
          },
        },
      },
    });
  }

  reviewWithAudit(input: ReviewDiscrepancyAlertInput) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.discrepancyAlert.update({
        where: { id: input.alertId },
        data: {
          status: input.nextStatus,
          reviewedAt: new Date(),
          reviewerId: input.actorId,
          reviewNote: input.note,
        },
      });

      await tx.auditEvent.create({
        data: {
          alertId: input.alertId,
          actorId: input.actorId,
          action: `ALERT_${input.action}`,
          metadata: {
            previousStatus: input.previousStatus,
            nextStatus: input.nextStatus,
            noteProvided: Boolean(input.note),
          },
        },
      });

      return updated;
    });
  }

  list(status: string | undefined, take: number) {
    return this.prisma.discrepancyAlert.findMany({
      where: status ? { status } : undefined,
      orderBy: {
        openedAt: 'desc',
      },
      take,
      include: {
        instrument: true,
        evidence: {
          include: {
            source: true,
          },
        },
      },
    });
  }

  findDetailsById(id: string) {
    return this.prisma.discrepancyAlert.findUnique({
      where: { id },
      include: {
        instrument: true,
        evidence: {
          include: {
            source: true,
            normalizedQuote: true,
          },
        },
        auditEvents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }
}

