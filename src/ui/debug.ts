// Developer panel, only created when the URL has ?debug. Time skip, money, heat meters, any event,
// finish permits, and a frame-time readout for the performance check. Not player-facing, so its
// labels live here rather than in strings.ts.
import { EVENT_IDS } from '../config/events';
import { EVENT_TEXT } from '../config/strings';
import { debugAddTaka, debugFillPlots, debugFinishPermits, debugSetMeter, debugStartEvent, type DebugMeter } from '../sim/debug';
import type { GameState } from '../state/types';
import { formatTaka } from '../util/money';

export interface DebugApi {
  get(): GameState;
  /** Replace the state through main, so events drain and the HUD refreshes. */
  set(next: GameState): void;
  setSpeed(x: number): void;
}

export interface DebugPanel {
  /** Feed one frame's script time (ms) for the readout. */
  frame(ms: number): void;
  update(state: GameState): void;
}

const SPEEDS = [1, 10, 100];
const MONEY = [1e7, 1e9, 1e11];
const METERS: [DebugMeter, string][] = [['media', 'Media'], ['anger', 'Anger'], ['committee', 'Committee'], ['influence', 'Influence']];

export function createDebugPanel(root: HTMLElement, api: DebugApi): DebugPanel {
  const el = document.createElement('details');
  el.className = 'debug';
  el.innerHTML = `<summary>DEBUG <span class="debug-fps"></span></summary>
    <div class="debug-row">${SPEEDS.map((x) => `<button type="button" data-speed="${x}">x${x}</button>`).join('')}</div>
    <div class="debug-row">${MONEY.map((m) => `<button type="button" data-money="${m}">+${formatTaka(m)}</button>`).join('')}</div>
    ${METERS.map(([k, label]) => `<label class="debug-meter">${label}<input type="range" min="0" max="100" step="1" data-meter="${k}"><span></span></label>`).join('')}
    <div class="debug-row"><select>${EVENT_IDS.map((id) => `<option value="${id}">${EVENT_TEXT.names[id]}</option>`).join('')}</select><button type="button" data-event>Start</button></div>
    <div class="debug-row"><button type="button" data-permits>Finish permits</button><button type="button" data-fill>Fill all plots</button></div>`;
  root.appendChild(el);
  const fpsEl = el.querySelector<HTMLElement>('.debug-fps')!;
  const select = el.querySelector('select')!;
  let speed = 1;
  const markSpeed = () => {
    for (const b of el.querySelectorAll<HTMLButtonElement>('[data-speed]')) b.classList.toggle('on', Number(b.dataset.speed) === speed);
  };
  markSpeed();

  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b) return;
    if (b.dataset.speed) {
      speed = Number(b.dataset.speed);
      api.setSpeed(speed);
      markSpeed();
    } else if (b.dataset.money) api.set(debugAddTaka(api.get(), Number(b.dataset.money)));
    else if (b.dataset.event !== undefined) api.set(debugStartEvent(api.get(), select.value as (typeof EVENT_IDS)[number]));
    else if (b.dataset.permits !== undefined) api.set(debugFinishPermits(api.get()));
    else if (b.dataset.fill !== undefined) api.set(debugFillPlots(api.get()));
  });
  el.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    const meter = input.dataset.meter as DebugMeter | undefined;
    if (meter) api.set(debugSetMeter(api.get(), meter, Number(input.value)));
  });

  // a rolling average of script time per frame
  let avg = 0;
  let worst = 0;
  let shown = 0;
  return {
    frame(ms) {
      avg = avg * 0.95 + ms * 0.05;
      worst = Math.max(worst * 0.995, ms);
      const t = performance.now();
      if (t - shown > 500) {
        shown = t;
        fpsEl.textContent = `${avg.toFixed(1)} ms avg, ${worst.toFixed(1)} worst`;
      }
    },
    update(state) {
      if (!el.open) return;
      for (const [k] of METERS) {
        const input = el.querySelector<HTMLInputElement>(`[data-meter="${k}"]`)!;
        const v = k === 'influence' ? state.influence : state.heat[k];
        if (document.activeElement !== input) input.value = String(Math.round(v));
        input.nextElementSibling!.textContent = String(Math.round(v));
      }
    },
  };
}
