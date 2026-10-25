import { describe, expect, it } from 'vitest';
import { CORRUPTION } from '../src/config/balance';
import { applyAction, canEvict, evictRefund } from '../src/sim/actions';
import { tierDef, upgradeCost } from '../src/sim/economy';
import { createInitialState } from '../src/state/initialState';
import type { Building, GameState } from '../src/state/types';
import { T0 } from './helpers';

const H = (tier: number, level = 1): Building => ({ category: 'housing', tier, level });

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

describe('eviction drive', () => {
  it('frees the plot, refunds a share of what the building cost and raises heat', () => {
    const s = city({ 0: { category: 'food', tier: 1, level: 1 }, 1: H(2, 3), 2: { category: 'food', tier: 1, level: 1 } });
    const id = front(s, 1).index;
    const paid = tierDef('housing', 2)!.baseCost + upgradeCost(H(2, 1)) + upgradeCost(H(2, 2));
    expect(evictRefund(s, id)).toBe(Math.floor(paid * CORRUPTION.evictRefund));
    const r = applyAction(s, { type: 'evict', plot: id });
    expect(r.error).toBeUndefined();
    expect(front(r.state, 1).building).toBeNull();
    expect(front(r.state, 1).owned).toBe(true);
    expect(r.state.taka).toBe(s.taka + evictRefund(s, id));
    expect(r.state.heat.anger).toBeGreaterThan(s.heat.anger);
    expect(r.state.heat.media).toBeGreaterThan(s.heat.media);
    // the freed plot takes a new building at once
    expect(applyAction(r.state, { type: 'build', plot: id, category: 'housing' }).error).toBeUndefined();
  });

  it('angers tenants more when it is housing', () => {
    const s = city({ 0: H(1), 1: { category: 'food', tier: 1, level: 1 } });
    const h = applyAction(s, { type: 'evict', plot: front(s, 0).index }).state;
    const f = applyAction(s, { type: 'evict', plot: front(s, 1).index }).state;
    expect(h.heat.anger).toBeGreaterThan(f.heat.anger);
  });

  it('is blocked on empty plots, during permits, inquiries and the tutorial', () => {
    const s = city({ 0: H(1) });
    const id = front(s, 0).index;
    expect(canEvict(s, front(s, 3).index)).toBe('plotEmpty');
    const busy = { ...s, plots: s.plots.map((p) => (p.index === id ? { ...p, job: { kind: 'upgrade' as const, start: T0, until: T0 + 5000, levels: 1 } } : p)) };
    expect(canEvict(busy, id)).toBe('permitPending');
    expect(canEvict({ ...s, inquiry: { plot: id, until: T0 + 60_000 } }, id)).toBe('frozen');
    expect(canEvict({ ...s, tutorial: { step: 2, done: false } }, id)).toBe('tutorialRunning');
  });

  it('takes a cash bag on the building with it', () => {
    const s0 = city({ 0: H(1) });
    const id = front(s0, 0).index;
    const s = { ...s0, bag: { plot: id, kind: 'chanda' as const, until: T0 + 60_000 } };
    expect(applyAction(s, { type: 'evict', plot: id }).state.bag).toBeNull();
  });
});
