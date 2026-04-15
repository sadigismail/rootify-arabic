/**
 * testCases.ts
 * Expanded test suite for SmartRoot Arabic v1 engine.
 * 24 roots across 5 Form I classes.
 *
 * Per-root assertions:
 *   - classification type
 *   - 3ms past, 2ms past (NEW)
 *   - 3ms present, 2ms present (NEW)
 *   - 2ms imperative, 2fs imperative (NEW), 2mp imperative (NEW)
 *   - masdar, active participle, passive participle
 *
 * Run with: pnpm --filter @workspace/api-server run test:smartroot
 */

import { isArabic } from "./normalization.js";
import { classifyRoot } from "./rootClassifier.js";
import { lookupRoot } from "./lexicon.js";
import { conjugate } from "./conjugationEngine.js";
import { getNounForms } from "./nounEngine.js";
import { resolveInflectedForm, getFormILexiconEntry, normalizeInput } from "./form1Lexicon.js";

// ── Diacritic constants ──────────────────────────────────────────
const F  = "\u064E"; // fatha   َ
const K  = "\u0650"; // kasra   ِ
const D  = "\u064F"; // damma   ُ
const S  = "\u0652"; // sukun   ْ
const SH = "\u0651"; // shadda  ّ

// ── Letter constants ─────────────────────────────────────────────
const ALEF    = "\u0627"; // ا
const WAW     = "\u0648"; // و  (also used as W in assimilation tests)
const YA      = "\u064A"; // ي
const YA_MAQ  = "\u0649"; // ى alef maqsura

// Consonants used in test roots
const B    = "\u0628"; // ب
const T    = "\u062A"; // ت
const J    = "\u062C"; // ج
const H    = "\u062D"; // ح
const KH   = "\u062E"; // خ (unused below but kept for completeness)
const D_   = "\u062F"; // د
const DHAL = "\u0630"; // ذ
const R    = "\u0631"; // ر
const Z    = "\u0632"; // ز
const SIN  = "\u0633"; // س
const SHIN = "\u0634"; // ش
const S_   = "\u0635"; // ص
const DAD  = "\u0636"; // ض
const ZAH  = "\u0638"; // ظ  (used in نظّم)
const AYN  = "\u0639"; // ع
const F_   = "\u0641"; // ف
const HA   = "\u0647"; // ه  (used in شاهد)
const Q    = "\u0642"; // ق
const K_   = "\u0643"; // ك
const L    = "\u0644"; // ل
const M    = "\u0645"; // م
const NUN  = "\u0646"; // ن
const W    = "\u0648"; // و (same codepoint as WAW)
const MIM  = "\u0645"; // م (alias for M, used in Form II participle prefix clarity)
const TA_M = "\u0629"; // ة  (ta marbuta — used in Form III masdar مُفَاعَلَة)
const H4P  = "\u0623"; // أ  (hamza above alef — Form IV past/imperative prefix أَفْعَلَ)
const H4M  = "\u0625"; // إ  (hamza below alef — Form IV masdar prefix إِفْعَال)

// ── Suppress unused-variable warning for KH (kept for documentation) ──
void KH;
void MIM; // alias for M

// ── Test interface ───────────────────────────────────────────────
interface TestCase {
  input: string;
  expectedType: string;
  expected3msPast: string;
  expected2msPast: string;
  expected3msPresent: string;
  expected2msPresent: string;
  expected2msImperative: string;
  expected2fsImperative: string;
  expected2mpImperative: string;
  expectedMasdar: string;
  expectedActivePart: string;
  expectedPassivePart: string;
  useFormILex?: boolean;
}

