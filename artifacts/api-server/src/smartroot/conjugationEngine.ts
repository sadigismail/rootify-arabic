import {
  PRONOUNS,
  PAST_PATTERNS_REGULAR,
  PRESENT_PATTERNS_REGULAR,
} from "./patternLibrary.js";
import { getIrregularPast, getIrregularPresent } from "./irregularRules.js";
import type { RootType } from "./rootClassifier.js";

const FATHA  = "\u064E";
const KASRA  = "\u0650";
const DAMMA  = "\u064F";
const SUKUN  = "\u0652";
const SHADDA = "\u0651";
const ALEF   = "\u0627";
const WAW    = "\u0648";
const YA     = "\u064A";

export interface ConjugationRow {
  pronoun: string;
  pronounLabel: string;
  form: string;
}

export interface ConjugationTable {
  past: ConjugationRow[];
  present: ConjugationRow[];
  future: ConjugationRow[];
  imperative: ConjugationRow[];
}

// ── Regular past ─────────────────────────────────────────────────

function buildRegularPast(
  r1: string,
  r2: string,
  r3: string,
  pastVowelChar: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pronoun of PRONOUNS) {
    const pat = PAST_PATTERNS_REGULAR[pronoun.id]!;
    result[pronoun.id] =
      pat.prefix +
      r1 + pat.vowelR1 +
      r2 + pastVowelChar +
      r3 +
      pat.suffix;
  }
  return result;
}

// ── Assimilated present (R1=و drops) ─────────────────────────────

function buildAssimilatedPresent(
  _r1: string,
  r2: string,
  r3: string,
  presentVowelChar: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pronoun of PRONOUNS) {
    const pat = PRESENT_PATTERNS_REGULAR[pronoun.id]!;
    result[pronoun.id] = pat.prefix + r2 + presentVowelChar + r3 + pat.suffix;
  }
  return result;
}

// ── Regular present ───────────────────────────────────────────────

function buildRegularPresent(
  r1: string,
  r2: string,
  r3: string,
  presentVowelChar: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pronoun of PRONOUNS) {
    const pat = PRESENT_PATTERNS_REGULAR[pronoun.id]!;
    result[pronoun.id] =
      pat.prefix +
      r1 + pat.vowelR1 +
      r2 + presentVowelChar +
      r3 +
      pat.suffix;
  }
  return result;
}

// ── Future (سَ + present) ─────────────────────────────────────────

function buildFuture(presentTable: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pronoun of PRONOUNS) {
    result[pronoun.id] = "سَ" + presentTable[pronoun.id];
  }
  return result;
}

// ── Imperative ────────────────────────────────────────────────────
// Derived from the jussive (مجزوم) stem:
//   2ms → sukun (ْ), 2fs → ī, 2md → ā, 2mp → ūwā (silent alef), 2fp → ْنَ
// Connecting hamza (alef wasl) added when the stem begins with sukun.

const IMPERATIVE_PRONOUNS = new Set(["2ms", "2fs", "2md", "2mp", "2fp"]);

// Regular imperative
// hamza: damma-present → اُ, otherwise → اِ
function regularImperative(
  r1: string,
  r2: string,
  r3: string,
  presentVowelChar: string,
): Record<string, string> {
  const hamza = presentVowelChar === DAMMA ? "اُ" : "اِ";
  const stem  = r1 + SUKUN + r2 + presentVowelChar + r3;
  return {
    "2ms": hamza + stem + SUKUN,
    "2fs": hamza + stem + KASRA + YA,
    "2md": hamza + stem + FATHA + ALEF,
    "2mp": hamza + stem + DAMMA + WAW + ALEF,
    "2fp": hamza + stem + SUKUN + "نَ",
  };
}

// Assimilated imperative: R1=و drops; no connecting hamza needed
function assimilatedImperative(
  r2: string,
  r3: string,
  presentVowelChar: string,
): Record<string, string> {
  const stem = r2 + presentVowelChar + r3;
  return {
    "2ms": stem + SUKUN,
    "2fs": stem + KASRA + YA,
    "2md": stem + FATHA + ALEF,
    "2mp": stem + DAMMA + WAW + ALEF,
    "2fp": stem + SUKUN + "نَ",
  };
}

// Hollow imperative
// presentVowelChar: DAMMA → waw-type, KASRA → ya-type, FATHA → alef-type (نام)
function hollowImperative(
  r1: string,
  r3: string,
  presentVowelChar: string,
): Record<string, string> {
  const sv        = presentVowelChar;                  // short vowel = same as present vowel
  const lv        = presentVowelChar === DAMMA ? WAW
                  : presentVowelChar === KASRA ? YA
                  : ALEF;                              // FATHA → ALEF (نام type)
  const shortStem = r1 + sv + r3;
  const longStem  = r1 + sv + lv + r3;
  return {
    "2ms": shortStem + SUKUN,
    "2fs": longStem  + KASRA + YA,
    "2md": longStem  + FATHA + ALEF,
    "2mp": longStem  + DAMMA + WAW + ALEF,
    "2fp": shortStem + SUKUN + "نَ",
  };
}

