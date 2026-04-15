/**
 * normalization.ts
 * Strips diacritics (tashkeel), tatweel, and normalises Arabic text
 * to bare consonant form suitable for root classification.
 */

// Diacritics (harakat) but NOT shadda (\u0651) — we need shadda for doubling detection
const HARAKAT_RANGE = /[\u064B-\u0650\u0652-\u065F\u0670]/g; // everything except shadda \u0651
const SHADDA = "\u0651";
const TATWEEL = /\u0640/g;
const ALEF_VARIANTS = /[\u0622\u0623\u0625\u0671]/g;
const ALEF = "\u0627";
const YA_MAQSURA = "\u0649";
const YA = "\u064A";

export function stripDiacritics(text: string): string {
  // Strip all diacritics including shadda for general use
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(TATWEEL, "");
}

/**
 * Strip only harakat (not shadda). Used for doubling detection.
 */
function stripHarakat(text: string): string {
  return text.replace(HARAKAT_RANGE, "").replace(TATWEEL, "");
}

/**
 * Normalise alef variants, ya maqsura, and ta marbuta to their base forms.
 * Returns the canonical consonant string used for root comparison.
 * Does NOT expand doubled consonants — call expandRoot for that.
 */
export function normalizeRoot(text: string): string {
  let s = stripDiacritics(text.trim());
  s = s.replace(ALEF_VARIANTS, ALEF);
  s = s.replace(new RegExp(YA_MAQSURA, "g"), YA);
  return s;
}

/**
 * Check that the string consists only of Arabic letters after normalisation.
 */
export function isArabic(text: string): boolean {
  const stripped = stripDiacritics(text.trim());
  return /^[\u0600-\u06FF]+$/.test(stripped) && stripped.length > 0;
}

/**
 * Returns the three consonants of a triliteral root as an array [R1, R2, R3].
 * Handles doubled roots written with shadda (e.g., ردّ → ر د د).
 * Returns a triple of [R1, R2, R3] bare consonants.
 */
export function expandRoot(raw: string): [string, string, string] | null {
  const trimmed = raw.trim();

  // First check for shadda-encoded doubling: strip only harakat, keep shadda
  // Then look for pattern: consonant + shadda (means that consonant is doubled)
  const withShadda = stripHarakat(trimmed)
    .replace(ALEF_VARIANTS, ALEF)
    .replace(new RegExp(YA_MAQSURA, "g"), YA);

  // Expand consonant+shadda → consonant+consonant
  let expanded = "";
  for (let i = 0; i < withShadda.length; i++) {
    const ch = withShadda[i]!;
    if (ch === SHADDA) {
      // The previous character should be doubled
      if (expanded.length > 0) {
        expanded += expanded[expanded.length - 1]!;
      }
    } else {
      expanded += ch;
    }
  }

  // Now normalise (strip all diacritics including shadda, normalise alef variants)
  let norm = expanded.replace(ALEF_VARIANTS, ALEF);

  if (norm.length === 3) {
    return [norm[0]!, norm[1]!, norm[2]!];
  }

  // Already bare 2-char string (user wrote رد without shadda) — treat as doubled
  if (norm.length === 2) {
    return [norm[0]!, norm[1]!, norm[1]!];
  }

  return null;
}

/**
 * Returns the canonical 3-letter root string (used as lookup key in lexicon).
 */
export function expandedNormalizedRoot(raw: string): string | null {
  const triple = expandRoot(raw);
  if (!triple) return null;
  return triple.join("");
}

/**
 * Detect Form V input (تَفَعَّلَ pattern): a bare 4-char string where
 * position 0 is TA (ت) and position 1 is NOT ALEF (the first radical).
 * e.g. "تعلّم" → strip all diacritics (incl. shadda) → "تعلم" → [ت, ع, ل, م]
 *      → R1=ع, R2=ل, R3=م
 *
 * IMPORTANT: Must be detected BEFORE Form II (shadda-based), because Form V
 * inputs like "تعلّم" (with shadda on R2) would otherwise be misclassified
 * as Form II of root تعم.
 *
 * Distinct from Form IV (ALEF at pos 0) and Form III (ALEF at pos 1).
 */
