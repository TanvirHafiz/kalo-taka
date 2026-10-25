// Player settings (audio, motion, number format, ticker speed). Kept apart from the game save so a
// hard reset or an imported save never touches them. Render and UI both read reduceMotion() here.

export type MotionSetting = 'system' | 'reduce' | 'full';
export type NumberFormat = 'bd' | 'short';

export interface Settings {
  /** Volumes, 0..1. Music has no track yet; its slider is kept for later. */
  master: number;
  sfx: number;
  ambience: number;
  music: number;
  motion: MotionSetting;
  numbers: NumberFormat;
  /** Ticker speed multiplier. */
  ticker: number;
}

export const SETTINGS_KEY = 'kalotaka.settings';

export const DEFAULT_SETTINGS: Settings = { master: 0.7, sfx: 0.8, ambience: 0.4, music: 0.5, motion: 'system', numbers: 'bd', ticker: 1 };

let current: Settings = { ...DEFAULT_SETTINGS };
const listeners = new Set<(s: Settings) => void>();

const clamp01 = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);

/** Merge stored values over the defaults, ignoring anything malformed. */
export function parseSettings(raw: string | null): Settings {
  const d = DEFAULT_SETTINGS;
  let o: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object') o = parsed as Record<string, unknown>;
  } catch {
    // unreadable: defaults
  }
  return {
    master: clamp01(o.master, d.master),
    sfx: clamp01(o.sfx, d.sfx),
    ambience: clamp01(o.ambience, d.ambience),
    music: clamp01(o.music, d.music),
    motion: o.motion === 'reduce' || o.motion === 'full' ? o.motion : 'system',
    numbers: o.numbers === 'short' ? 'short' : 'bd',
    ticker: typeof o.ticker === 'number' && o.ticker >= 0.5 && o.ticker <= 2 ? o.ticker : d.ticker,
  };
}

const systemReduce = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True when shakes, dust, flashes and scrolling should stop. */
export function reduceMotion(): boolean {
  return current.motion === 'reduce' || (current.motion === 'system' && systemReduce());
}

function applyToPage(): void {
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('reduce-motion', reduceMotion());
}

export function loadSettings(): Settings {
  try {
    current = parseSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    current = { ...DEFAULT_SETTINGS };
  }
  applyToPage();
  return current;
}

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
  } catch {
    // storage blocked: settings last until reload
  }
  applyToPage();
  for (const f of listeners) f(current);
  return current;
}

export function onSettings(f: (s: Settings) => void): void {
  listeners.add(f);
}
