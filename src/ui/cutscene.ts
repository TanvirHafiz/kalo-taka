// The 6-second Flee to Canada cutscene: the tycoon at the airport with too many suitcases, a ticker
// line about "medical treatment", then the Jamai stepping onto an empty plot with a hard hat on
// backwards. Skippable; with reduced motion it shows the frames without movement.
import { PRESTIGE } from '../config/events';
import { FLEE } from '../config/strings';
import { box, circle, fitText, line, poly, roundBox, setPaperMode, type Ctx } from '../render/draw';
import { drawAvatar } from '../render/portrait';

export function playCutscene(root: HTMLElement, seed: number, stars: number, onDone: () => void): void {
  const el = document.createElement('div');
  el.className = 'cutscene';
  el.innerHTML = `<canvas></canvas><button type="button" class="cutscene-skip">${FLEE.skip}</button>`;
  root.appendChild(el);
  const canvas = el.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    el.remove();
    onDone();
  };
  el.querySelector('button')!.addEventListener('click', finish);
  el.querySelector('button')!.focus();
  const start = performance.now();
  const face = document.createElement('canvas');
  face.width = 96;
  face.height = 96;
  drawAvatar(face.getContext('2d')!, 96, seed, stars);

  const frame = () => {
    const t = Math.min(1, (performance.now() - start) / PRESTIGE.cutsceneMs);
    const w = el.clientWidth, h = el.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setPaperMode(false, dpr);
    const c: Ctx = ctx;
    c.fillStyle = '#bfe0e8';
    c.fillRect(0, 0, w, h);
    const gy = h * 0.72;
    c.fillStyle = '#d9c9a8';
    c.fillRect(0, gy, w, h - gy);
    if (t < 0.62) {
      // airport: a plane, the tycoon and a tower of suitcases
      const k = reduce ? 0 : t / 0.62;
      const px = w * (0.75 + 0.1 * k);
      poly(c, [px - 90, gy - 120, px + 60, gy - 130, px + 80, gy - 118, px - 80, gy - 104], '#f5efe2');
      poly(c, [px - 20, gy - 124, px + 10, gy - 160, px + 24, gy - 160, px + 10, gy - 122], '#c8553d');
      box(c, w * 0.08, gy - 150, 120, 150, '#a8c5da');
      fitText(c, 'DEPARTURES', w * 0.08 + 60, gy - 132, 108, 14, '#3a2e25');
      const tx = w * (0.3 + 0.12 * k);
      c.drawImage(face, tx - 24, gy - 120, 48, 48);
      box(c, tx - 16, gy - 74, 32, 40, '#3a3f58');
      line(c, tx - 6, gy - 34, tx - 8, gy, '#3a3f58', 4);
      line(c, tx + 6, gy - 34, tx + 8, gy, '#3a3f58', 4);
      for (let i = 0; i < 7; i++) {
        roundBox(c, tx + 26 + (i % 2) * 4, gy - 22 - i * 20, 44, 20, 4, ['#c8553d', '#4f7c6b', '#e9c46a', '#3d6fa3', '#a8466e'][i % 5]!);
      }
      circle(c, tx + 34, gy - 4, 5, '#3a3a40');
      circle(c, tx + 64, gy - 4, 5, '#3a3a40');
    } else {
      // the Jamai on an empty plot, hard hat on backwards
      const jx = w * 0.5;
      box(c, jx - 120, gy - 6, 240, 6, '#cdb48c');
      for (let i = 0; i < 4; i++) box(c, jx + 60 + i * 8, gy - 12 - (i % 2) * 6, 8, 6, '#b8573e');
      c.drawImage(face, jx - 26, gy - 132, 52, 52);
      poly(c, [jx - 30, gy - 118, jx + 22, gy - 124, jx + 26, gy - 112, jx - 34, gy - 108], '#f2c14e');
      box(c, jx - 18, gy - 82, 36, 46, '#f5efe2');
      line(c, jx - 8, gy - 36, jx - 10, gy, '#3d6fa3', 5);
      line(c, jx + 8, gy - 36, jx + 10, gy, '#3d6fa3', 5);
    }
    // the ticker line
    c.fillStyle = '#c8553d';
    c.fillRect(0, h - 44, w, 44);
    const line1 = t < 0.62 ? `${FLEE.cutscene[0]}. ${FLEE.cutscene[1]}` : FLEE.cutscene[2]!;
    fitText(c, line1, w / 2, h - 22, w - 40, 18, '#fffaf0');
    if (t >= 1) return finish();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}
