// All tuning numbers live here. Logic must read from this file, never hardcode.

/**
 * Every amount of Taka in the game (costs, incomes, thresholds) is the spec's number times this.
 * Costs and incomes scale together, so pacing is unchanged; only the numbers on screen grow.
 */
export const MONEY_SCALE = 100;

export const BALANCE = {
  /** Fixed simulation step in milliseconds (4 ticks per second). */
  tickMs: 250,
  /** Longest real frame the loop will feed into the accumulator, in ms. Larger gaps go through catch-up. */
  maxFrameMs: 1000,
  /** Gap (in ms) after which a return to the tab is reported with a toast. */
  catchUpToastMinMs: 5000,

  startingTaka: 50_000 * MONEY_SCALE,
  startingPlots: 1,

  /** Plots per district row. */
  plotsPerRow: 12,

  plotCostBase: 20_000 * MONEY_SCALE,
  plotCostGrowth: 1.35,

  upgradeCostGrowth: 1.18,
  /** Each level above 1 adds this fraction of base income. */
  incomePerLevel: 0.25,
  maxLevel: 10,

  /** Merge fee is this multiple of the target tier's baseCost. */
  mergeFeeMult: 2,

  /** Occupancy before heat/anger effects (those arrive in M4). */
  baseOccupancy: 0.9,
  minOccupancy: 0.5,
  maxOccupancy: 1.0,

  autosaveMs: 10_000,

  /** The back row opens once this many plots are owned. */
  backRowAtPlots: 20,
  /** Back-row buildings earn this share of normal income. */
  backRowIncome: 0.8,

  /** Cash bags: one at a time, the next appears this long after the last was collected (ms). */
  bagMinMs: 20_000,
  bagMaxMs: 40_000,
  /** Tapping a bag pays this many seconds of that building's income. */
  bagSeconds: 30,
  /** Golden briefcase: appears every 5 to 8 minutes, stays 10 s, gives 3x income for 60 s. */
  briefcaseMinMs: 300_000,
  briefcaseMaxMs: 480_000,
  briefcaseVisibleMs: 10_000,
  briefcaseBoostMs: 60_000,
  briefcaseMult: 3,
} as const;

/** Corruption layer tuning (M4). Times in seconds unless noted. */
export const CORRUPTION = {
  /** Permit waits: build tier 1, upgrade per level per tier, merge per target tier. */
  permitBuild: 30,
  permitUpgradePerTier: 5,
  permitMergePerTier: 60,
  /** speedMoney = remaining s x income/s x this x (1 - influence / influenceDiscountDiv). */
  speedMoneyFactor: 0.5,
  influenceDiscountDiv: 200,

  /** Heat meters run 0..100. */
  heatMax: 100,
  mediaDecay: 0.5,
  angerDecay: 0.2,
  committeeDecay: 0.1,
  /** Committee rises this much per second while Media Heat is above mediaAlarm. */
  mediaAlarm: 60,
  committeeFromMedia: 1,
  committeeFromSpeedMoney: 1,
  committeeFromGrab: 5,
  mediaFromGrab: 15,
  mediaFromLeak: 10,
  /** Passive Tenant Anger per second from each big housing block (tier >= angerTier). */
  angerPerBigHousing: 0.03,
  angerTier: 4,
  /** Occupancy: housing x (1 - anger / angerDiv), others x (1 - media / mediaDiv). */
  angerDiv: 200,
  mediaDiv: 250,
  /** Influence cuts heat gain by up to this share at 100 Influence. */
  influenceHeatCut: 0.3,

  /** Inquiry: freeze length (s), Committee after it starts. */
  inquiryFreeze: 300,
  inquiryCommitteeReset: 30,
  talkShowSeconds: 30,
  donationSeconds: 60,
  donationInfluence: 20,
  envelopeSeconds: 120,
  envelopeLeakChance: 0.25,

  /** Land grab: pond-fill animation length (s). */
  grabFill: 20,

  /** Posters: cost in seconds of income, campaign length (s), Influence while active. */
  posterSeconds: 20,
  posterLength: 600,
  posterInfluence: 10,
  /** Influence from donations and events fades by this much per second (about 1 per minute). */
  influenceFade: 1 / 60,
  influenceMax: 100,

  /** Tenant fixes. */
  waterPumpSeconds: 15,
  waterPumpAnger: 20,
  bachelorsAnger: 10,
  /** Firing a nephew: the family is upset. */
  fireAnger: 15,

  /** Nephews: hire costs this many seconds of income; upgrades cost these (5 levels). */
  nephewHireSeconds: 120,
  nephewUpgradeSeconds: [180, 360, 720, 1440, 2880],
  /** Paying off journalists: seconds of income (Influence discount applies) and Media Heat removed. */
  journalistSeconds: 45,
  journalistMedia: 25,
  /**
   * Eviction drive: bulldoze a building to free its plot. Refunds this share of what the building
   * cost (its tier's base cost plus the upgrades it has had). Heat depends on who gets thrown out.
   */
  evictRefund: 0.25,
  evictAngerHousing: 25,
  evictMediaHousing: 15,
  evictAngerOther: 5,
  evictMediaOther: 8,
  evictCommittee: 5,
  /** The button needs a second tap within this many ms. */
  evictConfirmMs: 3000,
  /** Floor for every income-scaled price (so nothing is free when income is tiny). */
  minPrice: 500 * MONEY_SCALE,
} as const;

