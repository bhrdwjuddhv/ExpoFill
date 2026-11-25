import { MSG, SIDEPANEL_PORT } from './constants.js';

export { MSG, SIDEPANEL_PORT };

/** @param {string} type @param {object} [payload] */
export const sendToBackground = (type, payload = {}) =>
  chrome.runtime.sendMessage({ type, ...payload });

/** @param {number} tabId @param {number} frameId @param {string} type @param {object} [payload] */
export const sendToFrame = (tabId, frameId, type, payload = {}) =>
  chrome.tabs.sendMessage(tabId, { type, ...payload }, { frameId });
