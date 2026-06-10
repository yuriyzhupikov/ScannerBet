export type ProviderId = string;

export type FetchQuotesInput = {
  cursor?: string;
  requestedAt: Date;
  correlationId: string;
  sourceKey?: string;
};

export type RawQuoteItem = {
  instrumentKey: string;
  providerInstrumentKey?: string;
  quoteTimestamp: Date | string;
  numericValue: string;
  precision?: number;
  rawValue?: unknown;
};

export type QuoteBatch = {
  sourceId: string;
  sourceVersion?: string;
  nextCursor?: string;
  receivedAt: Date;
  rawHash: string;
  rawPayloadRef: string;
  items: RawQuoteItem[];
};

export interface QuoteProviderPort {
  readonly sourceId: ProviderId;
  fetchQuotes(input: FetchQuotesInput): Promise<QuoteBatch>;
}

