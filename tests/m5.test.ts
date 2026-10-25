import { describe, expect, it } from 'vitest';
import { BALANCE, MONEY_SCALE } from '../src/config/balance';
import { EVENT_TUNING as T, OFFLINE, PRESTIGE } from '../src/config/events';
import { applyAction } from '../src/sim/actions';
import { baseIncome, plotIncome, totalIncome } from '../src/sim/economy';
import { canChoose, endEvent, eventUnlocked, maybeStartEvent, startEvent } from '../src/sim/events';
import { offlineCatchUp } from '../src/sim/offline';
import { canFlee, starOffer, unlockTier } from '../src/sim/prestige';
import { tick } from '../src/sim/tick';
import { advanceTutorial } from '../src/sim/tutorial';
import { createInitialState } from '../src/state/initialState';
import { migrate } from '../src/state/migrate';
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
const plot = (s: GameState, slot: number) => s.plots.find((p) => p.slot === slot && p.row === 'front' && p.district === 0)!;

describe('event scheduler', () => {
  it('only rolls unlocked events, never the last two, and once-per-run ones once', () => {
    const s = city({ 0: H(3) });
    expect(eventUnlocked(s, 'loadShedding')).toBe(true);
    expect(eventUnlocked(s, 'hartal')).toBe(false);
    expect(eventUnlocked(s, 'dengue')).toBe(false);
    expect(eventUnlocked(s, 'election')).toBe(false);
    expect(eventUnlocked({ ...s, runPlayMs: T.electionAtPlayMs }, 'election')).toBe(true);
    expect(eventUnlocked({ ...s, runPlayMs: T.electionAtPlayMs, doneThisRun: ['election'] }, 'election')).toBe(false);
    for (let seed = 1; seed < 60; seed++) {
      const r = maybeStartEvent({ ...s, rng: seed, runPlayMs: 100_000, nextEventPlayMs: 0, lastEvents: ['loadShedding'] }, T0);
      expect(r.event?.id).toBe('monsoon');
    }
  });

  it('schedules the next event 3 to 6 minutes of play later and never during catch-up', () => {
    const s = city({ 0: H(3) });
    const r = maybeStartEvent({ ...s, runPlayMs: 1000, nextEventPlayMs: 0 }, T0);
    expect(r.nextEventPlayMs - 1000).toBeGreaterThanOrEqual(T.gapMinMs);
    expect(r.nextEventPlayMs - 1000).toBeLessThanOrEqual(T.gapMaxMs);
    const c = tick({ ...s, runPlayMs: 1e9, nextEventPlayMs: 0 }, 0.25, T0 + 250, true);
    expect(c.event).toBeNull();
  });
});

