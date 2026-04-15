/**
 * form1Lexicon.ts — Rootify Form I Lexicon (v4, ~1000 entries)
 *
 * SOURCE OF TRUTH: /data/rootify_form1_lexicon.json — keep both in sync.
 *
 * ── Structure ──────────────────────────────────────────────────────────────
 *
 *  VERBS   — canonical entries keyed by the true dictionary spelling.
 *            Hamzated verbs use their full hamza seat (سأل, قرأ, أخذ).
 *            Defective-ya verbs use alef-maqsura (رمى, مشى, …).
 *            All other verbs are identical to their normalised form.
 *
 *  ALIASES — maps every normalisation-collapsed lookup key to a canonical
 *            VERBS key.  Required when normalisation produces a string
 *            that (a) obscures the verb's identity or (b) could collide
 *            with a different root as the bank grows.
 *
 *            Covered by ALIASES:
 *              • Hamzated  (أ→ا):  اخذ→أخذ, سال→سأل, قرا→قرأ, …
 *              • Defective-ya (ى→ي): رمي→رمى, مشي→مشى, …
 *
 * ── Lookup flow ────────────────────────────────────────────────────────────
 *   1. normalizeInput(input)         → normalised key
 *   2. ALIASES[normalised] ?? key   → canonical key
 *   3. VERBS[canonical]             → raw entry
 *   4. Derive vowels / rootType → return Form1LexEntry
 *
 * ── Integration contract (for callers in smartroot.ts) ───────────────────
 *   1. Call getFormILexiconEntry(normalizedInput) at the TOP of the Form I
 *      path — before lookupRoot(), before the bāb picker, before any vowel
 *      guessing.
 *   2. If the return value is non-null, use it directly and SKIP all fallback
 *      logic (lookupRoot + bāb picker + default vowels).
 *   3. If the return value is null, fall through to the existing path unchanged.
 */

import type { RootType } from "./rootClassifier.js";

// ── Normalisation ──────────────────────────────────────────────────────────

/** Strip Arabic harakat (U+064B–U+065F) and superscript alef (U+0670). */
const DIACRITICS_RE = /[\u064B-\u065F\u0670]/g;

/**
 * Normalise alef variants to bare alef so that أخذ / اخذ / إخذ all resolve
 * to the same string.  Also strips the alef-wasla (ٱ).
 * Note: the hamzated VERBS keys use the ORIGINAL أ — these collapsed strings
 * live only in the ALIASES map, which routes them back to the canonical key.
 */
const ALEF_VARIANTS_RE = /[\u0622\u0623\u0625\u0671]/g;

/**
 * classifyRoot() converts alef-maqsura (ى U+0649) to regular yeh (ي U+064A)
 * in its `normalized` output.  We mirror that here so that raw user input and
 * already-normalised strings both resolve through ALIASES to the canonical ى key.
 */
const ALEF_MAQSURA_RE = /\u0649/g;

export function normalizeInput(s: string): string {
  return s
    .trim()
    .replace(DIACRITICS_RE, "")
    .replace(ALEF_VARIANTS_RE, "\u0627")   // أ إ آ ٱ → ا
    .replace(ALEF_MAQSURA_RE, "\u064A");   // ى → ي
}

// ── Bāb → vowels ──────────────────────────────────────────────────────────

const BAB_VOWELS: Readonly<Record<string, { pastVowel: string; presentVowel: string }>> = {
  "nasara":     { pastVowel: "a", presentVowel: "u" },
  "daraba":     { pastVowel: "a", presentVowel: "i" },
  "fataha":     { pastVowel: "a", presentVowel: "a" },
  "alima":      { pastVowel: "i", presentVowel: "a" },
  "karuma":     { pastVowel: "u", presentVowel: "u" },
  "hasiba":     { pastVowel: "i", presentVowel: "i" },
  "mithal":     { pastVowel: "a", presentVowel: "i" },
  "jawwaf-waw": { pastVowel: "a", presentVowel: "u" },
  "jawwaf-ya":  { pastVowel: "a", presentVowel: "i" },
  "naqis-waw":  { pastVowel: "a", presentVowel: "u" },
  "naqis-ya":   { pastVowel: "a", presentVowel: "i" },
  "mudaaf":     { pastVowel: "a", presentVowel: "u" },
};

// ── Bāb → RootType override (only non-regular types need an override) ──────

const BAB_ROOT_TYPE: Partial<Record<string, RootType>> = {
  "mithal":     "assimilated",
  "jawwaf-waw": "hollow_waw",
  "jawwaf-ya":  "hollow_ya",
  "naqis-waw":  "defective_waw",
  "naqis-ya":   "defective_ya",
  "mudaaf":     "doubled",
};

// ── Internal entry type ────────────────────────────────────────────────────

type LexEntry = {
  bab: string;
  gloss: string;
  /** وزن / verb pattern label, e.g. "فَعَلَ يَفْعُلُ". */
  pattern?: string;
  /**
   * Attested Form I masdar(s).
   * - string  → single masdar (the common one)
   * - string[] → multiple masdars; first element is the common/primary one
   * If omitted, the noun engine falls back to rule-based generation.
   */
  masdar?: string | string[];
  /**
   * Force the RootType regardless of BAB_ROOT_TYPE.
   * Needed for hamzated verbs (سأل, قرأ, …) that classifyRoot
   * misclassifies as hollow / defective because it collapses أ → ا.
   */
  forceType?: RootType;
  /**
   * Corrected first / second / third radical.
   * Only present for hamzated entries where classifyRoot collapses the
   * hamza seat to plain alef, causing the conjugation engine to emit wrong
   * orthography.  Applied as overrides to r1 / r2 / r3 from classifyRoot.
   */
  r1?: string;
  r2?: string;
  r3?: string;
  contractR2?: boolean;
  tr?: "t" | "i" | "b";
  freq?: 1 | 2 | 3 | 4;
  ilr?: "0+" | "1" | "1+" | "2" | "2+" | "3" | "3+";
};

// ── Public return type ─────────────────────────────────────────────────────

export interface MasdarEntry {
  form: string;
  status: "attested";
  common: boolean;
}

export interface Form1LexEntry {
  /** Vowel on the second radical in the past tense (a / i / u). */
  pastVowel: string;
  /** Vowel on the second radical in the present tense (a / i / u). */
  presentVowel: string;
  /** English gloss. */
  gloss: string;
  /** Bāb name (nasara / daraba / fataha / alima / karuma / hasiba /
   *  mithal / jawwaf-waw / jawwaf-ya / naqis-waw / naqis-ya / mudaaf). */
  bab: string;
  /** Verb pattern / وزن string, e.g. "فَعَلَ يَفْعُلُ". */
  pattern?: string;
  /**
   * Attested Form I masdars from the lexicon.
   * Empty array means no masdar stored yet.
   */
  masdars: MasdarEntry[];
  /**
   * RootType override, or null to keep classifyRoot's type unchanged.
   * Derived from forceType (hamzated) or BAB_ROOT_TYPE (irregular babs).
   */
  rootType: RootType | null;
  /** The canonical VERBS key that was resolved, e.g. "سأل" for input "سال". */
  canonicalKey: string;
  /** Corrected R1 — only present for initial-hamza entries. */
  r1?: string;
  /** Corrected R2 — only present for medial-hamza entries. */
  r2?: string;
  /** Corrected R3 — only present for final-hamza entries. */
  r3?: string;
  contractR2?: boolean;
  transitivity?: "t" | "i" | "b";
  frequency_tier?: 1 | 2 | 3 | 4;
  teaching_level?: "0+" | "1" | "1+" | "2" | "2+" | "3" | "3+";
}

// ── VERBS — canonical store ────────────────────────────────────────────────
// Keys = true dictionary spelling.
//   • Hamzated roots carry the full hamza seat: أخذ  سأل  قرأ  …
//   • Defective-ya roots use alef-maqsura:       رمى  مشى  …
//   • All other roots are identical to their normalised form.
//
// Generated from /data/rootify_form1_lexicon.json — keep in sync.

