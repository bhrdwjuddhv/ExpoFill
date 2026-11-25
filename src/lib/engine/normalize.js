import { GENERATED_NAME_PATTERNS } from '../constants.js';

const STOP_WORDS = new Set(
  'your the please enter kindly of a an what is are do you here below provide mention fill in'.split(' '),
);

/** Light stemmer: only strips when the remaining word keeps >= 3 letters. */
export function stem(w) {
  if (w.length < 5 || /\d/.test(w)) return w;
  const cut = (n, add = '') => (w.length - n >= 3 ? w.slice(0, -n) + add : w);
  if (w.endsWith('tion')) return cut(3); // organization → organizat
  if (w.endsWith('ing')) return cut(3);
  if (w.endsWith('ies')) return cut(3, 'y'); // cities → city
  if (w.endsWith('ed')) return cut(2);
  if (/(ss|x|ch|sh)es$/.test(w)) return cut(2); // addresses → address
  if (/(ss|us|is)$/.test(w)) return w; // address, status, analysis
  if (w.endsWith('s')) return cut(1);
  return w;
}

/** firstName → first Name, so identifiers tokenise like labels. */
export const splitIdentifier = (s) => String(s).replace(/([a-z])([A-Z])/g, '$1 $2');

/** @param {string} text @returns {string[]} cleaned, stop-word-free, stemmed tokens */
export function tokens(text) {
  if (!text) return [];
  const words = String(text)
    .toLowerCase()
    .replace(/\*/g, ' ')
    .replace(/\((required|optional)\)/g, ' ')
    .replace(/^\s*(?:q\s*\d+[.):-]?|\d{1,2}[.):-])\s*/, '') // "1." "Q1)" "Q2"
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const kept = words.filter((w) => !STOP_WORDS.has(w));
  // "You are" is all stop words: keep it rather than reduce it to nothing.
  return (kept.length ? kept : words).map(stem);
}

/** @param {string} text @returns {string} */
export const normalize = (text) => tokens(text).join(' ');

/** True for ids like input_8f3a2, q12, mat-input-3, uuids, or more digits than letters. */
export function isGeneratedName(name) {
  if (!name) return true;
  const digits = (name.match(/\d/g) ?? []).length;
  const letters = (name.match(/[a-z]/gi) ?? []).length;
  return digits > letters || GENERATED_NAME_PATTERNS.some((re) => re.test(name));
}

/** Best human-readable question text for a field descriptor. */
export function questionText(field) {
  const s = field.signals ?? {};
  const name = !isGeneratedName(s.name) ? s.name : !isGeneratedName(s.id) ? s.id : '';
  return s.questionHeading || s.labelFor || s.ariaLabelledby || s.ariaLabel || s.placeholder || s.nearbyText || name || '';
}
