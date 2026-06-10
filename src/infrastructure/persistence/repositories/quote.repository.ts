import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export type RawPayloadRecordInput = {
  sourceId: string;
  rawHash: string;
  payloadRef: string;
  receivedAt: Date;
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
    return this.prisma.rawPayload.upsert({
      where: {
        sourceId_rawHash: {
          sourceId: input.sourceId,
          rawHash: input.rawHash,
        },
      },
      update: {
        receivedAt: input.receivedAt,
      },
      create: {
        sourceId: input.sourceId,
        rawHash: input.rawHash,
        payloadRef: input.payloadRef,
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

  createNormalizedQuote(input: NormalizedQuoteRecordInput) {
    return this.prisma.normalizedQuote.create({
      data: input,
    });
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

  private isUniqueConstraint(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  private toInputJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}

