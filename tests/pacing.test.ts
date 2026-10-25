import { describe, expect, it } from 'vitest';
import { runBot } from './balance/bot';

// Guard for the M6 balance pass: a greedy player reacting every 5 s should hit the spec's early
// pacing within 20%. The full 4-hour report is `npm run balance`.
describe('pacing', () => {
  it('second merge near 4 min and the clinic near 15 min', () => {
    const { milestones: m } = runBot({ seed: 11, hours: 0.5, decideEvery: 5 });
    expect(m.secondMerge).toBeDefined();
    // not instant either: permits and prices still take a couple of minutes
    expect(m.secondMerge!).toBeGreaterThanOrEqual(120);
    expect(m.secondMerge!).toBeLessThanOrEqual(4 * 60 * 1.2);
    expect(m.clinic).toBeDefined();
    expect(m.clinic!).toBeGreaterThanOrEqual(15 * 60 * 0.8);
    expect(m.clinic!).toBeLessThanOrEqual(15 * 60 * 1.2);
  });

  it('a Specialized Hospital within the first hour (target 60 min, -25% to +20%)', () => {
    const { milestones: m } = runBot({ seed: 11, hours: 1.25, decideEvery: 5 });
    expect(m.hospital).toBeDefined();
    expect(m.hospital!).toBeGreaterThanOrEqual(60 * 60 * 0.75);
    expect(m.hospital!).toBeLessThanOrEqual(60 * 60 * 1.2);
  });
});
