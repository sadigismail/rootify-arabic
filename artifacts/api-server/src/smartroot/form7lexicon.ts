/**
 * form7lexicon.ts
 * Gloss lookup for Form VII (اِنْفَعَلَ) verbs — passive / reflexive of Form I.
 * Keys are 3-consonant canonical roots (R1+R2+R3, no اِنْ- prefix).
 * Gloss style: "to [verb]" or "to [verb] / [verb]" (max 2 alternatives).
 *
 * Noun-status note: passive participle is "less_common" for all Form VII verbs —
 * the form is already reflexive-passive; further passivisation is grammatically marginal.
 */

const FORM_VII_GLOSSES: Record<string, string> = {
  // ── original 12 ──────────────────────────────────────────────────
  "كسر": "to be broken / break apart",
  "فتح": "to be opened / open up",
  "قطع": "to be cut off / severed",
  "طلق": "to be released / set free",
  "قلب": "to be overturned / flipped",
  "سحب": "to be withdrawn / pulled out",
  "زلق": "to slip / slide",
  "كشف": "to be uncovered / revealed",
  "صرف": "to be turned away / diverted",
  "بعث": "to spring up / be roused",
  "دفع": "to be pushed / propelled",
  "جمع": "to be gathered / assembled",

  // ── physical & structural collapse ───────────────────────────────
  "فجر": "to explode / burst",
  "هدم": "to collapse / be demolished",
  "قلع": "to be uprooted / pulled out",
  "شطر": "to be split / bisected",
  "فصم": "to be severed / broken apart",
  "خلع": "to be deposed / dislocated",

  // ── political & social ────────────────────────────────────────────
  "فصل": "to be separated / split off",
  "قسم": "to be divided / partitioned",
  "عزل": "to be isolated / sidelined",
  "هزم": "to be defeated / routed",
  "عقد": "to be convened / held",
  "حسم": "to be resolved / settled",
  "برم": "to be concluded / finalized",

  // ── enrollment & participation ────────────────────────────────────
  "خرط": "to join / enroll",

  // ── natural & economic ────────────────────────────────────────────
  "خفض": "to drop / decrease",
  "حدر": "to flow down / descend",
  "غمر": "to be submerged / overwhelmed",
  "سرب": "to leak out / seep through",
  "بثق": "to gush / flow forth",

  // ── psychological ─────────────────────────────────────────────────
  "بهر": "to be dazzled / amazed",
};

export function lookupFormVIIGloss(canonicalRoot: string): string | undefined {
  return FORM_VII_GLOSSES[canonicalRoot];
}

export function getAllFormVIIGlosses(): Record<string, string> {
  return FORM_VII_GLOSSES;
}
