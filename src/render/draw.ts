// Canvas 2D helpers in the paper cutout style. Shapes drawn with `paper = true` become cut paper
// pieces: slightly uneven edges and a soft drop shadow, with no outline. Edge jitter comes from a
// hash of quantised coordinates, so a shape looks identical every time it is drawn.
import { INK, PAPER_SHADOW } from './palette';
import { LANG } from '../config/lang';

export type Ctx = CanvasRenderingContext2D;

/** Smallest size fitText shrinks to: Bengali vowel signs need more pixels than Latin letters. */
const MIN_TEXT_PX = LANG === 'bn' ? 7 : 5;

export const FONT = LANG === 'bn'
  ? '"Baloo Da 2", "Baloo 2", "Trebuchet MS", system-ui, sans-serif'
  : '"Baloo 2", "Baloo Da 2", "Trebuchet MS", system-ui, sans-serif';

/** Edge jitter in world units. */
const WOBBLE = 0.4;
/** Shadow offset and blur in world units. */
const SHADOW_DX = 0.7;
const SHADOW_DY = 1.5;
const SHADOW_BLUR = 2.6;

/**
 * How paper shadows are drawn. Cached sprites use a real blur (drawn once). Anything drawn every
 * frame uses `blur: false`: an offset copy in the shadow colour, which costs no blur pass.
 */
const mode = { blur: false, scale: 1 };
export function setPaperMode(blur: boolean, devicePxPerUnit: number): void {
  mode.blur = blur;
  mode.scale = devicePxPerUnit;
}

/** Run `fn` in a given paper mode, then restore the previous one (sprites built mid-frame). */
export function withPaperMode(blur: boolean, devicePxPerUnit: number, fn: () => void): void {
  const prev = { ...mode };
  setPaperMode(blur, devicePxPerUnit);
  try {
    fn();
  } finally {
    setPaperMode(prev.blur, prev.scale);
  }
}

/**
 * Night lights. While a sprite bakes, windows and neon register a draw call here; the cache then
 * bakes them into a separate lights canvas that is shown after dark.
 */
export type LightDraw = (ctx: Ctx) => void;
export interface LightOp {
  /** Erase ops come from paper pieces laid over a window; they never count as a light. */
  erase: boolean;
  draw: LightDraw;
}
let lightSink: LightOp[] | null = null;
let lightSeed = 0;
/** Start (sink) or stop (null) collecting lights for a sprite. `seed` varies the lit pattern per building. */
export function collectLights(sink: LightOp[] | null, seed = 0): void {
  lightSink = sink;
  lightSeed = seed % 9973;
}
/** Register a light, captured with the current transform so it lands in the right place. */
export function addLight(ctx: Ctx, draw: LightDraw, erase = false): void {
  if (!lightSink) return;
  const m = ctx.getTransform();
  lightSink.push({
    erase,
    draw: (c) => {
      c.save();
      c.setTransform(m);
      draw(c);
      c.restore();
    },
  });
}
/** A lit window: warm glow in the window rectangle. Returns whether this window is lit. */
export function addWindowLight(ctx: Ctx, x: number, y: number, w: number, h: number, share: number): boolean {
  if (!lightSink) return false;
  if ((noise(x * 1.3 + 7 + lightSeed, y * 0.7 - lightSeed * 0.37) + 1) / 2 > share) return false;
  const warm = noise(y, x) > 0.4 ? '#ffe7a8' : '#ffd27a';
  addLight(ctx, (c) => {
    c.shadowColor = 'rgba(255,190,90,0.9)';
    c.shadowBlur = 6 * Math.hypot(c.getTransform().a, c.getTransform().b);
    c.fillStyle = warm;
    c.fillRect(x, y, w, h);
  });
  return true;
}