// Defective imperative: jussive drops final weak radical.
// presentVowelChar determines the stem vowel and the long-vowel in suffixed forms.
// 2mp always uses DAMMA+WAW+ALEF regardless of waw/ya type.
function defectiveImperative(
  r1: string,
  r2: string,
  isWaw: boolean,
  presentVowelChar: string,
): Record<string, string> {
  const vChar = presentVowelChar === FATHA ? FATHA
              : (isWaw ? DAMMA : KASRA);
  const longV  = presentVowelChar === FATHA ? YA
               : (isWaw ? WAW : YA);
  const hamza  = vChar === DAMMA ? "اُ" : "اِ";
  return {
    "2ms": hamza + r1 + SUKUN + r2 + vChar,
    "2fs": hamza + r1 + SUKUN + r2 + KASRA + YA,
    "2md": hamza + r1 + SUKUN + r2 + vChar + longV + FATHA + ALEF,
    "2mp": hamza + r1 + SUKUN + r2 + DAMMA + WAW + ALEF,
    "2fp": hamza + r1 + SUKUN + r2 + vChar + longV + SUKUN + "نَ",
  };
}

function defectiveImperativeContracted(r1: string): Record<string, string> {
  return {
    "2ms": r1 + FATHA,
    "2fs": r1 + FATHA + YA,
    "2md": r1 + FATHA + YA + FATHA + ALEF,
    "2mp": r1 + FATHA + WAW + SUKUN + ALEF,
    "2fp": r1 + FATHA + YA + SUKUN + "نَ",
  };
}

// Doubled imperative: jussive/contracted stem.
// 2ms gets FATHA on shadda (رُدَّ), 2fp uses split form.
function doubledImperative(r1: string, r2: string, vChar: string): Record<string, string> {
  const gem   = r1 + vChar + r2 + SHADDA;       // رُدّ
  const split = r1 + vChar + r2 + SUKUN + r2;   // رُدُد (R1 carries vChar)
  return {
    "2ms": gem  + FATHA,                         // رُدَّ
    "2fs": gem  + KASRA + YA,                    // رُدِّي
    "2md": gem  + FATHA + ALEF,                  // رُدَّا
    "2mp": gem  + DAMMA + WAW + ALEF,            // رُدُّوا
    "2fp": split + SUKUN + "نَ",                // رُدُدْنَ
  };
}

function buildImperative(
  type: RootType,
  r1: string,
  r2: string,
  r3: string,
  presentVowelChar: string,
  contractR2Hamza?: boolean,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const pronoun of PRONOUNS) {
    if (!IMPERATIVE_PRONOUNS.has(pronoun.id)) {
      result[pronoun.id] = "—";
    }
  }

  let forms: Record<string, string>;

  if (type === "hollow_waw" || type === "hollow_ya") {
    forms = hollowImperative(r1, r3, presentVowelChar);

  } else if (type === "defective_waw" || type === "defective_ya") {
    if (contractR2Hamza) {
      forms = defectiveImperativeContracted(r1);
    } else {
      forms = defectiveImperative(r1, r2, type === "defective_waw", presentVowelChar);
    }

  } else if (type === "doubled") {
    forms = doubledImperative(r1, r2, presentVowelChar);

  } else if (type === "assimilated") {
    forms = assimilatedImperative(r2, r3, presentVowelChar);

  } else {
    forms = regularImperative(r1, r2, r3, presentVowelChar);
  }

  for (const id of IMPERATIVE_PRONOUNS) result[id] = forms[id]!;
  return result;
}

// ── Form V: تَفَعَّلَ / يَتَفَعَّلُ ──────────────────────────────────

const TA_LETTER = "\u062A"; // ت — Form V prefix

function buildFormVPast(r1: string, r2: string, r3: string): Record<string, string> {
  // تَفَعَّلَ: TA+fatha + R1+fatha + R2+shadda+fatha + R3
  const stem = TA_LETTER + FATHA + r1 + FATHA + r2 + SHADDA + FATHA + r3;
  return {
    "3ms": stem + FATHA,
    "3fs": stem + FATHA + "ت",
    "3md": stem + FATHA + "ا",
    "3fd": stem + FATHA + "تَا",
    "3mp": stem + DAMMA + "وا",
    "3fp": stem + SUKUN  + "نَ",
    "2ms": stem + SUKUN  + "تَ",
    "2fs": stem + SUKUN  + "تِ",
    "2md": stem + SUKUN  + "تُمَا",
    "2mp": stem + SUKUN  + "تُمْ",
    "2fp": stem + SUKUN  + "تُنَّ",
    "1s":  stem + SUKUN  + "تُ",
    "1p":  stem + SUKUN  + "نَا",
  };
}

