# Использование MVP

Документ описывает безопасный локальный сценарий работы с сервисом. В MVP разрешены только synthetic/demo/authorized-stub источники без betting/gambling-интеграций и без scraping закрытых API.

## 1. Запуск через Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Сервисы:

- `api` - HTTP API на `http://localhost:3000`;
- `worker` - BullMQ worker, обрабатывает ingestion jobs;
- `postgres` - PostgreSQL;
- `redis` - Redis для BullMQ;
- `migrate` - применяет Prisma migrations перед стартом API/worker.

Проверки:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/metrics
curl http://localhost:3000/docs
```

## 2. Создать источники

Mutation endpoints требуют заголовок `x-api-token`. Значение по умолчанию для локального запуска указано в `.env.example`: `dev-admin-token`.

```bash
curl -X POST http://localhost:3000/v1/sources \
  -H 'content-type: application/json' \
  -H 'x-api-token: dev-admin-token' \
  -d '{"sourceKey":"synthetic-a","type":"SYNTHETIC","status":"ACTIVE","authorizationApproved":true}'

curl -X POST http://localhost:3000/v1/sources \
  -H 'content-type: application/json' \
  -H 'x-api-token: dev-admin-token' \
  -d '{"sourceKey":"synthetic-b","type":"SYNTHETIC","status":"ACTIVE","authorizationApproved":true}'

curl -X POST http://localhost:3000/v1/sources \
  -H 'content-type: application/json' \
  -H 'x-api-token: dev-admin-token' \
  -d '{"sourceKey":"authorized-stub-a","type":"AUTHORIZED_API_STUB","status":"ACTIVE","authorizationApproved":true}'
```

Посмотреть список:

```bash
curl http://localhost:3000/v1/sources
```

Источник нельзя перевести в `ACTIVE`, если `authorizationApproved` не равен `true`.

## 3. Запустить ingestion

Запуск по всем `ACTIVE` источникам:

```bash
curl -X POST http://localhost:3000/v1/ingestion/runs \
  -H 'content-type: application/json' \
  -H 'x-api-token: dev-admin-token' \
  -d '{}'
```

Запуск по одному source:

```bash
curl -X POST http://localhost:3000/v1/ingestion/runs \
  -H 'content-type: application/json' \
  -H 'x-api-token: dev-admin-token' \
  -d '{"sourceId":"SOURCE_UUID"}'
```

Проверить runs:

```bash
curl http://localhost:3000/v1/ingestion/runs
```

API кладет job в BullMQ, worker получает котировки от safe adapter, сохраняет raw payload summary, quote snapshots, normalized quotes и запускает detection window.

## 4. Смотреть котировки и расхождения

Котировки:

```bash
curl 'http://localhost:3000/v1/quotes?take=20'
curl 'http://localhost:3000/v1/quotes?instrumentKey=FX:EURUSD&take=20'
```

Alerts:

```bash
curl http://localhost:3000/v1/discrepancies
curl 'http://localhost:3000/v1/discrepancies?status=OPEN'
curl http://localhost:3000/v1/discrepancies/ALERT_UUID
```

Порог задается через `.env`:

```bash
DISCREPANCY_THRESHOLD_BPS=50
DISCREPANCY_WINDOW_SECONDS=120
```

## 5. Review alert

Допустимые действия:

- `ACKNOWLEDGE`: `OPEN -> ACKNOWLEDGED`;
- `RESOLVE`: `OPEN/ACKNOWLEDGED -> RESOLVED`;
- `REJECT`: `OPEN/ACKNOWLEDGED -> REJECTED`.

```bash
curl -X PATCH http://localhost:3000/v1/discrepancies/ALERT_UUID/review \
  -H 'content-type: application/json' \
  -H 'x-api-token: dev-admin-token' \
  -H 'x-user-id: local-admin' \
  -d '{"action":"ACKNOWLEDGE","note":"Checked by analyst"}'
```

Review пишет append-only audit event через transaction в `DiscrepancyAlertRepository`.

## 6. Локальная разработка без Docker

Нужны локальные PostgreSQL и Redis. Для локального запуска измените `.env`:

```bash
DATABASE_URL=postgresql://mdds:mdds_dev_password@localhost:5432/mdds?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
```

Команды:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
npm run start:worker
```

Проверки:

```bash
npm run lint
npm test
npm run build
npm run prisma:validate
APP_ENV_FILE=.env.example docker compose config --quiet
```

## 7. Работа с БД в коде

`PrismaService` закрыт внутри `src/infrastructure/persistence`. Use cases и controllers не должны импортировать Prisma напрямую.

Правило для новых запросов:

1. Выберите существующий repository в `src/infrastructure/persistence/repositories`.
2. Добавьте метод с понятным именем доменной операции, например `findOpenRecent` или `createQueued`.
3. Инжектите repository в use case/controller.
4. Оставляйте transaction-логику внутри repository, если операция меняет несколько таблиц.

Пример:

```ts
@Injectable()
export class ExampleUseCase {
  constructor(private readonly quotes: QuoteRepository) {}

  async execute(instrumentId: string) {
    const until = new Date();
    const since = new Date(until.getTime() - 120_000);
    return this.quotes.findComparableWindow(instrumentId, since, until);
  }
}
```

