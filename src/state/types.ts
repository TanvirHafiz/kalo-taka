import type { Category } from '../config/buildings';
import type { ErrorKey } from '../config/strings';

export interface Building {
  category: Category;
  tier: number;
  level: number;
}

export type Row = 'front' | 'back';

export interface Plot {
  /** Stable id. Never use it for position: plots are appended as districts and rows unlock. */
  index: number;
  district: number;
  row: Row;
  /** Position within the district row, 0..11. Neighbours differ by one slot. */
  slot: number;
  owned: boolean;
  /** Grabbed plots (M4) keep this flag even after a merge empties them. */
  grabbed: boolean;
  building: Building | null;
}

export type BagKind = 'bhara' | 'tip' | 'commission';

export interface GameState {
  version: number;
  seed: number;
  taka: number;
  lifetimeEarnings: number;
  plots: Plot[];
  /** Wall-clock epoch ms of the last simulated moment (Date.now() basis). The sim's clock. */
  lastSimTime: number;
  /** Categories ever unlocked (they never lock again). */
  unlocked: Category[];
  /** mulberry32 state for sim randomness (bags, briefcase timing). */
  rng: number;
  /** The floating cash bag, if one is waiting to be tapped. */
  bag: { plot: number; kind: BagKind } | null;
  nextBagAt: number;
  /** Golden briefcase is visible until this time (0 = not shown). */
  briefcaseUntil: number;
  nextBriefcaseAt: number;
  /** 3x income until this time. */
  boostUntil: number;
  /** Heat meters (M4) and Influence / Offshore Stars (M4, M5). Zero until those systems exist. */
  heat: { media: number; anger: number; committee: number };
  influence: number;
  stars: number;
}

export type UpgradeCount = 1 | 10 | 'max';

export type Action =
  | { type: 'buyPlot'; plot: number }
  | { type: 'build'; plot: number; category: Category }
  | { type: 'upgrade'; plot: number; count?: UpgradeCount }
  | { type: 'merge'; a: number; b: number }
  | { type: 'collectBag' }
  | { type: 'collectBriefcase' };

export interface ActionResult {
  state: GameState;
  error?: ErrorKey;
}