/** Deterministic noise in [-1, 1] from a point (quantised to 1/4 unit). */
export function noise(x: number, y: number): number {
  let h = Math.imul(Math.round(x * 4) | 0, 0x27d4eb2d) ^ Math.imul(Math.round(y * 4) | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h ^= h >>> 13;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

const mutedCache = new Map<string, string>();
/** Slightly desaturate a hex colour so hard-coded accents sit in the craft palette. */
export function mute(c: string): string {
  if (c.length !== 7 || c[0] !== '#') return c;
  const hit = mutedCache.get(c);
  if (hit) return hit;
  const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
  const grey = 0.3 * r + 0.59 * g + 0.11 * b;
  const k = 0.82;
  const mix = (v: number) => Math.round(Math.min(255, Math.max(0, grey + (v - grey) * k + 4)));
  const out = `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  mutedCache.set(c, out);
  return out;
}

/** Closed polygon with edges cut slightly unevenly. */
function cutPath(ctx: Ctx, pts: number[]): void {
  ctx.beginPath();
  const n = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const x1 = pts[2 * i]!, y1 = pts[2 * i + 1]!;
    const x2 = pts[(2 * i + 2) % pts.length]!, y2 = pts[(2 * i + 3) % pts.length]!;
    const seg = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 9));
    for (let k = 0; k < seg; k++) {
      const t = k / seg;
      const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      const px = x + noise(x, y) * WOBBLE, py = y + noise(y + 3.1, x) * WOBBLE;
      if (i === 0 && k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

/**
 * Fill a shape as a paper piece. `build` creates the path; it is called again for the shadow pass
 * because canvas paths are fixed in device space when built.
 */
export function paperShape(ctx: Ctx, fill: string, build: (c: Ctx) => void): void {
  ctx.save();
  if (mode.blur) {
    const s = mode.scale;
    ctx.shadowColor = PAPER_SHADOW;
    ctx.shadowBlur = SHADOW_BLUR * s;
    ctx.shadowOffsetX = SHADOW_DX * s;
    ctx.shadowOffsetY = SHADOW_DY * s;
  } else {
    ctx.translate(SHADOW_DX, SHADOW_DY);
    build(ctx);
    ctx.fillStyle = PAPER_SHADOW;
    ctx.fill();
    ctx.translate(-SHADOW_DX, -SHADOW_DY);
  }
  build(ctx);
  ctx.fillStyle = mute(fill);
  ctx.fill();
  ctx.restore();
  // a piece laid over a lit window hides that part of the light
  addLight(
    ctx,
    (c) => {
      c.globalCompositeOperation = 'destination-out';
      build(c);
      c.fill();
    },
    true,
  );
}

export function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, paper = true): void {
  if (!paper) {
    ctx.fillStyle = mute(fill);
    ctx.fillRect(x, y, w, h);
    return;
  }
  paperShape(ctx, fill, (c) => cutPath(c, [x, y, x + w, y, x + w, y + h, x, y + h]));
}

export function poly(ctx: Ctx, pts: number[], fill: string, paper = true): void {
  if (!paper) {
    ctx.beginPath();
    ctx.moveTo(pts[0]!, pts[1]!);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i]!, pts[i + 1]!);
    ctx.closePath();
    ctx.fillStyle = mute(fill);
    ctx.fill();
    return;
  }
  paperShape(ctx, fill, (c) => cutPath(c, pts));
}

export function roundBox(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, paper = true): void {
  const build = (c: Ctx) => {
    c.beginPath();
    c.roundRect(x, y, w, h, r);
  };
  if (!paper) {
    build(ctx);
    ctx.fillStyle = mute(fill);
    ctx.fill();
    return;
  }
  paperShape(ctx, fill, build);
}

export function circle(ctx: Ctx, x: number, y: number, r: number, fill: string, paper = true): void {
  ellipse(ctx, x, y, r, r, fill, paper);
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, paper = true): void {
  const build = (c: Ctx) => {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  };
  if (!paper) {
    build(ctx);
    ctx.fillStyle = mute(fill);
    ctx.fill();
    return;
  }
  paperShape(ctx, fill, build);
}

/** Thin detail line: string, wire, a grill bar. Not a paper piece. */
export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color = INK, width = 1.4): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = mute(color);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** Text that shrinks to fit `maxW`. Centered on cx, baseline-middle on cy. */
export function fitText(ctx: Ctx, text: string, cx: number, cy: number, maxW: number, size: number, color: string, weight = 800): void {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > MIN_TEXT_PX && ctx.measureText(text).width > maxW) {
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
