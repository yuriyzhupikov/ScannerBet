CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "provider_sources" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_key" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "authorization_approved" BOOLEAN NOT NULL DEFAULT false,
  "secret_ref" TEXT,
  "rate_limit_policy" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "provider_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instruments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "instrument_key" TEXT NOT NULL,
  "display_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "instruments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "provider_instrument_mappings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_id" UUID NOT NULL,
  "instrument_id" UUID NOT NULL,
  "provider_instrument_key" TEXT NOT NULL,
  "display_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "provider_instrument_mappings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ingestion_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_id" UUID NOT NULL,
  "status" TEXT NOT NULL,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "error_code" TEXT,
  "error_message" TEXT,
  "correlation_id" TEXT,
  CONSTRAINT "ingestion_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "raw_payloads" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_id" UUID NOT NULL,
  "raw_hash" TEXT NOT NULL,
  "payload_ref" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "raw_payloads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_id" UUID NOT NULL,
  "instrument_id" UUID NOT NULL,
  "raw_payload_id" UUID NOT NULL,
  "observed_at" TIMESTAMP(3) NOT NULL,
  "numeric_value" DECIMAL(20,8) NOT NULL,
  "raw_value" JSONB NOT NULL,
  "raw_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quote_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "normalized_quotes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "snapshot_id" UUID NOT NULL,
  "source_id" UUID NOT NULL,
  "instrument_id" UUID NOT NULL,
  "observed_at" TIMESTAMP(3) NOT NULL,
  "source_timestamp" TIMESTAMP(3) NOT NULL,
  "numeric_value" DECIMAL(20,8) NOT NULL,
  "precision" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "normalized_quotes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "discrepancy_alerts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "instrument_id" UUID NOT NULL,
  "rule_key" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "threshold_bps" DECIMAL(20,8) NOT NULL,
  "max_difference_bps" DECIMAL(20,8) NOT NULL,
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "reviewed_at" TIMESTAMP(3),
  "reviewer_id" TEXT,
  "review_note" TEXT,
  CONSTRAINT "discrepancy_alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "discrepancy_evidence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "alert_id" UUID NOT NULL,
  "normalized_quote_id" UUID NOT NULL,
  "source_id" UUID NOT NULL,
  "numeric_value" DECIMAL(20,8) NOT NULL,
  "observed_at" TIMESTAMP(3) NOT NULL,
  "difference_bps" DECIMAL(20,8) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "discrepancy_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "alert_id" UUID,
  "actor_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "provider_sources_source_key_key" ON "provider_sources"("source_key");
CREATE INDEX "provider_sources_status_idx" ON "provider_sources"("status");

CREATE UNIQUE INDEX "instruments_instrument_key_key" ON "instruments"("instrument_key");

CREATE UNIQUE INDEX "provider_instrument_mappings_source_id_provider_instrument_key_key"
  ON "provider_instrument_mappings"("source_id", "provider_instrument_key");
CREATE INDEX "provider_instrument_mappings_instrument_id_idx" ON "provider_instrument_mappings"("instrument_id");

CREATE INDEX "ingestion_runs_source_id_requested_at_idx" ON "ingestion_runs"("source_id", "requested_at");
CREATE INDEX "ingestion_runs_status_idx" ON "ingestion_runs"("status");

CREATE UNIQUE INDEX "raw_payloads_source_id_raw_hash_key" ON "raw_payloads"("source_id", "raw_hash");
CREATE INDEX "raw_payloads_source_id_received_at_idx" ON "raw_payloads"("source_id", "received_at");

CREATE UNIQUE INDEX "quote_snapshots_source_id_instrument_id_observed_at_raw_hash_key"
  ON "quote_snapshots"("source_id", "instrument_id", "observed_at", "raw_hash");
CREATE INDEX "quote_snapshots_instrument_id_observed_at_idx" ON "quote_snapshots"("instrument_id", "observed_at");
CREATE INDEX "quote_snapshots_source_id_observed_at_idx" ON "quote_snapshots"("source_id", "observed_at");

CREATE UNIQUE INDEX "normalized_quotes_snapshot_id_key" ON "normalized_quotes"("snapshot_id");
CREATE INDEX "normalized_quotes_instrument_id_observed_at_idx" ON "normalized_quotes"("instrument_id", "observed_at");
CREATE INDEX "normalized_quotes_source_id_observed_at_idx" ON "normalized_quotes"("source_id", "observed_at");

CREATE INDEX "discrepancy_alerts_instrument_id_status_opened_at_idx"
  ON "discrepancy_alerts"("instrument_id", "status", "opened_at");

CREATE INDEX "discrepancy_evidence_alert_id_idx" ON "discrepancy_evidence"("alert_id");
CREATE INDEX "discrepancy_evidence_normalized_quote_id_idx" ON "discrepancy_evidence"("normalized_quote_id");

CREATE INDEX "audit_events_alert_id_created_at_idx" ON "audit_events"("alert_id", "created_at");

ALTER TABLE "provider_instrument_mappings"
  ADD CONSTRAINT "provider_instrument_mappings_source_id_fkey"
  FOREIGN KEY ("source_id") REFERENCES "provider_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "provider_instrument_mappings"
  ADD CONSTRAINT "provider_instrument_mappings_instrument_id_fkey"
  FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ingestion_runs"
  ADD CONSTRAINT "ingestion_runs_source_id_fkey"
  FOREIGN KEY ("source_id") REFERENCES "provider_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "raw_payloads"
  ADD CONSTRAINT "raw_payloads_source_id_fkey"
  FOREIGN KEY ("source_id") REFERENCES "provider_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quote_snapshots"
  ADD CONSTRAINT "quote_snapshots_source_id_fkey"
  FOREIGN KEY ("source_id") REFERENCES "provider_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quote_snapshots"
  ADD CONSTRAINT "quote_snapshots_instrument_id_fkey"
  FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quote_snapshots"
  ADD CONSTRAINT "quote_snapshots_raw_payload_id_fkey"
  FOREIGN KEY ("raw_payload_id") REFERENCES "raw_payloads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "normalized_quotes"
  ADD CONSTRAINT "normalized_quotes_snapshot_id_fkey"
  FOREIGN KEY ("snapshot_id") REFERENCES "quote_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "normalized_quotes"
  ADD CONSTRAINT "normalized_quotes_source_id_fkey"
  FOREIGN KEY ("source_id") REFERENCES "provider_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "normalized_quotes"
  ADD CONSTRAINT "normalized_quotes_instrument_id_fkey"
  FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "discrepancy_alerts"
  ADD CONSTRAINT "discrepancy_alerts_instrument_id_fkey"
  FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "discrepancy_evidence"
  ADD CONSTRAINT "discrepancy_evidence_alert_id_fkey"
  FOREIGN KEY ("alert_id") REFERENCES "discrepancy_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "discrepancy_evidence"
  ADD CONSTRAINT "discrepancy_evidence_normalized_quote_id_fkey"
  FOREIGN KEY ("normalized_quote_id") REFERENCES "normalized_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "discrepancy_evidence"
  ADD CONSTRAINT "discrepancy_evidence_source_id_fkey"
  FOREIGN KEY ("source_id") REFERENCES "provider_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_events"
  ADD CONSTRAINT "audit_events_alert_id_fkey"
  FOREIGN KEY ("alert_id") REFERENCES "discrepancy_alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

