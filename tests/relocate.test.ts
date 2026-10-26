import { describe, expect, it } from 'vitest';
import { CORRUPTION } from '../src/config/balance';
import { applyAction, canRelocate, relocateCost } from '../src/sim/actions';
import { tick } from '../src/sim/tick';
import { createInitialState } from '../src/state/initialState';
import type { Building, GameState } from '../src/state/types';
import { T0 } from './helpers';

const H = (tier: number, level = 1): Building => ({ category: 'housing', tier, level });
const F = (tier: number, level = 1): Building => ({ category: 'food', tier, level });

function city(buildings: Record<number, Building>, taka = 1e14): GameState {
  const s = { ...createInitialState(9, T0), tutorial: { step: 7, done: true } };
  return {
    ...s,
    taka,
    unlocked: ['housing', 'food', 'healthcare', 'retail'],
    plots: s.plots.map((p) => (buildings[p.slot] ? { ...p, owned: true, building: buildings[p.slot]! } : p.slot < 11 ? { ...p, owned: true } : p)),
  };
}
const front = (s: GameState, slot: number) => s.plots.find((p) => p.slot === slot && p.row === 'front' && p.district === 0)!;
const at = (s: GameState, ms: number) => tick(s, (ms - s.lastSimTime) / 1000, ms);

describe('relocation permit', () => {
  it('moves a building to an empty plot you own once the permit clears', () => {
    let s = city({ 0: H(2, 6) });
    const from = front(s, 0).index, to = front(s, 4).index;
    const cost = relocateCost(s, from, to);
    const r = applyAction(s, { type: 'relocate', from, to });
    expect(r.error).toBeUndefined();
    s = r.state;
    expect(s.taka).toBe(1e14 - cost);
    expect(s.heat.committee).toBeGreaterThan(0);
    // both plots locked, the building still where it was
    expect(front(s, 0).building).toEqual(H(2, 6));
    expect(applyAction(s, { type: 'upgrade', plot: from }).error).toBe('permitPending');
    expect(applyAction(s, { type: 'build', plot: to, category: 'housing' }).error).toBe('permitPending');
    s = at(s, T0 + CORRUPTION.permitRelocate * 1000);
    expect(front(s, 0).building).toBeNull();
    expect(front(s, 4).building).toMatchObject(H(2, 6));
    // it keeps the look it had on its old plot
    expect(front(s, 4).building!.look).toBe(from);
    expect(front(s, 0).job).toBeNull();
    expect(front(s, 4).job).toBeNull();
    expect(s.events.some((e) => e.kind === 'moved')).toBe(true);
  });

  it('swaps two buildings, charging for both', () => {
    let s = city({ 0: H(3, 10), 3: F(1, 2) });
    const a = front(s, 0).index, b = front(s, 3).index;
    expect(relocateCost(s, a, b)).toBeGreaterThan(relocateCost(s, a, front(s, 5).index));
    s = applyAction(s, { type: 'relocate', from: a, to: b }).state;
    s = at(s, T0 + CORRUPTION.permitRelocate * 1000);
    expect(front(s, 0).building).toMatchObject(F(1, 2));
    expect(front(s, 3).building).toMatchObject({ ...H(3, 10), look: a });
  });

  it('speed money on either plot finishes the move', () => {
    let s = city({ 0: H(2, 3) });
    const from = front(s, 0).index, to = front(s, 2).index;
    s = applyAction(s, { type: 'relocate', from, to }).state;
    expect(applyAction(s, { type: 'speedMoney', plot: to }).error).toBe('noPermit');
    s = applyAction(s, { type: 'speedMoney', plot: from }).state;
    expect(front(s, 2).building).toMatchObject(H(2, 3));
  });

  it('is refused for the same plot, unowned plots, frozen buildings and the tutorial', () => {
    const s = city({ 0: H(1) });
    const from = front(s, 0).index;
    expect(canRelocate(s, from, from)).toBe('samePlot');
    expect(canRelocate(s, from, front(s, 11).index)).toBe('plotNotOwned');
    expect(canRelocate(s, front(s, 5).index, from)).toBe('plotEmpty');
    expect(canRelocate({ ...s, inquiry: { plot: from, until: T0 + 60_000 } }, from, front(s, 2).index)).toBe('frozen');
    expect(canRelocate({ ...s, tutorial: { step: 3, done: false } }, from, front(s, 2).index)).toBe('tutorialRunning');
    expect(canRelocate({ ...s, taka: 0 }, from, front(s, 2).index)).toBe('notEnoughTaka');
  });

  it('a cash bag on a moving building goes with the move', () => {
    let s = city({ 0: H(2, 3) });
    const from = front(s, 0).index, to = front(s, 2).index;
    s = { ...s, bag: { plot: from, kind: 'bhara', at: T0 } };
    s = applyAction(s, { type: 'relocate', from, to }).state;
    s = at(s, T0 + CORRUPTION.permitRelocate * 1000);
    expect(s.bag?.plot === from).toBe(false);
  });
});
