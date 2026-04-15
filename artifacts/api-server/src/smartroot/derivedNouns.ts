/**
 * derivedNouns.ts
 * Rule-based generation of three additional nominal paradigms for Form I roots:
 *   1. Exaggeration nouns  (صيغة المبالغة)   — one who does X intensely / habitually
 *   2. Nouns of place/time (اسم المكان / الزمان) — place or time of the action
 *   3. Nouns of instrument (اسم الآلة)         — tool/device used for the action
 *
 * Forms II–X return a single entry with status "n/a".
 * A small hand-verified attestation table overrides rule-generated forms when present.
 *
 * NO change to conjugationEngine, passiveConjugation, rootClassifier, or nounEngine.
 */

import type { RootType } from "./rootClassifier.js";
import { transliterate } from "./transliterate.js";
import { recoverRadicals } from "./weakVerbEngine.js";

// ── Diacritic constants ────────────────────────────────────────────
const F  = "\u064E"; // fatha   َ
const K  = "\u0650"; // kasra   ِ
const D  = "\u064F"; // damma   ُ
const S  = "\u0652"; // sukun   ْ
const SH = "\u0651"; // shadda  ّ
const A  = "\u0627"; // alef    ا
const W  = "\u0648"; // waw     و
const Y  = "\u064A"; // ya      ي
const TM = "\u0629"; // ta marbuta ة
const M  = "\u0645"; // mim     م

// ── Status type ────────────────────────────────────────────────────
export type AttestStatus = "attested" | "rare" | "theoretical" | "n/a";

export interface DerivedNoun {
  arabic:      string;
  translit:    string;
  pattern:     string;      // Arabic weight pattern, e.g. "فَعَّال"
  patternName: string;      // English transliteration of pattern, e.g. "fa''āl"
  label:       string;      // English meaning gloss
  status:      AttestStatus;
}

// ── Helpers ────────────────────────────────────────────────────────

function tok(arabic: string): { arabic: string; translit: string } {
  return { arabic, translit: transliterate(arabic) };
}

// Set of root types that count as "Form I" (applicable for new nouns)
const FORM_I_TYPES = new Set<RootType>([
  "regular", "assimilated",
  "hollow_waw", "hollow_ya",
  "defective_waw", "defective_ya",
  "doubled",
]);

function irregularStatus(type: RootType): AttestStatus {
  return (type === "hollow_waw"  || type === "hollow_ya" ||
          type === "defective_waw" || type === "defective_ya")
    ? "rare" : "theoretical";
}

// ── Pattern builders ───────────────────────────────────────────────

// Exaggeration patterns
function exag_faaal(r1: string, r2: string, r3: string): string {
  // فَعَّال: R1+F + R2+SH+A + R3 — if R3=ا skip duplicate alef
  const tail = r3 === A ? "" : r3;
  return r1 + F + r2 + SH + A + tail;
}
function exag_faool(r1: string, r2: string, r3: string): string {
  // فَعُول: R1+F + R2+D + و + R3 — merge if R2=و or R3=و
  if (r2 === W) return r1 + F + r2 + D + r3;
  if (r3 === W) return r1 + F + r2 + D + r3;
  return r1 + F + r2 + D + W + r3;
}
function exag_faiil(r1: string, r2: string, r3: string): string {
  // فَعِيل: R1+F + R2+K + ي + R3 — merge if R2=ي or R3=ي
  if (r2 === Y) return r1 + F + r2 + K + r3;
  if (r3 === Y) return r1 + F + r2 + K + r3;
  return r1 + F + r2 + K + Y + r3;
}

// Place/Time patterns
function place_mafal(r1: string, r2: string, r3: string): string {
  // مَفعَل: M+F + R1+S + R2+F + R3
  return M + F + r1 + S + r2 + F + r3;
}
function place_mafil(r1: string, r2: string, r3: string): string {
  // مَفعِل: M+F + R1+S + R2+K + R3
  return M + F + r1 + S + r2 + K + r3;
}
function place_mafala(r1: string, r2: string, r3: string): string {
  // مَفعَلة: M+F + R1+S + R2+F + R3+F + ة
  return M + F + r1 + S + r2 + F + r3 + F + TM;
}

// Instrument patterns
function instr_mifal(r1: string, r2: string, r3: string): string {
  // مِفعَل: M+K + R1+S + R2+F + R3
  return M + K + r1 + S + r2 + F + r3;
}
function instr_mifala(r1: string, r2: string, r3: string): string {
  // مِفعَلة: M+K + R1+S + R2+F + R3+F + ة
  return M + K + r1 + S + r2 + F + r3 + F + TM;
}
function instr_mifaal(r1: string, r2: string, r3: string): string {
  // مِفعال: M+K + R1+S + R2+F+A + R3
  return M + K + r1 + S + r2 + F + A + r3;
}

