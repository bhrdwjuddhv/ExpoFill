// Runs scanner + classifier on every saved form in fixtures/ and checks it against expected.json.
// Fails on any wrong-ready result, or if accuracy on known fields drops below 95%.
import { afterAll, describe, expect, it } from 'vitest';
import { FIXTURES, evaluateFixture } from './fixtureHelpers.js';

const MIN_ACCURACY = 0.95;

const summary = [];

describe('fixtures', () => {
  for (const name of FIXTURES) {
    it(name, () => {
      const rows = evaluateFixture(name);
      const known = rows.filter((r) => r.want !== 'excluded' && r.want !== 'unknown' && !r.unlisted);
      summary.push({
        fixture: name,
        fields: rows.length,
        correct: rows.filter((r) => r.ok).length,
        knownCorrect: known.filter((r) => r.ok).length,
        known: known.length,
        wrongReady: rows.filter((r) => r.wrongReady).length,
      });
      const bad = rows.filter((r) => !r.ok);
      expect(bad.filter((r) => r.wrongReady || r.unlisted), JSON.stringify(bad, null, 2)).toEqual([]);
      // Visible in the failure message when tuning:
      expect.soft(bad, `${name} mismatches`).toEqual([]);
    });
  }

  afterAll(() => {
    const total = summary.reduce((a, s) => ({ known: a.known + s.known, knownCorrect: a.knownCorrect + s.knownCorrect }), { known: 0, knownCorrect: 0 });
    const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : '—');
    const lines = [
      'fixture                              fields  correct  wrong-ready  accuracy(known)',
      ...summary.map((s) => `${s.fixture.padEnd(36)} ${String(s.fields).padStart(6)}  ${String(s.correct).padStart(7)}  ${String(s.wrongReady).padStart(11)}  ${pct(s.knownCorrect, s.known).padStart(15)}`),
      `${'TOTAL'.padEnd(36)} ${''.padStart(6)}  ${''.padStart(7)}  ${String(summary.reduce((a, s) => a + s.wrongReady, 0)).padStart(11)}  ${pct(total.knownCorrect, total.known).padStart(15)}`,
    ];
    process.stdout.write(`\n${lines.join('\n')}\n\n`);
    expect(total.knownCorrect / total.known).toBeGreaterThanOrEqual(MIN_ACCURACY);
  });
});
