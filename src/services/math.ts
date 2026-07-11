import Decimal from 'decimal.js';

export class MathUtils {
  static toDecimal(val: number | string | Decimal): Decimal {
    return new Decimal(val);
  }

  static safeAdd(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a).add(new Decimal(b));
  }

  static safeSubtract(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a).sub(new Decimal(b));
  }

  static safeMultiply(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a).mul(new Decimal(b));
  }

  static safeDivide(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a).div(new Decimal(b));
  }

  /**
   * Round to 2 decimal places (financial precision) using standard round half-up
   */
  static roundFinancial(val: number | string | Decimal): Decimal {
    return new Decimal(val).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }
}
