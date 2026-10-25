// Street backdrop in paper cutout style: flat paper sky with a torn horizon strip, paper clouds and
// sun, layered paper skyline, a footpath strip casting a shadow on the road, poles and wires.
import { hashSeed, mulberry32 } from '../util/rng';
import type { Camera } from './camera';
import { box, circle, line, paperShape, pick, range, withPaperMode, type Ctx } from './draw';
import {
  CLOUD, CURB_A, CURB_B, FOOTPATH, FOOTPATH_LINE, LEAF, LEAF_DARK, PAPER_SHADOW, POLE, ROAD, ROAD_MARK, ROAD_PATCH, SKY,
  SKYLINE_FAR, SKYLINE_NEAR, SKYLINE_NEAR_WIN, SKY_BAND, SUN, WIRE,
} from './palette';

export const FOOTPATH_H = 22;
export const CURB_H = 6;
const TILE_W = 1200;
const TILE_H = 280;

interface Tile {
  canvas: HTMLCanvasElement;
  scale: number;
}

const tiles = new Map<string, Tile>();

export function clearSceneCache(): void {
  tiles.clear();
}

function skylineTile(seed: number, layer: 'far' | 'near', scale: number): Tile {
  const key = `${seed}|${layer}|${scale}`;
  const hit = tiles.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(TILE_W * scale);
  canvas.height = Math.ceil(TILE_H * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  const rng = mulberry32(hashSeed(seed, layer === 'far' ? 11 : 12));
  const base = TILE_H + 4;
  const color = layer === 'far' ? SKYLINE_FAR : SKYLINE_NEAR;
  withPaperMode(true, scale, () => {
    let x = 0;
    while (x < TILE_W) {
      const w = range(rng, 30, layer === 'far' ? 72 : 58);
      const h = layer === 'far' ? range(rng, 70, 250) : range(rng, 40, 170);
      const ww = Math.min(w, TILE_W - x);
      const r = rng();
      // rooftop clutter goes first so the block covers its base
      if (r < 0.3) box(ctx, x + ww * 0.3, base - h - 10, 10, 12, color);
      else if (r < 0.42) line(ctx, x + ww * 0.5, base - h, x + ww * 0.5, base - h - 22, color, 2);
      else if (r < 0.5 && layer === 'far') {
        line(ctx, x + ww * 0.5, base - h, x + ww * 0.5, base - h - 60, color, 3);
        line(ctx, x + ww * 0.5 - 30, base - h - 58, x + ww * 0.5 + 25, base - h - 58, color, 3);
      }
      box(ctx, x, base - h, ww, h, color);
      if (layer === 'near') {
        ctx.fillStyle = SKYLINE_NEAR_WIN;
        for (let wy = base - h + 8; wy < base - 14; wy += 12) {
          for (let wx = x + 5; wx < x + ww - 6; wx += 9) if (rng() < 0.7) ctx.fillRect(wx, wy, 4, 5);
        }
      }
      x += w + (layer === 'far' ? 2 : range(rng, 2, 8));
    }
  });
  const tile = { canvas, scale };
  tiles.set(key, tile);
  return tile;
}

function drawLayer(ctx: Ctx, cam: Camera, groundY: number, seed: number, layer: 'far' | 'near', parallax: number, scale: number): void {
  const tile = skylineTile(seed, layer, scale);
  const tw = TILE_W * cam.zoom;
  const th = TILE_H * cam.zoom;
  const offset = ((cam.x * cam.zoom * parallax) % tw + tw) % tw;
  for (let x = -offset; x < cam.viewW; x += tw) ctx.drawImage(tile.canvas, x, groundY - th, tw, th);
}

function cloud(ctx: Ctx, x: number, y: number, s: number): void {
  paperShape(ctx, CLOUD, () => {
    ctx.beginPath();
    ctx.arc(x, y, 14 * s, Math.PI, 0);
    ctx.arc(x + 20 * s, y - 6 * s, 18 * s, Math.PI, 0);
    ctx.arc(x + 42 * s, y, 13 * s, Math.PI, 0);
    ctx.closePath();
  });
}

/** Everything behind the plots, in screen space. */
export function drawBackdrop(ctx: Ctx, cam: Camera, groundY: number, seed: number, scale: number, timeSec: number): void {
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, cam.viewW, groundY + 2);

  // torn paper strip along the horizon, anchored to the world with a little parallax
  const off = cam.x * cam.zoom * 0.15;
  const top = groundY * 0.6;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 2);
  for (let sx = 0; sx <= cam.viewW + 8; sx += 8) {
    const wx = sx + off;
    ctx.lineTo(sx, top + Math.sin(wx * 0.021) * 6 + Math.sin(wx * 0.093) * 2.2);
  }
  ctx.lineTo(cam.viewW, groundY + 2);
  ctx.closePath();
  ctx.fillStyle = SKY_BAND;
  ctx.fill();

  const sunX = cam.viewW * 0.78 - cam.x * cam.zoom * 0.02;
  circle(ctx, sunX, groundY * 0.28, 34 * cam.zoom, SUN);

  const rng = mulberry32(hashSeed(seed, 5));
  const span = cam.viewW + 300;
  for (let i = 0; i < 7; i++) {
    const baseX = rng() * span;
    const y = range(rng, 0.12, 0.45) * groundY;
    const s = range(rng, 0.7, 1.3) * cam.zoom;
    const speed = range(rng, 2, 6);
    const x = ((baseX - cam.x * cam.zoom * 0.08 + timeSec * speed) % span + span) % span - 150;
    cloud(ctx, x, y, s);
  }

  drawLayer(ctx, cam, groundY, seed, 'far', 0.2, scale);
  drawLayer(ctx, cam, groundY, seed, 'near', 0.45, scale);
}

