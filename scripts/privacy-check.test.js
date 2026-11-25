import { describe, expect, it } from 'vitest';
import { findViolations } from './privacy-check.js';

const rules = (text, ext = '.js') => findViolations(text, ext).map((v) => v.rule);

describe('privacy check', () => {
  it('flags network, foreign storage and URLs', () => {
    expect(rules("fetch('/x')")).toEqual(['fetch(']);
    expect(rules('new XMLHttpRequest(); new WebSocket(u)')).toEqual(['XMLHttpRequest', 'WebSocket']);
    expect(rules('chrome.storage.sync.get()')).toEqual(['chrome.storage.sync']);
    expect(rules('window.localStorage.x; indexedDB.open()')).toEqual(['localStorage', 'indexedDB']);
    expect(rules("const u = 'https://x.io'")).toEqual(['http(s):// URL']);
    expect(rules('<a href="http://x">', '.html')).toEqual(['http(s):// URL']);
  });

  it('allows chrome.storage.local and words like prefetch', () => {
    expect(rules('chrome.storage.local.get(); prefetchData()')).toEqual([]);
  });

  it('ignores whole-line comments but still scans trailing ones', () => {
    expect(rules('// see https://x.io\n/* fetch(x) */\n{/* https://y */}')).toEqual([]);
    expect(rules('/**\n * https://x\n */')).toEqual([]);
    expect(rules('go(); // https://x')).toEqual(['http(s):// URL']);
    expect(rules("glob('src/**/*.js'); fetch(u) /* */")).toEqual(['fetch(']);
  });

  it('reports correct line numbers after stripped comments', () => {
    expect(findViolations('/*\n\n*/\nfetch(u)', '.js')[0].line).toBe(4);
  });
});
