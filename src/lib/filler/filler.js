// Runs a fill plan in the page. Receives final values only at fill time; keeps nothing.
import { exclusionReason } from '../engine/exclusions.js';
import { matchAny } from '../engine/formatters/options.js';
import { clean } from '../scanner/labelFinder.js';
import { selectAriaOption } from './ariaWidgets.js';
import { waitForSelectOptions } from './dependent.js';
import { isChecked, setContentEditable, setNativeValue, setSelectIndex, toggle } from './nativeSetter.js';

/**
 * @typedef {{ fieldId: string, control: string, value?: any, optionIndexes?: number[], optionTexts?: string[],
 *   candidates?: string[], parts?: { day: string, month: string, year: string } }} PlanItem
 * @typedef {{ fieldId: string, status: 'filled'|'failed'|'skipped', reason?: string }} FillResult
 */

const TEXT_CONTROLS = new Set(['text', 'email', 'tel', 'number', 'url', 'textarea']);

/** Last line of defence: never write into a protected field, whatever the plan says. */
function protectedReason(el) {
  const type = el.tagName === 'INPUT' ? (el.getAttribute('type') ?? 'text').toLowerCase() : '';
  return exclusionReason(
    { inputType: type, autocomplete: el.getAttribute('autocomplete') ?? '' },
    { disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true', readOnly: !!el.readOnly },
  );
}

async function fillOne(item, entry) {
  const { el, optionEls = [] } = entry;
  const ok = () => ({ status: 'filled' });
  const fail = (reason) => ({ status: 'failed', reason });

  if (TEXT_CONTROLS.has(item.control)) {
    setNativeValue(el, String(item.value));
    return el.value === String(item.value) ? ok() : fail('The page changed the value back');
  }
  if (item.control === 'contenteditable') {
    setContentEditable(el, String(item.value));
    return clean(el.textContent) === clean(item.value) ? ok() : fail('The page changed the text back');
  }
  if (item.control === 'date') {
    if (item.parts && optionEls.length > 1) {
      // Split Day / Month / Year boxes, in the order the scanner found them.
      const order = entry.dateParts ?? ['day', 'month', 'year'];
      optionEls.forEach((box, i) => setNativeValue(box, item.parts[order[i]] ?? ''));
      return optionEls.every((box, i) => box.value === (item.parts[order[i]] ?? '')) ? ok() : fail('Date not accepted');
    }
    setNativeValue(el, String(item.value));
    return el.value === String(item.value) ? ok() : fail('Date not accepted');
  }
  if (item.control === 'select') {
    await waitForSelectOptions(el); // Country → State → City: options may still be loading
    const options = [...el.options].map((o) => ({ text: clean(o.text), value: o.value }));
    let i = matchAny(options, [...(item.optionTexts ?? []), ...(item.candidates ?? []), item.value].filter(Boolean));
    if (i < 0 && item.optionIndexes?.length && item.optionIndexes[0] < options.length) i = item.optionIndexes[0];
    if (i < 0) return fail('No matching option');
    setSelectIndex(el, i);
    return el.selectedIndex === i ? ok() : fail('The page changed the choice back');
  }
  if (item.control === 'radio-group') {
    const target = optionEls[item.optionIndexes?.[0]];
    if (!target) return fail('No matching option');
    if (!isChecked(target)) toggle(target);
    return isChecked(target) ? ok() : fail('Could not select the option');
  }
  if (item.control === 'checkbox-group') {
    // Only ticks; never unticks what the user ticked.
    const targets = (item.optionIndexes ?? []).map((i) => optionEls[i]).filter(Boolean);
    for (const box of targets) if (!isChecked(box)) toggle(box);
    return targets.length && targets.every(isChecked) ? ok() : fail('Could not tick every option');
  }
  if (item.control === 'checkbox-single') {
    if (isChecked(el) !== !!item.value) toggle(el);
    return isChecked(el) === !!item.value ? ok() : fail('Could not change the tick');
  }
  if (item.control === 'aria-combobox') {
    const r = await selectAriaOption(el, { optionTexts: item.optionTexts, candidates: item.candidates, value: item.value });
    return r.ok ? ok() : fail(r.reason);
  }
  return { status: 'skipped', reason: `Unsupported control "${item.control}"` };
}

/**
 * Fills fields one at a time, in plan (page) order, and verifies each.
 * @param {PlanItem[]} plan
 * @param {{ get: (fieldId: string) => { el: Element, optionEls?: Element[] } | undefined }} scanner
 * @returns {Promise<FillResult[]>}
 */
export async function fillPlan(plan, scanner) {
  const results = [];
  for (const item of plan) {
    const entry = scanner.get(item.fieldId);
    let result;
    if (!entry || !entry.el.isConnected) result = { status: 'failed', reason: 'The field is no longer on the page' };
    else {
      const blocked = protectedReason(entry.el);
      result = blocked
        ? { status: 'skipped', reason: blocked }
        : await fillOne(item, entry).catch((e) => ({ status: 'failed', reason: e?.message || 'Unexpected error' }));
    }
    results.push({ fieldId: item.fieldId, ...result });
  }
  return results;
}

