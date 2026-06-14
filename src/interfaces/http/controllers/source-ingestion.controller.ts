import { Body, Controller, Headers, Param, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ProcessQuoteEnvelopeUseCase } from '../../../application/ingestion/process-quote-envelope.use-case';
import { PullSourceUseCase } from '../../../application/ingestion/pull-source.use-case';
import { AdminGuard } from '../../../infrastructure/access/admin.guard';
import { parseQuoteEnvelope } from '../../../infrastructure/sources/schemas/quote-envelope.schema';

@ApiTags('production-ingestion')
@Controller()
export class SourceIngestionController {
  constructor(
    private readonly pullSource: PullSourceUseCase,
    private readonly processEnvelope: ProcessQuoteEnvelopeUseCase,
    private readonly config: ConfigService,
  ) {}

  @Post('sources/:sourceKey/pull')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  pull(@Param('sourceKey') sourceKey: string) {
    return this.pullSource.execute({ sourceKey });
  }

  @Post('ingest/webhook/:sourceKey')
  async receiveWebhook(
    @Param('sourceKey') sourceKey: string,
    @Headers('x-signature') signature: string | undefined,
    @Headers('x-timestamp') timestamp: string | undefined,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    if (!timestamp || !idempotencyKey) {
      throw new UnauthorizedException('Missing webhook timestamp or idempotency key.');
    }

    this.verifyTimestamp(timestamp);
    this.verifySignature(sourceKey, timestamp, body, signature);

    const envelope = parseQuoteEnvelope(body);
    if (envelope.sourceKey !== sourceKey) {
      throw new UnauthorizedException('Source mismatch.');
    }

    const payloadHash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
    const result = await this.processEnvelope.execute({
      sourceKey,
      idempotencyKey,
      payloadHash,
      payloadRef: `webhook://${sourceKey}/${idempotencyKey}`,
      envelope,
    });

    return {
      accepted: true,
      ...result,
    };
  }

  private verifyTimestamp(timestamp: string): void {
    const parsed = Date.parse(timestamp);
    if (!Number.isFinite(parsed) || Math.abs(Date.now() - parsed) > 60_000) {
      throw new UnauthorizedException('Invalid timestamp.');
    }
  }

  private verifySignature(sourceKey: string, timestamp: string, body: unknown, signature?: string): void {
    const secret = this.config.get<string>(`WEBHOOK_SECRET_${sourceKey.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`);
    if (!secret || !signature) {
      throw new UnauthorizedException('Unknown source or missing signature.');
    }

    const expected = createHmac('sha256', secret).update(`${timestamp}.${JSON.stringify(body)}`).digest('hex');
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) {
      throw new UnauthorizedException('Invalid signature.');
    }
  }
}
