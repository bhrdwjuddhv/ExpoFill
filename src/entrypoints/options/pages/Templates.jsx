import { useEffect, useRef, useState } from 'react';
import { Field, TagInput, useToast } from '@/components/ui.jsx';
import { CATEGORIES, CATEGORY_KEYWORDS, PLACEHOLDERS, fillPlaceholders } from '@/lib/engine/templates.js';
import { deleteTemplate, getProfile, getTemplates, saveTemplate } from '@/lib/storage.js';
import PageTitle from './PageTitle.jsx';

const CATEGORY_COLOR = {
  Technology: 'bg-violet text-white',
  Cybersecurity: 'bg-ink text-paper dark:bg-paper dark:text-ink',
  Networking: 'bg-tofu text-ink',
  Entrepreneurship: 'bg-blaze text-ink',
  Education: 'bg-violet text-white',
  General: 'bg-tofu text-ink',
};
const blank = () => ({ title: '', category: 'General', keywords: [], text: '' });

export default function Templates() {
  const [list, setList] = useState([]);
  const [draft, setDraft] = useState(null);
  const [profile, setProfile] = useState(null);
  const [toastNode, toast] = useToast();
  const textRef = useRef(null);

  const load = () => getTemplates().then(setList);
  useEffect(() => {
    load();
    getProfile().then(setProfile);
  }, []);

  const save = async () => {
    const now = Date.now();
    const saved = await saveTemplate({ ...draft, createdAt: draft.createdAt ?? now, updatedAt: now });
    setDraft(saved);
    await load();
    toast('Template saved');
  };

  const insert = (name) => {
    const el = textRef.current;
    const at = el?.selectionStart ?? draft.text.length;
    const text = `${draft.text.slice(0, at)}{${name}}${draft.text.slice(at)}`;
    setDraft({ ...draft, text });
    requestAnimationFrame(() => el?.focus());
  };

  return (
    <>
      <PageTitle title="Templates">
        Your own answers for long questions. ExpoFill suggests them (never ticks them) and you can edit the text before filling.
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="flex flex-col gap-3">
          <button type="button" className="btn-primary w-fit" onClick={() => setDraft(blank())}>
            New template
          </button>
          {!list.length && <p className="muted">No templates yet.</p>}
          <ul className="grid gap-3">
            {list.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setDraft(t)}
                  aria-current={draft?.id === t.id ? 'true' : undefined}
                  className="card w-full p-4 text-left transition hover:scale-[1.01] aria-[current=true]:ring-2 aria-[current=true]:ring-violet motion-reduce:transform-none"
                >
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${CATEGORY_COLOR[t.category] ?? 'bg-tofu text-ink'}`}>
                    {t.category}
                  </span>
                  <span className="mt-2 block font-semibold">{t.title || 'Untitled'}</span>
                  <span className="muted mt-1 line-clamp-2 block text-sm">{t.text || 'Empty: write your answer.'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {draft && (
          <section className="card flex flex-col gap-4 p-6 motion-safe:animate-reveal">
            <h2 className="display text-3xl">{draft.id ? 'Edit template' : 'New template'}</h2>
            <Field label="Title">{(id) => <input id={id} className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />}</Field>
            <Field label="Category">
              {(id) => (
                <select id={id} className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Keywords" hint={`Questions containing these get this template suggested. ${draft.category} already covers: ${(CATEGORY_KEYWORDS[draft.category] ?? []).join(', ')}.`}>
              {(id) => <TagInput id={id} value={draft.keywords ?? []} onChange={(keywords) => setDraft({ ...draft, keywords })} />}
            </Field>
            <div>
              <label htmlFor="tpl-text" className="label">
                Answer
              </label>
              <textarea id="tpl-text" ref={textRef} rows={7} className="input" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
              <p className="muted mt-2 text-xs">Insert a placeholder:</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {PLACEHOLDERS.map((p) => (
                  <button key={p} type="button" className="btn-ghost px-2.5 py-1 font-mono text-xs" onClick={() => insert(p)}>
                    {`{${p}}`}
                  </button>
                ))}
              </div>
            </div>
            {draft.text && (
              <div className="rounded-xl bg-paper p-3 text-sm dark:bg-neutral-950">
                <p className="label">Preview</p>
                <p className="whitespace-pre-wrap">{fillPlaceholders(draft.text, { profile, eventName: 'TechExpo 2026' })}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-go font-bold" onClick={save} disabled={!draft.text.trim()}>
                Save
              </button>
              {draft.id && (
                <button
                  type="button"
                  className="btn-ghost text-blaze"
                  onClick={async () => {
                    await deleteTemplate(draft.id);
                    setDraft(null);
                    await load();
                    toast('Deleted');
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </section>
        )}
      </div>
      {toastNode}
    </>
  );
}
