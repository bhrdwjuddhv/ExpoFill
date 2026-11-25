// Finds the human text that describes a form control.
import { GROUP_ANCESTOR_LEVELS, GROUP_CLASS_PATTERN, LABEL_MAX_LENGTH, NEARBY_TEXT_MAX_PX } from '../constants.js';
import { countControls, isVisible, parentOf } from './shadow.js';

const SKIP_TEXT = 'select,option,textarea,script,style,noscript,template,button,[hidden],[aria-hidden="true"]';
const HEADING = 'h1,h2,h3,h4,h5,h6,[role="heading"]';

/** Trim, collapse whitespace, cap length. */
export const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, LABEL_MAX_LENGTH);

/**
 * Visible text inside `node`, skipping control contents (select options, textarea text, buttons).
 * @param {Node} node @param {(el: Element) => boolean} [exclude] skip text whose parent matches
 */
export function textOf(node, exclude) {
  if (node.nodeType === 3) return clean(node.data);
  const doc = node.ownerDocument;
  const walker = doc.createTreeWalker(node, 4 /* NodeFilter.SHOW_TEXT */);
  const out = [];
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const p = t.parentElement;
    if (!t.data.trim() || !p || p.closest(SKIP_TEXT) || exclude?.(p)) continue;
    if (doc.defaultView.getComputedStyle(p).display === 'none') continue;
    out.push(t.data);
  }
  return clean(out.join(' '));
}

/** Text of elements referenced by id (aria-labelledby, aria-controls). */
export function byIds(el, attr) {
  const root = el.getRootNode();
  return (el.getAttribute(attr) ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => root.getElementById?.(id) ?? el.ownerDocument.getElementById(id))
    .filter(Boolean);
}

/** <label for=id> and wrapping <label>, across the element's own (shadow) tree. */
export function labelElements(el) {
  const found = el.labels ? [...el.labels] : [];
  if (!found.length && el.id) {
    const root = el.getRootNode();
    found.push(...[...root.querySelectorAll('label[for]')].filter((l) => l.htmlFor === el.id));
  }
  const wrap = el.closest('label');
  if (wrap && !found.includes(wrap)) found.push(wrap);
  return found;
}

/** A label that belongs to another control. */
const otherControlsLabel = (p, el) => {
  const l = p.closest('label');
  return !!l && !!l.control && l.control !== el;
};

/**
 * Rule 5: closest previous sibling with visible text, climbing while the parent holds no other field.
 * @returns {{ text: string, isLabel: boolean }}
 */
export function previousText(el) {
  let cur = el;
  for (let level = 0; level <= GROUP_ANCESTOR_LEVELS && cur; level++) {
    for (let s = cur.previousSibling; s; s = s.previousSibling) {
      if (s.nodeType === 3) {
        const t = clean(s.data);
        if (t) return { text: t, isLabel: false };
        continue;
      }
      if (s.nodeType !== 1 || s.matches('script,style,template')) continue;
      // That text belongs to another field.
      if (countControls(s) || (s.tagName === 'LABEL' && s.control && s.control !== el)) return { text: '', isLabel: false };
      if (!isVisible(s)) continue;
      const t = textOf(s);
      // An unlinked <label> right before the control is its label in all but markup.
      if (t) return { text: t, isLabel: s.tagName === 'LABEL' };
    }
    const p = parentOf(cur);
    if (!p || p === el.ownerDocument.body || countControls(p) > countControls(cur)) break;
    cur = p;
  }
  return { text: '', isLabel: false };
}

/** Rule 6: text of the nearest group-like ancestor (form-group, field, question, fieldset…). */
export function groupText(el) {
  let cur = parentOf(el);
  for (let i = 0; i < GROUP_ANCESTOR_LEVELS && cur; i++, cur = parentOf(cur)) {
    if (cur.tagName === 'FIELDSET' || GROUP_CLASS_PATTERN.test(cur.getAttribute('class') ?? '')) {
      const t = textOf(cur, (p) => otherControlsLabel(p, el));
      if (t) return t;
    }
  }
  return '';
}

/** Rule 7: nearest visible text block above or to the left, within NEARBY_TEXT_MAX_PX. */
export function geometricText(el) {
  const r = el.getBoundingClientRect();
  if (!r.width) return '';
  let scope = el;
  for (let i = 0; i < 4 && parentOf(scope); i++) scope = parentOf(scope);
  let best = '';
  let bestD = NEARBY_TEXT_MAX_PX + 1;
  for (const c of scope.querySelectorAll('*')) {
    if (c === el || c.contains(el) || el.contains(c) || countControls(c)) continue;
    if (![...c.childNodes].some((n) => n.nodeType === 3 && n.data.trim())) continue;
    const cr = c.getBoundingClientRect();
    if (!cr.width) continue;
    let d = Infinity;
    if (cr.bottom <= r.top + 2 && cr.left < r.right && cr.right > r.left - NEARBY_TEXT_MAX_PX) d = r.top - cr.bottom;
    else if (cr.right <= r.left + 2 && cr.top < r.bottom && cr.bottom > r.top) d = r.left - cr.right;
    if (d < bestD) {
      const t = textOf(c);
      if (t) [best, bestD] = [t, d];
    }
  }
  return best;
}

/** Rules 5 → 7, first hit wins. */
export function nearbyText(el) {
  const prev = previousText(el);
  if (prev.text) return prev;
  return { text: groupText(el) || geometricText(el), isLabel: false };
}

/** Nearest heading before the control (section title), or ''. */
export function sectionText(el) {
  let steps = 0;
  for (let cur = el; cur && steps < 300; cur = parentOf(cur)) {
    for (let s = cur.previousElementSibling; s && steps < 300; s = s.previousElementSibling, steps++) {
      // A legend is a sibling only for fields inside its own fieldset.
      if (s.matches(HEADING) || s.tagName === 'LEGEND') return textOf(s);
      const hs = s.querySelectorAll(HEADING);
      if (hs.length) return textOf(hs[hs.length - 1]);
    }
  }
  return '';
}

/**
 * Label signals for one control, following the spec's order (1–7).
 * @returns {{ labelFor: string, ariaLabelledby: string, ariaLabel: string, nearbyText: string }}
 */
export function findLabels(el) {
  const labelFor = clean(labelElements(el).map((l) => textOf(l)).filter(Boolean).join(' '));
  const ariaLabelledby = clean(byIds(el, 'aria-labelledby').map((e) => textOf(e) || clean(e.textContent)).join(' '));
  const ariaLabel = clean(el.getAttribute('aria-label'));
  const out = { labelFor, ariaLabelledby, ariaLabel, nearbyText: '' };
  if (labelFor || ariaLabelledby || ariaLabel) return out;
  const near = nearbyText(el);
  if (near.isLabel) out.labelFor = near.text;
  else out.nearbyText = near.text;
  return out;
}
