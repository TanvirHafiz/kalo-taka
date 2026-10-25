import { describe, expect, it } from 'vitest';
import { BALANCE, CORRUPTION, NEPHEWS } from '../src/config/balance';
import { applyAction } from '../src/sim/actions';
import {
  activeCampaigns, effectiveInfluence, heatGainMult, inquiryCost, maybeStartInquiry, nephewHireCost, permitSeconds,
  speedMoneyCost, totalSkim, updateHeat,
} from '../src/sim/corruption';
import { buildingIncome, occupancy, plotIncome, totalIncome } from '../src/sim/economy';
import { catchUp, tick } from '../src/sim/tick';
import { createInitialState } from '../src/state/initialState';
import { migrate } from '../src/state/migrate';
import type { Building, GameState } from '../src/state/types';
import { T0 } from './helpers';

const H = (tier: number, level = 1): Building => ({ category: 'housing', tier, level });

function city(buildings: Record<number, Building>, taka = 1e12): GameState {
  const s = createInitialState(3, T0);
  return {
    ...s,
    taka,
    unlocked: ['housing', 'food', 'healthcare', 'retail'],
    plots: s.plots.map((p) => (buildings[p.slot] ? { ...p, owned: true, building: buildings[p.slot]! } : p)),
  };
}

const plot = (s: GameState, slot: number) => s.plots.find((p) => p.slot === slot && p.row === 'front' && p.district === 0)!;
const at = (s: GameState, ms: number) => tick(s, (ms - s.lastSimTime) / 1000, ms);

describe('permits', () => {
  it('a build waits 30 s and earns nothing until the stamp lands', () => {
    let s = city({});
    s = { ...s, plots: s.plots.map((p) => (p.slot === 0 ? { ...p, owned: true } : p)) };
    s = applyAction(s, { type: 'build', plot: 0, category: 'housing' }).state;
    expect(plot(s, 0).building).toBeNull();
    expect(plot(s, 0).job?.kind).toBe('build');
    expect(applyAction(s, { type: 'build', plot: 0, category: 'housing' }).error).toBe('permitPending');
    s = at(s, T0 + 29_000);
    expect(plot(s, 0).building).toBeNull();
    s = at(s, T0 + 30_000);
    expect(plot(s, 0).building).toEqual(H(1));
    expect(s.events.some((e) => e.kind === 'built')).toBe(true);
  });

  it('an upgrade keeps earning at the old level until done; wait is 5 s x tier x levels', () => {
    let s = city({ 0: H(3, 2) });
    expect(permitSeconds(s, 'upgrade', 3, 2)).toBe(30);
    const before = totalIncome(s);
    s = applyAction(s, { type: 'upgrade', plot: 0, count: 10 }).state;
    expect(totalIncome(s)).toBeCloseTo(before);
    expect(applyAction(s, { type: 'upgrade', plot: 0 }).error).toBe('permitPending');
    s = at(s, T0 + permitSeconds(s, 'upgrade', 3, 8) * 1000);
    expect(plot(s, 0).building!.level).toBe(10);
  });

  it('a merge locks both plots for 60 s x target tier, both keep earning meanwhile', () => {
    let s = city({ 0: H(1, 10), 1: H(1, 10) });
    const before = totalIncome(s);
    s = applyAction(s, { type: 'merge', a: 0, b: 1 }).state;
    expect(plot(s, 1).job?.kind).toBe('merge');
    expect(totalIncome(s)).toBeCloseTo(before);
    expect(applyAction(s, { type: 'upgrade', plot: 1 }).error).toBe('permitPending');
    s = at(s, T0 + 120_000);
    expect(plot(s, 0).building).toEqual(H(2));
    expect(plot(s, 1).building).toBeNull();
    expect(s.milestones.firstMerge).toBe(true);
  });

  it('speed money: remaining x income x 0.5 x influence discount, finishes now, +1 committee', () => {
    let s = city({ 0: H(4, 3) });
    s = applyAction(s, { type: 'upgrade', plot: 0 }).state;
    const remaining = permitSeconds(s, 'upgrade', 4, 1);
    const expected = Math.ceil(remaining * totalIncome(s, false) * 0.5);
    expect(speedMoneyCost(s, 0)).toBe(Math.max(CORRUPTION.minPrice, expected));
    const r = applyAction(s, { type: 'speedMoney', plot: 0 });
    expect(plot(r.state, 0).building!.level).toBe(4);
    expect(r.state.heat.committee).toBeCloseTo(CORRUPTION.committeeFromSpeedMoney);
    expect(r.state.speedPaid).toBe(1);
  });

  it('speed money never costs nothing, even at zero income', () => {
    let s = city({});
    s = { ...s, plots: s.plots.map((p) => (p.slot === 0 ? { ...p, owned: true } : p)) };
    s = applyAction(s, { type: 'build', plot: 0, category: 'housing' }).state;
    expect(speedMoneyCost(s, 0)).toBe(CORRUPTION.minPrice);
  });
});

