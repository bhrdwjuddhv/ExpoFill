import { useEffect, useMemo, useRef, useState } from 'react';
import { Burst, Circles } from '@/components/Decor.jsx';
import { StatusChip, useToast } from '@/components/ui.jsx';
import { MSG, OPTIONS_PAGE } from '@/lib/constants.js';
import { classifyFields } from '@/lib/engine/classifier.js';
import { markUsed, teach } from '@/lib/engine/learning.js';
import { questionText } from '@/lib/engine/normalize.js';
import { buildPlan, hasCountryCodeField, rowValue } from '@/lib/engine/plan.js';
import { getProfile, getRules, getSettings, getTemplates, saveRule, saveTemplate } from '@/lib/storage.js';
import { connectPanel } from './connection.js';
import Row from './Row.jsx';
import { byFrame, makeRows, profileLooksEmpty, taughtRows, teachTarget, templateFrom } from './rows.js';

const GROUPS = [
  { status: 'ready', title: 'Ready', open: true },
  { status: 'suggested', title: 'Check these', open: true },
  { status: 'unknown', title: 'Unknown', open: true },
  { status: 'excluded', title: 'Skipped', open: false },
];

const loadCtx = async () => {
  const [profile, rules, templates, settings] = await Promise.all([getProfile(), getRules(), getTemplates(), getSettings()]);
  return { profile, rules, templates, settings };
};

const openOptions = (route) => chrome.tabs.create({ url: chrome.runtime.getURL(`${OPTIONS_PAGE}#/${route}`) });

