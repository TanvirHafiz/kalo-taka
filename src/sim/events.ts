// Random events: the scheduler, what each event does, the player's responses and side incomes.
// Pure functions over state; randomness comes from state.rng.
import { CORRUPTION } from '../config/balance';
import { EVENTS, EVENT_IDS, EVENT_TUNING as T, type EventId } from '../config/events';
import type { ErrorKey } from '../config/strings';
import type { ActiveEvent, GameState, SimEvent } from '../state/types';
import { rngStep } from '../util/rng';
import { addHeat, addInfluence, incomeSeconds } from './corruption';
import { baseIncome, plotIncome } from './economy';
import { plotById } from './layout';

const withEvent = (s: GameState, e: SimEvent): GameState => ({ ...s, events: [...s.events, e] });

export function isEventActive(state: GameState, id: EventId): boolean {
  return !!state.event && state.event.id === id && state.event.until > state.lastSimTime;
}

/** Whether an event can be rolled now. */
export function eventUnlocked(state: GameState, id: EventId): boolean {
  const built = state.plots.filter((p) => p.building);
  const housing = built.filter((p) => p.building!.category === 'housing').length;
  if (EVENTS[id].oncePerRun && state.doneThisRun.includes(id)) return false;
  switch (id) {
    case 'loadShedding':
    case 'monsoon':
      return built.length > 0;
    case 'hartal':
      return built.length >= T.hartalAtBuildings;
    case 'dengue':
      return built.some((p) => p.building!.category === 'healthcare');
    case 'rentHike':
    case 'gas':
      return housing >= T.housingForRentEvents;
    case 'vip':
      return built.some((p) => p.building!.tier >= 5);
    case 'journalist':
      return state.heat.media > T.journalistAtMedia;
    case 'prado':
      return state.nephews.dipu.hired;
    case 'election':
      return state.runPlayMs >= T.electionAtPlayMs;
    case 'ramadan':
      return state.runPlayMs >= T.ramadanAtPlayMs;
    case 'flyover':
      return built.some((p) => p.building!.category === 'retail');
  }
}

function rand(state: GameState): [number, GameState] {
  const [v, rng] = rngStep(state.rng);
  return [v, { ...state, rng }];
}

/** Start a specific event (also used by tests and the M6 debug panel). */
export function startEvent(state: GameState, id: EventId, now: number): GameState {
  let s = state;
  const ev: ActiveEvent = { id, start: now, until: now + EVENTS[id].duration * 1000 };
  const built = s.plots.filter((p) => p.building).map((p) => p.index);
  if (id === 'loadShedding') {
    // a random half of the buildings go dark
    const dark: number[] = [];
    for (const pid of built) {
      let v: number;
      [v, s] = rand(s);
      if (v < 0.5) dark.push(pid);
    }
    if (!dark.length && built.length) dark.push(built[0]!);
    ev.dark = dark;
  }
  if (id === 'monsoon') ev.boats = 0;
  if (id === 'gas') s = addHeat(s, 0, T.gasAnger, 0);
  if (id === 'flyover' && built.length) {
    let v: number;
    [v, s] = rand(s);
    const pick = built[Math.floor(v * built.length)]!;
    if (!s.frontage.includes(pick)) s = { ...s, frontage: [...s.frontage, pick] };
  }
  const lastEvents = [...s.lastEvents, id].slice(-T.noRepeat);
  const doneThisRun = s.doneThisRun.includes(id) ? s.doneThisRun : [...s.doneThisRun, id];
  return withEvent({ ...s, event: ev, lastEvents, doneThisRun }, { kind: 'eventStart', id });
}

/** Roll the next event when the play clock says so (never during catch-up). */
export function maybeStartEvent(state: GameState, now: number): GameState {
  if (state.event || state.runPlayMs < state.nextEventPlayMs) return state;
  const pool = EVENT_IDS.filter((id) => eventUnlocked(state, id) && !state.lastEvents.includes(id));
  let s = state;
  let gap: number;
  [gap, s] = rand(s);
  s = { ...s, nextEventPlayMs: s.runPlayMs + T.gapMinMs + gap * (T.gapMaxMs - T.gapMinMs) };
  if (!pool.length) return s;
  const total = pool.reduce((t, id) => t + EVENTS[id].weight, 0);
  let roll: number;
  [roll, s] = rand(s);
  let acc = roll * total;
  for (const id of pool) {
    acc -= EVENTS[id].weight;
    if (acc <= 0) return startEvent(s, id, now);
  }
  return startEvent(s, pool[pool.length - 1]!, now);
}

/** End the event: apply defaults for unanswered choices and close any side business. */
export function endEvent(state: GameState): GameState {
  const e = state.event;
  if (!e) return state;
  let s: GameState = { ...state, event: null, sideBiz: null };
  // an unanswered Prado crash gets paid for anyway
  if (e.id === 'prado' && !e.choice) s = { ...s, taka: Math.max(0, s.taka - incomeSeconds(s, T.pradoSeconds)) };
  return withEvent(s, { kind: 'eventEnd', id: e.id });
}

export function maybeEndEvent(state: GameState, now: number): GameState {
  return state.event && now >= state.event.until ? endEvent(state) : state;
}

/**
 * Continuous event effects over `dt` seconds: the journalist's Media Heat, and side incomes
 * (Diesel Supply from generators, the parking lot, the cylinder shop). Returns Taka earned.
 */
