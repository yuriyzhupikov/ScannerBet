import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { JsonLogger } from '../../infrastructure/observability/json-logger.service';
import { WorkerModule } from '../../worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  app.useLogger(app.get(JsonLogger));

  const config = app.get(ConfigService);
  app.get(JsonLogger).log(
    {
      message: 'Worker started',
      redisHost: config.get<string>('REDIS_HOST', 'localhost'),
    },
    'WorkerBootstrap',
  );

  const shutdown = async (): Promise<void> => {
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

void bootstrap();

