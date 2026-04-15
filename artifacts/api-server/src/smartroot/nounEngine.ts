/**
 * nounEngine.ts
 * Returns masdar, active participle, and passive participle for a root.
 * Prefers lexicon-stored values; falls back to rule-generated forms.
 * Each form carries a `status` field indicating reliability:
 *   "natural"        — pattern is regular and well-attested for this form
 *   "less_common"    — pattern is formally valid but less predictable / seldom used
 *   "lexicon_backed" — value was retrieved from a hand-verified lexicon
 */

import type { RootType } from "./rootClassifier.js";
import type { LexiconEntry } from "./lexicon.js";
import { recoverRadicals, isWeak, getWeakCategory } from "./weakVerbEngine.js";

// Short vowel diacritics
const FATHA  = "\u064E";
const KASRA  = "\u0650";
const DAMMA  = "\u064F";
const SUKUN  = "\u0652";
const SHADDA = "\u0651";
const ALEF   = "\u0627";
const WAW    = "\u0648";
const YA     = "\u064A";
const TA     = "\u062A"; // ت
const MIM    = "\u0645"; // م
const TA_M   = "\u0629"; // ة  (ta marbuta — used in Form III masdar مُفَاعَلَة)
const HAMZA_BELOW = "\u0625"; // إ (hamza below alef — Form IV masdar إِفْعَال)
const HAMZA_ON_YA = "\u0626"; // ئ (hamza seated on ya — used in فَائِل for hollow verbs)

// ── Status type ──────────────────────────────────────────────────

export type NounFieldStatus = "natural" | "less_common" | "lexicon_backed";

export interface NounStatus {
  masdar:      NounFieldStatus;
  activePart:  NounFieldStatus;
  passivePart: NounFieldStatus;
}

export interface MasdarInfo {
  form: string;
  status: NounFieldStatus;
  common: boolean;
}

export interface NounForms {
  masdar:      string;
  activePart:  string;
  passivePart: string;
  source:      "lexicon" | "rule";
  status:      NounStatus;
  masdars:     MasdarInfo[];
}

// ── Status computation ────────────────────────────────────────────

/**
 * Compute the reliability status of each rule-generated noun form.
 *
 * Design rationale:
 * - Forms II–IV, VIII, X have highly regular masdar / AP / PP patterns → "natural"
 * - Form V (reflexive of II) and Form VI (reciprocal) are inherently
 *   intransitive/reflexive, so a passive participle is structurally valid but
 *   rarely needed in practice → passivePart: "less_common"
 * - Form VII (passive-reflexive) cannot logically be passivised again, so its
 *   PP is grammatically marginal → passivePart: "less_common"
 * - Form I masdar is highly root-specific (many competing patterns); the rule
 *   yields just one candidate that may not be the most common form for the given
 *   root → masdar: "less_common"; AP فَاعِل for regular/assimilated is reliable;
 *   hollow, defective, and doubled forms involve simplified spelling → "less_common"
 */
function computeStatus(type: RootType): NounStatus {
  switch (type) {
    case "form_x":
      return { masdar: "natural", activePart: "natural", passivePart: "natural" };
    case "form_viii":
      return { masdar: "natural", activePart: "natural", passivePart: "natural" };
    case "form_vii":
      return { masdar: "natural", activePart: "natural", passivePart: "less_common" };
    case "form_vi":
      return { masdar: "natural", activePart: "natural", passivePart: "less_common" };
    case "form_v":
      return { masdar: "natural", activePart: "natural", passivePart: "less_common" };
    case "form_iv":
      return { masdar: "natural", activePart: "natural", passivePart: "natural" };
    case "form_iii":
      return { masdar: "natural", activePart: "natural", passivePart: "natural" };
    case "form_ii":
      return { masdar: "natural", activePart: "natural", passivePart: "natural" };
    // Form I — masdar is unpredictable; AP فَاعِل is reliable only for regular/assimilated
    case "regular":
    case "assimilated":
      return { masdar: "less_common", activePart: "natural", passivePart: "natural" };
    case "hollow_waw":
    case "hollow_ya":
      return { masdar: "less_common", activePart: "natural", passivePart: "natural" };
    case "defective_waw":
    case "defective_ya":
      return { masdar: "less_common", activePart: "less_common", passivePart: "less_common" };
    case "doubled":
      return { masdar: "less_common", activePart: "less_common", passivePart: "less_common" };
    default:
      return { masdar: "less_common", activePart: "less_common", passivePart: "less_common" };
  }
}

