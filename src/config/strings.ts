import { BALANCE } from './balance';

// Every player-facing string lives here so a Bangla translation can be added later.
// Rule: no em dashes in in-game text.

export const STRINGS = {
  title: 'Kalo Taka Private Limited',
  disclaimer: 'Any resemblance to any real bhai is purely coincidental.',
  start: 'Start',
  tagline: 'From tin shed to sky tower. Paperwork optional.',

  hud: {
    taka: 'Taka',
    income: 'Income',
    plots: 'Plots',
    media: 'Media Heat',
    anger: 'Tenant Anger',
    committee: 'Committee',
    influence: 'Influence',
    stars: 'Offshore Stars',
    boost: '3x income',
  },

  buttons: {
    build: 'Build',
    posters: 'Posters',
    nephews: 'Nephews',
    flee: 'Flee',
    settings: 'Settings',
    later: '{name} opens in a later update.',
  },

  build: {
    title: 'Build',
    onPlot: 'On plot #{n}',
    noEmptyPlot: 'Buy or clear a plot first, sir.',
    locked: 'Unlocks with your first {tier}',
    perSec: '{rate} at level 1',
  },

  categories: {
    housing: 'Housing',
    food: 'Food',
    healthcare: 'Healthcare',
    retail: 'Retail',
  },

  district: {
    lockedSign: '{name} opens at {rate}',
    welcome: 'Welcome to {name}',
  },

  plot: {
    emptyTitle: 'Empty plot #{n}',
    unownedTitle: 'Plot #{n} for sale',
    buyLegally: 'Buy legally',
    build: 'Build {name}',
    upgrade: 'Upgrade',
    merge: 'Merge with #{n}',
    mergeHint: 'Needs a maxed neighbour of the same type',
    tierLevel: 'Tier {tier}, Level {level}',
    maxLevel: 'Level {max} (maxed)',
    incomeLine: 'Earns {rate}',
    bonusLine: 'Neighbours: {bonus}',
    backRow: 'Back row: earns 80%',
    patients: '{n} patients',
    buyX1: 'x1',
    buyX10: 'x10',
    buyMax: 'Max',
    upgradeN: 'Upgrade x{n}',
    close: 'Close',
  },

  /** Healthcare: each level is sold as a new test. Index = level. */
  testsByLevel: [
    '',
    'Level 1: Blood pressure, once',
    'Level 2: Sugar test for everyone',
    'Level 3: X-ray, just to be safe',
    'Level 4: ECG for a sprained ankle',
    'Level 5: Full body checkup package',
    'Level 6: Vitamin D test for everyone',
    'Level 7: MRI with free biscuit',
    'Level 8: Second opinion, same doctor',
    'Level 9: 14 tests, 1 price',
    'Level 10: Test to see if tests needed',
  ],

  bags: {
    bhara: 'bhara',
    tip: 'tip',
    commission: 'commission',
    collected: '{kind} collected: {amount}',
  },

  errors: {
    notEnoughTaka: 'Not enough Taka, sir.',
    plotNotOwned: 'You do not own this plot. Yet.',
    plotAlreadyOwned: 'Already yours, sir.',
    plotOccupied: 'Something is already built here.',
    plotEmpty: 'Nothing to upgrade here.',
    noSuchPlot: 'That plot does not exist.',
    maxLevel: 'Already at level {max}. Time to merge.',
    notAdjacent: 'Plots must be next to each other.',
    differentType: 'Buildings must be the same type and tier.',
    notMaxed: 'Both buildings must be level {max}.',
    maxTier: 'This is the tallest tower. Even the sky said no.',
    notBuildable: 'Permit office says this category is not open yet.',
    noPlotsLeft: 'No plots left in this district.',
    nothingToCollect: 'Too late, sir. Someone else took it.',
  },

  art: {
    toLet: 'TO-LET',
    forSale: 'JOMI BIKROY',
    forSaleSub: 'for sale',
    reserved: 'COMING SOON',
    reservedSub: 'by the owner',
    helipad: 'H',
    cha: 'CHA 10 TK',
    buffet: 'All You Can Eat ৳2,999',
    friday: 'Doctor sits Friday only',
    tests: '14 tests, 1 price',
    emergency: 'EMERGENCY',
    vip: 'VIP WING',
    outOfOrder: 'OUT OF ORDER',
    sale: 'SALE SALE',
    footpathRent: 'Footpath for rent',
    escalator: 'ESCALATOR!',
    cinema: 'CINEMA',
    themePark: 'INDOOR THEME PARK',
    flyover: 'OWN EXIT',
    biryani: 'KACCHI READY',
  },

  toasts: {
    welcomeBack: 'While you were away, the buildings collected {amount}.',
    built: '{name} built. Tenants already queueing.',
    merged: 'Merged into {name}!',
    loadFailed: 'Old save was damaged. Started fresh, backup kept.',
    briefcase: 'Envelope received. Do not ask from whom.',
    unlockedCategory: '{name} unlocked. The permit office is suddenly friendly.',
    district: '{name} is open for business. And for grabbing.',
    backRow: 'Back row unlocked. Plots behind plots, sir.',
  },
} as const;

export type ErrorKey = keyof typeof STRINGS.errors;

/** Signboard name word lists: first word + second word. All invented. */
export const NAME_WORDS = {
  housing: {
    first: ['Shanti', 'Rahman', 'Ma', 'Bhai Bhai', 'Golden', 'Royal', 'Nur', 'Moyna', 'Dulal', 'Kobutor', 'Shapla', 'Bismillah'],
    second: ['Nibash', 'Villa', 'Tower', 'Bhaban', 'Heights', 'Kutir', 'Mansion', 'Palace', 'Garden'],
  },
  healthcare: {
    first: ['Modern', 'Hi-Tech', 'Popular', 'Ibn', 'Life Care', 'Shefa', 'Arogya', 'New Hope', 'Sunrise', 'Moyna'],
    second: ['Diagnostic', 'Medical', 'Hospital', 'Clinic', 'Health Point', 'Care Centre'],
  },
  food: {
    first: ['Star', 'Haji', 'Nanna', "Sultan's", 'Kacchi', 'Old Town', 'Mama', 'Bhai Bhai', 'Royal', 'Moja'],
    second: ['Biryani', 'Kitchen', 'Café', 'Hotel & Restaurant', 'Kabab Ghor', 'Tea Point'],
  },
  retail: {
    first: ['Galaxy', 'Padma', 'Twin', 'New', 'Metro', 'Jomuna', 'Shapla', 'Rupali', 'Unique'],
    second: ['Plaza', 'City', 'Complex', 'Market', 'Shopping Centre', 'Bitan'],
  },
} as const;

/**
 * Lowercased full names that must never be generated, in case a combination
 * collides with a real, well-known brand or building. Extend as needed.
 */
export const NAME_BLOCKLIST: readonly string[] = [
  'royal tower', 'golden tower',
  'haji biryani', 'nanna biryani', 'star kabab ghor', 'star hotel & restaurant', "sultan's kitchen", 'kacchi kitchen',
  'popular diagnostic', 'popular medical', 'popular hospital', 'ibn hospital', 'ibn diagnostic', 'ibn medical',
  'new market', 'twin tower', 'jomuna city', 'jomuna plaza',
];

/** Fill {slots} in a template. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

/** Error text with shared slots filled in. */
export function errorText(key: ErrorKey): string {
  return fmt(STRINGS.errors[key], { max: BALANCE.maxLevel });
}
