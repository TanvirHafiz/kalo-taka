export type Category = 'housing' | 'food' | 'healthcare' | 'retail';

export const CATEGORIES: readonly Category[] = ['housing', 'food', 'healthcare', 'retail'];

export interface TierDef {
  tier: number;
  name: string;
  /** Income in Taka per second at level 1. */
  baseIncome: number;
  /** Build cost (tier 1), upgrade base and merge fee base. */
  baseCost: number;
}

import { MONEY_SCALE } from './balance';
import type { EventId } from './events';

const LAKH = 100_000;
const CRORE = 10_000_000;

/** Spec numbers below; MONEY_SCALE is applied once at the end. */

// Building ladders from the spec. Only tier 1 can be built; higher tiers come from merging.
const SPEC_LADDERS: Record<Category, TierDef[]> = {
  housing: [
    { tier: 1, name: 'Tin-Shed Ghor', baseIncome: 5, baseCost: 2_000 },
    { tier: 2, name: 'Semi-Pucca Bari', baseIncome: 18, baseCost: 8_000 },
    { tier: 3, name: 'Rod-Wala Dotola', baseIncome: 60, baseCost: 30_000 },
    { tier: 4, name: 'To-Let Bhaban', baseIncome: 220, baseCost: 1.2 * LAKH },
    { tier: 5, name: 'Duplex Mansion', baseIncome: 780, baseCost: 5 * LAKH },
    { tier: 6, name: 'Lake View Palace', baseIncome: 2_700, baseCost: 20 * LAKH },
    { tier: 7, name: 'Sky Tower', baseIncome: 9_500, baseCost: 80 * LAKH },
  ],
  food: [
    { tier: 1, name: 'Tong Tea Stall', baseIncome: 40, baseCost: 15_000 },
    { tier: 2, name: 'Biryani House', baseIncome: 140, baseCost: 60_000 },
    { tier: 3, name: 'Rooftop Café', baseIncome: 500, baseCost: 2.4 * LAKH },
    { tier: 4, name: 'Buffet Palace', baseIncome: 1_750, baseCost: 9 * LAKH },
    { tier: 5, name: 'Franchise Empire', baseIncome: 6_100, baseCost: 36 * LAKH },
  ],
  healthcare: [
    { tier: 1, name: 'Pharmacy', baseIncome: 150, baseCost: 1 * LAKH },
    { tier: 2, name: "Doctor's Chamber", baseIncome: 520, baseCost: 4 * LAKH },
    { tier: 3, name: 'Diagnostic Centre', baseIncome: 1_800, baseCost: 15 * LAKH },
    { tier: 4, name: 'Specialized Hospital', baseIncome: 6_400, baseCost: 60 * LAKH },
    { tier: 5, name: 'Super Specialty Hospital', baseIncome: 22_000, baseCost: 2.4 * CRORE },
  ],
  retail: [
    { tier: 1, name: 'Footpath Hawker Spot', baseIncome: 600, baseCost: 4 * LAKH },
    { tier: 2, name: 'Bazaar', baseIncome: 2_100, baseCost: 16 * LAKH },
    { tier: 3, name: 'Shopping Complex', baseIncome: 7_400, baseCost: 64 * LAKH },
    { tier: 4, name: 'Mega Mall', baseIncome: 26_000, baseCost: 2.6 * CRORE },
    { tier: 5, name: 'Galaxy Mall', baseIncome: 90_000, baseCost: 10 * CRORE },
  ],
};

export const BUILDINGS: Record<Category, TierDef[]> = Object.fromEntries(
  Object.entries(SPEC_LADDERS).map(([cat, tiers]) => [
    cat,
    tiers.map((t) => ({ ...t, baseIncome: t.baseIncome * MONEY_SCALE, baseCost: t.baseCost * MONEY_SCALE })),
  ]),
) as Record<Category, TierDef[]>;

/**
 * A category unlocks the first time the player owns housing of this tier, and stays unlocked.
 * Housing is open from the start.
 */
export const UNLOCK_HOUSING_TIER: Record<Category, number> = { housing: 0, food: 3, healthcare: 4, retail: 5 };

/** Patients a healthcare building holds at full occupancy, by tier (patients = occupancy x capacity). */
export const PATIENT_CAPACITY = [0, 12, 30, 80, 200, 480];

export interface NeighbourRule {
  /** Building that gets the bonus. */
  target: { category: Category; tier?: number };
  /** Neighbour that grants it (minTier inclusive). */
  neighbour: { category: Category; minTier?: number };
  /** Added to the income multiplier per qualifying neighbour (0.2 = +20%). */
  bonus: number;
}

/** Neighbour bonuses from the spec. Each qualifying neighbour adds its bonus (they stack). */
export const NEIGHBOUR_RULES: readonly NeighbourRule[] = [
  { target: { category: 'food' }, neighbour: { category: 'healthcare' }, bonus: 0.2 },
  { target: { category: 'healthcare', tier: 1 }, neighbour: { category: 'healthcare', minTier: 3 }, bonus: 0.3 },
  { target: { category: 'housing' }, neighbour: { category: 'retail', minTier: 3 }, bonus: 0.1 },
  { target: { category: 'healthcare' }, neighbour: { category: 'healthcare' }, bonus: -0.1 },
];

export interface DistrictDef {
  /** Name shown in the UI (invented). */
  name: string;
  /** Total income per second that unlocks this district. */
  unlockIncome: number;
  /** Event weight multipliers while this is your newest district (events are city-wide). */
  eventOdds?: Partial<Record<EventId, number>>;
}

/** Districts unlock in order as income grows. */
export const DISTRICTS: readonly DistrictDef[] = [
  { name: 'Mirpara', unlockIncome: 0, eventOdds: { loadShedding: 1.5 } },
  // the lake breeds mosquitoes
  { name: 'Dhanpur', unlockIncome: 5_000 * MONEY_SCALE, eventOdds: { dengue: 1.5, monsoon: 1.25 } },
  // diplomats and their motorcades
  { name: 'Gulmohor', unlockIncome: 2 * LAKH * MONEY_SCALE, eventOdds: { vip: 2, journalist: 1.5 } },
  // the new town is all flyovers and gas lines on paper
  { name: 'Purbopur', unlockIncome: 1 * CRORE * MONEY_SCALE, eventOdds: { flyover: 2.5, gas: 1.5 } },
  // a river island floods first and asks questions later
  { name: 'Notun Char', unlockIncome: 50 * CRORE * MONEY_SCALE, eventOdds: { monsoon: 2.5, journalist: 1.5 } },
];