const LEXICON_BACKED: NounStatus = {
  masdar:      "lexicon_backed",
  activePart:  "lexicon_backed",
  passivePart: "lexicon_backed",
};

// ── Form VIII infix helper ────────────────────────────────────────

/**
 * Returns the consonant cluster for the Form VIII infix, mirroring the
 * conjugationEngine assimilation rules (kept in sync manually).
 *   R1=و/ي/ت  → تّ  (WAW/YA/TA assimilation — R1 merges into infixed TA)
 *   R1=ص/ض/ظ  → R1+ْ+ط  (emphatic assimilation — infixed TA → ط)
 *   R1=ط      → طّ  (double emphatic)
 *   default   → R1+ْ+ت
 */
function vIIIInfixNoun(r1: string): string {
  const EMPHATICS = new Set(["\u0635", "\u0636", "\u0638"]); // ص, ض, ظ
  const TA_EMP    = "\u0637";                                 // ط
  const VOICED_DENTALS = new Set(["\u062F", "\u0630", "\u0632"]); // د, ذ, ز
  const DAL = "\u062F";                                       // د
  if (r1 === WAW || r1 === YA || r1 === TA) return TA + SHADDA;
  if (EMPHATICS.has(r1)) return r1 + SUKUN + TA_EMP;
  if (r1 === TA_EMP) return TA_EMP + SHADDA;
  if (VOICED_DENTALS.has(r1)) return r1 + SUKUN + DAL;
  return r1 + SUKUN + TA;
}

// ── Rule-generated fallbacks ─────────────────────────────────────

function ruleMasdar(type: RootType, r1: string, r2: string, r3: string): string {
  switch (type) {
    // ── Form X: اِسْتِفْعَال ─────────────────────────────────────────
    // اِسْتِعْمَال = ALEF+K + SIN+S + TA+K + R1+S + R2+F + ALEF + R3
    // Note kasra on TA (not fatha as in past/imperative).
    case "form_x": {
      const SIN_N = "\u0633"; // س
      return ALEF + KASRA + SIN_N + SUKUN + TA + KASRA + r1 + SUKUN + r2 + FATHA + ALEF + r3;
    }
    // ── Form VIII: اِفْتِعَال ────────────────────────────────────────
    case "form_viii": {
      // اِ + infix + kasra + R2 + fatha + ALEF + R3
      // Infix: R1+sukun+ت (standard) or تّ (WAW/YA/TA assimilation) etc.
      const infix8 = vIIIInfixNoun(r1);
      return ALEF + KASRA + infix8 + KASRA + r2 + FATHA + ALEF + r3;
    }
    // ── Form VII: اِنْفِعَال ────────────────────────────────────────
    case "form_vii":
      // اِ + نْ + R1+kasra + R2+fatha + ALEF + R3  (اِنْكِسَار, اِنْفِتَاح)
      return ALEF + KASRA + "نْ" + r1 + KASRA + r2 + FATHA + ALEF + r3;
    // ── Form VI: تَفَاعُل ───────────────────────────────────────────
    case "form_vi":
      // TA+fatha + R1+fatha + ALEF + R2+DAMMA + R3  (تَقَابُل, تَنَاقُش)
      return TA + FATHA + r1 + FATHA + ALEF + r2 + DAMMA + r3;
    // ── Form V: تَفَعُّل ────────────────────────────────────────────
    case "form_v":
      // TA+fatha + R1+fatha + R2+shadda+DAMMA + R3  (تَعَلُّم, تَدَرُّب)
      return TA + FATHA + r1 + FATHA + r2 + SHADDA + DAMMA + r3;
    // ── Form IV: إِفْعَال ───────────────────────────────────────────
    case "form_iv":
      // إِ + R1 + sukun + R2 + fatha + alef + R3  (إِكْرَام)
      return HAMZA_BELOW + KASRA + r1 + SUKUN + r2 + FATHA + ALEF + r3;
    // ── Form III: مُفَاعَلَة ───────────────────────────────────────
    case "form_iii":
      // مُ + R1 + fatha + alef + R2 + fatha + R3 + fatha + ة  (مُسَاعَدَة)
      return MIM + DAMMA + r1 + FATHA + ALEF + r2 + FATHA + r3 + FATHA + TA_M;
    // ── Form II: تَفْعِيل ──────────────────────────────────────────
    case "form_ii":
      // تَ + R1 + sukun + R2 + kasra + ya + R3  (تَدْرِيس)
      return TA + FATHA + r1 + SUKUN + r2 + KASRA + YA + r3;
    // ── Form I ────────────────────────────────────────────────────
    case "regular":
    case "assimilated":
      // فُعُول pattern (most common for transitive)
      return r1 + DAMMA + r2 + DAMMA + WAW + r3;
    case "hollow_waw":
    case "hollow_ya":
      // فَعْل pattern
      return r1 + FATHA + r2 + SUKUN + r3;
    case "defective_waw":
      return r1 + FATHA + r2 + FATHA + WAW;
    case "defective_ya":
      return r1 + FATHA + r2 + SUKUN + YA;
    case "doubled":
      return r1 + FATHA + r2 + SHADDA;
    default:
      return r1 + FATHA + r2 + FATHA + r3;
  }
}

