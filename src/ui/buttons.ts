// Bottom-right button row: Build, Posters, Nephews, Flee (when available) and Settings.
// Settings arrives in a later milestone and says so when tapped.
import { STRINGS, fmt } from '../config/strings';

export interface ButtonRow {
  setFleeVisible(v: boolean, pulse: boolean): void;
}

const ICON: Record<string, string> = {
  build: '<path d="M3 13h10 M4 13V7l4-3 4 3v6 M7 13v-3h2v3"/>',
  posters: '<path d="M4 3h8v10H4z M6 6h4 M6 8h4"/>',
  nephews: '<circle cx="6" cy="6" r="2"/><circle cx="11" cy="7" r="1.6"/><path d="M2.5 13c.5-2.5 6.5-2.5 7 0 M9 13c.3-1.8 4-1.8 4.5 0"/>',
  flee: '<path d="M2 10l11-4-2 3 3 1-11 2z"/>',
  settings: '<circle cx="8" cy="8" r="2.2"/><path d="M8 2v2 M8 12v2 M2 8h2 M12 8h2 M3.8 3.8l1.4 1.4 M10.8 10.8l1.4 1.4 M3.8 12.2l1.4-1.4 M10.8 5.2l1.4-1.4"/>',
};

export function createButtonRow(root: HTMLElement, handlers: Partial<Record<string, () => void>>, toast: (msg: string) => void): ButtonRow {
  const el = document.createElement('nav');
  el.className = 'button-row';
  el.setAttribute('aria-label', 'Actions');
  const items: [string, string, boolean][] = [
    ['build', STRINGS.buttons.build, true],
    ['posters', STRINGS.buttons.posters, true],
    ['nephews', STRINGS.buttons.nephews, true],
    ['flee', STRINGS.buttons.flee, true],
    ['settings', STRINGS.buttons.settings, false],
  ];
  el.innerHTML = items
    .map(([k, label, ready]) => `<button type="button" data-k="${k}" class="${ready ? '' : 'later'}"${k === 'flee' ? ' hidden' : ''}><svg viewBox="0 0 16 16" aria-hidden="true">${ICON[k]}</svg><span>${label}</span></button>`)
    .join('');
  root.appendChild(el);
  el.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn) return;
    const handler = handlers[btn.dataset.k ?? ''];
    if (handler) handler();
    else toast(fmt(STRINGS.buttons.later, { name: btn.querySelector('span')!.textContent ?? '' }));
  });
  const flee = el.querySelector<HTMLButtonElement>('[data-k="flee"]')!;
  return {
    setFleeVisible(v, pulse) {
      flee.hidden = !v;
      flee.classList.toggle('pulse', v && pulse);
    },
  };
}
