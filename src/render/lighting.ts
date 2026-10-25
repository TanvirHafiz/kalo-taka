// Day and night look. The world is drawn in day colours, then a multiply tint shifts it toward
// dusk orange or night blue-purple. Lights (windows, neon, lamps) are drawn after the tint.
import { VISUAL } from '../config/balance';
import { nightness } from '../sim/daycycle';
import type { Ctx } from './draw';

export interface Lighting {
  phase: number;
  /** 0 = full day, 1 = full night. */
  night: number;
  /** Peaks at dawn and dusk. */
  twilight: number;
  tint: string;
  tintAlpha: number;
}

const DUSK = [245, 150, 100];
const NIGHT = [46, 56, 120];

export function lightingAt(phase: number): Lighting {
  const night = nightness(phase);
  const twilight = 1 - Math.abs(night * 2 - 1);
  // stay warm through twilight and only turn blue once it is properly dark
  const k = night ** 2.2;
  const mix = (i: number) => Math.round(DUSK[i]! + (NIGHT[i]! - DUSK[i]!) * k);
  return {
    phase,
    night,
    twilight,
    tint: `rgb(${mix(0)},${mix(1)},${mix(2)})`,
    tintAlpha: 0.72 * night + 0.14 * twilight,
  };
}

/** Sun (by day) or moon (by night) position as fractions of the sky: x across, y down from the top. */
export function skyBody(phase: number): { kind: 'sun' | 'moon'; x: number; y: number } {
  const rise = VISUAL.dawnPhase - VISUAL.twilight;
  const set = VISUAL.duskPhase + VISUAL.twilight;
  const isDay = phase >= rise && phase <= set;
  const t = isDay ? (phase - rise) / (set - rise) : (((phase - set + 1) % 1) / (1 - (set - rise)));
  return { kind: isDay ? 'sun' : 'moon', x: 0.08 + 0.84 * t, y: 0.78 - 0.62 * Math.sin(Math.PI * t) };
}

/** Multiply the whole frame toward the dusk or night colour. */
export function drawTint(ctx: Ctx, w: number, h: number, L: Lighting): void {
  if (L.tintAlpha < 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = L.tintAlpha;
  ctx.fillStyle = L.tint;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
