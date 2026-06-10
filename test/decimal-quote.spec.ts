import { DecimalQuote } from '../src/domain/shared/value-objects/decimal-quote';

describe('DecimalQuote', () => {
  it('accepts positive decimal values and fixes precision', () => {
    expect(DecimalQuote.from('1.234567891').toString()).toBe('1.23456789');
  });

  it('rejects zero and negative values', () => {
    expect(() => DecimalQuote.from('0')).toThrow('greater than zero');
    expect(() => DecimalQuote.from('-1')).toThrow('greater than zero');
  });
});

