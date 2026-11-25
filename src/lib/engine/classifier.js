// Field descriptor → { status, target, score, ... }. Pure; runs in the side panel.
import { FUZZY, LEARNING, MATCH_QUALITY, SCORING, SIGNAL_WEIGHTS, THRESHOLDS } from '../constants.js';
import { keyLabel } from '../profile/schema.js';
import { DICTIONARY, customEntries } from './dictionary.js';
import { formatValue } from './formatters/index.js';
import { isPlaceholderOption } from './formatters/options.js';
import { jaccard, levenshtein } from './fuzzy.js';
import { findRule } from './learning.js';
import { isGeneratedName, questionText, splitIdentifier, tokens } from './normalize.js';
import { isLongTextQuestion, suggestTemplates } from './templates.js';

/**
 * @typedef {{ fieldId: string, status: 'ready'|'suggested'|'unknown'|'excluded',
 *   target: null | { kind: 'profile', key: string } | { kind: 'template', id: string } | { kind: 'fixed', value: any },
 *   score: number, matchedBy: string, runnerUp: null | { key: string, score: number }, reason: string,
 *   templateIds?: string[] }} Classification
 * @typedef {{ profile?: { values: object, customFields?: object[] }, domain?: string, rules?: object[],
 *   templates?: object[], settings?: { readyThreshold?: number, suggestedThreshold?: number } }} ClassifyContext
 */

const CHOICE_CONTROLS = new Set(['select', 'radio-group', 'checkbox-group', 'aria-combobox']);
const TEXT_SIGNALS = ['labelFor', 'ariaLabelledby', 'ariaLabel', 'questionHeading', 'name', 'id', 'placeholder', 'nearbyText', 'sectionText'];
const IDENT_SIGNALS = new Set(['name', 'id']);
// Signals whose words can rule a key out. Section headings are too broad.
const NEGATIVE_SIGNALS = new Set(TEXT_SIGNALS.filter((s) => s !== 'sectionText'));
// Tokens too common to count as a one-token match on their own.
const GENERIC_TOKENS = new Set(['name', 'number', 'no', 'id', 'detail']);

const SIGNAL_INFO = {
  autocomplete: ['autocomplete', 'Autocomplete'],
  labelFor: ['label-alias', 'Label'],
  ariaLabelledby: ['aria-alias', 'Label'],
  ariaLabel: ['aria-alias', 'Label'],
  questionHeading: ['heading-alias', 'Question'],
  name: ['name-alias', 'Field name'],
  id: ['name-alias', 'Field id'],
  placeholder: ['placeholder-alias', 'Placeholder'],
  nearbyText: ['nearby-alias', 'Nearby text'],
  sectionText: ['section-alias', 'Section'],
  inputType: ['input-type', 'Input type'],
};

const prep = (raw, ident) => {
  const toks = tokens(ident ? splitIdentifier(raw) : raw);
  return { raw, norm: toks.join(' '), toks, set: new Set(toks) };
};

/** How well one prepared text matches one prepared alias (0, or a MATCH_QUALITY value). */
export function matchQuality(text, alias) {
  if (!text.norm || !alias.norm) return 0;
  if (text.norm === alias.norm) return MATCH_QUALITY.exact;
  if (alias.toks.every((t) => text.set.has(t))) return MATCH_QUALITY.allTokens;
  const lev =
    Math.min(text.norm.length, alias.norm.length) >= FUZZY.minLevenshteinLength &&
    levenshtein(text.norm, alias.norm, FUZZY.maxLevenshtein) <= FUZZY.maxLevenshtein;
  if (lev || jaccard(text.set, alias.set) >= FUZZY.minJaccard) return MATCH_QUALITY.fuzzy;
  if (alias.toks.some((t) => t.length >= 3 && !GENERIC_TOKENS.has(t) && text.set.has(t))) return MATCH_QUALITY.oneToken;
  return 0;
}

/** Can the profile value for `key` be put into this choice field? */
function canFill(field, key, profile) {
  if (!CHOICE_CONTROLS.has(field.control)) return true;
  const real = (field.options ?? []).filter((o) => !isPlaceholderOption(o.text));
  if (real.length < 2) return true; // options not loaded yet (dependent select, closed combobox)
  return !formatValue(field, { kind: 'profile', key }, profile).error;
}

