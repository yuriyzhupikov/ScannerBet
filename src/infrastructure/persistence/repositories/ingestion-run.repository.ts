import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IngestionRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  createQueued(sourceId: string, correlationId: string) {
    return this.prisma.ingestionRun.create({
      data: {
        sourceId,
        status: 'QUEUED',
        correlationId,
      },
    });
  }

  markRunning(runId: string) {
    return this.prisma.ingestionRun.update({
      where: { id: runId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });
  }

  markSucceeded(runId: string) {
    return this.prisma.ingestionRun.update({
      where: { id: runId },
      data: {
        status: 'SUCCEEDED',
        finishedAt: new Date(),
      },
    });
  }

  markFailed(runId: string, errorCode: string, errorMessage: string) {
    return this.prisma.ingestionRun.update({
      where: { id: runId },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        errorCode,
        errorMessage,
      },
    });
  }

  listRecent(limit = 100) {
    return this.prisma.ingestionRun.findMany({
      orderBy: { requestedAt: 'desc' },
      take: limit,
      include: {
        source: true,
      },
    });
  }
}

