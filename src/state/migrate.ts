import { BALANCE, MONEY_SCALE } from '../config/balance';
import { BUILDINGS, CATEGORIES, UNLOCK_HOUSING_TIER, type Category } from '../config/buildings';
import { SAVE_VERSION, m5Defaults, noNephews } from './initialState';
import type { GameState } from './types';

type Raw = Record<string, unknown>;

/**
 * Migrations keyed by the version they upgrade FROM. Each returns data at version + 1.
 * Add one entry per bump of SAVE_VERSION; never edit an old entry.
 */
const MIGRATIONS: Record<number, (data: Raw) => Raw> = {
  // v1 -> v2 (M3): plots gain district and slot; categories, bags, briefcase and HUD meters appear.
  1: (d) => {
    const plots = Array.isArray(d.plots) ? (d.plots as Raw[]) : [];
    const now = typeof d.lastSimTime === 'number' ? d.lastSimTime : 0;
    let topHousing = 0;
    for (const p of plots) {
      const b = p.building as Raw | null;
      if (b && b.category === 'housing' && typeof b.tier === 'number') topHousing = Math.max(topHousing, b.tier);
    }
    return {
      ...d,
      plots: plots.map((p, i) => ({ ...p, district: 0, slot: typeof p.index === 'number' ? p.index : i })),
      unlocked: CATEGORIES.filter((c) => UNLOCK_HOUSING_TIER[c] <= topHousing),
      rng: typeof d.seed === 'number' ? d.seed >>> 0 : 1,
      bag: null,
      nextBagAt: now + BALANCE.bagMinMs,
      briefcaseUntil: 0,
      nextBriefcaseAt: now + BALANCE.briefcaseMinMs,
      boostUntil: 0,
      heat: { media: 0, anger: 0, committee: 0 },
      influence: 0,
      stars: 0,
    };
  },
  // v2 -> v3 (M4): permit jobs, posters, nephews, milestones, the inquiry and the event queue.
  2: (d) => {
    const plots = Array.isArray(d.plots) ? (d.plots as Raw[]) : [];
    let topTier = 0;
    let count = 0;
    for (const p of plots) {
      const b = p.building as Raw | null;
      if (b && typeof b.tier === 'number') {
        topTier = Math.max(topTier, b.tier);
        count += 1;
      }
    }
    const unlocked = Array.isArray(d.unlocked) ? (d.unlocked as string[]) : [];
    return {
      ...d,
      plots: plots.map((p) => ({ ...p, job: null })),
      posters: [],
      nephews: noNephews(),
      milestones: { firstMerge: topTier >= 2, firstInquiry: false, firstTier5: topTier >= 5 || unlocked.includes('retail'), maxBuildings: count },
      inquiry: null,
      bachelorsAllowed: false,
      speedPaid: 0,
      events: [],
    };
  },
  // v3 -> v4: all money x100 (MONEY_SCALE), the "tip" bag is now "chanda", and a start time
  // for the day counter (old saves start counting from their last save).
  3: (d) => {
    const scale = (v: unknown) => (typeof v === 'number' ? v * MONEY_SCALE : v);
    const bag = d.bag as Raw | null;
    return {
      ...d,
      taka: scale(d.taka),
      lifetimeEarnings: scale(d.lifetimeEarnings),
      bag: bag && bag.kind === 'tip' ? { ...bag, kind: 'chanda' } : bag,
      startedAt: typeof d.lastSimTime === 'number' ? d.lastSimTime : 0,
    };
  },
  // v4 -> v5 (M5): events, tutorial and prestige bookkeeping. A save with any progress skips the tutorial.
  4: (d) => {
    const plots = Array.isArray(d.plots) ? (d.plots as Raw[]) : [];
    const progressed = plots.some((p) => p.building) || plots.filter((p) => p.owned).length > 1;
    const districts = plots.reduce((m, p) => Math.max(m, typeof p.district === 'number' ? p.district + 1 : 1), 1);
    return { ...d, ...m5Defaults(), tutorial: { step: 0, done: progressed }, districtsSeen: districts };
  },
};

const finite = (v: unknown): boolean => typeof v === 'number' && Number.isFinite(v);

