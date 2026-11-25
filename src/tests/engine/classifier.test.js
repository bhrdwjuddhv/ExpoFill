import { describe, expect, it } from 'vitest';
import { classifyField, classifyFields } from '@/lib/engine/classifier.js';

const PROFILE = {
  values: {
    fullName: 'Asha Rao', email: 'a@x.in', phone: '9876543210', gender: 'Female', attendeeType: 'Professional',
    organization: 'Acme', college: 'IIT', designation: 'Engineer', country: 'India', interests: ['AI/ML', 'Web Dev'],
  },
  customFields: [{ key: 'custom:blood-group', label: 'Blood group' }],
};
const opts = (...texts) => texts.map((text) => ({ text, value: text }));
let n = 0;
const field = (signals, extra = {}) => ({ fieldId: `f${n++}`, control: 'text', signals, options: [], ...extra });
const label = (text, extra) => field({ labelFor: text }, extra);
const run = (f, ctx = {}) => classifyField(f, { profile: PROFILE, domain: 'expo.in', ...ctx });
const key = (r) => r.target?.key;

describe('classifier: dictionary', () => {
  it('maps common labels to ready', () => {
    const cases = [
      ['Full Name', 'fullName'], ['Your Name *', 'fullName'], ['Participant Name', 'fullName'], ['First name', 'firstName'],
      ['Surname', 'lastName'], ['Email ID', 'email'], ['E-mail Address', 'email'], ['Mobile No.', 'phone'],
      ['Contact Number', 'phone'], ['WhatsApp Number', 'whatsapp'], ['Company Name', 'organization'],
      ['College Name', 'college'], ['Designation', 'designation'], ['Pin Code', 'postalCode'], ['City', 'city'],
      ['LinkedIn Profile URL', 'linkedin'], ['GitHub', 'github'], ['Team Name', 'teamName'], ['T-Shirt Size', 'tshirtSize'],
      ['How did you hear about this event?', 'howDidYouHear'], ['Years of experience', 'experienceYears'],
      ['Year of passing', 'graduationYear'], ['Blood group', 'custom:blood-group'],
    ];
    for (const [text, k] of cases) {
      const r = run(label(text));
      expect([key(r), r.status], text).toEqual([k, 'ready']);
    }
  });

  it('separates Company / College', () => {
    expect(key(run(label('Company / Organisation')))).toBe('organization');
    expect(key(run(label('Name of the College')))).toBe('college');
    expect(run(label('College Name')).runnerUp?.key).not.toBe('organization');
    expect(run(label('Name of the Institution / Organization')).status).toBe('unknown'); // ambiguous: user decides
  });

  it('separates Designation / Registration category', () => {
    expect(key(run(label('Designation')))).toBe('designation');
    const reg = run(label('Registration Category'), {});
    expect(key(reg)).not.toBe('designation');
    const regSelect = run(label('Registration Category', { control: 'select', options: opts('Select', 'Student', 'Working Professional', 'Startup') }));
    expect(key(regSelect)).toBe('attendeeType');
  });

  it('separates Phone / WhatsApp / Emergency contact', () => {
    expect(key(run(label('Mobile Number', { control: 'tel' })))).toBe('phone');
    expect(key(run(label('WhatsApp Number', { control: 'tel' })))).toBe('whatsapp');
    const emergency = run(label('Emergency contact number', { control: 'tel' }));
    expect(emergency.status).not.toBe('ready');
    expect(run(label('Mobile number (with country code)')).status).toBe('ready');
  });

  it('separates Country / Nationality', () => {
    expect(key(run(label('Country')))).toBe('country');
    expect(run(label('Nationality')).status).toBe('unknown');
  });

  it('keeps name away from other names', () => {
    for (const text of ["Father's Name", 'Event name', 'Name of your startup', 'Institute name', 'Contact person name'])
      expect(key(run(label(text))), text).not.toBe('fullName');
    expect(key(run(label('First and last name')))).toBe('fullName');
  });

  it('uses autocomplete, names, placeholders and input type', () => {
    expect(run(field({ autocomplete: 'given-name' }))).toMatchObject({ status: 'ready', matchedBy: 'autocomplete', target: { key: 'firstName' } });
    expect(key(run(field({ name: 'txtMobileNo' })))).toBe('phone');
    expect(run(field({ name: 'input_8f3a2' })).status).toBe('unknown');
    const ph = run(field({ placeholder: 'Enter your email' }));
    expect([key(ph), ph.status]).toEqual(['email', 'suggested']); // placeholder alone tops out at 80
    expect(run(field({ placeholder: 'Enter your email', name: 'email' })).status).toBe('ready');
    expect(run(field({ inputType: 'email' }, { control: 'email' })).status).toBe('unknown'); // 40 alone
  });

  it('rules a key out when the control type does not fit', () => {
    expect(key(run(label('Email', { control: 'checkbox-group', options: opts('Yes') })))).not.toBe('email');
  });

  it('caps choice fields whose options cannot take the value', () => {
    const r = run(label('Gender', { control: 'radio-group', options: opts('Male', 'Female') }));
    expect([key(r), r.status]).toEqual(['gender', 'ready']);
    const capped = run(label('Gender', { control: 'radio-group', options: opts('M', 'X') }));
    expect([capped.status, capped.score]).toEqual(['suggested', 60]);
    const interests = run(label('Areas of interest', { control: 'checkbox-group', options: opts('Machine Learning', 'Web Development', 'Other') }));
    expect([key(interests), interests.status]).toEqual(['interests', 'ready']);
  });

  it('never marks a close call ready (tie rule)', () => {
    const r = run(label('Title'));
    expect(r.status).toBe('suggested');
    expect(r.runnerUp).not.toBeNull();
    expect(r.reason).toMatch(/could also be/);
  });

  it('respects custom thresholds', () => {
    expect(run(label('Mobile No.'), { settings: { readyThreshold: 101 } }).status).toBe('suggested');
  });

  it('passes excluded fields through', () => {
    expect(run(label('OTP', { excluded: true, excludeReason: 'OTP / PIN: never filled' }))).toMatchObject({ status: 'excluded', reason: 'OTP / PIN: never filled' });
  });
});

