// Best guess at the event's name, for the {eventName} template placeholder.

/** "TechExpo 2026 | Eventbrite" → "TechExpo 2026" */
export const trimSiteName = (t) =>
  String(t ?? '')
    .split(/\s+[|\-–—]\s+/)[0]
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Order: preset title (Google Forms) → og:title → first visible h1 → document.title.
 * @param {Document} doc @param {string} [presetTitle]
 */
export function eventName(doc, presetTitle) {
  const og = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const h1 = [...doc.querySelectorAll('h1')].find((h) => h.textContent.trim() && !h.closest('[hidden]'))?.textContent;
  return trimSiteName(presetTitle || og || h1 || doc.title);
}
