# Authorized Market Data Scanner

Сервис работает с owned/authorized non-gambling источниками без browser automation, cookies, proxy rotation, CAPTCHA bypass, betting/gambling функций и автоисполнения действий.

## Что добавлено

- `AUTHORIZED_REST`, `OWNED_FRONTEND_API`, `WEBHOOK`, `BATCH` source types.
- Source policy: `ACTIVE`, `baseUrl`, `allowedHosts`, `secretRef`, timeout/stale настройки.
- Canonical envelope `quote-envelope.v1`.
- Authorized REST pull: `POST /sources/:sourceKey/pull`.
- Partner webhook push с HMAC: `POST /ingest/webhook/:sourceKey`.
- Canonical quote fields: `externalId`, `instrumentKey`, `dimensionKey`, `labelKey`, `quoteHash`.
- Spread signals: `GET /signals`, `POST /signals/:id/ignore`.
- Health endpoints: `GET /health`, `GET /ready`.

## Source onboarding checklist

Перед подключением источника заведите `source-contract.md` вне runtime secrets:

- юридическое основание доступа: договор, письменное разрешение или internal ownership;
- разрешенные endpoints и схема данных;
- owner и emergency contact;
- rate limits, timeout, stale policy, retention policy;
- разрешены ли raw payloads в базе;
- подтверждение, что источник не относится к gambling/betting;
- `baseUrl`, `allowedHosts`, `secretRef`;
- webhook secret ref для push-источников.

## Создать AUTHORIZED_REST source

`secretRef` - это имя env-переменной, а не само значение секрета.

```bash
curl -X POST http://localhost:3000/v1/sources \
  -H 'content-type: application/json' \
  -H 'x-api-token: dev-admin-token' \
  -d '{
    "sourceKey": "partner_a",
    "type": "AUTHORIZED_REST",
    "status": "ACTIVE",
    "authorizationApproved": true,
    "baseUrl": "https://partner-a.internal.example",
    "allowedHosts": ["partner-a.internal.example"],
    "secretRef": "SOURCE_API_KEY_PARTNER_A",
    "rateLimitPerMinute": 60,
    "timeoutMs": 3000,
    "staleAfterMs": 15000
  }'
```

Для локального теста можно указать controlled локальный endpoint:

```json
{
  "baseUrl": "http://localhost:8081",
  "allowedHosts": ["localhost:8081"],
  "secretRef": "SOURCE_API_KEY_PARTNER_A"
}
```

## Authorized REST Pull

Source должен отдавать `GET /v1/quotes?cursor=...` с envelope:

```json
{
  "schemaVersion": "quote-envelope.v1",
  "sourceKey": "partner_a",
  "cursor": "2026-06-10T12:00:05.000Z",
  "items": [
    {
      "externalId": "q_100001",
      "instrument": {
        "externalId": "inst_42",
        "name": "Sample instrument 42",
        "startsAt": "2026-06-10T13:00:00.000Z"
      },
      "dimension": "primary_metric",
      "label": "option_a",
      "numericValue": "1.93450000",
      "observedAt": "2026-06-10T12:00:03.000Z",
      "metadata": {
        "region": "eu"
      }
    }
  ]
}
```

Запуск pull:

```bash
curl -X POST http://localhost:3000/v1/sources/partner_a/pull \
  -H 'x-api-token: dev-admin-token'
```

## Webhook Push

Создайте WEBHOOK source:

```bash
curl -X POST http://localhost:3000/v1/sources \
  -H 'content-type: application/json' \
  -H 'x-api-token: dev-admin-token' \
  -d '{
    "sourceKey": "partner_a",
    "type": "WEBHOOK",
    "status": "ACTIVE",
    "authorizationApproved": true,
    "staleAfterMs": 15000
  }'
```

Webhook требует:

- `x-timestamp`: ISO datetime, окно допуска 60 секунд;
- `x-idempotency-key`: стабильный ключ запроса;
- `x-signature`: HMAC-SHA256 от строки `<timestamp>.<json-body>`.

Env:

```bash
WEBHOOK_SECRET_PARTNER_A=replace_with_secret_manager
```

Пример расчета подписи:

```bash
timestamp="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
body='{"schemaVersion":"quote-envelope.v1","sourceKey":"partner_a","items":[]}'
signature="$(printf '%s.%s' "$timestamp" "$body" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET_PARTNER_A" -binary | xxd -p -c 256)"

curl -X POST http://localhost:3000/v1/ingest/webhook/partner_a \
  -H 'content-type: application/json' \
  -H "x-timestamp: $timestamp" \
  -H 'x-idempotency-key: smoke-001' \
  -H "x-signature: $signature" \
  -d "$body"
```

## Смотреть данные

Latest canonical quotes:

```bash
curl 'http://localhost:3000/v1/quotes/latest?take=20'
curl 'http://localhost:3000/v1/quotes/latest?instrumentKey=sample-instrument-42-2026-06-10&dimensionKey=primary-metric'
```

Signals:

```bash
curl 'http://localhost:3000/v1/signals?status=OPEN'

curl -X POST http://localhost:3000/v1/signals/SIGNAL_UUID/ignore \
  -H 'x-api-token: dev-admin-token'
```

Threshold:

```bash
DEFAULT_SPREAD_THRESHOLD_PCT=0.035
SIGNAL_WINDOW_SECONDS=120
```

## Persistence rule

Application и HTTP layers не импортируют Prisma напрямую. Новые DB-операции добавляются через repositories:

- `ProviderSourceRepository`;
- `QuoteRepository`;
- `SignalRepository`;
- `SystemRepository`;
- existing MVP repositories для ingestion/discrepancy review.
