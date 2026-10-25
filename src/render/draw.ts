// Small Canvas 2D helpers: flat fills with a 2 px dark outline.
import { INK, LINE } from './palette';

export type Ctx = CanvasRenderingContext2D;

export const FONT = '"Baloo 2", "Trebuchet MS", system-ui, sans-serif';

export function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, stroke = true): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  if (stroke) {
    ctx.lineWidth = LINE;
    ctx.strokeStyle = INK;
    ctx.strokeRect(x, y, w, h);
  }
}

export function poly(ctx: Ctx, pts: number[], fill: string, stroke = true): void {
  ctx.beginPath();
  ctx.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i]!, pts[i + 1]!);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = LINE;
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export function roundBox(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = true): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = LINE;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

export function circle(ctx: Ctx, x: number, y: number, r: number, fill: string, stroke = true): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = LINE;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke = true): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = LINE;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color = INK, width = LINE): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** Text that shrinks to fit `maxW`. Centered on cx, baseline-middle on cy. */
export function fitText(ctx: Ctx, text: string, cx: number, cy: number, maxW: number, size: number, color: string, weight = 800): void {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > 5 && ctx.measureText(text).width > maxW) {
    s -= 0.5;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + s * 0.06);
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

export function range(rng: () => number, a: number, b: number): number {
  return a + rng() * (b - a);
}
