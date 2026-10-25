import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';

import { buildingIncome, plotCost, totalIncome, upgradeCost, upgradeCostN } from '../src/sim/economy';
import { act, fresh, tin, withBuildings } from './helpers';

describe('income', () => {
  it('level 1 tin shed earns baseIncome x occupancy', () => {
    const s = withBuildings({ 0: tin(1) });
    expect(buildingIncome(s, tin(1))).toBeCloseTo(5 * 0.9);
  });

  it('each level adds 25% of base', () => {
    const s = fresh();
    expect(buildingIncome(s, tin(5))).toBeCloseTo(5 * 2 * 0.9);
    expect(buildingIncome(s, tin(10))).toBeCloseTo(5 * 3.25 * 0.9);
  });

  it('higher tiers use their own baseIncome', () => {
    const s = fresh();
    expect(buildingIncome(s, { category: 'housing', tier: 3, level: 1 })).toBeCloseTo(60 * 0.9);
  });

  it('totalIncome sums buildings', () => {
    const s = withBuildings({ 0: tin(1), 1: tin(5) });
    expect(totalIncome(s)).toBeCloseTo(5 * 0.9 + 10 * 0.9);
  });

  it('empty city earns nothing', () => {
    expect(totalIncome(fresh())).toBe(0);
  });
});

describe('cost curves', () => {
  it('upgradeCost = baseCost * 1.18^level, rounded up to whole Taka', () => {
    expect(upgradeCost(tin(1))).toBe(Math.ceil(2000 * 1.18));
    expect(upgradeCost(tin(9))).toBe(Math.ceil(2000 * 1.18 ** 9));
    expect(upgradeCost({ category: 'housing', tier: 2, level: 3 })).toBe(Math.ceil(8000 * 1.18 ** 3));
    expect(Number.isInteger(upgradeCost(tin(7)))).toBe(true);
  });

  it('upgradeCostN sums consecutive levels', () => {
    expect(upgradeCostN(tin(1), 3)).toBe(upgradeCost(tin(1)) + upgradeCost(tin(2)) + upgradeCost(tin(3)));
  });

  it('plotCost = 20000 * 1.35^plotsOwned, starting plot counts', () => {
    const s = fresh();
    expect(plotCost(s)).toBe(Math.ceil(20000 * 1.35));
    const after = act({ ...s, taka: 1e9 }, { type: 'buyPlot', plot: 1 }).state;
    expect(plotCost(after)).toBe(Math.ceil(20000 * 1.35 ** 2));
  });
});

describe('actions', () => {
  it('starts with the configured Taka and one owned plot', () => {
    const s = fresh();
    expect(s.taka).toBe(BALANCE.startingTaka);
    expect(s.plots.filter((p) => p.owned)).toHaveLength(1);
  });

  it('build charges baseCost and places a level 1 building', () => {
    const r = act(fresh(), { type: 'build', plot: 0, category: 'housing' });
    expect(r.error).toBeUndefined();
    expect(r.state.taka).toBe(50_000 - 2000);
    expect(r.state.plots[0]!.building).toEqual(tin(1));
  });

  it('cannot build on an unowned or occupied plot', () => {
    expect(act(fresh(), { type: 'build', plot: 1, category: 'housing' }).error).toBe('plotNotOwned');
    const s = withBuildings({ 0: tin(1) });
    expect(act(s, { type: 'build', plot: 0, category: 'housing' }).error).toBe('plotOccupied');
  });

  it('cannot build a category that is not open yet', () => {
    expect(act(fresh(), { type: 'build', plot: 0, category: 'food' }).error).toBe('notBuildable');
  });

  it('upgrade charges the current level cost and stops at 10', () => {
    const s = withBuildings({ 0: tin(3) }, 100_000);
    const r = act(s, { type: 'upgrade', plot: 0 });
    expect(r.state.plots[0]!.building!.level).toBe(4);
    expect(r.state.taka).toBe(100_000 - Math.ceil(2000 * 1.18 ** 3));
    expect(act(withBuildings({ 0: tin(10) }), { type: 'upgrade', plot: 0 }).error).toBe('maxLevel');
  });

  it('refuses when Taka is short and leaves state untouched', () => {
    const s = withBuildings({ 0: tin(1) }, 10);
    const r = act(s, { type: 'upgrade', plot: 0 });
    expect(r.error).toBe('notEnoughTaka');
    expect(r.state).toBe(s);
  });

  it('buying an owned plot is refused', () => {
    expect(act(fresh(), { type: 'buyPlot', plot: 0 }).error).toBe('plotAlreadyOwned');
  });

  it('applyAction does not mutate its input', () => {
    const s = fresh();
    const snapshot = JSON.stringify(s);
    act(s, { type: 'build', plot: 0, category: 'housing' });
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
