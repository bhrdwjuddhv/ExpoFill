// Turns a target (profile key, fixed value, template) into exactly what one field accepts.
import { fillPlaceholders, joinList } from '../templates.js';
import { countryCandidates, matchCountry, matchDialCode } from './country.js';
import { formatDate } from './date.js';
import { stateNames, matchState } from './indiaStates.js';
import { matchRange, valueCandidates } from './misc.js';
import { deriveNames, salutationCandidates } from './name.js';
import { isPlaceholderOption, matchAny, matchOptions } from './options.js';
import { formatCodeText, formatPhone } from './phone.js';

/**
 * @typedef {{ value: any, parts?: object, candidates?: string[] }
 *   | { optionIndexes: number[], optionTexts: string[], candidates?: string[] }
 *   | { error: string }} Formatted
 * @typedef {{ eventName?: string, templates?: object[], hasCountryCodeField?: boolean }} FormatContext
 */

const CHOICE = new Set(['select', 'radio-group', 'aria-combobox']);

export const isEmptyValue = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);

/** A profile value, with derived fallbacks (first/last from full name, WhatsApp from phone). */
export function profileValue(key, profile) {
  const v = profile?.values ?? {};
  if (key === 'firstName' || key === 'lastName') return v[key] || deriveNames(v.fullName)[key];
  if (key === 'fullName') return v.fullName || [v.firstName, v.lastName].filter(Boolean).join(' ');
  if (key === 'whatsapp') return v.whatsapp || (v.whatsappSameAsPhone ? v.phone : '');
  return v[key];
}

/** The raw value a target stands for. */
export function resolveValue(target, profile, ctx = {}) {
  if (!target) return null;
  if (target.kind === 'profile') return profileValue(target.key, profile);
  if (target.kind === 'fixed') return target.value;
  if (target.kind === 'template') {
    const t = (ctx.templates ?? []).find((x) => x.id === target.id);
    return t ? fillPlaceholders(t.text, { profile, eventName: ctx.eventName }) : null;
  }
  return null;
}

/** Every spelling worth trying in a choice field, for this key. */
export function candidatesFor(key, raw) {
  if (key === 'country') return countryCandidates(raw);
  if (key === 'state') return stateNames(raw) ?? [String(raw)];
  if (key === 'salutation') return salutationCandidates(raw);
  return valueCandidates(key, raw);
}

const realOptions = (field) => (field.options ?? []).filter((o) => !isPlaceholderOption(o.text));

function chooseOne(field, key, raw, profile) {
  const values = Array.isArray(raw) ? raw : [raw];
  const candidates = values.flatMap((v) => candidatesFor(key, v));
  // Options not loaded yet (dependent select, closed combobox): let the filler match at fill time.
  if (realOptions(field).length < 2) return { value: String(values[0]), candidates };
  const opts = field.options;
  let i = -1;
  if (key === 'country') i = matchCountry(opts, raw);
  else if (key === 'state') i = matchState(opts, raw);
  else if (key === 'phoneCountryCode') i = matchDialCode(opts, raw, profile?.values?.country);
  else if (key === 'experienceYears') i = matchRange(opts, raw);
  if (i < 0) i = matchAny(opts, candidates);
  if (i < 0) return { error: 'Your value is not one of the options' };
  return { optionIndexes: [i], optionTexts: [opts[i].text], candidates };
}

function chooseMany(field, key, raw) {
  const values = Array.isArray(raw) ? raw : String(raw).split(/\s*,\s*/);
  const idx = new Set(matchOptions(field.options, values));
  // Each value may also match through its key-specific spellings.
  for (const v of values) {
    const i = matchAny(field.options, candidatesFor(key, v));
    if (i >= 0) idx.add(i);
  }
  const optionIndexes = [...idx].sort((a, b) => a - b);
  if (!optionIndexes.length) return { error: 'None of your values are options here' };
  return { optionIndexes, optionTexts: optionIndexes.map((i) => field.options[i].text) };
}

function asText(field, key, raw, profile, ctx) {
  let value;
  if (Array.isArray(raw)) value = joinList(raw);
  else if (typeof raw === 'boolean') value = raw ? 'Yes' : 'No';
  else if (key === 'phone' || key === 'whatsapp')
    value = formatPhone(raw, field, { countryCode: profile?.values?.phoneCountryCode, hasCountryCodeField: ctx.hasCountryCodeField });
  else if (key === 'phoneCountryCode') value = formatCodeText(raw, field);
  else value = String(raw).trim();

  if (!value) return { error: 'empty' };
  if (field.control === 'number' && !Number.isFinite(Number(value))) return { error: 'Not a number' };
  if (field.control === 'email' && !value.includes('@')) return { error: 'Not an email address' };
  if (field.maxLength && value.length > field.maxLength) return { error: `Too long for this field (max ${field.maxLength} characters)` };
  return { value };
}

/**
 * @param {object} field descriptor
 * @param {object|null} target classification target
 * @param {object} profile
 * @param {FormatContext} [ctx]
 * @returns {Formatted}
 */
export function formatValue(field, target, profile, ctx = {}) {
  if (!target || target.kind === 'skip') return { error: 'Nothing to fill' };
  const raw = resolveValue(target, profile, ctx);
  if (isEmptyValue(raw)) return { error: 'empty' };
  const key = target.kind === 'profile' ? target.key : null;

  if (CHOICE.has(field.control)) return chooseOne(field, key, raw, profile);
  if (field.control === 'checkbox-group') return chooseMany(field, key, raw);
  if (field.control === 'checkbox-single')
    return { value: typeof raw === 'boolean' ? raw : /^(yes|y|true|1|on)$/i.test(String(raw)) };
  if (field.control === 'date') return formatDate(raw, field);
  return asText(field, key, raw, profile, ctx);
}
