// Composes the street: backdrop, plots, building sprites, poles, street life and labels.
// Reads state, never writes it. Plot positions come from (district, row, slot), never from ids.
import { BALANCE } from '../config/balance';
import { DISTRICTS } from '../config/buildings';
import { BUBBLES, STRINGS, fmt } from '../config/strings';
import { dayPhase } from '../sim/daycycle';
import { baseIncome, neighbourBonus, patients, plotCost } from '../sim/economy';
import { districtCount, plotById } from '../sim/layout';
import { CORRUPTION } from '../config/balance';
import { EVENT_TUNING, type EventId } from '../config/events';
import type { GameState, Job, Plot } from '../state/types';
import { formatRate, formatTaka } from '../util/money';
import { hashSeed, mulberry32 } from '../util/rng';
import { getSprite, spriteLights, spriteScale, type Sprite } from './buildings/cache';
import { signboard } from './buildings/common';
import { ZOOM_MAX, ZOOM_MIN, screenToWorldX, type Camera } from './camera';
import { skyStyle } from './districts';
import { box, circle, ellipse, fitText, line, paperShape, poly, range, roundBox, setPaperMode, type Ctx } from './draw';
import { Effects, type PlotFx } from './effects';
import { drawFill, drawGrabFlag, drawInquiry, drawPermitBar, drawPoster, drawScaffold, posterImage } from './corruptionArt';
import { drawBarricade, drawBoat, drawBubble, drawBunting, drawCylinders, drawFlood, drawFlyoverSign, drawGenerator, drawJournalist, drawLantern, drawMosquitoes, drawParking } from './eventArt';
import { drawTint, lightingAt } from './lighting';
import { GOLD, GROUND, GROUND_DARK, INK, LEAF, LEAF_DARK } from './palette';
import { People } from './people';
import { CURB_H, FOOTPATH_H, drawBackdrop, drawLampGlow, drawPoles, drawSkylineLights, drawStreet, drawTree } from './scene';
import { Traffic } from './traffic';

export const PLOT_W = 150;
export const PLOT_GAP = 14;
const MARGIN = 40;
/** Space between districts, where the gate stands. */
const GATE_W = 110;
const DISTRICT_W = BALANCE.plotsPerRow * (PLOT_W + PLOT_GAP) - PLOT_GAP;
/** Back row: drawn smaller, higher and shifted half a plot so it peeks between front buildings. */
const BACK_SCALE = 0.8;
const BACK_Y = -24;
const BACK_SHIFT = (PLOT_W + PLOT_GAP) / 2;
/** Ground line as a fraction of the viewport height. */
const GROUND_FRAC = 0.8;
/** Room after the last district for the "next district" sign. */
const TAIL_W = 220;

export function districtLeft(d: number): number {
  return MARGIN + d * (DISTRICT_W + GATE_W);
}

export function worldWidth(state: GameState): number {
  const n = districtCount(state);
  return districtLeft(n - 1) + DISTRICT_W + MARGIN + (n < DISTRICTS.length ? TAIL_W : 0);
}

/** Centre x of a plot in world units. */
export function plotCenter(p: Plot): number {
  return districtLeft(p.district) + p.slot * (PLOT_W + PLOT_GAP) + PLOT_W / 2 + (p.row === 'back' ? BACK_SHIFT : 0);
}

/** District under a world x (for the HUD chip). */
export function districtAtX(state: GameState, wx: number): number {
  const n = districtCount(state);
  for (let d = n - 1; d >= 0; d--) if (wx >= districtLeft(d) - GATE_W / 2) return d;
  return 0;
}

/** Portrait screens zoom in so the street, not the sky, fills most of the height. */
const PORTRAIT_FILL = 0.66;
const PORTRAIT_REF_HEIGHT = 340;

/**
 * Starting zoom. Landscape fits the tallest building; portrait fills about 2/3 of the height with
 * the street (a mid-size building reaches the top of that band) and the player pans up for towers.
 */
