// Paper art for random events: floods and boats, generators, the bus parking lot, the cylinder
// shop, VIP barricades, the journalist, election bunting, iftar lanterns, mosquitoes, the flyover.
import { box, circle, ellipse, fitText, line, poly, roundBox, type Ctx } from './draw';
import { INK } from './palette';

/** Knee-deep water over the footpath and the plots' ground floors. */
export function drawFlood(ctx: Ctx, x0: number, x1: number, depth: number, t: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(95,160,200,0.45)';
  ctx.fillRect(x0, -16, x1 - x0, depth + 16);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = x0 - ((t * 20) % 40); x < x1; x += 40) {
    ctx.moveTo(x, -14);
    ctx.quadraticCurveTo(x + 10, -17, x + 20, -14);
  }
  ctx.stroke();
  ctx.restore();
}

/** A paper boat; returns nothing, the caller keeps the hit area. */
export function drawBoat(ctx: Ctx, x: number, y: number): void {
  poly(ctx, [x - 18, y - 8, x + 18, y - 8, x + 12, y, x - 12, y], '#e9c46a');
  line(ctx, x, y - 8, x, y - 30, INK, 1.4);
  poly(ctx, [x + 1, y - 30, x + 14, y - 12, x + 1, y - 12], '#fbf7ee');
  roundBox(ctx, x - 14, y - 46, 28, 12, 6, '#fbf7ee');
  fitText(ctx, '৳', x, y - 40, 20, 10, '#3d6fa3');
}

export function drawGenerator(ctx: Ctx, x: number): void {
  box(ctx, x - 9, -12, 18, 12, '#5f8f6b');
  box(ctx, x - 6, -9, 6, 6, '#3a2e25', false);
  line(ctx, x + 5, -12, x + 5, -18, INK, 1.4);
}

export function drawParking(ctx: Ctx, cx: number, label: string): void {
  for (let i = 0; i < 2; i++) {
    const x = cx - 60 + i * 64;
    box(ctx, x, -30, 56, 22, i ? '#3d6fa3' : '#c8553d');
    box(ctx, x, -14, 56, 8, '#f5efe2');
    for (let w = x + 4; w < x + 48; w += 11) box(ctx, w, -27, 8, 8, '#cfe3ea', false);
    circle(ctx, x + 12, -4, 4, '#3a3a40');
    circle(ctx, x + 44, -4, 4, '#3a3a40');
  }
  roundBox(ctx, cx - 20, -58, 40, 18, 3, '#3d6fa3');
  fitText(ctx, label, cx, -49, 36, 10, '#fffaf0');
}

export function drawCylinders(ctx: Ctx, cx: number, label: string): void {
  for (let i = 0; i < 6; i++) {
    const x = cx - 40 + (i % 3) * 16 + (i >= 3 ? 8 : 0);
    const y = i >= 3 ? -34 : -18;
    roundBox(ctx, x, y, 12, 18, 4, '#c8553d');
    box(ctx, x + 4, y - 3, 4, 3, '#9aa0a6', false);
  }
  roundBox(ctx, cx + 4, -52, 64, 16, 3, '#e9c46a');
  fitText(ctx, label, cx + 36, -44, 58, 9, INK);
}

export function drawBarricade(ctx: Ctx, x: number, y: number, label: string): void {
  box(ctx, x - 40, y - 14, 80, 8, '#f5efe2');
  for (let i = -36; i < 40; i += 14) box(ctx, x + i, y - 14, 7, 8, '#c8553d', false);
  line(ctx, x - 34, y - 6, x - 34, y, INK, 2);
  line(ctx, x + 34, y - 6, x + 34, y, INK, 2);
  roundBox(ctx, x - 26, y - 32, 52, 14, 3, '#3a3f58');
  fitText(ctx, label, x, y - 25, 48, 8, '#fffaf0');
}

export function drawJournalist(ctx: Ctx, x: number, t: number): void {
  box(ctx, x - 3, -8, 6, 8, '#3a3f58');
  box(ctx, x - 4, -17, 8, 10, '#f5efe2');
  circle(ctx, x, -20, 3, '#a8714a');
  box(ctx, x + 3, -18, 8, 6, '#2f3338');
  circle(ctx, x + 10, -15, 2, '#9aa0a6', false);
  // camera flash every couple of seconds
  if (Math.sin(t * 3) > 0.92) circle(ctx, x + 12, -15, 6, 'rgba(255,255,230,0.9)', false);
}

/** Election bunting strung between poles, in party-neutral colours. */
export function drawBunting(ctx: Ctx, x0: number, x1: number, y: number): void {
  ctx.strokeStyle = 'rgba(58,46,37,0.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.quadraticCurveTo((x0 + x1) / 2, y + 12, x1, y);
  ctx.stroke();
  const colors = ['#e9c46a', '#a8c5da', '#f5efe2', '#f28482'];
  for (let i = 1; i < 14; i++) {
    const k = i / 14;
    const x = x0 + (x1 - x0) * k;
    const yy = y + Math.sin(k * Math.PI) * 6;
    poly(ctx, [x - 4, yy, x + 4, yy, x, yy + 9], colors[i % 4]!, false);
  }
}

/** Warm paper lanterns for Ramadan evenings. */
export function drawLantern(ctx: Ctx, x: number, y: number): void {
  line(ctx, x, y - 10, x, y - 4, INK, 1);
  ellipse(ctx, x, y + 3, 5, 7, '#e9a03a');
  box(ctx, x - 3, y - 4, 6, 2, '#a77a2a', false);
}

export function drawMosquitoes(ctx: Ctx, cx: number, top: number, t: number): void {
  ctx.fillStyle = 'rgba(40,40,40,0.75)';
  for (let i = 0; i < 6; i++) {
    const x = cx + Math.sin(t * 2.3 + i * 1.7) * 30;
    const y = top + 20 + Math.cos(t * 3.1 + i) * 14 + i * 6;
    ctx.fillRect(x, y, 2, 1.4);
  }
}

export function drawFlyoverSign(ctx: Ctx, x: number, label: string): void {
  line(ctx, x, 0, x, -46, '#9aa0a6', 2.5);
  roundBox(ctx, x - 30, -62, 60, 16, 3, '#4f7c6b');
  fitText(ctx, label, x, -54, 54, 9, '#fffaf0');
}

/** A speech bubble with a tail pointing down to (x, y). */
export function drawBubble(ctx: Ctx, x: number, y: number, text: string, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `700 9px "Baloo 2", sans-serif`;
  const w = Math.min(150, ctx.measureText(text).width + 14);
  roundBox(ctx, x - w / 2, y - 24, w, 18, 8, '#fffdf7');
  poly(ctx, [x - 4, y - 7, x + 4, y - 7, x, y], '#fffdf7', false);
  fitText(ctx, text, x, y - 15, w - 8, 9, INK, 700);
  ctx.restore();
}
