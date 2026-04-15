/**
 * sentenceParser.ts  (v2 — root-first analysis)
 *
 * Parses an Arabic verb carrying attached subject/object pronouns and delivers
 * a ROOT-FIRST analysis chain:
 *
 *   root  →  Form base verb  →  present stem  →  full inflected form
 *
 * Works for past and present tense, with future-marker (سَ) detection and
 * full present-tense subject suffix support (ونَ 3mp, انِ dual, ينَ 3fp/2fs).
 *
 * No changes to the core morphology engine.
 */

import { transliterate }              from "./transliterate.js";
import { lookupRoot }                 from "./lexicon.js";
import { stripDiacritics }            from "./normalization.js";
import {
  detectFormFromPast, detectFormFromPresent, FormDetectionResult,
} from "./formDetection.js";
import { analyzeToken, type TokenAnalysis } from "./analyzeToken.js";
import { normalizeInput, getFormILexiconEntry } from "./form1Lexicon.js";

// ── Arabic Unicode constants ───────────────────────────────────────────────
const SUKUN  = "\u0652";
const FATHA  = "\u064E";
const DAMMA  = "\u064F";

// ── English verb tense forms ───────────────────────────────────────────────
const VERB_TENSE: Record<string, { past: string; pres3s: string; pres3p: string }> = {
  "to write":              { past: "wrote",       pres3s: "writes",      pres3p: "write"      },
  "to read":               { past: "read",        pres3s: "reads",       pres3p: "read"       },
  "to say":                { past: "said",        pres3s: "says",        pres3p: "say"        },
  "to go":                 { past: "went",        pres3s: "goes",        pres3p: "go"         },
  "to study":              { past: "studied",     pres3s: "studies",     pres3p: "study"      },
  "to look at":            { past: "looked at",   pres3s: "looks at",    pres3p: "look at"    },
  "to understand":         { past: "understood",  pres3s: "understands", pres3p: "understand" },
  "to drink":              { past: "drank",       pres3s: "drinks",      pres3p: "drink"      },
  "to speak":              { past: "spoke",       pres3s: "speaks",      pres3p: "speak"      },
  "to see":                { past: "saw",         pres3s: "sees",        pres3p: "see"        },
  "to know":               { past: "knew",        pres3s: "knows",       pres3p: "know"       },
  "to open":               { past: "opened",      pres3s: "opens",       pres3p: "open"       },
  "to take":               { past: "took",        pres3s: "takes",       pres3p: "take"       },
  "to give":               { past: "gave",        pres3s: "gives",       pres3p: "give"       },
  "to find":               { past: "found",       pres3s: "finds",       pres3p: "find"       },
  "to send":               { past: "sent",        pres3s: "sends",       pres3p: "send"       },
  "to enter":              { past: "entered",     pres3s: "enters",      pres3p: "enter"      },
  "to leave":              { past: "left",        pres3s: "leaves",      pres3p: "leave"      },
  "to help":               { past: "helped",      pres3s: "helps",       pres3p: "help"       },
  "to ask":                { past: "asked",       pres3s: "asks",        pres3p: "ask"        },
  "to love":               { past: "loved",       pres3s: "loves",       pres3p: "love"       },
  "to beat":               { past: "beat",        pres3s: "beats",       pres3p: "beat"       },
  "to teach":              { past: "taught",      pres3s: "teaches",     pres3p: "teach"      },
  "to hear":               { past: "heard",       pres3s: "hears",       pres3p: "hear"       },
  "to answer":             { past: "answered",    pres3s: "answers",     pres3p: "answer"     },
  "to kill":               { past: "killed",      pres3s: "kills",       pres3p: "kill"       },
  "to sit":                { past: "sat",         pres3s: "sits",        pres3p: "sit"        },
  "to promise":            { past: "promised",    pres3s: "promises",    pres3p: "promise"    },
  "to arrive / connect":   { past: "arrived",     pres3s: "arrives",     pres3p: "arrive"     },
  "to stop / stand":       { past: "stopped",     pres3s: "stops",       pres3p: "stop"       },
  "to use / employ":       { past: "used",        pres3s: "uses",        pres3p: "use"        },
  "to do / make":          { past: "did",         pres3s: "does",        pres3p: "do"         },
  "to want":               { past: "wanted",      pres3s: "wants",       pres3p: "want"       },
  "to think":              { past: "thought",     pres3s: "thinks",      pres3p: "think"      },
  "to meet":               { past: "met",         pres3s: "meets",       pres3p: "meet"       },
  "to remember":           { past: "remembered",  pres3s: "remembers",   pres3p: "remember"   },
  "to eat":                { past: "ate",         pres3s: "eats",        pres3p: "eat"        },
  "to use":                { past: "used",        pres3s: "uses",        pres3p: "use"        },
  "to employ":             { past: "employed",    pres3s: "employs",     pres3p: "employ"     },
  "to work":               { past: "worked",      pres3s: "works",       pres3p: "work"       },
  "to open / conquer":     { past: "opened",      pres3s: "opens",       pres3p: "open"       },
  "to hit":                { past: "hit",         pres3s: "hits",        pres3p: "hit"        },
  "to strike":             { past: "struck",      pres3s: "strikes",     pres3p: "strike"     },
  "to collect":            { past: "collected",   pres3s: "collects",    pres3p: "collect"    },
  "to gather":             { past: "gathered",    pres3s: "gathers",     pres3p: "gather"     },
};

