import { beforeEach, describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '@/lib/constants.js';

let store = {};
globalThis.chrome = {
  storage: {
    local: {
      get: async (keys) => {
        if (keys == null) return structuredClone(store);
        const list = Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(list.filter((k) => k in store).map((k) => [k, structuredClone(store[k])]));
      },
      set: async (obj) => void Object.assign(store, structuredClone(obj)),
      clear: async () => void (store = {}),
    },
  },
};

const s = await import('@/lib/storage.js');

beforeEach(() => s.deleteAll());

describe('storage', () => {
  it('returns an unsaved default profile with +91, and saves/reloads it', async () => {
    const p = await s.getProfile();
    expect(p.values.phoneCountryCode).toBe('+91');
    expect(store).toEqual({});
    await s.saveProfile({ ...p, values: { ...p.values, email: 'a@b.c' } });
    expect((await s.getProfile()).values.email).toBe('a@b.c');
    expect(store.activeProfileId).toBe(p.id);
    expect(store.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('saves, updates and deletes rules and templates', async () => {
    const r = await s.saveRule({ questionText: 'Mobile' });
    expect(r.id).toBeTruthy();
    await s.saveRule({ ...r, questionText: 'Mobile no' });
    expect(await s.getRules()).toEqual([{ id: r.id, questionText: 'Mobile no' }]);
    await s.deleteRule(r.id);
    expect(await s.getRules()).toEqual([]);
    const t = await s.saveTemplate({ title: 'Why' });
    await s.deleteTemplate(t.id);
    expect(await s.getTemplates()).toEqual([]);
  });

  it('merges settings over defaults', async () => {
    await s.saveSettings({ readyThreshold: 90 });
    expect(await s.getSettings()).toMatchObject({ readyThreshold: 90, suggestedThreshold: 60 });
  });

  it('exports and imports a round trip', async () => {
    await s.saveProfile({ ...(await s.getProfile()), name: 'X' });
    await s.saveRule({ questionText: 'q' });
    const json = await s.exportAll();
    await s.deleteAll();
    expect(await s.importAll(json)).toEqual({ ok: true, errors: [] });
    expect((await s.getProfile()).name).toBe('X');
    expect(await s.getRules()).toHaveLength(1);
  });

  it('rejects bad imports with readable errors', async () => {
    expect((await s.importAll('{nope')).errors).toEqual(['The file is not valid JSON.']);
    expect((await s.importAll('{"a":1}')).errors[0]).toMatch(/not an ExpoFill export/);
    const newer = { app: 'ExpoFill', schemaVersion: SCHEMA_VERSION + 1, profiles: [] };
    expect((await s.importAll(JSON.stringify(newer))).errors[0]).toMatch(/newer ExpoFill/);
    const bad = { app: 'ExpoFill', schemaVersion: 1, profiles: [{}], rules: 'x' };
    expect((await s.importAll(JSON.stringify(bad))).errors).toHaveLength(2);
    expect(store).toEqual({});
  });

  it('deleteAll leaves storage empty', async () => {
    await s.saveProfile(await s.getProfile());
    await s.deleteAll();
    await s.getProfile();
    expect(store).toEqual({});
  });

  it('runs migrations in order', () => {
    s.MIGRATIONS[0] = (d) => ({ ...d, upgraded: true });
    expect(s.runMigrations({ a: 1 }, 0)).toEqual({ a: 1, upgraded: true });
    delete s.MIGRATIONS[0];
    expect(() => s.runMigrations({}, 0)).toThrow(/No migration/);
  });
});
