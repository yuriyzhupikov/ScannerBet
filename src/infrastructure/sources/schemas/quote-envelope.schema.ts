import { BadRequestException } from '@nestjs/common';

const decimalString = /^\d+(\.\d{1,8})?$/;

export type RawQuoteEnvelopeItem = {
  externalId: string;
  instrument: {
    externalId: string;
    name: string;
    startsAt?: string;
  };
  dimension: string;
  label: string;
  numericValue: string;
  observedAt: string;
  metadata?: Record<string, unknown>;
};

export type RawQuoteEnvelope = {
  schemaVersion: 'quote-envelope.v1';
  sourceKey: string;
  cursor?: string;
  items: RawQuoteEnvelopeItem[];
};

export function parseQuoteEnvelope(input: unknown): RawQuoteEnvelope {
  if (!isRecord(input)) {
    throw new BadRequestException('Envelope must be an object.');
  }

  const allowedTopLevel = new Set(['schemaVersion', 'sourceKey', 'cursor', 'items']);
  for (const key of Object.keys(input)) {
    if (!allowedTopLevel.has(key)) {
      throw new BadRequestException(`Unknown top-level envelope field: ${key}.`);
    }
  }

  if (input.schemaVersion !== 'quote-envelope.v1') {
    throw new BadRequestException('schemaVersion must equal quote-envelope.v1.');
  }

  const sourceKey = readString(input.sourceKey, 'sourceKey', 1, 100);
  const cursor = input.cursor === undefined ? undefined : readDateTime(input.cursor, 'cursor');
  if (!Array.isArray(input.items) || input.items.length > 5000) {
    throw new BadRequestException('items must be an array with at most 5000 records.');
  }

  return {
    schemaVersion: 'quote-envelope.v1',
    sourceKey,
    cursor,
    items: input.items.map((item, index) => parseItem(item, index)),
  };
}

function parseItem(input: unknown, index: number): RawQuoteEnvelopeItem {
  if (!isRecord(input)) {
    throw new BadRequestException(`items[${index}] must be an object.`);
  }

  const allowedItem = new Set(['externalId', 'instrument', 'dimension', 'label', 'numericValue', 'observedAt', 'metadata']);
  for (const key of Object.keys(input)) {
    if (!allowedItem.has(key)) {
      throw new BadRequestException(`Unknown item field at items[${index}].${key}.`);
    }
  }

  if (!isRecord(input.instrument)) {
    throw new BadRequestException(`items[${index}].instrument must be an object.`);
  }

  const allowedInstrument = new Set(['externalId', 'name', 'startsAt']);
  for (const key of Object.keys(input.instrument)) {
    if (!allowedInstrument.has(key)) {
      throw new BadRequestException(`Unknown instrument field at items[${index}].instrument.${key}.`);
    }
  }

  const observedAt = readDateTime(input.observedAt, `items[${index}].observedAt`);
  const startsAt =
    input.instrument.startsAt === undefined ? undefined : readDateTime(input.instrument.startsAt, `items[${index}].instrument.startsAt`);
  const numericValue = readString(input.numericValue, `items[${index}].numericValue`, 1, 80);
  if (!decimalString.test(numericValue)) {
    throw new BadRequestException(`items[${index}].numericValue must be a positive decimal string with max 8 decimals.`);
  }

  if (input.metadata !== undefined && !isRecord(input.metadata)) {
    throw new BadRequestException(`items[${index}].metadata must be an object.`);
  }

  return {
    externalId: readString(input.externalId, `items[${index}].externalId`, 1, 200),
    instrument: {
      externalId: readString(input.instrument.externalId, `items[${index}].instrument.externalId`, 1, 200),
      name: readString(input.instrument.name, `items[${index}].instrument.name`, 1, 500),
      startsAt,
    },
    dimension: readString(input.dimension, `items[${index}].dimension`, 1, 100),
    label: readString(input.label, `items[${index}].label`, 1, 100),
    numericValue,
    observedAt,
    metadata: input.metadata,
  };
}

function readString(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string' || value.length < min || value.length > max) {
    throw new BadRequestException(`${field} must be a string with length ${min}-${max}.`);
  }
  return value;
}

function readDateTime(value: unknown, field: string): string {
  const text = readString(value, field, 1, 80);
  if (!Number.isFinite(Date.parse(text))) {
    throw new BadRequestException(`${field} must be a valid datetime.`);
  }
  return text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

