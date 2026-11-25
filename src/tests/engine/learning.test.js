import { describe, expect, it } from 'vitest';
import { findRule, fingerprint, markUsed, promoteRule, ruleNormalize, sameTarget, teach, undoRule } from '@/lib/engine/learning.js';

const field = (label, control = 'text', name) => ({ fieldId: 'f', control, signals: { labelFor: label, name } });

describe('findRule', () => {
  it('builds fingerprints, including only meaningful names', () => {
    expect(ruleNormalize('Name of your startup?')).toBe('name startup');
    expect(fingerprint(field('Startup name', 'text', 'input_8f3a2'), 'a.com')).toBe('a.com|name startup|text');
    expect(fingerprint(field('Startup name', 'text', 'startup'), 'a.com')).toBe('a.com|name startup|text|startup');
  });

  it('prefers a site rule, then strong and weak global rules', () => {
    const f = field('Startup name');
    const target = { kind: 'profile', key: 'organization' };
    const site = { id: 's', scope: 'site', fingerprint: fingerprint(f, 'a.com'), target };
    const global = { id: 'g', scope: 'global', normalized: 'name startup', control: 'text', target };
    expect(findRule(f, 'a.com', [global, site]).strength).toBe('site');
    expect(findRule(f, 'b.com', [global, site])).toMatchObject({ strength: 'strong', rule: { id: 'g' } });
    // 2 of 3 tokens shared → 0.67: weak, and only for the same control type
    const weak = { ...global, normalized: 'company name startup' };
    expect(findRule(field('Startup name'), 'b.com', [weak])?.strength).toBe('weak');
    expect(findRule(field('Startup name', 'textarea'), 'b.com', [weak])).toBeNull();
    expect(findRule(field('Shoe size'), 'b.com', [global])).toBeNull();
  });
});

describe('teach, promotion, history', () => {
  const T = { kind: 'profile', key: 'organization' };
  const onSite = (rules, label, domain, target = T, opts) => {
    const saved = teach(rules, field(label), target, domain, opts);
    const ids = new Set(saved.map((r) => r.id));
    return [...rules.filter((r) => !ids.has(r.id)), ...saved];
  };

  it('creates a site rule, then updates it keeping history', () => {
    let rules = onSite([], 'Startup name', 'a.com');
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ scope: 'site', domain: 'a.com', target: T, history: [], timesUsed: 0 });
    rules = onSite(rules, 'Startup name', 'a.com', { kind: 'fixed', value: 'Byte Labs' });
    expect(rules).toHaveLength(1);
    expect(rules[0].history).toEqual([T]);
    expect(undoRule(rules[0]).target).toEqual(T);
    expect(undoRule(undoRule(rules[0]))).toBeNull();
  });

  it('promotes after the same answer on two different sites, then is found on a third', () => {
    let rules = onSite([], 'Name of your startup', 'a.com');
    expect(findRule(field('Name of your startup'), 'c.com', rules)).toBeNull();
    rules = onSite(rules, 'Startup name?', 'b.com');
    const g = rules.find((r) => r.scope === 'global');
    expect(g).toMatchObject({ target: T, seenOnDomains: ['b.com', 'a.com'] });
    expect(findRule(field('Your startup name'), 'c.com', rules)).toMatchObject({ strength: 'strong', rule: { id: g.id } });
    // A site rule still beats the global one on its own site.
    expect(findRule(field('Name of your startup'), 'a.com', rules).strength).toBe('site');
  });

  it('never auto-promotes fixed values or skips, but "Use on all sites" does', () => {
    const fixed = { kind: 'fixed', value: 'Seed' };
    let rules = onSite([], 'Funding stage', 'a.com', fixed);
    rules = onSite(rules, 'Funding stage', 'b.com', fixed);
    expect(rules.some((r) => r.scope === 'global')).toBe(false);
    rules = onSite(rules, 'Funding stage', 'c.com', fixed, { global: true });
    expect(rules.find((r) => r.scope === 'global')?.target).toEqual(fixed);
  });

  it('a conflicting promotion updates the global rule and keeps history', () => {
    let rules = onSite([], 'Startup name', 'a.com', T, { global: true });
    rules = onSite(rules, 'Startup name', 'b.com', { kind: 'profile', key: 'teamName' }, { global: true });
    const g = rules.find((r) => r.scope === 'global');
    expect(g.target).toEqual({ kind: 'profile', key: 'teamName' });
    expect(g.history).toEqual([T]);
  });

  it('counts uses and promotes by hand', () => {
    const [site] = teach([], field('Startup name'), T, 'a.com');
    expect(markUsed(site, 5)).toMatchObject({ timesUsed: 1, lastUsedAt: 5 });
    expect(promoteRule(site, [site])).toMatchObject({ scope: 'global', seenOnDomains: ['a.com'], target: T });
    expect(sameTarget({ kind: 'fixed', value: 'a' }, { kind: 'fixed', value: 'b' })).toBe(false);
  });
});
