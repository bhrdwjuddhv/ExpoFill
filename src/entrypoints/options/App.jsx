import { useSyncExternalStore } from 'react';
import Learning from './pages/Learning.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import Templates from './pages/Templates.jsx';

const ROUTES = [
  ['onboarding', 'Welcome', Onboarding],
  ['profile', 'Profile', Profile],
  ['learning', 'Learning center', Learning],
  ['templates', 'Templates', Templates],
  ['settings', 'Settings', Settings],
];

const subscribe = (cb) => (window.addEventListener('hashchange', cb), () => window.removeEventListener('hashchange', cb));
const useRoute = () => useSyncExternalStore(subscribe, () => location.hash.replace(/^#\/?/, '') || 'profile');

export default function App() {
  const route = useRoute();
  const Page = ROUTES.find(([r]) => r === route)?.[2] ?? Profile;
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row md:gap-10 md:px-8">
      <nav aria-label="Sections" className="md:sticky md:top-6 md:h-fit md:w-56 md:shrink-0">
        <a href="#/profile" className="mb-4 flex items-center gap-2">
          <img src="/icon-128.png" alt="" className="h-10 w-10" />
          <span className="font-display text-3xl leading-none">ExpoFill</span>
        </a>
        <ul className="flex flex-wrap gap-1.5 rounded-full bg-white p-1.5 shadow-sm dark:bg-neutral-900 md:flex-col md:rounded-card">
          {ROUTES.map(([r, label]) => (
            <li key={r}>
              <a
                href={`#/${r}`}
                aria-current={r === route ? 'page' : undefined}
                className="block rounded-full px-4 py-2 font-medium transition hover:bg-ink/5 aria-[current=page]:bg-ink aria-[current=page]:text-paper dark:hover:bg-white/10 dark:aria-[current=page]:bg-paper dark:aria-[current=page]:text-ink"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <p className="muted mt-4 hidden text-xs md:block">Everything stays on this device. No account, no servers.</p>
      </nav>
      <main className="min-w-0 flex-1 pb-24">
        <Page />
      </main>
    </div>
  );
}
