import { Injectable } from '@nestjs/common';

import { ProviderSourceType } from '../../domain/catalog/provider-source.entity';
import { QuoteProviderPort } from '../../domain/ingestion/quote-provider.port';
import { AuthorizedApiAdapterStub } from './authorized-api/authorized-api.adapter.stub';
import { DemoBrowserFeedAdapter } from './demo-front/demo-browser-feed.adapter';
import { SyntheticFeedAdapter } from './synthetic/synthetic-feed.adapter';

export type ProviderSourceLike = {
  id: string;
  sourceKey: string;
  type: string;
};

@Injectable()
export class ProviderRegistry {
  constructor(
    private readonly synthetic: SyntheticFeedAdapter,
    private readonly demoFront: DemoBrowserFeedAdapter,
    private readonly authorizedApiStub: AuthorizedApiAdapterStub,
  ) {}

  resolve(source: ProviderSourceLike): QuoteProviderPort {
    switch (source.type as ProviderSourceType) {
      case 'SYNTHETIC':
        return this.synthetic;
      case 'DEMO_FRONT':
        return this.demoFront;
      case 'AUTHORIZED_API_STUB':
        return this.authorizedApiStub;
      default:
        throw new Error(`Unsupported provider source type: ${source.type}`);
    }
  }
}