function verbForm(gloss: string, tense: "past" | "present", plural: boolean): string {
  const entry = VERB_TENSE[gloss];
  if (entry) {
    if (tense === "past") return entry.past;
    return plural ? entry.pres3p : entry.pres3s;
  }
  // Generic fallback
  const base = gloss.startsWith("to ") ? gloss.slice(3) : gloss;
  if (tense === "past") {
    if (base.endsWith("e")) return base + "d";
    if (base.endsWith("y")) return base.slice(0, -1) + "ied";
    return base + "ed";
  }
  if (plural) return base;
  if (base.endsWith("s") || base.endsWith("x") || base.endsWith("z") ||
      base.endsWith("sh") || base.endsWith("ch"))
    return base + "es";
  return base + "s";
}

// ── Object-suffix table ────────────────────────────────────────────────────
export interface Interpretation {
  english: string;
  animate: boolean;
  note?: string;
}

interface ObjSuffix {
  ar:   string;
  bare: string;
  tr:   string;
  label: string;
  interpretations: Interpretation[];
}

// Longest first
const OBJ_SUFFIXES: ObjSuffix[] = [
  { ar: "\u0647\u064F\u0646\u0651\u064E", bare: "\u0647\u0646", tr: "hunna",
    label: "3fp obj.", interpretations: [{ english: "them (f. pl.)", animate: true }] },
  { ar: "\u0647\u064F\u0645\u064E\u0627", bare: "\u0647\u0645\u0627", tr: "humā",
    label: "3dual obj.", interpretations: [
      { english: "them two", animate: true },
      { english: "the two of them", animate: false },
    ] },
  { ar: "\u0647\u064F\u0645\u0652", bare: "\u0647\u0645", tr: "hum",
    label: "3mp obj.", interpretations: [
      { english: "them (m. pl.)", animate: true },
      { english: "them", animate: false, note: "inanimate m. pl." },
    ] },
  { ar: "\u0643\u064F\u0646\u0651\u064E", bare: "\u0643\u0646", tr: "kunna",
    label: "2fp obj.", interpretations: [{ english: "you (f. pl.)", animate: true }] },
  { ar: "\u0643\u064F\u0645\u064E\u0627", bare: "\u0643\u0645\u0627", tr: "kumā",
    label: "2dual obj.", interpretations: [{ english: "you two", animate: true }] },
  { ar: "\u0643\u064F\u0645\u0652", bare: "\u0643\u0645", tr: "kum",
    label: "2mp obj.", interpretations: [{ english: "you (m. pl.)", animate: true }] },
  { ar: "\u0646\u0650\u064A\u064E", bare: "\u0646\u064A\u0647", tr: "niya",
    label: "1s obj.", interpretations: [{ english: "me", animate: true }] },
  { ar: "\u0646\u0650\u064A", bare: "\u0646\u064A", tr: "nī",
    label: "1s obj.", interpretations: [{ english: "me", animate: true }] },
  { ar: "\u0646\u064E\u0627", bare: "\u0646\u0627", tr: "nā",
    label: "1p obj.", interpretations: [{ english: "us", animate: true }] },
  { ar: "\u0647\u064E\u0627", bare: "\u0647\u0627", tr: "hā",
    label: "3fs obj.", interpretations: [
      { english: "her", animate: true },
      { english: "it", animate: false, note: "inanimate f." },
    ] },
  { ar: "\u0647\u064F", bare: "\u0647", tr: "hu",
    label: "3ms obj.", interpretations: [
      { english: "him", animate: true },
      { english: "it", animate: false, note: "inanimate m." },
    ] },
  { ar: "\u0643\u064E", bare: "\u0643", tr: "ka",
    label: "2ms obj.", interpretations: [{ english: "you (m.)", animate: true }] },
  { ar: "\u0643\u0650", bare: "\u0643", tr: "ki",
    label: "2fs obj.", interpretations: [{ english: "you (f.)", animate: true }] },
];

