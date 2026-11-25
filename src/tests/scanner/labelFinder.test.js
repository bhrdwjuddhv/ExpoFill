import { beforeAll, describe, expect, it } from 'vitest';
import { findLabels, groupText, geometricText, previousText, sectionText, textOf } from '@/lib/scanner/labelFinder.js';
import { applyLayout } from '../layout.js';

beforeAll(() => applyLayout(window));
const html = (s) => {
  document.body.innerHTML = s;
  return document.body;
};
const $ = (s) => document.querySelector(s);

describe('labelFinder', () => {
  it('1. label[for]', () => {
    html('<label for="a">Email *</label><input id="a">');
    expect(findLabels($('#a'))).toMatchObject({ labelFor: 'Email *', nearbyText: '' });
  });

  it('1. label[for] with an id that needs escaping', () => {
    html('<label for="a.b:c">City</label><input id="a.b:c">');
    expect(findLabels(document.getElementById('a.b:c')).labelFor).toBe('City');
  });

  it('2. wrapping label, ignoring option text', () => {
    html('<label>Country <select><option>India</option></select></label>');
    expect(findLabels($('select')).labelFor).toBe('Country');
  });

  it('3–4. aria-labelledby (joined) and aria-label', () => {
    html('<span id="x">Work</span><span id="y">email</span><input id="a" aria-labelledby="x y"><input id="b" aria-label="Phone">');
    expect(findLabels($('#a')).ariaLabelledby).toBe('Work email');
    expect(findLabels($('#b')).ariaLabel).toBe('Phone');
  });

  it('5. previous sibling text, climbing out of wrappers, skipping empty ones', () => {
    html('<div><span>Mobile No.</span><span></span><div><div><input id="a"></div></div></div>');
    expect(findLabels($('#a')).nearbyText).toBe('Mobile No.');
    html('<table><tr><td>Institute</td><td><input id="a"></td></tr></table>');
    expect(previousText($('#a')).text).toBe('Institute');
  });

  it('5. an unlinked <label> before the control counts as its label', () => {
    html('<div><label>Full Name</label><input id="a"></div>');
    expect(findLabels($('#a'))).toMatchObject({ labelFor: 'Full Name', nearbyText: '' });
  });

  it("5. stops at another field's text", () => {
    html('<div><label>Name</label><input></div><div><input id="b"></div>');
    expect(previousText($('#b')).text).toBe('');
    html('<label for="x">Email</label><input id="x"><input id="y">');
    expect(previousText($('#y')).text).toBe('');
  });

  it('6. group ancestor text, excluding other inputs’ labels', () => {
    html('<div class="form-group"><input id="a"><small>Your PIN code</small><label for="o">Other</label><input id="o"></div>');
    expect(groupText($('#a'))).toBe('Your PIN code');
  });

  it('7. nearest text above within 80px', () => {
    html('<div><div><p>Graduation year</p></div><div><div><div><input id="a"></div></div></div></div>');
    expect(geometricText($('#a'))).toBe('Graduation year');
  });

  it('cleans and caps text', () => {
    html(`<p id="p">  a\n\n  b  ${'x'.repeat(300)}</p>`);
    expect(textOf($('#p'))).toMatch(/^a b x+$/);
    expect(textOf($('#p'))).toHaveLength(200);
  });

  it('finds the section heading, and a legend only inside its own fieldset', () => {
    html('<h3>Contact details</h3><div><input id="a"></div><fieldset><legend>Gender</legend><input id="b"></fieldset><div><input id="c"></div>');
    expect(sectionText($('#a'))).toBe('Contact details');
    expect(sectionText($('#b'))).toBe('Gender');
    expect(sectionText($('#c'))).toBe('Contact details');
  });
});
