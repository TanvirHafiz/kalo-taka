// Prestige: Flee to Canada. The tycoon sells everything; the Jamai restarts with Offshore Stars.
import { DESTINATIONS, PRESTIGE, type DestinationId } from '../config/events';
import { UNLOCK_HOUSING_TIER, type Category } from '../config/buildings';
import type { ErrorKey } from '../config/strings';
import { createInitialState } from '../state/initialState';
import type { GameState } from '../state/types';
import { rngStep } from '../util/rng';

/** Stars a reset would award now: floor(sqrt(lifetime / divisor)) - stars already earned. */
export function starOffer(state: GameState): number {
  return Math.max(0, Math.floor(Math.sqrt(state.lifetimeEarnings / PRESTIGE.starDivisor)) - state.stars);
}

export function fleeAvailable(state: GameState): boolean {
  return starOffer(state) >= 1;
}

/** The Flee button pulses when the offer is at least half the stars you already have. */
export function fleePulses(state: GameState): boolean {
  const offer = starOffer(state);
  return offer >= 1 && offer >= state.stars * PRESTIGE.pulseShare;
}

export function destinationUnlocked(id: DestinationId, totalStars: number): boolean {
  return totalStars >= (DESTINATIONS.find((d) => d.id === id)?.atStars ?? Infinity);
}

/** Housing tier that unlocks a category; family perk at 40 stars brings food and healthcare one tier earlier. */
export function unlockTier(state: GameState, c: Category): number {
  const t = UNLOCK_HOUSING_TIER[c];
  if ((c === 'food' || c === 'healthcare') && state.stars >= PRESTIGE.perkEarlyUnlockAt) return Math.max(0, t - 1);
  return t;
}

export function canFlee(state: GameState, destination: DestinationId): ErrorKey | null {
  if (!fleeAvailable(state)) return 'cannotFlee';
  if (!destinationUnlocked(destination, state.stars + starOffer(state))) return 'destinationLocked';
  return null;
}

/**
 * Start a new run. Kept: Offshore Stars, nephew training (not their jobs), lifetime earnings,
 * stats, districts seen, the calendar. Reset: Taka, plots, buildings, heat, Influence, posters,
 * events. Family perks by total stars apply to the new run; the destination perk lasts one run.
 */
export function flee(state: GameState, destination: DestinationId, now: number): GameState {
  const stars = state.stars + starOffer(state);
  const [v, rng] = rngStep(state.rng);
  const seed = Math.floor(v * 4294967296) >>> 0;
  let s = createInitialState(seed, now);
  const nephews = Object.fromEntries(Object.entries(state.nephews).map(([id, n]) => [id, { hired: false, level: n.level }])) as GameState['nephews'];
  s = {
    ...s,
    startedAt: state.startedAt,
    rng,
    stars,
    lifetimeEarnings: state.lifetimeEarnings,
    nephews,
    milestones: state.milestones,
    stats: { runs: state.stats.runs + 1, bestIncome: state.stats.bestIncome },
    districtsSeen: state.districtsSeen,
    tutorial: { step: 0, done: true },
    destination,
  };
  if (stars >= PRESTIGE.perkPlotsAt) {
    s = { ...s, plots: s.plots.map((p) => (p.row === 'front' && p.district === 0 && p.slot < PRESTIGE.perkPlots ? { ...p, owned: true } : p)) };
  }
  if (stars >= PRESTIGE.perkCashAt) s = { ...s, taka: Math.max(s.taka, PRESTIGE.perkCash) };
  if (stars >= PRESTIGE.perkFreeDotolaAt) {
    s = { ...s, plots: s.plots.map((p) => (p.district === 0 && p.row === 'front' && p.slot === 0 ? { ...p, owned: true, building: { category: 'housing', tier: 3, level: 1 } } : p)) };
  }
  return { ...s, events: [{ kind: 'fled', stars: stars - state.stars }] };
}
