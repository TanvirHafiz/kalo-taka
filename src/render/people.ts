// Footpath pedestrians: tiny three-part paper figures. Some are tenants who walk out of a
// building and some walk into one. Visual only.
import { line, mute, type Ctx } from './draw';
import { CLOTHES, PAPER_SHADOW, SKIN } from './palette';
import { peopleTarget } from './streetlife';

type Outfit = 'lungi' | 'saree' | 'shirt';

interface Person {
  x: number;
  /** Depth on the footpath (world units below the ground line). */
  y: number;
  dir: 1 | -1;
  speed: number;
  outfit: Outfit;
  top: string;
  bottom: string;
  skin: string;
  phase: number;
  /** X of a door this person is walking into, if any. */
  target: number | null;
  /** 0..1, used to fade in at a door and fade out when entering. */
  alpha: number;
  leaving: boolean;
}

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

function newPerson(x: number, footpathH: number, fromDoor: boolean): Person {
  const outfit: Outfit = pick(['lungi', 'lungi', 'saree', 'shirt', 'shirt']);
  const saree = outfit === 'saree';
  return {
    x,
    y: 4 + Math.random() * (footpathH - 8),
    dir: Math.random() < 0.5 ? 1 : -1,
    speed: 9 + Math.random() * 9,
    outfit,
    top: saree ? pick(CLOTHES) : pick(['#f5efe2', '#e9c46a', '#a8c5da', '#90be6d', '#f28482', ...CLOTHES]),
    bottom: outfit === 'lungi' ? pick(['#3d6fa3', '#4f7c6b', '#8d6a9f', '#264653']) : saree ? pick(CLOTHES) : pick(['#3a3f58', '#5b5a66', '#7a5236']),
    skin: pick(SKIN),
    phase: Math.random() * 10,
    target: null,
    alpha: fromDoor ? 0 : 1,
    leaving: false,
  };
}

export class People {
  private list: Person[] = [];

  update(dt: number, worldW: number, footpathH: number, doors: number[], buildings: number): void {
    const target = peopleTarget(buildings);
    if (this.list.length < target && Math.random() < dt * 2) {
      const fromDoor = doors.length > 0 && Math.random() < 0.45;
      const x = fromDoor ? pick(doors) : Math.random() < 0.5 ? -20 : worldW + 20;
      const p = newPerson(x, footpathH, fromDoor);
      if (!fromDoor) p.dir = x < 0 ? 1 : -1;
      // some walkers head for a door ahead of them
      const ahead = doors.filter((d) => (d - p.x) * p.dir > 40);
      if (ahead.length && Math.random() < 0.35) p.target = pick(ahead);
      this.list.push(p);
    }
    for (const p of this.list) {
      p.phase += dt * p.speed * 0.6;
      if (p.leaving) {
        p.alpha -= dt * 2.5;
        continue;
      }
      if (p.alpha < 1) p.alpha = Math.min(1, p.alpha + dt * 2);
      p.x += p.dir * p.speed * dt;
      if (p.target !== null && (p.target - p.x) * p.dir <= 0) p.leaving = true;
    }
    this.list = this.list.filter((p) => p.alpha > 0 && p.x > -40 && p.x < worldW + 40);
    this.list.sort((a, b) => a.y - b.y);
  }

  /** Draw in world space; ground line is y = 0, footpath below it. */
  draw(ctx: Ctx, viewL: number, viewR: number): void {
    for (const p of this.list) {
      if (p.x < viewL - 10 || p.x > viewR + 10) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      const step = Math.sin(p.phase) * 2.2;
      // offset paper shadow under the feet
      ctx.fillStyle = PAPER_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0.8, 0.6, 3.6, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // legs
      if (p.outfit === 'saree') {
        ctx.fillStyle = mute(p.bottom);
        ctx.beginPath();
        ctx.moveTo(-3, -8);
        ctx.lineTo(3, -8);
        ctx.lineTo(3.6 + step * 0.3, 0);
        ctx.lineTo(-3.6 - step * 0.3, 0);
        ctx.fill();
      } else if (p.outfit === 'lungi') {
        ctx.fillStyle = mute(p.bottom);
        ctx.fillRect(-2.8, -8, 5.6, 6);
        line(ctx, -1, -2, -1 - step, 0, p.skin, 1.4);
        line(ctx, 1, -2, 1 + step, 0, p.skin, 1.4);
      } else {
        line(ctx, -1, -8, -1 - step, 0, p.bottom, 1.8);
        line(ctx, 1, -8, 1 + step, 0, p.bottom, 1.8);
      }
      // body
      ctx.fillStyle = mute(p.top);
      ctx.fillRect(-2.6, -15, 5.2, 7.5);
      if (p.outfit === 'saree') {
        ctx.beginPath();
        ctx.moveTo(-2.6, -15);
        ctx.lineTo(2.6, -15);
        ctx.lineTo(-1.5, -7);
        ctx.fill();
      }
      // head
      ctx.fillStyle = mute(p.skin);
      ctx.beginPath();
      ctx.arc(p.dir * 0.4, -17.6, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b2320';
      ctx.beginPath();
      ctx.arc(p.dir * 0.2, -18.6, 2.2, Math.PI, 0);
      ctx.fill();
      ctx.restore();
    }
  }
}