describe('heat and occupancy', () => {
  it('Media Heat lowers non-housing occupancy, Tenant Anger lowers housing', () => {
    let s = city({});
    s = { ...s, heat: { media: 100, anger: 0, committee: 0 } };
    expect(occupancy(s, { category: 'food', tier: 1, level: 1 })).toBeCloseTo(BALANCE.baseOccupancy * 0.6);
    expect(occupancy(s, H(1))).toBeCloseTo(BALANCE.baseOccupancy);
    s = { ...s, heat: { media: 0, anger: 100, committee: 0 } };
    // 0.9 x 0.5 is below the spec floor, so it clamps to 0.5
    expect(occupancy(s, H(1))).toBeCloseTo(BALANCE.minOccupancy);
  });

  it('meters decay; Media above 60 pushes the committee up; big housing raises anger', () => {
    let s = city({ 0: H(4), 1: H(5), 2: H(6), 3: H(7), 4: H(4), 5: H(4), 6: H(4), 7: H(4), 8: H(4), 9: H(4) });
    s = { ...s, heat: { media: 80, anger: 10, committee: 10 } };
    const n = updateHeat(s, 1);
    expect(n.heat.media).toBeCloseTo(80 - CORRUPTION.mediaDecay);
    expect(n.heat.committee).toBeCloseTo(10 + CORRUPTION.committeeFromMedia - CORRUPTION.committeeDecay);
    expect(n.heat.anger).toBeCloseTo(10 + 10 * CORRUPTION.angerPerBigHousing - CORRUPTION.angerDecay);
  });

  it('posters: +10 Influence while active, faster Media decay, cheaper heat', () => {
    let s = city({ 0: H(3) });
    s = applyAction(s, { type: 'poster' }).state;
    expect(activeCampaigns(s)).toBe(1);
    expect(effectiveInfluence(s)).toBe(CORRUPTION.posterInfluence);
    expect(heatGainMult(s)).toBeCloseTo(1 - CORRUPTION.influenceHeatCut * 0.1);
    s = { ...s, heat: { media: 50, anger: 0, committee: 0 } };
    expect(updateHeat(s, 1).heat.media).toBeCloseTo(50 - CORRUPTION.mediaDecay * 2);
    s = at(s, T0 + CORRUPTION.posterLength * 1000 + 1);
    expect(activeCampaigns(s)).toBe(0);
  });

  it('donation Influence fades about 1 per minute', () => {
    const s = { ...city({}), influence: 30 };
    expect(updateHeat(s, 60).influence).toBeCloseTo(29);
  });
});

