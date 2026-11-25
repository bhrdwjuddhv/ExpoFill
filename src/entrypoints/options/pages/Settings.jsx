import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog, Field, useToast } from '@/components/ui.jsx';
import { THRESHOLDS } from '@/lib/constants.js';
import { deleteAll, exportAll, getSettings, importAll, saveSettings } from '@/lib/storage.js';
import PageTitle from './PageTitle.jsx';

function Card({ title, children, tone = '' }) {
  return (
    <section className={`card p-6 ${tone}`}>
      <h2 className="display text-2xl">{title}</h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [origins, setOrigins] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState('');
  const [toastNode, toast] = useToast();
  const fileRef = useRef(null);

  const loadOrigins = () => chrome.permissions.getAll().then((p) => setOrigins(p.origins ?? []));
  useEffect(() => {
    getSettings().then(setSettings);
    loadOrigins();
    chrome.permissions.onAdded.addListener(loadOrigins);
    chrome.permissions.onRemoved.addListener(loadOrigins);
    return () => {
      chrome.permissions.onAdded.removeListener(loadOrigins);
      chrome.permissions.onRemoved.removeListener(loadOrigins);
    };
  }, []);
  if (!settings) return null;

  const setThreshold = async (key, value) => {
    const next = { ...settings, [key]: Math.max(0, Math.min(100, Number(value) || 0)) };
    setSettings(next);
    await saveSettings(next);
  };

  const download = async () => {
    const blob = new Blob([await exportAll()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `expofill-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = async (file) => {
    if (!file) return;
    const result = await importAll(await file.text());
    setImportErrors(result.errors);
    if (result.ok) {
      setSettings(await getSettings());
      toast('Imported. Your data was replaced with the file.');
    }
    fileRef.current.value = '';
  };

  return (
    <>
      <PageTitle title="Settings">Backups, permissions and the delete button.</PageTitle>
      <div className="flex flex-col gap-5">
        <Card title="Always allowed sites">
          <p className="muted">Sites where ExpoFill may read embedded forms without a click on its icon. Remove any you no longer want.</p>
          {origins.length ? (
            <ul className="flex flex-col gap-2">
              {origins.map((o) => (
                <li key={o} className="flex items-center justify-between gap-2 rounded-xl bg-paper px-3 py-2 dark:bg-neutral-950">
                  <code className="truncate text-sm">{o}</code>
                  <button type="button" className="btn-ghost px-3 py-1 text-sm" onClick={() => chrome.permissions.remove({ origins: [o] }).then(loadOrigins)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">None yet.</p>
          )}
        </Card>

        <Card title="Backup">
          <p className="muted">Export everything (profile, learned answers, templates, settings) to a file, or bring it back on another computer.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={download}>
              Export to a file
            </button>
            <label className="btn-ghost cursor-pointer">
              Import a file
              <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => upload(e.target.files[0])} />
            </label>
          </div>
          {importErrors.length > 0 && (
            <div role="alert" className="rounded-xl bg-blaze p-3 text-ink">
              <p className="font-semibold">Could not import this file:</p>
              <ul className="list-disc pl-5 text-sm">
                {importErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <details className="card p-6">
          <summary className="display cursor-pointer text-2xl">Matching thresholds (advanced)</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Ready from score" hint={`Auto-ticked at or above this. Default ${THRESHOLDS.ready}.`}>
              {(id) => <input id={id} type="number" min="0" max="100" className="input" value={settings.readyThreshold} onChange={(e) => setThreshold('readyThreshold', e.target.value)} />}
            </Field>
            <Field label="Suggest from score" hint={`Shown but not ticked at or above this. Default ${THRESHOLDS.suggested}.`}>
              {(id) => (
                <input id={id} type="number" min="0" max="100" className="input" value={settings.suggestedThreshold} onChange={(e) => setThreshold('suggestedThreshold', e.target.value)} />
              )}
            </Field>
          </div>
        </details>

        <Card title="Delete all my data" tone="border-blaze/40">
          <p className="muted">
            Your data is stored unencrypted in this Chrome profile on this computer. Anyone with access to your computer account could read it.
          </p>
          <button type="button" className="btn-warn w-fit" onClick={() => setConfirm(true)}>
            Delete all my data
          </button>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Delete everything?"
        confirmLabel="Delete all"
        danger
        confirmDisabled={typed !== 'DELETE'}
        onCancel={() => {
          setConfirm(false);
          setTyped('');
        }}
        onConfirm={async () => {
          await deleteAll();
          setConfirm(false);
          setTyped('');
          setSettings(await getSettings());
          toast('All ExpoFill data deleted');
        }}
      >
        <p>Your profile, learned answers, templates and settings will be removed from this computer. This cannot be undone.</p>
        <Field label="Type DELETE to confirm">{(id) => <input id={id} className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />}</Field>
      </ConfirmDialog>
      {toastNode}
    </>
  );
}
