import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classifyFields } from '@/lib/engine/classifier.js';
import { buildPlan } from '@/lib/engine/plan.js';
import { fillPlan } from '@/lib/filler/filler.js';
import { isSubmitLike, setNativeValue } from '@/lib/filler/nativeSetter.js';
import { clearMarks, showMarks } from '@/lib/filler/markers.js';
import { loadFixture, scannerFor } from '../fixtureHelpers.js';

const PROFILE = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'fixtures', 'sample-profile.json'), 'utf8'));

/** Scan → classify → tick ready + suggested profile rows → plan → fill, like the side panel does. */
async function fillFixture(name, { profile = PROFILE } = {}) {
  const dom = loadFixture(name);
  const doc = dom.window.document;
  const scanner = scannerFor(doc);
  const fields = scanner.scan(doc);
  const cls = classifyFields(fields, { profile });
  const rows = fields.map((field, i) => ({
    field,
    target: cls[i].target,
    ticked: (cls[i].status === 'ready' || cls[i].status === 'suggested') && cls[i].target?.kind === 'profile',
  }));
  const { plan, problems } = buildPlan(rows, profile);
  const results = await fillPlan(plan, scanner);
  return { dom, doc, results, problems, plan };
}

const byId = (doc, id) => doc.getElementById(id);

describe('filler', () => {
  it('fills text fields so React-like components keep the value after blur', async () => {
    const { doc, results } = await fillFixture('09-react-like');
    expect(results.filter((r) => r.status !== 'filled')).toEqual([]);
    const inputs = [...doc.querySelectorAll('input')];
    inputs.forEach((i) => {
      i.focus();
      i.blur();
    });
    expect(inputs.map((i) => i.value)).toEqual(['Asha Rao', 'asha.rao@example.in', '9876543210', 'Software Engineer']);
  });

  it('shows the revert problem when no input event is fired (control check)', () => {
    const dom = loadFixture('09-react-like');
    const input = dom.window.document.querySelector('input');
    input.value = 'typed without events';
    input.focus();
    input.blur();
    expect(input.value).toBe('');
    setNativeValue(input, 'Asha');
    expect(input.value).toBe('Asha');
  });

  it('fills selects, native radios and checkboxes, and never ticks terms', async () => {
    const { doc, results } = await fillFixture('11-radio-checkbox-groups');
    expect(results.every((r) => r.status === 'filled')).toBe(true);
    expect(doc.querySelector('input[name=gender]:checked').value).toBe('F');
    expect([...doc.querySelectorAll('input[name="interests[]"]:checked')].map((i) => i.value)).toEqual(['ai', 'web', 'cyber']);
    expect(doc.querySelector('input[name=type]:checked').value).toBe('pro');
    expect(doc.querySelector('input[name=food]:checked').value).toBe('veg');
    expect(doc.querySelector('input[name=size]:checked').value).toBe('M');
    expect(byId(doc, 'terms').checked).toBe(false);
  });

  it('fills Country → State → City in order, waiting for each list to load', async () => {
    const { doc, results } = await fillFixture('08-dependent-selects');
    expect(results.map((r) => r.status)).toEqual(['filled', 'filled', 'filled', 'filled']);
    expect([byId(doc, 'country').value, byId(doc, 'state').value, byId(doc, 'city').value]).toEqual(['India', 'Maharashtra', 'Pune']);
  });

  it('fills ARIA comboboxes: listbox, searchable input and popup button', async () => {
    const { doc, results } = await fillFixture('10-aria-combobox');
    expect(results.filter((r) => r.status !== 'filled')).toEqual([]);
    expect(doc.querySelector('div[role=combobox] span').textContent).toBe('Female');
    expect(byId(doc, 'st').value).toBe('Maharashtra');
    expect(doc.querySelector('button[aria-haspopup]').textContent).toBe('M');
  });

  it('fills Google Forms radios, checkboxes, dropdowns and text', async () => {
    const mc = await fillFixture('14-gform-multiple-choice');
    expect(mc.results.filter((r) => r.status !== 'filled')).toEqual([]);
    const checked = [...mc.doc.querySelectorAll('[role=radio][aria-checked=true]')].map((r) => r.getAttribute('data-value'));
    expect(checked).toEqual(['Female', '3rd Year', 'Working Professional', 'LinkedIn']);

    const cb = await fillFixture('15-gform-checkboxes');
    const ticked = [...cb.doc.querySelectorAll('[role=checkbox][aria-checked=true]')].map((r) => r.getAttribute('data-answer-value'));
    expect(ticked).toEqual(['Artificial Intelligence', 'Web', 'Information Security']); // never "Other", never the code of conduct

    const dd = await fillFixture('16-gform-dropdown-date');
    expect(dd.doc.querySelector('[role=option][aria-selected=true][data-value=Maharashtra]')).not.toBeNull();
    expect(dd.doc.querySelector('[role=option][aria-selected=true][data-value=M]')).not.toBeNull();
  });

  it('reports a failure instead of guessing, and skips protected fields', async () => {
    const dom = loadFixture('12-sensitive-excluded');
    const doc = dom.window.document;
    const scanner = scannerFor(doc);
    const fields = scanner.scan(doc);
    const pw = fields.find((f) => f.signals.id === 'p');
    const gone = fields.find((f) => f.signals.id === 'u');
    scanner.get(gone.fieldId).el.remove();
    const results = await fillPlan(
      [
        { fieldId: pw.fieldId, control: 'text', value: 'hunter2' }, // a plan should never contain this; the filler refuses anyway
        { fieldId: gone.fieldId, control: 'email', value: 'a@b.c' },
      ],
      scanner,
    );
    expect(results.map((r) => r.status)).toEqual(['skipped', 'failed']);
    expect(byId(doc, 'p').value).toBe('');
  });

  it('never clicks anything that would submit the form', async () => {
    const dom = loadFixture('10-aria-combobox');
    const doc = dom.window.document;
    let submitted = 0;
    doc.querySelector('form').addEventListener('submit', (e) => {
      submitted++;
      e.preventDefault();
    });
    const submit = doc.querySelector('button[type=submit]');
    expect(isSubmitLike(submit)).toBe(true);
    const untyped = doc.createElement('button');
    untyped.setAttribute('aria-haspopup', 'listbox');
    untyped.textContent = 'Choose';
    doc.querySelector('form').appendChild(untyped);
    expect(isSubmitLike(untyped)).toBe(true); // <button> without type inside a form submits
    await fillFixture('10-aria-combobox');
    expect(submitted).toBe(0);
  });

  it('draws markers in an overlay without touching page elements', () => {
    const dom = loadFixture('02-labels-no-ids');
    const doc = dom.window.document;
    dom.window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    globalThis.requestAnimationFrame ??= dom.window.requestAnimationFrame;
    const before = doc.body.innerHTML;
    showMarks([{ el: doc.querySelector('input'), kind: 'filled' }]);
    expect(doc.querySelector('expofill-marks')).not.toBeNull();
    expect(doc.body.innerHTML).toBe(before);
    clearMarks();
    expect(doc.querySelector('expofill-marks')).toBeNull();
  });
});