function ruleActivePart(type: RootType, r1: string, r2: string, r3: string): string {
  switch (type) {
    // ── Form X: مُسْتَفْعِل ──────────────────────────────────────────
    // مُسْتَعْمِل = MIM+D + SIN+S + TA+F + R1+S + R2+K + R3
    case "form_x": {
      const SIN_N = "\u0633";
      return MIM + DAMMA + SIN_N + SUKUN + TA + FATHA + r1 + SUKUN + r2 + KASRA + r3;
    }
    // ── Form VIII: مُفْتَعِل ────────────────────────────────────────
    case "form_viii": {
      // مُ + infix + fatha + R2 + kasra + R3
      const infix8 = vIIIInfixNoun(r1);
      return MIM + DAMMA + infix8 + FATHA + r2 + KASRA + r3;
    }
    // ── Form VII: مُنْفَعِل ─────────────────────────────────────────
    case "form_vii":
      // مُ + نْ + R1+fatha + R2+kasra + R3  (مُنْكَسِر, مُنْفَتِح)
      return MIM + DAMMA + "نْ" + r1 + FATHA + r2 + KASRA + r3;
    // ── Form VI: مُتَفَاعِل ─────────────────────────────────────────
    case "form_vi":
      // مُ + TA+fatha + R1+fatha + ALEF + R2+kasra + R3  (مُتَقَابِل)
      return MIM + DAMMA + TA + FATHA + r1 + FATHA + ALEF + r2 + KASRA + r3;
    // ── Form V: مُتَفَعِّل ─────────────────────────────────────────
    case "form_v":
      // مُ + TA+fatha + R1+fatha + R2+shadda+KASRA + R3  (مُتَعَلِّم)
      return MIM + DAMMA + TA + FATHA + r1 + FATHA + r2 + SHADDA + KASRA + r3;
    // ── Form IV: مُفْعِل ───────────────────────────────────────────
    case "form_iv":
      // مُ + R1 + sukun + R2 + kasra + R3  (مُكْرِم)
      return MIM + DAMMA + r1 + SUKUN + r2 + KASRA + r3;
    // ── Form III: مُفَاعِل ─────────────────────────────────────────
    case "form_iii":
      // مُ + R1 + fatha + alef + R2 + kasra + R3  (مُسَاعِد)
      return MIM + DAMMA + r1 + FATHA + ALEF + r2 + KASRA + r3;
    // ── Form II: مُفَعِّل ──────────────────────────────────────────
    case "form_ii":
      // مُ + R1 + fatha + R2 + shadda + kasra + R3  (مُدَرِّس)
      return MIM + DAMMA + r1 + FATHA + r2 + SHADDA + KASRA + r3;
    // ── Form I ────────────────────────────────────────────────────
    case "regular":
    case "assimilated":
      return r1 + FATHA + ALEF + r2 + KASRA + r3;
    case "hollow_waw":
    case "hollow_ya":
      return r1 + FATHA + ALEF + HAMZA_ON_YA + KASRA + r3;
    case "defective_waw":
    case "defective_ya": {
      const mid = (r2 === "\u0623" || r2 === "\u0625" || r2 === "\u0624") ? "\u0621" : r2;
      return r1 + FATHA + ALEF + mid + KASRA + "\u064D";
    }
    case "doubled":
      return r1 + FATHA + ALEF + r2 + SHADDA;
    default:
      return r1 + FATHA + ALEF + r2 + KASRA + r3;
  }
}

