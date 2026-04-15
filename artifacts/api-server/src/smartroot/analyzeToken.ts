import { normalizeInput, getFormILexiconEntry, resolveInflectedForm, getFormIByMasdar } from "./form1Lexicon.js";
import { lookupRoot } from "./lexicon.js";
import { classifyRoot, type RootType, type ClassificationResult } from "./rootClassifier.js";
import { stripDiacritics, normalizeRoot } from "./normalization.js";
import { transliterate } from "./transliterate.js";
import { lookupFormIIGloss } from "./form2lexicon.js";
import { lookupFormIIIGloss } from "./form3lexicon.js";
import { lookupFormIVGloss } from "./form4lexicon.js";
import { lookupFormVGloss } from "./form5lexicon.js";
import { lookupFormVIGloss } from "./form6lexicon.js";
import { lookupFormVIIGloss } from "./form7lexicon.js";
import { lookupFormVIIIGloss } from "./form8lexicon.js";
import { lookupFormXGloss } from "./form10lexicon.js";

export type POS = "verb" | "noun" | "adjective" | "particle" | "pronoun" | "proper_noun" | "unknown";
export type VerbClass = "sound" | "hollow" | "defective" | "assimilated" | "doubled" | "hamzated";
export type Confidence = "high" | "medium" | "low";
export type AnalysisSource = "lexicon" | "morphology_rule" | "fallback";

export interface TokenFeatures {
  tense?: "past" | "present" | "imperative" | "future";
  person?: number;
  number?: "singular" | "dual" | "plural";
  gender?: "masculine" | "feminine";
  voice?: "active" | "passive";
}

export interface TokenAnalysis {
  surface: string;
  normalized: string;
  lemma: string;
  root: string;
  pos: POS;
  form: number | null;
  verbClass: VerbClass | null;
  features: TokenFeatures;
  gloss: string;
  confidence: Confidence;
  source: AnalysisSource;
  notes: string[];
}

const HAMZA_CHARS = new Set([
  "\u0621",
  "\u0623",
  "\u0625",
  "\u0624",
  "\u0626",
]);

const DIACRITICS_RE = /[\u064B-\u065F\u0670]/g;

function isDiacritic(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return (c >= 0x064B && c <= 0x065F) || c === 0x0670;
}

const AL_PREFIX_RE = /^(\u0627\u0644)/;

const PRESENT_PREFIXES = new Set([
  "\u064A",
  "\u062A",
  "\u0623",
  "\u0646",
]);

const FUTURE_MARKERS = [
  "\u0633\u0648\u0641",
  "\u0633",
];

const PAST_SUFFIX_PATTERNS: Array<{ suffix: string; person: number; number: "singular" | "dual" | "plural"; gender: "masculine" | "feminine" }> = [
  { suffix: "\u062A\u0645\u0627", person: 2, number: "dual", gender: "masculine" },
  { suffix: "\u062A\u0645", person: 2, number: "plural", gender: "masculine" },
  { suffix: "\u062A\u0646", person: 2, number: "plural", gender: "feminine" },
  { suffix: "\u0646\u0627", person: 1, number: "plural", gender: "masculine" },
  { suffix: "\u0648\u0627", person: 3, number: "plural", gender: "masculine" },
  { suffix: "\u062A", person: 1, number: "singular", gender: "masculine" },
];

const PARTICLES = new Set([
  "\u0641\u064A",
  "\u0645\u0646",
  "\u0625\u0644\u0649",
  "\u0639\u0644\u0649",
  "\u0639\u0646",
  "\u0628",
  "\u0644",
  "\u0643",
  "\u0648",
  "\u0641",
  "\u062B\u0645",
  "\u0623\u0648",
  "\u0623\u0645",
  "\u0623\u0646",
  "\u0625\u0646",
  "\u0623\u0646\u0651",
  "\u0625\u0646\u0651",
  "\u0644\u0643\u0646",
  "\u0644\u0643\u0646\u0651",
  "\u0644\u0627",
  "\u0644\u0645",
  "\u0644\u0646",
  "\u0642\u062F",
  "\u0647\u0644",
  "\u0645\u0627",
  "\u0644\u064A\u0633",
  "\u062D\u062A\u0649",
  "\u0645\u0639",
  "\u0628\u064A\u0646",
  "\u0639\u0646\u062F",
  "\u0642\u0628\u0644",
  "\u0628\u0639\u062F",
  "\u0641\u0648\u0642",
  "\u062A\u062D\u062A",
  "\u0623\u0645\u0627\u0645",
  "\u062E\u0644\u0641",
]);

const PRONOUNS_AR = new Set([
  "\u0647\u0648",
  "\u0647\u064A",
  "\u0647\u0645",
  "\u0647\u0646",
  "\u0647\u0645\u0627",
  "\u0623\u0646\u062A",
  "\u0623\u0646\u062A\u0650",
  "\u0623\u0646\u062A\u0645",
  "\u0623\u0646\u062A\u0646",
  "\u0623\u0646\u062A\u0645\u0627",
  "\u0623\u0646\u0627",
  "\u0646\u062D\u0646",
]);

function rootTypeToVerbClass(rt: RootType): VerbClass {
  if (rt === "regular") return "sound";
  if (rt === "hollow_waw" || rt === "hollow_ya") return "hollow";
  if (rt === "defective_waw" || rt === "defective_ya") return "defective";
  if (rt === "assimilated") return "assimilated";
  if (rt === "doubled") return "doubled";
  if (rt === "hamzated") return "hamzated";
  return "sound";
}

function hasHamza(r1: string, r2: string, r3: string): boolean {
  return HAMZA_CHARS.has(r1) || HAMZA_CHARS.has(r2) || HAMZA_CHARS.has(r3);
}

