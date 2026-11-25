import { useEffect, useState } from 'react';
import TargetSelect from '@/components/TargetSelect.jsx';
import { useToast } from '@/components/ui.jsx';
import { editRule, promoteRule, undoRule } from '@/lib/engine/learning.js';
import { deleteRule, getProfile, getRules, getTemplates, saveRule } from '@/lib/storage.js';
import { decodeTarget, targetLabel } from '@/lib/targets.js';
import PageTitle from './PageTitle.jsx';

const when = (t) => (t ? new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function Learning() {
  const [rules, setRules] = useState([]);
  const [ctx, setCtx] = useState({ templates: [], profile: null });
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [fixed, setFixed] = useState('');
  const [toastNode, toast] = useToast();

  const load = async () => {
    const [r, templates, profile] = await Promise.all([getRules(), getTemplates(), getProfile()]);
    setRules(r.sort((a, b) => (b.lastUsedAt ?? b.updatedAt) - (a.lastUsedAt ?? a.updatedAt)));
    setCtx({ templates, profile });
  };
  useEffect(() => void load(), []);

  const put = async (rule, msg) => {
    await saveRule(rule);
    await load();
    if (msg) toast(msg);
  };
  const q = query.trim().toLowerCase();
  const shown = rules.filter(
    (r) => !q || r.questionText.toLowerCase().includes(q) || (r.domain ?? 'all sites').includes(q) || targetLabel(r.target, ctx).toLowerCase().includes(q),
  );

  return (
    <>
      <PageTitle title="Learning center">
        Answers you taught ExpoFill. Site answers apply on one site; once the same answer is taught on two sites it is used everywhere.
      </PageTitle>
      <label htmlFor="search" className="sr-only">
        Search learned answers
      </label>
      <input id="search" className="input mb-4 max-w-md" placeholder="Search questions, sites, answers…" value={query} onChange={(e) => setQuery(e.target.value)} />

      {!rules.length && (
        <div className="card p-6">
          <p className="display text-2xl">Nothing learned yet</p>
          <p className="muted mt-2">When you correct a field in the side panel and choose “Save what I taught”, it shows up here.</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {shown.map((r) => (
          <li key={r.id} className="card p-4 transition hover:-translate-y-0.5 motion-reduce:transform-none">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{r.questionText || '(no question text)'}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${r.scope === 'global' ? 'bg-violet text-white' : 'bg-tofu text-ink'}`}>
                    {r.scope === 'global' ? 'All sites' : r.domain}
                  </span>
                  <span>→ {targetLabel(r.target, ctx)}</span>
                </p>
                <p className="muted mt-1 text-xs">
                  Used {r.timesUsed}× · last used {when(r.lastUsedAt)}
                  {r.scope === 'global' && r.seenOnDomains.length > 0 && ` · seen on ${r.seenOnDomains.join(', ')}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className="btn-ghost px-3 py-1 text-sm" onClick={() => setEditing(editing === r.id ? null : r.id)}>
                  Edit
                </button>
                {r.scope === 'site' && (
                  <button type="button" className="btn-ghost px-3 py-1 text-sm" onClick={() => put(promoteRule(r, rules), 'Now used on all sites')}>
                    Use on all sites
                  </button>
                )}
                {r.history.length > 0 && (
                  <button type="button" className="btn-ghost px-3 py-1 text-sm" onClick={() => put(undoRule(r), 'Undone')}>
                    Undo last change
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost px-3 py-1 text-sm text-blaze"
                  onClick={async () => {
                    await deleteRule(r.id);
                    await load();
                    toast('Deleted');
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            {editing === r.id && (
              <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-paper p-3 dark:bg-neutral-950">
                <div className="min-w-[14rem] flex-1">
                  <label htmlFor={`t-${r.id}`} className="label">
                    Maps to
                  </label>
                  <TargetSelect
                    id={`t-${r.id}`}
                    target={r.target}
                    templates={ctx.templates}
                    profile={ctx.profile}
                    onChange={(v) => {
                      if (v === 'fixed') return setFixed(r.target.kind === 'fixed' ? String(r.target.value) : '');
                      if (v) put(editRule(r, decodeTarget(v)), 'Updated').then(() => setEditing(null));
                    }}
                  />
                </div>
                <div className="min-w-[10rem] flex-1">
                  <label htmlFor={`f-${r.id}`} className="label">
                    Or a fixed value
                  </label>
                  <input id={`f-${r.id}`} className="input" value={fixed} onChange={(e) => setFixed(e.target.value)} />
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!fixed.trim()}
                  onClick={() => put(editRule(r, { kind: 'fixed', value: fixed.trim() }), 'Updated').then(() => setEditing(null))}
                >
                  Save value
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {toastNode}
    </>
  );
}