function rulePassivePart(type: RootType, r1: string, r2: string, r3: string): string {
  switch (type) {
    // ── Form X: مُسْتَفْعَل ──────────────────────────────────────────
    // Very commonly used: مُسْتَخْدَم = used/utilized, مُسْتَعْمَل = used/employed,
    // مُسْتَخْرَج = extracted, مُسْتَقْبَل = received/future, مُسْتَحْسَن = approved.
    // MIM+D + SIN+S + TA+F + R1+S + R2+F + R3 (fatha on R2, distinguishing AP from PP)
    case "form_x": {
      const SIN_N = "\u0633";
      return MIM + DAMMA + SIN_N + SUKUN + TA + FATHA + r1 + SUKUN + r2 + FATHA + r3;
    }
    // ── Form VIII: مُفْتَعَل ────────────────────────────────────────
    // Very commonly used (مُحْتَرَم = respected, مُكْتَسَب = acquired, مُتَّفَق = agreed-upon)
    case "form_viii": {
      const infix8 = vIIIInfixNoun(r1);
      return MIM + DAMMA + infix8 + FATHA + r2 + FATHA + r3;
    }
    // ── Form VII: مُنْفَعَل ─────────────────────────────────────────
    // Structurally valid (e.g. مُنْكَسَر = broken, مُنْفَتِح = open-minded)
    // even though Form VII verbs are inherently intransitive.
    case "form_vii":
      // مُ + نْ + R1+fatha + R2+fatha + R3  (مُنْكَسَر)
      return MIM + DAMMA + "نْ" + r1 + FATHA + r2 + FATHA + r3;
    // ── Form VI: مُتَفَاعَل ─────────────────────────────────────────
    case "form_vi":
      // مُ + TA+fatha + R1+fatha + ALEF + R2+fatha + R3  (مُتَقَابَل)
      return MIM + DAMMA + TA + FATHA + r1 + FATHA + ALEF + r2 + FATHA + r3;
    // ── Form V: مُتَفَعَّل ─────────────────────────────────────────
    case "form_v":
      // مُ + TA+fatha + R1+fatha + R2+shadda+FATHA + R3  (مُتَعَلَّم)
      return MIM + DAMMA + TA + FATHA + r1 + FATHA + r2 + SHADDA + FATHA + r3;
    // ── Form IV: مُفْعَل ───────────────────────────────────────────
    case "form_iv":
      // مُ + R1 + sukun + R2 + fatha + R3  (مُكْرَم)
      return MIM + DAMMA + r1 + SUKUN + r2 + FATHA + r3;
    // ── Form III: مُفَاعَل ─────────────────────────────────────────
    case "form_iii":
      // مُ + R1 + fatha + alef + R2 + fatha + R3  (مُسَاعَد)
      return MIM + DAMMA + r1 + FATHA + ALEF + r2 + FATHA + r3;
    // ── Form II: مُفَعَّل ──────────────────────────────────────────
    case "form_ii":
      // مُ + R1 + fatha + R2 + shadda + fatha + R3  (مُدَرَّس)
      return MIM + DAMMA + r1 + FATHA + r2 + SHADDA + FATHA + r3;
    // ── Form I ────────────────────────────────────────────────────
    case "regular":
    case "assimilated":
      return "مَ" + r1 + SUKUN + r2 + DAMMA + WAW + r3;
    case "hollow_waw":
      return MIM + FATHA + r1 + DAMMA + WAW + r3;
    case "hollow_ya":
      return MIM + FATHA + r1 + KASRA + YA + r3;
    case "defective_waw":
      return "مَ" + r1 + SUKUN + r2 + DAMMA + WAW + SHADDA;
    case "defective_ya":
      return "مَ" + r1 + SUKUN + r2 + KASRA + YA + SHADDA;
    case "doubled":
      return "مَ" + r1 + SUKUN + r2 + DAMMA + WAW + r3;
    default:
      return "مَ" + r1 + SUKUN + r2 + DAMMA + WAW + r3;
  }
}