function stripArabicDiacritics(s: string): string {
  return s.replace(DIACRITICS_RE, "");
}

function resolveVerbClass(cls: { type: RootType; r1: string; r2: string; r3: string; normalized: string }): VerbClass {
  let vc = rootTypeToVerbClass(cls.type);
  if (vc === "sound" && hasHamza(cls.r1, cls.r2, cls.r3)) vc = "hamzated";
  const lexF1 = getFormILexiconEntry(normalizeInput(cls.normalized));
  if (lexF1?.rootType) {
    const lexVc = rootTypeToVerbClass(lexF1.rootType);
    if (lexVc !== "sound") vc = lexVc;
  }
  return vc;
}

function resolveGloss(normalized: string): string {
  const lexF1 = getFormILexiconEntry(normalizeInput(normalized));
  const lexR = lookupRoot(normalized);
  return lexF1?.gloss || lexR?.gloss || "";
}

function tryPresentPrefix(stem: string, tense: "present" | "future", base: TokenAnalysis, notes: string[]): TokenAnalysis | null {
  if (stem.length < 3) return null;
  const firstChar = stem[0]!;
  if (!PRESENT_PREFIXES.has(firstChar)) return null;
  const innerStem = stem.slice(1);
  if (innerStem.length < 2) return null;

  const lexDirect = getFormILexiconEntry(normalizeInput(innerStem));
  if (lexDirect) {
    const cls = classifyRoot(lexDirect.canonicalKey);
    let vc: VerbClass = "sound";
    if (cls) {
      vc = rootTypeToVerbClass(lexDirect.rootType || cls.type);
      if (vc === "sound" && hasHamza(lexDirect.r1 || cls.r1, lexDirect.r2 || cls.r2, lexDirect.r3 || cls.r3)) vc = "hamzated";
    }
    notes.push(`${tense === "future" ? "Future" : "Present"}-tense prefix ${firstChar} detected.`);
    return {
      ...base,
      pos: "verb",
      lemma: lexDirect.canonicalKey,
      root: cls?.normalized || innerStem,
      form: 1,
      verbClass: vc,
      gloss: lexDirect.gloss,
      confidence: "high",
      source: "lexicon",
      features: { tense, voice: "active" },
      notes,
    };
  }

  const innerClass = classifyRoot(innerStem);
  if (innerClass) {
    const vc = resolveVerbClass(innerClass);
    const gloss = resolveGloss(innerClass.normalized);
    notes.push(`${tense === "future" ? "Future" : "Present"}-tense prefix ${firstChar} detected.`);
    return {
      ...base,
      pos: "verb",
      lemma: innerClass.normalized,
      root: innerClass.normalized,
      form: innerClass.form,
      verbClass: vc,
      gloss,
      confidence: gloss ? "high" : "medium",
      source: gloss ? "lexicon" : "morphology_rule",
      features: { tense, voice: "active" },
      notes,
    };
  }
  return null;
}

function tryPastSuffix(stripped: string, base: TokenAnalysis, notes: string[]): TokenAnalysis | null {
  if (stripped.length < 4) return null;
  for (const sp of PAST_SUFFIX_PATTERNS) {
    if (!stripped.endsWith(sp.suffix)) continue;
    const stem = stripped.slice(0, stripped.length - sp.suffix.length);
    if (stem.length < 3) continue;

    const lexDirect = getFormILexiconEntry(normalizeInput(stem));
    if (lexDirect) {
      const cls = classifyRoot(lexDirect.canonicalKey);
      let vc: VerbClass = "sound";
      if (cls) {
        vc = rootTypeToVerbClass(lexDirect.rootType || cls.type);
        if (vc === "sound" && hasHamza(lexDirect.r1 || cls.r1, lexDirect.r2 || cls.r2, lexDirect.r3 || cls.r3)) vc = "hamzated";
      }
      notes.push(`Past suffix ${sp.suffix} detected.`);
      return {
        ...base,
        pos: "verb",
        lemma: lexDirect.canonicalKey,
        root: cls?.normalized || stem,
        form: 1,
        verbClass: vc,
        gloss: lexDirect.gloss,
        confidence: "high",
        source: "lexicon",
        features: { tense: "past", person: sp.person, number: sp.number, gender: sp.gender, voice: "active" },
        notes,
      };
    }

    const innerClass = classifyRoot(stem);
    if (innerClass) {
      const vc = resolveVerbClass(innerClass);
      const gloss = resolveGloss(innerClass.normalized);
      notes.push(`Past suffix ${sp.suffix} detected.`);
      return {
        ...base,
        pos: "verb",
        lemma: innerClass.normalized,
        root: innerClass.normalized,
        form: innerClass.form,
        verbClass: vc,
        gloss,
        confidence: gloss ? "high" : "medium",
        source: gloss ? "lexicon" : "morphology_rule",
        features: { tense: "past", person: sp.person, number: sp.number, gender: sp.gender, voice: "active" },
        notes,
      };
    }
  }
  return null;
}

const SHADDA = "\u0651";

function detectFormIIShadda(raw: string): boolean {
  const clean = raw.trim();
  let consonantIdx = 0;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]!;
    if (isDiacritic(ch)) {
      if (ch === SHADDA && consonantIdx === 2) return true;
      continue;
    }
    consonantIdx++;
  }
  return false;
}

