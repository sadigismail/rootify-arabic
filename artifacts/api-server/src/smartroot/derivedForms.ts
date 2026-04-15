/**
 * derivedForms.ts
 * Given a triliteral root (R1, R2, R3) and its Form I base type,
 * generate the Form I–X derivational paradigm.
 *
 * For each form the module returns:
 *   - 3ms past / present forms (with transliteration)
 *   - masdar and active participle (with transliteration)
 *   - `attested` — true when the form's 3-consonant key exists in
 *     the corresponding form lexicon
 *   - `is_current` — true for the form that was actually detected
 *
 * Derived forms II–X always use the default vowel assignment for the
 * conjugation engine (pastVowel "a", presentVowel "i"/"a" as per the
 * form's inherent pattern).  Form I uses pastVowel "a" / presentVowel "u"
 * as the default when the lexicon entry is absent.
 *
 * NO SmartILR or scoring logic is used here.
 */

import { conjugate } from "./conjugationEngine.js";
import { getNounForms } from "./nounEngine.js";
import { transliterate } from "./transliterate.js";
import type { RootType } from "./rootClassifier.js";
import { lookupRoot } from "./lexicon.js";
import { lookupFormIIGloss } from "./form2lexicon.js";
import { lookupFormIIIGloss } from "./form3lexicon.js";
import { lookupFormIVGloss } from "./form4lexicon.js";
import { lookupFormVGloss } from "./form5lexicon.js";
import { lookupFormVIGloss } from "./form6lexicon.js";
import { lookupFormVIIGloss } from "./form7lexicon.js";
import { lookupFormVIIIGloss } from "./form8lexicon.js";
import { lookupFormXGloss } from "./form10lexicon.js";

// ── Form measure meanings (as labeled in standard Arabic morphology charts) ──

export const FORM_MEANINGS: Record<number, string> = {
  1:  "Regular",
  2:  "Causative",
  3:  "Reciprocal",
  4:  "Causative",
  5:  "Reflexive of II",
  6:  "Reflexive of III",
  7:  "Passive of I",
  8:  "Reflexive of I",
  9:  "Colors/Defects",
  10: "Causative Reflexive",
};

// ── Helpers ───────────────────────────────────────────────────────

function tok(arabic: string) {
  return { arabic, translit: transliterate(arabic) };
}

function glossForForm(formNum: number, root3: string): string | null {
  switch (formNum) {
    case 1:  { const e = lookupRoot(root3); return e?.gloss ?? null; }
    case 2:  return lookupFormIIGloss(root3);
    case 3:  return lookupFormIIIGloss(root3);
    case 4:  return lookupFormIVGloss(root3);
    case 5:  return lookupFormVGloss(root3);
    case 6:  return lookupFormVIGloss(root3);
    case 7:  return lookupFormVIIGloss(root3);
    case 8:  return lookupFormVIIIGloss(root3);
    case 10: return lookupFormXGloss(root3);
    default: return null;
  }
}

function formRow(
  formNum: number,
  type: RootType,
  r1: string, r2: string, r3: string,
  pastVowel: string, presentVowel: string,
  attested: boolean,
  currentForm: number,
) {
  const conj  = conjugate({ type, r1, r2, r3, pastVowel, presentVowel });
  const nouns = getNounForms(type, r1, r2, r3, undefined);
  const root3 = r1 + r2 + r3;
  return {
    form:        formNum,
    meaning:     FORM_MEANINGS[formNum] ?? "",
    gloss:       glossForForm(formNum, root3),
    past_3ms:    tok(conj.past.find(r => r.pronoun === "3ms")!.form),
    present_3ms: tok(conj.present.find(r => r.pronoun === "3ms")!.form),
    masdar:      tok(nouns.masdar),
    active_part: tok(nouns.activePart),
    attested,
    is_current:  formNum === currentForm,
  };
}

// ── Public API ────────────────────────────────────────────────────

export interface DerivedFormEntry {
  form:        number;
  meaning:     string;
  gloss:       string | null;
  past_3ms:    { arabic: string; translit: string };
  present_3ms: { arabic: string; translit: string };
  masdar:      { arabic: string; translit: string };
  active_part: { arabic: string; translit: string };
  attested:    boolean;
  is_current:  boolean;
}

/**
 * Returns the Form I–X derivational paradigm for a given root.
 *
 * @param r1 r2 r3  — bare consonant letters of the root
 * @param baseType  — the Form I root type (regular / hollow_waw / etc.);
 *                    used for Form I row only
 * @param currentForm — the form number detected from the user's input
 *                      (1, 2, 3, 4, 5, 6, 7, 8, or 10)
 */
export function getDerivedForms(
  r1: string,
  r2: string,
  r3: string,
  baseType: RootType,
  currentForm: number,
): DerivedFormEntry[] {
  const root3 = r1 + r2 + r3;

  return [
    // ── Form I ──────────────────────────────────────────────────
    formRow(1, baseType, r1, r2, r3, "a", "u",
      !!lookupRoot(root3), currentForm),

    // ── Form II: فَعَّلَ ─────────────────────────────────────────
    formRow(2, "form_ii", r1, r2, r3, "a", "i",
      !!lookupFormIIGloss(root3), currentForm),

    // ── Form III: فَاعَلَ ────────────────────────────────────────
    formRow(3, "form_iii", r1, r2, r3, "a", "i",
      !!lookupFormIIIGloss(root3), currentForm),

    // ── Form IV: أَفْعَلَ ─────────────────────────────────────────
    formRow(4, "form_iv", r1, r2, r3, "a", "i",
      !!lookupFormIVGloss(root3), currentForm),

    // ── Form V: تَفَعَّلَ ─────────────────────────────────────────
    formRow(5, "form_v", r1, r2, r3, "a", "a",
      !!lookupFormVGloss(root3), currentForm),

    // ── Form VI: تَفَاعَلَ ────────────────────────────────────────
    formRow(6, "form_vi", r1, r2, r3, "a", "a",
      !!lookupFormVIGloss(root3), currentForm),

    // ── Form VII: اِنْفَعَلَ ──────────────────────────────────────
    formRow(7, "form_vii", r1, r2, r3, "a", "i",
      !!lookupFormVIIGloss(root3), currentForm),

    // ── Form VIII: اِفْتَعَلَ ─────────────────────────────────────
    formRow(8, "form_viii", r1, r2, r3, "a", "i",
      !!lookupFormVIIIGloss(root3), currentForm),

    // ── Form X: اِسْتَفْعَلَ ──────────────────────────────────────
    formRow(10, "form_x", r1, r2, r3, "a", "i",
      !!lookupFormXGloss(root3), currentForm),
  ];
}
