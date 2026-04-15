/**
 * rootClassifier.ts
 * Classifies a triliteral Arabic root into one of the supported form types.
 *
 * Detection order (auto mode):
 *   1. Form IV — 4-char input, position 0 is ALEF/hamza (أكرم → [ك,ر,م])
 *   2. Form V  — 4-char input, position 0 is TA (ت), position 1 is NOT ALEF
 *                MUST precede Form II — Form V inputs (e.g. تعلّم) carry shadda
 *                and would otherwise be misclassified as Form II of root تعم.
 *   3. Form III — 4-char input, position 1 is ALEF (ساعد → [س,ع,د])
 *   4. Form II  — geminated R2 via shadda (درّس → [د,ر,س])
 *   5. Form I   — standard triliteral (كتب, قال, دعا …)
 *
 * When forceMeasure is provided (1–5), heuristic detection is bypassed:
 *   - The canonical three radicals are extracted from the input
 *   - The appropriate form type is forced regardless of surface shape
 *   - This enables "bare root + measure selector" input mode
 */

import { expandRoot, detectFormII, detectFormIII, detectFormIV, detectFormV, detectFormVI, detectFormVII, detectFormVIII, detectFormX } from "./normalization.js";

export type RootType =
  | "regular"
  | "assimilated"
  | "hollow_waw"
  | "hollow_ya"
  | "defective_waw"
  | "defective_ya"
  | "doubled"
  | "hamzated"
  | "form_ii"
  | "form_iii"
  | "form_iv"
  | "form_v"
  | "form_vi"
  | "form_vii"
  | "form_viii"
  | "form_x";

export interface ClassificationResult {
  normalized: string;   // 3-letter canonical root (used as lexicon key)
  r1: string;
  r2: string;
  r3: string;
  type: RootType;
  form: number;         // 1 = Form I, 2 = Form II, 3 = Form III, 4 = Form IV
  explanation: string;
}

const WAW  = "\u0648"; // و
const YA   = "\u064A"; // ي
const ALEF = "\u0627"; // ا
const HAMZA_SEATS = new Set(["\u0621", "\u0623", "\u0625", "\u0624", "\u0626"]);

// ── Forced-measure classification ────────────────────────────────

function classifyFormIFromTriple(
  r1: string, r2: string, r3: string,
): { type: RootType; explanation: string } {
  let type: RootType;
  let explanation: string;

  if (r2 === r3) {
    type = "doubled";
    explanation = `The root is doubled (مضاعف) because the second radical (${r2}) equals the third radical (${r3}).`;
  } else if (r1 === WAW) {
    type = "assimilated";
    explanation = `The root is assimilated (مثال) because the first radical is واو (${r1}), which typically drops in present tense.`;
  } else if (r2 === WAW) {
    type = "hollow_waw";
    explanation = `The root is hollow-waw (أجوف واوي) because the second radical is واو (${r2}), which becomes an alef in many surface forms.`;
  } else if (r2 === YA) {
    type = "hollow_ya";
    explanation = `The root is hollow-ya (أجوف يائي) because the second radical is ياء (${r2}), which alternates with alef and ya in surface forms.`;
  } else if (r2 === ALEF) {
    type = "hollow_waw";
    explanation = `The root is hollow (أجوف) because the second radical appears as an alef (${r2}) in the surface form, indicating a medial weak letter (واو or ياء).`;
  } else if (r3 === WAW) {
    type = "defective_waw";
    explanation = `The root is defective-waw (ناقص واوي) because the third radical is واو (${r3}), which changes in conjugation endings.`;
  } else if (r3 === YA) {
    type = "defective_ya";
    explanation = `The root is defective-ya (ناقص يائي) because the third radical is ياء (${r3}), which changes in conjugation endings.`;
  } else if (r3 === ALEF) {
    type = "defective_waw";
    explanation = `The root is defective (ناقص) because the third radical appears as an alef (${r3}) in the surface form, indicating a final weak letter (واو or ياء).`;
  } else if (HAMZA_SEATS.has(r1) || HAMZA_SEATS.has(r2) || HAMZA_SEATS.has(r3)) {
    const pos = HAMZA_SEATS.has(r1) ? "initial" : HAMZA_SEATS.has(r2) ? "medial" : "final";
    type = "hamzated";
    explanation = `The root is hamzated (مهموز) because the ${pos} radical carries a hamza, which affects spelling in certain conjugation forms.`;
  } else {
    type = "regular";
    explanation = `The root is regular (صحيح سالم) — all three radicals (${r1}, ${r2}, ${r3}) are stable consonants with no weak letters.`;
  }

  return { type, explanation };
}

