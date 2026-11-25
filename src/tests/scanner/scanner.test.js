import { beforeAll, describe, expect, it } from 'vitest';
import { eventName, trimSiteName } from '@/lib/engine/eventName.js';
import { observeForms } from '@/lib/scanner/observer.js';
import { createScanner } from '@/lib/scanner/scanner.js';
import { applyLayout } from '../layout.js';

beforeAll(() => applyLayout(window));
const scan = (markup) => {
  document.body.innerHTML = markup;
  const scanner = createScanner();
  return { scanner, fields: scanner.scan(document) };
};

describe('scanner', () => {
  it('describes a field without touching the page', () => {
    document.body.innerHTML = '<label for="e">Email *</label><input id="e" type="email" name="email" maxlength="80" required pattern=".+@.+">';
    const before = document.body.innerHTML;
    const scanner = createScanner();
    const fields = scanner.scan(document);
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      control: 'email',
      required: true,
      maxLength: 80,
      pattern: '.+@.+',
      excluded: false,
      frameId: null,
      presetName: null,
      signals: { labelFor: 'Email *', name: 'email', id: 'e', inputType: 'email' },
    });
    expect(fields[0].fieldId).toMatch(/^f\w+_1$/);
    expect(scanner.get(fields[0].fieldId).el).toBe(document.getElementById('e'));
    expect(document.body.innerHTML).toBe(before); // no attributes or classes added
    expect(() => structuredClone(fields)).not.toThrow(); // safe to send by message
  });

  it('groups radios by name and checkboxes by name or container', () => {
    const { fields } = scan(`
      <fieldset><legend>Gender</legend>
        <label><input type="radio" name="g" value="m">Male</label><label><input type="radio" name="g" value="f">Female</label>
      </fieldset>
      <div class="question"><p>Interests</p>
        <label><input type="checkbox" value="ai">AI</label><label><input type="checkbox" value="web">Web</label>
      </div>
      <label><input type="checkbox" name="terms">I agree to the terms</label>`);
    expect(fields.map((f) => f.control)).toEqual(['radio-group', 'checkbox-group', 'checkbox-single']);
    expect(fields[0]).toMatchObject({ signals: { labelFor: 'Gender' }, options: [{ text: 'Male', value: 'm' }, { text: 'Female', value: 'f' }] });
    expect(fields[1].signals.labelFor).toBe('Interests');
    expect(fields[2]).toMatchObject({ excluded: true, excludeReason: 'Consent: tick it yourself' });
  });

  it('reads select and combobox options, and a select placeholder option', () => {
    const { fields } = scan(`
      <label for="s">State</label><select id="s"><option value="">Select state</option><option value="MH">Maharashtra</option></select>
      <div role="combobox" aria-label="Size" aria-controls="l"></div><ul id="l" role="listbox" hidden><li role="option" data-value="m">Medium</li></ul>`);
    expect(fields[0].options).toEqual([{ text: 'Select state', value: '' }, { text: 'Maharashtra', value: 'MH' }]);
    expect(fields[0].signals.placeholder).toBe('Select state');
    expect(fields[1]).toMatchObject({ control: 'aria-combobox', options: [{ text: 'Medium', value: 'm' }] });
  });

  it('walks open shadow roots', () => {
    document.body.innerHTML = '<div id="host"></div>';
    document.getElementById('host').attachShadow({ mode: 'open' }).innerHTML = '<label for="i">City</label><input id="i">';
    const fields = createScanner().scan(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].signals.labelFor).toBe('City');
  });

  it('skips buttons, hidden inputs, site search and invisible fields; excludes disabled ones', () => {
    const { fields } = scan(`
      <form role="search"><input type="text" placeholder="Search"></form>
      <input type="hidden" name="t"><input type="submit"><button>Go</button>
      <div style="display:none"><input name="hidden_field"></div>
      <input name="honeypot" style="width:0;height:0">
      <label for="d">Code</label><input id="d" disabled>`);
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({ excluded: true, excludeReason: 'Disabled' });
  });

  it('does not report the same element twice', () => {
    const { scanner } = scan('<input name="email">');
    expect(scanner.scan(document)).toEqual([]);
  });
});

describe('observer', () => {
  it('reports fields that appear later (conditional questions, next step)', async () => {
    document.body.innerHTML = '<label for="t">I am a</label><select id="t"><option>Student</option></select><div id="slot"></div><div id="later" style="display:none"><label for="c">College</label><input id="c"></div>';
    const scanner = createScanner();
    scanner.scan(document);
    const batches = [];
    const stop = observeForms(document, scanner, (f) => batches.push(f));
    document.getElementById('slot').innerHTML = '<label for="y">Year of study</label><input id="y">';
    document.getElementById('later').style.display = 'block';
    await new Promise((r) => setTimeout(r, 600));
    stop();
    expect(batches).toHaveLength(1); // debounced into one message
    expect(batches[0].map((f) => f.signals.labelFor)).toEqual(['Year of study', 'College']);
  });
});

describe('eventName', () => {
  it('prefers og:title, then h1, then the title, trimming the site name', () => {
    expect(trimSiteName('TechExpo 2026 | Eventbrite')).toBe('TechExpo 2026');
    expect(trimSiteName('DevFest Pune - GDG')).toBe('DevFest Pune');
    expect(trimSiteName('Hack-a-thon 2026')).toBe('Hack-a-thon 2026');
    document.head.innerHTML = '<title>Site | Home</title>';
    document.body.innerHTML = '<h1>Women in Tech Summit</h1>';
    expect(eventName(document)).toBe('Women in Tech Summit');
    document.head.innerHTML += '<meta property="og:title" content="Cloud Expo 2026 — Register">';
    expect(eventName(document)).toBe('Cloud Expo 2026');
    expect(eventName(document, 'GF Title')).toBe('GF Title');
  });
});
