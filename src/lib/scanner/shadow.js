// DOM walking that also enters open shadow roots, plus visibility helpers.
// Closed shadow roots are unreachable by design and are ignored.

export const CONTROL_SELECTOR =
  'input:not([type=hidden]),select,textarea,[contenteditable]:not([contenteditable=false]),[role=combobox],[role=radio],[role=checkbox],[role=listbox]';

/** Parent element, stepping out of a shadow root to its host. */
export const parentOf = (node) => node.parentElement ?? node.parentNode?.host ?? null;

/** Every element under `root` (and `root` itself if it is an element), in document order, through open shadow roots. */
export function* deepElements(root) {
  if (root.nodeType === 1) {
    yield root;
    if (root.shadowRoot) yield* deepElements(root.shadowRoot);
  }
  for (const el of root.querySelectorAll('*')) {
    yield el;
    if (el.shadowRoot) yield* deepElements(el.shadowRoot);
  }
}

/** Number of form controls inside `node` (including itself). */
export const countControls = (node) =>
  node.nodeType === 1 ? (node.matches(CONTROL_SELECTOR) ? 1 : 0) + node.querySelectorAll(CONTROL_SELECTOR).length : 0;

/** Rendered and non-zero size. */
export function isVisible(el) {
  const win = el.ownerDocument.defaultView;
  if (typeof el.checkVisibility === 'function') {
    if (!el.checkVisibility({ visibilityProperty: true })) return false;
  } else {
    for (let e = el; e; e = parentOf(e)) {
      if (e.hidden || win.getComputedStyle(e).display === 'none') return false;
    }
    if (win.getComputedStyle(el).visibility === 'hidden') return false;
  }
  const r = el.getBoundingClientRect();
  if (!(r.width > 0 && r.height > 0)) return false;
  // Entirely off the page (left:-9999px): a spam-bot honeypot, never a real question.
  return r.right + win.scrollX > 0 && r.bottom + win.scrollY > 0;
}
