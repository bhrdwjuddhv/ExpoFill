/**
 * Which embedded frames could ExpoFill not read? A frame listed by its parent is blocked when
 * no scanned frame came from its origin (activeTab covers the top page's site only).
 * @param {{ frameId: number, result?: { url?: string, frames?: { src: string, origin: string }[] } }[]} results
 *   chrome.scripting.executeScript results, one per frame we could reach
 * @returns {{ origin: string, src: string }[]} one entry per blocked origin
 */
export function findBlockedFrames(results) {
  const reached = new Set();
  for (const r of results) {
    try {
      if (r.result?.url) reached.add(new URL(r.result.url).origin);
    } catch {
      // about:blank and similar
    }
  }
  const blocked = new Map();
  for (const r of results)
    for (const f of r.result?.frames ?? []) if (!reached.has(f.origin) && !blocked.has(f.origin)) blocked.set(f.origin, f);
  return [...blocked.values()].map(({ origin, src }) => ({ origin, src }));
}
