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

  it('export/import base64 round-trips', () => {
    const s = withBuildings({ 0: tin(2), 1: tin(10) }, 99);
    const code = exportSave(s);
    expect(code).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(importSave(code)).toEqual(s);
    expect(importSave('!!!garbage')).toBeNull();
  });
});
