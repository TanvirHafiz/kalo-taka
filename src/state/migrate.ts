import { SAVE_VERSION } from './initialState';
import type { GameState } from './types';

type Raw = Record<string, unknown>;

/**
 * Migrations keyed by the version they upgrade FROM. Each returns data at version + 1.
 * Add one entry per bump of SAVE_VERSION; never edit an old entry.
 */
const MIGRATIONS: Record<number, (data: Raw) => Raw> = {};

function isGameState(x: unknown): x is GameState {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Raw;
  return (
    typeof s.version === 'number' &&
    typeof s.seed === 'number' &&
    typeof s.taka === 'number' &&
    Number.isFinite(s.taka) &&
    typeof s.lifetimeEarnings === 'number' &&
    typeof s.lastSimTime === 'number' &&
    Array.isArray(s.plots)
  );
}

/** Bring any older save up to SAVE_VERSION. Returns null if it cannot be understood. */
export function migrate(data: unknown): GameState | null {
  if (typeof data !== 'object' || data === null) return null;
  let cur = data as Raw;
  let version = typeof cur.version === 'number' ? cur.version : 0;
  if (version > SAVE_VERSION) return null;
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return null;
    cur = step(cur);
    version += 1;
    cur.version = version;
  }
  return isGameState(cur) ? cur : null;
}