// ── Present-tense subject suffixes ─────────────────────────────────────────
interface PresSubjSuffix {
  ar:   string;
  bare: string;
  tr:   string;
  en:   string;
  plural: boolean;
}

// Longest first
const PRES_SUBJ_SUFFIXES: PresSubjSuffix[] = [
  { ar: "\u0648\u0646\u064E", bare: "\u0648\u0646", tr: "ūna", en: "they (m. pl.)", plural: true  },
  { ar: "\u0627\u0646\u0650", bare: "\u0627\u0646", tr: "āni", en: "they two",      plural: true  },
  { ar: "\u064A\u0646\u064E", bare: "\u064A\u0646", tr: "īna", en: "they (f. pl.)", plural: true  },
  { ar: "\u0646\u064E",       bare: "\u0646",        tr: "na",  en: "they (f. pl.)", plural: true  },
];

// ── Past-tense subject suffixes ────────────────────────────────────────────
interface PastSubjSuffix {
  ar:   string;
  bare: string;
  tr:   string;
  en:   string;
  indep: string;
  indepTr: string;
  requireSukunBefore?: boolean;
  plural: boolean;
}

const PAST_SUBJ_SUFFIXES: PastSubjSuffix[] = [
  { ar: "\u062A\u064F\u0645\u064E\u0627", bare: "\u062A\u0645\u0627", tr: "tumā",
    en: "you two", indep: "\u0623\u064E\u0646\u0652\u062A\u064F\u0645\u064E\u0627", indepTr: "antumā", plural: false },
  { ar: "\u062A\u064F\u0645\u0652", bare: "\u062A\u0645", tr: "tum",
    en: "you (m. pl.)", indep: "\u0623\u064E\u0646\u0652\u062A\u064F\u0645\u0652", indepTr: "antum", plural: true },
  { ar: "\u062A\u064F\u0646\u0651\u064E", bare: "\u062A\u0646", tr: "tunna",
    en: "you (f. pl.)", indep: "\u0623\u064E\u0646\u0652\u062A\u064F\u0646\u0651\u064E", indepTr: "antunna", plural: true },
  // نَا "we" — only when preceded by SUKUN (كَتَبْنَا) not FATHA (كَتَبَنَا = obj "us")
  { ar: "\u0646\u064E\u0627", bare: "\u0646\u0627", tr: "nā",
    en: "we", indep: "\u0646\u064E\u062D\u0652\u0646\u064F", indepTr: "naḥnu",
    requireSukunBefore: true, plural: true },
  { ar: "\u062A\u064E\u0627", bare: "\u062A\u0627", tr: "tā",
    en: "they two (f.)", indep: "\u0647\u064F\u0645\u064E\u0627", indepTr: "humā", plural: false },
  // وا / وْا — 3mp past (standalone)
  { ar: "\u0648\u0652\u0627", bare: "\u0648\u0627", tr: "ū",
    en: "they (m. pl.)", indep: "\u0647\u064F\u0645\u0652", indepTr: "hum", plural: true },
  { ar: "\u0648\u064E\u0627", bare: "\u0648\u0627", tr: "ū",
    en: "they (m. pl.)", indep: "\u0647\u064F\u0645\u0652", indepTr: "hum", plural: true },
  // وُ / و — 3mp past with elided alef before object suffix (كَتَبُوهُ)
  { ar: "\u064F\u0648", bare: "\u0648", tr: "ū",
    en: "they (m. pl.)", indep: "\u0647\u064F\u0645\u0652", indepTr: "hum", plural: true },
  { ar: "\u062A\u064F", bare: "\u062A", tr: "tu",
    en: "I", indep: "\u0623\u064E\u0646\u064E\u0627", indepTr: "anā", plural: false },
  { ar: "\u062A\u064E", bare: "\u062A", tr: "ta",
    en: "you (m.)", indep: "\u0623\u064E\u0646\u0652\u062A\u064E", indepTr: "anta", plural: false },
  { ar: "\u062A\u0650", bare: "\u062A", tr: "ti",
    en: "you (f.)", indep: "\u0623\u064E\u0646\u0652\u062A\u0650", indepTr: "anti", plural: false },
  { ar: "\u062A\u0652", bare: "\u062A", tr: "t",
    en: "she", indep: "\u0647\u0650\u064A\u064E", indepTr: "hiya", plural: false },
  { ar: "\u062A", bare: "\u062A", tr: "t",
    en: "she", indep: "\u0647\u0650\u064A\u064E", indepTr: "hiya", plural: false },
];

