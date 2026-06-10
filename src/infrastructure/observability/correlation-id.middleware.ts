import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export type RequestWithCorrelationId = Request & {
  correlationId?: string;
};

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: RequestWithCorrelationId, res: Response, next: NextFunction): void {
    const incoming = req.header('x-correlation-id');
    const correlationId = incoming && incoming.trim().length > 0 ? incoming : randomUUID();

    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}

export function getCorrelationId(req: RequestWithCorrelationId): string {
  return req.correlationId ?? req.header('x-correlation-id') ?? randomUUID();
}

