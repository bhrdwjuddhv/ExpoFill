// Every tunable lives here: weights, thresholds, timeouts, storage keys, message types.

export const SCHEMA_VERSION = 1;
export const EXPORT_APP_ID = 'ExpoFill';

export const STORAGE_KEYS = {
  schemaVersion: 'schemaVersion',
  profiles: 'profiles',
  activeProfileId: 'activeProfileId',
  rules: 'rules',
  templates: 'templates',
  settings: 'settings',
};

// Extension-internal paths (resolved with chrome.runtime.getURL).
export const CONTENT_SCRIPT_FILE = '/injected.js';
export const OPTIONS_PAGE = '/options.html';
export const SIDEPANEL_PORT = 'expofill-sidepanel';

export const MSG = {
  SCAN_REQUEST: 'SCAN_REQUEST',
  SCAN_RESULT: 'SCAN_RESULT',
  FIELDS_ADDED: 'FIELDS_ADDED',
  FILL_REQUEST: 'FILL_REQUEST',
  FILL_RESULT: 'FILL_RESULT',
  FOCUS_FIELD: 'FOCUS_FIELD',
  CLEAR_MARKS: 'CLEAR_MARKS',
  TAB_CHANGED: 'TAB_CHANGED',
  // Internal plumbing, not in the spec's table:
  STOP_OBSERVING: 'STOP_OBSERVING', // background → content when the side panel closes
  PANEL_HELLO: 'PANEL_HELLO', // side panel → background: (re)registers its window after a service-worker restart
};

// ---- Classifier ----
export const THRESHOLDS = {
  ready: 85, // >= ready → auto-ticked
  suggested: 60, // >= suggested → shown, needs a tick; below → unknown
  tieMargin: 15, // best - runnerUp below this → never 'ready'
};

export const SIGNAL_WEIGHTS = {
  autocomplete: 1.0,
  labelFor: 1.0,
  ariaLabelledby: 0.95,
  ariaLabel: 0.95,
  questionHeading: 0.95,
  name: 0.85,
  id: 0.85,
  placeholder: 0.8,
  nearbyText: 0.75,
  sectionText: 0.5,
  inputType: 0.4,
};

export const MATCH_QUALITY = {
  exact: 1.0,
  allTokens: 0.85,
  fuzzy: 0.7,
  oneToken: 0.5,
};

export const FUZZY = {
  maxLevenshtein: 2,
  minLevenshteinLength: 5,
  minJaccard: 0.6,
};

export const SCORING = {
  otherSignalBonus: 5,
  negativePenalty: 40,
  unmatchedOptionCap: 60,
  max: 100,
};

// ---- Learning ----
export const LEARNING = {
  siteRuleScore: 100,
  strongSimilarity: 0.75,
  weakSimilarity: 0.6,
  strongScore: 95,
  weakScore: 70,
  promoteAfterDomains: 2,
};

export const TEMPLATE_SUGGESTION_COUNT = 3;

// ---- Scanner ----
export const LABEL_MAX_LENGTH = 200;
export const NEARBY_TEXT_MAX_PX = 80;
export const GROUP_ANCESTOR_LEVELS = 3;
export const GROUP_CLASS_PATTERN = /form-group|field|form-item|question|input-group/i;
export const MIN_FRAME_SIZE = 50;
export const CAPTCHA_FRAME_PATTERN = /recaptcha|hcaptcha|turnstile/i;
export const GENERATED_NAME_PATTERNS = [
  /^(input|field|q|ctl|mat-input|react-select)[-_]?\d+/i,
  /[0-9a-f]{8,}/i, // long hex run
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i, // uuid
];

// ---- Timing ----
export const OBSERVER_DEBOUNCE_MS = 400;
export const OBSERVER_IDLE_MS = 10 * 60 * 1000;
export const ARIA_OPTION_WAIT_MS = 2000;
export const DEPENDENT_WAIT_MS = 3000;
export const MARKER_TIMEOUT_MS = 10000;

export const DEFAULT_SETTINGS = {
  readyThreshold: THRESHOLDS.ready,
  suggestedThreshold: THRESHOLDS.suggested,
};
