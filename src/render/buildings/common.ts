// Reusable building modules. Local space: ground at y = 0, up is negative y.
import { VISUAL } from '../../config/balance';
import { addLight, addWindowLight, box, circle, ellipse, fitText, line, pick, poly, range, roundBox, type Ctx } from '../draw';
import {
  BRICK, BRICK_MORTAR, CLOTHES, GLASS, GLASS_HI, GOLD, GOLD_DARK, INK, LEAF, LEAF_DARK, POT, RUST, RUST_DARK, SIGN_LIGHT, SKIN,
} from '../palette';

export type Rng = () => number;
export type GrillStyle = 'bars' | 'grid' | 'diamond' | 'none';

export interface WindowOpts {
  grill: GrillStyle;
  grillColor: string;
  curtain?: string | null;
  frame?: string;
}

/** Window with optional curtain and security grill. (x, y) is the top-left. */
export function windowUnit(ctx: Ctx, x: number, y: number, w: number, h: number, o: WindowOpts): void {
  box(ctx, x - 1.5, y - 1.5, w + 3, h + 3, o.frame ?? '#efe7d6');
  box(ctx, x, y, w, h, GLASS, false);
  ctx.fillStyle = GLASS_HI;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.15, y + h);
  ctx.lineTo(x + w * 0.55, y);
  ctx.lineTo(x + w * 0.75, y);
  ctx.lineTo(x + w * 0.35, y + h);
  ctx.fill();
  if (o.curtain) {
    ctx.fillStyle = o.curtain;
    ctx.fillRect(x, y, w * 0.38, h);
    ctx.fillRect(x + w * 0.62, y, w * 0.38, h);
  }
  drawGrill(ctx, x, y, w, h, o.grill, o.grillColor);
  const lit = addWindowLight(ctx, x, y, w, h, VISUAL.litWindowShare);
  if (lit && o.grill !== 'none') addLight(ctx, (c) => drawGrill(c, x, y, w, h, o.grill, 'rgba(58,46,37,0.85)'));
}

function drawGrill(ctx: Ctx, x: number, y: number, w: number, h: number, grill: GrillStyle, color: string): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  if (grill === 'bars' || grill === 'grid') {
    for (let gx = x + 3.5; gx < x + w; gx += 3.5) {
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
    }
  }
  if (grill === 'grid') {
    for (let gy = y + h / 3; gy < y + h - 0.5; gy += h / 3) {
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
    }
  }
  if (grill === 'diamond') {
    for (let d = -h; d < w + h; d += 5) {
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d + h, y + h);
      ctx.moveTo(x + d + h, y);
      ctx.lineTo(x + d, y + h);
    }
  }
  ctx.stroke();
  ctx.restore();
}

export function ac(ctx: Ctx, x: number, y: number): void {
  box(ctx, x, y, 14, 9, '#f2f0ea');
  ctx.strokeStyle = '#8b8b8b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 2; i < 13; i += 2.5) {
    ctx.moveTo(x + i, y + 2);
    ctx.lineTo(x + i, y + 7);
  }
  ctx.stroke();
  line(ctx, x + 7, y + 9, x + 7, y + 14, '#7a7a7a', 1);
}

export function laundry(ctx: Ctx, x1: number, x2: number, y: number, rng: Rng, n = 3): void {
  line(ctx, x1, y, x2, y, '#5a5048', 1);
  const step = (x2 - x1) / (n + 1);
  for (let i = 1; i <= n; i++) {
    const cx = x1 + step * i;
    const c = pick(rng, CLOTHES);
    const kind = rng();
    if (kind < 0.4) {
      // shirt
      poly(ctx, [cx - 5, y, cx + 5, y, cx + 7, y + 3, cx + 4, y + 4, cx + 4, y + 11, cx - 4, y + 11, cx - 4, y + 4, cx - 7, y + 3], c);
    } else if (kind < 0.75) {
      // lungi / gamchha with checks
      box(ctx, cx - 5, y, 10, 13, c);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 5, y + 5);
      ctx.lineTo(cx + 5, y + 5);
      ctx.moveTo(cx, y);
      ctx.lineTo(cx, y + 13);
      ctx.stroke();
    } else {
      // saree drape
      poly(ctx, [cx - 6, y, cx + 6, y, cx + 4, y + 16, cx - 4, y + 16], c);
      line(ctx, cx - 5, y + 13, cx + 5, y + 13, GOLD, 1.5);
    }
  }
}

export function plant(ctx: Ctx, x: number, base: number): void {
  poly(ctx, [x - 4, base - 7, x + 4, base - 7, x + 3, base, x - 3, base], POT);
  circle(ctx, x - 3, base - 10, 3.5, LEAF);
  circle(ctx, x + 3, base - 11, 3.5, LEAF);
  circle(ctx, x, base - 14, 4, LEAF_DARK);
}

export function dish(ctx: Ctx, x: number, base: number): void {
  line(ctx, x, base, x, base - 7, INK, 1.5);
  ellipse(ctx, x, base - 10, 6, 4, '#e6e6e6');
}

