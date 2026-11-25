import { useState } from 'react';
import { deriveNames } from '@/lib/engine/formatters/name.js';
import { SECTIONS, customKey } from '@/lib/profile/schema.js';
import { Field, TagInput } from './ui.jsx';

const INPUT_TYPE = { email: 'email', tel: 'tel', url: 'url', number: 'number' };
const SECTION_COLORS = ['bg-violet text-white', 'bg-tofu text-ink', 'bg-blaze text-ink', 'bg-ink text-paper dark:bg-paper dark:text-ink'];

function Control({ id, def, value, onChange }) {
  if (def.type === 'select')
    return (
      <select id={id} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {def.options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  if (def.type === 'boolean')
    return (
      <label className="flex items-center gap-2 py-2">
        <input id={id} type="checkbox" className="h-4 w-4 accent-violet" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        Yes
      </label>
    );
  if (def.type === 'tags') return <TagInput id={id} value={value ?? []} onChange={onChange} placeholder="e.g. AI/ML, Web Development" />;
  if (def.type === 'textarea')
    return <textarea id={id} rows={3} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  return (
    <input
      id={id}
      type={INPUT_TYPE[def.type] ?? 'text'}
      className="input"
      value={value ?? ''}
      onChange={(e) => onChange(def.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)}
    />
  );
}

/**
 * Every profile section from the schema, plus custom fields.
 * @param {{ profile: object, onChange: (profile: object) => void, sections?: string[] }} props
 */
export default function ProfileForm({ profile, onChange, sections }) {
  const [newLabel, setNewLabel] = useState('');
  const values = profile.values ?? {};

  const set = (key, value) => {
    const next = { ...values, [key]: value };
    // First/last name follow the full name until the user edits them.
    if (key === 'fullName') {
      const before = deriveNames(values.fullName);
      const after = deriveNames(value);
      if (!values.firstName || values.firstName === before.firstName) next.firstName = after.firstName;
      if (!values.lastName || values.lastName === before.lastName) next.lastName = after.lastName;
    }
    onChange({ ...profile, values: next });
  };

  const addCustom = () => {
    const label = newLabel.trim();
    if (!label) return;
    const key = customKey(label);
    if (!(profile.customFields ?? []).some((c) => c.key === key))
      onChange({ ...profile, customFields: [...(profile.customFields ?? []), { key, label }] });
    setNewLabel('');
  };
  const removeCustom = (key) => {
    const { [key]: _drop, ...rest } = values;
    onChange({ ...profile, values: rest, customFields: profile.customFields.filter((c) => c.key !== key) });
  };

  const shown = SECTIONS.filter((s) => !sections || sections.includes(s.id));
  return (
    <div className="flex flex-col gap-6">
      {shown.map((section, i) => (
        <section key={section.id} className="card overflow-hidden">
          <h3 className={`display px-5 py-3 text-xl ${SECTION_COLORS[i % SECTION_COLORS.length]}`}>{section.title}</h3>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {section.fields.map((def) => (
              <div key={def.key} className={def.type === 'textarea' || def.type === 'tags' ? 'sm:col-span-2' : ''}>
                <Field label={def.label}>{(id) => <Control id={id} def={def} value={values[def.key]} onChange={(v) => set(def.key, v)} />}</Field>
              </div>
            ))}
          </div>
        </section>
      ))}

      {!sections && (
        <section className="card overflow-hidden">
          <h3 className="display bg-paper px-5 py-3 text-xl dark:bg-neutral-800">Custom fields</h3>
          <div className="flex flex-col gap-4 p-5">
            {(profile.customFields ?? []).map((c) => (
              <div key={c.key} className="flex items-end gap-2">
                <div className="flex-1">
                  <Field label={c.label}>
                    {(id) => <input id={id} className="input" value={values[c.key] ?? ''} onChange={(e) => set(c.key, e.target.value)} />}
                  </Field>
                </div>
                <button type="button" className="btn-ghost" onClick={() => removeCustom(c.key)}>
                  Remove
                </button>
              </div>
            ))}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Field label="New field label" hint="For questions ExpoFill doesn't know, like “Blood group” or “Roll number”.">
                  {(id) => (
                    <input
                      id={id}
                      className="input"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                    />
                  )}
                </Field>
              </div>
              <button type="button" className="btn-primary mb-5" onClick={addCustom}>
                Add
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
