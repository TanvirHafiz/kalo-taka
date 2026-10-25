import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/latin-800.css';
import './style.css';
import { BALANCE } from './config/balance';
import { STRINGS, errorText, fmt } from './config/strings';
import { clearSpriteCache } from './render/buildings/cache';
import { ZOOM_MAX, ZOOM_MIN, createCamera, clampCamera, screenToWorldX } from './render/camera';
import { drawCity, fitZoom, plotAtWorldX, worldWidth } from './render/city';
import { clearSceneCache } from './render/scene';
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

// --- Resize and DPR --------------------------------------------------------
let dpr = 1;
function resize(): void {
  dpr = window.devicePixelRatio || 1;
  cam.viewW = canvas.clientWidth;
  cam.viewH = canvas.clientHeight;
  canvas.width = Math.round(cam.viewW * dpr);
  canvas.height = Math.round(cam.viewH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  clampCamera(cam, worldWidth(state));
}
window.addEventListener('resize', resize);
function watchDpr(): void {
  const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  mq.addEventListener('change', () => {
    clearSceneCache();
    resize();
    watchDpr();
  }, { once: true });
}
watchDpr();
resize();
cam.zoom = fitZoom(cam.viewW, cam.viewH);
clampCamera(cam, worldWidth(state));

function zoomAt(sx: number, factor: number): void {
  const wx = screenToWorldX(cam, sx);
  cam.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.zoom * factor));
  cam.x = wx - sx / cam.zoom;
  clampCamera(cam, worldWidth(state));
}

// --- Input: drag to scroll, tap to select, wheel or pinch to zoom ----------
const pointers = new Map<number, number>();
let dragStartX = 0;
let dragCamX = 0;
let moved = 0;
let pinchDist = 0;
canvas.addEventListener('pointerdown', (e) => {
  pointers.set(e.pointerId, e.clientX);
  canvas.setPointerCapture(e.pointerId);
  if (pointers.size === 1) {
    moved = 0;
    dragStartX = e.clientX;
    dragCamX = cam.x;
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchDist = Math.abs(a! - b!);
    moved = 99;
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, e.clientX);
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.abs(a! - b!);
    if (pinchDist > 10 && d > 10) zoomAt((a! + b!) / 2 - canvas.getBoundingClientRect().left, d / pinchDist);
    pinchDist = d;
    return;
  }
  const dx = e.clientX - dragStartX;
  moved = Math.max(moved, Math.abs(dx));
  cam.x = dragCamX - dx / cam.zoom;
  clampCamera(cam, worldWidth(state));
});
function endPointer(e: PointerEvent, tap: boolean): void {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (pointers.size > 0) {
    // back to a one-finger drag from where the other finger is
    const [rest] = [...pointers.values()];
    dragStartX = rest!;
    dragCamX = cam.x;
    return;
  }
  if (!tap || moved > 6) return;
  const rect = canvas.getBoundingClientRect();
  const plot = plotAtWorldX(state, screenToWorldX(cam, e.clientX - rect.left));
  if (plot === null) panel.close();
  else {
    panel.open(plot);
    panel.update(state);
  }
}
canvas.addEventListener('pointerup', (e) => endPointer(e, true));
canvas.addEventListener('pointercancel', (e) => endPointer(e, false));
canvas.addEventListener('lostpointercapture', (e) => endPointer(e, false));
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const sx = e.clientX - canvas.getBoundingClientRect().left;
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    cam.x += e.deltaX / cam.zoom;
    clampCamera(cam, worldWidth(state));
  } else {
    zoomAt(sx, Math.exp(-e.deltaY * 0.0015));
  }
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') panel.close();
});

// --- Loop ------------------------------------------------------------------
const bootTime = performance.now();
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
  drawCity(ctx, state, cam, panel.selected, dpr, (performance.now() - bootTime) / 1000);
  requestAnimationFrame(frame);
}

// --- Save triggers ---------------------------------------------------------
setInterval(save, BALANCE.autosaveMs);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save();
});
window.addEventListener('pagehide', save);

// --- Fonts: sprites are drawn with Baloo 2, so redraw once it is ready -------
Promise.all(['600', '700', '800'].map((w) => document.fonts.load(`${w} 16px "Baloo 2"`)))
  .then(() => {
    clearSpriteCache();
    clearSceneCache();
  })
  .catch(() => undefined);

// --- Title card --------------------------------------------------------------
const splash = document.createElement('div');
splash.className = 'splash';
splash.innerHTML = `<div class="splash-card"><p class="splash-kicker"></p><h1></h1><p class="disclaimer"></p><button type="button" class="splash-start"></button></div>`;
splash.querySelector('.splash-kicker')!.textContent = STRINGS.tagline;
splash.querySelector('h1')!.textContent = STRINGS.title;
splash.querySelector('.disclaimer')!.textContent = STRINGS.disclaimer;
splash.querySelector('button')!.textContent = STRINGS.start;
splash.querySelector('button')!.addEventListener('click', () => splash.remove());
overlay.appendChild(splash);
splash.querySelector('button')!.focus();

hud.update(state);
requestAnimationFrame(frame);