function buildFormVPresent(r1: string, r2: string, r3: string): Record<string, string> {
  // يَتَفَعَّلُ: prefix+fatha + TA+fatha + R1+fatha + R2+shadda+fatha + R3
  const stem = TA_LETTER + FATHA + r1 + FATHA + r2 + SHADDA + FATHA + r3;
  return {
    "3ms": "يَ" + stem + DAMMA,
    "3fs": "تَ" + stem + DAMMA,
    "3md": "يَ" + stem + FATHA + "انِ",
    "3fd": "تَ" + stem + FATHA + "انِ",
    "3mp": "يَ" + stem + DAMMA + "ونَ",
    "3fp": "يَ" + stem + SUKUN + "نَ",
    "2ms": "تَ" + stem + DAMMA,
    "2fs": "تَ" + stem + KASRA + "ينَ",
    "2md": "تَ" + stem + FATHA + "انِ",
    "2mp": "تَ" + stem + DAMMA + "ونَ",
    "2fp": "تَ" + stem + SUKUN + "نَ",
    "1s":  "أَ" + stem + DAMMA,
    "1p":  "نَ" + stem + DAMMA,
  };
}

// Form V imperative: تَفَعَّلْ — verb opens with TA+fatha (no connecting hamza needed)
function buildFormVImperative(r1: string, r2: string, r3: string): Record<string, string> {
  const stem = TA_LETTER + FATHA + r1 + FATHA + r2 + SHADDA + FATHA + r3;
  return {
    "2ms": stem + SUKUN,
    "2fs": stem + KASRA + YA,
    "2md": stem + FATHA + ALEF,
    "2mp": stem + DAMMA + WAW + ALEF,
    "2fp": stem + SUKUN + "نَ",
  };
}

function buildFormVImperativeWithNonImp(
  r1: string,
  r2: string,
  r3: string,
): Record<string, string> {
  const imp = buildFormVImperative(r1, r2, r3);
  const result: Record<string, string> = {};
  for (const pronoun of PRONOUNS) {
    result[pronoun.id] = IMPERATIVE_PRONOUNS.has(pronoun.id)
      ? (imp[pronoun.id] ?? "—")
      : "—";
  }
  return result;
}

// ── Form VIII: اِفْتَعَلَ / يَفْتَعِلُ ─────────────────────────────────
// TA_LETTER is already declared above (Form V section) — reuse it here.
const EMPHATICS_VIII = new Set(["\u0635", "\u0636", "\u0638"]); // ص, ض, ظ
const TA_EMPHATIC_VIII = "\u0637"; // ط

/**
 * Returns the consonant cluster that replaces "R1+sukun+ت" in Form VIII.
 *
 * Rules:
 *   R1=و/ي/ت  → ت+شدة  (WAW/YA/TA disappears into infixed TA → doubled TA)
 *   R1=ص/ض/ظ  → R1+سُكون+ط  (infixed TA becomes emphatic ط)
 *   R1=ط      → ط+شدة  (TA+ط merge into double ط)
 *   R1=د/ذ/ز  → R1+سُكون+د  (voiced dental assimilation: ت→د)
 *   default   → R1+سُكون+ت  (no assimilation)
 */
const VOICED_DENTAL_VIII = new Set(["\u062F", "\u0630", "\u0632"]); // د, ذ, ز
const DAL_LETTER = "\u062F"; // د
function formVIIIInfix(r1: string): string {
  if (r1 === WAW || r1 === YA || r1 === TA_LETTER) {
    return TA_LETTER + SHADDA;          // تّ
  }
  if (EMPHATICS_VIII.has(r1)) {
    return r1 + SUKUN + TA_EMPHATIC_VIII; // R1+ْ+ط
  }
  if (r1 === TA_EMPHATIC_VIII) {
    return TA_EMPHATIC_VIII + SHADDA;   // طّ
  }
  if (VOICED_DENTAL_VIII.has(r1)) {
    return r1 + SUKUN + DAL_LETTER;     // R1+ْ+د  (ت assimilates to voiced د)
  }
  return r1 + SUKUN + TA_LETTER;        // R1+ْ+ت  (default)
}

function buildFormVIIIPast(r1: string, r2: string, r3: string): Record<string, string> {
  // اِفْتَعَلَ: ALEF+kasra + infix + fatha + R2 + fatha + R3
  const stem = ALEF + KASRA + formVIIIInfix(r1) + FATHA + r2 + FATHA + r3;
  return {
    "3ms": stem + FATHA,
    "3fs": stem + FATHA + "ت",
    "3md": stem + FATHA + "ا",
    "3fd": stem + FATHA + "تَا",
    "3mp": stem + DAMMA + "وا",
    "3fp": stem + SUKUN  + "نَ",
    "2ms": stem + SUKUN  + "تَ",
    "2fs": stem + SUKUN  + "تِ",
    "2md": stem + SUKUN  + "تُمَا",
    "2mp": stem + SUKUN  + "تُمْ",
    "2fp": stem + SUKUN  + "تُنَّ",
    "1s":  stem + SUKUN  + "تُ",
    "1p":  stem + SUKUN  + "نَا",
  };
}

function buildFormVIIIPresent(r1: string, r2: string, r3: string): Record<string, string> {
  // يَفْتَعِلُ: prefix+fatha + infix + fatha + R2 + kasra + R3
  const stem = formVIIIInfix(r1) + FATHA + r2 + KASRA + r3;
  return {
    "3ms": "يَ" + stem + DAMMA,
    "3fs": "تَ" + stem + DAMMA,
    "3md": "يَ" + stem + FATHA + "انِ",
    "3fd": "تَ" + stem + FATHA + "انِ",
    "3mp": "يَ" + stem + DAMMA + "ونَ",
    "3fp": "يَ" + stem + SUKUN + "نَ",
    "2ms": "تَ" + stem + DAMMA,
    "2fs": "تَ" + stem + KASRA + "ينَ",
    "2md": "تَ" + stem + FATHA + "انِ",
    "2mp": "تَ" + stem + DAMMA + "ونَ",
    "2fp": "تَ" + stem + SUKUN + "نَ",
    "1s":  "أَ" + stem + DAMMA,
    "1p":  "نَ" + stem + DAMMA,
  };
}

