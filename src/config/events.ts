// Random events, prestige, offline earnings and tutorial tuning (M5).
import { MONEY_SCALE } from './balance';

export type EventId =
  | 'loadShedding' | 'monsoon' | 'hartal' | 'dengue' | 'rentHike' | 'gas'
  | 'vip' | 'journalist' | 'prado' | 'election' | 'ramadan' | 'flyover';

export const EVENT_IDS: readonly EventId[] = [
  'loadShedding', 'monsoon', 'hartal', 'dengue', 'rentHike', 'gas', 'vip', 'journalist', 'prado', 'election', 'ramadan', 'flyover',
];

export interface EventDef {
  /** Seconds the event runs. Instant events stay open this long for the player to respond. */
  duration: number;
  weight: number;
  /** Instant events apply once at the start and only wait for a choice. */
  instant?: boolean;
  /** Can happen once per run. */
  oncePerRun?: boolean;
}

export const EVENTS: Record<EventId, EventDef> = {
  loadShedding: { duration: 60, weight: 3 },
  monsoon: { duration: 90, weight: 3 },
  hartal: { duration: 60, weight: 2 },
  dengue: { duration: 120, weight: 2 },
  rentHike: { duration: 60, weight: 2, instant: true },
  gas: { duration: 90, weight: 2 },
  vip: { duration: 45, weight: 2 },
  journalist: { duration: 60, weight: 2 },
  prado: { duration: 60, weight: 1, instant: true },
  election: { duration: 180, weight: 2, oncePerRun: true },
  ramadan: { duration: 240, weight: 2, oncePerRun: true },
  flyover: { duration: 60, weight: 1, instant: true },
};

export const EVENT_TUNING = {
  /** Time between events, in ms of visible play. */
  gapMinMs: 180_000,
  gapMaxMs: 360_000,
  /** First event comes a bit sooner. */
  firstGapMs: 150_000,
  /** Events never repeat within the last this many. */
  noRepeat: 2,

  /** Unlock conditions. */
  hartalAtBuildings: 10,
  housingForRentEvents: 5,
  journalistAtMedia: 50,
  electionAtPlayMs: 30 * 60_000,
  ramadanAtPlayMs: 45 * 60_000,

  /** Income multipliers while an event runs. */
  loadSheddingMult: 0.5,
  monsoonHousingMult: 0.7,
  hartalMult: 0.3,
  dengueMult: 3,
  vipMult: 0.8,
  ramadanFoodMult: 1.5,
  /** Ramadan's food bonus applies in the evening (iftar time), in day phase. */
  ramadanEveningFrom: 0.7,
  ramadanEveningTo: 0.82,
  rentHikeMult: 1.2,
  rentHikeSeconds: 600,
  rentHikeAnger: 30,
  frontageBonus: 0.15,

  /** Responses (costs are seconds of base income). */
  generatorSeconds: 120,
  dieselShare: 0.02,
  boatSeconds: 10,
  boatsPerMonsoon: 6,
  sideBizShare: 0.05,
  netsSeconds: 30,
  netsInfluence: 15,
  gateSeconds: 30,
  gateInfluence: 25,
  adsSeconds: 30,
  journalistMediaPerSec: 1,
  pradoSeconds: 20,
  blameMedia: 5,
  gasAnger: 15,
  iftarSeconds: 30,
  iftarAnger: 40,
  iftarInfluence: 10,
  ribbonInfluence: 10,
  /** Election: posters at this price share, Influence gains times this. */
  electionPosterPrice: 0.5,
  electionInfluenceMult: 2,
} as const;

export type DestinationId = 'toronto' | 'kl' | 'dubai' | 'london' | 'island';

export const DESTINATIONS: readonly { id: DestinationId; atStars: number }[] = [
  { id: 'toronto', atStars: 1 },
  { id: 'kl', atStars: 10 },
  { id: 'dubai', atStars: 30 },
  { id: 'london', atStars: 75 },
  { id: 'island', atStars: 200 },
];

export const PRESTIGE = {
  /** offshoreStars = floor(sqrt(lifetimeEarnings / starDivisor)) - starsAlreadyEarned. */
  /** Spec: 1e7. Raised in the M6 balance pass so 3 stars are on offer after about 3.5 h. */
  starDivisor: 1.1e9 * MONEY_SCALE,
  incomePerStar: 0.1,
  /** The Flee button pulses when the offer is at least this share of current stars. */
  pulseShare: 0.5,
  /** Destination perks for the next run. */
  torontoHousing: 0.25,
  klPermitCut: 0.25,
  dubaiSpeedCut: 0.3,
  londonMediaDecay: 0.5,
  islandHeatCut: 0.25,
  /** Family perks by total stars. */
  perkPlotsAt: 5,
  perkPlots: 3,
  perkCashAt: 15,
  perkCash: 10 * 100_000 * MONEY_SCALE,
  perkEarlyUnlockAt: 40,
  perkShortInquiryAt: 100,
  perkInquirySeconds: 180,
  perkFreeDotolaAt: 250,
  cutsceneMs: 6000,
} as const;

export const OFFLINE = {
  /** Closed game earns this share of normal income, up to the cap. */
  rate: 0.25,
  capHours: 4,
  /** Step size while simulating time away (ms). */
  stepMs: 60_000,
  /** Mamun only reports time away longer than this (a quick reload is not "while you slept"). */
  reportMinMs: 60_000,
} as const;
