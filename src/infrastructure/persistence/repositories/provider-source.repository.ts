import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ProviderSourceStatus, ProviderSourceType } from '../../../domain/catalog/provider-source.entity';
import { PrismaService } from '../prisma/prisma.service';

export type CreateProviderSourceRecord = {
  sourceKey: string;
  type: ProviderSourceType;
  status: ProviderSourceStatus;
  authorizationApproved: boolean;
  secretRef?: string;
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
        secretRef: input.secretRef,
        rateLimitPolicy: input.rateLimitPolicy as Prisma.InputJsonValue | undefined,
      },
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
}