export function analyzeToken(surface: string, _context?: string): TokenAnalysis {
  const notes: string[] = [];
  const stripped = stripArabicDiacritics(surface.trim());
  const normalized = normalizeRoot(surface.trim());
  const isFormII = detectFormIIShadda(surface.trim());

  const base: TokenAnalysis = {
    surface,
    normalized: stripped,
    lemma: stripped,
    root: "",
    pos: "unknown",
    form: null,
    verbClass: null,
    features: {},
    gloss: "",
    confidence: "low",
    source: "fallback",
    notes,
  };

  if (!stripped || stripped.length === 0) return base;

  if (PRONOUNS_AR.has(stripped)) {
    return {
      ...base,
      pos: "pronoun",
      lemma: stripped,
      confidence: "high",
      source: "morphology_rule",
      notes: ["Arabic personal pronoun"],
    };
  }

  if (PARTICLES.has(stripped)) {
    return {
      ...base,
      pos: "particle",
      lemma: stripped,
      confidence: "high",
      source: "morphology_rule",
      notes: ["Arabic particle/preposition"],
    };
  }

  if (AL_PREFIX_RE.test(stripped)) {
    notes.push("Definite article ال locks noun/adjective track.");
    const stem = stripped.replace(AL_PREFIX_RE, "");
    const lexEntry = getFormILexiconEntry(normalizeInput(stem));
    if (lexEntry) {
      return {
        ...base,
        pos: "noun",
        lemma: stripped,
        root: stem,
        gloss: lexEntry.gloss.replace(/^to /, ""),
        confidence: "high",
        source: "lexicon",
        notes,
      };
    }
    return {
      ...base,
      pos: "noun",
      lemma: stripped,
      root: stem,
      confidence: "medium",
      source: "morphology_rule",
      notes,
    };
  }

  let hasFutureMarker = false;
  let stemAfterFuture = stripped;
  for (const marker of FUTURE_MARKERS) {
    if (stripped.startsWith(marker) && stripped.length > marker.length + 2) {
      const afterMarker = stripped.slice(marker.length);
      if (afterMarker.length >= 2 && PRESENT_PREFIXES.has(afterMarker[0]!)) {
        stemAfterFuture = afterMarker;
        hasFutureMarker = true;
        notes.push(`Future marker ${marker} detected.`);
        break;
      }
    }
  }

  const workStem = hasFutureMarker ? stemAfterFuture : stripped;

  const lexNorm = normalizeInput(workStem);
  let lexEntry = getFormILexiconEntry(lexNorm);

  const ALEF_MADDA_CHAR = "\u0622";
  if (!lexEntry && workStem.includes(ALEF_MADDA_CHAR)) {
    const tryYa = workStem.replace(ALEF_MADDA_CHAR, "\u0623\u0649");
    const tryAlef = workStem.replace(ALEF_MADDA_CHAR, "\u0623\u0627");
    const lexYa = getFormILexiconEntry(normalizeInput(tryYa));
    const lexAlef = getFormILexiconEntry(normalizeInput(tryAlef));
    if (lexYa) {
      lexEntry = lexYa;
      notes.push(`Contracted alef-madda آ expanded to أى (${tryYa}).`);
    } else if (lexAlef) {
      lexEntry = lexAlef;
      notes.push(`Contracted alef-madda آ expanded to أا (${tryAlef}).`);
    }
  }

  if (lexEntry && !hasFutureMarker) {
    const classification = classifyRoot(lexEntry.canonicalKey);
    let vc: VerbClass = "sound";
    if (classification) {
      vc = rootTypeToVerbClass(lexEntry.rootType || classification.type);
      if (vc === "sound" && hasHamza(
        lexEntry.r1 || classification.r1,
        lexEntry.r2 || classification.r2,
        lexEntry.r3 || classification.r3,
      )) {
        vc = "hamzated";
      }
    }

    const isDoubled = vc === "doubled";
    const realFormII = isFormII && !isDoubled;
    const detectedForm = realFormII ? 2 : 1;
    if (realFormII) notes.push("Shadda on R2 detected — Form II override.");

    return {
      ...base,
      pos: "verb",
      lemma: lexEntry.canonicalKey,
      root: classification?.normalized || lexNorm,
      form: detectedForm,
      verbClass: vc,
      gloss: lexEntry.gloss,
      confidence: "high",
      source: "lexicon",
      features: { tense: "past", person: 3, number: "singular", gender: "masculine", voice: "active" },
      notes,
    };
  }

  const presentResult = tryPresentPrefix(workStem, hasFutureMarker ? "future" : "present", base, notes);
  if (presentResult) return presentResult;

  const pastSuffixResult = !hasFutureMarker ? tryPastSuffix(stripped, base, notes) : null;
  if (pastSuffixResult) return pastSuffixResult;

  const classification = classifyRoot(workStem);

  if (classification) {
    let vc = rootTypeToVerbClass(classification.type);
    if (vc === "sound" && hasHamza(classification.r1, classification.r2, classification.r3)) {
      vc = "hamzated";
    }

    const lexRoot = lookupRoot(classification.normalized);
    const lexF1 = getFormILexiconEntry(normalizeInput(classification.normalized));
    const gloss = lexRoot?.gloss || lexF1?.gloss || "";

    let tense: TokenFeatures["tense"] = "past";
    if (hasFutureMarker) {
      tense = "future";
    } else if (classification.form >= 2) {
      tense = "past";
    }

    return {
      ...base,
      pos: "verb",
      lemma: classification.normalized,
      root: classification.normalized,
      form: classification.form,
      verbClass: vc,
      gloss,
      confidence: gloss ? "high" : "medium",
      source: gloss ? "lexicon" : "morphology_rule",
      features: { tense, person: 3, number: "singular", gender: "masculine", voice: "active" },
      notes: [...notes, classification.explanation],
    };
  }

  return base;
}

export function classifyVerbClass(r1: string, r2: string, r3: string, rootType?: RootType): VerbClass {
  if (rootType) {
    const vc = rootTypeToVerbClass(rootType);
    if (vc !== "sound") return vc;
  }
  if (hasHamza(r1, r2, r3)) return "hamzated";
  if (r2 === r3) return "doubled";
  const WAW = "\u0648";
  const YA = "\u064A";
  const ALEF = "\u0627";
  if (r1 === WAW) return "assimilated";
  if (r2 === WAW || r2 === YA || r2 === ALEF) return "hollow";
  if (r3 === WAW || r3 === YA || r3 === ALEF) return "defective";
  return "sound";
}

