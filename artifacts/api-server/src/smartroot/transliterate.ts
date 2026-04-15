/**
 * transliterate.ts
 * Converts fully-vocalized (harakat) Arabic to a simple Latin transliteration.
 * Designed for TTS-preparation and pronunciation-guidance output.
 *
 * Scheme: ALA-LC-inspired with common digraphs (sh, kh, gh, dh, th).
 * Long vowels: ā ī ū.  Emphatic consonants: ṣ ḍ ṭ ẓ ḥ.
 */

const FATHA  = "\u064E";
const KASRA  = "\u0650";
const DAMMA  = "\u064F";
const SUKUN  = "\u0652";
const SHADDA = "\u0651";
const TATWEEL = "\u0640";

const ALEF         = "\u0627";
const ALEF_MAD     = "\u0622"; // آ
const ALEF_HAMZA_A = "\u0623"; // أ
const ALEF_HAMZA_I = "\u0625"; // إ
const ALEF_WASL    = "\u0671"; // ٱ
const ALEF_MAQSURA = "\u0649"; // ى

const WAW = "\u0648";
const YA  = "\u064A";

const CONS: Record<string, string> = {
  "\u0628": "b",   // ب
  "\u062A": "t",   // ت
  "\u062B": "th",  // ث
  "\u062C": "j",   // ج
  "\u062D": "ḥ",   // ح
  "\u062E": "kh",  // خ
  "\u062F": "d",   // د
  "\u0630": "dh",  // ذ
  "\u0631": "r",   // ر
  "\u0632": "z",   // ز
  "\u0633": "s",   // س
  "\u0634": "sh",  // ش
  "\u0635": "ṣ",   // ص
  "\u0636": "ḍ",   // ض
  "\u0637": "ṭ",   // ط
  "\u0638": "ẓ",   // ظ
  "\u0639": "ʿ",   // ع
  "\u063A": "gh",  // غ
  "\u0641": "f",   // ف
  "\u0642": "q",   // ق
  "\u0643": "k",   // ك
  "\u0644": "l",   // ل
  "\u0645": "m",   // م
  "\u0646": "n",   // ن
  "\u0647": "h",   // ه
  "\u0648": "w",   // و (consonantal)
  "\u064A": "y",   // ي (consonantal)
  "\u0621": "ʾ",   // ء hamza
  "\u0626": "ʾ",   // ئ
  "\u0624": "ʾ",   // ؤ
  "\u0625": "ʾ",   // إ
  "\u0623": "ʾ",   // أ
};

/**
 * Convert a fully-vocalized Arabic string to Latin transliteration.
 * Rules:
 *  - Consonant + SHADDA → double consonant
 *  - FATHA  + ALEF/ALEF_MAQSURA → ā
 *  - KASRA  + YA  → ī
 *  - DAMMA  + WAW → ū
 *  - ALEF (bare, at start of word) → vowel comes from following diacritic
 *  - SUKUN → no vowel
 */
export function transliterate(arabic: string): string {
  const chars = [...arabic];
  const out: string[] = [];
  let i = 0;

  while (i < chars.length) {
    const c = chars[i]!;
    const n1 = i + 1 < chars.length ? chars[i + 1]! : "";
    const n2 = i + 2 < chars.length ? chars[i + 2]! : "";

    // ── Skip tatweel ──────────────────────────────────────────────
    if (c === TATWEEL) { i++; continue; }

    // ── SHADDA (if encountered mid-stream, already consumed) ──────
    if (c === SHADDA) { i++; continue; }

    // ── Vowels / diacritics ───────────────────────────────────────
    if (c === FATHA) {
      if (n1 === ALEF || n1 === ALEF_MAQSURA) {
        out.push("ā"); i += 2; continue;
      }
      out.push("a"); i++; continue;
    }
    if (c === KASRA) {
      if (n1 === YA) { out.push("ī"); i += 2; continue; }
      out.push("i"); i++; continue;
    }
    if (c === DAMMA) {
      if (n1 === WAW) { out.push("ū"); i += 2; continue; }
      out.push("u"); i++; continue;
    }
    if (c === SUKUN) { i++; continue; }

    // Tanwin
    if (c === "\u064B") { out.push("an"); i++; continue; }
    if (c === "\u064C") { out.push("un"); i++; continue; }
    if (c === "\u064D") { out.push("in"); i++; continue; }

    // ── Alef variants (vowel carrier — no consonant sound output) ─
    if (
      c === ALEF || c === ALEF_MAD ||
      c === ALEF_HAMZA_A || c === ALEF_HAMZA_I || c === ALEF_WASL
    ) {
      i++; continue;
    }

    // Alef maqsura standalone (not after FATHA — that was handled above)
    if (c === ALEF_MAQSURA) { out.push("ā"); i++; continue; }

    // ── Consonants ────────────────────────────────────────────────
    const lat = CONS[c];
    if (lat !== undefined) {
      if (n1 === SHADDA) {
        // Doubled consonant: output double + skip SHADDA
        out.push(lat + lat);
        i += 2;
      } else {
        out.push(lat);
        i++;
      }
      continue;
    }

    // Unknown character — skip
    i++;
  }

  return out.join("");
}
