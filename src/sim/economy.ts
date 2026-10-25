import { BALANCE, CORRUPTION, NEPHEWS, type NephewId } from '../config/balance';
import { EVENT_TUNING, PRESTIGE } from '../config/events';
import { dayPhase } from './daycycle';
import { BUILDINGS, NEIGHBOUR_RULES, PATIENT_CAPACITY, type Category, type TierDef } from '../config/buildings';
import type { Building, GameState } from '../state/types';
import { neighbours, plotById } from './layout';

export function tierDef(category: Category, tier: number): TierDef | undefined {
  return BUILDINGS[category][tier - 1];
}

export function maxTier(category: Category): number {
  return BUILDINGS[category].length;
}

/** Occupancy: housing is lowered by Tenant Anger, everything else by Media Heat. Clamped 0.5..1. */
export function occupancy(state: GameState, b: Building): number {
  const heat = b.category === 'housing' ? 1 - state.heat.anger / CORRUPTION.angerDiv : 1 - state.heat.media / CORRUPTION.mediaDiv;
  return Math.min(BALANCE.maxOccupancy, Math.max(BALANCE.minOccupancy, BALANCE.baseOccupancy * heat));
}

/** Share of all income the hired nephews keep ("shown honestly in the HUD"). */
export function skimShare(state: GameState): number {
  let s = 0;
  for (const id of Object.keys(NEPHEWS) as NephewId[]) {
    const n = state.nephews[id];
    if (n.hired) s += Math.max(0, NEPHEWS[id].skim - NEPHEWS[id].skimPerLevel * n.level);
  }
  return s;
}

/** Offshore Stars: +10% income each, forever. */
export function globalMult(state: GameState): number {
  return 1 + PRESTIGE.incomePerStar * state.stars;
}

/**
 * Effects of the running event, the rent hike and flyover frontage on one plot. Kept out of
 * baseIncome(), so events never change prices or unlock districts.
 */
export function eventMult(state: GameState, id: number, b: Building): number {
  let m = 1;
  const now = state.lastSimTime;
  const e = state.event && state.event.until > now ? state.event : null;
  if (e) {
    const T = EVENT_TUNING;
    if (e.id === 'loadShedding' && e.dark?.includes(id) && !state.generators.includes(id)) m *= T.loadSheddingMult;
    if (e.id === 'monsoon' && b.category === 'housing') m *= T.monsoonHousingMult;
    if (e.id === 'hartal' && (b.category === 'food' || b.category === 'retail')) m *= T.hartalMult;
    if (e.id === 'dengue' && b.category === 'healthcare') m *= T.dengueMult;
    if (e.id === 'vip') m *= T.vipMult;
    if (e.id === 'ramadan' && b.category === 'food') {
      const phase = dayPhase(now);
      if (phase >= T.ramadanEveningFrom && phase <= T.ramadanEveningTo) m *= T.ramadanFoodMult;
    }
  }
  if (b.category === 'housing' && state.rentHikeUntil > now) m *= EVENT_TUNING.rentHikeMult;
  if (state.frontage.includes(id)) m *= 1 + EVENT_TUNING.frontageBonus;
  return m;
}

/** income = baseIncome * (1 + 0.25(level - 1)) * occupancy * globalMult * eventMult, per second. */
export function buildingIncome(state: GameState, b: Building): number {
  const def = tierDef(b.category, b.tier);
  if (!def) return 0;
  const levelMult = 1 + BALANCE.incomePerLevel * (b.level - 1);
  return def.baseIncome * levelMult * occupancy(state, b) * globalMult(state);
}

/** Sum of neighbour bonuses for the building on a plot (0.2 = +20%). Each neighbour counts. */
export function neighbourBonus(state: GameState, id: number): number {
  const b = plotById(state, id)?.building;
  if (!b) return 0;
  let bonus = 0;
  for (const nid of neighbours(state, id)) {
    const n = plotById(state, nid)?.building;
    if (!n) continue;
    for (const r of NEIGHBOUR_RULES) {
      if (r.target.category !== b.category) continue;
      if (r.target.tier !== undefined && r.target.tier !== b.tier) continue;
      if (r.neighbour.category !== n.category) continue;
      if (r.neighbour.minTier !== undefined && n.tier < r.neighbour.minTier) continue;
      bonus += r.bonus;
    }
  }
  return bonus;
}

/** The golden briefcase boost is running at the sim's current time. */
export function isBoosted(state: GameState): boolean {
  return state.lastSimTime < state.boostUntil;
}

/** Income per second of the building on a plot: neighbours, back row, events and the boost. */
export function plotIncome(state: GameState, id: number, boosted = isBoosted(state), events = true): number {
  const p = plotById(state, id);
  if (!p?.building) return 0;
  // frozen by an inquiry: earns nothing until it ends
  if (state.inquiry?.plot === id) return 0;
  const row = p.row === 'back' ? BALANCE.backRowIncome : 1;
  const boost = boosted ? BALANCE.briefcaseMult : 1;
  const ev = events ? eventMult(state, id, p.building) : 1;
  const toronto = state.destination === 'toronto' && p.building.category === 'housing' ? 1 + PRESTIGE.torontoHousing : 1;
  return buildingIncome(state, p.building) * Math.max(0, 1 + neighbourBonus(state, id)) * row * boost * ev * toronto * (1 - skimShare(state));
}

/** Total income per second, including events (and the boost unless `boosted` is false). */
export function totalIncome(state: GameState, boosted = isBoosted(state), events = true): number {
  let sum = 0;
  for (const p of state.plots) if (p.building) sum += plotIncome(state, p.index, boosted, events);
  return sum;
}

/** The underlying rate: no briefcase boost, no event effects. Used for prices and unlocks. */
export function baseIncome(state: GameState): number {
  return totalIncome(state, false, false);
}

/** Patients shown on a healthcare building: occupancy x tier capacity. */
export function patients(state: GameState, b: Building): number {
  if (b.category !== 'healthcare') return 0;
  return Math.round(occupancy(state, b) * (PATIENT_CAPACITY[b.tier] ?? 0));
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