export function fitZoom(viewW: number, viewH: number): number {
  const z = viewH > viewW * 1.2 ? (viewH * PORTRAIT_FILL) / PORTRAIT_REF_HEIGHT : Math.min(viewH / 620, viewW / 330);
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

function groundScreenY(cam: Camera): number {
  return Math.round(cam.viewH * GROUND_FRAC + cam.y);
}

/** How far up the camera may pan: enough to see the top of the tallest building under the HUD. */
export function maxPanY(state: GameState, cam: Camera, dpr: number): number {
  const scale = spriteScale(dpr, cam.zoom);
  let tallest = 0;
  for (const p of state.plots) if (p.building) tallest = Math.max(tallest, getSprite(state.seed, p.index, p.building, scale).height);
  const headroom = cam.viewH * GROUND_FRAC - 130;
  return Math.max(0, (tallest + 40) * cam.zoom - headroom);
}

/** Apply the back-row transform (smaller, higher) around a plot centre. */
function rowTransform(c: Ctx, p: Plot): void {
  if (p.row !== 'back') return;
  const cx = plotCenter(p);
  c.translate(cx, BACK_Y);
  c.scale(BACK_SCALE, BACK_SCALE);
  c.translate(-cx, 0);
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
  const x = plotCenter(p) - PLOT_W / 2;
  const rng = mulberry32(hashSeed(seed, 300, p.index));
  box(ctx, x, -5, PLOT_W, 5, GROUND_DARK, false);
  grassTufts(ctx, x, PLOT_W, rng);
  for (let fx = x + 4; fx < x + PLOT_W; fx += 13) line(ctx, fx, 0, fx, -16, '#b08a4a', 2.5);
  line(ctx, x + 2, -12, x + PLOT_W - 2, -12, '#9c7a43', 2);
  line(ctx, x + 2, -6, x + PLOT_W - 2, -6, '#9c7a43', 2);
  const cx = x + PLOT_W / 2;
  line(ctx, cx - 22, 0, cx - 22, -40, '#7a5a3a', 3);
  line(ctx, cx + 22, 0, cx + 22, -40, '#7a5a3a', 3);
  roundBox(ctx, cx - 36, -66, 72, 32, 3, '#fbf7ee');
  fitText(ctx, STRINGS.art.forSale, cx, -57, 64, 12, '#d7263d');
  fitText(ctx, price, cx, -43, 64, 10, INK, 700);
}

function drawEmptyLot(ctx: Ctx, p: Plot, seed: number): void {
  const x = plotCenter(p) - PLOT_W / 2;
  const rng = mulberry32(hashSeed(seed, 400, p.index));
  box(ctx, x, -4, PLOT_W, 4, GROUND, false);
  line(ctx, x, -4, x + PLOT_W, -4, GROUND_DARK, 1.5);
  line(ctx, x + 6, 0, x + 6, -10, '#7a5a3a', 2);
  line(ctx, x + PLOT_W - 6, 0, x + PLOT_W - 6, -10, '#7a5a3a', 2);
  line(ctx, x + 6, -9, x + PLOT_W - 6, -9, '#e63946', 1);
  const bx = x + 18 + range(rng, 0, 10);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) box(ctx, bx + c * 8 + r * 4, -4 - (r + 1) * 5, 8, 5, '#b4553a');
  ellipse(ctx, x + PLOT_W - 34, -4, 20, 11, '#e2c67e');
  signboard(ctx, x + PLOT_W / 2 + 8, -40, 62, 12, STRINGS.art.reserved, '#1b9e5a', range(rng, -0.05, 0.05));
  line(ctx, x + PLOT_W / 2 + 8, -34, x + PLOT_W / 2 + 8, -4, '#7a5a3a', 2.5);
  fitText(ctx, STRINGS.art.reservedSub, x + PLOT_W / 2 + 8, -27, 60, 8, INK, 600);
}

