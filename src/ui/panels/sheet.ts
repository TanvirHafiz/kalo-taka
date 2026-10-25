// A slide-up sheet listing rows with buttons (Posters, Nephews). Like the plot card, buttons are
// keyed and updated in place so refreshing never swallows a tap.
import { STRINGS, errorText, type ErrorKey } from '../../config/strings';
import type { Action, GameState } from '../../state/types';
import { formatTaka } from '../../util/money';

export interface SheetButton {
  id: string;
  label: string;
  cost?: number;
  error: ErrorKey | null;
  action: Action;
  quiet?: boolean;
}

export interface SheetRow {
  id: string;
  title: string;
  lines: string[];
  buttons: SheetButton[];
  dim?: boolean;
}

export interface SheetView {
  title: string;
  intro: string;
  status: string;
  rows: SheetRow[];
}

export interface Sheet {
  open(): void;
  close(): void;
  readonly isOpen: boolean;
  update(state: GameState): void;
}

export function createSheet(root: HTMLElement, view: (s: GameState) => SheetView, dispatch: (a: Action) => void, onOpen: () => void): Sheet {
  const el = document.createElement('section');
  el.className = 'panel sheet';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="panel-head"><div><h2 class="panel-title"></h2><div class="panel-sub"></div></div><button class="panel-close" type="button" aria-label="${STRINGS.plot.close}">×</button></div>
    <p class="sheet-intro"></p>
    <div class="sheet-rows"></div>
  `;
  root.appendChild(el);
  const title = el.querySelector<HTMLElement>('.panel-title')!;
  const sub = el.querySelector<HTMLElement>('.panel-sub')!;
  const intro = el.querySelector<HTMLElement>('.sheet-intro')!;
  const rowsEl = el.querySelector<HTMLElement>('.sheet-rows')!;
  const actions = new Map<string, Action>();
  let open = false;
  // keyboard users land inside the sheet and go back where they were when it closes
  let returnFocus: HTMLElement | null = null;
  el.querySelector('.panel-close')!.addEventListener('click', () => sheet.close());
  rowsEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    const action = btn && actions.get(btn.dataset.id ?? '');
    if (btn && action && !btn.disabled) dispatch(action);
  });

  const sheet: Sheet = {
    get isOpen() {
      return open;
    },
    open() {
      onOpen();
      returnFocus = document.activeElement as HTMLElement | null;
      open = true;
      el.classList.add('open');
      el.setAttribute('aria-hidden', 'false');
      el.querySelector<HTMLElement>('.panel-close')!.focus();
    },
    close() {
      if (!open) return;
      open = false;
      el.classList.remove('open');
      el.setAttribute('aria-hidden', 'true');
      if (el.contains(document.activeElement)) returnFocus?.focus();
    },
    update(state) {
      if (!open) return;
      const v = view(state);
      title.textContent = v.title;
      sub.textContent = v.status;
      intro.textContent = v.intro;
      actions.clear();
      const wantedRows = new Set(v.rows.map((r) => r.id));
      for (const r of Array.from(rowsEl.children) as HTMLElement[]) if (!wantedRows.has(r.dataset.row ?? '')) r.remove();
      v.rows.forEach((row, ri) => {
        let r = rowsEl.querySelector<HTMLElement>(`[data-row="${row.id}"]`);
        if (!r) {
          r = document.createElement('div');
          r.className = 'sheet-row';
          r.dataset.row = row.id;
          r.innerHTML = '<div class="sheet-row-text"><div class="sheet-row-title"></div><div class="sheet-row-lines"></div></div><div class="sheet-row-buttons"></div>';
        }
        if (rowsEl.children[ri] !== r) rowsEl.insertBefore(r, rowsEl.children[ri] ?? null);
        r.classList.toggle('dim', !!row.dim);
        r.querySelector('.sheet-row-title')!.textContent = row.title;
        r.querySelector('.sheet-row-lines')!.textContent = row.lines.join(' · ');
        const bEl = r.querySelector<HTMLElement>('.sheet-row-buttons')!;
        const wanted = new Set(row.buttons.map((b) => b.id));
        for (const b of Array.from(bEl.children) as HTMLButtonElement[]) if (!wanted.has(b.dataset.id ?? '')) b.remove();
        row.buttons.forEach((spec, bi) => {
          let btn = bEl.querySelector<HTMLButtonElement>(`button[data-id="${spec.id}"]`);
          if (!btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.id = spec.id;
            btn.innerHTML = '<span class="btn-label"></span><span class="btn-cost"></span>';
          }
          if (bEl.children[bi] !== btn) bEl.insertBefore(btn, bEl.children[bi] ?? null);
          actions.set(spec.id, spec.action);
          btn.classList.toggle('quiet', !!spec.quiet);
          btn.querySelector('.btn-label')!.textContent = spec.label;
          btn.querySelector('.btn-cost')!.textContent = spec.cost !== undefined && Number.isFinite(spec.cost) ? formatTaka(spec.cost) : '';
          btn.disabled = spec.error !== null;
          btn.title = spec.error ? errorText(spec.error) : '';
        });
      });
    },
  };
  return sheet;
}
