// The game language, read once when the page loads. Switching saves the choice and reloads, since
// every label, signboard and sprite is built from the chosen tables at startup.

export type Lang = 'en' | 'bn';

export const LANG_KEY = 'kalotaka.lang';

function readLang(): Lang {
  // outside a browser (tests, the balance bot) the game is always English
  if (typeof document === 'undefined') return 'en';
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(LANG_KEY) : null;
    if (saved === 'en' || saved === 'bn') return saved;
  } catch {
    // storage blocked: fall through to the browser language
  }
  const nav = typeof navigator !== 'undefined' ? (navigator.language ?? '') : '';
  return nav.toLowerCase().startsWith('bn') ? 'bn' : 'en';
}

export const LANG: Lang = readLang();

/** Save the choice and reload into it. */
export function setLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // storage blocked: the reload falls back to the browser language
  }
  location.reload();
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** ASCII digits to Bengali digits when playing in Bangla. */
export function localDigits(s: string, lang: Lang = LANG): string {
  return lang === 'bn' ? s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]!) : s;
}
