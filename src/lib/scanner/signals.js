// Per-element facts: what kind of control it is, its text signals and its state.
import { isPlaceholderOption } from '../engine/formatters/options.js';
import { clean, findLabels, sectionText } from './labelFinder.js';
import { isVisible, parentOf } from './shadow.js';

const SKIP_INPUT_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'color', 'range', 'search']);
const DATE_TYPES = new Set(['date', 'datetime-local', 'month', 'week', 'time']);
const TYPED = new Set(['email', 'tel', 'number', 'url']);

const inputType = (el) => (el.getAttribute('type') || 'text').toLowerCase();

/**
 * Raw control kind, or null for non-fields. Radios and checkboxes come back as
 * 'radio' / 'checkbox' and are grouped by the scanner.
 */
export function controlOf(el) {
  const tag = el.tagName;
  const role = el.getAttribute('role');
  if (el.closest('[role=search]')) return null; // site search boxes are not registration questions
  if (tag === 'INPUT') {
    const t = inputType(el);
    if (SKIP_INPUT_TYPES.has(t)) return null;
    if (t === 'radio' || t === 'checkbox') return t;
    if (role === 'combobox') return 'aria-combobox';
    if (TYPED.has(t)) return t;
    if (DATE_TYPES.has(t)) return 'date';
    return 'text'; // text, password and file land here and are excluded later
  }
  if (tag === 'TEXTAREA') return 'textarea';
  if (tag === 'SELECT') return 'select';
  if (role === 'combobox' || (tag === 'BUTTON' && el.getAttribute('aria-haspopup') === 'listbox'))
    return el.querySelector('input,[role=combobox]') ? null : 'aria-combobox'; // the inner input is the control
  const ce = el.getAttribute('contenteditable');
  if (ce !== null && ce !== 'false' && !parentOf(el)?.closest('[contenteditable]:not([contenteditable=false])'))
    return 'contenteditable';
  return null;
}

/** Signals for a single (non-grouped) control. */
export function elementSignals(el) {
  const labels = findLabels(el);
  const attr = (n) => el.getAttribute(n) ?? '';
  let placeholder = attr('placeholder') || attr('aria-placeholder') || attr('data-placeholder');
  // "Select your state" as the first <option> is a placeholder in all but name.
  const first = el.tagName === 'SELECT' ? el.options[0] : null;
  if (!placeholder && first && first.text.trim() && isPlaceholderOption(first.text)) placeholder = clean(first.text);
  const section = sectionText(el);
  return {
    autocomplete: attr('autocomplete'),
    ...labels,
    questionHeading: '',
    name: attr('name'),
    id: el.id ?? '',
    placeholder,
    sectionText: section && section !== labels.labelFor && section !== labels.nearbyText ? section : '',
    inputType: el.tagName === 'INPUT' ? inputType(el) : '',
  };
}

/** @returns {{ disabled: boolean, readOnly: boolean, ariaHidden: boolean, visible: boolean }} */
export function elementState(el) {
  return {
    disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true' || !!el.closest('fieldset[disabled]'),
    readOnly: !!el.readOnly || el.getAttribute('aria-readonly') === 'true',
    ariaHidden: !!el.closest('[aria-hidden="true"]'),
    visible: isVisible(el),
  };
}

export const isRequired = (el, labelText) =>
  !!el.required || el.getAttribute('aria-required') === 'true' || /\*/.test(labelText ?? '');
