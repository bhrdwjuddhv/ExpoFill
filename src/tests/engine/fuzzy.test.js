import { describe, expect, it } from 'vitest';
import { jaccard, levenshtein } from '@/lib/engine/fuzzy.js';

describe('fuzzy', () => {
  it('levenshtein', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('email', 'emial')).toBe(2);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abcdef', 'uvwxyz', 2)).toBe(3); // early exit
    expect(levenshtein('a', 'abcdef', 2)).toBe(3);
  });

  it('jaccard', () => {
    expect(jaccard(['a', 'b'], ['b', 'c'])).toBeCloseTo(1 / 3);
    expect(jaccard(new Set(['a']), ['a'])).toBe(1);
    expect(jaccard([], [])).toBe(0);
  });
});
