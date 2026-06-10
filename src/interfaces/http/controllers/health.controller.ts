import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { SystemRepository } from '../../../infrastructure/persistence/repositories/system.repository';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly system: SystemRepository) {}

  @Get()
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
}
