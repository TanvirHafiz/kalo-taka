import './style.css';
import { BALANCE } from './config/balance';
import { STRINGS, errorText, fmt } from './config/strings';
import { createCamera, clampCamera, screenToWorldX } from './render/camera';
import { drawCity, plotAtWorldX, worldWidth } from './render/city';
import { applyAction } from './sim/actions';
import { tierDef } from './sim/economy';
import { advance } from './sim/tick';
import { createInitialState } from './state/initialState';
import { loadGame, saveGame } from './state/save';
import type { Action, GameState } from './state/types';
import { createHud } from './ui/hud';
import { createPlotPanel } from './ui/panels/plotPanel';
import { initToasts, showToast } from './ui/toasts';
import { formatTaka } from './util/money';
import { randomSeed } from './util/rng';

const app = document.getElementById('app')!;
const canvas = document.createElement('canvas');
canvas.className = 'city';
app.appendChild(canvas);
const ctx = canvas.getContext('2d')!;
const overlay = document.createElement('div');
overlay.className = 'overlay';
app.appendChild(overlay);

initToasts(overlay);
const hud = createHud(overlay);
const panel = createPlotPanel(overlay, dispatch);
const cam = createCamera();

// --- State ---------------------------------------------------------------
let state: GameState;
const loaded = loadGame(localStorage);
if (loaded.kind === 'loaded') {
  // Closed-game offline earnings arrive in M5. Until then, resume from now.
  state = { ...loaded.state, lastSimTime: Date.now() };
} else {
  state = createInitialState(randomSeed(), Date.now());
  if (loaded.kind === 'corrupt') showToast(STRINGS.toasts.loadFailed);
}

function save(): void {
  saveGame(localStorage, state);
}

function dispatch(action: Action): void {
  const result = applyAction(state, action);
  if (result.error) {
    showToast(errorText(result.error));
    return;
  }
  state = result.state;
  if (action.type === 'build') {
    const b = state.plots[action.plot]?.building;
    if (b) showToast(fmt(STRINGS.toasts.built, { name: tierDef(b.category, b.tier)?.name ?? '' }));
  } else if (action.type === 'merge') {
    const b = state.plots[Math.min(action.a, action.b)]?.building;
    if (b) showToast(fmt(STRINGS.toasts.merged, { name: tierDef(b.category, b.tier)?.name ?? '' }));
  }
  panel.update(state);
  hud.update(state);
}

// --- Resize --------------------------------------------------------------
function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  cam.viewW = canvas.clientWidth;
  cam.viewH = canvas.clientHeight;
  canvas.width = Math.round(cam.viewW * dpr);
  canvas.height = Math.round(cam.viewH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  clampCamera(cam, worldWidth(state));
}
window.addEventListener('resize', resize);
resize();

// --- Input: drag to scroll, tap to select ----------------------------------
let dragStartX = 0;
let dragCamX = 0;
let dragging = false;
let moved = 0;
canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  moved = 0;
  dragStartX = e.clientX;
  dragCamX = cam.x;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - dragStartX;
  moved = Math.max(moved, Math.abs(dx));
  cam.x = dragCamX - dx / cam.zoom;
  clampCamera(cam, worldWidth(state));
});
canvas.addEventListener('pointerup', (e) => {
  dragging = false;
  if (moved > 6) return;
  const rect = canvas.getBoundingClientRect();
  const plot = plotAtWorldX(state, screenToWorldX(cam, e.clientX - rect.left));
  if (plot === null) panel.close();
  else {
    panel.open(plot);
    panel.update(state);
  }
});
canvas.addEventListener('pointercancel', () => (dragging = false));
canvas.addEventListener('lostpointercapture', () => (dragging = false));
canvas.addEventListener('wheel', (e) => {
  cam.x += (e.deltaX || e.deltaY) / cam.zoom;
  clampCamera(cam, worldWidth(state));
  e.preventDefault();
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') panel.close();
});

// --- Loop ------------------------------------------------------------------
let lastUiUpdate = 0;
function frame(): void {
  const now = Date.now();
  const r = advance(state, now);
  state = r.state;
  if (r.caughtUpMs >= BALANCE.catchUpToastMinMs && r.caughtUp > 0) {
    showToast(fmt(STRINGS.toasts.welcomeBack, { amount: formatTaka(r.caughtUp) }));
  }
  if (now - lastUiUpdate >= BALANCE.tickMs) {
    lastUiUpdate = now;
    hud.update(state);
    panel.update(state);
  }
  drawCity(ctx, state, cam, panel.selected);
  requestAnimationFrame(frame);
}

// --- Save triggers ---------------------------------------------------------
setInterval(save, BALANCE.autosaveMs);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save();
});
window.addEventListener('pagehide', save);

// --- Title card --------------------------------------------------------------
const splash = document.createElement('div');
splash.className = 'splash';
splash.innerHTML = `<h1></h1><p class="disclaimer"></p><button type="button" class="splash-start">Start</button>`;
splash.querySelector('h1')!.textContent = STRINGS.title;
splash.querySelector('.disclaimer')!.textContent = STRINGS.disclaimer;
splash.querySelector('button')!.textContent = STRINGS.start;
splash.querySelector('button')!.addEventListener('click', () => splash.remove());
overlay.appendChild(splash);
splash.querySelector('button')!.focus();

hud.update(state);
requestAnimationFrame(frame);
