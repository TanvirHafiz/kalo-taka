import { BALANCE } from '../config/balance';
import type { GameState } from '../state/types';
import { totalIncome } from './economy';
import { completeDueJobs, maybeEndInquiry, maybeStartInquiry, nextDeadline, ronyCollects, updateHeat, updateMilestones } from './corruption';
import { eventFlow, maybeEndEvent, maybeStartEvent } from './events';
import { districtCount } from './layout';
import { growWorld, updatePickups, updateUnlocks } from './progress';
import { advanceTutorial } from './tutorial';

export interface AdvanceResult {
  state: GameState;
  /** Taka earned through catch-up this call (0 if the gap was small). */
  caughtUp: number;
  caughtUpMs: number;
}

/**
 * Called once per animation frame. The accumulator is the gap between `now` and
 * state.lastSimTime: whole 250 ms ticks are run and lastSimTime advances by exactly
 * tickMs each, so income does not depend on frame rate. A gap longer than maxFrameMs
 * (hidden tab, sleep) is applied through catchUp() in short steps instead.
 */
export function advance(state: GameState, now: number): AdvanceResult {
  const gap = now - state.lastSimTime;
  if (gap < 0) return { state: { ...state, lastSimTime: now }, caughtUp: 0, caughtUpMs: 0 };
  if (gap > BALANCE.maxFrameMs) {
    const r = catchUp(state, now);
    return { state: r.state, caughtUp: r.earned, caughtUpMs: gap };
  }
  let s = state;
  const dtSec = BALANCE.tickMs / 1000;
  while (now - s.lastSimTime >= BALANCE.tickMs) {
    s = tick(s, dtSec, s.lastSimTime + BALANCE.tickMs);
  }
  return { state: s, caughtUp: 0, caughtUpMs: 0 };
}

/**
 * Advance the simulation by `dtSec` seconds. Pure; the caller supplies time.
 * `now` is the wall-clock moment the state reaches after this step. Order: earn with the state as
 * it was, then heat, then finish due permits, then inquiries, unlocks, world growth and pickups.
 * The briefcase boost only applies to the part of the step before it runs out.
 */
export function tick(state: GameState, dtSec: number, now: number, catchingUp = false, incomeScale = 1): GameState {
  const base = totalIncome(state, false);
  const boostedSec = Math.min(dtSec, Math.max(0, Math.min(now, state.boostUntil) - state.lastSimTime) / 1000);
  const earned = (base * dtSec + base * (BALANCE.briefcaseMult - 1) * boostedSec) * incomeScale;
  let s: GameState = {
    ...state,
    taka: state.taka + earned,
    lifetimeEarnings: state.lifetimeEarnings + earned,
    lastSimTime: now,
    posters: state.posters.some((t) => t <= now) ? state.posters.filter((t) => t > now) : state.posters,
  };
  s = updateHeat(s, dtSec);
  s = eventFlow(s, dtSec, incomeScale).state;
  s = completeDueJobs(s, now);
  s = maybeEndInquiry(s, now);
  s = maybeStartInquiry(s, now);
  s = maybeEndEvent(s, now);
  if (!catchingUp) {
    // the event clock and the tutorial only move while the player is actually playing
    s = { ...s, runPlayMs: s.runPlayMs + dtSec * 1000 };
    s = maybeStartEvent(s, now);
    s = advanceTutorial(s);
    if (base > s.stats.bestIncome) s = { ...s, stats: { ...s.stats, bestIncome: base } };
  }
  s = updateUnlocks(s);
  s = growWorld(s);
  if (districtCount(s) > s.districtsSeen) s = { ...s, districtsSeen: districtCount(s) };
  s = updatePickups(s, now, catchingUp);
  s = ronyCollects(s, now, incomeScale);
  return updateMilestones(s);
}

/** Longest single step during catch-up, so heat feedback and inquiries play out over a long gap. */
const CATCH_UP_STEP_MS = 5000;

/**
 * Apply a long gap (hidden tab) as a series of short steps, each cut at the next deadline (a permit,
 * the inquiry, a poster, the boost), so everything happens in the right order.
 */
export function catchUp(state: GameState, now: number): { state: GameState; earned: number } {
  let s = state;
  while (s.lastSimTime < now) {
    const t = s.lastSimTime;
    const end = Math.min(now, t + CATCH_UP_STEP_MS, nextDeadline(s, t));
    s = tick(s, (end - t) / 1000, end, true);
  }
  return { state: s, earned: s.lifetimeEarnings - state.lifetimeEarnings };
}
