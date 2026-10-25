import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { DISTRICTS } from '../src/config/buildings';
import { NAME_BLOCKLIST } from '../src/config/strings';
import { upgradePlan } from '../src/sim/actions';
import { buildingIncome, neighbourBonus, plotIncome, totalIncome, upgradeCost } from '../src/sim/economy';
import { districtCount, hasBackRow, neighbours } from '../src/sim/layout';
import { mergeBlocker } from '../src/sim/merge';
import { growWorld, updatePickups } from '../src/sim/progress';
import { catchUp, tick } from '../src/sim/tick';
import { createInitialState, districtRow } from '../src/state/initialState';
import { migrate } from '../src/state/migrate';
import type { Building, GameState } from '../src/state/types';
import { buildingName } from '../src/util/names';
import { T0, act } from './helpers';

const b = (category: Building['category'], tier: number, level = 1): Building => ({ category, tier, level });

function world(districts = 1, back = false): GameState {
  let s = createInitialState(7, T0);
  for (let d = 1; d < districts; d++) s = { ...s, plots: [...s.plots, ...districtRow(s.plots, d, 'front')] };
  if (back) for (let d = 0; d < districts; d++) s = { ...s, plots: [...s.plots, ...districtRow(s.plots, d, 'back')] };
  return { ...s, taka: 1e15, unlocked: ['housing', 'food', 'healthcare', 'retail'] };
}

/** Place buildings by (district, row, slot). Returns the state and a lookup of plot ids. */
function place(s: GameState, items: [number, 'front' | 'back', number, Building | null][]): GameState {
  const plots = s.plots.map((p) => {
    const hit = items.find(([d, r, sl]) => p.district === d && p.row === r && p.slot === sl);
    return hit ? { ...p, owned: true, building: hit[3] } : p;
  });
  return { ...s, plots };
}

const id = (s: GameState, d: number, r: 'front' | 'back', slot: number) => s.plots.find((p) => p.district === d && p.row === r && p.slot === slot)!.index;

describe('neighbour bonuses', () => {
  it('food next to healthcare gets +20%, per neighbour', () => {
    let s = place(world(), [[0, 'front', 1, b('food', 1)], [0, 'front', 0, b('healthcare', 1)]]);
    expect(neighbourBonus(s, id(s, 0, 'front', 1))).toBeCloseTo(0.2);
    s = place(s, [[0, 'front', 2, b('healthcare', 2)]]);
    expect(neighbourBonus(s, id(s, 0, 'front', 1))).toBeCloseTo(0.4);
  });

  it('pharmacy next to a diagnostic centre: +30% and -10% = +20%', () => {
    const s = place(world(), [[0, 'front', 3, b('healthcare', 1)], [0, 'front', 4, b('healthcare', 3)]]);
    expect(neighbourBonus(s, id(s, 0, 'front', 3))).toBeCloseTo(0.2);
    // and the diagnostic centre only gets the -10% for its healthcare neighbour
    expect(neighbourBonus(s, id(s, 0, 'front', 4))).toBeCloseTo(-0.1);
  });

  it('housing next to retail tier 3+ gets +10%, not next to lower retail', () => {
    let s = place(world(), [[0, 'front', 5, b('housing', 2)], [0, 'front', 6, b('retail', 3)]]);
    expect(neighbourBonus(s, id(s, 0, 'front', 5))).toBeCloseTo(0.1);
    s = place(s, [[0, 'front', 6, b('retail', 2)]]);
    expect(neighbourBonus(s, id(s, 0, 'front', 5))).toBe(0);
  });

  it('bonus multiplies plot income', () => {
    const s = place(world(), [[0, 'front', 1, b('food', 1)], [0, 'front', 0, b('healthcare', 1)]]);
    const food = id(s, 0, 'front', 1);
    expect(plotIncome(s, food)).toBeCloseTo(buildingIncome(s, b('food', 1)) * 1.2);
  });
});

