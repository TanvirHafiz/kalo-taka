import { describe, expect, it } from 'vitest';
import { formatTaka, setNumberMode } from '../src/util/money';
import { DEFAULT_SETTINGS, parseSettings } from '../src/util/settings';

describe('settings', () => {
  it('falls back to defaults for missing or malformed values', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('not json')).toEqual(DEFAULT_SETTINGS);
    const s = parseSettings(JSON.stringify({ master: 3, sfx: -1, motion: 'reduce', numbers: 'short', ticker: 9, music: 0.2 }));
    expect(s.master).toBe(1);
    expect(s.sfx).toBe(0);
    expect(s.music).toBe(0.2);
    expect(s.motion).toBe('reduce');
    expect(s.numbers).toBe('short');
    expect(s.ticker).toBe(DEFAULT_SETTINGS.ticker);
  });
});

describe('short number format', () => {
  it('uses K, M, B, T and then scientific; truncates like the default format', () => {
    setNumberMode('short');
    try {
      expect(formatTaka(950)).toBe('৳950');
      expect(formatTaka(12_345)).toBe('৳12.34K');
      expect(formatTaka(4_999_999)).toBe('৳4.99M');
      expect(formatTaka(2.5e9)).toBe('৳2.50B');
      expect(formatTaka(7e12)).toBe('৳7.00T');
      expect(formatTaka(1.234e18)).toBe('৳1.23e18');
      expect(formatTaka(-12_345)).toBe('-৳12.34K');
    } finally {
      setNumberMode('bd');
    }
    expect(formatTaka(12_40_000)).toBe('৳12.40 lakh');
  });
});
