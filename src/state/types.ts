import type { Category } from '../config/buildings';
import type { ErrorKey } from '../config/strings';

export interface Building {
  category: Category;
  tier: number;
  level: number;
}

export interface Plot {
  index: number;
  row: 'front' | 'back';
  owned: boolean;
  /** Grabbed plots (M4) keep this flag even after a merge empties them. */
  grabbed: boolean;
  building: Building | null;
}

export interface GameState {
  version: number;
  seed: number;
  taka: number;
  lifetimeEarnings: number;
  plots: Plot[];
  /** Wall-clock epoch ms of the last simulated moment (Date.now() basis). */
  lastSimTime: number;
}

export type Action =
  | { type: 'buyPlot'; plot: number }
  | { type: 'build'; plot: number; category: Category }
  | { type: 'upgrade'; plot: number }
  | { type: 'merge'; a: number; b: number };

export interface ActionResult {
  state: GameState;
  error?: ErrorKey;
}
