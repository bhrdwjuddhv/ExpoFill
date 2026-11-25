// Fails the build if src/ contains anything that could send data off the device
// or store it outside chrome.storage.local. Fixtures (src/tests/fixtures/) are exempt.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RULES = [
  [/\bfetch\s*\(/, 'fetch('],
  [/\bXMLHttpRequest\b/, 'XMLHttpRequest'],
  [/\bWebSocket\b/, 'WebSocket'],
  [/\bsendBeacon\b/, 'sendBeacon'],
  [/\bEventSource\b/, 'EventSource'],
  [/\bstorage\.sync\b/, 'chrome.storage.sync'],
  [/\blocalStorage\b/, 'localStorage'],
  [/\bsessionStorage\b/, 'sessionStorage'],
  [/\bindexedDB\b/i, 'indexedDB'],
  [/\bdocument\.cookie\b/, 'document.cookie'],
  [/https?:\/\//i, 'http(s):// URL'],
];

const EXTS = new Set(['.js', '.jsx', '.mjs', '.html', '.css', '.json']);
const blank = (m) => m.replace(/[^\n]/g, ' '); // keep line numbers

/**
 * Removes comments, conservatively: only comments that start a line (plus JSX {/* *\/}),
 * so a comment marker inside a string can never hide real code. Trailing `// ...` comments
 * are still scanned — move a URL-bearing comment to its own line.
 */
export function stripComments(text, ext) {
  if (ext === '.html') return text.replace(/<!--[\s\S]*?-->/g, blank);
  if (ext === '.css') return text.replace(/\/\*[\s\S]*?\*\//g, blank);
  if (ext === '.json') return text;
  return text
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
    .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, blank)
    .replace(/^[ \t]*\/\/.*$/gm, blank);
}

/** @returns {{ line: number, rule: string, text: string }[]} */
export function findViolations(text, ext) {
  const out = [];
  stripComments(text, ext)
    .split('\n')
    .forEach((line, i) => {
      for (const [re, rule] of RULES) if (re.test(line)) out.push({ line: i + 1, rule, text: line.trim().slice(0, 120) });
    });
  return out;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

function main() {
  const root = join(fileURLToPath(import.meta.url), '..', '..');
  const src = join(root, 'src');
  const exempt = join(src, 'tests', 'fixtures') + sep;
  let count = 0;
  for (const file of walk(src)) {
    if (file.startsWith(exempt) || !EXTS.has(extname(file))) continue;
    for (const v of findViolations(readFileSync(file, 'utf8'), extname(file))) {
      count++;
      console.error(`  ${relative(root, file)}:${v.line}  [${v.rule}]  ${v.text}`);
    }
  }
  if (count) {
    console.error(`\nPrivacy check FAILED: ${count} problem(s). ExpoFill must make no network requests and store data only in chrome.storage.local.`);
    process.exit(1);
  }
  console.log('Privacy check passed.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