/** Scores every dictionary key for a field. @returns {{ key, score, hit, penalty }[]} sorted best first */
export function scoreDictionary(field, profile) {
  const s = field.signals ?? {};
  const texts = TEXT_SIGNALS.filter((k) => s[k] && !(IDENT_SIGNALS.has(k) && isGeneratedName(s[k]))).map((k) => [
    k,
    prep(s[k], IDENT_SIGNALS.has(k)),
  ]);
  const acTokens = (s.autocomplete ?? '').toLowerCase().split(/\s+/).filter((t) => t && t !== 'on' && t !== 'off');
  const inputType = (s.inputType ?? '').toLowerCase();

  // hits[key] = [{ signal, score, raw, alias }]
  const perKey = [];
  for (const entry of [...DICTIONARY, ...customEntries(profile)]) {
    if (!entry.types.includes(field.control)) continue;
    const hits = [];
    for (const [signal, text] of texts) {
      let best = 0;
      let alias = null;
      for (const a of entry.preparedAliases) {
        const q = matchQuality(text, a);
        if (q > best) [best, alias] = [q, a];
      }
      if (best) hits.push({ signal, score: SIGNAL_WEIGHTS[signal] * best * 100, raw: text.raw, alias });
    }
    if (acTokens.some((t) => entry.autocomplete.includes(t)))
      hits.push({ signal: 'autocomplete', score: SIGNAL_WEIGHTS.autocomplete * 100, raw: s.autocomplete });
    if (inputType && entry.inputTypes.includes(inputType))
      hits.push({ signal: 'inputType', score: SIGNAL_WEIGHTS.inputType * 100, raw: inputType });
    if (hits.length) perKey.push({ entry, hits });
  }

  // A signal "points to" a key when that key is its best match.
  const signalBest = {};
  for (const { hits } of perKey)
    for (const h of hits) signalBest[h.signal] = Math.max(signalBest[h.signal] ?? 0, h.score);

  const negTexts = texts.filter(([k]) => NEGATIVE_SIGNALS.has(k)).map(([, t]) => t);
  const results = perKey.map(({ entry, hits }) => {
    hits.sort((a, b) => b.score - a.score);
    const [top, ...rest] = hits;
    let score = top.score + SCORING.otherSignalBonus * rest.filter((h) => h.score >= signalBest[h.signal]).length;
    score = Math.min(score, SCORING.max);
    // A negative word counts unless it is part of the alias that matched ("first and last name").
    const ownTokens = new Set(hits.flatMap((h) => h.alias?.toks ?? []));
    const penalty = entry.preparedNegative.find(
      (n) => !n.toks.every((t) => ownTokens.has(t)) && negTexts.some((t) => n.toks.every((x) => t.set.has(x))),
    );
    if (penalty) score -= SCORING.negativePenalty;
    const capped = !canFill(field, entry.key, profile);
    if (capped) score = Math.min(score, SCORING.unmatchedOptionCap);
    return { key: entry.key, score: Math.max(0, Math.round(score)), hit: top, penalty: penalty?.text, capped };
  });
  return results.sort((a, b) => b.score - a.score);
}

function thresholdsFrom(settings) {
  return {
    ...THRESHOLDS,
    ...(settings?.readyThreshold != null && { ready: settings.readyThreshold }),
    ...(settings?.suggestedThreshold != null && { suggested: settings.suggestedThreshold }),
  };
}

const statusFor = (score, runnerUpScore, th) => {
  if (score < th.suggested) return 'unknown';
  if (score >= th.ready && score - (runnerUpScore ?? 0) >= th.tieMargin) return 'ready';
  return 'suggested';
};

function explain(best, runnerUp, profile) {
  const { hit } = best;
  const label = keyLabel(best.key, profile);
  const [, what] = SIGNAL_INFO[hit.signal];
  let reason =
    hit.signal === 'autocomplete'
      ? `autocomplete="${hit.raw}" means ${label}`
      : hit.signal === 'inputType'
        ? `Field type "${hit.raw}" suggests ${label}`
        : `${what} "${hit.raw}" matches ${label}`;
  if (best.penalty) reason += `, but mentions "${best.penalty}"`;
  if (best.capped) reason += '; your value is not in the options';
  if (runnerUp) reason += `; could also be ${keyLabel(runnerUp.key, profile)}`;
  return reason;
}

