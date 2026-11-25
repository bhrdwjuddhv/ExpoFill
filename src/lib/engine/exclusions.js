// Never-fill detection. Pure: the scanner passes the element's state in.
import { isGeneratedName, splitIdentifier } from './normalize.js';

const EXCLUDED_TYPES = {
  password: 'Password field',
  hidden: 'Hidden field',
  file: 'File upload',
  submit: 'Button',
  button: 'Button',
  reset: 'Button',
  image: 'Button',
};

const KEYWORDS = [
  [/\b(otp|mpin|one time (password|code)|verification code)\b/, 'OTP / PIN: never filled'],
  [/\bpin\b(?! ?code)/, 'OTP / PIN: never filled'],
  [/\b(captcha|recaptcha|hcaptcha)\b/, 'CAPTCHA: never filled'],
  [/\b(password|passcode)\b/, 'Password: never filled'],
  [/\b(card|cvv|cvc|expiry|expiration|security code|valid thru)\b/, 'Payment card: never filled'],
  [/\b(upi|ifsc|account (number|no)|bank account)\b/, 'Bank / UPI: never filled'],
  [/\b(aadhaar|aadhar|pan)\b/, 'Government ID: never filled'],
  [/\b(terms|consent|agree|privacy policy)\b/, 'Consent: tick it yourself'],
];

/** Lower-case words, with identifiers split (cardNumber → card number). */
const words = (s) =>
  splitIdentifier(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/**
 * @param {{ inputType?: string, autocomplete?: string, labelFor?: string, ariaLabel?: string,
 *   ariaLabelledby?: string, questionHeading?: string, placeholder?: string, name?: string, id?: string,
 *   nearbyText?: string }} signals
 * @param {{ disabled?: boolean, readOnly?: boolean, ariaHidden?: boolean, visible?: boolean }} [state]
 * @returns {string|null} reason, or null when the field may be filled
 */
export function exclusionReason(signals, state = {}) {
  const type = (signals.inputType ?? '').toLowerCase();
  if (EXCLUDED_TYPES[type]) return EXCLUDED_TYPES[type];
  if (state.disabled) return 'Disabled';
  if (state.readOnly) return 'Read-only';
  if (state.ariaHidden) return 'Hidden (aria-hidden)';
  if (state.visible === false) return 'Not visible';

  const ac = (signals.autocomplete ?? '').toLowerCase().split(/\s+/);
  if (ac.some((t) => t.startsWith('cc-'))) return 'Payment card: never filled';
  if (ac.includes('one-time-code')) return 'OTP / PIN: never filled';
  if (ac.includes('new-password') || ac.includes('current-password')) return 'Password: never filled';

  const label = [signals.labelFor, signals.ariaLabel, signals.ariaLabelledby, signals.questionHeading]
    .filter(Boolean)
    .join(' ');
  const ids = [signals.name, signals.id].filter((x) => x && !isGeneratedName(x));
  const text = words([label || signals.nearbyText, signals.placeholder, ...ids].filter(Boolean).join(' '));
  for (const [re, reason] of KEYWORDS) if (re.test(text)) return reason;
  return null;
}