// ── Attested lookup tables ─────────────────────────────────────────

interface ExagAttest  { arabic: string; pattern: string; label: string }
interface PlaceAttest { arabic: string; pattern: string; label: string; nounType: string }
interface InstrAttest { arabic: string; pattern: string; label: string }

const EXAG_ATTESTED: Record<string, ExagAttest[]> = {
  "كتب": [{ arabic: "كَتَّاب",  pattern: "فَعَّال", label: "prolific writer / scribe" }],
  "قول": [{ arabic: "قَوَّال",  pattern: "فَعَّال", label: "one who talks a lot" }],
  "علم": [
    { arabic: "عَلَّام",  pattern: "فَعَّال", label: "very knowledgeable one" },
    { arabic: "عَلِيم",  pattern: "فَعِيل", label: "all-knowing" },
  ],
  "فهم": [
    { arabic: "فَهَّام",  pattern: "فَعَّال", label: "very intelligent person" },
    { arabic: "فَهِيم",  pattern: "فَعِيل", label: "perceptive / insightful" },
  ],
  "صبر": [{ arabic: "صَبُور",  pattern: "فَعُول", label: "very patient" }],
  "شكر": [{ arabic: "شَكُور",  pattern: "فَعُول", label: "very grateful" }],
  "كرم": [{ arabic: "كَرِيم",  pattern: "فَعِيل", label: "generous / noble" }],
  "حلم": [{ arabic: "حَلِيم",  pattern: "فَعِيل", label: "forbearing / clement" }],
  "رحم": [{ arabic: "رَحِيم",  pattern: "فَعِيل", label: "merciful" }],
  "شرب": [{ arabic: "شَرَّاب",  pattern: "فَعَّال", label: "habitual drinker" }],
  "ضرب": [{ arabic: "ضَرَّاب",  pattern: "فَعَّال", label: "one who strikes repeatedly" }],
  "نوم": [{ arabic: "نَوَّام",  pattern: "فَعَّال", label: "one who sleeps a lot" }],
  "أكل": [{ arabic: "أَكَّال",  pattern: "فَعَّال", label: "voracious eater" }],
  "سمع": [{ arabic: "سَمِيع",  pattern: "فَعِيل", label: "all-hearing" }],
  "بصر": [{ arabic: "بَصِير",  pattern: "فَعِيل", label: "insightful / far-sighted" }],
  "قدر": [{ arabic: "قَدِير",  pattern: "فَعِيل", label: "all-powerful / capable" }],
  "رسم": [{ arabic: "رَسَّام",  pattern: "فَعَّال", label: "prolific artist / painter" }],
  "غفر": [{ arabic: "غَفُور",  pattern: "فَعُول", label: "very forgiving" }],
  "كذب": [{ arabic: "كَذَّاب",  pattern: "فَعَّال", label: "habitual liar" }],
  "عمل": [{ arabic: "عَمَّال",  pattern: "فَعَّال", label: "very hardworking" }],
  "سفر": [{ arabic: "سَفَّار",  pattern: "فَعَّال", label: "frequent traveler" }],
  "حفظ": [{ arabic: "حَفِيظ",  pattern: "فَعِيل", label: "excellent memorizer / guardian" }],
  "صدق": [{ arabic: "صَدُوق",  pattern: "فَعُول", label: "very truthful" }],
  "خبر": [{ arabic: "خَبِير",  pattern: "فَعِيل", label: "expert / well-informed" }],
  "قرأ": [{ arabic: "قَرَّاء",  pattern: "فَعَّال", label: "avid reader / reciter" }],
};

