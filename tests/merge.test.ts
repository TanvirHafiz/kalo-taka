import { MONEY_SCALE as S } from '../src/config/balance';
import { describe, expect, it } from 'vitest';

import { mergeBlocker, mergeFee, mergePartners } from '../src/sim/merge';
import { act, tin, withBuildings } from './helpers';

describe('merge rules', () => {
  it('two adjacent maxed same-tier buildings merge into next tier level 1 on the left plot', () => {
    const s = withBuildings({ 3: tin(10), 4: tin(10) });
    const r = act(s, { type: 'merge', a: 4, b: 3 });
    expect(r.error).toBeUndefined();
    expect(r.state.plots[3]!.building).toEqual({ category: 'housing', tier: 2, level: 1 });
    expect(r.state.plots[4]!.building).toBeNull();
    expect(r.state.plots[4]!.owned).toBe(true);
  });

  it('fee is 2x the target tier baseCost', () => {
    expect(mergeFee(tin(10))).toBe(2 * 8000 * S);
    const s = withBuildings({ 0: tin(10), 1: tin(10) }, 100_000 * S);
    expect(act(s, { type: 'merge', a: 0, b: 1 }).state.taka).toBe(100_000 * S - 16_000 * S);
  });

  it('freed right plot keeps its grabbed flag', () => {
    const base = withBuildings({ 0: tin(10), 1: tin(10) });
    const s = { ...base, plots: base.plots.map((p) => (p.index === 1 ? { ...p, grabbed: true } : p)) };
    const r = act(s, { type: 'merge', a: 0, b: 1 });
    expect(r.state.plots[1]!.grabbed).toBe(true);
    expect(r.state.plots[0]!.grabbed).toBe(false);
  });

  it('requires adjacency', () => {
    const s = withBuildings({ 0: tin(10), 2: tin(10) });
    expect(mergeBlocker(s, 0, 2)).toBe('notAdjacent');
  });

  it('requires both at level 10', () => {
    expect(mergeBlocker(withBuildings({ 0: tin(10), 1: tin(9) }), 0, 1)).toBe('notMaxed');
  });

  it('requires same tier', () => {
    const s = withBuildings({ 0: tin(10), 1: { category: 'housing', tier: 2, level: 10 } });
    expect(mergeBlocker(s, 0, 1)).toBe('differentType');
  });

  it('requires same category', () => {
    const s = withBuildings({ 0: tin(10), 1: { category: 'food', tier: 1, level: 10 } });
    expect(mergeBlocker(s, 0, 1)).toBe('differentType');
  });

  it('requires two buildings', () => {
    expect(mergeBlocker(withBuildings({ 0: tin(10) }), 0, 1)).toBe('plotEmpty');
  });

  it('cannot merge the top tier', () => {
    const top = { category: 'housing' as const, tier: 7, level: 10 };
    expect(mergeBlocker(withBuildings({ 0: top, 1: top }), 0, 1)).toBe('maxTier');
  });

  it('tier 3 merges into tier 4', () => {
    const t3 = { category: 'housing' as const, tier: 3, level: 10 };
    const r = act(withBuildings({ 0: t3, 1: t3 }), { type: 'merge', a: 0, b: 1 });
    expect(r.state.plots[0]!.building!.tier).toBe(4);
  });

  it('refuses when the fee is not affordable', () => {
    const s = withBuildings({ 0: tin(10), 1: tin(10) }, 1000);
    expect(act(s, { type: 'merge', a: 0, b: 1 }).error).toBe('notEnoughTaka');
  });

  it('rows must match', () => {
    const base = withBuildings({ 0: tin(10), 1: tin(10) });
    const s = { ...base, plots: base.plots.map((p) => (p.index === 1 ? { ...p, row: 'back' as const } : p)) };
    expect(mergeBlocker(s, 0, 1)).toBe('notAdjacent');
  });

  it('mergePartners lists valid neighbours on both sides', () => {
    const s = withBuildings({ 0: tin(10), 1: tin(10), 2: tin(10) });
    expect(mergePartners(s, 1)).toEqual([0, 2]);
    expect(mergePartners(s, 0)).toEqual([1]);
  });
});
