/**
 * formDetection.ts
 *
 * Root-first analysis for the Sentence-in-a-Word feature.
 *
 * Given a pure verb stem (all personal affixes already stripped), detects:
 *   1. The Arabic verb Form (I–X)
 *   2. The root consonants
 *   3. The reconstructed base verb (3ms past, diacritized)
 *   4. The reconstructed present-tense stem (3ms, diacritized)
 *
 * Works for both past-tense stems and present-tense stems
 * (present = after stripping the personal يَ/تَ/أَ/نَ prefix).
 *
 * Reuses the battle-tested detect* functions from normalization.ts.
 */

import { transliterate }                         from "./transliterate.js";
import { stripDiacritics }                        from "./normalization.js";
import {
  detectFormII, detectFormIII, detectFormIV,
  detectFormV,  detectFormVI,  detectFormVII,
  detectFormVIII, detectFormX, expandRoot,
} from "./normalization.js";

// ── Arabic Unicode constants ───────────────────────────────────────────────
const FATHA  = "\u064E"; // َ
const KASRA  = "\u0650"; // ِ
const DAMMA  = "\u064F"; // ُ
const SUKUN  = "\u0652"; // ْ
const SHADDA = "\u0651"; // ّ
const ALEF   = "\u0627"; // ا
const HAMZA_A = "\u0623"; // أ
const HAMZA_I = "\u0625"; // إ
const ALEF_WASL = "\u0671"; // ٱ
const TA     = "\u062A"; // ت
const NUN    = "\u0646"; // ن
const SIN    = "\u0633"; // س
const YA_PRES = "\u064A"; // ي

// ── Form metadata ──────────────────────────────────────────────────────────
export interface FormMeta {
  number: string;     // "I", "II", …, "X"
  patternPast: string;
  patternPres: string;   // full يَفْعَلُ form
  semanticNote: string;
}

export const FORM_META: Record<string, FormMeta> = {
  "I":    { number: "I",    patternPast: "فَعَلَ",        patternPres: "يَفْعَلُ",        semanticNote: "Basic verb"                           },
  "II":   { number: "II",   patternPast: "فَعَّلَ",       patternPres: "يُفَعِّلُ",       semanticNote: "Intensify / causative / denominative" },
  "III":  { number: "III",  patternPast: "فَاعَلَ",       patternPres: "يُفَاعِلُ",       semanticNote: "Direction toward / mutual action"     },
  "IV":   { number: "IV",   patternPast: "أَفْعَلَ",      patternPres: "يُفْعِلُ",        semanticNote: "Causative"                            },
  "V":    { number: "V",    patternPast: "تَفَعَّلَ",     patternPres: "يَتَفَعَّلُ",     semanticNote: "Reflexive of Form II / gradual process"},
  "VI":   { number: "VI",   patternPast: "تَفَاعَلَ",     patternPres: "يَتَفَاعَلُ",     semanticNote: "Mutual / reciprocal"                  },
  "VII":  { number: "VII",  patternPast: "اِنْفَعَلَ",    patternPres: "يَنْفَعِلُ",      semanticNote: "Passive / reflexive of Form I"         },
  "VIII": { number: "VIII", patternPast: "اِفْتَعَلَ",    patternPres: "يَفْتَعِلُ",      semanticNote: "Reflexive / intensive"                },
  "X":    { number: "X",    patternPast: "اِسْتَفْعَلَ",  patternPres: "يَسْتَفْعِلُ",    semanticNote: "Seek / consider / deem"               },
};

// ── Result type ────────────────────────────────────────────────────────────
export interface FormDetectionResult {
  form:          string;      // "I" … "X" or "?"
  roots:         string[];    // e.g. ["ع","م","ل"]
  rootStr:       string;      // "ع م ل"
  baseVerb:      string;      // 3ms past diacritized (reconstructed)
  baseVerbTr:    string;
  prestem:       string;      // 3ms present diacritized (reconstructed)
  prestemTr:     string;
  meta:          FormMeta | null;
}

// ── Base-verb reconstruction ───────────────────────────────────────────────
function buildPast(form: string, r: string[]): string {
  const [r1, r2, r3] = r as [string, string, string];
  switch (form) {
    case "I":    return `${r1}${FATHA}${r2}${FATHA}${r3}${FATHA}`;
    case "II":   return `${r1}${FATHA}${r2}${SHADDA}${FATHA}${r3}${FATHA}`;
    case "III":  return `${r1}${FATHA}${ALEF}${r2}${FATHA}${r3}${FATHA}`;
    case "IV":   return `${HAMZA_A}${FATHA}${r1}${SUKUN}${r2}${FATHA}${r3}${FATHA}`;
    case "V":    return `${TA}${FATHA}${r1}${FATHA}${r2}${SHADDA}${FATHA}${r3}${FATHA}`;
    case "VI":   return `${TA}${FATHA}${r1}${FATHA}${ALEF}${r2}${FATHA}${r3}${FATHA}`;
    case "VII":  return `${ALEF_WASL}${KASRA}${NUN}${SUKUN}${r1}${FATHA}${r2}${FATHA}${r3}${FATHA}`;
    case "VIII": return `${ALEF_WASL}${KASRA}${r1}${SUKUN}${TA}${FATHA}${r2}${FATHA}${r3}${FATHA}`;
    case "X":    return `${ALEF_WASL}${KASRA}${SIN}${SUKUN}${TA}${FATHA}${r1}${SUKUN}${r2}${FATHA}${r3}${FATHA}`;
    default:     return r.join("");
  }
}