// Form VIII imperative: اِفْتَعِلْ — needs connecting alef-kasra (اِ)
function buildFormVIIIImperative(r1: string, r2: string, r3: string): Record<string, string> {
  const hamza   = ALEF + KASRA;
  const impStem = formVIIIInfix(r1) + FATHA + r2 + KASRA + r3;
  return {
    "2ms": hamza + impStem + SUKUN,
    "2fs": hamza + impStem + KASRA + YA,
    "2md": hamza + impStem + FATHA + ALEF,
    "2mp": hamza + impStem + DAMMA + WAW + ALEF,
    "2fp": hamza + impStem + SUKUN + "نَ",
  };
}

function buildFormVIIIImperativeWithNonImp(
  r1: string,
  r2: string,
  r3: string,
): Record<string, string> {
  const imp = buildFormVIIIImperative(r1, r2, r3);
  const result: Record<string, string> = {};
  for (const pronoun of PRONOUNS) {
    result[pronoun.id] = IMPERATIVE_PRONOUNS.has(pronoun.id)
      ? (imp[pronoun.id] ?? "—")
      : "—";
  }
  return result;
}

// ── Form VII: اِنْفَعَلَ / يَنْفَعِلُ ─────────────────────────────────

function buildFormVIIPast(r1: string, r2: string, r3: string): Record<string, string> {
  // اِنْفَعَلَ: ALEF+kasra + NUN+sukun + R1+fatha + R2+fatha + R3
  const stem = ALEF + KASRA + "نْ" + r1 + FATHA + r2 + FATHA + r3;
  return {
    "3ms": stem + FATHA,
    "3fs": stem + FATHA + "ت",
    "3md": stem + FATHA + "ا",
    "3fd": stem + FATHA + "تَا",
    "3mp": stem + DAMMA + "وا",
    "3fp": stem + SUKUN  + "نَ",
    "2ms": stem + SUKUN  + "تَ",
    "2fs": stem + SUKUN  + "تِ",
    "2md": stem + SUKUN  + "تُمَا",
    "2mp": stem + SUKUN  + "تُمْ",
    "2fp": stem + SUKUN  + "تُنَّ",
    "1s":  stem + SUKUN  + "تُ",
    "1p":  stem + SUKUN  + "نَا",
  };
}

function buildFormVIIPresent(r1: string, r2: string, r3: string): Record<string, string> {
  // يَنْفَعِلُ: prefix+fatha + NUN+sukun + R1+fatha + R2+kasra + R3
  const stem = "نْ" + r1 + FATHA + r2 + KASRA + r3;
  return {
    "3ms": "يَ" + stem + DAMMA,
    "3fs": "تَ" + stem + DAMMA,
    "3md": "يَ" + stem + FATHA + "انِ",
    "3fd": "تَ" + stem + FATHA + "انِ",
    "3mp": "يَ" + stem + DAMMA + "ونَ",
    "3fp": "يَ" + stem + SUKUN + "نَ",
    "2ms": "تَ" + stem + DAMMA,
    "2fs": "تَ" + stem + KASRA + "ينَ",
    "2md": "تَ" + stem + FATHA + "انِ",
    "2mp": "تَ" + stem + DAMMA + "ونَ",
    "2fp": "تَ" + stem + SUKUN + "نَ",
    "1s":  "أَ" + stem + DAMMA,
    "1p":  "نَ" + stem + DAMMA,
  };
}

// Form VII imperative: اِنْفَعِلْ — needs connecting alef-kasra (اِ) before the NUN-initial stem
function buildFormVIIImperative(r1: string, r2: string, r3: string): Record<string, string> {
  const hamza    = ALEF + KASRA;           // اِ (connecting alef with kasra)
  const impStem  = "نْ" + r1 + FATHA + r2 + KASRA + r3;
  return {
    "2ms": hamza + impStem + SUKUN,
    "2fs": hamza + impStem + KASRA + YA,
    "2md": hamza + impStem + FATHA + ALEF,
    "2mp": hamza + impStem + DAMMA + WAW + ALEF,
    "2fp": hamza + impStem + SUKUN + "نَ",
  };
}

function buildFormVIIImperativeWithNonImp(
  r1: string,
  r2: string,
  r3: string,
): Record<string, string> {
  const imp = buildFormVIIImperative(r1, r2, r3);
  const result: Record<string, string> = {};
  for (const pronoun of PRONOUNS) {
    result[pronoun.id] = IMPERATIVE_PRONOUNS.has(pronoun.id)
      ? (imp[pronoun.id] ?? "—")
      : "—";
  }
  return result;
}

// ── Form VI: تَفَاعَلَ / يَتَفَاعَلُ ─────────────────────────────────