export function cat(ctx: Ctx, x: number, base: number, color = '#e08a3c'): void {
  ellipse(ctx, x, base - 3.5, 6, 3.5, color);
  circle(ctx, x + 5, base - 6, 3, color);
  poly(ctx, [x + 3.5, base - 8, x + 4.5, base - 11, x + 6, base - 8.5], color, false);
  poly(ctx, [x + 5.5, base - 8.5, x + 7.5, base - 11, x + 8, base - 7.5], color, false);
  line(ctx, x - 6, base - 3, x - 10, base - 7, color, 2);
}

export function waterTank(ctx: Ctx, x: number, base: number, color = '#2f3338'): void {
  box(ctx, x - 2, base - 4, 22, 4, '#8a857c');
  roundBox(ctx, x, base - 24, 18, 20, 3, color);
  line(ctx, x + 1, base - 17, x + 17, base - 17, '#5a6068', 1);
  line(ctx, x + 1, base - 10, x + 17, base - 10, '#5a6068', 1);
  roundBox(ctx, x + 5, base - 27, 8, 3, 1, color);
}

/** Rebar spikes "for future floors". */
export function rebar(ctx: Ctx, x1: number, x2: number, base: number, rng: Rng): void {
  for (let x = x1; x <= x2; x += range(rng, 9, 14)) {
    const h = range(rng, 10, 18);
    const bend = rng() < 0.4 ? range(rng, -4, 4) : 0;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x, base - h);
    ctx.lineTo(x + bend, base - h - 3);
    ctx.strokeStyle = rng() < 0.5 ? RUST : RUST_DARK;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

export function signboard(ctx: Ctx, cx: number, cy: number, w: number, h: number, text: string, bg: string, tilt = 0): void {
  const fg = SIGN_LIGHT.includes(bg) ? INK : '#fffaf0';
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  roundBox(ctx, -w / 2, -h / 2, w, h, 2.5, bg);
  fitText(ctx, text, 0, 0, w - 6, h * 0.72, fg);
  ctx.restore();
}

/** Corrugated tin wall with vertical ribs. */
export function corrugated(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  box(ctx, x, y, w, h, color);
  ctx.strokeStyle = 'rgba(60,40,20,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let rx = x + 3; rx < x + w; rx += 4) {
    ctx.moveTo(rx, y + 1);
    ctx.lineTo(rx, y + h - 1);
  }
  ctx.stroke();
}

/** Single-slope tin roof with rust patches and a couple of bricks holding it down. */
export function tinRoof(ctx: Ctx, x1: number, x2: number, eave: number, rise: number, color: string, rng: Rng): void {
  const pts = [x1 - 6, eave + 2, x2 + 6, eave + 2, x2 + 4, eave - rise * 0.35, x1 - 2, eave - rise];
  poly(ctx, pts, color);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i]!, pts[i + 1]!);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(60,40,20,0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let rx = x1 - 6; rx < x2 + 8; rx += 4) {
    ctx.moveTo(rx, eave + 2);
    ctx.lineTo(rx + 3, eave - rise);
  }
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i % 2 ? RUST : RUST_DARK;
    ctx.globalAlpha = 0.75;
    const px = range(rng, x1, x2 - 12);
    ctx.fillRect(px, eave - range(rng, 2, rise * 0.6), range(rng, 6, 14), range(rng, 3, 6));
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  const t = (x: number) => eave - rise + ((x - x1 + 2) / (x2 - x1 + 2)) * (rise * 0.65);
  for (let i = 0; i < 2; i++) {
    const bx = range(rng, x1 + 6, x2 - 10);
    box(ctx, bx, t(bx) - 4, 7, 4, BRICK);
  }
}

export function brickWall(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  box(ctx, x, y, w, h, BRICK);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.clip();
  ctx.strokeStyle = BRICK_MORTAR;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  let row = 0;
  for (let by = y + 4; by < y + h; by += 4, row++) {
    ctx.moveTo(x, by);
    ctx.lineTo(x + w, by);
    for (let bx = x + (row % 2 ? 4 : 0); bx < x + w; bx += 8) {
      ctx.moveTo(bx, by - 4);
      ctx.lineTo(bx, by);
    }
  }
  ctx.stroke();
  ctx.restore();
}

export function door(ctx: Ctx, x: number, base: number, w: number, h: number, color: string, curtain?: string): void {
  box(ctx, x, base - h, w, h, color);
  if (curtain) {
    poly(ctx, [x + 2, base - h + 2, x + w - 2, base - h + 2, x + w - 2, base - h * 0.35, x + w / 2, base - h * 0.5, x + 2, base - h * 0.35], curtain, false);
  } else {
    box(ctx, x + 3, base - h + 3, w - 6, h * 0.4, 'rgba(255,255,255,0.18)', false);
    circle(ctx, x + w - 4, base - h / 2, 1.2, GOLD, false);
  }
}

