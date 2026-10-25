export type Category = 'housing' | 'food' | 'healthcare' | 'retail';

export interface TierDef {
  tier: number;
  name: string;
  /** Income in Taka per second at level 1. */
  baseIncome: number;
  /** Build cost (tier 1), upgrade base and merge fee base. */
  baseCost: number;
}

const LAKH = 100_000;

// Housing ladder from the spec. Other categories arrive in M3.
export const BUILDINGS: Record<Category, TierDef[]> = {
  housing: [
    { tier: 1, name: 'Tin-Shed Ghor', baseIncome: 5, baseCost: 2_000 },
    { tier: 2, name: 'Semi-Pucca Bari', baseIncome: 18, baseCost: 8_000 },
    { tier: 3, name: 'Rod-Wala Dotola', baseIncome: 60, baseCost: 30_000 },
    { tier: 4, name: 'To-Let Bhaban', baseIncome: 220, baseCost: 1.2 * LAKH },
    { tier: 5, name: 'Duplex Mansion', baseIncome: 780, baseCost: 5 * LAKH },
    { tier: 6, name: 'Lake View Palace', baseIncome: 2_700, baseCost: 20 * LAKH },
    { tier: 7, name: 'Sky Tower', baseIncome: 9_500, baseCost: 80 * LAKH },
  ],
  food: [],
  healthcare: [],
  retail: [],
};

/** Categories the player can build in this milestone. */
export const BUILDABLE_CATEGORIES: readonly Category[] = ['housing'];

/** Placeholder colours per tier until the procedural generator lands in M2. */
export const PLACEHOLDER_COLORS: Record<Category, string[]> = {
  housing: ['#b8c4c2', '#e8a598', '#f2df8a', '#9cc9e8', '#f4efe4', '#a9dcc0', '#c9b6e4'],
  food: [],
  healthcare: [],
  retail: [],
};
