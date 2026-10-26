// Top HUD: avatar, Taka, income, the three heat gauges, Influence, Offshore Stars and the district.
// Offshore Stars stay 0 until M5; every gauge has a label as well as a colour. The nephews' cut is
// shown honestly next to income.
import { DISTRICTS } from '../config/buildings';
import { STRINGS, fmt } from '../config/strings';
import { effectiveInfluence, totalSkim } from '../sim/corruption';
import { calendar } from '../sim/daycycle';
import { isBoosted, totalIncome } from '../sim/economy';
import type { GameState } from '../state/types';
import { formatRate, formatTaka } from '../util/money';
import { drawAvatar } from '../render/portrait';
import { localDigits } from '../config/lang';

export interface Hud {
  update(state: GameState, district: number): void;
}

const ICONS: Record<string, string> = {
  // small inline icons so each gauge reads without colour
  media: '<path d="M3 4h10v8H3z M5 6h6 M5 8h6 M5 10h4" />',
  anger: '<circle cx="8" cy="8" r="5.5"/><path d="M5.5 11c1.5-1.4 3.5-1.4 5 0 M5 6l2 1 M11 6l-2 1"/>',
  committee: '<path d="M3 13h10 M5 13V7 M8 13V7 M11 13V7 M2.5 6.5L8 3l5.5 3.5z"/>',
  influence: '<path d="M3 7v3h2l5 3V4L5 7z M12 6c1 1 1 3 0 4"/>',
  stars: '<path d="M8 2.5l1.7 3.5 3.8.5-2.8 2.6.7 3.8L8 11.1l-3.4 1.8.7-3.8L2.5 6.5l3.8-.5z"/>',
};

function gauge(key: string, label: string, help: string): string {
  return `<div class="gauge" data-g="${key}" title="${help}">
    <svg viewBox="0 0 16 16" aria-hidden="true">${ICONS[key]}</svg>
    <span class="gauge-label">${label}</span>
    <span class="gauge-bar"><i></i></span>
    <span class="gauge-val"></span>
  </div>`;
}

export function createHud(root: HTMLElement): Hud {
  const el = document.createElement('header');
  el.className = 'hud';
  el.innerHTML = `
    <div class="hud-main">
      <canvas class="hud-avatar" width="88" height="88" aria-label="${STRINGS.hud.portrait}"></canvas>
      <div class="hud-item hud-taka"><span class="hud-label">${STRINGS.hud.taka}</span><span class="hud-value" data-k="taka"></span></div>
      <div class="hud-item"><span class="hud-label">${STRINGS.hud.income}</span><span class="hud-value" data-k="income"></span></div>
      <div class="hud-district" data-k="district"></div>
      <div class="hud-calendar" data-k="calendar"></div>
      <div class="hud-skim" data-k="skim" hidden></div>
    </div>
    <div class="hud-gauges">
      ${gauge('media', STRINGS.hud.media, STRINGS.hud.mediaHelp)}
      ${gauge('anger', STRINGS.hud.anger, STRINGS.hud.angerHelp)}
      ${gauge('committee', STRINGS.hud.committee, STRINGS.hud.committeeHelp)}
      ${gauge('influence', STRINGS.hud.influence, STRINGS.hud.influenceHelp)}
      <div class="gauge gauge-stars" data-g="stars" title="${STRINGS.hud.starsHelp}">
        <svg viewBox="0 0 16 16" aria-hidden="true">${ICONS.stars}</svg>
        <span class="gauge-label">${STRINGS.hud.stars}</span>
        <span class="gauge-val"></span>
      </div>
    </div>
  `;
  root.appendChild(el);
  const taka = el.querySelector<HTMLElement>('[data-k="taka"]')!;
  const income = el.querySelector<HTMLElement>('[data-k="income"]')!;
  const district = el.querySelector<HTMLElement>('[data-k="district"]')!;
  const skimEl = el.querySelector<HTMLElement>('[data-k="skim"]')!;
  const calEl = el.querySelector<HTMLElement>('[data-k="calendar"]')!;
  const avatar = el.querySelector<HTMLCanvasElement>('.hud-avatar')!;
  const actx = avatar.getContext('2d')!;
  let avatarKey = '';
  const setGauge = (key: string, value: number) => {
    const g = el.querySelector<HTMLElement>(`[data-g="${key}"]`)!;
    const bar = g.querySelector<HTMLElement>('.gauge-bar i');
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, value))}%`;
    g.querySelector('.gauge-val')!.textContent = localDigits(String(Math.round(value)));
    g.classList.toggle('hot', value >= 60);
  };

  return {
    update(state, d) {
      taka.textContent = formatTaka(state.taka);
      const boosted = isBoosted(state);
      income.textContent = formatRate(totalIncome(state));
      income.classList.toggle('boosted', boosted);
      income.title = boosted ? STRINGS.hud.boost : '';
      district.textContent = DISTRICTS[d]?.name ?? '';
      const cal = calendar(state.startedAt, state.lastSimTime);
      calEl.textContent = fmt(STRINGS.hud.calendar, { m: cal.month, d: cal.dayOfMonth });
      setGauge('media', state.heat.media);
      setGauge('anger', state.heat.anger);
      setGauge('committee', state.heat.committee);
      setGauge('influence', effectiveInfluence(state));
      const skim = totalSkim(state);
      skimEl.hidden = skim <= 0;
      skimEl.textContent = fmt(STRINGS.nephews.totalSkim, { pct: `${Math.round(skim * 1000) / 10}%` });
      setGauge('stars', state.stars);
      const key = `${state.seed}|${state.stars}`;
      if (key !== avatarKey) {
        avatarKey = key;
        actx.setTransform(1, 0, 0, 1, 0, 0);
        actx.clearRect(0, 0, 88, 88);
        drawAvatar(actx, 88, state.seed, state.stars);
      }
    },
  };
}
