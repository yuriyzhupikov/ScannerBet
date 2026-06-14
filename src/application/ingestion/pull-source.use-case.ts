import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SourcePolicyService } from '../../domain/source/source-policy.service';
import { ProviderSourceRepository } from '../../infrastructure/persistence/repositories/provider-source.repository';
import { AuthorizedRestSourceAdapter } from '../../infrastructure/sources/authorized-rest/authorized-rest-source.adapter';
import { ProcessQuoteEnvelopeUseCase } from './process-quote-envelope.use-case';

export type PullSourceCommand = {
  sourceKey: string;
};

@Injectable()
export class PullSourceUseCase {
  constructor(
    private readonly providerSources: ProviderSourceRepository,
    private readonly sourcePolicy: SourcePolicyService,
    private readonly adapter: AuthorizedRestSourceAdapter,
    private readonly processEnvelope: ProcessQuoteEnvelopeUseCase,
    private readonly config: ConfigService,
  ) {}

  async execute(command: PullSourceCommand) {
    const source = await this.providerSources.findBySourceKey(command.sourceKey);
    if (!source) {
      throw new NotFoundException(`Source ${command.sourceKey} was not found.`);
    }

    try {
      this.sourcePolicy.assertCanPull(source);
      const apiKey = this.resolveSecret(source.secretRef);
      const result = await this.adapter.pull({
        sourceKey: source.sourceKey,
        baseUrl: source.baseUrl!,
        cursor: source.cursor,
        timeoutMs: source.timeoutMs,
        apiKey,
      });

      return await this.processEnvelope.execute({
        sourceKey: source.sourceKey,
        idempotencyKey: result.payloadHash,
        payloadHash: result.payloadHash,
        payloadRef: `${source.baseUrl}/v1/quotes`,
        envelope: result.envelope,
      });
    } catch (error) {
      await this.providerSources.markFailure(source.id, this.classifyError(error));
      throw error;
    }
  }

  private resolveSecret(secretRef?: string | null): string {
    if (!secretRef) {
      throw new BadRequestException('Source secretRef is required for authorized pull.');
    }

    const value = this.config.get<string>(secretRef);
    if (!value) {
      throw new BadRequestException(`Configured secretRef ${secretRef} was not found in environment.`);
    }

    return value;
  }

  private classifyError(error: unknown): string {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return 'SOURCE_TIMEOUT';
    }

    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('401') || message.includes('403')) {
      return 'SOURCE_AUTH_FAILED';
    }
    if (message.includes('429') || message.includes('rate limit')) {
      return 'SOURCE_RATE_LIMITED';
    }
    if (message.includes('schema') || message.includes('envelope')) {
      return 'SOURCE_SCHEMA_DRIFT';
    }

    return 'SOURCE_PULL_FAILED';
  }
}