function isBuilding(x: unknown): boolean {
  if (x === null) return true;
  if (typeof x !== 'object') return false;
  const b = x as Raw;
  if (typeof b.category !== 'string' || !Object.hasOwn(BUILDINGS, b.category)) return false;
  const tiers = BUILDINGS[b.category as Category].length;
  return (
    Number.isInteger(b.tier) && (b.tier as number) >= 1 && (b.tier as number) <= tiers &&
    Number.isInteger(b.level) && (b.level as number) >= 1 && (b.level as number) <= BALANCE.maxLevel
  );
}

function isPlot(x: unknown, i: number): boolean {
  if (typeof x !== 'object' || x === null) return false;
  const p = x as Raw;
  return (
    p.index === i &&
    Number.isInteger(p.district) && (p.district as number) >= 0 &&
    Number.isInteger(p.slot) && (p.slot as number) >= 0 && (p.slot as number) < BALANCE.plotsPerRow &&
    (p.row === 'front' || p.row === 'back') &&
    typeof p.owned === 'boolean' &&
    typeof p.grabbed === 'boolean' &&
    isBuilding(p.building) &&
    (p.job === null || (typeof p.job === 'object' && typeof (p.job as Raw).kind === 'string' && finite((p.job as Raw).until)))
  );
}

function isGameState(x: unknown): x is GameState {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Raw;
  return (
    typeof s.version === 'number' &&
    typeof s.seed === 'number' &&
    finite(s.startedAt) &&
    typeof s.taka === 'number' &&
    Number.isFinite(s.taka) &&
    typeof s.lifetimeEarnings === 'number' &&
    typeof s.lastSimTime === 'number' &&
    Array.isArray(s.plots) &&
    s.plots.every(isPlot) &&
    Array.isArray(s.unlocked) &&
    s.unlocked.every((c) => typeof c === 'string' && (CATEGORIES as readonly string[]).includes(c)) &&
    finite(s.rng) && finite(s.nextBagAt) && finite(s.briefcaseUntil) && finite(s.nextBriefcaseAt) && finite(s.boostUntil) &&
    finite(s.influence) && finite(s.stars) &&
    typeof s.heat === 'object' && s.heat !== null &&
    Array.isArray(s.posters) && s.posters.every(finite) &&
    typeof s.nephews === 'object' && s.nephews !== null &&
    ['rony', 'polash', 'mithu', 'dipu'].every((k) => {
      const n = (s.nephews as Raw)[k] as Raw | undefined;
      return !!n && typeof n.hired === 'boolean' && Number.isInteger(n.level) && (n.level as number) >= 0 && (n.level as number) <= 5;
    }) &&
    typeof s.milestones === 'object' && s.milestones !== null &&
    (s.inquiry === null || (typeof s.inquiry === 'object' && Number.isInteger((s.inquiry as Raw).plot) && finite((s.inquiry as Raw).until))) &&
    typeof s.bachelorsAllowed === 'boolean' && finite(s.speedPaid) && Array.isArray(s.events) &&
    finite(s.runPlayMs) && finite(s.nextEventPlayMs) && finite(s.rentHikeUntil) && finite(s.districtsSeen) &&
    Array.isArray(s.lastEvents) && Array.isArray(s.doneThisRun) && Array.isArray(s.generators) && Array.isArray(s.frontage) &&
    (s.event === null || (typeof s.event === 'object' && typeof (s.event as Raw).id === 'string' && finite((s.event as Raw).until))) &&
    typeof s.tutorial === 'object' && s.tutorial !== null && typeof s.stats === 'object' && s.stats !== null &&
    (s.bag === null || (typeof s.bag === 'object' && Number.isInteger((s.bag as Raw).plot) && ['bhara', 'chanda', 'commission'].includes((s.bag as Raw).kind as string)))
  );
}

/** Bring any older save up to SAVE_VERSION. Returns null if it cannot be understood. */
export function migrate(data: unknown): GameState | null {
  if (typeof data !== 'object' || data === null) return null;
  let cur = data as Raw;
  let version = typeof cur.version === 'number' ? cur.version : 0;
  if (version > SAVE_VERSION) return null;
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return null;
    cur = step(cur);
    version += 1;
    cur.version = version;
  }
  return isGameState(cur) ? cur : null;
}
