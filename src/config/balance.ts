// All tuning numbers live here. Logic must read from this file, never hardcode.

export const BALANCE = {
  /** Fixed simulation step in milliseconds (4 ticks per second). */
  tickMs: 250,
  /** Longest real frame the loop will feed into the accumulator, in ms. Larger gaps go through catch-up. */
  maxFrameMs: 1000,
  /** Gap (in ms) after which a return to the tab is reported with a toast. */
  catchUpToastMinMs: 5000,

  startingTaka: 50_000,
  startingPlots: 1,

  /** Plots per district row. */
  plotsPerRow: 12,

  plotCostBase: 20_000,
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
} as const;

/** Visual pacing and street-life tuning. Read by render/ (and later by event timing). */
export const VISUAL = {
  /** One full day and night, in real milliseconds (spec: 6 minutes). */
  dayLengthMs: 360_000,
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
  trafficFillMin: 0.03,
  trafficFillPerDecade: 0.13,
  trafficFillMax: 1.08,
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
