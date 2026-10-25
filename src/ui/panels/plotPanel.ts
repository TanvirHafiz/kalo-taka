// Slide-up card for the selected plot. Buttons are keyed by id and updated in place,
// so refreshing four times a second never swallows a click.
import { BALANCE } from '../../config/balance';
import { BUILDABLE_CATEGORIES } from '../../config/buildings';
import { STRINGS, fmt, type ErrorKey } from '../../config/strings';
import { canBuild, canBuyPlot, canMerge, canUpgrade } from '../../sim/actions';
import { buildCost, buildingIncome, plotCost, tierDef, upgradeCost } from '../../sim/economy';
import { mergeBlocker, mergeFee } from '../../sim/merge';
import type { Action, GameState } from '../../state/types';
import { formatRate, formatTaka } from '../../util/money';

interface ButtonSpec {
  id: string;
  label: string;
  cost?: number;
  error: ErrorKey | null;
  action: Action;
}

interface View {
  title: string;
  lines: string[];
  buttons: ButtonSpec[];
}

export interface PlotPanel {
  open(plot: number): void;
  close(): void;
  readonly selected: number | null;
  update(state: GameState): void;
}

function viewFor(state: GameState, i: number): View {
  const p = state.plots[i]!;
  const n = i + 1;
  if (!p.owned) {
    return {
      title: fmt(STRINGS.plot.unownedTitle, { n }),
      lines: [],
      buttons: [{ id: 'buy', label: STRINGS.plot.buyLegally, cost: plotCost(state), error: canBuyPlot(state, i), action: { type: 'buyPlot', plot: i } }],
    };
  }
  if (!p.building) {
    return {
      title: fmt(STRINGS.plot.emptyTitle, { n }),
      lines: [],
      buttons: BUILDABLE_CATEGORIES.map((category) => ({
        id: `build-${category}`,
        label: fmt(STRINGS.plot.build, { name: tierDef(category, 1)?.name ?? category }),
        cost: buildCost(category),
        error: canBuild(state, i, category),
        action: { type: 'build', plot: i, category },
      })),
    };
  }
  const b = p.building;
  const maxed = b.level >= BALANCE.maxLevel;
  const buttons: ButtonSpec[] = [];
  if (maxed) {
    buttons.push({ id: 'upgrade', label: STRINGS.plot.maxLevel, error: 'maxLevel', action: { type: 'upgrade', plot: i } });
  } else {
    buttons.push({ id: 'upgrade', label: STRINGS.plot.upgrade, cost: upgradeCost(b), error: canUpgrade(state, i), action: { type: 'upgrade', plot: i } });
  }
  const lines = [fmt(STRINGS.plot.tierLevel, { tier: b.tier, level: b.level }), fmt(STRINGS.plot.incomeLine, { rate: formatRate(buildingIncome(state, b)) })];
  let anyPartner = false;
  for (const other of [i - 1, i + 1]) {
    // Offer the merge whenever the pair is valid; only Taka may be missing.
    if (mergeBlocker(state, i, other) !== null) continue;
    anyPartner = true;
    buttons.push({ id: `merge-${other}`, label: fmt(STRINGS.plot.merge, { n: other + 1 }), cost: mergeFee(b), error: canMerge(state, i, other), action: { type: 'merge', a: i, b: other } });
  }
  if (!anyPartner) lines.push(STRINGS.plot.mergeHint);
  return { title: tierDef(b.category, b.tier)?.name ?? '?', lines, buttons };
}

export function createPlotPanel(root: HTMLElement, dispatch: (a: Action) => void): PlotPanel {
  const el = document.createElement('section');
  el.className = 'panel';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="panel-head"><h2 class="panel-title"></h2><button class="panel-close" type="button" aria-label="${STRINGS.plot.close}">×</button></div>
    <div class="panel-lines"></div>
    <div class="panel-buttons"></div>
  `;
  root.appendChild(el);
  const titleEl = el.querySelector<HTMLElement>('.panel-title')!;
  const linesEl = el.querySelector<HTMLElement>('.panel-lines')!;
  const buttonsEl = el.querySelector<HTMLElement>('.panel-buttons')!;
  const actions = new Map<string, Action>();
  let selected: number | null = null;

  el.querySelector('.panel-close')!.addEventListener('click', () => panel.close());
  buttonsEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    const action = btn && actions.get(btn.dataset.id ?? '');
    if (btn && action && !btn.disabled) dispatch(action);
  });

  const panel: PlotPanel = {
    get selected() {
      return selected;
    },
    open(plot) {
      selected = plot;
      el.classList.add('open');
      el.setAttribute('aria-hidden', 'false');
    },
    close() {
      selected = null;
      el.classList.remove('open');
      el.setAttribute('aria-hidden', 'true');
    },
    update(state) {
      if (selected === null || !state.plots[selected]) return;
      const view = viewFor(state, selected);
      titleEl.textContent = view.title;
      linesEl.textContent = '';
      for (const line of view.lines) {
        const div = document.createElement('div');
        div.textContent = line;
        linesEl.appendChild(div);
      }

      const wanted = new Set(view.buttons.map((b) => b.id));
      for (const child of Array.from(buttonsEl.children) as HTMLButtonElement[]) {
        if (!wanted.has(child.dataset.id ?? '')) child.remove();
      }
      actions.clear();
      view.buttons.forEach((spec, idx) => {
        let btn = buttonsEl.querySelector<HTMLButtonElement>(`button[data-id="${spec.id}"]`);
        if (!btn) {
          btn = document.createElement('button');
          btn.type = 'button';
          btn.dataset.id = spec.id;
          btn.innerHTML = '<span class="btn-label"></span><span class="btn-cost"></span>';
        }
        if (buttonsEl.children[idx] !== btn) buttonsEl.insertBefore(btn, buttonsEl.children[idx] ?? null);
        actions.set(spec.id, spec.action);
        btn.querySelector('.btn-label')!.textContent = spec.label;
        btn.querySelector('.btn-cost')!.textContent = spec.cost !== undefined ? formatTaka(spec.cost) : '';
        btn.disabled = spec.error !== null;
        btn.title = spec.error ? STRINGS.errors[spec.error] : '';
      });
    },
  };
  return panel;
}
