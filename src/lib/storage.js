// All persistence goes through here, and only to chrome.storage.local.
import { SCHEMA_VERSION, EXPORT_APP_ID, STORAGE_KEYS as K, DEFAULT_SETTINGS } from './constants.js';
import { newProfile } from './profile/defaults.js';

const area = () => chrome.storage.local;

/** MIGRATIONS[n] turns data at schema n into schema n + 1. Pure: (data) => data. */
export const MIGRATIONS = {};

/** @param {object} data @param {number} from */
export function runMigrations(data, from) {
  let d = data;
  for (let v = from; v < SCHEMA_VERSION; v++) {
    if (!MIGRATIONS[v]) throw new Error(`No migration from schema ${v}`);
    d = MIGRATIONS[v](d);
  }
  return d;
}

let migrated;
async function migrateStored() {
  const all = await area().get(null);
  const v = all[K.schemaVersion];
  if (v == null || v >= SCHEMA_VERSION) return;
  await area().set({ ...runMigrations(all, v), [K.schemaVersion]: SCHEMA_VERSION });
}
const ready = () => (migrated ??= migrateStored());

// Reads never write, so storage stays empty after deleteAll() until the user saves something.
async function read(keys) {
  await ready();
  return area().get(keys);
}
async function write(obj) {
  await ready();
  return area().set({ ...obj, [K.schemaVersion]: SCHEMA_VERSION });
}

const upsert = (list, item) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

// ponytail: read-modify-write is not atomic across extension pages; fine for one user clicking.
const listStore = (key) => ({
  get: async () => (await read(key))[key] ?? [],
  save: async (item) => {
    const it = item.id ? item : { ...item, id: crypto.randomUUID() };
    await write({ [key]: upsert((await read(key))[key] ?? [], it) });
    return it;
  },
  remove: async (id) => write({ [key]: ((await read(key))[key] ?? []).filter((x) => x.id !== id) }),
});

// ---- Profile ----
/** Active profile, or a fresh unsaved one. */
export async function getProfile() {
  const s = await read([K.profiles, K.activeProfileId]);
  const list = s[K.profiles] ?? [];
  return list.find((p) => p.id === s[K.activeProfileId]) ?? list[0] ?? newProfile();
}

export async function saveProfile(profile) {
  const s = await read([K.profiles, K.activeProfileId]);
  const p = { ...profile, updatedAt: Date.now() };
  await write({
    [K.profiles]: upsert(s[K.profiles] ?? [], p),
    [K.activeProfileId]: s[K.activeProfileId] ?? p.id,
  });
  return p;
}

// ---- Rules / templates ----
const rules = listStore(K.rules);
export const getRules = rules.get;
export const saveRule = rules.save;
export const deleteRule = rules.remove;

const templates = listStore(K.templates);
export const getTemplates = templates.get;
export const saveTemplate = templates.save;
export const deleteTemplate = templates.remove;

// ---- Settings ----
export async function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(await read(K.settings))[K.settings] };
}
export const saveSettings = (s) => write({ [K.settings]: s });

// ---- Export / import / delete ----
export async function exportAll() {
  const s = await read(null);
  return JSON.stringify(
    {
      app: EXPORT_APP_ID,
      exportedAt: new Date().toISOString(),
      schemaVersion: s[K.schemaVersion] ?? SCHEMA_VERSION,
      profiles: s[K.profiles] ?? [],
      activeProfileId: s[K.activeProfileId] ?? null,
      rules: s[K.rules] ?? [],
      templates: s[K.templates] ?? [],
      settings: s[K.settings] ?? {},
    },
    null,
    2,
  );
}

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const isIdList = (x) => Array.isArray(x) && x.every((i) => isObj(i) && typeof i.id === 'string');

/** @returns {string[]} human-readable problems; empty when the export is usable */
export function validateExport(d) {
  if (!isObj(d) || d.app !== EXPORT_APP_ID) return ['This file is not an ExpoFill export.'];
  const errors = [];
  if (!Number.isInteger(d.schemaVersion) || d.schemaVersion < 1) errors.push('Missing or invalid schema version.');
  else if (d.schemaVersion > SCHEMA_VERSION)
    errors.push(`This file was made by a newer ExpoFill (schema ${d.schemaVersion}). Update the extension first.`);
  if (!isIdList(d.profiles)) errors.push('"profiles" must be a list of profiles, each with an id.');
  else if (d.activeProfileId != null && !d.profiles.some((p) => p.id === d.activeProfileId))
    errors.push('"activeProfileId" does not match any profile.');
  for (const key of ['rules', 'templates'])
    if (d[key] != null && !isIdList(d[key])) errors.push(`"${key}" must be a list of items, each with an id.`);
  if (d.settings != null && !isObj(d.settings)) errors.push('"settings" must be an object.');
  return errors;
}

/** Replaces all stored data with the export. @returns {Promise<{ ok: boolean, errors: string[] }>} */
export async function importAll(json) {
  let d;
  try {
    d = JSON.parse(json);
  } catch {
    return { ok: false, errors: ['The file is not valid JSON.'] };
  }
  const errors = validateExport(d);
  if (errors.length) return { ok: false, errors };
  d = runMigrations(d, d.schemaVersion);
  await write({
    [K.profiles]: d.profiles,
    [K.activeProfileId]: d.activeProfileId ?? d.profiles[0]?.id ?? null,
    [K.rules]: d.rules ?? [],
    [K.templates]: d.templates ?? [],
    [K.settings]: d.settings ?? {},
  });
  return { ok: true, errors: [] };
}

export async function deleteAll() {
  await area().clear();
  migrated = undefined;
}
