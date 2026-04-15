/**
 * lexicon.ts
 * In-memory lexicon for Form I triliteral Arabic roots.
 * Each entry stores gloss, vowel pattern (فَعَلَ / فَعِلَ / فَعُلَ), masdar,
 * active participle (اسم فاعل), and passive participle (اسم مفعول).
 *
 * Keys are canonical 3-consonant forms.  Surface forms (قال, دعا, ردّ, etc.)
 * are resolved via lookupRoot before reaching here.
 */

export interface LexiconEntry {
  root: string;         // canonical bare consonants (used as map key)
  gloss: string;
  vowelPattern: "a-a" | "a-i" | "a-u" | "i-a" | "u-u" | "hollow" | "defective" | "doubled";
  pastVowel: string;    // vowel on R2 in past  (a / i / u)
  presentVowel: string; // vowel on R2 in present (a / i / u)
  masdar: string;
  activePart: string;
  passivePart: string;
}

const lexicon: LexiconEntry[] = [

  // ── Regular roots ─────────────────────────────────────────────────────────
  {
    root: "كنس", gloss: "to sweep",
    vowelPattern: "a-u", pastVowel: "a", presentVowel: "u",
    masdar: "كَنْس", activePart: "كَانِس", passivePart: "مَكْنُوس",
  },
  {
    root: "كتب", gloss: "to write",
    vowelPattern: "a-u", pastVowel: "a", presentVowel: "u",
    masdar: "كِتَابَة", activePart: "كَاتِب", passivePart: "مَكْتُوب",
  },
  {
    root: "فتح", gloss: "to open",
    vowelPattern: "a-a", pastVowel: "a", presentVowel: "a",
    masdar: "فَتْح", activePart: "فَاتِح", passivePart: "مَفْتُوح",
  },
  {
    root: "دخل", gloss: "to enter",
    vowelPattern: "a-u", pastVowel: "a", presentVowel: "u",
    masdar: "دُخُول", activePart: "دَاخِل", passivePart: "مَدْخُول",
  },
  {
    root: "جلس", gloss: "to sit",
    vowelPattern: "a-i", pastVowel: "a", presentVowel: "i",
    masdar: "جُلُوس", activePart: "جَالِس", passivePart: "مَجْلُوس",
  },

  // ── Assimilated roots (R1 = و) ────────────────────────────────────────────
  {
    root: "وعد", gloss: "to promise",
    vowelPattern: "a-i", pastVowel: "a", presentVowel: "i",
    masdar: "وَعْد", activePart: "وَاعِد", passivePart: "مَوْعُود",
  },
  {
    root: "وصل", gloss: "to arrive / connect",
    vowelPattern: "a-i", pastVowel: "a", presentVowel: "i",
    masdar: "وُصُول", activePart: "وَاصِل", passivePart: "مَوْصُول",
  },
  {
    root: "وقف", gloss: "to stop / stand",
    vowelPattern: "a-i", pastVowel: "a", presentVowel: "i",
    masdar: "وُقُوف", activePart: "وَاقِف", passivePart: "مَوْقُوف",
  },
  {
    root: "وزن", gloss: "to weigh",
    vowelPattern: "a-i", pastVowel: "a", presentVowel: "i",
    masdar: "وَزْن", activePart: "وَازِن", passivePart: "مَوْزُون",
  },
  {
    root: "عمل", gloss: "to do / work",
    vowelPattern: "a-a", pastVowel: "a", presentVowel: "a",
    masdar: "عَمَل", activePart: "عَامِل", passivePart: "مَعْمُول",
  },
  {
    root: "علم", gloss: "to know",
    vowelPattern: "a-a", pastVowel: "a", presentVowel: "a",
    masdar: "عِلْم", activePart: "عَالِم", passivePart: "مَعْلُوم",
  },
  {
    root: "فهم", gloss: "to understand",
    vowelPattern: "a-a", pastVowel: "a", presentVowel: "a",
    masdar: "فَهْم", activePart: "فَاهِم", passivePart: "مَفْهُوم",
  },
  {
    root: "قرأ", gloss: "to read",
    vowelPattern: "a-a", pastVowel: "a", presentVowel: "a",
    masdar: "قِرَاءَة", activePart: "قَارِئ", passivePart: "مَقْرُوء",
  },
  {
    root: "سأل", gloss: "to ask",
    vowelPattern: "a-a", pastVowel: "a", presentVowel: "a",
    masdar: "سُؤَال", activePart: "سَائِل", passivePart: "مَسْؤُول",
  },
  {
    root: "ذهب", gloss: "to go",
    vowelPattern: "a-a", pastVowel: "a", presentVowel: "a",
    masdar: "ذَهَاب", activePart: "ذَاهِب", passivePart: "مَذْهُوب",
  },

  // ── Hollow-waw roots (R2 = و) ─────────────────────────────────────────────
  {
    root: "قول", gloss: "to say",
    vowelPattern: "hollow", pastVowel: "a", presentVowel: "u",
    masdar: "قَوْل", activePart: "قَائِل", passivePart: "مَقُول",
  },
  {
    root: "زور", gloss: "to visit",
    vowelPattern: "hollow", pastVowel: "a", presentVowel: "u",
    masdar: "زِيَارَة", activePart: "زَائِر", passivePart: "مَزُور",
  },
  {
    root: "صوم", gloss: "to fast",
    vowelPattern: "hollow", pastVowel: "a", presentVowel: "u",
    masdar: "صَوْم", activePart: "صَائِم", passivePart: "مَصُوم",
  },
  {
    root: "قوم", gloss: "to stand / rise",
    vowelPattern: "hollow", pastVowel: "a", presentVowel: "u",
    masdar: "قِيَام", activePart: "قَائِم", passivePart: "مَقُوم",
  },
  // Hollow-waw with a-vowel present (نام يَنَامُ — unusual pattern):
  // presentVowel="a" signals ALEF long-vowel in present and KASRA contraction in past.
  {
    root: "نوم", gloss: "to sleep",
    vowelPattern: "hollow", pastVowel: "a", presentVowel: "a",
    masdar: "نَوْم", activePart: "نَائِم", passivePart: "مَنُوم",
  },

  // ── Hollow-ya roots (R2 = ي) ──────────────────────────────────────────────
  {
    root: "بيع", gloss: "to sell",
    vowelPattern: "hollow", pastVowel: "a", presentVowel: "i",
    masdar: "بَيْع", activePart: "بَائِع", passivePart: "مَبِيع",
  },

  // ── Defective-waw roots (R3 = و) ──────────────────────────────────────────
  {
    root: "دعو", gloss: "to call / invite",
    vowelPattern: "defective", pastVowel: "a", presentVowel: "u",
    masdar: "دُعَاء", activePart: "دَاعٍ", passivePart: "مَدْعُوّ",
  },

  // ── Defective-ya roots (R3 = ي) ───────────────────────────────────────────
  {
    root: "رمي", gloss: "to throw",
    vowelPattern: "defective", pastVowel: "a", presentVowel: "i",
    masdar: "رَمْي", activePart: "رَامٍ", passivePart: "مَرْمِيّ",
  },
  {
    root: "حمي", gloss: "to protect",
    vowelPattern: "defective", pastVowel: "a", presentVowel: "i",
    masdar: "حِمَايَة", activePart: "حَامٍ", passivePart: "مَحْمِيّ",
  },
  {
    root: "سعي", gloss: "to strive / run",
    vowelPattern: "defective", pastVowel: "a", presentVowel: "a",
    masdar: "سَعْي", activePart: "سَاعٍ", passivePart: "مَسْعِيّ",
  },
  {
    root: "مشي", gloss: "to walk",
    vowelPattern: "defective", pastVowel: "a", presentVowel: "i",
    masdar: "مَشْي", activePart: "مَاشٍ", passivePart: "مَمْشِيّ",
  },

  // ── Doubled roots (R2 = R3) ───────────────────────────────────────────────
  {
    root: "ردد", gloss: "to repeat / return",
    vowelPattern: "doubled", pastVowel: "a", presentVowel: "u",
    masdar: "رَدّ", activePart: "رَادّ", passivePart: "مَرْدُود",
  },
  {
    root: "مدد", gloss: "to extend / stretch",
    vowelPattern: "doubled", pastVowel: "a", presentVowel: "u",
    masdar: "مَدّ", activePart: "مَادّ", passivePart: "مَمْدُود",
  },
  {
    root: "جرر", gloss: "to drag / pull",
    vowelPattern: "doubled", pastVowel: "a", presentVowel: "u",
    masdar: "جَرّ", activePart: "جَارّ", passivePart: "مَجْرُور",
  },
  {
    root: "شدد", gloss: "to pull / tighten",
    vowelPattern: "doubled", pastVowel: "a", presentVowel: "u",
    masdar: "شَدّ", activePart: "شَادّ", passivePart: "مَشْدُود",
  },
  {
    root: "عضض", gloss: "to bite",
    vowelPattern: "doubled", pastVowel: "a", presentVowel: "u",
    masdar: "عَضّ", activePart: "عَاضّ", passivePart: "مَعْضُوض",
  },
];

