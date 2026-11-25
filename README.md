# ExpoFill

A Manifest V3 browser extension (Chrome, Edge, Brave, Chromium 116+) that fills event registration forms (expos,
conferences, hackathons, seminars, college events, Google Forms) from a profile stored **only on your device**.
It uses rules, not AI. When it is unsure it asks, and it can remember the answer.

## Privacy

- Data lives in `chrome.storage.local` only. No sync, no page storage, no cookies.
- Zero network requests: no fetch, XHR, WebSocket, beacons, analytics, fonts or CDNs. Fonts are bundled.
- Production CSP: `script-src 'self'; object-src 'self'; connect-src 'none'`.
- `scripts/privacy-check.js` runs before every build and fails it on network APIs, other storage, or any URL in `src/`.
- The page script never stores the profile; it receives only the final values, at fill time.
- Logs contain field ids, keys and scores only, and are silent in production.
- Never fills passwords, OTP/PIN, CAPTCHA, card/CVV/expiry, UPI, bank/IFSC, Aadhaar, PAN, files, hidden, disabled or
  read-only fields, or consent/terms boxes. Never clicks submit/register/pay.

## Using it

1. Install (see [MANUAL.md](MANUAL.md)); the Welcome page opens. Fill in your profile.
2. On a registration form, click the ExpoFill icon or press **Alt+Shift+F**. The side panel lists every question
   in four groups: **Ready** (ticked), **Check these**, **Unknown** and **Skipped**.
3. Fix anything, tick what you want, press **Fill N fields**. Filled fields get a green outline on the page.
4. Optionally **Save what I taught**: ExpoFill remembers your answers on that site, and after the same answer on two
   sites it uses it everywhere. Manage this in **Learning center**.

## Development

```
npm install
npm run dev            # Chrome with hot reload (relaxed CSP)
npm run build          # privacy check + production build → .output/chrome-mv3
npm test               # unit tests + fixture accuracy table
npm run privacy-check
```

Stack: WXT, React, Tailwind CSS 3, Vitest + jsdom. JavaScript only (no TypeScript), JSDoc on important shapes.
Logo: `art/expofill.png` (source, not shipped); `public/icon-{16,32,48,128}.png` are resized copies of it.
Design: Shrikhand + DM Sans (bundled), Tofu Green / Electric Purple / Vibrant Orange / Black / Warm Off-White.

## How it works

```
icon click ─► background ─► injects src/entrypoints/injected.js into every reachable frame
                         ─► each frame scans itself (scanner/) and returns plain field descriptors
side panel ◄─ SCAN_RESULT ─ classifies each field (engine/classifier.js) against your profile,
                            learned rules and templates, and shows the review list
side panel ─► FILL_REQUEST (per frame) ─► filler/ sets values like a person typing, verifies, outlines
```

| Folder | What |
| --- | --- |
| `src/lib/constants.js` | every tunable: weights, thresholds, timeouts, storage keys, message types |
| `src/lib/storage.js` | `chrome.storage.local` access, export/import, delete all, migrations |
| `src/lib/profile/` | profile keys and sections |
| `src/lib/engine/` | text cleanup, fuzzy matching, dictionary, classifier, exclusions, learning, templates, formatters |
| `src/lib/scanner/` | generic scanner, label finder, shadow DOM, change observer, Google Forms preset |
| `src/lib/filler/` | native value setter, ARIA dropdowns, dependent dropdowns, on-page markers |
| `src/entrypoints/` | background, page script (`injected.js`), side panel, options page |
| `src/tests/` | unit tests and `fixtures/` (18 saved forms with `expected.json`) |

**Classification**, in order: excluded → site rule (100) → global rule (95 strong / 70 weak) → dictionary scoring
(signal weight × match quality, +5 per agreeing signal, −40 for negative words, capped at 60 when your value is not
an option) → `≥85` Ready, `60–84` Check, below Unknown. A close runner-up (within 15) never makes a field Ready.
Long free-text questions get template suggestions, never Ready.

## Changes from the original spec

- The content script is `src/entrypoints/injected.js` built as a WXT **unlisted script**. A WXT content script
  (`content.js`) announces itself to the page with `postMessage` and a DOM event carrying the extension id.
- The strict CSP applies to production builds; `npm run dev` needs a WebSocket to the dev server.
- The "Allow on Google Forms" pattern is read from the manifest, and test URLs live in `src/tests/fixtures/`, so the
  privacy check needs no exceptions.
- An unlinked `<label>` right before a field counts as its label (very common markup).
- Fields entirely off the page (spam-trap honeypots) count as hidden.
- Side panel → page messages (`FILL_REQUEST`, `FOCUS_FIELD`, `CLEAR_MARKS`) go straight to the frame with
  `chrome.tabs.sendMessage`; two internal messages were added (`STOP_OBSERVING`, `PANEL_HELLO`).
- A weak (fuzzy) global rule does not override a dictionary match scoring above 70.
- Learned answers are saved when you press **Save what I taught** after a fill (an explicit click), rather than
  silently on fill.
- The UI follows the bold retro design system that was requested, instead of the neutral one in the spec; white
  text is used only on purple, because white on green or orange fails contrast.

## Known limits

- Linear-scale and grid questions in Google Forms are not filled.
- Fields added later inside a shadow root are found on **Rescan**, not automatically.
- Cross-origin embedded forms need a one-time **Allow** per site.
- Typeform-style one-question-at-a-time forms are untested.
- Data is stored unencrypted in the browser profile (stated in Settings).
