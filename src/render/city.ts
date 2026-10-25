// Composes the street: backdrop, plots, building sprites, poles and selection. Reads state, never writes it.
import { BALANCE } from '../config/balance';
import { STRINGS } from '../config/strings';
import { dayPhase } from '../sim/daycycle';
import { plotCost, totalIncome } from '../sim/economy';
import type { GameState, Plot } from '../state/types';
import { formatTaka } from '../util/money';
import { hashSeed, mulberry32 } from '../util/rng';
import { getSprite, spriteLights, spriteScale } from './buildings/cache';
import { signboard } from './buildings/common';
import { ZOOM_MAX, ZOOM_MIN, type Camera } from './camera';
import { box, ellipse, fitText, line, poly, range, roundBox, setPaperMode, type Ctx } from './draw';
import { GOLD, GROUND, GROUND_DARK, INK, LEAF, LEAF_DARK } from './palette';
import { Effects, type PlotFx } from './effects';
import { drawTint, lightingAt } from './lighting';
import { People } from './people';
import { CURB_H, FOOTPATH_H, drawBackdrop, drawLampGlow, drawPoles, drawSkylineLights, drawStreet, drawTree } from './scene';
import { Traffic } from './traffic';

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

interface SpriteLike {
  anchorX: number;
  anchorY: number;
  w: number;
  h: number;
  height: number;
}

/** Draw a building image (sprite or its lights) at a plot, applying an animation transform. */
function blit(ctx: Ctx, img: HTMLCanvasElement, cx: number, s: SpriteLike, fx: PlotFx | null): void {
  ctx.save();
  ctx.translate(cx + (fx?.dx ?? 0), fx?.dy ?? 0);
  if (fx) {
    ctx.scale(fx.sx, fx.sy);
    if (fx.reveal < 1) {
      const top = -s.height * fx.reveal;
      ctx.beginPath();
      ctx.rect(-s.anchorX, top, s.w, s.h - s.anchorY - top);
      ctx.clip();
    }
  }
  ctx.drawImage(img, -s.anchorX, -s.anchorY, s.w, s.h);
  ctx.restore();
}

/** Owns everything visual that lives between frames: traffic, people and animations. */
export class CityRenderer {
  readonly traffic = new Traffic();
  readonly people = new People();
  readonly effects = new Effects();
  private lastNow = 0;
  private lights: CanvasRenderingContext2D | null = null;

  /** A cleared, screen-sized canvas for composing night lights. */
  private lightLayer(w: number, h: number): CanvasRenderingContext2D {
    if (!this.lights) this.lights = document.createElement('canvas').getContext('2d')!;
    const c = this.lights.canvas;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    this.lights.setTransform(1, 0, 0, 1, 0, 0);
    this.lights.clearRect(0, 0, w, h);
    return this.lights;
  }

