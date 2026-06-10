import { Module } from '@nestjs/common';

import { PersistenceModule } from '../../infrastructure/persistence/persistence.module';
import { RegisterProviderSourceUseCase } from './register-provider-source.use-case';

@Module({
  imports: [PersistenceModule],
  providers: [RegisterProviderSourceUseCase],
  exports: [RegisterProviderSourceUseCase],
})
export class CatalogModule {}