const SUBJ_3MS = {
  en: "he", indep: "\u0647\u064F\u0648\u064E", indepTr: "huwa", from: "implied" as const, plural: false,
};

// ── Present-tense personal prefixes ───────────────────────────────────────
interface PresPrefix {
  ar:   string;
  bare: string;
  tr:   string;
  hasDamma: boolean;    // true → subject prefix with damma (II/III/IV pattern)
  subjects: Array<{ en: string; indep: string; indepTr: string; plural: boolean }>;
}

const PRES_PREFIXES: PresPrefix[] = [
  { ar: "\u064A\u064E", bare: "\u064A", tr: "ya-", hasDamma: false,
    subjects: [{ en: "he", indep: "\u0647\u064F\u0648\u064E", indepTr: "huwa", plural: false }] },
  { ar: "\u064A\u064F", bare: "\u064A", tr: "yu-", hasDamma: true,
    subjects: [{ en: "he", indep: "\u0647\u064F\u0648\u064E", indepTr: "huwa", plural: false }] },
  { ar: "\u062A\u064E", bare: "\u062A", tr: "ta-", hasDamma: false,
    subjects: [
      { en: "she",      indep: "\u0647\u0650\u064A\u064E",           indepTr: "hiya",  plural: false },
      { en: "you (m.)", indep: "\u0623\u064E\u0646\u0652\u062A\u064E", indepTr: "anta",  plural: false },
    ] },
  { ar: "\u062A\u064F", bare: "\u062A", tr: "tu-", hasDamma: true,
    subjects: [
      { en: "she",      indep: "\u0647\u0650\u064A\u064E",           indepTr: "hiya",  plural: false },
      { en: "you (m.)", indep: "\u0623\u064E\u0646\u0652\u062A\u064E", indepTr: "anta",  plural: false },
    ] },
  { ar: "\u0623\u064E", bare: "\u0623", tr: "a-",  hasDamma: false,
    subjects: [{ en: "I",  indep: "\u0623\u064E\u0646\u064E\u0627", indepTr: "anā", plural: false }] },
  { ar: "\u0646\u064E", bare: "\u0646", tr: "na-", hasDamma: false,
    subjects: [{ en: "we", indep: "\u0646\u064E\u062D\u0652\u0646\u064F", indepTr: "naḥnu", plural: true }] },
];

// ── Result types ───────────────────────────────────────────────────────────
export type PartRole = "prefix" | "stem" | "subject_suffix" | "object_suffix" | "future_marker" | "pres_subj_suffix";

export interface ParsedPart {
  arabic:          string;
  transliteration: string;
  role:            PartRole;
  label:           string;
  hint:            string;
}

export interface SubjectInfo {
  english:         string;
  arabic:          string;
  transliteration: string;
  from:            "prefix" | "suffix" | "implied";
  ambiguous:       boolean;
  alternates?:     string[];
  plural:          boolean;
}

export interface DerivationStep {
  arabic:          string;
  transliteration: string;
  label:           string;        // "root", "base verb", "present stem", "inflected"
  description:     string;        // e.g. "Form X  •  اِسْتَفْعَلَ"
}

export interface AffixEntry {
  arabic:  string;
  tr:      string;
  role:    string;
  label:   string;
  meaning: string;
}

export interface DerivationData {
  root:          string[];
  rootStr:       string;
  rootGloss?:    string;
  form:          string;
  formPattern:   string;
  formNote:      string;
  baseVerb:      string;
  baseVerbTr:    string;
  baseVerbGloss?: string;
  prestem:       string;
  prestemTr:     string;
  affixes:       AffixEntry[];
  chain:         DerivationStep[];
  verbClass?:    string;
}

