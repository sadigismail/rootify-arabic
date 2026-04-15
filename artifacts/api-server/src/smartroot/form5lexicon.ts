/**
 * form5lexicon.ts
 * Gloss lookup for Form V (تَفَعَّلَ) verbs — reflexive / passive of Form II.
 * Keys are 3-consonant canonical roots (R1+R2+R3, no TA prefix).
 * Gloss style: "to [verb]" or "to [verb] / [verb]" (max 2 alternatives).
 *
 * Noun-status note: passive participle is "less_common" for all Form V verbs —
 * the form is inherently reflexive/intransitive, so passivisation is marginal.
 */

const FORM_V_GLOSSES: Record<string, string> = {
  // ── original 12 ──────────────────────────────────────────────────
  "علم": "to learn / become educated",
  "درب": "to train / practice",
  "قدم": "to advance / progress",
  "نظم": "to organize oneself",
  "حسن": "to improve / get better",
  "ذكر": "to remember / recall",
  "كلم": "to speak / converse",
  "أخر": "to be late / delayed",
  "صرف": "to behave / conduct oneself",
  "وجه": "to orient oneself / head toward",
  "عرف": "to get to know / become acquainted",
  "خصص": "to specialize",

  // ── change & transformation ───────────────────────────────────────
  "حول": "to transform / be converted",
  "طور": "to develop / evolve",
  "غير": "to change / be altered",
  "شكل": "to take shape / be formed",
  "كون": "to be composed of / be formed",

  // ── cognition & awareness ─────────────────────────────────────────
  "وضح": "to become clear",
  "أثر": "to be affected / be influenced",
  "ضمن": "to contain / encompass",
  "طلب": "to require / demand",
  "ألم": "to suffer / feel pain",

  // ── movement & state ──────────────────────────────────────────────
  "وقف": "to stop / halt",
  "ركز": "to concentrate / focus",
  "وصل": "to reach / arrive at",
  "خرج": "to graduate / emerge",
  "سلم": "to receive / assume possession",

  // ── professional & administrative ────────────────────────────────
  "حدد": "to be determined / specified",
  "نفذ": "to be implemented / executed",
  "مكن": "to manage to / be able to",
  "وفر": "to be available / be provided",
  "فرج": "to observe / attend an event",

  // ── economics & society ───────────────────────────────────────────
  "قلص": "to shrink / contract",
  "عرض": "to be exposed to / undergo",
  "حكم": "to be subject to / be controlled by",
  "فعل": "to be activated / come into effect",
};

export function lookupFormVGloss(canonicalRoot: string): string | undefined {
  return FORM_V_GLOSSES[canonicalRoot];
}

export function getAllFormVGlosses(): Record<string, string> {
  return FORM_V_GLOSSES;
}
