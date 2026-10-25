// Paper art for the corruption layer: scaffolding, the stamp-and-file permit bar, land grabs
// (pond filling under sand trucks), the grabbed-plot flag, inquiry notices and poster faces.
import { box, circle, ellipse, fitText, line, poly, roundBox, setPaperMode, type Ctx } from './draw';
import { INK, LEAF, LEAF_DARK, WATER, WATER_DARK } from './palette';
import { drawAvatar } from './portrait';

/** Bamboo scaffolding with green safety net while a building waits on its permit. */
export function drawScaffold(ctx: Ctx, cx: number, h: number): void {
  const w = 110;
  const x0 = cx - w / 2;
  ctx.fillStyle = 'rgba(95,143,107,0.35)';
  ctx.fillRect(x0, -h, w, h);
  for (let x = x0; x <= x0 + w; x += 22) line(ctx, x, 0, x, -h - 6, '#b08a4a', 2.4);
  for (let y = -12; y > -h; y -= 18) line(ctx, x0 - 3, y, x0 + w + 3, y, '#9c7a43', 1.8);
  line(ctx, x0, -10, x0 + 44, -h + 10, '#9c7a43', 1.4);
  line(ctx, x0 + w, -10, x0 + w - 44, -h + 10, '#9c7a43', 1.4);
  // the founding stone and a pile of rods
  box(ctx, cx - 18, -10, 36, 10, '#cfc3ad');
  for (let i = 0; i < 4; i++) line(ctx, cx + 24 + i * 3, 0, cx + 40 + i * 3, -4, '#9a5634', 1.4);
}

/** Stamp-and-file progress bar above a plot: a paper file, a bar, a red stamp and seconds left. */
export function drawPermitBar(ctx: Ctx, cx: number, y: number, p: number, secs: number, label: string): void {
  const w = 96;
  roundBox(ctx, cx - w / 2, y - 26, w, 26, 5, '#fbf7ee');
  // file folder
  poly(ctx, [cx - 44, y - 21, cx - 38, y - 21, cx - 36, y - 18, cx - 28, y - 18, cx - 28, y - 6, cx - 44, y - 6], '#e9c46a', false);
  fitText(ctx, label, cx + 8, y - 19, 66, 7, INK, 700);
  roundBox(ctx, cx - 24, y - 12, 66, 6, 3, 'rgba(70,42,16,0.14)', false);
  roundBox(ctx, cx - 24, y - 12, Math.max(4, 66 * Math.min(1, p)), 6, 3, '#5f8f6b', false);
  // the stamp thumps down as it nears the end
  const s = p > 0.92 ? 1 : 0.55;
  ctx.save();
  ctx.globalAlpha = s;
  circle(ctx, cx + 38, y - 27, 7, '#c8553d');
  fitText(ctx, `${Math.ceil(secs)}s`, cx + 38, y - 27, 12, 6, '#fffaf0');
  ctx.restore();
}

/** A grabbed plot being filled in: the water body shrinks while sand trucks dump. */
export function drawFill(ctx: Ctx, cx: number, p: number, pond: number, t: number): void {
  const w = 130;
  const remain = 1 - p;
  if (pond === 2) {
    // playground: swings and a slide disappearing under sand
    ctx.save();
    ctx.globalAlpha = 0.4 + 0.6 * remain;
    line(ctx, cx - 50, 0, cx - 40, -40, '#c8553d', 2);
    line(ctx, cx - 20, 0, cx - 30, -40, '#c8553d', 2);
    line(ctx, cx - 40, -40, cx - 30, -40, '#c8553d', 2);
    line(ctx, cx - 35, -40, cx - 35, -16, INK, 1);
    box(ctx, cx - 39, -16, 8, 3, '#e9c46a');
    poly(ctx, [cx + 10, 0, cx + 40, -30, cx + 46, -30, cx + 18, 0], '#a8c5da');
    ctx.restore();
  } else {
    const water = pond === 1 ? '#7aa98a' : WATER;
    ellipse(ctx, cx, -3, (w / 2) * (0.25 + 0.75 * remain), 7 * (0.4 + 0.6 * remain), water);
    ellipse(ctx, cx, -3, (w / 3) * remain, 3 * remain + 0.5, pond === 1 ? '#5c8a6c' : WATER_DARK, false);
    if (pond === 1) for (let i = 0; i < 6; i++) line(ctx, cx - 50 + i * 20, -2, cx - 52 + i * 20, -16 * remain - 4, i % 2 ? LEAF : LEAF_DARK, 1.6);
    if (pond === 3) box(ctx, cx - w / 2, -3, w * remain, 3, WATER_DARK, false);
    // a duck that will have to relocate
    if (remain > 0.4) {
      ellipse(ctx, cx + 20, -6, 4, 2.5, '#ffffff');
      circle(ctx, cx + 23, -9, 1.8, '#ffffff');
    }
  }
  // the growing sand mound
  ellipse(ctx, cx - 10, 0, 18 + 44 * p, 4 + 14 * p, '#e2c67e');
  // a sand truck tipping its load
  const tx = cx + 34;
  const tilt = 0.25 + 0.1 * Math.sin(t * 2);
  box(ctx, tx, -18, 16, 12, '#e07a5f');
  ctx.save();
  ctx.translate(tx, -18);
  ctx.rotate(-tilt);
  box(ctx, -30, -12, 30, 12, '#c8553d');
  ctx.restore();
  circle(ctx, tx - 20, -4, 4, '#3a3a40');
  circle(ctx, tx + 8, -4, 4, '#3a3a40');
  for (let i = 0; i < 4; i++) circle(ctx, tx - 34 - i * 4, -10 + i * 3 + ((t * 30 + i * 7) % 6), 1.6, '#e2c67e', false);
}

