/**
 * form4lexicon.ts
 * Gloss lookup for Form IV (أَفْعَلَ) verbs — causative.
 * Keys are 3-consonant canonical roots (R1+R2+R3, no hamza prefix).
 * Gloss style: "to [verb]" or "to [verb] / [verb]" (max 2 alternatives).
 */

const FORM_IV_GLOSSES: Record<string, string> = {
  // ── original 12 ──────────────────────────────────────────────────
  "كرم": "to honor / be generous",
  "رسل": "to send",
  "خبر": "to inform / tell",
  "نتج": "to produce",
  "سرع": "to hasten / accelerate",
  "علم": "to inform / make known",
  "كمل": "to complete / finish",
  "فهم": "to make understand / explain",
  "خرج": "to take out / export",
  "دخل": "to insert / admit",
  "نجح": "to cause to succeed",
  "صلح": "to reform / correct",

  // ── declaration & announcement ────────────────────────────────────
  "علن": "to announce / declare",
  "صدر": "to issue / release",
  "بلغ": "to notify / report",
  "حكم": "to subject to authority",

  // ── legal & political action ──────────────────────────────────────
  "برم": "to conclude / finalize",
  "وقف": "to stop / suspend",
  "جبر": "to force / compel",
  "لزم": "to require / make obligatory",
  "شرك": "to involve / associate",
  "عدم": "to execute / deprive",
  "طلق": "to launch / release",
  "ثبت": "to prove / demonstrate",

  // ── administration & organization ────────────────────────────────
  "درج": "to list / incorporate",
  "صبح": "to render / convert into",
  "فرز": "to sort / separate",
  "رجع": "to return / send back",
  "عقب": "to follow / succeed",

  // ── education & innovation ────────────────────────────────────────
  "بدع": "to innovate / create",
  "تقن": "to perfect / master",
  "حدث": "to bring about / cause",
  "سهم": "to contribute / participate",

  // ── psychological & social ────────────────────────────────────────
  "قلق": "to disturb / unsettle",
  "حبط": "to frustrate / foil",
  "لهم": "to inspire / motivate",
  "فسد": "to corrupt / spoil",
};

export function lookupFormIVGloss(canonicalRoot: string): string | undefined {
  return FORM_IV_GLOSSES[canonicalRoot];
}

export function getAllFormIVGlosses(): Record<string, string> {
  return FORM_IV_GLOSSES;
}