/** Street-side trees between plots, in world space (drawn behind buildings). */
export function drawTree(ctx: Ctx, x: number, seed: number): void {
  const rng = mulberry32(seed);
  const h = range(rng, 60, 95);
  box(ctx, x - 2.5, -h, 5, h, '#7a5236');
  const leaf = rng() < 0.5 ? LEAF : LEAF_DARK;
  const other = leaf === LEAF ? LEAF_DARK : LEAF;
  for (let i = 0; i < 5; i++) circle(ctx, x + range(rng, -18, 18), -h + range(rng, -12, 10), range(rng, 12, 18), i % 2 ? other : leaf);
  circle(ctx, x, -h - 6, 15, other);
}

/** Footpath, curb and road, in screen space below the ground line. */
export function drawStreet(ctx: Ctx, cam: Camera, groundY: number, seed: number): void {
  const z = cam.zoom;
  const fpH = FOOTPATH_H * z;
  const curbH = CURB_H * z;
  const roadTop = groundY + fpH + curbH;

  ctx.fillStyle = ROAD;
  ctx.fillRect(0, groundY, cam.viewW, cam.viewH - groundY);
  const rng = mulberry32(hashSeed(seed, 21));
  const roadH = cam.viewH - roadTop;
  for (let i = 0; i < 40; i++) {
    const wx = rng() * 4000;
    const sx = (wx - cam.x) * z;
    const sy = roadTop + rng() * roadH;
    const w = range(rng, 20, 60) * z;
    if (sx < -w || sx > cam.viewW) continue;
    ctx.fillStyle = ROAD_PATCH;
    ctx.fillRect(sx, sy, w, range(rng, 4, 10) * z);
  }
  const dash = 40 * z;
  const doff = ((cam.x * z) % (dash * 2) + dash * 2) % (dash * 2);
  for (let x = -doff; x < cam.viewW; x += dash * 2) {
    ctx.fillStyle = PAPER_SHADOW;
    ctx.fillRect(x + 1, roadTop + roadH * 0.5 - z, dash, 4 * z);
    ctx.fillStyle = ROAD_MARK;
    ctx.fillRect(x, roadTop + roadH * 0.5 - 2 * z, dash, 4 * z);
  }

  // footpath strip and curb are one paper layer above the road
  ctx.fillStyle = PAPER_SHADOW;
  ctx.fillRect(0, roadTop, cam.viewW, 3 * z);
  ctx.fillStyle = FOOTPATH;
  ctx.fillRect(0, groundY, cam.viewW, fpH);
  ctx.strokeStyle = FOOTPATH_LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const tile = 18 * z;
  const off = ((cam.x * z) % tile + tile) % tile;
  for (let x = -off; x < cam.viewW; x += tile) {
    ctx.moveTo(x, groundY);
    ctx.lineTo(x, groundY + fpH);
  }
  ctx.moveTo(0, groundY + fpH / 2);
  ctx.lineTo(cam.viewW, groundY + fpH / 2);
  ctx.stroke();
  const stripe = 14 * z;
  const coff = ((cam.x * z) % (stripe * 2) + stripe * 2) % (stripe * 2);
  for (let x = -coff, i = 0; x < cam.viewW; x += stripe, i++) {
    ctx.fillStyle = i % 2 ? CURB_B : CURB_A;
    ctx.fillRect(x, groundY + fpH, stripe, curbH);
  }
}

/** Electric poles and tangled wires along the footpath, in world space (drawn in front). */
export function drawPoles(ctx: Ctx, xs: number[], seed: number): void {
  const top = -150;
  const base = FOOTPATH_H * 0.35;
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i]!;
    const b = xs[i + 1]!;
    const rng = mulberry32(hashSeed(seed, 31, i));
    ctx.strokeStyle = WIRE;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const y = top + 6 + k * 4;
      const sag = range(rng, 10, 26);
      ctx.moveTo(a, y);
      ctx.quadraticCurveTo((a + b) / 2 + range(rng, -20, 20), y + sag, b, y + range(rng, -2, 2));
    }
    ctx.stroke();
  }
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i]!;
    const rng = mulberry32(hashSeed(seed, 41, i));
    box(ctx, x - 3, top, 6, base - top, POLE);
    box(ctx, x - 16, top + 6, 32, 4, POLE);
    ctx.strokeStyle = WIRE;
    ctx.lineWidth = 0.9;
    for (let c = 0; c < 3; c++) {
      ctx.beginPath();
      ctx.ellipse(x + range(rng, -4, 4), top + 24 + c * 3, range(rng, 6, 10), 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (rng() < 0.35) box(ctx, x - 8, top + 40, 16, 18, '#8a9a88');
    if (rng() < 0.5) {
      // old notices pasted on the pole
      box(ctx, x - 5, -46, 10, 13, pick(rng, ['#f5efe2', '#e9c46a', '#a8c5da']));
    }
  }
}
