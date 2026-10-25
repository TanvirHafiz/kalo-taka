import { BALANCE } from '../config/balance';
import type { ErrorKey } from '../config/strings';
import type { Building, GameState } from '../state/types';
import { maxTier, tierDef } from './economy';

/** Merge fee = 2x baseCost of the target tier. */
export function mergeFee(b: Building): number {
  const target = tierDef(b.category, b.tier + 1);
  return target ? target.baseCost * BALANCE.mergeFeeMult : Infinity;
}

/** Why two plots cannot merge, or null if they can (ignores Taka). */
export function mergeBlocker(state: GameState, a: number, b: number): ErrorKey | null {
  const pa = state.plots[a];
  const pb = state.plots[b];
  if (!pa || !pb) return 'noSuchPlot';
  if (Math.abs(a - b) !== 1 || pa.row !== pb.row) return 'notAdjacent';
  const ba = pa.building;
  const bb = pb.building;
  if (!ba || !bb) return 'plotEmpty';
  if (ba.category !== bb.category || ba.tier !== bb.tier) return 'differentType';
  if (ba.level < BALANCE.maxLevel || bb.level < BALANCE.maxLevel) return 'notMaxed';
  if (ba.tier >= maxTier(ba.category)) return 'maxTier';
  return null;
}

/** Neighbours of `plot` that it could merge with right now (ignores Taka). */
export function mergePartners(state: GameState, plot: number): number[] {
  return [plot - 1, plot + 1].filter((n) => mergeBlocker(state, plot, n) === null);
}
