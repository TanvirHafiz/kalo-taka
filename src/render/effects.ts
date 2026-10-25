// Building animations. Effects never draw building sprites themselves: they return a per-plot
// transform that both the building pass and the night-lights pass apply, plus overlays (dust,
// crane, confetti) drawn in world space.
import { VISUAL } from '../config/balance';
import type { Building } from '../state/types';
import { box, circle, line, type Ctx } from './draw';
import { INK } from './palette';
import { reduceMotion } from '../util/settings';

const EVICT_DUST_MS = 900;

export interface PlotFx {
  dx: number;
  dy: number;
  /** Horizontal and vertical scale about the ground centre. */
  sx: number;
  sy: number;
  /** Share of the building height shown, from the ground up (1 = all). */
  reveal: number;
  /** Draw this building instead of the one in state (the old buildings while a merge shakes). */
  ghost: Building | null;
}

type Fx =
  | { kind: 'merge'; left: number; right: number; oldLeft: Building; oldRight: Building; start: number }
  | { kind: 'build'; plot: number; start: number }
  | { kind: 'upgrade'; plot: number; start: number }
  | { kind: 'evict'; plot: number; start: number };

const ease = (t: number) => 1 - (1 - t) ** 3;

export class Effects {
  private list: Fx[] = [];

  merge(left: number, right: number, oldLeft: Building, oldRight: Building, now: number): void {
    if (reduceMotion()) return;
    const touches = (i: number) => i === left || i === right;
    this.list = this.list.filter((f) => (f.kind === 'merge' ? !touches(f.left) && !touches(f.right) : !touches(f.plot)));
    this.list.push({ kind: 'merge', left, right, oldLeft, oldRight, start: now });
  }

  build(plot: number, now: number): void {
    if (reduceMotion()) return;
    this.list.push({ kind: 'build', plot, start: now });
  }

  upgrade(plot: number, now: number): void {
    if (reduceMotion()) return;
    this.list = this.list.filter((f) => !(f.kind === 'upgrade' && f.plot === plot));
    this.list.push({ kind: 'upgrade', plot, start: now });
  }

  /** Dust where a bulldozed building stood. */
  evict(plot: number, now: number): void {
    if (reduceMotion()) return;
    this.list = this.list.filter((f) => !('plot' in f && f.plot === plot));
    this.list.push({ kind: 'evict', plot, start: now });
  }

  private duration(f: Fx): number {
    if (f.kind === 'merge') return VISUAL.mergeShakeMs + VISUAL.mergeRiseMs + 400;
    if (f.kind === 'build') return VISUAL.buildRiseMs + 300;
    if (f.kind === 'evict') return EVICT_DUST_MS;
    return VISUAL.upgradePopMs;
  }

  /** Drop every running animation (new run). */
  clear(): void {
    this.list = [];
  }

  update(now: number): void {
    this.list = this.list.filter((f) => now - f.start < this.duration(f));
  }

  /** True while any building is animating (callers may skip work otherwise). */
  get active(): boolean {
    return this.list.length > 0;
  }

  /** Transform for a plot's building, or null to draw it normally. `floors` sets the rise steps. */
  plotFx(plot: number, now: number, floors: number): PlotFx | null {
    for (const f of this.list) {
      const t = now - f.start;
      if (f.kind === 'merge' && (f.left === plot || f.right === plot)) {
        if (t < VISUAL.mergeShakeMs) {
          const k = 1 - t / VISUAL.mergeShakeMs;
          const shake = Math.sin(t * 0.09 + plot) * 2.4 * (0.4 + k);
          return { dx: shake, dy: 0, sx: 1, sy: 1, reveal: 1, ghost: plot === f.left ? f.oldLeft : f.oldRight };
        }
        if (plot === f.right) return null;
        const p = Math.min(1, (t - VISUAL.mergeShakeMs) / VISUAL.mergeRiseMs);
        const steps = Math.max(3, floors);
        return { dx: 0, dy: 0, sx: 1, sy: 1, reveal: Math.max(0.02, Math.ceil(ease(p) * steps) / steps), ghost: null };
      }
      if (f.kind === 'build' && f.plot === plot) {
        const p = Math.min(1, t / VISUAL.buildRiseMs);
        return { dx: 0, dy: 0, sx: 1, sy: 1, reveal: Math.max(0.05, ease(p)), ghost: null };
      }
      if (f.kind === 'upgrade' && f.plot === plot) {
        const p = t / VISUAL.upgradePopMs;
        const s = Math.sin(Math.PI * Math.min(1, p));
        return { dx: 0, dy: 0, sx: 1 - 0.035 * s, sy: 1 + 0.07 * s, reveal: 1, ghost: null };
      }
    }
    return null;
  }