describe('layout', () => {
  it('plots across a district gate are not neighbours and cannot merge', () => {
    const s = place(world(2), [[0, 'front', 11, b('housing', 1, 10)], [1, 'front', 0, b('housing', 1, 10)]]);
    const a = id(s, 0, 'front', 11), c = id(s, 1, 'front', 0);
    expect(neighbours(s, a)).not.toContain(c);
    expect(mergeBlocker(s, a, c)).toBe('notAdjacent');
  });

  it('front and back rows are never neighbours', () => {
    const s = place(world(1, true), [[0, 'front', 3, b('housing', 1, 10)], [0, 'back', 3, b('housing', 1, 10)]]);
    expect(mergeBlocker(s, id(s, 0, 'front', 3), id(s, 0, 'back', 3))).toBe('notAdjacent');
  });

  it('merge lands on the lower slot even when ids are not in slot order', () => {
    let s = world(1, true);
    s = place(s, [[0, 'back', 4, b('housing', 1, 10)], [0, 'back', 5, b('housing', 1, 10)]]);
    const right = id(s, 0, 'back', 5), left = id(s, 0, 'back', 4);
    const r = act(s, { type: 'merge', a: right, b: left });
    expect(r.error).toBeUndefined();
    expect(r.state.plots.find((p) => p.index === left)!.building!.tier).toBe(2);
    expect(r.state.plots.find((p) => p.index === right)!.building).toBeNull();
  });
});

describe('world growth', () => {
  it('back row opens at 20 owned plots and back buildings earn 80%', () => {
    let s = world(2);
    s = { ...s, plots: s.plots.map((p, i) => (i < BALANCE.backRowAtPlots ? { ...p, owned: true } : p)) };
    expect(hasBackRow(s)).toBe(false);
    s = growWorld(s);
    expect(hasBackRow(s)).toBe(true);
    expect(s.plots.filter((p) => p.row === 'back')).toHaveLength(24);
    s = place(s, [[0, 'back', 0, b('housing', 3)]]);
    expect(plotIncome(s, id(s, 0, 'back', 0))).toBeCloseTo(buildingIncome(s, b('housing', 3)) * BALANCE.backRowIncome);
  });

  it('districts open on base income, several at once, never from the briefcase boost', () => {
    let s = place(world(), [[0, 'front', 0, b('retail', 5, 10)]]);
    s = { ...s, boostUntil: 0 };
    s = growWorld(s);
    expect(districtCount(s)).toBe(DISTRICTS.length);

    let small = place(world(), [[0, 'front', 0, b('food', 4, 3)]]);
    const base = totalIncome(small, false);
    expect(base).toBeLessThan(DISTRICTS[1]!.unlockIncome);
    expect(base * BALANCE.briefcaseMult).toBeGreaterThan(DISTRICTS[1]!.unlockIncome);
    small = growWorld({ ...small, boostUntil: small.lastSimTime + 60_000 });
    expect(districtCount(small)).toBe(1);
  });

  it('food unlocks when a tier 3 house is merged', () => {
    let s = createInitialState(7, T0);
    s = { ...s, taka: 1e12 };
    s = place(s, [[0, 'front', 0, b('housing', 2, 10)], [0, 'front', 1, b('housing', 2, 10)]]);
    expect(act(s, { type: 'build', plot: id(s, 0, 'front', 2), category: 'food' }).error).toBe('plotNotOwned');
    s = act(s, { type: 'merge', a: id(s, 0, 'front', 0), b: id(s, 0, 'front', 1) }).state;
    expect(s.unlocked).toContain('food');
    expect(s.unlocked).not.toContain('healthcare');
    expect(act(s, { type: 'build', plot: id(s, 0, 'front', 1), category: 'food' }).error).toBeUndefined();
  });
});

