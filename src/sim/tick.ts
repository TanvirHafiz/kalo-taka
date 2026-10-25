import { BALANCE } from '../config/balance';
import type { GameState } from '../state/types';
import { totalIncome } from './economy';
import { growWorld, updatePickups } from './progress';

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
 * (hidden tab, sleep) is applied in one catch-up step instead.
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
 * `now` is the wall-clock moment the state reaches after this step. The briefcase boost only
 * applies to the part of the step before it runs out, so a long gap never earns 3x throughout.
 */
export function tick(state: GameState, dtSec: number, now: number, catchingUp = false): GameState {
  const base = totalIncome(state, false);
  const boostedSec = Math.min(dtSec, Math.max(0, Math.min(now, state.boostUntil) - state.lastSimTime) / 1000);
  const earned = base * dtSec + base * (BALANCE.briefcaseMult - 1) * boostedSec;
  const next: GameState = {
    ...state,
    taka: state.taka + earned,
    lifetimeEarnings: state.lifetimeEarnings + earned,
    lastSimTime: now,
  };
  return updatePickups(growWorld(next), now, catchingUp);
}

/**
 * Apply a long gap (hidden tab) in one step. Income does not change while away (nothing is
 * bought), so one big step equals many small ones apart from the boost, which tick() splits.
 */
export function catchUp(state: GameState, now: number): { state: GameState; earned: number } {
  const dtSec = Math.max(0, (now - state.lastSimTime) / 1000);
  const next = tick(state, dtSec, now, true);
  return { state: next, earned: next.lifetimeEarnings - state.lifetimeEarnings };
}
