import { BALANCE, CORRUPTION, NEPHEW_MAX_LEVEL } from '../config/balance';
import type { Category } from '../config/buildings';
import type { ErrorKey } from '../config/strings';
import type { Action, ActionResult, Building, GameState, Plot, UpgradeCount } from '../state/types';
import {
  addHeat, addInfluence, completeJob, endInquiry, inquiryCost, journalistCost, isFrozen, newJob, nephewHireCost, nephewTrainCost, nephewUnlocked,
  permitSeconds, posterCost, rollLeak, speedMoneyCost, waterPumpCost,
} from './corruption';
import { buildCost, plotCost, plotIncome, tierDef, upgradeCost, upgradeCostN } from './economy';
import { leftOf, plotById } from './layout';
import { mergeBlocker, mergeFee } from './merge';
import { applyChoice, canChoose } from './events';
import { canFlee, flee } from './prestige';
import { growWorld, scheduleBag, updateUnlocks } from './progress';
import { endTutorial } from './tutorial';

// Validators are shared by applyAction and the UI so disabled buttons always agree with the reducer.
// Actions use the sim's own clock (state.lastSimTime), never the wall clock.

const sideBizOn = (state: GameState, plot: number) => state.sideBiz?.plot === plot;

export function canBuyPlot(state: GameState, plot: number): ErrorKey | null {
  const p = plotById(state, plot);
  if (!p) return 'noSuchPlot';
  if (p.owned) return 'plotAlreadyOwned';
  if (state.taka < plotCost(state, p.district)) return 'notEnoughTaka';
  return null;
}

export function canGrab(state: GameState, plot: number): ErrorKey | null {
  const p = plotById(state, plot);
  if (!p) return 'noSuchPlot';
  if (p.owned) return 'plotAlreadyOwned';
  return null;
}

export function canBuild(state: GameState, plot: number, category: Category): ErrorKey | null {
  const p = plotById(state, plot);
  if (!p) return 'noSuchPlot';
  if (!p.owned) return 'plotNotOwned';
  if (p.job) return 'permitPending';
  if (sideBizOn(state, plot)) return 'sideBizHere';
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
  if (p.job) return 'permitPending';
  if (isFrozen(state, plot)) return 'frozen';
  if (p.building.level >= BALANCE.maxLevel) return 'maxLevel';
  if (state.taka < upgradePlan(state, plot, count).cost) return 'notEnoughTaka';
  return null;
}

export function canMerge(state: GameState, a: number, b: number): ErrorKey | null {
  const blocker = mergeBlocker(state, a, b);
  if (blocker) return blocker;
  if (plotById(state, a)?.job || plotById(state, b)?.job) return 'permitPending';
  if (isFrozen(state, a) || isFrozen(state, b)) return 'frozen';
  const building = plotById(state, a)?.building;
  if (building && state.taka < mergeFee(building)) return 'notEnoughTaka';
  return null;
}

export function canSpeedMoney(state: GameState, plot: number): ErrorKey | null {
  const job = plotById(state, plot)?.job;
  if (!job || job.kind === 'fill' || (job.kind === 'merge' && !job.result)) return 'noPermit';
  if (isFrozen(state, plot)) return 'frozen';
  if (state.taka < speedMoneyCost(state, plot)) return 'notEnoughTaka';
  return null;
}

/** Taka back from an eviction drive: a share of the tier's base cost plus the upgrades paid for. */
export function evictRefund(state: GameState, plot: number): number {
  const b = plotById(state, plot)?.building;
  if (!b) return 0;
  // merged buildings start above level 1, so only the levels after that were paid for
  const from = b.tier > 1 ? Math.min(b.level, BALANCE.mergeResultLevel) : 1;
  const paid = (tierDef(b.category, b.tier)?.baseCost ?? 0) + upgradeCostN({ ...b, level: from }, b.level - from);
  return Math.floor(paid * CORRUPTION.evictRefund);
}

export function canEvict(state: GameState, plot: number): ErrorKey | null {
  const p = plotById(state, plot);
  if (!p) return 'noSuchPlot';
  if (!p.building) return 'plotEmpty';
  if (p.job) return 'permitPending';
  if (isFrozen(state, plot)) return 'frozen';
  if (!state.tutorial.done) return 'tutorialRunning';
  return null;
}

