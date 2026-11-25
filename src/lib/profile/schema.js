// Canonical profile keys. Every module uses these.

/** @typedef {'text'|'email'|'tel'|'url'|'number'|'select'|'boolean'|'tags'|'textarea'} ProfileFieldType */
/** @typedef {{ key: string, label: string, type: ProfileFieldType, options?: string[] }} ProfileField */

const f = (key, label, type = 'text', options) => ({ key, label, type, ...(options && { options }) });

export const SECTIONS = [
  {
    id: 'personal',
    title: 'Personal',
    fields: [
      f('fullName', 'Full name'),
      f('firstName', 'First name'),
      f('lastName', 'Last name'),
      f('salutation', 'Salutation', 'select', ['Mr', 'Ms', 'Mrs', 'Dr', 'Prof', 'Mx']),
      f('gender', 'Gender', 'select', ['Male', 'Female', 'Non-binary', 'Prefer not to say']),
      f('email', 'Email', 'email'),
      f('phone', 'Mobile number', 'tel'),
      f('phoneCountryCode', 'Phone country code'),
      f('whatsapp', 'WhatsApp number', 'tel'),
      f('whatsappSameAsPhone', 'WhatsApp same as mobile', 'boolean'),
    ],
  },
  {
    id: 'professional',
    title: 'Professional',
    fields: [
      f('organization', 'Organisation / company'),
      f('designation', 'Designation'),
      f('department', 'Department'),
      f('industry', 'Industry'),
      f('experienceYears', 'Years of experience', 'number'),
      f('attendeeType', 'I am a', 'select', ['Student', 'Professional', 'Founder', 'Other']),
    ],
  },
  {
    id: 'education',
    title: 'Education',
    fields: [
      f('college', 'College / institute'),
      f('university', 'University'),
      f('course', 'Course / degree'),
      f('yearOfStudy', 'Year of study'),
      f('graduationYear', 'Graduation year', 'number'),
    ],
  },
  {
    id: 'location',
    title: 'Location',
    fields: [
      f('country', 'Country'),
      f('state', 'State'),
      f('city', 'City'),
      f('postalCode', 'PIN / postal code'),
      f('address', 'Address', 'textarea'),
    ],
  },
  {
    id: 'online',
    title: 'Online',
    fields: [
      f('linkedin', 'LinkedIn', 'url'),
      f('github', 'GitHub', 'url'),
      f('portfolio', 'Portfolio / website', 'url'),
      f('twitter', 'Twitter / X'),
    ],
  },
  {
    id: 'event',
    title: 'Event extras',
    fields: [
      f('interests', 'Interests', 'tags'),
      f('tshirtSize', 'T-shirt size', 'select', ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']),
      f('dietaryPreference', 'Food preference', 'select', ['Vegetarian', 'Non-vegetarian', 'Vegan', 'Jain', 'Eggetarian']),
      f('teamName', 'Team name'),
      f('howDidYouHear', 'How did you hear about events'),
    ],
  },
];

export const PROFILE_FIELDS = SECTIONS.flatMap((s) => s.fields);
export const PROFILE_KEYS = PROFILE_FIELDS.map((x) => x.key);
export const FIELD_BY_KEY = Object.fromEntries(PROFILE_FIELDS.map((x) => [x.key, x]));

export const CUSTOM_PREFIX = 'custom:';
export const isCustomKey = (key) => key.startsWith(CUSTOM_PREFIX);
export const customKey = (label) =>
  CUSTOM_PREFIX + label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Display label for any key, including custom ones. */
export function keyLabel(key, profile) {
  return FIELD_BY_KEY[key]?.label ?? profile?.customFields?.find((c) => c.key === key)?.label ?? key;
}