function fromRule({ rule, strength }, field, profile, th) {
  const score = strength === 'site' ? LEARNING.siteRuleScore : strength === 'strong' ? LEARNING.strongScore : LEARNING.weakScore;
  const base = {
    fieldId: field.fieldId,
    target: rule.target,
    matchedBy: strength === 'site' ? 'site-rule' : 'global-rule',
    ruleId: rule.id,
    runnerUp: null,
    reason: strength === 'site' ? 'You taught this on this site' : `Learned from "${rule.questionText}"`,
  };
  if (rule.target.kind === 'skip') return { ...base, target: null, status: 'excluded', score, reason: 'You chose to skip this on this site' };
  if (rule.target.kind === 'template') return { ...base, status: 'suggested', score };
  const capped = rule.target.kind === 'profile' && !canFill(field, rule.target.key, profile);
  const finalScore = capped ? Math.min(score, SCORING.unmatchedOptionCap) : score;
  return { ...base, score: finalScore, status: statusFor(finalScore, null, th) };
}

/**
 * Classifies one field.
 * @param {object} field descriptor from the scanner
 * @param {ClassifyContext} [ctx]
 * @returns {Classification}
 */
export function classifyField(field, ctx = {}) {
  const { profile = { values: {} }, domain = '', rules = [], templates = [], settings } = ctx;
  const th = thresholdsFrom(settings);
  if (field.excluded)
    return { fieldId: field.fieldId, status: 'excluded', target: null, score: 0, matchedBy: 'exclusion', runnerUp: null, reason: field.excludeReason ?? 'Excluded' };
  if (field.unsupported)
    return { fieldId: field.fieldId, status: 'unknown', target: null, score: 0, matchedBy: 'unsupported', runnerUp: null, reason: field.unsupported };

  const ranked = scoreDictionary(field, profile);
  const [best, second] = ranked;

  const rule = findRule(field, domain, rules);
  // A weak (fuzzy) global rule should not override a confident dictionary match.
  if (rule && (rule.strength !== 'weak' || !best || best.score <= LEARNING.weakScore)) return fromRule(rule, field, profile, th);

  if (best && best.score >= th.suggested) {
    const runnerUp = second && second.score > 0 ? { key: second.key, score: second.score } : null;
    const tie = runnerUp && best.score - runnerUp.score < th.tieMargin;
    return {
      fieldId: field.fieldId,
      status: statusFor(best.score, runnerUp?.score, th),
      target: { kind: 'profile', key: best.key },
      score: best.score,
      matchedBy: SIGNAL_INFO[best.hit.signal][0],
      runnerUp,
      reason: explain(best, tie ? runnerUp : null, profile),
    };
  }

  const question = questionText(field);
  if (isLongTextQuestion(field, question)) {
    const suggestions = suggestTemplates(question, templates);
    if (suggestions.length)
      return {
        fieldId: field.fieldId,
        status: 'suggested',
        target: { kind: 'template', id: suggestions[0].id },
        templateIds: suggestions.map((t) => t.id),
        score: th.suggested,
        matchedBy: 'template',
        runnerUp: null,
        reason: 'Long answer: pick a template and edit it',
      };
  }

  return {
    fieldId: field.fieldId,
    status: 'unknown',
    target: null,
    score: best?.score ?? 0,
    matchedBy: 'none',
    runnerUp: best ? { key: best.key, score: best.score } : null,
    reason: best ? `Not sure. Closest guess: ${keyLabel(best.key, profile)}` : isLongTextQuestion(field, question) ? 'Long answer: write a template for questions like this' : 'No match found',
  };
}

/**
 * Classifies all fields of a form, then applies form-level rules:
 * a Student on a form that asks only for an organisation gets their college suggested.
 * @param {object[]} fields @param {ClassifyContext} [ctx] @returns {Classification[]}
 */
export function classifyFields(fields, ctx = {}) {
  const results = fields.map((f) => classifyField(f, ctx));
  const isStudent = ctx.profile?.values?.attendeeType === 'Student';
  const asksCollege = results.some((r) => r.target?.kind === 'profile' && r.target.key === 'college');
  if (!isStudent || asksCollege) return results;
  return results.map((r) =>
    r.target?.kind === 'profile' && r.target.key === 'organization' && r.matchedBy !== 'site-rule' && r.matchedBy !== 'global-rule'
      ? { ...r, status: 'suggested', target: { kind: 'profile', key: 'college' }, reason: `${r.reason}. You are a student, so your college is suggested` }
      : r,
  );
}
