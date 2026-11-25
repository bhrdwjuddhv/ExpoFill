// Other ways an option might spell a profile value.
import { isPlaceholderOption } from './options.js';

const SYNONYMS = {
  gender: {
    male: ['Male', 'M', 'Man', 'Boy'],
    female: ['Female', 'F', 'Woman', 'Girl'],
    'non-binary': ['Non-binary', 'Nonbinary', 'Non binary', 'Genderqueer'],
    'prefer not to say': ['Prefer not to say', 'Prefer not to disclose', 'Rather not say', 'Do not wish to disclose'],
  },
  tshirtSize: {
    xs: ['XS', 'Extra Small'],
    s: ['S', 'Small'],
    m: ['M', 'Medium'],
    l: ['L', 'Large'],
    xl: ['XL', 'Extra Large', 'X-Large'],
    xxl: ['XXL', '2XL', 'Double Extra Large', 'XX-Large', '2X-Large'],
    xxxl: ['XXXL', '3XL', 'Triple Extra Large', 'XXX-Large'],
  },
  dietaryPreference: {
    vegetarian: ['Vegetarian', 'Veg', 'Pure Veg', 'Veg only'],
    'non-vegetarian': ['Non-Vegetarian', 'Non-Veg', 'Non Veg', 'Nonveg'],
    vegan: ['Vegan'],
    jain: ['Jain', 'Jain food', 'Jain meal'],
    eggetarian: ['Eggetarian', 'Egg', 'Eggitarian'],
  },
  attendeeType: {
    student: ['Student', 'Students', 'College Student'],
    professional: ['Professional', 'Working Professional', 'Industry Professional', 'Corporate', 'Working', 'Employee'],
    founder: ['Founder', 'Startup Founder', 'Entrepreneur', 'Co-founder', 'Startup'],
  },
};

const YES = ['Yes', 'Y', 'True', 'I do', 'Yes, it is'];
const NO = ['No', 'N', 'False'];
const ORD_WORDS = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const ordinal = (n) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

/** "3rd Year" → every common way of writing year 3. */
export function yearCandidates(value) {
  const v = String(value ?? '');
  const n = Number(v.match(/\d+/)?.[0] ?? ORD_WORDS.findIndex((w) => w && new RegExp(`\\b${w}\\b`, 'i').test(v)));
  if (!(n > 0 && n < ORD_WORDS.length)) return [v];
  return [v, `${ordinal(n)} Year`, ordinal(n), `Year ${n}`, `${ORD_WORDS[n]} Year`, ORD_WORDS[n], `${ROMAN[n]} Year`, ROMAN[n], String(n)];
}

export const yesNoCandidates = (bool) => (bool ? YES : NO);

/** Every spelling worth trying for this key's value, the value itself first. */
export function valueCandidates(key, value) {
  if (typeof value === 'boolean') return yesNoCandidates(value);
  if (key === 'yearOfStudy') return yearCandidates(value);
  const table = SYNONYMS[key];
  const syn = table?.[String(value).toLowerCase()] ?? [];
  return [...new Set([String(value), ...syn])];
}

/** "0-2 years", "3 to 5", "5+ years", "More than 10", "Less than 1": the option containing `years`. */
export function matchRange(options, years) {
  const y = Number(years);
  if (!Number.isFinite(y)) return -1;
  return options.findIndex((o) => {
    if (isPlaceholderOption(o.text)) return false;
    const t = o.text.toLowerCase();
    const nums = (t.match(/\d+(\.\d+)?/g) ?? []).map(Number);
    if (!nums.length) return /fresher|no experience|none/.test(t) && y === 0;
    if (/\+|more than|above|over|or more/.test(t)) return y >= nums[0];
    if (/less than|below|under|upto|up to/.test(t)) return y < nums[0] || (/up ?to/.test(t) && y <= nums[0]);
    if (nums.length >= 2) return y >= nums[0] && y <= nums[1];
    return y === nums[0];
  });
}