export type NephewId = 'rony' | 'polash' | 'mithu' | 'dipu';

export interface NephewDef {
  /** Skim at level 0, and how much each upgrade lowers it. */
  skim: number;
  skimPerLevel: number;
  /** Base effect and its gain per level (meaning depends on the nephew). */
  effect: number;
  effectPerLevel: number;
}

/** Nephew effects. Rony: bag value share. Polash: permit wait cut. Mithu: extra Media Heat decay. Dipu: offline cap (hours, M5). */
export const NEPHEWS: Record<NephewId, NephewDef> = {
  rony: { skim: 0.03, skimPerLevel: 0.003, effect: 0.5, effectPerLevel: 0.1 },
  polash: { skim: 0.04, skimPerLevel: 0.004, effect: 0.25, effectPerLevel: 0.05 },
  mithu: { skim: 0.03, skimPerLevel: 0.003, effect: 0.5, effectPerLevel: 0.2 },
  dipu: { skim: 0.02, skimPerLevel: 0.002, effect: 8, effectPerLevel: 1 },
};
/** Buildings owned at once that unlock Rony. */
export const RONY_AT_BUILDINGS = 5;
/** Rony leaves a new bag alone this long, so a player who is watching can tap it at full value. */
export const RONY_WAIT_MS = 10_000;
/** Max nephew upgrade level. */
export const NEPHEW_MAX_LEVEL = 5;

/** Visual pacing and street-life tuning. Read by render/ (and later by event timing). */
/** The guided start. */
export const TUTORIAL = {
  /** Step 1 waits this long for the player to watch the money tick. */
  watchMs: 5000,
  /** However it went, the tutorial (and its 1 s permits) ends after this much play. */
  maxPlayMs: 15 * 60_000,
} as const;

export const VISUAL = {
  /** One full day and night, in real milliseconds (spec: 6 minutes). */
  dayLengthMs: 360_000,
  /** Days in an in-game month (for the calendar). */
  daysPerMonth: 30,
  /** Day phase (0 = midnight, 0.5 = noon) where dawn and dusk are centred. */
  dawnPhase: 0.25,
  duskPhase: 0.75,
  /** Half-width of the dawn/dusk transitions, in day phase. */
  twilight: 0.06,
  /** Share of windows that light up at night. */
  litWindowShare: 0.62,

  /**
   * Traffic as a share of each lane's capacity: min + perDecade * log10(income/s + 1), capped.
   * Above 1.0 the lanes are full and traffic becomes a permanent jam (the wealth signal).
   */
  trafficFillMin: 0.02,
  trafficFillPerDecade: 0.075,
  trafficFillMax: 1.04,
  /** Lowest speed (world units/s) a jammed vehicle creeps at, so the jam is never frozen. */
  jamCrawl: 3,
  /** Pedestrians: base plus some per building, capped. */
  peopleBase: 4,
  peoplePerBuilding: 1.5,
  peopleMax: 32,

  /** Merge animation phases, in ms (spec: rise over 1.5 s). */
  mergeShakeMs: 500,
  mergeRiseMs: 1500,
  buildRiseMs: 700,
  upgradePopMs: 280,
} as const;
