/**
 * passiveConjugation.ts
 * Generates passive voice (المبني للمجهول) conjugations.
 *
 * Covers:
 *   - Past passive  (الماضي المجهول)   for Forms I–X
 *   - Present passive (المضارع المجهول) for Forms I–X
 *   - Form VII (انفعل) has no passive voice by definition → available: false
 *
 * Internal vowel rules:
 *   Past passive:    first syllable → DAMMA; last radical vowel → KASRA
 *   Present passive: mu-prefix → DAMMA;     last radical vowel → FATHA
 *
 * This module has NO side-effects on the SmartILR pipeline.
 */

import { PRONOUNS } from "./patternLibrary.js";
import type { ConjugationRow } from "./conjugationEngine.js";
import type { RootType } from "./rootClassifier.js";

const FATHA  = "\u064E";
const KASRA  = "\u0650";
const DAMMA  = "\u064F";
const SUKUN  = "\u0652";
const SHADDA = "\u0651";
const ALEF   = "\u0627";
const WAW    = "\u0648";
const YA     = "\u064A";
const TA     = "\u062A";
const SIN    = "\u0633";
const HAMZA_ABOVE = "\u0623";

// ── Past passive suffixes (identical slots to active past) ────────

const PAST_SFX: Record<string, string> = {
  "3ms": FATHA,            "3fs": FATHA + "ت",
  "3md": FATHA + "ا",     "3fd": FATHA + "تَا",
  "3mp": DAMMA + "وا",    "3fp": SUKUN  + "نَ",
  "2ms": SUKUN  + "تَ",   "2fs": SUKUN  + "تِ",
  "2md": SUKUN  + "تُمَا","2mp": SUKUN  + "تُمْ",
  "2fp": SUKUN  + "تُنَّ","1s":  SUKUN  + "تُ",
  "1p":  SUKUN  + "نَا",
};

// ── Present passive prefix (always DAMMA) ─────────────────────────

const PRES_PFX: Record<string, string> = {
  "3ms": "يُ", "3fs": "تُ", "3md": "يُ", "3fd": "تُ",
  "3mp": "يُ", "3fp": "يُ", "2ms": "تُ", "2fs": "تُ",
  "2md": "تُ", "2mp": "تُ", "2fp": "تُ", "1s":  "أُ", "1p":  "نُ",
};

const PRES_SFX: Record<string, string> = {
  "3ms": DAMMA,            "3fs": DAMMA,
  "3md": FATHA + "انِ",   "3fd": FATHA + "انِ",
  "3mp": DAMMA + "ونَ",   "3fp": SUKUN  + "نَ",
  "2ms": DAMMA,            "2fs": KASRA  + "ينَ",
  "2md": FATHA + "انِ",   "2mp": DAMMA  + "ونَ",
  "2fp": SUKUN  + "نَ",   "1s":  DAMMA,  "1p":  DAMMA,
};

// ── Form VIII infix (mirrors conjugationEngine assimilation) ──────

const EMPHATICS_VIII = new Set(["\u0635", "\u0636", "\u0638"]); // ص ض ظ
const TA_EMP = "\u0637"; // ط

type InfixKind = "default" | "shadda" | "emphatic" | "taEmp";

function viii_infix_kind(r1: string): InfixKind {
  if (r1 === WAW || r1 === YA || r1 === TA) return "shadda";
  if (EMPHATICS_VIII.has(r1)) return "emphatic";
  if (r1 === TA_EMP) return "taEmp";
  return "default";
}

// ── Past passive stem ─────────────────────────────────────────────

function pastStem(type: RootType, r1: string, r2: string, r3: string, contractR2Hamza?: boolean): string {
  switch (type) {
    // Form X: اُسْتُفْعِلَ
    case "form_x":
      return ALEF + DAMMA + SIN + SUKUN + TA + DAMMA + r1 + SUKUN + r2 + KASRA + r3;

    // Form VIII: اُفْتُعِلَ  (with all assimilation variants)
    case "form_viii": {
      const k = viii_infix_kind(r1);
      if (k === "shadda")   return ALEF + DAMMA + TA + SHADDA + DAMMA + r2 + KASRA + r3;
      if (k === "emphatic") return ALEF + DAMMA + r1 + SUKUN + TA_EMP + DAMMA + r2 + KASRA + r3;
      if (k === "taEmp")    return ALEF + DAMMA + TA_EMP + SHADDA + DAMMA + r2 + KASRA + r3;
      /* default */         return ALEF + DAMMA + r1 + SUKUN + TA + DAMMA + r2 + KASRA + r3;
    }

    case "form_vii": return ""; // no passive — handled above call site

    // Form VI: تُفُوعِلَ
    case "form_vi":
      return TA + DAMMA + r1 + DAMMA + WAW + r2 + KASRA + r3;

    // Form V: تُفُعِّلَ
    case "form_v":
      return TA + DAMMA + r1 + DAMMA + r2 + SHADDA + KASRA + r3;

    // Form IV: أُفْعِلَ
    case "form_iv":
      return HAMZA_ABOVE + DAMMA + r1 + SUKUN + r2 + KASRA + r3;

    // Form III: فُوعِلَ  (long vowel becomes WAW under DAMMA)
    case "form_iii":
      return r1 + DAMMA + WAW + r2 + KASRA + r3;

    // Form II: فُعِّلَ
    case "form_ii":
      return r1 + DAMMA + r2 + SHADDA + KASRA + r3;

    // Form I regular / assimilated: فُعِلَ
    case "regular":
    case "assimilated":
      return r1 + DAMMA + r2 + KASRA + r3;

    // Form I hollow: قِيلَ / بِيعَ  (both waw and ya types share the YA passive)
    case "hollow_waw":
    case "hollow_ya":
      return r1 + KASRA + YA + r3;

    // Form I defective: دُعِيَ  (3mp has a special damma-waw form — see below)
    case "defective_waw":
    case "defective_ya":
      if (contractR2Hamza) return r1 + DAMMA + "\u0626" + KASRA + YA;
      return r1 + DAMMA + r2 + KASRA + YA;

    // Form I doubled: رُدَّ
    case "doubled":
      return r1 + DAMMA + r2 + SHADDA;

    default:
      return r1 + DAMMA + r2 + KASRA + r3;
  }
}