const TEST_CASES: TestCase[] = [

  // ══════════════════════════════════════════════════════════════
  // Regular roots
  // ══════════════════════════════════════════════════════════════
  {
    input: "كتب",
    expectedType: "regular",
    expected3msPast:       K_+F+T+F+B+F,
    expected2msPast:       K_+F+T+F+B+S+T+F,              // كَتَبْتَ
    expected3msPresent:    YA+F+K_+S+T+D+B+D,
    expected2msPresent:    T+F+K_+S+T+D+B+D,              // تَكْتُبُ
    expected2msImperative: ALEF+D+K_+S+T+D+B+S,           // اُكْتُبْ
    expected2fsImperative: ALEF+D+K_+S+T+D+B+K+YA,       // اُكْتُبِي
    expected2mpImperative: ALEF+D+K_+S+T+D+B+D+WAW+ALEF, // اُكْتُبُوا
    expectedMasdar:        "كِتَابَة",
    expectedActivePart:    "كَاتِب",
    expectedPassivePart:   "مَكْتُوب",
  },
  {
    input: "فتح",
    expectedType: "regular",
    expected3msPast:       F_+F+T+F+H+F,
    expected2msPast:       F_+F+T+F+H+S+T+F,             // فَتَحْتَ
    expected3msPresent:    YA+F+F_+S+T+F+H+D,
    expected2msPresent:    T+F+F_+S+T+F+H+D,             // تَفْتَحُ
    expected2msImperative: ALEF+K+F_+S+T+F+H+S,          // اِفْتَحْ
    expected2fsImperative: ALEF+K+F_+S+T+F+H+K+YA,      // اِفْتَحِي
    expected2mpImperative: ALEF+K+F_+S+T+F+H+D+WAW+ALEF,// اِفْتَحُوا
    expectedMasdar:        "فَتْح",
    expectedActivePart:    "فَاتِح",
    expectedPassivePart:   "مَفْتُوح",
  },
  {
    input: "دخل",
    expectedType: "regular",
    expected3msPast:       D_+F+KH+F+L+F,
    expected2msPast:       D_+F+KH+F+L+S+T+F,            // دَخَلْتَ
    expected3msPresent:    YA+F+D_+S+KH+D+L+D,
    expected2msPresent:    T+F+D_+S+KH+D+L+D,            // تَدْخُلُ
    expected2msImperative: ALEF+D+D_+S+KH+D+L+S,         // اُدْخُلْ
    expected2fsImperative: ALEF+D+D_+S+KH+D+L+K+YA,     // اُدْخُلِي
    expected2mpImperative: ALEF+D+D_+S+KH+D+L+D+WAW+ALEF,// اُدْخُلُوا
    expectedMasdar:        "دُخُول",
    expectedActivePart:    "دَاخِل",
    expectedPassivePart:   "مَدْخُول",
  },
  {
    input: "جلس",
    expectedType: "regular",
    expected3msPast:       J+F+L+F+SIN+F,                // جَلَسَ
    expected2msPast:       J+F+L+F+SIN+S+T+F,           // جَلَسْتَ
    expected3msPresent:    YA+F+J+S+L+K+SIN+D,           // يَجْلِسُ
    expected2msPresent:    T+F+J+S+L+K+SIN+D,            // تَجْلِسُ
    expected2msImperative: ALEF+K+J+S+L+K+SIN+S,         // اِجْلِسْ
    expected2fsImperative: ALEF+K+J+S+L+K+SIN+K+YA,     // اِجْلِسِي
    expected2mpImperative: ALEF+K+J+S+L+K+SIN+D+WAW+ALEF,// اِجْلِسُوا
    expectedMasdar:        "جُلُوس",
    expectedActivePart:    "جَالِس",
    expectedPassivePart:   "مَجْلُوس",
  },

  // ══════════════════════════════════════════════════════════════
  // Assimilated roots  (R1 = و)
  // ══════════════════════════════════════════════════════════════
  {
    input: "وعد",
    expectedType: "assimilated",
    expected3msPast:       W+F+AYN+F+D_+F,
    expected2msPast:       W+F+AYN+F+D_+S+T+F,           // وَعَدْتَ
    expected3msPresent:    YA+F+AYN+K+D_+D,              // يَعِدُ
    expected2msPresent:    T+F+AYN+K+D_+D,               // تَعِدُ
    expected2msImperative: AYN+K+D_+S,                    // عِدْ
    expected2fsImperative: AYN+K+D_+K+YA,                // عِدِي
    expected2mpImperative: AYN+K+D_+D+WAW+ALEF,          // عِدُوا
    expectedMasdar:        "وَعْد",
    expectedActivePart:    "وَاعِد",
    expectedPassivePart:   "مَوْعُود",
  },
  {
    input: "وصل",
    expectedType: "assimilated",
    expected3msPast:       W+F+S_+F+L+F,
    expected2msPast:       W+F+S_+F+L+S+T+F,             // وَصَلْتَ
    expected3msPresent:    YA+F+S_+K+L+D,
    expected2msPresent:    T+F+S_+K+L+D,
    expected2msImperative: S_+K+L+S,                      // صِلْ
    expected2fsImperative: S_+K+L+K+YA,                  // صِلِي
    expected2mpImperative: S_+K+L+D+WAW+ALEF,            // صِلُوا
    expectedMasdar:        "وُصُول",
    expectedActivePart:    "وَاصِل",
    expectedPassivePart:   "مَوْصُول",
  },
  {
    input: "وقف",
    expectedType: "assimilated",
    expected3msPast:       W+F+Q+F+F_+F,                 // وَقَفَ
    expected2msPast:       W+F+Q+F+F_+S+T+F,            // وَقَفْتَ
    expected3msPresent:    YA+F+Q+K+F_+D,                // يَقِفُ
    expected2msPresent:    T+F+Q+K+F_+D,                 // تَقِفُ
    expected2msImperative: Q+K+F_+S,                      // قِفْ
    expected2fsImperative: Q+K+F_+K+YA,                  // قِفِي
    expected2mpImperative: Q+K+F_+D+WAW+ALEF,            // قِفُوا
    expectedMasdar:        "وُقُوف",
    expectedActivePart:    "وَاقِف",
    expectedPassivePart:   "مَوْقُوف",
  },
  {
    input: "وزن",
    expectedType: "assimilated",
    expected3msPast:       W+F+Z+F+NUN+F,                // وَزَنَ
    expected2msPast:       W+F+Z+F+NUN+S+T+F,           // وَزَنْتَ
    expected3msPresent:    YA+F+Z+K+NUN+D,               // يَزِنُ
    expected2msPresent:    T+F+Z+K+NUN+D,                // تَزِنُ
    expected2msImperative: Z+K+NUN+S,                     // زِنْ
    expected2fsImperative: Z+K+NUN+K+YA,                 // زِنِي
    expected2mpImperative: Z+K+NUN+D+WAW+ALEF,           // زِنُوا
    expectedMasdar:        "وَزْن",
    expectedActivePart:    "وَازِن",
    expectedPassivePart:   "مَوْزُون",
  },

  // ══════════════════════════════════════════════════════════════
  // Hollow roots  — WAW type  (R2 = و)
  // ══════════════════════════════════════════════════════════════
  {
    // قَالَ — surface form input; canonical قول
    input: "قال",
    expectedType: "hollow_waw",
    expected3msPast:       Q+F+ALEF+L+F,
    expected2msPast:       Q+D+L+S+T+F,                  // قُلْتَ
    expected3msPresent:    YA+F+Q+D+WAW+L+D,
    expected2msPresent:    T+F+Q+D+WAW+L+D,              // تَقُولُ
    expected2msImperative: Q+D+L+S,                       // قُلْ
    expected2fsImperative: Q+D+WAW+L+K+YA,               // قُولِي
    expected2mpImperative: Q+D+WAW+L+D+WAW+ALEF,         // قُولُوا
    expectedMasdar:        "قَوْل",
    expectedActivePart:    "قَائِل",
    expectedPassivePart:   "مَقُول",
  },
  {
    // زَارَ — surface form; canonical زور
    input: "زار",
    expectedType: "hollow_waw",
    expected3msPast:       Z+F+ALEF+R+F,
    expected2msPast:       Z+D+R+S+T+F,                  // زُرْتَ
    expected3msPresent:    YA+F+Z+D+WAW+R+D,
    expected2msPresent:    T+F+Z+D+WAW+R+D,              // تَزُورُ
    expected2msImperative: Z+D+R+S,                       // زُرْ
    expected2fsImperative: Z+D+WAW+R+K+YA,               // زُورِي
    expected2mpImperative: Z+D+WAW+R+D+WAW+ALEF,         // زُورُوا
    expectedMasdar:        "زِيَارَة",
    expectedActivePart:    "زَائِر",
    expectedPassivePart:   "مَزُور",
  },
  {
    // صَامَ — surface form; canonical صوم
    input: "صام",
    expectedType: "hollow_waw",
    expected3msPast:       S_+F+ALEF+M+F,                // صَامَ
    expected2msPast:       S_+D+M+S+T+F,                 // صُمْتَ
    expected3msPresent:    YA+F+S_+D+WAW+M+D,            // يَصُومُ
    expected2msPresent:    T+F+S_+D+WAW+M+D,             // تَصُومُ
    expected2msImperative: S_+D+M+S,                      // صُمْ
    expected2fsImperative: S_+D+WAW+M+K+YA,              // صُومِي
    expected2mpImperative: S_+D+WAW+M+D+WAW+ALEF,        // صُومُوا
    expectedMasdar:        "صَوْم",
    expectedActivePart:    "صَائِم",
    expectedPassivePart:   "مَصُوم",
  },
  {
    // قَامَ — surface form; canonical قوم
    input: "قام",
    expectedType: "hollow_waw",
    expected3msPast:       Q+F+ALEF+M+F,                 // قَامَ
    expected2msPast:       Q+D+M+S+T+F,                  // قُمْتَ
    expected3msPresent:    YA+F+Q+D+WAW+M+D,             // يَقُومُ
    expected2msPresent:    T+F+Q+D+WAW+M+D,              // تَقُومُ
    expected2msImperative: Q+D+M+S,                       // قُمْ
    expected2fsImperative: Q+D+WAW+M+K+YA,               // قُومِي
    expected2mpImperative: Q+D+WAW+M+D+WAW+ALEF,         // قُومُوا
    expectedMasdar:        "قِيَام",
    expectedActivePart:    "قَائِم",
    expectedPassivePart:   "مَقُوم",
  },
  {
    // نَامَ — hollow-waw but presentVowel=a → يَنَامُ (unusual pattern)
    input: "نام",
    expectedType: "hollow_waw",
    expected3msPast:       NUN+F+ALEF+M+F,               // نَامَ
    expected2msPast:       NUN+K+M+S+T+F,                // نِمْتَ (KASRA contraction)
    expected3msPresent:    YA+F+NUN+F+ALEF+M+D,          // يَنَامُ
    expected2msPresent:    T+F+NUN+F+ALEF+M+D,           // تَنَامُ
    expected2msImperative: NUN+F+M+S,                     // نَمْ
    expected2fsImperative: NUN+F+ALEF+M+K+YA,            // نَامِي
    expected2mpImperative: NUN+F+ALEF+M+D+WAW+ALEF,      // نَامُوا
    expectedMasdar:        "نَوْم",
    expectedActivePart:    "نَائِم",
    expectedPassivePart:   "مَنُوم",
  },

  // ══════════════════════════════════════════════════════════════
  // Hollow roots  — YA type  (R2 = ي)
  // ══════════════════════════════════════════════════════════════
  {
    // بَاعَ — surface form; canonical بيع
    input: "باع",
    expectedType: "hollow_ya",
    expected3msPast:       B+F+ALEF+AYN+F,
    expected2msPast:       B+K+AYN+S+T+F,                // بِعْتَ
    expected3msPresent:    YA+F+B+K+YA+AYN+D,
    expected2msPresent:    T+F+B+K+YA+AYN+D,             // تَبِيعُ
    expected2msImperative: B+K+AYN+S,                     // بِعْ
    expected2fsImperative: B+K+YA+AYN+K+YA,              // بِيعِي
    expected2mpImperative: B+K+YA+AYN+D+WAW+ALEF,        // بِيعُوا
    expectedMasdar:        "بَيْع",
    expectedActivePart:    "بَائِع",
    expectedPassivePart:   "مَبِيع",
  },

  // ══════════════════════════════════════════════════════════════
  // Defective roots  — WAW type  (R3 = و)
  // ══════════════════════════════════════════════════════════════
  {
    // دَعَا — surface form; canonical دعو
    input: "دعا",
    expectedType: "defective_waw",
    expected3msPast:       D_+F+AYN+F+ALEF,              // دَعَا
    expected2msPast:       D_+F+AYN+F+WAW+S+T+F,        // دَعَوْتَ
    expected3msPresent:    YA+F+D_+S+AYN+D+WAW,          // يَدْعُو
    expected2msPresent:    T+F+D_+S+AYN+D+WAW,           // تَدْعُو
    expected2msImperative: ALEF+D+D_+S+AYN+D,            // اُدْعُ
    expected2fsImperative: ALEF+D+D_+S+AYN+K+YA,        // اُدْعِي
    expected2mpImperative: ALEF+D+D_+S+AYN+D+WAW+ALEF,  // اُدْعُوا
    expectedMasdar:        "دُعَاء",
    expectedActivePart:    "دَاعٍ",
    expectedPassivePart:   "مَدْعُوّ",
  },

  // ══════════════════════════════════════════════════════════════
  // Defective roots  — YA type  (R3 = ي)
  // ══════════════════════════════════════════════════════════════
  {
    // رَمَى — surface form; canonical رمي
    input: "رمى",
    expectedType: "defective_ya",
    expected3msPast:       R+F+M+F+YA_MAQ,               // رَمَى
    expected2msPast:       R+F+M+F+YA+S+T+F,            // رَمَيْتَ
    expected3msPresent:    YA+F+R+S+M+K+YA,              // يَرْمِي
    expected2msPresent:    T+F+R+S+M+K+YA,               // تَرْمِي
    expected2msImperative: ALEF+K+R+S+M+K,               // اِرْمِ
    expected2fsImperative: ALEF+K+R+S+M+K+YA,            // اِرْمِي
    expected2mpImperative: ALEF+K+R+S+M+D+WAW+ALEF,     // اِرْمُوا
    expectedMasdar:        "رَمْي",
    expectedActivePart:    "رَامٍ",
    expectedPassivePart:   "مَرْمِيّ",
  },
  {
    // حَمَى — surface form; canonical حمي
    input: "حمى",
    expectedType: "defective_ya",
    expected3msPast:       H+F+M+F+YA_MAQ,
    expected2msPast:       H+F+M+F+YA+S+T+F,            // حَمَيْتَ
    expected3msPresent:    YA+F+H+S+M+K+YA,
    expected2msPresent:    T+F+H+S+M+K+YA,
    expected2msImperative: ALEF+K+H+S+M+K,               // اِحْمِ
    expected2fsImperative: ALEF+K+H+S+M+K+YA,            // اِحْمِي
    expected2mpImperative: ALEF+K+H+S+M+D+WAW+ALEF,     // اِحْمُوا
    expectedMasdar:        "حِمَايَة",
    expectedActivePart:    "حَامٍ",
    expectedPassivePart:   "مَحْمِيّ",
  },
  {
    // سَعَى — surface form; canonical سعي (presentVowel=a → يَسْعَى)
    input: "سعى",
    expectedType: "defective_ya",
    expected3msPast:       SIN+F+AYN+F+YA_MAQ,           // سَعَى
    expected2msPast:       SIN+F+AYN+F+YA+S+T+F,        // سَعَيْتَ
    expected3msPresent:    YA+F+SIN+S+AYN+F+YA_MAQ,      // يَسْعَى
    expected2msPresent:    T+F+SIN+S+AYN+F+YA_MAQ,       // تَسْعَى
    expected2msImperative: ALEF+K+SIN+S+AYN+F,           // اِسْعَ
    expected2fsImperative: ALEF+K+SIN+S+AYN+K+YA,        // اِسْعِي
    expected2mpImperative: ALEF+K+SIN+S+AYN+D+WAW+ALEF, // اِسْعُوا
    expectedMasdar:        "سَعْي",
    expectedActivePart:    "سَاعٍ",
    expectedPassivePart:   "مَسْعِيّ",
  },
  {
    // مَشَى — surface form; canonical مشي (presentVowel=i → يَمْشِي)
    input: "مشى",
    expectedType: "defective_ya",
    expected3msPast:       M+F+SHIN+F+YA_MAQ,            // مَشَى
    expected2msPast:       M+F+SHIN+F+YA+S+T+F,         // مَشَيْتَ
    expected3msPresent:    YA+F+M+S+SHIN+K+YA,           // يَمْشِي
    expected2msPresent:    T+F+M+S+SHIN+K+YA,            // تَمْشِي
    expected2msImperative: ALEF+K+M+S+SHIN+K,            // اِمْشِ
    expected2fsImperative: ALEF+K+M+S+SHIN+K+YA,         // اِمْشِي
    expected2mpImperative: ALEF+K+M+S+SHIN+D+WAW+ALEF,  // اِمْشُوا
    expectedMasdar:        "مَشْي",
    expectedActivePart:    "مَاشٍ",
    expectedPassivePart:   "مَمْشِيّ",
  },

  {
    input: "\u0631\u0623\u0649",
    expectedType: "defective_ya",
    useFormILex: true,
    expected3msPast:       R+F+H4P+F+YA_MAQ,
    expected2msPast:       R+F+H4P+F+YA+S+T+F,
    expected3msPresent:    YA+F+R+F+YA_MAQ,
    expected2msPresent:    T+F+R+F+YA_MAQ,
    expected2msImperative: R+F,
    expected2fsImperative: R+F+YA,
    expected2mpImperative: R+F+WAW+S+ALEF,
    expectedMasdar:        "\u0631\u064F\u0624\u0652\u064A\u064E\u0629",
    expectedActivePart:    R+F+ALEF+"\u0621"+K+"\u064D",
    expectedPassivePart:   M+F+R+S+H4P+K+YA+SH,
  },

  // ══════════════════════════════════════════════════════════════
  // Doubled roots  (R2 = R3)
  // ══════════════════════════════════════════════════════════════
  {
    input: "ردّ",
    expectedType: "doubled",
    expected3msPast:       R+F+D_+SH+F,                  // رَدَّ
    expected2msPast:       R+F+D_+F+D_+S+T+F,           // رَدَدْتَ
    expected3msPresent:    YA+F+R+D+D_+SH+D,             // يَرُدُّ
    expected2msPresent:    T+F+R+D+D_+SH+D,              // تَرُدُّ
    expected2msImperative: R+D+D_+SH+F,                   // رُدَّ
    expected2fsImperative: R+D+D_+SH+K+YA,               // رُدِّي
    expected2mpImperative: R+D+D_+SH+D+WAW+ALEF,         // رُدُّوا
    expectedMasdar:        "رَدّ",
    expectedActivePart:    "رَادّ",
    expectedPassivePart:   "مَرْدُود",
  },
  {
    input: "مدّ",
    expectedType: "doubled",
    expected3msPast:       M+F+D_+SH+F,
    expected2msPast:       M+F+D_+F+D_+S+T+F,           // مَدَدْتَ
    expected3msPresent:    YA+F+M+D+D_+SH+D,
    expected2msPresent:    T+F+M+D+D_+SH+D,              // تَمُدُّ
    expected2msImperative: M+D+D_+SH+F,                   // مُدَّ
    expected2fsImperative: M+D+D_+SH+K+YA,               // مُدِّي
    expected2mpImperative: M+D+D_+SH+D+WAW+ALEF,         // مُدُّوا
    expectedMasdar:        "مَدّ",
    expectedActivePart:    "مَادّ",
    expectedPassivePart:   "مَمْدُود",
  },
  {
    input: "جرّ",
    expectedType: "doubled",
    expected3msPast:       J+F+R+SH+F,
    expected2msPast:       J+F+R+F+R+S+T+F,             // جَرَرْتَ
    expected3msPresent:    YA+F+J+D+R+SH+D,
    expected2msPresent:    T+F+J+D+R+SH+D,               // تَجُرُّ
    expected2msImperative: J+D+R+SH+F,                    // جُرَّ
    expected2fsImperative: J+D+R+SH+K+YA,                // جُرِّي
    expected2mpImperative: J+D+R+SH+D+WAW+ALEF,          // جُرُّوا
    expectedMasdar:        "جَرّ",
    expectedActivePart:    "جَارّ",
    expectedPassivePart:   "مَجْرُور",
  },
  {
    // شَدَّ — canonical شدد
    input: "شدّ",
    expectedType: "doubled",
    expected3msPast:       SHIN+F+D_+SH+F,               // شَدَّ
    expected2msPast:       SHIN+F+D_+F+D_+S+T+F,        // شَدَدْتَ
    expected3msPresent:    YA+F+SHIN+D+D_+SH+D,          // يَشُدُّ
    expected2msPresent:    T+F+SHIN+D+D_+SH+D,           // تَشُدُّ
    expected2msImperative: SHIN+D+D_+SH+F,                // شُدَّ
    expected2fsImperative: SHIN+D+D_+SH+K+YA,            // شُدِّي
    expected2mpImperative: SHIN+D+D_+SH+D+WAW+ALEF,      // شُدُّوا
    expectedMasdar:        "شَدّ",
    expectedActivePart:    "شَادّ",
    expectedPassivePart:   "مَشْدُود",
  },
  {
    // عَضَّ — canonical عضض  (R2=R3=ض DAD)
    input: "عضّ",
    expectedType: "doubled",
    expected3msPast:       AYN+F+DAD+SH+F,               // عَضَّ
    expected2msPast:       AYN+F+DAD+F+DAD+S+T+F,       // عَضَضْتَ
    expected3msPresent:    YA+F+AYN+D+DAD+SH+D,          // يَعُضُّ
    expected2msPresent:    T+F+AYN+D+DAD+SH+D,           // تَعُضُّ
    expected2msImperative: AYN+D+DAD+SH+F,                // عُضَّ
    expected2fsImperative: AYN+D+DAD+SH+K+YA,            // عُضِّي
    expected2mpImperative: AYN+D+DAD+SH+D+WAW+ALEF,      // عُضُّوا
    expectedMasdar:        "عَضّ",
    expectedActivePart:    "عَاضّ",
    expectedPassivePart:   "مَعْضُوض",
  },

  // ═══════════════════════════════════════════════════════════════
  // FORM II  —  فَعَّلَ / يُفَعِّلُ  (geminated R2 with shadda)
  // ═══════════════════════════════════════════════════════════════

  {
    // درّس — R1=د, R2=ر, R3=س
    input: "درّس",
    expectedType: "form_ii",
    expected3msPast:       D_+F+R+SH+F+SIN+F,           // دَرَّسَ
    expected2msPast:       D_+F+R+SH+F+SIN+S+T+F,       // دَرَّسْتَ
    expected3msPresent:    YA+D+D_+F+R+SH+K+SIN+D,      // يُدَرِّسُ
    expected2msPresent:    T+D+D_+F+R+SH+K+SIN+D,       // تُدَرِّسُ
    expected2msImperative: D_+F+R+SH+K+SIN+S,           // دَرِّسْ
    expected2fsImperative: D_+F+R+SH+K+SIN+K+YA,        // دَرِّسِي
    expected2mpImperative: D_+F+R+SH+K+SIN+D+W+ALEF,    // دَرِّسُوا
    expectedMasdar:        T+F+D_+S+R+K+YA+SIN,         // تَدْرِيس
    expectedActivePart:    M+D+D_+F+R+SH+K+SIN,         // مُدَرِّس
    expectedPassivePart:   M+D+D_+F+R+SH+F+SIN,         // مُدَرَّس
  },
  {
    // علّم — R1=ع, R2=ل, R3=م
    input: "علّم",
    expectedType: "form_ii",
    expected3msPast:       AYN+F+L+SH+F+M+F,            // عَلَّمَ
    expected2msPast:       AYN+F+L+SH+F+M+S+T+F,        // عَلَّمْتَ
    expected3msPresent:    YA+D+AYN+F+L+SH+K+M+D,       // يُعَلِّمُ
    expected2msPresent:    T+D+AYN+F+L+SH+K+M+D,        // تُعَلِّمُ
    expected2msImperative: AYN+F+L+SH+K+M+S,            // عَلِّمْ
    expected2fsImperative: AYN+F+L+SH+K+M+K+YA,         // عَلِّمِي
    expected2mpImperative: AYN+F+L+SH+K+M+D+W+ALEF,     // عَلِّمُوا
    expectedMasdar:        T+F+AYN+S+L+K+YA+M,          // تَعْلِيم
    expectedActivePart:    M+D+AYN+F+L+SH+K+M,          // مُعَلِّم
    expectedPassivePart:   M+D+AYN+F+L+SH+F+M,          // مُعَلَّم
  },
  {
    // قرّب — R1=ق, R2=ر, R3=ب
    input: "قرّب",
    expectedType: "form_ii",
    expected3msPast:       Q+F+R+SH+F+B+F,              // قَرَّبَ
    expected2msPast:       Q+F+R+SH+F+B+S+T+F,          // قَرَّبْتَ
    expected3msPresent:    YA+D+Q+F+R+SH+K+B+D,         // يُقَرِّبُ
    expected2msPresent:    T+D+Q+F+R+SH+K+B+D,          // تُقَرِّبُ
    expected2msImperative: Q+F+R+SH+K+B+S,              // قَرِّبْ
    expected2fsImperative: Q+F+R+SH+K+B+K+YA,           // قَرِّبِي
    expected2mpImperative: Q+F+R+SH+K+B+D+W+ALEF,       // قَرِّبُوا
    expectedMasdar:        T+F+Q+S+R+K+YA+B,            // تَقْرِيب
    expectedActivePart:    M+D+Q+F+R+SH+K+B,            // مُقَرِّب
    expectedPassivePart:   M+D+Q+F+R+SH+F+B,            // مُقَرَّب
  },
  {
    // نظّم — R1=ن, R2=ظ, R3=م
    input: "نظّم",
    expectedType: "form_ii",
    expected3msPast:       NUN+F+ZAH+SH+F+M+F,          // نَظَّمَ
    expected2msPast:       NUN+F+ZAH+SH+F+M+S+T+F,      // نَظَّمْتَ
    expected3msPresent:    YA+D+NUN+F+ZAH+SH+K+M+D,     // يُنَظِّمُ
    expected2msPresent:    T+D+NUN+F+ZAH+SH+K+M+D,      // تُنَظِّمُ
    expected2msImperative: NUN+F+ZAH+SH+K+M+S,          // نَظِّمْ
    expected2fsImperative: NUN+F+ZAH+SH+K+M+K+YA,       // نَظِّمِي
    expected2mpImperative: NUN+F+ZAH+SH+K+M+D+W+ALEF,   // نَظِّمُوا
    expectedMasdar:        T+F+NUN+S+ZAH+K+YA+M,        // تَنْظِيم
    expectedActivePart:    M+D+NUN+F+ZAH+SH+K+M,        // مُنَظِّم
    expectedPassivePart:   M+D+NUN+F+ZAH+SH+F+M,        // مُنَظَّم
  },
  {
    // قدّم — R1=ق, R2=د, R3=م
    input: "قدّم",
    expectedType: "form_ii",
    expected3msPast:       Q+F+D_+SH+F+M+F,             // قَدَّمَ
    expected2msPast:       Q+F+D_+SH+F+M+S+T+F,         // قَدَّمْتَ
    expected3msPresent:    YA+D+Q+F+D_+SH+K+M+D,        // يُقَدِّمُ
    expected2msPresent:    T+D+Q+F+D_+SH+K+M+D,         // تُقَدِّمُ
    expected2msImperative: Q+F+D_+SH+K+M+S,             // قَدِّمْ
    expected2fsImperative: Q+F+D_+SH+K+M+K+YA,          // قَدِّمِي
    expected2mpImperative: Q+F+D_+SH+K+M+D+W+ALEF,      // قَدِّمُوا
    expectedMasdar:        T+F+Q+S+D_+K+YA+M,           // تَقْدِيم
    expectedActivePart:    M+D+Q+F+D_+SH+K+M,           // مُقَدِّم
    expectedPassivePart:   M+D+Q+F+D_+SH+F+M,           // مُقَدَّم
  },

  // ═══════════════════════════════════════════════════════════════
  // FORM III  —  فَاعَلَ / يُفَاعِلُ  (long ALEF between R1 and R2)
  // ═══════════════════════════════════════════════════════════════

  {
    // ساعد — R1=س, R2=ع, R3=د
    input: "ساعد",
    expectedType: "form_iii",
    expected3msPast:       SIN+F+ALEF+AYN+F+D_+F,           // سَاعَدَ
    expected2msPast:       SIN+F+ALEF+AYN+F+D_+S+T+F,       // سَاعَدْتَ
    expected3msPresent:    YA+D+SIN+F+ALEF+AYN+K+D_+D,      // يُسَاعِدُ
    expected2msPresent:    T+D+SIN+F+ALEF+AYN+K+D_+D,       // تُسَاعِدُ
    expected2msImperative: SIN+F+ALEF+AYN+K+D_+S,           // سَاعِدْ
    expected2fsImperative: SIN+F+ALEF+AYN+K+D_+K+YA,        // سَاعِدِي
    expected2mpImperative: SIN+F+ALEF+AYN+K+D_+D+W+ALEF,    // سَاعِدُوا
    expectedMasdar:        M+D+SIN+F+ALEF+AYN+F+D_+F+TA_M,  // مُسَاعَدَة
    expectedActivePart:    M+D+SIN+F+ALEF+AYN+K+D_,         // مُسَاعِد
    expectedPassivePart:   M+D+SIN+F+ALEF+AYN+F+D_,         // مُسَاعَد
  },
  {
    // شاهد — R1=ش, R2=ه, R3=د
    input: "شاهد",
    expectedType: "form_iii",
    expected3msPast:       SHIN+F+ALEF+HA+F+D_+F,           // شَاهَدَ
    expected2msPast:       SHIN+F+ALEF+HA+F+D_+S+T+F,       // شَاهَدْتَ
    expected3msPresent:    YA+D+SHIN+F+ALEF+HA+K+D_+D,      // يُشَاهِدُ
    expected2msPresent:    T+D+SHIN+F+ALEF+HA+K+D_+D,       // تُشَاهِدُ
    expected2msImperative: SHIN+F+ALEF+HA+K+D_+S,           // شَاهِدْ
    expected2fsImperative: SHIN+F+ALEF+HA+K+D_+K+YA,        // شَاهِدِي
    expected2mpImperative: SHIN+F+ALEF+HA+K+D_+D+W+ALEF,    // شَاهِدُوا
    expectedMasdar:        M+D+SHIN+F+ALEF+HA+F+D_+F+TA_M,  // مُشَاهَدَة
    expectedActivePart:    M+D+SHIN+F+ALEF+HA+K+D_,         // مُشَاهِد
    expectedPassivePart:   M+D+SHIN+F+ALEF+HA+F+D_,         // مُشَاهَد
  },
  {
    // قابل — R1=ق, R2=ب, R3=ل
    input: "قابل",
    expectedType: "form_iii",
    expected3msPast:       Q+F+ALEF+B+F+L+F,                // قَابَلَ
    expected2msPast:       Q+F+ALEF+B+F+L+S+T+F,            // قَابَلْتَ
    expected3msPresent:    YA+D+Q+F+ALEF+B+K+L+D,           // يُقَابِلُ
    expected2msPresent:    T+D+Q+F+ALEF+B+K+L+D,            // تُقَابِلُ
    expected2msImperative: Q+F+ALEF+B+K+L+S,                // قَابِلْ
    expected2fsImperative: Q+F+ALEF+B+K+L+K+YA,             // قَابِلِي
    expected2mpImperative: Q+F+ALEF+B+K+L+D+W+ALEF,         // قَابِلُوا
    expectedMasdar:        M+D+Q+F+ALEF+B+F+L+F+TA_M,       // مُقَابَلَة
    expectedActivePart:    M+D+Q+F+ALEF+B+K+L,              // مُقَابِل
    expectedPassivePart:   M+D+Q+F+ALEF+B+F+L,              // مُقَابَل
  },
  {
    // ناقش — R1=ن, R2=ق, R3=ش
    input: "ناقش",
    expectedType: "form_iii",
    expected3msPast:       NUN+F+ALEF+Q+F+SHIN+F,           // نَاقَشَ
    expected2msPast:       NUN+F+ALEF+Q+F+SHIN+S+T+F,       // نَاقَشْتَ
    expected3msPresent:    YA+D+NUN+F+ALEF+Q+K+SHIN+D,      // يُنَاقِشُ
    expected2msPresent:    T+D+NUN+F+ALEF+Q+K+SHIN+D,       // تُنَاقِشُ
    expected2msImperative: NUN+F+ALEF+Q+K+SHIN+S,           // نَاقِشْ
    expected2fsImperative: NUN+F+ALEF+Q+K+SHIN+K+YA,        // نَاقِشِي
    expected2mpImperative: NUN+F+ALEF+Q+K+SHIN+D+W+ALEF,    // نَاقِشُوا
    expectedMasdar:        M+D+NUN+F+ALEF+Q+F+SHIN+F+TA_M,  // مُنَاقَشَة
    expectedActivePart:    M+D+NUN+F+ALEF+Q+K+SHIN,         // مُنَاقِش
    expectedPassivePart:   M+D+NUN+F+ALEF+Q+F+SHIN,         // مُنَاقَش
  },
  {
    // سافر — R1=س, R2=ف, R3=ر
    input: "سافر",
    expectedType: "form_iii",
    expected3msPast:       SIN+F+ALEF+F_+F+R+F,             // سَافَرَ
    expected2msPast:       SIN+F+ALEF+F_+F+R+S+T+F,         // سَافَرْتَ
    expected3msPresent:    YA+D+SIN+F+ALEF+F_+K+R+D,        // يُسَافِرُ
    expected2msPresent:    T+D+SIN+F+ALEF+F_+K+R+D,         // تُسَافِرُ
    expected2msImperative: SIN+F+ALEF+F_+K+R+S,             // سَافِرْ
    expected2fsImperative: SIN+F+ALEF+F_+K+R+K+YA,          // سَافِرِي
    expected2mpImperative: SIN+F+ALEF+F_+K+R+D+W+ALEF,      // سَافِرُوا
    expectedMasdar:        M+D+SIN+F+ALEF+F_+F+R+F+TA_M,    // مُسَافَرَة
    expectedActivePart:    M+D+SIN+F+ALEF+F_+K+R,           // مُسَافِر
    expectedPassivePart:   M+D+SIN+F+ALEF+F_+F+R,           // مُسَافَر
  },

  // ══════════════════════════════════════════════════════════════
  // Form IV: أَفْعَلَ / يُفْعِلُ  (5 roots)
  // ══════════════════════════════════════════════════════════════
  {
    // أكرم — R1=ك K_, R2=ر R, R3=م M
    input: "\u0623\u0643\u0631\u0645",  // أكرم
    expectedType: "form_iv",
    expected3msPast:       H4P+F+K_+S+R+F+M+F,              // أَكْرَمَ
    expected2msPast:       H4P+F+K_+S+R+F+M+S+T+F,          // أَكْرَمْتَ
    expected3msPresent:    YA+D+K_+S+R+K+M+D,               // يُكْرِمُ
    expected2msPresent:    T+D+K_+S+R+K+M+D,                // تُكْرِمُ
    expected2msImperative: H4P+F+K_+S+R+K+M+S,              // أَكْرِمْ
    expected2fsImperative: H4P+F+K_+S+R+K+M+K+YA,           // أَكْرِمِي
    expected2mpImperative: H4P+F+K_+S+R+K+M+D+WAW+ALEF,     // أَكْرِمُوا
    expectedMasdar:        H4M+K+K_+S+R+F+ALEF+M,           // إِكْرَام
    expectedActivePart:    M+D+K_+S+R+K+M,                  // مُكْرِم
    expectedPassivePart:   M+D+K_+S+R+F+M,                  // مُكْرَم
  },
  {
    // أرسل — R1=ر R, R2=س SIN, R3=ل L
    input: "\u0623\u0631\u0633\u0644",  // أرسل
    expectedType: "form_iv",
    expected3msPast:       H4P+F+R+S+SIN+F+L+F,             // أَرْسَلَ
    expected2msPast:       H4P+F+R+S+SIN+F+L+S+T+F,         // أَرْسَلْتَ
    expected3msPresent:    YA+D+R+S+SIN+K+L+D,              // يُرْسِلُ
    expected2msPresent:    T+D+R+S+SIN+K+L+D,               // تُرْسِلُ
    expected2msImperative: H4P+F+R+S+SIN+K+L+S,             // أَرْسِلْ
    expected2fsImperative: H4P+F+R+S+SIN+K+L+K+YA,          // أَرْسِلِي
    expected2mpImperative: H4P+F+R+S+SIN+K+L+D+WAW+ALEF,    // أَرْسِلُوا
    expectedMasdar:        H4M+K+R+S+SIN+F+ALEF+L,          // إِرْسَال
    expectedActivePart:    M+D+R+S+SIN+K+L,                 // مُرْسِل
    expectedPassivePart:   M+D+R+S+SIN+F+L,                 // مُرْسَل
  },
  {
    // أخبر — R1=خ KH, R2=ب B, R3=ر R
    input: "\u0623\u062E\u0628\u0631",  // أخبر
    expectedType: "form_iv",
    expected3msPast:       H4P+F+KH+S+B+F+R+F,              // أَخْبَرَ
    expected2msPast:       H4P+F+KH+S+B+F+R+S+T+F,          // أَخْبَرْتَ
    expected3msPresent:    YA+D+KH+S+B+K+R+D,               // يُخْبِرُ
    expected2msPresent:    T+D+KH+S+B+K+R+D,                // تُخْبِرُ
    expected2msImperative: H4P+F+KH+S+B+K+R+S,              // أَخْبِرْ
    expected2fsImperative: H4P+F+KH+S+B+K+R+K+YA,           // أَخْبِرِي
    expected2mpImperative: H4P+F+KH+S+B+K+R+D+WAW+ALEF,     // أَخْبِرُوا
    expectedMasdar:        H4M+K+KH+S+B+F+ALEF+R,           // إِخْبَار
    expectedActivePart:    M+D+KH+S+B+K+R,                  // مُخْبِر
    expectedPassivePart:   M+D+KH+S+B+F+R,                  // مُخْبَر
  },
  {
    // أنتج — R1=ن NUN, R2=ت T, R3=ج J
    input: "\u0623\u0646\u062A\u062C",  // أنتج
    expectedType: "form_iv",
    expected3msPast:       H4P+F+NUN+S+T+F+J+F,             // أَنْتَجَ
    expected2msPast:       H4P+F+NUN+S+T+F+J+S+T+F,         // أَنْتَجْتَ
    expected3msPresent:    YA+D+NUN+S+T+K+J+D,              // يُنْتِجُ
    expected2msPresent:    T+D+NUN+S+T+K+J+D,               // تُنْتِجُ
    expected2msImperative: H4P+F+NUN+S+T+K+J+S,             // أَنْتِجْ
    expected2fsImperative: H4P+F+NUN+S+T+K+J+K+YA,          // أَنْتِجِي
    expected2mpImperative: H4P+F+NUN+S+T+K+J+D+WAW+ALEF,    // أَنْتِجُوا
    expectedMasdar:        H4M+K+NUN+S+T+F+ALEF+J,          // إِنْتَاج
    expectedActivePart:    M+D+NUN+S+T+K+J,                 // مُنْتِج
    expectedPassivePart:   M+D+NUN+S+T+F+J,                 // مُنْتَج
  },
  {
    // أسرع — R1=س SIN, R2=ر R, R3=ع AYN
    input: "\u0623\u0633\u0631\u0639",  // أسرع
    expectedType: "form_iv",
    expected3msPast:       H4P+F+SIN+S+R+F+AYN+F,           // أَسْرَعَ
    expected2msPast:       H4P+F+SIN+S+R+F+AYN+S+T+F,       // أَسْرَعْتَ
    expected3msPresent:    YA+D+SIN+S+R+K+AYN+D,            // يُسْرِعُ
    expected2msPresent:    T+D+SIN+S+R+K+AYN+D,             // تُسْرِعُ
    expected2msImperative: H4P+F+SIN+S+R+K+AYN+S,           // أَسْرِعْ
    expected2fsImperative: H4P+F+SIN+S+R+K+AYN+K+YA,        // أَسْرِعِي
    expected2mpImperative: H4P+F+SIN+S+R+K+AYN+D+WAW+ALEF,  // أَسْرِعُوا
    expectedMasdar:        H4M+K+SIN+S+R+F+ALEF+AYN,        // إِسْرَاع
    expectedActivePart:    M+D+SIN+S+R+K+AYN,               // مُسْرِع
    expectedPassivePart:   M+D+SIN+S+R+F+AYN,               // مُسْرَع
  },

  // ══════════════════════════════════════════════════════════════
  // Form V: تَفَعَّلَ / يَتَفَعَّلُ  (TA prefix + geminated R2)
  // Detection: 4-char bare string, pos 0 = ت, pos 1 ≠ ALEF
  // Past stem: T+F+R1+F+R2+SH+F+R3; Present: YA+F+stem+D;
  // Imp: stem+S; Masdar: T+F+R1+F+R2+SH+D+R3;
  // AP: M+D+T+F+R1+F+R2+SH+K+R3; PP: M+D+T+F+R1+F+R2+SH+F+R3
  // ══════════════════════════════════════════════════════════════
  {
    // تعلّم — R1=ع AYN, R2=ل L, R3=م M   (input includes shadda on L)
    input: T+AYN+L+SH+M,
    expectedType: "form_v",
    expected3msPast:       T+F+AYN+F+L+SH+F+M+F,           // تَعَلَّمَ
    expected2msPast:       T+F+AYN+F+L+SH+F+M+S+T+F,       // تَعَلَّمْتَ
    expected3msPresent:    YA+F+T+F+AYN+F+L+SH+F+M+D,      // يَتَعَلَّمُ
    expected2msPresent:    T+F+T+F+AYN+F+L+SH+F+M+D,       // تَتَعَلَّمُ
    expected2msImperative: T+F+AYN+F+L+SH+F+M+S,           // تَعَلَّمْ
    expected2fsImperative: T+F+AYN+F+L+SH+F+M+K+YA,        // تَعَلَّمِي
    expected2mpImperative: T+F+AYN+F+L+SH+F+M+D+WAW+ALEF,  // تَعَلَّمُوا
    expectedMasdar:        T+F+AYN+F+L+SH+D+M,             // تَعَلُّم
    expectedActivePart:    M+D+T+F+AYN+F+L+SH+K+M,         // مُتَعَلِّم
    expectedPassivePart:   M+D+T+F+AYN+F+L+SH+F+M,         // مُتَعَلَّم
  },
  {
    // تدرّب — R1=د D_, R2=ر R, R3=ب B   (input includes shadda on R)
    input: T+D_+R+SH+B,
    expectedType: "form_v",
    expected3msPast:       T+F+D_+F+R+SH+F+B+F,            // تَدَرَّبَ
    expected2msPast:       T+F+D_+F+R+SH+F+B+S+T+F,        // تَدَرَّبْتَ
    expected3msPresent:    YA+F+T+F+D_+F+R+SH+F+B+D,       // يَتَدَرَّبُ
    expected2msPresent:    T+F+T+F+D_+F+R+SH+F+B+D,        // تَتَدَرَّبُ
    expected2msImperative: T+F+D_+F+R+SH+F+B+S,            // تَدَرَّبْ
    expected2fsImperative: T+F+D_+F+R+SH+F+B+K+YA,         // تَدَرَّبِي
    expected2mpImperative: T+F+D_+F+R+SH+F+B+D+WAW+ALEF,   // تَدَرَّبُوا
    expectedMasdar:        T+F+D_+F+R+SH+D+B,              // تَدَرُّب
    expectedActivePart:    M+D+T+F+D_+F+R+SH+K+B,          // مُتَدَرِّب
    expectedPassivePart:   M+D+T+F+D_+F+R+SH+F+B,          // مُتَدَرَّب
  },
  {
    // تقدّم — R1=ق Q, R2=د D_, R3=م M   (input includes shadda on D_)
    input: T+Q+D_+SH+M,
    expectedType: "form_v",
    expected3msPast:       T+F+Q+F+D_+SH+F+M+F,            // تَقَدَّمَ
    expected2msPast:       T+F+Q+F+D_+SH+F+M+S+T+F,        // تَقَدَّمْتَ
    expected3msPresent:    YA+F+T+F+Q+F+D_+SH+F+M+D,       // يَتَقَدَّمُ
    expected2msPresent:    T+F+T+F+Q+F+D_+SH+F+M+D,        // تَتَقَدَّمُ
    expected2msImperative: T+F+Q+F+D_+SH+F+M+S,            // تَقَدَّمْ
    expected2fsImperative: T+F+Q+F+D_+SH+F+M+K+YA,         // تَقَدَّمِي
    expected2mpImperative: T+F+Q+F+D_+SH+F+M+D+WAW+ALEF,   // تَقَدَّمُوا
    expectedMasdar:        T+F+Q+F+D_+SH+D+M,              // تَقَدُّم
    expectedActivePart:    M+D+T+F+Q+F+D_+SH+K+M,          // مُتَقَدِّم
    expectedPassivePart:   M+D+T+F+Q+F+D_+SH+F+M,          // مُتَقَدَّم
  },
  {
    // تنظّم — R1=ن NUN, R2=ظ ZAH, R3=م M   (input includes shadda on ZAH)
    input: T+NUN+ZAH+SH+M,
    expectedType: "form_v",
    expected3msPast:       T+F+NUN+F+ZAH+SH+F+M+F,         // تَنَظَّمَ
    expected2msPast:       T+F+NUN+F+ZAH+SH+F+M+S+T+F,     // تَنَظَّمْتَ
    expected3msPresent:    YA+F+T+F+NUN+F+ZAH+SH+F+M+D,    // يَتَنَظَّمُ
    expected2msPresent:    T+F+T+F+NUN+F+ZAH+SH+F+M+D,     // تَتَنَظَّمُ
    expected2msImperative: T+F+NUN+F+ZAH+SH+F+M+S,         // تَنَظَّمْ
    expected2fsImperative: T+F+NUN+F+ZAH+SH+F+M+K+YA,      // تَنَظَّمِي
    expected2mpImperative: T+F+NUN+F+ZAH+SH+F+M+D+WAW+ALEF,// تَنَظَّمُوا
    expectedMasdar:        T+F+NUN+F+ZAH+SH+D+M,           // تَنَظُّم
    expectedActivePart:    M+D+T+F+NUN+F+ZAH+SH+K+M,       // مُتَنَظِّم
    expectedPassivePart:   M+D+T+F+NUN+F+ZAH+SH+F+M,       // مُتَنَظَّم
  },
  {
    // تحسّن — R1=ح H, R2=س SIN, R3=ن NUN   (input includes shadda on SIN)
    input: T+H+SIN+SH+NUN,
    expectedType: "form_v",
    expected3msPast:       T+F+H+F+SIN+SH+F+NUN+F,         // تَحَسَّنَ
    expected2msPast:       T+F+H+F+SIN+SH+F+NUN+S+T+F,     // تَحَسَّنْتَ
    expected3msPresent:    YA+F+T+F+H+F+SIN+SH+F+NUN+D,    // يَتَحَسَّنُ
    expected2msPresent:    T+F+T+F+H+F+SIN+SH+F+NUN+D,     // تَتَحَسَّنُ
    expected2msImperative: T+F+H+F+SIN+SH+F+NUN+S,         // تَحَسَّنْ
    expected2fsImperative: T+F+H+F+SIN+SH+F+NUN+K+YA,      // تَحَسَّنِي
    expected2mpImperative: T+F+H+F+SIN+SH+F+NUN+D+WAW+ALEF,// تَحَسَّنُوا
    expectedMasdar:        T+F+H+F+SIN+SH+D+NUN,           // تَحَسُّن
    expectedActivePart:    M+D+T+F+H+F+SIN+SH+K+NUN,       // مُتَحَسِّن
    expectedPassivePart:   M+D+T+F+H+F+SIN+SH+F+NUN,       // مُتَحَسَّن
  },

  // ══════════════════════════════════════════════════════════════
  // Form VI: تَفَاعَلَ / يَتَفَاعَلُ  (TA prefix + long ALEF between R1 and R2)
  // Detection: 5-char bare string, pos 0 = ت, pos 2 = ا (ALEF)
  // Past stem: T+F+R1+F+ALEF+R2+F+R3; Present: YA+F+stem+D;
  // Imp: stem+S; Masdar: T+F+R1+F+ALEF+R2+D+R3;
  // AP: M+D+T+F+R1+F+ALEF+R2+K+R3; PP: M+D+T+F+R1+F+ALEF+R2+F+R3
  // ══════════════════════════════════════════════════════════════
  {
    // تقابل — R1=ق Q, R2=ب B, R3=ل L
    input: T+Q+ALEF+B+L,
    expectedType: "form_vi",
    expected3msPast:       T+F+Q+F+ALEF+B+F+L+F,           // تَقَابَلَ
    expected2msPast:       T+F+Q+F+ALEF+B+F+L+S+T+F,       // تَقَابَلْتَ
    expected3msPresent:    YA+F+T+F+Q+F+ALEF+B+F+L+D,      // يَتَقَابَلُ
    expected2msPresent:    T+F+T+F+Q+F+ALEF+B+F+L+D,       // تَتَقَابَلُ
    expected2msImperative: T+F+Q+F+ALEF+B+F+L+S,           // تَقَابَلْ
    expected2fsImperative: T+F+Q+F+ALEF+B+F+L+K+YA,        // تَقَابَلِي
    expected2mpImperative: T+F+Q+F+ALEF+B+F+L+D+WAW+ALEF,  // تَقَابَلُوا
    expectedMasdar:        T+F+Q+F+ALEF+B+D+L,             // تَقَابُل
    expectedActivePart:    M+D+T+F+Q+F+ALEF+B+K+L,         // مُتَقَابِل
    expectedPassivePart:   M+D+T+F+Q+F+ALEF+B+F+L,         // مُتَقَابَل
  },
  {
    // تناقش — R1=ن NUN, R2=ق Q, R3=ش SHIN
    input: T+NUN+ALEF+Q+SHIN,
    expectedType: "form_vi",
    expected3msPast:       T+F+NUN+F+ALEF+Q+F+SHIN+F,      // تَنَاقَشَ
    expected2msPast:       T+F+NUN+F+ALEF+Q+F+SHIN+S+T+F,  // تَنَاقَشْتَ
    expected3msPresent:    YA+F+T+F+NUN+F+ALEF+Q+F+SHIN+D, // يَتَنَاقَشُ
    expected2msPresent:    T+F+T+F+NUN+F+ALEF+Q+F+SHIN+D,  // تَتَنَاقَشُ
    expected2msImperative: T+F+NUN+F+ALEF+Q+F+SHIN+S,      // تَنَاقَشْ
    expected2fsImperative: T+F+NUN+F+ALEF+Q+F+SHIN+K+YA,   // تَنَاقَشِي
    expected2mpImperative: T+F+NUN+F+ALEF+Q+F+SHIN+D+WAW+ALEF, // تَنَاقَشُوا
    expectedMasdar:        T+F+NUN+F+ALEF+Q+D+SHIN,        // تَنَاقُش
    expectedActivePart:    M+D+T+F+NUN+F+ALEF+Q+K+SHIN,    // مُتَنَاقِش
    expectedPassivePart:   M+D+T+F+NUN+F+ALEF+Q+F+SHIN,    // مُتَنَاقَش
  },
  {
    // تشاور — R1=ش SHIN, R2=و W, R3=ر R
    input: T+SHIN+ALEF+W+R,
    expectedType: "form_vi",
    expected3msPast:       T+F+SHIN+F+ALEF+W+F+R+F,        // تَشَاوَرَ
    expected2msPast:       T+F+SHIN+F+ALEF+W+F+R+S+T+F,    // تَشَاوَرْتَ
    expected3msPresent:    YA+F+T+F+SHIN+F+ALEF+W+F+R+D,   // يَتَشَاوَرُ
    expected2msPresent:    T+F+T+F+SHIN+F+ALEF+W+F+R+D,    // تَتَشَاوَرُ
    expected2msImperative: T+F+SHIN+F+ALEF+W+F+R+S,        // تَشَاوَرْ
    expected2fsImperative: T+F+SHIN+F+ALEF+W+F+R+K+YA,     // تَشَاوَرِي
    expected2mpImperative: T+F+SHIN+F+ALEF+W+F+R+D+WAW+ALEF, // تَشَاوَرُوا
    expectedMasdar:        T+F+SHIN+F+ALEF+W+D+R,          // تَشَاوُر
    expectedActivePart:    M+D+T+F+SHIN+F+ALEF+W+K+R,      // مُتَشَاوِر
    expectedPassivePart:   M+D+T+F+SHIN+F+ALEF+W+F+R,      // مُتَشَاوَر
  },
  {
    // تساعد — R1=س SIN, R2=ع AYN, R3=د D_
    input: T+SIN+ALEF+AYN+D_,
    expectedType: "form_vi",
    expected3msPast:       T+F+SIN+F+ALEF+AYN+F+D_+F,      // تَسَاعَدَ
    expected2msPast:       T+F+SIN+F+ALEF+AYN+F+D_+S+T+F,  // تَسَاعَدْتَ
    expected3msPresent:    YA+F+T+F+SIN+F+ALEF+AYN+F+D_+D, // يَتَسَاعَدُ
    expected2msPresent:    T+F+T+F+SIN+F+ALEF+AYN+F+D_+D,  // تَتَسَاعَدُ
    expected2msImperative: T+F+SIN+F+ALEF+AYN+F+D_+S,      // تَسَاعَدْ
    expected2fsImperative: T+F+SIN+F+ALEF+AYN+F+D_+K+YA,   // تَسَاعَدِي
    expected2mpImperative: T+F+SIN+F+ALEF+AYN+F+D_+D+WAW+ALEF, // تَسَاعَدُوا
    expectedMasdar:        T+F+SIN+F+ALEF+AYN+D+D_,        // تَسَاعُد
    expectedActivePart:    M+D+T+F+SIN+F+ALEF+AYN+K+D_,    // مُتَسَاعِد
    expectedPassivePart:   M+D+T+F+SIN+F+ALEF+AYN+F+D_,    // مُتَسَاعَد
  },
  {
    // تسابق — R1=س SIN, R2=ب B, R3=ق Q
    input: T+SIN+ALEF+B+Q,
    expectedType: "form_vi",
    expected3msPast:       T+F+SIN+F+ALEF+B+F+Q+F,         // تَسَابَقَ
    expected2msPast:       T+F+SIN+F+ALEF+B+F+Q+S+T+F,     // تَسَابَقْتَ
    expected3msPresent:    YA+F+T+F+SIN+F+ALEF+B+F+Q+D,    // يَتَسَابَقُ
    expected2msPresent:    T+F+T+F+SIN+F+ALEF+B+F+Q+D,     // تَتَسَابَقُ
    expected2msImperative: T+F+SIN+F+ALEF+B+F+Q+S,         // تَسَابَقْ
    expected2fsImperative: T+F+SIN+F+ALEF+B+F+Q+K+YA,      // تَسَابَقِي
    expected2mpImperative: T+F+SIN+F+ALEF+B+F+Q+D+WAW+ALEF,// تَسَابَقُوا
    expectedMasdar:        T+F+SIN+F+ALEF+B+D+Q,           // تَسَابُق
    expectedActivePart:    M+D+T+F+SIN+F+ALEF+B+K+Q,       // مُتَسَابِق
    expectedPassivePart:   M+D+T+F+SIN+F+ALEF+B+F+Q,       // مُتَسَابَق
  },
  // ══════════════════════════════════════════════════════════════
  // Form VII: اِنْفَعَلَ / يَنْفَعِلُ  (ALEF-NUN prefix — reflexive/passive of Form I)
  // Detection: 5-char bare string, pos 0 = ا ALEF, pos 1 = ن NUN → R1=pos[2], R2=pos[3], R3=pos[4]
  // Past stem:    ALEF+K+NUN+S + R1+F+R2+F+R3  (اِنْكَسَرَ)
  // Present stem: NUN+S + R1+F+R2+K+R3 with fatha prefix  (يَنْكَسِرُ)
  // Imp:          ALEF+K+NUN+S + R1+F+R2+K+R3 + ending  (اِنْكَسِرْ)
  // Masdar:       ALEF+K+NUN+S + R1+K+R2+F+ALEF+R3       (اِنْكِسَار)
  // AP:           M+D+NUN+S + R1+F+R2+K+R3               (مُنْكَسِر)
  // PP:           M+D+NUN+S + R1+F+R2+F+R3               (مُنْكَسَر)
  // ══════════════════════════════════════════════════════════════

  // ط (tah marbuta emphatic = ṭāʾ) — not in the main constant block above
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // TA_ is only used inside Form VII tests for roots containing ط (\u0637)
  {
    // انكسر — R1=ك K_, R2=س SIN, R3=ر R
    input: ALEF+NUN+K_+SIN+R,
    expectedType: "form_vii",
    expected3msPast:       ALEF+K+NUN+S+K_+F+SIN+F+R+F,           // اِنْكَسَرَ
    expected2msPast:       ALEF+K+NUN+S+K_+F+SIN+F+R+S+T+F,       // اِنْكَسَرْتَ
    expected3msPresent:    YA+F+NUN+S+K_+F+SIN+K+R+D,             // يَنْكَسِرُ
    expected2msPresent:    T+F+NUN+S+K_+F+SIN+K+R+D,              // تَنْكَسِرُ
    expected2msImperative: ALEF+K+NUN+S+K_+F+SIN+K+R+S,           // اِنْكَسِرْ
    expected2fsImperative: ALEF+K+NUN+S+K_+F+SIN+K+R+K+YA,        // اِنْكَسِرِي
    expected2mpImperative: ALEF+K+NUN+S+K_+F+SIN+K+R+D+WAW+ALEF,  // اِنْكَسِرُوا
    expectedMasdar:        ALEF+K+NUN+S+K_+K+SIN+F+ALEF+R,        // اِنْكِسَار
    expectedActivePart:    M+D+NUN+S+K_+F+SIN+K+R,                // مُنْكَسِر
    expectedPassivePart:   M+D+NUN+S+K_+F+SIN+F+R,                // مُنْكَسَر
  },
  {
    // انفتح — R1=ف F_, R2=ت T, R3=ح H
    input: ALEF+NUN+F_+T+H,
    expectedType: "form_vii",
    expected3msPast:       ALEF+K+NUN+S+F_+F+T+F+H+F,             // اِنْفَتَحَ
    expected2msPast:       ALEF+K+NUN+S+F_+F+T+F+H+S+T+F,         // اِنْفَتَحْتَ
    expected3msPresent:    YA+F+NUN+S+F_+F+T+K+H+D,               // يَنْفَتِحُ
    expected2msPresent:    T+F+NUN+S+F_+F+T+K+H+D,                // تَنْفَتِحُ
    expected2msImperative: ALEF+K+NUN+S+F_+F+T+K+H+S,             // اِنْفَتِحْ
    expected2fsImperative: ALEF+K+NUN+S+F_+F+T+K+H+K+YA,          // اِنْفَتِحِي
    expected2mpImperative: ALEF+K+NUN+S+F_+F+T+K+H+D+WAW+ALEF,    // اِنْفَتِحُوا
    expectedMasdar:        ALEF+K+NUN+S+F_+K+T+F+ALEF+H,          // اِنْفِتَاح
    expectedActivePart:    M+D+NUN+S+F_+F+T+K+H,                  // مُنْفَتِح
    expectedPassivePart:   M+D+NUN+S+F_+F+T+F+H,                  // مُنْفَتَح
  },
  {
    // انقطع — R1=ق Q, R2=ط (\u0637), R3=ع AYN
    input: ALEF+NUN+Q+"\u0637"+AYN,
    expectedType: "form_vii",
    expected3msPast:       ALEF+K+NUN+S+Q+F+"\u0637"+F+AYN+F,          // اِنْقَطَعَ
    expected2msPast:       ALEF+K+NUN+S+Q+F+"\u0637"+F+AYN+S+T+F,      // اِنْقَطَعْتَ
    expected3msPresent:    YA+F+NUN+S+Q+F+"\u0637"+K+AYN+D,            // يَنْقَطِعُ
    expected2msPresent:    T+F+NUN+S+Q+F+"\u0637"+K+AYN+D,             // تَنْقَطِعُ
    expected2msImperative: ALEF+K+NUN+S+Q+F+"\u0637"+K+AYN+S,          // اِنْقَطِعْ
    expected2fsImperative: ALEF+K+NUN+S+Q+F+"\u0637"+K+AYN+K+YA,       // اِنْقَطِعِي
    expected2mpImperative: ALEF+K+NUN+S+Q+F+"\u0637"+K+AYN+D+WAW+ALEF, // اِنْقَطِعُوا
    expectedMasdar:        ALEF+K+NUN+S+Q+K+"\u0637"+F+ALEF+AYN,       // اِنْقِطَاع
    expectedActivePart:    M+D+NUN+S+Q+F+"\u0637"+K+AYN,               // مُنْقَطِع
    expectedPassivePart:   M+D+NUN+S+Q+F+"\u0637"+F+AYN,               // مُنْقَطَع
  },
  {
    // انطلق — R1=ط (\u0637), R2=ل L, R3=ق Q
    input: ALEF+NUN+"\u0637"+L+Q,
    expectedType: "form_vii",
    expected3msPast:       ALEF+K+NUN+S+"\u0637"+F+L+F+Q+F,            // اِنْطَلَقَ
    expected2msPast:       ALEF+K+NUN+S+"\u0637"+F+L+F+Q+S+T+F,        // اِنْطَلَقْتَ
    expected3msPresent:    YA+F+NUN+S+"\u0637"+F+L+K+Q+D,              // يَنْطَلِقُ
    expected2msPresent:    T+F+NUN+S+"\u0637"+F+L+K+Q+D,               // تَنْطَلِقُ
    expected2msImperative: ALEF+K+NUN+S+"\u0637"+F+L+K+Q+S,            // اِنْطَلِقْ
    expected2fsImperative: ALEF+K+NUN+S+"\u0637"+F+L+K+Q+K+YA,         // اِنْطَلِقِي
    expected2mpImperative: ALEF+K+NUN+S+"\u0637"+F+L+K+Q+D+WAW+ALEF,   // اِنْطَلِقُوا
    expectedMasdar:        ALEF+K+NUN+S+"\u0637"+K+L+F+ALEF+Q,         // اِنْطِلَاق
    expectedActivePart:    M+D+NUN+S+"\u0637"+F+L+K+Q,                 // مُنْطَلِق
    expectedPassivePart:   M+D+NUN+S+"\u0637"+F+L+F+Q,                 // مُنْطَلَق
  },
  {
    // انزلق — R1=ز Z, R2=ل L, R3=ق Q
    input: ALEF+NUN+Z+L+Q,
    expectedType: "form_vii",
    expected3msPast:       ALEF+K+NUN+S+Z+F+L+F+Q+F,              // اِنْزَلَقَ
    expected2msPast:       ALEF+K+NUN+S+Z+F+L+F+Q+S+T+F,          // اِنْزَلَقْتَ
    expected3msPresent:    YA+F+NUN+S+Z+F+L+K+Q+D,                // يَنْزَلِقُ
    expected2msPresent:    T+F+NUN+S+Z+F+L+K+Q+D,                 // تَنْزَلِقُ
    expected2msImperative: ALEF+K+NUN+S+Z+F+L+K+Q+S,              // اِنْزَلِقْ
    expected2fsImperative: ALEF+K+NUN+S+Z+F+L+K+Q+K+YA,           // اِنْزَلِقِي
    expected2mpImperative: ALEF+K+NUN+S+Z+F+L+K+Q+D+WAW+ALEF,     // اِنْزَلِقُوا
    expectedMasdar:        ALEF+K+NUN+S+Z+K+L+F+ALEF+Q,           // اِنْزِلَاق
    expectedActivePart:    M+D+NUN+S+Z+F+L+K+Q,                   // مُنْزَلِق
    expectedPassivePart:   M+D+NUN+S+Z+F+L+F+Q,                   // مُنْزَلَق
  },

  // ── Form VIII: اِفْتَعَلَ (5 cases) ──────────────────────────────

  {
    // اجتمع — R1=ج J, R2=م M, R3=ع AYN  (to gather / convene)
    // Standard: infix = J+S+T (no assimilation)
    input: ALEF+J+T+M+AYN,
    expectedType: "form_viii",
    expected3msPast:       ALEF+K+J+S+T+F+M+F+AYN+F,              // اِجْتَمَعَ
    expected2msPast:       ALEF+K+J+S+T+F+M+F+AYN+S+T+F,          // اِجْتَمَعْتَ
    expected3msPresent:    YA+F+J+S+T+F+M+K+AYN+D,                // يَجْتَمِعُ
    expected2msPresent:    T+F+J+S+T+F+M+K+AYN+D,                 // تَجْتَمِعُ
    expected2msImperative: ALEF+K+J+S+T+F+M+K+AYN+S,              // اِجْتَمِعْ
    expected2fsImperative: ALEF+K+J+S+T+F+M+K+AYN+K+YA,           // اِجْتَمِعِي
    expected2mpImperative: ALEF+K+J+S+T+F+M+K+AYN+D+WAW+ALEF,     // اِجْتَمِعُوا
    expectedMasdar:        ALEF+K+J+S+T+K+M+F+ALEF+AYN,           // اِجْتِمَاع
    expectedActivePart:    M+D+J+S+T+F+M+K+AYN,                   // مُجْتَمِع
    expectedPassivePart:   M+D+J+S+T+F+M+F+AYN,                   // مُجْتَمَع
  },
  {
    // احترم — R1=ح H, R2=ر R, R3=م M  (to respect / esteem)
    // Standard: infix = H+S+T (no assimilation)
    input: ALEF+H+T+R+M,
    expectedType: "form_viii",
    expected3msPast:       ALEF+K+H+S+T+F+R+F+M+F,                // اِحْتَرَمَ
    expected2msPast:       ALEF+K+H+S+T+F+R+F+M+S+T+F,            // اِحْتَرَمْتَ
    expected3msPresent:    YA+F+H+S+T+F+R+K+M+D,                  // يَحْتَرِمُ
    expected2msPresent:    T+F+H+S+T+F+R+K+M+D,                   // تَحْتَرِمُ
    expected2msImperative: ALEF+K+H+S+T+F+R+K+M+S,                // اِحْتَرِمْ
    expected2fsImperative: ALEF+K+H+S+T+F+R+K+M+K+YA,             // اِحْتَرِمِي
    expected2mpImperative: ALEF+K+H+S+T+F+R+K+M+D+WAW+ALEF,       // اِحْتَرِمُوا
    expectedMasdar:        ALEF+K+H+S+T+K+R+F+ALEF+M,             // اِحْتِرَام
    expectedActivePart:    M+D+H+S+T+F+R+K+M,                     // مُحْتَرِم
    expectedPassivePart:   M+D+H+S+T+F+R+F+M,                     // مُحْتَرَم
  },
  {
    // اقترب — R1=ق Q, R2=ر R, R3=ب B  (to approach / draw near)
    // Standard: infix = Q+S+T (no assimilation)
    input: ALEF+Q+T+R+B,
    expectedType: "form_viii",
    expected3msPast:       ALEF+K+Q+S+T+F+R+F+B+F,                // اِقْتَرَبَ
    expected2msPast:       ALEF+K+Q+S+T+F+R+F+B+S+T+F,            // اِقْتَرَبْتَ
    expected3msPresent:    YA+F+Q+S+T+F+R+K+B+D,                  // يَقْتَرِبُ
    expected2msPresent:    T+F+Q+S+T+F+R+K+B+D,                   // تَقْتَرِبُ
    expected2msImperative: ALEF+K+Q+S+T+F+R+K+B+S,                // اِقْتَرِبْ
    expected2fsImperative: ALEF+K+Q+S+T+F+R+K+B+K+YA,             // اِقْتَرِبِي
    expected2mpImperative: ALEF+K+Q+S+T+F+R+K+B+D+WAW+ALEF,       // اِقْتَرِبُوا
    expectedMasdar:        ALEF+K+Q+S+T+K+R+F+ALEF+B,             // اِقْتِرَاب
    expectedActivePart:    M+D+Q+S+T+F+R+K+B,                     // مُقْتَرِب
    expectedPassivePart:   M+D+Q+S+T+F+R+F+B,                     // مُقْتَرَب
  },
  {
    // اكتسب — R1=ك K_, R2=س SIN, R3=ب B  (to acquire / earn)
    // Standard: infix = K_+S+T (no assimilation)
    input: ALEF+K_+T+SIN+B,
    expectedType: "form_viii",
    expected3msPast:       ALEF+K+K_+S+T+F+SIN+F+B+F,             // اِكْتَسَبَ
    expected2msPast:       ALEF+K+K_+S+T+F+SIN+F+B+S+T+F,         // اِكْتَسَبْتَ
    expected3msPresent:    YA+F+K_+S+T+F+SIN+K+B+D,               // يَكْتَسِبُ
    expected2msPresent:    T+F+K_+S+T+F+SIN+K+B+D,                // تَكْتَسِبُ
    expected2msImperative: ALEF+K+K_+S+T+F+SIN+K+B+S,             // اِكْتَسِبْ
    expected2fsImperative: ALEF+K+K_+S+T+F+SIN+K+B+K+YA,          // اِكْتَسِبِي
    expected2mpImperative: ALEF+K+K_+S+T+F+SIN+K+B+D+WAW+ALEF,    // اِكْتَسِبُوا
    expectedMasdar:        ALEF+K+K_+S+T+K+SIN+F+ALEF+B,          // اِكْتِسَاب
    expectedActivePart:    M+D+K_+S+T+F+SIN+K+B,                  // مُكْتَسِب
    expectedPassivePart:   M+D+K_+S+T+F+SIN+F+B,                  // مُكْتَسَب
  },
  {
    // اتفق — root وفق (R1=WAW, R2=ف F_, R3=ق Q)  (to agree / reach agreement)
    // WAW assimilation: WAW+TA → TA+shadda (اِتَّفَقَ); auto-detected via 4-char ALEF+TA heuristic
    input: ALEF+T+F_+Q,                                            // 4-char bare surface (shadda stripped)
    expectedType: "form_viii",
    expected3msPast:       ALEF+K+T+SH+F+F_+F+Q+F,                // اِتَّفَقَ
    expected2msPast:       ALEF+K+T+SH+F+F_+F+Q+S+T+F,            // اِتَّفَقْتَ
    expected3msPresent:    YA+F+T+SH+F+F_+K+Q+D,                  // يَتَّفِقُ
    expected2msPresent:    T+F+T+SH+F+F_+K+Q+D,                   // تَتَّفِقُ
    expected2msImperative: ALEF+K+T+SH+F+F_+K+Q+S,                // اِتَّفِقْ
    expected2fsImperative: ALEF+K+T+SH+F+F_+K+Q+K+YA,             // اِتَّفِقِي
    expected2mpImperative: ALEF+K+T+SH+F+F_+K+Q+D+WAW+ALEF,       // اِتَّفِقُوا
    expectedMasdar:        ALEF+K+T+SH+K+F_+F+ALEF+Q,             // اِتِّفَاق
    expectedActivePart:    M+D+T+SH+F+F_+K+Q,                     // مُتَّفِق
    expectedPassivePart:   M+D+T+SH+F+F_+F+Q,                     // مُتَّفَق
  },

  // ── Form VIII: voiced dental assimilation (R1=ز/د/ذ → ت becomes د) ────

  {
    // ازدحم — R1=ز Z, R2=ح H, R3=م M  (to crowd / press together)
    // Voiced dental assimilation: Z+S+D_ (ز+ْ+د)
    input: ALEF+Z+T+H+M,
    expectedType: "form_viii",
    expected3msPast:       ALEF+K+Z+S+D_+F+H+F+M+F,              // اِزْدَحَمَ
    expected2msPast:       ALEF+K+Z+S+D_+F+H+F+M+S+T+F,          // اِزْدَحَمْتَ
    expected3msPresent:    YA+F+Z+S+D_+F+H+K+M+D,                // يَزْدَحِمُ
    expected2msPresent:    T+F+Z+S+D_+F+H+K+M+D,                 // تَزْدَحِمُ
    expected2msImperative: ALEF+K+Z+S+D_+F+H+K+M+S,              // اِزْدَحِمْ
    expected2fsImperative: ALEF+K+Z+S+D_+F+H+K+M+K+YA,           // اِزْدَحِمِي
    expected2mpImperative: ALEF+K+Z+S+D_+F+H+K+M+D+WAW+ALEF,     // اِزْدَحِمُوا
    expectedMasdar:        ALEF+K+Z+S+D_+K+H+F+ALEF+M,           // اِزْدِحَام
    expectedActivePart:    M+D+Z+S+D_+F+H+K+M,                   // مُزْدَحِم
    expectedPassivePart:   M+D+Z+S+D_+F+H+F+M,                   // مُزْدَحَم
  },
  {
    // ادّرس — R1=د D_, R2=ر R, R3=س SIN  (to study together)
    // Voiced dental assimilation: D_+S+D_ (د+ْ+د)
    input: ALEF+D_+T+R+SIN,
    expectedType: "form_viii",
    expected3msPast:       ALEF+K+D_+S+D_+F+R+F+SIN+F,           // اِدْدَرَسَ
    expected2msPast:       ALEF+K+D_+S+D_+F+R+F+SIN+S+T+F,       // اِدْدَرَسْتَ
    expected3msPresent:    YA+F+D_+S+D_+F+R+K+SIN+D,             // يَدْدَرِسُ
    expected2msPresent:    T+F+D_+S+D_+F+R+K+SIN+D,              // تَدْدَرِسُ
    expected2msImperative: ALEF+K+D_+S+D_+F+R+K+SIN+S,           // اِدْدَرِسْ
    expected2fsImperative: ALEF+K+D_+S+D_+F+R+K+SIN+K+YA,        // اِدْدَرِسِي
    expected2mpImperative: ALEF+K+D_+S+D_+F+R+K+SIN+D+WAW+ALEF,  // اِدْدَرِسُوا
    expectedMasdar:        ALEF+K+D_+S+D_+K+R+F+ALEF+SIN,        // اِدْدِرَاس
    expectedActivePart:    M+D+D_+S+D_+F+R+K+SIN,                // مُدْدَرِس
    expectedPassivePart:   M+D+D_+S+D_+F+R+F+SIN,                // مُدْدَرَس
  },
  {
    // اذدكر — R1=ذ DHAL, R2=ك K_, R3=ر R  (to recall / remember)
    // Voiced dental assimilation: DHAL+S+D_ (ذ+ْ+د)
    input: ALEF+DHAL+T+K_+R,
    expectedType: "form_viii",
    expected3msPast:       ALEF+K+DHAL+S+D_+F+K_+F+R+F,          // اِذْدَكَرَ
    expected2msPast:       ALEF+K+DHAL+S+D_+F+K_+F+R+S+T+F,      // اِذْدَكَرْتَ
    expected3msPresent:    YA+F+DHAL+S+D_+F+K_+K+R+D,            // يَذْدَكِرُ
    expected2msPresent:    T+F+DHAL+S+D_+F+K_+K+R+D,             // تَذْدَكِرُ
    expected2msImperative: ALEF+K+DHAL+S+D_+F+K_+K+R+S,          // اِذْدَكِرْ
    expected2fsImperative: ALEF+K+DHAL+S+D_+F+K_+K+R+K+YA,       // اِذْدَكِرِي
    expected2mpImperative: ALEF+K+DHAL+S+D_+F+K_+K+R+D+WAW+ALEF, // اِذْدَكِرُوا
    expectedMasdar:        ALEF+K+DHAL+S+D_+K+K_+F+ALEF+R,       // اِذْدِكَار
    expectedActivePart:    M+D+DHAL+S+D_+F+K_+K+R,               // مُذْدَكِر
    expectedPassivePart:   M+D+DHAL+S+D_+F+K_+F+R,               // مُذْدَكَر
  },

  // ── Form X: اِسْتَفْعَلَ ────────────────────────────────────────────────
  // Pattern: ALEF+kasra + SIN+sukun + TA+fatha + R1+sukun + R2+fatha + R3
  // Present: FATHA prefix (يَ/تَ/أَ/نَ) + SIN+sukun + TA+fatha + R1+sukun + R2+kasra + R3
  // Masdar: ALEF+kasra + SIN+sukun + TA+KASRA + R1+sukun + R2+fatha + ALEF + R3
  // AP: MIM+damma + SIN+sukun + TA+fatha + R1+sukun + R2+kasra + R3
  // PP: MIM+damma + SIN+sukun + TA+fatha + R1+sukun + R2+fatha + R3

  {
    // استعمل — Form X (R1=ع AYN, R2=م M, R3=ل L) — to use / employ
    input: ALEF+SIN+T+AYN+M+L,
    expectedType: "form_x",
    expected3msPast:       ALEF+K+SIN+S+T+F+AYN+S+M+F+L+F,           // اِسْتَعْمَلَ
    expected2msPast:       ALEF+K+SIN+S+T+F+AYN+S+M+F+L+S+T+F,       // اِسْتَعْمَلْتَ
    expected3msPresent:    YA+F+SIN+S+T+F+AYN+S+M+K+L+D,             // يَسْتَعْمِلُ
    expected2msPresent:    T+F+SIN+S+T+F+AYN+S+M+K+L+D,              // تَسْتَعْمِلُ
    expected2msImperative: ALEF+K+SIN+S+T+F+AYN+S+M+K+L+S,           // اِسْتَعْمِلْ
    expected2fsImperative: ALEF+K+SIN+S+T+F+AYN+S+M+K+L+K+YA,        // اِسْتَعْمِلِي
    expected2mpImperative: ALEF+K+SIN+S+T+F+AYN+S+M+K+L+D+WAW+ALEF,  // اِسْتَعْمِلُوا
    expectedMasdar:        ALEF+K+SIN+S+T+K+AYN+S+M+F+ALEF+L,        // اِسْتِعْمَال
    expectedActivePart:    M+D+SIN+S+T+F+AYN+S+M+K+L,                // مُسْتَعْمِل
    expectedPassivePart:   M+D+SIN+S+T+F+AYN+S+M+F+L,                // مُسْتَعْمَل
  },
  {
    // استخدم — Form X (R1=خ KH, R2=د D_, R3=م M) — to use / utilize
    // Note: D_ = DAL letter \u062F; D = damma diacritic \u064F — distinct code points
    input: ALEF+SIN+T+KH+D_+M,
    expectedType: "form_x",
    expected3msPast:       ALEF+K+SIN+S+T+F+KH+S+D_+F+M+F,           // اِسْتَخْدَمَ
    expected2msPast:       ALEF+K+SIN+S+T+F+KH+S+D_+F+M+S+T+F,       // اِسْتَخْدَمْتَ
    expected3msPresent:    YA+F+SIN+S+T+F+KH+S+D_+K+M+D,             // يَسْتَخْدِمُ
    expected2msPresent:    T+F+SIN+S+T+F+KH+S+D_+K+M+D,              // تَسْتَخْدِمُ
    expected2msImperative: ALEF+K+SIN+S+T+F+KH+S+D_+K+M+S,           // اِسْتَخْدِمْ
    expected2fsImperative: ALEF+K+SIN+S+T+F+KH+S+D_+K+M+K+YA,        // اِسْتَخْدِمِي
    expected2mpImperative: ALEF+K+SIN+S+T+F+KH+S+D_+K+M+D+WAW+ALEF,  // اِسْتَخْدِمُوا
    expectedMasdar:        ALEF+K+SIN+S+T+K+KH+S+D_+F+ALEF+M,        // اِسْتِخْدَام
    expectedActivePart:    M+D+SIN+S+T+F+KH+S+D_+K+M,                // مُسْتَخْدِم
    expectedPassivePart:   M+D+SIN+S+T+F+KH+S+D_+F+M,                // مُسْتَخْدَم
  },
  {
    // استقبل — Form X (R1=ق Q, R2=ب B, R3=ل L) — to receive / welcome
    input: ALEF+SIN+T+Q+B+L,
    expectedType: "form_x",
    expected3msPast:       ALEF+K+SIN+S+T+F+Q+S+B+F+L+F,             // اِسْتَقْبَلَ
    expected2msPast:       ALEF+K+SIN+S+T+F+Q+S+B+F+L+S+T+F,         // اِسْتَقْبَلْتَ
    expected3msPresent:    YA+F+SIN+S+T+F+Q+S+B+K+L+D,               // يَسْتَقْبِلُ
    expected2msPresent:    T+F+SIN+S+T+F+Q+S+B+K+L+D,                // تَسْتَقْبِلُ
    expected2msImperative: ALEF+K+SIN+S+T+F+Q+S+B+K+L+S,             // اِسْتَقْبِلْ
    expected2fsImperative: ALEF+K+SIN+S+T+F+Q+S+B+K+L+K+YA,          // اِسْتَقْبِلِي
    expected2mpImperative: ALEF+K+SIN+S+T+F+Q+S+B+K+L+D+WAW+ALEF,    // اِسْتَقْبِلُوا
    expectedMasdar:        ALEF+K+SIN+S+T+K+Q+S+B+F+ALEF+L,          // اِسْتِقْبَال
    expectedActivePart:    M+D+SIN+S+T+F+Q+S+B+K+L,                  // مُسْتَقْبِل
    expectedPassivePart:   M+D+SIN+S+T+F+Q+S+B+F+L,                  // مُسْتَقْبَل
  },
  {
    // استخرج — Form X (R1=خ KH, R2=ر R, R3=ج J) — to extract / derive
    input: ALEF+SIN+T+KH+R+J,
    expectedType: "form_x",
    expected3msPast:       ALEF+K+SIN+S+T+F+KH+S+R+F+J+F,            // اِسْتَخْرَجَ
    expected2msPast:       ALEF+K+SIN+S+T+F+KH+S+R+F+J+S+T+F,        // اِسْتَخْرَجْتَ
    expected3msPresent:    YA+F+SIN+S+T+F+KH+S+R+K+J+D,              // يَسْتَخْرِجُ
    expected2msPresent:    T+F+SIN+S+T+F+KH+S+R+K+J+D,               // تَسْتَخْرِجُ
    expected2msImperative: ALEF+K+SIN+S+T+F+KH+S+R+K+J+S,            // اِسْتَخْرِجْ
    expected2fsImperative: ALEF+K+SIN+S+T+F+KH+S+R+K+J+K+YA,         // اِسْتَخْرِجِي
    expected2mpImperative: ALEF+K+SIN+S+T+F+KH+S+R+K+J+D+WAW+ALEF,   // اِسْتَخْرِجُوا
    expectedMasdar:        ALEF+K+SIN+S+T+K+KH+S+R+F+ALEF+J,         // اِسْتِخْرَاج
    expectedActivePart:    M+D+SIN+S+T+F+KH+S+R+K+J,                 // مُسْتَخْرِج
    expectedPassivePart:   M+D+SIN+S+T+F+KH+S+R+F+J,                 // مُسْتَخْرَج
  },
  {
    // استحسن — Form X (R1=ح H, R2=س SIN, R3=ن NUN) — to approve / consider good
    // SIN appears twice: once in the Form X prefix (index 1 of surface), once as R2
    input: ALEF+SIN+T+H+SIN+NUN,
    expectedType: "form_x",
    expected3msPast:       ALEF+K+SIN+S+T+F+H+S+SIN+F+NUN+F,         // اِسْتَحْسَنَ
    expected2msPast:       ALEF+K+SIN+S+T+F+H+S+SIN+F+NUN+S+T+F,     // اِسْتَحْسَنْتَ
    expected3msPresent:    YA+F+SIN+S+T+F+H+S+SIN+K+NUN+D,           // يَسْتَحْسِنُ
    expected2msPresent:    T+F+SIN+S+T+F+H+S+SIN+K+NUN+D,            // تَسْتَحْسِنُ
    expected2msImperative: ALEF+K+SIN+S+T+F+H+S+SIN+K+NUN+S,         // اِسْتَحْسِنْ
    expected2fsImperative: ALEF+K+SIN+S+T+F+H+S+SIN+K+NUN+K+YA,      // اِسْتَحْسِنِي
    expected2mpImperative: ALEF+K+SIN+S+T+F+H+S+SIN+K+NUN+D+WAW+ALEF,// اِسْتَحْسِنُوا
    expectedMasdar:        ALEF+K+SIN+S+T+K+H+S+SIN+F+ALEF+NUN,      // اِسْتِحْسَان
    expectedActivePart:    M+D+SIN+S+T+F+H+S+SIN+K+NUN,              // مُسْتَحْسِن
    expectedPassivePart:   M+D+SIN+S+T+F+H+S+SIN+F+NUN,              // مُسْتَحْسَن
  },
];

