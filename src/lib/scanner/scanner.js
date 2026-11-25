// Generic form scanner: page elements → plain field descriptors (safe to send by message).
// Elements are never marked; they are kept in a private Map keyed by fieldId.
import { CAPTCHA_FRAME_PATTERN, MIN_FRAME_SIZE } from '../constants.js';
import { exclusionReason } from '../engine/exclusions.js';
import { byIds, clean, nearbyText, sectionText, textOf, labelElements } from './labelFinder.js';
import { controlOf, elementSignals, elementState, isRequired } from './signals.js';
import { countControls, deepElements, isVisible, parentOf } from './shadow.js';

/**
 * @typedef {{ fieldId: string, frameId: number|null, control: string, required: boolean,
 *   signals: object, options: { text: string, value: string }[], maxLength: number|null,
 *   pattern: string|null, presetName: string|null, excluded: boolean, excludeReason: string|null }} FieldDescriptor
 */

const GROUP_CONTAINER = 'fieldset,[role=radiogroup],[role=group]';

/** A one-box checkbox question ("I agree to the code of conduct") is judged by its option text too. */
const exclusionSignals = (signals, control, options) =>
  control === 'checkbox-group' && options.length === 1
    ? { ...signals, ariaLabel: `${signals.ariaLabel} ${options[0].text}`.trim() }
    : signals;

function commonAncestor(nodes) {
  for (let a = parentOf(nodes[0]); a; a = parentOf(a)) if (nodes.every((n) => a.contains(n))) return a;
  return nodes[0].ownerDocument.body;
}

/** Text describing one radio/checkbox option. */
function optionText(input) {
  const fromLabel = clean(labelElements(input).map((l) => textOf(l)).join(' '));
  if (fromLabel) return fromLabel;
  const aria = clean(input.getAttribute('aria-label'));
  if (aria) return aria;
  for (let s = input.nextSibling; s; s = s.nextSibling) {
    if (s.nodeType === 1 && countControls(s)) break;
    const t = textOf(s);
    if (t) return t;
  }
  return input.value ?? '';
}

/** Question text for a radio/checkbox group. */
function groupLabels(lca, inputs) {
  const out = { labelFor: '', ariaLabelledby: '', ariaLabel: '', nearbyText: '' };
  const container = lca.closest(GROUP_CONTAINER);
  if (container && countControls(container) === inputs.length) {
    const legend = container.tagName === 'FIELDSET' ? container.querySelector(':scope > legend') : null;
    if (legend) out.labelFor = textOf(legend);
    out.ariaLabelledby = clean(byIds(container, 'aria-labelledby').map((e) => textOf(e)).join(' '));
    out.ariaLabel = clean(container.getAttribute('aria-label'));
    if (out.labelFor || out.ariaLabelledby || out.ariaLabel) return out;
  }
  // Question text inside the container, before the options ("Areas of interest" above the boxes).
  const before = [];
  for (const child of lca.children) {
    if (countControls(child)) break;
    if (child.tagName !== 'LEGEND' && isVisible(child)) before.push(textOf(child));
  }
  out.labelFor = clean(before.join(' '));
  if (!out.labelFor) out.nearbyText = nearbyText(lca).text;
  return out;
}

/** Combobox options already in the DOM (aria-controls / aria-owns listbox). */
function comboOptions(el) {
  return [...byIds(el, 'aria-controls'), ...byIds(el, 'aria-owns')]
    .flatMap((list) => [...list.querySelectorAll('[role=option]')])
    .map((o) => ({ text: textOf(o) || clean(o.textContent), value: o.getAttribute('data-value') ?? clean(o.textContent) }));
}

