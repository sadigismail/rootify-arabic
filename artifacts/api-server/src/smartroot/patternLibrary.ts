/**
 * patternLibrary.ts
 * Form I conjugation patterns for each root type across all 13 Arabic pronouns.
 *
 * For regular/assimilated roots, past-tense pattern:
 *   R1(vowelR1) + R2(pastVowel) + R3 + suffix
 *
 * Note: The fatha on R3 in 3ms past is encoded in the suffix field.
 */

import type { RootType } from "./rootClassifier.js";

export interface Pronoun {
  id: string;
  label: string;
}

export const PRONOUNS: Pronoun[] = [
  { id: "1s", label: "أنا" },
  { id: "1p", label: "نحن" },
  { id: "2ms", label: "أنت" },
  { id: "2fs", label: "أنتِ" },
  { id: "2md", label: "أنتما" },
  { id: "2mp", label: "أنتم" },
  { id: "2fp", label: "أنتن" },
  { id: "3ms", label: "هو" },
  { id: "3fs", label: "هي" },
  { id: "3md", label: "هما (مذكر)" },
  { id: "3fd", label: "هما (مؤنث)" },
  { id: "3mp", label: "هم" },
  { id: "3fp", label: "هن" },
];

// Short vowel diacritics
const FATHA = "\u064E";   // َ
const KASRA = "\u0650";   // ِ
const DAMMA = "\u064F";   // ُ
const SUKUN = "\u0652";   // ْ

export interface ConsonantPattern {
  prefix: string;
  suffix: string;    // appended AFTER R3 (includes vowel on R3 if any)
  vowelR1: string;
  vowelR2: string;
}

/**
 * Regular past tense patterns.
 * Build: R1(vowelR1) + R2(vowelR2) + R3 + suffix
 * The suffix for 3ms is just FATHA (vowel on R3 only, no additional letters).
 */
export const PAST_PATTERNS_REGULAR: Record<string, ConsonantPattern> = {
  "3ms": { prefix: "", suffix: FATHA,          vowelR1: FATHA, vowelR2: FATHA },
  "3fs": { prefix: "", suffix: FATHA + "ت",    vowelR1: FATHA, vowelR2: FATHA },
  "3md": { prefix: "", suffix: FATHA + "ا",    vowelR1: FATHA, vowelR2: FATHA },
  "3fd": { prefix: "", suffix: FATHA + "تَا",  vowelR1: FATHA, vowelR2: FATHA },
  "3mp": { prefix: "", suffix: DAMMA + "وا",   vowelR1: FATHA, vowelR2: FATHA },
  "3fp": { prefix: "", suffix: SUKUN + "نَ",   vowelR1: FATHA, vowelR2: FATHA },
  "2ms": { prefix: "", suffix: SUKUN + "تَ",   vowelR1: FATHA, vowelR2: FATHA },
  "2fs": { prefix: "", suffix: SUKUN + "تِ",   vowelR1: FATHA, vowelR2: FATHA },
  "2md": { prefix: "", suffix: SUKUN + "تُمَا",vowelR1: FATHA, vowelR2: FATHA },
  "2mp": { prefix: "", suffix: SUKUN + "تُمْ", vowelR1: FATHA, vowelR2: FATHA },
  "2fp": { prefix: "", suffix: SUKUN + "تُنَّ",vowelR1: FATHA, vowelR2: FATHA },
  "1s":  { prefix: "", suffix: SUKUN + "تُ",   vowelR1: FATHA, vowelR2: FATHA },
  "1p":  { prefix: "", suffix: SUKUN + "نَا",  vowelR1: FATHA, vowelR2: FATHA },
};

/**
 * Regular present tense patterns (indicative مضارع مرفوع).
 * Build: prefix + R1(vowelR1) + R2(presentVowel) + R3 + suffix
 * The suffix for 3ms is just DAMMA (indicative ending).
 */
export interface PresentPattern {
  prefix: string;
  suffix: string;   // appended AFTER R3 (includes ending vowel)
  vowelR1: string;
}

export const PRESENT_PATTERNS_REGULAR: Record<string, PresentPattern> = {
  "3ms": { prefix: "يَ", suffix: DAMMA,         vowelR1: SUKUN },
  "3fs": { prefix: "تَ", suffix: DAMMA,         vowelR1: SUKUN },
  "3md": { prefix: "يَ", suffix: FATHA + "انِ", vowelR1: SUKUN },
  "3fd": { prefix: "تَ", suffix: FATHA + "انِ", vowelR1: SUKUN },
  "3mp": { prefix: "يَ", suffix: DAMMA + "ونَ", vowelR1: SUKUN },
  "3fp": { prefix: "يَ", suffix: SUKUN + "نَ",  vowelR1: SUKUN },
  "2ms": { prefix: "تَ", suffix: DAMMA,         vowelR1: SUKUN },
  "2fs": { prefix: "تَ", suffix: KASRA + "ينَ", vowelR1: SUKUN },
  "2md": { prefix: "تَ", suffix: FATHA + "انِ", vowelR1: SUKUN },
  "2mp": { prefix: "تَ", suffix: DAMMA + "ونَ", vowelR1: SUKUN },
  "2fp": { prefix: "تَ", suffix: SUKUN + "نَ",  vowelR1: SUKUN },
  "1s":  { prefix: "أَ", suffix: DAMMA,         vowelR1: SUKUN },
  "1p":  { prefix: "نَ", suffix: DAMMA,         vowelR1: SUKUN },
};

export function getPastPatternSet(_type: RootType): typeof PAST_PATTERNS_REGULAR {
  return PAST_PATTERNS_REGULAR;
}

export function getPresentPatternSet(_type: RootType): typeof PRESENT_PATTERNS_REGULAR {
  return PRESENT_PATTERNS_REGULAR;
}
