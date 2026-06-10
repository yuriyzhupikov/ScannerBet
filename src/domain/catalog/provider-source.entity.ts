import { DomainRuleViolation } from '../shared/domain-rule-violation.error';

export const PROVIDER_SOURCE_TYPES = ['SYNTHETIC', 'DEMO_FRONT', 'AUTHORIZED_API_STUB'] as const;
export const PROVIDER_SOURCE_STATUSES = ['ACTIVE', 'PAUSED', 'FAILED'] as const;

export type ProviderSourceType = (typeof PROVIDER_SOURCE_TYPES)[number];
export type ProviderSourceStatus = (typeof PROVIDER_SOURCE_STATUSES)[number];

export class ProviderSourceEntity {
  static assertCanSetStatus(status: ProviderSourceStatus, authorizationApproved: boolean): void {
    if (status === 'ACTIVE' && !authorizationApproved) {
      throw new DomainRuleViolation('ProviderSource cannot be ACTIVE without authorizationApproved=true.');
    }
  }
}