function glossForFormNum(formNum: number, root3: string): string | null {
  switch (formNum) {
    case 1:  { const e = lookupRoot(root3); return e?.gloss ?? null; }
    case 2:  return lookupFormIIGloss(root3) ?? null;
    case 3:  return lookupFormIIIGloss(root3) ?? null;
    case 4:  return lookupFormIVGloss(root3) ?? null;
    case 5:  return lookupFormVGloss(root3) ?? null;
    case 6:  return lookupFormVIGloss(root3) ?? null;
    case 7:  return lookupFormVIIGloss(root3) ?? null;
    case 8:  return lookupFormVIIIGloss(root3) ?? null;
    case 10: return lookupFormXGloss(root3) ?? null;
    default: return null;
  }
}

const FORM_LABELS: Record<number, { ar: string; en: string }> = {
  1:  { ar: "\u0641\u0639\u0644", en: "Measure I" },
  2:  { ar: "\u0641\u0639\u0651\u0644", en: "Measure II" },
  3:  { ar: "\u0641\u0627\u0639\u0644", en: "Measure III" },
  4:  { ar: "\u0623\u0641\u0639\u0644", en: "Measure IV" },
  5:  { ar: "\u062A\u0641\u0639\u0651\u0644", en: "Measure V" },
  6:  { ar: "\u062A\u0641\u0627\u0639\u0644", en: "Measure VI" },
  7:  { ar: "\u0627\u0646\u0641\u0639\u0644", en: "Measure VII" },
  8:  { ar: "\u0627\u0641\u062A\u0639\u0644", en: "Measure VIII" },
  10: { ar: "\u0627\u0633\u062A\u0641\u0639\u0644", en: "Measure X" },
};

const DERIV_PRESENT_PREFIXES = ["\u064A", "\u062A", "\u0623", "\u0646"] as const;
const DERIV_PAST_SUFFIXES = ["\u062A\u0645", "\u062A\u0646", "\u0646\u0627", "\u0648\u0627", "\u062A", "\u0646"] as const;
const DERIV_PRESENT_SUFFIXES = ["\u0648\u0646", "\u064A\u0646", "\u0627\u0646", "\u0646"] as const;

export interface DerivedInflectionHit {
  root3: string;
  form: number;
  gloss: string | null;
  label: string;
  canonicalStem: string;
}

function tryClassifyDerived(stem: string): DerivedInflectionHit | null {
  const cls = classifyRoot(stem);
  if (!cls || cls.form < 2) return null;
  const gloss = glossForFormNum(cls.form, cls.normalized);
  return {
    root3: cls.normalized,
    form: cls.form,
    gloss,
    label: FORM_LABELS[cls.form]?.en ?? `Form ${cls.form}`,
    canonicalStem: stem,
  };
}

export function resolveDerivedInflection(input: string): DerivedInflectionHit | null {
  if (!input || input.length < 3) return null;
  const n = normalizeInput(input);

  const direct = tryClassifyDerived(n);
  if (direct) return direct;

  for (const pfx of DERIV_PRESENT_PREFIXES) {
    if (!n.startsWith(pfx) || n.length < 4) continue;
    const stem = n.slice(pfx.length);

    const candidates = [stem, "\u0627" + stem];
    for (const cand of candidates) {
      const hit = tryClassifyDerived(cand);
      if (hit) {
        hit.label = "\u0645\u0636\u0627\u0631\u0639 " + hit.label;
        return hit;
      }
    }

    for (const sfx of DERIV_PRESENT_SUFFIXES) {
      if (!stem.endsWith(sfx)) continue;
      const innerStem = stem.slice(0, stem.length - sfx.length);
      if (innerStem.length < 3) continue;
      const innerCandidates = [innerStem, "\u0627" + innerStem];
      for (const cand of innerCandidates) {
        const hit2 = tryClassifyDerived(cand);
        if (hit2) {
          hit2.label = "\u0645\u0636\u0627\u0631\u0639 " + hit2.label;
          return hit2;
        }
      }
    }
  }

  for (const sfx of DERIV_PAST_SUFFIXES) {
    if (!n.endsWith(sfx)) continue;
    const stem = n.slice(0, n.length - sfx.length);
    if (stem.length < 3) continue;
    const hit = tryClassifyDerived(stem);
    if (hit) {
      hit.label = "\u0645\u0627\u0636\u064D " + hit.label;
      return hit;
    }
  }

  return null;
}

export interface Interpretation {
  type: "verb" | "noun" | "masdar" | "root_family";
  verb: string;
  form: number;
  formLabel: string;
  gloss: string;
  labelAr: string;
  labelEn: string;
  confidence: Confidence;
  root3: string;
}

