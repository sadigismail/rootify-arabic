/**
 * irregularRules.ts
 * Produces surface forms for hollow, defective, and doubled roots.
 *
 * Key changes vs. original:
 *  - hollowPast: accepts presentVowel to determine contracted past short-vowel.
 *    presentVowel="u" → DAMMA (قُلْتَ).  "i" or "a" → KASRA (بِعْتَ, نِمْتَ).
 *  - hollowPresent: presentVowel="a" → long ALEF in present (يَنَامُ type).
 *  - defectivePresent: presentVowel="a" → alef-maqsura ending (يَسْعَى type).
 */

import type { RootType } from "./rootClassifier.js";

const FATHA  = "\u064E"; // َ
const KASRA  = "\u0650"; // ِ
const DAMMA  = "\u064F"; // ُ
const SUKUN  = "\u0652"; // ْ
const SHADDA = "\u0651"; // ّ
const ALEF   = "\u0627"; // ا
const WAW    = "\u0648"; // و
const YA     = "\u064A"; // ي
const ALEF_MAQSURA = "\u0649"; // ى

// ──────────────────────────────────────────────────
// Hollow roots  (R2 = و or ي)
// ──────────────────────────────────────────────────

/**
 * @param presentVowel "u" | "i" | "a"
 *   - "u"  → contracted past vowel = DAMMA  (قُلْتَ)
 *   - "i"  → contracted past vowel = KASRA  (بِعْتَ)
 *   - "a"  → contracted past vowel = KASRA  (نِمْتَ — unusual type like نام)
 */
function hollowPast(
  r1: string,
  r2: string,
  r3: string,
  _pastVowel: string,
  presentVowel: string,
): Record<string, string> {
  const stemLong = r1 + FATHA + ALEF + r3;  // قَال / بَاع / نَام

  // Contracted short-vowel follows present vowel: "u" → DAMMA, else → KASRA
  const shortVowel = presentVowel === "u" ? DAMMA : KASRA;
  const stemShort  = r1 + shortVowel + r3;   // قُل / بِع / نِم

  return {
    "3ms": stemLong + FATHA,                    // قَالَ
    "3fs": stemLong + FATHA + "ت",              // قَالَت
    "3md": stemLong + FATHA + "ا",              // قَالَا
    "3fd": stemLong + FATHA + "تَا",            // قَالَتَا
    "3mp": stemLong + DAMMA + "وا",             // قَالُوا
    "3fp": stemShort + SUKUN + "نَ",            // قُلْنَ
    "2ms": stemShort + SUKUN + "تَ",            // قُلْتَ
    "2fs": stemShort + SUKUN + "تِ",            // قُلْتِ
    "2md": stemShort + SUKUN + "تُمَا",         // قُلْتُمَا
    "2mp": stemShort + SUKUN + "تُمْ",          // قُلْتُمْ
    "2fp": stemShort + SUKUN + "تُنَّ",         // قُلْتُنَّ
    "1s":  stemShort + SUKUN + "تُ",            // قُلْتُ
    "1p":  stemShort + SUKUN + "نَا",           // قُلْنَا
  };
}

/**
 * @param presentVowel "u" | "i" | "a"
 *   - "u" → long WAW  (يَقُولُ)
 *   - "i" → long YA   (يَبِيعُ)
 *   - "a" → long ALEF (يَنَامُ — unusual pattern, R2=WAW but present alef)
 */
