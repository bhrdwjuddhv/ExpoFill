import { describe, expect, it } from 'vitest';
import { findCountry, matchCountry, matchDialCode } from '@/lib/engine/formatters/country.js';
import { formatDate } from '@/lib/engine/formatters/date.js';
import { formatValue, profileValue } from '@/lib/engine/formatters/index.js';
import { matchState } from '@/lib/engine/formatters/indiaStates.js';
import { matchRange, yearCandidates } from '@/lib/engine/formatters/misc.js';
import { deriveNames, splitName } from '@/lib/engine/formatters/name.js';
import { formatCodeText, formatPhone } from '@/lib/engine/formatters/phone.js';
import { buildPlan } from '@/lib/engine/plan.js';
import { fillPlaceholders, joinList } from '@/lib/engine/templates.js';

const opts = (...texts) => texts.map((text) => ({ text, value: text }));
const P = {
  values: {
    fullName: 'Asha Kumari Rao', phone: '+91 98765 43210', phoneCountryCode: '+91', whatsappSameAsPhone: true,
    country: 'India', state: 'Delhi', gender: 'Female', tshirtSize: 'XXL', dietaryPreference: 'Vegetarian',
    attendeeType: 'Professional', yearOfStudy: '3rd Year', experienceYears: 4, interests: ['AI/ML', 'Web Development'],
    organization: 'Acme', city: 'Pune', email: 'a@x.in',
  },
};
const f = (control, extra = {}) => ({ fieldId: 'f', control, signals: {}, options: [], maxLength: null, ...extra });
const prof = (key) => ({ kind: 'profile', key });

describe('name', () => {
  it('splits and derives names', () => {
    expect(splitName('Dr. Asha Kumari Rao')).toEqual({ first: 'Asha', middle: 'Kumari', last: 'Rao' });
    expect(deriveNames('Asha Kumari Rao')).toEqual({ firstName: 'Asha Kumari', lastName: 'Rao' });
    expect(deriveNames('Asha')).toEqual({ firstName: 'Asha', lastName: '' });
    expect(profileValue('lastName', P)).toBe('Rao');
    expect(profileValue('whatsapp', P)).toBe('+91 98765 43210');
  });
});

describe('phone', () => {
  it('formats for the field', () => {
    expect(formatPhone('+91 98765 43210', { maxLength: 10 })).toBe('9876543210');
    expect(formatPhone('09876543210', {})).toBe('9876543210');
    expect(formatPhone('9876543210', { signals: { placeholder: '+91 98765 43210' } })).toBe('+91 9876543210');
    expect(formatPhone('9876543210', { signals: { placeholder: '09876543210' } })).toBe('09876543210');
    expect(formatPhone('9876543210', { signals: { placeholder: '98765 43210' } })).toBe('98765 43210');
    expect(formatPhone('+91 9876543210', {}, { hasCountryCodeField: true })).toBe('9876543210');
    expect(formatPhone('2025550123', {}, { countryCode: '+1' })).toBe('+1 2025550123');
    expect(formatCodeText('+91', { maxLength: 2 })).toBe('91');
    expect(formatCodeText('+91', {})).toBe('+91');
  });

  it('puts the number without code next to a country-code box', () => {
    const rows = [
      { field: f('select', { fieldId: 'cc', options: opts('+1', '+91') }), target: prof('phoneCountryCode'), ticked: true },
      { field: f('tel', { fieldId: 'ph' }), target: prof('phone'), ticked: true },
    ];
    const { plan } = buildPlan(rows, P);
    expect(plan.map((p) => p.optionIndexes ?? p.value)).toEqual([[1], '9876543210']);
  });
});

describe('country, state, dial code', () => {
  it('matches countries by name, alternate and code', () => {
    expect(findCountry('Bharat').alpha2).toBe('IN');
    expect(findCountry('usa').name).toBe('United States');
    expect(matchCountry([{ text: 'Select', value: '' }, { text: 'IN', value: 'IN' }], 'India')).toBe(1);
    expect(matchCountry([{ text: 'Republic of India', value: '356' }, { text: 'Indonesia', value: '360' }], 'India')).toBe(0);
    expect(matchCountry(opts('United Kingdom', 'United States of America'), 'USA')).toBe(1);
  });

  it('matches states by short form', () => {
    expect(matchState(opts('Select state', 'Maharashtra', 'NCT of Delhi'), 'Delhi')).toBe(2);
    expect(matchState(opts('UP', 'MP'), 'Uttar Pradesh')).toBe(0);
    expect(matchState(opts('Jammu & Kashmir'), 'J&K')).toBe(0);
  });

  it('matches dial codes, preferring the user’s country on shared codes', () => {
    expect(matchDialCode(opts('USA (+1)', 'India (+91)'), '+91')).toBe(1);
    expect(matchDialCode([{ text: 'IN', value: '91' }], '+91')).toBe(0);
    expect(matchDialCode(opts('+1 (Canada)', '+1 (United States)'), '+1', 'USA')).toBe(1);
    expect(matchDialCode(opts('+918', '+9'), '+91')).toBe(-1);
  });
});

