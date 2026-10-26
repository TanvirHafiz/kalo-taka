// Slide-up card for the selected plot. Buttons are keyed by id and updated in place,
// so refreshing four times a second never swallows a click.
import { BALANCE, CORRUPTION } from '../../config/balance';
import { BUILDINGS, CATEGORIES } from '../../config/buildings';
import { STRINGS, errorText, fmt, type ErrorKey } from '../../config/strings';
import { buildingSeed } from '../../render/buildings/cache';
import { relocateCost, canBuild, canBuyPlot, canEvict, canGrab, canInquiry, canMerge, canSpeedMoney, canUpgrade, evictRefund, upgradePlan } from '../../sim/actions';
import { inquiryCost, isFrozen, isLockJob, speedMoneyCost, waterPumpCost } from '../../sim/corruption';
import { buildCost, neighbourBonus, patients, plotCost, plotIncome, tierDef } from '../../sim/economy';
import { plotById } from '../../sim/layout';
import { unlockTier } from '../../sim/prestige';
import { mergeFee, mergePartners } from '../../sim/merge';
import type { Action, GameState, UpgradeCount } from '../../state/types';
import { formatRate, formatTaka } from '../../util/money';
import { buildingName } from '../../util/names';

interface ButtonSpec {
  id: string;
  label: string;
  cost?: number;
  error: ErrorKey | null;
  /** Shown instead of the error text when disabled for a non-error reason (locked category). */
  note?: string;
  /** Destructive: the first tap arms the button and shows this label, the second tap acts. */
  confirm?: string;
  /** Not an action: starts choosing where to move this building. */
  move?: boolean;
  action: Action;
}

interface View {
  title: string;
  subtitle: string;
  lines: string[];
  showToggle: boolean;
  buttons: ButtonSpec[];
}

export interface PlotPanel {
  open(plot: number): void;
  close(): void;
  readonly selected: number | null;
  update(state: GameState): void;
}

const COUNTS: { key: string; count: UpgradeCount; label: string }[] = [
  { key: 'x1', count: 1, label: STRINGS.plot.buyX1 },
  { key: 'x10', count: 10, label: STRINGS.plot.buyX10 },
  { key: 'max', count: 'max', label: STRINGS.plot.buyMax },
];

