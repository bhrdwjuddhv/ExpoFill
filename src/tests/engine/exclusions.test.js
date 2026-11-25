import { describe, expect, it } from 'vitest';
import { exclusionReason as ex } from '@/lib/engine/exclusions.js';

describe('exclusions', () => {
  it('excludes by input type and state', () => {
    for (const t of ['password', 'hidden', 'file', 'submit', 'button', 'reset', 'image']) expect(ex({ inputType: t }), t).toBeTruthy();
    expect(ex({ inputType: 'text' }, { disabled: true })).toBe('Disabled');
    expect(ex({}, { readOnly: true })).toBe('Read-only');
    expect(ex({}, { ariaHidden: true })).toMatch(/aria-hidden/);
    expect(ex({}, { visible: false })).toBe('Not visible');
  });

  it('excludes by autocomplete', () => {
    expect(ex({ autocomplete: 'cc-number' })).toMatch(/card/i);
    expect(ex({ autocomplete: 'one-time-code' })).toMatch(/OTP/);
    expect(ex({ autocomplete: 'new-password' })).toMatch(/Password/);
  });

  it('excludes sensitive and consent keywords', () => {
    const cases = [
      ['Enter OTP', /OTP/],
      ['PIN', /OTP/],
      ['Type the captcha', /CAPTCHA/],
      ['Card number', /card/i],
      ['CVV', /card/i],
      ['Expiry date', /card/i],
      ['UPI ID', /UPI/],
      ['IFSC code', /UPI/],
      ['Bank account number', /UPI/],
      ['Aadhaar number', /Government/],
      ['PAN', /Government/],
      ['I agree to the Terms', /Consent/],
      ['I consent to be contacted', /Consent/],
      ['I have read the privacy policy', /Consent/],
    ];
    for (const [label, re] of cases) expect(ex({ labelFor: label }), label).toMatch(re);
    expect(ex({ name: 'cardNumber' })).toMatch(/card/i);
  });

  it('does not exclude ordinary fields', () => {
    for (const label of ['PIN code', 'Pincode', 'Company', 'Japan office', 'Full name', 'Email', 'Mobile number', 'Expansion plans'])
      expect(ex({ labelFor: label }), label).toBeNull();
    expect(ex({ name: 'pinCode' })).toBeNull();
  });
});
