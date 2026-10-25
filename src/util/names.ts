import { NAME_BLOCKLIST, NAME_WORDS } from '../config/strings';
import { mulberry32 } from './rng';

export type NamedCategory = keyof typeof NAME_WORDS;

/** Seeded signboard name. Skips blocklisted combinations deterministically. */
export function buildingName(seed: number, category: NamedCategory): string {
  const rng = mulberry32(seed);
  const words = NAME_WORDS[category];
  for (let attempt = 0; attempt < 20; attempt++) {
    const a = words.first[Math.floor(rng() * words.first.length)]!;
    const b = words.second[Math.floor(rng() * words.second.length)]!;
    const name = `${a} ${b}`;
    if (!NAME_BLOCKLIST.includes(name.toLowerCase())) return name;
  }
  return `${words.first[0]} ${words.second[0]}`;
}
