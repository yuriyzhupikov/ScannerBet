import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { SystemRepository } from '../../../infrastructure/persistence/repositories/system.repository';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly system: SystemRepository) {}

  @Get('health')
  async getHealth() {
    const postgres = await this.system.isDatabaseHealthy();

    return {
      status: postgres ? 'ok' : 'degraded',
      checkedAt: new Date().toISOString(),
      services: {
        postgres: postgres ? 'up' : 'down',
      },
    };
  }

  @Get('ready')
  async getReadiness() {
    const postgres = await this.system.isDatabaseHealthy();

    return {
      status: postgres ? 'ready' : 'not_ready',
      checkedAt: new Date().toISOString(),
      services: {
        postgres: postgres ? 'up' : 'down',
      },
    };
  }
}
