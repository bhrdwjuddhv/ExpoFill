// Learned rules: what the user taught ExpoFill, per site and globally. Pure; callers save the results.
import { LEARNING } from '../constants.js';
import { jaccard } from './fuzzy.js';
import { isGeneratedName, questionText, tokens } from './normalize.js';

/** Sorted unique tokens joined by a space. */
export const ruleNormalize = (text) => [...new Set(tokens(text))].sort().join(' ');

/** `${domain}|${normalized}|${control}` plus `|${name}` when the name is meaningful. */
export function fingerprint(field, domain) {
  const name = field.signals?.name;
  const base = `${domain}|${ruleNormalize(questionText(field))}|${field.control}`;
  return name && !isGeneratedName(name) ? `${base}|${name}` : base;
}

/**
 * Site rule by exact fingerprint first; then the most similar global rule.
 * @returns {{ rule: object, strength: 'site'|'strong'|'weak', similarity: number } | null}
 */
export function findRule(field, domain, rules = []) {
  const fp = fingerprint(field, domain);
  const site = rules.find((r) => r.scope === 'site' && r.fingerprint === fp);
  if (site) return { rule: site, strength: 'site', similarity: 1 };

  const q = ruleNormalize(questionText(field)).split(' ').filter(Boolean);
  if (!q.length) return null;
  let best = null;
  for (const r of rules) {
    if (r.scope !== 'global') continue;
    const sim = jaccard(q, r.normalized.split(' '));
    const ok = sim >= LEARNING.strongSimilarity || (sim >= LEARNING.weakSimilarity && r.control === field.control);
    if (ok && (!best || sim > best.similarity)) best = { rule: r, similarity: sim };
  }
  if (!best) return null;
  return { ...best, strength: best.similarity >= LEARNING.strongSimilarity ? 'strong' : 'weak' };
}

/**
 * @typedef {{ kind: 'profile', key: string } | { kind: 'template', id: string } | { kind: 'fixed', value: any } | { kind: 'skip' }} Target
 * @typedef {{ id: string, questionText: string, normalized: string, fingerprint: string, control: string,
 *   target: Target, scope: 'site'|'global', domain: string|null, seenOnDomains: string[], timesUsed: number,
 *   history: Target[], createdAt: number, updatedAt: number, lastUsedAt: number|null }} Rule
 */

/** Same answer? */
export const sameTarget = (a, b) =>
  !!a &&
  !!b &&
  a.kind === b.kind &&
  (a.kind === 'profile'
    ? a.key === b.key
    : a.kind === 'template'
      ? a.id === b.id
      : a.kind === 'fixed'
        ? JSON.stringify(a.value) === JSON.stringify(b.value)
        : true);

const retarget = (rule, target, now) =>
  sameTarget(rule.target, target) ? { ...rule, updatedAt: now } : { ...rule, target, history: [...rule.history, rule.target], updatedAt: now };

const newRule = (props, now) => ({
  id: crypto.randomUUID(),
  seenOnDomains: [],
  timesUsed: 0,
  history: [],
  createdAt: now,
  updatedAt: now,
  lastUsedAt: null,
  ...props,
});

/** The global rule for a question (created or updated), remembering every site it was seen on. */
function globalFrom(rules, { questionText: question, normalized, control, target }, domains, now) {
  const g = rules.find((r) => r.scope === 'global' && r.normalized === normalized);
  const seenOnDomains = [...new Set([...(g?.seenOnDomains ?? []), ...domains])];
  if (g) return { ...retarget(g, target, now), seenOnDomains };
  return newRule(
    { questionText: question, normalized, fingerprint: `*|${normalized}|${control}`, control, target, scope: 'global', domain: null, seenOnDomains },
    now,
  );
}

/**
 * Records what the user taught for one field on one site.
 * Promotes to a global rule when the same question got the same answer on 2 different sites
 * (never for fixed values or skips), or right away with `global: true` ("Use on all sites").
 * @returns {Rule[]} rules to save: the site rule, plus the global rule if any
 */
export function teach(rules, field, target, domain, { global = false, now = Date.now() } = {}) {
  const fp = fingerprint(field, domain);
  const question = questionText(field);
  const normalized = ruleNormalize(question);
  const existing = rules.find((r) => r.scope === 'site' && r.fingerprint === fp);
  const site = existing
    ? retarget(existing, target, now)
    : newRule({ questionText: question, normalized, fingerprint: fp, control: field.control, target, scope: 'site', domain, seenOnDomains: [domain] }, now);

  const agreeing = rules.filter((r) => r.scope === 'site' && r.id !== site.id && r.normalized === normalized && sameTarget(r.target, target));
  const domains = [...new Set([domain, ...agreeing.map((r) => r.domain)])];
  const auto = domains.length >= LEARNING.promoteAfterDomains && target.kind !== 'fixed' && target.kind !== 'skip';
  if (!global && !auto) return [site];
  return [site, globalFrom(rules, { questionText: question, normalized, control: field.control, target }, domains, now)];
}

/** "Promote to global" from the Learning Center. */
export const promoteRule = (rule, rules, now = Date.now()) => globalFrom(rules, rule, rule.domain ? [rule.domain] : [], now);

/** Counts a fill that used this rule. */
export const markUsed = (rule, now = Date.now()) => ({ ...rule, timesUsed: rule.timesUsed + 1, lastUsedAt: now });

/** Undo the last change: restore the previous target, or null (delete) if there is none. */
export const undoRule = (rule, now = Date.now()) =>
  rule.history.length ? { ...rule, target: rule.history.at(-1), history: rule.history.slice(0, -1), updatedAt: now } : null;

/** Change a rule's target by hand (Learning Center). */
export const editRule = (rule, target, now = Date.now()) => retarget(rule, target, now);