/** Paper gate between two districts. */
function drawGate(ctx: Ctx, x: number, name: string): void {
  box(ctx, x - 44, -96, 10, 96, '#c8553d');
  box(ctx, x + 34, -96, 10, 96, '#c8553d');
  paperShape(ctx, '#e9c46a', (c) => {
    c.beginPath();
    c.moveTo(x - 52, -96);
    c.quadraticCurveTo(x, -132, x + 52, -96);
    c.lineTo(x + 52, -86);
    c.quadraticCurveTo(x, -118, x - 52, -86);
    c.closePath();
  });
  roundBox(ctx, x - 40, -128, 80, 18, 3, '#fbf7ee');
  fitText(ctx, fmt(STRINGS.district.welcome, { name }), x, -119, 74, 10, '#c8553d');
}

function levelBadge(ctx: Ctx, cx: number, level: number): void {
  const max = level >= BALANCE.maxLevel;
  const text = max ? `MAX ${level}/${BALANCE.maxLevel}` : `Lv ${level}/${BALANCE.maxLevel}`;
  roundBox(ctx, cx - 22, FOOTPATH_H * 0.5 - 7, 44, 14, 7, max ? GOLD : '#fbf7ee');
  fitText(ctx, text, cx, FOOTPATH_H * 0.5, 40, 10, INK);
}

/** Small paper chip above a building (neighbour bonus, patients). */
function chip(ctx: Ctx, cx: number, y: number, text: string, bg: string, fg: string): void {
  ctx.font = `800 9px "Baloo 2", sans-serif`;
  const w = Math.max(24, ctx.measureText(text).width + 10);
  roundBox(ctx, cx - w / 2, y - 7, w, 14, 7, bg);
  fitText(ctx, text, cx, y, w - 4, 9, fg);
}

function drawBag(ctx: Ctx, x: number, y: number, label: string): void {
  paperShape(ctx, '#c9a26b', (c) => {
    c.beginPath();
    c.moveTo(x - 9, y - 12);
    c.quadraticCurveTo(x - 14, y + 10, x, y + 11);
    c.quadraticCurveTo(x + 14, y + 10, x + 9, y - 12);
    c.closePath();
  });
  box(ctx, x - 6, y - 15, 12, 4, '#a07a45');
  fitText(ctx, '৳', x, y + 1, 12, 13, '#5a3a1a');
  roundBox(ctx, x - 22, y - 30, 44, 12, 6, '#fbf7ee');
  fitText(ctx, label, x, y - 24, 40, 8, '#5a3a1a');
}

function drawBriefcase(ctx: Ctx, x: number, y: number): void {
  box(ctx, x - 7, y - 20, 14, 5, '#a77a2a');
  roundBox(ctx, x - 22, y - 16, 44, 30, 4, '#e9c46a');
  box(ctx, x - 22, y - 4, 44, 3, '#a77a2a', false);
  box(ctx, x - 4, y - 6, 8, 7, '#a77a2a', false);
}

interface Shown {
  p: Plot;
  b: Plot['building'];
  s: Sprite | null;
  fx: PlotFx | null;
}