// ── Present passive stem ──────────────────────────────────────────

function presStem(type: RootType, r1: string, r2: string, r3: string, contractR2Hamza?: boolean): string {
  switch (type) {
    // Form X: يُسْتَفْعَلُ
    case "form_x":
      return SIN + SUKUN + TA + FATHA + r1 + SUKUN + r2 + FATHA + r3;

    // Form VIII: يُفْتَعَلُ
    case "form_viii": {
      const k = viii_infix_kind(r1);
      if (k === "shadda")   return TA + SHADDA + FATHA + r2 + FATHA + r3;
      if (k === "emphatic") return r1 + SUKUN + TA_EMP + FATHA + r2 + FATHA + r3;
      if (k === "taEmp")    return TA_EMP + SHADDA + FATHA + r2 + FATHA + r3;
      /* default */         return r1 + SUKUN + TA + FATHA + r2 + FATHA + r3;
    }

    case "form_vii": return "";

    // Form VI: يُتَفَاعَلُ
    case "form_vi":
      return TA + FATHA + r1 + FATHA + ALEF + r2 + FATHA + r3;

    // Form V: يُتَفَعَّلُ
    case "form_v":
      return TA + FATHA + r1 + FATHA + r2 + SHADDA + FATHA + r3;

    // Form IV: يُفْعَلُ
    case "form_iv":
      return r1 + SUKUN + r2 + FATHA + r3;

    // Form III: يُفَاعَلُ
    case "form_iii":
      return r1 + FATHA + ALEF + r2 + FATHA + r3;

    // Form II: يُفَعَّلُ
    case "form_ii":
      return r1 + FATHA + r2 + SHADDA + FATHA + r3;

    // Form I regular / assimilated: يُفْعَلُ
    case "regular":
    case "assimilated":
      return r1 + SUKUN + r2 + FATHA + r3;

    // Form I hollow: يُقَالُ  (both types use ALEF long vowel)
    case "hollow_waw":
    case "hollow_ya":
      return r1 + FATHA + ALEF + r3;

    // Form I defective: يُدْعَى  (alef maqsura ending)
    case "defective_waw":
    case "defective_ya":
      if (contractR2Hamza) return r1 + FATHA + "\u0649";
      return r1 + SUKUN + r2 + FATHA + "\u0649"; // ى (alef maqsura)

    // Form I doubled: يُرَدُّ
    case "doubled":
      return r1 + FATHA + r2 + SHADDA;

    default:
      return r1 + SUKUN + r2 + FATHA + r3;
  }
}

// ── Public API ────────────────────────────────────────────────────

export interface PassiveConjugation {
  available:  boolean;
  note?:      string;
  past:       ConjugationRow[];
  present:    ConjugationRow[];
}

export function conjugatePassive(
  type: RootType,
  r1: string,
  r2: string,
  r3: string,
  contractR2Hamza?: boolean,
): PassiveConjugation {
  if (type === "form_vii") {
    return {
      available: false,
      note: "Measure VII (انفعل) is inherently passive-reflexive; it has no separate passive voice.",
      past: [],
      present: [],
    };
  }

  const ps = pastStem(type, r1, r2, r3, contractR2Hamza);
  const pr = presStem(type, r1, r2, r3, contractR2Hamza);

  const isDefective = type === "defective_waw" || type === "defective_ya";

  const past: ConjugationRow[] = PRONOUNS.map(p => {
    let form: string;
    if (isDefective && p.id === "3mp") {
      const mid = contractR2Hamza ? "\u0624" : r2;
      form = r1 + DAMMA + mid + DAMMA + WAW + ALEF;
    } else {
      form = ps + PAST_SFX[p.id]!;
    }
    return { pronoun: p.id, pronounLabel: p.label, form };
  });

  const YA_MAQ = "\u0649";

  const present: ConjugationRow[] = PRONOUNS.map(p => {
    let form: string;
    if (isDefective) {
      const pfx = PRES_PFX[p.id]!;
      const stemBase = pr.slice(0, -1);
      switch (p.id) {
        case "3ms": case "3fs": case "2ms": case "1s": case "1p":
          form = pfx + stemBase + YA_MAQ;
          break;
        case "3mp": case "2mp":
          form = pfx + stemBase + WAW + SUKUN + "نَ";
          break;
        case "2fs":
          form = pfx + stemBase + YA + SUKUN + "نَ";
          break;
        case "3md": case "3fd": case "2md":
          form = pfx + stemBase + YA + FATHA + "انِ";
          break;
        case "3fp": case "2fp":
          form = pfx + stemBase + YA + SUKUN + "نَ";
          break;
        default:
          form = pfx + pr + PRES_SFX[p.id]!;
      }
    } else {
      form = PRES_PFX[p.id]! + pr + PRES_SFX[p.id]!;
    }
    return { pronoun: p.id, pronounLabel: p.label, form };
  });

  const isIrregular = (
    type === "hollow_waw" || type === "hollow_ya" ||
    isDefective || type === "doubled"
  );

  return {
    available: true,
    note: isIrregular
      ? "Irregular root type — passive follows standard vowel-shift rules; some pronouns may vary in spoken Arabic."
      : undefined,
    past,
    present,
  };
}