/**
 * Classify a root with an explicit measure override.
 * Extracts the 3 canonical radicals from the input regardless of surface shape,
 * then forces the specified form type.
 */
function classifyForced(raw: string, forceMeasure: number): ClassificationResult | null {
  if (forceMeasure === 10) {
    const detected = detectFormX(raw) ?? expandRoot(raw);
    if (!detected) return null;
    const [r1, r2, r3] = detected;
    return {
      normalized: r1 + r2 + r3,
      r1, r2, r3,
      type: "form_x",
      form: 10,
      explanation:
        `Form X (اِسْتَفْعَلَ pattern): the استـ prefix before R1 (${r1}), forced by measure selection.`,
    };
  }

  if (forceMeasure === 8) {
    const detected = detectFormVIII(raw) ?? expandRoot(raw);
    if (!detected) return null;
    const [r1, r2, r3] = detected;
    return {
      normalized: r1 + r2 + r3,
      r1, r2, r3,
      type: "form_viii",
      form: 8,
      explanation:
        `Form VIII (اِفْتَعَلَ pattern): a TA infix is inserted after the first radical (${r1}), forced by measure selection.`,
    };
  }

  if (forceMeasure === 7) {
    const detected = detectFormVII(raw) ?? expandRoot(raw);
    if (!detected) return null;
    const [r1, r2, r3] = detected;
    return {
      normalized: r1 + r2 + r3,
      r1, r2, r3,
      type: "form_vii",
      form: 7,
      explanation:
        `Form VII (اِنْفَعَلَ pattern): NUN+ALEF prefix before (${r1}), forced by measure selection.`,
    };
  }

  if (forceMeasure === 6) {
    const detected = detectFormVI(raw) ?? expandRoot(raw);
    if (!detected) return null;
    const [r1, r2, r3] = detected;
    return {
      normalized: r1 + r2 + r3,
      r1, r2, r3,
      type: "form_vi",
      form: 6,
      explanation:
        `Form VI (تَفَاعَلَ pattern): TA prefix + long ALEF between (${r1}) and (${r2}), forced by measure selection.`,
    };
  }

  if (forceMeasure === 5) {
    const detected = detectFormV(raw) ?? expandRoot(raw);
    if (!detected) return null;
    const [r1, r2, r3] = detected;
    return {
      normalized: r1 + r2 + r3,
      r1, r2, r3,
      type: "form_v",
      form: 5,
      explanation:
        `Form V (تَفَعَّلَ pattern): TA prefix + geminated (${r2}), forced by measure selection.`,
    };
  }

  if (forceMeasure === 4) {
    const detected = detectFormIV(raw) ?? expandRoot(raw);
    if (!detected) return null;
    const [r1, r2, r3] = detected;
    return {
      normalized: r1 + r2 + r3,
      r1, r2, r3,
      type: "form_iv",
      form: 4,
      explanation:
        `Form IV (أَفْعَلَ pattern): hamza prefix before (${r1}), forced by measure selection.`,
    };
  }

  if (forceMeasure === 3) {
    const detected = detectFormIII(raw) ?? expandRoot(raw);
    if (!detected) return null;
    const [r1, r2, r3] = detected;
    return {
      normalized: r1 + r2 + r3,
      r1, r2, r3,
      type: "form_iii",
      form: 3,
      explanation:
        `Form III (فَاعَلَ pattern): long ALEF between (${r1}) and (${r2}), forced by measure selection.`,
    };
  }

  if (forceMeasure === 2) {
    const detected = detectFormII(raw) ?? expandRoot(raw);
    if (!detected) return null;
    const [r1, r2, r3] = detected;
    return {
      normalized: r1 + r2 + r3,
      r1, r2, r3,
      type: "form_ii",
      form: 2,
      explanation:
        `Form II (فَعَّلَ pattern): (${r2}) is geminated, forced by measure selection.`,
    };
  }

  // Forced Form I: extract radicals and classify normally
  const expanded = expandRoot(raw);
  if (!expanded) return null;
  const [r1, r2, r3] = expanded;
  const { type, explanation } = classifyFormIFromTriple(r1, r2, r3);
  return { normalized: r1 + r2 + r3, r1, r2, r3, type, form: 1, explanation };
}