export function detectFormV(raw: string): [string, string, string] | null {
  const TA_LETTER = "\u062A"; // ت

  const bare = raw
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, ALEF)
    .replace(/\u0649/g, YA);

  // Form V: exactly 4 chars, position 0 is TA (ت), position 1 is not ALEF
  if (bare.length === 4 && bare[0] === TA_LETTER && bare[1] !== ALEF) {
    return [bare[1]!, bare[2]!, bare[3]!];
  }

  return null;
}

/**
 * Detect Form X input (اِسْتَفْعَلَ pattern).
 *
 * Standard case: bare 6-char string where
 *   pos[0] = ALEF (ا — alef-wasl)
 *   pos[1] = SIN (س)
 *   pos[2] = TA  (ت)
 *   pos[3–5] = R1, R2, R3
 *   e.g. "استعمل" → [ا, س, ت, ع, م, ل] → R1=ع, R2=م, R3=ل
 *
 * Doubled-root case (R2=R3): bare 5-char string where the doubled final
 *   consonant collapses when shadda is stripped.
 *   pos[0] = ALEF, pos[1] = SIN, pos[2] = TA, pos[3] = R1, pos[4] = R2=R3
 *   e.g. "استمر" (from استمرّ, root مرر) → R1=م, R2=R3=ر
 *
 * Must be checked BEFORE Form VIII in the detection chain: the 5-char
 * doubled-root Form X surface (ا+س+ت+R1+R2) has pos[2]=TA, so the Form VIII
 * check would otherwise misread it as Form VIII with R1=SIN.
 */
export function detectFormX(raw: string): [string, string, string] | null {
  const TA_LETTER = "\u062A"; // ت
  const SIN_LETTER = "\u0633"; // س

  const bare = raw
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, ALEF)
    .replace(/\u0649/g, YA);

  // Standard Form X: 6 chars, ALEF at pos[0], SIN at pos[1], TA at pos[2]
  if (
    bare.length === 6 &&
    bare[0] === ALEF &&
    bare[1] === SIN_LETTER &&
    bare[2] === TA_LETTER
  ) {
    return [bare[3]!, bare[4]!, bare[5]!];
  }

  // Doubled-root Form X: 5 chars (shadda stripped), ALEF+SIN+TA+R1+R2
  // R3 is reconstructed as R2 (the doubled consonant).
  if (
    bare.length === 5 &&
    bare[0] === ALEF &&
    bare[1] === SIN_LETTER &&
    bare[2] === TA_LETTER
  ) {
    return [bare[3]!, bare[4]!, bare[4]!]; // R3 = R2 (doubled)
  }

  return null;
}

/**
 * Detect Form VIII input (اِفْتَعَلَ pattern).
 *
 * Standard case (no R1 assimilation): bare 5-char string where
 *   pos[0] = ALEF (ا — alef-wasl), pos[2] = TA (ت — the infixed TA).
 *   e.g. "اجتمع" → [ا, ج, ت, م, ع] → R1=ج, R2=م, R3=ع
 *
 * WAW / YA / TA assimilation: bare 4-char string where
 *   pos[0] = ALEF, pos[1] = TA (the merged R1+infixed-TA, written as ت+shadda).
 *   After stripping shadda the surface is 4 chars. R1 is reconstructed as WAW
 *   (the dominant case: اتفق from وفق, اتجه from وجه, اتصل from وصل …).
 *   e.g. "اتفق" (stripped of shadda) → [ا, ت, ف, ق] → R1=و (reconstructed), R2=ف, R3=ق
 *
 * Must be checked BEFORE Form VII in the detection chain: when R1=NUN the
 * standard 5-char Form VIII surface (ا+ن+ت+…) would otherwise be mistaken
 * for Form VII (which also starts ا+ن).
 */
