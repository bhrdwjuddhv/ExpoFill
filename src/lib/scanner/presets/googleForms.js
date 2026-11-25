// Google Forms. It has no <label>s and its class names are obfuscated and change, so this
// preset reads roles, ARIA and data attributes only. Never use class names here.
import { clean, textOf } from '../labelFinder.js';

// Verify against live Google Forms; Google changes markup.
// If questions stop being found, these are the constants to update.
export const SEL = {
  question: '[role="listitem"]', // one per question (also used for checkbox options, which have no heading)
  heading: '[role="heading"]', // question text; a trailing "*" marks required
  formTitle: '[role="heading"][aria-level="1"]', // the form's title
  textInput: 'input[type="text"],input[type="email"],input[type="url"],input[type="number"],input[type="tel"],input:not([type])',
  textarea: 'textarea',
  radiogroup: '[role="radiogroup"]',
  radio: '[role="radio"]', // multiple choice option
  checkbox: '[role="checkbox"]', // checkbox option
  listbox: '[role="listbox"]', // dropdown (click to open, then pick a [role=option])
  option: '[role="option"]',
  dateInput: 'input[type="date"]',
  timeInput: 'input[type="time"]',
  dateParts: 'input[aria-label]', // older date questions: separate Day / Month / Year boxes
  required: '[aria-required="true"]',
};
export const ATTR = {
  radioValue: 'data-value',
  checkboxValue: 'data-answer-value',
  optionValue: 'data-value',
  otherOption: '__other_option__', // data-value of the "Other:" choice
};

const optionText = (el, attr) => {
  const v = el.getAttribute(attr) ?? el.getAttribute('aria-label') ?? textOf(el);
  return v === ATTR.otherOption ? 'Other' : clean(v);
};

/** The question container holding `node`: the nearest listitem that has a heading. */
function questionOf(node) {
  for (let li = node.closest?.(SEL.question); li; li = li.parentElement?.closest(SEL.question))
    if (li.querySelector(SEL.heading)) return li;
  return null;
}

/** 1–10 style choices: a linear scale. */
const isLinearScale = (opts) =>
  opts.length >= 3 && opts.every((o, i) => /^\d+$/.test(o.text) && (i === 0 || Number(o.text) === Number(opts[i - 1].text) + 1));

const DATE_PART = { day: /\bday\b/i, month: /\bmonth\b/i, year: /\byear\b/i };

/**
 * @typedef {{ container: Element, questionText: string, required: boolean, control: string,
 *   elements: Element[], options: { text: string, value: string }[], inputType?: string,
 *   parts?: string[], unsupported?: string }} PresetQuestion
 */

/** @returns {PresetQuestion|null} */
function describe(li) {
  const heading = li.querySelector(SEL.heading);
  const raw = clean(heading.textContent);
  const questionText = raw.replace(/\s*\*\s*$/, '');
  const required = /\*\s*$/.test(raw) || !!li.querySelector(SEL.required);
  const base = { container: li, questionText, required, options: [] };

  if (li.querySelectorAll(SEL.radiogroup).length > 1)
    return { ...base, control: 'radio-group', elements: [...li.querySelectorAll(SEL.radio)], unsupported: 'Grid questions are not supported yet' };

  const radios = [...li.querySelectorAll(SEL.radio)];
  if (radios.length) {
    const options = radios.map((r) => ({ text: optionText(r, ATTR.radioValue), value: r.getAttribute(ATTR.radioValue) ?? '' }));
    const unsupported = isLinearScale(options) ? 'Linear scale questions are not supported yet' : undefined;
    return { ...base, control: 'radio-group', elements: radios, options, ...(unsupported && { unsupported }) };
  }

  const boxes = [...li.querySelectorAll(SEL.checkbox)];
  if (boxes.length)
    return {
      ...base,
      control: 'checkbox-group',
      elements: boxes,
      options: boxes.map((b) => ({ text: optionText(b, ATTR.checkboxValue), value: b.getAttribute(ATTR.checkboxValue) ?? '' })),
    };

  const listbox = li.querySelector(SEL.listbox);
  if (listbox)
    return {
      ...base,
      control: 'aria-combobox',
      elements: [listbox],
      options: [...listbox.querySelectorAll(SEL.option)].map((o) => ({
        text: clean(o.getAttribute(ATTR.optionValue) || textOf(o)),
        value: o.getAttribute(ATTR.optionValue) ?? '',
      })),
    };

  const date = li.querySelector(SEL.dateInput) ?? li.querySelector(SEL.timeInput);
  if (date) return { ...base, control: 'date', elements: [date], inputType: date.type };

  const parts = Object.entries(DATE_PART)
    .map(([part, re]) => [part, [...li.querySelectorAll(SEL.dateParts)].find((i) => re.test(i.getAttribute('aria-label')))])
    .filter(([, el]) => el);
  if (parts.length >= 2)
    return { ...base, control: 'date', elements: parts.map(([, el]) => el), parts: parts.map(([p]) => p), inputType: 'date' };

  const textarea = li.querySelector(SEL.textarea);
  if (textarea) return { ...base, control: 'textarea', elements: [textarea] };

  const input = li.querySelector(SEL.textInput);
  if (input) {
    const type = (input.getAttribute('type') || 'text').toLowerCase();
    return { ...base, control: ['email', 'url', 'number', 'tel'].includes(type) ? type : 'text', elements: [input], inputType: type };
  }
  return null; // section header or description block
}

export default {
  name: 'googleForms',
  match: (url) => /docs\.google\.com\/forms\//.test(url),
  title: (doc) => clean(doc.querySelector(SEL.formTitle)?.textContent),
  /** @param {ParentNode} root @returns {PresetQuestion[]} */
  getQuestions(root) {
    const items = new Set();
    const own = root.nodeType === 1 ? questionOf(root) : null;
    if (own) items.add(own);
    for (const li of root.querySelectorAll(SEL.question)) {
      const q = questionOf(li);
      if (q) items.add(q);
    }
    return [...items].map(describe).filter(Boolean);
  },
};