describe('inquiries', () => {
  it('at 100 committee: a grabbed building first, else the top earner; frozen earns 0', () => {
    let s = city({ 0: H(1), 1: H(5) });
    s = { ...s, heat: { ...s.heat, committee: 100 } };
    let r = maybeStartInquiry(s, T0);
    expect(r.inquiry?.plot).toBe(plot(s, 1).index);
    expect(plotIncome(r, plot(s, 1).index)).toBe(0);
    s = { ...s, plots: s.plots.map((p) => (p.slot === 0 ? { ...p, grabbed: true } : p)) };
    r = maybeStartInquiry(s, T0);
    expect(r.inquiry?.plot).toBe(plot(s, 0).index);
    expect(r.milestones.firstInquiry).toBe(true);
  });

  it('frozen buildings cannot upgrade or merge; the freeze ends after 5 minutes and committee resets to 30', () => {
    let s = city({ 0: H(1, 10), 1: H(1, 10) });
    s = maybeStartInquiry({ ...s, heat: { ...s.heat, committee: 100 } }, T0);
    const frozen = s.inquiry!.plot;
    expect(applyAction(s, { type: 'upgrade', plot: frozen }).error).toBe('frozen');
    expect(applyAction(s, { type: 'merge', a: 0, b: 1 }).error).toBe('frozen');
    s = at(s, T0 + CORRUPTION.inquiryFreeze * 1000);
    expect(s.inquiry).toBeNull();
    expect(s.heat.committee).toBeCloseTo(CORRUPTION.inquiryCommitteeReset, 0);
  });

  it('talk show halves the freeze, donation lifts it with +20 Influence, all priced with the discount', () => {
    let s = city({ 0: H(4), 1: H(6) });
    s = maybeStartInquiry({ ...s, heat: { ...s.heat, committee: 100 } }, T0);
    const t = applyAction(s, { type: 'inquiry', option: 'talkShow' }).state;
    expect(t.inquiry!.until).toBe(T0 + (CORRUPTION.inquiryFreeze * 1000) / 2);
    const d = applyAction(s, { type: 'inquiry', option: 'donation' }).state;
    expect(d.inquiry).toBeNull();
    expect(d.influence).toBe(CORRUPTION.donationInfluence);
    const discounted = { ...s, influence: 100 };
    expect(inquiryCost(discounted, 'envelope')).toBeLessThan(inquiryCost(s, 'envelope'));
  });

  it('the envelope lifts the freeze and sometimes leaks (+10 Media), deterministically', () => {
    let leaks = 0;
    for (let seed = 1; seed <= 200; seed++) {
      let s = { ...city({ 0: H(4) }), rng: seed };
      s = maybeStartInquiry({ ...s, heat: { ...s.heat, committee: 100 } }, T0);
      const r = applyAction(s, { type: 'inquiry', option: 'envelope' }).state;
      expect(r.inquiry).toBeNull();
      if (r.heat.media > 0) leaks++;
      expect(applyAction(s, { type: 'inquiry', option: 'envelope' }).state.heat.media).toBe(r.heat.media);
    }
    expect(leaks).toBeGreaterThan(20);
    expect(leaks).toBeLessThan(80);
  });

  it('a long absence plays out: high Media drives the committee into an inquiry, which then ends', () => {
    let s = city({ 0: H(5, 5) });
    s = { ...s, heat: { media: 100, anger: 0, committee: 50 } };
    const r = catchUp(s, T0 + 3600_000).state;
    expect(r.events.some((e) => e.kind === 'inquiry')).toBe(true);
    expect(r.events.some((e) => e.kind === 'inquiryOver')).toBe(true);
    expect(r.inquiry).toBeNull();
  });
});

describe('land grab', () => {
  it('free, owned and grabbed, 20 s of sand trucks, +15 Media and +5 committee', () => {
    let s = city({});
    s = applyAction(s, { type: 'grab', plot: plot(s, 3).index }).state;
    const p = plot(s, 3);
    expect(p.owned && p.grabbed).toBe(true);
    expect(p.job?.kind).toBe('fill');
    expect(s.taka).toBe(1e12);
    expect(s.heat.media).toBeCloseTo(CORRUPTION.mediaFromGrab);
    expect(s.heat.committee).toBeCloseTo(CORRUPTION.committeeFromGrab);
    expect(applyAction(s, { type: 'build', plot: p.index, category: 'housing' }).error).toBe('permitPending');
    s = at(s, T0 + CORRUPTION.grabFill * 1000);
    expect(plot(s, 3).job).toBeNull();
  });
});