describe('cash bags and briefcase', () => {
  it('a bag appears after nextBagAt and pays 30 s of that building', () => {
    let s = place(world(), [[0, 'front', 0, b('housing', 3)]]);
    s = updatePickups({ ...s, nextBagAt: T0 }, T0 + 1, false);
    expect(s.bag?.plot).toBe(id(s, 0, 'front', 0));
    const before = s.taka;
    const r = act(s, { type: 'collectBag' });
    expect(r.state.taka - before).toBeCloseTo(plotIncome(s, s.bag!.plot) * BALANCE.bagSeconds);
    expect(r.state.bag).toBeNull();
    expect(r.state.nextBagAt).toBeGreaterThanOrEqual(s.lastSimTime + BALANCE.bagMinMs);
    expect(act(r.state, { type: 'collectBag' }).error).toBe('nothingToCollect');
  });

  it('merging away the bag building removes the bag', () => {
    let s = place(world(), [[0, 'front', 0, b('housing', 1, 10)], [0, 'front', 1, b('housing', 1, 10)]]);
    s = { ...s, bag: { plot: id(s, 0, 'front', 1), kind: 'chanda' } };
    const r = act(s, { type: 'merge', a: id(s, 0, 'front', 0), b: id(s, 0, 'front', 1) });
    expect(r.state.bag).toBeNull();
  });

  it('briefcase shows for 10 s; collecting gives 3x for 60 s', () => {
    let s = place(world(), [[0, 'front', 0, b('housing', 3)]]);
    s = updatePickups({ ...s, nextBriefcaseAt: T0 }, T0, false);
    expect(s.briefcaseUntil).toBe(T0 + BALANCE.briefcaseVisibleMs);
    s = act(s, { type: 'collectBriefcase' }).state;
    expect(s.boostUntil).toBe(s.lastSimTime + BALANCE.briefcaseBoostMs);
    expect(totalIncome(s)).toBeCloseTo(totalIncome(s, false) * BALANCE.briefcaseMult);
    const later = updatePickups({ ...s, briefcaseUntil: T0 + 5 }, T0 + 10, false);
    expect(later.briefcaseUntil).toBe(0);
  });

  it('catch-up never spawns a briefcase and only boosts until the boost ends', () => {
    let s = place(world(), [[0, 'front', 0, b('housing', 3)]]);
    s = { ...s, boostUntil: T0 + 60_000, nextBriefcaseAt: T0 + 1000 };
    const base = totalIncome(s, false);
    const r = catchUp(s, T0 + 4 * 3600_000);
    expect(r.earned).toBeCloseTo(base * 4 * 3600 + base * (BALANCE.briefcaseMult - 1) * 60, 3);
    expect(r.state.briefcaseUntil).toBe(0);
    expect(r.state.nextBriefcaseAt).toBeGreaterThan(T0 + 4 * 3600_000);
  });

  it('a normal tick earns 3x only while boosted', () => {
    let s = place(world(), [[0, 'front', 0, b('housing', 3)]]);
    s = { ...s, boostUntil: T0 + 125 };
    const base = totalIncome(s, false);
    const next = tick(s, 0.25, T0 + 250);
    expect(next.lifetimeEarnings).toBeCloseTo(base * 0.25 + base * 2 * 0.125);
  });
});

describe('buy-max', () => {
  it('x10 is capped at the levels left and needs their full cost', () => {
    const s = place(world(), [[0, 'front', 0, b('housing', 1, 7)]]);
    const plot = id(s, 0, 'front', 0);
    const plan = upgradePlan(s, plot, 10);
    expect(plan.levels).toBe(3);
    expect(plan.cost).toBe(upgradeCost(b('housing', 1, 7)) + upgradeCost(b('housing', 1, 8)) + upgradeCost(b('housing', 1, 9)));
    expect(act(s, { type: 'upgrade', plot, count: 10 }).state.plots.find((p) => p.index === plot)!.building!.level).toBe(10);
  });

  it('Max buys as many as are affordable', () => {
    let s = place(world(), [[0, 'front', 0, b('housing', 1, 1)]]);
    const plot = id(s, 0, 'front', 0);
    s = { ...s, taka: upgradeCost(b('housing', 1, 1)) + upgradeCost(b('housing', 1, 2)) + 1 };
    expect(upgradePlan(s, plot, 'max').levels).toBe(2);
    const r = act(s, { type: 'upgrade', plot, count: 'max' });
    expect(r.state.plots.find((p) => p.index === plot)!.building!.level).toBe(3);
    expect(r.state.taka).toBe(1);
  });
});

describe('save v1 -> v2', () => {
  it('adds district and slot and unlocks from the highest house owned', () => {
    const v1 = {
      version: 1, seed: 5, taka: 100, lifetimeEarnings: 0, lastSimTime: T0,
      plots: Array.from({ length: 12 }, (_, i) => ({ index: i, row: 'front', owned: i < 2, grabbed: false, building: i === 0 ? b('housing', 5, 3) : null })),
    };
    const s = migrate(v1)!;
    expect(s).not.toBeNull();
    expect(s.version).toBe(4);
    expect(s.plots[3]).toMatchObject({ district: 0, slot: 3, row: 'front' });
    expect(s.unlocked).toEqual(['housing', 'food', 'healthcare', 'retail']);
    expect(s.bag).toBeNull();
  });
});

describe('names for every category', () => {
  it('never hits the blocklist', () => {
    for (const cat of ['housing', 'food', 'healthcare', 'retail'] as const) {
      for (let seed = 0; seed < 3000; seed++) expect(NAME_BLOCKLIST).not.toContain(buildingName(seed, cat).toLowerCase());
    }
  });
});
