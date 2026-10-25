import { BALANCE } from './balance';

// Every player-facing string lives here so a Bangla translation can be added later.
// Rule: no em dashes in in-game text.

export const STRINGS = {
  title: 'Kalo Taka Private Limited',
  disclaimer: 'Any resemblance to any real bhai is purely coincidental.',
  start: 'Start',

  hud: {
    taka: 'Taka',
    income: 'Income',
    plots: 'Plots',
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
    close: 'Close',
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
  },

  toasts: {
    welcomeBack: 'While you were away, the buildings collected {amount}.',
    built: '{name} built. Tenants already queueing.',
    merged: 'Merged into {name}!',
    loadFailed: 'Old save was damaged. Started fresh, backup kept.',
  },
} as const;

export type ErrorKey = keyof typeof STRINGS.errors;

/** Fill {slots} in a template. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

/** Error text with shared slots filled in. */
export function errorText(key: ErrorKey): string {
  return fmt(STRINGS.errors[key], { max: BALANCE.maxLevel });
}
