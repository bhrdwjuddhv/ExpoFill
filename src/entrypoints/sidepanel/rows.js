// Review-list state helpers (pure).
import { tokens } from '@/lib/engine/normalize.js';

/** One review row per field. Only Ready rows start ticked. */
export const makeRows = (fields, classifications) =>
  fields.map((field, i) => {
    const c = classifications[i];
    return {
      key: `${field.frameId}:${field.fieldId}`,
      field,
      c,
      target: c.status === 'excluded' ? null : c.target,
      ticked: c.status === 'ready',
      override: undefined, // value typed / picked in the panel
      taught: false, // target changed by the user
      global: false, // "Use on all sites"
    };
  });

/** The answer to remember for a row: a typed value becomes a fixed value. */
export function teachTarget(row) {
  const { override, field, target } = row;
  if (!override) return target;
  if (override.optionIndexes) {
    const texts = override.optionIndexes.map((i) => field.options[i]?.text).filter(Boolean);
    return { kind: 'fixed', value: field.control === 'checkbox-group' ? texts : texts[0] };
  }
  return { kind: 'fixed', value: override.value };
}

/** Rows whose answer the user changed: candidates for "Save what I taught". */
export const taughtRows = (rows) => rows.filter((r) => (r.taught || r.override || r.global) && teachTarget(r));

/** A new template from an edited long answer. */
export const templateFrom = (question, text) => ({
  title: question.length > 60 ? `${question.slice(0, 57)}…` : question || 'Untitled',
  category: 'General',
  keywords: [...new Set(tokens(question).filter((t) => t.length > 2))].slice(0, 6),
  text,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

/** Profile has the basics? */
export const profileLooksEmpty = (profile) => !['fullName', 'email', 'phone'].some((k) => profile?.values?.[k]);

/** Group fill-plan items by frame, keeping page order inside each frame. */
export function byFrame(plan) {
  const map = new Map();
  for (const { frameId, ...item } of plan) {
    if (!map.has(frameId)) map.set(frameId, []);
    map.get(frameId).push(item);
  }
  return map;
}
