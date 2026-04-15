/**
 * form6lexicon.ts
 * Gloss lookup for Form VI (تَفَاعَلَ) verbs — mutual / reciprocal action.
 * Keys are 3-consonant canonical roots (R1+R2+R3, no TA prefix).
 * Gloss style: "to [verb]" or "to [verb] / [verb]" (max 2 alternatives).
 *
 * Noun-status note: passive participle is "less_common" for all Form VI verbs —
 * the form is inherently reciprocal/intransitive, making passivisation marginal.
 */

const FORM_VI_GLOSSES: Record<string, string> = {
  // ── original 12 ──────────────────────────────────────────────────
  "قبل": "to meet / face one another",
  "نقش": "to discuss / debate together",
  "شور": "to consult / deliberate together",
  "سعد": "to help / cooperate with one another",
  "سبق": "to race / compete with one another",
  "فهم": "to understand / communicate with each other",
  "عرف": "to get acquainted with one another",
  "حدث": "to converse / talk with one another",
  "كتب": "to correspond / write to one another",
  "حمل": "to share a burden / take turns",
  "عون": "to assist one another",
  "بدل": "to exchange / swap with one another",

  // ── civic & political ─────────────────────────────────────────────
  "وصل": "to communicate / stay in contact",
  "وفق": "to reach mutual agreement",
  "عقد": "to enter into mutual agreements",
  "نظر": "to debate one another",
  "حسب": "to settle accounts / audit each other",
  "حكم": "to litigate against one another",
  "نضل": "to struggle / campaign together",
  "شرك": "to participate jointly",

  // ── social interaction ────────────────────────────────────────────
  "عمل": "to interact / deal with one another",
  "نفس": "to compete with one another",
  "قتل": "to fight / battle one another",
  "ضرب": "to exchange blows / clash",
  "حور": "to hold a dialogue / converse",
  "عهد": "to make a mutual pledge",
  "ودع": "to bid farewell / part ways",
  "برز": "to compete / vie with one another",

  // ── solidarity & mutual support ───────────────────────────────────
  "ضمن": "to stand in solidarity / unite",
  "سند": "to support / lean on one another",
  "كمل": "to complement one another",
  "كتف": "to rally together / join forces",
  "رجع": "to consult / reconsider together",

  // ── economics & exchange ──────────────────────────────────────────
  "قسم": "to share / divide among one another",
};

export function lookupFormVIGloss(canonicalRoot: string): string | undefined {
  return FORM_VI_GLOSSES[canonicalRoot];
}

export function getAllFormVIGlosses(): Record<string, string> {
  return FORM_VI_GLOSSES;
}
