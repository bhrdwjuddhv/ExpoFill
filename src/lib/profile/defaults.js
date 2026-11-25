/**
 * @typedef {{ id: string, name: string, values: Record<string, any>,
 *   customFields: { key: string, label: string }[], updatedAt?: number }} Profile
 */

/** @returns {Profile} */
export const newProfile = () => ({
  id: crypto.randomUUID(),
  name: 'Me',
  values: { phoneCountryCode: '+91', whatsappSameAsPhone: false, interests: [] },
  customFields: [],
});
