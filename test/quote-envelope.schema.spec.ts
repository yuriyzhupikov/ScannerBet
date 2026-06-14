import { parseQuoteEnvelope } from '../src/infrastructure/sources/schemas/quote-envelope.schema';

describe('parseQuoteEnvelope', () => {
  it('accepts a valid quote-envelope.v1 payload', () => {
    const envelope = parseQuoteEnvelope({
      schemaVersion: 'quote-envelope.v1',
      sourceKey: 'partner_a',
      cursor: '2026-06-10T12:00:05.000Z',
      items: [
        {
          externalId: 'q_1',
          instrument: {
            externalId: 'inst_1',
            name: 'Sample instrument',
            startsAt: '2026-06-10T13:00:00.000Z',
          },
          dimension: 'primary_metric',
          label: 'option_a',
          numericValue: '1.23450000',
          observedAt: '2026-06-10T12:00:03.000Z',
          metadata: { region: 'eu' },
        },
      ],
    });

    expect(envelope.items).toHaveLength(1);
  });

  it('rejects unknown top-level fields', () => {
    expect(() =>
      parseQuoteEnvelope({
        schemaVersion: 'quote-envelope.v1',
        sourceKey: 'partner_a',
        unexpected: true,
        items: [],
      }),
    ).toThrow('Unknown top-level');
  });

  it('rejects invalid decimal values', () => {
    expect(() =>
      parseQuoteEnvelope({
        schemaVersion: 'quote-envelope.v1',
        sourceKey: 'partner_a',
        items: [
          {
            externalId: 'q_1',
            instrument: { externalId: 'inst_1', name: 'Sample instrument' },
            dimension: 'primary_metric',
            label: 'option_a',
            numericValue: '-1.2',
            observedAt: '2026-06-10T12:00:03.000Z',
          },
        ],
      }),
    ).toThrow('numericValue');
  });
});

