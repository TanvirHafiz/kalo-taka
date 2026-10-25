// A headless greedy player for the balance pass. It drives the real reducer and tick, plays the
// tutorial like a new player would, and logs when each pacing milestone lands.
//
// Strategy (per lane = one row of one district, one category per lane): buildings form a "binary
// counter" from left to right. If the two rightmost buildings share a tier, level the cheaper one
// until both are maxed, then merge. Otherwise build a fresh tier 1 to the right (buying the plot if
// needed). Every lane proposes its next step; the bot takes the one with the best payback
// (cost / income gained), merges whenever a pair is ready, taps bags and briefcases, and pumps
// water when tenants get angry. It never grabs land, bribes or hires, so it is a lower bound on a
// sharp player but not on a lazy one.
import { BALANCE } from '../../src/config/balance';
import { CATEGORIES, type Category } from '../../src/config/buildings';
import { applyAction } from '../../src/sim/actions';
import { waterPumpCost } from '../../src/sim/corruption';
import { buildCost, buildingIncome, maxTier, plotCost, totalIncome, upgradeCost } from '../../src/sim/economy';
import { starOffer } from '../../src/sim/prestige';
import { tick } from '../../src/sim/tick';
import { createInitialState } from '../../src/state/initialState';
import type { Action, Building, GameState, Plot } from '../../src/state/types';

export interface Milestones {
  firstMerge?: number;
  secondMerge?: number;
  food?: number;
  clinic?: number;
  hospital?: number;
  tier5?: number;
  stars1?: number;
  stars3?: number;
  stars5?: number;
  districts: number[];
}

export interface RunResult {
  milestones: Milestones;
  /** One row per minute: [minute, income/s, highest housing tier, plots owned]. */
  perMinute: [number, number, number, number][];
  final: GameState;
}

const T0 = 1_750_000_000_000;

type Lane = { district: number; row: 'front' | 'back'; category: Category };

const laneKey = (l: { district: number; row: string }) => `${l.district}:${l.row}`;

function lanePlots(state: GameState, lane: { district: number; row: string }): Plot[] {
  return state.plots.filter((p) => p.district === lane.district && p.row === lane.row).sort((a, b) => a.slot - b.slot);
}

interface Proposal {
  action: Action;
  cost: number;
  gain: number;
}

const levelGain = (state: GameState, b: Building) => buildingIncome(state, { ...b, level: b.level + 1 }) - buildingIncome(state, b);

/** The next step for one lane, or null if it has nothing to do (full, or waiting on a permit). */
function propose(state: GameState, lane: Lane): Proposal | 'merge-wait' | null {
  const row = lanePlots(state, lane);
  const built = row.filter((p) => p.building || p.job?.result);
  if (row.some((p) => p.job)) return 'merge-wait';
  const r = built[built.length - 1];
  const l = built[built.length - 2];
  if (r && l && l.slot === r.slot - 1 && l.building && r.building && l.building.tier === r.building.tier && l.building.tier < maxTier(lane.category)) {
    const lb = l.building, rb = r.building;
    if (lb.level >= BALANCE.maxLevel && rb.level >= BALANCE.maxLevel) {
      return { action: { type: 'merge', a: l.index, b: r.index }, cost: 0, gain: Infinity };
    }
    const pick = lb.level <= rb.level ? l : r;
    const b = pick.building!;
    return { action: { type: 'upgrade', plot: pick.index }, cost: upgradeCost(b), gain: levelGain(state, b) };
  }
  // a lone rightmost building: level it to the max first, then give it a partner
  if (r?.building && r.building.level < BALANCE.maxLevel) {
    return { action: { type: 'upgrade', plot: r.index }, cost: upgradeCost(r.building), gain: levelGain(state, r.building) };
  }
  const next = row.find((p) => p.slot === (r ? r.slot + 1 : 0));
  if (!next) return null;
  const gain = buildingIncome(state, { category: lane.category, tier: 1, level: 1 });
  if (!next.owned) return { action: { type: 'buyPlot', plot: next.index }, cost: plotCost(state) + buildCost(lane.category), gain };
  return { action: { type: 'build', plot: next.index, category: lane.category }, cost: buildCost(lane.category), gain };
}

function assignLanes(state: GameState, lanes: Lane[]): Lane[] {
  const out = [...lanes];
  const taken = new Set(out.map(laneKey));
  for (const c of CATEGORIES) {
    if (!state.unlocked.includes(c) || out.some((l) => l.category === c)) continue;
    // the first free row, front rows first
    const rows = [...new Set(state.plots.map((p) => `${p.district}:${p.row}`))]
      .map((k) => ({ district: Number(k.split(':')[0]), row: k.split(':')[1] as 'front' | 'back' }))
      .sort((a, b) => (a.row === b.row ? a.district - b.district : a.row === 'front' ? -1 : 1));
    const free = rows.find((r) => !taken.has(laneKey(r)) && lanePlots(state, r).every((p) => !p.building && !p.job));
    if (free) {
      out.push({ ...free, category: c });
      taken.add(laneKey(free));
    }
  }
  return out;
}

