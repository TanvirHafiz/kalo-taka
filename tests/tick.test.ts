import { describe, expect, it } from 'vitest';
import { totalIncome } from '../src/sim/economy';
import { advance, catchUp, tick } from '../src/sim/tick';
import type { GameState } from '../src/state/types';
import { T0, tin, withBuildings } from './helpers';

function runAtFps(start: GameState, fps: number, seconds: number): GameState {
  let s = start;
  const frameMs = 1000 / fps;
  for (let t = frameMs; t <= seconds * 1000 + 1e-6; t += frameMs) s = advance(s, T0 + t).state;
  return s;
}

describe('tick', () => {
  it('adds income * dt to taka and lifetime earnings', () => {
    const s = withBuildings({ 0: tin(1) }, 0);
    const n = tick(s, 0.25, T0 + 250);
    expect(n.taka).toBeCloseTo(totalIncome(s) * 0.25);
    expect(n.lifetimeEarnings).toBeCloseTo(totalIncome(s) * 0.25);
    expect(n.lastSimTime).toBe(T0 + 250);
  });

  it('income is identical at 30 and 144 fps', () => {
    const s = withBuildings({ 0: tin(1), 1: tin(7) }, 0);
    const a = runAtFps(s, 30, 60);
    const b = runAtFps(s, 144, 60);
    expect(a.taka).toBeCloseTo(b.taka, 6);
    expect(a.taka).toBeCloseTo(totalIncome(s) * 60, 6);
  });

  it('only whole 250 ms ticks are applied', () => {
    const s = withBuildings({ 0: tin(1) }, 0);
    const r = advance(s, T0 + 600);
    expect(r.state.lastSimTime).toBe(T0 + 500);
    expect(r.state.taka).toBeCloseTo(totalIncome(s) * 0.5);
  });
});

describe('hidden-tab catch-up', () => {
  it('a long gap is applied in one step at full rate and reported', () => {
    const s = withBuildings({ 0: tin(1) }, 0);
    const r = advance(s, T0 + 10 * 60_000);
    expect(r.caughtUpMs).toBe(10 * 60_000);
    expect(r.caughtUp).toBeCloseTo(totalIncome(s) * 600);
    expect(r.state.lastSimTime).toBe(T0 + 10 * 60_000);
  });

  it('catch-up equals ticking the same span', () => {
    const s = withBuildings({ 0: tin(4) }, 0);
    const big = catchUp(s, T0 + 30_000).state;
    const small = runAtFps(s, 60, 30);
    expect(big.taka).toBeCloseTo(small.taka, 6);
  });

  it('a clock moving backwards does not pay or crash', () => {
    const s = withBuildings({ 0: tin(1) }, 0);
    const r = advance(s, T0 - 5000);
    expect(r.state.taka).toBe(0);
    expect(r.state.lastSimTime).toBe(T0 - 5000);
  });
});
