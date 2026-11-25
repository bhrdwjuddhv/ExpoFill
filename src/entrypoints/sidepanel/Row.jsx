import { useId } from 'react';
import TargetSelect from '@/components/TargetSelect.jsx';
import { isPlaceholderOption } from '@/lib/engine/formatters/options.js';
import { questionText } from '@/lib/engine/normalize.js';
import { decodeTarget, targetLabel } from '@/lib/targets.js';

const CONTROL_TAG = {
  text: 'Text', email: 'Email', tel: 'Phone', number: 'Number', url: 'Link', date: 'Date', textarea: 'Long',
  contenteditable: 'Long', select: 'Dropdown', 'aria-combobox': 'Dropdown', 'radio-group': 'Choice',
  'checkbox-group': 'Multi', 'checkbox-single': 'Tick',
};
const CHOICE = new Set(['select', 'radio-group', 'aria-combobox']);
const LONG = new Set(['textarea', 'contenteditable']);

/** Editor for the value that will go in the field. */
function ValueEditor({ id, row, value, onOverride }) {
  const { field } = row;
  const realOptions = field.options.map((o, i) => ({ ...o, i })).filter((o) => !isPlaceholderOption(o.text));

  if (CHOICE.has(field.control) && realOptions.length > 1) {
    const current = row.override?.optionIndexes?.[0] ?? value.optionIndexes?.[0] ?? '';
    return (
      <select id={id} className="input" value={current} onChange={(e) => onOverride({ optionIndexes: [Number(e.target.value)] })}>
        <option value="">Choose…</option>
        {realOptions.map((o) => (
          <option key={o.i} value={o.i}>
            {o.text}
          </option>
        ))}
      </select>
    );
  }
  if (field.control === 'checkbox-group') {
    const picked = row.override?.optionIndexes ?? value.optionIndexes ?? [];
    return (
      <fieldset id={id} className="flex flex-col gap-1">
        <legend className="sr-only">Options to tick</legend>
        {realOptions.map((o) => (
          <label key={o.i} className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-violet"
              checked={picked.includes(o.i)}
              onChange={(e) => onOverride({ optionIndexes: e.target.checked ? [...picked, o.i].sort((a, b) => a - b) : picked.filter((x) => x !== o.i) })}
            />
            {o.text}
          </label>
        ))}
      </fieldset>
    );
  }
  if (field.control === 'checkbox-single') {
    const checked = row.override ? !!row.override.value : !!value.value;
    return (
      <label className="flex items-center gap-2">
        <input id={id} type="checkbox" className="h-4 w-4 accent-violet" checked={checked} onChange={(e) => onOverride({ value: e.target.checked })} />
        Tick this box
      </label>
    );
  }
  const text = row.override?.value ?? value.value ?? '';
  if (LONG.has(field.control) || row.target?.kind === 'template')
    return <textarea id={id} rows={5} className="input resize-y" value={text} onChange={(e) => onOverride({ value: e.target.value })} />;
  return <input id={id} className="input" value={text} onChange={(e) => onOverride({ value: e.target.value })} />;
}

/**
 * One reviewed field.
 * @param {{ row: object, value: object, ctx: object, onChange: (patch: object) => void, onShow: () => void,
 *   onSaveTemplate?: () => void }} props
 */
export default function Row({ row, value, ctx, onChange, onShow, onSaveTemplate }) {
  const ids = { value: useId(), tick: useId(), target: useId(), menu: useId() };
  const { field, c } = row;
  const excluded = c.status === 'excluded';
  const question = questionText(field).replace(/\s*\*\s*$/, '') || '(no label)';
  const skip = row.target?.kind === 'skip';
  const canFill = !excluded && !skip && !!row.target && !value.error;

  const setTarget = (v) => {
    const t = decodeTarget(v);
    onChange({
      target: t,
      taught: true,
      override: t?.kind === 'fixed' ? { value: '' } : undefined,
      ticked: !!t && t.kind !== 'skip',
    });
  };

  const suggestedTemplates = (c.templateIds ?? []).map((tid) => ctx.templates.find((t) => t.id === tid)).filter(Boolean);

  return (
    <li className={`card p-3 transition hover:shadow-md ${row.ticked ? 'ring-2 ring-violet/60' : ''}`}>
      <div className="flex items-start gap-2">
        <input
          id={ids.tick}
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 accent-violet"
          checked={row.ticked && canFill}
          disabled={!canFill}
          onChange={(e) => onChange({ ticked: e.target.checked })}
          aria-label={`Fill “${question}”`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button type="button" onClick={onShow} className="text-left font-semibold leading-snug hover:underline" title="Show on the page">
              {question}
              {field.required && <span className="ml-1 text-blaze" aria-label="required">*</span>}
            </button>
            <span className="shrink-0 rounded-full border border-ink/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider dark:border-white/20">
              {CONTROL_TAG[field.control] ?? field.control}
            </span>
          </div>
          <p className="muted mt-1 text-xs">{row.taught ? `You chose: ${targetLabel(row.target, ctx)}` : c.reason}</p>
        </div>
      </div>

      {!excluded && (
        <div className="mt-3 flex flex-col gap-2 pl-6">
          {!row.target && (
            <div>
              <label htmlFor={ids.target} className="label">
                What is this?
              </label>
              <TargetSelect id={ids.target} target={row.target} onChange={setTarget} templates={ctx.templates} profile={ctx.profile} />
            </div>
          )}

          {row.target && !skip && (
            <>
              {suggestedTemplates.length > 1 && row.target.kind === 'template' && (
                <select className="input" aria-label="Template" value={row.target.id} onChange={(e) => onChange({ target: { kind: 'template', id: e.target.value }, override: undefined })}>
                  {suggestedTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              )}
              <label htmlFor={ids.value} className="sr-only">
                Value for {question}
              </label>
              <ValueEditor id={ids.value} row={row} value={value} onOverride={(o) => onChange({ override: o, ticked: true })} />
              {value.error && !row.override && (
                <p className="text-xs font-medium text-blaze">
                  {value.error === 'empty' ? `Nothing saved for “${targetLabel(row.target, ctx)}” in your profile.` : value.error}
                </p>
              )}
            </>
          )}
          {skip && <p className="muted text-xs">Skipped on this site.</p>}

          <details className="group">
            <summary className="muted w-fit cursor-pointer list-none rounded-full px-2 text-lg leading-none hover:bg-ink/5 dark:hover:bg-white/10" aria-label="More options">
              …
            </summary>
            <div className="mt-2 flex flex-col gap-2 rounded-xl bg-paper p-3 dark:bg-neutral-950">
              <label htmlFor={ids.menu} className="label">
                Map to / use template / type a value / skip
              </label>
              <TargetSelect id={ids.menu} target={row.target} onChange={setTarget} templates={ctx.templates} profile={ctx.profile} placeholder="Choose…" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-violet" checked={row.global} onChange={(e) => onChange({ global: e.target.checked })} />
                Use on all sites
              </label>
              {onSaveTemplate && (
                <button type="button" className="btn-ghost w-fit text-sm" onClick={onSaveTemplate}>
                  Save as template
                </button>
              )}
            </div>
          </details>
        </div>
      )}
    </li>
  );
}
