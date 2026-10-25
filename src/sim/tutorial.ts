// The 90-second guided start. Manager Mamun's "starter loan" covers exactly the scripted step's
// cost (never anything else, never counted as earnings), and permits clear at once until it ends.
import { BALANCE } from '../config/balance';
import type { GameState, SimEvent } from '../state/types';
import { buildCost, plotCost, plotsOwned, upgradeCost } from './economy';
import { mergeFee } from './merge';

/** Step 7 is the closing line; after it the tutorial is done. */
export const TUTORIAL_LAST = 7;
/** Step 1 waits this long for the player to watch the money tick. */
const WATCH_MS = 5000;

const withEvent = (s: GameState, e: SimEvent): GameState => ({ ...s, events: [...s.events, e] });

function tinSheds(state: GameState) {
  return state.plots.filter((p) => (p.building?.category === 'housing' && p.building.tier === 1) || p.job?.result?.tier === 1);
}

/** Grant the shortfall for this step's scripted action. */
function loanFor(state: GameState, step: number): number {
  let need = 0;
  if (step === 3) need = plotCost(state);
  if (step === 4) need = buildCost('housing');
  if (step === 5) {
    for (const p of tinSheds(state).slice(0, 2)) {
      // a shed whose permit has not cleared yet still needs its upgrades paid for
      const b = p.building ?? p.job?.result;
      if (!b) continue;
      for (let lvl = b.level; lvl < BALANCE.maxLevel; lvl++) need += upgradeCost({ ...b, level: lvl });
    }
  }
  if (step === 6) {
    const sheds = tinSheds(state).filter((p) => p.building);
    if (sheds[0]) need = mergeFee(sheds[0].building!);
  }
  return Math.max(0, Math.ceil(need - state.taka));
}

function done(state: GameState, step: number, since: number): boolean {
  const sheds = tinSheds(state);
  switch (step) {
    case 0: return state.plots.some((p) => p.building || p.job?.kind === 'build');
    case 1: return state.runPlayMs - since >= WATCH_MS;
    case 2: return state.plots.some((p) => (p.building?.level ?? 0) >= 2 || p.job?.kind === 'upgrade');
    case 3: return plotsOwned(state) >= 2;
    case 4: return sheds.length >= 2;
    case 5: return sheds.filter((p) => p.building && p.building.level >= BALANCE.maxLevel && !p.job).length >= 2;
    case 6: return state.plots.some((p) => (p.building?.tier ?? 0) >= 2 || p.job?.kind === 'merge');
    default: return false;
  }
}

/** Move the tutorial along: check the step, give the next step's loan, announce it. */
export function advanceTutorial(state: GameState): GameState {
  const t = state.tutorial;
  if (t.done) return state;
  if (t.step >= TUTORIAL_LAST) return state;
  if (!done(state, t.step, t.since ?? 0)) return state;
  const step = t.step + 1;
  let s: GameState = { ...state, tutorial: { ...t, step, since: state.runPlayMs } };
  const loan = loanFor(s, step);
  if (loan > 0) s = withEvent({ ...s, taka: s.taka + loan }, { kind: 'loan', amount: loan });
  return withEvent(s, { kind: 'tutorial', step });
}

/** Finish (from the last line) or skip the tutorial. */
export function endTutorial(state: GameState): GameState {
  return { ...state, tutorial: { step: TUTORIAL_LAST, done: true } };
}
