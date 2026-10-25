// Bottom news ticker: a red TV strip with a BREAKING tag. Headlines come from the player's actions
// and events (templates with {building} {district} {amount} {nephew} slots), mixed with filler.
import { M5_TEXT, TICKER, fmt } from '../config/strings';

export interface Ticker {
  push(templates: readonly string[], vars?: Record<string, string>): void;
  update(dtMs: number, defaults: Record<string, string>): void;
}

const SPEED = 70; // px per second
const FILLER_EVERY_MS = 14_000;

export function createTicker(root: HTMLElement): Ticker {
  const el = document.createElement('div');
  el.className = 'ticker';
  el.setAttribute('role', 'marquee');
  el.innerHTML = `<span class="ticker-tag">${M5_TEXT.ticker}</span><div class="ticker-track"><span class="ticker-text"></span></div>`;
  root.appendChild(el);
  const track = el.querySelector<HTMLElement>('.ticker-track')!;
  const text = el.querySelector<HTMLElement>('.ticker-text')!;
  // headlines are filled in when they scroll on, so slots always have a value
  const queue: { template: string; vars: Record<string, string> }[] = [];
  let x = 0;
  let sinceFiller = FILLER_EVERY_MS;
  let showing = false;
  let defaults: Record<string, string> = {};
  const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]!;
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const next = () => {
    const line = queue.shift();
    if (!line) return false;
    text.textContent = fmt(line.template, { ...defaults, ...line.vars });
    x = track.clientWidth;
    showing = true;
    return true;
  };

  return {
    push(templates, vars = {}) {
      if (!templates.length) return;
      queue.push({ template: pick(templates), vars });
      if (queue.length > 6) queue.shift();
    },
    update(dtMs, d) {
      defaults = d;
      sinceFiller += dtMs;
      if (!showing && !queue.length && sinceFiller >= FILLER_EVERY_MS) {
        sinceFiller = 0;
        queue.push({ template: pick(TICKER.filler), vars: {} });
      }
      if (!showing && !next()) return;
      if (reduce) {
        // no scrolling: show each headline for a few seconds
        text.style.transform = 'translateX(0)';
        x -= dtMs * 0.2;
        if (x < -text.offsetWidth) showing = false;
        return;
      }
      x -= (SPEED * dtMs) / 1000;
      text.style.transform = `translateX(${x}px)`;
      if (x < -text.offsetWidth - 40) showing = false;
    },
  };
}
