// Money is a plain JS number of Taka. This module only formats it.
import { LANG, localDigits } from '../config/lang';

export const LAKH = 1e5;
export const CRORE = 1e7;
export const LAKH_CRORE = 1e12;
export const CRORE_CRORE = 1e14;
/** First value shown with the aa/ab/ac suffix chain. Each suffix step is x1000. */
export const SUFFIX_START = 1e17;

const TAKA = '৳';

/** Unit words for the lakh/crore format, per language. */
const UNITS = LANG === 'bn'
  ? { lakh: 'লাখ', crore: 'কোটি', lakhCrore: 'লাখ কোটি', crCr: 'কোটি কোটি', lot: 'অনেক', perSec: '/সে' }
  : { lakh: 'lakh', crore: 'crore', lakhCrore: 'lakh crore', crCr: 'CrCr', lot: 'a lot', perSec: '/s' };

/** Truncate (never round up) to `dp` decimals, so 99.999 lakh never shows as 100.00 lakh. */
function truncFixed(x: number, dp: number): string {
  const f = 10 ** dp;
  // Relative nudge absorbs float noise (0.29 * 100 = 28.999...) without rounding 99.9999 up.
  return (Math.floor(x * f * (1 + 1e-12)) / f).toFixed(dp);
}

/** Indian digit grouping: 12,34,56,789. Integer part only. */
export function groupIndian(n: number): string {
  const s = Math.floor(Math.abs(n)).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  const parts: string[] = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest.length > 0) parts.unshift(rest);
  return `${parts.join(',')},${last3}`;
}

/** Suffix for step k of the chain: 0 -> aa, 1 -> ab, ..., 25 -> az, 26 -> ba. */
export function suffixFor(k: number): string {
  const a = 'a'.charCodeAt(0);
  const first = String.fromCharCode(a + (Math.floor(k / 26) % 26));
  const second = String.fromCharCode(a + (k % 26));
  return first + second;
}

export type NumberMode = 'bd' | 'short';
let mode: NumberMode = 'bd';
/** Bangladeshi units (lakh, crore) or short scientific (K, M, B, T, then 1.2e15). */
export function setNumberMode(m: NumberMode): void {
  mode = m;
}

function formatShort(n: number): string {
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(n);
  if (v < 1e3) return sign + Math.floor(v).toString();
  const units: [number, string][] = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  if (v >= 1e15) {
    const e = Math.floor(Math.log10(v) + 1e-9);
    return `${sign}${truncFixed(v / 10 ** e, 2)}e${e}`;
  }
  const [div, u] = units.find(([d]) => v >= d)!;
  return `${sign}${truncFixed(v / div, 2)}${u}`;
}

/** Format an amount without the currency sign (Bengali digits when playing in Bangla). */
export function formatAmount(n: number): string {
  return localDigits(formatAmountAscii(n));
}

function formatAmountAscii(n: number): string {
  if (mode === 'short' && Number.isFinite(n)) return formatShort(n);
  if (!Number.isFinite(n)) return n > 0 ? UNITS.lot : '0';
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(n);

  if (v < LAKH) return sign + groupIndian(v);
  if (v < CRORE) return `${sign}${truncFixed(v / LAKH, 2)} ${UNITS.lakh}`;
  if (v < LAKH_CRORE) {
    const c = v / CRORE;
    return c < 1000 ? `${sign}${truncFixed(c, 2)} ${UNITS.crore}` : `${sign}${groupIndian(c)} ${UNITS.crore}`;
  }
  if (v < CRORE_CRORE) return `${sign}${truncFixed(v / LAKH_CRORE, 2)} ${UNITS.lakhCrore}`;
  if (v < SUFFIX_START) return `${sign}${truncFixed(v / CRORE_CRORE, 1)} ${UNITS.crCr}`;

  const k = Math.floor(Math.log10(v / SUFFIX_START) / 3 + 1e-9);
  const scaled = v / (SUFFIX_START * 1000 ** k);
  return `${sign}${truncFixed(scaled, 1)} ${suffixFor(k)}`;
}

/** Format Taka with the sign, e.g. ৳12.40 lakh. */
export function formatTaka(n: number): string {
  const s = formatAmount(n);
  return s.startsWith('-') ? `-${TAKA}${s.slice(1)}` : `${TAKA}${s}`;
}

/** Income rate. Small rates keep one decimal so early growth is visible. */
export function formatRate(perSec: number): string {
  if (Math.abs(perSec) < 100 && perSec !== Math.floor(perSec)) {
    return `${TAKA}${localDigits(truncFixed(perSec, 1))}${UNITS.perSec}`;
  }
  return `${formatTaka(perSec)}${UNITS.perSec}`;
}
