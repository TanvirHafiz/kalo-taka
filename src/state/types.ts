import type { NephewId } from '../config/balance';
import type { Category } from '../config/buildings';
import type { DestinationId, EventId } from '../config/events';
import type { ErrorKey } from '../config/strings';

export interface Building {
  category: Category;
  tier: number;
  level: number;
  /** The seed its looks come from, once it has been relocated (otherwise its plot's id). */
  look?: number;
}

export type Row = 'front' | 'back';

export type JobKind = 'build' | 'upgrade' | 'merge' | 'fill' | 'move';

/**
 * Work waiting on a permit (or on sand trucks). Paid up front; the change lands at `until`.
 * build: plot.building stays null until done, `result` is the new building.
 * upgrade: the building keeps earning at its old level, `levels` are added when done.
 * merge: on the left plot with `result`; the right plot holds a lock job pointing back (`partner`).
 * fill: a grabbed plot being filled in; `pond` picks pond/wetland/playground/riverbank.
 */
export interface Job {
  kind: JobKind;
  start: number;
  until: number;
  levels?: number;
  partner?: number;
  result?: Building;
  pond?: number;
}

export interface Plot {
  /** Stable id. Never use it for position: plots are appended as districts and rows unlock. */
  index: number;
  district: number;
  row: Row;
  /** Position within the district row, 0..11. Neighbours differ by one slot. */
  slot: number;
  owned: boolean;
  /** Grabbed plots keep this flag even after a merge empties them. */
  grabbed: boolean;
  building: Building | null;
  job: Job | null;
}

export type BagKind = 'bhara' | 'chanda' | 'commission';

export interface GameState {
  version: number;
  seed: number;
  /** Epoch ms when this game began (for the day and month counter). Survives prestige. */
  startedAt: number;
  taka: number;
  lifetimeEarnings: number;
  plots: Plot[];
  /** Wall-clock epoch ms of the last simulated moment (Date.now() basis). The sim's clock. */
  lastSimTime: number;
  /** Categories ever unlocked (they never lock again). */
  unlocked: Category[];
  /** mulberry32 state for sim randomness (bags, briefcase timing). */
  rng: number;
  /** The floating cash bag, if one is waiting to be tapped. */
  /** `at`: when it appeared (sim ms); missing in older saves. */
  bag: { plot: number; kind: BagKind; at?: number } | null;
  nextBagAt: number;
  /** Golden briefcase is visible until this time (0 = not shown). */
  briefcaseUntil: number;
  nextBriefcaseAt: number;
  /** 3x income until this time. */
  boostUntil: number;
  /** Heat meters, each 0..100. */
  heat: { media: number; anger: number; committee: number };
  /** Influence from donations and events (fades). Effective Influence adds active posters. */
  influence: number;
  /** Offshore Stars (M5). */
  stars: number;
  /** End times of active poster campaigns. */
  posters: number[];
  nephews: Record<NephewId, { hired: boolean; level: number }>;
  milestones: { firstMerge: boolean; firstInquiry: boolean; firstTier5: boolean; maxBuildings: number };
  /** The one running inquiry: the frozen plot and when it ends. */
  inquiry: { plot: number; until: number; talked?: boolean } | null;
  bachelorsAllowed: boolean;
  /** Speed money payments made (rotates the button label). */
  speedPaid: number;
  /** Things that happened inside the sim for the UI to show (drained by main each frame). */
  events: SimEvent[];

  /** Visible play time this run (ms); drives the event clock and once-per-run events. */
  runPlayMs: number;
  /** The one running random event. */
  event: ActiveEvent | null;
  nextEventPlayMs: number;
  lastEvents: EventId[];
  doneThisRun: EventId[];
  /** Plots with a generator (immune to load-shedding, earn Diesel Supply). */
  generators: number[];
  /** January rent hike accepted: housing +20% until this time. */
  rentHikeUntil: number;
  /** Plots facing a new flyover: +15% income for the rest of the run. */
  frontage: number[];
  /** A temporary side business on an empty plot during an event. */
  sideBiz: { plot: number; kind: 'parking' | 'cylinder' } | null;
  tutorial: { step: number; done: boolean; since?: number };
  /** Next-run perk chosen when fleeing. */
  destination: DestinationId | null;
  stats: { runs: number; bestIncome: number };
  /** Highest number of districts ever opened (kept for the codex). */
  districtsSeen: number;
  /** What the nephews took and brought in this run (missing in older saves = nothing yet). */
  ledger?: NephewLedger;
}

export interface NephewLedger {
  /** Taka each nephew has skimmed off your income. */
  skimmed: Partial<Record<NephewId, number>>;
  /** Bags Rony collected, what he handed over, and what he kept. */
  ronyBags: number;
  ronyCollected: number;
  ronyKept: number;
}

export interface ActiveEvent {
  id: EventId;
  start: number;
  until: number;
  /** Load-shedding: plots that went dark. */
  dark?: number[];
  /** Monsoon: boats tapped so far. */
  boats?: number;
  /** A response already taken (one per event). */
  choice?: string;
}

export type SimEvent =
  | { kind: 'built'; plot: number }
  | { kind: 'upgraded'; plot: number }
  | { kind: 'merged'; left: number; right: number; oldLeft: Building; oldRight: Building }
  | { kind: 'filled'; plot: number }
  | { kind: 'inquiry'; plot: number }
  | { kind: 'inquiryOver' }
  | { kind: 'leak' }
  | { kind: 'bagAuto'; amount: number }
  | { kind: 'eventStart'; id: EventId }
  | { kind: 'eventEnd'; id: EventId }
  | { kind: 'offline'; earned: number; gross: number }
  | { kind: 'tutorial'; step: number }
  | { kind: 'loan'; amount: number }
  | { kind: 'fled'; stars: number }
  | { kind: 'moved'; from: number; to: number };

export type UpgradeCount = 1 | 10 | 'max';

export type Action =
  | { type: 'buyPlot'; plot: number }
  | { type: 'build'; plot: number; category: Category }
  | { type: 'upgrade'; plot: number; count?: UpgradeCount }
  | { type: 'merge'; a: number; b: number }
  | { type: 'collectBag' }
  | { type: 'collectBriefcase' }
  | { type: 'speedMoney'; plot: number }
  | { type: 'grab'; plot: number }
  | { type: 'inquiry'; option: 'talkShow' | 'donation' | 'envelope' }
  | { type: 'poster' }
  | { type: 'payJournalists' }
  | { type: 'hire'; id: NephewId }
  | { type: 'trainNephew'; id: NephewId }
  | { type: 'fire'; id: NephewId }
  | { type: 'waterPump' }
  | { type: 'bachelors' }
  | { type: 'eventChoice'; choice: string; plot?: number }
  | { type: 'flee'; destination: DestinationId }
  | { type: 'skipTutorial' }
  | { type: 'evict'; plot: number }
  | { type: 'relocate'; from: number; to: number };

export interface ActionResult {
  state: GameState;
  error?: ErrorKey;
}
