// Plot geometry. Plot.index is only an id; position is (district, row, slot).
import type { GameState, Plot } from '../state/types';

export function plotById(state: GameState, id: number): Plot | undefined {
  // ids are dense and plots are appended in id order, so this is usually a direct hit
  const p = state.plots[id];
  return p && p.index === id ? p : state.plots.find((q) => q.index === id);
}

/** True if two plots sit side by side: same district, same row, slots one apart. */
export function areNeighbours(a: Plot, b: Plot): boolean {
  return a.district === b.district && a.row === b.row && Math.abs(a.slot - b.slot) === 1;
}

/** Ids of the plots directly left and right of a plot (never across a district gate). */
export function neighbours(state: GameState, id: number): number[] {
  const p = plotById(state, id);
  if (!p) return [];
  return state.plots.filter((q) => areNeighbours(p, q)).map((q) => q.index);
}

/** Of two neighbouring plots, the one on the left (where a merge result lands). */
export function leftOf(state: GameState, a: number, b: number): number {
  const pa = plotById(state, a), pb = plotById(state, b);
  if (!pa || !pb) return Math.min(a, b);
  return pa.slot <= pb.slot ? a : b;
}

export function districtCount(state: GameState): number {
  return state.plots.reduce((m, p) => Math.max(m, p.district + 1), 0);
}

export function hasBackRow(state: GameState): boolean {
  return state.plots.some((p) => p.row === 'back');
}