function buildFormVIPast(r1: string, r2: string, r3: string): Record<string, string> {
  // تَفَاعَلَ: TA+fatha + R1+fatha + ALEF + R2+fatha + R3
  const stem = TA_LETTER + FATHA + r1 + FATHA + ALEF + r2 + FATHA + r3;
  return {
    "3ms": stem + FATHA,
    "3fs": stem + FATHA + "ت",
    "3md": stem + FATHA + "ا",
    "3fd": stem + FATHA + "تَا",
    "3mp": stem + DAMMA + "وا",
    "3fp": stem + SUKUN  + "نَ",
    "2ms": stem + SUKUN  + "تَ",
    "2fs": stem + SUKUN  + "تِ",
    "2md": stem + SUKUN  + "تُمَا",
    "2mp": stem + SUKUN  + "تُمْ",
    "2fp": stem + SUKUN  + "تُنَّ",
    "1s":  stem + SUKUN  + "تُ",
    "1p":  stem + SUKUN  + "نَا",
  };
}

function buildFormVIPresent(r1: string, r2: string, r3: string): Record<string, string> {
  // يَتَفَاعَلُ: prefix+fatha + TA+fatha + R1+fatha + ALEF + R2+fatha + R3
  const stem = TA_LETTER + FATHA + r1 + FATHA + ALEF + r2 + FATHA + r3;
  return {
    "3ms": "يَ" + stem + DAMMA,
    "3fs": "تَ" + stem + DAMMA,
    "3md": "يَ" + stem + FATHA + "انِ",
    "3fd": "تَ" + stem + FATHA + "انِ",
    "3mp": "يَ" + stem + DAMMA + "ونَ",
    "3fp": "يَ" + stem + SUKUN + "نَ",
    "2ms": "تَ" + stem + DAMMA,
    "2fs": "تَ" + stem + KASRA + "ينَ",
    "2md": "تَ" + stem + FATHA + "انِ",
    "2mp": "تَ" + stem + DAMMA + "ونَ",
    "2fp": "تَ" + stem + SUKUN + "نَ",
    "1s":  "أَ" + stem + DAMMA,
    "1p":  "نَ" + stem + DAMMA,
  };
}

// Form VI imperative: تَفَاعَلْ — opens with TA+fatha, no connecting hamza needed
function buildFormVIImperative(r1: string, r2: string, r3: string): Record<string, string> {
  const stem = TA_LETTER + FATHA + r1 + FATHA + ALEF + r2 + FATHA + r3;
  return {
    "2ms": stem + SUKUN,
    "2fs": stem + KASRA + YA,
    "2md": stem + FATHA + ALEF,
    "2mp": stem + DAMMA + WAW + ALEF,
    "2fp": stem + SUKUN + "نَ",
  };
}

function buildFormVIImperativeWithNonImp(
  r1: string,
  r2: string,
  r3: string,
): Record<string, string> {
  const imp = buildFormVIImperative(r1, r2, r3);
  const result: Record<string, string> = {};
  for (const pronoun of PRONOUNS) {
    result[pronoun.id] = IMPERATIVE_PRONOUNS.has(pronoun.id)
      ? (imp[pronoun.id] ?? "—")
      : "—";
  }
  return result;
}

// ── Form IV: أَفْعَلَ / يُفْعِلُ ──────────────────────────────────

const HAMZA_ABOVE = "\u0623"; // أ  (hamza above alef — past/imperative prefix)
const HAMZA_BELOW = "\u0625"; // إ  (hamza below alef — kept here for reference; masdar uses it in nounEngine)
void HAMZA_BELOW;

function buildFormIVPast(r1: string, r2: string, r3: string): Record<string, string> {
  // أَفْعَلَ: hamza-above + fatha + R1 + sukun + R2 + fatha + R3
  const stem = HAMZA_ABOVE + FATHA + r1 + SUKUN + r2 + FATHA + r3;
  return {
    "3ms": stem + FATHA,
    "3fs": stem + FATHA + "ت",
    "3md": stem + FATHA + "ا",
    "3fd": stem + FATHA + "تَا",
    "3mp": stem + DAMMA + "وا",
    "3fp": stem + SUKUN  + "نَ",
    "2ms": stem + SUKUN  + "تَ",
    "2fs": stem + SUKUN  + "تِ",
    "2md": stem + SUKUN  + "تُمَا",
    "2mp": stem + SUKUN  + "تُمْ",
    "2fp": stem + SUKUN  + "تُنَّ",
    "1s":  stem + SUKUN  + "تُ",
    "1p":  stem + SUKUN  + "نَا",
  };
}

function buildFormIVPresent(r1: string, r2: string, r3: string): Record<string, string> {
  // يُفْعِلُ: prefix + R1 + sukun + R2 + kasra + R3
  const stem = r1 + SUKUN + r2 + KASRA + r3;
  return {
    "3ms": "يُ" + stem + DAMMA,
    "3fs": "تُ" + stem + DAMMA,
    "3md": "يُ" + stem + FATHA + "انِ",
    "3fd": "تُ" + stem + FATHA + "انِ",
    "3mp": "يُ" + stem + DAMMA + "ونَ",
    "3fp": "يُ" + stem + SUKUN + "نَ",
    "2ms": "تُ" + stem + DAMMA,
    "2fs": "تُ" + stem + KASRA + "ينَ",
    "2md": "تُ" + stem + FATHA + "انِ",
    "2mp": "تُ" + stem + DAMMA + "ونَ",
    "2fp": "تُ" + stem + SUKUN + "نَ",
    "1s":  "أُ" + stem + DAMMA,
    "1p":  "نُ" + stem + DAMMA,
  };
}

