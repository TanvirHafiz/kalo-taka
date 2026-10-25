// Manager Mamun: a small avatar in the corner with a clipboard. He delivers tutorial steps, event
// popups (with the response buttons), the offline report and the odd idle remark.
import { MAMUN } from '../config/strings';
import type { Action } from '../state/types';
import { formatTaka } from '../util/money';

export interface MamunButton {
  label: string;
  cost?: number;
  disabled?: boolean;
  /** An action to dispatch, or a UI callback. */
  action?: Action;
  run?: () => void;
}

export interface MamunMessage {
  /** Same key replaces the current message instead of queueing (events, tutorial). */
  key: string;
  text: string;
  buttons: MamunButton[];
  /** Dismiss automatically after this many ms (idle lines). */
  ttl?: number;
}

export interface Mamun {
  say(msg: MamunMessage): void;
  dismiss(key?: string): void;
  current(): string | null;
  /** Refresh button states (costs, affordability) for the message on screen. */
  refresh(buttons: (key: string) => MamunButton[] | null): void;
  tick(dtMs: number): void;
  /** Drop every message, shown and queued (a new run). */
  clear(): void;
}

function face(): string {
  // a small paper face with glasses and a clipboard, as inline SVG
  return `<svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="0" y="0" width="48" height="48" rx="12" fill="#e3cfa8"/>
    <ellipse cx="24" cy="46" rx="18" ry="12" fill="#3d6fa3"/>
    <circle cx="24" cy="21" r="11" fill="#a8714a"/>
    <path d="M13 18c2-7 20-7 22 0" fill="#2b2320"/>
    <rect x="15" y="19" width="7" height="5" rx="2" fill="none" stroke="#2b2320" stroke-width="1.6"/>
    <rect x="26" y="19" width="7" height="5" rx="2" fill="none" stroke="#2b2320" stroke-width="1.6"/>
    <path d="M19 28c3 2 7 2 10 0" stroke="#2b2320" stroke-width="1.6" fill="none"/>
    <rect x="30" y="30" width="12" height="15" rx="1.5" fill="#f5efe2" stroke="#7a5236" stroke-width="1.4"/>
    <path d="M33 35h6M33 38h6M33 41h4" stroke="#7a5236" stroke-width="1.2"/>
  </svg>`;
}

/** `dispatch` returns false when the action was refused; `onIdleTap` runs when his face is tapped with nothing to say. */
export function createMamun(root: HTMLElement, dispatch: (a: Action) => boolean, onIdleTap: () => void): Mamun {
  const el = document.createElement('aside');
  el.className = 'mamun';
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `<button type="button" class="mamun-face" aria-label="${MAMUN.name}">${face()}</button>
    <div class="mamun-card" hidden>
      <div class="mamun-name">${MAMUN.name}</div>
      <p class="mamun-text"></p>
      <div class="mamun-buttons"></div>
    </div>`;
  root.appendChild(el);
  const card = el.querySelector<HTMLElement>('.mamun-card')!;
  const text = el.querySelector<HTMLElement>('.mamun-text')!;
  const buttonsEl = el.querySelector<HTMLElement>('.mamun-buttons')!;
  const queue: MamunMessage[] = [];
  let cur: MamunMessage | null = null;
  let age = 0;

  const render = () => {
    card.hidden = !cur;
    if (!cur) return;
    text.textContent = cur.text;
    buttonsEl.textContent = '';
    cur.buttons.forEach((b) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = '<span class="btn-label"></span><span class="btn-cost"></span>';
      btn.querySelector('.btn-label')!.textContent = b.label;
      btn.querySelector('.btn-cost')!.textContent = b.cost ? formatTaka(b.cost) : '';
      btn.disabled = !!b.disabled;
      btn.addEventListener('click', () => {
        // a refused action (no longer affordable, lot taken) keeps the popup open
        if (b.action && !dispatch(b.action)) return;
        b.run?.();
      });
      buttonsEl.appendChild(btn);
    });
  };
  const show = (m: MamunMessage | null) => {
    cur = m;
    age = 0;
    render();
  };

  el.querySelector('.mamun-face')!.addEventListener('click', () => {
    if (cur) show(queue.shift() ?? null);
    else onIdleTap();
  });

  return {
    say(msg) {
      if (cur && cur.key === msg.key) return show(msg);
      const i = queue.findIndex((q) => q.key === msg.key);
      if (i >= 0) queue[i] = msg;
      else if (!cur) return show(msg);
      // events and the tutorial jump the queue; idle chatter waits
      else if (!msg.ttl) {
        if (cur.ttl) {
          queue.unshift(cur);
          return show(msg);
        }
        queue.unshift(msg);
      } else queue.push(msg);
    },
    dismiss(key) {
      if (key && cur?.key !== key) {
        const i = queue.findIndex((q) => q.key === key);
        if (i >= 0) queue.splice(i, 1);
        return;
      }
      show(queue.shift() ?? null);
    },
    current() {
      return cur?.key ?? null;
    },
    refresh(get) {
      if (!cur) return;
      const b = get(cur.key);
      if (!b) return;
      // only rebuild when something visible changed, so a tap is never swallowed
      const sig = (bs: MamunButton[]) => bs.map((x) => `${x.label}|${x.cost ?? ''}|${x.disabled ? 1 : 0}`).join(';');
      if (sig(b) !== sig(cur.buttons)) {
        cur = { ...cur, buttons: b };
        render();
      }
    },
    clear() {
      queue.length = 0;
      show(null);
    },
    tick(dtMs) {
      if (!cur?.ttl) return;
      age += dtMs;
      if (age >= cur.ttl) show(queue.shift() ?? null);
    },
  };
}
