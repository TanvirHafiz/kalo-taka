import { VISUAL } from '../config/balance';

/** Position in the day from wall-clock time: 0 = midnight, 0.25 dawn, 0.5 noon, 0.75 dusk. */
export function dayPhase(nowMs: number): number {
  const d = VISUAL.dayLengthMs;
  return (((nowMs % d) + d) % d) / d;
}

function smooth(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** How dark it is, 0 (full day) to 1 (full night), with smooth dawn and dusk transitions. */
export function nightness(phase: number): number {
  const w = VISUAL.twilight;
  const dawn = 1 - smooth((phase - (VISUAL.dawnPhase - w)) / (2 * w));
  const dusk = smooth((phase - (VISUAL.duskPhase - w)) / (2 * w));
  return phase < 0.5 ? dawn : dusk;
}
