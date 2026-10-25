// The tycoon's procedural paper portrait: round face, moustache, hair (or lack of it), maybe
// sunglasses, and a sleeveless waistcoat over a panjabi in a party-neutral colour. It greys a
// little with Offshore Stars. Used in the HUD (and later on posters and the talk show).
import { circle, ellipse, poly, roundBox, setPaperMode, type Ctx } from '../render/draw';
import { mulberry32 } from '../util/rng';

const SKIN = ['#8d5a3b', '#a8714a', '#c08a5c', '#b07a52'];
const PANJABI = ['#f5efe2', '#e9d6a0', '#a8c5da', '#c3a6c9', '#d9c9a8'];
const WAISTCOAT = ['#3a3f58', '#5b5a66', '#7a5236', '#6b3a35', '#2f4858'];

export function drawAvatar(ctx: Ctx, size: number, seed: number, stars: number): void {
  const rng = mulberry32(seed ^ 0x51ed);
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(rng() * a.length)]!;
  const skin = pick(SKIN);
  const grey = Math.min(1, stars / 60);
  const hairColor = grey > 0.5 ? '#c9c4bb' : grey > 0.2 ? '#6b6560' : '#2b2320';
  const hair = Math.floor(rng() * 3); // 0 bald, 1 side part, 2 puff
  const tache = Math.floor(rng() * 3); // 0 thick, 1 thin, 2 handlebar
  const glasses = rng() < 0.45;
  const belly = 1 + Math.min(0.35, stars / 120);
  ctx.save();
  ctx.scale(size / 64, size / 64);
  setPaperMode(false, 1);
  ctx.fillStyle = '#e3cfa8';
  ctx.fillRect(0, 0, 64, 64);
  // body: panjabi with waistcoat
  ellipse(ctx, 32, 64, 26 * belly, 20, pick(PANJABI));
  poly(ctx, [32 - 22 * belly, 64, 22, 46, 28, 50, 32, 64], pick(WAISTCOAT));
  poly(ctx, [32 + 22 * belly, 64, 42, 46, 36, 50, 32, 64], pick(WAISTCOAT));
  // head
  circle(ctx, 32, 28, 15, skin);
  if (hair === 1) poly(ctx, [17, 26, 20, 14, 34, 10, 47, 16, 47, 22, 30, 17, 20, 24], hairColor);
  if (hair === 2) ellipse(ctx, 32, 15, 15, 7, hairColor);
  if (hair === 0) ellipse(ctx, 32, 14, 9, 2, 'rgba(255,255,255,0.25)', false);
  circle(ctx, 17, 29, 3, skin);
  circle(ctx, 47, 29, 3, skin);
  // eyes or sunglasses
  if (glasses) {
    roundBox(ctx, 21, 24, 10, 6, 2, '#2b2320');
    roundBox(ctx, 33, 24, 10, 6, 2, '#2b2320');
    ctx.fillStyle = '#2b2320';
    ctx.fillRect(30, 25, 4, 1.5);
  } else {
    ctx.fillStyle = '#2b2320';
    ctx.fillRect(24, 26, 4, 2.2);
    ctx.fillRect(36, 26, 4, 2.2);
  }
  // moustache
  const t = hairColor === '#2b2320' ? '#2b2320' : hairColor;
  if (tache === 0) roundBox(ctx, 24, 33, 16, 4, 2, t);
  if (tache === 1) roundBox(ctx, 26, 34, 12, 2, 1, t);
  if (tache === 2) poly(ctx, [22, 37, 26, 33, 38, 33, 42, 37, 38, 35, 26, 35], t);
  ctx.restore();
}
