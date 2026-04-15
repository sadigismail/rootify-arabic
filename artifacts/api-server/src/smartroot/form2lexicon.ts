/**
 * form2lexicon.ts
 * Gloss lookup for Form II (فَعَّلَ) verbs — causative / intensive.
 * Keys are 3-consonant canonical roots.
 * Gloss style: "to [verb]" or "to [verb] / [verb]" (max 2 alternatives).
 */

const FORM_II_GLOSSES: Record<string, string> = {
  // ── original 13 ──────────────────────────────────────────────────
  "درس": "to teach",
  "علم": "to teach / educate",
  "قرب": "to bring near / approximate",
  "نظم": "to organize / arrange",
  "قدم": "to present / submit",
  "كبر": "to enlarge / magnify",
  "صغر": "to reduce / miniaturize",
  "حسن": "to improve / beautify",
  "ذكر": "to remind / mention",
  "فتح": "to enable / unlock",
  "كلم": "to speak to / address",
  "سهل": "to simplify / facilitate",
  "خرج": "to graduate / export",

  // ── development & transformation ──────────────────────────────────
  "حول": "to convert / transform",
  "طور": "to develop / modernize",
  "غير": "to change / alter",
  "شكل": "to form / shape",
  "كون": "to form / constitute",

  // ── communication & clarification ─────────────────────────────────
  "وضح": "to clarify / explain",
  "عرف": "to define / introduce",
  "صور": "to photograph / depict",
  "لخص": "to summarize / condense",
  "مثل": "to represent / portray",

  // ── governance & decision-making ──────────────────────────────────
  "حدد": "to determine / specify",
  "نفذ": "to implement / execute",
  "قرر": "to decide / resolve",
  "صدق": "to ratify / endorse",
  "خطط": "to plan / design",

  // ── enablement & support ──────────────────────────────────────────
  "مكن": "to enable / empower",
  "شجع": "to encourage / motivate",
  "ضمن": "to incorporate / include",
  "أهل": "to qualify / certify",
  "جهز": "to equip / prepare",

  // ── influence & social ────────────────────────────────────────────
  "أثر": "to influence / affect",
  "رحب": "to welcome / receive warmly",
  "ركز": "to focus / concentrate",
  "وحد": "to unite / unify",
  "ثبت": "to confirm / prove",
};

export function lookupFormIIGloss(canonicalRoot: string): string | undefined {
  return FORM_II_GLOSSES[canonicalRoot];
}

export function getAllFormIIGlosses(): Record<string, string> {
  return FORM_II_GLOSSES;
}