  frame(ctx: Ctx, state: GameState, cam: Camera, selected: number | null, dpr: number, nowMs: number, timeSec: number): void {
    // clamp the step: a tab coming back from the background must not teleport the traffic
    const dt = this.lastNow ? Math.min(0.05, Math.max(0, (nowMs - this.lastNow) / 1000)) : 0;
    this.lastNow = nowMs;
    const light = lightingAt(dayPhase(nowMs));
    const gy = groundScreenY(cam);
    const scale = spriteScale(dpr, cam.zoom);
    const ww = worldWidth(state);
    const built = state.plots.filter((p) => p.building);
    const plotX = (i: number) => plotLeft(i) + PLOT_W / 2;

    this.traffic.update(dt, timeSec, ww, totalIncome(state), built.some((p) => p.building!.tier >= 5));
    this.people.update(dt, ww, FOOTPATH_H, built.map((p) => plotX(p.index)), built.length);
    this.effects.update(nowMs);

    // Per-frame shapes use the cheap offset shadow; sprites switch to blurred shadows while baking.
    setPaperMode(false, dpr * cam.zoom);
    drawBackdrop(ctx, cam, gy, state.seed, scale, timeSec, light);
    drawStreet(ctx, cam, gy, state.seed);

    const viewL = cam.x - PLOT_W;
    const viewR = cam.x + cam.viewW / cam.zoom + PLOT_W;
    const visible = state.plots.filter((p) => plotLeft(p.index) + PLOT_W > viewL && plotLeft(p.index) < viewR);
    const roadTop = FOOTPATH_H + CURB_H;
    const roadH = (cam.viewH - gy) / cam.zoom - roadTop;
    // lanes keep a minimum depth so vehicles never stand on the footpath on short screens
    const farY = roadTop + Math.max(roadH * 0.46, 34);
    const nearY = Math.max(roadTop + roadH * 0.94, farY + 26);
    const poles: number[] = [];
    for (let i = 0; i <= state.plots.length; i += 2) poles.push(plotLeft(i) - PLOT_GAP / 2);

    // what each visible plot shows this frame (a merge shows the old buildings while it shakes)
    const shown = visible.map((p) => {
      const b = p.building;
      const sprite = b ? getSprite(state.seed, p.index, b, scale) : null;
      const fx = this.effects.plotFx(p.index, nowMs, sprite ? Math.round(sprite.height / 24) : 4);
      const drawB = fx?.ghost ?? b;
      const drawS = fx?.ghost ? getSprite(state.seed, p.index, fx.ghost, scale) : sprite;
      return { p, b: drawB, s: drawS, fx };
    });

    const world = () => {
      ctx.translate(-cam.x * cam.zoom, gy);
      ctx.scale(cam.zoom, cam.zoom);
    };

    // The world in layers, so the night-lights pass can replay any layer as an eraser.
    const price = formatTaka(plotCost(state));
    const trees = (c: Ctx) => {
      for (let i = 0; i <= state.plots.length; i++) {
        const tx = plotLeft(i) - PLOT_GAP / 2;
        if (tx < viewL || tx > viewR) continue;
        const ts = hashSeed(state.seed, 200, i);
        if (ts % 100 < 45) drawTree(c, tx, ts);
      }
    };
    const plots = (c: Ctx, shadows: boolean) => {
      for (const { p, b, s, fx } of shown) {
        const cx = plotX(p.index);
        if (!p.owned) drawUnowned(c, p, state.seed, price);
        else if (!b || !s) drawEmptyLot(c, p, state.seed);
        else {
          if (shadows) ellipse(c, cx, 1, PLOT_W * 0.46, 4, 'rgba(70,42,16,0.18)', false);
          blit(c, s.canvas, cx, s, fx);
        }
      }
    };
    const front = (c: Ctx) => {
      this.effects.drawOverlays(c, nowMs, plotX, (i) => {
        const b = state.plots[i]?.building;
        return b ? getSprite(state.seed, i, b, scale).height : 60;
      });
      drawPoles(c, poles, state.seed);
      this.people.draw(c, viewL, viewR);
      this.traffic.draw(c, scale, viewL, viewR, farY, nearY, timeSec);
    };

    ctx.save();
    world();
    ctx.lineJoin = 'round';
    trees(ctx);
    plots(ctx, true);
    front(ctx);
    ctx.restore();

    // dusk and night: tint everything, then lights on top
    drawTint(ctx, cam.viewW, cam.viewH, light);
    if (light.night > 0.02) {
      // Lights are composed back to front in their own layer: each light source is drawn, then
      // everything standing in front of it is erased, so nothing glows through a pole or a person.
      const base = ctx.getTransform();
      const L = this.lightLayer(ctx.canvas.width, ctx.canvas.height);
      L.setTransform(base);
      drawSkylineLights(L, cam, gy, state.seed, scale, 1);
      L.save();
      L.translate(-cam.x * cam.zoom, gy);
      L.scale(cam.zoom, cam.zoom);
      L.globalCompositeOperation = 'destination-out';
      trees(L);
      plots(L, false);
      L.globalCompositeOperation = 'source-over';
      for (const { p, s, fx } of shown) {
        if (!s) continue;
        const lights = spriteLights(s);
        if (lights) blit(L, lights, plotX(p.index), s, fx);
      }
      L.globalCompositeOperation = 'destination-out';
      front(L);
      L.restore();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = light.night;
      ctx.drawImage(L.canvas, 0, 0);
      ctx.restore();

      ctx.save();
      world();
      drawLampGlow(ctx, poles, light.night);
      this.traffic.drawLights(ctx, viewL, viewR, farY, nearY, light.night);
      ctx.restore();
    }

    // labels stay readable at night, so they go on last
    ctx.save();
    world();
    for (const { p, b, s } of shown) {
      const cx = plotX(p.index);
      if (b) levelBadge(ctx, cx, b.level);
      if (selected === p.index) {
        ctx.fillStyle = 'rgba(214,51,108,0.18)';
        ctx.fillRect(plotLeft(p.index) - 4, -2, PLOT_W + 8, FOOTPATH_H + 2);
        const top = s ? s.height : 70;
        const bob = Math.sin(timeSec * 4) * 4;
        const ay = -top - 18 + bob;
        poly(ctx, [cx - 10, ay - 12, cx + 10, ay - 12, cx, ay], '#d6336c');
      }
    }
    ctx.restore();
  }
}
