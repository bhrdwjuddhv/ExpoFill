import googleForms from './googleForms.js';

/** Site-specific scanners. Each: { name, match(url, doc), title?(doc), getQuestions(root), fill? } */
export const PRESETS = [googleForms];

export const findPreset = (url, doc) => PRESETS.find((p) => p.match(url, doc)) ?? null;
