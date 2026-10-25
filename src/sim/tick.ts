import { BALANCE } from '../config/balance';
import type { GameState } from '../state/types';
import { totalIncome } from './economy';

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
 * `now` is the wall-clock moment the state reaches after this step.
 */
export function tick(state: GameState, dtSec: number, now: number): GameState {
  const earned = totalIncome(state) * dtSec;
  return {
    ...state,
    taka: state.taka + earned,
    lifetimeEarnings: state.lifetimeEarnings + earned,
    lastSimTime: now,
  };
}

/**
 * Apply a long gap (hidden tab) in one step. Income is constant while away in M1,
 * so one big step equals many small ones.
 */
export function catchUp(state: GameState, now: number): { state: GameState; earned: number } {
  const dtSec = Math.max(0, (now - state.lastSimTime) / 1000);
  const next = tick(state, dtSec, now);
  return { state: next, earned: next.taka - state.taka };
}
