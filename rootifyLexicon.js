/**
 * rootifyLexicon.js
 *
 * Form I Arabic verb lexicon lookup module for Rootify.
 *
 * Usage:
 *   import { getFormILexiconEntry } from './rootifyLexicon.js';
 *
 *   const entry = getFormILexiconEntry('كَتَبَ');
 *   // => { past: 'كَتَبَ', present: 'يَكْتُبُ', bab: 'nasara', pattern: 'فَعَلَ يَفْعُلُ', gloss: 'to write' }
 *
 *   const miss = getFormILexiconEntry('سبح');
 *   // => { past: 'سَبَحَ', present: 'يَسْبَحُ', bab: 'fataha', pattern: 'فَعَلَ يَفْعَلُ', gloss: '...' }
 *
 * Integration contract:
 *   - Call getFormILexiconEntry(input) BEFORE any bāb-picker or default-vowel
 *     fallback logic in the Form I analysis path.
 *   - If the return value is non-null, use its `past`/`present` vowels directly
 *     and skip the bāb picker UI.
 *   - If the return value is null, proceed to the bāb picker (or other fallback).
 *
 * This module does NOT modify any conjugation logic. It is a pure read-only
 * lookup layer that intercepts before the fallback guessing path.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Arabic diacritic code-points to strip during normalization ─────────────
// U+064B FATHATAN  U+064C DAMMATAN  U+064D KASRATAN
// U+064E FATHAH    U+064F DAMMAH    U+0650 KASRAH
// U+0651 SHADDA    U+0652 SUKUN     U+0653 MADDAH ABOVE
// U+0654 HAMZA ABOVE  U+0655 HAMZA BELOW  U+0656–U+065F rare marks
// U+0670 SUPERSCRIPT ALEF (alef wasla vowel)  U+0671 ALEF WASLA
const DIACRITIC_RE = /[\u064B-\u065F\u0670\u0671]/g;

// ── Load lexicon once at module initialisation ─────────────────────────────
const LEXICON_PATH = join(__dirname, 'data', 'rootify_form1_lexicon.json');

/** @type {Record<string, { past: string, present: string, bab: string, pattern: string, gloss?: string }>} */
let _lexicon;

function _loadLexicon() {
  if (_lexicon) return _lexicon;
  try {
    const raw = readFileSync(LEXICON_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    // Strip internal _meta key — it is not a verb entry
    const { _meta: _ignored, ...entries } = parsed;
    _lexicon = entries;
  } catch (err) {
    console.error('[rootifyLexicon] Failed to load lexicon:', err.message);
    _lexicon = {};
  }
  return _lexicon;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Remove all Arabic diacritics (harakat) from a string, producing the bare
 * consonant skeleton used as a lookup key.
 *
 * @param {string} str - Arabic text with or without diacritics
 * @returns {string}   - Bare consonant string
 */
export function normalize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().replace(DIACRITIC_RE, '');
}

/**
 * Look up a Form I Arabic verb in the Rootify lexicon.
 *
 * Behaviour:
 *   1. Normalize `input` by stripping diacritics.
 *   2. Look up the normalized string in the JSON bank.
 *   3. If found, return the full entry object.
 *   4. If not found, return null — caller should fall back to bāb picker.
 *
 * The lexicon entry OVERRIDES any bāb guessing or default-vowel logic.
 * Callers must treat a non-null result as the authoritative source of truth
 * for pastVowel, presentVowel, and bāb classification.
 *
 * @param {string} input - Arabic verb (bare root OR diacritized past-3ms form)
 * @returns {{ past: string, present: string, bab: string, pattern: string, gloss?: string } | null}
 */
export function getFormILexiconEntry(input) {
  if (!input || typeof input !== 'string') return null;

  const lex = _loadLexicon();
  const key = normalize(input);
  if (!key) return null;

  return lex[key] ?? null;
}

/**
 * Check whether a given (normalized or diacritized) root is present in the
 * lexicon without returning the full entry.  Useful for fast guards.
 *
 * @param {string} input
 * @returns {boolean}
 */
export function hasFormIEntry(input) {
  return getFormILexiconEntry(input) !== null;
}

/**
 * Return all entries whose `bab` field matches the given bāb name.
 * Useful for building paradigm tables or validating coverage.
 *
 * @param {string} babName - e.g. "nasara", "alima", "jawwaf-waw"
 * @returns {Array<{ key: string } & { past: string, present: string, bab: string, pattern: string, gloss?: string }>}
 */
export function getEntriesByBab(babName) {
  const lex = _loadLexicon();
  return Object.entries(lex)
    .filter(([, entry]) => entry.bab === babName)
    .map(([key, entry]) => ({ key, ...entry }));
}

/**
 * Return the total number of verb entries currently in the lexicon
 * (excluding the _meta record).
 *
 * @returns {number}
 */
export function lexiconSize() {
  return Object.keys(_loadLexicon()).length;
}