function hollowPresent(
  r1: string,
  _r2: string,
  r3: string,
  presentVowel: string,
): Record<string, string> {
  const longVowelChar  = presentVowel === "u" ? WAW  : presentVowel === "i" ? YA  : ALEF;
  const shortVowelChar = presentVowel === "u" ? DAMMA : presentVowel === "i" ? KASRA : FATHA;

  // Long stem: يَقُولُ → prefix + r1 + shortV + longV + r3 + ending
  function longForm(pfx: string, sfx: string): string {
    return pfx + r1 + shortVowelChar + longVowelChar + r3 + sfx;
  }

  // Short stem used in forms with a consonantal suffix that closes the syllable
  const stemShort = r1 + SUKUN + r3;

  return {
    "3ms": longForm("يَ", DAMMA),               // يَقُولُ / يَبِيعُ / يَنَامُ
    "3fs": longForm("تَ", DAMMA),               // تَقُولُ
    "3md": longForm("يَ", FATHA + "انِ"),        // يَقُولَانِ
    "3fd": longForm("تَ", FATHA + "انِ"),        // تَقُولَانِ
    "3mp": longForm("يَ", DAMMA + "ونَ"),        // يَقُولُونَ
    "3fp": "يَ" + stemShort + SUKUN + "نَ",      // يَقُلْنَ
    "2ms": longForm("تَ", DAMMA),               // تَقُولُ
    "2fs": "تَ" + stemShort + shortVowelChar + "ينَ", // تَقُلِينَ (simplified)
    "2md": longForm("تَ", FATHA + "انِ"),        // تَقُولَانِ
    "2mp": longForm("تَ", DAMMA + "ونَ"),        // تَقُولُونَ
    "2fp": "تَ" + stemShort + SUKUN + "نَ",      // تَقُلْنَ
    "1s":  longForm("أَ", DAMMA),               // أَقُولُ
    "1p":  longForm("نَ", DAMMA),               // نَقُولُ
  };
}

// ──────────────────────────────────────────────────
// Defective roots  (R3 = و or ي)
// ──────────────────────────────────────────────────

function defectivePast(
  r1: string,
  r2: string,
  _r3: string,
  _pastVowel: string,
  forceWaw?: boolean,
): Record<string, string> {
  const isWaw = forceWaw === true;

  const link = isWaw ? WAW : YA;

  const longEnd3ms = isWaw ? ALEF : ALEF_MAQSURA;

  const base     = r1 + FATHA + r2 + FATHA;
  const linkStem = base + link + SUKUN;

  return {
    "3ms": base + longEnd3ms,
    "3fs": base + "ت",
    "3md": base + link + FATHA + "ا",
    "3fd": base + "تَا",
    "3mp": base + "وْا",
    "3fp": base + link + SUKUN + "نَ",
    "2ms": linkStem + "تَ",
    "2fs": linkStem + "تِ",
    "2md": linkStem + "تُمَا",
    "2mp": linkStem + "تُمْ",
    "2fp": linkStem + "تُنَّ",
    "1s":  linkStem + "تُ",
    "1p":  linkStem + "نَا",
  };
}

/**
 * Defective present — full paradigm for all three sub-types.
 *
 * @param presentVowel "u" | "i" | "a"
 *   - "u" → waw-type:  يَدْعُو  (R3=و or forced by vowel)
 *   - "i" → ya-type:   يَرْمِي  (R3=ي)
 *   - "a" → alef-type: يَسْعَى  (R3=ي but present-a → alef maqsura)
 *
 * Key paradigm rules:
 *   DUAL   (3md/3fd/2md): R3 reappears + fatha before انِ
 *   MP     (3mp/2mp):     R3 drops; waw/ya → ُونَ, alef → َوْنَ
 *   FP     (3fp/2fp):     R3 stays with sukun before نَ
 *   2FS:   waw → kasra replaces damma (تَدْعِينَ);
 *          ya → kasra stays (تَرْمِينَ);
 *          alef → fatha + ya-sukun (تَسْعَيْنَ)
 */