function viewFor(state: GameState, id: number, count: UpgradeCount): View {
  const p = plotById(state, id)!;
  const n = p.slot + 1;
  const back = p.row === 'back';
  if (!p.owned) {
    return {
      title: fmt(STRINGS.plot.unownedTitle, { n }),
      subtitle: back ? STRINGS.plot.backRow : '',
      lines: [],
      showToggle: false,
      buttons: [
        { id: 'buy', label: STRINGS.plot.buyLegally, cost: plotCost(state, p.district), error: canBuyPlot(state, id), action: { type: 'buyPlot', plot: id } },
        { id: 'grab', label: STRINGS.grab.action, note: STRINGS.grab.note, error: canGrab(state, id), action: { type: 'grab', plot: id } },
      ],
    };
  }
  const now = state.lastSimTime;
  const job = p.job;
  const secsLeft = job ? Math.max(0, Math.ceil((job.until - now) / 1000)) : 0;
  const speedLabel = STRINGS.permit.speedLabels[state.speedPaid % STRINGS.permit.speedLabels.length]!;
  const speedButton = (): ButtonSpec => ({ id: 'speed', label: speedLabel, cost: speedMoneyCost(state, id), error: canSpeedMoney(state, id), action: { type: 'speedMoney', plot: id } });
  if (!p.building && job) {
    const fill = job.kind === 'fill';
    return {
      title: fmt(STRINGS.plot.emptyTitle, { n }),
      subtitle: p.grabbed ? STRINGS.grab.flag : back ? STRINGS.plot.backRow : '',
      lines: [fmt(STRINGS.permit.waiting, { label: fill ? fmt(STRINGS.permit.fill, { pond: STRINGS.grab.ponds[job.pond ?? 0] ?? '' }) : STRINGS.permit.build, secs: secsLeft })],
      showToggle: false,
      buttons: fill ? [] : [speedButton()],
    };
  }
  if (!p.building) {
    return {
      title: fmt(STRINGS.plot.emptyTitle, { n }),
      subtitle: back ? STRINGS.plot.backRow : '',
      lines: [],
      showToggle: false,
      buttons: CATEGORIES.map((category) => {
        const unlocked = state.unlocked.includes(category);
        const t1 = BUILDINGS[category][0]!;
        const needed = BUILDINGS.housing[unlockTier(state, category) - 1]?.name ?? '';
        return {
          id: `build-${category}`,
          label: fmt(STRINGS.plot.build, { name: t1.name }),
          ...(unlocked ? { cost: buildCost(category) } : { note: fmt(STRINGS.build.locked, { tier: needed }) }),
          error: canBuild(state, id, category),
          action: { type: 'build', plot: id, category },
        };
      }),
    };
  }
  const b = p.building;
  const lines = [
    fmt(STRINGS.plot.tierLevel, { tier: b.tier, maxTier: BUILDINGS[b.category].length, level: b.level, max: BALANCE.maxLevel }),
    fmt(STRINGS.plot.incomeLine, { rate: formatRate(plotIncome(state, id)) }),
  ];
  const bonus = neighbourBonus(state, id);
  if (Math.abs(bonus) > 0.001) lines.push(fmt(STRINGS.plot.bonusLine, { bonus: `${bonus > 0 ? '+' : ''}${Math.round(bonus * 100)}%` }));
  if (back) lines.push(STRINGS.plot.backRow);
  if (b.category !== 'housing' && state.heat.media >= 1) {
    lines.push(fmt(STRINGS.plot.mediaLine, { pct: `${Math.round((state.heat.media / CORRUPTION.mediaDiv) * 100)}%` }));
  }
  if (b.category === 'healthcare') {
    lines.push(fmt(STRINGS.plot.patients, { n: patients(state, b) }));
    lines.push(STRINGS.testsByLevel[b.level] ?? '');
  }
  const buttons: ButtonSpec[] = [];
  if (p.grabbed) lines.push(STRINGS.grab.flag);
  const frozen = isFrozen(state, id);
  if (frozen && state.inquiry) {
    lines.unshift(fmt(STRINGS.inquiry.notice, { secs: Math.ceil((state.inquiry.until - now) / 1000) }));
    lines.push(`${STRINGS.inquiry.wait}: ${STRINGS.inquiry.waitNote}`);
    for (const [opt, label, note] of [
      ['talkShow', STRINGS.inquiry.talkShow, STRINGS.inquiry.talkShowNote],
      ['donation', STRINGS.inquiry.donation, STRINGS.inquiry.donationNote],
      ['envelope', STRINGS.inquiry.envelope, STRINGS.inquiry.envelopeNote],
    ] as const) {
      buttons.push({ id: `inq-${opt}`, label, note, cost: inquiryCost(state, opt), error: canInquiry(state, opt), action: { type: 'inquiry', option: opt } });
    }
  }
  if (job) {
    const leadJob = !isLockJob(job);
    lines.unshift(fmt(STRINGS.permit.waiting, { label: STRINGS.permit[job.kind === 'fill' ? 'build' : job.kind], secs: secsLeft }));
    if (leadJob) buttons.push(speedButton());
  }
  if (b.category === 'housing' && state.heat.anger > 0.5) {
    buttons.push({ id: 'pump', label: STRINGS.tenants.waterPump, note: STRINGS.tenants.waterPumpNote, cost: waterPumpCost(state), error: state.taka < waterPumpCost(state) ? 'notEnoughTaka' : null, action: { type: 'waterPump' } });
    if (!state.bachelorsAllowed) buttons.push({ id: 'bachelors', label: STRINGS.tenants.bachelors, note: STRINGS.tenants.bachelorsNote, error: null, action: { type: 'bachelors' } });
  }
  if (job || frozen) {
    return { title: tierDef(b.category, b.tier)?.name ?? '?', subtitle: buildingName(buildingSeed(state.seed, id, b), b.category), lines, showToggle: false, buttons };
  }
  if (b.level >= BALANCE.maxLevel) {
    buttons.push({ id: 'upgrade', label: fmt(STRINGS.plot.maxLevel, { max: BALANCE.maxLevel }), error: 'maxLevel', action: { type: 'upgrade', plot: id } });
  } else {
    const plan = upgradePlan(state, id, count);
    buttons.push({
      id: 'upgrade',
      label: plan.levels > 1 ? fmt(STRINGS.plot.upgradeN, { n: plan.levels }) : STRINGS.plot.upgrade,
      cost: plan.cost,
      error: canUpgrade(state, id, count),
      action: { type: 'upgrade', plot: id, count },
    });
  }
  const partners = mergePartners(state, id).filter((o) => !plotById(state, o)?.job && !isFrozen(state, o));
  for (const other of partners) {
    const o = plotById(state, other)!;
    buttons.push({ id: `merge-${other}`, label: fmt(STRINGS.plot.merge, { n: o.slot + 1 }), cost: mergeFee(b), error: canMerge(state, id, other), action: { type: 'merge', a: id, b: other } });
  }
  if (!partners.length) lines.push(b.level >= BALANCE.maxLevel ? fmt(STRINGS.plot.boxedIn, { hint: STRINGS.plot.mergeHint, evict: STRINGS.plot.evictHint }) : STRINGS.plot.mergeHint);
  buttons.push({
    id: 'relocate',
    label: STRINGS.plot.relocate,
    note: STRINGS.plot.relocateNote,
    move: true,
    // the price of moving to an empty plot (a swap also pays for the other building)
    cost: relocateCost(state, id, -1),
    error: !state.tutorial.done ? 'tutorialRunning' : state.taka < relocateCost(state, id, -1) ? 'notEnoughTaka' : null,
    action: { type: 'relocate', from: id, to: id },
  });
  buttons.push({
    id: 'evict',
    label: STRINGS.plot.evict,
    note: fmt(STRINGS.plot.evictNote, { refund: formatTaka(evictRefund(state, id)) }),
    confirm: STRINGS.plot.evictConfirm,
    error: canEvict(state, id),
    action: { type: 'evict', plot: id },
  });
  return {
    title: tierDef(b.category, b.tier)?.name ?? '?',
    subtitle: buildingName(buildingSeed(state.seed, id, b), b.category),
    lines,
    showToggle: b.level < BALANCE.maxLevel,
    buttons,
  };
}

