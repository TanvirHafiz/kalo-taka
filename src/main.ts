import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/latin-800.css';
import './style.css';
import { BALANCE } from './config/balance';
import { STRINGS, errorText, fmt } from './config/strings';
import { clearSpriteCache } from './render/buildings/cache';
import { ZOOM_MAX, ZOOM_MIN, createCamera, clampCamera, clampCameraY, screenToWorldX } from './render/camera';
import { CityRenderer, fitZoom, maxPanY, plotCenter, worldWidth } from './render/city';
import { clearSceneCache } from './render/scene';
import { DISTRICTS } from './config/buildings';
import { applyAction, bagValue } from './sim/actions';
import { NEPHEW_IDS, nephewUnlocked } from './sim/corruption';
import { districtCount, hasBackRow, plotById } from './sim/layout';
import { tierDef } from './sim/economy';
import { advance } from './sim/tick';
import { createInitialState } from './state/initialState';
import { loadGame, saveGame } from './state/save';
import type { Action, GameState } from './state/types';
import { addGrain } from './ui/grain';
import { createButtonRow } from './ui/buttons';
import { createHud } from './ui/hud';
import { nephewsView, postersView } from './ui/panels/corruptionSheets';
import { createPlotPanel } from './ui/panels/plotPanel';
import { createSheet } from './ui/panels/sheet';
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
addGrain(app, overlay);

initToasts(overlay);
const hud = createHud(overlay);
const panel = createPlotPanel(overlay, dispatch);
const cam = createCamera();
const city = new CityRenderer();

// --- State ---------------------------------------------------------------
let state: GameState;
const loaded = loadGame(localStorage);
if (loaded.kind === 'loaded') {
  // Closed-game offline earnings arrive in M5. Until then, resume from now.
  const now = Date.now();
  state = { ...loaded.state, lastSimTime: now };
  // an overdue briefcase would flash by behind the title card; give the player a minute first
  if (state.nextBriefcaseAt < now) state = { ...state, nextBriefcaseAt: now + 60_000 };
} else {
  state = createInitialState(randomSeed(), Date.now());
  if (loaded.kind === 'corrupt') showToast(STRINGS.toasts.loadFailed);
}

function save(): void {
  saveGame(localStorage, state);
}

/** Toasts for things that open up: categories, districts, the back row. */
function announce(before: GameState, after: GameState): void {
  for (const id of NEPHEW_IDS) {
    if (!knownNephews.has(id) && nephewUnlocked(after, id)) {
      knownNephews.add(id);
      showToast(fmt(STRINGS.toasts.nephewUnlocked, { name: STRINGS.nephews.names[id] }));
    }
  }
  for (const c of after.unlocked) {
    if (!before.unlocked.includes(c)) showToast(fmt(STRINGS.toasts.unlockedCategory, { name: STRINGS.categories[c] }));
  }
  for (let d = districtCount(before); d < districtCount(after); d++) showToast(fmt(STRINGS.toasts.district, { name: DISTRICTS[d]?.name ?? '' }));
  if (!hasBackRow(before) && hasBackRow(after)) showToast(STRINGS.toasts.backRow);
}

/** Play what the sim reported (permits clearing, inquiries, leaks) and empty the queue. */
function drainEvents(): void {
  if (!state.events.length) return;
  const now = Date.now();
  for (const e of state.events) {
    if (e.kind === 'built') {
      city.effects.build(e.plot, now);
      const b = plotById(state, e.plot)?.building;
      if (b) showToast(fmt(STRINGS.toasts.built, { name: tierDef(b.category, b.tier)?.name ?? '' }));
    } else if (e.kind === 'upgraded') city.effects.upgrade(e.plot, now);
    else if (e.kind === 'merged') {
      city.effects.merge(e.left, e.right, e.oldLeft, e.oldRight, now);
      const b = plotById(state, e.left)?.building;
      if (b) showToast(fmt(STRINGS.toasts.merged, { name: tierDef(b.category, b.tier)?.name ?? '' }));
    } else if (e.kind === 'inquiry') {
      const b = plotById(state, e.plot)?.building;
      showToast(fmt(STRINGS.toasts.inquiry, { name: b ? (tierDef(b.category, b.tier)?.name ?? '') : '' }));
    } else if (e.kind === 'inquiryOver') showToast(STRINGS.toasts.inquiryOver);
    else if (e.kind === 'leak') showToast(STRINGS.toasts.leaked);
  }
  state = { ...state, events: [] };
}

/** Nephews already asking for a job, so each one is announced once. */
const knownNephews = new Set(NEPHEW_IDS.filter((id) => nephewUnlocked(state, id)));

