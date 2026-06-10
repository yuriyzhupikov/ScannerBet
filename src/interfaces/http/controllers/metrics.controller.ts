import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { SystemRepository } from '../../../infrastructure/persistence/repositories/system.repository';

@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly system: SystemRepository) {}

  @Get()
  @Header('content-type', 'text/plain; version=0.0.4')
  async getMetrics(): Promise<string> {
    const { sources, snapshots, normalizedQuotes, openAlerts } = await this.system.getMetricsCounts();

    return [
      '# HELP mdds_build_info Build metadata for the discrepancy scanner.',
      '# TYPE mdds_build_info gauge',
      'mdds_build_info{service="safe-market-data-discrepancy-scanner"} 1',
      '# HELP mdds_provider_sources_total Provider source count.',
      '# TYPE mdds_provider_sources_total gauge',
      `mdds_provider_sources_total ${sources}`,
      '# HELP mdds_quote_snapshots_total Quote snapshot count.',
      '# TYPE mdds_quote_snapshots_total gauge',
      `mdds_quote_snapshots_total ${snapshots}`,
      '# HELP mdds_normalized_quotes_total Normalized quote count.',
      '# TYPE mdds_normalized_quotes_total gauge',
      `mdds_normalized_quotes_total ${normalizedQuotes}`,
      '# HELP mdds_open_discrepancy_alerts_total Open discrepancy alert count.',
      '# TYPE mdds_open_discrepancy_alerts_total gauge',
      `mdds_open_discrepancy_alerts_total ${openAlerts}`,
      '',
    ].join('\n');
  }
}
