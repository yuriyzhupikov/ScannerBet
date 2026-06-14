import { SpreadDetectorService } from '../src/domain/signal/spread-detector.service';

describe('SpreadDetectorService', () => {
  const detector = new SpreadDetectorService();

  it('detects relative spread anomalies for the same canonical key', () => {
    const result = detector.detect(
      [
        {
          id: 'quote-a',
          sourceKey: 'source_a',
          instrumentKey: 'sample',
          dimensionKey: 'primary',
          labelKey: 'a',
          numericValue: '100.00000000',
          observedAt: new Date('2026-06-10T12:00:00.000Z'),
        },
        {
          id: 'quote-b',
          sourceKey: 'source_b',
          instrumentKey: 'sample',
          dimensionKey: 'primary',
          labelKey: 'a',
          numericValue: '104.00000000',
          observedAt: new Date('2026-06-10T12:00:01.000Z'),
        },
      ],
      '0.035',
    );

    expect(result).toHaveLength(1);
    expect(result[0].minQuoteId).toBe('quote-a');
    expect(result[0].maxQuoteId).toBe('quote-b');
  });

  it('requires at least two sources', () => {
    const result = detector.detect(
      [
        {
          id: 'quote-a',
          sourceKey: 'source_a',
          instrumentKey: 'sample',
          dimensionKey: 'primary',
          labelKey: 'a',
          numericValue: '100.00000000',
          observedAt: new Date('2026-06-10T12:00:00.000Z'),
        },
        {
          id: 'quote-b',
          sourceKey: 'source_a',
          instrumentKey: 'sample',
          dimensionKey: 'primary',
          labelKey: 'a',
          numericValue: '104.00000000',
          observedAt: new Date('2026-06-10T12:00:01.000Z'),
        },
      ],
      '0.035',
    );

    expect(result).toHaveLength(0);
  });
});

