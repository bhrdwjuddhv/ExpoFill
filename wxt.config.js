import { defineConfig } from 'wxt';

// Strict CSP (spec rule 1.3). Only applied to production builds: `wxt` dev mode
// needs a WebSocket to its local dev server for hot reload, which connect-src 'none' blocks.
const CSP = "script-src 'self'; object-src 'self'; connect-src 'none'";

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  // Vite's modulepreload polyfill calls fetch(); Chrome 116+ preloads modules natively.
  vite: () => ({ build: { modulePreload: { polyfill: false } } }),
  manifest: ({ command }) => ({
    name: 'ExpoFill',
    description: 'Fills event registration forms from a profile stored only on your device.',
    minimum_chrome_version: '116',
    permissions: ['storage', 'activeTab', 'scripting', 'sidePanel'],
    optional_host_permissions: ['https://docs.google.com/forms/*', '<all_urls>'],
    action: { default_title: 'ExpoFill: scan this form' },
    commands: {
      _execute_action: { suggested_key: { default: 'Alt+Shift+F' } },
    },
    ...(command === 'build' && { content_security_policy: { extension_pages: CSP } }),
  }),
});
