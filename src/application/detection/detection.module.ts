import { Module } from '@nestjs/common';

import { DiscrepancyDetector } from '../../domain/detection/discrepancy-detector.service';
import { PersistenceModule } from '../../infrastructure/persistence/persistence.module';
import { DetectDiscrepanciesUseCase } from './detect-discrepancies.use-case';
import { ReviewAlertUseCase } from './review-alert.use-case';

@Module({
  imports: [PersistenceModule],
  providers: [DiscrepancyDetector, DetectDiscrepanciesUseCase, ReviewAlertUseCase],
  exports: [DetectDiscrepanciesUseCase, ReviewAlertUseCase],
})
export class DetectionModule {}

