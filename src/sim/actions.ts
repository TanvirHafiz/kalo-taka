import { BALANCE } from '../config/balance';
import { BUILDABLE_CATEGORIES, type Category } from '../config/buildings';
import type { ErrorKey } from '../config/strings';
import type { Action, ActionResult, Building, GameState, Plot } from '../state/types';
import { buildCost, plotCost, upgradeCost } from './economy';
import { mergeBlocker, mergeFee } from './merge';

// Validators are shared by applyAction and the UI so disabled buttons always agree with the reducer.

export function canBuyPlot(state: GameState, plot: number): ErrorKey | null {
  const p = state.plots[plot];
  if (!p) return 'noSuchPlot';
  if (p.owned) return 'plotAlreadyOwned';
  if (state.taka < plotCost(state)) return 'notEnoughTaka';
  return null;
}

export function canBuild(state: GameState, plot: number, category: Category): ErrorKey | null {
  const p = state.plots[plot];
  if (!p) return 'noSuchPlot';
  if (!p.owned) return 'plotNotOwned';
  if (p.building) return 'plotOccupied';
  if (!BUILDABLE_CATEGORIES.includes(category)) return 'notBuildable';
  if (state.taka < buildCost(category)) return 'notEnoughTaka';
  return null;
}

export function canUpgrade(state: GameState, plot: number): ErrorKey | null {
  const p = state.plots[plot];
  if (!p) return 'noSuchPlot';
  if (!p.building) return 'plotEmpty';
  if (p.building.level >= BALANCE.maxLevel) return 'maxLevel';
  if (state.taka < upgradeCost(p.building)) return 'notEnoughTaka';
  return null;
}

export function canMerge(state: GameState, a: number, b: number): ErrorKey | null {
  const blocker = mergeBlocker(state, a, b);
  if (blocker) return blocker;
  const building = state.plots[a]?.building;
  if (building && state.taka < mergeFee(building)) return 'notEnoughTaka';
  return null;
}

function withPlot(state: GameState, index: number, patch: Partial<Plot>, takaDelta: number): GameState {
  const plots = state.plots.map((p) => (p.index === index ? { ...p, ...patch } : p));
  return { ...state, plots, taka: state.taka + takaDelta };
}

/** Single entry point for player actions. Pure: returns a new state, or the same state plus an error. */
export function applyAction(state: GameState, action: Action): ActionResult {
  switch (action.type) {
    case 'buyPlot': {
      const error = canBuyPlot(state, action.plot);
      if (error) return { state, error };
      return { state: withPlot(state, action.plot, { owned: true }, -plotCost(state)) };
    }
    case 'build': {
      const error = canBuild(state, action.plot, action.category);
      if (error) return { state, error };
      const building: Building = { category: action.category, tier: 1, level: 1 };
      return { state: withPlot(state, action.plot, { building }, -buildCost(action.category)) };
    }
    case 'upgrade': {
      const error = canUpgrade(state, action.plot);
      if (error) return { state, error };
      const b = state.plots[action.plot]!.building!;
      return { state: withPlot(state, action.plot, { building: { ...b, level: b.level + 1 } }, -upgradeCost(b)) };
    }
    case 'merge': {
      const left = Math.min(action.a, action.b);
      const right = Math.max(action.a, action.b);
      const error = canMerge(state, left, right);
      if (error) return { state, error };
      const b = state.plots[left]!.building!;
      const fee = mergeFee(b);
      const merged: Building = { category: b.category, tier: b.tier + 1, level: 1 };
      const plots = state.plots.map((p) => {
        if (p.index === left) return { ...p, building: merged };
        if (p.index === right) return { ...p, building: null };
        return p;
      });
      return { state: { ...state, plots, taka: state.taka - fee } };
    }
  }
}
