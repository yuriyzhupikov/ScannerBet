import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export type RawPayloadRecordInput = {
  sourceId: string;
  rawHash: string;
  payloadRef: string;
  receivedAt: Date;
  idempotencyKey?: string;
  status?: string;
  payload: Record<string, unknown>;
};

export type InstrumentRecordInput = {
  instrumentKey: string;
  displayName?: string;
};

export type ProviderInstrumentMappingRecordInput = {
  sourceId: string;
  instrumentId: string;
  providerInstrumentKey: string;
  displayName?: string;
};

export type QuoteSnapshotRecordInput = {
  sourceId: string;
  instrumentId: string;
  rawPayloadId: string;
  observedAt: Date;
  numericValue: string;
  rawValue: unknown;
  rawHash: string;
};

export type NormalizedQuoteRecordInput = {
  snapshotId: string;
  sourceId: string;
  instrumentId: string;
  externalId?: string;
  instrumentKey?: string;
  dimensionKey?: string;
  labelKey?: string;
  quoteHash?: string;
  observedAt: Date;
  sourceTimestamp: Date;
  numericValue: string;
  precision: number;
};

export type ListQuoteSnapshotsFilter = {
  instrumentKey?: string;
  sourceId?: string;
  take: number;
};

export type LatestQuoteFilter = {
  instrumentKey?: string;
  dimensionKey?: string;
  take: number;
};

@Injectable()
export class QuoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  findInstrumentById(id: string) {
    return this.prisma.instrument.findUnique({
      where: { id },
    });
  }

  findComparableWindow(instrumentId: string, since: Date, until: Date) {
    return this.prisma.normalizedQuote.findMany({
      where: {
        instrumentId,
        observedAt: {
          gte: since,
          lte: until,
        },
      },
      orderBy: [{ observedAt: 'desc' }],
    });
  }

  upsertRawPayload(input: RawPayloadRecordInput) {
    if (input.idempotencyKey) {
      return this.prisma.rawPayload
        .findFirst({
          where: {
            sourceId: input.sourceId,
            idempotencyKey: input.idempotencyKey,
          },
        })
        .then((existing) => {
          if (existing) {
            return existing;
          }

          return this.upsertRawPayloadByHash(input);
        });
    }

    return this.upsertRawPayloadByHash(input);
  }

  updateRawPayloadStatus(id: string, status: string, rejectionCode?: string) {
    return this.prisma.rawPayload.update({
      where: { id },
      data: {
        status,
        rejectionCode,
      },
    });
  }

  private upsertRawPayloadByHash(input: RawPayloadRecordInput) {
    return this.prisma.rawPayload.upsert({
      where: {
        sourceId_rawHash: {
          sourceId: input.sourceId,
          rawHash: input.rawHash,
        },
      },
      update: {
        receivedAt: input.receivedAt,
        status: input.status ?? 'RECEIVED',
      },
      create: {
        sourceId: input.sourceId,
        rawHash: input.rawHash,
        payloadRef: input.payloadRef,
        idempotencyKey: input.idempotencyKey ?? input.rawHash,
        status: input.status ?? 'RECEIVED',
        receivedAt: input.receivedAt,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
  }

  upsertInstrument(input: InstrumentRecordInput) {
    return this.prisma.instrument.upsert({
      where: { instrumentKey: input.instrumentKey },
      update: {},
      create: {
        instrumentKey: input.instrumentKey,
        displayName: input.displayName,
      },
    });
  }

  upsertProviderInstrumentMapping(input: ProviderInstrumentMappingRecordInput) {
    return this.prisma.providerInstrumentMapping.upsert({
      where: {
        sourceId_providerInstrumentKey: {
          sourceId: input.sourceId,
          providerInstrumentKey: input.providerInstrumentKey,
        },
      },
      update: {
        instrumentId: input.instrumentId,
        displayName: input.displayName,
      },
      create: input,
    });
  }

  async createSnapshotOrNull(input: QuoteSnapshotRecordInput) {
    try {
      return await this.prisma.quoteSnapshot.create({
        data: {
          sourceId: input.sourceId,
          instrumentId: input.instrumentId,
          rawPayloadId: input.rawPayloadId,
          observedAt: input.observedAt,
          numericValue: input.numericValue,
          rawValue: this.toInputJson(input.rawValue),
          rawHash: input.rawHash,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        return null;
      }
      throw error;
    }
  }

  async createNormalizedQuoteOrNull(input: NormalizedQuoteRecordInput) {
    try {
      return await this.prisma.normalizedQuote.create({
        data: input,
      });
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        return null;
      }
      throw error;
    }
  }

  createNormalizedQuote(input: NormalizedQuoteRecordInput) {
    return this.createNormalizedQuoteOrNull(input);
  }

  listSnapshots(filter: ListQuoteSnapshotsFilter) {
    return this.prisma.quoteSnapshot.findMany({
      where: {
        sourceId: filter.sourceId,
        instrument: filter.instrumentKey
          ? {
              instrumentKey: filter.instrumentKey,
            }
          : undefined,
      },
      orderBy: {
        observedAt: 'desc',
      },
      take: filter.take,
      include: {
        instrument: true,
        source: true,
      },
    });
  }

  listLatestCanonical(filter: LatestQuoteFilter) {
    return this.prisma.normalizedQuote.findMany({
      where: {
        instrumentKey: filter.instrumentKey,
        dimensionKey: filter.dimensionKey,
      },
      orderBy: {
        observedAt: 'desc',
      },
      take: filter.take,
      include: {
        source: true,
        instrument: true,
      },
    });
  }

  findRecentCanonicalForGroups(
    groups: Array<{ instrumentKey: string; dimensionKey: string; labelKey: string }>,
    since: Date,
  ) {
    if (groups.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.normalizedQuote.findMany({
      where: {
        observedAt: { gte: since },
        OR: groups.map((group) => ({
          instrumentKey: group.instrumentKey,
          dimensionKey: group.dimensionKey,
          labelKey: group.labelKey,
        })),
      },
      orderBy: [{ observedAt: 'desc' }],
      include: {
        source: true,
      },
    });
  }

  private isUniqueConstraint(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  private toInputJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