const PLACE_ATTESTED: Record<string, PlaceAttest[]> = {
  "كتب": [
    { arabic: "مَكتَب",  pattern: "مَفعَل",  label: "office / desk",           nounType: "place" },
    { arabic: "مَكتَبة", pattern: "مَفعَلة", label: "library / bookstore",      nounType: "place" },
  ],
  "درس": [
    { arabic: "مَدرَسة", pattern: "مَفعَلة", label: "school",                   nounType: "place" },
    { arabic: "مَدرَس",  pattern: "مَفعَل",  label: "classroom / study place",  nounType: "place" },
  ],
  "جلس": [{ arabic: "مَجلِس", pattern: "مَفعِل", label: "council / sitting room",  nounType: "place/time" }],
  "سجد": [{ arabic: "مَسجِد", pattern: "مَفعِل", label: "mosque",                   nounType: "place" }],
  "سكن": [{ arabic: "مَسكَن", pattern: "مَفعَل", label: "dwelling / home",          nounType: "place" }],
  "دخل": [{ arabic: "مَدخَل", pattern: "مَفعَل", label: "entrance / entry point",   nounType: "place" }],
  "خرج": [{ arabic: "مَخرَج", pattern: "مَفعَل", label: "exit / way out",           nounType: "place" }],
  "لعب": [{ arabic: "مَلعَب", pattern: "مَفعَل", label: "playground / stadium",     nounType: "place" }],
  "وعد": [{ arabic: "مَوعِد", pattern: "مَفعِل", label: "appointment / date",       nounType: "time/place" }],
  "وقف": [{ arabic: "مَوقِف", pattern: "مَفعِل", label: "position / parking spot",  nounType: "place/time" }],
  "عمل": [{ arabic: "مَعمَل", pattern: "مَفعَل", label: "factory / laboratory",     nounType: "place" }],
  "نزل": [{ arabic: "مَنزِل", pattern: "مَفعِل", label: "home / dwelling",          nounType: "place" }],
  "وضع": [{ arabic: "مَوضِع", pattern: "مَفعِل", label: "place / position",         nounType: "place" }],
  "طبع": [{ arabic: "مَطبَعة",pattern: "مَفعَلة",label: "printing press",           nounType: "place" }],
  "فتح": [{ arabic: "مَفتَح", pattern: "مَفعَل", label: "opening / starting point", nounType: "place" }],
  "قعد": [{ arabic: "مَقعَد", pattern: "مَفعَل", label: "seat / chair",             nounType: "place" }],
  "صنع": [{ arabic: "مَصنَع", pattern: "مَفعَل", label: "factory",                  nounType: "place" }],
  "طبخ": [{ arabic: "مَطبَخ", pattern: "مَفعَل", label: "kitchen",                  nounType: "place" }],
  "سبح": [{ arabic: "مَسبَح", pattern: "مَفعَل", label: "swimming pool",            nounType: "place" }],
  "زرع": [{ arabic: "مَزرَعة",pattern: "مَفعَلة",label: "farm",                     nounType: "place" }],
  "ركب": [{ arabic: "مَركَب", pattern: "مَفعَل", label: "vehicle / vessel",         nounType: "place" }],
  "شرب": [{ arabic: "مَشرَب", pattern: "مَفعَل", label: "drinking place / source",  nounType: "place" }],
  "ذهب": [{ arabic: "مَذهَب", pattern: "مَفعَل", label: "school of thought / way",  nounType: "place/time" }],
};

const INSTR_ATTESTED: Record<string, InstrAttest[]> = {
  "فتح": [{ arabic: "مِفتاح",  pattern: "مِفعال", label: "key" }],
  "كنس": [{ arabic: "مِكنَسة", pattern: "مِفعَلة",label: "broom" }],
  "سمع": [{ arabic: "مِسمَع",  pattern: "مِفعَل", label: "audio receiver / earphone" }],
  "مسح": [{ arabic: "مِمسَحة", pattern: "مِفعَلة",label: "mop / eraser" }],
  "برد": [{ arabic: "مِبرَد",  pattern: "مِفعَل", label: "file (rasp) / tool" }],
  "طرق": [{ arabic: "مِطرَقة", pattern: "مِفعَلة",label: "hammer" }],
  "قيس": [{ arabic: "مِقياس", pattern: "مِفعال", label: "scale / measuring instrument" }],
  "صفي": [{ arabic: "مِصفاة", pattern: "مِفعال", label: "strainer / filter" }],
  "ضرب": [{ arabic: "مِضرَبة", pattern: "مِفعَلة",label: "racket (tennis / ping-pong)" }],
  "حرث": [{ arabic: "مِحراث", pattern: "مِفعال", label: "plow" }],
  "ثقب": [{ arabic: "مِثقَب",  pattern: "مِفعَل", label: "drill / punch" }],
  "وزن": [{ arabic: "مِيزان",  pattern: "مِفعال", label: "scale / balance" }],
  "كحل": [{ arabic: "مِكحَلة", pattern: "مِفعَلة",label: "kohl container / applicator" }],
  "شرح": [{ arabic: "مِشرَح",  pattern: "مِفعَل", label: "scalpel / dissection tool" }],
};

// ── Public APIs ────────────────────────────────────────────────────

/**
 * Exaggeration nouns (صيغة المبالغة).
 * Form I only; Forms II–X return [{status:"n/a"}].
 */
