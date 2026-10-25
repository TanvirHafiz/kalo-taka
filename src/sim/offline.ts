// Closed-game earnings: 25% of normal income for up to 4 hours (Driver Dipu raises the cap).
// Permits, inquiries, posters and heat still move on while away; no random events happen.
import { OFFLINE } from '../config/events';
import type { GameState } from '../state/types';
import { completeDueJobs, maybeEndInquiry, nephewEffect, nextDeadline, updateHeat } from './corruption';
import { maybeEndEvent } from './events';
import { growWorld, updateUnlocks } from './progress';
import { tick } from './tick';

export function offlineCapMs(state: GameState): number {
  const hours = state.nephews.dipu.hired ? nephewEffect(state, 'dipu') : OFFLINE.capHours;
  return hours * 3600_000;
}

/**
 * Bring a loaded save up to `now`. The first `cap` of the gap is simulated in steps at the offline
 * rate; anything beyond is fast-forwarded with no income (jobs finish, heat settles, events end).
 */
export function offlineCatchUp(state: GameState, now: number): GameState {
  const gap = now - state.lastSimTime;
  if (gap <= 0) return { ...state, lastSimTime: now };
  const before = state.lifetimeEarnings;
  const simulateTo = state.lastSimTime + Math.min(gap, offlineCapMs(state));
  let s = state;
  while (s.lastSimTime < simulateTo) {
    const t = s.lastSimTime;
    const end = Math.min(simulateTo, t + OFFLINE.stepMs, nextDeadline(s, t));
    s = tick(s, (end - t) / 1000, end, true, OFFLINE.rate);
  }
  if (s.lastSimTime < now) {
    // beyond the cap: no income, but time passes
    const rest = (now - s.lastSimTime) / 1000;
    s = updateHeat({ ...s, lastSimTime: now, posters: s.posters.filter((t) => t > now) }, rest);
    s = completeDueJobs(s, now);
    s = maybeEndInquiry(s, now);
    s = maybeEndEvent(s, now);
    s = growWorld(updateUnlocks(s));
  }
  const earned = s.lifetimeEarnings - before;
  return earned > 0 ? { ...s, events: [...s.events, { kind: 'offline', earned, gross: earned / OFFLINE.rate }] } : s;
}