export function eventFlow(state: GameState, dt: number, incomeScale: number): { state: GameState; earned: number } {
  const e = state.event;
  if (!e || e.until <= state.lastSimTime - dt * 1000) return { state, earned: 0 };
  let s = state;
  let earned = 0;
  if (e.id === 'journalist' && e.choice !== 'ads') s = addHeat(s, T.journalistMediaPerSec * dt, 0, 0);
  if (s.sideBiz) earned += baseIncome(s) * T.sideBizShare * dt;
  if (e.id === 'loadShedding') {
    for (const pid of e.dark ?? []) if (s.generators.includes(pid)) earned += plotIncome(s, pid, false, false) * T.dieselShare * dt;
  }
  earned *= incomeScale;
  return { state: earned ? { ...s, taka: s.taka + earned, lifetimeEarnings: s.lifetimeEarnings + earned } : s, earned };
}

/** Cost of an event response, or 0 if free. */
export function choiceCost(state: GameState, choice: string): number {
  const e = state.event;
  if (!e) return 0;
  if (choice === 'generator') {
    const need = (e.dark ?? []).filter((pid) => !state.generators.includes(pid));
    return Math.max(CORRUPTION.minPrice, Math.ceil(need.reduce((t, pid) => t + plotIncome(state, pid, false, false), 0) * T.generatorSeconds));
  }
  if (choice === 'pay') return incomeSeconds(state, T.pradoSeconds);
  const secs: Record<string, number> = { nets: T.netsSeconds, gate: T.gateSeconds, ads: T.adsSeconds, iftar: T.iftarSeconds };
  return secs[choice] ? Math.max(CORRUPTION.minPrice, incomeSeconds(state, secs[choice]!)) : 0;
}

/** Choices that make sense for each event (the UI shows these). */
export const EVENT_CHOICES: Record<EventId, string[]> = {
  loadShedding: ['generator'],
  monsoon: ['boat'],
  hartal: ['parking'],
  dengue: ['nets'],
  rentHike: ['accept', 'decline'],
  gas: ['cylinder'],
  vip: ['gate'],
  journalist: ['ads', 'ignore'],
  prado: ['pay', 'blame'],
  election: ['spree'],
  ramadan: ['iftar'],
  flyover: ['ribbon'],
};

/** An empty plot you own with nothing pending, for a side business. */
export function freeLotFor(state: GameState, plot?: number): number | null {
  const ok = (p: GameState['plots'][number]) => p.owned && !p.building && !p.job;
  if (plot !== undefined) {
    const p = plotById(state, plot);
    return p && ok(p) ? p.index : null;
  }
  return state.plots.find(ok)?.index ?? null;
}

export function canChoose(state: GameState, choice: string, plot?: number): ErrorKey | null {
  const e = state.event;
  if (!e || e.until <= state.lastSimTime) return 'noEvent';
  if (!EVENT_CHOICES[e.id].includes(choice)) return 'noEvent';
  if (choice === 'boat') return (e.boats ?? 0) >= T.boatsPerMonsoon ? 'alreadyDone' : null;
  if (e.choice) return 'alreadyDone';
  if ((choice === 'parking' || choice === 'cylinder') && freeLotFor(state, plot) === null) return 'noEmptyPlot';
  if (choice === 'generator' && !(e.dark ?? []).some((pid) => !state.generators.includes(pid))) return 'alreadyDone';
  if (state.taka < choiceCost(state, choice)) return 'notEnoughTaka';
  return null;
}

/** Apply a response to the running event. */
export function applyChoice(state: GameState, choice: string, plot?: number): GameState {
  const e = state.event!;
  const now = state.lastSimTime;
  let s: GameState = { ...state, taka: state.taka - choiceCost(state, choice) };
  const mark = (x: GameState): GameState => ({ ...x, event: { ...x.event!, choice } });
  switch (choice) {
    case 'generator':
      return mark({ ...s, generators: [...new Set([...s.generators, ...(e.dark ?? [])])] });
    case 'boat': {
      const pay = incomeSeconds(s, T.boatSeconds);
      return { ...s, taka: s.taka + pay, lifetimeEarnings: s.lifetimeEarnings + pay, event: { ...e, boats: (e.boats ?? 0) + 1 } };
    }
    case 'parking':
    case 'cylinder':
      return mark({ ...s, sideBiz: { plot: freeLotFor(s, plot)!, kind: choice } });
    case 'nets':
      return mark(addInfluence(s, T.netsInfluence));
    case 'accept':
      s = addHeat({ ...s, rentHikeUntil: now + T.rentHikeSeconds * 1000 }, 0, T.rentHikeAnger, 0);
      return endEvent(mark(s));
    case 'decline':
      return endEvent(mark(s));
    case 'gate':
      return mark(addInfluence(s, T.gateInfluence));
    case 'ads':
    case 'ignore':
      return mark(s);
    case 'pay':
      return endEvent(mark(s));
    case 'blame':
      return endEvent(mark(addHeat(s, T.blameMedia, 0, 0)));
    case 'spree':
      return s;
    case 'iftar':
      return mark(addInfluence({ ...s, heat: { ...s.heat, anger: Math.max(0, s.heat.anger - T.iftarAnger) } }, T.iftarInfluence));
    case 'ribbon':
      return mark(addInfluence(s, T.ribbonInfluence));
  }
  return s;
}
