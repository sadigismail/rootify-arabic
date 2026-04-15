/**
 * form8lexicon.ts
 * Gloss lookup for Form VIII (اِفْتَعَلَ) verbs.
 * Keys are 3-consonant canonical roots (R1+R2+R3, no prefix/infix).
 * Gloss style: "to [verb]" or "to [verb] / [verb]" (max 2 alternatives).
 *
 * R1-assimilation surface notes:
 *   R1=و/ي/ت  → تّ  (e.g. وفق → اتفق, وجه → اتجه, وصل → اتصل)
 *   R1=ص/ض/ظ  → R1+ط  (emphatic assimilation)
 *   R1=ن      → نت preserved (انتقل, انتخب, انتشر, انتهج)
 *   R1=ل      → لت preserved (التحق)
 */

const FORM_VIII_GLOSSES: Record<string, string> = {
  // ── original 12 ──────────────────────────────────────────────────
  "جمع": "to gather / convene",
  "حرم": "to respect / esteem",
  "قرب": "to approach / draw near",
  "كسب": "to acquire / earn",
  "وفق": "to agree / reach an agreement",
  "خبر": "to test / experience",
  "صنع": "to manufacture / fabricate",
  "لقى": "to meet / encounter",
  "نتج": "to generate / derive",
  "ولج": "to enter / penetrate",
  "وجه": "to head toward / be directed",
  "وصل": "to contact / connect",

  // ── political & civic participation ──────────────────────────────
  "شرك": "to participate / subscribe",
  "نخب": "to elect / vote for",
  "لحق": "to join / affiliate with",
  "نهج": "to follow / pursue a policy",
  "خلف": "to differ / disagree",
  "نشر": "to spread / disseminate",

  // ── cognitive & epistemic ─────────────────────────────────────────
  "جهد": "to strive / exert oneself",
  "قنع": "to be convinced / persuaded",
  "فرض": "to assume / suppose",
  "عزم": "to intend / resolve to",
  "عقد": "to believe / hold the view",
  "قصر": "to limit oneself to / confine to",

  // ── possession & acquisition ──────────────────────────────────────
  "ملك": "to own / possess",
  "بكر": "to innovate / pioneer",

  // ── news & reporting ──────────────────────────────────────────────
  "شمل": "to include / encompass",
  "قحم": "to storm / break into",
  "شغل": "to work / be occupied",
  "نقل": "to move / transfer",

  // ── strategy & monitoring ─────────────────────────────────────────
  "رقب": "to await / monitor",
  "خصر": "to abbreviate / condense",
  "حضن": "to embrace / host",

  "درس": "to study together / learn",
  "ذكر": "to recall / remember",
  "زحم": "to crowd / press together",
};

export function lookupFormVIIIGloss(canonicalRoot: string): string | undefined {
  return FORM_VIII_GLOSSES[canonicalRoot];
}

export function getAllFormVIIIGlosses(): Record<string, string> {
  return FORM_VIII_GLOSSES;
}
