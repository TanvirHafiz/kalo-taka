import { BALANCE } from '../config/balance';
import { BUILDINGS, type Category } from '../config/buildings';
import { SAVE_VERSION } from './initialState';
import type { GameState } from './types';

type Raw = Record<string, unknown>;

/**
 * Migrations keyed by the version they upgrade FROM. Each returns data at version + 1.
 * Add one entry per bump of SAVE_VERSION; never edit an old entry.
 */
const MIGRATIONS: Record<number, (data: Raw) => Raw> = {};

function isBuilding(x: unknown): boolean {
  if (x === null) return true;
  if (typeof x !== 'object') return false;
  const b = x as Raw;
  if (typeof b.category !== 'string' || !Object.hasOwn(BUILDINGS, b.category)) return false;
  const tiers = BUILDINGS[b.category as Category].length;
  return (
    Number.isInteger(b.tier) && (b.tier as number) >= 1 && (b.tier as number) <= tiers &&
    Number.isInteger(b.level) && (b.level as number) >= 1 && (b.level as number) <= BALANCE.maxLevel
  );
}

function isPlot(x: unknown, i: number): boolean {
  if (typeof x !== 'object' || x === null) return false;
  const p = x as Raw;
  return (
    p.index === i &&
    (p.row === 'front' || p.row === 'back') &&
    typeof p.owned === 'boolean' &&
    typeof p.grabbed === 'boolean' &&
    isBuilding(p.building)
  );
}

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
    Array.isArray(s.plots) &&
    s.plots.every(isPlot)
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
