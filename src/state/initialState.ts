import { BALANCE } from '../config/balance';
import { EVENT_TUNING } from '../config/events';
import type { GameState, Plot, Row } from './types';

/** Fresh-run values for the M5 fields (events, tutorial, prestige bookkeeping). */
export function m5Defaults(): Pick<GameState, 'runPlayMs' | 'event' | 'nextEventPlayMs' | 'lastEvents' | 'doneThisRun' | 'generators' | 'rentHikeUntil' | 'frontage' | 'sideBiz' | 'tutorial' | 'destination' | 'stats' | 'districtsSeen'> {
  return {
    runPlayMs: 0,
    event: null,
    nextEventPlayMs: EVENT_TUNING.firstGapMs,
    lastEvents: [],
    doneThisRun: [],
    generators: [],
    rentHikeUntil: 0,
    frontage: [],
    sideBiz: null,
    tutorial: { step: 0, done: false },
    destination: null,
    stats: { runs: 1, bestIncome: 0 },
    districtsSeen: 1,
  };
}

export function noNephews(): GameState['nephews'] {
  return { rony: { hired: false, level: 0 }, polash: { hired: false, level: 0 }, mithu: { hired: false, level: 0 }, dipu: { hired: false, level: 0 } };
}

export const SAVE_VERSION = 5;

/** Plots of one district row, appended after the existing ones with fresh ids. */
export function districtRow(existing: readonly Plot[], district: number, row: Row): Plot[] {
  let next = existing.reduce((m, p) => Math.max(m, p.index + 1), 0);
  const out: Plot[] = [];
  for (let slot = 0; slot < BALANCE.plotsPerRow; slot++) {
    out.push({ index: next++, district, row, slot, owned: false, grabbed: false, building: null, job: null });
  }
  return out;
}

export function createInitialState(seed: number, now: number): GameState {
  const plots = districtRow([], 0, 'front').map((p) => (p.slot < BALANCE.startingPlots ? { ...p, owned: true } : p));
  return {
    version: SAVE_VERSION,
    seed,
    startedAt: now,
    taka: BALANCE.startingTaka,
    lifetimeEarnings: 0,
    plots,
    lastSimTime: now,
    unlocked: ['housing'],
    rng: seed >>> 0,
    bag: null,
    nextBagAt: now + BALANCE.bagMinMs,
    briefcaseUntil: 0,
    nextBriefcaseAt: now + BALANCE.briefcaseMinMs,
    boostUntil: 0,
    heat: { media: 0, anger: 0, committee: 0 },
    influence: 0,
    stars: 0,
    posters: [],
    nephews: noNephews(),
    milestones: { firstMerge: false, firstInquiry: false, firstTier5: false, maxBuildings: 0 },
    inquiry: null,
    bachelorsAllowed: false,
    speedPaid: 0,
    events: [],
    ...m5Defaults(),
  };
}
