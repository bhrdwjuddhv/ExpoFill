import { describe, expect, it } from 'vitest';
import { isGeneratedName, normalize, questionText, stem, tokens } from '@/lib/engine/normalize.js';

describe('normalize', () => {
  it('cleans labels', () => {
    expect(normalize('1. Your Full Name *')).toBe('full name');
    expect(normalize('Q3) Mobile No. (required)')).toBe('mobile no');
    expect(normalize('What is your E-mail address?')).toBe('e mail address');
    expect(normalize('Please enter your city (optional)')).toBe('city');
    expect(normalize('2024 batch')).toBe('2024 batch');
  });

  it('keeps all-stop-word phrases', () => {
    expect(normalize('You are')).toBe('you are');
    expect(tokens('')).toEqual([]);
  });

  it('stems lightly', () => {
    const words = ['organization', 'interests', 'interested', 'cities', 'addresses', 'address', 'status', 'name', 'years', 'sizes'];
    expect(words.map(stem)).toEqual(['organizat', 'interest', 'interest', 'city', 'address', 'address', 'status', 'name', 'year', 'size']);
  });

  it('detects generated names', () => {
    for (const n of ['input_8f3a2', 'q12', 'mat-input-3', 'ctl00', 'field-7', 'a1b2c3d4e5', '6f1c2d3a-1b2c-4d5e-8f90-123456789abc', 'x123'])
      expect(isGeneratedName(n), n).toBe(true);
    for (const n of ['email', 'first_name', 'mobileNo', 'address1']) expect(isGeneratedName(n), n).toBe(false);
  });

  it('picks the best question text', () => {
    expect(questionText({ signals: { name: 'input_8f3a2', placeholder: 'Your city' } })).toBe('Your city');
    expect(questionText({ signals: { labelFor: 'Email', placeholder: 'x' } })).toBe('Email');
    expect(questionText({ signals: { name: 'company_name' } })).toBe('company_name');
  });
});
