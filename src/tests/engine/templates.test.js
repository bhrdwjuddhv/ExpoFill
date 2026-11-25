import { describe, expect, it } from 'vitest';
import { isLongTextQuestion, suggestTemplates } from '@/lib/engine/templates.js';

const T = [
  { id: 'gen', category: 'General', keywords: [], text: 'I want to learn.' },
  { id: 'sec', category: 'Cybersecurity', keywords: ['ctf'], text: 'Security!' },
  { id: 'empty', category: 'General', keywords: [], text: '' },
];

describe('templates', () => {
  it('ranks templates by keyword overlap and skips empty ones', () => {
    expect(suggestTemplates('Why do you want to attend? What do you expect to learn?', T).map((t) => t.id)).toEqual(['gen']);
    expect(suggestTemplates('Your interest in cyber security and CTF?', T)[0].id).toBe('sec');
    expect(suggestTemplates('Shoe size', T)).toEqual([]);
  });

  it('detects long-text questions', () => {
    expect(isLongTextQuestion({ control: 'text' }, 'Why do you want to join?')).toBe(true);
    expect(isLongTextQuestion({ control: 'textarea' }, 'Anything else')).toBe(true);
    expect(isLongTextQuestion({ control: 'text' }, 'City')).toBe(false);
  });
});
