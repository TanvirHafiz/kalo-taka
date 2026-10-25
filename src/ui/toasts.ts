const TOAST_MS = 3500;

let host: HTMLElement | null = null;

export function initToasts(root: HTMLElement): void {
  host = document.createElement('div');
  host.className = 'toasts';
  host.setAttribute('role', 'status');
  host.setAttribute('aria-live', 'polite');
  root.appendChild(host);
}

export function showToast(message: string): void {
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  host.appendChild(el);
  while (host.children.length > 3) host.firstElementChild?.remove();
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, TOAST_MS);
}
