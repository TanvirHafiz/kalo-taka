import { describe, expect, it } from 'vitest';
import { BUILDINGS, CATEGORIES } from '../src/config/buildings';
import { LANG, localDigits } from '../src/config/lang';
import * as BN from '../src/config/strings.bn';
import { BUBBLES_EN, EVENT_TEXT_EN, FLEE_EN, M5_TEXT_EN, MAMUN_EN, NAME_WORDS_EN, STRINGS_EN, TICKER_EN } from '../src/config/strings';

const PAIRS: [string, unknown, unknown][] = [
  ['STRINGS', STRINGS_EN, BN.STRINGS_BN],
  ['NAME_WORDS', NAME_WORDS_EN, BN.NAME_WORDS_BN],
  ['TICKER', TICKER_EN, BN.TICKER_BN],
  ['MAMUN', MAMUN_EN, BN.MAMUN_BN],
  ['EVENT_TEXT', EVENT_TEXT_EN, BN.EVENT_TEXT_BN],
  ['FLEE', FLEE_EN, BN.FLEE_BN],
  ['BUBBLES', BUBBLES_EN, BN.BUBBLES_BN],
  ['M5_TEXT', M5_TEXT_EN, BN.M5_TEXT_BN],
];

const slots = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

/** Walk both trees together and report every mismatch. */
function compare(path: string, en: unknown, bn: unknown, out: string[]): void {
  if (typeof en === 'string') {
    if (typeof bn !== 'string') return void out.push(`${path}: missing`);
    if (slots(en) !== slots(bn)) out.push(`${path}: slots {${slots(en)}} vs {${slots(bn)}}`);
    if (bn.includes('—')) out.push(`${path}: em dash`);
    if (en !== '' && bn === '') out.push(`${path}: empty`);
    return;
  }
  if (Array.isArray(en)) {
    if (!Array.isArray(bn)) return void out.push(`${path}: not a list`);
    // comedy pools may differ in length but keep at least as many lines; fixed lists must match
    const pool = /BUBBLES|TICKER|idle|quotes|filler/.test(path);
    if (pool ? bn.length < en.length : bn.length !== en.length) out.push(`${path}: ${bn.length} items, English has ${en.length}`);
    en.forEach((v, i) => compare(`${path}[${i}]`, v, bn[i], out));
    return;
  }
  if (en && typeof en === 'object') {
    if (!bn || typeof bn !== 'object') return void out.push(`${path}: missing`);
    for (const k of Object.keys(en)) compare(`${path}.${k}`, (en as Record<string, unknown>)[k], (bn as Record<string, unknown>)[k], out);
  }
}

describe('Bangla translation', () => {
  it('has every English string, with the same {slots}, list lengths and no em dashes', () => {
    const problems: string[] = [];
    for (const [name, en, bn] of PAIRS) compare(name, en, bn, problems);
    expect(problems).toEqual([]);
  });

  it('names every building tier and district', () => {
    for (const c of CATEGORIES) expect(BN.TIER_NAMES_BN[c]).toHaveLength(BUILDINGS[c].length);
    expect(BN.DISTRICT_NAMES_BN).toHaveLength(5);
  });

  it('tests run in English, and Bengali digits convert cleanly', () => {
    expect(LANG).toBe('en');
    expect(localDigits('Lv 3/10, ৳12,40,000', 'bn')).toBe('Lv ৩/১০, ৳১২,৪০,০০০');
    expect(localDigits('3/10')).toBe('3/10');
  });
});