const lexiconMap = new Map<string, LexiconEntry>(
  lexicon.map((e) => [e.root, e]),
);

const ALEF = "\u0627"; // ا
const WAW  = "\u0648"; // و
const YA   = "\u064A"; // ي

/**
 * Look up a root in the lexicon.
 * Tries the exact key first, then tries substituting alef (ا) in R2 or R3
 * with و or ي so that surface forms like قال → قول, باع → بيع, دعا → دعو
 * are resolved correctly.
 */
export function lookupRoot(normalizedRoot: string): LexiconEntry | undefined {
  const direct = lexiconMap.get(normalizedRoot);
  if (direct) return direct;

  if (normalizedRoot.length !== 3) return undefined;

  const r1 = normalizedRoot[0]!;
  const r2 = normalizedRoot[1]!;
  const r3 = normalizedRoot[2]!;

  // If R2 is ALEF, try WAW and YA variants (hollow surface form: قال → قول, باع → بيع)
  if (r2 === ALEF) {
    const withWaw = r1 + WAW + r3;
    const withYa  = r1 + YA  + r3;
    return lexiconMap.get(withWaw) ?? lexiconMap.get(withYa);
  }

  // If R3 is ALEF, try WAW and YA variants (defective surface form: دعا → دعو, رمى → رمي)
  if (r3 === ALEF) {
    const withWaw = r1 + r2 + WAW;
    const withYa  = r1 + r2 + YA;
    return lexiconMap.get(withWaw) ?? lexiconMap.get(withYa);
  }

  return undefined;
}
