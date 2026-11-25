// Shared by the fixture tests: load a saved form, scan it, classify it, compare with expected.json.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { classifyFields } from '@/lib/engine/classifier.js';
import { questionText } from '@/lib/engine/normalize.js';
import { findPreset } from '@/lib/scanner/presets/index.js';
import { createScanner } from '@/lib/scanner/scanner.js';
import { applyLayout } from './layout.js';

const DIR = join(import.meta.dirname, 'fixtures');
const PROFILE = JSON.parse(readFileSync(join(DIR, 'sample-profile.json'), 'utf8'));
export const FIXTURES = readdirSync(DIR).filter((d) => statSync(join(DIR, d)).isDirectory() && existsSync(join(DIR, d, 'expected.json'))).sort();

/** Loads a fixture page (at the URL in its optional page.json), runs its scripts and lays it out. */
export function loadFixture(name) {
  const html = readFileSync(join(DIR, name, 'form.html'), 'utf8');
  const pageFile = join(DIR, name, 'page.json');
  const url = existsSync(pageFile) ? JSON.parse(readFileSync(pageFile, 'utf8')).url : undefined;
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, ...(url && { url }) });
  applyLayout(dom.window);
  return dom;
}

/** A scanner set up the way the content script sets it up for this page. */
export const scannerFor = (doc) => createScanner({ preset: findPreset(doc.URL, doc) });

/** Scans and classifies one fixture; returns a per-expectation verdict. */
export function evaluateFixture(name) {
  const dom = loadFixture(name);
  const doc = dom.window.document;
  const expected = JSON.parse(readFileSync(join(DIR, name, 'expected.json'), 'utf8'));
  const scanner = scannerFor(doc);
  const fields = scanner.scan(doc);
  const results = classifyFields(fields, { profile: PROFILE, domain: `${name}.fixture` });
  const byField = new Map(fields.map((f, i) => [f, results[i]]));

  const findField = (selectorOrText) => {
    let el = null;
    try {
      el = doc.querySelector(selectorOrText);
    } catch {
      // not a selector: match by question text
    }
    if (el) return { found: true, field: fields.find((f) => [scanner.get(f.fieldId).el, ...(scanner.get(f.fieldId).optionEls ?? [])].includes(el)) };
    const field = fields.find((f) => questionText(f) === selectorOrText);
    return { found: !!field, field };
  };

  const rows = [];
  const covered = new Set();
  for (const [sel, want] of Object.entries(expected)) {
    const { found, field } = findField(sel);
    if (field) covered.add(field);
    const r = field && byField.get(field);
    const got = !field ? 'excluded' : r.status === 'excluded' ? 'excluded' : r.status === 'unknown' ? 'unknown' : r.target?.key ?? r.target?.kind;
    const ok = found && got === want;
    const wrongReady = !!r && r.status === 'ready' && got !== want;
    rows.push({ sel, want, got, status: r?.status ?? '(not reported)', score: r?.score ?? 0, ok, wrongReady, reason: r?.reason ?? '' });
  }
  // Every field ExpoFill reports must be listed, so a surprise 'ready' cannot slip through.
  for (const f of fields)
    if (!covered.has(f)) {
      const r = byField.get(f);
      rows.push({ sel: `(unlisted) ${questionText(f)}`, want: '?', got: r.target?.key ?? r.status, status: r.status, score: r.score, ok: false, wrongReady: r.status === 'ready', unlisted: true, reason: r.reason });
    }
  dom.window.close();
  return rows;
}
