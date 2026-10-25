import { BALANCE } from '../config/balance';
import { BUILDINGS, type Category, type TierDef } from '../config/buildings';
import type { Building, GameState } from '../state/types';

export function tierDef(category: Category, tier: number): TierDef | undefined {
  return BUILDINGS[category][tier - 1];
}

export function maxTier(category: Category): number {
  return BUILDINGS[category].length;
}

/** Occupancy before heat effects. Clamped to the spec range. */
export function occupancy(_state: GameState, _b: Building): number {
  return Math.min(BALANCE.maxOccupancy, Math.max(BALANCE.minOccupancy, BALANCE.baseOccupancy));
}

/** Multipliers from stars, nephews and posters. All 1 until later milestones. */
export function globalMult(_state: GameState): number {
  return 1;
}

export function eventMult(_state: GameState, _b: Building): number {
  return 1;
}

/** income = baseIncome * (1 + 0.25(level - 1)) * occupancy * globalMult * eventMult, per second. */
export function buildingIncome(state: GameState, b: Building): number {
  const def = tierDef(b.category, b.tier);
  if (!def) return 0;
  const levelMult = 1 + BALANCE.incomePerLevel * (b.level - 1);
  return def.baseIncome * levelMult * occupancy(state, b) * globalMult(state) * eventMult(state, b);
}

export function totalIncome(state: GameState): number {
  let sum = 0;
  for (const p of state.plots) if (p.building) sum += buildingIncome(state, p.building);
  return sum;
}

/** Cost to go from `level` to `level + 1`: baseCost * 1.18^level, rounded up to whole Taka. */
export function upgradeCost(b: Building): number {
  const def = tierDef(b.category, b.tier);
  if (!def) return Infinity;
  return Math.ceil(def.baseCost * BALANCE.upgradeCostGrowth ** b.level);
}

/** Total cost of `count` consecutive upgrades from the current level (for buy-max later). */
export function upgradeCostN(b: Building, count: number): number {
  let sum = 0;
  for (let i = 0; i < count; i++) sum += upgradeCost({ ...b, level: b.level + i });
  return sum;
}

export function buildCost(category: Category): number {
  return tierDef(category, 1)?.baseCost ?? Infinity;
}

export function plotsOwned(state: GameState): number {
  return state.plots.filter((p) => p.owned).length;
}

/** plotCost = 20000 * 1.35^plotsOwned */
export function plotCost(state: GameState): number {
  return Math.ceil(BALANCE.plotCostBase * BALANCE.plotCostGrowth ** plotsOwned(state));
}