export function detectFormVIII(raw: string): [string, string, string] | null {
  const TA_LETTER = "\u062A"; // ت
  const WAW_LETTER = "\u0648"; // و (used for WAW-assimilation reconstruction)
  const DAL_LETTER = "\u062F"; // د
  const SHADDA = "\u0651";     // ّ
  const VOICED_DENTALS = new Set(["\u062F", "\u0630", "\u0632"]); // د, ذ, ز

  // Pre-strip check: detect shadda-doubled voiced dental Form VIII before
  // diacritics are removed. E.g. اِدَّرَسَ has DAL+SHADDA → R1=DAL doubled.
  // After stripping, this becomes 4 chars (ادرس) which would be confused with Form IV.
  const trimmed = raw.trim().replace(/\u0640/g, "");
  if (trimmed.length >= 4) {
    const stripped = trimmed.replace(/[\u064B-\u065F\u0670]/g, "").replace(/[\u0622\u0623\u0625\u0671]/g, ALEF).replace(/\u0649/g, YA);
    if (stripped.length === 4 && stripped[0] === ALEF && VOICED_DENTALS.has(stripped[1]!)) {
      const afterAlef = trimmed.slice(1);
      const baseIdx = afterAlef.search(/[^\u064B-\u065F\u0670]/);
      if (baseIdx >= 0) {
        const baseChar = afterAlef[baseIdx]!;
        const rest = afterAlef.slice(baseIdx + 1);
        if (VOICED_DENTALS.has(baseChar) && rest.includes(SHADDA)) {
          return [baseChar, stripped[2]!, stripped[3]!];
        }
      }
    }
  }

  const bare = trimmed
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, ALEF)
    .replace(/\u0649/g, YA);

  // Standard Form VIII: 5 chars, ALEF at pos[0], TA at pos[2]
  if (bare.length === 5 && bare[0] === ALEF && bare[2] === TA_LETTER) {
    return [bare[1]!, bare[3]!, bare[4]!];
  }

  // Voiced dental assimilation Form VIII: 5 chars, ALEF at pos[0],
  // R1 is a voiced dental (د/ذ/ز) at pos[1], DAL at pos[2] (ت→د assimilation).
  // e.g. ازدحم → [ز, ح, م]
  if (bare.length === 5 && bare[0] === ALEF && bare[2] === DAL_LETTER && VOICED_DENTALS.has(bare[1]!)) {
    return [bare[1]!, bare[3]!, bare[4]!];
  }

  // WAW/YA/TA assimilation Form VIII: 4 chars, ALEF at pos[0], TA at pos[1]
  // The original R1 merged with the infixed TA → TA+shadda (shadda stripped → 4 chars).
  // R1 is reconstructed as WAW — covers اتفق, اتجه, اتصل, اتسع and most common cases.
  if (bare.length === 4 && bare[0] === ALEF && bare[1] === TA_LETTER) {
    return [WAW_LETTER, bare[2]!, bare[3]!];
  }

  return null;
}

/**
 * Detect Form VII input (اِنْفَعَلَ pattern): a bare 5-char string where
 * position 0 is ALEF (ا — alef-wasl) and position 1 is NUN (ن).
 * e.g. "انكسر" → strip diacritics → [ا, ن, ك, س, ر] → R1=ك, R2=س, R3=ر
 *
 * Distinct from Form VI (5 chars, pos[0]=TA) and Form IV (4 chars).
 * ALEF variants (\u0622 \u0623 \u0625 \u0671) are all normalised to ALEF
 * before the check, so اِنكسر, أنكسر, ٱنكسر all match correctly.
 */
export function detectFormVII(raw: string): [string, string, string] | null {
  const NUN_LETTER = "\u0646"; // ن

  const bare = raw
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, ALEF)
    .replace(/\u0649/g, YA);

  // Form VII: exactly 5 chars, position 0 is ALEF (ا), position 1 is NUN (ن)
  if (bare.length === 5 && bare[0] === ALEF && bare[1] === NUN_LETTER) {
    return [bare[2]!, bare[3]!, bare[4]!];
  }

  return null;
}

