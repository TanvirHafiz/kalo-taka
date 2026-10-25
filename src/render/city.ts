// M1 placeholder city: one row of plots drawn as rectangles. Reads state, never writes it.
import { PLACEHOLDER_COLORS } from '../config/buildings';
import { tierDef } from '../sim/economy';
import type { GameState } from '../state/types';
import type { Camera } from './camera';

export const PLOT_W = 150;
export const PLOT_GAP = 14;
const MARGIN = 24;
const OUTLINE = '#2b2320';

export function worldWidth(state: GameState): number {
  return MARGIN * 2 + state.plots.length * (PLOT_W + PLOT_GAP) - PLOT_GAP;
}

export function plotLeft(index: number): number {
  return MARGIN + index * (PLOT_W + PLOT_GAP);
}

export function plotAtWorldX(state: GameState, wx: number): number | null {
  for (const p of state.plots) {
    const l = plotLeft(p.index);
    if (wx >= l && wx <= l + PLOT_W) return p.index;
  }
  return null;
}

/** Y of the ground line in screen pixels. */
function groundY(cam: Camera): number {
  return Math.round(cam.viewH * 0.72);
}

export function drawCity(ctx: CanvasRenderingContext2D, state: GameState, cam: Camera, selected: number | null): void {
  const { viewW, viewH } = cam;
  const gy = groundY(cam);

  const sky = ctx.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, '#f7c98b');
  sky.addColorStop(1, '#fbe6c4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewW, gy);

  ctx.fillStyle = '#c9b79c';
  ctx.fillRect(0, gy, viewW, 18);
  ctx.fillStyle = '#4a4a4f';
  ctx.fillRect(0, gy + 18, viewW, viewH - gy - 18);
  ctx.fillStyle = '#e6d98a';
  for (let x = -((cam.x * cam.zoom) % 80); x < viewW; x += 80) ctx.fillRect(x, gy + 18 + (viewH - gy - 18) / 2 - 2, 40, 4);

  ctx.save();
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, 0);
  const gyw = gy / cam.zoom;

  for (const p of state.plots) {
    const x = plotLeft(p.index);
    ctx.lineWidth = 2;
    ctx.strokeStyle = OUTLINE;

    if (!p.owned) {
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(x, gyw - 30, PLOT_W, 28);
      ctx.setLineDash([]);
      ctx.fillStyle = '#6b5a4a';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FOR SALE', x + PLOT_W / 2, gyw - 11);
    } else if (!p.building) {
      ctx.fillStyle = '#a88a63';
      ctx.fillRect(x, gyw - 8, PLOT_W, 8);
      ctx.strokeRect(x, gyw - 8, PLOT_W, 8);
      ctx.fillStyle = '#5a4634';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Empty plot', x + PLOT_W / 2, gyw - 16);
    } else {
      const b = p.building;
      const h = 50 + b.tier * 34 + b.level * 3;
      const w = PLOT_W - 20;
      const bx = x + 10;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(bx + 4, gyw - 4, w, 6);
      ctx.fillStyle = PLACEHOLDER_COLORS[b.category][b.tier - 1] ?? '#cccccc';
      ctx.fillRect(bx, gyw - h, w, h);
      ctx.strokeRect(bx, gyw - h, w, h);

      ctx.fillStyle = OUTLINE;
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(tierDef(b.category, b.tier)?.name ?? '?', x + PLOT_W / 2, gyw - h + 18);
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`T${b.tier}  Lv ${b.level}${b.level >= 10 ? ' MAX' : ''}`, x + PLOT_W / 2, gyw - h + 34);
    }

    ctx.fillStyle = '#2b2320';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`#${p.index + 1}`, x + PLOT_W / 2, gyw + 14);

    if (selected === p.index) {
      ctx.fillStyle = '#d6336c';
      ctx.fillRect(x, gyw + 20, PLOT_W, 5);
      ctx.beginPath();
      ctx.moveTo(x + PLOT_W / 2 - 8, gyw + 34);
      ctx.lineTo(x + PLOT_W / 2 + 8, gyw + 34);
      ctx.lineTo(x + PLOT_W / 2, gyw + 26);
      ctx.fill();
    }
  }
  ctx.restore();
}