function defectivePresent(
  r1: string,
  r2: string,
  r3: string,
  presentVowel: string,
): Record<string, string> {
  const isWaw  = r3 === WAW || (r3 !== YA && presentVowel === "u");
  const isAlef = presentVowel === "a" && !isWaw;

  const vChar = presentVowel === "u" ? DAMMA
              : presentVowel === "a" ? FATHA
              : KASRA;

  const longEnd  = isAlef ? ALEF_MAQSURA : (isWaw ? WAW : YA);
  const weakR3   = isWaw ? WAW : YA;

  const stemBase = r1 + SUKUN + r2;
  const stemFull = stemBase + vChar + longEnd;

  const dualSfx = weakR3 + FATHA + "انِ";

  const mpVowel = isAlef ? FATHA : DAMMA;
  const mpSfx   = isAlef ? (WAW + SUKUN + "نَ") : "ونَ";

  const fsSfx = isAlef
    ? (FATHA + YA + SUKUN + "نَ")
    : (KASRA + YA + "نَ");

  const fpSfx = weakR3 + SUKUN + "نَ";

  return {
    "3ms": "يَ" + stemFull,
    "3fs": "تَ" + stemFull,
    "3md": "يَ" + stemBase + vChar + dualSfx,
    "3fd": "تَ" + stemBase + vChar + dualSfx,
    "3mp": "يَ" + stemBase + mpVowel + mpSfx,
    "3fp": "يَ" + stemBase + vChar + fpSfx,
    "2ms": "تَ" + stemFull,
    "2fs": "تَ" + stemBase + fsSfx,
    "2md": "تَ" + stemBase + vChar + dualSfx,
    "2mp": "تَ" + stemBase + mpVowel + mpSfx,
    "2fp": "تَ" + stemBase + vChar + fpSfx,
    "1s":  "أَ" + stemFull,
    "1p":  "نَ" + stemFull,
  };
}

/**
 * Contracted defective present for verbs where R2 hamza drops (رأى → يَرَى).
 *
 * The medial hamza (أ) is entirely elided in the present stem, leaving only
 * R1 + fatha as the stem.  The ending pattern follows the alef-type (سعى)
 * paradigm but without R2.
 */
function defectivePresentContracted(
  r1: string,
): Record<string, string> {
  const stemFull = r1 + FATHA + ALEF_MAQSURA;
  const stemYA   = r1 + FATHA + YA;

  return {
    "3ms": "يَ" + stemFull,
    "3fs": "تَ" + stemFull,
    "3md": "يَ" + stemYA + FATHA + "انِ",
    "3fd": "تَ" + stemYA + FATHA + "انِ",
    "3mp": "يَ" + r1 + FATHA + WAW + SUKUN + "نَ",
    "3fp": "يَ" + stemYA + SUKUN + "نَ",
    "2ms": "تَ" + stemFull,
    "2fs": "تَ" + stemYA + SUKUN + "نَ",
    "2md": "تَ" + stemYA + FATHA + "انِ",
    "2mp": "تَ" + r1 + FATHA + WAW + SUKUN + "نَ",
    "2fp": "تَ" + stemYA + SUKUN + "نَ",
    "1s":  "أَ" + stemFull,
    "1p":  "نَ" + stemFull,
  };
}

// ──────────────────────────────────────────────────
// Doubled roots  (R2 = R3)
// ──────────────────────────────────────────────────

function doubledPast(
  r1: string,
  r2: string,
  _r3: string,
  _pastVowel: string,
): Record<string, string> {
  const stemGem   = r1 + FATHA + r2 + SHADDA;       // رَدّ
  const stemSplit = r1 + FATHA + r2 + FATHA + r2;   // رَدَد

  return {
    "3ms": stemGem   + FATHA,                    // رَدَّ
    "3fs": stemGem   + FATHA + "ت",              // رَدَّت
    "3md": stemGem   + FATHA + "ا",              // رَدَّا
    "3fd": stemGem   + FATHA + "تَا",            // رَدَّتَا
    "3mp": stemGem   + DAMMA + "وا",             // رَدُّوا
    "3fp": stemSplit + SUKUN  + "نَ",             // رَدَدْنَ
    "2ms": stemSplit + SUKUN  + "تَ",             // رَدَدْتَ
    "2fs": stemSplit + SUKUN  + "تِ",             // رَدَدْتِ
    "2md": stemSplit + SUKUN  + "تُمَا",          // رَدَدْتُمَا
    "2mp": stemSplit + SUKUN  + "تُمْ",           // رَدَدْتُمْ
    "2fp": stemSplit + SUKUN  + "تُنَّ",          // رَدَدْتُنَّ
    "1s":  stemSplit + SUKUN  + "تُ",             // رَدَدْتُ
    "1p":  stemSplit + SUKUN  + "نَا",            // رَدَدْنَا
  };
}

