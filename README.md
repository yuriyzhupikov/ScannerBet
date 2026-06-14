# Safe Market Data Discrepancy Scanner

Безопасный MVP для мониторинга расхождений между числовыми потоками данных. Проект намеренно не содержит betting/gambling-интеграций, scraping закрытых API, cookie/session-token сбора, обхода ограничений или рекомендаций по ставкам.

## Стек

- Node.js 24 LTS в Docker
- NestJS, TypeScript strict
- PostgreSQL, Prisma
- Redis, BullMQ
- Docker Compose

## Быстрый запуск

```bash
cp .env.example .env
docker compose up --build
```

API:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/metrics
```

Swagger доступен по адресу `http://localhost:3000/docs`.

Полный пример использования MVP описан в [docs/usage.md](docs/usage.md).
Поток авторизованных REST/Webhook источников описан в [docs/authorized-market-data.md](docs/authorized-market-data.md).

## Минимальный сценарий

Создать два безопасных synthetic source:

```bash
curl -X POST http://localhost:3000/v1/sources \
  -H 'content-type: application/json' \
  -H 'x-api-token: dev-admin-token' \
  -d '{"sourceKey":"synthetic-a","type":"SYNTHETIC","status":"ACTIVE","authorizationApproved":true}'

curl -X POST http://localhost:3000/v1/sources \
  -H 'content-type: application/json' \
  -H 'x-api-token: dev-admin-token' \
  -d '{"sourceKey":"synthetic-b","type":"SYNTHETIC","status":"ACTIVE","authorizationApproved":true}'
```

Запустить ingestion:

```bash
curl -X POST http://localhost:3000/v1/ingestion/runs \
  -H 'content-type: application/json' \
  -H 'x-api-token: dev-admin-token' \
  -d '{}'
```

Проверить данные:

```bash
curl http://localhost:3000/v1/sources
curl http://localhost:3000/v1/ingestion/runs
curl 'http://localhost:3000/v1/quotes?take=20'
curl http://localhost:3000/v1/discrepancies
```

## Локальная разработка

```bash
npm install
cp .env.example .env
# For local non-Docker runs set REDIS_HOST=localhost and DATABASE_URL to localhost.
npm run prisma:migrate
npm run start:dev
npm run start:worker
```

Полезные проверки:

```bash
npm run lint
npm test
npm run build
npm run prisma:validate
```

Проверить Docker Compose без создания `.env`:

```bash
APP_ENV_FILE=.env.example docker compose config --quiet
```

## API MVP

- `GET /health`
- `GET /metrics`
- `POST /v1/sources`
- `GET /v1/sources`
- `PATCH /v1/sources/:id/status`
- `POST /v1/ingestion/runs`
- `GET /v1/ingestion/runs`
- `GET /v1/quotes`
- `GET /v1/discrepancies`
- `GET /v1/discrepancies/:id`
- `PATCH /v1/discrepancies/:id/review`
- `GET /docs`

## API авторизованных источников

- `GET /health`
- `GET /ready`
- `POST /v1/sources/:sourceKey/pull`
- `POST /v1/ingest/webhook/:sourceKey`
- `GET /v1/quotes/latest?instrumentKey=&dimensionKey=`
- `GET /v1/signals?status=OPEN`
- `POST /v1/signals/:id/ignore`

Mutation endpoints защищены `x-api-token`, если задан `ADMIN_API_TOKEN`. В production без `ADMIN_API_TOKEN` mutations отклоняются.

## Безопасные источники

В MVP доступны только:

- `SYNTHETIC` - локально генерируемые котировки;
- `DEMO_FRONT` - локальный demo front feed, только `localhost/127.0.0.1/::1`;
- `AUTHORIZED_API_STUB` - stub без внешних HTTP-вызовов.

Подключение реального provider API должно добавляться только при наличии явного разрешения, ключа доступа и документации. Секреты не сохраняются в raw payload, audit metadata или логах.

## Работа с базой

Прямой `PrismaService` используется только внутри `src/infrastructure/persistence`. Application/use-case и HTTP-controller слои должны работать через repositories:

- `ProviderSourceRepository` - источники данных;
- `IngestionRunRepository` - ingestion runs;
- `QuoteRepository` - raw payloads, instruments, snapshots, normalized quotes;
- `DiscrepancyAlertRepository` - alerts, evidence, review/audit transaction;
- `SystemRepository` - health и metrics counts.
- `SignalRepository` - spread signals.

Если нужен новый запрос к БД, добавляйте метод в соответствующий repository и инжектите repository в use case/controller. Не добавляйте `PrismaService` в application или interfaces слои.