export function canInquiry(state: GameState, option: 'talkShow' | 'donation' | 'envelope'): ErrorKey | null {
  if (!state.inquiry) return 'notFrozen';
  if (option === 'talkShow' && state.inquiry.talked) return 'alreadyDone';
  if (state.taka < inquiryCost(state, option)) return 'notEnoughTaka';
  return null;
}

function withPlot(state: GameState, index: number, patch: Partial<Plot>, takaDelta: number): GameState {
  const plots = state.plots.map((p) => (p.index === index ? { ...p, ...patch } : p));
  return { ...state, plots, taka: state.taka + takaDelta };
}

const pay = (state: GameState, cost: number): GameState => ({ ...state, taka: state.taka - cost });

/** Single entry point for player actions. Pure: returns a new state, or the same state plus an error. */
export function applyAction(state: GameState, action: Action): ActionResult {
  const now = state.lastSimTime;
  switch (action.type) {
    case 'buyPlot': {
      const error = canBuyPlot(state, action.plot);
      if (error) return { state, error };
      return { state: growWorld(withPlot(state, action.plot, { owned: true }, -plotCost(state, plotById(state, action.plot)!.district))) };
    }
    case 'grab': {
      const error = canGrab(state, action.plot);
      if (error) return { state, error };
      const pond = Math.floor((plotById(state, action.plot)!.index * 7 + state.speedPaid) % 4);
      let s = withPlot(state, action.plot, { owned: true, grabbed: true, job: newJob('fill', now, CORRUPTION.grabFill, { pond }) }, 0);
      s = addHeat(s, CORRUPTION.mediaFromGrab, 0, CORRUPTION.committeeFromGrab);
      return { state: growWorld(s) };
    }
    case 'build': {
      const error = canBuild(state, action.plot, action.category);
      if (error) return { state, error };
      const result: Building = { category: action.category, tier: 1, level: 1 };
      const job = newJob('build', now, permitSeconds(state, 'build', 1), { result });
      return { state: withPlot(state, action.plot, { job }, -buildCost(action.category)) };
    }
    case 'upgrade': {
      const count = action.count ?? 1;
      const error = canUpgrade(state, action.plot, count);
      if (error) return { state, error };
      const b = plotById(state, action.plot)!.building!;
      const plan = upgradePlan(state, action.plot, count);
      const job = newJob('upgrade', now, permitSeconds(state, 'upgrade', b.tier, plan.levels), { levels: plan.levels });
      return { state: withPlot(state, action.plot, { job }, -plan.cost) };
    }
    case 'merge': {
      const left = leftOf(state, action.a, action.b);
      const right = left === action.a ? action.b : action.a;
      const error = canMerge(state, left, right);
      if (error) return { state, error };
      const b = plotById(state, left)!.building!;
      const result: Building = { category: b.category, tier: b.tier + 1, level: BALANCE.mergeResultLevel };
      const secs = permitSeconds(state, 'merge', result.tier);
      const lead = newJob('merge', now, secs, { result, partner: right });
      const lock = newJob('merge', now, secs, { partner: left });
      const plots = state.plots.map((p) => (p.index === left ? { ...p, job: lead } : p.index === right ? { ...p, job: lock } : p));
      return { state: { ...state, plots, taka: state.taka - mergeFee(b) } };
    }
    case 'speedMoney': {
      const error = canSpeedMoney(state, action.plot);
      if (error) return { state, error };
      let s = pay(state, speedMoneyCost(state, action.plot));
      s = addHeat({ ...s, speedPaid: s.speedPaid + 1 }, 0, 0, CORRUPTION.committeeFromSpeedMoney);
      s = completeJob(s, action.plot);
      return { state: updateUnlocks(s) };
    }
    case 'inquiry': {
      const error = canInquiry(state, action.option);
      if (error) return { state, error };
      let s = pay(state, inquiryCost(state, action.option));
      if (action.option === 'talkShow') {
        const inq = s.inquiry!;
        s = { ...s, inquiry: { ...inq, until: now + Math.max(0, inq.until - now) / 2, talked: true } };
      } else if (action.option === 'donation') {
        s = endInquiry(addInfluence(s, CORRUPTION.donationInfluence));
      } else {
        s = endInquiry(s);
        const [leaked, next] = rollLeak(s);
        s = next;
        if (leaked) s = { ...addHeat(s, CORRUPTION.mediaFromLeak, 0, 0), events: [...s.events, { kind: 'leak' }] };
      }
      return { state: s };
    }
    case 'poster': {
      const cost = posterCost(state);
      if (state.taka < cost) return { state, error: 'notEnoughTaka' };
      const live = state.posters.filter((t) => t > now);
      return { state: { ...pay(state, cost), posters: [...live, now + CORRUPTION.posterLength * 1000] } };
    }
    case 'payJournalists': {
      const cost = journalistCost(state);
      if (state.taka < cost) return { state, error: 'notEnoughTaka' };
      const s = pay(state, cost);
      return { state: { ...s, heat: { ...s.heat, media: Math.max(0, s.heat.media - CORRUPTION.journalistMedia) } } };
    }
    case 'hire': {
      const n = state.nephews[action.id];
      if (!nephewUnlocked(state, action.id)) return { state, error: 'nephewLocked' };
      if (n.hired) return { state, error: 'nephewHired' };
      const cost = nephewHireCost(state);
      if (state.taka < cost) return { state, error: 'notEnoughTaka' };
      return { state: { ...pay(state, cost), nephews: { ...state.nephews, [action.id]: { ...n, hired: true } } } };
    }
    case 'trainNephew': {
      const n = state.nephews[action.id];
      if (!n.hired) return { state, error: 'nephewNotHired' };
      if (n.level >= NEPHEW_MAX_LEVEL) return { state, error: 'nephewMaxed' };
      const cost = nephewTrainCost(state, action.id);
      if (state.taka < cost) return { state, error: 'notEnoughTaka' };
      return { state: { ...pay(state, cost), nephews: { ...state.nephews, [action.id]: { ...n, level: n.level + 1 } } } };
    }
    case 'fire': {
      const n = state.nephews[action.id];
      if (!n.hired) return { state, error: 'nephewNotHired' };
      const s = { ...state, nephews: { ...state.nephews, [action.id]: { ...n, hired: false } } };
      return { state: addHeat(s, 0, CORRUPTION.fireAnger, 0) };
    }
    case 'waterPump': {
      if (!state.plots.some((p) => p.building?.category === 'housing')) return { state, error: 'noHousing' };
      const cost = waterPumpCost(state);
      if (state.taka < cost) return { state, error: 'notEnoughTaka' };
      const s = pay(state, cost);
      return { state: { ...s, heat: { ...s.heat, anger: Math.max(0, s.heat.anger - CORRUPTION.waterPumpAnger) } } };
    }
    case 'bachelors': {
      if (state.bachelorsAllowed) return { state, error: 'alreadyDone' };
      return { state: { ...state, bachelorsAllowed: true, heat: { ...state.heat, anger: Math.max(0, state.heat.anger - CORRUPTION.bachelorsAnger) } } };
    }
    case 'eventChoice': {
      const error = canChoose(state, action.choice, action.plot);
      if (error) return { state, error };
      return { state: applyChoice(state, action.choice, action.plot) };
    }
    case 'flee': {
      const error = canFlee(state, action.destination);
      if (error) return { state, error };
      return { state: flee(state, action.destination, now) };
    }
    case 'evict': {
      const error = canEvict(state, action.plot);
      if (error) return { state, error };
      const housing = plotById(state, action.plot)!.building!.category === 'housing';
      let s = withPlot(state, action.plot, { building: null }, evictRefund(state, action.plot));
      s = housing
        ? addHeat(s, CORRUPTION.evictMediaHousing, CORRUPTION.evictAngerHousing, CORRUPTION.evictCommittee)
        : addHeat(s, CORRUPTION.evictMediaOther, CORRUPTION.evictAngerOther, CORRUPTION.evictCommittee);
      // a bag sitting on the bulldozed building goes with it
      if (s.bag?.plot === action.plot) s = scheduleBag({ ...s, bag: null }, now);
      return { state: s };
    }
    case 'skipTutorial':
      return { state: endTutorial(state) };
    case 'collectBag': {
      if (!state.bag) return { state, error: 'nothingToCollect' };
      const got = plotIncome(state, state.bag.plot) * BALANCE.bagSeconds;
      const next = { ...state, bag: null, taka: state.taka + got, lifetimeEarnings: state.lifetimeEarnings + got };
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