// ── Public API ───────────────────────────────────────────────────

export interface Form1MasdarInput {
  form: string;
  common: boolean;
}

export function getNounForms(
  type: RootType,
  r1: string,
  r2: string,
  r3: string,
  lexEntry: LexiconEntry | undefined,
  form1Masdars?: Form1MasdarInput[],
): NounForms {
  const derivedFormTypes = new Set([
    "form_x", "form_viii", "form_vii", "form_vi",
    "form_v", "form_iv", "form_iii", "form_ii",
  ]);
  if (derivedFormTypes.has(type)) {
    const m = ruleMasdar(type, r1, r2, r3);
    return {
      masdar:      m,
      activePart:  ruleActivePart(type, r1, r2, r3),
      passivePart: rulePassivePart(type, r1, r2, r3),
      source: "rule",
      status: computeStatus(type),
      masdars: [{ form: m, status: "natural", common: true }],
    };
  }

  if (form1Masdars && form1Masdars.length > 0) {
    const primary = form1Masdars[0]!.form;
    const masdarInfos: MasdarInfo[] = form1Masdars.map(m => ({
      form: m.form,
      status: "lexicon_backed" as NounFieldStatus,
      common: m.common,
    }));
    if (type === "hollow_waw" || type === "hollow_ya") {
      return {
        masdar:      primary,
        activePart:  ruleActivePart(type, r1, r2, r3),
        passivePart: rulePassivePart(type, r1, r2, r3),
        source: "lexicon",
        status: { masdar: "lexicon_backed", activePart: "natural", passivePart: "natural" },
        masdars: masdarInfos,
      };
    }
    return {
      masdar:      primary,
      activePart:  ruleActivePart(type, r1, r2, r3),
      passivePart: rulePassivePart(type, r1, r2, r3),
      source: "lexicon",
      status: { masdar: "lexicon_backed", activePart: computeStatus(type).activePart, passivePart: computeStatus(type).passivePart },
      masdars: masdarInfos,
    };
  }

  if (lexEntry) {
    if (type === "hollow_waw" || type === "hollow_ya") {
      return {
        masdar:      lexEntry.masdar,
        activePart:  ruleActivePart(type, r1, r2, r3),
        passivePart: rulePassivePart(type, r1, r2, r3),
        source: "lexicon",
        status: { masdar: "lexicon_backed", activePart: "natural", passivePart: "natural" },
        masdars: [{ form: lexEntry.masdar, status: "lexicon_backed", common: true }],
      };
    }
    return {
      masdar:      lexEntry.masdar,
      activePart:  lexEntry.activePart,
      passivePart: lexEntry.passivePart,
      source: "lexicon",
      status: LEXICON_BACKED,
      masdars: [{ form: lexEntry.masdar, status: "lexicon_backed", common: true }],
    };
  }

  const m = ruleMasdar(type, r1, r2, r3);
  return {
    masdar:      m,
    activePart:  ruleActivePart(type, r1, r2, r3),
    passivePart: rulePassivePart(type, r1, r2, r3),
    source: "rule",
    status: computeStatus(type),
    masdars: [{ form: m, status: computeStatus(type).masdar, common: true }],
  };
}
