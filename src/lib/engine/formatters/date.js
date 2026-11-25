// Dates are stored as YYYY-MM-DD and shaped for each field.

const ISO = /^(\d{4})-(\d{2})-(\d{2})/;
const DMY = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;

/** YYYY-MM-DD from an ISO string, a Date, or a DD/MM/YYYY string. */
export function toIso(raw) {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.toISOString().slice(0, 10);
  const s = String(raw ?? '').trim();
  const iso = ISO.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = DMY.exec(s);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return null;
}

/**
 * @param {any} raw
 * @param {{ control: string, signals?: { inputType?: string, placeholder?: string }, dateParts?: string[] }} field
 * @returns {{ value: string, parts?: { day: string, month: string, year: string } } | { error: string }}
 */
export function formatDate(raw, field) {
  const iso = toIso(raw);
  if (!iso) return { error: 'not a date' };
  const [year, month, day] = iso.split('-');
  if (field.dateParts) return { value: iso, parts: { day, month, year } };
  if (field.signals?.inputType === 'date') return { value: iso };
  const ph = (field.signals?.placeholder ?? '').toLowerCase();
  const sep = ph.match(/[/.-]/)?.[0] ?? '/';
  if (/^mm[/.-]dd/.test(ph)) return { value: [month, day, year].join(sep) };
  if (/^yyyy/.test(ph)) return { value: [year, month, day].join(sep) };
  return { value: [day, month, year].join(sep) }; // DD/MM/YYYY: the Indian default
}
