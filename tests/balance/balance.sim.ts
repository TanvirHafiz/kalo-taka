// npm run balance: play several seeds for 4 simulated hours and print time-to-milestone, with the
// median across seeds next to the spec's pacing targets.
import { it } from 'vitest';
import { BALANCE, CORRUPTION } from '../../src/config/balance';
import { PRESTIGE } from '../../src/config/events';
import { fmtTime, runBot, type Milestones } from './bot';

declare const process: { env: Record<string, string | undefined> };

const SEEDS = [11, 22, 33, 44, 55];
const HOURS = Number(process.env.BALANCE_HOURS ?? 4);

// BALANCE_SET="upgradeCostMult=0.05,permitMergePerTier=30" tries numbers without editing config
const knobs: Record<string, number>[] = [BALANCE, CORRUPTION, PRESTIGE] as unknown as Record<string, number>[];
const overrides = (process.env.BALANCE_SET ?? '').split(',').filter(Boolean);
for (const kv of overrides) {
  const [k, v] = kv.split('=');
  const target = knobs.find((o) => k! in o);
  if (!target) throw new Error(`unknown knob ${k}`);
  target[k!] = Number(v);
}

// Spec "Target pacing", in seconds. Second merge stands in for "first merge" because the tutorial
// hands every player their first merge in about 90 s.
const TARGETS: [keyof Milestones, string, number | null][] = [
  ['firstMerge', 'first merge (tutorial)', null],
  ['secondMerge', 'second merge', 4 * 60],
  ['food', 'food unlock (T3 house)', null],
  ['clinic', 'clinic unlock (T4 house)', 15 * 60],
  ['tier5', 'tier 5 house', null],
  ['hospital', 'Specialized Hospital', 60 * 60],
  ['stars1', '1 star on offer', null],
  ['stars3', '3 stars on offer (Flee)', 3.5 * 3600],
  ['stars5', '5 stars on offer', null],
];

const median = (xs: (number | undefined)[]) => {
  const v = xs.map((x) => x ?? Infinity).sort((a, b) => a - b);
  const mid = v[Math.floor(v.length / 2)]!;
  return mid === Infinity ? undefined : mid;
};

it('balance report', () => {
  const runs = SEEDS.map((seed) => runBot({ seed, hours: HOURS }));
  const lines = [`Balance bot: ${SEEDS.length} seeds x ${HOURS} h ${overrides.join(' ')}`, ''];
  for (const [key, label, target] of TARGETS) {
    const med = median(runs.map((r) => r.milestones[key] as number | undefined));
    const off = target && med !== undefined ? `${Math.round(((med - target) / target) * 100)}%`.padStart(6) : '';
    lines.push(`${label.padEnd(26)} ${fmtTime(med)}   target ${target ? fmtTime(target) : '      -'} ${off}`);
  }
  const d = runs[0]!.milestones.districts;
  lines.push('', `districts (seed 1): ${d.map(fmtTime).join(', ')}`);
  lines.push('', 'seed 1 every 15 min: minute, income/s, top house tier, plots');
  for (const row of runs[0]!.perMinute.filter((r) => r[0] % 15 === 0)) lines.push(`  ${row[0]}  ${Math.round(row[1]).toLocaleString('en-IN')}/s  T${row[2]}  ${row[3]} plots`);
  console.log(lines.join('\n'));
}, 600_000);
