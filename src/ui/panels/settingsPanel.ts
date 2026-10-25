// The Settings sheet: volumes, motion, number format, ticker speed, and save tools (export,
// import, a two-step hard reset). Settings live apart from the save (util/settings.ts).
import { STRINGS } from '../../config/strings';
import { exportSave, importSave } from '../../state/save';
import type { GameState } from '../../state/types';
import { getSettings, updateSettings, type MotionSetting, type NumberFormat, type Settings } from '../../util/settings';

export interface SettingsPanel {
  open(): void;
  close(): void;
  readonly isOpen: boolean;
}

export interface SettingsHooks {
  getState(): GameState;
  /** Replace the running game (import); main saves it at once. */
  load(next: GameState): void;
  reset(): void;
  toast(msg: string): void;
  /** Close the other panels before this one opens. */
  onOpen(): void;
}

const RESET_CONFIRM_MS = 4000;

export function createSettingsPanel(root: HTMLElement, hooks: SettingsHooks): SettingsPanel {
  const S = STRINGS.settings;
  const el = document.createElement('section');
  el.className = 'panel sheet settings';
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('aria-label', S.title);
  const slider = (key: keyof Settings, label: string) =>
    `<label class="set-row"><span>${label}</span><input type="range" min="0" max="100" step="5" data-key="${key}"><output></output></label>`;
  const choice = (key: keyof Settings, label: string, opts: [string, string][]) =>
    `<label class="set-row"><span>${label}</span><select data-key="${key}">${opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>`;
  el.innerHTML = `
    <div class="panel-head"><div><h2 class="panel-title">${S.title}</h2><div class="panel-sub"></div></div><button class="panel-close" type="button" aria-label="${STRINGS.plot.close}">×</button></div>
    <p class="sheet-intro">${S.intro}</p>
    <div class="set-body">
      <h3>${S.audio}</h3>
      ${slider('master', S.master)}${slider('sfx', S.sfx)}${slider('ambience', S.ambience)}${slider('music', S.music)}
      <h3>${S.motion}</h3>
      ${choice('motion', S.motion, [['system', S.motionSystem], ['reduce', S.motionReduce], ['full', S.motionFull]])}
      ${choice('numbers', S.numbers, [['bd', S.numbersBd], ['short', S.numbersShort]])}
      ${choice('ticker', S.ticker, [['0.6', S.tickerSlow], ['1', S.tickerNormal], ['1.5', S.tickerFast]])}
      <h3>${S.save}</h3>
      <div class="set-actions">
        <button type="button" data-act="export">${S.export}</button>
        <button type="button" data-act="import">${S.import}</button>
        <button type="button" data-act="reset" class="danger">${S.reset}</button>
      </div>
      <div class="set-box" data-box="export" hidden><p>${S.exportNote}</p><textarea readonly rows="3"></textarea><button type="button" data-act="copy">${S.copy}</button></div>
      <div class="set-box" data-box="import" hidden><p>${S.importNote}</p><textarea rows="3"></textarea><button type="button" data-act="load">${S.importDo}</button></div>
      <p class="set-note" data-note="reset">${S.resetNote}</p>
    </div>`;
  root.appendChild(el);

  const exportBox = el.querySelector<HTMLElement>('[data-box="export"]')!;
  const importBox = el.querySelector<HTMLElement>('[data-box="import"]')!;
  const resetBtn = el.querySelector<HTMLButtonElement>('[data-act="reset"]')!;
  let open = false;
  let resetArmedUntil = 0;
  let returnFocus: HTMLElement | null = null;

  const fill = () => {
    const s = getSettings();
    for (const input of el.querySelectorAll<HTMLInputElement>('input[type="range"]')) {
      const v = s[input.dataset.key as 'master'];
      input.value = String(Math.round(v * 100));
      input.nextElementSibling!.textContent = `${Math.round(v * 100)}`;
    }
    for (const sel of el.querySelectorAll<HTMLSelectElement>('select')) sel.value = String(s[sel.dataset.key as keyof Settings]);
  };

  el.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    const key = t.dataset.key as keyof Settings | undefined;
    if (!key) return;
    if (t instanceof HTMLInputElement) {
      updateSettings({ [key]: Number(t.value) / 100 } as Partial<Settings>);
      t.nextElementSibling!.textContent = t.value;
    } else if (key === 'motion') updateSettings({ motion: t.value as MotionSetting });
    else if (key === 'numbers') updateSettings({ numbers: t.value as NumberFormat });
    else if (key === 'ticker') updateSettings({ ticker: Number(t.value) });
  });

  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    const act = b?.dataset.act;
    if (!b || !act) return;
    if (act === 'export') {
      exportBox.hidden = !exportBox.hidden;
      importBox.hidden = true;
      const ta = exportBox.querySelector('textarea')!;
      ta.value = exportSave(hooks.getState());
      ta.select();
    } else if (act === 'copy') {
      const ta = exportBox.querySelector('textarea')!;
      ta.select();
      void navigator.clipboard?.writeText(ta.value).then(() => hooks.toast(S.copied), () => undefined);
    } else if (act === 'import') {
      importBox.hidden = !importBox.hidden;
      exportBox.hidden = true;
      importBox.querySelector('textarea')!.focus();
    } else if (act === 'load') {
      const ta = importBox.querySelector('textarea')!;
      const next = importSave(ta.value);
      if (!next) return hooks.toast(S.importBad);
      ta.value = '';
      importBox.hidden = true;
      hooks.load(next);
      hooks.toast(S.imported);
    } else if (act === 'reset') {
      // two steps: the first tap arms, the second (within a few seconds) wipes
      if (performance.now() > resetArmedUntil) {
        resetArmedUntil = performance.now() + RESET_CONFIRM_MS;
        resetBtn.textContent = S.resetConfirm;
        resetBtn.classList.add('armed');
        setTimeout(() => {
          if (performance.now() >= resetArmedUntil) {
            resetBtn.textContent = S.reset;
            resetBtn.classList.remove('armed');
          }
        }, RESET_CONFIRM_MS);
        return;
      }
      resetArmedUntil = 0;
      resetBtn.textContent = S.reset;
      resetBtn.classList.remove('armed');
      hooks.reset();
      hooks.toast(S.resetDone);
    }
  });

  const panel: SettingsPanel = {
    get isOpen() {
      return open;
    },
    open() {
      hooks.onOpen();
      returnFocus = document.activeElement as HTMLElement | null;
      open = true;
      fill();
      el.classList.add('open');
      el.setAttribute('aria-hidden', 'false');
      el.querySelector<HTMLElement>('.panel-close')!.focus();
    },
    close() {
      if (!open) return;
      open = false;
      exportBox.hidden = true;
      importBox.hidden = true;
      el.classList.remove('open');
      el.setAttribute('aria-hidden', 'true');
      returnFocus?.focus();
    },
  };
  el.querySelector('.panel-close')!.addEventListener('click', () => panel.close());
  return panel;
}
