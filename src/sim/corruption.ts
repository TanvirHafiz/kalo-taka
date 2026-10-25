// The corruption layer: permits and speed money, heat meters, inquiries, Influence and nephews.
// Pure functions over state; the clock is state.lastSimTime (or `now` passed by the tick).
import { BALANCE, CORRUPTION, NEPHEWS, NEPHEW_MAX_LEVEL, RONY_AT_BUILDINGS, RONY_WAIT_MS, type NephewId } from '../config/balance';
import type { Building, GameState, Job, Plot, SimEvent } from '../state/types';
import { rngStep } from '../util/rng';
import { baseIncome, plotIncome, skimShare } from './economy';
import { EVENT_TUNING, PRESTIGE } from '../config/events';
import { plotById } from './layout';
import { scheduleBag } from './progress';

export const NEPHEW_IDS: readonly NephewId[] = ['rony', 'polash', 'mithu', 'dipu'];

const clampHeat = (v: number) => Math.min(CORRUPTION.heatMax, Math.max(0, v));

export function activeCampaigns(state: GameState, now = state.lastSimTime): number {
  return state.posters.filter((t) => t > now).length;
}

/** Influence used by every effect: donations/events plus +10 per active poster campaign, capped. */
export function effectiveInfluence(state: GameState, now = state.lastSimTime): number {
  return Math.min(CORRUPTION.influenceMax, state.influence + CORRUPTION.posterInfluence * activeCampaigns(state, now));
}

/** Influence cuts heat gain by up to 30%; the Undisclosed Island cuts another 25%. */
export function heatGainMult(state: GameState): number {
  const island = state.destination === 'island' ? 1 - PRESTIGE.islandHeatCut : 1;
  return (1 - CORRUPTION.influenceHeatCut * (effectiveInfluence(state) / CORRUPTION.influenceMax)) * island;
}

/** Add donation/event Influence; doubled during election season. */
export function addInfluence(state: GameState, amount: number): GameState {
  const election = state.event?.id === 'election' && state.event.until > state.lastSimTime ? EVENT_TUNING.electionInfluenceMult : 1;
  return { ...state, influence: Math.min(CORRUPTION.influenceMax, state.influence + amount * election) };
}

/** Influence gives up to 50% off speed money and bribes. */
export function bribeDiscount(state: GameState): number {
  return 1 - effectiveInfluence(state) / CORRUPTION.influenceDiscountDiv;
}

/** A nephew's effect if on the payroll, else 0. */
export function nephewEffect(state: GameState, id: NephewId): number {
  const n = state.nephews[id];
  return n.hired ? NEPHEWS[id].effect + NEPHEWS[id].effectPerLevel * n.level : 0;
}

export function nephewSkim(state: GameState, id: NephewId): number {
  const n = state.nephews[id];
  return n.hired ? Math.max(0, NEPHEWS[id].skim - NEPHEWS[id].skimPerLevel * n.level) : 0;
}

/** Share of all income the hired nephews keep. */
export function totalSkim(state: GameState): number {
  return skimShare(state);
}

export function nephewUnlocked(state: GameState, id: NephewId): boolean {
  const m = state.milestones;
  if (id === 'rony') return m.maxBuildings >= RONY_AT_BUILDINGS;
  if (id === 'polash') return m.firstMerge;
  if (id === 'mithu') return m.firstInquiry;
  return m.firstTier5;
}

/** Cost of `seconds` of the player's real income (unboosted, after the nephews' cut). */
export function incomeSeconds(state: GameState, seconds: number): number {
  return Math.ceil(baseIncome(state) * seconds);
}

export function nephewHireCost(state: GameState): number {
  return Math.max(CORRUPTION.minPrice, incomeSeconds(state, CORRUPTION.nephewHireSeconds));
}