function buildPresent(form: string, r: string[]): string {
  const [r1, r2, r3] = r as [string, string, string];
  switch (form) {
    case "I":    return `${YA_PRES}${FATHA}${r1}${SUKUN}${r2}${DAMMA}${r3}${DAMMA}`;
    case "II":   return `${YA_PRES}${DAMMA}${r1}${FATHA}${r2}${SHADDA}${KASRA}${r3}${DAMMA}`;
    case "III":  return `${YA_PRES}${DAMMA}${r1}${FATHA}${ALEF}${r2}${KASRA}${r3}${DAMMA}`;
    case "IV":   return `${YA_PRES}${DAMMA}${r1}${SUKUN}${r2}${KASRA}${r3}${DAMMA}`;
    case "V":    return `${YA_PRES}${FATHA}${TA}${FATHA}${r1}${FATHA}${r2}${SHADDA}${FATHA}${r3}${DAMMA}`;
    case "VI":   return `${YA_PRES}${FATHA}${TA}${FATHA}${r1}${FATHA}${ALEF}${r2}${FATHA}${r3}${DAMMA}`;
    case "VII":  return `${YA_PRES}${FATHA}${NUN}${SUKUN}${r1}${FATHA}${r2}${KASRA}${r3}${DAMMA}`;
    case "VIII": return `${YA_PRES}${FATHA}${r1}${SUKUN}${TA}${FATHA}${r2}${KASRA}${r3}${DAMMA}`;
    case "X":    return `${YA_PRES}${FATHA}${SIN}${SUKUN}${TA}${FATHA}${r1}${SUKUN}${r2}${KASRA}${r3}${DAMMA}`;
    default:     return `${YA_PRES}${FATHA}${r.join("")}`;
  }
}

function makeResult(form: string, roots: [string, string, string]): FormDetectionResult {
  const meta = FORM_META[form] ?? null;
  const past  = buildPast(form, roots);
  const pres  = buildPresent(form, roots);
  return {
    form,
    roots: [...roots],
    rootStr: roots.join(" "),
    baseVerb:   past,
    baseVerbTr: transliterate(past),
    prestem:    pres,
    prestemTr:  transliterate(pres),
    meta,
  };
}

function unknownResult(stemDiac: string): FormDetectionResult {
  return {
    form: "?", roots: [], rootStr: "",
    baseVerb: stemDiac, baseVerbTr: transliterate(stemDiac),
    prestem: stemDiac, prestemTr: transliterate(stemDiac),
    meta: null,
  };
}

// ── Main entry points ──────────────────────────────────────────────────────

/**
 * Detect form from a PAST-TENSE stem.
 *
 * `stemDiac` is the diacritized verb after all personal suffixes are stripped
 * (e.g. "اِسْتَعْمَلَ", "كَتَبَ", "دَرَّسَ").
 *
 * Uses the existing normalization.ts detect* functions in the canonical order:
 *   Form X → VIII → VII → VI → V → IV → III → II → I
 */
export function detectFormFromPast(stemDiac: string): FormDetectionResult {
  const bare = stripDiacritics(stemDiac);

  // Form X — must be checked first (its 5-char variant shares prefix with VIII)
  const x = detectFormX(bare);
  if (x) return makeResult("X", x);

  // Form VIII
  const viii = detectFormVIII(bare);
  if (viii) return makeResult("VIII", viii);

  // Form VII
  const vii = detectFormVII(bare);
  if (vii) return makeResult("VII", vii);

  // Form VI
  const vi = detectFormVI(bare);
  if (vi) return makeResult("VI", vi);

  // Form V
  const v = detectFormV(bare);
  if (v) return makeResult("V", v);

  // Form IV
  const iv = detectFormIV(bare);
  if (iv) return makeResult("IV", iv);

  // Form III
  const iii = detectFormIII(bare);
  if (iii) return makeResult("III", iii);

  // Form II (needs the diacritized string for shadda expansion)
  const ii = detectFormII(stemDiac);
  if (ii) return makeResult("II", ii);

  // Form I — bare 3-letter triliteral root
  const i = expandRoot(stemDiac);
  if (i) return makeResult("I", i);

  return unknownResult(stemDiac);
}

