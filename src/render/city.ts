// Composes the street: backdrop, plots, building sprites, poles and selection. Reads state, never writes it.
import { BALANCE } from '../config/balance';
import { STRINGS } from '../config/strings';
import { plotCost } from '../sim/economy';
import type { GameState, Plot } from '../state/types';
import { formatTaka } from '../util/money';
import { hashSeed, mulberry32 } from '../util/rng';
import { getSprite, spriteScale } from './buildings/cache';
import { signboard } from './buildings/common';
import { ZOOM_MAX, ZOOM_MIN, type Camera } from './camera';
import { box, ellipse, fitText, line, poly, range, roundBox, type Ctx } from './draw';
import { GOLD, GROUND, GROUND_DARK, INK, LEAF, LEAF_DARK } from './palette';
import { FOOTPATH_H, drawBackdrop, drawPoles, drawStreet, drawTree } from './scene';

export const PLOT_W = 150;
export const PLOT_GAP = 14;
const MARGIN = 40;
/** Ground line as a fraction of the viewport height. */
const GROUND_FRAC = 0.8;

export function worldWidth(state: GameState): number {
  return MARGIN * 2 + state.plots.length * (PLOT_W + PLOT_GAP) - PLOT_GAP;
}

export function plotLeft(index: number): number {
  return MARGIN + index * (PLOT_W + PLOT_GAP);
}

export function plotAtWorldX(state: GameState, wx: number): number | null {
  for (const p of state.plots) {
    const l = plotLeft(p.index) - PLOT_GAP / 2;
    if (wx >= l && wx <= l + PLOT_W + PLOT_GAP) return p.index;
  }
  return null;
}

/** Zoom that fits the tallest building comfortably on first load. */
export function fitZoom(viewW: number, viewH: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.min(viewH / 620, viewW / 330)));
}

function groundScreenY(cam: Camera): number {
  return Math.round(cam.viewH * GROUND_FRAC);
}

function grassTufts(ctx: Ctx, x: number, w: number, rng: () => number): void {
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) {
    const gx = x + range(rng, 4, w - 4);
    ctx.strokeStyle = rng() < 0.5 ? LEAF : LEAF_DARK;
    ctx.beginPath();
    ctx.moveTo(gx - 3, 0);
    ctx.lineTo(gx - 4, -range(rng, 5, 11));
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx + 1, -range(rng, 7, 14));
    ctx.moveTo(gx + 3, 0);
    ctx.lineTo(gx + 5, -range(rng, 5, 10));
    ctx.stroke();
  }
}

function drawUnowned(ctx: Ctx, p: Plot, seed: number, price: string): void {
  const x = plotLeft(p.index);
  const rng = mulberry32(hashSeed(seed, 300, p.index));
  box(ctx, x, -5, PLOT_W, 5, GROUND_DARK, false);
  grassTufts(ctx, x, PLOT_W, rng);
  // bamboo fence
  for (let fx = x + 4; fx < x + PLOT_W; fx += 13) line(ctx, fx, 0, fx, -16, '#b08a4a', 2.5);
  line(ctx, x + 2, -12, x + PLOT_W - 2, -12, '#9c7a43', 2);
  line(ctx, x + 2, -6, x + PLOT_W - 2, -6, '#9c7a43', 2);
  // sale board on two sticks
  const cx = x + PLOT_W / 2;
  line(ctx, cx - 22, 0, cx - 22, -40, '#7a5a3a', 3);
  line(ctx, cx + 22, 0, cx + 22, -40, '#7a5a3a', 3);
  roundBox(ctx, cx - 36, -66, 72, 32, 3, '#fbf7ee');
  fitText(ctx, STRINGS.art.forSale, cx, -57, 64, 12, '#d7263d');
  fitText(ctx, price, cx, -43, 64, 10, INK, 700);
}

