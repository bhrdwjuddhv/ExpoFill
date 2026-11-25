import { encodeTarget, targetGroups } from '@/lib/targets.js';

/** "What is this?" picker: profile fields by section, templates, Type a value…, Skip. */
export default function TargetSelect({ id, target, onChange, templates, profile, placeholder = 'What is this?', className = '' }) {
  return (
    <select id={id} className={`input ${className}`} value={encodeTarget(target)} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {targetGroups({ templates, profile }).map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