/**
 * Detect Form VI input (تَفَاعَلَ pattern): a bare 5-char string where
 * position 0 is TA (ت), position 2 is ALEF (ا — the long vowel between R1 and R2).
 * e.g. "تقابل" → strip diacritics → [ت, ق, ا, ب, ل] → R1=ق, R2=ب, R3=ل
 *
 * Distinct from Form V (4 chars), Form III (4 chars, pos[1]=ALEF),
 * Form IV (4 chars, pos[0]=ALEF).
 */
export function detectFormVI(raw: string): [string, string, string] | null {
  const TA_LETTER = "\u062A"; // ت

  const bare = raw
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, ALEF)
    .replace(/\u0649/g, YA);

  // Form VI: exactly 5 chars, position 0 is TA (ت), position 2 is ALEF (ا)
  if (bare.length === 5 && bare[0] === TA_LETTER && bare[2] === ALEF) {
    return [bare[1]!, bare[3]!, bare[4]!];
  }

  return null;
}

/**
 * Detect Form IV input (أَفْعَلَ pattern): a bare 4-char string where
 * position 0 is ALEF (was hamza, e.g. أَكْرَمَ → bare "اكرم").
 * e.g. "أكرم" → strip diacritics → [ا, ك, ر, م] → R1=ك, R2=ر, R3=م
 * Returns [R1, R2, R3] or null if the input is not a Form IV verb form.
 *
 * Distinct from Form III (ALEF at pos 1) and Form I (3-char).
 */
export function detectFormIV(raw: string): [string, string, string] | null {
  const bare = raw
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, ALEF)
    .replace(/\u0649/g, YA);

  // Form IV: exactly 4 chars, position 0 is ALEF (was hamza), position 1 is NOT ALEF (first radical)
  if (bare.length === 4 && bare[0] === ALEF && bare[1] !== ALEF) {
    return [bare[1]!, bare[2]!, bare[3]!];
  }

  return null;
}

/**
 * Detect Form III input (فَاعَلَ pattern): a bare 4-consonant string where
 * position 1 (0-indexed) is ALEF, indicating the characteristic long-vowel between R1 and R2.
 * e.g. "ساعد" → after stripping diacritics → [س, ا, ع, د] → R1=س, R2=ع, R3=د
 * Returns [R1, R2, R3] or null if the input is not a Form III verb form.
 */
export function detectFormIII(raw: string): [string, string, string] | null {
  // Strip all diacritics (including shadda) and normalise
  const bare = raw
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "")  // remove all diacritics
    .replace(/\u0640/g, "")                  // tatweel
    .replace(/[\u0622\u0623\u0625\u0671]/g, ALEF) // alef variants
    .replace(/\u0649/g, YA);                 // alef maqsura → ya

  // Form III: exactly 4 chars, position 1 is ALEF (ا), positions 0/2/3 are consonants
  if (bare.length === 4 && bare[1] === ALEF) {
    return [bare[0]!, bare[2]!, bare[3]!];
  }

  return null;
}

/**
 * Detect Form II input (فَعَّلَ pattern): a 4-consonant expansion where
 * positions 1 and 2 are the same letter (shadda on R2).
 * e.g. "درّس" → shadda-expand → "دررس" → [د, ر, س]
 * Returns [R1, R2, R3] or null if the input is not a Form II verb form.
 */
export function detectFormII(raw: string): [string, string, string] | null {
  const trimmed = raw.trim();

  const withShadda = stripHarakat(trimmed)
    .replace(ALEF_VARIANTS, ALEF)
    .replace(new RegExp(YA_MAQSURA, "g"), YA);

  let expanded = "";
  for (let i = 0; i < withShadda.length; i++) {
    const ch = withShadda[i]!;
    if (ch === SHADDA) {
      if (expanded.length > 0) expanded += expanded[expanded.length - 1]!;
    } else {
      expanded += ch;
    }
  }

  // Form II: 4 chars where the 2nd and 3rd are identical (geminated R2)
  if (expanded.length === 4 && expanded[1] === expanded[2]) {
    return [expanded[0]!, expanded[1]!, expanded[3]!];
  }

  return null;
}
