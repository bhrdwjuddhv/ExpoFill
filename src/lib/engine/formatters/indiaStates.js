// Indian states and union territories with the short forms forms use.
import { isPlaceholderOption, matchOption } from './options.js';

/** [official name, ...short forms / alternates] */
export const INDIA_STATES = [
  ['Andhra Pradesh', 'AP'],
  ['Arunachal Pradesh', 'AR'],
  ['Assam', 'AS'],
  ['Bihar', 'BR'],
  ['Chhattisgarh', 'CG', 'Chattisgarh', 'Chhatisgarh'],
  ['Goa', 'GA'],
  ['Gujarat', 'GJ'],
  ['Haryana', 'HR'],
  ['Himachal Pradesh', 'HP'],
  ['Jharkhand', 'JH'],
  ['Karnataka', 'KA'],
  ['Kerala', 'KL'],
  ['Madhya Pradesh', 'MP'],
  ['Maharashtra', 'MH'],
  ['Manipur', 'MN'],
  ['Meghalaya', 'ML'],
  ['Mizoram', 'MZ'],
  ['Nagaland', 'NL'],
  ['Odisha', 'OD', 'OR', 'Orissa'],
  ['Punjab', 'PB'],
  ['Rajasthan', 'RJ'],
  ['Sikkim', 'SK'],
  ['Tamil Nadu', 'TN', 'Tamilnadu'],
  ['Telangana', 'TS', 'TG'],
  ['Tripura', 'TR'],
  ['Uttar Pradesh', 'UP'],
  ['Uttarakhand', 'UK', 'UT', 'Uttaranchal'],
  ['West Bengal', 'WB'],
  ['Andaman and Nicobar Islands', 'AN', 'Andaman & Nicobar Islands', 'Andaman and Nicobar', 'A&N Islands'],
  ['Chandigarh', 'CH'],
  ['Dadra and Nagar Haveli and Daman and Diu', 'DN', 'DD', 'DNHDD', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Dadra & Nagar Haveli and Daman & Diu'],
  ['Delhi', 'DL', 'NCT of Delhi', 'New Delhi', 'National Capital Territory of Delhi', 'Delhi NCR'],
  ['Jammu and Kashmir', 'JK', 'J&K', 'Jammu & Kashmir'],
  ['Ladakh', 'LA'],
  ['Lakshadweep', 'LD'],
  ['Puducherry', 'PY', 'Pondicherry'],
];

const lc = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** All spellings of the state `value` belongs to, or null if it is not an Indian state/UT. */
export function stateNames(value) {
  const v = lc(value);
  return INDIA_STATES.find((names) => names.some((n) => lc(n) === v)) ?? null;
}

/** Option index for a state, trying every spelling. */
export function matchState(options, value) {
  const names = stateNames(value);
  if (!names) return matchOption(options, value);
  const set = new Set(names.map(lc));
  const i = options.findIndex((o) => !isPlaceholderOption(o.text) && (set.has(lc(o.text)) || set.has(lc(o.value))));
  if (i >= 0) return i;
  for (const n of names) {
    const j = matchOption(options, n);
    if (j >= 0) return j;
  }
  return -1;
}
