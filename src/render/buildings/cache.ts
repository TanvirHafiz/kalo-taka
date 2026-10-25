// Pre-rendered building sprites. A building is drawn once per (seed, level, scale) and then blitted.
import type { Category } from '../../config/buildings';
import type { Building } from '../../state/types';
import { hashSeed } from '../../util/rng';
import { withPaperMode } from '../draw';
import { housingDesign, type Design } from './housing';

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
}

const cache = new Map<string, Sprite>();
let pixels = 0;

export function buildingSeed(runSeed: number, plotIndex: number, b: Building): number {
  return hashSeed(runSeed, plotIndex, b.tier, CATEGORY_INDEX[b.category]);
}

function designFor(b: Building, seed: number): Design {
  // Other categories arrive in M3; they reuse housing art until then.
  return housingDesign(b, seed);
}

/** Two scale buckets only, so pinch-zoom never re-renders at every step. DPR is capped at 2. */
export function spriteScale(dpr: number, zoom: number): number {
  return Math.min(2, Math.max(1, dpr)) * (zoom > 1.1 ? 1.5 : 1);
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
  withPaperMode(true, scale, () => design.draw(ctx));
  const sprite: Sprite = { canvas, anchorX: design.halfW + PAD, anchorY: design.height + PAD, w, h, height: design.height };
  cache.set(key, sprite);
  pixels += canvas.width * canvas.height;
  while (pixels > PIXEL_BUDGET && cache.size > 1) {
    const [oldKey, old] = cache.entries().next().value as [string, Sprite];
    cache.delete(oldKey);
    pixels -= old.canvas.width * old.canvas.height;
  }
  return sprite;
}

export function clearSpriteCache(): void {
  cache.clear();
  pixels = 0;
}
