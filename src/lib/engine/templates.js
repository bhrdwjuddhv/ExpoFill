// Answer templates for long-text questions. Phase 2 has the suggestion lookup the
// classifier needs; placeholders and editing arrive in phase 8.
import { TEMPLATE_SUGGESTION_COUNT } from '../constants.js';
import { tokens } from './normalize.js';

export const CATEGORIES = ['Technology', 'Cybersecurity', 'Networking', 'Entrepreneurship', 'Education', 'General'];

export const CATEGORY_KEYWORDS = {
  Technology: ['technology', 'tech', 'software', 'ai', 'cloud', 'developer', 'build', 'innovation', 'product'],
  Cybersecurity: ['security', 'cyber', 'hacking', 'privacy', 'threat', 'ctf', 'infosec'],
  Networking: ['network', 'connect', 'meet', 'people', 'peers', 'community', 'collaborate'],
  Entrepreneurship: ['startup', 'founder', 'business', 'investor', 'funding', 'idea', 'pitch', 'entrepreneur'],
  Education: ['learn', 'student', 'study', 'course', 'career', 'skills', 'knowledge'],
  General: ['why attend', 'reason', 'purpose', 'expect', 'hope', 'gain', 'learn', 'motivation', 'interest'],
};

export const PLACEHOLDERS = ['eventName', 'organization', 'college', 'designation', 'interests', 'city'];

/** ["A", "B", "C"] → "A, B and C" */
export const joinList = (items) => {
  const list = [].concat(items ?? []).map(String).filter(Boolean);
  return list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;
};

/**
 * Replaces {eventName}, {organization}, {college}, {designation}, {interests}, {city}.
 * Placeholders with no value, and unknown ones, stay visible so the user notices.
 */
export function fillPlaceholders(text, { profile, eventName } = {}) {
  const v = profile?.values ?? {};
  const values = {
    eventName,
    organization: v.organization,
    college: v.college,
    designation: v.designation,
    interests: joinList(v.interests),
    city: v.city,
  };
  return String(text ?? '').replace(/\{(\w+)\}/g, (m, key) => (values[key] ? String(values[key]) : m));
}

/** Starts like a free-text answer question. */
const LONG_QUESTION = /^\s*(why|what do you|describe|tell us|how will|expectations?)\b/i;
export const isLongTextQuestion = (field, question) =>
  field.control === 'textarea' || field.control === 'contenteditable' || LONG_QUESTION.test(question ?? '');

/**
 * Up to 3 templates with text, ranked by keyword overlap with the question.
 * @returns {{ id: string, score: number }[]}
 */
export function suggestTemplates(question, templates = [], n = TEMPLATE_SUGGESTION_COUNT) {
  const q = new Set(tokens(question));
  return templates
    .filter((t) => t.text?.trim())
    .map((t) => {
      const kw = new Set([...(t.keywords ?? []), ...(CATEGORY_KEYWORDS[t.category] ?? [])].flatMap(tokens));
      let score = 0;
      for (const k of kw) if (q.has(k)) score++;
      return { id: t.id, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
