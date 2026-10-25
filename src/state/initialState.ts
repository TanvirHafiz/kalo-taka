import { BALANCE } from '../config/balance';
import type { GameState, Plot, Row } from './types';

export const SAVE_VERSION = 2;

/** Plots of one district row, appended after the existing ones with fresh ids. */
export function districtRow(existing: readonly Plot[], district: number, row: Row): Plot[] {
  let next = existing.reduce((m, p) => Math.max(m, p.index + 1), 0);
  const out: Plot[] = [];
  for (let slot = 0; slot < BALANCE.plotsPerRow; slot++) {
    out.push({ index: next++, district, row, slot, owned: false, grabbed: false, building: null });
  }
  return out;
}

export function createInitialState(seed: number, now: number): GameState {
  const plots = districtRow([], 0, 'front').map((p) => (p.slot < BALANCE.startingPlots ? { ...p, owned: true } : p));
  return {
    version: SAVE_VERSION,
    seed,
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
  };
}
