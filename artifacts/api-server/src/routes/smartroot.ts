/**
 * smartroot.ts
 * Express router for the SmartRoot Arabic v1 morphology engine.
 *
 * GET  /api/smartroot          → simple HTML test page
 * POST /api/smartroot/generate → JSON morphology response
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { isArabic } from "../smartroot/normalization.js";
import { classifyRoot, type RootType } from "../smartroot/rootClassifier.js";
import { lookupRoot } from "../smartroot/lexicon.js";
import { getFormILexiconEntry, resolveInflectedForm, normalizeInput, searchSuggestions } from "../smartroot/form1Lexicon.js";
import { searchEnglish, searchEnglishGrouped } from "../smartroot/englishSearch.js";
import { lookupFormIIGloss } from "../smartroot/form2lexicon.js";
import { lookupFormIIIGloss } from "../smartroot/form3lexicon.js";
import { lookupFormIVGloss } from "../smartroot/form4lexicon.js";
import { lookupFormVGloss } from "../smartroot/form5lexicon.js";
import { lookupFormVIGloss } from "../smartroot/form6lexicon.js";
import { lookupFormVIIGloss } from "../smartroot/form7lexicon.js";
import { lookupFormVIIIGloss } from "../smartroot/form8lexicon.js";
import { lookupFormXGloss } from "../smartroot/form10lexicon.js";
import { conjugate } from "../smartroot/conjugationEngine.js";
import { conjugatePassive } from "../smartroot/passiveConjugation.js";
import { getDerivedForms, FORM_MEANINGS } from "../smartroot/derivedForms.js";
import { getNounForms } from "../smartroot/nounEngine.js";
import { explain, type SampleForms } from "../smartroot/explanationEngine.js";
import { transliterate } from "../smartroot/transliterate.js";
import { getExaggerationNouns, getPlaceTimeNouns, getInstrumentNouns } from "../smartroot/derivedNouns.js";
import { lookupRich, getTransitivity } from "../smartroot/richLexicon.js";
import { analyzeToken, classifyVerbClass, checkInputSafety, type SafetyResult } from "../smartroot/analyzeToken.js";
import { parseSentenceWord } from "../smartroot/sentenceParser.js";
import { recoverRadicals } from "../smartroot/weakVerbEngine.js";
import { USAGE } from "../smartroot/usageData.js";

const router: IRouter = Router();

const ALEF = "\u0627";
const WAW  = "\u0648";

const GenerateRequestSchema = z.object({
  root:    z.string().min(1, "root is required"),
  measure: z.enum(["auto", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "X"]).optional().default("auto"),
  bab:     z.enum(["a-u", "a-i", "a-a", "i-a", "u-u", "i-i"]).optional(),
});

// ── Form I Bāb (vowel-pattern) lookup tables ──────────────────────

const BAB_VOWELS: Readonly<Record<string, { pastVowel: string; presentVowel: string }>> = {
  "a-u": { pastVowel: "a", presentVowel: "u" },
  "a-i": { pastVowel: "a", presentVowel: "i" },
  "a-a": { pastVowel: "a", presentVowel: "a" },
  "i-a": { pastVowel: "i", presentVowel: "a" },
  "u-u": { pastVowel: "u", presentVowel: "u" },
  "i-i": { pastVowel: "i", presentVowel: "i" },
};

/** Human-readable past/present pattern strings for each bāb key. */
const BAB_META: Readonly<Record<string, { pastPattern: string; presentPattern: string; example: string; name: string }>> = {
  "a-u": { pastPattern: "فَعَلَ", presentPattern: "يَفْعُلُ", example: "نَصَرَ / يَنْصُرُ",  name: "بَابُ نَصَرَ" },
  "a-i": { pastPattern: "فَعَلَ", presentPattern: "يَفْعِلُ", example: "ضَرَبَ / يَضْرِبُ",  name: "بَابُ ضَرَبَ" },
  "a-a": { pastPattern: "فَعَلَ", presentPattern: "يَفْعَلُ", example: "فَتَحَ / يَفْتَحُ",  name: "بَابُ فَتَحَ" },
  "i-a": { pastPattern: "فَعِلَ", presentPattern: "يَفْعَلُ", example: "عَلِمَ / يَعْلَمُ",  name: "بَابُ عَلِمَ" },
  "u-u": { pastPattern: "فَعُلَ", presentPattern: "يَفْعُلُ", example: "كَرُمَ / يَكْرُمُ",  name: "بَابُ كَرُمَ" },
  "i-i": { pastPattern: "فَعِلَ", presentPattern: "يَفْعِلُ", example: "حَسِبَ / يَحْسِبُ",  name: "بَابُ حَسِبَ" },
};

// ── Type refinement ───────────────────────────────────────────────

/**
 * Refine the root type using lexicon canonical R2/R3 when the surface form
 * used ALEF (e.g. قال → قول, دعا → دعو).
 * Uses the canonical root's R2/R3 letter rather than presentVowel,
 * which is more reliable (نوم has R2=WAW but presentVowel=a).
 */
function refineType(
  initialType: RootType,
  r2: string,
  r3: string,
  lexEntry: ReturnType<typeof lookupRoot>,
): RootType {
  if ((initialType === "hollow_waw" || initialType === "hollow_ya") && r2 === ALEF) {
    if (lexEntry) {
      const canonR2 = lexEntry.root[1]!;
      return canonR2 === WAW ? "hollow_waw" : "hollow_ya";
    }
    return "hollow_waw";
  }

  if ((initialType === "defective_waw" || initialType === "defective_ya") && r3 === ALEF) {
    if (lexEntry) {
      const canonR3 = lexEntry.root[2]!;
      return canonR3 === WAW ? "defective_waw" : "defective_ya";
    }
    return "defective_waw";
  }

  return initialType;
}

// ── Measure (verb form number) + pattern string ───────────────────

function measureAndPattern(form: number): { measure: string; pattern: string } {
  if (form === 2) return { measure: "II",  pattern: "فعّل"   };
  if (form === 3) return { measure: "III", pattern: "فاعل"   };
  if (form === 4) return { measure: "IV",  pattern: "أفعل"   };
  if (form === 5) return { measure: "V",   pattern: "تفعّل"  };
  if (form === 6) return { measure: "VI",  pattern: "تفاعل"  };
  if (form === 7) return { measure: "VII",  pattern: "انفعل"  };
  if (form === 8) return { measure: "VIII", pattern: "افتعل"  };
  if (form === 10) return { measure: "X",  pattern: "استفعل" };
  return             { measure: "I",   pattern: "فعل"    };
}

/** Convert the request `measure` string to a numeric forceMeasure for classifyRoot. */
function parseForceMeasure(m: string): number | undefined {
  if (m === "I")   return 1;
  if (m === "II")  return 2;
  if (m === "III") return 3;
  if (m === "IV")  return 4;
  if (m === "V")   return 5;
  if (m === "VI")  return 6;
  if (m === "VII")  return 7;
  if (m === "VIII") return 8;
  if (m === "X")    return 10;
  return undefined; // "auto"
}

// ── Confidence + source ───────────────────────────────────────────

function getConfidenceAndSource(
  initialType: RootType,
  r2: string,
  r3: string,
  hasLexEntry: boolean,
): { confidence: "high" | "medium" | "low"; source: "lexicon" | "pattern_rule" | "rule_fallback" } {
  if (hasLexEntry) return { confidence: "high", source: "lexicon" };
  if (r2 === ALEF || r3 === ALEF) return { confidence: "low", source: "rule_fallback" };
  // Canonical weak-letter positions are deterministic
  const isDeterministic =
    initialType === "assimilated"   ||
    initialType === "hollow_waw"    || initialType === "hollow_ya"    ||
    initialType === "defective_waw" || initialType === "defective_ya" ||
    initialType === "doubled";
  return isDeterministic
    ? { confidence: "medium", source: "pattern_rule" }
    : { confidence: "medium", source: "pattern_rule" };
}

// ── Form-based complexity boost ───────────────────────────────────

/**
 * DIAGNOSTIC ONLY — morphology complexity signal.
 *
 * `smartilr.difficulty` is a passive observation field intended for teacher
 * dashboards and debug views.  It does NOT feed into:
 *   - assigned ILR level or likely_range
 *   - confidence values
 *   - hard gates or capping logic
 *   - any boundary-promotion engine
 *
 * It is computed once, placed in the payload, and never read back by any
 * scoring path.  Treat it like a struct annotation, not a scoring input.
 *
 * Form complexity boosts are applied only when detectionMethod === "lexicon_exact"
 * so that unconfirmed (heuristic / user_forced) detections do not inflate the
 * signal beyond the conservative base.
 */
const FORM_COMPLEXITY_BOOSTS: Readonly<Record<string, number>> = {
  form_ii:   0.05,
  form_iii:  0.05,
  form_iv:   0.08,
  form_v:    0.12,
  form_vi:   0.12,
  form_vii:  0.10,
  form_viii: 0.15,
  form_x:    0.18,
};

/**
 * Base abstraction score per root type, before any form boost.
 * Derived forms start higher than Form I to reflect their inherent
 * morphological complexity and elevated discourse register.
 */
const BASE_ABSTRACTION: Readonly<Record<string, number>> = {
  regular:       0.20,
  assimilated:   0.22,
  hollow_waw:    0.25,
  hollow_ya:     0.25,
  defective_waw: 0.25,
  defective_ya:  0.25,
  doubled:       0.23,
  form_ii:       0.25,
  form_iii:      0.25,
  form_iv:       0.28,
  form_v:        0.30,
  form_vi:       0.30,
  form_vii:      0.28,
  form_viii:     0.32,
  form_x:        0.35,
};

interface DifficultyScore {
  abstraction_score:  number;   // base + (boost if lexicon_exact)
  form_boost_applied: boolean;  // true only when lexicon_exact confirmed the form
  form_boost:         number;   // the boost amount (0 when not applied)
}

function computeDifficulty(
  type: string,
  detectionMethod: "lexicon_exact" | "user_forced" | "surface_heuristic",
): DifficultyScore {
  const base  = BASE_ABSTRACTION[type] ?? 0.20;
  const boost = detectionMethod === "lexicon_exact" ? (FORM_COMPLEXITY_BOOSTS[type] ?? 0) : 0;
  return {
    abstraction_score:  Math.round((base + boost) * 1000) / 1000,
    form_boost_applied: boost > 0,
    form_boost:         boost,
  };
}

// ── Pronunciation ─────────────────────────────────────────────────

interface PronunciationForm {
  arabic: string;
  translit: string;
}

function makePronunciation(
  conjugation: ReturnType<typeof conjugate>,
  nouns: ReturnType<typeof getNounForms>,
): Record<string, PronunciationForm> {
  function pf(arabic: string): PronunciationForm {
    return { arabic, translit: transliterate(arabic) };
  }
  const past3ms   = conjugation.past.find(r => r.pronoun === "3ms")?.form ?? "";
  const pres3ms   = conjugation.present.find(r => r.pronoun === "3ms")?.form ?? "";
  const imp2ms    = conjugation.imperative.find(r => r.pronoun === "2ms")?.form ?? "";
  return {
    past3ms:       pf(past3ms),
    present3ms:    pf(pres3ms),
    imperative2ms: pf(imp2ms),
    masdar:        pf(nouns.masdar),
    activePart:    pf(nouns.activePart),
    passivePart:   pf(nouns.passivePart),
  };
}

// ── SmartILR payload + unified response ──────────────────────────

interface SmartILRPayload {
  payload_version: "1.0";
  engine: "smartroot_arabic_v1";
  generated_at: string;
  surface: string;
  root: string;
  measure: string;
  pattern: string;
  gloss: string;
  classification: {
    type: string;
    confidence: string;
    source: string;
    detection_method: string;
  };
  key_forms: {
    past_3ms:       PronunciationForm;
    present_3ms:    PronunciationForm;
    imperative_2ms: PronunciationForm;
  };
  noun_forms: {
    masdar:             PronunciationForm & { status: string };
    active_participle:  PronunciationForm & { status: string };
    passive_participle: PronunciationForm & { status: string };
  };
  difficulty: DifficultyScore;
  explanation: string;
}

function sendResponse(p: {
  res: Response;
  root: string;
  normalized: string;
  r1: string; r2: string; r3: string; form: number;
  measure: string; pattern: string;
  type: RootType;
  gloss: string;
  confidence: "high" | "medium" | "low";
  source: "lexicon" | "pattern_rule" | "rule_fallback";
  detectionMethod: "lexicon_exact" | "user_forced" | "surface_heuristic";
  conjugation: ReturnType<typeof conjugate>;
  nouns: ReturnType<typeof getNounForms>;
  pronunciation: Record<string, PronunciationForm>;
  explanationResult: ReturnType<typeof explain>;
}): void {
  const {
    res: r, root, normalized, r1, r2, r3, form, measure, pattern,
    type, gloss, confidence, source, detectionMethod,
    conjugation, nouns, pronunciation, explanationResult,
  } = p;

  const difficulty = computeDifficulty(type, detectionMethod);

  const smartilr: SmartILRPayload = {
    payload_version: "1.0",
    engine: "smartroot_arabic_v1",
    generated_at: new Date().toISOString(),
    surface: root,
    root: normalized,
    measure, pattern, gloss,
    classification: { type, confidence, source, detection_method: detectionMethod },
    key_forms: {
      past_3ms:       pronunciation.past3ms!,
      present_3ms:    pronunciation.present3ms!,
      imperative_2ms: pronunciation.imperative2ms!,
    },
    noun_forms: {
      masdar:             { ...pronunciation.masdar!,      status: nouns.status.masdar },
      active_participle:  { ...pronunciation.activePart!,  status: nouns.status.activePart },
      passive_participle: { ...pronunciation.passivePart!, status: nouns.status.passivePart },
    },
    difficulty,
    explanation: explanationResult.full,
  };

  const engineResult = analyzeToken(normalized);
  const vc = engineResult.verbClass ?? classifyVerbClass(r1, r2, r3, type);
  const rec = recoverRadicals(r1, r2, r3, type as RootType);
  r.json({
    root: { input: root, normalized, r1: rec.r1, r2: rec.r2, r3: rec.r3, form },
    measure, pattern,
    verb_class: vc,
    classification: { type, gloss, confidence, source, detection_method: detectionMethod },
    conjugation: {
      past:       conjugation.past,
      present:    conjugation.present,
      future:     conjugation.future,
      imperative: conjugation.imperative,
    },
    nouns: {
      masdar:      nouns.masdar,
      activePart:  nouns.activePart,
      passivePart: nouns.passivePart,
      source:      nouns.source,
      status:      nouns.status,
      masdars:     nouns.masdars.map(m => ({ form: m.form, status: m.status, common: m.common })),
    },
    pronunciation,
    explanation: explanationResult,
    smartilr,
  });
}

// ── POST /generate ────────────────────────────────────────────────

router.post("/generate", (req: Request, res: Response) => {
  const parsed = GenerateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request",
      details: parsed.error.issues.map((i: { message: string }) => i.message),
    });
    return;
  }

  const { root, measure: measureField } = parsed.data;

  if (!isArabic(root)) {
    res.status(400).json({
      error: "Input must consist of Arabic letters only.",
      received: root,
    });
    return;
  }

  const forceMeasure = parseForceMeasure(measureField ?? "auto");

  // classifyRoot handles Form I–IV; forceMeasure bypasses heuristics when user selects a measure.
  const classification = classifyRoot(root, forceMeasure);
  if (!classification) {
    res.status(400).json({
      error: "Could not classify root. Supply a triliteral root (كتب, قال) or a surface verb form (درّس, ساعد, أكرم).",
      received: root,
    });
    return;
  }

  const { normalized, explanation: classExplanation, form } = classification;
  let { r1, r2, r3, type } = classification; // let so hamza radical overrides can be applied

  // ── Form X path: اِسْتَفْعَلَ / يَسْتَفْعِلُ ────────────────────────
  if (type === "form_x") {
    const formXGloss   = lookupFormXGloss(normalized);
    const gloss        = formXGloss ?? "unknown";
    const confidence   = formXGloss ? "high" as const : "medium" as const;
    const source       = formXGloss ? "lexicon" as const : "pattern_rule" as const;
    const detectionMethod = forceMeasure !== undefined ? "user_forced" as const : (formXGloss ? "lexicon_exact" as const : "surface_heuristic" as const);

    const pastVowel    = "a";
    const presentVowel = "i";

    const conjugation   = conjugate({ type, r1, r2, r3, pastVowel, presentVowel });
    const nouns         = getNounForms(type, r1, r2, r3, undefined);
    const pronunciation = makePronunciation(conjugation, nouns);
    const { measure, pattern } = measureAndPattern(form);

    const sampleForms: SampleForms = {
      past3ms:    conjugation.past.find(r => r.pronoun === "3ms")?.form ?? "",
      past2ms:    conjugation.past.find(r => r.pronoun === "2ms")?.form ?? "",
      present3ms: conjugation.present.find(r => r.pronoun === "3ms")?.form ?? "",
      imp2ms:     conjugation.imperative.find(r => r.pronoun === "2ms")?.form ?? "",
      imp2fs:     conjugation.imperative.find(r => r.pronoun === "2fs")?.form ?? "",
      imp2mp:     conjugation.imperative.find(r => r.pronoun === "2mp")?.form ?? "",
    };
    const explanationResult = explain(type, r1, r2, r3, classExplanation, sampleForms, presentVowel);

    sendResponse({ res, root, normalized, r1, r2, r3, form, measure, pattern, type, gloss, confidence, source, detectionMethod, conjugation, nouns, pronunciation, explanationResult });
    return;
  }

  // ── Form VIII path: اِفْتَعَلَ / يَفْتَعِلُ ────────────────────────
  if (type === "form_viii") {
    const formVIIIGloss = lookupFormVIIIGloss(normalized);
    const gloss         = formVIIIGloss ?? "unknown";
    const confidence    = formVIIIGloss ? "high" as const : "medium" as const;
    const source        = formVIIIGloss ? "lexicon" as const : "pattern_rule" as const;
    const detectionMethod = forceMeasure !== undefined ? "user_forced" as const : (formVIIIGloss ? "lexicon_exact" as const : "surface_heuristic" as const);

    const pastVowel    = "a";
    const presentVowel = "i";

    const conjugation   = conjugate({ type, r1, r2, r3, pastVowel, presentVowel });
    const nouns         = getNounForms(type, r1, r2, r3, undefined);
    const pronunciation = makePronunciation(conjugation, nouns);
    const { measure, pattern } = measureAndPattern(form);

    const sampleForms: SampleForms = {
      past3ms:    conjugation.past.find(r => r.pronoun === "3ms")?.form ?? "",
      past2ms:    conjugation.past.find(r => r.pronoun === "2ms")?.form ?? "",
      present3ms: conjugation.present.find(r => r.pronoun === "3ms")?.form ?? "",
      imp2ms:     conjugation.imperative.find(r => r.pronoun === "2ms")?.form ?? "",
      imp2fs:     conjugation.imperative.find(r => r.pronoun === "2fs")?.form ?? "",
      imp2mp:     conjugation.imperative.find(r => r.pronoun === "2mp")?.form ?? "",
    };
    const explanationResult = explain(type, r1, r2, r3, classExplanation, sampleForms, presentVowel);

    sendResponse({ res, root, normalized, r1, r2, r3, form, measure, pattern, type, gloss, confidence, source, detectionMethod, conjugation, nouns, pronunciation, explanationResult });
    return;
  }

  // ── Form VII path: اِنْفَعَلَ / يَنْفَعِلُ ─────────────────────────
  if (type === "form_vii") {
    const formVIIGloss = lookupFormVIIGloss(normalized);
    const gloss        = formVIIGloss ?? "unknown";
    const confidence   = formVIIGloss ? "high" as const : "medium" as const;
    const source       = formVIIGloss ? "lexicon" as const : "pattern_rule" as const;
    const detectionMethod = forceMeasure !== undefined ? "user_forced" as const : (formVIIGloss ? "lexicon_exact" as const : "surface_heuristic" as const);

    const pastVowel    = "a";
    const presentVowel = "i";

    const conjugation   = conjugate({ type, r1, r2, r3, pastVowel, presentVowel });
    const nouns         = getNounForms(type, r1, r2, r3, undefined);
    const pronunciation = makePronunciation(conjugation, nouns);
    const { measure, pattern } = measureAndPattern(form);

    const sampleForms: SampleForms = {
      past3ms:    conjugation.past.find(r => r.pronoun === "3ms")?.form ?? "",
      past2ms:    conjugation.past.find(r => r.pronoun === "2ms")?.form ?? "",
      present3ms: conjugation.present.find(r => r.pronoun === "3ms")?.form ?? "",
      imp2ms:     conjugation.imperative.find(r => r.pronoun === "2ms")?.form ?? "",
      imp2fs:     conjugation.imperative.find(r => r.pronoun === "2fs")?.form ?? "",
      imp2mp:     conjugation.imperative.find(r => r.pronoun === "2mp")?.form ?? "",
    };
    const explanationResult = explain(type, r1, r2, r3, classExplanation, sampleForms, presentVowel);

    sendResponse({ res, root, normalized, r1, r2, r3, form, measure, pattern, type, gloss, confidence, source, detectionMethod, conjugation, nouns, pronunciation, explanationResult });
    return;
  }

  // ── Form VI path: تَفَاعَلَ / يَتَفَاعَلُ ──────────────────────────
  if (type === "form_vi") {
    const formVIGloss  = lookupFormVIGloss(normalized);
    const gloss        = formVIGloss ?? "unknown";
    const confidence   = formVIGloss ? "high" as const : "medium" as const;
    const source       = formVIGloss ? "lexicon" as const : "pattern_rule" as const;
    const detectionMethod = forceMeasure !== undefined ? "user_forced" as const : (formVIGloss ? "lexicon_exact" as const : "surface_heuristic" as const);

    const pastVowel    = "a";
    const presentVowel = "a";

    const conjugation   = conjugate({ type, r1, r2, r3, pastVowel, presentVowel });
    const nouns         = getNounForms(type, r1, r2, r3, undefined);
    const pronunciation = makePronunciation(conjugation, nouns);
    const { measure, pattern } = measureAndPattern(form);

    const sampleForms: SampleForms = {
      past3ms:    conjugation.past.find(r => r.pronoun === "3ms")?.form ?? "",
      past2ms:    conjugation.past.find(r => r.pronoun === "2ms")?.form ?? "",
      present3ms: conjugation.present.find(r => r.pronoun === "3ms")?.form ?? "",
      imp2ms:     conjugation.imperative.find(r => r.pronoun === "2ms")?.form ?? "",
      imp2fs:     conjugation.imperative.find(r => r.pronoun === "2fs")?.form ?? "",
      imp2mp:     conjugation.imperative.find(r => r.pronoun === "2mp")?.form ?? "",
    };
    const explanationResult = explain(type, r1, r2, r3, classExplanation, sampleForms, presentVowel);

    sendResponse({ res, root, normalized, r1, r2, r3, form, measure, pattern, type, gloss, confidence, source, detectionMethod, conjugation, nouns, pronunciation, explanationResult });
    return;
  }

  // ── Form V path: تَفَعَّلَ / يَتَفَعَّلُ ───────────────────────────
  if (type === "form_v") {
    const formVGloss   = lookupFormVGloss(normalized);
    const gloss        = formVGloss ?? "unknown";
    const confidence   = formVGloss ? "high" as const : "medium" as const;
    const source       = formVGloss ? "lexicon" as const : "pattern_rule" as const;
    const detectionMethod = forceMeasure !== undefined ? "user_forced" as const : (formVGloss ? "lexicon_exact" as const : "surface_heuristic" as const);

    const pastVowel    = "a";
    const presentVowel = "a";

    const conjugation   = conjugate({ type, r1, r2, r3, pastVowel, presentVowel });
    const nouns         = getNounForms(type, r1, r2, r3, undefined);
    const pronunciation = makePronunciation(conjugation, nouns);
    const { measure, pattern } = measureAndPattern(form);

    const sampleForms: SampleForms = {
      past3ms:    conjugation.past.find(r => r.pronoun === "3ms")?.form ?? "",
      past2ms:    conjugation.past.find(r => r.pronoun === "2ms")?.form ?? "",
      present3ms: conjugation.present.find(r => r.pronoun === "3ms")?.form ?? "",
      imp2ms:     conjugation.imperative.find(r => r.pronoun === "2ms")?.form ?? "",
      imp2fs:     conjugation.imperative.find(r => r.pronoun === "2fs")?.form ?? "",
      imp2mp:     conjugation.imperative.find(r => r.pronoun === "2mp")?.form ?? "",
    };
    const explanationResult = explain(type, r1, r2, r3, classExplanation, sampleForms, presentVowel);

    sendResponse({ res, root, normalized, r1, r2, r3, form, measure, pattern, type, gloss, confidence, source, detectionMethod, conjugation, nouns, pronunciation, explanationResult });
    return;
  }

  // ── Form IV path: أَفْعَلَ / يُفْعِلُ ─────────────────────────────
  if (type === "form_iv") {
    const formIVGloss  = lookupFormIVGloss(normalized);
    const gloss        = formIVGloss ?? "unknown";
    const confidence   = formIVGloss ? "high" as const : "medium" as const;
    const source       = formIVGloss ? "lexicon" as const : "pattern_rule" as const;
    const detectionMethod = forceMeasure !== undefined ? "user_forced" as const : (formIVGloss ? "lexicon_exact" as const : "surface_heuristic" as const);

    const pastVowel    = "a";
    const presentVowel = "i";

    const conjugation   = conjugate({ type, r1, r2, r3, pastVowel, presentVowel });
    const nouns         = getNounForms(type, r1, r2, r3, undefined);
    const pronunciation = makePronunciation(conjugation, nouns);
    const { measure, pattern } = measureAndPattern(form);

    const sampleForms: SampleForms = {
      past3ms:    conjugation.past.find(r => r.pronoun === "3ms")?.form ?? "",
      past2ms:    conjugation.past.find(r => r.pronoun === "2ms")?.form ?? "",
      present3ms: conjugation.present.find(r => r.pronoun === "3ms")?.form ?? "",
      imp2ms:     conjugation.imperative.find(r => r.pronoun === "2ms")?.form ?? "",
      imp2fs:     conjugation.imperative.find(r => r.pronoun === "2fs")?.form ?? "",
      imp2mp:     conjugation.imperative.find(r => r.pronoun === "2mp")?.form ?? "",
    };
    const explanationResult = explain(type, r1, r2, r3, classExplanation, sampleForms, presentVowel);

    sendResponse({ res, root, normalized, r1, r2, r3, form, measure, pattern, type, gloss, confidence, source, detectionMethod, conjugation, nouns, pronunciation, explanationResult });
    return;
  }

  // ── Form III path: فَاعَلَ / يُفَاعِلُ ────────────────────────────
  if (type === "form_iii") {
    const formIIIGloss = lookupFormIIIGloss(normalized);
    const gloss        = formIIIGloss ?? "unknown";
    const confidence   = formIIIGloss ? "high" as const : "medium" as const;
    const source       = formIIIGloss ? "lexicon" as const : "pattern_rule" as const;
    const detectionMethod = forceMeasure !== undefined ? "user_forced" as const : (formIIIGloss ? "lexicon_exact" as const : "surface_heuristic" as const);

    const pastVowel    = "a";
    const presentVowel = "i";

    const conjugation   = conjugate({ type, r1, r2, r3, pastVowel, presentVowel });
    const nouns         = getNounForms(type, r1, r2, r3, undefined);
    const pronunciation = makePronunciation(conjugation, nouns);
    const { measure, pattern } = measureAndPattern(form);

    const sampleForms: SampleForms = {
      past3ms:    conjugation.past.find(r => r.pronoun === "3ms")?.form ?? "",
      past2ms:    conjugation.past.find(r => r.pronoun === "2ms")?.form ?? "",
      present3ms: conjugation.present.find(r => r.pronoun === "3ms")?.form ?? "",
      imp2ms:     conjugation.imperative.find(r => r.pronoun === "2ms")?.form ?? "",
      imp2fs:     conjugation.imperative.find(r => r.pronoun === "2fs")?.form ?? "",
      imp2mp:     conjugation.imperative.find(r => r.pronoun === "2mp")?.form ?? "",
    };
    const explanationResult = explain(type, r1, r2, r3, classExplanation, sampleForms, presentVowel);

    sendResponse({ res, root, normalized, r1, r2, r3, form, measure, pattern, type, gloss, confidence, source, detectionMethod, conjugation, nouns, pronunciation, explanationResult });
    return;
  }

  // ── Form II path: فَعَّلَ / يُفَعِّلُ ──────────────────────────────
  if (type === "form_ii") {
    const formIIGloss  = lookupFormIIGloss(normalized);
    const gloss        = formIIGloss ?? "unknown";
    const confidence   = formIIGloss ? "high" as const : "medium" as const;
    const source       = formIIGloss ? "lexicon" as const : "pattern_rule" as const;
    const detectionMethod = forceMeasure !== undefined ? "user_forced" as const : (formIIGloss ? "lexicon_exact" as const : "surface_heuristic" as const);

    const pastVowel    = "a";
    const presentVowel = "i";

    const conjugation   = conjugate({ type, r1, r2, r3, pastVowel, presentVowel });
    const nouns         = getNounForms(type, r1, r2, r3, undefined);
    const pronunciation = makePronunciation(conjugation, nouns);
    const { measure, pattern } = measureAndPattern(form);

    const sampleForms: SampleForms = {
      past3ms:    conjugation.past.find(r => r.pronoun === "3ms")?.form ?? "",
      past2ms:    conjugation.past.find(r => r.pronoun === "2ms")?.form ?? "",
      present3ms: conjugation.present.find(r => r.pronoun === "3ms")?.form ?? "",
      imp2ms:     conjugation.imperative.find(r => r.pronoun === "2ms")?.form ?? "",
      imp2fs:     conjugation.imperative.find(r => r.pronoun === "2fs")?.form ?? "",
      imp2mp:     conjugation.imperative.find(r => r.pronoun === "2mp")?.form ?? "",
    };
    const explanationResult = explain(type, r1, r2, r3, classExplanation, sampleForms, presentVowel);

    sendResponse({ res, root, normalized, r1, r2, r3, form, measure, pattern, type, gloss, confidence, source, detectionMethod, conjugation, nouns, pronunciation, explanationResult });
    return;
  }

  // ── Form I path ────────────────────────────────────────────────────

  // Step 1: JSON lexicon bank — authoritative override, skips all fallback.
  const f1Hit = getFormILexiconEntry(normalized);
  if (f1Hit) {
    if (f1Hit.rootType !== null) type = f1Hit.rootType;
    if (f1Hit.r1) r1 = f1Hit.r1;
    if (f1Hit.r2) r2 = f1Hit.r2;
    if (f1Hit.r3) r3 = f1Hit.r3;
    const displayNorm  = f1Hit.canonicalKey;
    const pastVowel    = f1Hit.pastVowel;
    const presentVowel = f1Hit.presentVowel;
    const gloss        = f1Hit.gloss;
    const detectionMethod = "lexicon_exact" as const;
    const confidence   = "high" as const;
    const source       = "lexicon" as const;
    const conjugation   = conjugate({ type, r1, r2, r3, pastVowel, presentVowel, contractR2Hamza: f1Hit.contractR2 });
    const f1MasdarInputs = f1Hit.masdars.map(m => ({ form: m.form, common: m.common }));
    const nouns         = getNounForms(type, r1, r2, r3, undefined, f1MasdarInputs);
    const pronunciation = makePronunciation(conjugation, nouns);
    const { measure, pattern } = measureAndPattern(form);
    const sampleForms: SampleForms = {
      past3ms:    conjugation.past.find(r => r.pronoun === "3ms")?.form ?? "",
      past2ms:    conjugation.past.find(r => r.pronoun === "2ms")?.form ?? "",
      present3ms: conjugation.present.find(r => r.pronoun === "3ms")?.form ?? "",
      imp2ms:     conjugation.imperative.find(r => r.pronoun === "2ms")?.form ?? "",
      imp2fs:     conjugation.imperative.find(r => r.pronoun === "2fs")?.form ?? "",
      imp2mp:     conjugation.imperative.find(r => r.pronoun === "2mp")?.form ?? "",
    };
    const explanationResult = explain(type, r1, r2, r3, classExplanation, sampleForms, presentVowel);
    sendResponse({ res, root, normalized: displayNorm, r1, r2, r3, form, measure, pattern, type, gloss, confidence, source, detectionMethod, conjugation, nouns, pronunciation, explanationResult });
    return;
  }

  // Step 2: Existing lookupRoot + vowel guessing (unchanged fallback).
  const lexEntry = lookupRoot(normalized);

  type = refineType(type, r2, r3, lexEntry);

  const { confidence, source } = getConfidenceAndSource(classification.type, r2, r3, !!lexEntry);

  const gloss        = lexEntry?.gloss ?? "unknown";
  const pastVowel    = lexEntry?.pastVowel    ?? "a";
  const presentVowel = lexEntry?.presentVowel ?? "a";
  const detectionMethod = forceMeasure !== undefined ? "user_forced" as const : (lexEntry ? "lexicon_exact" as const : "surface_heuristic" as const);

  const conjugation   = conjugate({ type, r1, r2, r3, pastVowel, presentVowel });
  const nouns         = getNounForms(type, r1, r2, r3, lexEntry);
  const pronunciation = makePronunciation(conjugation, nouns);
  const { measure, pattern } = measureAndPattern(form);

  const sampleForms: SampleForms = {
    past3ms:    conjugation.past.find(r => r.pronoun === "3ms")?.form ?? "",
    past2ms:    conjugation.past.find(r => r.pronoun === "2ms")?.form ?? "",
    present3ms: conjugation.present.find(r => r.pronoun === "3ms")?.form ?? "",
    imp2ms:     conjugation.imperative.find(r => r.pronoun === "2ms")?.form ?? "",
    imp2fs:     conjugation.imperative.find(r => r.pronoun === "2fs")?.form ?? "",
    imp2mp:     conjugation.imperative.find(r => r.pronoun === "2mp")?.form ?? "",
  };
  const explanationResult = explain(type, r1, r2, r3, classExplanation, sampleForms, presentVowel);

  sendResponse({ res, root, normalized, r1, r2, r3, form, measure, pattern, type, gloss, confidence, source, detectionMethod, conjugation, nouns, pronunciation, explanationResult });
});

// ── POST /student → Student conjugation (no SmartILR payload) ────

router.post("/student", (req: Request, res: Response) => {
  const parsed = GenerateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues.map((i: { message: string }) => i.message) });
    return;
  }

  let { root, measure: measureField } = parsed.data;
  if (!isArabic(root)) {
    res.status(400).json({ error: "Input must consist of Arabic letters only.", received: root });
    return;
  }

  const inflResult = resolveInflectedForm(root);
  if (inflResult) root = inflResult.entry.canonicalKey;
  const inflectionLabel = inflResult?.label ?? null;

  const forceMeasure = parseForceMeasure(measureField ?? "auto");
  const classification = classifyRoot(root, forceMeasure);
  if (!classification) {
    res.status(400).json({ error: "Could not classify root. Supply a triliteral root (كتب, قال) or a surface verb form (درّس, ساعد, أكرم).", received: root });
    return;
  }

  let { normalized, form } = classification;
  let { r1, r2, r3, type } = classification; // let so hamza radical overrides can be applied
  let contractR2Hamza: boolean | undefined;

  const dm = (hit: boolean): "lexicon_exact" | "user_forced" | "surface_heuristic" =>
    forceMeasure !== undefined ? "user_forced" : hit ? "lexicon_exact" : "surface_heuristic";

  const { measure, pattern } = measureAndPattern(form);

  // Helper: transliterate each conjugation row
  type StuRow = { pronoun: string; pronoun_label: string; arabic: string; translit: string };
  const withT = (rows: { pronoun: string; pronounLabel: string; form: string }[]): StuRow[] =>
    rows.map(r => ({ pronoun: r.pronoun, pronoun_label: r.pronounLabel, arabic: r.form, translit: transliterate(r.form) }));

  function sendStu(gloss: string, pastVowel: string, presentVowel: string, detectionMethod: string, lexE?: ReturnType<typeof lookupRoot>, form1MasdarInputs?: { form: string; common: boolean }[]): void {
    const conjugation = conjugate({ type, r1, r2, r3, pastVowel, presentVowel, contractR2Hamza });
    const passive     = conjugatePassive(type, r1, r2, r3, contractR2Hamza);
    const nouns       = getNounForms(type, r1, r2, r3, lexE, form1MasdarInputs);
    const stuEngine   = analyzeToken(normalized);
    const vc          = stuEngine.verbClass ?? classifyVerbClass(r1, r2, r3, type);
    const recStu      = recoverRadicals(r1, r2, r3, type);
    res.json({
      root: { input: root, normalized, r1: recStu.r1, r2: recStu.r2, r3: recStu.r3, form },
      inflection_label: inflectionLabel,
      verb_class: vc,
      measure, pattern, gloss, detection_method: detectionMethod,
      active: {
        past:       withT(conjugation.past),
        present:    withT(conjugation.present),
        future:     withT(conjugation.future),
        imperative: withT(conjugation.imperative),
      },
      passive: passive.available ? {
        available: true, note: passive.note,
        past:    withT(passive.past),
        present: withT(passive.present),
      } : { available: false, note: passive.note },
      derivations: {
        masdar:             { arabic: nouns.masdar,      translit: transliterate(nouns.masdar),      status: nouns.status.masdar,      category_ar: "\u0627\u0644\u0645\u0635\u062f\u0631",                   category_en: "Verbal Noun" },
        active_participle:  { arabic: nouns.activePart,  translit: transliterate(nouns.activePart),  status: nouns.status.activePart,  category_ar: "\u0627\u0633\u0645 \u0627\u0644\u0641\u0627\u0639\u0644", category_en: "Active Participle" },
        passive_participle: { arabic: nouns.passivePart, translit: transliterate(nouns.passivePart), status: nouns.status.passivePart, category_ar: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0641\u0639\u0648\u0644", category_en: "Passive Participle" },
      },
    });
  }

  if (type === "form_x") {
    const g = lookupFormXGloss(normalized);
    sendStu(g ?? "unknown", "a", "i", dm(!!g)); return;
  }
  if (type === "form_viii") {
    const g = lookupFormVIIIGloss(normalized);
    sendStu(g ?? "unknown", "a", "i", dm(!!g)); return;
  }
  if (type === "form_vii") {
    const g = lookupFormVIIGloss(normalized);
    sendStu(g ?? "unknown", "a", "i", dm(!!g)); return;
  }
  if (type === "form_vi") {
    const g = lookupFormVIGloss(normalized);
    sendStu(g ?? "unknown", "a", "a", dm(!!g)); return;
  }
  if (type === "form_v") {
    const g = lookupFormVGloss(normalized);
    sendStu(g ?? "unknown", "a", "a", dm(!!g)); return;
  }
  if (type === "form_iv") {
    const g = lookupFormIVGloss(normalized);
    sendStu(g ?? "unknown", "a", "i", dm(!!g)); return;
  }
  if (type === "form_iii") {
    const g = lookupFormIIIGloss(normalized);
    sendStu(g ?? "unknown", "a", "i", dm(!!g)); return;
  }
  if (type === "form_ii") {
    const g = lookupFormIIGloss(normalized);
    sendStu(g ?? "unknown", "a", "i", dm(!!g)); return;
  }

  // Form I — Step 1: JSON lexicon bank (authoritative, skips all fallback).
  const f1Hit = getFormILexiconEntry(normalized);
  if (f1Hit) {
    if (f1Hit.rootType !== null) type = f1Hit.rootType;
    if (f1Hit.r1) r1 = f1Hit.r1;
    if (f1Hit.r2) r2 = f1Hit.r2;
    if (f1Hit.r3) r3 = f1Hit.r3;
    contractR2Hamza = f1Hit.contractR2;
    normalized = f1Hit.canonicalKey;
    const stuF1Msd = f1Hit.masdars.map(m => ({ form: m.form, common: m.common }));
    sendStu(f1Hit.gloss, f1Hit.pastVowel, f1Hit.presentVowel, "lexicon_exact", undefined, stuF1Msd);
    return;
  }
  // Step 2: Existing lookupRoot fallback (unchanged).
  const lexEntry = lookupRoot(normalized);
  type = refineType(type, r2, r3, lexEntry);
  sendStu(lexEntry?.gloss ?? "unknown", lexEntry?.pastVowel ?? "a", lexEntry?.presentVowel ?? "a", dm(!!lexEntry), lexEntry ?? undefined);
});

// ── POST /morphology → Standalone morphology tool (no SmartILR) ──

router.post("/morphology", (req: Request, res: Response) => {
  const parsed = GenerateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues.map((i: { message: string }) => i.message) });
    return;
  }

  let { root, measure: measureField } = parsed.data;
  const originalInput = root;
  if (!isArabic(root)) {
    res.status(400).json({ error: "Input must consist of Arabic letters only.", received: root });
    return;
  }

  const safety = checkInputSafety(root);

  if (safety.mode === "noun_input") {
    res.json({
      safety_block: true,
      safety_mode: safety.mode,
      safety_reason: safety.reason,
      confidence: safety.confidence,
      input: root,
      noun_gloss: safety.nounGloss,
      suggestion: safety.suggestion,
      suggestion_gloss: safety.suggestionGloss,
    });
    return;
  }

  if (safety.mode === "multi_interpretation" && (!measureField || measureField === "auto")) {
    res.json({
      safety_block: false,
      safety_mode: safety.mode,
      safety_reason: safety.reason,
      confidence: safety.confidence,
      input: root,
      interpretations: (safety.interpretations ?? []).map(i => ({
        type: i.type,
        verb: i.verb,
        form: i.form,
        formLabel: i.formLabel,
        gloss: i.gloss,
        labelAr: i.labelAr,
        labelEn: i.labelEn,
        confidence: i.confidence,
        root3: i.root3,
      })),
    });
    return;
  }

  if (safety.mode === "suggestion_only") {
    res.json({
      safety_block: true,
      safety_mode: safety.mode,
      safety_reason: safety.reason,
      confidence: safety.confidence,
      input: root,
      suggestion: safety.suggestion,
      suggestion_gloss: safety.suggestionGloss,
    });
    return;
  }

  if (safety.mode === "no_valid_verb") {
    res.json({
      safety_block: true,
      safety_mode: safety.mode,
      safety_reason: safety.reason,
      confidence: safety.confidence,
      input: root,
    });
    return;
  }

  if (safety.mode === "recovered_verb_hit" && safety.canonicalVerb) {
    root = safety.canonicalVerb;
  }
  if (safety.mode === "exact_verb_hit" && safety.canonicalVerb) {
    root = safety.canonicalVerb;
  }

  const directLex = getFormILexiconEntry(normalizeInput(root));
  const inflResult = directLex ? null : resolveInflectedForm(root);
  if (inflResult) root = inflResult.entry.canonicalKey;
  const inflectionLabel = inflResult?.label ?? safety.inflectionLabel ?? null;
  const safetyNote = safety.mode === "recovered_verb_hit" ? safety.reason : null;

  const forceMeasure = safety.derivedForm ?? parseForceMeasure(measureField ?? "auto");

  const earlyLex = directLex ?? getFormILexiconEntry(normalizeInput(root));
  const classification = classifyRoot(earlyLex?.canonicalKey ?? root, forceMeasure);
  if (!classification) {
    res.status(400).json({ error: "Could not classify root. Supply a triliteral root (كتب، قال) or a surface verb form (درّس، ساعد، أكرم).", received: root });
    return;
  }

  let { normalized, form } = classification;
  let { r1, r2, r3, type } = classification;
  let contractR2Hamza: boolean | undefined;

  if (earlyLex && !forceMeasure) {
    normalized = earlyLex.canonicalKey;
    if (earlyLex.rootType !== null) type = earlyLex.rootType;
    if (earlyLex.r1) r1 = earlyLex.r1;
    if (earlyLex.r2) r2 = earlyLex.r2;
    if (earlyLex.r3) r3 = earlyLex.r3;
    contractR2Hamza = earlyLex.contractR2;
  }

  const dm = (hit: boolean): "lexicon_exact" | "user_forced" | "surface_heuristic" =>
    forceMeasure !== undefined ? "user_forced" : hit ? "lexicon_exact" : "surface_heuristic";

  const { measure, pattern } = measureAndPattern(form);

  type MorphRow = { pronoun: string; pronoun_label: string; arabic: string; translit: string };
  const withT = (rows: { pronoun: string; pronounLabel: string; form: string }[]): MorphRow[] =>
    rows.map(r => ({ pronoun: r.pronoun, pronoun_label: r.pronounLabel, arabic: r.form, translit: transliterate(r.form) }));

  function nounConfidence(status: string): "high" | "medium" | "low" | null {
    if (status === "attested" || status === "natural") return "high";
    if (status === "less_common" || status === "rare") return "medium";
    if (status === "theoretical") return "low";
    return null;
  }

  function buildExplainData(
    catEn: string,
    pat: string,
    canonicalRoot: string,
    r1: string, r2: string, r3: string,
    rootType: RootType,
  ): { root_breakdown_ar: string; root_breakdown_en: string; pattern_name_ar: string; pattern_name_en: string; weak_note_ar: string; weak_note_en: string; rule_ar: string; rule_en: string } {
    const rbAr = `\u0641 = ${r1}\u060C \u0639 = ${r2}\u060C \u0644 = ${r3}`;
    const rbEn = `F = ${transliterate(r1)}, \u02BF = ${transliterate(r2)}, L = ${transliterate(r3)}`;
    let pnAr = pat ? `\u0648\u0632\u0646: ${pat}` : "";
    let pnEn = pat ? `Pattern: ${transliterate(pat)}` : "";

    let weakAr = "";
    let weakEn = "";
    const weakTypes: Record<string, [string, string]> = {
      hollow_waw: ["\u0641\u0639\u0644 \u0623\u062C\u0648\u0641 \u0648\u0627\u0648\u064A \u2014 \u062D\u0631\u0641 \u0627\u0644\u0639\u0644\u0629 \u0641\u064A \u0627\u0644\u0639\u064A\u0646", "Hollow verb (waw) \u2014 middle radical is weak"],
      hollow_ya: ["\u0641\u0639\u0644 \u0623\u062C\u0648\u0641 \u064A\u0627\u0626\u064A \u2014 \u062D\u0631\u0641 \u0627\u0644\u0639\u0644\u0629 \u0641\u064A \u0627\u0644\u0639\u064A\u0646", "Hollow verb (ya) \u2014 middle radical is weak"],
      defective_waw: ["\u0641\u0639\u0644 \u0646\u0627\u0642\u0635 \u0648\u0627\u0648\u064A \u2014 \u062D\u0631\u0641 \u0627\u0644\u0639\u0644\u0629 \u0641\u064A \u0627\u0644\u0644\u0627\u0645", "Defective verb (waw) \u2014 final radical is weak"],
      defective_ya: ["\u0641\u0639\u0644 \u0646\u0627\u0642\u0635 \u064A\u0627\u0626\u064A \u2014 \u062D\u0631\u0641 \u0627\u0644\u0639\u0644\u0629 \u0641\u064A \u0627\u0644\u0644\u0627\u0645", "Defective verb (ya) \u2014 final radical is weak"],
      assimilated: ["\u0641\u0639\u0644 \u0645\u062B\u0627\u0644 \u2014 \u062D\u0631\u0641 \u0627\u0644\u0639\u0644\u0629 \u0641\u064A \u0627\u0644\u0641\u0627\u0621", "Assimilated verb \u2014 first radical is weak"],
      doubled: ["\u0641\u0639\u0644 \u0645\u0636\u0639\u0651\u0641 \u2014 \u0627\u0644\u0639\u064A\u0646 \u0648\u0627\u0644\u0644\u0627\u0645 \u0645\u062A\u0645\u0627\u062B\u0644\u0627\u0646", "Doubled verb \u2014 R2 and R3 are identical"],
    };
    const wt = weakTypes[rootType];
    if (wt) { weakAr = wt[0]; weakEn = wt[1]; }

    const catLower = catEn.toLowerCase();
    let ruleAr = "";
    let ruleEn = "";
    if (catLower.includes("verbal noun") || catLower.includes("masdar")) {
      ruleAr = `\u0627\u0644\u0645\u0635\u062F\u0631 \u064A\u062F\u0644\u0651 \u0639\u0644\u0649 \u0627\u0644\u062D\u062F\u062B \u062F\u0648\u0646 \u0632\u0645\u0646 \u0645\u0639\u064A\u0651\u0646`;
      ruleEn = "The masdar expresses the action without tying it to a specific time";
    } else if (catLower.includes("active participle") || catLower.includes("active p")) {
      ruleAr = `\u0627\u0633\u0645 \u0627\u0644\u0641\u0627\u0639\u0644 \u064A\u062F\u0644\u0651 \u0639\u0644\u0649 \u0645\u0646 \u0642\u0627\u0645 \u0628\u0627\u0644\u0641\u0639\u0644`;
      ruleEn = "The active participle denotes the doer of the action";
    } else if (catLower.includes("passive participle") || catLower.includes("passive p")) {
      ruleAr = `\u0627\u0633\u0645 \u0627\u0644\u0645\u0641\u0639\u0648\u0644 \u064A\u062F\u0644\u0651 \u0639\u0644\u0649 \u0645\u0646 \u0648\u0642\u0639 \u0639\u0644\u064A\u0647 \u0627\u0644\u0641\u0639\u0644`;
      ruleEn = "The passive participle denotes the one upon whom the action falls";
    } else if (catLower.includes("exaggeration") || catLower.includes("\u0645\u0628\u0627\u0644\u063A")) {
      ruleAr = `\u0635\u064A\u063A\u0629 \u0627\u0644\u0645\u0628\u0627\u0644\u063A\u0629 \u062A\u062F\u0644\u0651 \u0639\u0644\u0649 \u0643\u062B\u0631\u0629 \u0627\u0644\u0641\u0639\u0644`;
      ruleEn = "The intensive form denotes habitual or excessive action";
    } else if (catLower.includes("place") || catLower.includes("time") || catLower.includes("\u0645\u0643\u0627\u0646")) {
      ruleAr = `\u0627\u0633\u0645 \u0627\u0644\u0645\u0643\u0627\u0646 \u0648\u0627\u0644\u0632\u0645\u0627\u0646 \u064A\u062F\u0644\u0651 \u0639\u0644\u0649 \u0645\u0643\u0627\u0646 \u0623\u0648 \u0632\u0645\u0627\u0646 \u0627\u0644\u0641\u0639\u0644`;
      ruleEn = "The place/time noun denotes where or when the action occurs";
    } else if (catLower.includes("instrument") || catLower.includes("\u0622\u0644\u0629")) {
      ruleAr = `\u0627\u0633\u0645 \u0627\u0644\u0622\u0644\u0629 \u064A\u062F\u0644\u0651 \u0639\u0644\u0649 \u0627\u0644\u0623\u062F\u0627\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0629`;
      ruleEn = "The instrument noun denotes the tool used to perform the action";
    }

    return { root_breakdown_ar: rbAr, root_breakdown_en: rbEn, pattern_name_ar: pnAr, pattern_name_en: pnEn, weak_note_ar: weakAr, weak_note_en: weakEn, rule_ar: ruleAr, rule_en: ruleEn };
  }

  function enrichNoun<T extends { arabic: string; status: string; pattern?: string; category_ar: string; category_en: string }>(
    n: T,
    canonicalRoot: string,
    past3ms: string,
    r1?: string, r2?: string, r3?: string,
    rootType?: RootType,
  ): T & { confidence: string | null; is_attested: boolean; is_theoretical: boolean; explanation_ar: string; explanation_en: string; explain_data?: ReturnType<typeof buildExplainData> } {
    const pat = (n as any).pattern || "";
    const patName = (n as any).patternName || transliterate(pat);
    const conf = nounConfidence(n.status);
    const rootTranslit = transliterate(past3ms);
    const explainData = (r1 && r2 && r3 && rootType) ? buildExplainData(n.category_en, pat, canonicalRoot, r1, r2, r3, rootType) : undefined;
    return {
      ...n,
      confidence: conf,
      is_attested: n.status === "attested",
      is_theoretical: n.status === "theoretical",
      explanation_ar: pat
        ? `\u0635\u064A\u063A \u0639\u0644\u0649 \u0648\u0632\u0646 ${pat} \u0645\u0646 ${canonicalRoot}`
        : `\u0645\u0634\u062A\u0642 \u0645\u0646 ${canonicalRoot}`,
      explanation_en: pat
        ? `Built on the pattern ${patName || transliterate(pat)} from ${rootTranslit}`
        : `Derived from ${rootTranslit}`,
      explain_data: explainData,
    };
  }

  function buildInsight(
    inflLabel: string | null,
    safetyInfo: SafetyResult,
    verbForm: number,
    inputRoot: string,
    normalizedRoot: string,
    detMethod: string,
  ): string | null {
    const PRESENT_PREFIXES = ["\u064A", "\u062A", "\u0646"];
    const stripped = inputRoot.slice(1);
    const hasPresentPrefix = inputRoot !== normalizedRoot &&
      inputRoot.length === normalizedRoot.length + 1 &&
      PRESENT_PREFIXES.includes(inputRoot[0]) &&
      !PRESENT_PREFIXES.includes(normalizedRoot[0]) &&
      (stripped === normalizedRoot || stripped.slice(0, 2) === normalizedRoot.slice(0, 2));

    if (safetyInfo.mode === "recovered_verb_hit") {
      return "\u0635\u064F\u062D\u0651\u062D \u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B";
    }
    if (inflLabel) {
      if (inflLabel.includes("\u0645\u0636\u0627\u0631\u0639")) {
        return "\u062A\u0639\u0631\u0651\u0641 \u0639\u0644\u0649 \u0635\u064A\u063A\u0629 \u0627\u0644\u0645\u0636\u0627\u0631\u0639";
      }
      if (inflLabel.includes("\u0645\u0627\u0636")) {
        return "\u0627\u0633\u062A\u064F\u062E\u0631\u062C \u0627\u0644\u062C\u0630\u0631 \u0645\u0646 \u0635\u064A\u063A\u0629 \u0627\u0644\u0645\u0627\u0636\u064A";
      }
      if (inflLabel.includes("\u0645\u0635\u062F\u0631")) {
        return "\u062A\u0639\u0631\u0651\u0641 \u0639\u0644\u0649 \u0627\u0644\u0645\u0635\u062F\u0631";
      }
      return "\u0631\u064F\u062F\u0651\u062A \u0627\u0644\u0635\u064A\u063A\u0629 \u0625\u0644\u0649 \u062C\u0630\u0631\u0647\u0627";
    }
    if (hasPresentPrefix) {
      return "\u062A\u0639\u0631\u0651\u0641 \u0639\u0644\u0649 \u0635\u064A\u063A\u0629 \u0627\u0644\u0645\u0636\u0627\u0631\u0639";
    }
    if (verbForm >= 2 && verbForm <= 10) {
      return "\u0635\u064A\u063A\u0629 \u0645\u0632\u064A\u062F\u0629 \u2014 \u0627\u0644\u0648\u0632\u0646 " + toRoman(verbForm);
    }
    if (inputRoot.length === 2 && normalizedRoot.length === 3 && normalizedRoot[1] === normalizedRoot[2]) {
      return "\u0641\u064F\u0643\u0651 \u0627\u0644\u0625\u062F\u063A\u0627\u0645 \u0625\u0644\u0649 \u0627\u0644\u062C\u0630\u0631 \u0627\u0644\u062B\u0644\u0627\u062B\u064A";
    }
    if (inputRoot !== normalizedRoot) {
      return "\u0635\u064F\u062D\u0651\u062D \u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B";
    }
    if (detMethod === "lexicon_exact") {
      return "\u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0645\u0639\u062C\u0645";
    }
    if (detMethod === "surface_heuristic") {
      return "\u062A\u062D\u0644\u064A\u0644 \u0635\u0631\u0641\u064A";
    }
    return null;
  }

  function toRoman(n: number): string {
    const map: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X" };
    return map[n] ?? String(n);
  }

  function buildTrustReason(
    inflLabel: string | null, safetyInfo: SafetyResult, detMethod: string,
    inputRoot: string, normalizedRoot: string, verbForm: number,
  ): { ar: string; en: string } {
    if (inflLabel) {
      if (inflLabel.includes("\u0645\u0636\u0627\u0631\u0639"))
        return { ar: "\u062A\u0645 \u062A\u062C\u0631\u064A\u062F \u0627\u0644\u0644\u0648\u0627\u062D\u0642 \u0648\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u062C\u0630\u0631", en: "Suffixes stripped, root recovered from present form" };
      if (inflLabel.includes("\u0645\u0627\u0636"))
        return { ar: "\u062A\u0645 \u062A\u062C\u0631\u064A\u062F \u0627\u0644\u0644\u0648\u0627\u062D\u0642 \u0648\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u062C\u0630\u0631", en: "Suffixes stripped, root recovered from past form" };
      if (inflLabel.includes("\u0645\u0635\u062F\u0631"))
        return { ar: "\u062A\u0639\u0631\u0651\u0641 \u0639\u0644\u0649 \u0627\u0644\u0645\u0635\u062F\u0631 \u0648\u0631\u064F\u062F\u0651 \u0625\u0644\u0649 \u0627\u0644\u062C\u0630\u0631", en: "Masdar recognized, traced to root" };
      return { ar: "\u0631\u064F\u062F\u0651\u062A \u0627\u0644\u0635\u064A\u063A\u0629 \u0625\u0644\u0649 \u062C\u0630\u0631\u0647\u0627", en: "Auto-recovered form" };
    }
    if (safetyInfo.mode === "recovered_verb_hit")
      return { ar: "\u0635\u064A\u063A\u0629 \u0625\u0645\u0644\u0627\u0626\u064A\u0629 \u0645\u0642\u0627\u0631\u0628\u0629 \u2014 \u062A\u0645 \u0627\u0644\u062A\u0635\u062D\u064A\u062D \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B", en: "Spelling variant \u2014 auto-corrected" };
    if (detMethod === "lexicon_exact")
      return { ar: "\u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0645\u0639\u062C\u0645 \u0645\u0628\u0627\u0634\u0631\u0629\u064B", en: "Exact match in the lexicon" };
    if (detMethod === "user_forced")
      return { ar: "\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0648\u0632\u0646 \u064A\u062F\u0648\u064A\u0627\u064B", en: "Measure selected manually" };
    if (verbForm >= 2)
      return { ar: "\u0635\u064A\u063A\u0629 \u0645\u0632\u064A\u062F\u0629 \u0645\u0639\u0631\u0648\u0641\u0629", en: "Known derived form" };
    return { ar: "\u062A\u062D\u0644\u064A\u0644 \u0635\u0631\u0641\u064A \u0622\u0644\u064A", en: "Morphological analysis" };
  }

  function sendMorph(gloss: string, pastVowel: string, presentVowel: string, detectionMethod: string, lexE?: ReturnType<typeof lookupRoot>, form1MasdarInputs?: { form: string; common: boolean }[]): void {
    const conjugation = conjugate({ type, r1, r2, r3, pastVowel, presentVowel, contractR2Hamza });
    const passive     = conjugatePassive(type, r1, r2, r3, contractR2Hamza);
    const nouns       = getNounForms(type, r1, r2, r3, lexE, form1MasdarInputs);

    const recovered = recoverRadicals(r1, r2, r3, type);

    let formIType: RootType = type;
    if (form !== 1) {
      const formIClass = classifyRoot(recovered.trueRoot);
      if (formIClass) formIType = formIClass.type;
    }
    const derivedForms = getDerivedForms(r1, r2, r3, formIType, form);

    const richEntry    = lookupRich(normalized);
    const f1Meta       = getFormILexiconEntry(normalized);
    const f1Tr = f1Meta?.transitivity === "t" ? "transitive"
               : f1Meta?.transitivity === "i" ? "intransitive"
               : f1Meta?.transitivity === "b" ? "both" : null;
    const transitivity = richEntry?.transitivity ?? f1Tr ?? getTransitivity(normalized);
    const isTransitive = transitivity !== "intransitive";

    const exaggerationNouns = getExaggerationNouns(r1, r2, r3, formIType);
    const placeTimeNouns    = getPlaceTimeNouns(r1, r2, r3, formIType);
    const instrumentNouns   = getInstrumentNouns(r1, r2, r3, formIType, isTransitive);

    const morphEngine = analyzeToken(normalized);
    let vc = morphEngine.verbClass ?? classifyVerbClass(r1, r2, r3, type);
    if (vc === "sound" && (r1 === "أ" || r2 === "أ" || r3 === "أ")) vc = "hamzated";
    const insight = buildInsight(inflectionLabel, safety, form, originalInput, normalized, detectionMethod);
    const p3ms = conjugation.past.find(r => r.pronoun === "3ms")?.form ?? normalized;

    const trustConf: "high" | "medium" | "low" =
      detectionMethod === "lexicon_exact" ? "high" :
      detectionMethod === "user_forced"   ? "medium" :
      safety.confidence === "high" ? "high" :
      safety.confidence === "medium" ? "medium" : "low";
    const trustReason = buildTrustReason(inflectionLabel, safety, detectionMethod, originalInput, normalized, form);

    res.json({
      root: { input: root, normalized, r1: recovered.r1, r2: recovered.r2, r3: recovered.r3, form, type },
      inflection_label: inflectionLabel,
      safety_note: safetyNote,
      safety_mode: safety.mode,
      confidence: safety.confidence,
      verb_class: vc,
      insight,
      trust: {
        detected_as: inflectionLabel
          ? inflectionLabel
          : form === 1 ? "\u0641\u0639\u0644 \u062B\u0644\u0627\u062B\u064A \u0645\u062C\u0631\u062F"
          : "\u0641\u0639\u0644 \u0645\u0632\u064A\u062F \u2014 \u0627\u0644\u0648\u0632\u0646 " + toRoman(form),
        detected_as_en: inflectionLabel
          ? (inflectionLabel.includes("\u0645\u0636\u0627\u0631\u0639") ? "Present tense" : inflectionLabel.includes("\u0645\u0627\u0636") ? "Past tense" : "Inflected form")
          : form === 1 ? "Measure I base verb" : "Derived measure " + toRoman(form),
        canonical_form: p3ms,
        root_ar: recovered.r1 + " \u2013 " + recovered.r2 + " \u2013 " + recovered.r3,
        verb_type: vc,
        confidence: trustConf,
        reason_ar: trustReason.ar,
        reason_en: trustReason.en,
      },
      measure, pattern, gloss, meaning: FORM_MEANINGS[form] ?? "", detection_method: detectionMethod,
      transitivity,
      frequency_tier: f1Meta?.frequency_tier ?? null,
      teaching_level: f1Meta?.teaching_level ?? null,
      usage: USAGE[f1Meta?.canonicalKey ?? normalized] ?? USAGE[normalized] ?? null,
      prepositions:  richEntry?.prepositions ?? [],
      example:       richEntry?.example ?? null,
      form_examples: richEntry?.formExamples ?? {},
      active: {
        past:       withT(conjugation.past),
        present:    withT(conjugation.present),
        future:     withT(conjugation.future),
        imperative: withT(conjugation.imperative),
      },
      passive: passive.available ? {
        available: true, note: passive.note,
        past:    withT(passive.past),
        present: withT(passive.present),
      } : { available: false, note: passive.note },
      derivations: {
        masdar:             enrichNoun({ arabic: nouns.masdar,      translit: transliterate(nouns.masdar),      status: nouns.status.masdar,      pattern: "",            category_ar: "\u0627\u0644\u0645\u0635\u062f\u0631",                   category_en: "Verbal Noun" }, normalized, p3ms, r1, r2, r3, type),
        active_participle:  enrichNoun({ arabic: nouns.activePart,  translit: transliterate(nouns.activePart),  status: nouns.status.activePart,  pattern: "\u0641\u0627\u0639\u0650\u0644", category_ar: "\u0627\u0633\u0645 \u0627\u0644\u0641\u0627\u0639\u0644", category_en: "Active Participle" }, normalized, p3ms, r1, r2, r3, type),
        passive_participle: enrichNoun({ arabic: nouns.passivePart, translit: transliterate(nouns.passivePart), status: nouns.status.passivePart, pattern: "\u0645\u064E\u0641\u0639\u064F\u0648\u0644", category_ar: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0641\u0639\u0648\u0644", category_en: "Passive Participle" }, normalized, p3ms, r1, r2, r3, type),
      },
      verb_family: {
        core: {
          masdar:      { ar: nouns.masdar,      tr: transliterate(nouns.masdar),      status: nouns.status.masdar, explain: buildExplainData("Verbal Noun", "", normalized, r1, r2, r3, type) },
          masdars:     nouns.masdars.map(m => ({ ar: m.form, tr: transliterate(m.form), status: m.status, common: m.common })),
          active_part: { ar: nouns.activePart,   tr: transliterate(nouns.activePart),  status: nouns.status.activePart, explain: buildExplainData("Active Participle", "\u0641\u0627\u0639\u0650\u0644", normalized, r1, r2, r3, type) },
          passive_part:{ ar: nouns.passivePart,   tr: transliterate(nouns.passivePart), status: nouns.status.passivePart, explain: buildExplainData("Passive Participle", "\u0645\u064E\u0641\u0639\u064F\u0648\u0644", normalized, r1, r2, r3, type) },
        },
        derived_verbs: derivedForms
          .filter(f => f.attested && !f.is_current)
          .map(f => ({
            form:      f.form,
            label:     "Measure " + (({ 1:"I",2:"II",3:"III",4:"IV",5:"V",6:"VI",7:"VII",8:"VIII",10:"X" } as Record<number,string>)[f.form] || String(f.form)),
            meaning:   f.meaning,
            gloss:     f.gloss,
            past_3ms:  f.past_3ms.arabic,
            masdar:    f.masdar.arabic,
          })),
      },
      derived_forms:      derivedForms,
      exaggeration_nouns: exaggerationNouns.map(n => enrichNoun({ ...n, category_ar: "\u0635\u064a\u063a\u0629 \u0627\u0644\u0645\u0628\u0627\u0644\u063a\u0629", category_en: "Exaggeration Noun" }, normalized, p3ms, r1, r2, r3, type)),
      place_time_nouns:   placeTimeNouns.map(n => enrichNoun({ ...n, category_ar: n.nounType === "time" ? "\u0627\u0633\u0645 \u0627\u0644\u0632\u0645\u0627\u0646" : n.nounType === "place" ? "\u0627\u0633\u0645 \u0627\u0644\u0645\u0643\u0627\u0646" : "\u0627\u0633\u0645 \u0627\u0644\u0645\u0643\u0627\u0646 \u0648\u0627\u0644\u0632\u0645\u0627\u0646", category_en: n.nounType === "time" ? "Noun of Time" : n.nounType === "place" ? "Noun of Place" : "Noun of Place/Time" }, normalized, p3ms, r1, r2, r3, type)),
      instrument_nouns:   instrumentNouns.map(n => enrichNoun({ ...n, category_ar: "\u0627\u0633\u0645 \u0627\u0644\u0622\u0644\u0629", category_en: "Noun of Instrument" }, normalized, p3ms, r1, r2, r3, type)),
    });
  }

  if (type === "form_x")    { const g = lookupFormXGloss(normalized);    sendMorph(g ?? "unknown", "a", "i", dm(!!g)); return; }
  if (type === "form_viii") { const g = lookupFormVIIIGloss(normalized); sendMorph(g ?? "unknown", "a", "i", dm(!!g)); return; }
  if (type === "form_vii")  { const g = lookupFormVIIGloss(normalized);  sendMorph(g ?? "unknown", "a", "i", dm(!!g)); return; }
  if (type === "form_vi")   { const g = lookupFormVIGloss(normalized);   sendMorph(g ?? "unknown", "a", "a", dm(!!g)); return; }
  if (type === "form_v")    { const g = lookupFormVGloss(normalized);    sendMorph(g ?? "unknown", "a", "a", dm(!!g)); return; }
  if (type === "form_iv")   { const g = lookupFormIVGloss(normalized);   sendMorph(g ?? "unknown", "a", "i", dm(!!g)); return; }
  if (type === "form_iii")  { const g = lookupFormIIIGloss(normalized);  sendMorph(g ?? "unknown", "a", "i", dm(!!g)); return; }
  if (type === "form_ii")   { const g = lookupFormIIGloss(normalized);   sendMorph(g ?? "unknown", "a", "i", dm(!!g)); return; }

  // Form I — Step 1: JSON lexicon bank (authoritative; skips bāb picker).
  const f1Hit = getFormILexiconEntry(normalized);
  if (f1Hit) {
    if (f1Hit.rootType !== null) type = f1Hit.rootType;
    if (f1Hit.r1) r1 = f1Hit.r1;
    if (f1Hit.r2) r2 = f1Hit.r2;
    if (f1Hit.r3) r3 = f1Hit.r3;
    contractR2Hamza = f1Hit.contractR2;
    normalized = f1Hit.canonicalKey;
    const f1MsdInputs = f1Hit.masdars.map(m => ({ form: m.form, common: m.common }));
    sendMorph(f1Hit.gloss, f1Hit.pastVowel, f1Hit.presentVowel, "lexicon_exact", undefined, f1MsdInputs);
    return;
  }

  // Step 2: Existing lookupRoot + bāb picker (unchanged fallback).
  const lexEntry = lookupRoot(normalized);
  type = refineType(type, r2, r3, lexEntry);

  const { bab: requestedBab } = parsed.data;

  if (!lexEntry && type === "regular" && !requestedBab) {
    // No lexicon entry and no bāb selected — return a bāb picker response so the
    // UI can ask the user which vowel pattern (باب) applies to this root.
    const recBab = recoverRadicals(r1, r2, r3, type);
    res.json({
      needs_bab_selection: true,
      root: { input: root, normalized, r1: recBab.r1, r2: recBab.r2, r3: recBab.r3, form, type },
      abwab: Object.entries(BAB_META).map(([key, meta]) => ({
        bab:            key,
        name:           meta.name,
        pastPattern:    meta.pastPattern,
        presentPattern: meta.presentPattern,
        example:        meta.example,
      })),
    });
    return;
  }

  let pastVowel: string;
  let presentVowel: string;
  if (lexEntry) {
    pastVowel    = lexEntry.pastVowel;
    presentVowel = lexEntry.presentVowel;
  } else if (requestedBab && BAB_VOWELS[requestedBab]) {
    pastVowel    = BAB_VOWELS[requestedBab]!.pastVowel;
    presentVowel = BAB_VOWELS[requestedBab]!.presentVowel;
  } else {
    pastVowel    = "a";
    presentVowel = "a";
  }

  sendMorph(lexEntry?.gloss ?? "unknown", pastVowel, presentVowel, dm(!!lexEntry), lexEntry ?? undefined);
});

// ── POST /sentence-word → parse verb with attached pronouns ──────
const SentenceWordSchema = z.object({ word: z.string().min(1) });

router.post("/analyze", (req: Request, res: Response) => {
  const { token, context } = req.body ?? {};
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }
  res.json(analyzeToken(token, context));
});

router.post("/sentence-word", (req: Request, res: Response) => {
  const parsed = SentenceWordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "word is required" });
    return;
  }
  res.json(parseSentenceWord(parsed.data.word));
});

router.get("/english-search", (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  if (!q) { res.json({ query: "", normalizedQuery: "", expandedQueries: [], groups: [] }); return; }
  res.json(searchEnglishGrouped(q, 30));
});

// ── GET /suggest → autocomplete suggestions ─────────────────────

router.get("/suggest", (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const results = searchSuggestions(q, 8);
  res.json(results);
});

// ── GET / → HTML morphology tool ─────────────────────────────────

router.get("/", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(HTML_PAGE);
});


const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="google-site-verification" content="Mysyf2RwsVkQQ9j92N-yIYzLC8OfjqR6D1hOhYMnUIk" />
<meta name="description" content="Analyze Arabic roots, verb forms, and morphology with RootifyArabic. Interactive tool for learners." />
<title>RootifyArabic – Arabic Roots & Verb Analysis Tool</title>
<style>
/* ── Reset ─────────────────────────────────────── */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', system-ui, Arial, sans-serif; color: #1a1a2e; }

/* ══════════════════════════════════════════════════
   HOME SCREEN
══════════════════════════════════════════════════ */
#homeScreen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.home-brand {
  text-align: center; padding: 2rem 1rem 1.4rem;
  background: linear-gradient(160deg, #1a1a2e 0%, #12192e 55%, #0f2244 100%);
}
.home-logo {
  font-size: 3.2rem; font-weight: 800; color: #fff;
  letter-spacing: -.02em; line-height: 1;
}
.home-logo span { color: #e63946; }
.home-logo-ar {
  font-size: 38px; direction: rtl; color: #fff; opacity: .85;
  margin-top: 8px; margin-bottom: 8px; letter-spacing: .4em; font-weight: 600;
}
.home-tagline {
  font-size: .85rem; color: rgba(255,255,255,.55); margin-top: .75rem;
  letter-spacing: .18em; text-transform: uppercase; font-weight: 600;
}
.home-card {
  background: #fff; border-radius: 0; padding: 24px 40px;
  width: 100%; max-width: none;
  box-shadow: none; flex: 1;
}
.home-body {
  display: flex;
  flex-direction: column;
  direction: rtl;
  text-align: right;
}
/* search row inside home card */
.home-search-row { display: flex; gap: .55rem; margin-bottom: 1.8rem; }
.home-input {
  flex: 1; min-width: 0; height: 64px;
  padding: .85rem 1.1rem; border: 1.5px solid #e4e6f0; border-radius: 12px;
  font-size: 1.45rem; font-family: inherit; direction: rtl; text-align: right;
  background: #fafafa; outline: none; color: #1a1a2e;
  transition: border-color .15s;
}
.home-input:focus { border-color: #e63946; background: #fff; }
.home-select {
  height: 64px;
  padding: .85rem .55rem; border: 1.5px solid #e4e6f0; border-radius: 12px;
  font-size: .85rem; background: #fafafa; color: #666; cursor: pointer;
}
.home-btn {
  height: 64px;
  padding: .85rem 1.6rem; background: #e63946; color: #fff; border: none;
  border-radius: 12px; font-size: 1.05rem; cursor: pointer; font-weight: 700;
  -webkit-tap-highlight-color: transparent;
}
.home-btn:active { background: #c1121f; }
.ac-wrap { position: relative; flex: 1; min-width: 0; }
.ac-wrap .home-input, .ac-wrap .bar-input { width: 100%; box-sizing: border-box; }
.ac-dropdown {
  display: none; position: absolute; top: 100%; right: 0; left: 0;
  z-index: 900; margin-top: 4px; padding: 4px 0;
  background: #1e1e2e; border: 1px solid #333; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.35); max-height: 360px; overflow-y: auto;
  direction: rtl;
}
.ac-dropdown.ac-open { display: block; }
.ac-item {
  display: flex; align-items: center; gap: 8px; padding: 8px 14px;
  cursor: pointer; transition: background .1s;
}
.ac-item:hover, .ac-item.ac-active { background: #2a2a3e; }
.ac-ar { font-family: 'Amiri', serif; font-size: 1.25rem; color: #f5f5f5; flex-shrink: 0; }
.ac-badge {
  display: inline-block; font-size: .55rem; font-family: sans-serif;
  padding: 1px 6px; border-radius: 4px; color: #fff; flex-shrink: 0; text-transform: uppercase; letter-spacing: .03em;
}
.ac-badge-verb { background: #e63946; }
.ac-badge-masdar { background: #059669; }
.ac-badge-noun { background: #6366f1; }
.ac-hint { display: block; font-size: .62rem; color: rgba(255,255,255,.35); padding: .35rem .75rem .15rem; direction: rtl; text-align: right; border-bottom: 1px solid rgba(255,255,255,.06); }
.ac-sub-hint { font-size: .58rem; color: rgba(255,255,255,.5); margin-right: .4rem; }
.ac-gloss {
  font-family: sans-serif; font-size: .72rem; color: #111827; direction: ltr;
  text-align: left; flex: 1; min-width: 0; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
}
.ac-root-hint { font-family: 'Amiri', serif; font-size: .7rem; color: #111827; flex-shrink: 0; }
/* section heading inside home card */
.home-sec-hdr {
  font-size: .72rem; font-weight: 700; color: #111827;
  letter-spacing: .1em; text-transform: uppercase; margin-bottom: .7rem;
  text-align: right;
}
/* RootSnap chips */
.rootsnap-chips { display: flex; flex-wrap: wrap; gap: .65rem; margin-bottom: 1.6rem; direction: rtl; justify-content: flex-start; }
.rs-chip {
  padding: .42rem 1rem; background: #f0f2f8; border: 1.5px solid #e4e6f0;
  border-radius: 999px; font-size: 1.1rem; direction: rtl;
  cursor: pointer; color: #1a1a2e; font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: background .12s, border-color .12s, color .12s;
}
.rs-chip:hover { background: #1a1a2e; color: #fff; border-color: #1a1a2e; }
.rs-chip:active { background: #e63946; border-color: #e63946; color: #fff; }
/* Recent searches */
#recentSection { display: none; }
.recent-list { display: flex; flex-direction: column; gap: .45rem; direction: rtl; }
.recent-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: .7rem 1rem; background: #fafafa; border: 1.5px solid #f0f0f8;
  border-radius: 10px; cursor: pointer; direction: rtl;
  transition: background .1s;
  -webkit-tap-highlight-color: transparent;
}
.recent-item:active { background: #f0f2f8; }
.recent-root { font-size: 1.1rem; color: #1a1a2e; font-weight: 600; direction: rtl; }
.recent-meta { font-size: .7rem; color: #111827; margin-right: .5rem; }
.recent-arrow { font-size: .75rem; color: #b0b8c4; transform: scaleX(-1); }
/* Clear recent button */
.clear-btn {
  background: none; border: none; font-size: .68rem; color: #ddd;
  cursor: pointer; padding: 0;
}
.clear-btn:hover { color: #e63946; }

/* ══════════════════════════════════════════════════
   ANALYSIS VIEW
══════════════════════════════════════════════════ */
#analysisView { display: none; background: #f0f2f8; min-height: 100vh; }

/* ── Sticky analysis top bar ───────────────────── */
.analysis-bar {
  background: #1a1a2e; padding: .6rem .85rem;
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: .55rem; flex-wrap: wrap;
}
.back-btn {
  background: none; border: none; color: rgba(255,255,255,.65);
  font-size: 1.1rem; cursor: pointer; padding: .25rem .4rem;
  flex-shrink: 0; line-height: 1;
  -webkit-tap-highlight-color: transparent;
}
.back-btn:active { color: #fff; }
.analysis-bar-brand {
  font-size: .8rem; font-weight: 800; color: rgba(255,255,255,.82);
  letter-spacing: -.01em; flex-shrink: 0;
}
.analysis-bar-brand span { color: #e63946; }
.bar-search-row { display: flex; gap: .38rem; flex: 1; min-width: 0; }
.bar-input {
  flex: 1; min-width: 0;
  padding: .48rem .7rem; border: none; border-radius: 7px;
  font-size: 1.1rem; font-family: inherit; direction: rtl; text-align: right;
  background: rgba(255,255,255,.13); color: #fff; outline: none;
}
.bar-input::placeholder { color: rgba(255,255,255,.45); }
.bar-select {
  padding: .48rem .38rem; border: none; border-radius: 7px;
  font-size: .75rem; background: rgba(255,255,255,.1);
  color: rgba(255,255,255,.85); cursor: pointer;
}
.bar-select option { background: #1a1a2e; }
.bar-btn {
  padding: .48rem .9rem; background: #e63946; color: #fff; border: none;
  border-radius: 7px; font-size: .85rem; cursor: pointer; font-weight: 700;
  -webkit-tap-highlight-color: transparent;
}
.bar-btn:active { background: #c1121f; }

/* ── Page body (analysis) ──────────────────────── */
.page-body { width: 100%; padding: 1rem 24px 4rem; direction: rtl; text-align: right; }

/* ── Error ─────────────────────────────────────── */
.error-box {
  background: #fff0f0; border: 1px solid #fdd; border-radius: 10px;
  padding: .9rem 1rem; color: #c33; font-size: .88rem; margin-top: .75rem;
}

/* ── Hero card ─────────────────────────────────── */
.hero-card {
  background: #1a1a2e; color: #fff; border-radius: 0;
  padding: 2rem 1.6rem 1.6rem; margin-bottom: 1.2rem;
}
.hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: .4rem; direction: rtl; }
.hero-info { flex: 1; min-width: 0; }
.hero-arabic { font-size: 3.2rem; direction: rtl; line-height: 1.15; font-weight: 700; flex-shrink: 0; margin-bottom: .3rem; }
.inflection-info {
  font-size: .78rem; color: #a3d9a5; background: rgba(40,167,69,.12);
  border: 1px solid rgba(40,167,69,.25); border-radius: .5rem;
  padding: .4rem .75rem; margin-bottom: .65rem; text-align: right;
  font-weight: 600; letter-spacing: .01em;
}
.insight-note {
  font-size: .72rem; color: rgba(255,255,255,.55); text-align: right;
  direction: rtl; margin-bottom: .5rem; font-weight: 400; letter-spacing: .01em;
}
.hero-root-line { font-size: 1rem; color: rgba(255,255,255,.75); direction: rtl; margin-bottom: .3rem; letter-spacing: .04em; font-weight: 500; }
.hero-gloss { font-size: 1.15rem; font-weight: 600; color: rgba(255,255,255,.88); margin-bottom: .5rem; }
.hero-meta { font-size: .82rem; color: rgba(255,255,255,.72); margin-bottom: .6rem; letter-spacing: .02em; font-weight: 500; }
.hero-badges { display: flex; flex-wrap: wrap; gap: .4rem; direction: rtl; }
.badge { display: inline-block; font-size: .72rem; font-weight: 700; padding: .22rem .65rem; border-radius: 999px; }
.badge-form { background: #e63946; color: #fff; }
.badge-meaning { background: rgba(255,255,255,.13); color: rgba(255,255,255,.82); }
.badge-pattern { background: rgba(255,255,255,.09); color: rgba(255,255,255,.7); font-size: .88rem; }
.badge-vc { background: rgba(139,92,246,.28); color: #c4b5fd; font-size: .68rem; padding: .18rem .55rem; border-radius: 4px; text-transform: capitalize; }
.badge-pos { background: rgba(59,130,246,.28); color: #93bbfd; font-size: .68rem; padding: .18rem .55rem; border-radius: 4px; text-transform: capitalize; }
.safety-panel { background: #1e1e2e; border: 1.5px solid rgba(255,255,255,.12); border-radius: 12px; padding: 1.4rem 1.6rem; margin-bottom: .8rem; }
.safety-panel.safety-noun_input { border-color: rgba(59,130,246,.5); }
.safety-panel.safety-suggestion_only { border-color: rgba(253,126,20,.5); }
.safety-panel.safety-no_valid_verb { border-color: rgba(220,53,69,.5); }
.safety-header { display: flex; align-items: center; gap: .6rem; margin-bottom: .8rem; direction: rtl; }
.safety-icon { font-size: 1.4rem; }
.safety-title { font-size: 1rem; font-weight: 700; color: #e0e0e0; direction: rtl; }
.safety-detail { direction: rtl; text-align: right; margin-bottom: .6rem; }
.safety-input-label { font-size: .78rem; color: rgba(255,255,255,.65); margin-bottom: .2rem; }
.safety-input-ar { font-size: 1.6rem; font-family: 'Amiri', serif; color: #f8f9fa; margin-bottom: .4rem; }
.safety-noun-gloss { font-size: .88rem; color: #93bbfd; font-style: italic; }
.safety-reason { font-size: .85rem; color: rgba(255,255,255,.78); line-height: 1.45; }
.safety-suggestion { margin-top: .8rem; direction: rtl; text-align: right; }
.safety-suggest-label { font-size: .82rem; color: rgba(255,255,255,.7); margin-bottom: .4rem; }
.safety-suggest-btn { display: inline-flex; align-items: center; gap: .6rem; background: rgba(40,167,69,.18); border: 1.5px solid rgba(40,167,69,.5); color: #7fde9e; padding: .6rem 1.2rem; border-radius: 8px; cursor: pointer; font-size: 1rem; transition: all .2s; }
.safety-suggest-btn:hover { background: rgba(40,167,69,.32); border-color: rgba(40,167,69,.8); transform: translateY(-1px); }
.safety-suggest-ar { font-family: 'Amiri', serif; font-size: 1.3rem; color: #f8f9fa; }
.safety-suggest-gloss { font-size: .8rem; color: rgba(255,255,255,.72); font-style: italic; }
.interp-panel { background: #1e1e2e; border: 1.5px solid rgba(168,85,247,.45); border-radius: 12px; padding: 1.4rem 1.6rem; margin-bottom: .8rem; }
.interp-header { display: flex; align-items: center; gap: .6rem; margin-bottom: .6rem; direction: rtl; }
.interp-icon { font-size: 1.4rem; }
.interp-title { font-size: 1rem; font-weight: 700; color: #c4b5fd; direction: rtl; }
.interp-input-ar { font-size: 1.6rem; font-family: 'Amiri', serif; color: #f8f9fa; direction: rtl; text-align: right; margin-bottom: .3rem; }
.interp-subtitle { font-size: .82rem; color: rgba(255,255,255,.65); direction: rtl; text-align: right; margin-bottom: .8rem; }
.interp-list { display: flex; flex-direction: column; gap: .5rem; }
.interp-btn { display: flex; align-items: center; gap: .7rem; width: 100%; background: rgba(168,85,247,.1); border: 1.5px solid rgba(168,85,247,.3); border-radius: 10px; padding: .7rem 1rem; cursor: pointer; transition: all .2s; direction: rtl; text-align: right; }
.interp-btn:hover { background: rgba(168,85,247,.22); border-color: rgba(168,85,247,.6); transform: translateY(-1px); }
.interp-btn.conf-high { border-color: rgba(168,85,247,.5); }
.interp-btn.conf-medium { border-color: rgba(253,126,20,.4); }
.interp-btn.conf-low { border-color: rgba(220,53,69,.35); }
.interp-btn-icon { font-size: 1.1rem; flex-shrink: 0; }
.interp-btn-body { flex: 1; min-width: 0; }
.interp-btn-ar { font-family: 'Amiri', serif; font-size: 1.1rem; color: #f8f9fa; line-height: 1.4; }
.interp-btn-en { font-size: .78rem; color: rgba(255,255,255,.7); margin-top: .15rem; }
.interp-btn-arrow { font-size: 1rem; color: rgba(168,85,247,.6); flex-shrink: 0; }
.recovery-note { display: flex; align-items: center; gap: .5rem; background: rgba(59,130,246,.12); border: 1px solid rgba(59,130,246,.3); border-radius: 8px; padding: .55rem .9rem; margin-bottom: .6rem; font-size: .82rem; color: #93bbfd; direction: rtl; }
.recovery-icon { font-size: 1rem; }
.recovery-text { flex: 1; }
.teacher-info-bar { background: #fff; border-radius: 12px; padding: .9rem 1.1rem; margin-bottom: .6rem; box-shadow: 0 1px 4px rgba(0,0,0,.06); display: none; }
.teacher-grammar-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin-bottom: .6rem; }
.teacher-badge { display: inline-flex; align-items: center; gap: .3rem; font-size: .68rem; font-weight: 600; padding: .25rem .6rem; border-radius: 5px; white-space: nowrap; }
.tb-transit { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
.tb-transit.tb-intrans { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
.tb-transit.tb-both { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
.tb-freq { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
.tb-freq-low { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
.tb-freq-med { background: #fffbeb; color: #92400e; border-color: #fde68a; }
.tb-ilr { background: #f5f3ff; color: #5b21b6; border: 1px solid #ddd6fe; }
.tb-detect { background: #f8fafc; color: #111827; border: 1px solid #e2e8f0; }
.teacher-freq-dots { display: inline-flex; gap: 2px; margin-left: .2rem; }
.teacher-freq-dot { width: 5px; height: 5px; border-radius: 50%; background: #22c55e; }
.teacher-freq-dot.dot-off { background: #e2e8f0; }
.teacher-vc-card { display: none; }
.teacher-tips { display: none; }
.teach-card { display: none; }
.hero-notes { margin-top: .75rem; padding-top: .6rem; border-top: 1px solid rgba(255,255,255,.12); direction: rtl; }
.hero-note-item { margin-bottom: .35rem; line-height: 1.6; font-size: .95rem; }
.hero-note-item:last-child { margin-bottom: 0; }
.hero-note-item::before { content: '\u25CF'; color: rgba(255,255,255,.4); font-size: .5rem; margin-left: .4rem; vertical-align: middle; }
.hero-note-ar { color: #fff; font-weight: 600; }
.hero-note-en { color: rgba(255,255,255,.65); font-size: .85rem; font-weight: 400; }
.teacher-tip-icon { margin-left: .3rem; }
.rf-tooltip { position: fixed; z-index: 9999; background: #1a1a2e; color: #f0f0f0; border-radius: 8px; padding: .55rem .75rem; font-size: .72rem; line-height: 1.5; max-width: 280px; box-shadow: 0 4px 16px rgba(0,0,0,.25); pointer-events: auto; opacity: 0; transform: translateY(4px); transition: opacity .15s, transform .15s; }
.rf-tooltip.rf-visible { opacity: 1; transform: translateY(0); }
.rf-tooltip-title { font-weight: 700; font-size: .68rem; color: #e63946; margin-bottom: .2rem; direction: rtl; }
.rf-tooltip-ar { font-family: 'Amiri', serif; font-size: .88rem; color: #fff; direction: rtl; margin-bottom: .15rem; }
.rf-tooltip-line { color: rgba(255,255,255,.8); font-size: .68rem; margin-bottom: .1rem; }
.rf-tooltip-line:last-child { margin-bottom: 0; }
.rf-tooltip-hint { color: #fbbf24; font-size: .64rem; font-style: italic; margin-top: .2rem; }
.rf-tooltip-close { position: absolute; top: 2px; right: 6px; background: none; border: none; color: rgba(255,255,255,.4); font-size: .7rem; cursor: pointer; padding: 2px 4px; }
.rf-tooltip-close:hover { color: #fff; }
.hero-root-line { cursor: pointer; transition: color .15s; }
.hero-root-line:hover { color: rgba(255,255,255,.95); text-decoration: underline; text-underline-offset: 3px; }
.hero-root-letters { display: inline; }
.hero-root-letter { font-weight: 700; transition: color .15s; }
.hero-root-letter:hover { color: #fbbf24; }
.root-panel-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.45); z-index: 9998; opacity: 0; transition: opacity .2s; display: none; }
.root-panel-overlay.rp-open { display: block; opacity: 1; }
.root-panel { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; border-radius: 14px; width: min(92vw, 380px); max-height: 80vh; overflow-y: auto; z-index: 9999; box-shadow: 0 8px 32px rgba(0,0,0,.2); }
.root-panel-hdr { padding: .8rem 1rem; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; }
.root-panel-title { font-size: .82rem; font-weight: 700; color: #1a1a2e; direction: rtl; }
.root-panel-root { font-family: 'Amiri', serif; font-size: 1.3rem; color: #e63946; font-weight: 700; direction: rtl; }
.root-panel-close { background: none; border: none; font-size: 1.1rem; color: #111827; cursor: pointer; padding: .2rem .4rem; }
.root-panel-close:hover { color: #1a1a2e; }
.root-panel-body { padding: .6rem .8rem; }
.root-panel-empty { text-align: center; padding: 1.5rem 1rem; color: #111827; font-size: .78rem; }
.rp-verb { display: flex; align-items: center; gap: .5rem; padding: .55rem .6rem; border-radius: 8px; cursor: pointer; transition: background .15s; border-bottom: 1px solid #f1f5f9; direction: rtl; }
.rp-verb:last-child { border-bottom: none; }
.rp-verb:hover { background: #f8fafc; }
.rp-verb-ar { font-family: 'Amiri', serif; font-size: 1.15rem; color: #1a1a2e; font-weight: 700; min-width: 65px; }
.rp-verb-form { font-size: .6rem; font-weight: 700; color: #fff; background: #1a1a2e; padding: .15rem .35rem; border-radius: 4px; white-space: nowrap; }
.rp-verb-gloss { font-size: .7rem; color: #111827; flex: 1; text-align: left; direction: ltr; }
.rp-verb-masdar { font-size: .7rem; color: #111827; font-family: 'Amiri', serif; }
.rp-current { background: #fef3c7 !important; }
.conj-table td { position: relative; cursor: default; }
.conj-table td:not(.cell-empty):not(.td-label):not(.td-en-label) { cursor: help; }
.hl-affix { color: #dc2626; }
.smart-note { display: none; }
.usage-card { background: #fff; border-radius: 12px; padding: 1.1rem 1.3rem; margin-top: .6rem; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.usage-hdr { font-size: .92rem; font-weight: 700; color: #1a1a2e; text-transform: uppercase; letter-spacing: .05em; margin-bottom: .6rem; display: flex; align-items: center; gap: .4rem; cursor: default; }
.usage-level { margin-bottom: .9rem; padding: .6rem .8rem; background: #fafbfe; border-radius: 8px; }
.usage-level-label { font-size: .78rem; font-weight: 700; color: #e63946; text-transform: uppercase; letter-spacing: .04em; margin-bottom: .3rem; }
.usage-level-ar { font-size: 1.55rem; direction: rtl; text-align: right; color: #1a1a2e; font-weight: 600; line-height: 1.55; }
.usage-level-en { font-size: .92rem; color: #444; font-style: italic; line-height: 1.5; margin-top: .25rem; }
.usage-patterns { display: flex; flex-direction: column; gap: .6rem; }
.usage-pat { background: #f0f4ff; border-radius: 8px; padding: .7rem 1rem; direction: rtl; }
.usage-pat-ar { font-size: 1.5rem; color: #1a1a2e; font-weight: 600; line-height: 1.55; }
.usage-pat-en { font-size: .88rem; color: #444; line-height: 1.5; margin-top: .2rem; }
.usage-mistakes { display: flex; flex-direction: column; gap: .6rem; }
.usage-mis { background: #fff5f5; border-radius: 8px; padding: .7rem 1rem; border-right: 3px solid #e63946; border-left: none; }
.usage-mis-row { display: flex; gap: .5rem; align-items: baseline; direction: rtl; font-size: 1.5rem; font-weight: 600; line-height: 1.55; }
.usage-mis-wrong { color: #e63946; text-decoration: line-through; font-weight: 600; }
.usage-mis-arrow { color: #888; }
.usage-mis-right { color: #2a9d4a; font-weight: 600; }
.usage-mis-note { font-size: .88rem; color: #444; margin-top: .25rem; line-height: 1.5; }
.usage-nested-acc { margin-top: .5rem; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
.usage-nested-hdr { width: 100%; display: flex; align-items: center; justify-content: center; gap: .5rem; padding: .55rem .8rem; background: #f4f5f8; border: none; cursor: pointer; font-family: inherit; transition: background .15s; }
.usage-nested-hdr:hover { background: #ecedf2; }
.usage-nested-hdr .acc-arrow { font-size: .85rem; }
.usage-nested-hdr .usage-hdr { margin-bottom: 0; font-size: .85rem; }
.usage-nested-body { display: none; padding: .6rem .8rem; }
.usage-nested-acc.open .usage-nested-body { display: block; }
.usage-nested-acc.open .acc-arrow { transform: rotate(180deg); }
.trust-panel { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; padding: .85rem 1rem; margin-top: .7rem; }
.trust-title { font-size: .68rem; font-weight: 700; color: rgba(255,255,255,.55); letter-spacing: .04em; text-transform: uppercase; margin-bottom: .55rem; display: flex; align-items: center; gap: .35rem; }
.trust-title-ar { direction: rtl; font-size: .78rem; color: rgba(255,255,255,.65); font-weight: 600; letter-spacing: 0; text-transform: none; }
.trust-grid { display: grid; grid-template-columns: auto 1fr; gap: .2rem .7rem; font-size: .74rem; align-items: baseline; direction: rtl; }
.trust-lbl { color: rgba(255,255,255,.55); font-weight: 600; white-space: nowrap; text-align: right; }
.trust-val { color: rgba(255,255,255,.75); direction: rtl; text-align: right; }
.trust-val-en { color: rgba(255,255,255,.7); font-size: .7rem; margin-right: .3rem; }
.trust-conf { display: inline-flex; align-items: center; gap: .3rem; }
.trust-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.trust-dot-high { background: #28a745; }
.trust-dot-medium { background: #f6ad55; }
.trust-dot-low { background: #e63946; }
.trust-reason { color: rgba(255,255,255,.55); font-size: .7rem; margin-top: .4rem; direction: rtl; text-align: right; border-top: 1px solid rgba(255,255,255,.06); padding-top: .4rem; }
.nc-conf { display: inline-flex; align-items: center; gap: .25rem; font-size: .62rem; font-weight: 600; margin-top: .25rem; }
.nc-conf-high { color: #28a745; }
.nc-conf-medium { color: #f6ad55; }
.nc-conf-low { color: #e63946; }
.nc-expl { font-size: .7rem; color: #111827; direction: rtl; text-align: right; margin-top: .25rem; line-height: 1.4; }
.exp-btn { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid rgba(0,0,0,.15); background: transparent; color: rgba(0,0,0,.4); font-size: .6rem; font-weight: 700; cursor: pointer; transition: all .2s; flex-shrink: 0; font-family: sans-serif; line-height: 1; padding: 0; }
.exp-btn:hover { background: rgba(230,57,70,.1); border-color: #e63946; color: #e63946; }
.exp-panel { display: none; margin-top: .4rem; padding: .55rem .7rem; background: rgba(26,26,46,.04); border: 1px solid rgba(0,0,0,.08); border-radius: 8px; font-size: .68rem; line-height: 1.55; direction: rtl; text-align: right; }
.exp-panel.exp-open { display: block; }
.exp-row { margin-bottom: .25rem; }
.exp-label { font-weight: 700; color: rgba(0,0,0,.7); margin-left: .3rem; }
.exp-val { color: rgba(0,0,0,.7); }
.exp-en { font-size: .64rem; color: rgba(0,0,0,.5); direction: ltr; text-align: left; margin-top: .05rem; }
.exp-weak { color: #b45309; font-weight: 600; }
.exp-rule { font-style: italic; color: rgba(0,0,0,.55); border-top: 1px solid rgba(0,0,0,.06); padding-top: .25rem; margin-top: .2rem; }
.vf-exp-btn { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid rgba(146,64,14,.25); background: transparent; color: #92400e; font-size: .55rem; font-weight: 700; cursor: pointer; transition: all .2s; margin-top: .2rem; font-family: sans-serif; line-height: 1; padding: 0; }
.vf-exp-btn:hover { background: rgba(146,64,14,.1); border-color: #92400e; }
.vf-exp-panel { display: none; margin-top: .35rem; padding: .45rem .6rem; background: rgba(146,64,14,.06); border: 1px solid rgba(146,64,14,.12); border-radius: 6px; font-size: .62rem; line-height: 1.5; direction: rtl; text-align: right; }
.vf-exp-panel.exp-open { display: block; }
.badge-det { font-size: .65rem; padding: .17rem .52rem; border-radius: 4px; }
.badge-det.lexicon_exact { background: rgba(40,167,69,.28); color: #5cdb75; }
.badge-det.surface_heuristic { background: rgba(253,126,20,.28); color: #ffb369; }
.badge-det.user_forced { background: rgba(100,149,237,.28); color: #9ab5ff; }
.transit-badge { display: inline-block; font-size: .7rem; font-weight: 700; padding: .2rem .6rem; border-radius: 999px; }
.transit-t { background: rgba(40,167,69,.22); color: #7fde9e; }
.transit-i { background: rgba(100,149,237,.22); color: #9ab5ff; }
.transit-b { background: rgba(253,126,20,.22); color: #ffb369; }
.hero-example {
  background: rgba(255,255,255,.07); border-radius: 10px;
  padding: .75rem .95rem; border-right: 3px solid #e63946; border-left: none;
}
.hero-ex-lbl { font-size: .64rem; color: rgba(255,255,255,.55); font-weight: 700; letter-spacing: .06em; margin-bottom: .2rem; }
.hero-ex-ar { font-size: 1.05rem; direction: rtl; text-align: right; color: rgba(255,255,255,.88); margin-bottom: .18rem; line-height: 1.5; }
.hero-ex-en { font-size: .75rem; color: rgba(255,255,255,.65); font-style: italic; }

/* ── Accordion ─────────────────────────────────── */
.acc-item { background: #fff; border-radius: 12px; margin-bottom: .4rem; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.acc-hdr {
  width: 100%; display: flex; align-items: center; justify-content: center;
  padding: .75rem 1.2rem; background: #f8f9fb; border: none; cursor: pointer;
  font-family: inherit; text-align: center; direction: rtl; -webkit-tap-highlight-color: transparent;
  gap: .7rem; transition: background .15s;
}
.acc-hdr:hover { background: #eef0f5; }
.acc-hdr:active { background: #e4e6ed; }
.acc-hdr-left { display: flex; align-items: center; justify-content: center; gap: .6rem; }
.acc-icon { font-size: 1.2rem; flex-shrink: 0; }
.acc-title { font-size: 1.3rem; font-weight: 700; color: #1a1a2e; }
.acc-title-ar { font-size: 1.2rem; font-weight: 700; color: #1a1a2e; }
.acc-title-en { font-size: .88rem; font-weight: 500; color: #555; }
.acc-sub { font-size: .78rem; color: #111827; margin-top: .1rem; }
.acc-arrow { font-size: 1.05rem; color: #1a1a2e; transition: transform .25s ease; flex-shrink: 0; }
.acc-item.open .acc-arrow { transform: rotate(180deg); }
.acc-body { display: none; border-top: 1px solid #e5e7eb; }
.acc-item.open .acc-body { display: block; }
.acc-inner { padding: 1.1rem 1.2rem; direction: rtl; text-align: right; }

/* ── Unified conjugation table ─────────────────── */
.conj-wrap {
  background: #fff;
  margin-bottom: .6rem;
  overflow: hidden;
}
.conj-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.conj-table {
  width: 100%;
  border-collapse: collapse;
  direction: ltr;
  min-width: 800px;
}
.conj-table th {
  font-weight: 700;
  padding: .55rem .5rem;
  text-align: right;
  border-bottom: 2px solid #e5e7eb;
  direction: ltr;
  vertical-align: bottom;
  white-space: nowrap;
  letter-spacing: .03em;
}
.conj-table .th-ar { display: block; direction: rtl; unicode-bidi: isolate; text-align: right; }
.conj-table .th-en { display: block; direction: ltr; unicode-bidi: isolate; text-align: right; margin-top: .15rem; }
.conj-table td {
  padding: .45rem .5rem;
  text-align: right;
  border-bottom: none;
  direction: ltr;
  vertical-align: top;
}
.conj-table tbody tr:not(.grp-hdr):nth-child(even) td { background: #fafbfe; }
.conj-table tr:last-child td { border-bottom: none; }
.conj-table .td-label {
  font-size: 1.18rem;
  color: #1a1a2e;
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
  direction: rtl;
  unicode-bidi: isolate;
  position: sticky;
  right: 0;
  background: #fff;
  z-index: 2;
}
.conj-table .ar { font-size: 1.38rem; line-height: 1.3; direction: rtl; unicode-bidi: isolate; text-align: right; font-weight: 600; color: #1a1a2e; }
.conj-table .tr { font-size: .68rem; color: #111827; font-style: italic; direction: ltr; unicode-bidi: isolate; text-align: left; margin-top: .1rem; }
.conj-table .cell-empty { color: #d1d5db; font-size: .85rem; text-align: center; direction: ltr; }
.conj-table tr.grp-hdr td {
  background: #f7f7fc;
  font-size: .68rem;
  color: #111827;
  font-weight: 700;
  letter-spacing: .03em;
  padding: .22rem .45rem;
  direction: ltr;
  text-align: right;
}
.conj-table tr.grp-hdr .grp-ar { unicode-bidi: isolate; direction: rtl; font-size: .75rem; }
.conj-table tr.grp-hdr .grp-en { unicode-bidi: isolate; direction: ltr; font-size: .6rem; letter-spacing: .04em; }

.conj-table th.col-past    { color: #1a1a2e; background: #f0f0f8; }
.conj-table th.col-present { color: #1e40af; background: #eff6ff; }
.conj-table th.col-future  { color: #92400e; background: #fffbeb; }
.conj-table th.col-imp     { color: #065f46; background: #ecfdf5; }
.conj-table th.col-pp      { color: #92400e; background: #fffbeb; }
.conj-table th.col-ppres   { color: #991b1b; background: #fef2f2; }
.conj-table th.col-pronoun { color: #1a1a2e; background: #f9fafb; }
.conj-table th.col-en-pronoun { color: #111827; background: #f9fafb; }
.conj-table .td-en-label {
  font-size: .72rem;
  color: #111827;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  direction: ltr;
  unicode-bidi: isolate;
  letter-spacing: .03em;
  text-transform: uppercase;
}

.no-passive-note {
  text-align: center; padding: .5rem; color: #111827; font-size: .72rem; font-style: italic;
  background: #fafafa; border-bottom: 1px solid #f3f3f3;
}

/* ── Derived cards ─────────────────────────────── */
.deriv-grid { display: none; }
.deriv-card { display: none; }
.dc-label { display: none; }
.dc-ar { font-size: 1.6rem; color: #1a1a2e; direction: rtl; font-weight: 600; }
.dc-tr { font-size: .72rem; color: #111827; font-style: italic; }
.cdn-table { width: 100%; }
.cdn-row { display: grid; grid-template-columns: minmax(100px, .8fr) minmax(100px, 1fr) 1fr; gap: .5rem 1rem; align-items: center; padding: .7rem .5rem; border-bottom: 1px solid #f0f0f5; }
.cdn-row:last-child { border-bottom: none; }
.cdn-cat { text-align: right; direction: rtl; }
.grammar-label { font-size: 1.05rem; font-weight: 700; color: #111827; letter-spacing: .02em; }
.grammar-label-en { font-size: .85rem; font-weight: 500; color: #111827; }
.cdn-cat-ar { display: block; line-height: 1.4; }
.cdn-cat-en { display: block; margin-top: .1rem; }
.cdn-form { text-align: center; }
.cdn-ar { display: block; font-size: 1.5rem; font-weight: 700; color: #1a1a2e; direction: rtl; line-height: 1.3; }
.cdn-tr { display: block; font-size: .72rem; color: #111827; font-style: italic; margin-top: .1rem; }
.cdn-gloss { font-size: .78rem; color: #111827; line-height: 1.45; }
.cdn-expl { font-size: .72rem; color: #111827; direction: rtl; text-align: right; margin-top: .15rem; }
@media (max-width: 500px) {
  .cdn-row { grid-template-columns: 1fr; text-align: center; gap: .2rem; padding: .6rem .3rem; }
  .cdn-cat { text-align: center; }
  .cdn-gloss { text-align: center; }
  .cdn-expl { text-align: center; }
}
.dc-en { font-size: .75rem; color: #111827; margin-top: .3rem; font-weight: 400; }
.st-badge { display: none; }

/* ── Preposition list (simplified) ─────────────── */
.prep-list { display: flex; flex-direction: column; gap: .55rem; }
.prep-item { display: flex; align-items: baseline; gap: .5rem; padding: .55rem .4rem; direction: rtl; }
.prep-item:not(:last-child) { border-bottom: 1px solid #f5f5f5; }
.prep-ar { font-size: 1.15rem; direction: rtl; color: #1a1a2e; font-weight: 700; white-space: nowrap; }
.prep-arrow { color: #111827; font-size: .85rem; }
.prep-en { font-size: .85rem; color: #111827; font-weight: 400; }
.prep-table { width: 100%; border-collapse: collapse; }
.prep-table th { font-size: .82rem; color: #1a1a2e; font-weight: 700; padding: .5rem .7rem; text-align: right; border-bottom: 2px solid #e5e7eb; text-transform: uppercase; letter-spacing: .03em; }
.prep-table td { padding: .6rem .7rem; border-bottom: none; vertical-align: top; }
.prep-table tr:not(:last-child) td { border-bottom: 1px solid #f0f1f5; }
.td-prep { font-size: 1.35rem; direction: rtl; color: #1a1a2e; font-weight: 700; white-space: nowrap; }
.td-meaning { font-size: .95rem; color: #333; font-weight: 500; }
.td-ex-ar { font-size: 1.15rem; direction: rtl; text-align: right; color: #1a1a2e; font-weight: 500; line-height: 1.5; }
.td-ex-en { font-size: .82rem; color: #555; font-style: italic; margin-top: .15rem; }

/* ── Noun cards ────────────────────────────────── */
#derivedNounsContent { direction: ltr; text-align: left; }
.noun-grid { display: grid; grid-template-columns: 1fr; gap: .75rem; width: 100%; }
@media (min-width: 400px) { .noun-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 600px) { .noun-grid { grid-template-columns: repeat(3, 1fr); } }
.noun-card { border: 1.5px solid #e8eaf0; border-radius: 12px; padding: 1.1rem 1rem; text-align: center; background: #fff; width: 100%; box-sizing: border-box; }
.noun-card.nc-attested { border-color: #a7f3d0; background: #fafffe; }
.nc-ar { font-size: 1.6rem; direction: rtl; color: #1a1a2e; margin-bottom: .25rem; font-weight: 700; line-height: 1.3; }
.nc-tr { font-size: .78rem; color: #111827; font-style: italic; margin-bottom: .35rem; }
.nc-pattern { font-size: .72rem; color: #4f46e5; font-weight: 600; margin-bottom: .25rem; }
.nc-label { font-size: .78rem; color: #111827; font-weight: 400; line-height: 1.4; }
.nc-cat { margin-bottom: .4rem; }
.nc-cat-ar { display: block; font-size: .82rem; color: #1a1a2e; direction: rtl; font-weight: 600; }
.nc-cat-en { display: block; font-size: .68rem; color: #111827; text-transform: uppercase; letter-spacing: .03em; margin-top: .1rem; }
.nc-type-tag { display: inline-block; font-size: .62rem; color: #111827; background: #f3f4f6; padding: .15rem .5rem; border-radius: 999px; margin-top: .3rem; }
.nc-type { font-size: .66rem; color: #111827; margin-top: .15rem; text-transform: uppercase; letter-spacing: .04em; }
.dn-group { margin-bottom: 1.2rem; width: 100%; }
.dn-group:last-child { margin-bottom: 0; }
.dn-group-hdr { display: flex; align-items: baseline; gap: .5rem; margin-bottom: .6rem; direction: rtl; border-bottom: 1px solid #eef0f4; padding-bottom: .4rem; }
.dn-group-title { font-size: .85rem; font-weight: 700; color: #1a1a2e; }
.dn-group-en { font-size: .72rem; color: #111827; font-weight: 400; }
.na-msg { text-align: center; padding: 1rem; color: #111827; font-size: .82rem; font-style: italic; }
.status-badge { display: none; }
.sb-attested   { background: rgba(40,167,69,.12);  color: #28a745; }
.sb-rare       { background: rgba(253,126,20,.12); color: #d97706; }
.sb-theoretical{ background: rgba(108,117,125,.1); color: #111827; }
.sb-na         { background: rgba(220,53,69,.08);  color: #111827; }

/* ── Verb forms grid ───────────────────────────── */
.forms-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: .8rem; }
@media (min-width: 440px) { .forms-grid { grid-template-columns: repeat(3, 1fr); } }
.form-card { border: 1.5px solid #e8eaf0; border-radius: 10px; padding: .9rem .8rem; position: relative; }
.form-card.fc-current { border-color: #1a1a2e; background: #fafbfe; }
.form-card.fc-attested { border-color: #86efac; }
.form-card.fc-current.fc-attested { border-color: #1a1a2e; background: #fafbfe; }
.fc-tag { position: absolute; top: .4rem; right: .4rem; font-size: .58rem; padding: .12rem .45rem; border-radius: 4px; font-weight: 700; }
.t-current { background: #1a1a2e; color: #fff; }
.t-attested { background: rgba(40,167,69,.12); color: #28a745; }
.t-theoretical { background: rgba(108,117,125,.08); color: #111827; }
.fc-form-num { font-size: .65rem; font-weight: 700; color: #111827; letter-spacing: .08em; margin-bottom: .15rem; text-transform: uppercase; }
.form-meaning { font-size: .68rem; color: #111827; font-weight: 500; margin-bottom: .4rem; letter-spacing: .02em; text-transform: uppercase; }
.fc-past { font-size: 1.35rem; color: #1a1a2e; direction: rtl; line-height: 1.3; font-weight: 600; }
.fc-past-tr { font-size: .7rem; color: #111827; font-style: italic; margin-bottom: .5rem; }
.fc-rows { border-top: 1px solid #eef0f4; margin-top: .35rem; padding-top: .15rem; }
.fc-row { display: flex; justify-content: space-between; align-items: flex-start; padding: .35rem 0; border-bottom: none; gap: .35rem; }
.fc-row:last-child { border-bottom: none; }
.fc-row-label { font-size: .66rem; color: #111827; white-space: nowrap; flex-shrink: 0; }
.fc-row-val { text-align: right; direction: rtl; }
.fc-row-ar { font-size: .88rem; color: #1a1a2e; }
.fc-row-tr { font-size: .7rem; color: #111827; font-style: italic; }
.fc-example { margin-top: .42rem; padding: .38rem .5rem; background: #f9f9ff; border-radius: 5px; border-right: 2px solid #c0c8ee; border-left: none; }
.fce-ar { font-size: .78rem; direction: rtl; text-align: right; color: #1a1a2e; }
.fce-en { font-size: .7rem; color: #111827; font-style: italic; }

/* ── Legend strip ──────────────────────────────── */
.legend-strip { display: none; }

#result { display: none; }

/* ══════════════════════════════════════════════════
   SENTENCE-IN-A-WORD  (new feature)
══════════════════════════════════════════════════ */

/* ── Mode tabs on home card ──────────────────────── */
.mode-tabs {
  display: flex; margin-bottom: 1.5rem;
  border: 1.5px solid #e4e6f0; border-radius: 12px; overflow: hidden;
}
.mode-tab {
  flex: 1; padding: .65rem .5rem; background: #fafafa; border: none;
  font-size: .82rem; font-weight: 700; color: #111827; cursor: pointer;
  -webkit-tap-highlight-color: transparent; transition: background .12s, color .12s;
}
.mode-tab.active { background: #1a1a2e; color: #fff; }
.mode-tab:first-child { border-right: 1.5px solid #e4e6f0; }

/* ── Sentence-mode panel ─────────────────────────── */
#sentenceModePanel { display: none; }

/* sentence examples (SentenceSnap) */
.ssnap-chips { display: flex; flex-direction: column; gap: .4rem; margin-bottom: .5rem; }
.ssnap-chip {
  width: 100%; text-align: right; direction: rtl; padding: .52rem 1rem;
  background: #f0f2f8; border: 1.5px solid #e4e6f0; border-radius: 12px;
  font-size: 1.1rem; cursor: pointer; font-family: inherit; color: #1a1a2e;
  display: flex; justify-content: space-between; align-items: center;
  -webkit-tap-highlight-color: transparent;
}
.ssnap-chip:hover { background: #1a1a2e; color: #fff; border-color: #1a1a2e; }
.ssnap-chip:active { background: #e63946; border-color: #e63946; color: #fff; }
.ssnap-gloss { font-size: .7rem; color: #111827; direction: ltr; font-family: sans-serif; }
.ssnap-chip:hover .ssnap-gloss, .ssnap-chip:active .ssnap-gloss { color: rgba(255,255,255,.6); }

/* ── Sentence view (full-screen, like analysisView) ─ */
#sentenceView { display: none; background: #f0f2f8; min-height: 100vh; }

/* ── Word breakdown visual ───────────────────────── */
.breakdown-word {
  display: flex; flex-direction: row-reverse; justify-content: center;
  flex-wrap: wrap; gap: .35rem; margin-bottom: 1.2rem;
  padding: .85rem .6rem; background: #1a1a2e; border-radius: 14px;
}
.seg {
  text-align: center; padding: .45rem .7rem; border-radius: 9px; min-width: 44px;
}
.seg-ar    { font-size: 1.9rem; line-height: 1.2; display: block; }
.seg-tr    { font-size: .6rem; opacity: .65; display: block; margin-top: .1rem; }
.seg-label { font-size: .54rem; font-weight: 700; letter-spacing: .05em;
             text-transform: uppercase; display: block; margin-top: .2rem; opacity: .8; }
.seg-prefix       { background: rgba(99,179,237,.22); color: #63b3ed; }
.seg-stem         { background: rgba(255,255,255,.14); color: #fff; }
.seg-subj-suffix  { background: rgba(104,211,145,.22); color: #68d391; }
.seg-obj-suffix   { background: rgba(252,129,129,.22); color: #fc8181; }

/* ── Sentence breakdown table ────────────────────── */
.sent-summary {
  background: #fff; border-radius: 12px; padding: 1rem; margin-bottom: .5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,.07);
}
.sent-row { display: flex; gap: .7rem; align-items: baseline; padding: .38rem 0; border-bottom: 1px solid #f5f5f5; }
.sent-row:last-child { border-bottom: none; }
.sr-role { font-size: .66rem; font-weight: 700; color: #111827; letter-spacing: .05em;
           text-transform: uppercase; width: 80px; flex-shrink: 0; }
.sr-ar   { font-size: 1.05rem; direction: rtl; color: #1a1a2e; flex-shrink: 0; }
.sr-info { font-size: .78rem; color: #111827; }
.sr-interps { font-size: .72rem; color: #e63946; font-style: italic; }

/* ── Interpretation cards ────────────────────────── */
.interp-list { display: flex; flex-direction: column; gap: .45rem; }
.interp-card {
  padding: .75rem 1rem; border-radius: 12px; border: 1.5px solid #e4e6f0;
  background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.06);
}
.interp-card.animate-card   { border-color: rgba(104,211,145,.45); background: rgba(104,211,145,.05); }
.interp-card.inanimate-card { border-color: rgba(99,179,237,.45);  background: rgba(99,179,237,.05); }
.interp-sentence { font-size: 1.08rem; font-weight: 700; color: #1a1a2e; margin-bottom: .2rem; }
.interp-tag {
  display: inline-block; font-size: .6rem; font-weight: 700; padding: .12rem .48rem;
  border-radius: 999px; letter-spacing: .04em;
}
.tag-animate   { background: rgba(104,211,145,.18); color: #2d8a55; }
.tag-inanimate { background: rgba(99,179,237,.18);  color: #2b6cb0; }
.interp-note   { font-size: .7rem; color: #111827; margin-top: .15rem; }

/* ── Ambiguity note ──────────────────────────────── */
.ambig-note {
  background: rgba(253,126,20,.08); border: 1px solid rgba(253,126,20,.25);
  border-radius: 8px; padding: .5rem .75rem; font-size: .75rem; color: #b45309;
  margin-bottom: .6rem;
}

/* ══════════════════════════════════════════════════
   ROOT-FIRST DERIVATION  (new sections)
══════════════════════════════════════════════════ */

.sect-lbl {
  font-size: .66rem; font-weight: 700; color: #111827; letter-spacing: .08em;
  text-transform: uppercase; margin-bottom: .7rem;
}

/* ── Root header card ───────────────────────────── */
.root-header-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 14px; padding: 1rem 1.1rem; margin-bottom: .5rem;
  border: 1px solid rgba(255,255,255,.06);
}
.root-letters-row {
  display: flex; align-items: center; gap: .65rem; margin-bottom: .45rem; flex-wrap: wrap;
}
.root-letters {
  font-size: 2rem; direction: rtl; color: #63b3ed; letter-spacing: .14em;
  font-weight: 700; line-height: 1;
}
.root-gloss { font-size: .78rem; color: rgba(255,255,255,.65); font-style: italic; }
.form-row { display: flex; align-items: center; gap: .55rem; flex-wrap: wrap; margin-bottom: .3rem; }
.form-badge {
  font-size: .68rem; font-weight: 700; padding: .18rem .6rem;
  background: rgba(104,211,145,.18); color: #68d391; border-radius: 7px; letter-spacing: .04em;
}
.form-pattern { font-size: .9rem; direction: rtl; color: rgba(104,211,145,.85); }
.form-note { font-size: .68rem; color: rgba(255,255,255,.55); }

/* ── Derivation chain ───────────────────────────── */
.deriv-chain {
  display: flex; align-items: flex-start; overflow-x: auto; gap: 0;
  padding: .85rem .5rem .65rem; background: #0d1117; border-radius: 14px;
  margin-bottom: .5rem; -webkit-overflow-scrolling: touch;
  border: 1px solid rgba(255,255,255,.05);
}
.deriv-step {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  min-width: 80px; flex-shrink: 0;
}
.dstep-ar { font-size: 1.3rem; direction: rtl; line-height: 1.3; margin-bottom: .1rem; }
.dstep-tr { font-size: .56rem; color: rgba(255,255,255,.45); margin-bottom: .1rem; direction: ltr; }
.dstep-lbl {
  font-size: .5rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  margin-bottom: .06rem; line-height: 1.2;
}
.dstep-desc {
  font-size: .56rem; color: rgba(255,255,255,.45); font-style: italic;
  max-width: 78px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.deriv-arrow {
  font-size: .95rem; color: rgba(255,255,255,.35); align-self: center;
  padding: 0 .12rem; flex-shrink: 0; padding-bottom: 1.1rem;
}
.dstep-root .dstep-ar  { color: #63b3ed; letter-spacing: .1em; font-size: 1.2rem; }
.dstep-root .dstep-lbl { color: #63b3ed; }
.dstep-base .dstep-ar  { color: #68d391; }
.dstep-base .dstep-lbl { color: #68d391; }
.dstep-pres .dstep-ar  { color: #fbb6ce; }
.dstep-pres .dstep-lbl { color: #fbb6ce; }
.dstep-inflected .dstep-ar  { color: #f6ad55; }
.dstep-inflected .dstep-lbl { color: #f6ad55; }
.dstep-full .dstep-ar  { color: #fff; font-size: 1.5rem; }
.dstep-full .dstep-lbl { color: rgba(255,255,255,.7); }

/* ── Affix breakdown list ───────────────────────── */
.affix-list { display: flex; flex-direction: column; gap: .3rem; }
.affix-row {
  display: flex; align-items: center; gap: .5rem;
  padding: .42rem .6rem; border-radius: 9px;
  border: 1px solid #e4e6f0; background: #fff;
}
.affix-ar { font-size: 1rem; direction: rtl; min-width: 40px; text-align: right; font-weight: 700; }
.affix-tr { font-size: .64rem; color: #111827; min-width: 32px; }
.affix-meaning { font-size: .74rem; color: #444; flex: 1; }
.affix-tag {
  margin-right: auto; font-size: .57rem; font-weight: 700; padding: .09rem .4rem;
  border-radius: 999px; letter-spacing: .04em; white-space: nowrap; flex-shrink: 0;
}
.affix-future  .affix-ar { color: #b45309; } .affix-future  .affix-tag { background: rgba(217,119,6,.18);  color: #92400e; }
.affix-xprefix .affix-ar { color: #1d4ed8; } .affix-xprefix .affix-tag { background: rgba(59,130,246,.18);  color: #1e40af; }
.affix-xsuffix .affix-ar { color: #059669; } .affix-xsuffix .affix-tag { background: rgba(5,150,105,.18);   color: #065f46; }
.affix-object  .affix-ar { color: #b91c1c; } .affix-object  .affix-tag { background: rgba(220,38,38,.18);   color: #991b1b; }

/* ══════════════════════════════════════════════════
   HIGH-CONTRAST THEME OVERRIDES
   Replaces all washed-out #bbb/#ccc/#999/low-alpha
   with readable values and per-section accents.
══════════════════════════════════════════════════ */

/* ── Global page bg ──────────────────────────────── */
#analysisView, #sentenceView { background: #f1f5f9; }

/* ── Home screen – readable secondary text ───────── */
.home-logo-ar { color: #fff !important; opacity: .85 !important; }
.home-tagline  { color: rgba(255,255,255,.72) !important; }
.home-sec-hdr  { color: #111827 !important; }
.home-select   { color: #1a1a2e !important; border-color: #d1d5db !important; }

/* ── Hero card – readable support text ───────────── */
.hero-meta    { color: rgba(255,255,255,.78) !important; }
.hero-ex-lbl  { color: rgba(255,255,255,.72) !important; }
.hero-ex-ar   { color: rgba(255,255,255,.96) !important; }
.hero-ex-en   { color: rgba(255,255,255,.78) !important; }

/* ── Accordion shared ────────────────────────────── */
.cdn-row:nth-child(even) { background: #fafbfc; }
#acc-prep .prep-table th { background: #f8f9fb !important; }
#acc-prep .prep-table td { border-bottom-color: #e5e7eb !important; }
.vf-core { display:grid; grid-template-columns:repeat(3,1fr); gap:.5rem; margin-bottom:.75rem; }
.vf-core-card { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:.55rem .65rem; text-align:center; }
.vf-core-label { font-size:.65rem; font-weight:700; color:#92400e; text-transform:uppercase; letter-spacing:.04em; margin-bottom:.15rem; }
.vf-core-ar { font-size:1.15rem; font-family:'Noto Naskh Arabic',serif; color:#1a1a2e; line-height:1.4; }
.vf-core-tr { font-size:.68rem; color:#111827; font-style:italic; }
.vf-core-st { font-size:.58rem; margin-top:.15rem; }
.vf-core-st .st-lex { color:#059669; } .vf-core-st .st-rule { color:#d97706; }
.vf-derived-hdr { font-size:.72rem; font-weight:700; color:#111827; margin:.6rem 0 .35rem; cursor:pointer; }
.vf-derived-hdr:hover { color:#92400e; }
.vf-derived-list { display:grid; gap:.4rem; }
.vf-dv-card { display:flex; align-items:center; gap:.65rem; background:#fefce8; border:1px solid #fde68a; border-radius:8px; padding:.45rem .65rem; direction:rtl; }
.vf-dv-form { font-size:.62rem; font-weight:800; color:#d97706; min-width:3.2rem; text-align:center; background:#fffbeb; border:1px solid #fde68a; border-radius:4px; padding:.15rem .3rem; }
.vf-dv-ar { font-size:1.05rem; font-family:'Noto Naskh Arabic',serif; color:#1a1a2e; }
.vf-dv-gloss { font-size:.7rem; color:#111827; flex:1; }
.vf-dv-masdar { font-size:.72rem; color:#111827; }
@media(max-width:480px){ .vf-core{grid-template-columns:1fr;} .vf-dv-masdar{display:none;} }

#acc-forms .form-card.fc-current { border-color: #1a1a2e !important; }
#acc-forms .fc-form-num { color: #1a1a2e !important; font-weight: 800; }
#acc-forms .form-meaning { color: #111827 !important; }
#acc-forms .fce-ar { color: #1a1a2e !important; }

/* ── Table text contrast fixes ─────────────────── */
.conj-table .td-label { color: #1a1a2e !important; }
.conj-table .tr { color: #111827 !important; font-style: italic; }
.conj-table td { border-bottom-color: #e5e7eb !important; }
.conj-table .ar { color: #1a1a2e; }

/* ── Derived card text ──────────────────────────── */
.dc-ar   { color: #1a1a2e !important; }
.dc-tr   { color: #111827 !important; }
.nc-ar   { color: #1a1a2e !important; }
.nc-tr   { color: #111827 !important; }
.nc-type { color: #111827 !important; }
.nc-label { color: #111827; }
.na-msg  { color: #111827 !important; }
.nc-pattern { color: #4f46e5 !important; }

/* ── Prep table text ────────────────────────────── */
.td-meaning { color: #111827 !important; }
.td-ex-en   { color: #111827 !important; }
.td-ex-ar   { color: #1a1a2e !important; }

/* ── Forms I-X card text ────────────────────────── */
.fc-past    { color: #1a1a2e !important; }
.fc-past-tr { color: #111827 !important; }
.fc-row-label { color: #111827 !important; }
.fc-row-ar    { color: #1a1a2e !important; }
.fc-row-tr    { color: #111827 !important; }
.fce-en   { color: #111827 !important; }
.fc-example { border-right-color: #818cf8 !important; background: #f5f3ff !important; }
.fc-rows  { border-top-color: #e5e7eb !important; }
.fc-row   { border-bottom-color: #f1f5f9 !important; }

/* ── Imperative ─────────────────────────────────── */
.imp-title  { color: #0891b2 !important; letter-spacing: .08em; }
.imp-label  { color: #0891b2 !important; }
.imp-tr     { color: #111827 !important; }
.imp-cell   { background: #ecfeff !important; border: 1px solid #cffafe; }
.imp-section { border-top-color: #e5e7eb !important; }

/* ── No-passive note ────────────────────────────── */
.no-passive-note { color: #111827 !important; }

/* ── Legend ─────────────────────────────────────── */
.legend-strip { color: #111827 !important; }

/* ── Affix list ─────────────────────────────────── */
.affix-tr      { color: #111827 !important; }
.affix-meaning { color: #111827 !important; }

/* ── Root-first derivation (dark bg sections) ───── */
.root-gloss  { color: rgba(255,255,255,.85) !important; }
.form-note   { color: rgba(255,255,255,.72) !important; }
.dstep-tr    { color: rgba(255,255,255,.6) !important; }
.dstep-desc  { color: rgba(255,255,255,.55) !important; }
.deriv-arrow { color: rgba(255,255,255,.45) !important; }

/* ── Sentence summary ───────────────────────────── */
.sr-role { color: #111827 !important; }
.sr-ar   { color: #1a1a2e !important; }
.sr-info { color: #111827 !important; }

/* ── Interpretation cards ───────────────────────── */
.interp-sentence { color: #1a1a2e !important; }
.interp-note     { color: #111827 !important; }
.tag-animate   { background: rgba(5,150,105,.15) !important; color: #065f46 !important; }
.tag-inanimate { background: rgba(37,99,235,.12) !important; color: #1e40af !important; }

/* ── Section label (SECT-LBL) ───────────────────── */
.sect-lbl { color: #111827 !important; }

/* ── Acc-item shadow boost ──────────────────────── */
.acc-item { box-shadow: none; }

/* ══════════════════════════════════════════════════
   BĀB PICKER  (Form I vowel-pattern selector)
══════════════════════════════════════════════════ */
.bab-picker {
  padding: .75rem .5rem 1rem;
}
.bab-picker-hdr {
  display: flex; align-items: flex-start; gap: .75rem;
  margin-bottom: 1rem;
  padding: .75rem 1rem;
  background: #eff6ff; border: 1px solid #bfdbfe; border-radius: .75rem;
}
.bab-picker-icon { font-size: 1.5rem; line-height: 1; flex-shrink: 0; }
.bab-picker-title { font-size: .82rem; font-weight: 700; color: #1e40af; margin-bottom: .15rem; }
.bab-picker-sub { font-size: .78rem; color: #111827; }

.bab-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: .55rem;
}
@media (min-width: 480px) { .bab-grid { grid-template-columns: repeat(3, 1fr); } }

.bab-btn {
  display: flex; flex-direction: column; align-items: center;
  gap: .2rem; padding: .7rem .5rem .6rem;
  background: #fff; border: 1.5px solid #e5e7eb; border-radius: .75rem;
  cursor: pointer; transition: border-color .15s, box-shadow .15s, transform .1s;
  text-align: center; width: 100%;
}
.bab-btn:hover {
  border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,.12);
  transform: translateY(-1px);
}
.bab-btn:active { transform: translateY(0); box-shadow: none; }

.bab-name {
  font-family: 'Amiri', 'Scheherazade New', 'Arial', serif;
  font-size: .92rem; font-weight: 700; color: #1e1b4b;
  direction: rtl; line-height: 1.3;
}
.bab-patterns {
  font-family: 'Amiri', 'Scheherazade New', 'Arial', serif;
  font-size: 1.05rem; color: #1e40af; direction: rtl; line-height: 1.4;
  font-weight: 600;
}
.bab-past  { color: #1e40af; }
.bab-sep   { color: #111827; font-family: system-ui, sans-serif; }
.bab-pres  { color: #065f46; }
.bab-ex {
  font-family: 'Amiri', 'Scheherazade New', 'Arial', serif;
  font-size: .82rem; color: #111827; direction: rtl; line-height: 1.4;
}
.bab-code {
  font-size: .62rem; font-family: monospace; color: #111827;
  letter-spacing: .04em; margin-top: .05rem;
}
.ex-wrap { margin-top: .5rem; }
.ex-gen-btn { display: flex; align-items: center; justify-content: center; gap: .5rem; width: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #2d2d52 100%); color: #fff; border: none; border-radius: 10px; padding: .75rem 1rem; font-size: .85rem; font-weight: 600; cursor: pointer; transition: all .25s; font-family: inherit; }
.ex-gen-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(26,26,46,.3); }
.ex-gen-btn .ex-gen-icon { font-size: 1rem; }
.ex-panel { margin-top: .6rem; display: flex; flex-direction: column; gap: .7rem; }
.ex-card { background: #fff; border: 1.5px solid rgba(26,26,46,.1); border-radius: 10px; padding: .8rem 1rem; direction: rtl; position: relative; transition: border-color .2s; }
.ex-card.ex-answered { pointer-events: none; }
.ex-card.ex-correct { border-color: #28a745; background: rgba(40,167,69,.04); }
.ex-card.ex-wrong { border-color: #e63946; background: rgba(230,57,70,.04); }
.ex-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: .5rem; direction: ltr; }
.ex-type-tag { font-size: .58rem; font-weight: 700; text-transform: uppercase; color: #fff; background: #1a1a2e; padding: .18rem .55rem; border-radius: 5px; letter-spacing: .04em; font-family: system-ui, sans-serif; }
.ex-progress { font-size: .62rem; font-weight: 600; color: #111827; font-family: system-ui, sans-serif; }
.ex-session-hdr { display: flex; align-items: center; justify-content: space-between; padding: .5rem .7rem; background: linear-gradient(135deg, #1a1a2e 0%, #2d2d52 100%); border-radius: 10px; margin-bottom: .5rem; }
.ex-session-title { font-size: .78rem; font-weight: 700; color: #fff; direction: rtl; font-family: inherit; }
.ex-session-count { font-size: .68rem; color: rgba(255,255,255,.7); font-family: system-ui, sans-serif; }
.ex-prompt-en { font-size: .75rem; color: #111827; direction: ltr; margin-bottom: .5rem; font-family: system-ui, sans-serif; }
.ex-prompt { font-family: 'Amiri', 'Scheherazade New', serif; font-size: 1.1rem; line-height: 1.7; margin-bottom: .6rem; color: #1a1a2e; }
.ex-prompt .ex-blank { display: inline-block; min-width: 60px; border-bottom: 2px dashed #e63946; margin: 0 .15rem; text-align: center; color: #e63946; font-weight: 700; }
.ex-choices { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .4rem; }
.ex-choice { background: rgba(26,26,46,.04); border: 1.5px solid rgba(26,26,46,.12); border-radius: 8px; padding: .35rem .7rem; font-family: 'Amiri', 'Scheherazade New', serif; font-size: .95rem; cursor: pointer; transition: all .2s; color: #1a1a2e; }
.ex-choice:hover { background: rgba(26,26,46,.08); border-color: rgba(26,26,46,.25); }
.ex-choice.ex-sel { background: #1a1a2e; color: #fff; border-color: #1a1a2e; }
.ex-choice.ex-right { background: #28a745; color: #fff; border-color: #28a745; }
.ex-choice.ex-wrong-pick { background: #e63946; color: #fff; border-color: #e63946; }
.ex-input-row { display: flex; gap: .4rem; align-items: center; margin-bottom: .4rem; }
.ex-input { flex: 1; font-family: 'Amiri', 'Scheherazade New', serif; font-size: 1rem; padding: .35rem .6rem; border: 1.5px solid rgba(26,26,46,.15); border-radius: 8px; direction: rtl; outline: none; transition: border-color .2s; }
.ex-input:focus { border-color: #1a1a2e; }
.ex-check-btn { background: #1a1a2e; color: #fff; border: none; border-radius: 8px; padding: .35rem .7rem; font-size: .78rem; font-weight: 600; cursor: pointer; font-family: inherit; white-space: nowrap; }
.ex-feedback { font-size: .78rem; line-height: 1.5; padding: .4rem .5rem; border-radius: 6px; margin-top: .3rem; }
.ex-feedback.ex-fb-correct { background: rgba(40,167,69,.08); color: #1a7a32; }
.ex-feedback.ex-fb-wrong { background: rgba(230,57,70,.08); color: #c0313d; }
.ex-feedback .ex-fb-ar { font-family: 'Amiri', 'Scheherazade New', serif; font-size: .9rem; font-weight: 600; }
.ex-feedback .ex-fb-en { font-size: .7rem; color: rgba(26,26,46,.5); direction: ltr; display: block; }
.ex-score { display: flex; align-items: center; justify-content: center; gap: .5rem; padding: .6rem; background: rgba(26,26,46,.04); border-radius: 8px; font-size: .82rem; font-weight: 600; color: #1a1a2e; margin-top: .3rem; direction: ltr; font-family: system-ui, sans-serif; }
.ex-score .ex-score-num { color: #28a745; font-size: 1rem; }
.ex-retry-btn { background: none; border: 1.5px solid rgba(26,26,46,.15); border-radius: 8px; padding: .3rem .7rem; font-size: .72rem; cursor: pointer; color: #1a1a2e; font-family: inherit; transition: all .2s; }
.ex-retry-btn:hover { background: rgba(26,26,46,.06); }
.ex-learn-wrap { margin-top: .8rem; }
.ex-learn-wrap .ex-gen-btn { background: linear-gradient(135deg, #2d2d52 0%, #1a1a2e 100%); font-size: .8rem; padding: .6rem .8rem; }
.pg-bar { display: flex; align-items: center; gap: .6rem; padding: .55rem .8rem; background: rgba(26,26,46,.04); border-radius: 10px; margin-bottom: .7rem; direction: ltr; }
.pg-stat { display: flex; align-items: center; gap: .3rem; font-size: .72rem; font-weight: 600; color: #1a1a2e; font-family: system-ui, sans-serif; }
.pg-stat-num { font-size: .85rem; font-weight: 700; }
.pg-stat-num.pg-green { color: #28a745; }
.pg-stat-num.pg-amber { color: #e67e22; }
.pg-stat-num.pg-blue { color: #2563eb; }
.pg-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.pg-dot-green { background: #28a745; }
.pg-dot-amber { background: #e67e22; }
.pg-dot-blue { background: #2563eb; }
.pg-sep { width: 1px; height: 16px; background: rgba(26,26,46,.12); }
.rv-section { margin-bottom: .7rem; direction: rtl; }
.rv-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: .4rem; direction: rtl; }
.rv-hdr-title { font-size: .78rem; font-weight: 700; color: #e67e22; }
.rv-hdr-btn { background: none; border: 1.5px solid #e67e22; border-radius: 8px; padding: .2rem .5rem; font-size: .62rem; font-weight: 600; color: #e67e22; cursor: pointer; font-family: inherit; transition: all .2s; }
.rv-hdr-btn:hover { background: rgba(230,126,34,.08); }
.rv-list { display: flex; flex-wrap: wrap; gap: .3rem; }
.rv-chip { display: inline-flex; align-items: center; gap: .25rem; background: rgba(230,126,34,.08); border: 1.5px solid rgba(230,126,34,.2); border-radius: 8px; padding: .25rem .55rem; font-family: 'Amiri', 'Scheherazade New', serif; font-size: .88rem; color: #1a1a2e; cursor: pointer; transition: all .2s; }
.rv-chip:hover { background: rgba(230,126,34,.15); border-color: rgba(230,126,34,.35); }
.rv-chip .rv-dot { width: 5px; height: 5px; border-radius: 50%; background: #e67e22; flex-shrink: 0; }
.hero-progress { display: inline-flex; align-items: center; gap: .3rem; font-size: .65rem; font-weight: 600; padding: .15rem .45rem; border-radius: 6px; margin-right: .3rem; font-family: system-ui, sans-serif; }
.hero-progress.hp-learned { background: rgba(40,167,69,.1); color: #1a7a32; border: 1px solid rgba(40,167,69,.2); }
.hero-progress.hp-review { background: rgba(230,126,34,.1); color: #c05e10; border: 1px solid rgba(230,126,34,.2); }
.hero-progress.hp-new { background: rgba(37,99,235,.08); color: #2563eb; border: 1px solid rgba(37,99,235,.15); }
.learn-progress { display: flex; align-items: center; gap: .3rem; font-size: .7rem; font-weight: 600; margin-bottom: .5rem; padding: .3rem .5rem; border-radius: 6px; font-family: system-ui, sans-serif; direction: ltr; }
.learn-progress.lp-learned { background: rgba(40,167,69,.08); color: #1a7a32; }
.learn-progress.lp-review { background: rgba(230,126,34,.08); color: #c05e10; }
.exp-btn { display: inline-flex; align-items: center; gap: .35rem; background: none; border: 1.5px solid rgba(26,26,46,.15); border-radius: 8px; padding: .35rem .7rem; font-size: .72rem; font-weight: 600; color: #1a1a2e; cursor: pointer; font-family: system-ui, sans-serif; transition: all .2s; }
.exp-btn:hover { background: rgba(26,26,46,.06); border-color: rgba(26,26,46,.25); }
.exp-btn .exp-ico { font-size: .85rem; }
.exp-bar { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; margin-top: .5rem; }
.exp-home-section { margin-top: .5rem; margin-bottom: .7rem; direction: ltr; }
.exp-home-hdr { display: flex; align-items: center; gap: .4rem; margin-bottom: .4rem; }
.exp-home-title { font-size: .78rem; font-weight: 700; color: #1a1a2e; font-family: system-ui, sans-serif; }
.exp-home-ico { font-size: .9rem; }
.exp-home-btns { display: flex; flex-wrap: wrap; gap: .35rem; }
.exp-home-btn { display: inline-flex; align-items: center; gap: .3rem; background: rgba(26,26,46,.04); border: 1.5px solid rgba(26,26,46,.12); border-radius: 8px; padding: .4rem .7rem; font-size: .72rem; font-weight: 600; color: #1a1a2e; cursor: pointer; font-family: system-ui, sans-serif; transition: all .2s; }
.exp-home-btn:hover { background: rgba(26,26,46,.08); border-color: rgba(26,26,46,.2); }
.exp-home-btn:disabled { opacity: .4; cursor: not-allowed; }
.exp-home-btn .ehb-ico { font-size: .8rem; }
.mv-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.45); z-index: 999; display: flex; align-items: center; justify-content: center; }
.mv-modal { background: #fff; border-radius: 14px; width: 92%; max-width: 420px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 12px 40px rgba(0,0,0,.2); }
.mv-modal-hdr { display: flex; align-items: center; justify-content: space-between; padding: .7rem 1rem; border-bottom: 1px solid rgba(26,26,46,.08); }
.mv-modal-title { font-size: .85rem; font-weight: 700; color: #1a1a2e; }
.mv-modal-close { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #111827; padding: .2rem; }
.mv-modal-body { overflow-y: auto; padding: .7rem 1rem; flex: 1; }
.mv-verb-row { display: flex; align-items: center; gap: .5rem; padding: .4rem 0; border-bottom: 1px solid rgba(26,26,46,.04); }
.mv-verb-cb { width: 16px; height: 16px; accent-color: #1a1a2e; }
.mv-verb-ar { font-family: 'Amiri', 'Scheherazade New', serif; font-size: 1rem; color: #1a1a2e; }
.mv-verb-gl { font-size: .68rem; color: #111827; font-family: system-ui, sans-serif; }
.mv-modal-foot { display: flex; align-items: center; justify-content: space-between; padding: .6rem 1rem; border-top: 1px solid rgba(26,26,46,.08); }
.mv-sel-all { background: none; border: none; font-size: .7rem; font-weight: 600; color: #2563eb; cursor: pointer; font-family: system-ui, sans-serif; }
.mv-export-btn { background: linear-gradient(135deg, #2d2d52 0%, #1a1a2e 100%); color: #fff; border: none; border-radius: 8px; padding: .45rem .9rem; font-size: .75rem; font-weight: 600; cursor: pointer; font-family: system-ui, sans-serif; }
.mv-export-btn:disabled { opacity: .5; cursor: not-allowed; }

.vs-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 2100; }
.vs-modal { background: #fff; border-radius: 14px; width: 94%; max-width: 440px; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 12px 40px rgba(0,0,0,.2); }
.vs-hdr { display: flex; align-items: center; justify-content: space-between; padding: .7rem 1rem; border-bottom: 1px solid rgba(26,26,46,.08); }
.vs-title { font-size: .88rem; font-weight: 700; color: #1a1a2e; }
.vs-close { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #111827; padding: .2rem; }
.vs-body { overflow-y: auto; padding: .7rem 1rem; flex: 1; }
.vs-foot { display: flex; align-items: center; justify-content: space-between; padding: .6rem 1rem; border-top: 1px solid rgba(26,26,46,.08); gap: .5rem; }
.vs-create-row { display: flex; gap: .4rem; margin-bottom: .8rem; }
.vs-create-input { flex: 1; border: 1.5px solid #ddd; border-radius: 8px; padding: .4rem .6rem; font-size: .8rem; font-family: 'Amiri', serif; direction: rtl; }
.vs-create-btn { background: #1a1a2e; color: #fff; border: none; border-radius: 8px; padding: .4rem .8rem; font-size: .75rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
.vs-set-item { display: flex; align-items: center; gap: .5rem; padding: .55rem .4rem; border-bottom: 1px solid rgba(26,26,46,.05); cursor: pointer; border-radius: 6px; transition: background .15s; }
.vs-set-item:hover { background: rgba(26,26,46,.04); }
.vs-set-name { flex: 1; font-size: .88rem; font-weight: 600; color: #1a1a2e; }
.vs-set-count { font-size: .7rem; color: #111827; font-family: system-ui, sans-serif; }
.vs-set-actions { display: flex; gap: .3rem; }
.vs-act-btn { background: none; border: none; font-size: .82rem; cursor: pointer; padding: .15rem .3rem; border-radius: 4px; color: #111827; }
.vs-act-btn:hover { background: rgba(26,26,46,.08); color: #1a1a2e; }
.vs-act-btn.vs-del:hover { color: #dc3545; }
.vs-detail-hdr { display: flex; align-items: center; gap: .5rem; margin-bottom: .6rem; }
.vs-detail-back { background: none; border: none; font-size: 1rem; cursor: pointer; color: #2563eb; padding: .1rem .3rem; }
.vs-detail-name { font-size: .95rem; font-weight: 700; color: #1a1a2e; font-family: 'Amiri', serif; }
.vs-verb-item { display: flex; align-items: center; gap: .5rem; padding: .4rem .3rem; border-bottom: 1px solid rgba(26,26,46,.04); }
.vs-verb-ar { flex: 1; font-family: 'Amiri', serif; font-size: 1rem; color: #1a1a2e; }
.vs-verb-rm { background: none; border: none; font-size: .8rem; cursor: pointer; color: #111827; padding: .1rem .3rem; }
.vs-verb-rm:hover { color: #dc3545; }
.vs-empty { text-align: center; color: #111827; font-size: .82rem; padding: 1.5rem 0; }
.vs-export-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .4rem; margin-top: .7rem; }
.vs-exp-btn { background: linear-gradient(135deg, #2d2d52 0%, #1a1a2e 100%); color: #fff; border: none; border-radius: 8px; padding: .5rem .6rem; font-size: .72rem; font-weight: 600; cursor: pointer; font-family: system-ui, sans-serif; text-align: center; }
.vs-exp-btn:hover { opacity: .85; }
.vs-exp-btn:disabled { opacity: .4; cursor: not-allowed; }

.vs-add-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 2200; }
.vs-add-modal { background: #fff; border-radius: 12px; width: 88%; max-width: 340px; max-height: 70vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 8px 30px rgba(0,0,0,.18); }
.vs-add-hdr { padding: .6rem .9rem; border-bottom: 1px solid rgba(26,26,46,.06); display: flex; align-items: center; justify-content: space-between; }
.vs-add-title { font-size: .82rem; font-weight: 700; color: #1a1a2e; }
.vs-add-body { overflow-y: auto; padding: .5rem .9rem; flex: 1; }
.vs-add-row { display: flex; align-items: center; gap: .5rem; padding: .4rem 0; border-bottom: 1px solid rgba(26,26,46,.04); }
.vs-add-cb { width: 16px; height: 16px; accent-color: #1a1a2e; }
.vs-add-label { flex: 1; font-size: .85rem; color: #1a1a2e; }
.vs-add-foot { padding: .5rem .9rem; border-top: 1px solid rgba(26,26,46,.06); display: flex; justify-content: flex-end; gap: .4rem; }
.vs-add-save { background: #1a1a2e; color: #fff; border: none; border-radius: 8px; padding: .4rem .9rem; font-size: .75rem; font-weight: 600; cursor: pointer; }
.vs-add-cancel { background: none; border: 1px solid #ddd; border-radius: 8px; padding: .4rem .7rem; font-size: .75rem; cursor: pointer; color: #666; }
.vs-add-new-row { display: flex; gap: .3rem; margin-top: .5rem; }
.vs-add-new-input { flex: 1; border: 1.5px solid #ddd; border-radius: 6px; padding: .3rem .5rem; font-size: .78rem; font-family: 'Amiri', serif; direction: rtl; }
.vs-add-new-btn { background: #2563eb; color: #fff; border: none; border-radius: 6px; padding: .3rem .6rem; font-size: .7rem; font-weight: 600; cursor: pointer; white-space: nowrap; }

.en-results { padding: .75rem 1rem 1.5rem; max-width: 700px; margin: 0 auto; }
.en-results-hdr { font-size: .85rem; font-weight: 600; color: #111827; margin-bottom: .8rem; font-family: system-ui, sans-serif; }
.en-results-expanded { font-size: .72rem; color: #111827; margin-bottom: .6rem; }
.en-group { margin-bottom: 1rem; }
.en-group-label { font-size: .78rem; font-weight: 700; color: #1a1a2e; margin-bottom: .4rem; padding-left: .2rem; border-left: 3px solid #e63946; padding-bottom: .1rem; }
.en-card { display: flex; align-items: center; gap: .7rem; padding: .65rem .8rem; border-radius: 10px; border: 1.5px solid rgba(26,26,46,.08); margin-bottom: .4rem; cursor: pointer; transition: all .2s; background: #fff; }
.en-card:hover { border-color: #c7312b; box-shadow: 0 2px 8px rgba(199,49,43,.1); transform: translateY(-1px); }
.en-card-root { font-family: 'Amiri', serif; font-size: 1.45rem; font-weight: 700; color: #1a1a2e; min-width: 55px; text-align: center; direction: rtl; }
.en-card-body { flex: 1; }
.en-card-gloss { font-size: .85rem; color: #111827; font-weight: 500; }
.en-card-meta { font-size: .7rem; color: #111827; margin-top: .15rem; }
.en-card-badge { font-size: .65rem; font-weight: 700; padding: .15rem .45rem; border-radius: 4px; background: #f1f5f9; color: #111827; }
.en-card-match { font-size: .58rem; padding: .1rem .35rem; border-radius: 3px; margin-left: .3rem; }
.en-card-match-exact { background: #dcfce7; color: #166534; }
.en-card-match-synonym { background: #fef3c7; color: #92400e; }
.en-card-gen-btn { background: #1a1a2e; color: #fff; border: none; border-radius: 6px; padding: .35rem .65rem; font-size: .72rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background .15s; }
.en-card-gen-btn:hover { background: #e63946; }
.en-no-results { text-align: center; padding: 2rem; color: #111827; font-size: .85rem; }
</style>
</head>
<body>

<!-- ══════════════════════════════════════════════
     HOME SCREEN
══════════════════════════════════════════════ -->
<div id="homeScreen">
  <div class="home-brand">
    <div class="home-logo">Rootify<span>Arabic</span></div>
    <div class="home-logo-ar">\u0641 &nbsp; \u0639 &nbsp; \u0644</div>
    <div class="home-tagline">Explore Arabic Roots &amp; Verb Measures</div>
  </div>

  <div class="home-card">
    <!-- Mode tabs -->
    <div class="mode-tabs">
      <button class="mode-tab active" id="tab-root" onclick="switchMode('root')">Root Analysis</button>
      <button class="mode-tab" id="tab-sentence" onclick="switchMode('sentence')">Sentence-in-a-Word</button>
    </div>

    <!-- Root mode panel -->
    <div id="rootModePanel">
      <!-- Search input -->
      <div class="home-search-row">
        <div class="ac-wrap">
          <input class="home-input" id="homeInput"
            type="text" placeholder="\u0643\u062a\u0628\u060c \u0642\u0627\u0644 &mdash; or English: write, speak..."
            autocomplete="off" spellcheck="false" inputmode="text">
          <div class="ac-dropdown" id="homeAc"></div>
        </div>
        <select class="home-select" id="homeMeasure">
          <option value="auto">Auto</option>
          <option value="I">I</option>
          <option value="II">II</option>
          <option value="III">III</option>
          <option value="IV">IV</option>
          <option value="V">V</option>
          <option value="VI">VI</option>
          <option value="VII">VII</option>
          <option value="VIII">VIII</option>
          <option value="X">X</option>
        </select>
        <button class="home-btn" onclick="analyzeFromHome()">Analyze</button>
      </div>

      <div class="home-body">
        <div id="progressBar" class="pg-bar" style="display:none"></div>
        <div id="reviewSection" class="rv-section" style="display:none"></div>

        <div id="enResultsPanel" style="display:none"></div>

        <div class="home-sec-hdr" id="rootsnapHdr">RootSnap</div>
        <div class="rootsnap-chips" id="rootsnapChips"></div>

        <div id="exportSection" class="exp-home-section" style="display:none">
          <div class="exp-home-hdr">
            <span class="exp-home-ico">&#x1F4DA;</span>
            <span class="exp-home-title">Teacher Export</span>
          </div>
          <div class="exp-home-btns">
            <button class="exp-home-btn" onclick="openMultiVerbSelector()"><span class="ehb-ico">&#x1F4DD;</span> Multi-Verb Worksheet</button>
            <button class="exp-home-btn" id="reviewExportBtn" onclick="exportReviewSheet()"><span class="ehb-ico">&#x1F501;</span> Review Sheet</button>
            <button class="exp-home-btn" onclick="openVerbSetManager()"><span class="ehb-ico">&#x1F4DA;</span> Verb Sets</button>
          </div>
        </div>

        <div id="recentSection" style="display:none;direction:rtl">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem;direction:rtl">
            <div class="home-sec-hdr" style="margin-bottom:0">Recent</div>
            <button class="clear-btn" onclick="clearRecent()">clear</button>
          </div>
          <div class="recent-list" id="recentList"></div>
        </div>
      </div>
    </div><!-- #rootModePanel -->

    <!-- Sentence-in-a-Word mode panel -->
    <div id="sentenceModePanel">
      <div class="home-search-row" style="margin-bottom:1.1rem">
        <input class="home-input" id="sentenceInput"
          type="text" placeholder="\u0643\u064e\u062a\u064e\u0628\u064e\u0647\u064e\u0627\u060c \u064a\u064e\u0643\u0652\u062a\u064f\u0628\u064f\u0647\u064f\u0645\u0652..."
          autocomplete="off" spellcheck="false" inputmode="text"
          onkeydown="if(event.key==='Enter') analyzeFromSentence()">
        <button class="home-btn" onclick="analyzeFromSentence()">\u2192</button>
      </div>
      <div class="home-sec-hdr">SentenceSnap</div>
      <div class="ssnap-chips" id="ssnapChips"></div>
    </div><!-- #sentenceModePanel -->

  </div>
</div>

<!-- ══════════════════════════════════════════════
     ANALYSIS VIEW
══════════════════════════════════════════════ -->
<div id="analysisView">
  <!-- Sticky top bar -->
  <div class="analysis-bar">
    <button class="back-btn" onclick="showHome()" title="Back to home">&#x2190;</button>
    <div class="analysis-bar-brand">Rootify<span>Arabic</span></div>
    <div class="bar-search-row">
      <div class="ac-wrap">
        <input class="bar-input" id="rootInput"
          type="text" placeholder="\u0643\u062a\u0628\u060c \u0642\u0627\u0644..."
          autocomplete="off" spellcheck="false" inputmode="text">
        <div class="ac-dropdown" id="barAc"></div>
      </div>
      <select class="bar-select" id="measureSelect">
        <option value="auto">Auto</option>
        <option value="I">I</option>
        <option value="II">II</option>
        <option value="III">III</option>
        <option value="IV">IV</option>
        <option value="V">V</option>
        <option value="VI">VI</option>
        <option value="VII">VII</option>
        <option value="VIII">VIII</option>
        <option value="X">X</option>
      </select>
      <button class="bar-btn" onclick="analyzeFromBar()">&#x25B6;</button>
    </div>
  </div>

  <!-- Content -->
  <div class="page-body">
    <div id="error-area"></div>
    <!-- Hero summary card (outside #result so safety panels stay visible) -->
    <div class="hero-card" id="heroCard"></div>
    <div class="teacher-info-bar" id="teacherInfoBar"></div>
    <div class="exp-bar" id="exportBar" style="display:none">
      <button class="exp-btn" onclick="exportSingleVerb()"><span class="exp-ico">&#x1F4C4;</span> Study Sheet</button>
      <button class="exp-btn" onclick="openAddToSet()"><span class="exp-ico">&#x1F4DA;</span> Add to Set</button>
    </div>
    <div id="result">

      <!-- Full conjugation chart -->
      <div id="conjChart"></div>

      <!-- \u0627\u0644\u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0645\u0634\u062A\u0642\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 — Core Derived Nouns -->
      <div class="acc-item open" id="acc-deriv">
        <button class="acc-hdr" onclick="toggle(this)">
          <span class="acc-arrow">&#x25BE;</span>
          <div class="acc-hdr-left">
            <span class="acc-icon">&#x1F524;</span>
            <div>
              <span class="acc-title-ar">\u0627\u0644\u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0645\u0634\u062A\u0642\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629</span>
              <span class="acc-title-en"> &mdash; Core Derived Nouns</span>
            </div>
          </div>
        </button>
        <div class="acc-body"><div class="acc-inner" id="derivContent"></div></div>
      </div>

      <div style="display:none" id="acc-family"><div id="familyContent"></div></div>

      <!-- Preposition meanings (hidden until data) -->
      <div class="acc-item" id="acc-prep" style="display:none">
        <button class="acc-hdr" onclick="toggle(this)">
          <span class="acc-arrow">&#x25BE;</span>
          <div class="acc-hdr-left">
            <span class="acc-icon">&#x1F517;</span>
            <div>
              <span class="acc-title-ar">\u0627\u0644\u0645\u0639\u0646\u0649 \u0628\u062d\u0633\u0628 \u062d\u0631\u0641 \u0627\u0644\u062c\u0631</span>
              <span class="acc-title-en"> &mdash; Preposition Meanings</span>
            </div>
          </div>
        </button>
        <div class="acc-body"><div class="acc-inner" id="prepContent"></div></div>
      </div>

      <div style="display:none"><div id="derivedNounsContent"></div><div id="exagContent"></div><div id="placeContent"></div><div id="instrContent"></div></div>

      <!-- Practice exercises -->
      <div class="acc-item" id="practiceWrap" style="display:none">
        <button class="acc-hdr" id="practiceBtn" onclick="togglePractice(this)">
          <span class="acc-arrow">&#x25BE;</span>
          <div class="acc-hdr-left">
            <span class="acc-icon">&#x1F9E0;</span>
            <div>
              <span class="acc-title-ar">\u062A\u062F\u0631\u064A\u0628</span>
              <span class="acc-title-en"> &mdash; Generate Practice</span>
            </div>
          </div>
        </button>
        <div class="acc-body"><div class="acc-inner"><div class="ex-panel" id="practicePanel"></div></div></div>
      </div>

      <!-- Usage & real examples -->
      <div class="acc-item" id="acc-usage" style="display:none">
        <button class="acc-hdr" onclick="toggle(this)">
          <span class="acc-arrow">&#x25BE;</span>
          <div class="acc-hdr-left">
            <span class="acc-icon">&#x1F4AC;</span>
            <div>
              <span class="acc-title-ar">\u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0648\u0627\u0644\u0623\u0645\u062B\u0644\u0629</span>
              <span class="acc-title-en"> &mdash; Usage &amp; Examples</span>
            </div>
          </div>
        </button>
        <div class="acc-body"><div class="acc-inner" id="usageContent"></div></div>
      </div>

      <!-- Verb forms I-X -->
      <div class="acc-item" id="acc-forms">
        <button class="acc-hdr" onclick="toggle(this)">
          <span class="acc-arrow">&#x25BE;</span>
          <div class="acc-hdr-left">
            <span class="acc-icon">&#x1F4CA;</span>
            <div>
              <span class="acc-title-ar">\u0623\u0648\u0632\u0627\u0646 \u0627\u0644\u0641\u0639\u0644</span>
              <span class="acc-title-en"> &mdash; Verb Measures I&ndash;X</span>
            </div>
          </div>
        </button>
        <div class="acc-body">
          <div class="acc-inner">
            <div class="legend-strip">
              <span><span class="leg-dot" style="border:2px solid #1a1a2e;background:transparent"></span>current</span>
              <span><span class="leg-dot" style="border:2px solid #28a745;background:transparent"></span>attested</span>
              <span><span class="leg-dot" style="border:2px solid #ddd;background:transparent"></span>theoretical</span>
            </div>
            <div class="forms-grid" id="formsContent"></div>
          </div>
        </div>
      </div>

    </div><!-- #result -->
  </div><!-- .page-body -->
</div><!-- #analysisView -->
<div class="root-panel-overlay" id="rootPanelOverlay" onclick="closeRootPanel()">
  <div class="root-panel" onclick="event.stopPropagation()">
    <div class="root-panel-hdr">
      <div><div class="root-panel-title">\u0639\u0627\u0626\u0644\u0629 \u0627\u0644\u062C\u0630\u0631 &middot; Root Family</div><div class="root-panel-root" id="rpRootLabel"></div></div>
      <button class="root-panel-close" onclick="closeRootPanel()">&times;</button>
    </div>
    <div class="root-panel-body" id="rpBody"></div>
  </div>
</div>
<div class="rf-tooltip" id="rfTooltip"><button class="rf-tooltip-close" onclick="hideTooltip()">&times;</button><div id="rfTooltipContent"></div></div>

<!-- ══════════════════════════════════════════════
     SENTENCE-IN-A-WORD VIEW
══════════════════════════════════════════════ -->
<div id="sentenceView">
  <!-- Sticky top bar -->
  <div class="analysis-bar">
    <button class="back-btn" onclick="showSentenceHome()" title="Back to home">&#x2190;</button>
    <div class="analysis-bar-brand">Rootify<span>Arabic</span></div>
    <div class="bar-search-row">
      <input class="bar-input" id="sentBarInput"
        type="text" placeholder="\u0643\u064e\u062a\u064e\u0628\u064e\u0647\u064e\u0627..."
        autocomplete="off" spellcheck="false" inputmode="text"
        onkeydown="if(event.key==='Enter') analyzeFromSentenceBar()">
      <button class="bar-btn" onclick="analyzeFromSentenceBar()">&#x25B6;</button>
    </div>
  </div>

  <!-- Content -->
  <div class="page-body">
    <div id="sent-error-area"></div>
    <div id="sent-result" style="display:none">

      <!-- 1. Root header -->
      <div class="root-header-card" id="sentRootHeader"></div>

      <!-- 2. Derivation chain -->
      <div id="sentDerivChain" style="display:none">
        <div style="padding:0 0 .4rem">
          <div class="sect-lbl" style="color:#bbb;padding:0 .2rem">
            DERIVATION CHAIN &mdash; \u062a\u0633\u0644\u0633\u0644 \u0627\u0644\u0627\u0634\u062a\u0642\u0627\u0642
          </div>
          <div class="deriv-chain" id="sentChainEl"></div>
        </div>
      </div>

      <!-- 3. Word breakdown (color-coded segments) -->
      <div class="acc-item" style="overflow:visible;margin-top:.1rem">
        <div style="padding:.85rem 1rem .6rem">
          <div class="sect-lbl">WORD BREAKDOWN &mdash; \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0643\u0644\u0645\u0629</div>
          <div class="breakdown-word" id="sentBreakdownWord"></div>
          <div style="display:flex;flex-wrap:wrap;gap:.35rem .75rem;font-size:.6rem;color:#111827;margin-top:.35rem">
            <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:rgba(246,173,85,.6);margin-right:.22rem;vertical-align:middle"></span>Future</span>
            <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:rgba(99,179,237,.5);margin-right:.22rem;vertical-align:middle"></span>Subject prefix</span>
            <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:rgba(255,255,255,.25);margin-right:.22rem;vertical-align:middle"></span>Verb stem</span>
            <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:rgba(104,211,145,.45);margin-right:.22rem;vertical-align:middle"></span>Subject suffix</span>
            <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:rgba(252,129,129,.45);margin-right:.22rem;vertical-align:middle"></span>Object pronoun</span>
          </div>
        </div>
      </div>

      <!-- 4. Affix list -->
      <div class="acc-item" style="margin-top:.5rem" id="sentAffixBlock">
        <div style="padding:.85rem 1rem">
          <div class="sect-lbl">AFFIXES &mdash; \u0627\u0644\u0632\u0648\u0627\u0626\u062f</div>
          <div class="affix-list" id="sentAffixList"></div>
        </div>
      </div>

      <!-- 5. Subject / Verb / Object summary -->
      <div class="sent-summary" style="margin-top:.5rem" id="sentSummary"></div>

      <!-- 6. Ambiguity note -->
      <div class="ambig-note" id="sentAmbigNote" style="display:none"></div>

      <!-- 7. Interpretation cards -->
      <div class="acc-item" style="margin-top:.5rem">
        <div style="padding:.85rem 1rem .5rem">
          <div class="sect-lbl">INTERPRETATIONS &mdash; \u0627\u0644\u062a\u0623\u0648\u064a\u0644\u0627\u062a</div>
          <div class="interp-list" id="sentInterpList"></div>
        </div>
      </div>

    </div><!-- #sent-result -->
  </div><!-- .page-body -->
</div><!-- #sentenceView -->

<script>
/* ── Constants ─────────────────────────────────── */
var MEANINGS = {
  1:'Regular', 2:'Causative', 3:'Reciprocal', 4:'Causative',
  5:'Reflexive of II', 6:'Reflexive of III', 7:'Passive of I',
  8:'Reflexive of I', 9:'Colors/Defects', 10:'Causative Reflexive'
};
var GROUPS = [
  { ar: "\u0627\u0644\u0645\u062a\u0643\u0644\u0645",  en: "1st person", keys: ["1s","1p"] },
  { ar: "\u0627\u0644\u0645\u062e\u0627\u0637\u0628", en: "2nd person", keys: ["2ms","2fs","2md","2mp","2fp"] },
  { ar: "\u0627\u0644\u063a\u0627\u0626\u0628",    en: "3rd person", keys: ["3ms","3fs","3md","3fd","3mp","3fp"] },
];
var EN_PRONOUNS = {
  "3ms": "HE/IT (M)", "3fs": "SHE/IT (F)",
  "3md": "THEY 2 (M)", "3fd": "THEY 2 (F)",
  "3mp": "THEY (P.M)", "3fp": "THEY (P.F)",
  "2ms": "YOU (S.M)", "2fs": "YOU (S.F)",
  "2md": "YOU 2", "2mp": "YOU (P.M)", "2fp": "YOU (P.F)",
  "1s": "I", "1p": "WE"
};
var ROOTSNAP = [
  '\u0643\u062a\u0628', '\u0642\u0631\u0623', '\u0642\u0627\u0644',
  '\u0630\u0647\u0628', '\u062f\u0631\u0633', '\u0646\u0638\u0631',
  '\u0641\u0647\u0645', '\u0634\u0631\u0628', '\u0643\u0644\u0645',
  '\u0631\u0623\u0649', '\u0639\u0631\u0641', '\u0641\u062a\u062d'
];

/* ── View state ────────────────────────────────── */
function showHome() {
  document.getElementById('homeScreen').style.display = 'flex';
  document.getElementById('analysisView').style.display = 'none';
  document.getElementById('sentenceView').style.display = 'none';
  renderProgressBar();
  renderReviewSection();
  renderExportSection();
  renderRecentSearches();
  document.getElementById('homeInput').focus();
}
function showAnalysis() {
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('analysisView').style.display = 'block';
  window.scrollTo(0, 0);
}

/* ── Recent searches (in-memory + localStorage) ── */
var _recent = (function() {
  try { return JSON.parse(localStorage.getItem('rootify_recent') || '[]'); }
  catch(e) { return []; }
})();
function getRecent() { return _recent; }
function addRecent(root, measure) {
  _recent = _recent.filter(function(r) { return r.root !== root; });
  _recent.unshift({ root: root, measure: measure });
  _recent = _recent.slice(0, 7);
  try { localStorage.setItem('rootify_recent', JSON.stringify(_recent)); } catch(e) {}
}
function clearRecent() {
  _recent = [];
  try { localStorage.removeItem('rootify_recent'); } catch(e) {}
  renderRecentSearches();
}
function renderRecentSearches() {
  var list = getRecent();
  var sec = document.getElementById('recentSection');
  var el = document.getElementById('recentList');
  if (!list.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';
  el.innerHTML = list.map(function(r) {
    var measureLabel = (r.measure && r.measure !== 'auto') ? 'Measure ' + escH(r.measure) : '';
    return '<div class="recent-item" data-root="' + escH(r.root) + '" data-measure="' + escH(r.measure) + '">' +
      '<div class="recent-root">' + escH(r.root) + '</div>' +
      '<div class="recent-meta">' + measureLabel + '</div>' +
      '<div class="recent-arrow">\u2192</div>' +
      '</div>';
  }).join('');
  el.onclick = function(e) {
    var item = e.target.closest('.recent-item');
    if (item) analyzeRoot(item.dataset.root, item.dataset.measure);
  };
}

/* ── Progress Store ────────────────────────────── */
var _PG_KEY = 'rootify_progress';
function pgLoad() {
  try { return JSON.parse(localStorage.getItem(_PG_KEY) || '{}'); } catch(e) { return {}; }
}
function pgSave(data) {
  try { localStorage.setItem(_PG_KEY, JSON.stringify(data)); } catch(e) {}
}
function pgGet(verb) {
  var all = pgLoad();
  return all[verb] || null;
}
function pgRecord(verb, correct, total) {
  var all = pgLoad();
  var entry = all[verb] || { attempts: 0, correct: 0, status: 'new', lastSeen: 0 };
  entry.attempts += total;
  entry.correct += correct;
  entry.lastSeen = Date.now();
  var ratio = entry.attempts > 0 ? entry.correct / entry.attempts : 0;
  if (correct < total) {
    entry.status = 'needs_review';
  } else if (entry.attempts >= 4 && ratio >= 0.75) {
    entry.status = 'learned';
  } else if (entry.status === 'new') {
    entry.status = 'practicing';
  }
  all[verb] = entry;
  pgSave(all);
}
function pgStats() {
  var all = pgLoad();
  var keys = Object.keys(all);
  var total = keys.length;
  var review = 0;
  var learned = 0;
  keys.forEach(function(k) {
    if (all[k].status === 'needs_review') review++;
    if (all[k].status === 'learned') learned++;
  });
  return { total: total, review: review, learned: learned };
}
function pgReviewList() {
  var all = pgLoad();
  var list = [];
  Object.keys(all).forEach(function(k) {
    if (all[k].status === 'needs_review') list.push(k);
  });
  list.sort(function(a, b) { return (all[a].lastSeen || 0) - (all[b].lastSeen || 0); });
  return list;
}
function pgStatusBadge(verb) {
  var entry = pgGet(verb);
  if (!entry) return '<span class="hero-progress hp-new">\u062C\u062F\u064A\u062F &middot; New</span>';
  if (entry.status === 'learned') return '<span class="hero-progress hp-learned">\u2713 \u062A\u0645 \u0627\u0644\u062A\u0639\u0644\u0645 &middot; Learned</span>';
  if (entry.status === 'needs_review') return '<span class="hero-progress hp-review">\u0631\u0627\u062C\u0639 &middot; Review</span>';
  return '<span class="hero-progress hp-new">\u062C\u062F\u064A\u062F &middot; New</span>';
}
function pgLearnBadge(verb) {
  var entry = pgGet(verb);
  if (!entry) return '';
  if (entry.status === 'learned') return '<div class="learn-progress lp-learned">\u2713 Learned &middot; ' + entry.correct + '/' + entry.attempts + ' correct</div>';
  if (entry.status === 'needs_review') return '<div class="learn-progress lp-review">\u26A0 Needs Review &middot; ' + entry.correct + '/' + entry.attempts + ' correct</div>';
  return '';
}
function renderProgressBar() {
  var s = pgStats();
  var el = document.getElementById('progressBar');
  if (s.total === 0) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.innerHTML =
    '<div class="pg-stat"><span class="pg-dot pg-dot-blue"></span> <span class="pg-stat-num pg-blue">' + s.total + '</span> practiced</div>' +
    '<div class="pg-sep"></div>' +
    '<div class="pg-stat"><span class="pg-dot pg-dot-green"></span> <span class="pg-stat-num pg-green">' + s.learned + '</span> learned</div>' +
    '<div class="pg-sep"></div>' +
    '<div class="pg-stat"><span class="pg-dot pg-dot-amber"></span> <span class="pg-stat-num pg-amber">' + s.review + '</span> to review</div>';
}
function renderReviewSection() {
  var list = pgReviewList();
  var el = document.getElementById('reviewSection');
  if (!list.length) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML =
    '<div class="rv-hdr">' +
      '<span class="rv-hdr-title">\u0645\u0631\u0627\u062C\u0639\u0629 &middot; Review (' + list.length + ')</span>' +
    '</div>' +
    '<div class="rv-list" id="rvList">' +
      list.map(function(v) {
        return '<button class="rv-chip" data-root="' + escH(v) + '"><span class="rv-dot"></span>' + escH(v) + '</button>';
      }).join('') +
    '</div>';
  document.getElementById('rvList').onclick = function(e) {
    var chip = e.target.closest('.rv-chip');
    if (chip) analyzeRoot(chip.dataset.root, 'auto');
  };
}

/* ── Export Section ─────────────────────────────── */
function renderExportSection() {
  var el = document.getElementById('exportSection');
  var recent = [];
  try { recent = JSON.parse(localStorage.getItem('rootify_recent') || '[]'); } catch(e) {}
  var hasRecent = recent.length > 0;
  var reviewCount = pgReviewList().length;
  var pgAll = pgLoad();
  var practicingCount = Object.keys(pgAll).filter(function(k) { return pgAll[k].status === 'practicing' || pgAll[k].status === 'needs_review'; }).length;
  var hasSets = vsLoad().length > 0;
  if (!hasRecent && practicingCount === 0 && !hasSets) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  var revBtn = document.getElementById('reviewExportBtn');
  if (revBtn) {
    revBtn.disabled = practicingCount === 0;
    revBtn.title = practicingCount === 0 ? 'No verbs to review yet' : practicingCount + ' verbs to review';
  }
}

function printSheetCSS() {
  return '@import url("https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap");' +
    '* { margin:0; padding:0; box-sizing:border-box; }' +
    'body { font-family: "Amiri", serif; color: #1a1a2e; padding: 1.5cm; direction: rtl; font-size: 12pt; line-height: 1.6; }' +
    '.sheet-hdr { text-align: center; margin-bottom: 1rem; border-bottom: 2px solid #1a1a2e; padding-bottom: .8rem; }' +
    '.sheet-title { font-size: 18pt; font-weight: 700; }' +
    '.sheet-sub { font-size: 10pt; color: #666; font-family: system-ui, sans-serif; direction: ltr; }' +
    '.sheet-brand { font-size: 8pt; color: #111827; font-family: system-ui, sans-serif; direction: ltr; }' +
    'h2 { font-size: 13pt; font-weight: 700; margin: .8rem 0 .4rem; border-bottom: 1px solid #ddd; padding-bottom: .2rem; }' +
    'h3 { font-size: 11pt; font-weight: 700; margin: .5rem 0 .2rem; }' +
    '.info-grid { display: grid; grid-template-columns: auto 1fr; gap: .15rem .8rem; font-size: 11pt; margin-bottom: .5rem; }' +
    '.info-lbl { color: #666; font-family: system-ui, sans-serif; direction: ltr; font-size: 9pt; font-weight: 600; }' +
    '.info-val { font-weight: 600; }' +
    '.conj-tbl { width: 100%; border-collapse: collapse; margin: .3rem 0 .6rem; font-size: 10.5pt; }' +
    '.conj-tbl th { background: #f0f0f5; font-size: 9pt; font-weight: 700; padding: .25rem .4rem; border: 1px solid #ddd; font-family: system-ui, sans-serif; }' +
    '.conj-tbl td { padding: .2rem .4rem; border: 1px solid #ddd; text-align: center; }' +
    '.conj-tbl .lbl { font-family: system-ui, sans-serif; font-size: 8pt; color: #666; text-align: right; direction: ltr; }' +
    '.deriv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .3rem; margin: .3rem 0 .6rem; }' +
    '.deriv-card { border: 1px solid #ddd; border-radius: 6px; padding: .3rem; text-align: center; }' +
    '.deriv-card .dc-lbl { font-size: 8pt; color: #666; font-family: system-ui, sans-serif; direction: ltr; }' +
    '.deriv-card .dc-ar { font-size: 12pt; font-weight: 700; }' +
    '.example-box { background: #f8f8fb; border-radius: 6px; padding: .4rem .6rem; margin: .3rem 0 .6rem; }' +
    '.example-box .ex-ar { font-size: 11pt; }' +
    '.example-box .ex-en { font-size: 9pt; color: #666; font-family: system-ui, sans-serif; direction: ltr; }' +
    '.pattern-box { background: #fffef5; border: 1px solid #f0e6c0; border-radius: 6px; padding: .3rem .5rem; margin: .3rem 0; font-size: 10pt; }' +
    '.practice-item { margin: .4rem 0; padding: .3rem 0; border-bottom: 1px dotted #ddd; }' +
    '.practice-q { font-size: 10.5pt; }' +
    '.practice-q-en { font-size: 9pt; color: #666; font-family: system-ui, sans-serif; direction: ltr; margin-top: .1rem; }' +
    '.practice-opts { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .2rem; direction: rtl; }' +
    '.practice-opt { border: 1px solid #ccc; border-radius: 4px; padding: .15rem .5rem; font-size: 10pt; }' +
    '.answer-key { margin-top: .8rem; padding-top: .4rem; border-top: 2px solid #1a1a2e; }' +
    '.answer-key h2 { color: #c05e10; }' +
    '.ak-item { font-size: 10pt; margin: .15rem 0; }' +
    '.ak-num { font-family: system-ui, sans-serif; font-weight: 700; direction: ltr; display: inline; }' +
    '.verb-sep { border: none; border-top: 1.5px dashed #ccc; margin: .8rem 0; }' +
    '.page-break { page-break-before: always; }' +
    '.ws-verb-hdr { display: flex; align-items: baseline; gap: .5rem; margin-bottom: .3rem; }' +
    '.ws-verb-ar { font-size: 14pt; font-weight: 700; }' +
    '.ws-verb-gl { font-size: 10pt; color: #666; font-family: system-ui, sans-serif; direction: ltr; }' +
    '.blank-line { display: inline-block; border-bottom: 1px solid #333; width: 5rem; margin: 0 .3rem; }' +
    '@media print { body { padding: 1cm; } .no-print { display: none !important; } @page { margin: 1cm; } }';
}

function openPrintWindow(bodyHtml, title) {
  var w = window.open('', '_blank');
  if (!w) { alert('Please allow pop-ups for RootifyArabic exports.'); return; }
  w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escH(title) + '</title><style>' + printSheetCSS() + '</style></head><body>' + bodyHtml + '</body></html>');
  w.document.close();
  setTimeout(function() { w.print(); }, 400);
}

function fetchVerbData(verb) {
  return fetch(window.location.pathname.replace(/\\/$/, '') + '/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ root: verb, measure: 'auto' })
  }).then(function(r) { return r.json(); });
}

function buildSingleVerbSheet(d) {
  var norm = (d.root && typeof d.root === 'object') ? (d.root.normalized || d.root.input || '') : (d.root || '');
  var past3ms = '', pres3ms = '', imp2ms = '';
  if (d.active) {
    var pm = byKey(d.active.past);
    var prm = byKey(d.active.present);
    var im = d.active.imperative ? byKey(d.active.imperative) : {};
    if (pm['3ms']) past3ms = pm['3ms'].arabic || '';
    if (prm['3ms']) pres3ms = prm['3ms'].arabic || '';
    if (im['2ms']) imp2ms = im['2ms'].arabic || '';
  }
  var masdarAr = '';
  if (d.masdar && d.masdar.length) masdarAr = d.masdar[0].arabic || '';
  else if (d.verbal_noun) masdarAr = (typeof d.verbal_noun === 'object' ? d.verbal_noun.arabic : d.verbal_noun) || '';
  var apAr = (d.active_participle ? d.active_participle.arabic : '') || '';
  var ppAr = (d.passive_participle ? d.passive_participle.arabic : '') || '';

  var h = '<div class="sheet-hdr">' +
    '<div class="sheet-title">\u0648\u0631\u0642\u0629 \u062F\u0631\u0627\u0633\u0629 &mdash; Study Sheet</div>' +
    '<div class="sheet-sub">' + escH(norm) + ' &mdash; ' + escH(d.gloss || '') + '</div>' +
    '<div class="sheet-brand">RootifyArabic</div>' +
    '</div>';

  h += '<h2>\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0623\u0633\u0627\u0633\u064A\u0629 &mdash; Basic Information</h2>';
  h += '<div class="info-grid">' +
    '<span class="info-lbl">Verb</span><span class="info-val">' + escH(norm) + '</span>' +
    '<span class="info-lbl">Gloss</span><span class="info-val">' + escH(d.gloss || '') + '</span>' +
    '<span class="info-lbl">Root</span><span class="info-val">' + escH(d.root.r1 + ' \u2013 ' + d.root.r2 + ' \u2013 ' + d.root.r3) + '</span>' +
    '<span class="info-lbl">Form</span><span class="info-val">' + escH(d.measure || '') + '</span>' +
    '<span class="info-lbl">Verb Type</span><span class="info-val">' + escH(d.verb_class || 'sound') + '</span>' +
    '<span class="info-lbl">Pattern</span><span class="info-val">' + escH(d.pattern || '') + '</span>' +
    '</div>';

  h += '<h2>\u0627\u0644\u062A\u0635\u0631\u064A\u0641 \u0627\u0644\u0623\u0633\u0627\u0633\u064A &mdash; Core Conjugation</h2>';
  h += '<table class="conj-tbl"><thead><tr><th>\u0627\u0644\u0623\u0645\u0631 Imperative</th><th>\u0627\u0644\u0645\u0636\u0627\u0631\u0639 Present</th><th>\u0627\u0644\u0645\u0627\u0636\u064A Past</th></tr></thead>' +
    '<tbody><tr><td>' + escH(imp2ms || '\u2014') + '</td><td>' + escH(pres3ms) + '</td><td>' + escH(past3ms) + '</td></tr></tbody></table>';

  h += '<h2>\u0627\u0644\u0645\u0634\u062A\u0642\u0627\u062A &mdash; Derivations</h2>';
  h += '<div class="deriv-grid">' +
    '<div class="deriv-card"><div class="dc-lbl">Masdar \u0645\u0635\u062F\u0631</div><div class="dc-ar">' + escH(masdarAr || '\u2014') + '</div></div>' +
    '<div class="deriv-card"><div class="dc-lbl">Active Part. \u0627\u0633\u0645 \u0641\u0627\u0639\u0644</div><div class="dc-ar">' + escH(apAr || '\u2014') + '</div></div>' +
    '<div class="deriv-card"><div class="dc-lbl">Passive Part. \u0627\u0633\u0645 \u0645\u0641\u0639\u0648\u0644</div><div class="dc-ar">' + escH(ppAr || '\u2014') + '</div></div>' +
    '</div>';

  if (d.example && d.example.ar) {
    h += '<h2>\u0645\u062B\u0627\u0644 &mdash; Example</h2>';
    h += '<div class="example-box"><div class="ex-ar">' + escH(d.example.ar) + '</div><div class="ex-en">' + escH(d.example.en || '') + '</div></div>';
  }

  if (d.common_pattern) {
    h += '<h2>\u0646\u0645\u0637 \u0634\u0627\u0626\u0639 &mdash; Common Pattern</h2>';
    h += '<div class="pattern-box">' + escH(typeof d.common_pattern === 'string' ? d.common_pattern : d.common_pattern.ar || '') + '</div>';
  }

  if (d.common_mistakes && d.common_mistakes.length) {
    h += '<h2>\u0623\u062E\u0637\u0627\u0621 \u0634\u0627\u0626\u0639\u0629 &mdash; Common Mistake</h2>';
    var cm = d.common_mistakes[0];
    h += '<div class="pattern-box">' + escH(typeof cm === 'string' ? cm : cm.mistake_ar || cm.ar || '') +
      (cm.correction_ar ? ' \u2192 ' + escH(cm.correction_ar) : '') + '</div>';
  }

  var exercises = generateExercises(d);
  if (exercises.length) {
    var subset = exercises.slice(0, 3);
    h += '<h2>\u062A\u062F\u0631\u064A\u0628 &mdash; Practice</h2>';
    subset.forEach(function(ex, i) {
      h += '<div class="practice-item"><div class="practice-q">' + (i + 1) + '. ' + ex.prompt + '</div>';
      if (ex.promptEn) h += '<div class="practice-q-en">' + escH(ex.promptEn) + '</div>';
      if (ex.choices) {
        h += '<div class="practice-opts">';
        ex.choices.forEach(function(c) {
          h += '<span class="practice-opt">' + escH(c) + '</span>';
        });
        h += '</div>';
      } else {
        h += '<div style="margin-top:.2rem"><span class="blank-line"></span></div>';
      }
      h += '</div>';
    });

    h += '<div class="answer-key"><h2>\u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A &mdash; Answer Key</h2>';
    subset.forEach(function(ex, i) {
      h += '<div class="ak-item"><span class="ak-num">' + (i + 1) + '.</span> ' + escH(ex.answer) + '</div>';
    });
    h += '</div>';
  }

  return h;
}

function exportSingleVerb() {
  if (!_lastResultData) return;
  var norm = (_lastResultData.root && typeof _lastResultData.root === 'object')
    ? (_lastResultData.root.normalized || _lastResultData.root.input || '')
    : (_lastResultData.root || '');
  var html = buildSingleVerbSheet(_lastResultData);
  openPrintWindow(html, 'Study Sheet \u2014 ' + norm);
}

function buildMultiVerbWorksheet(dataList) {
  var h = '<div class="sheet-hdr">' +
    '<div class="sheet-title">\u0648\u0631\u0642\u0629 \u0639\u0645\u0644 &mdash; Multi-Verb Worksheet</div>' +
    '<div class="sheet-sub">' + dataList.length + ' verbs</div>' +
    '<div class="sheet-brand">RootifyArabic</div>' +
    '</div>';

  var allExercises = [];
  dataList.forEach(function(d, vi) {
    var norm = (d.root && typeof d.root === 'object') ? (d.root.normalized || d.root.input || '') : (d.root || '');
    var past3ms = '', pres3ms = '', imp2ms = '';
    if (d.active) {
      var pm = byKey(d.active.past);
      var prm = byKey(d.active.present);
      var im = d.active.imperative ? byKey(d.active.imperative) : {};
      if (pm['3ms']) past3ms = pm['3ms'].arabic || '';
      if (prm['3ms']) pres3ms = prm['3ms'].arabic || '';
      if (im['2ms']) imp2ms = im['2ms'].arabic || '';
    }
    var masdarAr = '';
    if (d.masdar && d.masdar.length) masdarAr = d.masdar[0].arabic || '';
    else if (d.verbal_noun) masdarAr = (typeof d.verbal_noun === 'object' ? d.verbal_noun.arabic : d.verbal_noun) || '';
    var apAr = (d.active_participle ? d.active_participle.arabic : '') || '';

    if (vi > 0) h += '<hr class="verb-sep">';
    h += '<div class="ws-verb-hdr"><span class="ws-verb-ar">' + escH(norm) + '</span><span class="ws-verb-gl">' + escH(d.gloss || '') + ' \u00b7 Form ' + escH(d.measure || '') + ' \u00b7 ' + escH(d.verb_class || 'sound') + '</span></div>';
    h += '<table class="conj-tbl"><thead><tr><th>Masdar</th><th>Imp.</th><th>Pres.</th><th>Past</th></tr></thead>' +
      '<tbody><tr><td>' + escH(masdarAr || '\u2014') + '</td><td>' + escH(imp2ms || '\u2014') + '</td><td>' + escH(pres3ms) + '</td><td>' + escH(past3ms) + '</td></tr></tbody></table>';

    var exs = generateExercises(d).slice(0, 2);
    exs.forEach(function(ex) { allExercises.push(ex); });
  });

  if (allExercises.length) {
    h += '<div class="page-break"></div>';
    h += '<div class="sheet-hdr">' +
      '<div class="sheet-title">\u062A\u062F\u0631\u064A\u0628\u0627\u062A &mdash; Exercises</div>' +
      '<div class="sheet-brand">RootifyArabic</div>' +
      '</div>';
    allExercises.forEach(function(ex, i) {
      h += '<div class="practice-item"><div class="practice-q">' + (i + 1) + '. ' + ex.prompt + '</div>';
      if (ex.promptEn) h += '<div class="practice-q-en">' + escH(ex.promptEn) + '</div>';
      if (ex.choices) {
        h += '<div class="practice-opts">';
        ex.choices.forEach(function(c) { h += '<span class="practice-opt">' + escH(c) + '</span>'; });
        h += '</div>';
      } else {
        h += '<div style="margin-top:.2rem"><span class="blank-line"></span></div>';
      }
      h += '</div>';
    });

    h += '<div class="page-break"></div>';
    h += '<div class="answer-key"><h2>\u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A &mdash; Answer Key</h2>';
    allExercises.forEach(function(ex, i) {
      h += '<div class="ak-item"><span class="ak-num">' + (i + 1) + '.</span> ' + escH(ex.answer) + '</div>';
    });
    h += '</div>';
  }

  return h;
}

function buildReviewSheetHtml(dataList) {
  var h = '<div class="sheet-hdr">' +
    '<div class="sheet-title">\u0648\u0631\u0642\u0629 \u0645\u0631\u0627\u062C\u0639\u0629 &mdash; Review Sheet</div>' +
    '<div class="sheet-sub">' + dataList.length + ' verbs for review</div>' +
    '<div class="sheet-brand">RootifyArabic</div>' +
    '</div>';

  var allExercises = [];
  dataList.forEach(function(d, vi) {
    var norm = (d.root && typeof d.root === 'object') ? (d.root.normalized || d.root.input || '') : (d.root || '');
    var past3ms = '', pres3ms = '';
    if (d.active) {
      var pm = byKey(d.active.past);
      var prm = byKey(d.active.present);
      if (pm['3ms']) past3ms = pm['3ms'].arabic || '';
      if (prm['3ms']) pres3ms = prm['3ms'].arabic || '';
    }
    var masdarAr = '';
    if (d.masdar && d.masdar.length) masdarAr = d.masdar[0].arabic || '';

    if (vi > 0) h += '<hr class="verb-sep">';
    h += '<div class="ws-verb-hdr"><span class="ws-verb-ar">' + escH(norm) + '</span><span class="ws-verb-gl">' + escH(d.gloss || '') + '</span></div>';
    h += '<div class="info-grid" style="font-size:10pt">' +
      '<span class="info-lbl">Past</span><span class="info-val">' + escH(past3ms) + '</span>' +
      '<span class="info-lbl">Present</span><span class="info-val">' + escH(pres3ms) + '</span>' +
      '<span class="info-lbl">Masdar</span><span class="info-val">' + escH(masdarAr || '\u2014') + '</span>' +
      '</div>';

    var exs = generateExercises(d).slice(0, 2);
    exs.forEach(function(ex) { allExercises.push(ex); });
  });

  if (allExercises.length) {
    h += '<h2 style="margin-top:1rem">\u062A\u062F\u0631\u064A\u0628\u0627\u062A \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 &mdash; Review Exercises</h2>';
    allExercises.forEach(function(ex, i) {
      h += '<div class="practice-item"><div class="practice-q">' + (i + 1) + '. ' + ex.prompt + '</div>';
      if (ex.promptEn) h += '<div class="practice-q-en">' + escH(ex.promptEn) + '</div>';
      if (ex.choices) {
        h += '<div class="practice-opts">';
        ex.choices.forEach(function(c) { h += '<span class="practice-opt">' + escH(c) + '</span>'; });
        h += '</div>';
      } else {
        h += '<div style="margin-top:.2rem"><span class="blank-line"></span></div>';
      }
      h += '</div>';
    });

    h += '<div class="answer-key"><h2>\u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A &mdash; Answer Key</h2>';
    allExercises.forEach(function(ex, i) {
      h += '<div class="ak-item"><span class="ak-num">' + (i + 1) + '.</span> ' + escH(ex.answer) + '</div>';
    });
    h += '</div>';
  }

  return h;
}

function fetchMultipleVerbs(verbs, callback) {
  var results = [];
  var remaining = verbs.length;
  verbs.forEach(function(v, i) {
    fetchVerbData(v).then(function(d) {
      results[i] = d;
      remaining--;
      if (remaining === 0) callback(results.filter(Boolean));
    }).catch(function() {
      remaining--;
      if (remaining === 0) callback(results.filter(Boolean));
    });
  });
}

function openMultiVerbSelector() {
  var recent = [];
  try { recent = JSON.parse(localStorage.getItem('rootify_recent') || '[]'); } catch(e) {}
  var reviewVerbs = pgReviewList();
  var allVerbs = [];
  var seen = {};
  reviewVerbs.forEach(function(v) { if (!seen[v]) { seen[v] = 1; allVerbs.push({ ar: v, src: 'review' }); } });
  recent.forEach(function(r) {
    var v = typeof r === 'string' ? r : (r.root || r);
    if (!seen[v]) { seen[v] = 1; allVerbs.push({ ar: v, src: 'recent' }); }
  });
  if (!allVerbs.length) { alert('No verbs available. Analyze some verbs first!'); return; }

  var overlay = document.getElementById('mvOverlay');
  var h = '<div class="mv-modal">' +
    '<div class="mv-modal-hdr">' +
      '<span class="mv-modal-title">\u0627\u062E\u062A\u0631 \u0623\u0641\u0639\u0627\u0644 &mdash; Select Verbs</span>' +
      '<button class="mv-modal-close" onclick="closeMvModal()">&times;</button>' +
    '</div>' +
    '<div class="mv-modal-body">';
  allVerbs.forEach(function(v, i) {
    var tag = v.src === 'review' ? ' \u26A0' : '';
    h += '<label class="mv-verb-row"><input type="checkbox" class="mv-verb-cb" value="' + escH(v.ar) + '" checked>' +
      '<span class="mv-verb-ar">' + escH(v.ar) + tag + '</span></label>';
  });
  h += '</div>' +
    '<div class="mv-modal-foot">' +
      '<button class="mv-sel-all" onclick="mvToggleAll()">Toggle All</button>' +
      '<button class="mv-export-btn" onclick="mvExport()">Export Worksheet</button>' +
    '</div></div>';
  overlay.innerHTML = h;
  overlay.style.display = 'flex';
}

function closeMvModal() {
  document.getElementById('mvOverlay').style.display = 'none';
}

function mvToggleAll() {
  var cbs = document.querySelectorAll('.mv-verb-cb');
  var allChecked = true;
  cbs.forEach(function(cb) { if (!cb.checked) allChecked = false; });
  cbs.forEach(function(cb) { cb.checked = !allChecked; });
}

function mvExport() {
  var cbs = document.querySelectorAll('.mv-verb-cb:checked');
  var verbs = [];
  cbs.forEach(function(cb) { verbs.push(cb.value); });
  if (!verbs.length) { alert('Select at least one verb.'); return; }
  closeMvModal();
  fetchMultipleVerbs(verbs, function(dataList) {
    if (!dataList.length) { alert('Could not load verb data.'); return; }
    var html = buildMultiVerbWorksheet(dataList);
    openPrintWindow(html, 'Multi-Verb Worksheet');
  });
}

function exportReviewSheet() {
  var pgAll = pgLoad();
  var verbs = Object.keys(pgAll).filter(function(k) {
    return pgAll[k].status === 'needs_review' || pgAll[k].status === 'practicing';
  });
  if (!verbs.length) { alert('No verbs to review yet!'); return; }
  fetchMultipleVerbs(verbs, function(dataList) {
    if (!dataList.length) { alert('Could not load verb data.'); return; }
    var html = buildReviewSheetHtml(dataList);
    openPrintWindow(html, 'Review Sheet');
  });
}

/* ── Verb Sets (Teacher Sets) ──────────────────── */
var _VS_KEY = 'rootify_sets';

function vsLoad() {
  try {
    var raw = JSON.parse(localStorage.getItem(_VS_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter(function(s) { return s && s.id && s.name && Array.isArray(s.verbs); });
  } catch(e) { return []; }
}

function vsSave(sets) {
  try { localStorage.setItem(_VS_KEY, JSON.stringify(sets)); } catch(e) {}
}

function vsCreate(name) {
  var sets = vsLoad();
  var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  var now = new Date().toISOString();
  var s = { id: id, name: name, verbs: [], createdAt: now, updatedAt: now };
  sets.push(s);
  vsSave(sets);
  return s;
}

function vsRename(id, newName) {
  var sets = vsLoad();
  var s = sets.find(function(x) { return x.id === id; });
  if (s) { s.name = newName; s.updatedAt = new Date().toISOString(); vsSave(sets); }
}

function vsDelete(id) {
  var sets = vsLoad().filter(function(x) { return x.id !== id; });
  vsSave(sets);
}

function vsAddVerb(id, verb) {
  var sets = vsLoad();
  var s = sets.find(function(x) { return x.id === id; });
  if (s && s.verbs.indexOf(verb) === -1) {
    s.verbs.push(verb);
    s.updatedAt = new Date().toISOString();
    vsSave(sets);
  }
}

function vsRemoveVerb(id, verb) {
  var sets = vsLoad();
  var s = sets.find(function(x) { return x.id === id; });
  if (s) {
    s.verbs = s.verbs.filter(function(v) { return v !== verb; });
    s.updatedAt = new Date().toISOString();
    vsSave(sets);
  }
}

function vsAddMultiple(id, verbs) {
  var sets = vsLoad();
  var s = sets.find(function(x) { return x.id === id; });
  if (s) {
    verbs.forEach(function(v) { if (s.verbs.indexOf(v) === -1) s.verbs.push(v); });
    s.updatedAt = new Date().toISOString();
    vsSave(sets);
  }
}

function openVerbSetManager() {
  renderVsSetList();
  document.getElementById('vsOverlay').style.display = 'flex';
}

function closeVsManager() {
  document.getElementById('vsOverlay').style.display = 'none';
}

function renderVsSetList() {
  var sets = vsLoad();
  var overlay = document.getElementById('vsOverlay');
  var h = '<div class="vs-modal">' +
    '<div class="vs-hdr">' +
      '<span class="vs-title">\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0623\u0641\u0639\u0627\u0644 &mdash; Verb Sets</span>' +
      '<button class="vs-close" onclick="closeVsManager()">&times;</button>' +
    '</div>' +
    '<div class="vs-body">' +
      '<div class="vs-create-row">' +
        '<input class="vs-create-input" id="vsNewName" placeholder="\u0627\u0633\u0645 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 &mdash; Set name" onkeydown="if(event.key===\\x27Enter\\x27) vsCreateFromInput()">' +
        '<button class="vs-create-btn" onclick="vsCreateFromInput()">+ Create</button>' +
      '</div>';

  if (!sets.length) {
    h += '<div class="vs-empty">\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0628\u0639\u062F &mdash; No sets yet</div>';
  } else {
    sets.forEach(function(s) {
      h += '<div class="vs-set-item" onclick="renderVsSetDetail(\\x27' + escH(s.id) + '\\x27)">' +
        '<span class="vs-set-name">' + escH(s.name) + '</span>' +
        '<span class="vs-set-count">' + s.verbs.length + ' verb' + (s.verbs.length !== 1 ? 's' : '') + '</span>' +
        '<div class="vs-set-actions">' +
          '<button class="vs-act-btn" onclick="event.stopPropagation(); vsRenamePrompt(\\x27' + escH(s.id) + '\\x27)" title="Rename">&#x270F;&#xFE0F;</button>' +
          '<button class="vs-act-btn vs-del" onclick="event.stopPropagation(); vsDeleteConfirm(\\x27' + escH(s.id) + '\\x27)" title="Delete">&#x1F5D1;&#xFE0F;</button>' +
        '</div>' +
      '</div>';
    });
  }

  h += '</div></div>';
  overlay.innerHTML = h;
}

function vsCreateFromInput() {
  var el = document.getElementById('vsNewName');
  var name = (el.value || '').trim();
  if (!name) { el.focus(); return; }
  vsCreate(name);
  el.value = '';
  renderVsSetList();
}

function vsRenamePrompt(id) {
  var sets = vsLoad();
  var s = sets.find(function(x) { return x.id === id; });
  if (!s) return;
  var newName = prompt('\u0627\u0633\u0645 \u062C\u062F\u064A\u062F \u2014 New name:', s.name);
  if (newName && newName.trim()) {
    vsRename(id, newName.trim());
    renderVsSetList();
  }
}

function vsDeleteConfirm(id) {
  var sets = vsLoad();
  var s = sets.find(function(x) { return x.id === id; });
  if (!s) return;
  if (confirm('\u062D\u0630\u0641 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 "' + s.name + '"?\\nDelete set "' + s.name + '"?')) {
    vsDelete(id);
    renderVsSetList();
  }
}

function renderVsSetDetail(id) {
  var sets = vsLoad();
  var s = sets.find(function(x) { return x.id === id; });
  if (!s) return;

  var overlay = document.getElementById('vsOverlay');
  var h = '<div class="vs-modal">' +
    '<div class="vs-hdr">' +
      '<button class="vs-detail-back" onclick="renderVsSetList()">&larr;</button>' +
      '<span class="vs-detail-name">' + escH(s.name) + '</span>' +
      '<button class="vs-close" onclick="closeVsManager()">&times;</button>' +
    '</div>' +
    '<div class="vs-body">';

  if (!s.verbs.length) {
    h += '<div class="vs-empty">\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0641\u0639\u0627\u0644 &mdash; No verbs yet.<br><small>Use "Add to Set" from the analysis view.</small></div>';
  } else {
    s.verbs.forEach(function(v) {
      h += '<div class="vs-verb-item">' +
        '<span class="vs-verb-ar">' + escH(v) + '</span>' +
        '<button class="vs-verb-rm" onclick="vsRemoveVerbUI(\\x27' + escH(id) + '\\x27, \\x27' + escH(v) + '\\x27)" title="Remove">&times;</button>' +
      '</div>';
    });
  }

  var hasVerbs = s.verbs.length > 0;
  h += '<div class="vs-export-grid">' +
    '<button class="vs-exp-btn" onclick="vsExport(\\x27' + escH(id) + '\\x27, \\x27study\\x27)"' + (hasVerbs ? '' : ' disabled') + '>&#x1F4C4; Study Sheet</button>' +
    '<button class="vs-exp-btn" onclick="vsExport(\\x27' + escH(id) + '\\x27, \\x27worksheet\\x27)"' + (hasVerbs ? '' : ' disabled') + '>&#x1F4DD; Worksheet</button>' +
    '<button class="vs-exp-btn" onclick="vsExport(\\x27' + escH(id) + '\\x27, \\x27quiz\\x27)"' + (hasVerbs ? '' : ' disabled') + '>&#x1F9E0; Quiz</button>' +
    '<button class="vs-exp-btn" onclick="vsExport(\\x27' + escH(id) + '\\x27, \\x27review\\x27)"' + (hasVerbs ? '' : ' disabled') + '>&#x1F501; Review Packet</button>' +
  '</div>';

  h += '</div>' +
    '<div class="vs-foot">' +
      '<button class="vs-act-btn" onclick="vsAddReviewedToSet(\\x27' + escH(id) + '\\x27)">+ Add reviewed verbs</button>' +
      '<button class="vs-act-btn" onclick="vsAddRecentToSet(\\x27' + escH(id) + '\\x27)">+ Add recent verbs</button>' +
    '</div>' +
  '</div>';

  overlay.innerHTML = h;
}

function vsRemoveVerbUI(id, verb) {
  vsRemoveVerb(id, verb);
  renderVsSetDetail(id);
}

function vsAddReviewedToSet(id) {
  var reviewVerbs = pgReviewList();
  if (!reviewVerbs.length) { alert('\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0641\u0639\u0627\u0644 \u0644\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u2014 No review verbs.'); return; }
  vsAddMultiple(id, reviewVerbs);
  renderVsSetDetail(id);
}

function vsAddRecentToSet(id) {
  var recent = [];
  try { recent = JSON.parse(localStorage.getItem('rootify_recent') || '[]'); } catch(e) {}
  var verbs = recent.map(function(r) { return typeof r === 'string' ? r : (r.root || r); });
  if (!verbs.length) { alert('\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0641\u0639\u0627\u0644 \u062D\u062F\u064A\u062B\u0629 \u2014 No recent verbs.'); return; }
  vsAddMultiple(id, verbs);
  renderVsSetDetail(id);
}

function vsExport(id, type) {
  var sets = vsLoad();
  var s = sets.find(function(x) { return x.id === id; });
  if (!s || !s.verbs.length) return;

  closeVsManager();
  fetchMultipleVerbs(s.verbs, function(dataList) {
    if (!dataList.length) { alert('Could not load verb data.'); return; }
    var html = '';
    var title = '';
    if (type === 'study') {
      html = dataList.map(function(d, i) {
        return (i > 0 ? '<hr class="verb-sep"><div class="page-break"></div>' : '') + buildSingleVerbSheet(d);
      }).join('');
      title = s.name + ' \u2014 Study Sheets';
    } else if (type === 'worksheet') {
      html = buildMultiVerbWorksheet(dataList);
      title = s.name + ' \u2014 Worksheet';
    } else if (type === 'quiz') {
      html = buildQuizFromSet(dataList, s.name);
      title = s.name + ' \u2014 Quiz';
    } else if (type === 'review') {
      html = buildReviewSheetHtml(dataList);
      title = s.name + ' \u2014 Review Packet';
    }
    openPrintWindow(html, title);
  });
}

function buildQuizFromSet(dataList, setName) {
  var h = '<div class="sheet-hdr">' +
    '<div class="sheet-title">\u0627\u062E\u062A\u0628\u0627\u0631 &mdash; Quiz</div>' +
    '<div class="sheet-sub">' + escH(setName) + ' &mdash; ' + dataList.length + ' verb' + (dataList.length !== 1 ? 's' : '') + '</div>' +
    '<div class="sheet-brand">RootifyArabic</div>' +
    '</div>';

  h += '<h2>\u0627\u0644\u0642\u0633\u0645 \u0661: \u0627\u0644\u0645\u0639\u0646\u0649 &mdash; Part 1: Meaning</h2>';
  h += '<div style="font-size:10pt;color:#111827;margin-bottom:.5rem">Translate the following verbs:</div>';
  dataList.forEach(function(d, i) {
    var norm = (d.root && typeof d.root === 'object') ? (d.root.normalized || d.root.input || '') : (d.root || '');
    h += '<div class="practice-item"><span class="ak-num">' + (i + 1) + '.</span> ' +
      '<span style="font-size:13pt;font-weight:700">' + escH(norm) + '</span>' +
      ' <span class="blank-line" style="width:12rem"></span></div>';
  });

  h += '<h2>\u0627\u0644\u0642\u0633\u0645 \u0662: \u0627\u0644\u062A\u0635\u0631\u064A\u0641 &mdash; Part 2: Conjugation</h2>';
  h += '<div style="font-size:10pt;color:#111827;margin-bottom:.5rem">Conjugate in the past tense (he, she, they):</div>';
  dataList.forEach(function(d, i) {
    var norm = (d.root && typeof d.root === 'object') ? (d.root.normalized || d.root.input || '') : (d.root || '');
    h += '<div class="practice-item"><span class="ak-num">' + (i + 1) + '.</span> ' +
      '<span style="font-size:12pt;font-weight:700">' + escH(norm) + '</span><br>' +
      '\u0647\u0648: <span class="blank-line"></span> &nbsp; ' +
      '\u0647\u064A: <span class="blank-line"></span> &nbsp; ' +
      '\u0647\u0645: <span class="blank-line"></span></div>';
  });

  h += '<h2>\u0627\u0644\u0642\u0633\u0645 \u0663: \u0627\u0644\u0645\u0635\u062F\u0631 &mdash; Part 3: Verbal Noun</h2>';
  h += '<div style="font-size:10pt;color:#111827;margin-bottom:.5rem">Write the masdar for each verb:</div>';
  dataList.forEach(function(d, i) {
    var norm = (d.root && typeof d.root === 'object') ? (d.root.normalized || d.root.input || '') : (d.root || '');
    h += '<div class="practice-item"><span class="ak-num">' + (i + 1) + '.</span> ' +
      '<span style="font-size:12pt;font-weight:700">' + escH(norm) + '</span> &rarr; ' +
      '<span class="blank-line" style="width:8rem"></span></div>';
  });

  h += '<div class="answer-key"><h2>\u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A &mdash; Answer Key</h2>';
  dataList.forEach(function(d, i) {
    var norm = (d.root && typeof d.root === 'object') ? (d.root.normalized || d.root.input || '') : (d.root || '');
    var past3ms = '', past3fs = '', past3mp = '', pres3ms = '', masdarAr = '';
    if (d.active) {
      var pm = byKey(d.active.past);
      if (pm['3ms']) past3ms = pm['3ms'].arabic || '';
      if (pm['3fs']) past3fs = pm['3fs'].arabic || '';
      if (pm['3mp']) past3mp = pm['3mp'].arabic || '';
    }
    if (d.masdar && d.masdar.length) masdarAr = d.masdar[0].arabic || '';
    h += '<div class="ak-item"><span class="ak-num">' + (i + 1) + '.</span> ' +
      escH(norm) + ' = ' + escH(d.gloss || '') +
      ' | \u0647\u0648: ' + escH(past3ms) +
      ' \u0647\u064A: ' + escH(past3fs) +
      ' \u0647\u0645: ' + escH(past3mp) +
      ' | \u0645\u0635\u062F\u0631: ' + escH(masdarAr) +
      '</div>';
  });
  h += '</div>';
  return h;
}

/* ── Add to Set (from analysis view) ── */
function openAddToSet() {
  if (!_lastResultData) return;
  var verb = (_lastResultData.root && typeof _lastResultData.root === 'object')
    ? (_lastResultData.root.normalized || _lastResultData.root.input || '')
    : (_lastResultData.root || '');
  if (!verb) return;

  var sets = vsLoad();
  var overlay = document.getElementById('vsAddOverlay');
  var h = '<div class="vs-add-modal">' +
    '<div class="vs-add-hdr">' +
      '<span class="vs-add-title">\u0623\u0636\u0641 ' + escH(verb) + ' \u0625\u0644\u0649 \u0645\u062C\u0645\u0648\u0639\u0629 &mdash; Add to Set</span>' +
      '<button class="vs-close" onclick="closeAddToSet()">&times;</button>' +
    '</div>' +
    '<div class="vs-add-body">';

  if (!sets.length) {
    h += '<div class="vs-empty">\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062C\u0645\u0648\u0639\u0627\u062A &mdash; No sets yet</div>';
  } else {
    sets.forEach(function(s) {
      var already = s.verbs.indexOf(verb) !== -1;
      h += '<label class="vs-add-row">' +
        '<input type="checkbox" class="vs-add-cb" value="' + escH(s.id) + '"' + (already ? ' checked disabled' : '') + '>' +
        '<span class="vs-add-label">' + escH(s.name) + ' <small style="color:#111827">(' + s.verbs.length + ')</small>' +
          (already ? ' <small style="color:#2563eb">\u2714</small>' : '') +
        '</span>' +
      '</label>';
    });
  }

  h += '<div class="vs-add-new-row">' +
    '<input class="vs-add-new-input" id="vsAddNewName" placeholder="\u0645\u062C\u0645\u0648\u0639\u0629 \u062C\u062F\u064A\u062F\u0629...">' +
    '<button class="vs-add-new-btn" onclick="vsAddNewAndCheck()">+ New</button>' +
  '</div>';

  h += '</div>' +
    '<div class="vs-add-foot">' +
      '<button class="vs-add-cancel" onclick="closeAddToSet()">Cancel</button>' +
      '<button class="vs-add-save" onclick="vsAddToChecked()">Save</button>' +
    '</div></div>';

  overlay.innerHTML = h;
  overlay.style.display = 'flex';
  overlay.dataset.verb = verb;
}

function closeAddToSet() {
  document.getElementById('vsAddOverlay').style.display = 'none';
}

function vsAddNewAndCheck() {
  var el = document.getElementById('vsAddNewName');
  var name = (el.value || '').trim();
  if (!name) { el.focus(); return; }
  var s = vsCreate(name);
  var verb = document.getElementById('vsAddOverlay').dataset.verb;
  if (verb) { vsAddVerb(s.id, verb); openAddToSet(); }
}

function vsAddToChecked() {
  var verb = document.getElementById('vsAddOverlay').dataset.verb;
  if (!verb) return;
  var cbs = document.querySelectorAll('.vs-add-cb:checked:not(:disabled)');
  cbs.forEach(function(cb) { vsAddVerb(cb.value, verb); });
  closeAddToSet();
}

/* ── RootSnap chips ────────────────────────────── */
function initRootsnap() {
  var el = document.getElementById('rootsnapChips');
  el.innerHTML = ROOTSNAP.map(function(r) {
    return '<button class="rs-chip" data-root="' + escH(r) + '">' + r + '</button>';
  }).join('');
  el.onclick = function(e) {
    var chip = e.target.closest('.rs-chip');
    if (chip) analyzeRoot(chip.dataset.root, 'auto');
  };
}

/* ── English-to-Arabic search ─────────────────── */
var _enSearchTimer = null;
var _enSearchSeq = 0;
function isEnglishInput(s) {
  if (!s) return false;
  var latin = (s.match(/[a-zA-Z]/g) || []).length;
  return latin / s.replace(/\\s/g, '').length > 0.5;
}

function handleHomeInput() {
  var val = document.getElementById('homeInput').value.trim();
  if (isEnglishInput(val)) {
    clearTimeout(_enSearchTimer);
    _enSearchTimer = setTimeout(function() { doEnglishSearch(val); }, 300);
  } else {
    _enSearchSeq++;
    clearEnResults();
  }
}

async function doEnglishSearch(query) {
  if (!query || query.length < 2) { clearEnResults(); return; }
  var seq = ++_enSearchSeq;
  try {
    var resp = await fetch('/api/smartroot/english-search?q=' + encodeURIComponent(query));
    var data = await resp.json();
    if (seq !== _enSearchSeq) return;
    renderEnResults(data, query);
  } catch(e) { if (seq === _enSearchSeq) clearEnResults(); }
}

function renderEnResults(data, query) {
  var panel = document.getElementById('enResultsPanel');
  var snap = document.getElementById('rootsnapHdr');
  var chips = document.getElementById('rootsnapChips');
  var groups = data.groups || [];
  if (!groups.length) {
    panel.innerHTML = '<div class="en-no-results">No Arabic verbs found for \u201C' + escH(query) + '\u201D</div>';
    panel.style.display = 'block';
    snap.style.display = 'none';
    chips.style.display = 'none';
    return;
  }
  var totalCount = 0;
  groups.forEach(function(g) { totalCount += g.results.length; });
  var h = '<div class="en-results">' +
    '<div class="en-results-hdr">Results for \u201C' + escH(query) + '\u201D \u2014 ' + totalCount + ' verb' + (totalCount !== 1 ? 's' : '') + '</div>';
  if (data.expandedQueries && data.expandedQueries.length > 0) {
    h += '<div class="en-results-expanded">Also searched: ' + data.expandedQueries.slice(0, 6).map(function(w) { return escH(w); }).join(', ') + '</div>';
  }
  var formMap = { 1:'I', 2:'II', 3:'III', 4:'IV', 5:'V', 6:'VI', 7:'VII', 8:'VIII', 10:'X' };
  groups.forEach(function(grp) {
    h += '<div class="en-group">' +
      '<div class="en-group-label">' + escH(grp.label) + '</div>';
    grp.results.forEach(function(r) {
      var formStr = formMap[r.form] || r.form;
      var matchBadge = '';
      if (r.matchType === 'synonym') {
        matchBadge = '<span class="en-card-match en-card-match-synonym">synonym</span>';
      }
      h += '<div class="en-card" onclick="analyzeRoot(\\x27' + escH(r.root) + '\\x27, \\x27' + (r.form === 1 ? 'auto' : formStr) + '\\x27)">' +
        '<div class="en-card-root">' + escH(r.root) + '</div>' +
        '<div class="en-card-body">' +
          '<div class="en-card-gloss">' + escH(r.gloss) + '</div>' +
          '<div class="en-card-meta">Form ' + formStr + matchBadge + '</div>' +
        '</div>' +
        '<button class="en-card-gen-btn" onclick="event.stopPropagation();analyzeRoot(\\x27' + escH(r.root) + '\\x27, \\x27' + (r.form === 1 ? 'auto' : formStr) + '\\x27)">Conjugate</button>' +
      '</div>';
    });
    h += '</div>';
  });
  h += '</div>';
  panel.innerHTML = h;
  panel.style.display = 'block';
  snap.style.display = 'none';
  chips.style.display = 'none';
}

function clearEnResults() {
  var panel = document.getElementById('enResultsPanel');
  if (panel) { panel.innerHTML = ''; panel.style.display = 'none'; }
  var snap = document.getElementById('rootsnapHdr');
  var chips = document.getElementById('rootsnapChips');
  if (snap) snap.style.display = '';
  if (chips) chips.style.display = '';
}

/* ── Shared analyze entry points ───────────────── */
function analyzeRoot(root, measure) {
  clearEnResults();
  document.getElementById('homeInput').value = root;
  document.getElementById('homeMeasure').value = measure || 'auto';
  document.getElementById('rootInput').value = root;
  document.getElementById('measureSelect').value = measure || 'auto';
  doAnalyze(root, measure || 'auto');
}
function analyzeFromHome() {
  var root = document.getElementById('homeInput').value.trim();
  var measure = document.getElementById('homeMeasure').value;
  if (!root) return;
  if (isEnglishInput(root)) { doEnglishSearch(root); return; }
  clearEnResults();
  document.getElementById('rootInput').value = root;
  document.getElementById('measureSelect').value = measure;
  doAnalyze(root, measure);
}
function analyzeFromBar() {
  var root = document.getElementById('rootInput').value.trim();
  var measure = document.getElementById('measureSelect').value;
  if (!root) return;
  doAnalyze(root, measure);
}

async function doAnalyze(root, measure, bab) {
  var errEl = document.getElementById('error-area');
  errEl.innerHTML = '';
  document.getElementById('heroCard').innerHTML = '';
  document.getElementById('result').style.display = 'none';
  document.getElementById('practiceWrap').style.display = 'none';
  document.getElementById('practicePanel').innerHTML = '';
  _lastResultData = null;
  showAnalysis();
  try {
    var body = { root: root, measure: measure };
    if (bab) body.bab = bab;
    var resp = await fetch('/api/smartroot/morphology', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      var err = await resp.json().catch(function() { return {}; });
      errEl.innerHTML = '<div class="error-box">' + escH(err.error || 'Request failed (' + resp.status + ')') + '</div>';
      return;
    }
    var data = await resp.json();
    if (data.safety_mode === 'multi_interpretation' && !data.active) {
      renderInterpretationPanel(data);
    } else if (data.safety_block) {
      renderSafetyPanel(data);
    } else if (data.needs_bab_selection) {
      renderBabPicker(data, root, measure);
    } else {
      addRecent(root, measure);
      renderResult(data);
      if (data.safety_note) {
        renderRecoveryNote(data.safety_note, data.root ? data.root.input : root);
      }
    }
  } catch(e) {
    errEl.innerHTML = '<div class="error-box">Network error: ' + escH(e.message) + '</div>';
  }
}

function renderBabPicker(data, root, measure) {
  var r = data.root;

  /* ── Mini hero header ── */
  document.getElementById('heroCard').innerHTML =
    '<div class="hero-top">' +
      '<div class="hero-info">' +
        '<div class="hero-gloss" style="color:#e63946">\u0647\u0630\u0627 \u0627\u0644\u0641\u0639\u0644 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f \u0641\u064a \u0627\u0644\u0642\u0627\u0645\u0648\u0633 \u0628\u0639\u062f.</div>' +
        '<div class="hero-meta">Root \u202a' + escH(r.r1) + '\u2013' + escH(r.r2) + '\u2013' + escH(r.r3) + '\u202c &nbsp;\u00b7&nbsp; Measure I</div>' +
        '<div class="hero-badges">' +
          '<span class="badge badge-form">Measure I</span>' +
          '<span class="badge badge-pattern">\u0641\u0639\u0644</span>' +
          '<span class="badge badge-det surface_heuristic">heuristic</span>' +
        '</div>' +
      '</div>' +
      '<div class="hero-arabic">' + escH(r.normalized || r.input) + '</div>' +
    '</div>';

  /* ── Unknown-verb message + Bāb picker card ── */
  var html = '<div class="bab-picker">' +
    '<div class="bab-picker-hdr">' +
      '<span class="bab-picker-icon">\uD83D\uDCD6</span>' +
      '<div>' +
        '<div class="bab-picker-title" style="font-size:.92rem; direction:rtl; text-align:right">\u0647\u0630\u0627 \u0627\u0644\u0641\u0639\u0644 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f \u0641\u064a \u0627\u0644\u0642\u0627\u0645\u0648\u0633 \u0628\u0639\u062f.</div>' +
        '<div class="bab-picker-sub" style="direction:rtl; text-align:right">\u064a\u0645\u0643\u0646\u0643 \u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0628\u0627\u0628 \u0644\u062a\u0648\u0644\u064a\u062f \u0627\u0644\u062a\u0635\u0631\u064a\u0641.</div>' +
      '</div>' +
    '</div>' +
    '<div class="bab-grid">';

  (data.abwab || []).forEach(function(b) {
    html +=
      '<button class="bab-btn" data-bab="' + escH(b.bab) + '">' +
        '<div class="bab-name">' + escH(b.name) + '</div>' +
        '<div class="bab-patterns">' +
          '<span class="bab-past">' + escH(b.pastPattern) + '</span>' +
          '<span class="bab-sep"> / </span>' +
          '<span class="bab-pres">' + escH(b.presentPattern) + '</span>' +
        '</div>' +
        '<div class="bab-ex">' + escH(b.example) + '</div>' +
        '<div class="bab-code">' + escH(b.bab) + '</div>' +
      '</button>';
  });

  html += '</div></div>';

  document.getElementById('conjChart').innerHTML = html;

  ['derivContent','usageContent','familyContent'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
  var prepAcc = document.getElementById('acc-prep');
  if (prepAcc) prepAcc.style.display = 'none';
  var usageAcc = document.getElementById('acc-usage');
  if (usageAcc) usageAcc.style.display = 'none';

  ['acc-deriv','acc-family','acc-derived-nouns','acc-usage','acc-forms','practiceWrap'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('open');
  });

  document.getElementById('result').style.display = 'block';

  document.getElementById('conjChart').onclick = function(e) {
    var btn = e.target.closest('.bab-btn');
    if (!btn) return;
    doAnalyze(root, measure, btn.dataset.bab);
  };
}

var _lastResultData = null;

var VERB_CLASS_INFO = {
  sound: {
    ar: '\u0627\u0644\u0641\u0639\u0644 \u0627\u0644\u0635\u062D\u064A\u062D \u0627\u0644\u0633\u0627\u0644\u0645',
    desc_ar: '\u062C\u0645\u064A\u0639 \u062D\u0631\u0648\u0641\u0647 \u0627\u0644\u0623\u0635\u0644\u064A\u0629 \u0635\u062D\u064A\u062D\u0629\u060C \u0644\u0627 \u064A\u062A\u063A\u064A\u0631 \u0623\u064A \u062D\u0631\u0641 \u0645\u0646\u0647\u0627 \u0639\u0646\u062F \u0627\u0644\u062A\u0635\u0631\u064A\u0641.',
    en: 'Sound verb \u2014 all root letters are stable and do not change during conjugation.',
    tips: ['\u0623\u0628\u0633\u0637 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0623\u0641\u0639\u0627\u0644 \u2014 \u0627\u0644\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0645\u0631\u062C\u0639\u064A\u0629 \u0644\u0643\u0644 \u0627\u0644\u0623\u0641\u0639\u0627\u0644 \u0627\u0644\u0623\u062E\u0631\u0649.']
  },
  hollow: {
    ar: '\u0627\u0644\u0641\u0639\u0644 \u0627\u0644\u0623\u062C\u0648\u0641',
    desc_ar: '\u0627\u0644\u062D\u0631\u0641 \u0627\u0644\u0623\u0648\u0633\u0637 (\u0639\u064A\u0646 \u0627\u0644\u0641\u0639\u0644) \u062D\u0631\u0641 \u0639\u0644\u0629 (\u0648\u0627\u0648 \u0623\u0648 \u064A\u0627\u0621)\u060C \u064A\u062A\u063A\u064A\u0631 \u0623\u0648 \u064A\u062D\u0630\u0641 \u0641\u064A \u0628\u0639\u0636 \u0627\u0644\u0635\u064A\u063A.',
    en: 'Hollow verb \u2014 the middle radical is a weak letter (\u0648/\u064A) that may change or drop.',
    tips: [
      '\u0627\u0646\u062A\u0628\u0647 \u0644\u062D\u0630\u0641 \u062D\u0631\u0641 \u0627\u0644\u0639\u0644\u0629 \u0641\u064A \u0627\u0644\u0645\u062C\u0632\u0648\u0645 \u0648\u0627\u0644\u0623\u0645\u0631.',
      '\u0627\u0644\u0645\u0627\u0636\u064A \u064A\u0623\u062E\u0630 \u0623\u0644\u0641\u064B\u0627 \u0645\u0639 \u0627\u0644\u0636\u0645\u0627\u0626\u0631 \u0627\u0644\u0645\u062A\u062D\u0631\u0643\u0629.'
    ]
  },
  defective: {
    ar: '\u0627\u0644\u0641\u0639\u0644 \u0627\u0644\u0646\u0627\u0642\u0635',
    desc_ar: '\u0627\u0644\u062D\u0631\u0641 \u0627\u0644\u0623\u062E\u064A\u0631 (\u0644\u0627\u0645 \u0627\u0644\u0641\u0639\u0644) \u062D\u0631\u0641 \u0639\u0644\u0629\u060C \u064A\u062A\u063A\u064A\u0631 \u0628\u062D\u0633\u0628 \u0627\u0644\u0636\u0645\u064A\u0631 \u0648\u0627\u0644\u0635\u064A\u063A\u0629.',
    en: 'Defective verb \u2014 the final radical is a weak letter that changes with conjugation.',
    tips: [
      '\u064A\u0646\u062A\u0647\u064A \u0627\u0644\u0645\u0627\u0636\u064A \u0628\u0640(\u0649) \u0623\u0648 (\u0627) \u0641\u064A \u0627\u0644\u0645\u0641\u0631\u062F \u0627\u0644\u063A\u0627\u0626\u0628.',
      '\u062A\u0646\u0628\u0647: \u0627\u0644\u0623\u0644\u0641 \u062A\u062D\u0630\u0641 \u0641\u064A \u0627\u0644\u0623\u0645\u0631 \u0648\u0627\u0644\u0645\u062C\u0632\u0648\u0645.'
    ]
  },
  assimilated: {
    ar: '\u0627\u0644\u0641\u0639\u0644 \u0627\u0644\u0645\u062B\u0627\u0644',
    desc_ar: '\u0627\u0644\u062D\u0631\u0641 \u0627\u0644\u0623\u0648\u0644 (\u0641\u0627\u0621 \u0627\u0644\u0641\u0639\u0644) \u062D\u0631\u0641 \u0639\u0644\u0629\u060C \u063A\u0627\u0644\u0628\u064B\u0627 \u0648\u0627\u0648\u060C \u0642\u062F \u064A\u062D\u0630\u0641 \u0641\u064A \u0627\u0644\u0645\u0636\u0627\u0631\u0639.',
    en: 'Assimilated verb \u2014 the first radical is a weak letter (\u0648), often dropped in the present tense.',
    tips: [
      '\u0641\u064A \u0627\u0644\u0645\u0636\u0627\u0631\u0639 \u062A\u062D\u0630\u0641 \u0627\u0644\u0648\u0627\u0648 \u0639\u0627\u062F\u0629\u064B: \u0648\u0639\u062F \u2192 \u064A\u0639\u062F.',
      '\u0641\u064A \u0627\u0644\u0645\u0627\u0636\u064A \u062A\u0628\u0642\u0649 \u0627\u0644\u0648\u0627\u0648 \u0643\u0645\u0627 \u0647\u064A.'
    ]
  },
  doubled: {
    ar: '\u0627\u0644\u0641\u0639\u0644 \u0627\u0644\u0645\u0636\u0639\u0651\u0641',
    desc_ar: '\u0627\u0644\u062D\u0631\u0641\u0627\u0646 \u0627\u0644\u062B\u0627\u0646\u064A \u0648\u0627\u0644\u062B\u0627\u0644\u062B \u0645\u062A\u0645\u0627\u062B\u0644\u0627\u0646\u060C \u064A\u062F\u063A\u0645\u0627\u0646 \u0641\u064A \u0628\u0639\u0636 \u0627\u0644\u0635\u064A\u063A.',
    en: 'Doubled verb \u2014 the 2nd and 3rd radicals are identical and may merge (idgham).',
    tips: [
      '\u0627\u0644\u0625\u062F\u063A\u0627\u0645 \u064A\u062D\u0635\u0644 \u0639\u0646\u062F \u0633\u0643\u0648\u0646 \u0627\u0644\u062B\u0627\u0646\u064A: \u0645\u062F\u062F \u2192 \u0645\u062F\u0651.',
      '\u064A\u0641\u0643 \u0627\u0644\u0625\u062F\u063A\u0627\u0645 \u0645\u0639 \u0636\u0645\u0627\u0626\u0631 \u0627\u0644\u0631\u0641\u0639 \u0627\u0644\u0645\u062A\u062D\u0631\u0643\u0629: \u0645\u062F\u062F\u0652\u062A\u064F.'
    ]
  },
  hamzated: {
    ar: '\u0627\u0644\u0641\u0639\u0644 \u0627\u0644\u0645\u0647\u0645\u0648\u0632',
    desc_ar: '\u0623\u062D\u062F \u062D\u0631\u0648\u0641\u0647 \u0627\u0644\u0623\u0635\u0644\u064A\u0629 \u0647\u0645\u0632\u0629\u060C \u0642\u062F \u064A\u062A\u063A\u064A\u0631 \u0631\u0633\u0645\u0647\u0627 \u0628\u062D\u0633\u0628 \u0627\u0644\u062D\u0631\u0643\u0627\u062A.',
    en: 'Hamzated verb \u2014 one radical is a hamza (\u0621), whose seat changes based on surrounding vowels.',
    tips: [
      '\u0627\u0644\u0647\u0645\u0632\u0629 \u062A\u0643\u062A\u0628 \u0639\u0644\u0649 \u0627\u0644\u0623\u0644\u0641 \u0623\u0648 \u0627\u0644\u0648\u0627\u0648 \u0623\u0648 \u0627\u0644\u064A\u0627\u0621 \u062D\u0633\u0628 \u0623\u0642\u0648\u0649 \u062D\u0631\u0643\u0629.',
      '\u0627\u0644\u0647\u0645\u0632\u0629 \u0641\u064A \u0623\u0648\u0644 \u0627\u0644\u0641\u0639\u0644 \u0642\u062F \u062A\u0645\u062F \u0625\u0644\u0649 \u0622 \u0641\u064A \u0627\u0644\u0631\u0627\u0628\u0639.'
    ]
  }
};

function renderTeacherInfo(d) {
  var el = document.getElementById('teacherInfoBar');
  if (!el || !d) return;

  var h = '<div class="teacher-grammar-row">';

  if (d.transitivity) {
    var tCls = d.transitivity === 'intransitive' ? 'tb-intrans' : d.transitivity === 'both' ? 'tb-both' : '';
    var tLabel = d.transitivity === 'intransitive' ? '\u0644\u0627\u0632\u0645 Intransitive' : d.transitivity === 'both' ? '\u0645\u062A\u0639\u062F\u0651\u064D \u0648\u0644\u0627\u0632\u0645' : '\u0645\u062A\u0639\u062F\u0651\u064D Transitive';
    h += '<span class="teacher-badge tb-transit ' + tCls + '">' + tLabel + '</span>';
  }

  if (d.frequency_tier) {
    var fCls = d.frequency_tier === 'high' ? 'tb-freq' : d.frequency_tier === 'medium' ? 'tb-freq tb-freq-med' : 'tb-freq tb-freq-low';
    var dots = '';
    var nDots = d.frequency_tier === 'high' ? 3 : d.frequency_tier === 'medium' ? 2 : 1;
    for (var di = 0; di < 3; di++) {
      dots += '<span class="teacher-freq-dot' + (di >= nDots ? ' dot-off' : '') + '"></span>';
    }
    h += '<span class="teacher-badge ' + fCls + '">' + escH(d.frequency_tier) + '<span class="teacher-freq-dots">' + dots + '</span></span>';
  }

  if (d.teaching_level) {
    h += '<span class="teacher-badge tb-ilr">ILR ' + escH(d.teaching_level) + '</span>';
  }

  if (d.detection_method) {
    var detLabel = { lexicon_exact: 'Lexicon', surface_heuristic: 'Heuristic', user_forced: 'User-forced' }[d.detection_method] || d.detection_method;
    h += '<span class="teacher-badge tb-detect">' + escH(detLabel) + '</span>';
  }

  h += '</div>';

  el.innerHTML = h;
}

/* ── Reusable Tooltip System ──────────────────── */
var _ttTimer = null;
var _ttLock = false;

function showTooltip(anchorEl, html) {
  var tip = document.getElementById('rfTooltip');
  var content = document.getElementById('rfTooltipContent');
  content.innerHTML = html;
  tip.style.display = 'block';
  tip.classList.remove('rf-visible');

  var rect = anchorEl.getBoundingClientRect();
  var tw = tip.offsetWidth;
  var th = tip.offsetHeight;
  var left = rect.left + rect.width / 2 - tw / 2;
  var top = rect.top - th - 8;
  if (top < 8) top = rect.bottom + 8;
  if (left < 8) left = 8;
  if (left + tw > window.innerWidth - 8) left = window.innerWidth - tw - 8;
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';

  requestAnimationFrame(function() { tip.classList.add('rf-visible'); });
  _ttLock = true;
}

function hideTooltip() {
  var tip = document.getElementById('rfTooltip');
  tip.classList.remove('rf-visible');
  _ttLock = false;
  setTimeout(function() {
    if (!_ttLock) tip.style.display = 'none';
  }, 160);
}

function setupTooltipHover(el, htmlFn) {
  el.addEventListener('mouseenter', function() {
    clearTimeout(_ttTimer);
    _ttTimer = setTimeout(function() { showTooltip(el, htmlFn()); }, 200);
  });
  el.addEventListener('mouseleave', function() {
    clearTimeout(_ttTimer);
    _ttTimer = setTimeout(hideTooltip, 300);
  });
  el.addEventListener('click', function(e) {
    e.stopPropagation();
    if (document.getElementById('rfTooltip').classList.contains('rf-visible')) {
      hideTooltip();
    } else {
      clearTimeout(_ttTimer);
      showTooltip(el, htmlFn());
    }
  });
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.rf-tooltip') && !e.target.closest('[data-tt]')) {
    hideTooltip();
  }
});

/* ── Root Panel ───────────────────────────────── */
function openRootPanel() {
  var d = _lastResultData;
  if (!d) return;
  var rootStr = escH(d.root.r1) + ' \u2013 ' + escH(d.root.r2) + ' \u2013 ' + escH(d.root.r3);
  document.getElementById('rpRootLabel').textContent = rootStr;

  var fam = d.verb_family;
  var dvs = fam ? (fam.derived_verbs || []) : [];
  var norm = d.root.normalized || d.root.input;
  var currentForm = parseInt(d.measure) || 1;

  var h = '';
  h += '<div class="rp-verb rp-current">' +
    '<span class="rp-verb-ar">' + escH(norm) + '</span>' +
    '<span class="rp-verb-form">Measure ' + formLabel(currentForm) + '</span>' +
    '<span class="rp-verb-gloss">' + escH(d.gloss) + '</span>' +
  '</div>';

  if (dvs.length) {
    dvs.forEach(function(v) {
      h += '<div class="rp-verb" onclick="closeRootPanel(); analyzeRoot(\\x27' + escH(v.past_3ms) + '\\x27, \\x27' + escH(v.label.replace('Measure ','').replace('Form ','')) + '\\x27)">' +
        '<span class="rp-verb-ar">' + escH(v.past_3ms) + '</span>' +
        '<span class="rp-verb-form">' + escH(v.label) + '</span>' +
        '<span class="rp-verb-gloss">' + escH(v.gloss || v.meaning) + '</span>' +
        (v.masdar ? '<span class="rp-verb-masdar">' + escH(v.masdar) + '</span>' : '') +
      '</div>';
    });
  } else {
    h += '<div class="root-panel-empty">\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0641\u0639\u0627\u0644 \u0625\u0636\u0627\u0641\u064A\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u062C\u0630\u0631 \u0628\u0639\u062F<br><span style="font-size:.68rem;color:#bbb">No additional root-family verbs available yet</span></div>';
  }

  document.getElementById('rpBody').innerHTML = h;
  document.getElementById('rootPanelOverlay').classList.add('rp-open');
}

function closeRootPanel() {
  document.getElementById('rootPanelOverlay').classList.remove('rp-open');
}

/* ── Conjugation Cell Tooltips ────────────────── */
var TENSE_INFO = {
  past: { ar: '\u0627\u0644\u0645\u0627\u0636\u064A', en: 'Past tense', hint_ar: '\u064A\u062F\u0644 \u0639\u0644\u0649 \u062D\u062F\u062B \u062A\u0645 \u0641\u064A \u0627\u0644\u0632\u0645\u0646 \u0627\u0644\u0645\u0627\u0636\u064A' },
  present: { ar: '\u0627\u0644\u0645\u0636\u0627\u0631\u0639', en: 'Present tense', hint_ar: '\u064A\u062F\u0644 \u0639\u0644\u0649 \u062D\u062F\u062B \u064A\u062C\u0631\u064A \u0627\u0644\u0622\u0646 \u0623\u0648 \u064A\u062A\u0643\u0631\u0631' },
  future: { ar: '\u0627\u0644\u0645\u0633\u062A\u0642\u0628\u0644', en: 'Future tense', hint_ar: '\u064A\u062F\u0644 \u0639\u0644\u0649 \u062D\u062F\u062B \u0633\u064A\u0642\u0639 \u0641\u064A \u0627\u0644\u0645\u0633\u062A\u0642\u0628\u0644' },
  imperative: { ar: '\u0627\u0644\u0623\u0645\u0631', en: 'Imperative', hint_ar: '\u064A\u0633\u062A\u062E\u062F\u0645 \u0644\u0644\u0637\u0644\u0628 \u0623\u0648 \u0627\u0644\u0623\u0645\u0631' },
  passive_past: { ar: '\u0627\u0644\u0645\u0627\u0636\u064A \u0627\u0644\u0645\u062C\u0647\u0648\u0644', en: 'Passive past', hint_ar: '\u0627\u0644\u0641\u0627\u0639\u0644 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641 \u0623\u0648 \u063A\u064A\u0631 \u0645\u0647\u0645' },
  passive_present: { ar: '\u0627\u0644\u0645\u0636\u0627\u0631\u0639 \u0627\u0644\u0645\u062C\u0647\u0648\u0644', en: 'Passive present', hint_ar: '\u0627\u0644\u0641\u0627\u0639\u0644 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641 \u0623\u0648 \u063A\u064A\u0631 \u0645\u0647\u0645' }
};

var VC_HINTS = {
  sound: '',
  hollow: '\u0641\u0639\u0644 \u0623\u062C\u0648\u0641: \u0644\u0627\u062D\u0638 \u062A\u063A\u064A\u0631 \u062D\u0631\u0641 \u0627\u0644\u0639\u0644\u0629',
  defective: '\u0641\u0639\u0644 \u0646\u0627\u0642\u0635: \u0644\u0627\u062D\u0638 \u062A\u063A\u064A\u0631 \u0627\u0644\u0623\u0644\u0641 \u0627\u0644\u0623\u062E\u064A\u0631\u0629',
  assimilated: '\u0641\u0639\u0644 \u0645\u062B\u0627\u0644: \u0644\u0627\u062D\u0638 \u062D\u0630\u0641 \u0627\u0644\u0648\u0627\u0648',
  doubled: '\u0641\u0639\u0644 \u0645\u0636\u0639\u0651\u0641: \u0644\u0627\u062D\u0638 \u0627\u0644\u0625\u062F\u063A\u0627\u0645',
  hamzated: '\u0641\u0639\u0644 \u0645\u0647\u0645\u0648\u0632: \u0644\u0627\u062D\u0638 \u0631\u0633\u0645 \u0627\u0644\u0647\u0645\u0632\u0629'
};

var VC_HINTS_EN = {
  sound: 'Basic verb type \u2014 the reference pattern for all other verbs',
  hollow: 'Hollow verb: watch weak-letter alternation',
  defective: 'Defective verb: final radical changes with conjugation',
  assimilated: 'Assimilated verb: first radical may drop',
  doubled: 'Doubled verb: watch for idgham (merging)',
  hamzated: 'Hamzated verb: hamza seat changes'
};

function attachConjTooltips() {
  var d = _lastResultData;
  if (!d) return;
  var vc = d.verb_class || 'sound';
  var table = document.querySelector('.conj-table');
  if (!table) return;

  var colMap = [
    'passive_present','passive_past','imperative','future','present','past'
  ];

  var rows = table.querySelectorAll('tbody tr:not(.grp-hdr)');
  rows.forEach(function(row) {
    var cells = row.querySelectorAll('td');
    cells.forEach(function(td, ci) {
      if (td.classList.contains('cell-empty') || td.classList.contains('td-label') || td.classList.contains('td-en-label')) return;
      var arDiv = td.querySelector('.ar');
      if (!arDiv) return;
      var tense = colMap[ci];
      if (!tense) return;
      var info = TENSE_INFO[tense];
      if (!info) return;

      td.setAttribute('data-tt', '1');
      setupTooltipHover(td, function() {
        var lines = '<div class="rf-tooltip-title">' + escH(info.ar) + '</div>';
        lines += '<div class="rf-tooltip-line">' + escH(info.en) + '</div>';
        lines += '<div class="rf-tooltip-line">' + escH(info.hint_ar) + '</div>';
        var vcHint = VC_HINTS[vc];
        if (vcHint) lines += '<div class="rf-tooltip-hint">' + escH(vcHint) + '</div>';
        return lines;
      });
    });
  });
}

/* ── Derivation Tooltips ──────────────────────── */
var DERIV_TOOLTIPS = {
  masdar: {
    ar: '\u0627\u0644\u0645\u0635\u062F\u0631 \u2014 \u0627\u0633\u0645 \u0627\u0644\u0641\u0639\u0644',
    en: 'Verbal noun \u2014 names the action or process',
    hint: '\u064A\u062F\u0644 \u0639\u0644\u0649 \u0627\u0644\u062D\u062F\u062B \u0645\u062C\u0631\u062F\u064B\u0627 \u0639\u0646 \u0627\u0644\u0632\u0645\u0627\u0646 \u0648\u0627\u0644\u0641\u0627\u0639\u0644'
  },
  active_participle: {
    ar: '\u0627\u0633\u0645 \u0627\u0644\u0641\u0627\u0639\u0644 \u2014 \u0645\u0646 \u064A\u0642\u0648\u0645 \u0628\u0627\u0644\u0641\u0639\u0644',
    en: 'Active participle \u2014 doer of the action',
    hint: '\u064A\u0635\u0641 \u0645\u0646 \u064A\u0642\u0648\u0645 \u0628\u0627\u0644\u0641\u0639\u0644 \u0623\u0648 \u064A\u062A\u0635\u0641 \u0628\u0647'
  },
  passive_participle: {
    ar: '\u0627\u0633\u0645 \u0627\u0644\u0645\u0641\u0639\u0648\u0644 \u2014 \u0645\u0646 \u064A\u0642\u0639 \u0639\u0644\u064A\u0647 \u0627\u0644\u0641\u0639\u0644',
    en: 'Passive participle \u2014 receiver of the action',
    hint: '\u064A\u0635\u0641 \u0645\u0646 \u0648\u0642\u0639 \u0639\u0644\u064A\u0647 \u0627\u0644\u0641\u0639\u0644'
  }
};

var NOUN_TYPE_TOOLTIPS = {
  '\u0635\u064A\u063A\u0629 \u0627\u0644\u0645\u0628\u0627\u0644\u063A\u0629': { en: 'Exaggeration form \u2014 intensified doer', hint: '\u062A\u062F\u0644 \u0639\u0644\u0649 \u0627\u0644\u0645\u0628\u0627\u0644\u063A\u0629 \u0641\u064A \u0635\u0641\u0629 \u0627\u0644\u0641\u0627\u0639\u0644' },
  '\u0627\u0633\u0645 \u0627\u0644\u0645\u0643\u0627\u0646 \u0648\u0627\u0644\u0632\u0645\u0627\u0646': { en: 'Place/time noun', hint: '\u064A\u062F\u0644 \u0639\u0644\u0649 \u0645\u0643\u0627\u0646 \u0623\u0648 \u0632\u0645\u0627\u0646 \u0627\u0644\u0641\u0639\u0644' },
  '\u0627\u0633\u0645 \u0627\u0644\u0622\u0644\u0629': { en: 'Instrument noun', hint: '\u064A\u062F\u0644 \u0639\u0644\u0649 \u0627\u0644\u0623\u062F\u0627\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0629' }
};

function attachDerivTooltips() {
  var rows = document.querySelectorAll('#derivContent .cdn-row');
  var keys = ['masdar','active_participle','passive_participle'];
  rows.forEach(function(row, i) {
    var catEl = row.querySelector('.cdn-cat-ar');
    var arEl = row.querySelector('.cdn-ar');
    if (!catEl || !arEl) return;
    var catText = catEl.textContent.trim();

    var info = null;
    if (i < keys.length) {
      info = DERIV_TOOLTIPS[keys[i]];
    }
    if (!info) {
      info = NOUN_TYPE_TOOLTIPS[catText];
    }
    if (!info) return;
    arEl.setAttribute('data-tt', '1');
    arEl.style.cursor = 'help';
    setupTooltipHover(arEl, function() {
      var lines = '<div class="rf-tooltip-title">' + escH(info.ar || catText) + '</div>';
      lines += '<div class="rf-tooltip-line">' + escH(info.en) + '</div>';
      if (info.hint) {
        lines += '<div class="rf-tooltip-hint">' + escH(info.hint) + '</div>';
      }
      return lines;
    });
  });
}

/* ── Root / Affix Two-Color Highlighting ─────── */
var HAMZA_FORMS = '\u0621\u0623\u0625\u0622\u0624\u0626';
function hamzaMatch(ch, rootCh) {
  if (ch === rootCh) return true;
  if (HAMZA_FORMS.indexOf(ch) >= 0 && HAMZA_FORMS.indexOf(rootCh) >= 0) return true;
  if (ch === '\u0649' && rootCh === '\u064A') return true;
  if (ch === '\u064A' && rootCh === '\u0649') return true;
  if (ch === '\u0627' && (rootCh === '\u0648' || rootCh === '\u064A')) return true;
  return false;
}
function highlightArabicForm(arText, d) {
  if (!d || !arText) return escH(arText);
  var roots = [d.root.r1, d.root.r2, d.root.r3];
  var chars = Array.from(arText);
  var diacriticRe = /[\u064B-\u065F\u0670\u0651]/g;

  var slots = [];
  for (var i = 0; i < chars.length; i++) {
    var base = chars[i].replace(diacriticRe, '');
    if (!base) {
      if (slots.length) slots[slots.length - 1].extra += chars[i];
      continue;
    }
    slots.push({ ch: chars[i], base: base, isRoot: false, extra: '' });
  }

  var ri = 0;
  for (var si = 0; si < slots.length && ri < roots.length; si++) {
    if (hamzaMatch(slots[si].base, roots[ri])) {
      slots[si].isRoot = true;
      ri++;
    }
  }

  var result = '';
  for (var k = 0; k < slots.length; k++) {
    var s = slots[k];
    if (s.isRoot) {
      result += escH(s.ch + s.extra);
    } else {
      result += '<span class="hl-affix">' + escH(s.ch + s.extra) + '</span>';
    }
  }
  return result;
}

/* ── Smart Instructional Notes ────────────────── */
var FORM_NOTES = {
  1: { ar: '\u0627\u0644\u0641\u0639\u0644 \u0627\u0644\u0623\u0633\u0627\u0633\u064A \u2014 \u0627\u0644\u0645\u0639\u0646\u0649 \u0627\u0644\u0623\u0635\u0644\u064A \u0644\u0644\u062C\u0630\u0631', en: 'Base form \u2014 carries the original root meaning' },
  2: { ar: '\u0627\u0644\u0641\u0639\u0644 \u0627\u0644\u0645\u0636\u0639\u0651\u0641 \u2014 \u063A\u0627\u0644\u0628\u064B\u0627 \u0644\u0644\u062A\u0643\u062B\u064A\u0631 \u0623\u0648 \u0627\u0644\u062A\u0639\u062F\u064A\u0629', en: 'Measure II often conveys intensive or causative meaning' },
  3: { ar: '\u0641\u0639\u0644 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629 \u2014 \u064A\u062F\u0644 \u0639\u0644\u0649 \u0627\u0644\u062A\u0641\u0627\u0639\u0644 \u0645\u0639 \u0637\u0631\u0641 \u0622\u062E\u0631', en: 'Measure III indicates reciprocal or mutual action' },
  4: { ar: '\u0627\u0644\u0625\u0641\u0639\u0627\u0644 \u2014 \u063A\u0627\u0644\u0628\u064B\u0627 \u064A\u062C\u0639\u0644 \u0627\u0644\u0641\u0639\u0644 \u0645\u062A\u0639\u062F\u064A\u064B\u0627', en: 'Measure IV often makes the verb transitive' },
  5: { ar: '\u0627\u0644\u062A\u0641\u0639\u0651\u0644 \u2014 \u0645\u0637\u0627\u0648\u0639\u0629 \u0627\u0644\u0628\u0627\u0628 \u0627\u0644\u062B\u0627\u0646\u064A', en: 'Measure V \u2014 reflexive of Measure II' },
  6: { ar: '\u0627\u0644\u062A\u0641\u0627\u0639\u0644 \u2014 \u0645\u0634\u0627\u0631\u0643\u0629 \u0645\u062A\u0628\u0627\u062F\u0644\u0629', en: 'Measure VI \u2014 reciprocal or pretended action' },
  7: { ar: '\u0627\u0644\u0627\u0646\u0641\u0639\u0627\u0644 \u2014 \u0645\u0637\u0627\u0648\u0639\u0629 \u0644\u0644\u0628\u0627\u0628 \u0627\u0644\u0623\u0648\u0644', en: 'Measure VII \u2014 passive/reflexive of Measure I' },
  8: { ar: '\u0627\u0644\u0627\u0641\u062A\u0639\u0627\u0644 \u2014 \u063A\u0627\u0644\u0628\u064B\u0627 \u0644\u0644\u0627\u062E\u062A\u064A\u0627\u0631 \u0623\u0648 \u0627\u0644\u0627\u0643\u062A\u0633\u0627\u0628', en: 'Measure VIII \u2014 often reflexive or effort-based' },
  10: { ar: '\u0627\u0644\u0627\u0633\u062A\u0641\u0639\u0627\u0644 \u2014 \u0637\u0644\u0628 \u0627\u0644\u0641\u0639\u0644 \u0623\u0648 \u0627\u0639\u062A\u0628\u0627\u0631\u0647', en: 'Measure X \u2014 seeking or considering the action' }
};

var TRANSIT_NOTES = {
  transitive: { ar: '\u0641\u0639\u0644 \u0645\u062A\u0639\u062F\u0651\u064D \u2014 \u064A\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u0645\u0641\u0639\u0648\u0644 \u0628\u0647', en: 'Transitive verb \u2014 requires a direct object' },
  intransitive: { ar: '\u0641\u0639\u0644 \u0644\u0627\u0632\u0645 \u2014 \u0644\u0627 \u064A\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u0645\u0641\u0639\u0648\u0644 \u0628\u0647', en: 'Intransitive verb \u2014 does not take a direct object' },
  both: { ar: '\u064A\u0633\u062A\u062E\u062F\u0645 \u0645\u062A\u0639\u062F\u064A\u064B\u0627 \u0648\u0644\u0627\u0632\u0645\u064B\u0627', en: 'Can be used transitively or intransitively' }
};


/* ── Post-render hook: attach tooltips + highlighting ── */
function postRenderInteractive() {
  var d = _lastResultData;
  if (!d) return;

  attachConjTooltips();
  attachDerivTooltips();
  applyHighlighting(d);
}

function applyHighlighting(d) {
  if (!d) return;
  var cells = document.querySelectorAll('.conj-table td .ar');
  cells.forEach(function(arEl) {
    var raw = arEl.textContent;
    if (raw && raw !== '\u2014') {
      arEl.innerHTML = highlightArabicForm(raw, d);
    }
  });

  var derivArs = document.querySelectorAll('#derivContent .cdn-ar, #derivContent .dc-ar');
  derivArs.forEach(function(arEl) {
    var raw = arEl.textContent;
    if (raw && raw !== '\u2014') {
      arEl.innerHTML = highlightArabicForm(raw, d);
    }
  });
}

/* ── Accordion ─────────────────────────────────── */
function toggle(btn) { btn.parentElement.classList.toggle('open'); }
function togglePractice(btn) {
  var item = btn.parentElement;
  var wasOpen = item.classList.contains('open');
  item.classList.toggle('open');
  if (!wasOpen && !document.getElementById('practicePanel').innerHTML.trim()) {
    generateAndRenderPractice();
  }
}

/* ── Helpers ───────────────────────────────────── */
function byKey(rows) {
  var m = {};
  rows.forEach(function(r) { m[r.pronoun] = r; });
  return m;
}
function formLabel(n) {
  return { 1:"I", 2:"II", 3:"III", 4:"IV", 5:"V", 6:"VI", 7:"VII", 8:"VIII", 10:"X" }[n] || n;
}
function escH(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function transitBadge(t) {
  if (t === 'intransitive') return '<span class="transit-badge transit-i">intransitive</span>';
  if (t === 'both')         return '<span class="transit-badge transit-b">trans &amp; intrans</span>';
  return '<span class="transit-badge transit-t">transitive</span>';
}
function statusBadge(s) {
  var cls = { attested:'sb-attested', rare:'sb-rare', theoretical:'sb-theoretical', 'n/a':'sb-na' }[s] || 'sb-theoretical';
  return '<span class="status-badge ' + cls + '">' + escH(s) + '</span>';
}

/* ── Render functions ──────────────────────────── */
function buildHeaderNotes(d) {
  if (!d) return '';
  var form = parseInt(d.measure) || 1;
  var vc = d.verb_class || 'sound';
  var vcInfo = VERB_CLASS_INFO[vc];
  var bullets = [];

  if (vcInfo && vc !== 'sound' && vcInfo.desc_ar) {
    bullets.push({ ar: vcInfo.desc_ar, en: vcInfo.en || '' });
  }
  if (vcInfo && vcInfo.tips) {
    vcInfo.tips.forEach(function(tip) {
      bullets.push({ ar: tip, en: bullets.length === 0 ? (VC_HINTS_EN[vc] || '') : '' });
    });
  }
  if (form > 1 && FORM_NOTES[form]) {
    bullets.push(FORM_NOTES[form]);
  }
  if (d.transitivity && TRANSIT_NOTES[d.transitivity]) {
    bullets.push(TRANSIT_NOTES[d.transitivity]);
  }

  if (!bullets.length) return '';

  var h = '<div class="hero-notes">';
  bullets.forEach(function(b) {
    h += '<div class="hero-note-item">' +
      '<span class="hero-note-ar">' + escH(b.ar) + '</span>' +
      (b.en ? '<span class="hero-note-en"> — ' + escH(b.en) + '</span>' : '') +
    '</div>';
  });
  h += '</div>';
  return h;
}

function renderHeader(d) {
  var norm = d.root.normalized || d.root.input;
  var meaning = MEANINGS[d.root.form] || '';
  var inflHtml = d.inflection_label
    ? '<div class="inflection-info" dir="rtl">\u062A\u0645 \u0627\u0644\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0645\u062F\u062E\u0644: ' + escH(d.inflection_label) + '</div>'
    : '';
  var insightHtml = d.insight
    ? '<div class="insight-note" dir="rtl">\uD83D\uDD0D ' + escH(d.insight) + '</div>'
    : '';
  var rootLine = '\u0627\u0644\u062C\u0630\u0631: <span class="hero-root-letters">' +
    '<span class="hero-root-letter">' + escH(d.root.r1) + '</span> \u2013 ' +
    '<span class="hero-root-letter">' + escH(d.root.r2) + '</span> \u2013 ' +
    '<span class="hero-root-letter">' + escH(d.root.r3) + '</span></span>';
  var metaParts = [];
  metaParts.push('Measure ' + escH(d.measure));
  if (d.pattern) metaParts.push(escH(d.pattern));
  if (d.verb_class) metaParts.push(escH(d.verb_class));
  if (meaning) metaParts.push(escH(meaning));
  var metaStr = metaParts.join('  \u00b7  ');
  var notesHtml = buildHeaderNotes(d);

  document.getElementById('heroCard').innerHTML =
    inflHtml +
    insightHtml +
    '<div class="hero-top">' +
      '<div class="hero-info">' +
        '<div class="hero-root-line" onclick="openRootPanel()" title="\u0627\u0633\u062A\u0643\u0634\u0641 \u0639\u0627\u0626\u0644\u0629 \u0627\u0644\u062C\u0630\u0631 \u00b7 Explore root family">' + rootLine + '</div>' +
        '<div class="hero-meta">' + metaStr + '</div>' +
        '<div class="hero-gloss">' + escH(d.gloss) + '</div>' +
      '</div>' +
      '<div class="hero-arabic">' + escH(norm) + '</div>' +
    '</div>' +
    notesHtml;
}

var IMP_KEYS = { '2ms':1, '2fs':1, '2md':1, '2mp':1, '2fp':1 };

function cell(row) {
  if (!row || !row.arabic || row.arabic === '\u2014') return '<td class="cell-empty">\u2014</td>';
  return '<td><div class="ar">' + escH(row.arabic) + '</div><div class="tr">' + escH(row.translit) + '</div></td>';
}

function renderUnifiedTable(d) {
  var pm = byKey(d.active.past);
  var prm = byKey(d.active.present);
  var fm = d.active.future ? byKey(d.active.future) : {};
  var im = d.active.imperative ? byKey(d.active.imperative) : {};
  var hasPassive = d.passive && d.passive.available;
  var ppm = hasPassive ? byKey(d.passive.past) : {};
  var pprm = hasPassive ? byKey(d.passive.present) : {};

  var numCols = 8;
  var h = '<div class="conj-wrap">';

  if (!hasPassive) {
    h += '<div class="no-passive-note">' + escH(d.passive.note || 'No passive voice for this form.') + '</div>';
  }

  h += '<div class="conj-scroll"><table class="conj-table"><thead><tr>' +
    '<th class="col-ppres"><span class="th-ar grammar-label">\u0627\u0644\u0645\u0636\u0627\u0631\u0639 \u0627\u0644\u0645\u062c\u0647\u0648\u0644</span><span class="th-en grammar-label-en">Passive Pres.</span></th>' +
    '<th class="col-pp"><span class="th-ar grammar-label">\u0627\u0644\u0645\u0627\u0636\u064a \u0627\u0644\u0645\u062c\u0647\u0648\u0644</span><span class="th-en grammar-label-en">Passive Past</span></th>' +
    '<th class="col-imp"><span class="th-ar grammar-label">\u0627\u0644\u0623\u0645\u0631</span><span class="th-en grammar-label-en">Imperative</span></th>' +
    '<th class="col-future"><span class="th-ar grammar-label">\u0627\u0644\u0645\u0633\u062a\u0642\u0628\u0644</span><span class="th-en grammar-label-en">Future</span></th>' +
    '<th class="col-present"><span class="th-ar grammar-label">\u0627\u0644\u0645\u0636\u0627\u0631\u0639</span><span class="th-en grammar-label-en">Present</span></th>' +
    '<th class="col-past"><span class="th-ar grammar-label">\u0627\u0644\u0645\u0627\u0636\u064a</span><span class="th-en grammar-label-en">Past</span></th>' +
    '<th class="col-en-pronoun"><span class="th-en grammar-label-en">English</span></th>' +
    '<th class="col-pronoun"><span class="th-ar grammar-label">\u0627\u0644\u0636\u0645\u064a\u0631</span><span class="th-en grammar-label-en">Pronoun</span></th>' +
    '</tr></thead><tbody>';

  GROUPS.forEach(function(grp) {
    h += '<tr class="grp-hdr"><td colspan="' + numCols + '"><span class="grp-ar">' + grp.ar + '</span> <span class="grp-en">' + grp.en + '</span></td></tr>';
    grp.keys.forEach(function(k) {
      var pRow = pm[k], prRow = prm[k], fRow = fm[k];
      var impRow = IMP_KEYS[k] ? im[k] : null;
      var ppRow = ppm[k], pprRow = pprm[k];
      if (!pRow && !prRow) return;
      var lbl = (pRow || prRow).pronoun_label || k;
      h += '<tr>' +
        (hasPassive ? cell(pprRow) : '<td class="cell-empty">\u2014</td>') +
        (hasPassive ? cell(ppRow) : '<td class="cell-empty">\u2014</td>') +
        (IMP_KEYS[k] ? cell(impRow) : '<td class="cell-empty">\u2014</td>') +
        cell(fRow) +
        cell(prRow) +
        cell(pRow) +
        '<td class="td-en-label">' + escH(EN_PRONOUNS[k] || k) + '</td>' +
        '<td class="td-label">' + escH(lbl) + '</td>' +
        '</tr>';
    });
  });

  h += '</tbody></table></div></div>';
  document.getElementById('conjChart').innerHTML = h;
}

function buildExpPanel(ed, cls) {
  if (!ed) return '';
  var panelCls = cls || 'exp-panel';
  var id = 'ep_' + Math.random().toString(36).substr(2, 6);
  var lines = '';
  if (ed.root_breakdown_ar) lines += '<div class="exp-row"><span class="exp-label">\u0627\u0644\u062C\u0630\u0631:</span><span class="exp-val">' + escH(ed.root_breakdown_ar) + '</span><div class="exp-en">' + escH(ed.root_breakdown_en) + '</div></div>';
  if (ed.pattern_name_ar) lines += '<div class="exp-row"><span class="exp-label">\u0627\u0644\u0648\u0632\u0646:</span><span class="exp-val">' + escH(ed.pattern_name_ar) + '</span><div class="exp-en">' + escH(ed.pattern_name_en) + '</div></div>';
  if (ed.weak_note_ar) lines += '<div class="exp-row exp-weak">' + escH(ed.weak_note_ar) + '<div class="exp-en">' + escH(ed.weak_note_en) + '</div></div>';
  if (ed.rule_ar) lines += '<div class="exp-rule">' + escH(ed.rule_ar) + '<div class="exp-en">' + escH(ed.rule_en) + '</div></div>';
  if (!lines) return '';
  var btnCls = cls === 'vf-exp-panel' ? 'vf-exp-btn' : 'exp-btn';
  return '<button class="' + btnCls + '" onclick="var p=document.getElementById(\\x27' + id + '\\x27);p.classList.toggle(\\x27exp-open\\x27)" title="\u0627\u0634\u0631\u062D">?</button>' +
    '<div id="' + id + '" class="' + panelCls + '">' + lines + '</div>';
}

function renderDerivations(d) {
  var items = [];

  var keys = ['masdar','active_participle','passive_participle'];
  keys.forEach(function(key) {
    var v = d.derivations[key];
    if (!v) return;
    items.push({ catAr: v.category_ar, catEn: v.category_en, arabic: v.arabic, translit: v.translit, label: v.label || '', explainData: v.explain_data, explanationAr: v.explanation_ar });
  });

  var nounSections = [
    { catAr: '\u0635\u064A\u063A\u0629 \u0627\u0644\u0645\u0628\u0627\u0644\u063A\u0629', catEn: 'Exaggeration', nouns: d.exaggeration_nouns || [] },
    { catAr: '\u0627\u0633\u0645 \u0627\u0644\u0645\u0643\u0627\u0646 \u0648\u0627\u0644\u0632\u0645\u0627\u0646', catEn: 'Place & Time', nouns: d.place_time_nouns || [] },
    { catAr: '\u0627\u0633\u0645 \u0627\u0644\u0622\u0644\u0629', catEn: 'Instrument', nouns: d.instrument_nouns || [] }
  ];
  nounSections.forEach(function(sec) {
    sec.nouns.forEach(function(n) {
      if (n.status === 'n/a') return;
      items.push({ catAr: n.category_ar || sec.catAr, catEn: n.category_en || sec.catEn, arabic: n.arabic, translit: n.translit, label: n.label || '', explainData: n.explain_data, explanationAr: n.explanation_ar });
    });
  });

  if (!items.length) {
    document.getElementById('derivContent').innerHTML = '<div class="na-msg">\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0634\u062A\u0642\u0627\u062A \u0645\u062A\u0627\u062D\u0629</div>';
    return;
  }

  var h = '<div class="cdn-table">';
  items.forEach(function(it) {
    var expBtn = buildExpPanel(it.explainData, 'exp-panel');
    h += '<div class="cdn-row">' +
      '<div class="cdn-cat"><span class="cdn-cat-ar grammar-label">' + escH(it.catAr) + '</span><span class="cdn-cat-en grammar-label-en">' + escH(it.catEn) + '</span></div>' +
      '<div class="cdn-form"><span class="cdn-ar dc-ar">' + escH(it.arabic) + '</span><span class="cdn-tr">' + escH(it.translit) + '</span></div>' +
      '<div class="cdn-gloss">' + escH(it.label) + (it.explanationAr ? '<div class="cdn-expl">' + escH(it.explanationAr) + '</div>' : '') + expBtn + '</div>' +
    '</div>';
  });
  h += '</div>';
  document.getElementById('derivContent').innerHTML = h;
}

function renderDerivedForms(d) {
  var fex = d.form_examples || {};
  var h = '';
  d.derived_forms.forEach(function(f) {
    var tag = f.is_current ? 't-current' : (f.attested ? 't-attested' : 't-theoretical');
    var tagLbl = f.is_current ? 'current' : (f.attested ? 'attested' : 'theoretical');
    var cls = 'form-card' + (f.is_current ? ' fc-current' : '') + (!f.is_current && f.attested ? ' fc-attested' : '');
    var ex = fex[f.form];
    var exHtml = (ex && ex.ar)
      ? '<div class="fc-example"><div class="fce-ar">' + escH(ex.ar) + '</div><div class="fce-en">' + escH(ex.en) + '</div></div>'
      : '';
    h += '<div class="' + cls + '">' +
      '<span class="fc-tag ' + tag + '">' + tagLbl + '</span>' +
      '<div class="fc-form-num">MEASURE ' + formLabel(f.form) + ' \u00b7 \u0648\u0632\u0646</div>' +
      '<div class="form-meaning">' + escH(f.meaning || MEANINGS[f.form] || '') + '</div>' +
      '<div class="fc-past">' + escH(f.past_3ms.arabic) + '</div>' +
      '<div class="fc-past-tr">' + escH(f.past_3ms.translit) + '</div>' +
      '<div class="fc-rows">' +
        fcRow('Pres.', f.present_3ms) + fcRow('Masdar', f.masdar) + fcRow('Doer', f.active_part) +
      '</div>' + exHtml + '</div>';
  });
  document.getElementById('formsContent').innerHTML = h;
}

function fcRow(label, v) {
  return '<div class="fc-row"><span class="fc-row-label">' + label + '</span>' +
    '<div class="fc-row-val"><div class="fc-row-ar">' + escH(v.arabic) + '</div>' +
    '<div class="fc-row-tr">' + escH(v.translit) + '</div></div></div>';
}

function renderVerbFamily(d) {
  var fam = d.verb_family;
  if (!fam) return;
  var h = '';
  var c = fam.core;
  function stLabel(s) {
    if (s === 'lexicon_backed' || s === 'attested') return '<span class="st-lex">\u2713 attested</span>';
    return '<span class="st-rule">rule-based</span>';
  }
  h += '<div class="vf-core">';
  var masdarHtml = '';
  if (c.masdars && c.masdars.length > 0) {
    masdarHtml = '<div class="vf-core-ar">' + escH(c.masdars[0].ar) + '</div><div class="vf-core-tr">' + escH(c.masdars[0].tr) + '</div>';
    if (c.masdars.length > 1) {
      masdarHtml += '<div style="margin-top:2px;font-size:.7rem;color:#111827">';
      for (var mi = 1; mi < c.masdars.length; mi++) {
        masdarHtml += (mi > 1 ? ' / ' : '') + '<span>' + escH(c.masdars[mi].ar) + ' <span style="font-family:sans-serif;font-size:.6rem">(' + escH(c.masdars[mi].tr) + ')</span></span>';
      }
      masdarHtml += '</div>';
    }
    masdarHtml += '<div class="vf-core-st">' + stLabel(c.masdars[0].status) + '</div>';
  } else {
    masdarHtml = '<div class="vf-core-ar">' + escH(c.masdar.ar) + '</div><div class="vf-core-tr">' + escH(c.masdar.tr) + '</div><div class="vf-core-st">' + stLabel(c.masdar.status) + '</div>';
  }
  h += '<div class="vf-core-card"><div class="vf-core-label">\u0645\u0635\u062F\u0631 &middot; Masdar</div>' + masdarHtml + buildExpPanel(c.masdar.explain, 'vf-exp-panel') + '</div>';
  h += '<div class="vf-core-card"><div class="vf-core-label">\u0627\u0633\u0645 \u0641\u0627\u0639\u0644 &middot; Active P.</div><div class="vf-core-ar">' + escH(c.active_part.ar) + '</div><div class="vf-core-tr">' + escH(c.active_part.tr) + '</div><div class="vf-core-st">' + stLabel(c.active_part.status) + '</div>' + buildExpPanel(c.active_part.explain, 'vf-exp-panel') + '</div>';
  h += '<div class="vf-core-card"><div class="vf-core-label">\u0627\u0633\u0645 \u0645\u0641\u0639\u0648\u0644 &middot; Passive P.</div><div class="vf-core-ar">' + escH(c.passive_part.ar) + '</div><div class="vf-core-tr">' + escH(c.passive_part.tr) + '</div><div class="vf-core-st">' + stLabel(c.passive_part.status) + '</div>' + buildExpPanel(c.passive_part.explain, 'vf-exp-panel') + '</div>';
  h += '</div>';
  var dvs = fam.derived_verbs || [];
  if (dvs.length) {
    h += '<div class="vf-derived-hdr" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\\\'none\\\'?\\\'grid\\\':\\\'none\\\'">\u0623\u0641\u0639\u0627\u0644 \u0645\u0634\u062A\u0642\u0629 &middot; Related Verbs (' + dvs.length + ') &#x25BE;</div>';
    h += '<div class="vf-derived-list">';
    dvs.forEach(function(v) {
      h += '<div class="vf-dv-card">' +
        '<span class="vf-dv-form">' + escH(v.label) + '</span>' +
        '<span class="vf-dv-ar">' + escH(v.past_3ms) + '</span>' +
        '<span class="vf-dv-gloss">' + escH(v.gloss || v.meaning) + '</span>' +
        '<span class="vf-dv-masdar">' + escH(v.masdar) + '</span>' +
      '</div>';
    });
    h += '</div>';
  }
  document.getElementById('familyContent').innerHTML = h;
}

function renderPrepositions(d) {
  var sec = document.getElementById('acc-prep');
  var preps = d.prepositions || [];
  if (!preps.length) { sec.style.display = 'none'; sec.classList.remove('open'); return; }
  sec.style.display = '';
  sec.classList.remove('open');
  var h = '<table class="prep-table"><thead><tr><th>Prep.</th><th>Meaning</th><th>Example</th></tr></thead><tbody>';
  preps.forEach(function(p) {
    h += '<tr>' +
      '<td class="td-prep">' + escH(p.prep) + '<br><small style="font-size:.72rem;color:#666;font-family:sans-serif">(' + escH(p.prepEn) + ')</small></td>' +
      '<td class="td-meaning">' + escH(p.meaning) + '</td>' +
      '<td>' +
        (p.exampleAr ? '<div class="td-ex-ar">' + escH(p.exampleAr) + '</div>' : '') +
        (p.exampleEn ? '<div class="td-ex-en">' + escH(p.exampleEn) + '</div>' : '') +
      '</td></tr>';
  });
  document.getElementById('prepContent').innerHTML = h + '</tbody></table>';
}

function nounCard(n) {
  if (n.status === 'n/a') return '<div class="na-msg">' + escH(n.label) + '</div>';
  var cls = 'noun-card' + (n.status === 'attested' ? ' nc-attested' : '');
  var catHtml = n.category_ar ? '<div class="nc-cat"><span class="nc-cat-ar">' + escH(n.category_ar) + '</span><span class="nc-cat-en">' + escH(n.category_en || '') + '</span></div>' : '';
  var extra = n.nounType ? '<div class="nc-type">' + escH(n.nounType) + '</div>' : '';
  var confHtml = '';
  if (n.confidence) {
    var confCls = 'nc-conf nc-conf-' + n.confidence;
    var confDot = '<span class="trust-dot trust-dot-' + n.confidence + '" style="width:5px;height:5px"></span>';
    var flagTxt = n.is_attested ? '\u0645\u0648\u062B\u0642' : n.is_theoretical ? '\u0646\u0638\u0631\u064A' : '';
    confHtml = '<div class="' + confCls + '">' + confDot + ' ' + escH(n.confidence) + (flagTxt ? ' \u00b7 ' + flagTxt : '') + '</div>';
  }
  var explHtml = n.explanation_ar ? '<div class="nc-expl">' + escH(n.explanation_ar) + '</div>' : '';
  var expBtn = buildExpPanel(n.explain_data, 'exp-panel');
  return '<div class="' + cls + '">' + catHtml + '<div class="nc-ar">' + escH(n.arabic) + '</div>' +
    '<div class="nc-tr">' + escH(n.translit) + '</div><div class="nc-pattern">' + escH(n.pattern) + '</div>' +
    '<div class="nc-label">' + escH(n.label) + '</div>' + extra + statusBadge(n.status) + confHtml + explHtml + expBtn + '</div>';
}
function renderExaggeration(d) {}
function renderPlaceTime(d) {}
function renderInstrument(d) {}

function renderDerivedNouns(d) {
  var el = document.getElementById('derivedNounsContent');
  var sections = [
    { title: '\u0635\u064A\u063A\u0629 \u0627\u0644\u0645\u0628\u0627\u0644\u063A\u0629', en: 'Exaggeration', nouns: d.exaggeration_nouns || [] },
    { title: '\u0627\u0633\u0645 \u0627\u0644\u0645\u0643\u0627\u0646 \u0648\u0627\u0644\u0632\u0645\u0627\u0646', en: 'Place & Time', nouns: d.place_time_nouns || [] },
    { title: '\u0627\u0633\u0645 \u0627\u0644\u0622\u0644\u0629', en: 'Instrument', nouns: d.instrument_nouns || [] }
  ];
  var html = '';
  var hasAny = false;
  sections.forEach(function(sec) {
    var nouns = sec.nouns.filter(function(n) { return n.status !== 'n/a'; });
    if (!nouns.length) return;
    hasAny = true;
    html += '<div class="dn-group">' +
      '<div class="dn-group-hdr">' +
        '<span class="dn-group-title">' + escH(sec.title) + '</span>' +
        '<span class="dn-group-en">' + escH(sec.en) + '</span>' +
      '</div>' +
      '<div class="noun-grid">' + nouns.map(nounCard).join('') + '</div>' +
    '</div>';
  });
  if (!hasAny) {
    html = '<div class="na-msg">\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0633\u0645\u0627\u0621 \u0645\u0634\u062A\u0642\u0629 \u0645\u062A\u0627\u062D\u0629</div>';
  }
  el.innerHTML = html;
}

function renderInterpretationPanel(data) {
  var heroEl = document.getElementById('heroCard');
  var resultEl = document.getElementById('result');
  resultEl.style.display = 'none';

  var interps = data.interpretations || [];
  var html = '<div class="interp-panel">' +
    '<div class="interp-header">' +
      '<span class="interp-icon">\uD83D\uDD00</span>' +
      '<span class="interp-title">\u0642\u062F \u064A\u064F\u0641\u0647\u0645 \u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u0628\u0623\u0643\u062B\u0631 \u0645\u0646 \u0637\u0631\u064A\u0642\u0629</span>' +
    '</div>' +
    '<div class="interp-input-ar">' + escH(data.input) + '</div>' +
    '<div class="interp-subtitle">Multiple interpretations found \u2014 choose one:</div>' +
    '<div class="interp-list">';

  for (var i = 0; i < interps.length; i++) {
    var it = interps[i];
    var typeIcon = it.type === 'verb' ? '\uD83D\uDD35' : it.type === 'masdar' ? '\uD83D\uDCD7' : '\uD83D\uDD36';
    var confCls = 'conf-' + (it.confidence || 'medium');
    var formMeasure = it.form === 1 ? 'I' : it.form === 2 ? 'II' : it.form === 3 ? 'III' : it.form === 4 ? 'IV' : it.form === 5 ? 'V' : it.form === 6 ? 'VI' : it.form === 7 ? 'VII' : it.form === 8 ? 'VIII' : it.form === 10 ? 'X' : 'auto';
    html += '<button class="interp-btn ' + confCls + '" onclick="analyzeRoot(\\x27' + escH(it.root3) + '\\x27, \\x27' + formMeasure + '\\x27)">' +
      '<span class="interp-btn-icon">' + typeIcon + '</span>' +
      '<div class="interp-btn-body">' +
        '<div class="interp-btn-ar">' + escH(it.labelAr) + '</div>' +
        '<div class="interp-btn-en">' + escH(it.formLabel) + ' \u2014 ' + escH(it.gloss) + '</div>' +
      '</div>' +
      '<span class="interp-btn-arrow">\u2190</span>' +
    '</button>';
  }

  html += '</div></div>';
  heroEl.innerHTML = html;
}

function renderSafetyPanel(data) {
  var heroEl = document.getElementById('heroCard');
  var resultEl = document.getElementById('result');
  resultEl.style.display = 'none';

  var icon = '';
  var title = '';
  var body = '';

  if (data.safety_mode === 'noun_input') {
    icon = '\uD83D\uDCD6';
    title = '\u0647\u0630\u0627 \u0627\u0633\u0645 \u0648\u0644\u064A\u0633 \u0641\u0639\u0644\u0627\u064B \u2014 \u0625\u0644\u064A\u0643 \u0627\u0644\u0641\u0639\u0644 \u0627\u0644\u0645\u0631\u062A\u0628\u0637';
    body = '<div class="safety-detail">' +
      '<div class="safety-input-ar">' + escH(data.input) + '</div>' +
      (data.noun_gloss ? '<div class="safety-noun-gloss">' + escH(data.noun_gloss) + '</div>' : '') +
      '</div>';
    if (data.suggestion) {
      body += '<div class="safety-suggestion">' +
        '<div class="safety-suggest-label">\u0644\u0639\u0644\u0651\u0643 \u062A\u0642\u0635\u062F \u0627\u0644\u0641\u0639\u0644:</div>' +
        '<button class="safety-suggest-btn" onclick="analyzeRoot(\\x27' + escH(data.suggestion) + '\\x27, \\x27auto\\x27)">' +
          '<span class="safety-suggest-ar">' + escH(data.suggestion) + '</span>' +
          (data.suggestion_gloss ? '<span class="safety-suggest-gloss">(' + escH(data.suggestion_gloss) + ')</span>' : '') +
        '</button>' +
        '</div>';
    }
  } else if (data.safety_mode === 'suggestion_only') {
    icon = '\uD83D\uDD0D';
    title = '\u0647\u0630\u0627 \u0627\u0644\u0634\u0643\u0644 \u0644\u064A\u0633 \u0641\u064A \u0627\u0644\u0645\u0639\u062C\u0645 \u2014 \u0631\u0628\u0645\u0627 \u062A\u0642\u0635\u062F \u0634\u0643\u0644\u0627\u064B \u0622\u062E\u0631\u061F';
    body = '<div class="safety-detail">' +
      '<div class="safety-input-ar">' + escH(data.input) + '</div>' +
      '<div class="safety-reason" style="margin-top:.3rem;font-size:.78rem;color:rgba(255,255,255,.5)">\u0635\u064A\u063A\u0629 \u0625\u0645\u0644\u0627\u0626\u064A\u0629 \u0642\u0631\u064A\u0628\u0629 \u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0627\u0644\u0645\u0639\u062C\u0645</div>' +
      '</div>';
    if (data.suggestion) {
      body += '<div class="safety-suggestion">' +
        '<div class="safety-suggest-label">\u0644\u0639\u0644\u0651\u0643 \u062A\u0642\u0635\u062F:</div>' +
        '<button class="safety-suggest-btn" onclick="analyzeRoot(\\x27' + escH(data.suggestion) + '\\x27, \\x27auto\\x27)">' +
          '<span class="safety-suggest-ar">' + escH(data.suggestion) + '</span>' +
          (data.suggestion_gloss ? '<span class="safety-suggest-gloss">(' + escH(data.suggestion_gloss) + ')</span>' : '') +
        '</button>' +
        '</div>';
    }
  } else {
    icon = '\uD83D\uDCA1';
    title = '\u0644\u0645 \u064A\u064F\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0641\u0639\u0644 \u2014 \u062C\u0631\u0651\u0628 \u0625\u062F\u062E\u0627\u0644 \u062C\u0630\u0631 \u062B\u0644\u0627\u062B\u064A';
    body = '<div class="safety-detail">' +
      '<div class="safety-input-ar">' + escH(data.input) + '</div>' +
      '<div class="safety-reason">' + escH(data.safety_reason) + '</div>' +
      '</div>';
  }

  heroEl.innerHTML = '<div class="safety-panel safety-' + escH(data.safety_mode) + '">' +
    '<div class="safety-header">' +
      '<span class="safety-icon">' + icon + '</span>' +
      '<span class="safety-title">' + escH(title) + '</span>' +
    '</div>' +
    body +
  '</div>';
}

function renderRecoveryNote(note, originalInput) {
  var heroEl = document.getElementById('heroCard');
  var existing = heroEl.innerHTML;
  heroEl.innerHTML = '<div class="recovery-note">' +
    '<span class="recovery-icon">\u2714\uFE0F</span>' +
    '<span class="recovery-text">' + escH(note) + '</span>' +
  '</div>' + existing;
}

function toggleNested(btn) { btn.closest('.usage-nested-acc').classList.toggle('open'); }

function renderUsage(d) {
  var sec = document.getElementById('acc-usage');
  if (!d.usage) { sec.style.display = 'none'; return; }
  sec.style.display = '';
  sec.classList.remove('open');
  var u = d.usage;
  var html = '';

  html += '<div style="margin-bottom:.6rem"><div class="usage-hdr">\u0623\u0645\u062B\u0644\u0629 \u0645\u062A\u062F\u0631\u062C\u0629 &middot; Leveled Examples</div>';
  [
    { label: 'Level 1 \u2014 \u0645\u0628\u062A\u062F\u0626', ex: u.level_1 },
    { label: 'Level 2 \u2014 \u0645\u062A\u0648\u0633\u0637', ex: u.level_2 },
    { label: 'Level 3 \u2014 \u0645\u062A\u0642\u062F\u0645', ex: u.level_3 },
  ].forEach(function(lv) {
    if (!lv.ex) return;
    html += '<div class="usage-level">' +
      '<div class="usage-level-label">' + escH(lv.label) + '</div>' +
      '<div class="usage-level-ar">' + escH(lv.ex.ar) + '</div>' +
      '<div class="usage-level-en">' + escH(lv.ex.en) + '</div>' +
    '</div>';
  });
  html += '</div>';

  if (u.patterns && u.patterns.length) {
    var patHtml = '';
    u.patterns.forEach(function(p) {
      patHtml += '<div class="usage-pat"><div class="usage-pat-ar">' + escH(p.ar) + '</div><div class="usage-pat-en">' + escH(p.en) + '</div></div>';
    });
    html += '<div class="usage-nested-acc">' +
      '<button class="usage-nested-hdr" onclick="toggleNested(this)">' +
        '<span class="acc-arrow">&#x25BE;</span>' +
        '<div class="usage-hdr">\u0623\u0646\u0645\u0627\u0637 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 &middot; Common Patterns</div>' +
      '</button>' +
      '<div class="usage-nested-body"><div class="usage-patterns">' + patHtml + '</div></div>' +
    '</div>';
  }

  if (u.mistakes && u.mistakes.length) {
    var misHtml = '';
    u.mistakes.forEach(function(m) {
      misHtml += '<div class="usage-mis">' +
        '<div class="usage-mis-row">' +
          '<span class="usage-mis-wrong">' + escH(m.wrong_ar) + '</span>' +
          '<span class="usage-mis-arrow">\u2192</span>' +
          '<span class="usage-mis-right">' + escH(m.right_ar) + '</span>' +
        '</div>' +
        '<div class="usage-mis-note">' + escH(m.note_en) + '</div>' +
      '</div>';
    });
    html += '<div class="usage-nested-acc" style="margin-top:.5rem">' +
      '<button class="usage-nested-hdr" onclick="toggleNested(this)">' +
        '<span class="acc-arrow">&#x25BE;</span>' +
        '<div class="usage-hdr">\u0623\u062E\u0637\u0627\u0621 \u0634\u0627\u0626\u0639\u0629 &middot; Common Mistakes</div>' +
      '</button>' +
      '<div class="usage-nested-body"><div class="usage-mistakes">' + misHtml + '</div></div>' +
    '</div>';
  }

  document.getElementById('usageContent').innerHTML = html;
}

/* ── Exercise Generator ──────────────────────────── */
var _exScore = 0;
var _exTotal = 0;
var _exAnswered = 0;

function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

function stripDiacritics(s) {
  return s.replace(/[\u064B-\u065F\u0670]/g, '');
}

function escRegex(s) {
  return s.replace(/[-\\/\\\\^$*+?.()|[\\]]/g, '\\\\$&');
}

var FORM_MEANING_DATA = {
  2: { ar: '\u0627\u0644\u062A\u0643\u062B\u064A\u0631 / \u0627\u0644\u062A\u0639\u062F\u064A\u0629', en: 'causative/intensive', distractors: ['passive','future','negation'] },
  3: { ar: '\u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629', en: 'reciprocal/mutual', distractors: ['causative','passive','negation'] },
  4: { ar: '\u0627\u0644\u062A\u0639\u062F\u064A\u0629', en: 'causative/transitivizing', distractors: ['passive','reciprocal','negation'] },
  5: { ar: '\u0645\u0637\u0627\u0648\u0639\u0629 \u0627\u0644\u0628\u0627\u0628 \u0627\u0644\u062B\u0627\u0646\u064A', en: 'reflexive of Measure II', distractors: ['causative','reciprocal','negation'] },
  6: { ar: '\u0627\u0644\u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u0645\u062A\u0628\u0627\u062F\u0644', en: 'reciprocal/pretended', distractors: ['causative','passive','future'] },
  7: { ar: '\u0627\u0644\u0645\u0637\u0627\u0648\u0639\u0629', en: 'passive/reflexive of Measure I', distractors: ['causative','reciprocal','future'] },
  8: { ar: '\u0627\u0644\u0627\u0641\u062A\u0639\u0627\u0644', en: 'reflexive/effort-based', distractors: ['causative','passive','negation'] },
  10: { ar: '\u0637\u0644\u0628 \u0627\u0644\u0641\u0639\u0644', en: 'seeking/considering', distractors: ['causative','passive','negation'] }
};

var ROMAN_TO_NUM = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10 };
function parseForm(m) { return ROMAN_TO_NUM[m] || parseInt(m) || 1; }

function getDifficulty(d) {
  var form = parseForm(d.measure);
  var vc = d.verb_class || 'sound';
  var score = 0;
  if (form === 1) score = 1;
  else if (form <= 4) score = 2;
  else score = 3;
  if (vc !== 'sound') score += 1;
  if (vc === 'defective' || vc === 'hollow') score += 1;
  return Math.min(score, 5);
}

function generateExercises(d) {
  var items = [];
  var derivs = d.derivations || {};
  var fam = d.verb_family ? d.verb_family.core : null;
  var gloss = d.gloss || '';
  var form = parseForm(d.measure);
  var vc = d.verb_class || 'sound';
  var transit = d.transitivity || '';
  var root = (d.root && typeof d.root === 'object') ? (d.root.normalized || d.root.input || '') : (d.root || '');
  var difficulty = getDifficulty(d);

  var past3ms = '', pres3ms = '', imp2ms = '';
  var past3fs = '', pres3fs = '', past2ms = '', pres2ms = '', past1s = '', pres1s = '';
  var pastRows = d.active && d.active.past ? d.active.past : [];
  var presRows = d.active && d.active.present ? d.active.present : [];
  var impRows = d.active && d.active.imperative ? d.active.imperative : [];
  pastRows.forEach(function(r) {
    if (r.pronoun === '3ms') past3ms = r.form;
    if (r.pronoun === '3fs') past3fs = r.form;
    if (r.pronoun === '2ms') past2ms = r.form;
    if (r.pronoun === '1s') past1s = r.form;
  });
  presRows.forEach(function(r) {
    if (r.pronoun === '3ms') pres3ms = r.form;
    if (r.pronoun === '3fs') pres3fs = r.form;
    if (r.pronoun === '2ms') pres2ms = r.form;
    if (r.pronoun === '1s') pres1s = r.form;
  });
  impRows.forEach(function(r) {
    if (r.pronoun === '2ms') imp2ms = r.form;
  });

  var passPast3ms = '', passPres3ms = '';
  if (d.passive && d.passive.past) {
    d.passive.past.forEach(function(r) { if (r.pronoun === '3ms') passPast3ms = r.form; });
  }
  if (d.passive && d.passive.present) {
    d.passive.present.forEach(function(r) { if (r.pronoun === '3ms') passPres3ms = r.form; });
  }

  var masdarAr = derivs.masdar ? derivs.masdar.arabic : (fam && fam.masdar ? fam.masdar.ar : '');
  var activePAr = derivs.active_participle ? derivs.active_participle.arabic : (fam && fam.active_part ? fam.active_part.ar : '');
  var passivePAr = derivs.passive_participle ? derivs.passive_participle.arabic : (fam && fam.passive_part ? fam.passive_part.ar : '');

  var PRONOUN_LABELS = {
    '3ms': { ar: '\u0647\u0648', en: 'he' },
    '3fs': { ar: '\u0647\u064A', en: 'she' },
    '2ms': { ar: '\u0623\u0646\u062A\u064E', en: 'you (m)' },
    '1s':  { ar: '\u0623\u0646\u0627', en: 'I' }
  };

  if (pres3ms && past3ms) {
    var conjPronoun = '3ms';
    var conjAnswer = pres3ms;
    var conjDistractors = [past3ms];
    if (passPres3ms) conjDistractors.push(passPres3ms);
    if (masdarAr) conjDistractors.push(masdarAr);
    if (pres3fs && pres3fs !== pres3ms) conjDistractors.push(pres3fs);
    if (activePAr) conjDistractors.push(activePAr);
    conjDistractors = conjDistractors.filter(function(x) { return stripDiacritics(x) !== stripDiacritics(conjAnswer); });
    shuffle(conjDistractors);
    var conjChoices = shuffle([conjAnswer].concat(conjDistractors.slice(0, 3)));
    var pLabel = PRONOUN_LABELS[conjPronoun];
    items.push({
      type: 'conj',
      prompt: '\u0627\u062E\u062A\u0631 \u0635\u064A\u063A\u0629 \u0627\u0644\u0645\u0636\u0627\u0631\u0639 \u0644\u0640: (' + pLabel.ar + ')',
      promptEn: 'Choose the correct present form for: (' + pLabel.ar + ' / ' + pLabel.en + ')',
      answer: conjAnswer,
      choices: conjChoices,
      explainAr: '\u0635\u062D\u064A\u062D \u2014 ' + conjAnswer + ' \u0647\u0648 \u0627\u0644\u0645\u0636\u0627\u0631\u0639 \u0644\u0640 (' + pLabel.ar + ')' + (vc !== 'sound' ? '\u060C \u0641\u0639\u0644 ' + (VERB_CLASS_INFO[vc] ? VERB_CLASS_INFO[vc].ar : vc) : ''),
      explainEn: 'Correct \u2014 ' + conjAnswer + ' is the present tense for (' + pLabel.en + ').'
    });
  }

  if (past3ms && past2ms && past1s) {
    var tPronoun = difficulty >= 3 ? '1s' : '2ms';
    var tAnswer = tPronoun === '1s' ? past1s : past2ms;
    var tDistractors = [past3ms, pres3ms];
    if (past3fs) tDistractors.push(past3fs);
    if (masdarAr) tDistractors.push(masdarAr);
    if (passPast3ms) tDistractors.push(passPast3ms);
    tDistractors = tDistractors.filter(function(x) { return x && stripDiacritics(x) !== stripDiacritics(tAnswer); });
    shuffle(tDistractors);
    var tLabel = PRONOUN_LABELS[tPronoun];
    items.push({
      type: 'conj',
      prompt: '\u0627\u062E\u062A\u0631 \u0635\u064A\u063A\u0629 \u0627\u0644\u0645\u0627\u0636\u064A \u0644\u0640: (' + tLabel.ar + ')',
      promptEn: 'Choose the correct past form for: (' + tLabel.ar + ' / ' + tLabel.en + ')',
      answer: tAnswer,
      choices: shuffle([tAnswer].concat(tDistractors.slice(0, 3))),
      explainAr: '\u0635\u062D\u064A\u062D \u2014 ' + tAnswer + ' \u0647\u0648 \u0627\u0644\u0645\u0627\u0636\u064A \u0644\u0640 (' + tLabel.ar + ')',
      explainEn: 'Correct \u2014 ' + tAnswer + ' is the past tense for (' + tLabel.en + ').'
    });
  }

  if (masdarAr) {
    var masDistractors = [];
    if (activePAr) masDistractors.push(activePAr);
    if (passivePAr) masDistractors.push(passivePAr);
    if (past3ms) masDistractors.push(past3ms);
    if (pres3ms) masDistractors.push(pres3ms);
    if (imp2ms) masDistractors.push(imp2ms);
    masDistractors = masDistractors.filter(function(x) { return x && stripDiacritics(x) !== stripDiacritics(masdarAr); });
    shuffle(masDistractors);
    items.push({
      type: 'masdar',
      prompt: '\u0645\u0627 \u0647\u0648 \u0627\u0644\u0645\u0635\u062F\u0631 (\u0627\u0633\u0645 \u0627\u0644\u0641\u0639\u0644)\u061F',
      promptEn: 'What is the verbal noun (\u0627\u0644\u0645\u0635\u062F\u0631)?',
      answer: masdarAr,
      choices: shuffle([masdarAr].concat(masDistractors.slice(0, 3))),
      explainAr: '\u0635\u062D\u064A\u062D \u2014 ' + masdarAr + ' \u0647\u0648 \u0627\u0644\u0645\u0635\u062F\u0631\u060C \u064A\u062F\u0644 \u0639\u0644\u0649 \u0627\u0644\u062D\u062F\u062B \u0628\u062F\u0648\u0646 \u0632\u0645\u0646.',
      explainEn: 'Correct \u2014 ' + masdarAr + ' is the verbal noun (\u0627\u0644\u0645\u0635\u062F\u0631), representing the action' + (gloss ? ' of ' + gloss : '') + '.'
    });
  }

  if (activePAr) {
    var apDistractors = [];
    if (passivePAr) apDistractors.push(passivePAr);
    if (masdarAr) apDistractors.push(masdarAr);
    if (past3ms) apDistractors.push(past3ms);
    if (pres3ms) apDistractors.push(pres3ms);
    apDistractors = apDistractors.filter(function(x) { return x && stripDiacritics(x) !== stripDiacritics(activePAr); });
    shuffle(apDistractors);
    items.push({
      type: 'participle',
      prompt: '\u0623\u064A\u0651\u0647\u0627 \u0627\u0633\u0645 \u0627\u0644\u0641\u0627\u0639\u0644\u061F',
      promptEn: 'Which is the active participle (\u0627\u0633\u0645 \u0627\u0644\u0641\u0627\u0639\u0644)?',
      answer: activePAr,
      choices: shuffle([activePAr].concat(apDistractors.slice(0, 3))),
      explainAr: '\u0635\u062D\u064A\u062D \u2014 ' + activePAr + ' \u0647\u0648 \u0627\u0633\u0645 \u0627\u0644\u0641\u0627\u0639\u0644\u060C \u064A\u062F\u0644 \u0639\u0644\u0649 \u0645\u0646 \u064A\u0642\u0648\u0645 \u0628\u0627\u0644\u0641\u0639\u0644.',
      explainEn: 'Correct \u2014 ' + activePAr + ' is the active participle, indicating the doer of the action.'
    });
  }

  if (passivePAr) {
    var ppDistractors = [];
    if (activePAr) ppDistractors.push(activePAr);
    if (masdarAr) ppDistractors.push(masdarAr);
    if (past3ms) ppDistractors.push(past3ms);
    if (pres3ms) ppDistractors.push(pres3ms);
    ppDistractors = ppDistractors.filter(function(x) { return x && stripDiacritics(x) !== stripDiacritics(passivePAr); });
    shuffle(ppDistractors);
    items.push({
      type: 'participle',
      prompt: '\u0623\u064A\u0651\u0647\u0627 \u0627\u0633\u0645 \u0627\u0644\u0645\u0641\u0639\u0648\u0644\u061F',
      promptEn: 'Which is the passive participle (\u0627\u0633\u0645 \u0627\u0644\u0645\u0641\u0639\u0648\u0644)?',
      answer: passivePAr,
      choices: shuffle([passivePAr].concat(ppDistractors.slice(0, 3))),
      explainAr: '\u0635\u062D\u064A\u062D \u2014 ' + passivePAr + ' \u0647\u0648 \u0627\u0633\u0645 \u0627\u0644\u0645\u0641\u0639\u0648\u0644\u060C \u064A\u062F\u0644 \u0639\u0644\u0649 \u0645\u0646 \u0648\u0642\u0639 \u0639\u0644\u064A\u0647 \u0627\u0644\u0641\u0639\u0644.',
      explainEn: 'Correct \u2014 ' + passivePAr + ' is the passive participle, indicating the recipient of the action.'
    });
  }

  if (transit === 'transitive' || transit === 'intransitive') {
    var vtAnswer = transit === 'transitive' ? '\u0645\u062A\u0639\u062F\u0651\u064D' : '\u0644\u0627\u0632\u0645';
    var vtWrong = transit === 'transitive' ? '\u0644\u0627\u0632\u0645' : '\u0645\u062A\u0639\u062F\u0651\u064D';
    var vtChoices = [vtAnswer, vtWrong];
    vtChoices.push('\u0645\u062A\u0639\u062F\u0651\u064D \u0648\u0644\u0627\u0632\u0645');
    items.push({
      type: 'verbtype',
      prompt: '\u0647\u0644 \u0647\u0630\u0627 \u0627\u0644\u0641\u0639\u0644 \u0645\u062A\u0639\u062F\u0651\u064D \u0623\u0645 \u0644\u0627\u0632\u0645\u061F',
      promptEn: 'Is ' + (past3ms || root) + ' transitive or intransitive?',
      answer: vtAnswer,
      choices: shuffle(vtChoices),
      explainAr: '\u0635\u062D\u064A\u062D \u2014 ' + (past3ms || root) + ' \u0641\u0639\u0644 ' + vtAnswer + (transit === 'transitive' ? '\u060C \u064A\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u0645\u0641\u0639\u0648\u0644 \u0628\u0647' : '\u060C \u0644\u0627 \u064A\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u0645\u0641\u0639\u0648\u0644 \u0628\u0647') + '.',
      explainEn: 'Correct \u2014 ' + (past3ms || root) + ' is ' + transit + (transit === 'transitive' ? ', it requires a direct object.' : ', it does not take a direct object.')
    });
  } else if (transit === 'both') {
    items.push({
      type: 'verbtype',
      prompt: '\u0647\u0644 \u0647\u0630\u0627 \u0627\u0644\u0641\u0639\u0644 \u0645\u062A\u0639\u062F\u0651\u064D \u0623\u0645 \u0644\u0627\u0632\u0645\u061F',
      promptEn: 'Is ' + (past3ms || root) + ' transitive or intransitive?',
      answer: '\u0645\u062A\u0639\u062F\u0651\u064D \u0648\u0644\u0627\u0632\u0645',
      choices: shuffle(['\u0645\u062A\u0639\u062F\u0651\u064D', '\u0644\u0627\u0632\u0645', '\u0645\u062A\u0639\u062F\u0651\u064D \u0648\u0644\u0627\u0632\u0645']),
      explainAr: '\u0635\u062D\u064A\u062D \u2014 ' + (past3ms || root) + ' \u064A\u064F\u0633\u062A\u062E\u062F\u0645 \u0645\u062A\u0639\u062F\u064A\u064B\u0627 \u0648\u0644\u0627\u0632\u0645\u064B\u0627.',
      explainEn: 'Correct \u2014 ' + (past3ms || root) + ' can be used both transitively and intransitively.'
    });
  }

  if (form > 1 && FORM_MEANING_DATA[form]) {
    var fmData = FORM_MEANING_DATA[form];
    var fmChoices = [fmData.en].concat(fmData.distractors);
    shuffle(fmChoices);
    var romanForm = ['','I','II','III','IV','V','VI','VII','VIII','IX','X'][form] || form;
    items.push({
      type: 'formmeaning',
      prompt: '\u0645\u0627\u0630\u0627 \u064A\u062F\u0644 \u0627\u0644\u0628\u0627\u0628 ' + romanForm + ' \u0639\u0627\u062F\u0629\u064B\u061F',
      promptEn: 'What does Measure ' + romanForm + ' usually indicate?',
      answer: fmData.en,
      choices: fmChoices,
      explainAr: '\u0635\u062D\u064A\u062D \u2014 \u0627\u0644\u0628\u0627\u0628 ' + romanForm + ' \u064A\u062F\u0644 \u0639\u0644\u0649: ' + fmData.ar,
      explainEn: 'Correct \u2014 Measure ' + romanForm + ' typically indicates ' + fmData.en + '.'
    });
  }

  if (vc !== 'sound') {
    var vcNames = {
      hollow: { ar: '\u0623\u062C\u0648\u0641', en: 'hollow' },
      defective: { ar: '\u0646\u0627\u0642\u0635', en: 'defective' },
      assimilated: { ar: '\u0645\u062B\u0627\u0644', en: 'assimilated' },
      doubled: { ar: '\u0645\u0636\u0639\u0651\u0641', en: 'doubled' },
      hamzated: { ar: '\u0645\u0647\u0645\u0648\u0632', en: 'hamzated' }
    };
    var vcCorrect = vcNames[vc] || { ar: vc, en: vc };
    var vcDistractors = Object.keys(vcNames).filter(function(k) { return k !== vc; }).map(function(k) { return vcNames[k].en; });
    shuffle(vcDistractors);
    items.push({
      type: 'verbtype',
      prompt: '\u0645\u0627 \u0646\u0648\u0639 \u0647\u0630\u0627 \u0627\u0644\u0641\u0639\u0644 \u0645\u0646 \u062D\u064A\u062B \u0627\u0644\u0625\u0639\u0644\u0627\u0644\u061F',
      promptEn: 'What is the verb class of ' + (past3ms || root) + '?',
      answer: vcCorrect.en,
      choices: shuffle([vcCorrect.en].concat(vcDistractors.slice(0, 3))),
      explainAr: '\u0635\u062D\u064A\u062D \u2014 ' + (past3ms || root) + ' \u0641\u0639\u0644 ' + vcCorrect.ar + (VERB_CLASS_INFO[vc] ? ': ' + VERB_CLASS_INFO[vc].desc_ar : ''),
      explainEn: 'Correct \u2014 ' + (past3ms || root) + ' is a ' + vcCorrect.en + ' verb' + (VERB_CLASS_INFO[vc] ? '. ' + VERB_CLASS_INFO[vc].en : '') + '.'
    });
  }

  shuffle(items);
  return items;
}

var _typeLabels = { conj: 'conjugation', masdar: 'masdar', participle: 'participle', verbtype: 'verb type', formmeaning: 'form meaning' };

function renderExCard(ex, idx) {
  var tag = _typeLabels[ex.type] || ex.type;
  var total = _exTotal || 5;
  var h = '<div class="ex-card" id="exc' + idx + '">';
  h += '<div class="ex-header"><span class="ex-type-tag">' + escH(tag) + '</span><span class="ex-progress">' + (idx + 1) + ' / ' + total + '</span></div>';

  function choiceBtn(c) {
    return '<button class="ex-choice" data-idx="' + idx + '" data-val="' + escH(c) + '">' + escH(c) + '</button>';
  }
  h += '<div class="ex-prompt">' + escH(ex.prompt) + '</div>';
  if (ex.promptEn) h += '<div class="ex-prompt-en">' + escH(ex.promptEn) + '</div>';
  h += '<div class="ex-choices">';
  (ex.choices || []).forEach(function(c) { h += choiceBtn(c); });
  h += '</div>';

  h += '<div class="ex-feedback" id="exf' + idx + '" style="display:none"></div>';
  h += '</div>';
  return h;
}

var _currentExercises = [];

function generateAndRenderPractice() {
  if (!_lastResultData) return;
  var d = _lastResultData;
  var all = generateExercises(d);
  if (!all.length) return;

  var count = Math.min(all.length, 5);
  _currentExercises = all.slice(0, count);
  _exScore = 0;
  _exTotal = _currentExercises.length;
  _exAnswered = 0;

  var h = '<div class="ex-session-hdr"><span class="ex-session-title">\u062A\u062F\u0631\u064A\u0628 \u00B7 Practice Session</span><span class="ex-session-count">' + _exTotal + ' questions</span></div>';
  _currentExercises.forEach(function(ex, i) {
    h += renderExCard(ex, i);
  });
  h += '<div class="ex-score" id="exScoreBar" style="display:none"><span>\u0627\u0644\u0646\u062A\u064A\u062C\u0629:</span> <span class="ex-score-num" id="exScoreNum"></span> <button class="ex-retry-btn" onclick="generateAndRenderPractice()">\u0625\u0639\u0627\u062F\u0629 &middot; New Session</button></div>';

  document.getElementById('practicePanel').innerHTML = h;
}

function exAnswer(idx, btn, val) {
  var card = document.getElementById('exc' + idx);
  if (card.classList.contains('ex-answered')) return;
  card.classList.add('ex-answered');
  _exAnswered++;

  var ex = _currentExercises[idx];
  var correct = stripDiacritics(val) === stripDiacritics(ex.answer);
  if (correct) _exScore++;

  var btns = card.querySelectorAll('.ex-choice');
  btns.forEach(function(b) {
    if (stripDiacritics(b.textContent) === stripDiacritics(ex.answer)) b.classList.add('ex-right');
    if (b === btn && !correct) b.classList.add('ex-wrong-pick');
  });

  card.classList.add(correct ? 'ex-correct' : 'ex-wrong');
  var fb = document.getElementById('exf' + idx);
  fb.className = 'ex-feedback ' + (correct ? 'ex-fb-correct' : 'ex-fb-wrong');
  fb.innerHTML = (correct ? '\u2713 ' : '\u2717 ') + '<span class="ex-fb-ar">' + escH(ex.explainAr) + '</span><span class="ex-fb-en">' + escH(ex.explainEn) + '</span>';
  fb.style.display = 'block';

  if (_exAnswered >= _exTotal) showExScore();
}

function exCheckInput(idx) {
  var card = document.getElementById('exc' + idx);
  if (card.classList.contains('ex-answered')) return;
  var inp = document.getElementById('exi' + idx);
  var val = inp.value.trim();
  if (!val) return;
  card.classList.add('ex-answered');
  _exAnswered++;

  var ex = _currentExercises[idx];
  var correct = stripDiacritics(val) === stripDiacritics(ex.answer);
  if (correct) _exScore++;

  card.classList.add(correct ? 'ex-correct' : 'ex-wrong');
  inp.style.borderColor = correct ? '#28a745' : '#e63946';
  var fb = document.getElementById('exf' + idx);
  fb.className = 'ex-feedback ' + (correct ? 'ex-fb-correct' : 'ex-fb-wrong');
  fb.innerHTML = (correct ? '\u2713 ' : '\u2717 ') + '<span class="ex-fb-ar">' + escH(ex.explainAr) + '</span><span class="ex-fb-en">' + escH(ex.explainEn) + '</span>';
  fb.style.display = 'block';

  if (_exAnswered >= _exTotal) showExScore();
}

function showExScore() {
  var bar = document.getElementById('exScoreBar');
  if (bar) {
    bar.style.display = 'flex';
    document.getElementById('exScoreNum').textContent = _exScore + ' / ' + _exTotal;
  }
  if (_lastResultData) {
    var verb = (_lastResultData.root && typeof _lastResultData.root === 'object')
      ? (_lastResultData.root.normalized || _lastResultData.root.input || '')
      : (_lastResultData.root || '');
    if (verb) pgRecord(verb, _exScore, _exTotal);
  }
}

document.addEventListener('click', function(e) {
  var btn = e.target.closest('.ex-choice[data-idx]');
  if (btn) {
    exAnswer(parseInt(btn.getAttribute('data-idx'), 10), btn, btn.getAttribute('data-val'));
    return;
  }
  var chk = e.target.closest('.ex-check-btn[data-chk]');
  if (chk) {
    exCheckInput(parseInt(chk.getAttribute('data-chk'), 10));
    return;
  }
});

function renderResult(d) {
  _lastResultData = d;
  renderHeader(d);
  renderUnifiedTable(d);
  renderDerivations(d);
  renderPrepositions(d);
  renderUsage(d);
  renderDerivedForms(d);

  var pw = document.getElementById('practiceWrap');
  pw.style.display = 'block';
  pw.classList.remove('open');
  document.getElementById('practicePanel').innerHTML = '';

  document.getElementById('result').style.display = 'block';
  renderTeacherInfo(d);
  var teacherBar = document.getElementById('teacherInfoBar');
  if (teacherBar) teacherBar.style.display = 'block';
  document.getElementById('exportBar').style.display = 'flex';
  postRenderInteractive();
}

/* ── Autocomplete ─────────────────────────────── */
var _acTimer = null;
var _acActiveIdx = -1;
var _acItems = [];
var _acCurrentDropdown = null;
var _acCurrentInput = null;
var _acSeq = 0;

function acFetch(inputEl, dropdownEl) {
  var q = inputEl.value.trim();
  if (q.length < 1) { acClose(dropdownEl); return; }
  clearTimeout(_acTimer);
  var seq = ++_acSeq;
  _acTimer = setTimeout(function() {
    fetch('/api/smartroot/suggest?q=' + encodeURIComponent(q))
      .then(function(r) { return r.json(); })
      .then(function(items) {
        if (seq !== _acSeq) return;
        if (inputEl.value.trim() !== q) return;
        acRender(items, dropdownEl, inputEl);
      })
      .catch(function() { if (seq === _acSeq) acClose(dropdownEl); });
  }, 120);
}

function acRender(items, dropdownEl, inputEl) {
  if (!items || !items.length) { acClose(dropdownEl); return; }
  _acItems = items;
  _acActiveIdx = -1;
  _acCurrentDropdown = dropdownEl;
  _acCurrentInput = inputEl;
  var h = '';
  var firstHint = items[0] && items[0].hint ? items[0].hint : '';
  if (firstHint) {
    h += '<div class="ac-hint">' + escH(firstHint) + '</div>';
  }
  items.forEach(function(it, i) {
    var badge;
    if (it.type === 'verb') {
      badge = '<span class="ac-badge ac-badge-verb">\u0641\u0639\u0644</span>';
    } else if (it.type === 'masdar') {
      badge = '<span class="ac-badge ac-badge-masdar">\u0645\u0635\u062F\u0631</span>';
    } else {
      badge = '<span class="ac-badge ac-badge-noun">\u0627\u0633\u0645</span>';
    }
    var rootHint = (it.type === 'masdar' || it.type === 'noun') ? '<span class="ac-root-hint">\u2190 ' + escH(it.root) + '</span>' : '';
    var subHint = (it.hint && i > 0) ? '<span class="ac-sub-hint">' + escH(it.hint) + '</span>' : '';
    h += '<div class="ac-item" data-idx="' + i + '">' +
      '<span class="ac-ar">' + escH(it.ar) + '</span>' +
      badge +
      subHint +
      '<span class="ac-gloss">' + escH(it.gloss) + '</span>' +
      rootHint +
    '</div>';
  });
  dropdownEl.innerHTML = h;
  dropdownEl.classList.add('ac-open');
}

function acClose(dropdownEl) {
  if (dropdownEl) dropdownEl.classList.remove('ac-open');
  _acActiveIdx = -1;
  _acItems = [];
  _acCurrentDropdown = null;
  _acCurrentInput = null;
}

function acSelect(idx) {
  if (idx < 0 || idx >= _acItems.length) return;
  var it = _acItems[idx];
  var root = (it.type === 'masdar' || it.type === 'noun') ? it.root : it.ar;
  var isHome = _acCurrentInput && _acCurrentInput.id === 'homeInput';
  var measure = isHome
    ? document.getElementById('homeMeasure').value
    : document.getElementById('measureSelect').value;
  if (_acCurrentDropdown) acClose(_acCurrentDropdown);
  analyzeRoot(root, measure || 'auto');
}

function acKeydown(e, inputEl, dropdownEl) {
  if (!dropdownEl.classList.contains('ac-open')) {
    if (e.key === 'Enter') {
      if (inputEl.id === 'homeInput') analyzeFromHome();
      else analyzeFromBar();
    }
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _acActiveIdx = Math.min(_acActiveIdx + 1, _acItems.length - 1);
    acHighlight(dropdownEl);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _acActiveIdx = Math.max(_acActiveIdx - 1, -1);
    acHighlight(dropdownEl);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (_acActiveIdx >= 0) {
      acSelect(_acActiveIdx);
    } else {
      acClose(dropdownEl);
      if (inputEl.id === 'homeInput') analyzeFromHome();
      else analyzeFromBar();
    }
  } else if (e.key === 'Escape') {
    acClose(dropdownEl);
  }
}

function acHighlight(dropdownEl) {
  var items = dropdownEl.querySelectorAll('.ac-item');
  items.forEach(function(el, i) {
    el.classList.toggle('ac-active', i === _acActiveIdx);
    if (i === _acActiveIdx) el.scrollIntoView({ block: 'nearest' });
  });
}

(function initAutocomplete() {
  var homeIn = document.getElementById('homeInput');
  var homeAc = document.getElementById('homeAc');
  var barIn = document.getElementById('rootInput');
  var barAc = document.getElementById('barAc');

  homeIn.addEventListener('input', function() { acFetch(homeIn, homeAc); handleHomeInput(); });
  homeIn.addEventListener('keydown', function(e) { acKeydown(e, homeIn, homeAc); });
  homeIn.addEventListener('focus', function() { if (homeIn.value.trim()) acFetch(homeIn, homeAc); });

  barIn.addEventListener('input', function() { acFetch(barIn, barAc); });
  barIn.addEventListener('keydown', function(e) { acKeydown(e, barIn, barAc); });
  barIn.addEventListener('focus', function() { if (barIn.value.trim()) acFetch(barIn, barAc); });

  [homeAc, barAc].forEach(function(dd) {
    dd.addEventListener('mousedown', function(e) {
      e.preventDefault();
      var item = e.target.closest('.ac-item');
      if (item) acSelect(parseInt(item.dataset.idx, 10));
    });
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.ac-wrap')) {
      acClose(homeAc);
      acClose(barAc);
    }
  });
})();

/* ══════════════════════════════════════════════
   SENTENCE-IN-A-WORD  JS
══════════════════════════════════════════════ */

/* ── SentenceSnap examples ─────────────────────── */
var SSNAP = [
  { word: '\u0643\u064e\u062a\u064e\u0628\u064e\u0647\u064e\u0627',   gloss: 'he wrote it/her'    },
  { word: '\u064a\u064e\u0643\u0652\u062a\u064f\u0628\u064f\u0647\u064f\u0645\u0652', gloss: 'he writes them'     },
  { word: '\u0643\u064e\u062a\u064e\u0628\u0652\u062a\u064f\u0647\u064f', gloss: 'I wrote him/it'     },
  { word: '\u064a\u064e\u0641\u0652\u062a\u064e\u062d\u064f\u0647\u064e\u0627', gloss: 'he opens it'        },
  { word: '\u0636\u064e\u0631\u064e\u0628\u064e\u0647\u064f\u0645\u0652', gloss: 'he hit them'        },
  { word: '\u0633\u064e\u0623\u064e\u0644\u064e\u0643\u064e',           gloss: 'he asked you (m.)'  },
];

function initSentenceSnap() {
  var el = document.getElementById('ssnapChips');
  el.innerHTML = SSNAP.map(function(s) {
    return '<button class="ssnap-chip" data-word="' + escH(s.word) + '">' +
      '<span>' + escH(s.word) + '</span>' +
      '<span class="ssnap-gloss">' + escH(s.gloss) + '</span>' +
      '</button>';
  }).join('');
  el.onclick = function(e) {
    var chip = e.target.closest('.ssnap-chip');
    if (chip) doSentenceAnalyze(chip.dataset.word);
  };
}

/* ── Mode switching ────────────────────────────── */
var _homeMode = 'root';
function switchMode(mode) {
  _homeMode = mode;
  document.getElementById('rootModePanel').style.display  = mode === 'root'     ? 'block' : 'none';
  document.getElementById('sentenceModePanel').style.display = mode === 'sentence' ? 'block' : 'none';
  document.getElementById('tab-root').classList.toggle('active',     mode === 'root');
  document.getElementById('tab-sentence').classList.toggle('active', mode === 'sentence');
  if (mode === 'sentence') document.getElementById('sentenceInput').focus();
  else                     document.getElementById('homeInput').focus();
}

/* ── View navigation ───────────────────────────── */
function showSentenceHome() {
  document.getElementById('homeScreen').style.display    = 'flex';
  document.getElementById('analysisView').style.display  = 'none';
  document.getElementById('sentenceView').style.display  = 'none';
  switchMode('sentence');
}
function showSentenceView() {
  document.getElementById('homeScreen').style.display   = 'none';
  document.getElementById('analysisView').style.display = 'none';
  document.getElementById('sentenceView').style.display = 'block';
  window.scrollTo(0, 0);
}

/* ── Analyze entry points ──────────────────────── */
function analyzeFromSentence() {
  var word = document.getElementById('sentenceInput').value.trim();
  if (!word) return;
  document.getElementById('sentBarInput').value = word;
  doSentenceAnalyze(word);
}
function analyzeFromSentenceBar() {
  var word = document.getElementById('sentBarInput').value.trim();
  if (!word) return;
  doSentenceAnalyze(word);
}

async function doSentenceAnalyze(word) {
  var errEl = document.getElementById('sent-error-area');
  errEl.innerHTML = '';
  document.getElementById('sent-result').style.display = 'none';
  showSentenceView();
  try {
    var resp = await fetch('/api/smartroot/sentence-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: word }),
    });
    var data = await resp.json();
    if (!data.success) {
      errEl.innerHTML = '<div class="error-box">' + escH(data.error || 'Could not parse word.') + '</div>';
      return;
    }
    document.getElementById('sentBarInput').value = word;
    renderSentenceResult(data);
  } catch(e) {
    errEl.innerHTML = '<div class="error-box">Network error: ' + escH(e.message) + '</div>';
  }
}

/* ── Render sentence result ────────────────────── */
var SEG_CSS = {
  'future_marker':   'seg-prefix',   /* orange-ish — reuse prefix color */
  'prefix':          'seg-prefix',
  'stem':            'seg-stem',
  'subject_suffix':  'seg-subj-suffix',
  'pres_subj_suffix':'seg-subj-suffix',
  'object_suffix':   'seg-obj-suffix',
};
/* Override future_marker color inline */
var SEG_INLINE = {
  'future_marker': 'background:rgba(246,173,85,.22);color:#f6ad55;',
};

/* ── Affix role → CSS class ─ */
var AFFIX_CLS = {
  'future_marker':  'affix-future',
  'subject_prefix': 'affix-xprefix',
  'subject_suffix': 'affix-xsuffix',
  'object_pronoun': 'affix-object',
};

function renderSentenceResult(d) {
  var der = d.derivation;

  /* ── 1. Root header ──────────────────────────────────────────── */
  var rhEl = document.getElementById('sentRootHeader');
  if (der) {
    var ta = d.tokenAnalysis;
    var rootHtml = '<div class="root-letters-row">' +
      '<span class="root-letters">' + escH(der.rootStr) + '</span>' +
      (der.rootGloss ? '<span class="root-gloss">' + escH(der.rootGloss) + '</span>' : '') +
      '</div>' +
      '<div class="form-row">' +
        '<span class="form-badge">Measure ' + escH(der.form) + '</span>' +
        (der.formPattern ? '<span class="form-pattern">' + escH(der.formPattern) + '</span>' : '') +
        (der.verbClass ? '<span class="badge badge-vc" style="margin-left:.4rem">' + escH(der.verbClass) + '</span>' : '') +
        (ta && ta.pos ? '<span class="badge badge-pos" style="margin-left:.4rem">' + escH(ta.pos) + '</span>' : '') +
      '</div>' +
      (der.formNote ? '<div class="form-note">' + escH(der.formNote) + '</div>' : '');
    rhEl.innerHTML = rootHtml;
    rhEl.style.display = 'block';
  } else {
    rhEl.style.display = 'none';
  }

  /* ── 2. Derivation chain ─────────────────────────────────────── */
  var chainEl = document.getElementById('sentChainEl');
  var chainBlock = document.getElementById('sentDerivChain');
  if (der && der.chain && der.chain.length > 0) {
    var STEP_CLS = ['dstep-root','dstep-base','dstep-pres','dstep-inflected','dstep-full'];
    chainEl.innerHTML = der.chain.map(function(step, i) {
      var cls = STEP_CLS[Math.min(i, STEP_CLS.length - 1)];
      var arrow = i < der.chain.length - 1
        ? '<div class="deriv-arrow">\u2192</div>'
        : '';
      return '<div class="deriv-step ' + cls + '">' +
        '<div class="dstep-ar">' + escH(step.arabic) + '</div>' +
        '<div class="dstep-tr">' + escH(step.transliteration) + '</div>' +
        '<div class="dstep-lbl">' + escH(step.label) + '</div>' +
        (step.description ? '<div class="dstep-desc" title="' + escH(step.description) + '">' + escH(step.description) + '</div>' : '') +
        '</div>' + arrow;
    }).join('');
    chainBlock.style.display = 'block';
  } else {
    chainBlock.style.display = 'none';
  }

  /* ── 3. Word breakdown (color-coded segments) ────────────────── */
  var bwEl = document.getElementById('sentBreakdownWord');
  bwEl.innerHTML = d.parts.map(function(p) {
    var cls = SEG_CSS[p.role] || 'seg-stem';
    var inl = SEG_INLINE[p.role] ? ' style="' + SEG_INLINE[p.role] + '"' : '';
    return '<div class="seg ' + cls + '"' + inl + '>' +
      '<span class="seg-ar">' + escH(p.arabic) + '</span>' +
      '<span class="seg-tr">' + escH(p.transliteration) + '</span>' +
      '<span class="seg-label">' + escH(p.label) + '</span>' +
      '</div>';
  }).join('');

  /* ── 4. Affix list ───────────────────────────────────────────── */
  var affixListEl = document.getElementById('sentAffixList');
  var affixBlock = document.getElementById('sentAffixBlock');
  if (der && der.affixes && der.affixes.length > 0) {
    affixListEl.innerHTML = der.affixes.map(function(a) {
      var rowCls = AFFIX_CLS[a.role] || 'affix-object';
      var tagLabel = a.role.replace(/_/g,' ');
      return '<div class="affix-row ' + rowCls + '">' +
        '<span class="affix-ar">' + escH(a.arabic) + '</span>' +
        '<span class="affix-tr">' + escH(a.tr) + '</span>' +
        '<span class="affix-meaning"><strong>' + escH(a.label) + '</strong> — ' + escH(a.meaning) + '</span>' +
        '<span class="affix-tag">' + escH(tagLabel) + '</span>' +
        '</div>';
    }).join('');
    affixBlock.style.display = 'block';
  } else {
    affixBlock.style.display = 'none';
  }

  /* ── 5. Subject / Verb / Object summary ─────────────────────── */
  var sumEl = document.getElementById('sentSummary');
  var tenseLabel = d.isFuture ? 'future' : (d.tense === 'past' ? 'past' : 'present');
  var baseVerbAr = (der && der.baseVerb) ? der.baseVerb : d.stem.arabic;
  var verbLine = d.verbGloss
    ? escH(baseVerbAr) + ' &nbsp;<span style="color:#bbb;font-size:.75rem">(' + escH(d.verbGloss) + ')</span>'
    : escH(d.stem.arabic);

  var subjFrom = d.subject
    ? (d.subject.from === 'implied' ? 'implied' : d.subject.from === 'prefix' ? 'prefix' : 'suffix')
    : '';
  var subjLine = d.subject
    ? escH(d.subject.arabic) + ' &nbsp;<span style="color:#bbb;font-size:.75rem">(' + escH(d.subject.english) + ', ' + subjFrom + ')</span>'
    : '—';

  var objInterps = d.object ? d.object.interpretations.map(function(i) { return escH(i.english); }).join(' / ') : '—';
  var objLine = d.object
    ? escH(d.object.arabic) + ' &nbsp;<span class="sr-interps">' + objInterps + '</span>'
    : '—';

  sumEl.innerHTML =
    '<div class="sent-row"><span class="sr-role">Subject</span><span class="sr-ar">' + subjLine + '</span></div>' +
    '<div class="sent-row"><span class="sr-role">Verb</span><span class="sr-ar">' + verbLine + '</span>' +
      '<span class="sr-info" style="margin-left:.4rem;font-size:.68rem;color:#bbb">' + tenseLabel + '</span>' +
      (der && der.verbClass ? '<span class="badge badge-vc" style="margin-left:.3rem;vertical-align:middle">' + escH(der.verbClass) + '</span>' : '') +
    '</div>' +
    '<div class="sent-row"><span class="sr-role">Object</span><span class="sr-ar">' + objLine + '</span></div>';

  /* ── 6. Ambiguity note ───────────────────────────────────────── */
  var ambEl = document.getElementById('sentAmbigNote');
  if (d.subject && d.subject.ambiguous) {
    ambEl.style.display = 'block';
    var pfxAr = d.parts.find(function(p) { return p.role === 'prefix'; });
    ambEl.innerHTML = '\u26A0\uFE0F Prefix <strong>' + escH(pfxAr ? pfxAr.arabic : '') + '</strong> is ambiguous: could be ' +
      escH(d.subject.english) + ' or ' + (d.subject.alternates || []).map(escH).join(' or ') + '.';
  } else {
    ambEl.style.display = 'none';
  }

  /* ── 7. Interpretation cards ─────────────────────────────────── */
  var listEl = document.getElementById('sentInterpList');
  listEl.innerHTML = d.interpretations.map(function(sent, idx) {
    var interp = d.object ? d.object.interpretations[idx % d.object.interpretations.length] : null;
    var isAnim = interp ? interp.animate : true;
    var cls = isAnim ? 'animate-card' : 'inanimate-card';
    var tag = isAnim
      ? '<span class="interp-tag tag-animate">animate</span>'
      : '<span class="interp-tag tag-inanimate">inanimate</span>';
    var note = (interp && interp.note) ? '<div class="interp-note">' + escH(interp.note) + '</div>' : '';
    return '<div class="interp-card ' + cls + '">' +
      '<div class="interp-sentence">' + escH(sent) + '</div>' +
      tag + note +
      '</div>';
  }).join('');

  document.getElementById('sent-result').style.display = 'block';
}

/* ── Init ──────────────────────────────────────── */
initRootsnap();
initSentenceSnap();
renderRecentSearches();
</script>
<div id="mvOverlay" class="mv-overlay" style="display:none"></div>
<div id="vsOverlay" class="vs-overlay" style="display:none"></div>
<div id="vsAddOverlay" class="vs-add-overlay" style="display:none"></div>
</body>
</html>`;
export default router;
