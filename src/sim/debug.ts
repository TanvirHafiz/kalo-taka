// Developer cheats for the ?debug panel. Pure, like the reducer, so they can be tested and never
// touch the render or UI layers.
import { CORRUPTION } from '../config/balance';
import type { EventId } from '../config/events';
import { BUILDINGS, CATEGORIES } from '../config/buildings';
import type { GameState } from '../state/types';
import { endEvent, startEvent } from './events';

/** Add Taka without counting it as earnings (so it never inflates Offshore Stars). */
export function debugAddTaka(state: GameState, amount: number): GameState {
  return { ...state, taka: Math.max(0, state.taka + amount) };
}

export type DebugMeter = 'media' | 'anger' | 'committee' | 'influence';

/** Set one heat meter, or the base Influence, clamped to its range. */
export function debugSetMeter(state: GameState, meter: DebugMeter, value: number): GameState {
  const v = Math.min(meter === 'influence' ? CORRUPTION.influenceMax : 100, Math.max(0, value));
  if (meter === 'influence') return { ...state, influence: v };
  return { ...state, heat: { ...state.heat, [meter]: v } };
}

/** Start any event now, ending the one that is running first. */
export function debugStartEvent(state: GameState, id: EventId): GameState {
  const now = state.lastSimTime;
  const s = state.event ? endEvent(state) : state;
  return startEvent(s, id, now);
}

/**
 * Move every clock in the state `ms` into the past, so the next advance() to the real now plays
 * `ms` of extra time. This is how time skip works: the save never holds future timestamps, so a
 * reload after skipping behaves normally. Zero means "not set" and stays zero.
 */
export function debugRewind(state: GameState, ms: number): GameState {
  const back = (t: number) => (t > 0 ? t - ms : t);
  return {
    ...state,
    lastSimTime: state.lastSimTime - ms,
    startedAt: state.startedAt - ms,
    nextBagAt: back(state.nextBagAt),
    briefcaseUntil: back(state.briefcaseUntil),
    nextBriefcaseAt: back(state.nextBriefcaseAt),
    boostUntil: back(state.boostUntil),
    rentHikeUntil: back(state.rentHikeUntil),
    posters: state.posters.map(back),
    bag: state.bag ? { ...state.bag, ...(state.bag.at !== undefined ? { at: back(state.bag.at) } : {}) } : null,
    inquiry: state.inquiry ? { ...state.inquiry, until: back(state.inquiry.until) } : null,
    event: state.event ? { ...state.event, start: back(state.event.start), until: back(state.event.until) } : null,
    plots: state.plots.map((p) => (p.job ? { ...p, job: { ...p.job, start: back(p.job.start), until: back(p.job.until) } } : p)),
  };
}

/** Own every plot and put a maxed building of a varied category and tier on each empty one. */
export function debugFillPlots(state: GameState): GameState {
  let i = 0;
  const plots = state.plots.map((p) => {
    if (p.building || p.job) return { ...p, owned: true };
    const category = CATEGORIES[i % CATEGORIES.length]!;
    const tier = 1 + ((i * 3) % BUILDINGS[category].length);
    i++;
    return { ...p, owned: true, building: { category, tier, level: 10 } };
  });
  return { ...state, plots, unlocked: [...CATEGORIES] };
}

/** Finish every running permit and land fill at once. */
export function debugFinishPermits(state: GameState): GameState {
  const now = state.lastSimTime;
  return { ...state, plots: state.plots.map((p) => (p.job ? { ...p, job: { ...p.job, until: now } } : p)) };
}
