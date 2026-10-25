// World growth and timed pickups: category unlocks, districts, the back row, cash bags and the
// golden briefcase. Pure functions over state; randomness comes from state.rng.
import { BALANCE } from '../config/balance';
import { CATEGORIES, DISTRICTS, UNLOCK_HOUSING_TIER } from '../config/buildings';
import { districtRow } from '../state/initialState';
import type { BagKind, GameState } from '../state/types';
import { rngStep } from '../util/rng';
import { plotsOwned, totalIncome } from './economy';
import { districtCount, hasBackRow } from './layout';

const BAG_KINDS: readonly BagKind[] = ['bhara', 'chanda', 'commission'];

/** Random value in [a, b) and the advanced rng state. */
function between(rng: number, a: number, b: number): [number, number] {
  const [v, next] = rngStep(rng);
  return [a + v * (b - a), next];
}

/** Record any category whose housing tier has now been reached (unlocks never undo). */
export function updateUnlocks(state: GameState): GameState {
  let top = 0;
  for (const p of state.plots) if (p.building?.category === 'housing') top = Math.max(top, p.building.tier);
  const add = CATEGORIES.filter((c) => !state.unlocked.includes(c) && UNLOCK_HOUSING_TIER[c] <= top);
  return add.length ? { ...state, unlocked: [...state.unlocked, ...add] } : state;
}

/**
 * Open new districts while the underlying income (no briefcase boost) meets their threshold, and
 * open the back row once enough plots are owned. Several districts can open in one call.
 */
export function growWorld(state: GameState): GameState {
  let s = state;
  const base = totalIncome(s, false);
  let n = districtCount(s);
  while (n < DISTRICTS.length && base >= DISTRICTS[n]!.unlockIncome) {
    let plots = [...s.plots, ...districtRow(s.plots, n, 'front')];
    if (hasBackRow(s)) plots = [...plots, ...districtRow(plots, n, 'back')];
    s = { ...s, plots };
    n += 1;
  }
  if (!hasBackRow(s) && plotsOwned(s) >= BALANCE.backRowAtPlots) {
    let plots = s.plots;
    for (let d = 0; d < districtCount(s); d++) plots = [...plots, ...districtRow(plots, d, 'back')];
    s = { ...s, plots };
  }
  return s;
}

export function scheduleBag(state: GameState, from: number): GameState {
  const [delay, rng] = between(state.rng, BALANCE.bagMinMs, BALANCE.bagMaxMs);
  return { ...state, rng, nextBagAt: from + delay };
}

function scheduleBriefcase(state: GameState, from: number): GameState {
  const [delay, rng] = between(state.rng, BALANCE.briefcaseMinMs, BALANCE.briefcaseMaxMs);
  return { ...state, rng, nextBriefcaseAt: from + delay };
}

/**
 * Bags and the briefcase at sim time `now`. During catch-up (a long gap), no briefcase appears
 * (it would only be on screen for 10 s anyway) and at most one bag spawns.
 */
export function updatePickups(state: GameState, now: number, catchingUp: boolean): GameState {
  let s = state;
  // a bag whose building has gone (merged away) disappears and a new one is scheduled
  if (s.bag && !s.plots.find((p) => p.index === s.bag!.plot)?.building) s = scheduleBag({ ...s, bag: null }, now);
  if (!s.bag && now >= s.nextBagAt) {
    // never on a building frozen by an inquiry: it would pay nothing
    const built = s.plots.filter((p) => p.building && s.inquiry?.plot !== p.index);
    if (built.length) {
      const [pv, r1] = rngStep(s.rng);
      const [kv, r2] = rngStep(r1);
      const plot = built[Math.floor(pv * built.length)]!.index;
      s = { ...s, rng: r2, bag: { plot, kind: BAG_KINDS[Math.floor(kv * BAG_KINDS.length)]! } };
    } else {
      s = scheduleBag(s, now);
    }
  }
  if (s.briefcaseUntil && now >= s.briefcaseUntil) s = { ...s, briefcaseUntil: 0 };
  if (!s.briefcaseUntil && now >= s.nextBriefcaseAt) {
    if (catchingUp) s = scheduleBriefcase(s, now);
    else s = scheduleBriefcase({ ...s, briefcaseUntil: now + BALANCE.briefcaseVisibleMs }, now);
  }
  return s;
}
