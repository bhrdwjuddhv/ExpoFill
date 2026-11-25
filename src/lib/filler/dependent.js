// Country → State → City: a select whose options load after another field changes.
import { DEPENDENT_WAIT_MS } from '../constants.js';
import { isPlaceholderOption } from '../engine/formatters/options.js';

export const realOptionCount = (select) => [...select.options].filter((o) => !isPlaceholderOption(o.text)).length;

/**
 * Resolves when `check()` returns something truthy, re-checking on every DOM change under `root`,
 * or with null after `ms`.
 */
export function waitFor(root, check, ms) {
  const first = check();
  if (first) return Promise.resolve(first);
  const win = (root.ownerDocument ?? root).defaultView;
  return new Promise((resolve) => {
    const done = (v) => {
      mo.disconnect();
      clearTimeout(timer);
      resolve(v);
    };
    const mo = new win.MutationObserver(() => {
      const v = check();
      if (v) done(v);
    });
    mo.observe(root, { childList: true, subtree: true, attributes: true });
    const timer = setTimeout(() => done(check() || null), ms);
  });
}

/** A select with 0–1 real options is waiting for an earlier answer: wait for its options. */
export async function waitForSelectOptions(select, ms = DEPENDENT_WAIT_MS) {
  if (realOptionCount(select) > 1) return true;
  const before = select.innerHTML;
  return !!(await waitFor(select, () => select.innerHTML !== before && realOptionCount(select) >= 1, ms));
}