export function findInterpretations(input: string): Interpretation[] {
  const bare = stripDiacritics(input).trim();
  if (!bare || bare.length < 2) return [];

  const results: Interpretation[] = [];
  const seen = new Set<string>();
  const addKey = (k: string) => { if (seen.has(k)) return false; seen.add(k); return true; };

  const lexEntry = getFormILexiconEntry(normalizeInput(bare));
  if (lexEntry && addKey("f1:" + lexEntry.canonicalKey)) {
    results.push({
      type: "verb", verb: lexEntry.canonicalKey, form: 1,
      formLabel: "Measure I", gloss: lexEntry.gloss,
      labelAr: "\u0641\u0639\u0644 \u0623\u0633\u0627\u0633\u064A (I)",
      labelEn: "Base verb (Measure I)",
      confidence: "high", root3: lexEntry.canonicalKey,
    });
  }

  const cls = classifyRoot(bare);
  if (cls && cls.form >= 2) {
    const gloss = glossForFormNum(cls.form, cls.normalized);
    if (addKey("f" + cls.form + ":" + cls.normalized)) {
      results.push({
        type: "verb", verb: cls.normalized, form: cls.form,
        formLabel: FORM_LABELS[cls.form]?.en ?? `Measure ${cls.form}`,
        gloss: gloss ?? "unknown",
        labelAr: FORM_LABELS[cls.form]?.ar + " \u2014 \u0641\u0639\u0644 \u0645\u0632\u064A\u062F",
        labelEn: (FORM_LABELS[cls.form]?.en ?? `Measure ${cls.form}`) + " verb",
        confidence: gloss ? "high" : "medium", root3: cls.normalized,
      });
    }
  }

  const inflHit = resolveInflectedForm(bare);
  if (inflHit && addKey("f1:" + inflHit.entry.canonicalKey)) {
    results.push({
      type: "verb", verb: inflHit.entry.canonicalKey, form: 1,
      formLabel: "Measure I", gloss: inflHit.entry.gloss,
      labelAr: inflHit.label + " \u2014 \u0641\u0639\u0644 \u0623\u0633\u0627\u0633\u064A",
      labelEn: "Inflected Measure I verb",
      confidence: "high", root3: inflHit.entry.canonicalKey,
    });
  }

  const derivHit = resolveDerivedInflection(bare);
  if (derivHit && addKey("f" + derivHit.form + ":" + derivHit.root3)) {
    results.push({
      type: "verb", verb: derivHit.root3, form: derivHit.form,
      formLabel: FORM_LABELS[derivHit.form]?.en ?? `Form ${derivHit.form}`,
      gloss: derivHit.gloss ?? "unknown",
      labelAr: derivHit.label,
      labelEn: derivHit.label,
      confidence: derivHit.gloss ? "high" : "medium", root3: derivHit.root3,
    });
  }

  const masdarHit = getFormIByMasdar(bare);
  if (masdarHit && addKey("masdar:" + masdarHit.canonicalKey)) {
    results.push({
      type: "masdar", verb: masdarHit.canonicalKey, form: 1,
      formLabel: "Masdar", gloss: masdarHit.gloss,
      labelAr: "\u0645\u0635\u062F\u0631 \u0627\u0644\u0641\u0639\u0644 " + masdarHit.canonicalKey,
      labelEn: "Verbal noun (masdar) of " + masdarHit.canonicalKey,
      confidence: "high", root3: masdarHit.canonicalKey,
    });
  }

  const root3 = cls?.normalized ?? (lexEntry?.canonicalKey) ?? (inflHit?.entry.canonicalKey) ?? (derivHit?.root3) ?? bare;
  if (root3.length === 3) {
    const formsToCheck = [2, 3, 4, 5, 6, 7, 8, 10] as const;
    for (const fnum of formsToCheck) {
      const gloss = glossForFormNum(fnum, root3);
      if (gloss && addKey("f" + fnum + ":" + root3)) {
        results.push({
          type: "root_family", verb: root3, form: fnum,
          formLabel: FORM_LABELS[fnum]?.en ?? `Measure ${fnum}`,
          gloss,
          labelAr: (FORM_LABELS[fnum]?.ar ?? "") + " \u2014 " + gloss,
          labelEn: (FORM_LABELS[fnum]?.en ?? `Measure ${fnum}`) + " \u2014 " + gloss,
          confidence: "high", root3,
        });
      }
    }
  }

  results.sort((a, b) => {
    const cScore: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };
    const typeScore: Record<string, number> = { verb: 10, masdar: 5, noun: 4, root_family: 2 };
    const aScore = (cScore[a.confidence] ?? 0) * 10 + (typeScore[a.type] ?? 0);
    const bScore = (cScore[b.confidence] ?? 0) * 10 + (typeScore[b.type] ?? 0);
    return bScore - aScore;
  });

  return results;
}

export type SafetyMode = "exact_verb_hit" | "recovered_verb_hit" | "suggestion_only" | "noun_input" | "no_valid_verb" | "multi_interpretation";

export interface SafetyResult {
  mode: SafetyMode;
  inputToken: string;
  canonicalVerb: string | null;
  suggestion: string | null;
  suggestionGloss: string | null;
  nounGloss: string | null;
  reason: string;
  confidence: Confidence;
  inflectionLabel?: string | null;
  derivedForm?: number | null;
  interpretations?: Interpretation[];
}

const TA_MARBUTA = "\u0629";
const ALEF_MAQSURA = "\u0649";
const YA_CHAR = "\u064A";

