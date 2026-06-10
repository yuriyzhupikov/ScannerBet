import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { JsonLogger } from './infrastructure/observability/json-logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(JsonLogger));
  app.setGlobalPrefix('v1', {
    exclude: ['health', 'metrics'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Safe Market Data Discrepancy Scanner')
    .setDescription('Safe MVP for numeric data-quality discrepancy monitoring.')
    .setVersion('0.1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-token', in: 'header' }, 'admin-token')
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const config = app.get(ConfigService);
  await app.listen(Number(config.get('PORT', 3000)));
}

void bootstrap();

