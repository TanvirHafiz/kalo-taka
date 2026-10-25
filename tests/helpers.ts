import { createInitialState } from '../src/state/initialState';
import type { Building, GameState } from '../src/state/types';

export const T0 = 1_700_000_000_000;

export function fresh(): GameState {
  return createInitialState(42, T0);
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