export function getExaggerationNouns(
  r1: string, r2: string, r3: string,
  type: RootType,
): DerivedNoun[] {
  if (!FORM_I_TYPES.has(type)) {
    return [{
      arabic: "", translit: "", pattern: "", patternName: "",
      label: "Not applicable for derived verb forms (Forms II–X)",
      status: "n/a",
    }];
  }

  const rec = recoverRadicals(r1, r2, r3, type);
  const root3 = rec.trueRoot;
  const attested = EXAG_ATTESTED[root3];
  if (attested && attested.length > 0) {
    return attested.map(a => ({
      ...tok(a.arabic),
      pattern:     a.pattern,
      patternName: "",
      label:       a.label,
      status:      "attested" as AttestStatus,
    }));
  }

  const status = irregularStatus(type);
  return [
    { ...tok(exag_faaal(rec.r1, rec.r2, rec.r3)), pattern: "فَعَّال", patternName: "fa''āl", label: "prolific / habitual doer", status },
    { ...tok(exag_faool(rec.r1, rec.r2, rec.r3)), pattern: "فَعُول",  patternName: "fa'ūl",  label: "one characterized by the action", status },
    { ...tok(exag_faiil(rec.r1, rec.r2, rec.r3)), pattern: "فَعِيل",  patternName: "fa'īl",  label: "one with the quality intensely", status },
  ];
}

/**
 * Nouns of place/time (اسم المكان / الزمان).
 * Form I only; Forms II–X return [{status:"n/a"}].
 */
export interface PlaceTimeNoun extends DerivedNoun {
  nounType: string; // "place" | "time" | "place/time"
}

export function getPlaceTimeNouns(
  r1: string, r2: string, r3: string,
  type: RootType,
): PlaceTimeNoun[] {
  if (!FORM_I_TYPES.has(type)) {
    return [{
      arabic: "", translit: "", pattern: "", patternName: "",
      label: "Not applicable for derived verb forms (Forms II–X)",
      nounType: "",
      status: "n/a",
    }];
  }

  const rec = recoverRadicals(r1, r2, r3, type);
  const root3 = rec.trueRoot;
  const attested = PLACE_ATTESTED[root3];
  if (attested && attested.length > 0) {
    return attested.map(a => ({
      ...tok(a.arabic),
      pattern:     a.pattern,
      patternName: "",
      label:       a.label,
      nounType:    a.nounType,
      status:      "attested" as AttestStatus,
    }));
  }

  const status = irregularStatus(type);
  return [
    {
      ...tok(place_mafal(rec.r1, rec.r2, rec.r3)),
      pattern: "مَفعَل", patternName: "maf'al",
      label: "place / time of the action", nounType: "place/time", status,
    },
    {
      ...tok(place_mafil(rec.r1, rec.r2, rec.r3)),
      pattern: "مَفعِل", patternName: "maf'il",
      label: "place / time of the action", nounType: "place/time", status,
    },
    {
      ...tok(place_mafala(rec.r1, rec.r2, rec.r3)),
      pattern: "مَفعَلة", patternName: "maf'ala",
      label: "place of the action (with ta-marbuta)", nounType: "place", status,
    },
  ];
}

/**
 * Nouns of instrument (اسم الآلة).
 * Form I only and typically transitive; intransitive roots return [{status:"n/a"}].
 * Forms II–X return [{status:"n/a"}].
 */
export function getInstrumentNouns(
  r1: string, r2: string, r3: string,
  type: RootType,
  isTransitive: boolean,
): DerivedNoun[] {
  if (!FORM_I_TYPES.has(type)) {
    return [{
      arabic: "", translit: "", pattern: "", patternName: "",
      label: "Not applicable for derived verb forms (Forms II–X)",
      status: "n/a",
    }];
  }
  if (!isTransitive) {
    return [{
      arabic: "", translit: "", pattern: "", patternName: "",
      label: "Not applicable — intransitive verbs do not take instrument nouns",
      status: "n/a",
    }];
  }

  const rec = recoverRadicals(r1, r2, r3, type);
  const root3 = rec.trueRoot;
  const attested = INSTR_ATTESTED[root3];
  if (attested && attested.length > 0) {
    return attested.map(a => ({
      ...tok(a.arabic),
      pattern:     a.pattern,
      patternName: "",
      label:       a.label,
      status:      "attested" as AttestStatus,
    }));
  }

  const status = irregularStatus(type);
  return [
    { ...tok(instr_mifaal(rec.r1, rec.r2, rec.r3)), pattern: "مِفعال", patternName: "mif'āl",  label: "instrument / tool", status },
    { ...tok(instr_mifal(rec.r1, rec.r2, rec.r3)),  pattern: "مِفعَل",  patternName: "mif'al",  label: "instrument / tool", status },
    { ...tok(instr_mifala(rec.r1, rec.r2, rec.r3)), pattern: "مِفعَلة", patternName: "mif'ala", label: "instrument / tool", status },
  ];
}
