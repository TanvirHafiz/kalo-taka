import { BALANCE } from '../config/balance';
import type { GameState, Plot } from './types';

export const SAVE_VERSION = 1;

export function createInitialState(seed: number, now: number): GameState {
  const plots: Plot[] = [];
  for (let i = 0; i < BALANCE.plotsPerRow; i++) {
    plots.push({ index: i, row: 'front', owned: i < BALANCE.startingPlots, grabbed: false, building: null });
  }
  return {
    version: SAVE_VERSION,
    seed,
    taka: BALANCE.startingTaka,
    lifetimeEarnings: 0,
    plots,
    lastSimTime: now,
  };
}