function Message({ title, children }) {
  return (
    <div className="card m-3 flex flex-col items-start gap-3 p-5 motion-safe:animate-reveal">
      <Circles className="h-14 w-14" />
      <h2 className="display text-2xl">{title}</h2>
      <div className="muted">{children}</div>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState('scanning'); // scanning | blocked | changed | review | filling | done
  const [scan, setScan] = useState(null);
  const [ctx, setCtx] = useState({ profile: { values: {} }, rules: [], templates: [], settings: {} });
  const [rows, setRows] = useState([]);
  const [eventName, setEventName] = useState('');
  const [fill, setFill] = useState(null); // { results, saved }
  const [toastNode, toast] = useToast();
  const conn = useRef(null);
  const live = useRef({ ctx, scan });
  live.current = { ctx, scan };

  useEffect(() => {
    conn.current = connectPanel(async (msg) => {
      if (msg.type === MSG.SCAN_RESULT) {
        if (msg.error) return setPhase('blocked');
        const loaded = await loadCtx();
        setCtx(loaded);
        setScan(msg);
        setEventName(msg.eventName);
        setRows(makeRows(msg.fields, classifyFields(msg.fields, { ...loaded, domain: msg.domain })));
        setFill(null);
        setPhase('review');
      } else if (msg.type === MSG.FIELDS_ADDED) {
        const { ctx: c, scan: s } = live.current;
        if (!s) return;
        setRows((rs) => [...rs, ...makeRows(msg.fields, classifyFields(msg.fields, { ...c, domain: s.domain }))]);
      } else if (msg.type === MSG.TAB_CHANGED) {
        setPhase('changed');
      }
    });
    conn.current.requestScan();
    // Profile or templates edited in the options page: refresh the values shown here.
    const onStorage = (_changes, area) => area === 'local' && loadCtx().then(setCtx);
    chrome.storage.onChanged.addListener(onStorage);
    return () => {
      conn.current.close();
      chrome.storage.onChanged.removeListener(onStorage);
    };
  }, []);

  const valueCtx = { templates: ctx.templates, eventName, hasCountryCodeField: hasCountryCodeField(rows) };
  const values = useMemo(
    () => new Map(rows.map((r) => [r.key, r.target ? rowValue(r, ctx.profile, valueCtx) : { error: 'Nothing chosen' }])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, ctx, eventName],
  );
  const fillable = rows.filter((r) => r.ticked && !values.get(r.key)?.error);

  const update = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const send = (msg, frameId) =>
    chrome.tabs.sendMessage(scan.tabId, msg, frameId == null ? undefined : { frameId }).catch(() => null);
  const show = (row) => send({ type: MSG.FOCUS_FIELD, fieldId: row.field.fieldId }, row.field.frameId);

  const rescan = () => {
    setPhase('scanning');
    conn.current.requestScan();
  };

  async function doFill() {
    setPhase('filling');
    // Only rows that can actually be filled; a ticked row with no value is not an error.
    const sendable = rows.map((r) => (fillable.includes(r) ? r : { ...r, ticked: false }));
    const { plan, problems } = buildPlan(sendable, ctx.profile, { templates: ctx.templates, eventName });
    // Fields left unticked get an outline too: blue = unknown, orange = check.
    const marks = new Map();
    for (const r of rows)
      if (!r.ticked && (r.c.status === 'unknown' || r.c.status === 'suggested'))
        marks.set(r.field.frameId, { ...marks.get(r.field.frameId), [r.field.fieldId]: r.c.status === 'unknown' ? 'unknown' : 'check' });
    const frames = byFrame(plan);
    const results = [];
    for (const frameId of new Set([...frames.keys(), ...marks.keys()])) {
      const items = frames.get(frameId) ?? [];
      const res = await send({ type: MSG.FILL_REQUEST, plan: items, marks: marks.get(frameId) ?? {} }, frameId);
      if (res?.results) results.push(...res.results.map((r) => ({ ...r, frameId })));
      else results.push(...items.map((i) => ({ fieldId: i.fieldId, frameId, status: 'failed', reason: 'The page changed. Rescan and try again.' })));
    }
    for (const p of problems) {
      const row = rows.find((r) => r.field.fieldId === p.fieldId);
      results.push({ fieldId: p.fieldId, frameId: row?.field.frameId, status: 'failed', reason: p.reason === 'empty' ? 'No value to fill' : p.reason });
    }
    // Count uses of learned rules.
    for (const r of rows) {
      const rule = r.c.ruleId && ctx.rules.find((x) => x.id === r.c.ruleId);
      if (rule && results.some((x) => x.fieldId === r.field.fieldId && x.status === 'filled')) await saveRule(markUsed(rule));
    }
    setFill({ results, saved: false });
    setPhase('done');
  }

  async function saveTaught() {
    let rules = await getRules();
    for (const r of taughtRows(rows)) {
      const saved = teach(rules, r.field, teachTarget(r), scan.domain, { global: r.global });
      for (const rule of saved) await saveRule(rule);
      const ids = new Set(saved.map((x) => x.id));
      rules = [...rules.filter((x) => !ids.has(x.id)), ...saved];
    }
    setCtx((c) => ({ ...c, rules }));
    setFill((f) => ({ ...f, saved: true }));
    toast('Saved. ExpoFill will remember next time.');
  }

  async function saveAsTemplate(row) {
    const t = await saveTemplate(templateFrom(questionText(row.field), row.override.value));
    setCtx((c) => ({ ...c, templates: [...c.templates, t] }));
    toast('Saved as a template');
  }

  const rowOf = (result) => rows.find((r) => r.field.fieldId === result.fieldId && r.field.frameId === result.frameId) ?? rows.find((r) => r.field.fieldId === result.fieldId);
  const counts = fill && {
    filled: fill.results.filter((r) => r.status === 'filled').length,
    failed: fill.results.filter((r) => r.status === 'failed'),
    skipped: fill.results.filter((r) => r.status === 'skipped').length,
  };
  const toTeach = taughtRows(rows);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="relative overflow-hidden rounded-b-block bg-violet px-4 pb-4 pt-3 text-white">
        <Burst className="absolute -bottom-10 -right-8 h-28 w-28 text-tofu opacity-40" />
        <div className="relative flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-display text-2xl leading-none">
            <img src="/icon-128.png" alt="" className="h-8 w-8" />
            ExpoFill
          </p>
          <div className="flex gap-1.5">
            <button type="button" onClick={rescan} className="btn bg-white/15 px-3 py-1 text-sm text-white hover:bg-white/25">
              Rescan
            </button>
            {scan && (
              <button type="button" onClick={() => send({ type: MSG.CLEAR_MARKS })} className="btn bg-white/15 px-3 py-1 text-sm text-white hover:bg-white/25">
                Clear marks
              </button>
            )}
          </div>
        </div>
        {scan && (
          <div className="relative mt-3">
            <p className="truncate text-xs uppercase tracking-widest text-white/75">{scan.domain}</p>
            <label htmlFor="event" className="sr-only">
              Event name
            </label>
            <input
              id="event"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Event name"
              className="mt-1 w-full rounded-xl border border-white/30 bg-white/10 px-3 py-1.5 font-semibold text-white placeholder:text-white/60 focus-visible:outline-tofu"
            />
          </div>
        )}
      </header>

      {phase === 'scanning' && <Message title="Scanning…">Reading the form on this page.</Message>}
      {phase === 'blocked' && (
        <Message title="Click the icon on the form">ExpoFill can only read a page after you click its icon (or press Alt+Shift+F) on that page.</Message>
      )}
      {phase === 'changed' && <Message title="Page changed">Click the ExpoFill icon to scan again.</Message>}

      {(phase === 'review' || phase === 'filling' || phase === 'done') && scan && (
        <main className="flex flex-1 flex-col gap-3 p-3 pb-28">
          {profileLooksEmpty(ctx.profile) && (
            <div className="rounded-card bg-blaze p-4 text-ink">
              <p className="font-semibold">Your profile is empty.</p>
              <p className="text-sm">Add your details once and ExpoFill can fill them on every form.</p>
              <button type="button" className="btn mt-2 bg-ink text-paper" onClick={() => openOptions('profile')}>
                Set up profile
              </button>
            </div>
          )}

          {scan.blockedFrames.map((f) => {
            const host = new URL(f.origin).host;
            return (
              <div key={f.origin} className="rounded-card bg-tofu p-4 text-ink">
                <p className="font-semibold">This form is embedded from {host}. Allow ExpoFill on this site?</p>
                <p className="text-sm">Clicking the icon only lets ExpoFill read {scan.domain}. You can remove this later in Settings.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn bg-ink text-paper"
                    onClick={() => chrome.permissions.request({ origins: [`${f.origin}/*`] }).then((ok) => ok && rescan())}
                  >
                    Allow
                  </button>
                  <button type="button" className="btn border border-ink/30" onClick={() => chrome.tabs.create({ url: f.src })}>
                    Open form in new tab
                  </button>
                </div>
              </div>
            );
          })}

          {phase === 'done' && counts && (
            <section className="card p-4 motion-safe:animate-reveal" aria-live="polite">
              <h2 className="display text-2xl">Done</h2>
              <p className="mt-1 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-tofu px-2.5 py-0.5 font-semibold text-ink">{counts.filled} filled</span>
                <span className="rounded-full bg-blaze px-2.5 py-0.5 font-semibold text-ink">{counts.failed.length} not filled</span>
                <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 font-semibold text-ink dark:bg-neutral-700 dark:text-paper">{counts.skipped} skipped</span>
              </p>
              {counts.failed.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {counts.failed.map((r) => {
                    const row = rowOf(r);
                    return (
                      <li key={`${r.frameId}:${r.fieldId}`} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0">
                          <span className="font-medium">{row ? questionText(row.field) : r.fieldId}</span>
                          <span className="muted block text-xs">{r.reason}</span>
                        </span>
                        {row && (
                          <button type="button" className="btn-ghost shrink-0 px-3 py-1 text-xs" onClick={() => show(row)}>
                            Show me
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="muted mt-3 text-xs">ExpoFill never submits. Check the page, then submit it yourself.</p>
              {toTeach.length > 0 && !fill.saved && (
                <div className="mt-3 rounded-xl bg-paper p-3 dark:bg-neutral-950">
                  <p className="text-sm font-semibold">Remember your answers for next time?</p>
                  <ul className="muted mt-1 list-disc pl-5 text-xs">
                    {toTeach.map((r) => (
                      <li key={r.key}>{questionText(r.field)}{r.global ? ' (all sites)' : ''}</li>
                    ))}
                  </ul>
                  <button type="button" className="btn-primary mt-2" onClick={saveTaught}>
                    Save what I taught ({toTeach.length})
                  </button>
                </div>
              )}
              <button type="button" className="btn-ghost mt-3" onClick={() => setPhase('review')}>
                Back to the list
              </button>
            </section>
          )}

          {phase !== 'done' && !rows.length && (
            <Message title="No form found">There are no fields ExpoFill can fill on this page.</Message>
          )}

          {phase !== 'done' &&
            GROUPS.map((g) => {
              const list = rows.filter((r) => r.c.status === g.status);
              if (!list.length) return null;
              return (
                <details key={g.status} open={g.open} className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-2 py-1">
                    <span className="display text-xl">{g.title}</span>
                    <StatusChip status={g.status} />
                    <span className="muted text-sm">({list.length})</span>
                    <span className="muted ml-auto text-xs transition group-open:rotate-180" aria-hidden="true">
                      ▾
                    </span>
                  </summary>
                  <ul className="mt-2 flex flex-col gap-2">
                    {list.map((row) => (
                      <Row
                        key={row.key}
                        row={row}
                        value={values.get(row.key)}
                        ctx={ctx}
                        onChange={(p) => update(row.key, p)}
                        onShow={() => show(row)}
                        onSaveTemplate={
                          ['textarea', 'contenteditable'].includes(row.field.control) && row.override?.value
                            ? () => saveAsTemplate(row)
                            : undefined
                        }
                      />
                    ))}
                  </ul>
                </details>
              );
            })}
        </main>
      )}

      {phase !== 'done' && scan && rows.length > 0 && (phase === 'review' || phase === 'filling') && (
        <footer className="fixed inset-x-0 bottom-0 border-t border-ink/10 bg-paper/95 p-3 backdrop-blur dark:border-white/10 dark:bg-ink/95">
          <button type="button" className="btn-go w-full py-3 text-base font-bold" disabled={!fillable.length || phase === 'filling'} onClick={doFill}>
            {phase === 'filling' ? 'Filling…' : `Fill ${fillable.length} field${fillable.length === 1 ? '' : 's'}`}
          </button>
          <p className="muted mt-1.5 text-center text-[11px]">Your data stays on this device. ExpoFill never submits.</p>
        </footer>
      )}
      {toastNode}
    </div>
  );
}
