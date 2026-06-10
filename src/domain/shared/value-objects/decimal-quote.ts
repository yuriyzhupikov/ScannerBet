import Decimal from 'decimal.js';

import { DomainRuleViolation } from '../domain-rule-violation.error';

export class DecimalQuote {
  private constructor(private readonly decimal: Decimal) {}

  static from(input: string | number | Decimal): DecimalQuote {
    const decimal = new Decimal(input);

    if (!decimal.isFinite() || decimal.lte(0)) {
      throw new DomainRuleViolation('Quote numericValue must be greater than zero.');
    }

    return new DecimalQuote(decimal.toDecimalPlaces(8));
  }

  toDecimal(): Decimal {
    return this.decimal;
  }

  toString(): string {
    return this.decimal.toFixed(8);
  }
}