/** The tiny red flag only the player sees on a grabbed plot. */
export function drawGrabFlag(ctx: Ctx, x: number): void {
  line(ctx, x, 0, x, -22, INK, 1.2);
  poly(ctx, [x, -22, x + 10, -19, x, -15], '#c8553d', false);
}

/** Frozen by the committee: a cold tint, police tape and a pinned notice. */
export function drawInquiry(ctx: Ctx, cx: number, h: number, secs: number, title: string): void {
  ctx.save();
  ctx.fillStyle = 'rgba(90,110,150,0.28)';
  ctx.fillRect(cx - 62, -h, 124, h);
  ctx.restore();
  // police tape across the front
  ctx.save();
  ctx.translate(cx, -26);
  ctx.rotate(-0.08);
  box(ctx, -70, -5, 140, 10, '#f2c14e');
  for (let x = -66; x < 70; x += 14) poly(ctx, [x, -5, x + 6, -5, x + 2, 5, x - 4, 5], '#3a2e25', false);
  ctx.restore();
  // the notice
  roundBox(ctx, cx - 40, -h * 0.55 - 20, 80, 40, 3, '#fbf7ee');
  fitText(ctx, title, cx, -h * 0.55 - 10, 72, 8, '#c8553d');
  fitText(ctx, `${Math.ceil(secs)}s`, cx, -h * 0.55 + 6, 72, 14, INK);
  circle(ctx, cx + 30, -h * 0.55 - 18, 3, '#c8553d', false);
}

const posterCache = new Map<string, HTMLCanvasElement>();

/** A paper poster with the tycoon's face and a slogan (cached per face). */
export function posterImage(seed: number, stars: number, slogan: string): HTMLCanvasElement {
  const key = `${seed}|${stars}|${slogan}`;
  const hit = posterCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 80;
  c.height = 104;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fbf7ee';
  ctx.fillRect(0, 0, 80, 104);
  ctx.fillStyle = '#c8553d';
  ctx.fillRect(0, 0, 80, 8);
  ctx.save();
  ctx.translate(8, 12);
  drawAvatar(ctx, 64, seed, stars);
  ctx.restore();
  setPaperMode(false, 1);
  fitText(ctx, slogan, 40, 90, 72, 14, '#c8553d');
  posterCache.set(key, c);
  return c;
}

/**
 * Draw a poster at (x, y) top-left, w wide. `age` 0..1 over the campaign: fresh, then rain
 * streaks, then torn edges, then gone.
 */
export function drawPoster(ctx: Ctx, img: HTMLCanvasElement, x: number, y: number, w: number, age: number, tilt: number): void {
  const h = w * 1.3;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(tilt);
  ctx.globalAlpha = age > 0.85 ? Math.max(0, (1 - age) / 0.15) : 1;
  // the torn corner is cut out of the poster's own shape, never out of the scene behind it
  const tear = age > 0.6 ? age - 0.5 : 0;
  ctx.fillStyle = 'rgba(70,42,16,0.25)';
  ctx.fillRect(-w / 2 + 0.8, -h / 2 + 1.2, w, h * (1 - tear * 0.2));
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2 - w * tear, -h / 2);
  ctx.lineTo(w / 2, -h / 2 + h * tear);
  ctx.lineTo(w / 2, h / 2);
  ctx.lineTo(-w / 2, h / 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  if (age > 0.3) {
    // rain streaks
    ctx.strokeStyle = `rgba(120,140,160,${Math.min(0.5, (age - 0.3) * 1.2)})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let i = 1; i < 6; i++) {
      ctx.moveTo(-w / 2 + (i * w) / 6, -h / 2);
      ctx.lineTo(-w / 2 + (i * w) / 6 + 1, h / 2);
    }
    ctx.stroke();
  }
  ctx.restore();
}