/**
 * Detect form from a PRESENT-TENSE inner stem.
 *
 * `innerStem` is the diacritized string AFTER the personal prefix
 * (يَ / تَ / أَ / نَ) has been stripped.
 *
 * Present-stem patterns map to form prefixes/infixes:
 *   Form X:    starts with سْتَ  (ست bare)     → ست + R1 + R2 + R3
 *   Form VIII: C + تَ + CC       (C+ت bare)     → R1 + ت-infix + R2 + R3
 *   Form VII:  starts with نْ    (ن bare)       → ن + R1 + R2 + R3
 *   Form VI:   starts with تَفَاعَ (تـ+ALEF)    → ت + R1 + ALEF + R2 + R3
 *   Form V:    starts with تَفَعَّ (ت+shadda)   → ت + R1 + R2(doubled) + R3
 *   Form II:   has shadda on 2nd consonant      → R1 + R2(doubled) + R3
 *   Form III:  has ALEF between 1st & 2nd cons  → R1 + ALEF + R2 + R3
 *   Form IV:   3 bare consonants, يُ prefix     → handled by caller (damma on prefix)
 *   Form I:    3 bare consonants                → R1 + R2 + R3
 *
 * Note: Form IV present (يُفْعِلُ) looks like Form I after stripping يُ.
 * We distinguish via the damma (ُ) on the personal prefix passed in `prefixDamma`.
 */
export function detectFormFromPresent(
  innerStem: string,
  prefixHasDamma: boolean = false,
): FormDetectionResult {
  const bare = stripDiacritics(innerStem);

  // Form X: bare starts with "ست" + at least 3 more chars = 5+ chars
  if (bare.startsWith("ست") && bare.length >= 5) {
    // Convert to past citation form: اِسْتَ + bare[2..4]
    const r1 = bare[2]!, r2 = bare[3]!, r3 = bare[4]!;
    // Verify by reconstructing the past Form X and re-running detectFormX
    const pastBare = "است" + r1 + r2 + r3;
    const roots = detectFormX(pastBare);
    if (roots) return makeResult("X", roots);
  }

  // Form VIII: bare[1] === ت and bare length 4 (C + ت + R2 + R3)
  // Reconstruct the past Form VIII: ا + R1 + ت + R2 + R3
  if (bare.length >= 4 && bare[1] === TA) {
    const pastBare = ALEF + bare[0]! + TA + bare[2]! + bare[3]!;
    const roots = detectFormVIII(pastBare);
    if (roots) return makeResult("VIII", roots);
  }

  // Form VII: bare starts with "ن" + 3 consonants = 4 chars
  if (bare.startsWith(NUN) && bare.length >= 4) {
    const pastBare = ALEF + NUN + bare[1]! + bare[2]! + bare[3]!;
    const roots = detectFormVII(pastBare);
    if (roots) return makeResult("VII", roots);
  }

  // Form VI: bare starts with "ت" + C + "ا" + C + C = 5 chars, bare[2] = ا
  if (bare.length >= 5 && bare[0] === TA && bare[2] === ALEF) {
    const pastBare = TA + bare[1]! + ALEF + bare[3]! + bare[4]!;
    const roots = detectFormVI(pastBare);
    if (roots) return makeResult("VI", roots);
  }

  // Form V: bare starts with "ت" + 3 consonants, and innerStem has shadda on middle
  if (bare.length >= 4 && bare[0] === TA && innerStem.includes(SHADDA)) {
    // Reconstruct past Form V: تَ + R1 + R2(shadda) + R3
    const pastStem = `${TA}${FATHA}${bare[1]}${FATHA}${bare[2]}${SHADDA}${FATHA}${bare[3] ?? bare[2]}${FATHA}`;
    const roots = detectFormV(pastStem);
    if (roots) return makeResult("V", roots);
    // Fallback bare-based
    const r = [bare[1]!, bare[2]!, bare[3] ?? bare[2]!] as [string, string, string];
    return makeResult("V", r);
  }

  // Form II: innerStem has shadda on the 2nd consonant (no leading ت)
  if (bare.length >= 3 && innerStem.includes(SHADDA)) {
    const roots = detectFormII(innerStem);
    if (roots) return makeResult("II", roots);
  }

  // Form III: bare length 4, bare[1] === ا (ALEF between R1 and R2)
  if (bare.length >= 4 && bare[1] === ALEF) {
    const roots = detectFormIII(bare);
    if (roots) return makeResult("III", roots);
  }

  // Form IV: same surface as Form I (3 consonants) but personal prefix has damma
  if (prefixHasDamma && bare.length >= 3) {
    const pastBare = ALEF + bare[0]! + bare[1]! + bare[2]!;
    const roots = detectFormIV(pastBare);
    if (roots) return makeResult("IV", roots);
  }

  // Form I: 3-consonant stem (default)
  if (bare.length >= 3) {
    const r = expandRoot(innerStem) ?? ([bare[0]!, bare[1]!, bare[2]!] as [string, string, string]);
    return makeResult("I", r);
  }

  return unknownResult(innerStem);
}