export function nephewTrainCost(state: GameState, id: NephewId): number {
  const lvl = state.nephews[id].level;
  if (lvl >= NEPHEW_MAX_LEVEL) return Infinity;
  return Math.max(CORRUPTION.minPrice, incomeSeconds(state, CORRUPTION.nephewUpgradeSeconds[lvl]!));
}

export function posterCost(state: GameState): number {
  const election = state.event?.id === 'election' && state.event.until > state.lastSimTime ? EVENT_TUNING.electionPosterPrice : 1;
  return Math.max(CORRUPTION.minPrice, Math.ceil(incomeSeconds(state, CORRUPTION.posterSeconds) * election));
}

/** Cost of an inquiry option (bribes get the Influence discount). */
export function inquiryCost(state: GameState, option: 'talkShow' | 'donation' | 'envelope'): number {
  const secs = option === 'talkShow' ? CORRUPTION.talkShowSeconds : option === 'donation' ? CORRUPTION.donationSeconds : CORRUPTION.envelopeSeconds;
  return Math.max(CORRUPTION.minPrice, Math.ceil(incomeSeconds(state, secs) * bribeDiscount(state)));
}

/** Paying off journalists (a bribe, so Influence gives a discount). */
export function journalistCost(state: GameState): number {
  return Math.max(CORRUPTION.minPrice, Math.ceil(incomeSeconds(state, CORRUPTION.journalistSeconds) * bribeDiscount(state)));
}

/** Housing income for the water pump fix. */
export function waterPumpCost(state: GameState): number {
  let housing = 0;
  for (const p of state.plots) if (p.building?.category === 'housing') housing += plotIncome(state, p.index, false, false);
  return Math.max(CORRUPTION.minPrice, Math.ceil(housing * CORRUPTION.waterPumpSeconds));
}

/** Permit wait in seconds for a job, after Permit Bhai Polash's cut. */
export function permitSeconds(state: GameState, kind: 'build' | 'upgrade' | 'merge', tier: number, levels = 1): number {
  // during the tutorial, Mamun "knows the officer": permits clear almost at once
  if (!state.tutorial.done) return 1;
  const base = kind === 'build' ? CORRUPTION.permitBuild : kind === 'upgrade' ? CORRUPTION.permitUpgradePerTier * tier * levels : CORRUPTION.permitMergePerTier * tier;
  const kl = state.destination === 'kl' ? 1 - PRESTIGE.klPermitCut : 1;
  return base * (1 - nephewEffect(state, 'polash')) * kl;
}

/** speedMoney = remaining s x income/s x 0.5 x (1 - influence / 200), with a floor. */
export function speedMoneyCost(state: GameState, plot: number): number {
  const job = plotById(state, plot)?.job;
  if (!job || job.kind === 'fill') return Infinity;
  const remaining = Math.max(0, (job.until - state.lastSimTime) / 1000);
  const dubai = state.destination === 'dubai' ? 1 - PRESTIGE.dubaiSpeedCut : 1;
  const price = remaining * baseIncome(state) * CORRUPTION.speedMoneyFactor * (1 - effectiveInfluence(state) / CORRUPTION.influenceDiscountDiv) * dubai;
  return Math.max(CORRUPTION.minPrice, Math.ceil(price));
}

/** Add heat, reduced by Influence. */
export function addHeat(state: GameState, media: number, anger: number, committee: number): GameState {
  const k = heatGainMult(state);
  const h = state.heat;
  const cap = state.inquiry ? CORRUPTION.heatMax - 0.01 : CORRUPTION.heatMax;
  return { ...state, heat: { media: clampHeat(h.media + media * k), anger: clampHeat(h.anger + anger * k), committee: Math.min(cap, clampHeat(h.committee + committee * k)) } };
}

