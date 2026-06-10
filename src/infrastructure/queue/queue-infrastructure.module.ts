import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { INGESTION_QUEUE } from './queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: Number(config.get('REDIS_PORT', 6379)),
        },
      }),
    }),
    BullModule.registerQueue({
      name: INGESTION_QUEUE,
    }),
  ],
  exports: [BullModule],
})
export class QueueInfrastructureModule {}