// Form IV imperative: أَفْعِلْ — uses hamza-above (not connecting hamza)
function buildFormIVImperative(r1: string, r2: string, r3: string): Record<string, string> {
  const stem = HAMZA_ABOVE + FATHA + r1 + SUKUN + r2 + KASRA + r3;
  return {
    "2ms": stem + SUKUN,
    "2fs": stem + KASRA + YA,
    "2md": stem + FATHA + ALEF,
    "2mp": stem + DAMMA + WAW + ALEF,
    "2fp": stem + SUKUN + "نَ",
  };
}

function buildFormIVImperativeWithNonImp(
  r1: string,
  r2: string,
  r3: string,
): Record<string, string> {
  const imp = buildFormIVImperative(r1, r2, r3);
  const result: Record<string, string> = {};
  for (const pronoun of PRONOUNS) {
    result[pronoun.id] = IMPERATIVE_PRONOUNS.has(pronoun.id)
      ? (imp[pronoun.id] ?? "—")
      : "—";
  }
  return result;
}

// ── Form III: فَاعَلَ / يُفَاعِلُ ─────────────────────────────────

function buildFormIIIPast(r1: string, r2: string, r3: string): Record<string, string> {
  // Past stem: R1+fatha+alef+R2+fatha+R3
  const stem = r1 + FATHA + ALEF + r2 + FATHA + r3;
  return {
    "3ms": stem + FATHA,
    "3fs": stem + FATHA + "ت",
    "3md": stem + FATHA + "ا",
    "3fd": stem + FATHA + "تَا",
    "3mp": stem + DAMMA + "وا",
    "3fp": stem + SUKUN  + "نَ",
    "2ms": stem + SUKUN  + "تَ",
    "2fs": stem + SUKUN  + "تِ",
    "2md": stem + SUKUN  + "تُمَا",
    "2mp": stem + SUKUN  + "تُمْ",
    "2fp": stem + SUKUN  + "تُنَّ",
    "1s":  stem + SUKUN  + "تُ",
    "1p":  stem + SUKUN  + "نَا",
  };
}

function buildFormIIIPresent(r1: string, r2: string, r3: string): Record<string, string> {
  // Present stem: R1+fatha+alef+R2+kasra+R3
  const stem = r1 + FATHA + ALEF + r2 + KASRA + r3;
  return {
    "3ms": "يُ" + stem + DAMMA,
    "3fs": "تُ" + stem + DAMMA,
    "3md": "يُ" + stem + FATHA + "انِ",
    "3fd": "تُ" + stem + FATHA + "انِ",
    "3mp": "يُ" + stem + DAMMA + "ونَ",
    "3fp": "يُ" + stem + SUKUN + "نَ",
    "2ms": "تُ" + stem + DAMMA,
    "2fs": "تُ" + stem + KASRA + "ينَ",
    "2md": "تُ" + stem + FATHA + "انِ",
    "2mp": "تُ" + stem + DAMMA + "ونَ",
    "2fp": "تُ" + stem + SUKUN + "نَ",
    "1s":  "أُ" + stem + DAMMA,
    "1p":  "نُ" + stem + DAMMA,
  };
}

// Form III imperative: no connecting hamza — stem starts with R1+fatha (open syllable)
function buildFormIIIImperative(r1: string, r2: string, r3: string): Record<string, string> {
  const stem = r1 + FATHA + ALEF + r2 + KASRA + r3;
  return {
    "2ms": stem + SUKUN,
    "2fs": stem + KASRA + YA,
    "2md": stem + FATHA + ALEF,
    "2mp": stem + DAMMA + WAW + ALEF,
    "2fp": stem + SUKUN + "نَ",
  };
}

function buildFormIIIImperativeWithNonImp(
  r1: string,
  r2: string,
  r3: string,
): Record<string, string> {
  const imp = buildFormIIIImperative(r1, r2, r3);
  const result: Record<string, string> = {};
  for (const pronoun of PRONOUNS) {
    result[pronoun.id] = IMPERATIVE_PRONOUNS.has(pronoun.id)
      ? (imp[pronoun.id] ?? "—")
      : "—";
  }
  return result;
}

function buildFormIIPast(r1: string, r2: string, r3: string): Record<string, string> {
  const stem = r1 + FATHA + r2 + SHADDA + FATHA + r3;
  return {
    "3ms": stem + FATHA,
    "3fs": stem + FATHA + "ت",
    "3md": stem + FATHA + "ا",
    "3fd": stem + FATHA + "تَا",
    "3mp": stem + DAMMA + "وا",
    "3fp": stem + SUKUN  + "نَ",
    "2ms": stem + SUKUN  + "تَ",
    "2fs": stem + SUKUN  + "تِ",
    "2md": stem + SUKUN  + "تُمَا",
    "2mp": stem + SUKUN  + "تُمْ",
    "2fp": stem + SUKUN  + "تُنَّ",
    "1s":  stem + SUKUN  + "تُ",
    "1p":  stem + SUKUN  + "نَا",
  };
}

