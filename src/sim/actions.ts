import { BALANCE } from '../config/balance';
import type { Category } from '../config/buildings';
import type { ErrorKey } from '../config/strings';
import type { Action, ActionResult, Building, GameState, Plot, UpgradeCount } from '../state/types';
import { buildCost, plotCost, plotIncome, upgradeCost } from './economy';
import { leftOf, plotById } from './layout';
import { mergeBlocker, mergeFee } from './merge';
import { growWorld, scheduleBag, updateUnlocks } from './progress';

// Validators are shared by applyAction and the UI so disabled buttons always agree with the reducer.
// Actions use the sim's own clock (state.lastSimTime), never the wall clock.

export function canBuyPlot(state: GameState, plot: number): ErrorKey | null {
  const p = plotById(state, plot);
  if (!p) return 'noSuchPlot';
  if (p.owned) return 'plotAlreadyOwned';
  if (state.taka < plotCost(state)) return 'notEnoughTaka';
  return null;
}

export function canBuild(state: GameState, plot: number, category: Category): ErrorKey | null {
  const p = plotById(state, plot);
  if (!p) return 'noSuchPlot';
  if (!p.owned) return 'plotNotOwned';
  if (p.building) return 'plotOccupied';
  if (!state.unlocked.includes(category)) return 'notBuildable';
  if (state.taka < buildCost(category)) return 'notEnoughTaka';
  return null;
}

/**
 * How many levels an upgrade buys and what it costs. x10 is capped at the levels left and needs the
 * full cost of those levels; Max buys as many as the player can afford (at least one).
 */
export function upgradePlan(state: GameState, plot: number, count: UpgradeCount = 1): { levels: number; cost: number } {
  const b = plotById(state, plot)?.building;
  if (!b) return { levels: 0, cost: Infinity };
  const left = BALANCE.maxLevel - b.level;
  if (left <= 0) return { levels: 0, cost: Infinity };
  if (count === 'max') {
    let levels = 0, cost = 0;
    while (levels < left) {
      const next = upgradeCost({ ...b, level: b.level + levels });
      if (cost + next > state.taka) break;
      cost += next;
      levels += 1;
    }
    return levels ? { levels, cost } : { levels: 1, cost: upgradeCost(b) };
  }
  const levels = Math.min(count, left);
  let cost = 0;
  for (let i = 0; i < levels; i++) cost += upgradeCost({ ...b, level: b.level + i });
  return { levels, cost };
}

export function canUpgrade(state: GameState, plot: number, count: UpgradeCount = 1): ErrorKey | null {
  const p = plotById(state, plot);
  if (!p) return 'noSuchPlot';
  if (!p.building) return 'plotEmpty';
  if (p.building.level >= BALANCE.maxLevel) return 'maxLevel';
  if (state.taka < upgradePlan(state, plot, count).cost) return 'notEnoughTaka';
  return null;
}

export function canMerge(state: GameState, a: number, b: number): ErrorKey | null {
  const blocker = mergeBlocker(state, a, b);
  if (blocker) return blocker;
  const building = plotById(state, a)?.building;
  if (building && state.taka < mergeFee(building)) return 'notEnoughTaka';
  return null;
}

function withPlot(state: GameState, index: number, patch: Partial<Plot>, takaDelta: number): GameState {
  const plots = state.plots.map((p) => (p.index === index ? { ...p, ...patch } : p));
  return { ...state, plots, taka: state.taka + takaDelta };
}

/** Single entry point for player actions. Pure: returns a new state, or the same state plus an error. */
export function applyAction(state: GameState, action: Action): ActionResult {
  const now = state.lastSimTime;
  switch (action.type) {
    case 'buyPlot': {
      const error = canBuyPlot(state, action.plot);
      if (error) return { state, error };
      return { state: growWorld(withPlot(state, action.plot, { owned: true }, -plotCost(state))) };
    }
    case 'build': {
      const error = canBuild(state, action.plot, action.category);
      if (error) return { state, error };
      const building: Building = { category: action.category, tier: 1, level: 1 };
      return { state: withPlot(state, action.plot, { building }, -buildCost(action.category)) };
    }
    case 'upgrade': {
      const count = action.count ?? 1;
      const error = canUpgrade(state, action.plot, count);
      if (error) return { state, error };
      const b = plotById(state, action.plot)!.building!;
      const plan = upgradePlan(state, action.plot, count);
      return { state: withPlot(state, action.plot, { building: { ...b, level: b.level + plan.levels } }, -plan.cost) };
    }
    case 'merge': {
      const left = leftOf(state, action.a, action.b);
      const right = left === action.a ? action.b : action.a;
      const error = canMerge(state, left, right);
      if (error) return { state, error };
      const b = plotById(state, left)!.building!;
      const fee = mergeFee(b);
      const merged: Building = { category: b.category, tier: b.tier + 1, level: 1 };
      const plots = state.plots.map((p) => {
        if (p.index === left) return { ...p, building: merged };
        if (p.index === right) return { ...p, building: null };
        return p;
      });
      let next: GameState = { ...state, plots, taka: state.taka - fee };
      if (next.bag?.plot === right) next = scheduleBag({ ...next, bag: null }, now);
      return { state: updateUnlocks(next) };
    }
    case 'collectBag': {
      if (!state.bag) return { state, error: 'nothingToCollect' };
      const pay = plotIncome(state, state.bag.plot) * BALANCE.bagSeconds;
      const next = { ...state, bag: null, taka: state.taka + pay, lifetimeEarnings: state.lifetimeEarnings + pay };
      return { state: scheduleBag(next, now) };
    }
    case 'collectBriefcase': {
      if (!state.briefcaseUntil || now >= state.briefcaseUntil) return { state, error: 'nothingToCollect' };
      return { state: { ...state, briefcaseUntil: 0, boostUntil: now + BALANCE.briefcaseBoostMs } };
    }
  }
}

/** What a cash bag pays right now (for the toast). */
export function bagValue(state: GameState): number {
  return state.bag ? plotIncome(state, state.bag.plot) * BALANCE.bagSeconds : 0;
}
