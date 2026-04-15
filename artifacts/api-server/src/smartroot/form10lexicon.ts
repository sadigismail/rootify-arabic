/**
 * form10lexicon.ts
 * Gloss lookup for Form X (اِسْتَفْعَلَ) verbs.
 * Keys are 3-consonant canonical roots (R1+R2+R3, no prefix).
 * Gloss style: "to [verb]" or "to [verb] / [verb]" (max 2 alternatives).
 * Form X: "to seek X", "to deem X", "to request X", or to enter a state.
 *
 * Hollow-root entries use the contracted alef form as key:
 *   شور → شار (استشار = to consult)
 *   جوب → جاب (استجاب = to respond)
 *   عود → عاد (استعاد = to recover / resume)
 *   طوع → طاع (استطاع = to be able)
 *   فيد → فاد (استفاد = to benefit)
 *   قوم → قام (استقام = to stand firm)
 *
 * Doubled-root entries use R1+R2+R2:
 *   مرر → استمرّ (to continue)
 *   حقق → استحقّ (to deserve)
 *   مدد → استمدّ (to draw on)
 */

const FORM_X_GLOSSES: Record<string, string> = {
  // ── original 15 ──────────────────────────────────────────────────
  "عمل": "to use / employ",
  "خدم": "to use / utilize",
  "قبل": "to receive / welcome",
  "خرج": "to extract / derive",
  "مرر": "to continue / persist",
  "حسن": "to approve / deem good",
  "غفر": "to seek forgiveness",
  "عجل": "to hurry / urge on",
  "فاد": "to benefit from",
  "طاع": "to be capable / able to",
  "قام": "to stand firm / be upright",
  "فهم": "to seek explanation / try to understand",
  "سلم": "to surrender / submit",
  "حضر": "to be ready / prepare",
  "لزم": "to require / necessitate",

  // ── consultation & inquiry ────────────────────────────────────────
  "شار": "to consult / seek counsel",
  "جاب": "to respond to / answer",
  "وضح": "to seek clarification on",
  "فسر": "to seek interpretation / inquire",
  "نجد": "to seek help / call for assistance",

  // ── investigation & deduction ─────────────────────────────────────
  "نتج": "to conclude / deduce",
  "شهد": "to cite as evidence / invoke",
  "كشف": "to explore / discover",
  "ذكر": "to evoke / recollect",
  "نكر": "to denounce / condemn",

  // ── economics & investment ────────────────────────────────────────
  "ثمر": "to invest / put to productive use",
  "بدل": "to replace / substitute",
  "جلب": "to attract / bring in",
  "وعب": "to absorb / comprehend",

  // ── completion & recovery ─────────────────────────────────────────
  "كمل": "to complete / accomplish",
  "رجع": "to retrieve / recover",
  "عاد": "to resume / restore",
  "مدد": "to draw on / derive from",
  "حقق": "to deserve / merit",

  // ── political & legal ─────────────────────────────────────────────
  "قطب": "to attract / polarize",
  "وقف": "to detain / halt",
  "أجر": "to rent / hire",
  "أنف": "to resume / file an appeal",
};

export function lookupFormXGloss(canonicalRoot: string): string | undefined {
  return FORM_X_GLOSSES[canonicalRoot];
}

export function getAllFormXGlosses(): Record<string, string> {
  return FORM_X_GLOSSES;
}
