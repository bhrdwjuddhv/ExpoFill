// Custom dropdowns: role="combobox" / role="listbox" (Google Forms, React Select, MUI…). Best effort:
// a failure is reported, never retried in a loop.
import { ARIA_OPTION_WAIT_MS } from '../constants.js';
import { matchAny } from '../engine/formatters/options.js';
import { byIds, clean, textOf } from '../scanner/labelFinder.js';
import { isVisible } from '../scanner/shadow.js';
import { waitFor } from './dependent.js';
import { dispatchClick, setNativeValue } from './nativeSetter.js';

const OPTION = '[role="option"]';

/** Visible options for this widget: its own list, a list it controls, or a popup list. */
function visibleOptions(el) {
  const doc = el.ownerDocument;
  const lists = [...byIds(el, 'aria-controls'), ...byIds(el, 'aria-owns')];
  const scoped = [...el.querySelectorAll(OPTION), ...lists.flatMap((l) => [...l.querySelectorAll(OPTION)])].filter(isVisible);
  const pool = scoped.length > 1 ? scoped : [...doc.querySelectorAll(OPTION)].filter(isVisible);
  return pool.length ? pool : null;
}

const optionInfo = (o) => ({ text: textOf(o) || clean(o.getAttribute('data-value')), value: o.getAttribute('data-value') ?? '' });

const shownText = (el) => clean(`${el.value ?? ''} ${el.textContent ?? ''}`).toLowerCase();

/**
 * Opens the widget, waits for its options, clicks the best match and checks it took.
 * @param {Element} el the combobox / listbox
 * @param {{ optionTexts?: string[], candidates?: string[], value?: string }} want
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function selectAriaOption(el, { optionTexts = [], candidates = [], value = '' }) {
  el.scrollIntoView?.({ block: 'center' });
  dispatchClick(el);
  let options = await waitFor(el.ownerDocument.body, () => visibleOptions(el), ARIA_OPTION_WAIT_MS);

  // Searchable combobox: type to load options.
  const input = el.tagName === 'INPUT' ? el : el.querySelector('input');
  if (!options && input) {
    setNativeValue(input, value || candidates[0] || optionTexts[0] || '');
    input.focus({ preventScroll: true });
    options = await waitFor(el.ownerDocument.body, () => visibleOptions(el), ARIA_OPTION_WAIT_MS);
  }
  if (!options) return { ok: false, reason: 'The list did not open' };

  const info = options.map(optionInfo);
  const i = matchAny(info, [...optionTexts, ...candidates, value].filter(Boolean));
  if (i < 0) {
    el.dispatchEvent(new el.ownerDocument.defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return { ok: false, reason: 'No matching option in the list' };
  }
  const chosen = options[i];
  dispatchClick(chosen);
  await new Promise((r) => setTimeout(r, 50));
  const text = info[i].text.toLowerCase();
  const ok =
    chosen.getAttribute('aria-selected') === 'true' ||
    (text && shownText(el).includes(text)) ||
    (input && shownText(input).includes(text));
  return ok ? { ok: true } : { ok: false, reason: 'Could not confirm the choice' };
}