const NOUN_ONLY: Record<string, string> = {
  "\u0631\u0623\u064A": "opinion",
  "\u0643\u062A\u0627\u0628": "book",
  "\u0645\u062F\u0631\u0633\u0629": "school",
  "\u0645\u0643\u062A\u0628": "office / desk",
  "\u0645\u0643\u062A\u0628\u0629": "library",
  "\u0645\u062F\u064A\u0646\u0629": "city",
  "\u062D\u0643\u0648\u0645\u0629": "government",
  "\u062C\u0627\u0645\u0639\u0629": "university",
  "\u0645\u0639\u0644\u0645": "teacher (m.)",
  "\u0645\u0639\u0644\u0645\u0629": "teacher (f.)",
  "\u0637\u0627\u0644\u0628": "student (m.)",
  "\u0637\u0627\u0644\u0628\u0629": "student (f.)",
  "\u0628\u064A\u062A": "house",
  "\u0628\u0627\u0628": "door",
  "\u0637\u0631\u064A\u0642": "road / way",
  "\u0645\u0627\u0621": "water",
  "\u0633\u0645\u0627\u0621": "sky",
  "\u0623\u0631\u0636": "earth / land",
  "\u0634\u0645\u0633": "sun",
  "\u0642\u0645\u0631": "moon",
  "\u0648\u0642\u062A": "time",
  "\u064A\u0648\u0645": "day",
  "\u0644\u064A\u0644": "night",
  "\u0635\u0628\u0627\u062D": "morning",
  "\u0645\u0633\u0627\u0621": "evening",
  "\u0633\u064A\u0627\u0633\u0629": "politics",
  "\u0631\u0633\u0627\u0644\u0629": "letter / message",
  "\u062D\u0642\u064A\u0628\u0629": "bag",
  "\u0633\u064A\u0627\u0631\u0629": "car",
  "\u0637\u0627\u0626\u0631\u0629": "airplane",
  "\u0635\u062D\u064A\u0641\u0629": "newspaper",
  "\u0648\u0638\u064A\u0641\u0629": "job",
  "\u0645\u062C\u0644\u0629": "magazine",
  "\u0645\u0646\u0637\u0642\u0629": "area / region",
  "\u0645\u0624\u0633\u0633\u0629": "institution",
  "\u0634\u0631\u0643\u0629": "company",
  "\u062D\u0631\u0643\u0629": "movement",
  "\u062D\u0636\u0627\u0631\u0629": "civilization",
  "\u062A\u062C\u0627\u0631\u0629": "trade / commerce",
  "\u0632\u0631\u0627\u0639\u0629": "agriculture",
  "\u0635\u0646\u0627\u0639\u0629": "industry",
  "\u062B\u0642\u0627\u0641\u0629": "culture",
};

const NOUN_AND_VERB: Record<string, { nounGloss: string; verbGloss: string }> = {
  "\u0639\u0644\u0645": { nounGloss: "knowledge / science", verbGloss: "to know" },
  "\u062F\u0631\u0633": { nounGloss: "lesson", verbGloss: "to study" },
  "\u0646\u0638\u0631": { nounGloss: "sight / gaze", verbGloss: "to look" },
  "\u062D\u0643\u0645": { nounGloss: "judgment / rule", verbGloss: "to judge / rule" },
  "\u0639\u0645\u0644": { nounGloss: "work / deed", verbGloss: "to work / do" },
  "\u0623\u0645\u0631": { nounGloss: "matter / affair", verbGloss: "to command" },
  "\u0642\u0635\u062F": { nounGloss: "intention", verbGloss: "to intend" },
  "\u0641\u0636\u0644": { nounGloss: "virtue / favor", verbGloss: "to prefer" },
  "\u062E\u0628\u0631": { nounGloss: "news", verbGloss: "to inform / know" },
};

const KNOWN_NOUNS: Record<string, string> = {
  ...NOUN_ONLY,
  ...Object.fromEntries(Object.entries(NOUN_AND_VERB).map(([k, v]) => [k, v.nounGloss])),
};

function hasStrongVerbSignal(bare: string): boolean {
  const classResult = classifyRoot(bare);
  if (classResult && classResult.form >= 2) return true;

  const lexEntry = getFormILexiconEntry(normalizeInput(bare));
  if (lexEntry) return true;

  const richEntry = lookupRoot(bare);
  if (richEntry) return true;

  return false;
}

function isNounPattern(bare: string): string | null {
  if (bare.endsWith(TA_MARBUTA) && bare.length >= 3) return "\u0627\u0633\u0645 \u0645\u0624\u0646\u062B \u0628\u0627\u0644\u062A\u0627\u0621 \u0627\u0644\u0645\u0631\u0628\u0648\u0637\u0629";

  if (NOUN_ONLY[bare]) return NOUN_ONLY[bare];

  if (bare.length === 4 && bare[0] === "\u0645" && !hasStrongVerbSignal(bare)) {
    return "\u0635\u064A\u063A\u0629 \u0645\u064E\u0641\u0639\u064E\u0644 (\u0627\u0633\u0645 \u0645\u0643\u0627\u0646 / \u0622\u0644\u0629)";
  }

  const ALEF = "\u0627";
  if (bare.length === 4 && bare[1] === ALEF) {
    if (hasStrongVerbSignal(bare)) return null;
    return "\u0635\u064A\u063A\u0629 \u0641\u0650\u0639\u0627\u0644 / \u0641\u0627\u0639\u0650\u0644";
  }

  if (bare.length === 5 && bare[0] === "\u0645" && !hasStrongVerbSignal(bare)) {
    return "\u0635\u064A\u063A\u0629 \u0645\u0641\u0639\u0648\u0644 / \u0645\u0641\u0639\u0644\u0629";
  }

  return null;
}

function tryRecoverVerb(bare: string): { canonical: string; gloss: string } | null {
  const entry = getFormILexiconEntry(normalizeInput(bare));
  if (!entry) return null;

  if (entry.canonicalKey !== bare) {
    return { canonical: entry.canonicalKey, gloss: entry.gloss };
  }
  return null;
}

