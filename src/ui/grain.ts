// Paper grain: a small noise tile generated once and laid over the canvas with CSS, so it costs
// nothing per frame. It sits under the HUD and ignores pointer events.
import { mulberry32 } from '../util/rng';

const TILE = 160;

function grainTile(): string {
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = TILE;
  const ctx = c.getContext('2d')!;
  const rng = mulberry32(20261025);
  const img = ctx.createImageData(TILE, TILE);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rng();
    if (v < 0.5) {
      const dark = v < 0.25;
      img.data[i] = dark ? 70 : 255;
      img.data[i + 1] = dark ? 45 : 250;
      img.data[i + 2] = dark ? 20 : 235;
      img.data[i + 3] = Math.floor(rng() * 34);
    }
  }
  ctx.putImageData(img, 0, 0);
  // a few paper fibres
  ctx.strokeStyle = 'rgba(90,60,30,0.08)';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 26; i++) {
    const x = rng() * TILE, y = rng() * TILE, a = rng() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
    ctx.stroke();
  }
  return c.toDataURL('image/png');
}

export function addGrain(parent: HTMLElement, before: Element): void {
  const el = document.createElement('div');
  el.className = 'grain';
  el.setAttribute('aria-hidden', 'true');
  el.style.backgroundImage = `url(${grainTile()})`;
  parent.insertBefore(el, before);
}