const VERBS: Readonly<Record<string, LexEntry>> = {

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  Bab NASARA  —  فَعَلَ / يَفْعُلُ  (past-a  present-u)             ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  // ── Core vocabulary ──────────────────────────────────────────────────────
  "كنس": { bab: "nasara",  gloss: "to sweep", masdar: "كَنْس", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "كتب": { bab: "nasara",  gloss: "to write", masdar: "كِتَابَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "نصر": { bab: "nasara",  gloss: "to help / support", masdar: "نَصْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "دخل": { bab: "nasara",  gloss: "to enter", masdar: "دُخُول", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "خرج": { bab: "nasara",  gloss: "to exit / go out", masdar: "خُرُوج", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "طلب": { bab: "nasara",  gloss: "to seek / request", masdar: "طَلَب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "قتل": { bab: "nasara",  gloss: "to kill", masdar: "قَتْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "درس": { bab: "nasara",  gloss: "to study", masdar: ["دَرْس", "دِرَاسَة"], pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "حضر": { bab: "nasara",  gloss: "to attend / be present", masdar: "حُضُور", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "نظر": { bab: "nasara",  gloss: "to look / examine", masdar: "نَظَر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "شكر": { bab: "nasara",  gloss: "to thank", masdar: "شُكْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "نشر": { bab: "nasara",  gloss: "to spread / publish", masdar: "نَشْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 1, ilr: "1"},
  "ذكر": { bab: "nasara",  gloss: "to mention / remember", masdar: ["ذِكْر", "تَذْكَار"], pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "سكن": { bab: "nasara",  gloss: "to reside / dwell", masdar: ["سُكْنَى", "سَكَن"], pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "حكم": { bab: "nasara",  gloss: "to rule / judge", masdar: "حُكْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "زحم": { bab: "nasara",  gloss: "to crowd / press against", masdar: "زَحْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "سكت": { bab: "nasara",  gloss: "to be silent", masdar: "سُكُوت", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "عصر": { bab: "nasara",  gloss: "to squeeze / press", masdar: "عَصْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "نسخ": { bab: "nasara",  gloss: "to copy / transcribe", masdar: "نَسْخ", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "حفر": { bab: "nasara",  gloss: "to dig", masdar: "حَفْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "عمر": { bab: "nasara",  gloss: "to inhabit / flourish", masdar: "عُمْرَان", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "سجد": { bab: "nasara",  gloss: "to prostrate", masdar: "سُجُود", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},

  // ── Nasara — high-frequency MSA expansion ───────────────────────────────
  "ترك": { bab: "nasara",  gloss: "to leave / abandon", masdar: "تَرْك", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "بلغ": { bab: "nasara",  gloss: "to reach / convey", masdar: "بُلُوغ", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "حشد": { bab: "nasara",  gloss: "to mobilize / gather", masdar: "حَشْد", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "خلق": { bab: "nasara",  gloss: "to create", masdar: "خَلْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "صلح": { bab: "nasara",  gloss: "to be good / right", masdar: "صَلَاح", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "فسد": { bab: "nasara",  gloss: "to corrupt / spoil", masdar: "فَسَاد", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 1, ilr: "1"},
  "رسم": { bab: "nasara",  gloss: "to draw / design", masdar: "رَسْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "عبر": { bab: "nasara",  gloss: "to cross / express", masdar: "عُبُور", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 1, ilr: "1"},
  "رقد": { bab: "nasara",  gloss: "to lie down / sleep", masdar: "رُقُود", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "ركض": { bab: "nasara",  gloss: "to run", masdar: "رَكْض", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "سلك": { bab: "nasara",  gloss: "to follow a path / travel", masdar: "سُلُوك", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 1, ilr: "1"},
  "نقل": { bab: "nasara",  gloss: "to transport / transfer", masdar: "نَقْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "نظم": { bab: "nasara",  gloss: "to organize / arrange", masdar: "نَظْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "صرخ": { bab: "nasara",  gloss: "to shout / scream", masdar: "صُرَاخ", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "نصب": { bab: "nasara",  gloss: "to set up / erect", masdar: "نَصْب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "نفذ": { bab: "nasara",  gloss: "to implement / execute", masdar: "نُفُوذ", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "طرد": { bab: "nasara",  gloss: "to expel / chase", masdar: "طَرْد", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "صدق": { bab: "nasara",  gloss: "to be truthful / honest", masdar: "صِدْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "طبخ": { bab: "nasara",  gloss: "to cook", masdar: "طَبْخ", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "عجز": { bab: "nasara",  gloss: "to be incapable / fail", masdar: "عَجْز", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "رحل": { bab: "nasara",  gloss: "to depart / travel", masdar: "رَحِيل", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "سقط": { bab: "nasara",  gloss: "to fall", masdar: "سُقُوط", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "جلب": { bab: "nasara",  gloss: "to bring / fetch", masdar: "جَلْب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "شمل": { bab: "nasara",  gloss: "to encompass / include", masdar: "شُمُول", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "حصل": { bab: "nasara",  gloss: "to obtain / happen", masdar: "حُصُول", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "عبد": { bab: "nasara",  gloss: "to worship", masdar: "عِبَادَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "فرغ": { bab: "nasara",  gloss: "to finish / be free", masdar: "فَرَاغ", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 1, ilr: "1"},
  "فضل": { bab: "nasara",  gloss: "to excel / surpass", masdar: "فَضْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "طلع": { bab: "nasara",  gloss: "to rise / go up", masdar: "طُلُوع", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "ثبت": { bab: "nasara",  gloss: "to be firm / stable", masdar: "ثُبُوت", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "حدث": { bab: "nasara",  gloss: "to happen / occur", masdar: "حُدُوث", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "كتم": { bab: "nasara",  gloss: "to conceal / suppress", masdar: "كِتْمَان", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "طلق": { bab: "nasara",  gloss: "to release / divorce", masdar: "طَلَاق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "عقد": { bab: "nasara",  gloss: "to tie / conclude", masdar: "عَقْد", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "خضع": { bab: "nasara",  gloss: "to submit / yield", masdar: "خُضُوع", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "خزن": { bab: "nasara",  gloss: "to store / hoard", masdar: "خَزْن", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "قدم": { bab: "nasara",  gloss: "to come forward / present", masdar: "قُدُوم", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "ظهر": { bab: "nasara",  gloss: "to appear / show", masdar: "ظُهُور", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "نسق": { bab: "nasara",  gloss: "to coordinate / arrange", masdar: "نَسْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "فرز": { bab: "nasara",  gloss: "to sort / separate", masdar: "فَرْز", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "ركم": { bab: "nasara",  gloss: "to pile up / accumulate", masdar: "رَكْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "نبض": { bab: "nasara",  gloss: "to pulsate / beat", masdar: "نَبْض", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "جمد": { bab: "nasara",  gloss: "to freeze / solidify", masdar: "جُمُود", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "فلح": { bab: "nasara",  gloss: "to succeed / cultivate", masdar: "فَلَاح", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "حفل": { bab: "nasara",  gloss: "to celebrate / care about", masdar: "حَفْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "صبغ": { bab: "nasara",  gloss: "to dye / color", masdar: "صَبْغ", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "بذل": { bab: "nasara",  gloss: "to give freely / spend", masdar: "بَذْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "صمد": { bab: "nasara",  gloss: "to endure firmly / resist", masdar: "صُمُود", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "نهج": { bab: "nasara",  gloss: "to follow a path / method", masdar: "نَهْج", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 1, ilr: "1"},
  "خلد": { bab: "nasara",  gloss: "to be immortal / eternal", masdar: "خُلُود", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "شهر": { bab: "nasara",  gloss: "to become known / draw sword", masdar: "شُهْرَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "صنف": { bab: "nasara",  gloss: "to classify / categorize", masdar: "تَصْنِيف", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "طرق": { bab: "nasara",  gloss: "to knock / strike", masdar: "طَرْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "ثقب": { bab: "nasara",  gloss: "to pierce / drill", masdar: "ثَقْب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "جبر": { bab: "nasara",  gloss: "to force / set a bone", masdar: "جَبْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "نفق": { bab: "nasara",  gloss: "to spend / be exhausted", masdar: "نَفَقَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 1, ilr: "1"},
  "مكث": { bab: "nasara",  gloss: "to stay / remain", masdar: "مُكْث", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "مزج": { bab: "nasara",  gloss: "to mix / blend", masdar: "مَزْج", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "حسد": { bab: "nasara",  gloss: "to envy", masdar: "حَسَد", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "نكث": { bab: "nasara",  gloss: "to break a pledge / unravel", masdar: "نَكْث", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 1, ilr: "1"},
  "فتل": { bab: "nasara",  gloss: "to twist / spin", masdar: "فَتْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "رمح": { bab: "nasara",  gloss: "to stab with a lance", masdar: "رَمْح", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "سبل": { bab: "nasara",  gloss: "to shed / let flow", masdar: "سَبْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "بشر": { bab: "nasara",  gloss: "to announce good news", masdar: "بِشَارَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "نذر": { bab: "nasara",  gloss: "to vow / warn", masdar: "نَذْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "خبر": { bab: "nasara",  gloss: "to experience / inform", masdar: "خِبْرَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "ضمن": { bab: "nasara",  gloss: "to guarantee / include", masdar: "ضَمَان", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "شنق": { bab: "nasara",  gloss: "to hang / strangle", masdar: "شَنْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 1, ilr: "1"},
  "خطف": { bab: "nasara",  gloss: "to snatch / kidnap", masdar: "خَطْف", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "نشل": { bab: "nasara",  gloss: "to lift / pick up", masdar: "نَشْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "ذهل": { bab: "nasara",  gloss: "to be astounded / confused", masdar: "ذُهُول", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "عبق": { bab: "nasara",  gloss: "to be fragrant / pervade", masdar: "عَبَق", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "سكب": { bab: "nasara",  gloss: "to pour", masdar: "سَكْب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "بتر": { bab: "nasara",  gloss: "to cut off / amputate", masdar: "بَتْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "عثر": { bab: "nasara",  gloss: "to stumble upon / find", masdar: "عُثُور", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "نبذ": { bab: "nasara",  gloss: "to throw away / reject", masdar: "نَبْذ", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "رفض": { bab: "nasara",  gloss: "to refuse / reject", masdar: "رَفْض", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "حجب": { bab: "nasara",  gloss: "to veil / block", masdar: "حَجْب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "نسب": { bab: "nasara",  gloss: "to attribute / relate", masdar: "نَسَب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "قبر": { bab: "nasara",  gloss: "to bury in a grave", masdar: "قَبْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "ذخر": { bab: "nasara",  gloss: "to store up / reserve", masdar: "ذَخْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "غمر": { bab: "nasara",  gloss: "to flood / overwhelm", masdar: "غَمْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "رسب": { bab: "nasara",  gloss: "to sink / fail (exam)", masdar: "رُسُوب", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "كبح": { bab: "nasara",  gloss: "to check / curb / brake", masdar: "كَبْح", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "حصر": { bab: "nasara",  gloss: "to besiege / restrict", masdar: "حَصْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "صقل": { bab: "nasara",  gloss: "to polish / refine", masdar: "صَقْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "ثقف": { bab: "nasara",  gloss: "to be cultured / sharpen", masdar: "ثَقَافَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 4, ilr: "2+"},
  "شمخ": { bab: "nasara",  gloss: "to be haughty / lofty", masdar: "شُمُوخ", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "لمس": { bab: "nasara",  gloss: "to touch / feel", masdar: "لَمْس", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "رصد": { bab: "nasara",  gloss: "to monitor / observe", masdar: "رَصْد", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "كمن": { bab: "nasara",  gloss: "to lurk / ambush", masdar: "كُمُون", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "مرق": { bab: "nasara",  gloss: "to pass through quickly", masdar: "مُرُوق", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 1, ilr: "1"},
  "حرج": { bab: "nasara",  gloss: "to be in a tight spot", masdar: "حَرَج", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 4, ilr: "2+"},
  "عسف": { bab: "nasara",  gloss: "to act unjustly / forcibly", masdar: "عَسْف", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "لحظ": { bab: "nasara",  gloss: "to notice / glance at", masdar: "لَحْظ", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "نزف": { bab: "nasara",  gloss: "to bleed / drain", masdar: "نَزْف", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "حلق": { bab: "nasara",  gloss: "to shave / circle", masdar: "حَلْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "طمس": { bab: "nasara",  gloss: "to efface / erase", masdar: "طَمْس", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "قصم": { bab: "nasara",  gloss: "to crush / break", masdar: "قَصْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "لقم": { bab: "nasara",  gloss: "to feed morsels / swallow", masdar: "لَقْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "دمر": { bab: "nasara",  gloss: "to perish / destroy", masdar: "دَمَار", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "فصم": { bab: "nasara",  gloss: "to break apart / sever", masdar: "فَصْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 1, ilr: "1"},
  "قلم": { bab: "nasara",  gloss: "to trim / prune", masdar: "قَلْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "ذبل": { bab: "nasara",  gloss: "to wilt / wither", masdar: "ذُبُول", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "فتر": { bab: "nasara",  gloss: "to slacken / abate", masdar: "فُتُور", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "برز": { bab: "nasara",  gloss: "to emerge / stand out", masdar: "بُرُوز", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "قتم": { bab: "nasara",  gloss: "to be dark / gloomy", masdar: "قُتُوم", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 4, ilr: "2+"},
  "درج": { bab: "nasara",  gloss: "to go step by step / graduate", masdar: "دَرْج", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "بسط": { bab: "nasara",  gloss: "to spread / extend", masdar: "بَسْط", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 1, ilr: "1"},
  "كحل": { bab: "nasara",  gloss: "to apply kohl", masdar: "كَحْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "لطخ": { bab: "nasara",  gloss: "to stain / smear", masdar: "لَطْخ", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "حشر": { bab: "nasara",  gloss: "to gather / crowd together", masdar: "حَشْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "نتج": { bab: "nasara",  gloss: "to result / produce", masdar: "نَتْج", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "لحن": { bab: "nasara",  gloss: "to err in speech / intone", masdar: "لَحْن", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "قشر": { bab: "nasara",  gloss: "to peel / shell", masdar: "قَشْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "صفر": { bab: "nasara",  gloss: "to whistle / be yellow", masdar: "صَفِير", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "لعق": { bab: "nasara",  gloss: "to lick", masdar: "لَعْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "رهق": { bab: "nasara",  gloss: "to cover / press / overlay", masdar: "رَهَق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "نقر": { bab: "nasara",  gloss: "to peck / engrave / knock", masdar: "نَقْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "خمل": { bab: "nasara",  gloss: "to be hushed / obscure", masdar: "خُمُول", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 4, ilr: "2+"},
  "صفق": { bab: "nasara",  gloss: "to clap / make a deal", masdar: "صَفْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "خنق": { bab: "nasara",  gloss: "to strangle / choke", masdar: "خَنْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "برم": { bab: "nasara",  gloss: "to twist / be annoyed", masdar: "بَرْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "رفل": { bab: "nasara",  gloss: "to drag garment / swagger", masdar: "رَفْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "قرص": { bab: "nasara",  gloss: "to pinch / bite", masdar: "قَرْص", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "شحن": { bab: "nasara",  gloss: "to load / charge", masdar: "شَحْن", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "غرب": { bab: "nasara",  gloss: "to go west / set (sun)", masdar: "غُرُوب", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "ندب": { bab: "nasara",  gloss: "to lament / appoint", masdar: "نَدْب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "حلم": { bab: "nasara",  gloss: "to dream", masdar: "حُلْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},

  // ── Nasara — hamzated (initial أ): canonical key uses أ ─────────────────
  // Aliases map اخذ → أخذ, اكل → أكل, امر → أمر, اسر → أسر, افل → أفل
  "أخذ": { bab: "nasara",  gloss: "to take / seize", masdar: "أَخْذ",      pattern: "فَعَلَ يَفْعُلُ", r1: "أ" , tr: "t", freq: 1, ilr: "1"},
  "أكل": { bab: "nasara",  gloss: "to eat", masdar: "أَكْل",               pattern: "فَعَلَ يَفْعُلُ", r1: "أ" , tr: "t", freq: 1, ilr: "1"},
  "أمر": { bab: "nasara",  gloss: "to order / command", masdar: "أَمْر",   pattern: "فَعَلَ يَفْعُلُ", r1: "أ" , tr: "t", freq: 1, ilr: "1"},
  "أسر": { bab: "nasara",  gloss: "to capture / take prisoner", masdar: "أَسْر", pattern: "فَعَلَ يَفْعُلُ", r1: "أ" , tr: "t", freq: 4, ilr: "2+"},
  "أفل": { bab: "nasara",  gloss: "to set / go down (star/moon)", masdar: "أُفُول", pattern: "فَعَلَ يَفْعُلُ", r1: "أ" , tr: "t", freq: 4, ilr: "2+"},

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  Bab DARABA  —  فَعَلَ / يَفْعِلُ  (past-a  present-i)             ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  "جلس": { bab: "daraba",  gloss: "to sit", masdar: "جُلُوس", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 1, ilr: "1"},
  "ضرب": { bab: "daraba",  gloss: "to hit / strike", masdar: "ضَرْب", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "حمل": { bab: "daraba",  gloss: "to carry", masdar: "حَمْل", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "نزل": { bab: "daraba",  gloss: "to descend / stay", masdar: "نُزُول", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 1, ilr: "1"},
  "رجع": { bab: "daraba",  gloss: "to return", masdar: "رُجُوع", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 1, ilr: "1"},
  "كسب": { bab: "daraba",  gloss: "to earn / gain", masdar: "كَسْب", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "غفر": { bab: "daraba",  gloss: "to forgive", masdar: "مَغْفِرَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "قدر": { bab: "daraba",  gloss: "to be able / measure", masdar: "قُدْرَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 2, ilr: "1+"},
  "صبر": { bab: "daraba",  gloss: "to be patient", masdar: "صَبْر", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 1, ilr: "1"},
  "خدم": { bab: "daraba",  gloss: "to serve", masdar: "خِدْمَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "نكر": { bab: "daraba",  gloss: "to deny / reject", masdar: "إِنْكَار", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},

  // ── Daraba expansion ────────────────────────────────────────────────────
  "غلب": { bab: "daraba",  gloss: "to overcome / defeat", masdar: "غَلَبَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "سبق": { bab: "daraba",  gloss: "to precede / outrun", masdar: "سَبْق", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "عقل": { bab: "daraba",  gloss: "to understand / reason", masdar: "عَقْل", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "نطق": { bab: "daraba",  gloss: "to speak / pronounce", masdar: "نُطْق", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "نزع": { bab: "daraba",  gloss: "to pull out / remove", masdar: "نَزْع", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "كشف": { bab: "daraba",  gloss: "to uncover / reveal", masdar: "كَشْف", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "حبس": { bab: "daraba",  gloss: "to imprison / confine", masdar: "حَبْس", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "ظلم": { bab: "daraba",  gloss: "to oppress / wrong", masdar: "ظُلْم", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "هزم": { bab: "daraba",  gloss: "to defeat / rout", masdar: "هَزِيمَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "قفز": { bab: "daraba",  gloss: "to jump / leap", masdar: "قَفْز", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 2, ilr: "1+"},
  "سرق": { bab: "daraba",  gloss: "to steal / rob", masdar: "سَرِقَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "ملك": { bab: "daraba",  gloss: "to own / possess", masdar: "مُلْك", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "كسر": { bab: "daraba",  gloss: "to break / shatter", masdar: "كَسْر", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "دفن": { bab: "daraba",  gloss: "to bury", masdar: "دَفْن", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "قصد": { bab: "daraba",  gloss: "to intend / aim", masdar: "قَصْد", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "حفز": { bab: "daraba",  gloss: "to motivate / spur on", masdar: "حَفْز", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "عدل": { bab: "daraba",  gloss: "to be just / balance", masdar: "عَدْل", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 2, ilr: "1+"},
  "حزم": { bab: "daraba",  gloss: "to bind / be resolute", masdar: "حَزْم", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "ربط": { bab: "daraba",  gloss: "to tie / bind", masdar: "رَبْط", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "نكح": { bab: "daraba",  gloss: "to marry", masdar: "نِكَاح", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "جلد": { bab: "daraba",  gloss: "to flog / bind", masdar: "جَلْد", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "فتك": { bab: "daraba",  gloss: "to attack / overwhelm", masdar: "فَتْك", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "عرض": { bab: "daraba",  gloss: "to present / display", masdar: "عَرْض", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "فرض": { bab: "daraba",  gloss: "to impose / prescribe", masdar: "فَرْض", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "قسم": { bab: "daraba",  gloss: "to divide / distribute", masdar: "قِسْمَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "حرم": { bab: "daraba",  gloss: "to deprive / forbid", masdar: "حِرْمَان", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "لفظ": { bab: "daraba",  gloss: "to pronounce / utter", masdar: "لَفْظ", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "خرق": { bab: "daraba",  gloss: "to tear / pierce", masdar: "خَرْق", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "صرف": { bab: "daraba",  gloss: "to spend / divert / conjugate", masdar: "صَرْف", pattern: "فَعَلَ يَفْعِلُ" , tr: "b", freq: 2, ilr: "1+"},
  "نفر": { bab: "daraba",  gloss: "to flee / be repelled", masdar: "نُفُور", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "عزم": { bab: "daraba",  gloss: "to be determined / resolve", masdar: "عَزْم", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 2, ilr: "1+"},
  "فسر": { bab: "daraba",  gloss: "to explain / expound", masdar: "تَفْسِير", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "حرص": { bab: "daraba",  gloss: "to be eager / keen", masdar: "حِرْص", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 2, ilr: "1+"},
  "فقد": { bab: "daraba",  gloss: "to lose / miss", masdar: "فَقْد", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "حجم": { bab: "daraba",  gloss: "to draw back / hesitate", masdar: "حَجْم", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "قلب": { bab: "daraba",  gloss: "to turn over / flip", masdar: "قَلْب", pattern: "فَعَلَ يَفْعِلُ" , tr: "b", freq: 4, ilr: "2+"},
  "نتف": { bab: "daraba",  gloss: "to pluck / pull out", masdar: "نَتْف", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "سلب": { bab: "daraba",  gloss: "to strip / rob", masdar: "سَلْب", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "سلخ": { bab: "daraba",  gloss: "to skin / peel", masdar: "سَلْخ", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "غمز": { bab: "daraba",  gloss: "to wink / hint", masdar: "غَمْز", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "نقش": { bab: "daraba",  gloss: "to engrave / discuss", masdar: "نَقْش", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "شطر": { bab: "daraba",  gloss: "to halve / be far", masdar: "شَطْر", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "لكز": { bab: "daraba",  gloss: "to thrust / elbow", masdar: "لَكْز", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  Bab FATAHA  —  فَعَلَ / يَفْعَلُ  (past-a  present-a)             ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  "فتح": { bab: "fataha",  gloss: "to open", masdar: "فَتْح", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "ذهب": { bab: "fataha",  gloss: "to go", masdar: "ذَهَاب", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 1, ilr: "1"},
  "صنع": { bab: "fataha",  gloss: "to make / manufacture", masdar: "صُنْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "جمع": { bab: "fataha",  gloss: "to collect / gather", masdar: "جَمْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "قطع": { bab: "fataha",  gloss: "to cut", masdar: "قَطْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "رفع": { bab: "fataha",  gloss: "to raise / lift", masdar: "رَفْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "منع": { bab: "fataha",  gloss: "to prevent", masdar: "مَنْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "بعث": { bab: "fataha",  gloss: "to send / resurrect", masdar: "بَعْث", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "سبح": { bab: "fataha",  gloss: "to swim / praise God", masdar: "سِبَاحَة", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 1, ilr: "1"},
  "نجح": { bab: "fataha",  gloss: "to succeed", masdar: "نَجَاح", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 1, ilr: "1"},

  // ── Fataha expansion ────────────────────────────────────────────────────
  "شرح": { bab: "fataha",  gloss: "to explain / elaborate", masdar: "شَرْح", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "سمح": { bab: "fataha",  gloss: "to permit / allow", masdar: "سَمَاح", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 1, ilr: "1"},
  "قهر": { bab: "fataha",  gloss: "to overpower / overcome", masdar: "قَهْر", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "بحث": { bab: "fataha",  gloss: "to search / research", masdar: "بَحْث", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "ذبح": { bab: "fataha",  gloss: "to slaughter", masdar: "ذَبْح", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "خدع": { bab: "fataha",  gloss: "to deceive / trick", masdar: "خِدَاع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},
  "منح": { bab: "fataha",  gloss: "to grant / bestow", masdar: "مَنْح", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "نجع": { bab: "fataha",  gloss: "to be effective / benefit", masdar: "نَجْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "طفح": { bab: "fataha",  gloss: "to overflow / be full", masdar: "طُفُوح", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "لمح": { bab: "fataha",  gloss: "to glance / glimpse", masdar: "لَمْح", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "رسخ": { bab: "fataha",  gloss: "to be firmly rooted", masdar: "رُسُوخ", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "فحص": { bab: "fataha",  gloss: "to examine / inspect", masdar: "فَحْص", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "مدح": { bab: "fataha",  gloss: "to praise / commend", masdar: "مَدْح", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "جهد": { bab: "fataha",  gloss: "to strive / exert effort", masdar: "جُهْد", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},
  "صرع": { bab: "fataha",  gloss: "to wrestle / knock down", masdar: "صَرْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},
  "رقع": { bab: "fataha",  gloss: "to patch / repair", masdar: "رَقْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "نفح": { bab: "fataha",  gloss: "to blow / waft / bestow", masdar: "نَفْح", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},
  "صفح": { bab: "fataha",  gloss: "to forgive / overlook", masdar: "صَفْح", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "مزح": { bab: "fataha",  gloss: "to joke / jest", masdar: "مَزْح", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "بلح": { bab: "fataha",  gloss: "to be limp / fail", masdar: "بَلَح", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "طرح": { bab: "fataha",  gloss: "to throw / put forward", masdar: "طَرْح", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "ضرع": { bab: "fataha",  gloss: "to implore humbly", masdar: "تَضَرُّع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "برع": { bab: "fataha",  gloss: "to excel / be proficient", masdar: "بَرَاعَة", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "كدح": { bab: "fataha",  gloss: "to toil / strive hard", masdar: "كَدْح", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},
  "طعن": { bab: "fataha",  gloss: "to stab / criticize", masdar: "طَعْن", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "دفع": { bab: "fataha",  gloss: "to push / pay", masdar: "دَفْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "سحب": { bab: "fataha",  gloss: "to drag / withdraw", masdar: "سَحْب", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "صدع": { bab: "fataha",  gloss: "to crack / split", masdar: "صَدْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "صقع": { bab: "fataha",  gloss: "to strike / be cold", masdar: "صَقْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "بهر": { bab: "fataha",  gloss: "to dazzle / overwhelm", masdar: "بَهْر", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "قمع": { bab: "fataha",  gloss: "to suppress / quell", masdar: "قَمْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},
  "زرع": { bab: "fataha",  gloss: "to sow / plant / cultivate", masdar: "زَرْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "فتق": { bab: "fataha",  gloss: "to open up / split", masdar: "فَتْق", pattern: "فَعَلَ يَفْعَلُ" , tr: "b", freq: 2, ilr: "1+"},
  "نبع": { bab: "fataha",  gloss: "to spring / gush from a source", masdar: "نَبْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "سحر": { bab: "fataha",  gloss: "to bewitch / enchant", masdar: "سِحْر", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "ذرع": { bab: "fataha",  gloss: "to measure / traverse", masdar: "ذَرْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "قطر": { bab: "fataha",  gloss: "to drip / distil", masdar: "قَطْر", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "حجز": { bab: "fataha",  gloss: "to reserve / block", masdar: "حَجْز", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "طمح": { bab: "fataha",  gloss: "to aspire to / aim high", masdar: "طُمُوح", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},

  // ── Fataha — hamzated (forceType keeps classifyRoot from misclassifying) ─
  // Medial / final hamza: r2 or r3 carries the correct hamza seat
  "سأل": { bab: "fataha",  gloss: "to ask", masdar: "سُؤَال",                     pattern: "فَعَلَ يَفْعَلُ", forceType: "regular", r2: "أ" , tr: "t", freq: 1, ilr: "1"},
  "قرأ": { bab: "fataha",  gloss: "to read", masdar: "قِرَاءَة",                    pattern: "فَعَلَ يَفْعَلُ", forceType: "regular", r3: "أ" , tr: "t", freq: 1, ilr: "1"},
  "بدأ": { bab: "fataha",  gloss: "to begin / start", masdar: "بَدْء",           pattern: "فَعَلَ يَفْعَلُ", forceType: "regular", r3: "أ" , tr: "t", freq: 1, ilr: "1"},
  "ملأ": { bab: "fataha",  gloss: "to fill", masdar: "مَلْء",                    pattern: "فَعَلَ يَفْعَلُ", forceType: "regular", r3: "أ" , tr: "t", freq: 2, ilr: "1+"},
  "نشأ": { bab: "fataha",  gloss: "to grow up / arise", masdar: "نَشْأَة",         pattern: "فَعَلَ يَفْعَلُ", forceType: "regular", r3: "أ" , tr: "i", freq: 2, ilr: "1+"},
  "لجأ": { bab: "fataha",  gloss: "to resort to / take refuge", masdar: "لُجُوء", pattern: "فَعَلَ يَفْعَلُ", forceType: "regular", r3: "أ" , tr: "t", freq: 4, ilr: "2+"},
  "جرأ": { bab: "fataha",  gloss: "to dare / be bold", masdar: "جُرْأَة",          pattern: "فَعَلَ يَفْعَلُ", forceType: "regular", r3: "أ" , tr: "t", freq: 2, ilr: "1+"},
  "هدأ": { bab: "fataha",  gloss: "to be quiet / calm down", masdar: "هُدُوء",    pattern: "فَعَلَ يَفْعَلُ", forceType: "regular", r3: "أ" , tr: "i", freq: 4, ilr: "2+"},
  "رأس": { bab: "fataha",  gloss: "to head / lead", masdar: "رِئَاسَة",             pattern: "فَعَلَ يَفْعَلُ", forceType: "regular", r2: "أ" , tr: "t", freq: 4, ilr: "2+"},

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  Bab ALIMA  —  فَعِلَ / يَفْعَلُ  (past-i  present-a)             ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  "فرح": { bab: "alima",   gloss: "to rejoice / be happy", masdar: "فَرَح", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 1, ilr: "1"},
  "علم": { bab: "alima",   gloss: "to know", masdar: "عِلْم", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "عمل": { bab: "alima",   gloss: "to work / do", masdar: "عَمَل", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "فهم": { bab: "alima",   gloss: "to understand", masdar: "فَهْم", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "شرب": { bab: "alima",   gloss: "to drink", masdar: "شُرْب", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "لعب": { bab: "alima",   gloss: "to play", masdar: "لَعِب", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 1, ilr: "1"},
  "ضحك": { bab: "alima",   gloss: "to laugh", masdar: "ضَحِك", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 1, ilr: "1"},
  "سمع": { bab: "alima",   gloss: "to hear", masdar: ["سَمْع", "سَمَاع"], pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "لبس": { bab: "alima",   gloss: "to wear", masdar: "لُبْس", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "حمد": { bab: "alima",   gloss: "to praise", masdar: "حَمْد", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "قبل": { bab: "alima",   gloss: "to accept", masdar: "قَبُول", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "كره": { bab: "alima",   gloss: "to hate / dislike", masdar: "كُرْه", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "حفظ": { bab: "alima",   gloss: "to memorize / preserve", masdar: "حِفْظ", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "ركب": { bab: "alima",   gloss: "to ride / mount", masdar: "رُكُوب", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "جهل": { bab: "alima",   gloss: "to be ignorant", masdar: "جَهْل", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "وجل": { bab: "alima",   gloss: "to fear / be afraid", masdar: "وَجَل", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},

  // ── Alima expansion ─────────────────────────────────────────────────────
  "غضب": { bab: "alima",   gloss: "to be angry", masdar: "غَضَب", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 1, ilr: "1"},
  "فزع": { bab: "alima",   gloss: "to be frightened / alarmed", masdar: "فَزَع", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "شهد": { bab: "alima",   gloss: "to witness / testify", masdar: "شَهَادَة", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "حزن": { bab: "alima",   gloss: "to be sad / grieve", masdar: "حُزْن", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "تعب": { bab: "alima",   gloss: "to be tired / exhausted", masdar: "تَعَب", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 1, ilr: "1"},
  "لزم": { bab: "alima",   gloss: "to be necessary / cling to", masdar: "لُزُوم", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "ربح": { bab: "alima",   gloss: "to profit / gain", masdar: "رِبْح", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "رحم": { bab: "alima",   gloss: "to be merciful / pity", masdar: "رَحْمَة", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "غرق": { bab: "alima",   gloss: "to drown / sink", masdar: "غَرَق", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "صعد": { bab: "alima",   gloss: "to ascend / climb", masdar: "صُعُود", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "رغب": { bab: "alima",   gloss: "to desire / wish for", masdar: "رَغْبَة", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},
  "خجل": { bab: "alima",   gloss: "to be ashamed / embarrassed", masdar: "خَجَل", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "عطش": { bab: "alima",   gloss: "to be thirsty", masdar: "عَطَش", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 1, ilr: "1"},
  "سخر": { bab: "alima",   gloss: "to mock / ridicule", masdar: "سُخْرِيَة", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "ذعر": { bab: "alima",   gloss: "to be terrified / alarmed", masdar: "ذُعْر", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "لحق": { bab: "alima",   gloss: "to catch up with / join", masdar: "لُحُوق", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "حبط": { bab: "alima",   gloss: "to come to nothing / be frustrated", masdar: "حَبْط", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "رهب": { bab: "alima",   gloss: "to fear / dread", masdar: "رَهْبَة", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "لقح": { bab: "alima",   gloss: "to be fertilized / pollinated", masdar: "لِقَاح", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "نضج": { bab: "alima",   gloss: "to ripen / mature", masdar: "نُضْج", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},
  "جزع": { bab: "alima",   gloss: "to be anxious / grieve", masdar: "جَزَع", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "طمع": { bab: "alima",   gloss: "to be greedy / covet", masdar: "طَمَع", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "عجب": { bab: "alima",   gloss: "to be amazed / wonder", masdar: "عَجَب", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "تبع": { bab: "alima",   gloss: "to follow", masdar: "تَبَع", pattern: "فَعِلَ يَفْعَلُ" , tr: "b", freq: 2, ilr: "1+"},
  "بلع": { bab: "alima",   gloss: "to swallow", masdar: "بَلْع", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 1, ilr: "1"},
  "نشط": { bab: "alima",   gloss: "to be active / energetic", masdar: "نَشَاط", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "فشل": { bab: "alima",   gloss: "to fail / be cowardly", masdar: "فَشَل", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "بخل": { bab: "alima",   gloss: "to be miserly / stingy", masdar: "بُخْل", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "قنع": { bab: "alima",   gloss: "to be content / satisfied", masdar: "قَنَاعَة", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "لهف": { bab: "alima",   gloss: "to grieve / pant with desire", masdar: "لَهْف", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "ندم": { bab: "alima",   gloss: "to regret / repent", masdar: "نَدَم", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},
  "طرب": { bab: "alima",   gloss: "to be delighted by music", masdar: "طَرَب", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "ضجر": { bab: "alima",   gloss: "to be vexed / weary", masdar: "ضَجَر", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},

  // Defective alima (i-a vowels + R3=ي)
  // Canonical key uses ى; alias يi→ي routes to it
  "خشى": { bab: "alima",   gloss: "to fear / revere", masdar: "خَشْيَة", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},

  // ── Alima — hamzated (R1=أ): r1 corrects conjugation orthography ─────
  "أمن": { bab: "alima",   gloss: "to be safe / trust", masdar: "أَمْن",       pattern: "فَعِلَ يَفْعَلُ", r1: "أ" , tr: "i", freq: 4, ilr: "2+"},
  "أسف": { bab: "alima",   gloss: "to be sorry / grieve", masdar: "أَسَف",     pattern: "فَعِلَ يَفْعَلُ", r1: "أ" , tr: "i", freq: 2, ilr: "1+"},
  // Final hamza alima: forceType="regular" + r3 corrects misclassification
  "دفأ": { bab: "alima",   gloss: "to be warm / warm oneself", masdar: "دِفْء", pattern: "فَعِلَ يَفْعَلُ", forceType: "regular", r3: "أ" , tr: "i", freq: 4, ilr: "2+"},

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  Bab KARUMA  —  فَعُلَ / يَفْعُلُ  (past-u  present-u)            ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  "كرم": { bab: "karuma",  gloss: "to be noble / generous", masdar: "كَرَم", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "عظم": { bab: "karuma",  gloss: "to be great / magnificent", masdar: "عِظَم", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "حسن": { bab: "karuma",  gloss: "to be good / beautiful", masdar: "حُسْن", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "قبح": { bab: "karuma",  gloss: "to be ugly / foul", masdar: "قُبْح", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "صعب": { bab: "karuma",  gloss: "to be difficult", masdar: "صُعُوبَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "شرف": { bab: "karuma",  gloss: "to be honourable", masdar: "شَرَف", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "ضعف": { bab: "karuma",  gloss: "to be weak", masdar: "ضَعْف", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "جمل": { bab: "karuma",  gloss: "to be beautiful / comely", masdar: "جَمَال", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "كبر": { bab: "karuma",  gloss: "to be great / old", masdar: "كِبَر", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "كثر": { bab: "karuma",  gloss: "to be many / abundant", masdar: "كَثْرَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},

  // ── Karuma expansion ────────────────────────────────────────────────────
  "شجع": { bab: "karuma",  gloss: "to be brave / courageous", masdar: "شَجَاعَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "صغر": { bab: "karuma",  gloss: "to be small / young", masdar: "صِغَر", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "برد": { bab: "karuma",  gloss: "to be cold", masdar: "بُرُودَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "جبن": { bab: "karuma",  gloss: "to be cowardly", masdar: "جُبْن", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "لطف": { bab: "karuma",  gloss: "to be kind / gentle", masdar: "لُطْف", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "نظف": { bab: "karuma",  gloss: "to be clean", masdar: "نَظَافَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "سهل": { bab: "karuma",  gloss: "to be easy / simple", masdar: "سُهُولَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "قرب": { bab: "karuma",  gloss: "to be near / close", masdar: "قُرْب", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "بعد": { bab: "karuma",  gloss: "to be far / distant", masdar: "بُعْد", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "قصر": { bab: "karuma",  gloss: "to fall short / be brief", masdar: "قَصْر", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "نبل": { bab: "karuma",  gloss: "to be noble / excellent", masdar: "نُبْل", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "ثقل": { bab: "karuma",  gloss: "to be heavy", masdar: "ثِقَل", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "غلظ": { bab: "karuma",  gloss: "to be coarse / harsh", masdar: "غِلْظَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "نضر": { bab: "karuma",  gloss: "to be fresh / radiant", masdar: "نَضَارَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "عذب": { bab: "karuma",  gloss: "to be sweet / pleasant", masdar: "عَذَاب", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "فصح": { bab: "karuma",  gloss: "to speak eloquently", masdar: "فَصَاحَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "ظرف": { bab: "karuma",  gloss: "to be witty / elegant", masdar: "ظَرَافَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "سمن": { bab: "karuma",  gloss: "to be fat / plump", masdar: "سِمَن", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "هزل": { bab: "karuma",  gloss: "to be thin / joke", masdar: "هَزْل", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  Bab HASIBA  —  فَعِلَ / يَفْعِلُ  (past-i  present-i)  [rare]    ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  "حسب": { bab: "hasiba",  gloss: "to reckon / consider", masdar: "حِسَاب", pattern: "فَعِلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "نعم": { bab: "hasiba",  gloss: "to live in comfort / enjoy", masdar: "نِعْمَة", pattern: "فَعِلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  MITHAL  (Assimilated R1=و)  —  فَعَلَ / يَفْعِلُ               ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  "وعد": { bab: "mithal",  gloss: "to promise", masdar: "وَعْد", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "وصل": { bab: "mithal",  gloss: "to arrive / connect", masdar: "وُصُول", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 1, ilr: "1"},
  "وقف": { bab: "mithal",  gloss: "to stop / stand", masdar: "وُقُوف", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 1, ilr: "1"},
  "وزن": { bab: "mithal",  gloss: "to weigh", masdar: "وَزْن", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "وجد": { bab: "mithal",  gloss: "to find", masdar: "وُجُود", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "ولد": { bab: "mithal",  gloss: "to give birth", masdar: "وِلَادَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "ورث": { bab: "mithal",  gloss: "to inherit", masdar: "إِرْث", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "ورد": { bab: "mithal",  gloss: "to arrive / reach", masdar: "وُرُود", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 4, ilr: "2+"},
  "وضع": { bab: "mithal",  gloss: "to put / place", masdar: "وَضْع", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "وقى": { bab: "mithal",  gloss: "to protect / guard", masdar: "وِقَايَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},

  // ── Mithal expansion (a-i pattern only) ────────────────────────────────
  "وجب": { bab: "mithal",  gloss: "to be necessary / obligatory", masdar: "وُجُوب", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 4, ilr: "2+"},
  "وصف": { bab: "mithal",  gloss: "to describe / characterize", masdar: "وَصْف", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "وفر": { bab: "mithal",  gloss: "to be plentiful / provide", masdar: "وَفْرَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 4, ilr: "2+"},
  "ولج": { bab: "mithal",  gloss: "to enter / penetrate", masdar: "وُلُوج", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 2, ilr: "1+"},
  "وكل": { bab: "mithal",  gloss: "to delegate / entrust", masdar: "وَكْل", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "وهن": { bab: "mithal",  gloss: "to be weak / feeble", masdar: "وَهْن", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 4, ilr: "2+"},
  "وفد": { bab: "mithal",  gloss: "to arrive / be delegated", masdar: "وُفُود", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 2, ilr: "1+"},
  "وقد": { bab: "mithal",  gloss: "to burn / kindle", masdar: "وَقُود", pattern: "فَعَلَ يَفْعِلُ" , tr: "b", freq: 2, ilr: "1+"},

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  JAWWAF-WAW  (Hollow R2=و)  —  فَعَلَ / يَفْعُلُ               ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  "قال": { bab: "jawwaf-waw", gloss: "to say", masdar: "قَوْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "قام": { bab: "jawwaf-waw", gloss: "to stand / rise", masdar: "قِيَام", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "زار": { bab: "jawwaf-waw", gloss: "to visit", masdar: "زِيَارَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "صام": { bab: "jawwaf-waw", gloss: "to fast", masdar: "صَوْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "كان": { bab: "jawwaf-waw", gloss: "to be", masdar: "كَوْن", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "خاف": { bab: "jawwaf-waw", gloss: "to fear", masdar: "خَوْف", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "طال": { bab: "jawwaf-waw", gloss: "to be long / tall", masdar: "طُول", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 4, ilr: "2+"},
  "نام": { bab: "jawwaf-waw", gloss: "to sleep", masdar: "نَوْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "فاز": { bab: "jawwaf-waw", gloss: "to win / succeed", masdar: "فَوْز", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "حاز": { bab: "jawwaf-waw", gloss: "to possess / obtain", masdar: "حِيَازَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},

  // ── Jawwaf-waw expansion ────────────────────────────────────────────────
  "جال": { bab: "jawwaf-waw", gloss: "to roam / wander", masdar: "جَوَلَان", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "طاف": { bab: "jawwaf-waw", gloss: "to circumambulate / wander", masdar: "طَوَاف", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "خان": { bab: "jawwaf-waw", gloss: "to betray / be unfaithful", masdar: "خِيَانَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "حار": { bab: "jawwaf-waw", gloss: "to be bewildered / confused", masdar: "حَيْرَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "ذاق": { bab: "jawwaf-waw", gloss: "to taste / experience", masdar: "ذَوْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "ساد": { bab: "jawwaf-waw", gloss: "to rule / dominate", masdar: "سِيَادَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "مات": { bab: "jawwaf-waw", gloss: "to die", masdar: "مَوْت", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "دار": { bab: "jawwaf-waw", gloss: "to turn / revolve", masdar: "دَوْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 4, ilr: "2+"},
  "لاح": { bab: "jawwaf-waw", gloss: "to appear / glitter", masdar: "لَوْح", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "تاب": { bab: "jawwaf-waw", gloss: "to repent / turn back", masdar: "تَوْبَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "ثار": { bab: "jawwaf-waw", gloss: "to rise / revolt", masdar: "ثَوْرَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "عاد": { bab: "jawwaf-waw", gloss: "to return / come back", masdar: "عَوْد", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "جاد": { bab: "jawwaf-waw", gloss: "to be generous / excellent", masdar: "جُود", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "خاض": { bab: "jawwaf-waw", gloss: "to wade / engage in", masdar: "خَوْض", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "شاق": { bab: "jawwaf-waw", gloss: "to attract / please / be hard on", masdar: "شَوْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "صان": { bab: "jawwaf-waw", gloss: "to protect / preserve", masdar: "صَوْن", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  JAWWAF-YA  (Hollow R2=ي)  —  فَعَلَ / يَفْعِلُ               ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  "باع": { bab: "jawwaf-ya",  gloss: "to sell", masdar: "بَيْع", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "سار": { bab: "jawwaf-ya",  gloss: "to travel / walk", masdar: "سَيْر", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 1, ilr: "1"},
  "عاش": { bab: "jawwaf-ya",  gloss: "to live / exist", masdar: "عَيْش", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 1, ilr: "1"},
  "طار": { bab: "jawwaf-ya",  gloss: "to fly", masdar: "طَيَرَان", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 1, ilr: "1"},
  "شاء": { bab: "jawwaf-ya",  gloss: "to will / wish", masdar: "مَشِيئَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "زاد": { bab: "jawwaf-ya",  gloss: "to increase / add", masdar: "زِيَادَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "b", freq: 1, ilr: "1"},
  "جاء": { bab: "jawwaf-ya",  gloss: "to come", masdar: "مَجِيء", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 1, ilr: "1"},

  // ── Jawwaf-ya expansion ─────────────────────────────────────────────────
  "صار": { bab: "jawwaf-ya",  gloss: "to become", masdar: "صَيْرُورَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 4, ilr: "2+"},
  "مال": { bab: "jawwaf-ya",  gloss: "to incline / lean", masdar: "مَيْل", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "لان": { bab: "jawwaf-ya",  gloss: "to be soft / gentle", masdar: "لِين", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 4, ilr: "2+"},
  "كال": { bab: "jawwaf-ya",  gloss: "to measure / weigh out", masdar: "كَيْل", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "ضاق": { bab: "jawwaf-ya",  gloss: "to be narrow / distressed", masdar: "ضِيق", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 4, ilr: "2+"},
  "رام": { bab: "jawwaf-ya",  gloss: "to seek / not leave", masdar: "رَوْم", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "ذاع": { bab: "jawwaf-ya",  gloss: "to spread / be broadcast", masdar: "ذُيُوع", pattern: "فَعَلَ يَفْعِلُ" , tr: "b", freq: 4, ilr: "2+"},
  "زاغ": { bab: "jawwaf-ya",  gloss: "to deviate / stray", masdar: "زَيْغ", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "شاد": { bab: "jawwaf-ya",  gloss: "to build / erect", masdar: "تَشْيِيد", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "هاج": { bab: "jawwaf-ya",  gloss: "to be agitated / excited", masdar: "هَيَجَان", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 2, ilr: "1+"},
  "راب": { bab: "jawwaf-ya",  gloss: "to trouble / arouse suspicion", masdar: "رَوْب", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  NAQIS-WAW  (Defective R3=و)  —  فَعَا / يَفْعُو               ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  "دعا": { bab: "naqis-waw",  gloss: "to call / invite", masdar: "دَعْوَة", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 1, ilr: "1"},
  "دنا": { bab: "naqis-waw",  gloss: "to approach / draw near", masdar: "دُنُوّ", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 4, ilr: "2+"},
  "عفا": { bab: "naqis-waw",  gloss: "to pardon / forgive", masdar: "عَفْو", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 2, ilr: "1+"},
  "نجا": { bab: "naqis-waw",  gloss: "to be saved / escape", masdar: "نَجَاة", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 4, ilr: "2+"},

  // ── Naqis-waw expansion ─────────────────────────────────────────────────
  "غزا": { bab: "naqis-waw",  gloss: "to raid / invade", masdar: "غَزْو", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 1, ilr: "1"},
  "تلا": { bab: "naqis-waw",  gloss: "to recite / follow", masdar: "تِلَاوَة", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 2, ilr: "1+"},
  "خلا": { bab: "naqis-waw",  gloss: "to be empty / alone", masdar: "خُلُوّ", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 4, ilr: "2+"},
  "سما": { bab: "naqis-waw",  gloss: "to be high / aspire", masdar: "سُمُوّ", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 4, ilr: "2+"},
  "شكا": { bab: "naqis-waw",  gloss: "to complain / lament", masdar: "شَكْوَى", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 2, ilr: "1+"},
  "رجا": { bab: "naqis-waw",  gloss: "to hope / expect", masdar: "رَجَاء", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 4, ilr: "2+"},
  "عدا": { bab: "naqis-waw",  gloss: "to run / exceed / transgress", masdar: "عَدْو", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 2, ilr: "1+"},
  "علا": { bab: "naqis-waw",  gloss: "to be high / ascend", masdar: "عُلُوّ", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 2, ilr: "1+"},
  "ربا": { bab: "naqis-waw",  gloss: "to increase / grow", masdar: "رِبَا", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 2, ilr: "1+"},
  "لها": { bab: "naqis-waw",  gloss: "to be amused / distracted", masdar: "لَهْو", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 2, ilr: "1+"},
  "فنا": { bab: "naqis-waw",  gloss: "to perish / cease", masdar: "فَنَاء", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 4, ilr: "2+"},
  "خفا": { bab: "naqis-waw",  gloss: "to be hidden / secret", masdar: "خَفَاء", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 4, ilr: "2+"},
  "سطا": { bab: "naqis-waw",  gloss: "to pounce / be tyrannical", masdar: "سَطْو", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 2, ilr: "1+"},

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  NAQIS-YA  (Defective R3=ي)  —  فَعَى / يَفْعِي               ║
  // ║  Canonical keys use alef-maqsura (ى); ALIASES routes ي → ى      ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  "رمى": { bab: "naqis-ya",   gloss: "to throw", masdar: "رَمْي", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 1, ilr: "1"},
  "مشى": { bab: "naqis-ya",   gloss: "to walk", masdar: "مَشْي", pattern: "فَعَى يَفْعِي" , tr: "i", freq: 1, ilr: "1"},
  "سعى": { bab: "fataha",     gloss: "to strive / run", masdar: "سَعْي", pattern: "فَعَى يَفْعَى", forceType: "defective_ya" , tr: "t", freq: 2, ilr: "1+"},
  "حمى": { bab: "naqis-ya",   gloss: "to protect / defend", masdar: "حِمَايَة", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 2, ilr: "1+"},
  "جرى": { bab: "naqis-ya",   gloss: "to run / flow", masdar: "جَرَيَان", pattern: "فَعَى يَفْعِي" , tr: "i", freq: 2, ilr: "1+"},
  "بقى": { bab: "naqis-ya",   gloss: "to remain / stay", masdar: "بَقَاء", pattern: "فَعَى يَفْعِي" , tr: "i", freq: 2, ilr: "1+"},
  "لقى": { bab: "naqis-ya",   gloss: "to meet / encounter", masdar: "لِقَاء", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 4, ilr: "2+"},
  "نسى": { bab: "naqis-ya",   gloss: "to forget", masdar: "نِسْيَان", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 2, ilr: "1+"},
  "بكى": { bab: "naqis-ya",   gloss: "to cry / weep", masdar: "بُكَاء", pattern: "فَعَى يَفْعِي" , tr: "i", freq: 1, ilr: "1"},

  // ── Naqis-ya expansion ──────────────────────────────────────────────────
  "هدى": { bab: "naqis-ya",   gloss: "to guide / direct", masdar: "هُدًى", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 2, ilr: "1+"},
  "قضى": { bab: "naqis-ya",   gloss: "to judge / spend / finish", masdar: "قَضَاء", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 2, ilr: "1+"},
  "حكى": { bab: "naqis-ya",   gloss: "to recount / imitate", masdar: "حِكَايَة", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 2, ilr: "1+"},
  "رعى": { bab: "naqis-ya",   gloss: "to tend / graze / care for", masdar: "رَعْي", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 2, ilr: "1+"},
  "بغى": { bab: "naqis-ya",   gloss: "to transgress / seek", masdar: "بَغْي", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 4, ilr: "2+"},
  "عمى": { bab: "naqis-ya",   gloss: "to be blind", masdar: "عَمًى", pattern: "فَعَى يَفْعِي" , tr: "i", freq: 2, ilr: "1+"},
  "لهى": { bab: "naqis-ya",   gloss: "to be diverted / amused", masdar: "لَهْو", pattern: "فَعَى يَفْعِي" , tr: "i", freq: 2, ilr: "1+"},
  "بنى": { bab: "naqis-ya",   gloss: "to build / construct", masdar: "بِنَاء", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 1, ilr: "1"},
  "شفى": { bab: "naqis-ya",   gloss: "to cure / heal", masdar: "شِفَاء", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 2, ilr: "1+"},
  "طغى": { bab: "naqis-ya",   gloss: "to be tyrannical / exceed bounds", masdar: "طُغْيَان", pattern: "فَعَى يَفْعِي" , tr: "i", freq: 4, ilr: "2+"},
  "نعى": { bab: "naqis-ya",   gloss: "to lament / mourn", masdar: "نَعْي", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 2, ilr: "1+"},
  "نهى": { bab: "naqis-ya",   gloss: "to forbid / restrain", masdar: "نَهْي", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 2, ilr: "1+"},
  "طلى": { bab: "naqis-ya",   gloss: "to coat / smear", masdar: "طِلَاء", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 2, ilr: "1+"},
  "عصى": { bab: "naqis-ya",   gloss: "to disobey / rebel", masdar: "عِصْيَان", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 4, ilr: "2+"},
  "مضى": { bab: "naqis-ya",   gloss: "to proceed / go through", masdar: "مُضِيّ", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 2, ilr: "1+"},
  // Alima-pattern defective (i-a vowels + R3=ي) — alias خشي → خشى
  // Canonical ى + separate vowel overrides via bab=alima already set above.

  // Hamzated + defective: R1=أ + R3=ي
  "أتى": { bab: "naqis-ya",   gloss: "to come / arrive", masdar: "إِتْيَان",          pattern: "فَعَى يَفْعِي", r1: "أ" , tr: "i", freq: 4, ilr: "2+"},
  "أبى": { bab: "naqis-ya",   gloss: "to refuse / decline", masdar: "إِبَاء",       pattern: "فَعَى يَفْعِي", r1: "أ" , tr: "t", freq: 2, ilr: "1+"},

  // Hamzated + defective: R2=أ + R3=ي  (medial hamza defective)
  "رأى": { bab: "fataha",     gloss: "to see / observe", masdar: "رُؤْيَة",          pattern: "فَعَلَ يَفْعَلُ", r2: "أ", forceType: "defective_ya", contractR2: true , tr: "t", freq: 1, ilr: "1"},

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  MUDAAF  (Doubled R2=R3)  —  فَعَلَ / يَفْعُلُ  (a-u only)    ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  // ── Mudaaf — canonical keys use the FULL 3-letter triliteral form (R1+R2+R3
  //            with R2=R3), matching the `normalized` string that classifyRoot
  //            produces when it expands a 2-char contracted surface form.
  //            ALIASES below route the 2-char user inputs back to these keys.
  "ردد": { bab: "mudaaf",     gloss: "to reply / return", masdar: "رَدّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "مدد": { bab: "mudaaf",     gloss: "to extend / stretch", masdar: "مَدّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "جرر": { bab: "mudaaf",     gloss: "to drag / pull", masdar: "جَرّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "شدد": { bab: "mudaaf",     gloss: "to pull / tighten", masdar: "شَدّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "عضض": { bab: "mudaaf",     gloss: "to bite", masdar: "عَضّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "همم": { bab: "mudaaf",     gloss: "to concern / matter", masdar: "هَمّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "دلل": { bab: "mudaaf",     gloss: "to point / indicate", masdar: "دَلَالَة", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "حلل": { bab: "mudaaf",     gloss: "to solve / settle", masdar: "حَلّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},

  // ── Mudaaf expansion ─────────────────────────────────────────────────────
  "ظنن": { bab: "mudaaf",     gloss: "to think / suppose", masdar: "ظَنّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "ضمم": { bab: "mudaaf",     gloss: "to add / join / embrace", masdar: "ضَمّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "لفف": { bab: "mudaaf",     gloss: "to wrap / wind around", masdar: "لَفّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "صفف": { bab: "mudaaf",     gloss: "to line up / arrange", masdar: "صَفّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "عدد": { bab: "mudaaf",     gloss: "to count", masdar: "عَدّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "سرر": { bab: "mudaaf",     gloss: "to delight / please", masdar: "سُرُور", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "برر": { bab: "mudaaf",     gloss: "to be righteous / honor", masdar: "بِرّ", pattern: "فَعَّ يَفُعُّ" , tr: "i", freq: 4, ilr: "2+"},
  "سنن": { bab: "mudaaf",     gloss: "to enact / sharpen", masdar: "سَنّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "قصص": { bab: "mudaaf",     gloss: "to cut / tell a story", masdar: "قَصّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "نصص": { bab: "mudaaf",     gloss: "to specify / stipulate", masdar: "نَصّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "بثث": { bab: "mudaaf",     gloss: "to broadcast / disseminate", masdar: "بَثّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "صبب": { bab: "mudaaf",     gloss: "to pour", masdar: "صَبّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "زفف": { bab: "mudaaf",     gloss: "to escort bride / walk slowly", masdar: "زَفّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "ذرر": { bab: "mudaaf",     gloss: "to scatter / sprinkle", masdar: "ذَرّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "مسس": { bab: "mudaaf",     gloss: "to touch", masdar: "مَسّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "سلل": { bab: "mudaaf",     gloss: "to draw / extract", masdar: "سَلّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "كفف": { bab: "mudaaf",     gloss: "to refrain / restrain", masdar: "كَفّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "دقق": { bab: "mudaaf",     gloss: "to knock / be subtle / pound", masdar: "دَقّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "حطط": { bab: "mudaaf",     gloss: "to put down / land", masdar: "حَطّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "غضض": { bab: "mudaaf",     gloss: "to lower (gaze) / be fresh", masdar: "غَضّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "حثث": { bab: "mudaaf",     gloss: "to urge / spur on", masdar: "حَثّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "بلل": { bab: "mudaaf",     gloss: "to wet / moisten", masdar: "بَلّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "دبب": { bab: "mudaaf",     gloss: "to creep / spread slowly", masdar: "دَبِيب", pattern: "فَعَّ يَفُعُّ" , tr: "i", freq: 2, ilr: "1+"},
  "شقق": { bab: "mudaaf",     gloss: "to split / be difficult", masdar: "شَقّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "جفف": { bab: "mudaaf",     gloss: "to dry up / wither", masdar: "جَفَاف", pattern: "فَعَّ يَفُعُّ" , tr: "b", freq: 4, ilr: "2+"},
  "حفف": { bab: "mudaaf",     gloss: "to surround / be close", masdar: "حَفّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "رصص": { bab: "mudaaf",     gloss: "to cram / pack closely", masdar: "رَصّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "ضجج": { bab: "mudaaf",     gloss: "to clamor / complain", masdar: "ضَجِيج", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "بزز": { bab: "mudaaf",     gloss: "to beat / excel", masdar: "بَزّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 2, ilr: "1+"},
  "حضض": { bab: "mudaaf",     gloss: "to urge strongly / exhort", masdar: "حَضّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},

  // ── Nasara — Phase 4 expansion ─────────────────────────────────────────
  "مسك": { bab: "nasara",  gloss: "to hold / grasp", masdar: "مَسْك", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "عرف": { bab: "nasara",  gloss: "to know / recognize", masdar: "مَعْرِفَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "رقص": { bab: "nasara",  gloss: "to dance", masdar: "رَقْص", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "غسل": { bab: "nasara",  gloss: "to wash", masdar: "غَسْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "مطر": { bab: "nasara",  gloss: "to rain", masdar: "مَطَر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "خطب": { bab: "nasara",  gloss: "to preach / propose", masdar: "خِطَابَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "رزق": { bab: "nasara",  gloss: "to provide / sustain", masdar: "رِزْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "ضبط": { bab: "nasara",  gloss: "to control / adjust", masdar: "ضَبْط", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "كفل": { bab: "nasara",  gloss: "to guarantee / sponsor", masdar: "كَفَالَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "سحق": { bab: "nasara",  gloss: "to crush / grind", masdar: "سَحْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "لحم": { bab: "nasara",  gloss: "to weld / solder", masdar: "لَحْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "شغل": { bab: "nasara",  gloss: "to occupy / busy", masdar: "شُغْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "عزل": { bab: "nasara",  gloss: "to isolate / dismiss", masdar: "عَزْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "قفل": { bab: "nasara",  gloss: "to lock / return", masdar: "قَفْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "رعب": { bab: "nasara",  gloss: "to frighten / terrify", masdar: "رُعْب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "نبت": { bab: "nasara",  gloss: "to grow / sprout", masdar: "نَبْت", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "حرث": { bab: "nasara",  gloss: "to plow / cultivate", masdar: "حَرْث", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "خلط": { bab: "nasara",  gloss: "to mix / confuse", masdar: "خَلْط", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "عكس": { bab: "nasara",  gloss: "to reflect / reverse", masdar: "عَكْس", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "حقن": { bab: "nasara",  gloss: "to inject", masdar: "حَقْن", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "مسح": { bab: "nasara",  gloss: "to wipe / erase", masdar: "مَسْح", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "قبض": { bab: "nasara",  gloss: "to seize / arrest", masdar: "قَبْض", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "فطر": { bab: "nasara",  gloss: "to break fast / create", masdar: "فُطُور", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 2, ilr: "1+"},
  "حلب": { bab: "nasara",  gloss: "to milk", masdar: "حَلْب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "زحف": { bab: "nasara",  gloss: "to crawl / advance", masdar: "زَحْف", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "خبز": { bab: "nasara",  gloss: "to bake bread", masdar: "خَبْز", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "غزل": { bab: "nasara",  gloss: "to spin / flirt", masdar: "غَزْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "حصد": { bab: "nasara",  gloss: "to harvest / reap", masdar: "حَصْد", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "طحن": { bab: "nasara",  gloss: "to grind / mill", masdar: "طَحْن", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "قطف": { bab: "nasara",  gloss: "to pick / pluck", masdar: "قَطْف", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "نفخ": { bab: "nasara",  gloss: "to blow / inflate", masdar: "نَفْخ", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "فرش": { bab: "nasara",  gloss: "to spread / furnish", masdar: "فَرْش", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 2, ilr: "1+"},
  "هجر": { bab: "nasara",  gloss: "to abandon / migrate", masdar: "هَجْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "صرح": { bab: "nasara",  gloss: "to declare / state", masdar: "تَصْرِيح", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "قذف": { bab: "nasara",  gloss: "to throw / hurl", masdar: "قَذْف", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "صدم": { bab: "nasara",  gloss: "to collide / shock", masdar: "صَدْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "بسم": { bab: "nasara",  gloss: "to smile", masdar: "بَسْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "غرس": { bab: "nasara",  gloss: "to plant / implant", masdar: "غَرْس", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "عطس": { bab: "nasara",  gloss: "to sneeze", masdar: "عَطْس", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "رشح": { bab: "nasara",  gloss: "to nominate / ooze", masdar: "تَرْشِيح", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "رعد": { bab: "nasara",  gloss: "to thunder", masdar: "رَعْد", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "برق": { bab: "nasara",  gloss: "to flash / gleam", masdar: "بَرْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "خلص": { bab: "nasara",  gloss: "to be pure / escape", masdar: "خَلَاص", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "فسح": { bab: "nasara",  gloss: "to make room / widen", masdar: "فُسْحَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "عصب": { bab: "nasara",  gloss: "to bandage / bind", masdar: "عَصْب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "عكف": { bab: "nasara",  gloss: "to devote oneself", masdar: "عُكُوف", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "شخص": { bab: "nasara",  gloss: "to diagnose / identify", masdar: "شَخْص", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "نعش": { bab: "nasara",  gloss: "to revive / refresh", masdar: "نَعْش", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "مهر": { bab: "nasara",  gloss: "to stamp / seal", masdar: "مَهْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "دهش": { bab: "nasara",  gloss: "to be amazed", masdar: "دَهَش", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "عذر": { bab: "nasara",  gloss: "to excuse / forgive", masdar: "عُذْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "خسر": { bab: "nasara",  gloss: "to lose / fail", masdar: "خَسَارَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "بخر": { bab: "nasara",  gloss: "to fumigate / evaporate", masdar: "تَبْخِير", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "طمر": { bab: "nasara",  gloss: "to bury / hide", masdar: "طَمْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "جذب": { bab: "nasara",  gloss: "to attract / pull", masdar: "جَذْب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "نقع": { bab: "nasara",  gloss: "to soak / immerse", masdar: "نَقْع", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "فلت": { bab: "nasara",  gloss: "to escape / slip away", masdar: "فَلْت", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "سلف": { bab: "nasara",  gloss: "to precede / lend", masdar: "سَلَف", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "عقب": { bab: "nasara",  gloss: "to follow / punish", masdar: "عُقُوبَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 3, ilr: "2"},
  "بصر": { bab: "nasara",  gloss: "to see / perceive", masdar: "بَصَر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "خصر": { bab: "nasara",  gloss: "to narrow / put on waist", masdar: "خَصْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "حظر": { bab: "nasara",  gloss: "to prohibit / ban", masdar: "حَظْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "نثر": { bab: "nasara",  gloss: "to scatter / prose", masdar: "نَثْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "بدر": { bab: "nasara",  gloss: "to appear suddenly", masdar: "بُدُور", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "فلس": { bab: "nasara",  gloss: "to go bankrupt", masdar: "إِفْلَاس", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "رتق": { bab: "nasara",  gloss: "to mend / stitch", masdar: "رَتْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "غبر": { bab: "nasara",  gloss: "to pass / be dusty", masdar: "غُبُور", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 4, ilr: "2+"},
  "صفع": { bab: "nasara",  gloss: "to slap", masdar: "صَفْع", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "هرب": { bab: "nasara",  gloss: "to flee / escape", masdar: "هُرُوب", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "سبك": { bab: "nasara",  gloss: "to cast / found metal", masdar: "سَبْك", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "كبت": { bab: "nasara",  gloss: "to suppress / repress", masdar: "كَبْت", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "طبل": { bab: "nasara",  gloss: "to drum / beat", masdar: "طَبْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "ضخم": { bab: "nasara",  gloss: "to be huge", masdar: "ضَخَامَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "كذب": { bab: "nasara",  gloss: "to lie / fabricate", masdar: "كَذِب", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "وصم": { bab: "nasara",  gloss: "to stigmatize / brand", masdar: "وَصْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "حجر": { bab: "nasara",  gloss: "to quarantine / ban", masdar: "حَجْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "مخض": { bab: "nasara",  gloss: "to churn", masdar: "مَخْض", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "نبش": { bab: "nasara",  gloss: "to dig up / exhume", masdar: "نَبْش", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "قحط": { bab: "nasara",  gloss: "to be droughty / barren", masdar: "قَحْط", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "رعف": { bab: "nasara",  gloss: "to have a nosebleed", masdar: "رُعَاف", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "غمض": { bab: "nasara",  gloss: "to close eyes", masdar: "غَمْض", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 2, ilr: "1+"},
  "كسح": { bab: "nasara",  gloss: "to sweep / clear", masdar: "كَسْح", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "بطش": { bab: "nasara",  gloss: "to strike / seize violently", masdar: "بَطْش", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "فلق": { bab: "nasara",  gloss: "to split / cleave", masdar: "فَلْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "حشم": { bab: "nasara",  gloss: "to be modest / shy", masdar: "حِشْمَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "نضح": { bab: "nasara",  gloss: "to sprinkle / ooze", masdar: "نَضْح", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "زلق": { bab: "nasara",  gloss: "to slip / slide", masdar: "زَلَق", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "سمت": { bab: "nasara",  gloss: "to point / designate", masdar: "سَمْت", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "مثل": { bab: "nasara",  gloss: "to represent / act", masdar: "مَثَل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "عقر": { bab: "nasara",  gloss: "to be barren / hamstring", masdar: "عَقْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "سند": { bab: "nasara",  gloss: "to lean / support", masdar: "سَنَد", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 4, ilr: "2+"},
  "شحذ": { bab: "nasara",  gloss: "to sharpen / beg", masdar: "شَحْذ", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "هتف": { bab: "nasara",  gloss: "to shout / call out", masdar: "هُتَاف", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "غلق": { bab: "nasara",  gloss: "to close / lock", masdar: "غَلْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 4, ilr: "2+"},
  "فرط": { bab: "nasara",  gloss: "to neglect / squander", masdar: "تَفْرِيط", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "أثر": { bab: "nasara",  gloss: "to influence / prefer", masdar: "أَثَر", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "أذن": { bab: "nasara",  gloss: "to permit / announce", masdar: "إِذْن", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 4, ilr: "2+"},
  "أجر": { bab: "nasara",  gloss: "to rent / reward", masdar: "أَجْر", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 2, ilr: "1+"},
  "ألف": { bab: "nasara",  gloss: "to compose / be familiar", masdar: "إِلْف", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 4, ilr: "2+"},
  "أمل": { bab: "nasara",  gloss: "to hope / expect", masdar: "أَمَل", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "أبق": { bab: "nasara",  gloss: "to flee / escape (slave)", masdar: "إِبَاق", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 4, ilr: "2+"},
  "أدب": { bab: "nasara",  gloss: "to discipline / be polite", masdar: "أَدَب", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "أزف": { bab: "nasara",  gloss: "to approach / draw near", masdar: "أُزُوف", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 4, ilr: "2+"},
  "أفق": { bab: "nasara",  gloss: "to recover / regain consciousness", masdar: "إِفَاقَة", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "أبد": { bab: "nasara",  gloss: "to be eternal / wild", masdar: "أَبَد", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "i", freq: 3, ilr: "2"},
  "رأف": { bab: "nasara",  gloss: "to be merciful / compassionate", masdar: "رَأْفَة", pattern: "فَعَلَ يَفْعُلُ", r1: "_", r2: "أ", forceType: "regular" , tr: "i", freq: 3, ilr: "2"},
  "جأر": { bab: "nasara",  gloss: "to cry aloud / implore", masdar: "جُؤَار", pattern: "فَعَلَ يَفْعُلُ", r1: "_", r2: "أ", forceType: "regular" , tr: "i", freq: 3, ilr: "2"},
  "زأر": { bab: "nasara",  gloss: "to roar", masdar: "زَئِير", pattern: "فَعَلَ يَفْعُلُ", r1: "_", r2: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "ثأر": { bab: "nasara",  gloss: "to avenge / take revenge", masdar: "ثَأْر", pattern: "فَعَلَ يَفْعُلُ", r1: "_", r2: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "بطأ": { bab: "nasara",  gloss: "to be slow", masdar: "بُطْء", pattern: "فَعَلَ يَفْعُلُ", r1: "_", r3: "أ", forceType: "regular" , tr: "i", freq: 3, ilr: "2"},
  "وضأ": { bab: "nasara",  gloss: "to perform ablution", masdar: "وُضُوء", pattern: "فَعَلَ يَفْعُلُ", r1: "_", r3: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "خطأ": { bab: "nasara",  gloss: "to err / be wrong", masdar: "خَطَأ", pattern: "فَعَلَ يَفْعُلُ", r1: "_", r3: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "رفأ": { bab: "nasara",  gloss: "to mend / darn", masdar: "رَفْء", pattern: "فَعَلَ يَفْعُلُ", r1: "_", r3: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "نهب": { bab: "nasara",  gloss: "to plunder / loot", masdar: "نَهْب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "طحل": { bab: "nasara",  gloss: "to have spleen trouble", masdar: "طَحْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "جرف": { bab: "nasara",  gloss: "to sweep away / erode", masdar: "جَرْف", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "مخر": { bab: "nasara",  gloss: "to plow (sea)", masdar: "مَخْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "سطح": { bab: "nasara",  gloss: "to flatten / level", masdar: "سَطْح", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "ثلج": { bab: "nasara",  gloss: "to snow / be refreshing", masdar: "ثَلْج", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "كبد": { bab: "nasara",  gloss: "to afflict / suffer", masdar: "كَبْد", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "حصن": { bab: "nasara",  gloss: "to fortify / protect", masdar: "حَصَانَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "جحد": { bab: "nasara",  gloss: "to deny / disbelieve", masdar: "جُحُود", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "سعف": { bab: "nasara",  gloss: "to help / aid", masdar: "سَعْف", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "رتب": { bab: "nasara",  gloss: "to arrange / rank", masdar: "تَرْتِيب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "حمص": { bab: "nasara",  gloss: "to roast / parch", masdar: "حَمْص", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "نشف": { bab: "nasara",  gloss: "to dry / absorb", masdar: "نَشْف", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 3, ilr: "2"},
  "قشط": { bab: "nasara",  gloss: "to scrape / peel off", masdar: "قَشْط", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "سطر": { bab: "nasara",  gloss: "to write / compose", masdar: "سَطْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "ختم": { bab: "nasara",  gloss: "to seal / conclude", masdar: "خَتْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "عقم": { bab: "nasara",  gloss: "to be sterile", masdar: "عُقْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 4, ilr: "2+"},
  "زخم": { bab: "nasara",  gloss: "to push / shove", masdar: "زَخْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "بلط": { bab: "nasara",  gloss: "to pave / tile", masdar: "بَلْط", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "ثلم": { bab: "nasara",  gloss: "to notch / damage", masdar: "ثَلْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "حرق": { bab: "nasara",  gloss: "to burn / scorch", masdar: "حَرْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 1, ilr: "1"},
  "شبح": { bab: "nasara",  gloss: "to be ghostly / shadow", masdar: "شَبَح", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "غفل": { bab: "nasara",  gloss: "to be heedless / neglect", masdar: "غَفْلَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "خمش": { bab: "nasara",  gloss: "to scratch / claw", masdar: "خَمْش", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "نشب": { bab: "nasara",  gloss: "to cling / break out", masdar: "نُشُوب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "وقع": { bab: "nasara",  gloss: "to fall / occur / sign", masdar: "وُقُوع", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "نحر": { bab: "nasara",  gloss: "to slaughter (camel)", masdar: "نَحْر", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "نبغ": { bab: "nasara",  gloss: "to excel / be talented", masdar: "نُبُوغ", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "حبل": { bab: "nasara",  gloss: "to be pregnant", masdar: "حَبَل", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 4, ilr: "2+"},
  "صلب": { bab: "nasara",  gloss: "to be hard / crucify", masdar: "صَلَابَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "عبس": { bab: "nasara",  gloss: "to frown", masdar: "عُبُوس", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "كمل": { bab: "nasara",  gloss: "to be complete / perfect", masdar: "كَمَال", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 4, ilr: "2+"},
  "نزغ": { bab: "nasara",  gloss: "to provoke / incite", masdar: "نَزْغ", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "ذنب": { bab: "nasara",  gloss: "to sin / commit fault", masdar: "ذَنْب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 1, ilr: "1"},
  "عفن": { bab: "nasara",  gloss: "to rot / decay", masdar: "عَفَن", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 4, ilr: "2+"},
  "قنط": { bab: "nasara",  gloss: "to despair", masdar: "قُنُوط", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "خمس": { bab: "nasara",  gloss: "to take a fifth", masdar: "خُمْس", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "سفر": { bab: "nasara",  gloss: "to travel / unveil", masdar: "سَفَر", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 4, ilr: "2+"},
  "حلف": { bab: "nasara",  gloss: "to swear / take oath", masdar: "حَلِف", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "سخن": { bab: "nasara",  gloss: "to be hot / heated", masdar: "سُخُونَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "نقم": { bab: "nasara",  gloss: "to be resentful / punish", masdar: "نِقْمَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "عزب": { bab: "nasara",  gloss: "to be unmarried / distant", masdar: "عُزُوبَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 4, ilr: "2+"},
  "حسر": { bab: "nasara",  gloss: "to uncover / regret", masdar: "حَسْرَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "رقش": { bab: "nasara",  gloss: "to decorate / variegate", masdar: "رَقْش", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "خلب": { bab: "nasara",  gloss: "to captivate / deceive", masdar: "خَلْب", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "نجم": { bab: "nasara",  gloss: "to appear / arise (star)", masdar: "نُجُوم", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 4, ilr: "2+"},
  "تلف": { bab: "nasara",  gloss: "to be damaged / perish", masdar: "تَلَف", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "شبث": { bab: "nasara",  gloss: "to cling / hold fast", masdar: "شَبْث", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "قبس": { bab: "nasara",  gloss: "to kindle / borrow fire", masdar: "قَبْس", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "نقد": { bab: "nasara",  gloss: "to criticize / pay cash", masdar: "نَقْد", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "بدع": { bab: "nasara",  gloss: "to innovate / invent", masdar: "بِدْعَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "أبر": { bab: "nasara",  gloss: "to fulfill / be righteous", masdar: "إِبْرَة", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "أثث": { bab: "nasara",  gloss: "to furnish", masdar: "أَثَاث", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "أنب": { bab: "nasara",  gloss: "to rebuke / blame", masdar: "تَأْنِيب", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "أهل": { bab: "nasara",  gloss: "to be qualified / worthy", masdar: "أَهْل", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "i", freq: 4, ilr: "2+"},
  "أرب": { bab: "nasara",  gloss: "to be clever / shrewd", masdar: "إِرْب", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "i", freq: 3, ilr: "2"},
  "أفك": { bab: "nasara",  gloss: "to lie / turn away", masdar: "إِفْك", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "جزأ": { bab: "nasara",  gloss: "to divide / suffice", masdar: "تَجْزِئَة", pattern: "فَعَلَ يَفْعُلُ", r1: "_", r3: "أ", forceType: "regular" , tr: "t", freq: 4, ilr: "2+"},
  "هزأ": { bab: "nasara",  gloss: "to mock / ridicule", masdar: "هُزْء", pattern: "فَعَلَ يَفْعُلُ", r1: "_", r3: "أ", forceType: "regular" , tr: "t", freq: 4, ilr: "2+"},
  "ردأ": { bab: "nasara",  gloss: "to support / prop up", masdar: "رِدْء", pattern: "فَعَلَ يَفْعُلُ", r1: "_", r3: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "نحل": { bab: "nasara",  gloss: "to be thin / emaciate", masdar: "نَحْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 1, ilr: "1"},
  "زهر": { bab: "nasara",  gloss: "to bloom / shine", masdar: "زُهُور", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "بطح": { bab: "nasara",  gloss: "to lay flat / prostrate", masdar: "بَطْح", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "مزع": { bab: "nasara",  gloss: "to tear to pieces", masdar: "مَزْع", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "خبأ": { bab: "nasara",  gloss: "to hide / store", masdar: "خَبْء", pattern: "فَعَلَ يَفْعُلُ", r1: "_", r3: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "فجأ": { bab: "nasara",  gloss: "to surprise / startle", masdar: "فُجَاءَة", pattern: "فَعَلَ يَفْعُلُ", r1: "_", r3: "أ", forceType: "regular" , tr: "t", freq: 4, ilr: "2+"},
  "دنأ": { bab: "nasara",  gloss: "to be base / vile", masdar: "دَنَاءَة", pattern: "فَعَلَ يَفْعُلُ", r1: "_", r3: "أ", forceType: "regular" , tr: "i", freq: 3, ilr: "2"},
  "أزم": { bab: "nasara",  gloss: "to bite / be in crisis", masdar: "أَزْمَة", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "أسس": { bab: "nasara",  gloss: "to found / establish", masdar: "أَسَاس", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "أبح": { bab: "nasara",  gloss: "to be hoarse", masdar: "بَحَّة", pattern: "فَعَلَ يَفْعُلُ", r1: "أ", forceType: "regular" , tr: "i", freq: 4, ilr: "2+"},

  // ── Daraba — Phase 4 expansion ─────────────────────────────────────────
  "حسم": { bab: "daraba",  gloss: "to settle / cut off", masdar: "حَسْم", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 4, ilr: "2+"},
  "وثق": { bab: "daraba",  gloss: "to trust / document", masdar: "وُثُوق", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "وعظ": { bab: "daraba",  gloss: "to preach / admonish", masdar: "وَعْظ", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "عزف": { bab: "daraba",  gloss: "to play music / abstain", masdar: "عَزْف", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "طبع": { bab: "daraba",  gloss: "to print / stamp", masdar: "طَبْع", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "عصم": { bab: "daraba",  gloss: "to protect / preserve", masdar: "عِصْمَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "خلع": { bab: "daraba",  gloss: "to remove / depose", masdar: "خَلْع", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "فصل": { bab: "daraba",  gloss: "to separate / decide", masdar: "فَصْل", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "وهب": { bab: "daraba",  gloss: "to grant / give", masdar: "هِبَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "نفع": { bab: "daraba",  gloss: "to benefit / be useful", masdar: "نَفْع", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "عرج": { bab: "daraba",  gloss: "to ascend / limp", masdar: "عُرُوج", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "حقد": { bab: "daraba",  gloss: "to bear a grudge", masdar: "حِقْد", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "مزق": { bab: "daraba",  gloss: "to tear / rip", masdar: "مَزْق", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "هبط": { bab: "daraba",  gloss: "to descend / land", masdar: "هُبُوط", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "رقم": { bab: "daraba",  gloss: "to number / digitize", masdar: "رَقْم", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "نحت": { bab: "daraba",  gloss: "to carve / sculpt", masdar: "نَحْت", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "خلف": { bab: "daraba",  gloss: "to succeed / follow behind", masdar: "خَلْف", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "ركع": { bab: "daraba",  gloss: "to kneel / bow in prayer", masdar: "رُكُوع", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 1, ilr: "1"},
  "سجل": { bab: "daraba",  gloss: "to record / register", masdar: "تَسْجِيل", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "رمز": { bab: "daraba",  gloss: "to symbolize / hint", masdar: "رَمْز", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "عصف": { bab: "daraba",  gloss: "to blow violently", masdar: "عَصْف", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "لبث": { bab: "daraba",  gloss: "to stay / linger", masdar: "لُبْث", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "نهض": { bab: "daraba",  gloss: "to rise / stand up", masdar: "نُهُوض", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 1, ilr: "1"},
  "خفض": { bab: "daraba",  gloss: "to lower / reduce", masdar: "خَفْض", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 1, ilr: "1"},
  "نقص": { bab: "daraba",  gloss: "to decrease / be deficient", masdar: "نَقْص", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 2, ilr: "1+"},
  "حبك": { bab: "daraba",  gloss: "to weave / contrive", masdar: "حَبْك", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "غمس": { bab: "daraba",  gloss: "to dip / immerse", masdar: "غَمْس", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "شرط": { bab: "daraba",  gloss: "to stipulate / condition", masdar: "شَرْط", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "حرس": { bab: "daraba",  gloss: "to guard / protect", masdar: "حِرَاسَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "ركز": { bab: "daraba",  gloss: "to focus / concentrate", masdar: "تَرْكِيز", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "لمع": { bab: "daraba",  gloss: "to shine / gleam", masdar: "لَمَعَان", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "جزم": { bab: "daraba",  gloss: "to be decisive / cut off", masdar: "جَزْم", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "عطف": { bab: "daraba",  gloss: "to sympathize / turn", masdar: "عَطْف", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "زخر": { bab: "daraba",  gloss: "to abound / overflow", masdar: "زَخْر", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "لطم": { bab: "daraba",  gloss: "to slap / beat", masdar: "لَطْم", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "حنث": { bab: "daraba",  gloss: "to break an oath", masdar: "حِنْث", pattern: "فَعَلَ يَفْعِلُ" , tr: "b", freq: 3, ilr: "2"},
  "هجم": { bab: "daraba",  gloss: "to attack / assault", masdar: "هُجُوم", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "صهل": { bab: "daraba",  gloss: "to neigh / whinny", masdar: "صَهِيل", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "نقب": { bab: "daraba",  gloss: "to bore / tunnel", masdar: "نَقْب", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "عقص": { bab: "daraba",  gloss: "to braid / twist", masdar: "عَقْص", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "شطف": { bab: "daraba",  gloss: "to rinse", masdar: "شَطْف", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "جذف": { bab: "daraba",  gloss: "to row / paddle", masdar: "جَذْف", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "عتب": { bab: "daraba",  gloss: "to blame / reproach", masdar: "عَتْب", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "نقض": { bab: "daraba",  gloss: "to break / violate", masdar: "نَقْض", pattern: "فَعَلَ يَفْعِلُ" , tr: "b", freq: 3, ilr: "2"},
  "وفق": { bab: "daraba",  gloss: "to reconcile / succeed", masdar: "وِفَاق", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "غرز": { bab: "daraba",  gloss: "to stab / stick in", masdar: "غَرْز", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "طرف": { bab: "daraba",  gloss: "to blink", masdar: "طَرْف", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "شرد": { bab: "daraba",  gloss: "to stray / wander", masdar: "شُرُود", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "لهث": { bab: "daraba",  gloss: "to pant / gasp", masdar: "لَهْث", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "نعق": { bab: "daraba",  gloss: "to caw / croak", masdar: "نَعِيق", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "هرش": { bab: "daraba",  gloss: "to scratch / scrape", masdar: "هَرْش", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "حصف": { bab: "daraba",  gloss: "to be wise / sound", masdar: "حَصَافَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "نسف": { bab: "daraba",  gloss: "to blow up / demolish", masdar: "نَسْف", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "قصف": { bab: "daraba",  gloss: "to bombard / snap", masdar: "قَصْف", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "بطن": { bab: "daraba",  gloss: "to hide / be interior", masdar: "بَطْن", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "حدس": { bab: "daraba",  gloss: "to guess / conjecture", masdar: "حَدْس", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "ختل": { bab: "daraba",  gloss: "to deceive / creep up", masdar: "خَتْل", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "دمغ": { bab: "daraba",  gloss: "to brand / stamp", masdar: "دَمْغ", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "نسل": { bab: "daraba",  gloss: "to reproduce / unthread", masdar: "نَسْل", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "رجح": { bab: "daraba",  gloss: "to be preponderant / weigh", masdar: "رُجْحَان", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 4, ilr: "2+"},
  "فقس": { bab: "daraba",  gloss: "to hatch", masdar: "فَقْس", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "نضب": { bab: "daraba",  gloss: "to dry up / be exhausted", masdar: "نُضُوب", pattern: "فَعَلَ يَفْعِلُ" , tr: "b", freq: 3, ilr: "2"},
  "حرك": { bab: "daraba",  gloss: "to move / stir", masdar: "حَرَكَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "b", freq: 3, ilr: "2"},
  "سرج": { bab: "daraba",  gloss: "to saddle", masdar: "سَرْج", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "لقط": { bab: "daraba",  gloss: "to pick up / glean", masdar: "لَقْط", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "مهد": { bab: "daraba",  gloss: "to pave / prepare", masdar: "تَمْهِيد", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "قدح": { bab: "daraba",  gloss: "to strike fire / criticize", masdar: "قَدْح", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 2, ilr: "1+"},
  "عمد": { bab: "daraba",  gloss: "to do intentionally / support", masdar: "عَمْد", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "طفل": { bab: "daraba",  gloss: "to approach sunset", masdar: "طَفَل", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "رجل": { bab: "daraba",  gloss: "to comb / walk", masdar: "رَجْل", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "شغف": { bab: "daraba",  gloss: "to be passionate", masdar: "شَغَف", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "بسل": { bab: "daraba",  gloss: "to be brave / stern", masdar: "بَسَالَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 4, ilr: "2+"},
  "شرس": { bab: "daraba",  gloss: "to be fierce / quarrelsome", masdar: "شَرَاسَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "حدب": { bab: "daraba",  gloss: "to be hunchbacked / caring", masdar: "حَدَب", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 4, ilr: "2+"},
  "خفق": { bab: "daraba",  gloss: "to flutter / fail", masdar: "خَفَقَان", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},

  // ── Fataha — Phase 4 expansion ─────────────────────────────────────────
  "قلع": { bab: "fataha",  gloss: "to uproot / extract", masdar: "قَلْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},
  "نبح": { bab: "fataha",  gloss: "to bark", masdar: "نُبَاح", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "نسج": { bab: "fataha",  gloss: "to weave", masdar: "نَسْج", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},
  "رضع": { bab: "fataha",  gloss: "to suckle", masdar: "رَضَاعَة", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},
  "بذر": { bab: "fataha",  gloss: "to sow / squander", masdar: "بَذْر", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "خشع": { bab: "fataha",  gloss: "to be humble / devout", masdar: "خُشُوع", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "قرع": { bab: "fataha",  gloss: "to knock / ring", masdar: "قَرْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},
  "ردع": { bab: "fataha",  gloss: "to deter / restrain", masdar: "رَدْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},
  "طبق": { bab: "fataha",  gloss: "to apply / match", masdar: "تَطْبِيق", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},
  "جمح": { bab: "fataha",  gloss: "to bolt / be unruly", masdar: "جِمَاح", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},
  "زرق": { bab: "fataha",  gloss: "to be blue / inject", masdar: "زَرْق", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "شبك": { bab: "fataha",  gloss: "to intertwine / mesh", masdar: "شَبْك", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},
  "مضغ": { bab: "fataha",  gloss: "to chew", masdar: "مَضْغ", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},
  "ردف": { bab: "fataha",  gloss: "to follow / ride behind", masdar: "رِدْف", pattern: "فَعَلَ يَفْعَلُ" , tr: "b", freq: 3, ilr: "2"},
  "شرع": { bab: "fataha",  gloss: "to begin / legislate", masdar: "شُرُوع", pattern: "فَعَلَ يَفْعَلُ" , tr: "b", freq: 3, ilr: "2"},
  "مرح": { bab: "fataha",  gloss: "to be cheerful / frolic", masdar: "مَرَح", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "سفك": { bab: "fataha",  gloss: "to shed (blood)", masdar: "سَفْك", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},
  "هدم": { bab: "fataha",  gloss: "to demolish / destroy", masdar: "هَدْم", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},
  "نهل": { bab: "fataha",  gloss: "to drink / draw water", masdar: "نَهْل", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},
  "جبل": { bab: "fataha",  gloss: "to mold / create", masdar: "جَبْل", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},
  "جرب": { bab: "fataha",  gloss: "to try / experience", masdar: "تَجْرِبَة", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "خنع": { bab: "fataha",  gloss: "to be submissive / humble", masdar: "خُنُوع", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "قنت": { bab: "fataha",  gloss: "to be devout / obedient", masdar: "قُنُوت", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "زهد": { bab: "fataha",  gloss: "to be ascetic / renounce", masdar: "زُهْد", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "شرق": { bab: "fataha",  gloss: "to rise (sun) / choke", masdar: "شُرُوق", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "ذعن": { bab: "fataha",  gloss: "to submit / comply", masdar: "إِذْعَان", pattern: "فَعَلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "زمر": { bab: "fataha",  gloss: "to play pipe / sing", masdar: "زَمْر", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "سفح": { bab: "fataha",  gloss: "to shed (blood/tears)", masdar: "سَفْح", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},
  "لفح": { bab: "fataha",  gloss: "to scorch / blast", masdar: "لَفْح", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},
  "عجن": { bab: "fataha",  gloss: "to knead", masdar: "عَجْن", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},
  "دمع": { bab: "fataha",  gloss: "to tear up / weep", masdar: "دَمْع", pattern: "فَعَلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},

  // ── Alima — Phase 4 expansion ──────────────────────────────────────────
  "سخط": { bab: "alima",  gloss: "to be angry / displeased", masdar: "سَخَط", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "قلق": { bab: "alima",  gloss: "to be anxious / worried", masdar: "قَلَق", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "سئم": { bab: "alima",  gloss: "to be bored / weary", masdar: "سَأَم", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "حذر": { bab: "alima",  gloss: "to beware / be cautious", masdar: "حَذَر", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "فطن": { bab: "alima",  gloss: "to be clever / perceive", masdar: "فِطْنَة", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "سقم": { bab: "alima",  gloss: "to be ill / sick", masdar: "سُقْم", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "مرض": { bab: "alima",  gloss: "to be sick / ill", masdar: "مَرَض", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 1, ilr: "1"},
  "شبع": { bab: "alima",  gloss: "to be full / satiated", masdar: "شِبَع", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "شعر": { bab: "alima",  gloss: "to feel / sense / perceive", masdar: "شُعُور", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 2, ilr: "1+"},
  "ظمئ": { bab: "alima",  gloss: "to be parched / thirsty", masdar: "ظَمَأ", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "وجع": { bab: "alima",  gloss: "to ache / be in pain", masdar: "وَجَع", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "بطر": { bab: "alima",  gloss: "to be insolent / ungrateful", masdar: "بَطَر", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "كلف": { bab: "alima",  gloss: "to be fond of / smitten", masdar: "كُلْفَة", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "خشن": { bab: "alima",  gloss: "to be rough / coarse", masdar: "خُشُونَة", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "وسع": { bab: "alima",  gloss: "to be wide / spacious", masdar: "وُسْع", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "يبس": { bab: "alima",  gloss: "to be dry / hard", masdar: "يُبْس", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "وثب": { bab: "alima",  gloss: "to leap / jump", masdar: "وُثُوب", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},
  "ورع": { bab: "alima",  gloss: "to be pious / scrupulous", masdar: "وَرَع", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "فرق": { bab: "alima",  gloss: "to be afraid", masdar: "فَرْق", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "ولع": { bab: "alima",  gloss: "to be passionate / devoted", masdar: "وَلَع", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "فقه": { bab: "alima",  gloss: "to comprehend / understand (law)", masdar: "فِقْه", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},
  "لبق": { bab: "alima",  gloss: "to be dexterous / elegant", masdar: "لَبَاقَة", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "حنق": { bab: "alima",  gloss: "to be furious / enraged", masdar: "حَنَق", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "طمث": { bab: "alima",  gloss: "to menstruate", masdar: "طَمْث", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},
  "بطل": { bab: "alima",  gloss: "to be brave / become void", masdar: "بُطْلَان", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "أنس": { bab: "alima",  gloss: "to be sociable / friendly", masdar: "أُنْس", pattern: "فَعِلَ يَفْعَلُ", r1: "أ", forceType: "regular" , tr: "i", freq: 4, ilr: "2+"},
  "أرق": { bab: "alima",  gloss: "to have insomnia", masdar: "أَرَق", pattern: "فَعِلَ يَفْعَلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 4, ilr: "2+"},
  "ألم": { bab: "alima",  gloss: "to be in pain / ache", masdar: "أَلَم", pattern: "فَعِلَ يَفْعَلُ", r1: "أ", forceType: "regular" , tr: "i", freq: 3, ilr: "2"},
  "أنف": { bab: "alima",  gloss: "to disdain / be proud", masdar: "أَنَفَة", pattern: "فَعِلَ يَفْعَلُ", r1: "أ", forceType: "regular" , tr: "t", freq: 3, ilr: "2"},
  "سأم": { bab: "alima",  gloss: "to be bored / weary", masdar: "سَأَم", pattern: "فَعِلَ يَفْعَلُ", r1: "_", r2: "أ", forceType: "regular" , tr: "i", freq: 3, ilr: "2"},
  "غبن": { bab: "alima",  gloss: "to cheat / be gullible", masdar: "غَبْن", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},
  "سكر": { bab: "alima",  gloss: "to be drunk / intoxicated", masdar: "سُكْر", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "زهق": { bab: "alima",  gloss: "to perish / be exhausted", masdar: "زُهُوق", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},
  "حمق": { bab: "alima",  gloss: "to be foolish", masdar: "حَمَاقَة", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "وهل": { bab: "alima",  gloss: "to be mistaken / anxious", masdar: "وَهَل", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "صدئ": { bab: "alima",  gloss: "to rust / be rusty", masdar: "صَدَأ", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "بلي": { bab: "alima",  gloss: "to be worn out / tested", masdar: "بِلًى", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "فقر": { bab: "alima",  gloss: "to be poor", masdar: "فَقْر", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 2, ilr: "1+"},
  "مقت": { bab: "alima",  gloss: "to detest / loathe", masdar: "مَقْت", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 4, ilr: "2+"},
  "غثي": { bab: "alima",  gloss: "to feel nauseous", masdar: "غَثَيَان", pattern: "فَعِلَ يَفْعَلُ" , tr: "t", freq: 3, ilr: "2"},
  "هلع": { bab: "alima",  gloss: "to be terrified / panicked", masdar: "هَلَع", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},
  "حرد": { bab: "alima",  gloss: "to be angry / sulk", masdar: "حَرَد", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 4, ilr: "2+"},
  "برئ": { bab: "alima",  gloss: "to be innocent / recover", masdar: "بَرَاءَة", pattern: "فَعِلَ يَفْعَلُ" , tr: "i", freq: 3, ilr: "2"},

  // ── Karuma — Phase 4 expansion ─────────────────────────────────────────
  "حقر": { bab: "karuma",  gloss: "to be despicable / contemptible", masdar: "حَقَارَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "خبث": { bab: "karuma",  gloss: "to be vile / malicious", masdar: "خُبْث", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "سفل": { bab: "karuma",  gloss: "to be lowly / base", masdar: "سُفْل", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "رخص": { bab: "karuma",  gloss: "to be cheap / inexpensive", masdar: "رُخْص", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "بلد": { bab: "karuma",  gloss: "to be dull / stupid", masdar: "بَلَادَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "عسر": { bab: "karuma",  gloss: "to be difficult / hard", masdar: "عُسْر", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "بشع": { bab: "karuma",  gloss: "to be ugly / grotesque", masdar: "بَشَاعَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "لؤم": { bab: "karuma",  gloss: "to be mean / ignoble", masdar: "لُؤْم", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "وسم": { bab: "karuma",  gloss: "to be handsome / marked", masdar: "وَسَامَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "رحب": { bab: "karuma",  gloss: "to be spacious / welcoming", masdar: "رَحَابَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "ملح": { bab: "karuma",  gloss: "to be salty / witty", masdar: "مُلُوحَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "حمض": { bab: "karuma",  gloss: "to be sour / acidic", masdar: "حُمُوضَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "ثخن": { bab: "karuma",  gloss: "to be thick / heavy", masdar: "ثَخَانَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "جسم": { bab: "karuma",  gloss: "to be large / bodied", masdar: "جَسَامَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "وعر": { bab: "karuma",  gloss: "to be rugged / difficult", masdar: "وُعُورَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "سخف": { bab: "karuma",  gloss: "to be silly / frivolous", masdar: "سَخَافَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "دمث": { bab: "karuma",  gloss: "to be gentle / smooth", masdar: "دَمَاثَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "وقح": { bab: "karuma",  gloss: "to be impudent / shameless", masdar: "وَقَاحَة", pattern: "فَعُلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},

  // ── Mithal — Phase 4 expansion ─────────────────────────────────────────
  "وزع": { bab: "mithal",  gloss: "to distribute", masdar: "وَزْع", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "وطئ": { bab: "mithal",  gloss: "to tread / step on", masdar: "وَطْء", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "ومض": { bab: "mithal",  gloss: "to flash / glitter", masdar: "وَمِيض", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "وشى": { bab: "mithal",  gloss: "to embroider / slander", masdar: "وِشَايَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "وعى": { bab: "mithal",  gloss: "to comprehend / be aware", masdar: "وَعْي", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "وصى": { bab: "mithal",  gloss: "to advise / bequeath", masdar: "وَصِيَّة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "وفى": { bab: "mithal",  gloss: "to fulfill / be loyal", masdar: "وَفَاء", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "وبخ": { bab: "mithal",  gloss: "to rebuke / scold", masdar: "تَوْبِيخ", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "ودع": { bab: "mithal",  gloss: "to bid farewell / leave", masdar: "وَدَاع", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "وشك": { bab: "mithal",  gloss: "to be about to / be imminent", masdar: "وَشْك", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "وهم": { bab: "mithal",  gloss: "to imagine / suppose", masdar: "وَهْم", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "وثر": { bab: "mithal",  gloss: "to be soft / plush", masdar: "وَثَارَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "ورم": { bab: "mithal",  gloss: "to swell / be inflamed", masdar: "وَرَم", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "وجس": { bab: "mithal",  gloss: "to feel / apprehend", masdar: "وَجْس", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},

  // ── Jawwaf-waw — Phase 4 expansion ───────────────────────────────────
  "راح": { bab: "jawwaf-waw",  gloss: "to go / become", masdar: "رَاحَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "فاض": { bab: "jawwaf-waw",  gloss: "to overflow / flood", masdar: "فَيَضَان", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "ساح": { bab: "jawwaf-waw",  gloss: "to travel / flow", masdar: "سِيَاحَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 4, ilr: "2+"},
  "فاح": { bab: "jawwaf-waw",  gloss: "to emanate / reek", masdar: "فَوْح", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "جاع": { bab: "jawwaf-waw",  gloss: "to be hungry", masdar: "جُوع", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "ماج": { bab: "jawwaf-waw",  gloss: "to surge / wave", masdar: "مَوْج", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "ساق": { bab: "jawwaf-waw",  gloss: "to drive / lead", masdar: "سَوْق", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "عام": { bab: "jawwaf-waw",  gloss: "to swim / float", masdar: "عَوْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 4, ilr: "2+"},
  "ران": { bab: "jawwaf-waw",  gloss: "to stain / overcome", masdar: "رَيْن", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "حال": { bab: "jawwaf-waw",  gloss: "to prevent / change", masdar: "حَوْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "ناب": { bab: "jawwaf-waw",  gloss: "to deputize / represent", masdar: "نِيَابَة", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "زال": { bab: "jawwaf-waw",  gloss: "to cease / disappear", masdar: "زَوَال", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "بال": { bab: "jawwaf-waw",  gloss: "to urinate", masdar: "بَوْل", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "حام": { bab: "jawwaf-waw",  gloss: "to hover / circle", masdar: "حَوْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "صاح": { bab: "jawwaf-waw",  gloss: "to shout / scream", masdar: "صِيَاح", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 2, ilr: "1+"},
  "ناح": { bab: "jawwaf-waw",  gloss: "to wail / lament", masdar: "نَوْح", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 2, ilr: "1+"},
  "لام": { bab: "jawwaf-waw",  gloss: "to blame / reproach", masdar: "لَوْم", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "شاب": { bab: "jawwaf-waw",  gloss: "to grow gray / age", masdar: "شَيْب", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},
  "فات": { bab: "jawwaf-waw",  gloss: "to pass / miss", masdar: "فَوْت", pattern: "فَعَلَ يَفْعُلُ" , tr: "b", freq: 3, ilr: "2"},
  "غاث": { bab: "jawwaf-waw",  gloss: "to help / rain", masdar: "غَوْث", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 3, ilr: "2"},
  "كاد": { bab: "jawwaf-waw",  gloss: "to almost / be about to", masdar: "كَوْد", pattern: "فَعَلَ يَفْعُلُ" , tr: "t", freq: 4, ilr: "2+"},
  "ساغ": { bab: "jawwaf-waw",  gloss: "to be easy to swallow", masdar: "سَوَاغ", pattern: "فَعَلَ يَفْعُلُ" , tr: "i", freq: 3, ilr: "2"},

  // ── Jawwaf-ya — Phase 4 expansion ────────────────────────────────────
  "فاق": { bab: "jawwaf-ya",  gloss: "to surpass / excel", masdar: "فَوْق", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "غاب": { bab: "jawwaf-ya",  gloss: "to be absent / disappear", masdar: "غِيَاب", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "عاب": { bab: "jawwaf-ya",  gloss: "to shame / find fault", masdar: "عَيْب", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "حاد": { bab: "jawwaf-ya",  gloss: "to deviate / swerve", masdar: "حَوْد", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "غار": { bab: "jawwaf-ya",  gloss: "to be jealous", masdar: "غَيْرَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "دان": { bab: "jawwaf-ya",  gloss: "to condemn / judge", masdar: "دِيَانَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "جاز": { bab: "jawwaf-ya",  gloss: "to pass / be permissible", masdar: "جَوَاز", pattern: "فَعَلَ يَفْعِلُ" , tr: "b", freq: 3, ilr: "2"},
  "ماز": { bab: "jawwaf-ya",  gloss: "to distinguish / separate", masdar: "تَمْيِيز", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "خاب": { bab: "jawwaf-ya",  gloss: "to fail / be disappointed", masdar: "خَيْبَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "فاد": { bab: "jawwaf-ya",  gloss: "to benefit / be useful", masdar: "فَائِدَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "نال": { bab: "jawwaf-ya",  gloss: "to obtain / achieve", masdar: "نَيْل", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "بان": { bab: "jawwaf-ya",  gloss: "to be clear / apparent", masdar: "بَيَان", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "هاب": { bab: "jawwaf-ya",  gloss: "to be in awe / fear", masdar: "هَيْبَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 4, ilr: "2+"},
  "ضاع": { bab: "jawwaf-ya",  gloss: "to be lost / wasted", masdar: "ضَيَاع", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 4, ilr: "2+"},
  "حاك": { bab: "jawwaf-ya",  gloss: "to weave / tell", masdar: "حِيَاكَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "ساخ": { bab: "jawwaf-ya",  gloss: "to sink / collapse", masdar: "سَيْخ", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "طاش": { bab: "jawwaf-ya",  gloss: "to go astray / be reckless", masdar: "طَيْش", pattern: "فَعَلَ يَفْعِلُ" , tr: "i", freq: 3, ilr: "2"},
  "عاق": { bab: "jawwaf-ya",  gloss: "to hinder / obstruct", masdar: "عَوْق", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 4, ilr: "2+"},
  "شاخ": { bab: "jawwaf-ya",  gloss: "to age / grow old", masdar: "شَيْخُوخَة", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},
  "ماد": { bab: "jawwaf-ya",  gloss: "to sway / rock", masdar: "مَيْد", pattern: "فَعَلَ يَفْعِلُ" , tr: "t", freq: 3, ilr: "2"},

  // ── Naqis-waw — Phase 4 expansion ────────────────────────────────────
  "بدا": { bab: "naqis-waw",  gloss: "to appear / seem", masdar: "بُدُوّ", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 4, ilr: "2+"},
  "محا": { bab: "naqis-waw",  gloss: "to erase / wipe out", masdar: "مَحْو", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 4, ilr: "2+"},
  "نما": { bab: "naqis-waw",  gloss: "to grow / develop", masdar: "نُمُوّ", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 3, ilr: "2"},
  "كسا": { bab: "naqis-waw",  gloss: "to clothe / dress", masdar: "كِسْوَة", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 3, ilr: "2"},
  "حبا": { bab: "naqis-waw",  gloss: "to crawl / endow", masdar: "حَبْو", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 3, ilr: "2"},
  "غلا": { bab: "naqis-waw",  gloss: "to be expensive / boil", masdar: "غَلَاء", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 4, ilr: "2+"},
  "بلا": { bab: "naqis-waw",  gloss: "to test / afflict", masdar: "بَلَاء", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 4, ilr: "2+"},
  "جفا": { bab: "naqis-waw",  gloss: "to be harsh / estrange", masdar: "جَفَاء", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 3, ilr: "2"},
  "صفا": { bab: "naqis-waw",  gloss: "to be pure / clear", masdar: "صَفَاء", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 3, ilr: "2"},
  "حلا": { bab: "naqis-waw",  gloss: "to be sweet / pleasant", masdar: "حَلَاوَة", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 3, ilr: "2"},
  "زها": { bab: "naqis-waw",  gloss: "to be bright / proud", masdar: "زُهُوّ", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 3, ilr: "2"},
  "طلا": { bab: "naqis-waw",  gloss: "to coat / smear", masdar: "طِلَاء", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 4, ilr: "2+"},
  "عرا": { bab: "naqis-waw",  gloss: "to befall / happen to", masdar: "عُرْوَة", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 3, ilr: "2"},
  "كبا": { bab: "naqis-waw",  gloss: "to stumble / fall", masdar: "كَبْوَة", pattern: "فَعَا يَفْعُو" , tr: "i", freq: 3, ilr: "2"},
  "هجا": { bab: "naqis-waw",  gloss: "to satirize / spell", masdar: "هِجَاء", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 3, ilr: "2"},
  "سلا": { bab: "naqis-waw",  gloss: "to forget / console", masdar: "سُلُوّ", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 3, ilr: "2"},
  "رسا": { bab: "naqis-waw",  gloss: "to anchor / be firm", masdar: "رُسُوّ", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 3, ilr: "2"},
  "ذرا": { bab: "naqis-waw",  gloss: "to scatter / protect", masdar: "ذَرْو", pattern: "فَعَا يَفْعُو" , tr: "t", freq: 3, ilr: "2"},

  // ── Naqis-ya — Phase 4 expansion ──────────────────────────────────────
  "صلى": { bab: "naqis-ya",  gloss: "to pray", masdar: "صَلَاة", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 3, ilr: "2"},
  "فدى": { bab: "naqis-ya",  gloss: "to ransom / redeem", masdar: "فِدَاء", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 3, ilr: "2"},
  "سقى": { bab: "naqis-ya",  gloss: "to water / irrigate", masdar: "سَقْي", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 3, ilr: "2"},
  "أوى": { bab: "naqis-ya",  gloss: "to shelter / take refuge", masdar: "إِيوَاء", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 4, ilr: "2+"},
  "كوى": { bab: "naqis-ya",  gloss: "to iron / cauterize", masdar: "كَيّ", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 3, ilr: "2"},
  "هوى": { bab: "naqis-ya",  gloss: "to fall / desire", masdar: "هَوًى", pattern: "فَعَى يَفْعِي" , tr: "i", freq: 4, ilr: "2+"},
  "ثنى": { bab: "naqis-ya",  gloss: "to bend / fold", masdar: "ثَنْي", pattern: "فَعَى يَفْعِي" , tr: "b", freq: 4, ilr: "2+"},
  "حوى": { bab: "naqis-ya",  gloss: "to contain / possess", masdar: "حِوَايَة", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 3, ilr: "2"},
  "روى": { bab: "naqis-ya",  gloss: "to narrate / irrigate", masdar: "رِوَايَة", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 3, ilr: "2"},
  "طوى": { bab: "naqis-ya",  gloss: "to fold / wrap", masdar: "طَيّ", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 3, ilr: "2"},
  "غوى": { bab: "naqis-ya",  gloss: "to go astray / seduce", masdar: "غِوَايَة", pattern: "فَعَى يَفْعِي" , tr: "i", freq: 3, ilr: "2"},
  "زكى": { bab: "naqis-ya",  gloss: "to purify / grow", masdar: "زَكَاة", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 3, ilr: "2"},
  "عرى": { bab: "naqis-ya",  gloss: "to be naked / strip", masdar: "عُرْي", pattern: "فَعَى يَفْعِي" , tr: "i", freq: 3, ilr: "2"},
  "غنى": { bab: "naqis-ya",  gloss: "to sing / be rich", masdar: "غِنَاء", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 4, ilr: "2+"},
  "جنى": { bab: "naqis-ya",  gloss: "to harvest / commit", masdar: "جَنْي", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 3, ilr: "2"},
  "كفى": { bab: "naqis-ya",  gloss: "to suffice / be enough", masdar: "كِفَايَة", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 3, ilr: "2"},
  "خفى": { bab: "naqis-ya",  gloss: "to hide / conceal", masdar: "خَفَاء", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 3, ilr: "2"},
  "أذى": { bab: "naqis-ya",  gloss: "to harm / hurt", masdar: "أَذًى", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 4, ilr: "2+"},
  "سرى": { bab: "naqis-ya",  gloss: "to travel at night", masdar: "سُرًى", pattern: "فَعَى يَفْعِي" , tr: "i", freq: 3, ilr: "2"},
  "نوى": { bab: "naqis-ya",  gloss: "to intend / plan", masdar: "نِيَّة", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 3, ilr: "2"},
  "شوى": { bab: "naqis-ya",  gloss: "to roast / grill", masdar: "شَيّ", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 3, ilr: "2"},
  "قوى": { bab: "naqis-ya",  gloss: "to strengthen", masdar: "قُوَّة", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 3, ilr: "2"},
  "عوى": { bab: "naqis-ya",  gloss: "to howl / wail", masdar: "عُوَاء", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 3, ilr: "2"},
  "لوى": { bab: "naqis-ya",  gloss: "to twist / bend", masdar: "لَيّ", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 4, ilr: "2+"},
  "خلى": { bab: "naqis-ya",  gloss: "to leave / vacate", masdar: "خَلَاء", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 3, ilr: "2"},
  "غلى": { bab: "naqis-ya",  gloss: "to boil", masdar: "غَلَيَان", pattern: "فَعَى يَفْعِي" , tr: "b", freq: 3, ilr: "2"},
  "حنى": { bab: "naqis-ya",  gloss: "to bend / bow", masdar: "حَنْو", pattern: "فَعَى يَفْعِي" , tr: "b", freq: 4, ilr: "2+"},
  "كنى": { bab: "naqis-ya",  gloss: "to give a nickname", masdar: "كِنَايَة", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 4, ilr: "2+"},
  "صبا": { bab: "naqis-ya",  gloss: "to long for / be young", masdar: "صِبَا", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 4, ilr: "2+"},
  "لغا": { bab: "naqis-ya",  gloss: "to speak nonsense", masdar: "لَغْو", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 4, ilr: "2+"},
  "عنى": { bab: "naqis-ya",  gloss: "to mean / intend", masdar: "عَنَاء", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 4, ilr: "2+"},
  "سمى": { bab: "naqis-ya",  gloss: "to name / be elevated", masdar: "سُمُوّ", pattern: "فَعَى يَفْعِي" , tr: "t", freq: 4, ilr: "2+"},

  // ── Mudaaf — Phase 4 expansion ─────────────────────────────────────────
  "مرر": { bab: "mudaaf",  gloss: "to pass / be bitter", masdar: "مُرُور", pattern: "فَعَّ يَفُعُّ" , tr: "b", freq: 4, ilr: "2+"},
  "خطط": { bab: "mudaaf",  gloss: "to plan / draw lines", masdar: "خَطّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "فكك": { bab: "mudaaf",  gloss: "to disassemble / release", masdar: "فَكّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "حقق": { bab: "mudaaf",  gloss: "to achieve / verify", masdar: "حَقّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "عمم": { bab: "mudaaf",  gloss: "to generalize / turban", masdar: "عُمُوم", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "خصص": { bab: "mudaaf",  gloss: "to specify / allocate", masdar: "خُصُوصِيَّة", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "بتت": { bab: "mudaaf",  gloss: "to decide / settle firmly", masdar: "بَتّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "جلل": { bab: "mudaaf",  gloss: "to be great / cover", masdar: "جَلَال", pattern: "فَعَّ يَفُعُّ" , tr: "i", freq: 4, ilr: "2+"},
  "هزز": { bab: "mudaaf",  gloss: "to shake / move", masdar: "هَزّ", pattern: "فَعَّ يَفُعُّ" , tr: "b", freq: 4, ilr: "2+"},
  "فرر": { bab: "mudaaf",  gloss: "to flee / escape", masdar: "فِرَار", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "غلل": { bab: "mudaaf",  gloss: "to steal / penetrate", masdar: "غُلُول", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "نقق": { bab: "mudaaf",  gloss: "to croak", masdar: "نَقِيق", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "رنن": { bab: "mudaaf",  gloss: "to ring / resonate", masdar: "رَنِين", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "حجج": { bab: "mudaaf",  gloss: "to argue / make pilgrimage", masdar: "حَجّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "عزز": { bab: "mudaaf",  gloss: "to strengthen / be dear", masdar: "عِزّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "قرر": { bab: "mudaaf",  gloss: "to decide / settle", masdar: "قَرَار", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "ضلل": { bab: "mudaaf",  gloss: "to go astray / mislead", masdar: "ضَلَال", pattern: "فَعَّ يَفُعُّ" , tr: "i", freq: 4, ilr: "2+"},
  "جنن": { bab: "mudaaf",  gloss: "to go mad / conceal", masdar: "جُنُون", pattern: "فَعَّ يَفُعُّ" , tr: "i", freq: 4, ilr: "2+"},
  "ملل": { bab: "mudaaf",  gloss: "to be bored / dictate", masdar: "مَلَل", pattern: "فَعَّ يَفُعُّ" , tr: "i", freq: 4, ilr: "2+"},
  "حرر": { bab: "mudaaf",  gloss: "to liberate / edit", masdar: "حُرِّيَّة", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "ذلل": { bab: "mudaaf",  gloss: "to humiliate / make easy", masdar: "ذُلّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "صحح": { bab: "mudaaf",  gloss: "to correct / be healthy", masdar: "صِحَّة", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "ضرر": { bab: "mudaaf",  gloss: "to be harmful / damaged", masdar: "ضَرَر", pattern: "فَعَّ يَفُعُّ" , tr: "i", freq: 4, ilr: "2+"},
  "فتت": { bab: "mudaaf",  gloss: "to crumble", masdar: "فَتّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "غشش": { bab: "mudaaf",  gloss: "to cheat / deceive", masdar: "غِشّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "حسس": { bab: "mudaaf",  gloss: "to feel / sense", masdar: "حِسّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "هبب": { bab: "mudaaf",  gloss: "to blow / rush", masdar: "هُبُوب", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "نمم": { bab: "mudaaf",  gloss: "to gossip / slander", masdar: "نَمِيمَة", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "حبب": { bab: "mudaaf",  gloss: "to love / endear", masdar: "حُبّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "كرر": { bab: "mudaaf",  gloss: "to repeat", masdar: "تَكْرَار", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "شحح": { bab: "mudaaf",  gloss: "to be stingy / scarce", masdar: "شُحّ", pattern: "فَعَّ يَفُعُّ" , tr: "i", freq: 4, ilr: "2+"},
  "لمم": { bab: "mudaaf",  gloss: "to collect / touch lightly", masdar: "لَمّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "شكك": { bab: "mudaaf",  gloss: "to doubt / suspect", masdar: "شَكّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "زمم": { bab: "mudaaf",  gloss: "to bridle / muzzle", masdar: "زَمّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "خلل": { bab: "mudaaf",  gloss: "to be defective / penetrate", masdar: "خَلَل", pattern: "فَعَّ يَفُعُّ" , tr: "i", freq: 4, ilr: "2+"},
  "طقق": { bab: "mudaaf",  gloss: "to crack / snap", masdar: "طَقّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "ضبب": { bab: "mudaaf",  gloss: "to be foggy / misty", masdar: "ضَبَاب", pattern: "فَعَّ يَفُعُّ" , tr: "i", freq: 4, ilr: "2+"},
  "نزز": { bab: "mudaaf",  gloss: "to ooze / seep", masdar: "نَزّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "عكك": { bab: "mudaaf",  gloss: "to be sultry / humid", masdar: "عَكّ", pattern: "فَعَّ يَفُعُّ" , tr: "i", freq: 4, ilr: "2+"},
  "بطط": { bab: "mudaaf",  gloss: "to spread / flatten", masdar: "بَطّ", pattern: "فَعَّ يَفُعُّ" , tr: "b", freq: 4, ilr: "2+"},
  "حدد": { bab: "mudaaf",  gloss: "to limit / define / sharpen", masdar: "حَدّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "منن": { bab: "mudaaf",  gloss: "to bestow favor / remind of favor", masdar: "مَنّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "رجج": { bab: "mudaaf",  gloss: "to shake / tremble", masdar: "رَجّ", pattern: "فَعَّ يَفُعُّ" , tr: "b", freq: 4, ilr: "2+"},
  "فزز": { bab: "mudaaf",  gloss: "to startle / alarm", masdar: "فَزّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "قطط": { bab: "mudaaf",  gloss: "to cut / shear", masdar: "قَطّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "حكك": { bab: "mudaaf",  gloss: "to itch / rub", masdar: "حَكّ", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "رقق": { bab: "mudaaf",  gloss: "to be thin / make thin", masdar: "رِقَّة", pattern: "فَعَّ يَفُعُّ" , tr: "i", freq: 4, ilr: "2+"},
  "زلل": { bab: "mudaaf",  gloss: "to slip / err", masdar: "زَلَل", pattern: "فَعَّ يَفُعُّ" , tr: "i", freq: 4, ilr: "2+"},
  "خفف": { bab: "mudaaf",  gloss: "to lighten / be light", masdar: "خِفَّة", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "طنن": { bab: "mudaaf",  gloss: "to buzz / hum", masdar: "طَنِين", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
  "جمم": { bab: "mudaaf",  gloss: "to abound / grow luxuriant", masdar: "جُمُوم", pattern: "فَعَّ يَفُعُّ" , tr: "t", freq: 4, ilr: "2+"},
};

// ── ALIASES — normalised key → canonical VERBS key ─────────────────────────
//
// Only needed when normalisation collapses a character that:
//   (a) Carries semantic identity (hamza seat: أ/إ/آ → ا)
//   (b) Could collide with a different root in a large bank (ى → ي)
//
// Hamzated roots (أ → ا via ALEF_VARIANTS_RE):
//   Student types اخذ / أخذ → normalised "اخذ" → ALIASES["اخذ"] = "أخذ"
//   Student types سأل / سال → normalised "سال" → ALIASES["سال"] = "سأل"
//
// Defective-ya roots (ى → ي via ALEF_MAQSURA_RE):
//   Student types رمى / رمي → normalised "رمي" → ALIASES["رمي"] = "رمى"

const ALIASES: Readonly<Record<string, string>> = {
  // ── Hamzated initial (أ→ا) — existing ────────────────────────────────────
  "اخذ": "أخذ",   // أَخَذَ  initial hamza
  "اكل": "أكل",   // أَكَلَ  initial hamza
  "امر": "أمر",   // أَمَرَ  initial hamza
  // ── Hamzated initial (أ→ا) — new ─────────────────────────────────────────
  "اسر": "أسر",   // أَسَرَ  initial hamza
  "افل": "أفل",   // أَفَلَ  initial hamza (stars setting)
  "امن": "أمن",   // أَمِنَ  initial hamza (alima)
  "اسف": "أسف",   // أَسِفَ  initial hamza (alima)
  "اتي": "أتى",   // أَتَى   initial hamza + naqis-ya
  "ابي": "أبى",   // أَبَى   initial hamza + naqis-ya
  // ── Hamzated medial (أ→ا) — existing ─────────────────────────────────────
  "سال": "سأل",   // سَأَلَ  medial hamza  (would collide with سَالَ "to flow" if added)
  // ── Hamzated medial (أ→ا) — new ──────────────────────────────────────────
  "راس": "رأس",   // رَأَسَ  medial hamza
  // ── Hamzated medial + defective (أ→ا, ى→ي) ────────────────────────────────
  "راي": "رأى",   // رَأَى  medial hamza + defective-ya
  // ── Hamzated final (أ→ا) — existing ──────────────────────────────────────
  "قرا": "قرأ",   // قَرَأَ  final hamza
  "بدا": "بدأ",   // بَدَأَ  final hamza
  "ملا": "ملأ",   // مَلَأَ  final hamza
  // ── Hamzated final (أ→ا) — new ────────────────────────────────────────────
  "نشا": "نشأ",   // نَشَأَ  final hamza
  "لجا": "لجأ",   // لَجَأَ  final hamza
  "جرا": "جرأ",   // جَرَأَ  final hamza
  "هدا": "هدأ",   // هَدَأَ  final hamza
  "دفا": "دفأ",   // دَفِئَ  final hamza (alima)

  // ── Defective-ya (ى→ي) — existing ────────────────────────────────────────
  "رمي": "رمى",   // رَمَى
  "مشي": "مشى",   // مَشَى
  "سعي": "سعى",   // سَعَى
  "حمي": "حمى",   // حَمَى
  "جري": "جرى",   // جَرَى
  "بقي": "بقى",   // بَقَى
  "لقي": "لقى",   // لَقَى
  "نسي": "نسى",   // نَسَى
  "بكي": "بكى",   // بَكَى
  "وقي": "وقى",   // وَقَى  (mithal + defective)
  // ── Defective-ya (ى→ي) — new ─────────────────────────────────────────────
  "هدي": "هدى",   // هَدَى
  "قضي": "قضى",   // قَضَى
  "حكي": "حكى",   // حَكَى
  "رعي": "رعى",   // رَعَى
  "بغي": "بغى",   // بَغَى
  "عمي": "عمى",   // عَمِيَ  (also alima-pattern)
  "لهي": "لهى",   // لَهِيَ
  "بني": "بنى",   // بَنَى
  "شفي": "شفى",   // شَفَى
  "طغي": "طغى",   // طَغَى
  "نعي": "نعى",   // نَعَى
  "نهي": "نهى",   // نَهَى
  "طلي": "طلى",   // طَلَى
  "عصي": "عصى",   // عَصَى
  "مضي": "مضى",   // مَضَى
  "خشي": "خشى",   // خَشِيَ  (alima + defective)
  // "ابي" → "أبى"  already covered in the hamzated-initial section above

  // ── Mudaaf (doubled) — 2-char contracted input → 3-char canonical key ────
  //  classifyRoot always expands doubled verbs to R1+R2+R3 (e.g. رد→ردد).
  //  These aliases ensure that if a user types the 2-char contracted form
  //  directly (bypassing classifyRoot), the lexicon still resolves correctly.
  "رد": "ردد",  "مد": "مدد",  "جر": "جرر",  "شد": "شدد",
  "عض": "عضض",  "هم": "همم",  "دل": "دلل",  "حل": "حلل",
  "ظن": "ظنن",  "ضم": "ضمم",  "لف": "لفف",  "صف": "صفف",
  "عد": "عدد",  "سر": "سرر",  "بر": "برر",  "سن": "سنن",
  "قص": "قصص",  "نص": "نصص",  "بث": "بثث",  "صب": "صبب",
  "زف": "زفف",  "ذر": "ذرر",  "مس": "مسس",  "سل": "سلل",
  "كف": "كفف",  "دق": "دقق",  "حط": "حطط",  "غض": "غضض",
  "حث": "حثث",  "بل": "بلل",  "دب": "دبب",  "شق": "شقق",
  "جف": "جفف",  "حف": "حفف",  "رص": "رصص",  "ضج": "ضجج",
  "بز": "بزز",  "حض": "حضض",

  // ── Phase 4 expansion aliases ──────────────────────────────────────────
  "اثر": "أثر",
  "اذن": "أذن",
  "اجر": "أجر",
  "الف": "ألف",
  "امل": "أمل",
  "ابق": "أبق",
  "ادب": "أدب",
  "ازف": "أزف",
  "افق": "أفق",
  "ابد": "أبد",
  "راف": "رأف",
  "جار": "جأر",
  "زار": "زأر",
  "ثار": "ثأر",
  "بطا": "بطأ",
  "وضا": "وضأ",
  "خطا": "خطأ",
  "رفا": "رفأ",
  "ابر": "أبر",
  "اثث": "أثث",
  "انب": "أنب",
  "اهل": "أهل",
  "ارب": "أرب",
  "افك": "أفك",
  "جزا": "جزأ",
  "هزا": "هزأ",
  "ردا": "ردأ",
  "خبا": "خبأ",
  "فجا": "فجأ",
  "دنا": "دنأ",
  "ازم": "أزم",
  "اسس": "أسس",
  "ابح": "أبح",
  "انس": "أنس",
  "ارق": "أرق",
  "الم": "ألم",
  "انف": "أنف",
  "سام": "سأم",
  "وشي": "وشى",
  "وعي": "وعى",
  "وصي": "وصى",
  "وفي": "وفى",
  "صلي": "صلى",
  "فدي": "فدى",
  "سقي": "سقى",
  "اوي": "أوى",
  "كوي": "كوى",
  "هوي": "هوى",
  "ثني": "ثنى",
  "حوي": "حوى",
  "روي": "روى",
  "طوي": "طوى",
  "غوي": "غوى",
  "زكي": "زكى",
  "عري": "عرى",
  "غني": "غنى",
  "جني": "جنى",
  "كفي": "كفى",
  "خفي": "خفى",
  "اذي": "أذى",
  "سري": "سرى",
  "نوي": "نوى",
  "شوي": "شوى",
  "قوي": "قوى",
  "عوي": "عوى",
  "لوي": "لوى",
  "خلي": "خلى",
  "غلي": "غلى",
  "حني": "حنى",
  "كني": "كنى",
  "عني": "عنى",
  "سمي": "سمى",
  "مر": "مرر",
  "خط": "خطط",
  "فك": "فكك",
  "حق": "حقق",
  "عم": "عمم",
  "خص": "خصص",
  "بت": "بتت",
  "جل": "جلل",
  "هز": "هزز",
  "فر": "فرر",
  "غل": "غلل",
  "نق": "نقق",
  "رن": "رنن",
  "حج": "حجج",
  "عز": "عزز",
  "قر": "قرر",
  "ضل": "ضلل",
  "جن": "جنن",
  "مل": "ملل",
  "حر": "حرر",
  "ذل": "ذلل",
  "صح": "صحح",
  "ضر": "ضرر",
  "فت": "فتت",
  "غش": "غشش",
  "حس": "حسس",
  "هب": "هبب",
  "نم": "نمم",
  "حب": "حبب",
  "كر": "كرر",
  "شح": "شحح",
  "لم": "لمم",
  "شك": "شكك",
  "زم": "زمم",
  "خل": "خلل",
  "طق": "طقق",
  "ضب": "ضبب",
  "نز": "نزز",
  "عك": "عكك",
  "بط": "بطط",
  "حد": "حدد",
  "من": "منن",
  "رج": "رجج",
  "فز": "فزز",
  "قط": "قطط",
  "حك": "حكك",
  "رق": "رقق",
  "زل": "زلل",
  "خف": "خفف",
  "طن": "طنن",
  "جم": "جمم",};

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Look up a Form I Arabic verb in the Rootify lexicon bank.
 *
 * Lookup flow:
 *   1. normalizeInput(input)  →  normalised key
 *   2. ALIASES[key] ?? key   →  canonical VERBS key
 *   3. VERBS[canonical]      →  raw entry (null if not found)
 *   4. Derive vowels / rootType → return Form1LexEntry
 *
 * @param input  Arabic verb — diacritised or bare; any alef variant accepted.
 * @returns Form1LexEntry (authoritative, fallback must be skipped) or null.
 */
export function getFormILexiconEntry(input: string): Form1LexEntry | null {
  if (!input) return null;
  const normalized = normalizeInput(input);
  if (!normalized) return null;

  // Step 1 — resolve alias (hamzated / defective-ya) to canonical key
  const canonicalKey = ALIASES[normalized] ?? normalized;

  // Step 2 — look up canonical entry
  const raw = VERBS[canonicalKey];
  if (!raw) return null;

  // Step 3 — derive vowels and RootType
  const vowels = BAB_VOWELS[raw.bab] ?? { pastVowel: "a", presentVowel: "a" };

  // forceType takes priority (hamzated verbs misclassified by classifyRoot);
  // BAB_ROOT_TYPE covers irregular bab types (mithal, jawwaf-*, naqis-*, mudaaf);
  // null → leave classifyRoot's type unchanged (all six regular abwāb).
  const rootType: RootType | null =
    raw.forceType !== undefined
      ? raw.forceType
      : (BAB_ROOT_TYPE[raw.bab] ?? null);

  const masdars: MasdarEntry[] = raw.masdar
    ? (Array.isArray(raw.masdar) ? raw.masdar : [raw.masdar]).map((m, i) => ({
        form: m,
        status: "attested" as const,
        common: i === 0,
      }))
    : [];

  return {
    pastVowel:    vowels.pastVowel,
    presentVowel: vowels.presentVowel,
    gloss:        raw.gloss,
    bab:          raw.bab,
    pattern:      raw.pattern,
    masdars,
    rootType,
    canonicalKey,
    r1: raw.r1,
    r2: raw.r2,
    r3: raw.r3,
    contractR2: raw.contractR2,
    transitivity: raw.tr,
    frequency_tier: raw.freq,
    teaching_level: raw.ilr,
  };
}

/** Fast boolean guard — is this verb in the Form I lexicon? */
export function hasForm1Entry(input: string): boolean {
  return getFormILexiconEntry(input) !== null;
}

/** Number of canonical verb entries. */
export function lexiconSize(): number {
  return Object.keys(VERBS).length;
}

/** Number of alias mappings. */
export function aliasCount(): number {
  return Object.keys(ALIASES).length;
}

// ── Present-form (imperfect) reverse index ──────────────────────────────────
//
// Maps the normalised 3ms present form (يَفْعُلُ stripped of diacritics)
// to the canonical VERBS key so that a student typing يكتب resolves to كتب.
//
// Generation rules per verb type:
//   regular:     ي + r1 + r2 + r3      (يكتب)
//   mithal:      ي + r2 + r3            (يعد  — r1=و drops)
//   jawwaf-waw:  ي + r1 + و + r3       (يقول)
//   jawwaf-ya:   ي + r1 + ي + r3       (يبيع)
//   naqis-waw:   ي + r1 + r2 + و       (يدعو)
//   naqis-ya:    ي + r1 + r2 + ي       (يرمي)
//   mudaaf:      ي + r1 + r2            (يرد  — contracted)

let _presentIndex: Map<string, string> | null = null;

function buildPresentIndex(): Map<string, string> {
  const idx = new Map<string, string>();

  for (const [key, entry] of Object.entries(VERBS)) {
    const r1 = entry.r1 || key[0];
    const r2 = entry.r2 || (key.length >= 2 ? key[1] : "");
    const r3 = entry.r3 || (key.length >= 3 ? key[2] : "");

    let stem: string;
    switch (entry.bab) {
      case "mithal":
        stem = r2 + r3;
        break;
      case "jawwaf-waw":
        stem = r1 + "\u0648" + r3;
        break;
      case "jawwaf-ya":
        stem = r1 + "\u064A" + r3;
        break;
      case "naqis-waw":
        stem = r1 + r2 + "\u0648";
        break;
      case "naqis-ya":
        stem = r1 + r2 + "\u064A";
        break;
      case "mudaaf":
        stem = r1 + r2;
        break;
      default:
        stem = r1 + r2 + r3;
        break;
    }

    const yaForm = normalizeInput("\u064A" + stem);
    if (!idx.has(yaForm)) {
      idx.set(yaForm, key);
    }

    if (entry.bab === "jawwaf-waw" || entry.bab === "jawwaf-ya") {
      const alefStem = r1 + "\u0627" + r3;
      const yaAlef = normalizeInput("\u064A" + alefStem);
      if (!idx.has(yaAlef)) {
        idx.set(yaAlef, key);
      }
    }
  }

  return idx;
}

function getPresentIndex(): Map<string, string> {
  if (!_presentIndex) _presentIndex = buildPresentIndex();
  return _presentIndex;
}

/**
 * Resolve a present-tense (imperfect) Form I input to a canonical lexicon entry.
 *
 * If the input starts with an imperfect prefix (ي ت أ/ا ن), the prefix is
 * swapped to ي and the result is looked up in the present-form index.
 * On a hit the full Form1LexEntry is returned; on a miss returns null
 * so the caller can fall through to the existing flow.
 */
export function getFormIByPresentForm(input: string): Form1LexEntry | null {
  if (!input) return null;
  const n = normalizeInput(input);
  if (n.length < 3) return null;

  const first = n[0];
  if (
    first !== "\u064A" &&
    first !== "\u062A" &&
    first !== "\u0627" &&
    first !== "\u0646"
  ) {
    return null;
  }

  const yaForm = "\u064A" + n.slice(1);
  const canonicalKey = getPresentIndex().get(yaForm);
  if (!canonicalKey) return null;

  return getFormILexiconEntry(canonicalKey);
}

/** Number of present-form index entries. */
export function presentIndexSize(): number {
  return getPresentIndex().size;
}

// ── Unified inflection resolver ──────────────────────────────────────────────
//
// Tries all inflection resolvers in order (base present → conjugated present
// → conjugated past) and returns both the lexicon entry and an Arabic
// grammatical label describing the detected form.

export interface InflectionResult {
  entry: Form1LexEntry;
  label: string;
}

export function resolveInflectedForm(input: string): InflectionResult | null {
  if (!input) return null;
  const n = normalizeInput(input);

  const basePresent = getFormIByPresentForm(input);
  if (basePresent) {
    const first = n[0];
    let label: string;
    if      (first === "\u064A") label = "\u0645\u0636\u0627\u0631\u0639 \u063A\u0627\u0626\u0628 \u0645\u0641\u0631\u062F";
    else if (first === "\u062A") label = "\u0645\u0636\u0627\u0631\u0639 \u0645\u062E\u0627\u0637\u0628";
    else if (first === "\u0627") label = "\u0645\u0636\u0627\u0631\u0639 \u0645\u062A\u0643\u0644\u0645";
    else if (first === "\u0646") label = "\u0645\u0636\u0627\u0631\u0639 \u062C\u0645\u0639 \u0627\u0644\u0645\u062A\u0643\u0644\u0645\u064A\u0646";
    else label = "\u0645\u0636\u0627\u0631\u0639";
    return { entry: basePresent, label };
  }

  const conjPresent = getFormIByPresentConjugated(input);
  if (conjPresent) {
    let label = "\u0645\u0636\u0627\u0631\u0639";
    if      (n.endsWith("\u0648\u0646")) label = "\u0645\u0636\u0627\u0631\u0639 \u062C\u0645\u0639 \u0645\u0630\u0643\u0631";
    else if (n.endsWith("\u064A\u0646")) label = "\u0645\u0636\u0627\u0631\u0639 \u0645\u062E\u0627\u0637\u0628\u0629 \u0645\u0641\u0631\u062F";
    else if (n.endsWith("\u0627\u0646")) label = "\u0645\u0636\u0627\u0631\u0639 \u0645\u062B\u0646\u0649";
    else if (n.endsWith("\u0646"))       label = "\u0645\u0636\u0627\u0631\u0639 \u062C\u0645\u0639 \u0645\u0624\u0646\u062B";
    return { entry: conjPresent, label };
  }

  const conjPast = getFormIByPastConjugated(input);
  if (conjPast) {
    let label = "\u0645\u0627\u0636\u064D";
    if      (n.endsWith("\u062A\u0645")) label = "\u0645\u0627\u0636\u064D \u062C\u0645\u0639 \u0645\u062E\u0627\u0637\u0628\u064A\u0646";
    else if (n.endsWith("\u062A\u0646")) label = "\u0645\u0627\u0636\u064D \u062C\u0645\u0639 \u0645\u062E\u0627\u0637\u0628\u0627\u062A";
    else if (n.endsWith("\u0646\u0627")) label = "\u0645\u0627\u0636\u064D \u062C\u0645\u0639 \u0627\u0644\u0645\u062A\u0643\u0644\u0645\u064A\u0646";
    else if (n.endsWith("\u0648\u0627")) label = "\u0645\u0627\u0636\u064D \u062C\u0645\u0639 \u0645\u0630\u0643\u0631";
    else if (n.endsWith("\u062A"))       label = "\u0645\u0627\u0636\u064D \u0645\u0641\u0631\u062F \u0645\u0624\u0646\u062B";
    else if (n.endsWith("\u0646"))       label = "\u0645\u0627\u0636\u064D \u062C\u0645\u0639 \u0645\u0624\u0646\u062B";
    return { entry: conjPast, label };
  }

  const basePast = getFormILexiconEntry(input);
  if (!basePast) {
    const masdarHit = getFormIByMasdar(input);
    if (masdarHit) {
      return { entry: masdarHit, label: "\u0645\u0635\u062F\u0631" };
    }
  }

  return null;
}

// ── Masdar-to-verb index ─────────────────────────────────────────────────────
//
// Maps diacritics-stripped masdars → canonical VERBS key.
// Only lexicon-backed, well-attested Form I masdars are included to avoid
// false positives with ordinary nouns.
//
// Keys are normalised (diacritics stripped, alef variants → ا, ى → ي).

const MASDAR_INDEX: Readonly<Record<string, string>> = {
  "\u0643\u062A\u0627\u0628\u0629": "\u0643\u062A\u0628",
  "\u062F\u062E\u0648\u0644": "\u062F\u062E\u0644",
  "\u062C\u0644\u0648\u0633": "\u062C\u0644\u0633",
  "\u0648\u0635\u0648\u0644": "\u0648\u0635\u0644",
  "\u0648\u0642\u0648\u0641": "\u0648\u0642\u0641",
  "\u0642\u0631\u0627\u0621\u0629": "\u0642\u0631\u0623",
  "\u0633\u0624\u0627\u0644": "\u0633\u0623\u0644",
  "\u0633\u0648\u0627\u0644": "\u0633\u0623\u0644",
  "\u0630\u0647\u0627\u0628": "\u0630\u0647\u0628",
  "\u0642\u0648\u0644": "\u0642\u0627\u0644",
  "\u0632\u064A\u0627\u0631\u0629": "\u0632\u0627\u0631",
  "\u0642\u064A\u0627\u0645": "\u0642\u0627\u0645",
  "\u0628\u064A\u0639": "\u0628\u0627\u0639",
  "\u062F\u0639\u0627\u0621": "\u062F\u0639\u0627",
  "\u062F\u0639\u0648\u0629": "\u062F\u0639\u0627",
  "\u0631\u0645\u064A": "\u0631\u0645\u0649",
  "\u062D\u0645\u0627\u064A\u0629": "\u062D\u0645\u0649",
  "\u0633\u0639\u064A": "\u0633\u0639\u0649",
  "\u0645\u0634\u064A": "\u0645\u0634\u0649",
  "\u0633\u0645\u0627\u0639": "\u0633\u0645\u0639",
  "\u0631\u0643\u0648\u0628": "\u0631\u0643\u0628",
  "\u0646\u0632\u0648\u0644": "\u0646\u0632\u0644",
  "\u0631\u062C\u0648\u0639": "\u0631\u062C\u0639",
  "\u063A\u0641\u0631\u0627\u0646": "\u063A\u0641\u0631",
  "\u062E\u062F\u0645\u0629": "\u062E\u062F\u0645",
  "\u0635\u0646\u0627\u0639\u0629": "\u0635\u0646\u0639",
  "\u062F\u0631\u0627\u0633\u0629": "\u062F\u0631\u0633",
  "\u062D\u0636\u0648\u0631": "\u062D\u0636\u0631",
  "\u0639\u064A\u0634": "\u0639\u0627\u0634",
  "\u0637\u064A\u0631\u0627\u0646": "\u0637\u0627\u0631",
  "\u0633\u064A\u0631": "\u0633\u0627\u0631",
  "\u062E\u0648\u0641": "\u062E\u0627\u0641",
  "\u0645\u0648\u062A": "\u0645\u0627\u062A",
  "\u062A\u0648\u0628\u0629": "\u062A\u0627\u0628",
  "\u0639\u0648\u062F\u0629": "\u0639\u0627\u062F",
  "\u0632\u064A\u0627\u062F\u0629": "\u0632\u0627\u062F",
  "\u0628\u0643\u0627\u0621": "\u0628\u0643\u0649",
  "\u0647\u062F\u0627\u064A\u0629": "\u0647\u062F\u0649",
  "\u0642\u0636\u0627\u0621": "\u0642\u0636\u0649",
  "\u0628\u0646\u0627\u0621": "\u0628\u0646\u0649",
  "\u0634\u0641\u0627\u0621": "\u0634\u0641\u0649",
  "\u0646\u0633\u064A\u0627\u0646": "\u0646\u0633\u0649",
  "\u062C\u0631\u064A": "\u062C\u0631\u0649",
  "\u0628\u0642\u0627\u0621": "\u0628\u0642\u0649",
};

/**
 * Resolve a masdar (verbal noun) to its canonical Form I lexicon entry.
 *
 * Uses only the hand-curated MASDAR_INDEX to avoid false positives.
 * The input is normalised before lookup (diacritics stripped, alef/maqsura normalised).
 */
export function getFormIByMasdar(input: string): Form1LexEntry | null {
  if (!input) return null;
  const n = normalizeInput(input);
  const canonical = MASDAR_INDEX[n];
  if (!canonical) return null;
  return getFormILexiconEntry(canonical);
}

// ── Conjugated present-form suffix stripping ─────────────────────────────────
//
// Handles imperfect forms with conjugation suffixes such as يكتبون, تكتبين,
// يرمون, يدعون.  Strips the suffix, then routes through getFormIByPresentForm.
//
// Suffixes (longest first):
//   ون  3mp/2mp    ين  2fs    ان  dual    ن  3fp/2fp

const PRESENT_SUFFIXES = ["\u0648\u0646", "\u064A\u0646", "\u0627\u0646", "\u0646"] as const;

/**
 * Resolve a conjugated present-tense Form I input to a canonical lexicon entry.
 *
 * Strips imperfect suffixes and delegates to getFormIByPresentForm.
 * For 3-char stems (prefix + 2 consonants — defective verbs where the final
 * radical drops before the suffix), also tries appending ي and و.
 */
export function getFormIByPresentConjugated(input: string): Form1LexEntry | null {
  if (!input) return null;
  const n = normalizeInput(input);
  if (n.length < 4) return null;

  for (const sfx of PRESENT_SUFFIXES) {
    if (!n.endsWith(sfx)) continue;
    const stem = n.slice(0, n.length - sfx.length);
    if (stem.length < 3) continue;

    if (stem.length === 3) {
      const hitYa = getFormIByPresentForm(stem + "\u064A");
      if (hitYa) return hitYa;
      const hitWaw = getFormIByPresentForm(stem + "\u0648");
      if (hitWaw) return hitWaw;
    }

    const hit = getFormIByPresentForm(stem);
    if (hit) return hit;
  }

  return null;
}

// ── Conjugated past-form suffix stripping ───────────────────────────────────
//
// Detects common past-tense conjugation suffixes and strips them to recover
// the canonical base form for lexicon lookup.
//
// Suffixes (longest first to avoid partial matches):
//   تم  2mp    تن  2fp    نا  1p    وا  3mp
//   ت   3fs/2ms/1s (after diacritic stripping)    ن   3fp

const PAST_SUFFIXES = ["\u062A\u0645", "\u062A\u0646", "\u0646\u0627", "\u0648\u0627", "\u062A", "\u0646"] as const;

/**
 * Resolve a conjugated past-tense Form I input to a canonical lexicon entry.
 *
 * Tries each known suffix; for each, strips it and attempts exact lexicon
 * lookup on the remaining stem.  For 2-char stems (defective / doubled),
 * also tries appending ي (for naqis-ya via alias) and ا (for naqis-waw).
 *
 * Returns the matched Form1LexEntry or null to fall through.
 */
export function getFormIByPastConjugated(input: string): Form1LexEntry | null {
  if (!input) return null;
  const n = normalizeInput(input);
  if (n.length < 3) return null;

  for (const sfx of PAST_SUFFIXES) {
    if (!n.endsWith(sfx)) continue;
    const stem = n.slice(0, n.length - sfx.length);
    if (stem.length < 2) continue;

    const hit = getFormILexiconEntry(stem);
    if (hit) return hit;

    if (stem.length === 2) {
      const hitYa = getFormILexiconEntry(stem + "\u064A");
      if (hitYa) return hitYa;
      const hitAlef = getFormILexiconEntry(stem + "\u0627");
      if (hitAlef) return hitAlef;
    }
  }

  return null;
}

export interface SuggestionEntry {
  ar: string;
  gloss: string;
  type: "verb" | "masdar" | "noun";
  freq: number;
  status: "attested" | "rule-based";
  root: string;
  hint?: string;
}

let _suggestionCache: SuggestionEntry[] | null = null;

function buildActiveParticiple(root: string): string | null {
  const r = root.replace(/[\u064B-\u065F\u0670]/g, "");
  if (r.length !== 3) return null;
  const v = VERBS[root];
  if (!v) return null;
  const bab = v.bab;
  if (bab === "jawwaf-waw" || bab === "jawwaf-ya") return r[0] + "\u0627" + "\u0626" + r[2];
  if (bab === "naqis-waw" || bab === "naqis-ya") return r[0] + "\u0627" + r[1] + "\u0650" + "\u064A";
  return r[0] + "\u0627" + r[1] + "\u0650" + r[2];
}

function buildPassiveParticiple(root: string): string | null {
  const r = root.replace(/[\u064B-\u065F\u0670]/g, "");
  if (r.length !== 3) return null;
  return "\u0645" + r[0] + r[1] + "\u0648" + r[2];
}

function buildPlaceNoun(root: string): string | null {
  const r = root.replace(/[\u064B-\u065F\u0670]/g, "");
  if (r.length !== 3) return null;
  return "\u0645" + r[0] + r[1] + r[2];
}

export function getSuggestionEntries(): SuggestionEntry[] {
  if (_suggestionCache) return _suggestionCache;
  const entries: SuggestionEntry[] = [];
  const seen = new Set<string>();

  for (const [key, v] of Object.entries(VERBS)) {
    entries.push({
      ar: key,
      gloss: v.gloss,
      type: "verb",
      freq: v.freq ?? 4,
      status: "attested",
      root: key,
    });
    seen.add(key);

    if (v.masdar) {
      const ms = Array.isArray(v.masdar) ? v.masdar : [v.masdar];
      for (const m of ms) {
        const stripped = m.replace(/[\u064B-\u065F\u0670]/g, "");
        if (!seen.has(stripped)) {
          seen.add(stripped);
          entries.push({
            ar: m,
            gloss: v.gloss,
            type: "masdar",
            freq: v.freq ?? 4,
            status: "attested",
            root: key,
          });
        }
      }
    }

    const ap = buildActiveParticiple(key);
    if (ap) {
      const apStrip = ap.replace(/[\u064B-\u065F\u0670]/g, "");
      if (!seen.has(apStrip)) {
        seen.add(apStrip);
        entries.push({
          ar: ap,
          gloss: v.gloss,
          type: "noun",
          freq: (v.freq ?? 4) + 1,
          status: "rule-based",
          root: key,
          hint: "\u0627\u0633\u0645 \u0641\u0627\u0639\u0644",
        });
      }
    }

    const pp = buildPassiveParticiple(key);
    if (pp) {
      const ppStrip = pp.replace(/[\u064B-\u065F\u0670]/g, "");
      if (!seen.has(ppStrip)) {
        seen.add(ppStrip);
        entries.push({
          ar: pp,
          gloss: v.gloss,
          type: "noun",
          freq: (v.freq ?? 4) + 1,
          status: "rule-based",
          root: key,
          hint: "\u0627\u0633\u0645 \u0645\u0641\u0639\u0648\u0644",
        });
      }
    }

    if (v.freq !== undefined && v.freq <= 2) {
      const pn = buildPlaceNoun(key);
      if (pn) {
        const pnStrip = pn.replace(/[\u064B-\u065F\u0670]/g, "");
        if (!seen.has(pnStrip)) {
          seen.add(pnStrip);
          entries.push({
            ar: pn,
            gloss: v.gloss,
            type: "noun",
            freq: (v.freq ?? 4) + 2,
            status: "rule-based",
            root: key,
            hint: "\u0627\u0633\u0645 \u0645\u0643\u0627\u0646",
          });
        }
      }
    }
  }

  entries.sort((a, b) => a.freq - b.freq);
  _suggestionCache = entries;
  return entries;
}

let _normalizedIndex: Map<string, SuggestionEntry[]> | null = null;

function getNormalizedIndex(): Map<string, SuggestionEntry[]> {
  if (_normalizedIndex) return _normalizedIndex;
  _normalizedIndex = new Map();
  for (const e of getSuggestionEntries()) {
    const nk = normalizeInput(e.ar);
    const arr = _normalizedIndex.get(nk) || [];
    arr.push(e);
    _normalizedIndex.set(nk, arr);
  }
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (!_normalizedIndex.has(alias)) {
      const canonEntries = _normalizedIndex.get(normalizeInput(canonical));
      if (canonEntries) {
        _normalizedIndex.set(alias, canonEntries);
      }
    }
  }
  return _normalizedIndex;
}

function detectInputIntent(q: string): { preferType: "verb" | "masdar" | "noun" | null; hint: string } {
  if (q.startsWith("\u0627\u0633\u062A") || q.startsWith("است")) {
    return { preferType: "verb", hint: "\u0628\u062D\u062B \u0628\u0627\u0628 \u0627\u0633\u062A\u0641\u0639\u0644" };
  }
  if (q.startsWith("\u062A") && q.length >= 2) {
    return { preferType: "masdar", hint: "\u0628\u062D\u062B \u0628\u0627\u0628 \u062A\u0641\u0639\u0651\u0644 / \u062A\u0641\u0627\u0639\u0644" };
  }
  if (q.startsWith("\u0645") && q.length >= 2) {
    return { preferType: "noun", hint: "\u0628\u062D\u062B \u0627\u0633\u0645 \u0645\u0643\u0627\u0646 / \u0645\u0641\u0639\u0648\u0644" };
  }

  const idx = getNormalizedIndex();
  const exact = idx.get(q);
  if (exact) {
    const hasMasdar = exact.some(e => e.type === "masdar");
    const hasVerb = exact.some(e => e.type === "verb");
    const hasNoun = exact.some(e => e.type === "noun");
    if (hasMasdar && !hasVerb) return { preferType: "masdar", hint: "\u0645\u0637\u0627\u0628\u0642\u0629 \u0645\u0635\u062F\u0631" };
    if (hasNoun && !hasVerb && !hasMasdar) return { preferType: "noun", hint: "\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0633\u0645" };
    if (hasVerb) return { preferType: "verb", hint: "\u0645\u0637\u0627\u0628\u0642\u0629 \u0641\u0639\u0644" };
  }

  return { preferType: null, hint: "" };
}

function expandWeakInput(q: string, idx: Map<string, SuggestionEntry[]>): SuggestionEntry[] {
  if (q.length !== 2) return [];
  const extras: SuggestionEntry[] = [];
  const seen = new Set<string>();

  const weakExpansions = [
    q[0] + "\u0627" + q[1],
    q[0] + "\u0648" + q[1],
    q[0] + "\u064A" + q[1],
    q[0] + q[1] + "\u0627",
    q[0] + q[1] + "\u0649",
    q[0] + q[1] + "\u064A",
    q[0] + q[1] + "\u0648",
  ];

  for (const expanded of weakExpansions) {
    const norm = normalizeInput(expanded);
    const found = idx.get(norm);
    if (found) {
      for (const e of found) {
        const key = e.type + "|" + e.ar + "|" + e.root;
        if (!seen.has(key)) {
          seen.add(key);
          extras.push(e);
        }
      }
    }
  }
  return extras;
}

export function searchSuggestions(query: string, limit = 10): SuggestionEntry[] {
  if (!query || query.trim().length === 0) return [];
  const q = normalizeInput(query);
  if (q.length === 0) return [];

  const idx = getNormalizedIndex();
  const results: { entry: SuggestionEntry; score: number }[] = [];
  const seen = new Set<string>();
  const intent = detectInputIntent(q);

  function dedup(e: SuggestionEntry): string {
    return e.type + "|" + e.ar + "|" + e.root;
  }

  function intentBonus(e: SuggestionEntry): number {
    if (intent.preferType && e.type === intent.preferType) return 15;
    if (intent.preferType && e.type !== intent.preferType) return -5;
    return 0;
  }

  function attestedBonus(e: SuggestionEntry): number {
    return e.status === "attested" ? 3 : 0;
  }

  const exact = idx.get(q);
  if (exact) {
    for (const e of exact) {
      const key = dedup(e);
      if (!seen.has(key)) {
        seen.add(key);
        const hintedEntry = (intent.hint && !e.hint) ? { ...e, hint: intent.hint } : e;
        results.push({ entry: hintedEntry, score: 100 - e.freq + intentBonus(e) + attestedBonus(e) });
      }
    }
  }

  if (q.length === 2) {
    const weakEntries = expandWeakInput(q, idx);
    for (const e of weakEntries) {
      const key = dedup(e);
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ entry: e, score: 90 - e.freq + intentBonus(e) + attestedBonus(e) });
      }
    }
  }

  for (const [nk, entries] of idx) {
    if (nk === q) continue;
    if (nk.startsWith(q)) {
      for (const e of entries) {
        const key = dedup(e);
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ entry: e, score: 50 - e.freq + intentBonus(e) + attestedBonus(e) + (e.type === "verb" ? 5 : 0) });
        }
      }
    }
  }

  if (results.length < limit && q.length >= 2) {
    for (const [nk, entries] of idx) {
      if (nk.startsWith(q)) continue;
      if (nk.includes(q)) {
        for (const e of entries) {
          const key = dedup(e);
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ entry: e, score: 20 - e.freq + intentBonus(e) + attestedBonus(e) + (e.type === "verb" ? 3 : 0) });
          }
        }
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  const final = results.slice(0, limit).map(r => r.entry);

  if (intent.hint && final.length > 0 && !final[0].hint) {
    final[0] = { ...final[0], hint: intent.hint };
  }

  return final;
}

export interface GlossEntry {
  root: string;
  form: number;
  gloss: string;
  tr: string;
  freq: number;
  ilr: string;
}

export function getAllFormIGlosses(): GlossEntry[] {
  return Object.entries(VERBS).map(([key, v]) => ({
    root: key,
    form: 1,
    gloss: v.gloss,
    tr: v.tr || "t",
    freq: v.freq || 4,
    ilr: v.ilr || "3",
  }));
}
