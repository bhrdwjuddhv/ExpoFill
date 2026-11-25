// Side panel: reviewed rows → the fill plan sent to the page. Profile values appear only here.
import { formatValue } from './formatters/index.js';

/**
 * @typedef {{ field: object, target: object|null, ticked: boolean,
 *   override?: { value?: any, optionIndexes?: number[] } }} Row
 */

/** Does the form have its own country-code box (so phone numbers go in without +91)? */
export const hasCountryCodeField = (rows) =>
  rows.some((r) => r.ticked && r.target?.kind === 'profile' && r.target.key === 'phoneCountryCode');

/** What a row would put in its field, or { error }. */
export function rowValue(row, profile, ctx = {}) {
  const { field, override } = row;
  if (override?.optionIndexes)
    return { optionIndexes: override.optionIndexes, optionTexts: override.optionIndexes.map((i) => field.options[i]?.text ?? '') };
  if (override && 'value' in override) {
    if (override.value === '' || override.value == null) return { error: 'empty' };
    return field.control === 'checkbox-single' ? { value: !!override.value } : { value: override.value };
  }
  return formatValue(field, row.target, profile, ctx);
}

/**
 * @param {Row[]} rows in page order
 * @returns {{ plan: object[], problems: { fieldId: string, reason: string }[] }}
 */
export function buildPlan(rows, profile, ctx = {}) {
  const fullCtx = { ...ctx, hasCountryCodeField: hasCountryCodeField(rows) };
  const plan = [];
  const problems = [];
  for (const row of rows) {
    if (!row.ticked) continue;
    const v = rowValue(row, profile, fullCtx);
    if (v.error) problems.push({ fieldId: row.field.fieldId, reason: v.error });
    else plan.push({ fieldId: row.field.fieldId, frameId: row.field.frameId, control: row.field.control, ...v });
  }
  return { plan, problems };
}
