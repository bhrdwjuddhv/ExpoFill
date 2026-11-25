# ExpoFill: manual steps

Everything here is done by hand. Commands run from the project folder.

## 1. Install, build, load

```
npm install
npm run build        # privacy check, then the production build into .output/chrome-mv3
```

**Chrome:** open `chrome://extensions`, turn on **Developer mode** (top right), click **Load unpacked**, pick the folder
`.output/chrome-mv3` (the folder itself, not the project folder).

**Edge:** `edge://extensions`, turn on **Developer mode** (left sidebar), **Load unpacked**, same folder.

**Brave:** `brave://extensions`, **Developer mode**, **Load unpacked**, same folder.

What you should see: no "read and change data on websites" warning at install, and the Welcome page opens in a new tab.
Pin the icon (puzzle-piece menu → pin ExpoFill).

**After a code change:** `npm run build`, then the reload arrow on the ExpoFill card, then reload the page you test on.

**Dev mode:** `npm run dev` opens a separate Chrome with ExpoFill loaded and reloads on save. That build has a relaxed
CSP (WXT needs a local WebSocket for hot reload) and adds the `tabs` permission and a localhost host permission. Use
`npm run build` to test what you would ship.

**Debugging:** background → "service worker" link on the extension card. Side panel → right-click inside it → Inspect.
Page side → the page's own DevTools console. Debug logs appear only in `npm run dev` builds, and only ever contain field
ids, counts and statuses, never your values.

## 2. Tests

```
npm test             # all unit tests + the fixture accuracy table
npm run test:watch   # re-run on save
npm run privacy-check
```

`npm test` prints a table with one line per fixture (fields, correct, wrong-ready, accuracy). It fails if any field is
wrong **and** ready, if a reported field is missing from `expected.json`, or if accuracy on known fields drops below 95 %.

Windows: `npm test` goes through `scripts/vitest.js`, which works around Vitest failing when the terminal reports the
drive as `c:` instead of `C:`. Run tests through npm, not `npx vitest`.

## 3. Turning a real registration page into a fixture

1. Open the page in Chrome. **File → Save page as… → "Webpage, HTML only"**.
2. Create `src/tests/fixtures/NN-short-name/` and save the file there as `form.html`.
3. Clean it up:
   - Remove anything personal (pre-filled values, names, emails, tokens, tracking ids, reCAPTCHA site keys).
   - Delete `<script src=…>` tags that load site code. Keep, or write, a small inline `<script>` only when it models
     behaviour you want to test (a dropdown that opens on click, options that load after a delay).
   - Trim unrelated page chrome if you like; keep the form and the text around it.
4. If the page is a Google Form, add `page.json` with its URL, for example
   `{ "url": "https://docs.google.com/forms/d/e/<id>/viewform" }`, so the Google Forms preset is used.
5. Write `expected.json`: one entry per question, keyed by a CSS selector (`"#email"`, `"input[name=mobile]"`) or by
   the question text (needed for shadow DOM and Google Forms). The value is a profile key (`"email"`, `"phone"`,
   `"organization"`… see `src/lib/profile/schema.js`), `"unknown"` (ExpoFill should not guess), or `"excluded"` (must
   never be filled, or is hidden).
6. `npm test`. A row marked `(unlisted)` in the failure means a field ExpoFill reports that you didn't list: add it.
7. If something is wrong: add aliases or negative words in `src/lib/engine/dictionary.js`, or tune the scanner.
   Never "fix" a fixture by changing its expected answer unless the expectation itself was wrong.

## 4. Live Google Forms

1. Allow Google Forms once: Welcome page → **Allow on Google Forms**, or the "Allow" banner the first time you meet an
   embedded form. You can remove it under **Settings → Always allowed sites**.
2. Open any Google Form (`docs.google.com/forms/...`) and click the icon. You should see each question with its heading
   text. Linear scales and grids show as Unknown with "not supported yet".
3. Fill, check: short answers, paragraphs, multiple choice, checkboxes, dropdowns, dates.
4. Multi-section forms: click **Next** in the form; new questions appear in the panel within about half a second.
5. Embedded in another site: the panel shows "This form is embedded from docs.google.com. Allow ExpoFill on this site?"
   Allow → it rescans and the questions appear. Or **Open form in new tab**.

**If Google changes its markup** (questions stop appearing, or Google Forms fixtures still pass but live forms fail):
open `src/lib/scanner/presets/googleForms.js`. All selectors are the `SEL` and `ATTR` constants at the top. In DevTools
on a live form, check that each question is still an element with `role="listitem"` containing a `role="heading"`,
radios are `role="radio"` with `data-value`, checkboxes `role="checkbox"` with `data-answer-value`, and dropdowns
`role="listbox"` with `role="option"` children. Update the constants (roles/ARIA/data attributes only, never class
names), save a fresh snapshot as a fixture (section 3) and run `npm test`.

## 5. Manual test script: 10 live sites

Use a test profile, not your real one, until you trust the results. On each site: click the icon, read the panel
**before** filling, fill, then check the page. **Do not submit** anything you don't mean to.

Try one live form on each of these kinds of site:

1. A standalone Google Form (college fest or meetup registration).
2. A Google Form embedded in an event website (the Allow banner).
3. A WordPress expo site using Gravity Forms, especially a "gfembed" form inside an iframe (like the one that found
   nothing before).
4. An Eventbrite event's registration questions.
5. A Konfhub or Townscript conference registration.
6. A hackathon platform registration (Devfolio, Unstop or similar).
7. A Luma (lu.ma) event's registration questions.
8. A Microsoft Forms registration.
9. A Zoho Forms, JotForm or HubSpot form on a company event page.
10. A college or government seminar form with Country → State → City dropdowns.

For each, note:

| What to note | Why |
| --- | --- |
| **Missed fields**: questions on the page not in the panel | scanner gaps (shadow DOM, odd widgets, frames) |
| **Wrong fields**: a field mapped to the wrong profile key, *especially if it was Ready (green)* | the most serious kind: Ready fields are pre-ticked |
| **Unknowns you'd expect it to know** | missing aliases in `dictionary.js` |
| **Failed fills**: the summary's "not filled" list and its reason | widget handling (custom dropdowns, date pickers) |
| **Values that reverted** after you clicked elsewhere on the page | framework state not updated |
| **Dependent dropdowns**: did State/City fill after Country? | `filler/dependent.js` timing |
| **Embedded frames**: did the Allow banner appear when needed? | frame detection |
| **Anything sensitive in the list** that wasn't Skipped | exclusion keywords |

Send back: the site (or a saved, cleaned fixture), the question text, what ExpoFill showed (status, mapped field,
reason) and what it should have been.

## 6. Privacy checks to repeat before you share a build

- `npm run build` passes (the privacy check runs first).
- DevTools → Network tab on the side panel, options page, background service worker and a scanned page: no requests
  from ExpoFill.
- Settings → **Delete all my data** → type DELETE. Then in the background console run
  `chrome.storage.local.get(null).then(console.log)`: it prints `{}`.
