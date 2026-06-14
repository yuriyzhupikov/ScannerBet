import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ProviderSourceStatus, ProviderSourceType } from '../../../domain/catalog/provider-source.entity';
import { PrismaService } from '../prisma/prisma.service';

export type CreateProviderSourceRecord = {
  sourceKey: string;
  type: ProviderSourceType;
  status: ProviderSourceStatus;
  authorizationApproved: boolean;
  baseUrl?: string;
  allowedHosts?: string[];
  authType?: string;
  secretRef?: string;
  rateLimitPerMinute?: number;
  timeoutMs?: number;
  staleAfterMs?: number;
  rateLimitPolicy?: Record<string, unknown>;
};

@Injectable()
export class ProviderSourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateProviderSourceRecord) {
    return this.prisma.providerSource.create({
      data: {
        sourceKey: input.sourceKey,
        type: input.type,
        status: input.status,
        authorizationApproved: input.authorizationApproved,
        baseUrl: input.baseUrl,
        allowedHosts: input.allowedHosts ?? [],
        authType: input.authType ?? 'API_KEY',
        secretRef: input.secretRef,
        rateLimitPerMinute: input.rateLimitPerMinute ?? 60,
        timeoutMs: input.timeoutMs ?? 3000,
        staleAfterMs: input.staleAfterMs ?? 15000,
        rateLimitPolicy: input.rateLimitPolicy as Prisma.InputJsonValue | undefined,
      },
    });
  }

  findBySourceKey(sourceKey: string) {
    return this.prisma.providerSource.findUnique({
      where: { sourceKey },
    });
  }

  findById(id: string) {
    return this.prisma.providerSource.findUnique({
      where: { id },
    });
  }

  findByIdOrThrow(id: string) {
    return this.prisma.providerSource.findUniqueOrThrow({
      where: { id },
    });
  }

  list(status?: string) {
    return this.prisma.providerSource.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  listActiveOrdered() {
    return this.prisma.providerSource.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { sourceKey: 'asc' },
    });
  }

  updateStatus(id: string, status: ProviderSourceStatus, authorizationApproved: boolean) {
    return this.prisma.providerSource.update({
      where: { id },
      data: {
        status,
        authorizationApproved,
      },
    });
  }

  updateCursor(sourceId: string, cursor?: string | null) {
    return this.prisma.providerSource.update({
      where: { id: sourceId },
      data: { cursor },
    });
  }

  markSuccess(sourceId: string, lagMs?: number | null) {
    return this.prisma.providerSource.update({
      where: { id: sourceId },
      data: {
        lastSuccessAt: new Date(),
        lastFailureCode: null,
        consecutiveErrors: 0,
        lagMs,
      },
    });
  }

  markFailure(sourceId: string, failureCode: string) {
    return this.prisma.providerSource.update({
      where: { id: sourceId },
      data: {
        lastFailureAt: new Date(),
        lastFailureCode: failureCode,
        consecutiveErrors: { increment: 1 },
      },
    });
  }
}
