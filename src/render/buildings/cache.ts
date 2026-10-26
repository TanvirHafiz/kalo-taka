// Pre-rendered building sprites. A building is drawn once per (seed, level, scale) and then blitted.
import type { Category } from '../../config/buildings';
import type { Building } from '../../state/types';
import { hashSeed } from '../../util/rng';
import { collectLights, withPaperMode, type LightOp } from '../draw';
import { foodDesign } from './food';
import { healthcareDesign } from './healthcare';
import { housingDesign, type Design } from './housing';
import { retailDesign } from './retail';

/** Fixed per category so adding categories never changes existing seeds. */
const CATEGORY_INDEX: Record<Category, number> = { housing: 1, food: 2, healthcare: 3, retail: 4 };

const PAD = 24;
/** Cache budget in device pixels (about 48 MB of RGBA). */
const PIXEL_BUDGET = 12_000_000;

export interface Sprite {
  canvas: HTMLCanvasElement;
  /** World-unit offset from the sprite's top-left to the ground-centre anchor. */
  anchorX: number;
  anchorY: number;
  /** World-unit size. */
  w: number;
  h: number;
  /** Height of the building itself above ground, in world units. */
  height: number;
  /** Recorded light ops; baked into `lights` the first time it is needed after dark. */
  lightOps: LightOp[] | null;
  /** Lit windows and neon, same size as `canvas`. Undefined until baked, null if none. */
  lights: HTMLCanvasElement | null | undefined;
  key: string;
}

function spritePixels(s: Sprite): number {
  return s.canvas.width * s.canvas.height + (s.lights ? s.lights.width * s.lights.height : 0);
}

const cache = new Map<string, Sprite>();
let pixels = 0;

export function buildingSeed(runSeed: number, plotIndex: number, b: Building): number {
  // a relocated building carries the look of the plot it was built on
  return hashSeed(runSeed, b.look ?? plotIndex, b.tier, CATEGORY_INDEX[b.category]);
}

function designFor(b: Building, seed: number): Design {
  switch (b.category) {
    case 'food': return foodDesign(b, seed);
    case 'healthcare': return healthcareDesign(b, seed);
    case 'retail': return retailDesign(b, seed);
    default: return housingDesign(b, seed);
  }
}

/**
 * Three scale buckets, so pinch-zoom never re-renders at every step. Zoomed out, sprites are baked
 * at the screen's real density: a wide view shows ~40 buildings, and full-size sprites (plus their
 * night lights) would overflow the cache and re-bake every few frames. DPR is capped at 2.
 */
export function spriteScale(dpr: number, zoom: number): number {
  return Math.min(2, Math.max(1, dpr)) * (zoom > 1.1 ? 1.5 : zoom < 0.85 ? 0.6 : 1);
}

export function getSprite(runSeed: number, plotIndex: number, b: Building, scale: number): Sprite {
  const seed = buildingSeed(runSeed, plotIndex, b);
  const key = `${seed}|${b.category}|${b.tier}|${b.level}|${scale}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const design = designFor(b, seed);
  const w = design.halfW * 2 + PAD * 2;
  const h = design.height + PAD * 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * scale);
  canvas.height = Math.ceil(h * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.translate(design.halfW + PAD, design.height + PAD);
  ctx.lineJoin = 'round';
  const ops: LightOp[] = [];
  collectLights(ops, seed);
  try {
    withPaperMode(true, scale, () => design.draw(ctx));
  } finally {
    collectLights(null);
  }
  const hasLights = ops.some((o) => !o.erase);
  const sprite: Sprite = {
    canvas, anchorX: design.halfW + PAD, anchorY: design.height + PAD, w, h, height: design.height,
    lightOps: hasLights ? ops : null,
    lights: hasLights ? undefined : null,
    key,
  };
  cache.set(key, sprite);
  pixels += spritePixels(sprite);
  while (pixels > PIXEL_BUDGET && cache.size > 1) {
    const [oldKey, old] = cache.entries().next().value as [string, Sprite];
    cache.delete(oldKey);
    pixels -= spritePixels(old);
  }
  return sprite;
}

/** The sprite's night lights, baked on first use. Null if the building has no lights. */
export function spriteLights(sprite: Sprite): HTMLCanvasElement | null {
  if (sprite.lights !== undefined) return sprite.lights;
  const lights = document.createElement('canvas');
  lights.width = sprite.canvas.width;
  lights.height = sprite.canvas.height;
  const lctx = lights.getContext('2d')!;
  for (const op of sprite.lightOps ?? []) op.draw(lctx);
  sprite.lights = lights;
  sprite.lightOps = null;
  // count it only while the sprite is still cached; an evicted sprite was already subtracted
  if (cache.get(sprite.key) === sprite) pixels += lights.width * lights.height;
  return lights;
}

export function clearSpriteCache(): void {
  cache.clear();
  pixels = 0;
}
