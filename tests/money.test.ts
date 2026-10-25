import { describe, expect, it } from 'vitest';
import { formatRate, formatTaka, groupIndian, suffixFor } from '../src/util/money';

describe('Indian grouping', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1,000'],
    [85400, '85,400'],
    [123456, '1,23,456'],
    [12345678, '1,23,45,678'],
  ])('%d -> %s', (n, s) => expect(groupIndian(n)).toBe(s));
});

describe('formatTaka', () => {
  it.each([
    [0, '৳0'],
    [85_400, '৳85,400'],
    [99_999.9, '৳99,999'],
    [100_000, '৳1.00 lakh'],
    [1_240_000, '৳12.40 lakh'],
    [9_999_999, '৳99.99 lakh'],
    [10_000_000, '৳1.00 crore'],
    [37_500_000, '৳3.75 crore'],
    [9_999_999_999, '৳999.99 crore'],
    [42_100_000_000, '৳4,210 crore'],
    [999_999_999_999, '৳99,999 crore'],
    [1e12, '৳1.00 lakh crore'],
    [2.1e12, '৳2.10 lakh crore'],
    [99.999e12, '৳99.99 lakh crore'],
    [1.2e14, '৳1.2 CrCr'],
    [999e14, '৳999.0 CrCr'],
    [1.2e17, '৳1.2 aa'],
    [1.2e20, '৳1.2 ab'],
    [1.2e23, '৳1.2 ac'],
  ])('%d -> %s', (n, s) => expect(formatTaka(n)).toBe(s));

  it('negatives keep the sign in front', () => {
    expect(formatTaka(-85_400)).toBe('-৳85,400');
    expect(formatTaka(-1_240_000)).toBe('-৳12.40 lakh');
  });

  it('non-finite values do not crash', () => {
    expect(formatTaka(Infinity)).toBe('৳a lot');
    expect(formatTaka(NaN)).toBe('৳0');
  });
});

describe('suffix chain', () => {
  it('runs aa..az then ba', () => {
    expect(suffixFor(0)).toBe('aa');
    expect(suffixFor(25)).toBe('az');
    expect(suffixFor(26)).toBe('ba');
  });
});

describe('formatRate', () => {
  it('shows one decimal for small fractional rates', () => {
    expect(formatRate(4.5)).toBe('৳4.5/s');
    expect(formatRate(5)).toBe('৳5/s');
    expect(formatRate(1_240_000)).toBe('৳12.40 lakh/s');
  });
});
