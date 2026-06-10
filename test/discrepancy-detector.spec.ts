import { DiscrepancyDetector } from '../src/domain/detection/discrepancy-detector.service';

describe('DiscrepancyDetector', () => {
  const detector = new DiscrepancyDetector();

  it('requires at least two sources', () => {
    const result = detector.detect(
      [
        {
          id: 'quote-1',
          sourceId: 'source-a',
          numericValue: '100.00000000',
          observedAt: new Date('2026-06-10T12:00:00.000Z'),
        },
      ],
      { ruleKey: 'default', thresholdBps: 50, windowSeconds: 120 },
    );

    expect(result.hasAlert).toBe(false);
  });

  it('opens an alert when the basis-point difference crosses the threshold', () => {
    const result = detector.detect(
      [
        {
          id: 'quote-1',
          sourceId: 'source-a',
          numericValue: '100.00000000',
          observedAt: new Date('2026-06-10T12:00:00.000Z'),
        },
        {
          id: 'quote-2',
          sourceId: 'source-b',
          numericValue: '102.00000000',
          observedAt: new Date('2026-06-10T12:00:01.000Z'),
        },
      ],
      { ruleKey: 'default', thresholdBps: 50, windowSeconds: 120 },
    );

    expect(result.hasAlert).toBe(true);
    if (result.hasAlert) {
      expect(Number(result.differenceBps)).toBeGreaterThan(50);
      expect(result.evidence).toHaveLength(2);
    }
  });

  it('uses the latest quote per source', () => {
    const result = detector.detect(
      [
        {
          id: 'old',
          sourceId: 'source-a',
          numericValue: '90.00000000',
          observedAt: new Date('2026-06-10T11:59:00.000Z'),
        },
        {
          id: 'latest',
          sourceId: 'source-a',
          numericValue: '100.00000000',
          observedAt: new Date('2026-06-10T12:00:00.000Z'),
        },
        {
          id: 'quote-2',
          sourceId: 'source-b',
          numericValue: '100.10000000',
          observedAt: new Date('2026-06-10T12:00:01.000Z'),
        },
      ],
      { ruleKey: 'default', thresholdBps: 50, windowSeconds: 120 },
    );

    expect(result.hasAlert).toBe(false);
  });
});