/** Metal gate with vertical bars and spear tips. */
export function gate(ctx: Ctx, x: number, base: number, w: number, h: number, color: string, tips = true): void {
  box(ctx, x, base - h, w, h, color);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let gx = x + 3; gx < x + w; gx += 3.5) {
    ctx.moveTo(gx, base - h + 2);
    ctx.lineTo(gx, base - 1);
  }
  ctx.moveTo(x, base - h * 0.5);
  ctx.lineTo(x + w, base - h * 0.5);
  ctx.stroke();
  if (tips) {
    for (let gx = x + 2; gx < x + w - 1; gx += 5) poly(ctx, [gx - 1.5, base - h, gx + 1.5, base - h, gx, base - h - 4], color, false);
  }
}

export function balconyRail(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  box(ctx, x, y + h - 2, w, 3, '#e8e1d3');
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  for (let bx = x + 2; bx < x + w; bx += 3) {
    ctx.moveTo(bx, y);
    ctx.lineTo(bx, y + h - 2);
  }
  ctx.stroke();
}

export function plasticChair(ctx: Ctx, x: number, base: number, color: string): void {
  poly(ctx, [x, base - 14, x + 3, base - 14, x + 3, base - 7, x + 10, base - 7, x + 10, base, x + 8, base, x + 8, base - 4, x + 2, base - 4, x + 2, base, x, base], color);
}

/** Tiny sitting figure; asleep adds a tilted head and "z". */
export function sittingPerson(ctx: Ctx, x: number, base: number, shirt: string, rng: Rng, asleep = false): void {
  const skin = pick(rng, SKIN);
  plasticChair(ctx, x - 2, base, '#d94040');
  box(ctx, x - 1, base - 18, 8, 10, shirt);
  box(ctx, x + 3, base - 8, 8, 3, '#3a3f58');
  line(ctx, x + 10, base - 6, x + 10, base, '#3a3f58', 2);
  circle(ctx, x + (asleep ? 5 : 3), base - 22, 3.8, skin);
  if (asleep) {
    ctx.fillStyle = INK;
    ctx.font = `800 7px "Baloo 2", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('z', x + 10, base - 26);
    ctx.font = `800 5px "Baloo 2", sans-serif`;
    ctx.fillText('z', x + 14, base - 31);
  }
}

export function cow(ctx: Ctx, x: number, base: number): void {
  const body = '#f1ede4';
  line(ctx, x + 3, base - 6, x + 3, base, INK, 2);
  line(ctx, x + 17, base - 6, x + 17, base, INK, 2);
  ellipse(ctx, x + 10, base - 11, 12, 6.5, body);
  ellipse(ctx, x + 6, base - 12, 3.5, 2.5, '#6b4f3a', false);
  roundBox(ctx, x + 19, base - 18, 8, 7, 2.5, body);
  line(ctx, x + 21, base - 18, x + 20, base - 21, '#c9b48a', 1.5);
  line(ctx, x + 25, base - 18, x + 26, base - 21, '#c9b48a', 1.5);
  line(ctx, x - 2, base - 12, x - 3, base - 5, INK, 1.2);
}

export function tubeWell(ctx: Ctx, x: number, base: number): void {
  box(ctx, x - 6, base - 3, 14, 3, '#9c9a94');
  box(ctx, x - 1.5, base - 18, 4, 15, '#3f6e8c');
  box(ctx, x - 6, base - 13, 6, 2.5, '#3f6e8c');
  line(ctx, x + 2, base - 18, x + 9, base - 22, INK, 2);
}

export function bucket(ctx: Ctx, x: number, base: number, color: string): void {
  poly(ctx, [x - 4, base - 7, x + 4, base - 7, x + 3, base, x - 3, base], color);
}

export function pottedPalm(ctx: Ctx, x: number, base: number): void {
  poly(ctx, [x - 5, base - 9, x + 5, base - 9, x + 4, base, x - 4, base], '#d9d2c3');
  line(ctx, x, base - 9, x, base - 24, '#7a5a3a', 2);
  for (const a of [-2.4, -1.9, -1.2, -0.7]) {
    ctx.beginPath();
    ctx.moveTo(x, base - 24);
    ctx.quadraticCurveTo(x + Math.cos(a) * 9, base - 24 + Math.sin(a) * 9, x + Math.cos(a) * 13, base - 24 + Math.sin(a) * 4 + 6);
    ctx.strokeStyle = LEAF;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

export function banner(ctx: Ctx, x: number, y: number, w: number, h: number, text: string, fg = '#d7263d'): void {
  poly(ctx, [x, y, x + w, y, x + w - 1, y + h, x + w / 2, y + h - 2, x + 1, y + h], '#fbf7ee');
  fitText(ctx, text, x + w / 2, y + h / 2, w - 4, h * 0.75, fg);
}

export function goldGate(ctx: Ctx, x: number, base: number, w: number, h: number): void {
  gate(ctx, x, base, w, h, GOLD);
  circle(ctx, x + w / 2, base - h * 0.62, 3, GOLD_DARK);
}