export function checkInputSafety(input: string): SafetyResult {
  const trimmed = input.trim();
  const bare = stripArabicDiacritics(trimmed);

  if (!bare || bare.length === 0) {
    return {
      mode: "no_valid_verb", inputToken: input, canonicalVerb: null,
      suggestion: null, suggestionGloss: null, nounGloss: null,
      reason: "\u0623\u062F\u062E\u0644 \u0641\u0639\u0644\u0627\u064B \u0639\u0631\u0628\u064A\u0627\u064B", confidence: "low",
    };
  }

  const SHADDA_CHAR = "\u0651";
  const hasShadda = trimmed.includes(SHADDA_CHAR);
  if (hasShadda) {
    const lexWithShadda = getFormILexiconEntry(normalizeInput(trimmed));
    if (lexWithShadda) {
      return {
        mode: "exact_verb_hit", inputToken: input, canonicalVerb: lexWithShadda.canonicalKey,
        suggestion: null, suggestionGloss: null, nounGloss: null,
        reason: "\u062A\u0645 \u0627\u0644\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0641\u0639\u0644 \u0645\u0628\u0627\u0634\u0631\u0629\u064B", confidence: "high",
      };
    }
    const classResult = classifyRoot(trimmed);
    if (classResult && classResult.form >= 2) {
      return {
        mode: "exact_verb_hit", inputToken: input, canonicalVerb: classResult.normalized,
        suggestion: null, suggestionGloss: null, nounGloss: null,
        reason: "\u062A\u0645 \u0627\u0644\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0635\u064A\u063A\u0629 \u0645\u0632\u064A\u062F\u0629", confidence: "high",
      };
    }
  }

  const inflHit = resolveInflectedForm(bare);
  if (inflHit) {
    return {
      mode: "exact_verb_hit", inputToken: input, canonicalVerb: inflHit.entry.canonicalKey,
      suggestion: null, suggestionGloss: null, nounGloss: null,
      reason: "\u062A\u0645 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0641\u0639\u0644 \u0645\u0646 \u0627\u0644\u0635\u064A\u063A\u0629 \u0627\u0644\u0645\u0635\u0631\u0651\u0641\u0629", confidence: "high",
      inflectionLabel: inflHit.label,
    };
  }

  const derivInflHit = resolveDerivedInflection(bare);
  if (derivInflHit) {
    return {
      mode: "exact_verb_hit", inputToken: input, canonicalVerb: derivInflHit.root3,
      suggestion: null, suggestionGloss: null, nounGloss: null,
      reason: "\u062A\u0645 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0641\u0639\u0644 \u0645\u0646 \u0635\u064A\u063A\u0629 \u0645\u0632\u064A\u062F\u0629 \u0645\u0635\u0631\u0651\u0641\u0629", confidence: "high",
      inflectionLabel: derivInflHit.label,
      derivedForm: derivInflHit.form,
    };
  }

  const ambig = NOUN_AND_VERB[bare];
  if (ambig) {
    const lexEntry = getFormILexiconEntry(normalizeInput(bare));
    if (lexEntry) {
      return {
        mode: "exact_verb_hit", inputToken: input, canonicalVerb: lexEntry.canonicalKey,
        suggestion: null, suggestionGloss: null, nounGloss: null,
        reason: `\u0643\u0644\u0645\u0629 \u0645\u0634\u062A\u0631\u0643\u0629 (${ambig.nounGloss}) \u2014 \u062A\u0645 \u0627\u0644\u062A\u0639\u0627\u0645\u0644 \u0645\u0639\u0647\u0627 \u0643\u0641\u0639\u0644`,
        confidence: "high",
      };
    }
    return {
      mode: "noun_input", inputToken: input, canonicalVerb: null,
      suggestion: null, suggestionGloss: null, nounGloss: ambig.nounGloss,
      reason: `\u0647\u0630\u0647 \u0627\u0644\u0643\u0644\u0645\u0629 \u0627\u0633\u0645 \u0648\u0644\u064A\u0633\u062A \u0641\u0639\u0644\u0627\u064B`,
      confidence: "high",
    };
  }

  const nounOnlyGloss = NOUN_ONLY[bare];
  if (nounOnlyGloss) {
    const recovery = tryRecoverVerb(bare);
    return {
      mode: "noun_input", inputToken: input, canonicalVerb: null,
      suggestion: recovery?.canonical ?? null,
      suggestionGloss: recovery?.gloss ?? null,
      nounGloss: nounOnlyGloss,
      reason: `\u0647\u0630\u0647 \u0627\u0644\u0643\u0644\u0645\u0629 \u0627\u0633\u0645 \u0648\u0644\u064A\u0633\u062A \u0641\u0639\u0644\u0627\u064B`,
      confidence: "high",
    };
  }

  const nounPatternReason = isNounPattern(bare);
  if (nounPatternReason) {
    return {
      mode: "noun_input", inputToken: input, canonicalVerb: null,
      suggestion: null, suggestionGloss: null, nounGloss: nounPatternReason,
      reason: `\u0647\u0630\u0647 \u0627\u0644\u0643\u0644\u0645\u0629 \u0627\u0633\u0645 \u0648\u0644\u064A\u0633\u062A \u0641\u0639\u0644\u0627\u064B`,
      confidence: "high",
    };
  }

  const derivedClassResult = classifyRoot(bare);
  if (derivedClassResult && derivedClassResult.form >= 2) {
    return {
      mode: "exact_verb_hit", inputToken: input, canonicalVerb: derivedClassResult.normalized,
      suggestion: null, suggestionGloss: null, nounGloss: null,
      reason: "Verb match via root classification (derived form).", confidence: "high",
    };
  }

  const lexEntry = getFormILexiconEntry(normalizeInput(bare));
  if (lexEntry) {
    if (lexEntry.canonicalKey === bare) {
      return {
        mode: "exact_verb_hit", inputToken: input, canonicalVerb: bare,
        suggestion: null, suggestionGloss: null, nounGloss: null,
        reason: "\u062A\u0645 \u0627\u0644\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0641\u0639\u0644 \u0645\u0628\u0627\u0634\u0631\u0629\u064B", confidence: "high",
      };
    }

    const canon = lexEntry.canonicalKey;
    const isContractedDoubled =
      bare.length === 2 && canon.length === 3 && canon[1] === canon[2] &&
      bare[0] === canon[0] && bare[1] === canon[1];
    if (isContractedDoubled) {
      return {
        mode: "exact_verb_hit", inputToken: input, canonicalVerb: canon,
        suggestion: null, suggestionGloss: null, nounGloss: null,
        reason: `\u062A\u0645 \u0641\u0643 \u0627\u0644\u0625\u062F\u063A\u0627\u0645: ${bare} \u2192 ${canon}`, confidence: "high",
      };
    }

    let diffCount = 0;
    if (bare.length === canon.length) {
      for (let i = 0; i < bare.length; i++) {
        if (bare[i] !== canon[i]) diffCount++;
      }
    } else {
      diffCount = 99;
    }
    const isMinorHamzaVariant = diffCount === 1;

    if (isMinorHamzaVariant) {
      return {
        mode: "recovered_verb_hit", inputToken: input, canonicalVerb: lexEntry.canonicalKey,
        suggestion: lexEntry.canonicalKey, suggestionGloss: lexEntry.gloss, nounGloss: null,
        reason: `\u0623\u0642\u0631\u0628 \u0641\u0639\u0644: ${lexEntry.canonicalKey}` + (lexEntry.gloss ? ` (${lexEntry.gloss})` : ``),
        confidence: "high",
      };
    }

    return {
      mode: "suggestion_only", inputToken: input, canonicalVerb: null,
      suggestion: lexEntry.canonicalKey, suggestionGloss: lexEntry.gloss, nounGloss: null,
      reason: "\u0647\u0630\u0627 \u0627\u0644\u0634\u0643\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0642\u0627\u0645\u0648\u0633",
      confidence: "medium",
    };
  }

  const lookupR = lookupRoot(bare);
  if (lookupR) {
    return {
      mode: "exact_verb_hit", inputToken: input, canonicalVerb: bare,
      suggestion: null, suggestionGloss: null, nounGloss: null,
      reason: "\u062A\u0645 \u0627\u0644\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0641\u0639\u0644 \u0645\u0646 \u0627\u0644\u0645\u0639\u062C\u0645", confidence: "high",
    };
  }

  const analysis = analyzeToken(bare);
  if (analysis.pos === "verb" && analysis.confidence === "high") {
    return {
      mode: "exact_verb_hit", inputToken: input, canonicalVerb: analysis.lemma,
      suggestion: null, suggestionGloss: null, nounGloss: null,
      reason: "\u062A\u0645 \u0627\u0644\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0641\u0639\u0644 \u0645\u0646 \u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0635\u0631\u0641\u064A", confidence: "high",
    };
  }

  if (analysis.pos === "verb" && analysis.confidence === "medium") {
    const interps = findInterpretations(bare);
    if (interps.length >= 2) {
      return {
        mode: "multi_interpretation", inputToken: input, canonicalVerb: interps[0].verb,
        suggestion: null, suggestionGloss: null, nounGloss: null,
        reason: "\u0642\u062F \u064A\u064F\u0641\u0647\u0645 \u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u0628\u0623\u0643\u062B\u0631 \u0645\u0646 \u0637\u0631\u064A\u0642\u0629",
        confidence: "medium",
        interpretations: interps,
      };
    }
    return {
      mode: "suggestion_only", inputToken: input, canonicalVerb: null,
      suggestion: analysis.lemma, suggestionGloss: analysis.gloss || null, nounGloss: null,
      reason: "\u0647\u0630\u0627 \u0627\u0644\u0634\u0643\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0642\u0627\u0645\u0648\u0633",
      confidence: "medium",
    };
  }

  const interps = findInterpretations(bare);
  if (interps.length >= 2) {
    return {
      mode: "multi_interpretation", inputToken: input, canonicalVerb: interps[0].verb,
      suggestion: null, suggestionGloss: null, nounGloss: null,
      reason: "\u0642\u062F \u064A\u064F\u0641\u0647\u0645 \u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u0628\u0623\u0643\u062B\u0631 \u0645\u0646 \u0637\u0631\u064A\u0642\u0629",
      confidence: "medium",
      interpretations: interps,
    };
  }
  if (interps.length === 1) {
    return {
      mode: "exact_verb_hit", inputToken: input, canonicalVerb: interps[0].verb,
      suggestion: null, suggestionGloss: null, nounGloss: null,
      reason: "\u062A\u0645 \u0627\u0644\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0641\u0639\u0644", confidence: interps[0].confidence,
      derivedForm: interps[0].form > 1 ? interps[0].form : undefined,
    };
  }

  return {
    mode: "no_valid_verb", inputToken: input, canonicalVerb: null,
    suggestion: null, suggestionGloss: null, nounGloss: null,
    reason: "\u062C\u0631\u0651\u0628 \u0625\u062F\u062E\u0627\u0644 \u062C\u0630\u0631 \u062B\u0644\u0627\u062B\u064A \u0645\u062B\u0644: \u0643\u062A\u0628\u060C \u0642\u0627\u0644\u060C \u0633\u0645\u0639",
    confidence: "low",
  };
}

export type EnglishAssistAction = "blocked" | "warn_only" | "assist";

export function getEnglishAssistPolicy(analysis: TokenAnalysis): {
  action: EnglishAssistAction;
  canOverridePOS: boolean;
  canOverrideForm: boolean;
  canOverrideVerbClass: boolean;
  reason: string;
} {
  if (analysis.confidence === "high") {
    return {
      action: "blocked",
      canOverridePOS: false,
      canOverrideForm: false,
      canOverrideVerbClass: false,
      reason: "Arabic confidence is high — English cannot override POS, form, or verb class.",
    };
  }
  if (analysis.confidence === "medium") {
    return {
      action: "warn_only",
      canOverridePOS: false,
      canOverrideForm: false,
      canOverrideVerbClass: false,
      reason: "Arabic confidence is medium — English may only warn or confirm, not override.",
    };
  }
  return {
    action: "assist",
    canOverridePOS: false,
    canOverrideForm: false,
    canOverrideVerbClass: false,
    reason: "Arabic confidence is low — English may help choose between candidates but result is marked as assisted.",
  };
}