describe('dates, ranges, years', () => {
  it('formats dates for native, text and split fields', () => {
    expect(formatDate('2026-01-05', f('date', { signals: { inputType: 'date' } }))).toEqual({ value: '2026-01-05' });
    expect(formatDate('2026-01-05', f('text', { signals: { placeholder: 'DD/MM/YYYY' } }))).toEqual({ value: '05/01/2026' });
    expect(formatDate('2026-01-05', f('text', { signals: { placeholder: 'mm-dd-yyyy' } }))).toEqual({ value: '01-05-2026' });
    expect(formatDate('05/01/2026', f('date', { dateParts: ['day', 'month', 'year'] }))).toEqual({ value: '2026-01-05', parts: { day: '05', month: '01', year: '2026' } });
    expect(formatDate('soon', f('text'))).toEqual({ error: 'not a date' });
  });
  it('matches experience ranges and study years', () => {
    expect(matchRange(opts('Fresher', '0-2 years', '3 to 5 years', '5+ years'), 4)).toBe(2);
    expect(matchRange(opts('Less than 1 year', 'More than 10'), 12)).toBe(1);
    expect(matchRange(opts('Fresher', '1-3'), 0)).toBe(0);
    expect(yearCandidates('3rd Year')).toEqual(expect.arrayContaining(['3', 'Third Year', 'III', 'Year 3']));
  });
});

describe('formatValue', () => {
  it('picks choices through synonyms', () => {
    expect(formatValue(f('radio-group', { options: opts('M', 'F') }), prof('gender'), P).optionIndexes).toEqual([1]);
    expect(formatValue(f('select', { options: opts('S', 'M', '2XL') }), prof('tshirtSize'), P).optionIndexes).toEqual([2]);
    expect(formatValue(f('radio-group', { options: opts('Non-Veg', 'Veg') }), prof('dietaryPreference'), P).optionIndexes).toEqual([1]);
    expect(formatValue(f('select', { options: opts('Student', 'Working Professional') }), prof('attendeeType'), P).optionIndexes).toEqual([1]);
    expect(formatValue(f('radio-group', { options: opts('I', 'II', 'III', 'IV') }), prof('yearOfStudy'), P).optionIndexes).toEqual([2]);
    expect(formatValue(f('select', { options: opts('0-2', '3-5', '5+') }), prof('experienceYears'), P).optionIndexes).toEqual([1]);
  });

  it('ticks every matching interest and never "Other"', () => {
    const r = formatValue(f('checkbox-group', { options: opts('Machine Learning', 'Web Dev', 'Other') }), prof('interests'), P);
    expect(r.optionIndexes).toEqual([0, 1]);
  });

  it('defers matching when options are not loaded yet', () => {
    const r = formatValue(f('select', { options: opts('Select State') }), prof('state'), P);
    expect(r.value).toBe('Delhi');
    expect(r.candidates).toContain('NCT of Delhi');
  });

  it('reports values that do not fit instead of cutting them', () => {
    expect(formatValue(f('text', { maxLength: 3 }), prof('organization'), { values: { organization: 'Acme Labs' } })).toEqual({ error: expect.stringMatching(/Too long/) });
    expect(formatValue(f('select', { options: opts('X', 'Y') }), prof('gender'), P)).toEqual({ error: expect.any(String) });
    expect(formatValue(f('text'), prof('designation'), P)).toEqual({ error: 'empty' });
    expect(formatValue(f('number'), { kind: 'fixed', value: 'many' }, P)).toEqual({ error: 'Not a number' });
  });

  it('fills templates and fixed values', () => {
    const templates = [{ id: 't', text: 'I hope {eventName} helps me grow at {organization} in {city}. {unknown}' }];
    expect(formatValue(f('textarea'), { kind: 'template', id: 't' }, P, { templates, eventName: 'DevFest' }).value).toBe('I hope DevFest helps me grow at Acme in Pune. {unknown}');
    expect(formatValue(f('checkbox-single'), prof('whatsappSameAsPhone'), P)).toEqual({ value: true });
  });

  it('joins interests for text answers', () => {
    expect(joinList(['A', 'B', 'C'])).toBe('A, B and C');
    expect(fillPlaceholders('{interests}', { profile: P })).toBe('AI/ML and Web Development');
    expect(fillPlaceholders('{college}', { profile: P })).toBe('{college}');
  });
});
