// Road traffic: two ring lanes of paper vehicles. Lane 0 (far) drives right, lane 1 (near) left.
// Visual only; the sim never reads any of this.
import { box, circle, line, poly, roundBox, withPaperMode, type Ctx } from './draw';
import { CLOTHES, INK, SKIN } from './palette';
import { VEHICLE_SPECS, laneTarget, stepLane, type Vehicle, type VehicleKind } from './streetlife';

const VARIANTS = 4;
/** Sprite box around a vehicle (world units): vehicles are drawn from x=0 (rear) to len, ground at 0. */
const PAD = 10;
const SPRITE_H = 80;

interface VehicleSprite {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

const sprites = new Map<string, VehicleSprite>();

export function clearVehicleCache(): void {
  sprites.clear();
}

function wheel(ctx: Ctx, x: number, r: number): void {
  circle(ctx, x, -r, r, '#3a3a40');
  circle(ctx, x, -r, r * 0.45, '#9a9a9a', false);
}

function person(ctx: Ctx, x: number, base: number, shirt: string, skin: string): void {
  box(ctx, x - 3, base - 12, 7, 9, shirt);
  circle(ctx, x + 0.5, base - 15, 3, skin);
}

function drawVehicle(ctx: Ctx, kind: VehicleKind, variant: number): void {
  const len = VEHICLE_SPECS[kind].len;
  const tone = (arr: readonly string[]) => arr[variant % arr.length]!;
  switch (kind) {
    case 'rickshaw': {
      // cycle rickshaw: passenger seat with a painted hood at the rear, puller at the front
      line(ctx, 10, -9, 42, -8, INK, 1.6);
      line(ctx, 40, -8, 44, -26, INK, 1.6);
      box(ctx, 4, -26, 22, 12, tone(['#4f7c6b', '#3d6fa3', '#c8553d', '#8d6a9f']));
      box(ctx, 2, -24, 8, 10, tone(['#e9c46a', '#f28482', '#90be6d', '#e9c46a']));
      circle(ctx, 6, -19, 1.6, '#fffaf0', false);
      poly(ctx, [2, -26, 28, -26, 25, -48, 7, -50], tone(['#c8553d', '#a8466e', '#2a9d8f', '#e76f51']));
      for (let i = 0; i < 4; i++) line(ctx, 4 + i * 6, -27, 7 + i * 5, -48, 'rgba(255,250,240,0.55)', 1);
      wheel(ctx, 10, 10);
      wheel(ctx, 42, 8);
      person(ctx, 42, -18, tone(CLOTHES), tone(SKIN));
      box(ctx, 38, -20, 8, 6, '#3d6fa3');
      break;
    }
    case 'cng': {
      // green auto-rickshaw with a black canvas top
      roundBox(ctx, 2, -30, len - 6, 24, 8, '#4f9a5b');
      roundBox(ctx, 4, -40, len - 12, 12, 5, '#33363d');
      box(ctx, len - 16, -27, 9, 9, '#cfe3ea', false);
      box(ctx, 6, -26, 14, 9, '#2f3338', false);
      person(ctx, len - 18, -16, tone(['#f5efe2', '#e9c46a']), tone(SKIN));
      box(ctx, len - 7, -16, 4, 3, '#f6d58a');
      wheel(ctx, 9, 7);
      wheel(ctx, len - 9, 7);
      break;
    }
    case 'bus': {
      // two-tone local bus, dented
      const top = tone(['#c8553d', '#3d6fa3', '#4f7c6b', '#e0a83a']);
      const bottom = tone(['#f5efe2', '#e9c46a', '#f5efe2', '#c8553d']);
      box(ctx, 2, -46, len - 4, 22, top);
      box(ctx, 2, -24, len - 4, 16, bottom);
      for (let x = 8; x < len - 22; x += 15) {
        box(ctx, x, -42, 12, 12, '#cfe3ea', false);
        if ((x * 7 + variant) % 3 !== 0) circle(ctx, x + 6, -34, 2.6, SKIN[(x + variant) % SKIN.length]!, false);
      }
      box(ctx, len - 18, -42, 12, 30, '#2f3338', false);
      // dents and patches
      poly(ctx, [20, -22, 30, -21, 27, -16, 21, -17], 'rgba(60,40,20,0.18)', false);
      poly(ctx, [len - 50, -40, len - 41, -38, len - 44, -33], 'rgba(60,40,20,0.2)', false);
      box(ctx, 44, -20, 10, 6, '#a4a29a');
      box(ctx, len - 6, -18, 4, 4, '#f6d58a');
      wheel(ctx, 20, 8);
      wheel(ctx, len - 22, 8);
      break;
    }
    case 'car': {
      const body = tone(['#e07a5f', '#a8c5da', '#f5efe2', '#81b29a']);
      roundBox(ctx, 2, -22, len - 4, 14, 5, body);
      poly(ctx, [12, -22, 18, -34, len - 20, -34, len - 12, -22], body);
      poly(ctx, [16, -23, 20, -31, 29, -31, 29, -23], '#cfe3ea', false);
      poly(ctx, [32, -23, 32, -31, len - 21, -31, len - 16, -23], '#cfe3ea', false);
      box(ctx, len - 6, -18, 4, 3, '#f6d58a');
      wheel(ctx, 13, 7);
      wheel(ctx, len - 13, 7);
      break;
    }
    case 'suv': {
      // the owner's white SUV, tinted windows, always in a hurry
      roundBox(ctx, 2, -26, len - 4, 18, 4, '#f7f5ef');
      roundBox(ctx, 8, -42, len - 18, 18, 4, '#f7f5ef');
      box(ctx, 12, -39, 16, 11, '#3a3f4a', false);
      box(ctx, 31, -39, len - 41, 11, '#3a3f4a', false);
      box(ctx, 14, -45, len - 22, 3, '#9aa0a6');
      box(ctx, len - 6, -21, 4, 4, '#f6d58a');
      wheel(ctx, 14, 8.5);
      wheel(ctx, len - 14, 8.5);
      break;
    }
  }
}

function spriteFor(kind: VehicleKind, variant: number, scale: number): VehicleSprite {
  const key = `${kind}|${variant}|${scale}`;
  const hit = sprites.get(key);
  if (hit) return hit;
  const len = VEHICLE_SPECS[kind].len;
  const w = len + PAD * 2;
  const h = SPRITE_H + PAD;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * scale);
  canvas.height = Math.ceil(h * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.translate(PAD, SPRITE_H);
  ctx.lineJoin = 'round';
  withPaperMode(true, scale, () => drawVehicle(ctx, kind, variant));
  const sprite = { canvas, w, h };
  sprites.set(key, sprite);
  return sprite;
}

function pickKind(r: number, rich: boolean): VehicleKind {
  if (r < 0.42) return 'rickshaw';
  if (r < 0.66) return 'cng';
  if (r < 0.84) return 'car';
  if (r < 0.95) return 'bus';
  return rich ? 'suv' : 'car';
}

export class Traffic {
  private lanes: [Vehicle[], Vehicle[]] = [[], []];
  private laneLength = 0;

