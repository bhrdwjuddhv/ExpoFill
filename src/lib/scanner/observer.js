// Watches for fields that appear after the first scan (conditional questions, multi-step forms).
import { OBSERVER_DEBOUNCE_MS, OBSERVER_IDLE_MS } from '../constants.js';

/**
 * Rescans only the subtrees that changed, and reports fields the scanner has not seen.
 * @param {Document} doc
 * @param {{ scan: (root: Node) => object[] }} scanner
 * @param {(fields: object[]) => void} onFields
 * @returns {() => void} stop
 */
export function observeForms(doc, scanner, onFields) {
  const roots = new Set();
  let debounce;
  let idle;

  const flush = () => {
    const list = [...roots].filter((r) => r.isConnected);
    roots.clear();
    const top = list.filter((r) => !list.some((o) => o !== r && o.contains(r)));
    const fields = top.flatMap((r) => scanner.scan(r));
    if (fields.length) onFields(fields);
  };

  const mo = new doc.defaultView.MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes') roots.add(m.target);
      else m.addedNodes.forEach((n) => n.nodeType === 1 && roots.add(n));
    }
    if (!roots.size) return;
    clearTimeout(debounce);
    debounce = setTimeout(flush, OBSERVER_DEBOUNCE_MS);
    resetIdle();
  });

  const stop = () => {
    mo.disconnect();
    clearTimeout(debounce);
    clearTimeout(idle);
  };
  const resetIdle = () => {
    clearTimeout(idle);
    idle = setTimeout(stop, OBSERVER_IDLE_MS);
  };

  // ponytail: fields inside shadow roots that appear later are not observed (observers stop at shadow boundaries); Rescan finds them.
  mo.observe(doc.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'hidden', 'disabled'],
  });
  resetIdle();
  return stop;
}
