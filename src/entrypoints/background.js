import { CONTENT_SCRIPT_FILE, MSG, OPTIONS_PAGE, SIDEPANEL_PORT } from '@/lib/constants.js';
import { debug } from '@/lib/debug.js';
import { findBlockedFrames } from '@/lib/frames.js';

/** windowId → { port, tabId } for each open side panel. */
const panels = new Map();

const panelForTab = (tabId) => [...panels.values()].find((p) => p.tabId === tabId);

/**
 * Injects the content script into every frame we may access, scans each frame and merges the results.
 * Frames ExpoFill cannot access (cross-origin without permission) are simply absent from the results.
 */
async function scanTab(tabId) {
  try {
    const target = { tabId, allFrames: true };
    await chrome.scripting.executeScript({ target, files: [CONTENT_SCRIPT_FILE] });
    const results = await chrome.scripting.executeScript({ target, func: () => window.__expofill?.scan() ?? null });
    const top = results.find((r) => r.frameId === 0)?.result;
    const fields = results.flatMap((r) => (r.result?.fields ?? []).map((f) => ({ ...f, frameId: r.frameId })));
    const blockedFrames = findBlockedFrames(results);
    debug('scan', tabId, 'frames', results.length, 'fields', fields.length, 'blocked', blockedFrames.length);
    return {
      type: MSG.SCAN_RESULT,
      tabId,
      url: top?.url ?? '',
      domain: top?.domain ?? '',
      eventName: top?.eventName ?? '',
      fields,
      blockedFrames,
    };
  } catch (e) {
    // No activeTab grant (icon not clicked on this page), chrome:// pages, the Web Store…
    debug('scan failed', e.message);
    return { type: MSG.SCAN_RESULT, tabId, error: 'cannot-access', fields: [], blockedFrames: [] };
  }
}

async function scanForPanel(windowId, tabId) {
  const panel = panels.get(windowId);
  if (!panel) return;
  panel.tabId = tabId;
  const result = await scanTab(tabId);
  if (panels.get(windowId) === panel) panel.port.postMessage(result);
}

const stopObserving = (tabId) =>
  chrome.tabs.sendMessage(tabId, { type: MSG.STOP_OBSERVING }).catch(() => {}); // tab may be gone

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL(`${OPTIONS_PAGE}#/onboarding`) });
  });

  chrome.action.onClicked.addListener((tab) => {
    // sidePanel.open must run synchronously inside the click (user gesture): no await before it.
    chrome.sidePanel.open({ tabId: tab.id });
    // An already-open panel rescans now; a new panel asks for its own scan when it connects.
    scanForPanel(tab.windowId, tab.id);
  });

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== SIDEPANEL_PORT) return;
    let windowId = null;
    port.onMessage.addListener((msg) => {
      windowId = msg.windowId;
      const tabId = msg.tabId ?? panels.get(windowId)?.tabId ?? null;
      panels.set(windowId, { port, tabId });
      if (msg.type === MSG.SCAN_REQUEST) scanForPanel(windowId, msg.tabId);
    });
    port.onDisconnect.addListener(() => {
      const p = panels.get(windowId);
      if (p?.port !== port) return;
      panels.delete(windowId);
      if (p.tabId != null) stopObserving(p.tabId);
    });
  });

  chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg?.type !== MSG.FIELDS_ADDED || !sender.tab) return;
    const panel = panelForTab(sender.tab.id);
    panel?.port.postMessage({
      type: MSG.FIELDS_ADDED,
      tabId: sender.tab.id,
      fields: msg.fields.map((f) => ({ ...f, frameId: sender.frameId })),
    });
  });

  // Navigation revokes activeTab: the panel must ask for a new click.
  chrome.tabs.onUpdated.addListener((tabId, info) => {
    if (info.status !== 'loading') return;
    panelForTab(tabId)?.port.postMessage({ type: MSG.TAB_CHANGED, tabId, url: info.url ?? '' });
  });
  chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
    const panel = panels.get(windowId);
    if (!panel || panel.tabId === tabId) return;
    if (panel.tabId != null) stopObserving(panel.tabId);
    panel.tabId = tabId;
    panel.port.postMessage({ type: MSG.TAB_CHANGED, tabId, url: '' });
  });
});
