import { MSG, SIDEPANEL_PORT } from '@/lib/constants.js';

/**
 * Long-lived port to the background. The background uses it to know the panel is open;
 * it reconnects if Chrome stops the service worker.
 * @param {(msg: object) => void} onMessage
 */
export function connectPanel(onMessage) {
  let port;
  let closed = false;
  let ctx = null; // { windowId, tabId }

  const open = () => {
    port = chrome.runtime.connect({ name: SIDEPANEL_PORT });
    port.onMessage.addListener(onMessage);
    port.onDisconnect.addListener(() => {
      if (closed) return;
      setTimeout(() => {
        open();
        if (ctx) port.postMessage({ type: MSG.PANEL_HELLO, ...ctx });
      }, 300);
    });
  };
  open();

  return {
    async requestScan() {
      const win = await chrome.windows.getCurrent();
      const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
      ctx = { windowId: win.id, tabId: tab?.id };
      port.postMessage({ type: MSG.SCAN_REQUEST, ...ctx });
    },
    close() {
      closed = true;
      port.disconnect();
    },
  };
}