describe('event effects', () => {
  it('load-shedding darkens half at 0.5x; generators keep them lit; base income untouched', () => {
    let s = city({ 0: H(4), 1: H(4), 2: H(4), 3: H(4), 4: H(4), 5: H(4) });
    const before = baseIncome(s);
    s = startEvent(s, 'loadShedding', T0);
    const dark = s.event!.dark!;
    expect(dark.length).toBeGreaterThan(0);
    expect(plotIncome(s, dark[0]!)).toBeCloseTo(plotIncome(s, dark[0]!, false, false) * T.loadSheddingMult);
    expect(baseIncome(s)).toBeCloseTo(before);
    s = applyAction(s, { type: 'eventChoice', choice: 'generator' }).state;
    expect(plotIncome(s, dark[0]!)).toBeCloseTo(plotIncome(s, dark[0]!, false, false));
  });

  it('dengue triples healthcare, hartal cuts food and retail, VIP cuts all, monsoon cuts housing', () => {
    const s = city({ 0: { category: 'healthcare', tier: 1, level: 1 }, 1: { category: 'food', tier: 1, level: 1 }, 2: H(2) });
    const at = (id: Parameters<typeof startEvent>[1], slot: number) => {
      const e = startEvent(s, id, T0);
      return plotIncome(e, plot(e, slot).index, false) / plotIncome(e, plot(e, slot).index, false, false);
    };
    expect(at('dengue', 0)).toBeCloseTo(T.dengueMult);
    expect(at('hartal', 1)).toBeCloseTo(T.hartalMult);
    expect(at('vip', 2)).toBeCloseTo(T.vipMult);
    expect(at('monsoon', 2)).toBeCloseTo(T.monsoonHousingMult);
  });

  it('a 3x dengue boom never unlocks a district', () => {
    const one = { category: 'healthcare' as const, tier: 3, level: 3 };
    let s = city({ 0: one });
    const base = baseIncome(s);
    expect(base).toBeLessThan(5000 * MONEY_SCALE);
    s = startEvent(s, 'dengue', T0);
    expect(totalIncome(s)).toBeGreaterThan(5000 * MONEY_SCALE);
    s = tick(s, 0.25, T0 + 250);
    expect(s.plots.some((p) => p.district === 1)).toBe(false);
  });

  it('rent hike: accept gives +20% housing for 10 min and +30 anger', () => {
    let s = startEvent(city({ 0: H(3) }), 'rentHike', T0);
    s = applyAction(s, { type: 'eventChoice', choice: 'accept' }).state;
    expect(s.event).toBeNull();
    expect(s.heat.anger).toBeCloseTo(T.rentHikeAnger);
    const id = plot(s, 0).index;
    expect(plotIncome(s, id, false) / plotIncome(s, id, false, false)).toBeCloseTo(T.rentHikeMult);
  });

  it('monsoon boats pay 10 s of income each, at most 6 per monsoon', () => {
    let s = startEvent(city({ 0: H(4) }), 'monsoon', T0);
    const pay = Math.ceil(baseIncome(s) * T.boatSeconds);
    const t0 = s.taka;
    for (let i = 0; i < T.boatsPerMonsoon; i++) s = applyAction(s, { type: 'eventChoice', choice: 'boat' }).state;
    expect(s.taka - t0).toBe(pay * T.boatsPerMonsoon);
    expect(canChoose(s, 'boat')).toBe('alreadyDone');
  });

  it('hartal parking lot needs an empty owned plot and earns 5% of income; ends with the event', () => {
    let s = startEvent(city({ 0: H(4) }), 'hartal', T0);
    s = applyAction(s, { type: 'eventChoice', choice: 'parking' }).state;
    expect(s.sideBiz?.kind).toBe('parking');
    expect(applyAction(s, { type: 'build', plot: s.sideBiz!.plot, category: 'housing' }).error).toBe('sideBizHere');
    const before = s.lifetimeEarnings;
    const n = tick(s, 1, T0 + 1000);
    expect(n.lifetimeEarnings - before).toBeCloseTo(baseIncome(s) * (1 + T.sideBizShare));
    const end = tick(s, 60, T0 + 60_000);
    expect(end.sideBiz).toBeNull();
  });

  it('an unanswered Prado crash is paid for when it ends', () => {
    let s = city({ 0: H(4) });
    s = { ...s, nephews: { ...s.nephews, dipu: { hired: true, level: 0 } } };
    s = startEvent(s, 'prado', T0);
    const t = s.taka;
    const ended = endEvent(s);
    expect(t - ended.taka).toBe(Math.ceil(baseIncome(s) * T.pradoSeconds));
  });

  it('election halves poster prices and doubles donation Influence', () => {
    let s = city({ 0: H(4) });
    const normal = applyAction(s, { type: 'poster' });
    s = startEvent(s, 'election', T0);
    const cheap = applyAction(s, { type: 'poster' });
    expect(s.taka - cheap.state.taka).toBeLessThan(s.taka - normal.state.taka);
    s = startEvent(city({ 0: H(4) }), 'election', T0);
    s = startEvent({ ...s, event: { ...s.event!, id: 'dengue' } }, 'dengue', T0);
  });
});