function dispatch(action: Action): void {
  // snapshot first: after a merge the right plot is empty, but the animation needs both buildings
  const before = state;
  const bag = before.bag ? { kind: before.bag.kind, value: bagValue(before) } : null;
  const result = applyAction(state, action);
  if (result.error) {
    showToast(errorText(result.error));
    return;
  }
  state = result.state;
  if (action.type === 'collectBag' && bag) showToast(fmt(STRINGS.bags.collected, { kind: STRINGS.bags[bag.kind], amount: formatTaka(bag.value) }));
  else if (action.type === 'collectBriefcase') showToast(STRINGS.toasts.briefcase);
  else if (action.type === 'speedMoney') showToast(STRINGS.toasts.speedPaid);
  else if (action.type === 'grab') {
    const pond = plotById(state, action.plot)?.job?.pond ?? 0;
    showToast(fmt(STRINGS.toasts.grabbed, { pond: STRINGS.grab.ponds[pond] ?? '' }));
  } else if (action.type === 'poster') showToast(STRINGS.toasts.poster);
  else if (action.type === 'payJournalists') showToast(STRINGS.toasts.journalists);
  else if (action.type === 'hire') showToast(fmt(STRINGS.toasts.hired, { name: STRINGS.nephews.names[action.id] }));
  else if (action.type === 'fire') showToast(STRINGS.toasts.fired);
  drainEvents();
  announce(before, state);
  panel.update(state);
  hud.update(state, city.districtInView(state, cam));
}

/** Build button: open the selected empty plot, or the first empty plot you own. */
function openBuild(): void {
  const sel = panel.selected !== null ? plotById(state, panel.selected) : undefined;
  const target = sel && sel.owned && !sel.building
    ? sel
    : [...state.plots]
        .filter((p) => p.owned && !p.building && !p.job)
        .sort((a, b) => a.district - b.district || (a.row === b.row ? 0 : a.row === 'front' ? -1 : 1) || a.slot - b.slot)[0];
  if (!target) {
    showToast(STRINGS.build.noEmptyPlot);
    return;
  }
  cam.x = plotCenter(target) - cam.viewW / cam.zoom / 2;
  clampCamera(cam, worldWidth(state));
  panel.open(target.index);
  panel.update(state);
}
const postersSheet = createSheet(overlay, postersView, dispatch, () => closeAll());
const nephewsSheet = createSheet(overlay, nephewsView, dispatch, () => closeAll());
function closeAll(): void {
  panel.close();
  postersSheet.close();
  nephewsSheet.close();
}
createButtonRow(overlay, {
  build: openBuild,
  posters: () => {
    postersSheet.open();
    postersSheet.update(state);
  },
  nephews: () => {
    nephewsSheet.open();
    nephewsSheet.update(state);
  },
}, showToast);

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
  clampCameraY(cam, maxPanY(state, cam, dpr));
}

// --- Input: drag to scroll, tap to select, wheel or pinch to zoom ----------
const pointers = new Map<number, number>();
let dragStartX = 0;
let dragStartY = 0;
let dragCamX = 0;
let dragCamY = 0;
let moved = 0;
let pinchDist = 0;
canvas.addEventListener('pointerdown', (e) => {
  pointers.set(e.pointerId, e.clientX);
  canvas.setPointerCapture(e.pointerId);
  if (pointers.size === 1) {
    moved = 0;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragCamX = cam.x;
    dragCamY = cam.y;
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
  const dy = e.clientY - dragStartY;
  moved = Math.max(moved, Math.abs(dx), Math.abs(dy));
  cam.x = dragCamX - dx / cam.zoom;
  clampCamera(cam, worldWidth(state));
  // dragging down looks up at taller buildings (only when there is something taller to see)
  cam.y = dragCamY + dy;
  clampCameraY(cam, maxPanY(state, cam, dpr));
});
function endPointer(e: PointerEvent, tap: boolean): void {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (pointers.size > 0) {
    // back to a one-finger drag from where the other finger is
    const [rest] = [...pointers.values()];
    dragStartX = rest!;
    dragCamX = cam.x;
    dragCamY = cam.y;
    return;
  }
  if (!tap || moved > 6) return;
  const rect = canvas.getBoundingClientRect();
  const hit = city.pick(state, cam, e.clientX - rect.left, e.clientY - rect.top, dpr);
  if (!hit) panel.close();
  else if (hit.kind === 'bag') dispatch({ type: 'collectBag' });
  else if (hit.kind === 'briefcase') dispatch({ type: 'collectBriefcase' });
  else {
    postersSheet.close();
    nephewsSheet.close();
    panel.open(hit.plot);
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
  if (e.key === 'Escape') closeAll();
});

// --- Loop ------------------------------------------------------------------
const bootTime = performance.now();
let lastUiUpdate = 0;
function frame(): void {
  const now = Date.now();
  const before = state;
  const r = advance(state, now);
  state = r.state;
  if (state !== before) {
    drainEvents();
    announce(before, state);
  }
  clampCamera(cam, worldWidth(state));
  if (r.caughtUpMs >= BALANCE.catchUpToastMinMs && r.caughtUp > 0) {
    showToast(fmt(STRINGS.toasts.welcomeBack, { amount: formatTaka(r.caughtUp) }));
  }
  if (now - lastUiUpdate >= BALANCE.tickMs) {
    lastUiUpdate = now;
    hud.update(state, city.districtInView(state, cam));
    panel.update(state);
    postersSheet.update(state);
    nephewsSheet.update(state);
  }
  city.frame(ctx, state, cam, panel.selected, dpr, now, (performance.now() - bootTime) / 1000);
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

hud.update(state, 0);
requestAnimationFrame(frame);