/** Draw a building image (sprite or its lights) at a plot, applying row and animation transforms. */
function blit(ctx: Ctx, img: HTMLCanvasElement, p: Plot, s: Sprite, fx: PlotFx | null): void {
  ctx.save();
  rowTransform(ctx, p);
  ctx.translate(plotCenter(p) + (fx?.dx ?? 0), fx?.dy ?? 0);
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

export type Pick = { kind: 'plot'; plot: number } | { kind: 'bag' } | { kind: 'briefcase' } | { kind: 'boat' };

/** Owns everything visual that lives between frames: traffic, people, animations and hit areas. */
const BUBBLE_MS = 3800;
/** Screen pixels kept clear at the bottom for the ticker and the button row. */
const BOAT_CLEAR_PX = 110;
const BUBBLE_EVERY_MS = 3200;

export class CityRenderer {
  readonly traffic = new Traffic();
  readonly people = new People();
  readonly effects = new Effects();
  private lastNow = 0;
  private lights: CanvasRenderingContext2D | null = null;
  /** Screen-space rectangles of tappable pickups from the last frame. */
  private bagRect: [number, number, number, number] | null = null;
  /** Screen-space tap areas of this frame's boats (public for the debug console). */
  boatRects: [number, number, number, number][] = [];
  /** Speech bubbles above buildings. */
  private bubbles: { plot: number; text: string; born: number }[] = [];
  private nextBubble = 0;
  private briefcaseRect: [number, number, number, number] | null = null;

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

  /**
   * What is under a tap at screen point (sx, sy): a pickup first, then a front building, then a
   * back building or empty back plot visible above or beside the front row.
   */
  pick(state: GameState, cam: Camera, sx: number, sy: number, dpr: number): Pick | null {
    const inRect = (r: [number, number, number, number] | null) => !!r && sx >= r[0] && sx <= r[0] + r[2] && sy >= r[1] && sy <= r[1] + r[3];
    if (inRect(this.briefcaseRect)) return { kind: 'briefcase' };
    if (inRect(this.bagRect)) return { kind: 'bag' };
    if (this.boatRects.some((r) => inRect(r))) return { kind: 'boat' };
    const wx = screenToWorldX(cam, sx);
    const wy = (sy - groundScreenY(cam)) / cam.zoom;
    const scale = spriteScale(dpr, cam.zoom);
    const heightOf = (p: Plot) => (p.building ? getSprite(state.seed, p.index, p.building, scale).height : 70);
    const front = state.plots.find((p) => p.row === 'front' && Math.abs(wx - plotCenter(p)) <= (PLOT_W + PLOT_GAP) / 2);
    if (front && wy >= -heightOf(front) - 8) return { kind: 'plot', plot: front.index };
    const back = state.plots.find((p) => p.row === 'back' && Math.abs(wx - plotCenter(p)) <= ((PLOT_W + PLOT_GAP) / 2) * BACK_SCALE);
    if (back && wy >= BACK_Y - heightOf(back) * BACK_SCALE - 8 && wy <= 4) return { kind: 'plot', plot: back.index };
    if (front && wy > -260) return { kind: 'plot', plot: front.index };
    return null;
  }

  private updateBubbles(shown: Shown[], now: number, eventId: EventId | null): void {
    this.bubbles = this.bubbles.filter((b) => now - b.born < BUBBLE_MS);
    if (now < this.nextBubble) return;
    this.nextBubble = now + BUBBLE_EVERY_MS * (0.7 + Math.random() * 0.6);
    const candidates = shown.filter((x) => x.b && x.s && !this.bubbles.some((b) => b.plot === x.p.index));
    if (!candidates.length) return;
    const c = candidates[Math.floor(Math.random() * candidates.length)]!;
    const pool = eventId && Math.random() < 0.5 ? BUBBLES.events[eventId] : BUBBLES[c.b!.category];
    this.bubbles.push({ plot: c.p.index, text: pool[Math.floor(Math.random() * pool.length)]!, born: now });
  }

  /** Forget everything from the previous run (after Flee to Canada). */
  reset(): void {
    this.effects.clear();
    this.bubbles = [];
  }

  /** District under the middle of the screen (for the HUD). */
  districtInView(state: GameState, cam: Camera): number {
    return districtAtX(state, cam.x + cam.viewW / cam.zoom / 2);
  }

  frame(ctx: Ctx, state: GameState, cam: Camera, selected: number | null, dpr: number, nowMs: number, timeSec: number): void {
    // clamp the step: a tab coming back from the background must not teleport the traffic
    const dt = this.lastNow ? Math.min(0.05, Math.max(0, (nowMs - this.lastNow) / 1000)) : 0;
    const simNow = state.lastSimTime;
    const ev = state.event && state.event.until > simNow ? state.event : null;
    const isDark = (id: number) => ev?.id === 'loadShedding' && !!ev.dark?.includes(id) && !state.generators.includes(id);
    this.lastNow = nowMs;
    const light = lightingAt(dayPhase(nowMs));
    const gy = groundScreenY(cam);
    const scale = spriteScale(dpr, cam.zoom);
    const ww = worldWidth(state);
    const nDistricts = districtCount(state);
    const built = state.plots.filter((p) => p.building);
    const doors = built.filter((p) => p.row === 'front').map(plotCenter);

    this.traffic.update(dt, timeSec, ww, baseIncome(state), built.some((p) => p.building!.tier >= 5));
    this.people.update(dt, ww, FOOTPATH_H, doors, built.length);
    this.effects.update(nowMs);

    // Per-frame shapes use the cheap offset shadow; sprites switch to blurred shadows while baking.
    setPaperMode(false, dpr * cam.zoom);

    // each district paints its own sky over its stretch of screen
    for (let d = 0; d < nDistricts; d++) {
      const left = d === 0 ? -1e9 : (districtLeft(d) - GATE_W / 2 - cam.x) * cam.zoom;
      const right = d === nDistricts - 1 ? 1e9 : (districtLeft(d + 1) - GATE_W / 2 - cam.x) * cam.zoom;
      if (right < 0 || left > cam.viewW) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(Math.max(0, left), 0, Math.min(cam.viewW, right) - Math.max(0, left), gy + 2);
      ctx.clip();
      drawBackdrop(ctx, cam, gy, state.seed, scale, timeSec, light, skyStyle(d));
      ctx.restore();
    }
    drawStreet(ctx, cam, gy, state.seed);

    const viewL = cam.x - PLOT_W;
    const viewR = cam.x + cam.viewW / cam.zoom + PLOT_W;
    const visible = state.plots.filter((p) => plotCenter(p) + PLOT_W > viewL && plotCenter(p) - PLOT_W < viewR);
    const roadTop = FOOTPATH_H + CURB_H;
    const roadH = (cam.viewH - gy) / cam.zoom - roadTop;
    // lanes keep a minimum depth so vehicles never stand on the footpath on short screens
    const farY = roadTop + Math.max(roadH * 0.46, 34);
    const nearY = Math.max(roadTop + roadH * 0.94, farY + 26);
    const poles: number[] = [];
    for (let d = 0; d < nDistricts; d++) for (let i = 0; i <= BALANCE.plotsPerRow; i += 2) poles.push(districtLeft(d) + i * (PLOT_W + PLOT_GAP) - PLOT_GAP / 2);

    // what each visible plot shows this frame (a merge shows the old buildings while it shakes)
    const shown: Shown[] = visible.map((p) => {
      const b = p.building;
      const sprite = b ? getSprite(state.seed, p.index, b, scale) : null;
      const fx = this.effects.plotFx(p.index, nowMs, sprite ? Math.round(sprite.height / 24) : 4);
      const drawB = fx?.ghost ?? b;
      const drawS = fx?.ghost ? getSprite(state.seed, p.index, fx.ghost, scale) : sprite;
      return { p, b: drawB, s: drawS, fx };
    });
    const backShown = shown.filter((x) => x.p.row === 'back');
    const frontShown = shown.filter((x) => x.p.row === 'front');

    const world = (c: Ctx) => {
      c.translate(-cam.x * cam.zoom, gy);
      c.scale(cam.zoom, cam.zoom);
    };
    const plotX = (id: number) => {
      const p = plotById(state, id);
      return p ? plotCenter(p) : 0;
    };

    // plot prices are per district
    const prices = DISTRICTS.map((_, d) => formatTaka(plotCost(state, d)));
    const drawPlots = (c: Ctx, list: Shown[], shadows: boolean) => {
      for (const { p, b, s, fx } of list) {
        if (state.sideBiz?.plot === p.index && !b) {
          c.save();
          rowTransform(c, p);
          if (state.sideBiz.kind === 'parking') drawParking(c, plotCenter(p), STRINGS.art.parking);
          else drawCylinders(c, plotCenter(p), STRINGS.art.cylinder);
          c.restore();
          continue;
        }
        if (b && s) {
          if (shadows) {
            c.save();
            rowTransform(c, p);
            ellipse(c, plotCenter(p), 1, PLOT_W * 0.46, 4, 'rgba(70,42,16,0.18)', false);
            c.restore();
          }
          blit(c, s.canvas, p, s, fx);
          if (shadows && isDark(p.index)) {
            c.save();
            rowTransform(c, p);
            c.fillStyle = 'rgba(30,32,60,0.38)';
            c.fillRect(plotCenter(p) - 66, -s.height, 132, s.height);
            c.restore();
          }
          if (shadows && state.generators.includes(p.index)) {
            c.save();
            rowTransform(c, p);
            drawGenerator(c, plotCenter(p) + 58);
            c.restore();
          }
          continue;
        }
        c.save();
        rowTransform(c, p);
        if (!p.owned) drawUnowned(c, p, state.seed, prices[p.district] ?? '');
        else if (p.job?.kind === 'fill') drawFill(c, plotCenter(p), jobProgress(p.job), p.job.pond ?? 0, timeSec);
        else if (p.job?.kind === 'build') drawScaffold(c, plotCenter(p), 92);
        else drawEmptyLot(c, p, state.seed);
        if (p.grabbed) drawGrabFlag(c, plotCenter(p) - PLOT_W / 2 + 6);
        c.restore();
      }
    };
    const jobProgress = (job: Job) => Math.min(1, Math.max(0, (simNow - job.start) / Math.max(1, job.until - job.start)));
    const campaigns = [...state.posters].filter((t) => t > simNow).sort((a, b) => b - a);
    const poster = campaigns.length ? posterImage(state.seed, state.stars, STRINGS.posters.slogan) : null;
    const posterAge = (end: number) => 1 - (end - simNow) / (CORRUPTION.posterLength * 1000);
    const posters = (c: Ctx) => {
      if (!poster) return;
      poles.forEach((x, i) => {
        if (x < viewL || x > viewR) return;
        const end = campaigns[i % campaigns.length]!;
        drawPoster(c, poster, x - 9, -98, 18, posterAge(end), ((i * 37) % 9 - 4) * 0.02);
        if (campaigns.length > 1) drawPoster(c, poster, x - 8, -66, 16, posterAge(campaigns[(i + 1) % campaigns.length]!), ((i * 53) % 7 - 3) * 0.03);
      });
    };
    const trees = (c: Ctx) => {
      for (let d = 0; d < nDistricts; d++) {
        for (let i = 1; i < BALANCE.plotsPerRow; i++) {
          const tx = districtLeft(d) + i * (PLOT_W + PLOT_GAP) - PLOT_GAP / 2;
          if (tx < viewL || tx > viewR) continue;
          const ts = hashSeed(state.seed, 200, d * 100 + i);
          if (ts % 100 < 40) drawTree(c, tx, ts);
        }
      }
    };
    const gates = (c: Ctx) => {
      for (let d = 1; d < nDistricts; d++) {
        const gx = districtLeft(d) - GATE_W / 2;
        if (gx > viewL && gx < viewR) drawGate(c, gx, DISTRICTS[d]!.name);
      }
      const next = DISTRICTS[nDistricts];
      if (next) {
        const sx = districtLeft(nDistricts - 1) + DISTRICT_W + TAIL_W / 2;
        line(c, sx, 0, sx, -60, '#7a5a3a', 3);
        roundBox(c, sx - 70, -92, 140, 34, 3, '#fbf7ee');
        fitText(c, fmt(STRINGS.district.lockedSign, { name: next.name, rate: formatRate(next.unlockIncome) }), sx, -75, 130, 11, '#3a2e25');
      }
    };
    const front = (c: Ctx) => {
      this.effects.drawOverlays(c, nowMs, plotX, (i) => {
        const b = plotById(state, i)?.building;
        return b ? getSprite(state.seed, i, b, scale).height : 60;
      });
      if (ev?.id === 'monsoon') drawFlood(c, viewL, viewR, roadTop + 20, timeSec);
      drawPoles(c, poles, state.seed);
      posters(c);
      if (ev?.id === 'election') for (let i = 0; i + 1 < poles.length; i++) drawBunting(c, poles[i]!, poles[i + 1]!, -138);
      if (ev?.id === 'ramadan' && light.twilight + light.night > 0.3) for (const x of poles) drawLantern(c, x + 10, -84);
      if (ev?.id === 'vip') drawBarricade(c, cam.x + cam.viewW / cam.zoom / 2, farY, STRINGS.art.vipRoute);
      if (ev?.id === 'journalist') drawJournalist(c, cam.x + cam.viewW / cam.zoom * 0.62, timeSec);
      for (const id of state.frontage) {
        const fp = plotById(state, id);
        if (fp && fp.row === 'front') drawFlyoverSign(c, plotCenter(fp) - PLOT_W / 2 + 10, STRINGS.art.flyoverSign);
      }
      this.people.draw(c, viewL, viewR);
      this.traffic.draw(c, scale, viewL, viewR, farY, nearY, timeSec, poster);
    };

    ctx.save();
    world(ctx);
    ctx.lineJoin = 'round';
    drawPlots(ctx, backShown, true);
    trees(ctx);
    gates(ctx);
    drawPlots(ctx, frontShown, true);
    front(ctx);
    ctx.restore();

    // dusk and night: tint everything, then lights on top
    drawTint(ctx, cam.viewW, cam.viewH, light);
    if (light.night > 0.02 && ctx.canvas.width > 0 && ctx.canvas.height > 0) {
      // Lights are composed back to front in their own layer: each light source is drawn, then
      // everything standing in front of it is erased, so nothing glows through a pole or a person.
      const base = ctx.getTransform();
      const L = this.lightLayer(ctx.canvas.width, ctx.canvas.height);
      L.setTransform(base);
      drawSkylineLights(L, cam, gy, state.seed, scale, 1, skyStyle(this.districtInView(state, cam)));
      L.save();
      world(L);
      const lightsOf = (list: Shown[]) => {
        L.globalCompositeOperation = 'source-over';
        for (const { p, s, fx } of list) {
          if (!s || isDark(p.index)) continue;
          const lights = spriteLights(s);
          if (lights) blit(L, lights, p, s, fx);
        }
      };
      L.globalCompositeOperation = 'destination-out';
      drawPlots(L, backShown, false);
      lightsOf(backShown);
      L.globalCompositeOperation = 'destination-out';
      trees(L);
      gates(L);
      drawPlots(L, frontShown, false);
      lightsOf(frontShown);
      L.globalCompositeOperation = 'destination-out';
      front(L);
      L.restore();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = light.night;
      ctx.drawImage(L.canvas, 0, 0);
      ctx.restore();

      ctx.save();
      world(ctx);
      drawLampGlow(ctx, poles, light.night);
      this.traffic.drawLights(ctx, viewL, viewR, farY, nearY, light.night);
      ctx.restore();
    }

    // labels, chips and pickups stay readable at night, so they go on last
    this.bagRect = null;
    this.briefcaseRect = null;
    this.boatRects = [];
    ctx.save();
    world(ctx);
    for (const { p, b, s } of shown) {
      const cx = plotCenter(p);
      if (b && p.row === 'front') levelBadge(ctx, cx, b.level);
      // permits, land fills and inquiries
      const job = p.job;
      const lead = job && !(job.kind === 'merge' && !job.result);
      const k = p.row === 'back' ? BACK_SCALE : 1;
      const baseY = p.row === 'back' ? BACK_Y : 0;
      const topY = baseY - (s ? s.height : job?.kind === 'build' ? 92 : 60) * k;
      if (job && lead) {
        const secs = Math.max(0, (job.until - simNow) / 1000);
        const label = job.kind === 'fill'
          ? fmt(STRINGS.permit.fill, { pond: STRINGS.grab.ponds[job.pond ?? 0] ?? '' })
          : STRINGS.permit[job.kind];
        drawPermitBar(ctx, cx, topY - 8, jobProgress(job), secs, label);
      }
      if (state.inquiry?.plot === p.index && s) {
        ctx.save();
        rowTransform(ctx, p);
        drawInquiry(ctx, cx, s.height, Math.max(0, (state.inquiry.until - simNow) / 1000), STRINGS.inquiry.title);
        ctx.restore();
      }
      if (b && s) {
        const k = p.row === 'back' ? BACK_SCALE : 1;
        const top = (p.row === 'back' ? BACK_Y : 0) - s.height * k;
        const bonus = neighbourBonus(state, p.index);
        let chipY = top - 10;
        if (Math.abs(bonus) > 0.001) {
          const pct = `${bonus > 0 ? '+' : ''}${Math.round(bonus * 100)}%`;
          chip(ctx, cx + 40 * k, chipY, pct, bonus > 0 ? '#5f8f6b' : '#c8553d', '#fffaf0');
          chipY -= 16;
        }
        if (b.category === 'healthcare') chip(ctx, cx - 30 * k, top - 10, fmt(STRINGS.plot.patients, { n: patients(state, b) }), '#fbf7ee', '#3d6fa3');
        if (state.bag?.plot === p.index) {
          const by = chipY - 14 + Math.sin(timeSec * 3) * 3;
          drawBag(ctx, cx, by, STRINGS.bags[state.bag.kind]);
          const sx = (cx - cam.x) * cam.zoom, sy = gy + by * cam.zoom;
          this.bagRect = [sx - 26 * cam.zoom, sy - 32 * cam.zoom, 52 * cam.zoom, 46 * cam.zoom];
        }
      }
      if (selected === p.index) {
        ctx.save();
        rowTransform(ctx, p);
        ctx.fillStyle = 'rgba(214,51,108,0.18)';
        ctx.fillRect(cx - PLOT_W / 2 - 4, -2, PLOT_W + 8, FOOTPATH_H + 2);
        const top = s ? s.height : 70;
        const bob = Math.sin(timeSec * 4) * 4;
        const ay = -top - 18 + bob;
        poly(ctx, [cx - 10, ay - 12, cx + 10, ay - 12, cx, ay], '#d6336c');
        ctx.restore();
      }
    }
    ctx.restore();

    // speech bubbles, mosquitoes and boats
    this.updateBubbles(shown, nowMs, ev?.id ?? null);
    ctx.save();
    world(ctx);
    for (const bub of this.bubbles) {
      const entry = shown.find((x) => x.p.index === bub.plot);
      if (!entry?.s) continue;
      const k = entry.p.row === 'back' ? BACK_SCALE : 1;
      const top = (entry.p.row === 'back' ? BACK_Y : 0) - entry.s.height * k;
      const age = (nowMs - bub.born) / BUBBLE_MS;
      drawBubble(ctx, plotCenter(entry.p) - 20, top - 30, bub.text, age < 0.85 ? 1 : (1 - age) / 0.15);
    }
    if (ev?.id === 'dengue') {
      for (const { p, s } of shown) if (p.building?.category === 'healthcare' && s) drawMosquitoes(ctx, plotCenter(p), -s.height, timeSec);
    }
    if (ev?.id === 'monsoon' && (ev.boats ?? 0) < EVENT_TUNING.boatsPerMonsoon) {
      const span = cam.viewW / cam.zoom;
      // mid-road, and always clear of the ticker and button row along the bottom of the screen
      const laneY = Math.min(farY, (cam.viewH - BOAT_CLEAR_PX - gy) / cam.zoom);
      for (let i = 0; i < 2; i++) {
        const bx = cam.x + ((timeSec * 26 + i * span * 0.55) % (span + 80)) - 40;
        const by = laneY + Math.sin(timeSec * 2 + i) * 3;
        drawBoat(ctx, bx, by);
        // a generous tap area (at least 48 px) since the boats keep moving
        const sx = (bx - cam.x) * cam.zoom, sy = gy + by * cam.zoom;
        const w = Math.max(48, 56 * cam.zoom), h = Math.max(56, 64 * cam.zoom);
        this.boatRects.push([sx - w / 2, sy - h + 10, w, h]);
      }
    }
    ctx.restore();

    // the golden briefcase floats in the sky, in screen space
    if (state.briefcaseUntil > state.lastSimTime) {
      const bx = cam.viewW * 0.5 + Math.sin(timeSec * 1.3) * cam.viewW * 0.18;
      // below the HUD, above the rooftops of most buildings
      const by = Math.max(150, gy * 0.42) + Math.sin(timeSec * 2.1) * 10;
      const glow = 0.5 + 0.5 * Math.sin(timeSec * 6);
      circle(ctx, bx, by, 34 + glow * 6, `rgba(255,215,110,${0.25 + 0.2 * glow})`, false);
      drawBriefcase(ctx, bx, by);
      this.briefcaseRect = [bx - 34, by - 34, 68, 68];
    }
  }
}
