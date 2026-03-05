import {
  formatPrice,
  formatPercent,
  formatLargeNumber,
  capitalize,
  truncate,
} from '../lib/utils';

describe('formatPrice', () => {
  it('formats a number as USD currency', () => {
    expect(formatPrice(195.5)).toBe('$195.50');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('formats large prices', () => {
    expect(formatPrice(1234.56)).toBe('$1,234.56');
  });
});

describe('formatPercent', () => {
  it('formats positive with sign', () => {
    expect(formatPercent(1.5)).toBe('+1.50%');
  });

  it('formats negative with sign', () => {
    expect(formatPercent(-2.3)).toBe('-2.30%');
  });

  it('formats without sign when requested', () => {
    expect(formatPercent(1.5, false)).toBe('1.50%');
  });

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('+0.00%');
  });
});

describe('formatLargeNumber', () => {
  it('formats trillions', () => {
    expect(formatLargeNumber(1.5e12)).toBe('1.50T');
  });

  it('formats billions', () => {
    expect(formatLargeNumber(2.3e9)).toBe('2.30B');
  });

  it('formats millions', () => {
    expect(formatLargeNumber(5.67e6)).toBe('5.67M');
  });

  it('formats thousands', () => {
    expect(formatLargeNumber(1234)).toBe('1.23K');
  });

  it('formats small numbers', () => {
    expect(formatLargeNumber(42)).toBe('42.00');
  });
});

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('lowercases rest', () => {
    expect(capitalize('HELLO')).toBe('Hello');
  });
});

describe('truncate', () => {
  it('does not truncate short strings', () => {
    expect(truncate('abc', 10)).toBe('abc');
  });

  it('truncates long strings with ellipsis', () => {
    expect(truncate('abcdefghij', 7)).toBe('abcd...');
  });
});
