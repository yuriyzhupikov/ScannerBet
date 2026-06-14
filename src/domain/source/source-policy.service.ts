import { Injectable } from '@nestjs/common';

import { DomainRuleViolation } from '../shared/domain-rule-violation.error';

export type PullableSourcePolicy = {
  sourceKey: string;
  status: string;
  baseUrl?: string | null;
  allowedHosts: string[];
};

@Injectable()
export class SourcePolicyService {
  assertCanPull(source: PullableSourcePolicy): void {
    if (source.status !== 'ACTIVE') {
      throw new DomainRuleViolation(`Source ${source.sourceKey} is not active.`);
    }

    if (!source.baseUrl) {
      throw new DomainRuleViolation(`Source ${source.sourceKey} has no baseUrl.`);
    }

    const host = new URL(source.baseUrl).host.toLowerCase();
    const allowedHosts = source.allowedHosts.map((allowedHost) => allowedHost.toLowerCase());
    if (!allowedHosts.includes(host)) {
      throw new DomainRuleViolation(`Source ${source.sourceKey} host is not allowlisted.`);
    }
  }
}

