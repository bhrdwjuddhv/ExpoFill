import { describe, expect, it } from 'vitest';
import { isPlaceholderOption, matchOption, matchOptions } from '@/lib/engine/formatters/options.js';

const opts = (...texts) => texts.map((text) => ({ text, value: text }));

describe('option matching', () => {
  it('matches exact, case-insensitive and normalised', () => {
    expect(matchOption(opts('Male', 'Female'), 'Female')).toBe(1);
    expect(matchOption(opts('Male', 'Female'), 'female')).toBe(1);
    expect(matchOption(opts('Web-Development', 'Design'), 'web development')).toBe(0);
    expect(matchOption([{ text: 'India', value: 'IN' }], 'IN')).toBe(0);
  });

  it('uses synonyms and fuzzy matching', () => {
    expect(matchOption(opts('Cloud', 'Artificial Intelligence'), 'AI/ML')).toBe(1);
    expect(matchOption(opts('Information Security', 'Web'), 'Cyber Security')).toBe(0);
    expect(matchOption(opts('Student', 'Working Professional'), 'Professional')).toBe(1);
    expect(matchOption(opts('India (+91)', 'USA (+1)'), '+91')).toBe(0);
  });

  it('never picks placeholders, Other or None', () => {
    expect(matchOption(opts('-- Select --', 'Other', 'None'), 'Other')).toBe(-1);
    expect(matchOption(opts('Select gender', 'Male'), 'select gender')).toBe(-1);
    for (const t of ['', 'Select', 'Choose one', '--', 'Others (please specify)', 'N/A']) expect(isPlaceholderOption(t), t).toBe(true);
    expect(isPlaceholderOption('Otherworld')).toBe(false);
  });

  it('matches every interest, never Other', () => {
    expect(matchOptions(opts('AI/ML', 'Web Dev', 'Blockchain', 'Other'), ['Machine Learning', 'Web Development', 'Other'])).toEqual([0, 1]);
    expect(matchOptions(opts('A'), [])).toEqual([]);
  });
});
