import { describe, expect, it } from 'vitest';
import { debugAddTaka, debugRewind, debugSetMeter, debugStartEvent } from '../src/sim/debug';
import { advance } from '../src/sim/tick';
import { totalIncome } from '../src/sim/economy';
import { T0, withBuildings } from './helpers';

describe('debug helpers', () => {
  it('time skip plays extra time without leaving future timestamps', () => {
    let s = withBuildings({ 0: { category: 'housing', tier: 2, level: 3 } });
    s = { ...s, lastSimTime: T0, posters: [T0 + 600_000] };
    const income = totalIncome(s);
    let x = s;
    // ten seconds of skip in 700 ms pieces, all at the same real "now"
    for (let skip = 10_000; skip > 0; skip -= 700) x = advance(debugRewind(x, Math.min(700, skip)), T0).state;
    expect(x.lastSimTime).toBeLessThanOrEqual(T0);
    expect(x.taka - s.taka).toBeCloseTo(income * 10, -1);
    // the poster campaign is ten seconds closer to its end
    expect(x.posters[0]).toBe(T0 + 590_000);
    expect(x.startedAt).toBe(s.startedAt - 10_000);
  });

  it('adds Taka without counting earnings, clamps meters, starts events', () => {
    const s = withBuildings({ 0: { category: 'housing', tier: 1, level: 1 } });
    const rich = debugAddTaka(s, 1e9);
    expect(rich.taka).toBe(s.taka + 1e9);
    expect(rich.lifetimeEarnings).toBe(s.lifetimeEarnings);
    expect(debugSetMeter(s, 'media', 250).heat.media).toBe(100);
    expect(debugSetMeter(s, 'influence', -5).influence).toBe(0);
    const ev = debugStartEvent(debugStartEvent(s, 'hartal'), 'monsoon');
    expect(ev.event?.id).toBe('monsoon');
    expect(ev.events.filter((e) => e.kind === 'eventStart')).toHaveLength(2);
  });
});
