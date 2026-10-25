import { createInitialState } from '../src/state/initialState';
import type { Building, GameState } from '../src/state/types';

export const T0 = 1_700_000_000_000;

/** A fresh game with the tutorial already done (rules tests should not get Mamun's loans). */
export function fresh(): GameState {
  return { ...createInitialState(42, T0), tutorial: { step: 7, done: true } };
}

/** State with given buildings placed on owned plots. */
export function withBuildings(buildings: Record<number, Building>, taka = 1e12): GameState {
  const s = fresh();
  return {
    ...s,
    taka,
    plots: s.plots.map((p) => {
      const b = buildings[p.index];
      return b ? { ...p, owned: true, building: b } : p;
    }),
  };
}

export const tin = (level: number): Building => ({ category: 'housing', tier: 1, level });

import { applyAction } from '../src/sim/actions';
import { completeDueJobs } from '../src/sim/corruption';
import { updateUnlocks } from '../src/sim/progress';
import type { Action, ActionResult } from '../src/state/types';

/** Apply an action and let any permit it started clear straight away (for rules tests). */
export function act(state: GameState, action: Action): ActionResult {
  const r = applyAction(state, action);
  if (r.error) return r;
  return { state: updateUnlocks(completeDueJobs(r.state, Number.MAX_SAFE_INTEGER)) };
}
