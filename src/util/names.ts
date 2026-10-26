import { NAME_BLOCKLIST, NAME_WORDS, NAME_WORDS_EN } from '../config/strings';
import { mulberry32 } from './rng';

export type NamedCategory = keyof typeof NAME_WORDS_EN;

/** Seeded signboard name. Skips blocklisted combinations deterministically. */
export function buildingName(seed: number, category: NamedCategory): string {
  const rng = mulberry32(seed);
  const en = NAME_WORDS_EN[category];
  const shown = NAME_WORDS[category];
  const pick = (i: number, j: number) => `${shown.first[i] ?? en.first[i]} ${shown.second[j] ?? en.second[j]}`;
  for (let attempt = 0; attempt < 20; attempt++) {
    const i = Math.floor(rng() * en.first.length);
    const j = Math.floor(rng() * en.second.length);
    // the blocklist is in English; the Bangla lists line up word for word
    if (!NAME_BLOCKLIST.includes(`${en.first[i]} ${en.second[j]}`.toLowerCase())) return pick(i, j);
  }
  return pick(0, 0);
}