  /** Dust, crane and confetti in world space. `plotX` maps a plot index to its centre x. */
  drawOverlays(ctx: Ctx, now: number, plotX: (i: number) => number, heightOf: (i: number) => number): void {
    for (const f of this.list) {
      const t = now - f.start;
      if (f.kind === 'merge') {
        const cx = plotX(f.left);
        const rx = plotX(f.right);
        const riseT = t - VISUAL.mergeShakeMs;
        if (riseT > -100) drawCrane(ctx, cx - 70, heightOf(f.left) + 40, Math.min(1, Math.max(0, riseT / VISUAL.mergeRiseMs)), heightOf(f.left));
        if (riseT > 0 && riseT < 900) {
          dust(ctx, cx, riseT / 900, f.start);
          dust(ctx, rx, riseT / 900, f.start + 7);
        }
      } else if (f.kind === 'build') {
        if (t < 600) dust(ctx, plotX(f.plot), t / 600, f.start);
      } else if (f.kind === 'evict') {
        // the bulldozer's cloud: three puffs across the plot
        for (let i = -1; i <= 1; i++) dust(ctx, plotX(f.plot) + i * 34, t / EVICT_DUST_MS, f.start + i * 5);
      } else {
        confetti(ctx, plotX(f.plot), heightOf(f.plot), t / VISUAL.upgradePopMs, f.start);
      }
    }
  }
}

/** Paper dust puffs that grow and fade. */
function dust(ctx: Ctx, cx: number, p: number, seed: number): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - p) * 0.9;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI + ((seed * 13) % 7) * 0.1;
    const r = 8 + p * 26;
    const x = cx + Math.cos(a) * (20 + p * 60) * (i % 2 ? 1 : -1);
    const y = -6 - Math.sin(a) * (8 + p * 30);
    circle(ctx, x, y, r * (0.6 + (i % 3) * 0.2), i % 2 ? '#e8dcc4' : '#d9c9a8');
  }
  ctx.restore();
}

/** A paper tower crane whose hook follows the rising roof. */
function drawCrane(ctx: Ctx, x: number, mastH: number, p: number, buildingH: number): void {
  const top = -mastH;
  box(ctx, x - 4, top, 8, mastH, '#e9c46a');
  ctx.strokeStyle = 'rgba(90,60,20,0.55)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let y = top; y < -8; y += 12) {
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x + 4, y + 12);
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x - 4, y + 12);
  }
  ctx.stroke();
  box(ctx, x - 22, top - 6, 110, 6, '#e9c46a');
  box(ctx, x - 26, top - 10, 14, 12, '#5b5a66');
  box(ctx, x - 6, top - 18, 12, 12, '#c8553d');
  const hookX = x + 72;
  const hookY = -buildingH * p - 14;
  line(ctx, hookX, top, hookX, hookY, INK, 1);
  box(ctx, hookX - 3, hookY, 6, 5, '#5b5a66');
}

function confetti(ctx: Ctx, cx: number, h: number, p: number, seed: number): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - p);
  const colors = ['#e76f51', '#e9c46a', '#2a9d8f', '#f28482'];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.28 + ((seed + i) % 5) * 0.02;
    const d = 10 + p * 34;
    box(ctx, cx + Math.cos(a) * d, -h - 6 + Math.sin(a) * d + p * p * 20, 3.5, 2.2, colors[i % 4]!, false);
  }
  ctx.restore();
}