describe('classifier: rules and templates', () => {
  const f = () => label('Startup stage');
  const siteRule = (target) => ({ id: 'r', scope: 'site', fingerprint: 'expo.in|stage startup|text', target, questionText: 'Startup stage' });

  it('uses a site rule first', () => {
    expect(run(f(), { rules: [siteRule({ kind: 'fixed', value: 'Seed' })] })).toMatchObject({ status: 'ready', score: 100, matchedBy: 'site-rule' });
    expect(run(f(), { rules: [siteRule({ kind: 'skip' })] }).status).toBe('excluded');
    expect(run(f(), { rules: [siteRule({ kind: 'template', id: 't' })] }).status).toBe('suggested');
  });

  it('uses global rules: strong → 95, weak → 70 unless the dictionary is sure', () => {
    const g = { id: 'g', scope: 'global', normalized: 'stage startup', control: 'text', target: { kind: 'fixed', value: 'Seed' }, questionText: 'Startup stage' };
    expect(run(f(), { domain: 'other.in', rules: [g] })).toMatchObject({ status: 'ready', score: 95, matchedBy: 'global-rule' });
    const weak = { ...g, normalized: 'current stage startup' };
    expect(run(f(), { domain: 'other.in', rules: [weak] })).toMatchObject({ status: 'suggested', score: 70 });
    const weakEmail = { ...g, normalized: 'address email work' };
    expect(key(run(label('Email address'), { rules: [weakEmail] }))).toBe('email');
  });

  it('suggests templates for long questions, never ready', () => {
    const templates = [{ id: 't1', category: 'General', keywords: [], text: 'To learn.' }];
    const r = run(label('Why do you want to attend?', { control: 'textarea' }), { templates });
    expect(r).toMatchObject({ status: 'suggested', target: { kind: 'template', id: 't1' }, templateIds: ['t1'] });
    expect(run(label('Why do you want to attend?', { control: 'textarea' })).status).toBe('unknown');
  });
});

describe('classifyFields', () => {
  it('suggests college for a student when only organisation is asked', () => {
    const student = { ...PROFILE, values: { ...PROFILE.values, attendeeType: 'Student' } };
    const [r] = classifyFields([label('Organisation')], { profile: student });
    expect(r).toMatchObject({ status: 'suggested', target: { key: 'college' } });
    const both = classifyFields([label('Organisation'), label('College')], { profile: student });
    expect(both.map(key)).toEqual(['organization', 'college']);
    expect(key(classifyFields([label('Organisation')], { profile: PROFILE })[0])).toBe('organization');
  });
});