// ── Auto detection ────────────────────────────────────────────────

/**
 * Classify a root string, returning form, type, and canonical radicals.
 *
 * @param raw          The raw Arabic input (surface form or bare root).
 * @param forceMeasure Optional override: 1–4 forces the form, skipping heuristics.
 *                     Undefined = auto-detect using surface analysis.
 */
export function classifyRoot(raw: string, forceMeasure?: number): ClassificationResult | null {

  // ── Forced measure: bypass all heuristics ────────────────────────
  if (forceMeasure !== undefined) {
    return classifyForced(raw, forceMeasure);
  }

  // ── Form X: 6-char (ALEF+SIN+TA+R1+R2+R3) OR 5-char doubled-root ─
  // MUST precede Form VIII: the 5-char doubled-root Form X surface
  // (ا+س+ت+R1+R2, where R2=R3) has pos[2]=TA, which would be misread by
  // detectFormVIII as Form VIII with R1=SIN (e.g. استمر → wrongly Form VIII
  // of سمر instead of Form X of مرر).  The 6-char standard Form X case
  // is unique and would not conflict with any other detector, but detecting
  // Form X first keeps the order consistent and avoids future edge cases.
  const formX = detectFormX(raw);
  if (formX) {
    const [r1, r2, r3] = formX;
    const normalized = r1 + r2 + r3;
    return {
      normalized,
      r1, r2, r3,
      type: "form_x",
      form: 10,
      explanation:
        `Form X (اِسْتَفْعَلَ pattern): the استـ prefix (ALEF+kasra + SIN+sukun + TA+fatha) before the first radical (${r1}), ` +
        `expressing "to deem X", "to request X", or "to seek X" from the base meaning.`,
    };
  }

  // ── Form VIII: 5-char (pos 0=ALEF, pos 2=TA) OR 4-char WAW-assimilation ──
  // MUST precede Form IV: the 4-char WAW-assimilation case (e.g. اتفق from وفق)
  // has the same surface shape as a Form IV verb (ALEF + 3 consonants) and
  // would be incorrectly swallowed by detectFormIV if checked second.
  // MUST also precede Form VII: the 5-char case where R1=NUN (e.g. انتقل from نقل)
  // shares the ا+ن prefix with Form VII.
  const formVIII = detectFormVIII(raw);
  if (formVIII) {
    const [r1, r2, r3] = formVIII;
    const normalized = r1 + r2 + r3;
    return {
      normalized,
      r1, r2, r3,
      type: "form_viii",
      form: 8,
      explanation:
        `Form VIII (اِفْتَعَلَ pattern): a TA infix inserted after the first radical (${r1}), ` +
        `expressing acquisition, reflexive-transitional, or approach to a state.`,
    };
  }

  // ── Form IV: 4-char, position 0 is ALEF/hamza (أكرم → [ك,ر,م]) ──
  const formIV = detectFormIV(raw);
  if (formIV) {
    const [r1, r2, r3] = formIV;
    const normalized = r1 + r2 + r3;
    return {
      normalized,
      r1, r2, r3,
      type: "form_iv",
      form: 4,
      explanation:
        `Form IV (أَفْعَلَ pattern): the hamza prefix before the first radical (${r1}) ` +
        `makes the verb causative or transitive.`,
    };
  }

  // ── Form VII: 5-char, pos 0 = ALEF (ا), pos 1 = NUN (ن) (انكسر → [ك,س,ر]) ──
  const formVII = detectFormVII(raw);
  if (formVII) {
    const [r1, r2, r3] = formVII;
    const normalized = r1 + r2 + r3;
    return {
      normalized,
      r1, r2, r3,
      type: "form_vii",
      form: 7,
      explanation:
        `Form VII (اِنْفَعَلَ pattern): the NUN-ALEF prefix before the first radical (${r1}) ` +
        `makes the verb reflexive or passive — the subject undergoes the action.`,
    };
  }

  // ── Form VI: 5-char, pos 0 = TA (ت), pos 2 = ALEF (تقابل → [ق,ب,ل]) ──
  const formVI = detectFormVI(raw);
  if (formVI) {
    const [r1, r2, r3] = formVI;
    const normalized = r1 + r2 + r3;
    return {
      normalized,
      r1, r2, r3,
      type: "form_vi",
      form: 6,
      explanation:
        `Form VI (تَفَاعَلَ pattern): TA prefix + long ALEF between the first radical (${r1}) ` +
        `and the second radical (${r2}), conveying a reciprocal or mutual action between parties.`,
    };
  }

  // ── Form V: 4-char, pos 0 = TA (ت), pos 1 ≠ ALEF (تعلّم → [ع,ل,م]) ──
  // MUST precede Form II — Form V inputs carry shadda on R2 and would be
  // misclassified as Form II of a different (wrong) root without this guard.
  const formV = detectFormV(raw);
  if (formV) {
    const [r1, r2, r3] = formV;
    const normalized = r1 + r2 + r3;
    return {
      normalized,
      r1, r2, r3,
      type: "form_v",
      form: 5,
      explanation:
        `Form V (تَفَعَّلَ pattern): TA prefix + geminated second radical (${r2}) — ` +
        `the reflexive/passive of Form II, often conveying a self-directed action.`,
    };
  }

  // ── Form III: 4-char, position 1 is ALEF (ساعد → [س,ع,د]) ────────
  const formIII = detectFormIII(raw);
  if (formIII) {
    const [r1, r2, r3] = formIII;
    const normalized = r1 + r2 + r3;
    return {
      normalized,
      r1, r2, r3,
      type: "form_iii",
      form: 3,
      explanation:
        `Form III (فَاعَلَ pattern): a long ALEF is inserted between the first radical (${r1}) ` +
        `and the second radical (${r2}), conveying a reciprocal or intensive action.`,
    };
  }

  // ── Form II: geminated R2 via shadda (درّس → [د,ر,س]) ────────────
  const formII = detectFormII(raw);
  if (formII) {
    const [r1, r2, r3] = formII;
    const normalized = r1 + r2 + r3;
    return {
      normalized,
      r1, r2, r3,
      type: "form_ii",
      form: 2,
      explanation:
        `Form II (فَعَّلَ pattern): the second radical (${r2}) is geminated ` +
        `(doubled by shadda), intensifying or causativizing the base meaning.`,
    };
  }

  // ── Form I ─────────────────────────────────────────────────────────
  const expanded = expandRoot(raw);
  if (!expanded) return null;

  const [r1, r2, r3] = expanded;
  const { type, explanation } = classifyFormIFromTriple(r1, r2, r3);
  return { normalized: expanded.join(""), r1, r2, r3, type, form: 1, explanation };
}
