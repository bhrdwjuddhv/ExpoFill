// Logs field ids, profile keys and scores only — never personal values.
// Silent in production builds.
export const debug = import.meta.env.DEV
  ? (...args) => console.debug('[ExpoFill]', ...args)
  : () => {};
