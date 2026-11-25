import { useEffect, useState } from 'react';
import { Burst, Circles, Spiral } from '@/components/Decor.jsx';
import ProfileForm from '@/components/ProfileForm.jsx';
import { Field, Reveal, useToast } from '@/components/ui.jsx';
import { CATEGORIES } from '@/lib/engine/templates.js';
import { getProfile, saveProfile, saveTemplate } from '@/lib/storage.js';

const PROMISES = [
  ['Stays on this device', 'Your details are stored only in this browser profile. Nothing is ever sent anywhere.', 'bg-tofu text-ink'],
  ['No account', 'No sign-up, no servers, no tracking. ExpoFill makes zero network requests.', 'bg-violet text-white'],
  ['You stay in charge', 'You review every field first. ExpoFill never submits, registers or pays.', 'bg-blaze text-ink'],
];

// The Google Forms pattern comes from the manifest, so it is written in one place only.
const googleFormsOrigin = () => chrome.runtime.getManifest().optional_host_permissions?.find((p) => p.includes('docs.google.com'));

function Step({ n, title, children }) {
  return (
    <Reveal>
      <section className="card relative overflow-hidden p-6">
        <span className="display absolute right-5 top-1 text-[6rem] leading-none text-violet/15 dark:text-white/10" aria-hidden="true">
          {n}
        </span>
        <h2 className="display relative text-3xl">{title}</h2>
        <div className="relative mt-4">{children}</div>
      </section>
    </Reveal>
  );
}

export default function Onboarding() {
  const [profile, setProfile] = useState(null);
  const [gfGranted, setGfGranted] = useState(false);
  const [tpl, setTpl] = useState({ category: 'General', title: '', text: '' });
  const [toastNode, toast] = useToast();

  useEffect(() => {
    getProfile().then(setProfile);
    const origin = googleFormsOrigin();
    if (origin) chrome.permissions.contains({ origins: [origin] }).then(setGfGranted);
  }, []);

  const allowGoogleForms = async () => {
    const ok = await chrome.permissions.request({ origins: [googleFormsOrigin()] });
    setGfGranted(ok);
    if (ok) toast('Google Forms allowed');
  };

  const addTemplate = async () => {
    if (!tpl.text.trim()) return;
    await saveTemplate({ ...tpl, title: tpl.title || `${tpl.category} answer`, keywords: [], createdAt: Date.now(), updatedAt: Date.now() });
    setTpl({ category: tpl.category, title: '', text: '' });
    toast('Template saved');
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-block bg-violet px-6 py-10 text-white md:px-10 md:py-14">
        <Spiral className="absolute -right-10 -top-10 h-56 w-56 text-white/15" />
        <Burst className="absolute bottom-6 right-10 h-16 w-16 text-tofu" />
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Event forms, filled in seconds</p>
        <h1 className="display mt-3 max-w-xl text-6xl md:text-7xl">Hello, ExpoFill</h1>
        <p className="mt-4 max-w-lg text-lg text-white/90">
          Click the ExpoFill icon (or press <kbd className="rounded-md bg-white/20 px-1.5 py-0.5 font-mono text-sm">Alt+Shift+F</kbd>) on any
          registration form. ExpoFill reads the questions, you check the answers, it fills them in.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {PROMISES.map(([title, text, color], i) => (
          <Reveal key={title}>
            <div className={`h-full rounded-card p-5 ${color}`} style={{ animationDelay: `${i * 80}ms` }}>
              <h2 className="display text-2xl">{title}</h2>
              <p className="mt-2 opacity-90">{text}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Step n="1" title="Your details">
        <p className="muted mb-4">Fill in what you like; empty fields are simply never filled. You can change this any time under Profile.</p>
        {profile && <ProfileForm profile={profile} onChange={setProfile} />}
        <button
          type="button"
          className="btn-go mt-4 px-6 py-3 font-bold"
          onClick={async () => {
            setProfile(await saveProfile(profile));
            toast('Profile saved on this device');
          }}
        >
          Save profile
        </button>
      </Step>

      <Step n="2" title="Google Forms (optional)">
        <p className="muted max-w-2xl">
          Many events use Google Forms, often embedded inside their own website. Allowing docs.google.com/forms lets ExpoFill read those
          forms too. Still nothing is sent anywhere.
        </p>
        <button type="button" className="btn-primary mt-4" onClick={allowGoogleForms} disabled={gfGranted}>
          {gfGranted ? 'Allowed on Google Forms ✓' : 'Allow on Google Forms'}
        </button>
      </Step>

      <Step n="3" title="Answer templates (optional)">
        <p className="muted max-w-2xl">
          Questions like “Why do you want to attend?” need a few sentences. Write one or two answers now, or skip and add them later under
          Templates. Placeholders like <code>{'{eventName}'}</code> and <code>{'{organization}'}</code> fill themselves in.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            {(id) => (
              <select id={id} className="input" value={tpl.category} onChange={(e) => setTpl({ ...tpl, category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Title">{(id) => <input id={id} className="input" value={tpl.title} onChange={(e) => setTpl({ ...tpl, title: e.target.value })} placeholder="Why I attend tech events" />}</Field>
          <div className="sm:col-span-2">
            <Field label="Answer">
              {(id) => (
                <textarea
                  id={id}
                  rows={4}
                  className="input"
                  value={tpl.text}
                  onChange={(e) => setTpl({ ...tpl, text: e.target.value })}
                  placeholder="I want to attend {eventName} to learn about {interests} and meet people building in this space."
                />
              )}
            </Field>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={addTemplate} disabled={!tpl.text.trim()}>
            Save template
          </button>
          <a href="#/profile" className="btn-ghost">
            Skip for now
          </a>
        </div>
      </Step>

      <Reveal>
        <section className="flex items-center gap-4 rounded-block bg-ink p-6 text-paper dark:bg-paper dark:text-ink">
          <Circles className="h-16 w-16 shrink-0" />
          <div>
            <h2 className="display text-3xl">You're set</h2>
            <p className="mt-1 opacity-80">Open any event registration form and click the ExpoFill icon.</p>
          </div>
        </section>
      </Reveal>
      {toastNode}
    </div>
  );
}