/** A new player does what Mamun says, one step at a time. */
function tutorialStep(s: GameState, act: (a: Action) => boolean): void {
  const row = lanePlots(s, { district: 0, row: 'front' });
  const [a, b] = [row[0]!, row[1]!];
  switch (s.tutorial.step) {
    case 0: act({ type: 'build', plot: a.index, category: 'housing' }); break;
    case 2: act({ type: 'upgrade', plot: a.index }); break;
    case 3: act({ type: 'buyPlot', plot: b.index }); break;
    case 4: act({ type: 'build', plot: b.index, category: 'housing' }); break;
    case 5: for (const p of [a, b]) act({ type: 'upgrade', plot: p.index, count: 'max' }); break;
    case 6: act({ type: 'merge', a: a.index, b: b.index }); break;
    default: break;
  }
}

export interface BotOptions {
  seed: number;
  hours: number;
  /** Seconds between decisions (a human does not react every tick). */
  decideEvery?: number;
}

export function runBot({ seed, hours, decideEvery = 2 }: BotOptions): RunResult {
  let s: GameState = createInitialState(seed, T0);
  const m: Milestones = { districts: [] };
  const perMinute: RunResult['perMinute'] = [];
  let lanes: Lane[] = [{ district: 0, row: 'front', category: 'housing' }];
  let merges = 0;
  const dt = BALANCE.tickMs;
  const end = T0 + hours * 3600_000;
  let nextDecision = T0;
  let nextMinute = T0;
  const act = (a: Action) => {
    const r = applyAction(s, a);
    if (!r.error) s = r.state;
    return !r.error;
  };

  while (s.lastSimTime < end) {
    const now = s.lastSimTime + dt;
    s = tick(s, dt / 1000, now);
    s = { ...s, events: s.events.length ? [] : s.events };
    const sec = (now - T0) / 1000;

    if (now >= nextDecision) {
      nextDecision = now + decideEvery * 1000;
      if (s.bag) act({ type: 'collectBag' });
      if (s.briefcaseUntil > now) act({ type: 'collectBriefcase' });
      if (s.heat.anger > 40 && s.taka > waterPumpCost(s) * 20) act({ type: 'waterPump' });
      lanes = assignLanes(s, lanes);
      if (!s.tutorial.done) tutorialStep(s, act);
      // several steps per decision while there is money for the best one
      else for (let i = 0; i < 20; i++) {
        let best: Proposal | null = null;
        for (const lane of lanes) {
          const p = propose(s, lane);
          if (!p || p === 'merge-wait') continue;
          if (p.gain === Infinity) {
            if (act(p.action)) merges++;
            continue;
          }
          if (!best || p.cost / p.gain < best.cost / best.gain) best = p;
        }
        if (!best || s.taka < best.cost || !act(best.action)) break;
      }
    }

    // milestones
    const tiers = (c: Category) => Math.max(0, ...s.plots.map((p) => (p.building?.category === c ? p.building.tier : 0)));
    const topHousing = tiers('housing');
    if (m.firstMerge === undefined && s.plots.some((p) => (p.building?.tier ?? 0) >= 2)) m.firstMerge = sec;
    if (m.secondMerge === undefined && merges >= 2 && m.firstMerge !== undefined) m.secondMerge = sec;
    if (m.food === undefined && s.unlocked.includes('food')) m.food = sec;
    if (m.clinic === undefined && s.unlocked.includes('healthcare')) m.clinic = sec;
    if (m.hospital === undefined && tiers('healthcare') >= 4) m.hospital = sec;
    if (m.tier5 === undefined && topHousing >= 5) m.tier5 = sec;
    const stars = starOffer(s);
    if (m.stars1 === undefined && stars >= 1) m.stars1 = sec;
    if (m.stars3 === undefined && stars >= 3) m.stars3 = sec;
    if (m.stars5 === undefined && stars >= 5) m.stars5 = sec;
    const d = new Set(s.plots.map((p) => p.district)).size;
    while (m.districts.length < d - 1) m.districts.push(sec);
    if (now >= nextMinute) {
      nextMinute += 60_000;
      perMinute.push([Math.round(sec / 60), totalIncome(s, false), topHousing, s.plots.filter((p) => p.owned).length]);
    }
  }
  return { milestones: m, perMinute, final: s };
}

export const fmtTime = (sec?: number) => (sec === undefined ? '  never' : `${String(Math.floor(sec / 60)).padStart(4)}m${String(Math.round(sec % 60)).padStart(2, '0')}s`);