function doubledPresent(
  r1: string,
  r2: string,
  _r3: string,
  presentVowel: string,
): Record<string, string> {
  const vChar = presentVowel === "u" ? DAMMA : presentVowel === "i" ? KASRA : FATHA;

  const stemGem   = r1 + vChar + r2 + SHADDA;           // يَرُدّ
  const stemSplit = r1 + SUKUN  + r2 + vChar + r2;      // يَرْدُد (fp only)

  return {
    "3ms": "يَ" + stemGem + vChar,               // يَرُدُّ
    "3fs": "تَ" + stemGem + vChar,               // تَرُدُّ
    "3md": "يَ" + stemGem + FATHA + "انِ",       // يَرُدَّانِ
    "3fd": "تَ" + stemGem + FATHA + "انِ",
    "3mp": "يَ" + stemGem + DAMMA + "ونَ",       // يَرُدُّونَ
    "3fp": "يَ" + stemSplit + SUKUN + "نَ",       // يَرْدُدْنَ
    "2ms": "تَ" + stemGem + vChar,               // تَرُدُّ
    "2fs": "تَ" + stemGem + KASRA + "ينَ",       // تَرُدِّينَ
    "2md": "تَ" + stemGem + FATHA + "انِ",
    "2mp": "تَ" + stemGem + DAMMA + "ونَ",       // تَرُدُّونَ
    "2fp": "تَ" + stemSplit + SUKUN + "نَ",       // تَرْدُدْنَ
    "1s":  "أَ" + stemGem + vChar,               // أَرُدُّ
    "1p":  "نَ" + stemGem + vChar,               // نَرُدُّ
  };
}

// ── Public API ────────────────────────────────────────────────────

export function getIrregularPast(
  type: RootType,
  r1: string,
  r2: string,
  r3: string,
  pastVowel: string,
  presentVowel: string,
): Record<string, string> | null {
  switch (type) {
    case "hollow_waw":
    case "hollow_ya":
      return hollowPast(r1, r2, r3, pastVowel, presentVowel);
    case "defective_waw":
      return defectivePast(r1, r2, r3, pastVowel, true);
    case "defective_ya":
      return defectivePast(r1, r2, r3, pastVowel, false);
    case "doubled":
      return doubledPast(r1, r2, r3, pastVowel);
    default:
      if (r2 === ALEF) return hollowPast(r1, r2, r3, pastVowel, presentVowel);
      if (r3 === ALEF) return defectivePast(r1, r2, r3, pastVowel);
      return null;
  }
}

export function getIrregularPresent(
  type: RootType,
  r1: string,
  r2: string,
  r3: string,
  presentVowel: string,
  contractR2Hamza?: boolean,
): Record<string, string> | null {
  switch (type) {
    case "hollow_waw":
    case "hollow_ya":
      return hollowPresent(r1, r2, r3, presentVowel);
    case "defective_waw":
    case "defective_ya":
      if (contractR2Hamza) return defectivePresentContracted(r1);
      return defectivePresent(r1, r2, r3, presentVowel);
    case "doubled":
      return doubledPresent(r1, r2, r3, presentVowel);
    default:
      if (r2 === ALEF) return hollowPresent(r1, r2, r3, presentVowel);
      if (r3 === ALEF) return defectivePresent(r1, r2, r3, presentVowel);
      return null;
  }
}
