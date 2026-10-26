import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from '../src/state/initialState';
import { migrate } from '../src/state/migrate';
import { BACKUP_KEY, SAVE_KEY, exportSave, importSave, loadGame, saveGame, type KeyValueStore } from '../src/state/save';
import { fresh, tin, withBuildings } from './helpers';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('save/load', () => {
  it('round-trips state with a version field', () => {
    const store = memoryStore();
    const s = withBuildings({ 0: tin(3) }, 1234.5);
    saveGame(store, s);
    expect(JSON.parse(store.data.get(SAVE_KEY)!).version).toBe(SAVE_VERSION);
    const r = loadGame(store);
    expect(r.kind).toBe('loaded');
    if (r.kind === 'loaded') expect(r.state).toEqual(s);
  });

  it('no save -> none', () => {
    expect(loadGame(memoryStore()).kind).toBe('none');
  });

  it('corrupt save is backed up, not destroyed', () => {
    const store = memoryStore();
    store.setItem(SAVE_KEY, '{not json');
    expect(loadGame(store).kind).toBe('corrupt');
    expect(store.data.get(BACKUP_KEY)).toBe('{not json');
  });

  it('a save from a newer version is rejected', () => {
    expect(migrate({ ...fresh(), version: SAVE_VERSION + 1 })).toBeNull();
  });

  it('a save missing fields is rejected', () => {
    expect(migrate({ version: SAVE_VERSION, taka: 5 })).toBeNull();
  });

  it('a save with an unknown building or bad tier/level is rejected', () => {
    const s = withBuildings({ 0: tin(1) });
    const bad = (patch: object) => ({ ...s, plots: s.plots.map((p) => (p.index === 0 ? { ...p, building: { ...tin(1), ...patch } } : p)) });
    expect(migrate(bad({ category: 'casino' }))).toBeNull();
    expect(migrate(bad({ tier: 99 }))).toBeNull();
    expect(migrate(bad({ level: 0 }))).toBeNull();
    expect(migrate(s)).toEqual(s);
  });

  it('export/import base64 round-trips', () => {
    const s = withBuildings({ 0: tin(2), 1: tin(10) }, 99);
    const code = exportSave(s);
    expect(code).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(importSave(code)).toEqual(s);
    expect(importSave('!!!garbage')).toBeNull();
  });
});

describe('save validation of jobs (M6)', () => {
  it('rejects unknown job kinds and merge/move jobs without a partner', async () => {
    const { migrate } = await import('../src/state/migrate');
    const { createInitialState, SAVE_VERSION } = await import('../src/state/initialState');
    const base = createInitialState(5, 1_750_000_000_000);
    const withJob = (job: unknown) => ({ ...base, version: SAVE_VERSION, plots: base.plots.map((p, i) => (i === 0 ? { ...p, owned: true, job } : p)) });
    expect(migrate(withJob({ kind: 'build', start: 0, until: 1, result: { category: 'housing', tier: 1, level: 1 } }))).not.toBeNull();
    expect(migrate(withJob({ kind: 'teleport', start: 0, until: 1 }))).toBeNull();
    expect(migrate(withJob({ kind: 'move', start: 0, until: 1, result: { category: 'housing', tier: 1, level: 1 } }))).toBeNull();
    expect(migrate(withJob({ kind: 'build', start: 0, until: 1, result: { category: 'housing', tier: 99, level: 1 } }))).toBeNull();
  });
});
