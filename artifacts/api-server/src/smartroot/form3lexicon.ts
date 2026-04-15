/**
 * form3lexicon.ts
 * Gloss lookup for Form III (فَاعَلَ) verbs — directed/reciprocal action.
 * Keys are 3-consonant canonical roots (R1+R2+R3, no ALEF marker).
 * Gloss style: "to [verb]" or "to [verb] / [verb]" (max 2 alternatives).
 */

const FORM_III_GLOSSES: Record<string, string> = {
  // ── original 12 (bug-fixed: "نافس" key → "نفس") ──────────────────
  "سعد": "to help / assist",
  "شهد": "to watch / witness",
  "قبل": "to meet / face",
  "نقش": "to discuss / debate",
  "سفر": "to travel alongside",
  "درس": "to study alongside / share lessons",
  "كتب": "to correspond / write to",
  "عمل": "to work with / collaborate",
  "حرب": "to fight / wage war",
  "رسل": "to correspond / exchange messages",
  "حدث": "to talk with / converse",
  "جلس": "to sit with / accompany",
  "نفس": "to compete / rival",

  // ── political & formal discourse ──────────────────────────────────
  "وفق": "to agree with / concur",
  "فوض": "to negotiate / bargain",
  "نقض": "to contradict / dispute",
  "خطب": "to address / speak to",
  "نظر": "to debate / dispute",
  "طلب": "to seek / demand",
  "وجه": "to face / confront",
  "حسب": "to hold accountable / audit",
  "صرح": "to speak frankly / confront",
  "حور": "to hold a dialogue / converse",

  // ── social & civic ────────────────────────────────────────────────
  "شرك": "to partner / collaborate",
  "دعم": "to support / back",
  "برك": "to congratulate / bless",
  "ودع": "to bid farewell / see off",
  "قتل": "to fight / battle",
  "قطع": "to boycott / sever ties",
  "ربط": "to maintain ties / link",
  "سأل": "to interrogate / question",

  // ── comparative & evaluative ──────────────────────────────────────
  "قرن": "to compare / contrast",
  "قرب": "to approach / come near",
  "لحق": "to pursue / follow",
  "تبع": "to follow up / track",
  "ضعف": "to double / multiply",
  "علج": "to treat / deal with",
  "بحث": "to discuss / deliberate",
};

export function lookupFormIIIGloss(canonicalRoot: string): string | undefined {
  return FORM_III_GLOSSES[canonicalRoot];
}

export function getAllFormIIIGlosses(): Record<string, string> {
  return FORM_III_GLOSSES;
}
