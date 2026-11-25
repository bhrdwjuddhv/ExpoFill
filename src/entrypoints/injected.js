import { CAPTCHA_FRAME_PATTERN, MIN_FRAME_SIZE, MSG } from '@/lib/constants.js';
import { debug } from '@/lib/debug.js';
import { eventName } from '@/lib/engine/eventName.js';
import { fillPlan } from '@/lib/filler/filler.js';
import { clearMarks, flashField, showMarks } from '@/lib/filler/markers.js';
import { observeForms } from '@/lib/scanner/observer.js';
import { findPreset } from '@/lib/scanner/presets/index.js';
import { createScanner, listFrames } from '@/lib/scanner/scanner.js';

// The content script. Not in the manifest: injected on demand by the background with
// chrome.scripting.executeScript. An unlisted script rather than a WXT content script, so it
// sends no 'script started' signals the page could see.
// Holds page elements only; profile values arrive only inside FILL_REQUEST and are not kept.
export default defineUnlistedScript(() => {
  // Injection repeats on every scan; set up only once per frame.
  if (window.__expofill) return;

  const isTop = window === window.top;
  const skipFrame =
    !isTop && (CAPTCHA_FRAME_PATTERN.test(location.href) || innerWidth < MIN_FRAME_SIZE || innerHeight < MIN_FRAME_SIZE);

  let scanner = createScanner();
  let stopObserver = () => {};

  // Read by the background through executeScript({ func }), which runs in this same isolated world.
  window.__expofill = {
    scan() {
      stopObserver();
      clearMarks();
      const preset = findPreset(location.href, document);
      scanner = createScanner({ preset });
      const fields = skipFrame ? [] : scanner.scan(document);
      if (!skipFrame)
        stopObserver = observeForms(document, scanner, (added) => {
          debug('fields added', added.map((f) => f.fieldId));
          chrome.runtime.sendMessage({ type: MSG.FIELDS_ADDED, fields: added });
        });
      debug('scanned', fields.length, 'fields', isTop ? 'top frame' : 'subframe', preset?.name ?? '');
      return {
        isTop,
        url: location.href,
        domain: location.hostname,
        eventName: isTop ? eventName(document, preset?.title?.(document)) : '',
        fields,
        frames: skipFrame ? [] : listFrames(document),
      };
    },
  };

  const elementOf = (fieldId) => scanner.get(fieldId)?.el;

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === MSG.STOP_OBSERVING) stopObserver();
    if (msg?.type === MSG.CLEAR_MARKS) clearMarks();
    if (msg?.type === MSG.FOCUS_FIELD) {
      const el = elementOf(msg.fieldId);
      if (el?.isConnected) flashField(el);
    }
    if (msg?.type === MSG.FILL_REQUEST) {
      fillPlan(msg.plan, scanner).then((results) => {
        debug('filled', results.map((r) => `${r.fieldId}:${r.status}`));
        const kinds = { filled: 'filled', failed: 'failed', skipped: 'check' };
        const marks = [
          ...results.map((r) => ({ el: elementOf(r.fieldId), kind: kinds[r.status] })),
          ...Object.entries(msg.marks ?? {}).map(([fieldId, kind]) => ({ el: elementOf(fieldId), kind })),
        ].filter((m) => m.el?.isConnected);
        showMarks(marks);
        sendResponse({ type: MSG.FILL_RESULT, results });
      });
      return true; // async response
    }
    return false;
  });
});