function buildFormIIPresent(r1: string, r2: string, r3: string): Record<string, string> {
  const stem = r1 + FATHA + r2 + SHADDA + KASRA + r3;
  return {
    "3ms": "يُ" + stem + DAMMA,
    "3fs": "تُ" + stem + DAMMA,
    "3md": "يُ" + stem + FATHA + "انِ",
    "3fd": "تُ" + stem + FATHA + "انِ",
    "3mp": "يُ" + stem + DAMMA + "ونَ",
    "3fp": "يُ" + stem + SUKUN + "نَ",
    "2ms": "تُ" + stem + DAMMA,
    "2fs": "تُ" + stem + KASRA + "ينَ",
    "2md": "تُ" + stem + FATHA + "انِ",
    "2mp": "تُ" + stem + DAMMA + "ونَ",
    "2fp": "تُ" + stem + SUKUN + "نَ",
    "1s":  "أُ" + stem + DAMMA,
    "1p":  "نُ" + stem + DAMMA,
  };
}

// Form II imperative: no connecting hamza — stem starts with R1+fatha (open syllable)
function buildFormIIImperative(r1: string, r2: string, r3: string): Record<string, string> {
  const stem = r1 + FATHA + r2 + SHADDA + KASRA + r3;
  return {
    "2ms": stem + SUKUN,
    "2fs": stem + KASRA + YA,
    "2md": stem + FATHA + ALEF,
    "2mp": stem + DAMMA + WAW + ALEF,
    "2fp": stem + SUKUN + "نَ",
  };
}

// Wrapper that fills non-imperative pronouns with "—"
function buildFormIIImperativeWithNonImp(
  r1: string,
  r2: string,
  r3: string,
): Record<string, string> {
  const imp = buildFormIIImperative(r1, r2, r3);
  const result: Record<string, string> = {};
  for (const pronoun of PRONOUNS) {
    result[pronoun.id] = IMPERATIVE_PRONOUNS.has(pronoun.id)
      ? (imp[pronoun.id] ?? "—")
      : "—";
  }
  return result;
}

// ── Form X: اِسْتَفْعَلَ / يَسْتَفْعِلُ ─────────────────────────────────
//
// Pattern: ALEF+kasra + SIN+sukun + TA+fatha + R1+sukun + R2+fatha + R3
// Past:      اِسْتَعْمَلَ (istaʿmala)
// Present:   يَسْتَعْمِلُ (yastaʿmilu)  — FATHA prefix (يَ/تَ/أَ/نَ)
// Imperative: اِسْتَعْمِلْ — connecting alef-kasra (اِ) because stem opens with SIN+sukun

const SIN_LETTER = "\u0633"; // س — used in Form X SIN+TA prefix

function buildFormXPast(r1: string, r2: string, r3: string): Record<string, string> {
  // اِسْتَ + R1+sukun + R2+fatha + R3  (before personal ending)
  const stem = ALEF + KASRA + SIN_LETTER + SUKUN + "تَ" + r1 + SUKUN + r2 + FATHA + r3;
  return {
    "3ms": stem + FATHA,
    "3fs": stem + FATHA + "ت",
    "3md": stem + FATHA + "ا",
    "3fd": stem + FATHA + "تَا",
    "3mp": stem + DAMMA + "وا",
    "3fp": stem + SUKUN  + "نَ",
    "2ms": stem + SUKUN  + "تَ",
    "2fs": stem + SUKUN  + "تِ",
    "2md": stem + SUKUN  + "تُمَا",
    "2mp": stem + SUKUN  + "تُمْ",
    "2fp": stem + SUKUN  + "تُنَّ",
    "1s":  stem + SUKUN  + "تُ",
    "1p":  stem + SUKUN  + "نَا",
  };
}

function buildFormXPresent(r1: string, r2: string, r3: string): Record<string, string> {
  // يَسْتَ + R1+sukun + R2+kasra + R3  (+damma for 3ms)
  const pStem = SIN_LETTER + SUKUN + "تَ" + r1 + SUKUN + r2 + KASRA + r3;
  return {
    "3ms": "يَ" + pStem + DAMMA,
    "3fs": "تَ" + pStem + DAMMA,
    "3md": "يَ" + pStem + FATHA + "انِ",
    "3fd": "تَ" + pStem + FATHA + "انِ",
    "3mp": "يَ" + pStem + DAMMA + "ونَ",
    "3fp": "يَ" + pStem + SUKUN + "نَ",
    "2ms": "تَ" + pStem + DAMMA,
    "2fs": "تَ" + pStem + KASRA + "ينَ",
    "2md": "تَ" + pStem + FATHA + "انِ",
    "2mp": "تَ" + pStem + DAMMA + "ونَ",
    "2fp": "تَ" + pStem + SUKUN + "نَ",
    "1s":  "أَ" + pStem + DAMMA,
    "1p":  "نَ" + pStem + DAMMA,
  };
}