  private spawn(lane: Vehicle[], rich: boolean): void {
    const kind = pickKind(Math.random(), rich);
    const spec = VEHICLE_SPECS[kind];
    // drop it into the biggest gap so it never lands on another vehicle
    let s = Math.random() * this.laneLength;
    if (lane.length) {
      lane.sort((a, b) => a.s - b.s);
      let best = -1;
      for (let i = 0; i < lane.length; i++) {
        const a = lane[i]!, b = lane[(i + 1) % lane.length]!;
        const gap = (((b.s - (a.s + a.len)) % this.laneLength) + this.laneLength) % this.laneLength;
        if (gap > best && gap > spec.len + 20) {
          best = gap;
          s = (a.s + a.len + gap / 2 - spec.len / 2) % this.laneLength;
        }
      }
      if (best < 0) return;
    }
    lane.push({ kind, s, v: spec.speed * 0.5, len: spec.len, desired: spec.speed * (0.85 + Math.random() * 0.3), variant: Math.floor(Math.random() * VARIANTS) });
  }

  /** Keep each lane near its target count and move everything. `dt` is already clamped. */
  update(dt: number, timeSec: number, worldW: number, incomePerSec: number, rich: boolean): void {
    // lanes run a little past both ends of the world so vehicles enter and leave off-screen
    const L = worldW + 400;
    if (L !== this.laneLength) {
      this.laneLength = L;
      for (const lane of this.lanes) for (const v of lane) v.s %= L;
    }
    const target = laneTarget(incomePerSec, L);
    for (const lane of this.lanes) {
      if (lane.length < target) this.spawn(lane, rich);
      else if (lane.length > target + 1) lane.splice(Math.floor(Math.random() * lane.length), 1);
      stepLane(lane, dt, L, timeSec);
    }
  }

  /** Draw vehicles in world space. `farY`/`nearY` are the lane baselines. */
  draw(ctx: Ctx, scale: number, viewL: number, viewR: number, farY: number, nearY: number, timeSec: number): void {
    for (let li = 0; li < 2; li++) {
      const y = li === 0 ? farY : nearY;
      for (const v of this.lanes[li]!) {
        const sp = spriteFor(v.kind, v.variant, scale);
        const bob = v.kind === 'rickshaw' && v.v > 1 ? Math.abs(Math.sin(timeSec * 9 + v.variant)) * 0.8 : 0;
        if (li === 0) {
          const x = v.s - 200;
          if (x + v.len < viewL || x > viewR) continue;
          ctx.drawImage(sp.canvas, x - PAD, y - SPRITE_H - bob, sp.w, sp.h);
        } else {
          const x = this.laneLength - 200 - v.s - v.len;
          if (x + v.len < viewL || x > viewR) continue;
          ctx.save();
          ctx.translate(x + v.len, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(sp.canvas, -PAD, y - SPRITE_H - bob, sp.w, sp.h);
          ctx.restore();
        }
      }
    }
  }

  /** Headlights after dark, in world space, drawn over the night tint. */
  drawLights(ctx: Ctx, viewL: number, viewR: number, farY: number, nearY: number, alpha: number): void {
    if (alpha < 0.02) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let li = 0; li < 2; li++) {
      const y = (li === 0 ? farY : nearY) - 16;
      for (const v of this.lanes[li]!) {
        if (v.kind === 'rickshaw') continue;
        const front = li === 0 ? v.s - 200 + v.len : this.laneLength - 200 - v.s - v.len;
        if (front < viewL - 60 || front > viewR + 60) continue;
        const dir = li === 0 ? 1 : -1;
        // a small lamp glow and a short beam along the road
        const g = ctx.createRadialGradient(front, y, 0.5, front + dir * 10, y + 1, 20);
        g.addColorStop(0, `rgba(255,232,170,${0.6 * alpha})`);
        g.addColorStop(1, 'rgba(255,232,170,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(front + dir * 10, y + 1, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
