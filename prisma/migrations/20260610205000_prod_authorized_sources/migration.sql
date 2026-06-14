ALTER TABLE "provider_sources"
  ADD COLUMN "base_url" TEXT,
  ADD COLUMN "allowed_hosts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "auth_type" TEXT NOT NULL DEFAULT 'API_KEY',
  ADD COLUMN "rate_limit_per_minute" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "timeout_ms" INTEGER NOT NULL DEFAULT 3000,
  ADD COLUMN "stale_after_ms" INTEGER NOT NULL DEFAULT 15000,
  ADD COLUMN "cursor" TEXT,
  ADD COLUMN "last_success_at" TIMESTAMP(3),
  ADD COLUMN "last_failure_at" TIMESTAMP(3),
  ADD COLUMN "last_failure_code" TEXT,
  ADD COLUMN "consecutive_errors" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lag_ms" INTEGER;

CREATE INDEX "provider_sources_type_status_idx" ON "provider_sources"("type", "status");

ALTER TABLE "raw_payloads"
  ADD COLUMN "external_batch_id" TEXT,
  ADD COLUMN "idempotency_key" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  ADD COLUMN "rejection_code" TEXT;

CREATE UNIQUE INDEX "raw_payloads_source_id_idempotency_key_key"
  ON "raw_payloads"("source_id", "idempotency_key");
CREATE INDEX "raw_payloads_status_received_at_idx" ON "raw_payloads"("status", "received_at");

ALTER TABLE "normalized_quotes"
  ADD COLUMN "external_id" TEXT,
  ADD COLUMN "instrument_key" TEXT,
  ADD COLUMN "dimension_key" TEXT,
  ADD COLUMN "label_key" TEXT,
  ADD COLUMN "quote_hash" TEXT;

CREATE INDEX "normalized_quotes_instrument_key_dimension_key_label_key_observed_at_idx"
  ON "normalized_quotes"("instrument_key", "dimension_key", "label_key", "observed_at");
CREATE INDEX "normalized_quotes_source_id_external_id_idx" ON "normalized_quotes"("source_id", "external_id");
CREATE UNIQUE INDEX "normalized_quotes_source_id_quote_hash_key" ON "normalized_quotes"("source_id", "quote_hash");

CREATE TABLE "signals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "instrument_key" TEXT NOT NULL,
  "dimension_key" TEXT NOT NULL,
  "label_key" TEXT NOT NULL,
  "min_quote_id" UUID NOT NULL,
  "max_quote_id" UUID NOT NULL,
  "min_value" DECIMAL(20,8) NOT NULL,
  "max_value" DECIMAL(20,8) NOT NULL,
  "spread_pct" DECIMAL(20,8) NOT NULL,
  "threshold_pct" DECIMAL(20,8) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMP(3),
  CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "signals_instrument_key_dimension_key_label_key_min_quote_id_max_quote_id_status_key"
  ON "signals"("instrument_key", "dimension_key", "label_key", "min_quote_id", "max_quote_id", "status");
CREATE INDEX "signals_instrument_key_dimension_key_label_key_detected_at_idx"
  ON "signals"("instrument_key", "dimension_key", "label_key", "detected_at");
CREATE INDEX "signals_status_detected_at_idx" ON "signals"("status", "detected_at");