/** @param {{ preset?: object|null }} [opts] */
export function createScanner({ preset = null } = {}) {
  /** @type {Map<string, { el: Element, optionEls?: Element[] }>} */
  const elements = new Map();
  const seen = new WeakSet();
  const prefix = Math.random().toString(36).slice(2, 6); // keeps ids unique across frames
  let next = 1;
  // Stable numbers for forms / containers, used in group keys.
  const nodeIds = new WeakMap();
  let nodeCounter = 0;
  const nodeId = (node) => {
    if (!nodeIds.has(node)) nodeIds.set(node, ++nodeCounter);
    return nodeIds.get(node);
  };

  const register = (desc, entry) => {
    const fieldId = `f${prefix}_${next++}`;
    elements.set(fieldId, entry);
    return { fieldId, frameId: null, presetName: null, ...desc };
  };

  function single(el, control) {
    const state = elementState(el);
    if (!state.visible) return null; // reported later by the observer if it appears
    const signals = elementSignals(el);
    const options =
      control === 'select'
        ? [...el.options].map((o) => ({ text: clean(o.text), value: o.value }))
        : control === 'aria-combobox'
          ? comboOptions(el)
          : [];
    const reason = exclusionReason(signals, state);
    seen.add(el);
    return register(
      {
        control,
        required: isRequired(el, signals.labelFor || signals.ariaLabelledby),
        signals,
        options,
        maxLength: el.maxLength > 0 ? el.maxLength : null,
        pattern: el.getAttribute('pattern'),
        excluded: !!reason,
        excludeReason: reason,
      },
      { el },
    );
  }

  function group(kind, inputs) {
    const shown = inputs.filter((i) => isVisible(i) || labelElements(i).some(isVisible));
    if (!shown.length) return null;
    if (kind === 'checkbox' && inputs.length === 1) return single(inputs[0], 'checkbox-single');
    const lca = commonAncestor(inputs);
    const labels = groupLabels(lca, inputs);
    const signals = {
      autocomplete: '',
      ...labels,
      questionHeading: '',
      name: inputs[0].getAttribute('name') ?? '',
      id: '',
      placeholder: '',
      sectionText: sectionText(lca),
      inputType: kind,
    };
    if (signals.sectionText === labels.labelFor) signals.sectionText = '';
    const state = { ...elementState(inputs[0]), visible: true, disabled: inputs.every((i) => elementState(i).disabled) };
    const options = inputs.map((i) => ({ text: optionText(i), value: i.value ?? '' }));
    const control = kind === 'radio' ? 'radio-group' : 'checkbox-group';
    const reason = exclusionReason(exclusionSignals(signals, control, options), state);
    inputs.forEach((i) => seen.add(i));
    return register(
      {
        control: kind === 'radio' ? 'radio-group' : 'checkbox-group',
        required: inputs.some((i) => isRequired(i)) || /\*/.test(labels.labelFor),
        signals,
        options: inputs.map((i) => ({ text: optionText(i), value: i.value ?? '' })),
        maxLength: null,
        pattern: null,
        excluded: !!reason,
        excludeReason: reason,
      },
      { el: inputs[0], optionEls: inputs },
    );
  }

  /** A preset (Google Forms) question → descriptor. */
  function fromPreset(q) {
    seen.add(q.container);
    if (!isVisible(q.container)) {
      seen.delete(q.container); // may become visible later
      return null;
    }
    const signals = {
      autocomplete: '',
      labelFor: '',
      ariaLabelledby: '',
      ariaLabel: '',
      questionHeading: q.questionText,
      name: '',
      id: '',
      placeholder: '',
      nearbyText: '',
      sectionText: '',
      inputType: q.inputType ?? '',
    };
    const first = q.elements[0];
    const reason = exclusionReason(exclusionSignals(signals, q.control, q.options), { ...elementState(first ?? q.container), visible: true });
    return register(
      {
        control: q.control,
        required: q.required,
        signals,
        options: q.options,
        maxLength: first?.maxLength > 0 ? first.maxLength : null,
        pattern: first?.getAttribute?.('pattern') ?? null,
        presetName: preset.name,
        excluded: !!reason,
        excludeReason: reason,
        ...(q.unsupported && { unsupported: q.unsupported }),
        ...(q.parts && { dateParts: q.parts }),
      },
      { el: first ?? q.container, optionEls: q.elements, container: q.container, dateParts: q.parts },
    );
  }

  /**
   * Scans `root` (document, shadow root or element) for fields not seen before.
   * @returns {FieldDescriptor[]}
   */
  function scan(root) {
    if (preset) return preset.getQuestions(root).filter((q) => !seen.has(q.container)).map(fromPreset).filter(Boolean);
    const raw = [];
    for (const el of deepElements(root)) {
      if (seen.has(el)) continue;
      const kind = controlOf(el);
      if (kind) raw.push({ el, kind });
    }
    // Checkbox names shared by 2+ boxes form a group; otherwise group by container.
    const nameCount = new Map();
    for (const { el, kind } of raw)
      if (kind === 'checkbox' && el.name) nameCount.set(el.name, (nameCount.get(el.name) ?? 0) + 1);

    const items = [];
    const groups = new Map();
    for (const { el, kind } of raw) {
      if (kind !== 'radio' && kind !== 'checkbox') {
        items.push({ el, kind });
        continue;
      }
      const scope = nodeId(el.form ?? el.getRootNode());
      let key;
      if (el.name && (kind === 'radio' || nameCount.get(el.name) > 1)) key = `${kind}|${scope}|${el.name}`;
      else {
        const container = el.closest(GROUP_CONTAINER) ?? findQuestionContainer(el);
        key = container ? `${kind}|c${nodeId(container)}` : `${kind}|e${nodeId(el)}`;
      }
      if (!groups.has(key)) {
        groups.set(key, []);
        items.push({ key, kind });
      }
      groups.get(key).push(el);
    }
    return items.map((it) => (it.key ? group(it.kind, groups.get(it.key)) : single(it.el, it.kind))).filter(Boolean);
  }

  return { scan, elements, get: (fieldId) => elements.get(fieldId) };
}

/**
 * Visible child frames of this document that could hold a form, for the
 * "embedded from another site" check. CAPTCHA and tiny frames are left out.
 * @returns {{ src: string, origin: string }[]}
 */
export function listFrames(doc) {
  const out = [];
  for (const el of deepElements(doc)) {
    if (el.tagName !== 'IFRAME' || !el.src || CAPTCHA_FRAME_PATTERN.test(el.src)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < MIN_FRAME_SIZE || r.height < MIN_FRAME_SIZE || !isVisible(el)) continue;
    let origin;
    try {
      origin = new URL(el.src, doc.baseURI).origin;
    } catch {
      continue;
    }
    if (origin !== 'null') out.push({ src: el.src, origin });
  }
  return out;
}

/** Nearest ancestor (3 levels) whose class looks like a question wrapper. */
function findQuestionContainer(el) {
  let cur = parentOf(el);
  for (let i = 0; i < 3 && cur; i++, cur = parentOf(cur))
    if (/question|form-group|field|checkbox-group|options/i.test(cur.getAttribute('class') ?? '')) return cur;
  return null;
}
