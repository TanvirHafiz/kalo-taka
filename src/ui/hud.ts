import { STRINGS } from '../config/strings';
import { plotsOwned, totalIncome } from '../sim/economy';
import type { GameState } from '../state/types';
import { formatRate, formatTaka } from '../util/money';

export interface Hud {
  update(state: GameState): void;
}

export function createHud(root: HTMLElement): Hud {
  const el = document.createElement('header');
  el.className = 'hud';
  el.innerHTML = `
    <div class="hud-item"><span class="hud-label">${STRINGS.hud.taka}</span><span class="hud-value" data-k="taka"></span></div>
    <div class="hud-item"><span class="hud-label">${STRINGS.hud.income}</span><span class="hud-value" data-k="income"></span></div>
    <div class="hud-item"><span class="hud-label">${STRINGS.hud.plots}</span><span class="hud-value" data-k="plots"></span></div>
  `;
  root.appendChild(el);
  const taka = el.querySelector<HTMLElement>('[data-k="taka"]')!;
  const income = el.querySelector<HTMLElement>('[data-k="income"]')!;
  const plots = el.querySelector<HTMLElement>('[data-k="plots"]')!;

  return {
    update(state) {
      taka.textContent = formatTaka(state.taka);
      income.textContent = formatRate(totalIncome(state));
      plots.textContent = `${plotsOwned(state)} / ${state.plots.length}`;
    },
  };
}