function drawEmptyLot(ctx: Ctx, p: Plot, seed: number): void {
  const x = plotLeft(p.index);
  const rng = mulberry32(hashSeed(seed, 400, p.index));
  box(ctx, x, -4, PLOT_W, 4, GROUND, false);
  line(ctx, x, -4, x + PLOT_W, -4, GROUND_DARK, 1.5);
  // corner pegs with string
  line(ctx, x + 6, 0, x + 6, -10, '#7a5a3a', 2);
  line(ctx, x + PLOT_W - 6, 0, x + PLOT_W - 6, -10, '#7a5a3a', 2);
  line(ctx, x + 6, -9, x + PLOT_W - 6, -9, '#e63946', 1);
  // brick stack and sand mound
  const bx = x + 18 + range(rng, 0, 10);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) box(ctx, bx + c * 8 + r * 4, -4 - (r + 1) * 5, 8, 5, '#b4553a');
  ellipse(ctx, x + PLOT_W - 34, -4, 20, 11, '#e2c67e');
  signboard(ctx, x + PLOT_W / 2 + 8, -40, 62, 12, STRINGS.art.reserved, '#1b9e5a', range(rng, -0.05, 0.05));
  line(ctx, x + PLOT_W / 2 + 8, -34, x + PLOT_W / 2 + 8, -4, '#7a5a3a', 2.5);
  fitText(ctx, STRINGS.art.reservedSub, x + PLOT_W / 2 + 8, -27, 60, 8, INK, 600);
}

function levelBadge(ctx: Ctx, cx: number, level: number): void {
  const max = level >= BALANCE.maxLevel;
  const text = max ? 'MAX' : `Lv ${level}`;
  roundBox(ctx, cx - 17, FOOTPATH_H * 0.5 - 7, 34, 14, 7, max ? GOLD : '#fbf7ee');
  fitText(ctx, text, cx, FOOTPATH_H * 0.5, 30, 10, INK);
}

export function drawCity(
  ctx: Ctx,
  state: GameState,
  cam: Camera,
  selected: number | null,
  dpr: number,
  timeSec: number,
): void {
  const gy = groundScreenY(cam);
  const scale = spriteScale(dpr, cam.zoom);
  drawBackdrop(ctx, cam, gy, state.seed, scale, timeSec);
  drawStreet(ctx, cam, gy, state.seed);

  ctx.save();
  ctx.translate(-cam.x * cam.zoom, gy);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.lineJoin = 'round';

  const viewL = cam.x - PLOT_W;
  const viewR = cam.x + cam.viewW / cam.zoom + PLOT_W;
  const visible = state.plots.filter((p) => plotLeft(p.index) + PLOT_W > viewL && plotLeft(p.index) < viewR);

  // trees in the gaps, behind everything
  for (let i = 0; i <= state.plots.length; i++) {
    const tx = plotLeft(i) - PLOT_GAP / 2;
    if (tx < viewL || tx > viewR) continue;
    const ts = hashSeed(state.seed, 200, i);
    if (ts % 100 < 45) drawTree(ctx, tx, ts);
  }

  const price = formatTaka(plotCost(state));
  for (const p of visible) {
    const cx = plotLeft(p.index) + PLOT_W / 2;
    if (!p.owned) drawUnowned(ctx, p, state.seed, price);
    else if (!p.building) drawEmptyLot(ctx, p, state.seed);
    else {
      ellipse(ctx, cx, 1, PLOT_W * 0.48, 5, 'rgba(43,35,32,0.22)', false);
      const s = getSprite(state.seed, p.index, p.building, scale);
      ctx.drawImage(s.canvas, cx - s.anchorX, -s.anchorY, s.w, s.h);
    }
  }

  // poles every two plots, in front of the buildings
  const poles: number[] = [];
  for (let i = 0; i <= state.plots.length; i += 2) poles.push(plotLeft(i) - PLOT_GAP / 2);
  drawPoles(ctx, poles, state.seed);

  for (const p of visible) {
    const cx = plotLeft(p.index) + PLOT_W / 2;
    if (p.building) levelBadge(ctx, cx, p.building.level);
    if (selected === p.index) {
      ctx.fillStyle = 'rgba(214,51,108,0.18)';
      ctx.fillRect(plotLeft(p.index) - 4, -2, PLOT_W + 8, FOOTPATH_H + 2);
      const top = p.building ? getSprite(state.seed, p.index, p.building, scale).height : 70;
      const bob = Math.sin(timeSec * 4) * 4;
      const ay = -top - 18 + bob;
      poly(ctx, [cx - 10, ay - 12, cx + 10, ay - 12, cx, ay], '#d6336c');
    }
  }
  ctx.restore();
}
