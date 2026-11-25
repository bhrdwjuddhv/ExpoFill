// Targets ("what goes in this field") as text for the UI, and as <select> values.
import { SECTIONS, keyLabel } from './profile/schema.js';

/** @returns {string} e.g. "Email", "Template: Why attend", "Fixed: Seed", "Skip" */
export function targetLabel(target, { templates = [], profile } = {}) {
  if (!target) return 'Nothing';
  if (target.kind === 'profile') return keyLabel(target.key, profile);
  if (target.kind === 'template') return `Template: ${templates.find((t) => t.id === target.id)?.title ?? 'deleted template'}`;
  if (target.kind === 'fixed') return `Fixed: ${Array.isArray(target.value) ? target.value.join(', ') : String(target.value)}`;
  return 'Skip';
}

/** <select> value for a target. */
export const encodeTarget = (t) =>
  !t ? '' : t.kind === 'profile' ? `p:${t.key}` : t.kind === 'template' ? `t:${t.id}` : t.kind === 'fixed' ? 'fixed' : 'skip';

/** Target for a <select> value ("fixed" needs its value set separately). */
export function decodeTarget(v, fixedValue = '') {
  if (!v) return null;
  if (v.startsWith('p:')) return { kind: 'profile', key: v.slice(2) };
  if (v.startsWith('t:')) return { kind: 'template', id: v.slice(2) };
  if (v === 'fixed') return { kind: 'fixed', value: fixedValue };
  return { kind: 'skip' };
}

/** Option groups for a "What is this?" picker. */
export function targetGroups({ templates = [], profile } = {}) {
  const groups = SECTIONS.map((s) => ({ label: s.title, options: s.fields.map((f) => ({ value: `p:${f.key}`, label: f.label })) }));
  const custom = profile?.customFields ?? [];
  if (custom.length) groups.push({ label: 'Custom', options: custom.map((c) => ({ value: `p:${c.key}`, label: c.label })) });
  if (templates.length) groups.push({ label: 'Templates', options: templates.map((t) => ({ value: `t:${t.id}`, label: t.title || 'Untitled' })) });
  groups.push({ label: 'Other', options: [{ value: 'fixed', label: 'Type a value…' }, { value: 'skip', label: 'Skip on this site' }] });
  return groups;
}