// ── Test runner ──────────────────────────────────────────────────

interface TestResult {
  root: string;
  passed: boolean;
  failures: string[];
}

function showChars(s: string): string {
  return [...s].map(c => c.codePointAt(0)?.toString(16).padStart(4, "0")).join(" ");
}

function assertEq(
  label: string,
  expected: string,
  got: string,
  failures: string[],
): void {
  if (expected !== got) {
    failures.push(
      `${label}: expected "${expected}" [${showChars(expected)}], got "${got}" [${showChars(got)}]`,
    );
  }
}

function runTests(): void {
  const results: TestResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  const WAW_C  = "\u0648";
  const ALEF_C = "\u0627";

  for (const tc of TEST_CASES) {
    const failures: string[] = [];

    if (!isArabic(tc.input)) {
      failures.push(`isArabic(${tc.input}) returned false`);
    }

    const classification = classifyRoot(tc.input);
    if (!classification) {
      failures.push("classifyRoot returned null");
      results.push({ root: tc.input, passed: false, failures });
      totalFailed++;
      continue;
    }

    let { normalized, r1, r2, r3 } = classification;
    let { type } = classification;

    let contractR2Hamza: boolean | undefined;
    const f1Lex = tc.useFormILex ? getFormILexiconEntry(normalizeInput(tc.input)) : null;
    if (f1Lex) {
      if (f1Lex.rootType !== null) type = f1Lex.rootType;
      if (f1Lex.r1) r1 = f1Lex.r1;
      if (f1Lex.r2) r2 = f1Lex.r2;
      if (f1Lex.r3) r3 = f1Lex.r3;
      contractR2Hamza = f1Lex.contractR2;
    }

    const lexEntry = lookupRoot(normalized);
    if ((type === "hollow_waw" || type === "hollow_ya") && r2 === ALEF_C) {
      type = lexEntry
        ? (lexEntry.root[1] === WAW_C ? "hollow_waw" : "hollow_ya")
        : "hollow_waw";
    }
    if ((type === "defective_waw" || type === "defective_ya") && r3 === ALEF_C) {
      type = lexEntry
        ? (lexEntry.root[2] === WAW_C ? "defective_waw" : "defective_ya")
        : "defective_waw";
    }

    if (type !== tc.expectedType) {
      failures.push(`type: expected "${tc.expectedType}", got "${type}"`);
    }

    const pastV    = f1Lex?.pastVowel    ?? lexEntry?.pastVowel    ?? "a";
    const presentV = f1Lex?.presentVowel ?? lexEntry?.presentVowel ?? "a";
    const conj     = conjugate({ type, r1, r2, r3, pastVowel: pastV, presentVowel: presentV, contractR2Hamza });

    const get = (tense: "past" | "present" | "imperative", id: string) =>
      conj[tense].find(r => r.pronoun === id)?.form ?? "";

    assertEq("3ms past",         tc.expected3msPast,       get("past", "3ms"),       failures);
    assertEq("2ms past",         tc.expected2msPast,       get("past", "2ms"),       failures);
    assertEq("3ms present",      tc.expected3msPresent,    get("present", "3ms"),    failures);
    assertEq("2ms present",      tc.expected2msPresent,    get("present", "2ms"),    failures);
    assertEq("2ms imperative",   tc.expected2msImperative, get("imperative", "2ms"), failures);
    assertEq("2fs imperative",   tc.expected2fsImperative, get("imperative", "2fs"), failures);
    assertEq("2mp imperative",   tc.expected2mpImperative, get("imperative", "2mp"), failures);

    const f1MasdarInputs = f1Lex
      ? f1Lex.masdars.map(m => ({ form: m.form, common: m.common }))
      : undefined;
    const nouns = getNounForms(type, r1, r2, r3, lexEntry, f1MasdarInputs);
    assertEq("masdar",           tc.expectedMasdar,      nouns.masdar,      failures);
    assertEq("activePart",       tc.expectedActivePart,  nouns.activePart,  failures);
    assertEq("passivePart",      tc.expectedPassivePart, nouns.passivePart, failures);

    const passed = failures.length === 0;
    if (passed) totalPassed++; else totalFailed++;
    results.push({ root: tc.input, passed, failures });
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  SmartRoot Arabic v1 — Test Report");
  console.log("═══════════════════════════════════════════════════");

  for (const r of results) {
    const status = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`\n${status}  ${r.root}`);
    if (!r.passed) {
      for (const f of r.failures) {
        console.log(`       → ${f}`);
      }
    }
  }

  console.log("\n───────────────────────────────────────────────────");
  console.log(`  Passed: ${totalPassed} / ${TEST_CASES.length}`);
  console.log(`  Failed: ${totalFailed} / ${TEST_CASES.length}`);
  console.log("═══════════════════════════════════════════════════\n");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runTests();

// ── Conjugated Form Recognition Tests ────────────────────────────────────────

interface ConjTestCase {
  input: string;
  expectedCanonical: string;
  expectedLabel: string;
}

const CONJ_TESTS: ConjTestCase[] = [
  { input: "\u064A\u0631\u0645\u0648\u0646",   expectedCanonical: "\u0631\u0645\u0649",   expectedLabel: "\u0645\u0636\u0627\u0631\u0639 \u062C\u0645\u0639 \u0645\u0630\u0643\u0631" },
  { input: "\u062A\u0631\u0645\u064A\u0646",   expectedCanonical: "\u0631\u0645\u0649",   expectedLabel: "\u0645\u0636\u0627\u0631\u0639 \u0645\u062E\u0627\u0637\u0628\u0629 \u0645\u0641\u0631\u062F" },
  { input: "\u064A\u0631\u0645\u064A\u0627\u0646", expectedCanonical: "\u0631\u0645\u0649", expectedLabel: "\u0645\u0636\u0627\u0631\u0639 \u0645\u062B\u0646\u0649" },
  { input: "\u064A\u062F\u0639\u0648\u0646",   expectedCanonical: "\u062F\u0639\u0627",   expectedLabel: "\u0645\u0636\u0627\u0631\u0639 \u062C\u0645\u0639 \u0645\u0630\u0643\u0631" },
  { input: "\u062A\u062F\u0639\u064A\u0646",   expectedCanonical: "\u062F\u0639\u0627",   expectedLabel: "\u0645\u0636\u0627\u0631\u0639 \u0645\u062E\u0627\u0637\u0628\u0629 \u0645\u0641\u0631\u062F" },
  { input: "\u064A\u0645\u0634\u0648\u0646",   expectedCanonical: "\u0645\u0634\u0649",   expectedLabel: "\u0645\u0636\u0627\u0631\u0639 \u062C\u0645\u0639 \u0645\u0630\u0643\u0631" },
  { input: "\u062A\u0645\u0634\u064A\u0646",   expectedCanonical: "\u0645\u0634\u0649",   expectedLabel: "\u0645\u0636\u0627\u0631\u0639 \u0645\u062E\u0627\u0637\u0628\u0629 \u0645\u0641\u0631\u062F" },
  { input: "\u064A\u0633\u064A\u0631\u0648\u0646", expectedCanonical: "\u0633\u0627\u0631", expectedLabel: "\u0645\u0636\u0627\u0631\u0639 \u062C\u0645\u0639 \u0645\u0630\u0643\u0631" },
  { input: "\u064A\u0642\u0648\u0644\u0648\u0646", expectedCanonical: "\u0642\u0627\u0644", expectedLabel: "\u0645\u0636\u0627\u0631\u0639 \u062C\u0645\u0639 \u0645\u0630\u0643\u0631" },
  { input: "\u064A\u0646\u0627\u0645\u0648\u0646", expectedCanonical: "\u0646\u0627\u0645", expectedLabel: "\u0645\u0636\u0627\u0631\u0639 \u062C\u0645\u0639 \u0645\u0630\u0643\u0631" },
  { input: "\u064A\u062E\u0627\u0641\u0648\u0646", expectedCanonical: "\u062E\u0627\u0641", expectedLabel: "\u0645\u0636\u0627\u0631\u0639 \u062C\u0645\u0639 \u0645\u0630\u0643\u0631" },
  { input: "\u064A\u0631\u0645\u064A",         expectedCanonical: "\u0631\u0645\u0649",   expectedLabel: "\u0645\u0636\u0627\u0631\u0639 \u063A\u0627\u0626\u0628 \u0645\u0641\u0631\u062F" },
  { input: "\u064A\u0633\u064A\u0631",         expectedCanonical: "\u0633\u0627\u0631",   expectedLabel: "\u0645\u0636\u0627\u0631\u0639 \u063A\u0627\u0626\u0628 \u0645\u0641\u0631\u062F" },
  { input: "\u064A\u0646\u0627\u0645",         expectedCanonical: "\u0646\u0627\u0645",   expectedLabel: "\u0645\u0636\u0627\u0631\u0639 \u063A\u0627\u0626\u0628 \u0645\u0641\u0631\u062F" },
  { input: "\u0643\u062A\u0628\u0648\u0627",   expectedCanonical: "\u0643\u062A\u0628",   expectedLabel: "\u0645\u0627\u0636\u064D \u062C\u0645\u0639 \u0645\u0630\u0643\u0631" },
  { input: "\u0631\u0645\u0648\u0627",         expectedCanonical: "\u0631\u0645\u0649",   expectedLabel: "\u0645\u0627\u0636\u064D \u062C\u0645\u0639 \u0645\u0630\u0643\u0631" },
  { input: "\u062F\u0639\u0648\u0627",         expectedCanonical: "\u062F\u0639\u0627",   expectedLabel: "\u0645\u0627\u0636\u064D \u062C\u0645\u0639 \u0645\u0630\u0643\u0631" },
  { input: "\u0633\u0639\u0648\u0627",         expectedCanonical: "\u0633\u0639\u0649",   expectedLabel: "\u0645\u0627\u0636\u064D \u062C\u0645\u0639 \u0645\u0630\u0643\u0631" },
  { input: "\u0631\u0645\u062A",               expectedCanonical: "\u0631\u0645\u0649",   expectedLabel: "\u0645\u0627\u0636\u064D \u0645\u0641\u0631\u062F \u0645\u0624\u0646\u062B" },
  { input: "\u062F\u0639\u062A",               expectedCanonical: "\u062F\u0639\u0627",   expectedLabel: "\u0645\u0627\u0636\u064D \u0645\u0641\u0631\u062F \u0645\u0624\u0646\u062B" },
];

function runConjTests(): void {
  console.log("\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
  console.log("  Conjugated Form Recognition \u2014 Test Report");
  console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");

  let passed = 0;
  let failed = 0;

  for (const tc of CONJ_TESTS) {
    const result = resolveInflectedForm(tc.input);
    const failures: string[] = [];

    if (!result) {
      failures.push(`resolveInflectedForm returned null for "${tc.input}"`);
    } else {
      if (result.entry.canonicalKey !== tc.expectedCanonical) {
        failures.push(`canonical: got "${result.entry.canonicalKey}", expected "${tc.expectedCanonical}"`);
      }
      if (result.label !== tc.expectedLabel) {
        failures.push(`label: got "${result.label}", expected "${tc.expectedLabel}"`);
      }
    }

    if (failures.length === 0) {
      passed++;
      console.log(`\n\u2713 PASS  ${tc.input}`);
    } else {
      failed++;
      console.log(`\n\u2717 FAIL  ${tc.input}`);
      for (const f of failures) {
        console.log(`       \u2192 ${f}`);
      }
    }
  }

  console.log("\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  console.log(`  Passed: ${passed} / ${CONJ_TESTS.length}`);
  console.log(`  Failed: ${failed} / ${CONJ_TESTS.length}`);
  console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runConjTests();

// ═══════════════════════════════════════════════════
//  Phase 11.3: English Search — Synonyms & Grouping
// ═══════════════════════════════════════════════════

import {
  searchEnglish,
  searchEnglishGrouped,
  expandEnglishQueryWithSynonyms,
  isEnglishInput,
} from "./englishSearch.js";

interface EnSearchTest {
  name: string;
  fn: () => boolean;
}

function stripDiacriticsPlain(s: string): string {
  return s.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, "");
}

const EN_TESTS: EnSearchTest[] = [
  {
    name: "synonym expansion: 'assist' expands to include 'help'",
    fn: () => {
      const expanded = expandEnglishQueryWithSynonyms("assist");
      return expanded.includes("help") || expanded.includes("support");
    },
  },
  {
    name: "synonym expansion: 'watch' expands to include 'see'",
    fn: () => {
      const expanded = expandEnglishQueryWithSynonyms("watch");
      return expanded.includes("see") || expanded.includes("observ");
    },
  },
  {
    name: "synonym expansion: 'document' expands to writing family",
    fn: () => {
      const expanded = expandEnglishQueryWithSynonyms("document");
      return expanded.includes("write") || expanded.includes("record");
    },
  },
  {
    name: "grouped search: 'see' returns grouped results",
    fn: () => {
      const result = searchEnglishGrouped("see");
      return result.groups.length > 0;
    },
  },
  {
    name: "grouped search: 'see' has meaningful group labels",
    fn: () => {
      const result = searchEnglishGrouped("see");
      const labels = result.groups.map(g => g.label);
      return labels.some(l => l !== "Other results");
    },
  },
  {
    name: "grouped search: 'write' has 'Most common' group first",
    fn: () => {
      const result = searchEnglishGrouped("write");
      if (result.groups.length === 0) return false;
      return result.groups[0].label === "Most common";
    },
  },
  {
    name: "grouped search: 'write' most common group contains كتب",
    fn: () => {
      const result = searchEnglishGrouped("write");
      const topGroup = result.groups.find(g => g.label === "Most common");
      if (!topGroup) return false;
      return topGroup.results.some(r => stripDiacriticsPlain(r.root).includes("\u0643\u062A\u0628"));
    },
  },
  {
    name: "grouped search: 'help' returns results and first group is highest priority",
    fn: () => {
      const result = searchEnglishGrouped("help");
      if (result.groups.length === 0) return false;
      const firstPriority = result.groups[0].priority;
      return result.groups.every(g => g.priority >= firstPriority);
    },
  },
  {
    name: "exact match beats synonym-only match in score",
    fn: () => {
      const result = searchEnglishGrouped("write");
      const allResults: { score: number; matchType: string }[] = [];
      result.groups.forEach(g => g.results.forEach(r => allResults.push(r)));
      const exactMatches = allResults.filter(r => r.matchType === "exact");
      const synMatches = allResults.filter(r => r.matchType === "synonym");
      if (exactMatches.length === 0 || synMatches.length === 0) return exactMatches.length > 0;
      return exactMatches[0].score >= synMatches[0].score;
    },
  },
  {
    name: "nonsense query returns clean empty result",
    fn: () => {
      const result = searchEnglishGrouped("xyzzyplugh");
      return result.groups.length === 0;
    },
  },
  {
    name: "Arabic input still uses isEnglishInput=false",
    fn: () => {
      return !isEnglishInput("\u0643\u062A\u0628") && !isEnglishInput("\u0631\u0623\u0649");
    },
  },
  {
    name: "English input detected correctly",
    fn: () => {
      return isEnglishInput("write") && isEnglishInput("help me");
    },
  },
  {
    name: "grouped search: expandedQueries populated for synonym search",
    fn: () => {
      const result = searchEnglishGrouped("assist");
      return result.expandedQueries.length > 0;
    },
  },
  {
    name: "grouped search: 'return' finds Arabic verbs",
    fn: () => {
      const result = searchEnglishGrouped("return");
      return result.groups.length > 0 &&
        result.groups.some(g => g.results.length > 0);
    },
  },
  {
    name: "original flat searchEnglish still works (backward compat)",
    fn: () => {
      const results = searchEnglish("write", 10);
      return results.length > 0 && results[0].root !== undefined && results[0].score > 0;
    },
  },
];

function runEnSearchTests() {
  console.log("\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
  console.log("  Phase 11.3: English Search \u2014 Synonyms & Grouping");
  console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");

  let passed = 0;
  let failed = 0;

  for (const t of EN_TESTS) {
    try {
      const ok = t.fn();
      if (ok) {
        passed++;
        console.log(`\n\u2713 PASS  ${t.name}`);
      } else {
        failed++;
        console.log(`\n\u2717 FAIL  ${t.name}`);
      }
    } catch (e: any) {
      failed++;
      console.log(`\n\u2717 FAIL  ${t.name}`);
      console.log(`       \u2192 Error: ${e.message}`);
    }
  }

  console.log("\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  console.log(`  Passed: ${passed} / ${EN_TESTS.length}`);
  console.log(`  Failed: ${failed} / ${EN_TESTS.length}`);
  console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runEnSearchTests();
