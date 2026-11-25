import { dialDigits } from './country.js';

/** National number: digits only, without the country code or a trunk 0. */
export function nationalNumber(raw, code = '91') {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (code && d.length > 10 && d.startsWith(code)) d = d.slice(code.length);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}

/**
 * Formats a phone number for one input, judging from maxlength, pattern and placeholder.
 * @param {string} raw
 * @param {{ maxLength?: number|null, pattern?: string|null, signals?: { placeholder?: string } }} field
 * @param {{ countryCode?: string, hasCountryCodeField?: boolean }} ctx
 */
export function formatPhone(raw, field, { countryCode = '+91', hasCountryCodeField = false } = {}) {
  const code = dialDigits(countryCode) || '91';
  const national = nationalNumber(raw, code);
  if (!national) return '';
  if (hasCountryCodeField) return national; // the code goes in its own box
  const max = field.maxLength ?? 0;
  const ph = (field.signals?.placeholder ?? '').trim();
  const pattern = field.pattern ?? '';
  if (max && max <= 10) return national;
  if (/^\+/.test(ph) || /\\\+|\[\+\]/.test(pattern)) return `+${code} ${national}`.slice(0, max || undefined).trim();
  if (/^0\d/.test(ph)) return `0${national}`;
  if (/^\d{5}\s\d{5}$/.test(ph)) return `${national.slice(0, 5)} ${national.slice(5)}`;
  if (max && max >= national.length + code.length + 1 && max <= 13 && /^91/.test(ph)) return `${code}${national}`;
  return code === '91' ? national : `+${code} ${national}`;
}

/** A country-code text box: "+91", or "91" when the box is too short for the plus. */
export function formatCodeText(raw, field) {
  const d = dialDigits(raw) || '91';
  const max = field.maxLength ?? 0;
  const ph = field.signals?.placeholder ?? '';
  return (max && max <= d.length) || (/^\d/.test(ph) && !/\+/.test(ph)) ? d : `+${d}`;
}