/** Heat meters, Influence fade over `dt` seconds. */
export function updateHeat(state: GameState, dt: number): GameState {
  const h = state.heat;
  const big = state.plots.filter((p) => p.building?.category === 'housing' && p.building.tier >= CORRUPTION.angerTier).length;
  const k = heatGainMult(state);
  const london = state.destination === 'london' ? 1 + PRESTIGE.londonMediaDecay : 1;
  const mediaDecay = CORRUPTION.mediaDecay * (1 + activeCampaigns(state)) * (1 + nephewEffect(state, 'mithu')) * london;
  const media = clampHeat(h.media - mediaDecay * dt);
  const anger = clampHeat(h.anger + (CORRUPTION.angerPerBigHousing * big * k - CORRUPTION.angerDecay) * dt);
  const fromMedia = h.media > CORRUPTION.mediaAlarm ? CORRUPTION.committeeFromMedia * k : 0;
  let committee = clampHeat(h.committee + (fromMedia - CORRUPTION.committeeDecay) * dt);
  // one inquiry at a time: hold the committee just under the trigger while it runs
  if (state.inquiry) committee = Math.min(committee, CORRUPTION.heatMax - 0.01);
  const influence = Math.max(0, state.influence - CORRUPTION.influenceFade * dt);
  return { ...state, heat: { media, anger, committee }, influence };
}

function withEvent(state: GameState, e: SimEvent): GameState {
  return { ...state, events: [...state.events, e] };
}

/** Start an inquiry when the committee reaches 100: a grabbed building first, else the top earner. */
export function maybeStartInquiry(state: GameState, now: number): GameState {
  if (state.inquiry || state.heat.committee < CORRUPTION.heatMax) return state;
  const built = state.plots.filter((p) => p.building);
  if (!built.length) return { ...state, heat: { ...state.heat, committee: CORRUPTION.inquiryCommitteeReset } };
  const grabbed = built.filter((p) => p.grabbed);
  const pool = grabbed.length ? grabbed : built;
  let target = pool[0]!;
  for (const p of pool) if (plotIncome(state, p.index, false) > plotIncome(state, target.index, false)) target = p;
  let s: GameState = {
    ...state,
    inquiry: { plot: target.index, until: now + (state.stars >= PRESTIGE.perkShortInquiryAt ? PRESTIGE.perkInquirySeconds : CORRUPTION.inquiryFreeze) * 1000, talked: false },
    milestones: { ...state.milestones, firstInquiry: true },
    heat: { ...state.heat, committee: CORRUPTION.heatMax - 0.01 },
  };
  // a bag waiting on the frozen building would be worth nothing: move it along
  if (s.bag?.plot === target.index) s = scheduleBag({ ...s, bag: null }, now);
  return withEvent(s, { kind: 'inquiry', plot: target.index });
}

/** End the inquiry: the freeze lifts and the committee resets to 30. */
export function endInquiry(state: GameState): GameState {
  if (!state.inquiry) return state;
  return withEvent({ ...state, inquiry: null, heat: { ...state.heat, committee: CORRUPTION.inquiryCommitteeReset } }, { kind: 'inquiryOver' });
}

export function maybeEndInquiry(state: GameState, now: number): GameState {
  return state.inquiry && now >= state.inquiry.until ? endInquiry(state) : state;
}

/** True if a plot is frozen by the running inquiry. */
export function isFrozen(state: GameState, plot: number): boolean {
  return state.inquiry?.plot === plot;
}

function patchPlots(state: GameState, patch: Record<number, Partial<Plot>>): GameState {
  return { ...state, plots: state.plots.map((p) => (patch[p.index] ? { ...p, ...patch[p.index] } : p)) };
}

