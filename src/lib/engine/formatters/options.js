// Option matching for select / radio / checkbox / combobox fields.
import { FUZZY } from '../../constants.js';
import { jaccard } from '../fuzzy.js';
import { normalize, tokens } from '../normalize.js';

/** Options we never pick: placeholders, "Other", "None". */
const NEVER = /^\s*(-+.*|select\b.*|choose\b.*|pick\b.*|please select.*|others?\b.*|none|none of the above|n\/?a|not applicable)\s*$/i;
export const isPlaceholderOption = (text) => !String(text ?? '').trim() || NEVER.test(String(text));

/** Groups of interchangeable terms (normalised). */
export const SYNONYM_GROUPS = [
  ['ai ml', 'ai', 'ml', 'artificial intelligence', 'machine learning', 'ai and ml', 'artificial intelligence and machine learning'],
  ['web dev', 'web development', 'web developer', 'web technologies', 'web'],
  ['cyber security', 'cybersecurity', 'information security', 'infosec', 'security'],
  ['data science', 'data analytics', 'data analysis', 'analytics'],
  ['app dev', 'app development', 'mobile development', 'android development', 'mobile app'],
  ['blockchain', 'web3', 'crypto'],
  ['iot', 'internet of things'],
  ['cloud', 'cloud computing'],
].map((g) => g.map(normalize));

const synonymsOf = (norm) => SYNONYM_GROUPS.find((g) => g.includes(norm)) ?? [norm];

/**
 * Index of the option that best matches `value`, or -1.
 * Order: exact → case-insensitive → normalised → synonyms → fuzzy.
 * @param {{ text: string, value?: string }[]} options
 * @param {string} value
 * @param {{ fuzzy?: boolean }} [opts]
 */
export function matchOption(options, value, { fuzzy = true } = {}) {
  const v = String(value ?? '').trim();
  if (!v) return -1;
  const cands = options
    .map((o, i) => ({ i, texts: [o.text, o.value].filter((t) => t != null && String(t).trim()).map(String) }))
    .filter((c) => c.texts.length && !isPlaceholderOption(c.texts[0]));
  const find = (pred) => cands.find((c) => c.texts.some(pred))?.i ?? -1;

  let i = find((t) => t.trim() === v);
  if (i < 0) i = find((t) => t.trim().toLowerCase() === v.toLowerCase());
  const nv = normalize(v);
  if (i < 0 && nv) i = find((t) => normalize(t) === nv);
  if (i < 0 && nv) {
    const syn = synonymsOf(nv);
    if (syn.length > 1) i = find((t) => syn.includes(normalize(t)));
  }
  if (i < 0 && nv && fuzzy) {
    // Fuzzy: token Jaccard, or the value's words all inside a longer option ("Professional" → "Working Professional").
    const vt = tokens(v);
    let best = -1;
    let bestScore = 0;
    for (const c of cands) {
      const ot = tokens(c.texts[0]);
      const score = Math.max(jaccard(vt, ot), vt.every((t) => ot.includes(t)) ? FUZZY.minJaccard : 0);
      if (score >= FUZZY.minJaccard && score > bestScore) [best, bestScore] = [c.i, score];
    }
    i = best;
  }
  return i;
}

/** Indexes of every option matching any of `values` (e.g. interests on a checkbox group). */
export function matchOptions(options, values) {
  const out = new Set();
  for (const v of [].concat(values ?? [])) {
    const i = matchOption(options, v);
    if (i >= 0) out.add(i);
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * First option matching any candidate spelling: every candidate strictly first, then fuzzily,
 * so "Veg" (exact) wins over a fuzzy hit for "Vegetarian".
 */
export function matchAny(options, candidates) {
  for (const fuzzy of [false, true])
    for (const c of candidates) {
      const i = matchOption(options, c, { fuzzy });
      if (i >= 0) return i;
    }
  return -1;
}
