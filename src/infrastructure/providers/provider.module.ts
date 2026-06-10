import { Module } from '@nestjs/common';

import { AuthorizedApiAdapterStub } from './authorized-api/authorized-api.adapter.stub';
import { DemoBrowserFeedAdapter } from './demo-front/demo-browser-feed.adapter';
import { ProviderRegistry } from './provider-registry';
import { SyntheticFeedAdapter } from './synthetic/synthetic-feed.adapter';

@Module({
  providers: [SyntheticFeedAdapter, DemoBrowserFeedAdapter, AuthorizedApiAdapterStub, ProviderRegistry],
  exports: [ProviderRegistry],
})
export class ProviderModule {}

