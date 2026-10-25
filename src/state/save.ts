import { migrate } from './migrate';
import type { GameState } from './types';

export const SAVE_KEY = 'kalotaka.save';
export const BACKUP_KEY = 'kalotaka.save.bak';

/** The slice of Storage we use, so tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function serialize(state: GameState): string {
  return JSON.stringify({ version: state.version, state });
}

export function deserialize(raw: string): GameState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const inner = (parsed as { state?: unknown }).state;
    return migrate(inner);
  } catch {
    return null;
  }
}

export function saveGame(store: KeyValueStore, state: GameState): void {
  try {
    store.setItem(SAVE_KEY, serialize(state));
  } catch {
    // Quota or private mode: keep playing, nothing to do.
  }
}

export type LoadResult =
  | { kind: 'none' }
  | { kind: 'loaded'; state: GameState }
  /** A save existed but was unreadable; the raw string was copied to BACKUP_KEY. */
  | { kind: 'corrupt' };

export function loadGame(store: KeyValueStore): LoadResult {
  let raw: string | null;
  try {
    raw = store.getItem(SAVE_KEY);
  } catch {
    return { kind: 'none' };
  }
  if (raw === null) return { kind: 'none' };
  const state = deserialize(raw);
  if (state) return { kind: 'loaded', state };
  try {
    store.setItem(BACKUP_KEY, raw);
  } catch {
    // ignore
  }
  return { kind: 'corrupt' };
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64.trim());
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function exportSave(state: GameState): string {
  return toBase64(serialize(state));
}

export function importSave(b64: string): GameState | null {
  try {
    return deserialize(fromBase64(b64));
  } catch {
    return null;
  }
}