describe('nephews', () => {
  it('unlock by milestone, hire for 2 minutes of income, skim all income', () => {
    let s = city({ 0: H(3), 1: H(3), 2: H(3), 3: H(3), 4: H(3) });
    expect(applyAction(s, { type: 'hire', id: 'rony' }).error).toBe('nephewLocked');
    s = at(s, T0 + 250);
    const cost = nephewHireCost(s);
    expect(cost).toBe(Math.ceil(totalIncome(s, false) * CORRUPTION.nephewHireSeconds));
    const before = totalIncome(s);
    s = applyAction(s, { type: 'hire', id: 'rony' }).state;
    expect(totalSkim(s)).toBeCloseTo(NEPHEWS.rony.skim);
    expect(totalIncome(s)).toBeCloseTo(before * (1 - NEPHEWS.rony.skim));
  });

  it('Rony collects bags at 50% by himself; Polash cuts permits by 25%', () => {
    let s = city({ 0: H(3), 1: H(3), 2: H(3), 3: H(3), 4: H(3) });
    s = { ...s, milestones: { firstMerge: true, firstInquiry: true, firstTier5: true, maxBuildings: 5 }, nephews: { ...s.nephews, rony: { hired: true, level: 0 }, polash: { hired: true, level: 0 } } };
    expect(permitSeconds(s, 'build', 1)).toBeCloseTo(CORRUPTION.permitBuild * 0.75);
    s = { ...s, nextBagAt: T0 };
    const n = at(s, T0 + 250);
    expect(n.bag).toBeNull();
    const auto = n.events.find((e) => e.kind === 'bagAuto');
    expect(auto).toBeDefined();
  });

  it('training lowers the skim; firing upsets the family', () => {
    let s = city({ 0: H(3) });
    s = { ...s, milestones: { ...s.milestones, firstMerge: true }, nephews: { ...s.nephews, polash: { hired: true, level: 0 } } };
    s = applyAction(s, { type: 'trainNephew', id: 'polash' }).state;
    expect(totalSkim(s)).toBeCloseTo(NEPHEWS.polash.skim - NEPHEWS.polash.skimPerLevel);
    s = applyAction(s, { type: 'fire', id: 'polash' }).state;
    expect(totalSkim(s)).toBe(0);
    expect(s.heat.anger).toBeCloseTo(CORRUPTION.fireAnger);
    expect(s.nephews.polash.level).toBe(1);
  });
});

describe('tenant fixes', () => {
  it('water pump costs 15 s of housing income for -20 anger; bachelors once for -10', () => {
    let s = { ...city({ 0: H(4) }), heat: { media: 0, anger: 50, committee: 0 } };
    const housing = plotIncome(s, plot(s, 0).index, false);
    const r = applyAction(s, { type: 'waterPump' });
    expect(s.taka - r.state.taka).toBe(Math.max(CORRUPTION.minPrice, Math.ceil(housing * 15)));
    expect(r.state.heat.anger).toBe(30);
    s = applyAction(r.state, { type: 'bachelors' }).state;
    expect(s.heat.anger).toBe(20);
    expect(applyAction(s, { type: 'bachelors' }).error).toBe('alreadyDone');
    void buildingIncome;
  });
});

describe('save v2 -> v3', () => {
  it('adds jobs and works out milestones from the save', () => {
    const v2 = {
      version: 2, seed: 5, taka: 100, lifetimeEarnings: 0, lastSimTime: T0,
      plots: Array.from({ length: 12 }, (_, i) => ({ index: i, district: 0, row: 'front', slot: i, owned: i < 2, grabbed: false, building: i === 0 ? H(5) : i === 1 ? H(1) : null })),
      unlocked: ['housing', 'food', 'healthcare', 'retail'], rng: 5, bag: null, nextBagAt: T0, briefcaseUntil: 0, nextBriefcaseAt: T0, boostUntil: 0,
      heat: { media: 0, anger: 0, committee: 0 }, influence: 0, stars: 0,
    };
    const s = migrate(v2)!;
    expect(s.version).toBe(3);
    expect(s.plots[0]!.job).toBeNull();
    expect(s.milestones).toEqual({ firstMerge: true, firstInquiry: false, firstTier5: true, maxBuildings: 2 });
    expect(s.nephews.rony).toEqual({ hired: false, level: 0 });
  });
});

describe('M4 fixes', () => {
  it('no bag on a frozen building; a waiting bag moves when the freeze starts; one talk show per inquiry', () => {
    let s = city({ 0: H(5), 1: H(1) });
    s = { ...s, bag: { plot: plot(s, 0).index, kind: 'tip' } };
    s = maybeStartInquiry({ ...s, heat: { ...s.heat, committee: 100 } }, T0);
    expect(s.bag).toBeNull();
    s = at({ ...s, nextBagAt: T0 }, T0 + 250);
    expect(s.bag?.plot).toBe(plot(s, 1).index);
    s = applyAction(s, { type: 'inquiry', option: 'talkShow' }).state;
    expect(applyAction(s, { type: 'inquiry', option: 'talkShow' }).error).toBe('alreadyDone');
  });
});