// Form X imperative: connecting alef-kasra (اِ) is required because the stem
// opens with SIN+sukun — not an open syllable.
function buildFormXImperative(r1: string, r2: string, r3: string): Record<string, string> {
  const pStem = SIN_LETTER + SUKUN + "تَ" + r1 + SUKUN + r2 + KASRA + r3;
  const iStem = ALEF + KASRA + pStem;
  return {
    "2ms": iStem + SUKUN,
    "2fs": iStem + KASRA + YA,
    "2md": iStem + FATHA + ALEF,
    "2mp": iStem + DAMMA + WAW + ALEF,
    "2fp": iStem + SUKUN + "نَ",
  };
}

function buildFormXImperativeWithNonImp(
  r1: string,
  r2: string,
  r3: string,
): Record<string, string> {
  const imp = buildFormXImperative(r1, r2, r3);
  const result: Record<string, string> = {};
  for (const pronoun of PRONOUNS) {
    result[pronoun.id] = IMPERATIVE_PRONOUNS.has(pronoun.id)
      ? (imp[pronoun.id] ?? "—")
      : "—";
  }
  return result;
}

// ── Main export ───────────────────────────────────────────────────

export interface ConjugationOptions {
  type: RootType;
  r1: string;
  r2: string;
  r3: string;
  pastVowel: string;
  presentVowel: string;
  contractR2Hamza?: boolean;
}

function vowelChar(v: string): string {
  if (v === "i") return KASRA;
  if (v === "u") return DAMMA;
  return FATHA;
}

export function conjugate(opts: ConjugationOptions): ConjugationTable {
  const { type, r1, r2, r3, pastVowel, presentVowel, contractR2Hamza } = opts;
  const pastV    = vowelChar(pastVowel);
  const presentV = vowelChar(presentVowel);

  let pastMap: Record<string, string>;
  let presentMap: Record<string, string>;
  let imperativeMap: Record<string, string>;

  if (type === "form_x") {
    pastMap       = buildFormXPast(r1, r2, r3);
    presentMap    = buildFormXPresent(r1, r2, r3);
    imperativeMap = buildFormXImperativeWithNonImp(r1, r2, r3);
  } else if (type === "form_viii") {
    pastMap       = buildFormVIIIPast(r1, r2, r3);
    presentMap    = buildFormVIIIPresent(r1, r2, r3);
    imperativeMap = buildFormVIIIImperativeWithNonImp(r1, r2, r3);
  } else if (type === "form_vii") {
    pastMap       = buildFormVIIPast(r1, r2, r3);
    presentMap    = buildFormVIIPresent(r1, r2, r3);
    imperativeMap = buildFormVIIImperativeWithNonImp(r1, r2, r3);
  } else if (type === "form_vi") {
    pastMap       = buildFormVIPast(r1, r2, r3);
    presentMap    = buildFormVIPresent(r1, r2, r3);
    imperativeMap = buildFormVIImperativeWithNonImp(r1, r2, r3);
  } else if (type === "form_v") {
    pastMap       = buildFormVPast(r1, r2, r3);
    presentMap    = buildFormVPresent(r1, r2, r3);
    imperativeMap = buildFormVImperativeWithNonImp(r1, r2, r3);
  } else if (type === "form_iv") {
    pastMap       = buildFormIVPast(r1, r2, r3);
    presentMap    = buildFormIVPresent(r1, r2, r3);
    imperativeMap = buildFormIVImperativeWithNonImp(r1, r2, r3);
  } else if (type === "form_iii") {
    pastMap       = buildFormIIIPast(r1, r2, r3);
    presentMap    = buildFormIIIPresent(r1, r2, r3);
    imperativeMap = buildFormIIIImperativeWithNonImp(r1, r2, r3);
  } else if (type === "form_ii") {
    pastMap      = buildFormIIPast(r1, r2, r3);
    presentMap   = buildFormIIPresent(r1, r2, r3);
    imperativeMap = buildFormIIImperativeWithNonImp(r1, r2, r3);
  } else if (type === "assimilated") {
    pastMap      = buildRegularPast(r1, r2, r3, pastV);
    presentMap   = buildAssimilatedPresent(r1, r2, r3, presentV);
    imperativeMap = buildImperative(type, r1, r2, r3, presentV);
  } else {
    pastMap    = getIrregularPast(type, r1, r2, r3, pastVowel, presentVowel)
                   ?? buildRegularPast(r1, r2, r3, pastV);
    presentMap = getIrregularPresent(type, r1, r2, r3, presentVowel, contractR2Hamza)
                   ?? buildRegularPresent(r1, r2, r3, presentV);
    imperativeMap = buildImperative(type, r1, r2, r3, presentV, contractR2Hamza);
  }

  const futureMap = buildFuture(presentMap);

  function toRows(m: Record<string, string>): ConjugationRow[] {
    return PRONOUNS.map((p) => ({
      pronoun:      p.id,
      pronounLabel: p.label,
      form:         m[p.id] ?? "—",
    }));
  }

  return {
    past:       toRows(pastMap),
    present:    toRows(presentMap),
    future:     toRows(futureMap),
    imperative: toRows(imperativeMap),
  };
}