export interface SentenceParseResult {
  word:            string;
  success:         boolean;
  error?:          string;
  tense:           "past" | "present" | "unknown";
  isFuture:        boolean;
  parts:           ParsedPart[];
  subject:         SubjectInfo | null;
  stem:            { arabic: string; transliteration: string };
  verbGloss?:      string;
  object: {
    arabic:          string;
    transliteration: string;
    label:           string;
    interpretations: Interpretation[];
  } | null;
  interpretations: string[];
  derivation:      DerivationData | null;
  tokenAnalysis?:  TokenAnalysis;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function bare(s: string): string { return stripDiacritics(s); }

function glossFromStem(stemBare: string): string | undefined {
  const cleaned = stemBare.replace(/\s/g, "");
  if (cleaned.length < 2) return undefined;
  return lookupRoot(cleaned)?.gloss;
}

function glossFromRoots(roots: string[]): string | undefined {
  if (roots.length < 2) return undefined;
  const key = roots.join("");
  return lookupRoot(key)?.gloss;
}

function buildSentence(
  subject: string, verbGloss: string | undefined,
  tense: "past" | "present", isFuture: boolean,
  object: string, plural: boolean,
): string {
  const subj = subject.charAt(0).toUpperCase() + subject.slice(1);
  const vb = verbGloss ? verbForm(verbGloss, tense, plural) : "[verb]";
  const fut = isFuture ? "will " : "";
  return `${subj} ${fut}${vb} ${object}.`;
}

// ── Main parser ────────────────────────────────────────────────────────────
export function parseSentenceWord(word: string): SentenceParseResult {

  const cleaned = word.replace(/[^\u0600-\u06FF]/gu, "").trim();
  const bareWord = bare(cleaned);

  if (!cleaned || bareWord.length < 3) {
    return {
      word, success: false, tense: "unknown", isFuture: false,
      parts: [], subject: null,
      stem: { arabic: "", transliteration: "" },
      object: null, interpretations: [], derivation: null,
      error: "Enter a vocalized Arabic verb with an attached pronoun (e.g. كَتَبَهَا).",
    };
  }

  // ── STEP 1  Strip object suffix ──────────────────────────────────────────
  let objSuf: ObjSuffix | null = null;
  let afterObj = cleaned;
  let afterObjBare = bareWord;

  for (const suf of OBJ_SUFFIXES) {
    if (cleaned.endsWith(suf.ar)) {
      const before = cleaned.slice(0, cleaned.length - suf.ar.length);
      if (bare(before).length < 2) continue;
      objSuf = suf; afterObj = before; afterObjBare = bare(before); break;
    }
    if (suf.bare && bareWord.endsWith(suf.bare)) {
      const beforeBare = bareWord.slice(0, bareWord.length - suf.bare.length);
      if (beforeBare.length < 2) continue;
      if (suf.bare === "\u0647" && beforeBare.length < 2) continue;
      objSuf = suf; afterObjBare = beforeBare;
      afterObj = cleaned.slice(0, cleaned.length - suf.bare.length); break;
    }
  }

  if (!objSuf) {
    return {
      word: cleaned, success: false, tense: "unknown", isFuture: false,
      parts: [], subject: null,
      stem: { arabic: cleaned, transliteration: transliterate(cleaned) },
      object: null, interpretations: [], derivation: null,
      error: "No attached object pronoun found. Try a word like كَتَبَهَا or يَكْتُبُهَا.",
    };
  }

  // ── STEP 2  Detect future marker سَ (before the present prefix) ──────────
  let isFuture = false;
  let afterFuture = afterObj;
  let afterFutureBare = afterObjBare;
  const SIN = "\u0633";

  if (afterObjBare.startsWith(SIN) && afterObjBare.length >= 4) {
    const next = afterObjBare[1];
    if (next === "\u064A" || next === "\u062A" || next === "\u0623" || next === "\u0646") {
      const wholeLex = lookupRoot(afterObjBare) || getFormILexiconEntry(normalizeInput(afterObjBare));
      if (wholeLex) {
        // سأل etc: the whole stem is a known verb in lexicon — don't strip future marker
      } else {
        isFuture = true;
        afterFuture = afterObj.startsWith("\u0633") ? afterObj.slice(1) : afterObj.slice(1);
        afterFutureBare = afterObjBare.slice(1);
      }
    }
  }

  // ── STEP 3  Detect tense / present prefix ─────────────────────────────────
  let tense: "past" | "present" = "past";
  let presPrefix: PresPrefix | null = null;
  let stemDiac = afterFuture;
  let stemBareLocal = afterFutureBare;

  for (const pfx of PRES_PREFIXES) {
    if (afterFutureBare.startsWith(pfx.bare)) {
      // Verify diacritized prefix if possible
      tense = "present";
      presPrefix = pfx;
      stemDiac = afterFuture.startsWith(pfx.ar)
        ? afterFuture.slice(pfx.ar.length)
        : afterFuture.slice(pfx.bare.length);
      stemBareLocal = afterFutureBare.slice(pfx.bare.length);
      break;
    }
  }

  // ── STEP 4  Strip present subject suffixes (ونَ, انِ, ينَ, نَ) ────────────
  let presSubjSuf: PresSubjSuffix | null = null;
  if (tense === "present") {
    for (const suf of PRES_SUBJ_SUFFIXES) {
      if (stemBareLocal.endsWith(suf.bare) && stemBareLocal.length - suf.bare.length >= 2) {
        presSubjSuf = suf;
        stemDiac = stemDiac.endsWith(suf.ar)
          ? stemDiac.slice(0, stemDiac.length - suf.ar.length)
          : stemDiac.slice(0, stemDiac.length - suf.bare.length);
        stemBareLocal = stemBareLocal.slice(0, stemBareLocal.length - suf.bare.length);
        break;
      }
    }
  }

  // ── STEP 5  Strip past subject suffixes ───────────────────────────────────
  let pastSubjSuf: PastSubjSuffix | null = null;
  if (tense === "past") {
    for (const suf of PAST_SUBJ_SUFFIXES) {
      if (!suf.bare || !afterObjBare.endsWith(suf.bare)) continue;
      const beforeBare = afterObjBare.slice(0, afterObjBare.length - suf.bare.length);
      if (beforeBare.length < 1) continue;
      if (suf.requireSukunBefore) {
        const beforeDiac = afterObj.slice(0, afterObj.length - suf.ar.length);
        if (!beforeDiac.endsWith(SUKUN)) continue;
      }
      pastSubjSuf = suf;
      stemDiac = afterObj.endsWith(suf.ar)
        ? afterObj.slice(0, afterObj.length - suf.ar.length)
        : afterObj.slice(0, afterObj.length - suf.bare.length);
      stemBareLocal = beforeBare;
      break;
    }
  }

  // ── STEP 6  Form detection and root extraction ────────────────────────────
  let formInfo: FormDetectionResult | null = null;
  try {
    if (tense === "present") {
      const hasDamma = presPrefix?.hasDamma ?? false;
      formInfo = detectFormFromPresent(stemDiac, hasDamma);
    } else {
      formInfo = detectFormFromPast(stemDiac);
    }
  } catch (_) {
    formInfo = null;
  }

  // ── STEP 6b  Central engine analysis ─────────────────────────────────────
  const engineInput = formInfo && formInfo.roots.length >= 3
    ? formInfo.roots.join("")
    : stemBareLocal;
  let stemAnalysis = analyzeToken(engineInput);
  if (stemAnalysis.confidence !== "high" && stemBareLocal !== engineInput) {
    const altAnalysis = analyzeToken(stemBareLocal);
    if (altAnalysis.confidence === "high" || 
        (altAnalysis.confidence === "medium" && stemAnalysis.confidence === "low")) {
      stemAnalysis = altAnalysis;
    }
  }
  if (stemAnalysis.confidence !== "high") {
    const altRaw = analyzeToken(stemDiac);
    if (altRaw.confidence === "high" || 
        (altRaw.confidence === "medium" && stemAnalysis.confidence === "low")) {
      stemAnalysis = altRaw;
    }
  }

  // ── STEP 7  Lexicon gloss lookup (prefer engine, fallback to local) ─────
  const engineGloss = stemAnalysis.gloss || undefined;
  const localGloss = formInfo && formInfo.roots.length > 0
    ? glossFromRoots(formInfo.roots)
    : glossFromStem(stemBareLocal);
  const rootGloss = engineGloss || localGloss;

  const verbGloss = rootGloss;

  // ── STEP 8  Build subject info ────────────────────────────────────────────
  let subjectPlural = false;
  let subject: SubjectInfo;

  if (tense === "present" && presPrefix) {
    const subs = presPrefix.subjects;
    // Refine with presSubjSuf if available (e.g. ونَ tells us 3mp not 3ms)
    const effSubs = presSubjSuf
      ? [{ en: presSubjSuf.en, indep: subs[0]!.indep, indepTr: subs[0]!.indepTr, plural: presSubjSuf.plural }]
      : subs;
    subjectPlural = effSubs[0]?.plural ?? false;
    subject = {
      english:        effSubs[0]!.en,
      arabic:         effSubs[0]!.indep,
      transliteration: effSubs[0]!.indepTr,
      from:           "prefix",
      ambiguous:      !presSubjSuf && subs.length > 1,
      alternates:     (!presSubjSuf && subs.length > 1) ? subs.slice(1).map(s => s.en) : undefined,
      plural:         subjectPlural,
    };
  } else if (pastSubjSuf) {
    subjectPlural = pastSubjSuf.plural;
    subject = {
      english:        pastSubjSuf.en,
      arabic:         pastSubjSuf.indep,
      transliteration: pastSubjSuf.indepTr,
      from:           "suffix",
      ambiguous:      false,
      plural:         subjectPlural,
    };
  } else {
    subject = {
      english:        SUBJ_3MS.en,
      arabic:         SUBJ_3MS.indep,
      transliteration: SUBJ_3MS.indepTr,
      from:           "implied",
      ambiguous:      false,
      plural:         false,
    };
  }

  // ── STEP 9  Build parts array (color-coded segments) ─────────────────────
  const parts: ParsedPart[] = [];

  if (isFuture) {
    parts.push({
      arabic: "\u0633", transliteration: "sa-",
      role: "future_marker", label: "Future", hint: "will",
    });
  }

  if (tense === "present" && presPrefix) {
    const pfxDiac = afterFuture.startsWith(presPrefix.ar) ? presPrefix.ar : presPrefix.bare;
    parts.push({
      arabic:          pfxDiac,
      transliteration: presPrefix.tr,
      role:            "prefix",
      label:           "Subject Prefix",
      hint:            subject.ambiguous
        ? [subject.english, ...(subject.alternates ?? [])].join(" / ")
        : subject.english,
    });
  }

  parts.push({
    arabic:          stemDiac || afterObj,
    transliteration: transliterate(stemDiac || afterObj),
    role:            "stem",
    label:           formInfo ? `Form ${formInfo.form} Stem` : "Verb Stem",
    hint:            verbGloss ?? "",
  });

  if (presSubjSuf) {
    const sufDiac = stemDiac.endsWith(presSubjSuf.ar) ? "" : "";
    parts.push({
      arabic:          presSubjSuf.ar,
      transliteration: presSubjSuf.tr,
      role:            "pres_subj_suffix",
      label:           "Subject Marker",
      hint:            presSubjSuf.en,
    });
  }

  if (pastSubjSuf) {
    const sufDiac = afterObj.endsWith(pastSubjSuf.ar) ? pastSubjSuf.ar : pastSubjSuf.bare;
    parts.push({
      arabic:          sufDiac,
      transliteration: pastSubjSuf.tr,
      role:            "subject_suffix",
      label:           "Subject Marker",
      hint:            pastSubjSuf.en,
    });
  }

  parts.push({
    arabic:          objSuf.ar,
    transliteration: objSuf.tr,
    role:            "object_suffix",
    label:           "Object Pronoun",
    hint:            objSuf.interpretations.map(i => i.english).join(" / "),
  });

  // ── STEP 10  Build derivation chain ──────────────────────────────────────
  let derivation: SentenceParseResult["derivation"] = null;

  if (formInfo && formInfo.form !== "?") {
    const rootGlossText = rootGloss ?? undefined;
    const baseVerbGloss = rootGlossText;
    const affixes: AffixEntry[] = [];

    // Build affix list in logical order (structural outer → inner → suffix)
    if (isFuture) {
      affixes.push({ arabic: "سـ", tr: "sa-", role: "future_marker", label: "Future marker", meaning: "will" });
    }
    if (presPrefix) {
      affixes.push({
        arabic: presPrefix.ar, tr: presPrefix.tr, role: "subject_prefix",
        label: `Subject prefix`,
        meaning: subject.ambiguous
          ? [subject.english, ...(subject.alternates ?? [])].join(" / ")
          : subject.english,
      });
    }
    if (presSubjSuf) {
      affixes.push({ arabic: presSubjSuf.ar, tr: presSubjSuf.tr, role: "subject_suffix", label: "Subject suffix", meaning: presSubjSuf.en });
    }
    if (pastSubjSuf) {
      affixes.push({ arabic: pastSubjSuf.ar, tr: pastSubjSuf.tr, role: "subject_suffix", label: "Subject suffix", meaning: pastSubjSuf.en });
    }
    affixes.push({
      arabic: objSuf.ar, tr: objSuf.tr, role: "object_pronoun", label: "Object pronoun",
      meaning: objSuf.interpretations.map(i => i.english).join(" / "),
    });

    // Derivation chain steps
    const chain: DerivationStep[] = [];

    chain.push({
      arabic:          formInfo.rootStr,
      transliteration: formInfo.roots.map(r => transliterate(r)).join("-"),
      label:           "Root",
      description:     rootGlossText ? `(${rootGlossText})` : "root consonants",
    });

    chain.push({
      arabic:          formInfo.baseVerb,
      transliteration: formInfo.baseVerbTr,
      label:           `Form ${formInfo.form} base verb`,
      description:     formInfo.meta?.patternPast ?? "",
    });

    if (tense === "present") {
      chain.push({
        arabic:          formInfo.prestem,
        transliteration: formInfo.prestemTr,
        label:           "Present stem (3ms)",
        description:     formInfo.meta?.patternPres ?? "",
      });
    }

    // Build the inflected form without object suffix (full subject form)
    const inflectedWithoutObj = (() => {
      let s = "";
      if (isFuture) s += "\u0633";
      if (presPrefix) s += presPrefix.ar;
      s += stemDiac;
      if (presSubjSuf) s += presSubjSuf.ar;
      if (pastSubjSuf) s += pastSubjSuf.ar;
      return s;
    })();

    chain.push({
      arabic:          inflectedWithoutObj,
      transliteration: transliterate(inflectedWithoutObj),
      label:           "Inflected form",
      description:     `+ ${objSuf.label}: ${objSuf.interpretations.map(i => i.english).join(" / ")}`,
    });

    chain.push({
      arabic:          cleaned,
      transliteration: transliterate(cleaned),
      label:           "Full word",
      description:     "complete form with object pronoun",
    });

    derivation = {
      root:          formInfo.roots,
      rootStr:       formInfo.rootStr,
      rootGloss:     rootGlossText,
      form:          formInfo.form,
      formPattern:   formInfo.meta?.patternPast ?? "",
      formNote:      formInfo.meta?.semanticNote ?? "",
      baseVerb:      formInfo.baseVerb,
      baseVerbTr:    formInfo.baseVerbTr,
      baseVerbGloss: baseVerbGloss,
      prestem:       formInfo.prestem,
      prestemTr:     formInfo.prestemTr,
      affixes,
      chain,
      verbClass:     stemAnalysis.verbClass ?? undefined,
    };
  }

  // ── STEP 11  Build interpretation sentences ───────────────────────────────
  const interpretations: string[] = [];
  const allSubjects: Array<{ en: string; plural: boolean }> = [{ en: subject.english, plural: subject.plural }];
  if (subject.ambiguous && subject.alternates) {
    allSubjects.push(...subject.alternates.map(a => ({ en: a, plural: false })));
  }

  for (const subj of allSubjects) {
    for (const interp of objSuf.interpretations) {
      interpretations.push(buildSentence(subj.en, verbGloss, tense, isFuture, interp.english, subj.plural));
    }
  }

  return {
    word:    cleaned,
    success: true,
    tense,
    isFuture,
    parts,
    subject,
    stem:    { arabic: stemDiac || afterObj, transliteration: transliterate(stemDiac || afterObj) },
    verbGloss,
    object:  {
      arabic:          objSuf.ar,
      transliteration: objSuf.tr,
      label:           objSuf.label,
      interpretations: objSuf.interpretations,
    },
    interpretations,
    derivation,
    tokenAnalysis: stemAnalysis,
  };
}
