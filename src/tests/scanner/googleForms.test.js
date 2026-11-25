import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findBlockedFrames } from '@/lib/frames.js';
import googleForms from '@/lib/scanner/presets/googleForms.js';
import { findPreset } from '@/lib/scanner/presets/index.js';
import { loadFixture, scannerFor } from '../fixtureHelpers.js';

const questions = (fixture) => {
  const dom = loadFixture(fixture);
  return { dom, qs: googleForms.getQuestions(dom.window.document) };
};

describe('Google Forms preset', () => {
  it('matches Google Forms URLs only', () => {
    const dom = loadFixture('13-gform-short-paragraph');
    expect(findPreset(dom.window.document.URL, dom.window.document)?.name).toBe('googleForms');
    expect(findPreset('about:blank', document)).toBeNull();
  });

  it('reads short answer, paragraph, required marks and the form title', () => {
    const { dom, qs } = questions('13-gform-short-paragraph');
    expect(qs.map((q) => [q.questionText, q.control, q.required])).toEqual([
      ['Email', 'email', true],
      ['Full Name', 'text', true],
      ['Mobile Number (WhatsApp preferred)', 'text', true],
      ['College Name', 'text', true],
      ['Team Name', 'text', false],
      ['GitHub profile link', 'url', false],
      ['Why do you want to participate in HackIndia?', 'textarea', true],
    ]); // the section header has no control and is skipped
    expect(googleForms.title(dom.window.document)).toBe('HackIndia 2026 Registration');
  });

  it('reads multiple choice (mapping "Other" so it is never picked) and checkboxes', () => {
    const mc = questions('14-gform-multiple-choice').qs;
    expect(mc[1].options.map((o) => o.text)).toEqual(['Male', 'Female', 'Prefer not to say']);
    expect(mc[3].options.at(-1)).toEqual({ text: 'Other', value: '__other_option__' });
    const cb = questions('15-gform-checkboxes').qs[2];
    expect(cb.control).toBe('checkbox-group');
    expect(cb.options.map((o) => o.text)).toContain('Information Security');
  });

  it('reads dropdowns and dates (native and split)', () => {
    const qs = questions('16-gform-dropdown-date').qs;
    expect(qs[0]).toMatchObject({ control: 'aria-combobox', questionText: 'State' });
    expect(qs[0].options[0]).toEqual({ text: 'Choose', value: '' });
    expect(qs[2]).toMatchObject({ control: 'date', inputType: 'date' });
    expect(qs[3]).toMatchObject({ control: 'date', parts: ['day', 'month', 'year'] });
  });

  it('marks linear scales and grids as unsupported', () => {
    const qs = questions('17-gform-scale-grid').qs;
    expect(qs[2].unsupported).toMatch(/Linear scale/);
    expect(qs[3].unsupported).toMatch(/Grid/);
  });

  it('turns questions into descriptors through the scanner', () => {
    const dom = loadFixture('14-gform-multiple-choice');
    const scanner = scannerFor(dom.window.document);
    const fields = scanner.scan(dom.window.document);
    expect(fields[1]).toMatchObject({ presetName: 'googleForms', control: 'radio-group', signals: { questionHeading: 'Gender' } });
    expect(scanner.get(fields[1].fieldId).optionEls).toHaveLength(3);
    expect(scanner.scan(dom.window.document)).toEqual([]); // nothing reported twice
  });
});

describe('findBlockedFrames', () => {
  it('reports frames from origins ExpoFill could not reach, once per origin', () => {
    const data = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'fixtures', 'blocked-frames.json'), 'utf8'));
    expect(findBlockedFrames(data.results)).toEqual(data.blocked);
    expect(findBlockedFrames(data.noneBlocked)).toEqual([]);
  });
});
