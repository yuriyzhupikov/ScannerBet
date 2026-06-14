import { BadRequestException, Injectable } from '@nestjs/common';

import { ProviderSourceEntity, ProviderSourceStatus, ProviderSourceType } from '../../domain/catalog/provider-source.entity';
import { DomainRuleViolation } from '../../domain/shared/domain-rule-violation.error';
import { ProviderSourceRepository } from '../../infrastructure/persistence/repositories/provider-source.repository';

export type RegisterProviderSourceCommand = {
  sourceKey: string;
  type: ProviderSourceType;
  status?: ProviderSourceStatus;
  authorizationApproved?: boolean;
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
export class RegisterProviderSourceUseCase {
  constructor(private readonly providerSources: ProviderSourceRepository) {}

  async execute(command: RegisterProviderSourceCommand) {
    const status = command.status ?? 'PAUSED';
    const authorizationApproved = command.authorizationApproved ?? false;

    try {
      ProviderSourceEntity.assertCanSetStatus(status, authorizationApproved);
    } catch (error) {
      if (error instanceof DomainRuleViolation) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    return this.providerSources.create({
      sourceKey: command.sourceKey,
      type: command.type,
      status,
      authorizationApproved,
      baseUrl: command.baseUrl,
      allowedHosts: command.allowedHosts,
      authType: command.authType,
      secretRef: command.secretRef,
      rateLimitPerMinute: command.rateLimitPerMinute,
      timeoutMs: command.timeoutMs,
      staleAfterMs: command.staleAfterMs,
      rateLimitPolicy: command.rateLimitPolicy,
    });
  }
}