export function createPlotPanel(root: HTMLElement, dispatch: (a: Action) => void, onMove: (plot: number) => void): PlotPanel {
  const el = document.createElement('section');
  el.className = 'panel';
  el.setAttribute('aria-hidden', 'true');
  el.inert = true;
  el.setAttribute('aria-label', 'Plot');
  el.innerHTML = `
    <div class="panel-head"><div><h2 class="panel-title"></h2><div class="panel-sub"></div></div><button class="panel-close" type="button" aria-label="${STRINGS.plot.close}">×</button></div>
    <div class="panel-lines"></div>
    <div class="buy-toggle" role="radiogroup" aria-label="${STRINGS.plot.upgradeAmount}">
      ${COUNTS.map((c) => `<button type="button" role="radio" data-count="${c.key}">${c.label}</button>`).join('')}
    </div>
    <div class="panel-buttons"></div>
  `;
  root.appendChild(el);
  const titleEl = el.querySelector<HTMLElement>('.panel-title')!;
  const subEl = el.querySelector<HTMLElement>('.panel-sub')!;
  const linesEl = el.querySelector<HTMLElement>('.panel-lines')!;
  const toggleEl = el.querySelector<HTMLElement>('.buy-toggle')!;
  const buttonsEl = el.querySelector<HTMLElement>('.panel-buttons')!;
  const actions = new Map<string, ButtonSpec>();
  // the armed destructive button and when its second tap expires
  let armed: { id: string; until: number } | null = null;
  let selected: number | null = null;
  let countKey = 'x1';
  let last: GameState | null = null;
  try {
    countKey = localStorage.getItem('kalotaka.buycount') ?? 'x1';
  } catch {
    // storage blocked: keep the default
  }

  el.querySelector('.panel-close')!.addEventListener('click', () => panel.close());
  buttonsEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    const spec = btn && actions.get(btn.dataset.id ?? '');
    if (!btn || !spec || btn.disabled) return;
    if (spec.move) {
      if (selected !== null) onMove(selected);
      return;
    }
    if (spec.confirm && (armed?.id !== spec.id || performance.now() > armed.until)) {
      armed = { id: spec.id, until: performance.now() + CORRUPTION.evictConfirmMs };
      if (last) panel.update(last);
      return;
    }
    armed = null;
    dispatch(spec.action);
  });
  toggleEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-count]');
    if (!btn) return;
    countKey = btn.dataset.count ?? 'x1';
    try {
      localStorage.setItem('kalotaka.buycount', countKey);
    } catch {
      // ignore
    }
    if (last) panel.update(last);
  });

  const panel: PlotPanel = {
    get selected() {
      return selected;
    },
    open(plot) {
      if (plot !== selected) armed = null;
      selected = plot;
      el.classList.add('open');
      el.setAttribute('aria-hidden', 'false');
      el.inert = false;
    },
    close() {
      selected = null;
      el.classList.remove('open');
      el.setAttribute('aria-hidden', 'true');
      el.inert = true;
    },
    update(state) {
      last = state;
      if (selected === null || !plotById(state, selected)) return;
      const count = COUNTS.find((c) => c.key === countKey)?.count ?? 1;
      const view = viewFor(state, selected, count);
      titleEl.textContent = view.title;
      subEl.textContent = view.subtitle;
      linesEl.textContent = '';
      for (const line of view.lines) {
        if (!line) continue;
        const div = document.createElement('div');
        div.textContent = line;
        linesEl.appendChild(div);
      }
      toggleEl.hidden = !view.showToggle;
      for (const b of Array.from(toggleEl.querySelectorAll<HTMLButtonElement>('button'))) {
        const on = b.dataset.count === countKey;
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', String(on));
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
          btn.innerHTML = '<span class="btn-text"><span class="btn-label"></span><span class="btn-note"></span></span><span class="btn-cost"></span>';
        }
        if (buttonsEl.children[idx] !== btn) buttonsEl.insertBefore(btn, buttonsEl.children[idx] ?? null);
        actions.set(spec.id, spec);
        const isArmed = !!spec.confirm && armed?.id === spec.id && performance.now() <= armed.until;
        btn.classList.toggle('armed', isArmed);
        btn.classList.toggle('danger', !!spec.confirm);
        btn.querySelector('.btn-label')!.textContent = isArmed ? spec.confirm! : spec.label;
        btn.querySelector('.btn-note')!.textContent = spec.note ?? '';
        btn.querySelector('.btn-cost')!.textContent = spec.cost !== undefined ? formatTaka(spec.cost) : '';
        btn.disabled = spec.error !== null;
        btn.title = spec.note ?? (spec.error ? errorText(spec.error) : '');
      });
    },
  };
  return panel;
}
