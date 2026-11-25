import { describe, expect, it } from 'vitest';
import { byFrame, makeRows, profileLooksEmpty, taughtRows, teachTarget, templateFrom } from '@/entrypoints/sidepanel/rows.js';
import { decodeTarget, encodeTarget, targetGroups, targetLabel } from '@/lib/targets.js';

describe('targets', () => {
  it('round-trips through <select> values and labels', () => {
    for (const t of [{ kind: 'profile', key: 'email' }, { kind: 'template', id: 'x' }, { kind: 'skip' }]) expect(decodeTarget(encodeTarget(t))).toEqual(t);
    expect(decodeTarget('fixed', 'Seed')).toEqual({ kind: 'fixed', value: 'Seed' });
    expect(decodeTarget('')).toBeNull();
    expect(targetLabel({ kind: 'profile', key: 'phone' })).toBe('Mobile number');
    expect(targetLabel({ kind: 'template', id: 't' }, { templates: [{ id: 't', title: 'Why' }] })).toBe('Template: Why');
    expect(targetLabel({ kind: 'fixed', value: ['A', 'B'] })).toBe('Fixed: A, B');
    expect(targetGroups().at(-1).options.map((o) => o.value)).toEqual(['fixed', 'skip']);
  });
});

describe('side panel rows', () => {
  const field = (fieldId, control = 'text', options = []) => ({ fieldId, frameId: 0, control, options, signals: { labelFor: 'Startup stage' } });

  it('pre-ticks only Ready rows and drops targets of excluded ones', () => {
    const rows = makeRows([field('a'), field('b'), field('c')], [
      { status: 'ready', target: { kind: 'profile', key: 'email' } },
      { status: 'suggested', target: { kind: 'profile', key: 'phone' } },
      { status: 'excluded', target: null },
    ]);
    expect(rows.map((r) => r.ticked)).toEqual([true, false, false]);
    expect(rows[2].target).toBeNull();
  });

  it('turns typed or picked values into fixed answers to remember', () => {
    const opts = [{ text: 'Seed' }, { text: 'Series A' }];
    expect(teachTarget({ field: field('a'), target: { kind: 'profile', key: 'x' }, override: { value: 'Pre-seed' } })).toEqual({ kind: 'fixed', value: 'Pre-seed' });
    expect(teachTarget({ field: field('a', 'select', opts), override: { optionIndexes: [1] } })).toEqual({ kind: 'fixed', value: 'Series A' });
    expect(teachTarget({ field: field('a', 'checkbox-group', opts), override: { optionIndexes: [0, 1] } })).toEqual({ kind: 'fixed', value: ['Seed', 'Series A'] });
    const untouched = { field: field('a'), target: { kind: 'profile', key: 'email' }, taught: false };
    const mapped = { ...untouched, taught: true };
    expect(taughtRows([untouched, mapped])).toEqual([mapped]);
  });

  it('groups plan items by frame and builds templates from answers', () => {
    const m = byFrame([{ fieldId: 'a', frameId: 0 }, { fieldId: 'b', frameId: 3 }, { fieldId: 'c', frameId: 0 }]);
    expect([...m.entries()]).toEqual([[0, [{ fieldId: 'a' }, { fieldId: 'c' }]], [3, [{ fieldId: 'b' }]]]);
    expect(templateFrom('Why do you want to attend?', 'To learn')).toMatchObject({ title: 'Why do you want to attend?', category: 'General', keywords: ['why', 'want', 'attend'], text: 'To learn' });
    expect(profileLooksEmpty({ values: {} })).toBe(true);
    expect(profileLooksEmpty({ values: { email: 'a@b.c' } })).toBe(false);
  });
});