/** Apply one finished job (also used by speed money). */
export function completeJob(state: GameState, plot: number): GameState {
  const p = plotById(state, plot);
  const job = p?.job;
  if (!p || !job) return state;
  switch (job.kind) {
    case 'build':
      return withEvent(patchPlots(state, { [plot]: { building: job.result ?? null, job: null } }), { kind: 'built', plot });
    case 'upgrade': {
      const b = p.building;
      if (!b) return patchPlots(state, { [plot]: { job: null } });
      const level = Math.min(BALANCE.maxLevel, b.level + (job.levels ?? 1));
      return withEvent(patchPlots(state, { [plot]: { building: { ...b, level }, job: null } }), { kind: 'upgraded', plot });
    }
    case 'fill':
      return withEvent(patchPlots(state, { [plot]: { job: null } }), { kind: 'filled', plot });
    case 'merge': {
      // the lock on the right plot points back to the left one, which holds the result
      if (!job.result) return job.partner !== undefined ? completeJob(state, job.partner) : state;
      const right = job.partner!;
      const rp = plotById(state, right);
      const oldLeft = p.building as Building, oldRight = rp?.building as Building;
      let s = patchPlots(state, { [plot]: { building: job.result, job: null }, [right]: { building: null, job: null } });
      s = { ...s, milestones: { ...s.milestones, firstMerge: true } };
      // the inquiry follows the building into the merged result; a bag on the freed plot goes
      if (s.inquiry?.plot === right) s = { ...s, inquiry: { ...s.inquiry, plot } };
      if (s.bag?.plot === right) s = scheduleBag({ ...s, bag: null }, s.lastSimTime);
      return withEvent(s, { kind: 'merged', left: plot, right, oldLeft, oldRight });
    }
  }
}

/** Finish every job due by `now`, earliest first (ties by plot id). */
export function completeDueJobs(state: GameState, now: number): GameState {
  const due = state.plots
    .filter((p) => p.job && p.job.until <= now && !(p.job.kind === 'merge' && !p.job.result))
    .sort((a, b) => a.job!.until - b.job!.until || a.index - b.index);
  let s = state;
  for (const p of due) s = completeJob(s, p.index);
  return s;
}

/** Milestones that unlock nephews: most buildings owned at once, first tier 5. */
export function updateMilestones(state: GameState): GameState {
  const count = state.plots.filter((p) => p.building).length;
  const tier5 = state.plots.some((p) => (p.building?.tier ?? 0) >= 5);
  const m = state.milestones;
  if (count <= m.maxBuildings && (m.firstTier5 || !tier5)) return state;
  return { ...state, milestones: { ...m, maxBuildings: Math.max(m.maxBuildings, count), firstTier5: m.firstTier5 || tier5 } };
}

/** Rony collects a bag that has waited RONY_WAIT_MS, at his share of its value. */
export function ronyCollects(state: GameState, now: number, incomeScale = 1): GameState {
  if (!state.bag || !state.nephews.rony.hired) return state;
  if (now < (state.bag.at ?? 0) + RONY_WAIT_MS) return state;
  const pay = plotIncome(state, state.bag.plot) * BALANCE.bagSeconds * nephewEffect(state, 'rony') * incomeScale;
  const s = { ...state, bag: null, taka: state.taka + pay, lifetimeEarnings: state.lifetimeEarnings + pay };
  return withEvent(scheduleBag(s, now), { kind: 'bagAuto', amount: pay });
}

/** Earliest pending deadline after `t` (jobs, inquiry, posters, boost), for catch-up stepping. */
export function nextDeadline(state: GameState, t: number): number {
  let next = Infinity;
  const consider = (v: number) => {
    if (v > t && v < next) next = v;
  };
  for (const p of state.plots) if (p.job) consider(p.job.until);
  if (state.inquiry) consider(state.inquiry.until);
  for (const e of state.posters) consider(e);
  consider(state.boostUntil);
  if (state.event) consider(state.event.until);
  consider(state.rentHikeUntil);
  return next;
}

/** An envelope leak roll from the state rng. */
export function rollLeak(state: GameState): [boolean, GameState] {
  const [v, rng] = rngStep(state.rng);
  return [v < CORRUPTION.envelopeLeakChance, { ...state, rng }];
}

export function newJob(kind: Job['kind'], now: number, seconds: number, extra: Partial<Job> = {}): Job {
  return { kind, start: now, until: now + Math.round(seconds * 1000), ...extra };
}
