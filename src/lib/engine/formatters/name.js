const SALUTATION_RE = /^(mr|mrs|ms|miss|mx|dr|prof)\.?\s+/i;

/** "Dr Asha Kumari Rao" → { first: 'Asha', middle: 'Kumari', last: 'Rao' } (salutation dropped). */
export function splitName(full) {
  const words = String(full ?? '').replace(SALUTATION_RE, '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { first: '', middle: '', last: '' };
  if (words.length === 1) return { first: words[0], middle: '', last: '' };
  return { first: words[0], middle: words.slice(1, -1).join(' '), last: words.at(-1) };
}

/**
 * First/last name from a full name: the last word is the last name, everything before it the first name,
 * so nothing is lost on forms that only ask for first + last.
 */
export function deriveNames(full) {
  const { first, middle, last } = splitName(full);
  return { firstName: [first, middle].filter(Boolean).join(' '), lastName: last };
}

const SALUTATIONS = {
  mr: ['Mr', 'Mr.', 'Mister'],
  ms: ['Ms', 'Ms.', 'Miss'],
  mrs: ['Mrs', 'Mrs.'],
  dr: ['Dr', 'Dr.', 'Doctor'],
  prof: ['Prof', 'Prof.', 'Professor'],
  mx: ['Mx', 'Mx.'],
};
export const salutationCandidates = (v) => SALUTATIONS[String(v ?? '').toLowerCase().replace('.', '')] ?? [String(v)];
