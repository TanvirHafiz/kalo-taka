import { describe, expect, it } from 'vitest';
import { NAME_BLOCKLIST, NAME_WORDS } from '../src/config/strings';
import { decorVisible, toLetFloors } from '../src/render/buildings/housing';
import { buildingName } from '../src/util/names';

describe('signboard names', () => {
  it('is deterministic per seed', () => {
    expect(buildingName(123, 'housing')).toBe(buildingName(123, 'housing'));
  });

  it('uses only the word lists and never a blocklisted name', () => {
    for (let seed = 0; seed < 2000; seed++) {
      const name = buildingName(seed, 'housing');
      expect(NAME_BLOCKLIST).not.toContain(name.toLowerCase());
      const first = NAME_WORDS.housing.first.find((w) => name.startsWith(`${w} `));
      expect(first).toBeDefined();
      expect(NAME_WORDS.housing.second).toContain(name.slice(first!.length + 1));
    }
  });

  it('varies across seeds', () => {
    const names = new Set(Array.from({ length: 200 }, (_, i) => buildingName(i, 'housing')));
    expect(names.size).toBeGreaterThan(30);
  });
});

describe('level decor', () => {
  it('only grows as level rises: a visible slot stays visible', () => {
    for (let seed = 1; seed < 50; seed++) {
      for (let slot = 0; slot < 10; slot++) {
        let seen = false;
        for (let level = 1; level <= 10; level++) {
          const v = decorVisible(seed, 3, slot, level);
          if (seen) expect(v).toBe(true);
          seen ||= v;
        }
        expect(decorVisible(seed, 3, slot, 10)).toBe(true);
      }
    }
  });

  it('To-Let Bhaban has 6 floors plus 1 per 3 levels', () => {
    expect(toLetFloors(1)).toBe(6);
    expect(toLetFloors(3)).toBe(7);
    expect(toLetFloors(9)).toBe(9);
    expect(toLetFloors(10)).toBe(9);
  });
});