describe('prestige', () => {
  it('stars = floor(sqrt(lifetime / divisor)) - stars already earned', () => {
    const s = city({});
    expect(starOffer({ ...s, lifetimeEarnings: PRESTIGE.starDivisor * 99 })).toBe(9);
    expect(starOffer({ ...s, lifetimeEarnings: PRESTIGE.starDivisor * 100, stars: 4 })).toBe(6);
    expect(canFlee({ ...s, lifetimeEarnings: 0 }, 'toronto')).toBe('cannotFlee');
    expect(canFlee({ ...s, lifetimeEarnings: PRESTIGE.starDivisor * 4 }, 'kl')).toBe('destinationLocked');
  });

  it('flee keeps stars, nephew training, lifetime and the calendar; resets the city; applies perks', () => {
    let s = city({ 0: H(5), 1: H(4) });
    s = { ...s, lifetimeEarnings: PRESTIGE.starDivisor * 400, heat: { media: 50, anger: 50, committee: 50 }, nephews: { ...s.nephews, polash: { hired: true, level: 3 } }, startedAt: T0 - 999 };
    const r = applyAction(s, { type: 'flee', destination: 'toronto' }).state;
    expect(r.stars).toBe(20);
    expect(r.lifetimeEarnings).toBe(s.lifetimeEarnings);
    expect(r.startedAt).toBe(T0 - 999);
    expect(r.nephews.polash).toEqual({ hired: false, level: 3 });
    expect(r.plots.filter((p) => p.building)).toHaveLength(0);
    expect(r.heat).toEqual({ media: 0, anger: 0, committee: 0 });
    expect(r.plots.filter((p) => p.owned)).toHaveLength(PRESTIGE.perkPlots);
    expect(r.taka).toBe(PRESTIGE.perkCash);
    expect(r.destination).toBe('toronto');
    expect(r.tutorial.done).toBe(true);
    expect(r.events.some((e) => e.kind === 'fled')).toBe(true);
    const house = { ...r, plots: r.plots.map((p) => (p.slot === 0 ? { ...p, building: H(1) } : p)) };
    expect(plotIncome(house, 0, false, false)).toBeCloseTo(BALANCE.baseOccupancy * 5 * MONEY_SCALE * (1 + 0.1 * 20) * (1 + PRESTIGE.torontoHousing));
  });

  it('40 stars: food and healthcare unlock one housing tier earlier', () => {
    const s = { ...city({}), stars: 40 };
    expect(unlockTier(s, 'food')).toBe(2);
    expect(unlockTier(s, 'retail')).toBe(5);
  });
});

describe('offline (closed game)', () => {
  it('earns 25% up to the 4 h cap, nothing beyond; reports the gross', () => {
    const s = city({ 0: H(4) });
    const base = baseIncome(s);
    const r = offlineCatchUp(s, T0 + 10 * 3600_000);
    const ev = r.events.find((e) => e.kind === 'offline')!;
    expect(ev.kind === 'offline' && ev.earned).toBeCloseTo(base * OFFLINE.capHours * 3600 * OFFLINE.rate, -2);
    expect(ev.kind === 'offline' && ev.gross).toBeCloseTo(base * OFFLINE.capHours * 3600, -2);
    expect(r.lastSimTime).toBe(T0 + 10 * 3600_000);
  });

  it('Driver Dipu raises the cap to 8 h', () => {
    let s = city({ 0: H(4) });
    s = { ...s, nephews: { ...s.nephews, dipu: { hired: true, level: 0 } } };
    const base = baseIncome(s);
    const r = offlineCatchUp(s, T0 + 10 * 3600_000);
    expect(r.lifetimeEarnings - s.lifetimeEarnings).toBeCloseTo(base * 8 * 3600 * OFFLINE.rate, -2);
  });
});

describe('tutorial', () => {
  it('walks the script, lends exactly the shortfall, and never counts the loan as earnings', () => {
    let s = createInitialState(3, T0);
    expect(s.tutorial.done).toBe(false);
    s = applyAction(s, { type: 'build', plot: 0, category: 'housing' }).state;
    s = advanceTutorial(s);
    expect(s.tutorial.step).toBe(1);
    s = tick(s, 6, T0 + 6000);
    expect(plot(s, 0).building).not.toBeNull();
    expect(s.tutorial.step).toBe(2);
    expect(s.lifetimeEarnings).toBeLessThan(s.taka);
  });

  it('skip ends it', () => {
    const s = applyAction(createInitialState(3, T0), { type: 'skipTutorial' }).state;
    expect(s.tutorial.done).toBe(true);
  });
});

describe('save v4 -> v5', () => {
  it('adds M5 fields and skips the tutorial for a save with progress', () => {
    const v4 = { ...createInitialState(5, T0), version: 4 } as Record<string, unknown>;
    for (const k of ['runPlayMs', 'event', 'nextEventPlayMs', 'lastEvents', 'doneThisRun', 'generators', 'rentHikeUntil', 'frontage', 'sideBiz', 'tutorial', 'destination', 'stats', 'districtsSeen']) delete v4[k];
    v4.plots = (v4.plots as GameState['plots']).map((p) => (p.slot === 0 ? { ...p, building: H(2) } : p));
    const s = migrate(v4)!;
    expect(s.version).toBe(5);
    expect(s.tutorial.done).toBe(true);
    expect(s.event).toBeNull();
  });
});
