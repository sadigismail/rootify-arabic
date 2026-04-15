/**
 * explanationEngine.ts
 * Produces deterministic, root-specific English morphology explanations.
 * Each rule description uses the actual conjugated surface forms for examples
 * rather than hardcoded placeholder words.
 */

import type { RootType } from "./rootClassifier.js";

export interface ExplanationResult {
  classification: string;
  surfaceChanges: string;
  ruleSummary: string[];
  full: string;
}

export interface SampleForms {
  past3ms: string;    // e.g. وَقَفَ / نَامَ / رَمَى
  past2ms: string;    // e.g. وَقَفْتَ / نِمْتَ / رَمَيْتَ
  present3ms: string; // e.g. يَقِفُ / يَنَامُ / يَرْمِي
  imp2ms: string;     // e.g. قِفْ / نَمْ / اِرْمِ
  imp2fs: string;     // e.g. قِفِي / نَامِي / اِرْمِي
  imp2mp: string;     // e.g. قِفُوا / نَامُوا / اِرْمُوا
}

export function explain(
  type: RootType,
  _r1: string,
  _r2: string,
  _r3: string,
  _classificationReason: string,
  forms: SampleForms,
  presentVowel?: string,
): ExplanationResult {
  const { past3ms, past2ms, present3ms, imp2ms, imp2fs, imp2mp } = forms;

  let classificationEn: string;
  let surfaceEn: string;
  let ruleSummary: string[];

  switch (type) {
    case "regular":
      classificationEn =
        "All three radicals are stable consonants (no weak letters واو or ياء), making this a sound (صحيح سالم) root.";
      surfaceEn =
        `No phonological alternations occur. All three radicals remain intact across all tenses and persons. ` +
        `Vowels follow the standard فَعَلَ / يَفْعَلُ pattern (e.g. ${past3ms} → ${present3ms}).`;
      ruleSummary = [
        `3ms past: R1-a-R2-vowel-R3+a (${past3ms}).`,
        `2ms past: same stem + ْتَ suffix (${past2ms}).`,
        `3ms present: prefix + R1ْR2-vowel-R3+u (${present3ms}).`,
        `Imperative 2ms: connecting hamza + stem + sukun (${imp2ms}). 2fs adds ِي (${imp2fs}), 2mp adds ُوا (${imp2mp}).`,
      ];
      break;

    case "assimilated":
      classificationEn =
        "The first radical is واو (و), making this an assimilated (مثال واوي) root.";
      surfaceEn =
        `The initial واو is elided (dropped) in the present tense and imperative, reducing the stem to two radicals. ` +
        `Past tense is fully regular and keeps the واو: ${past3ms}. Present: ${present3ms} (و dropped).`;
      ruleSummary = [
        `Initial و drops in the present stem and imperative.`,
        `Past tense is fully regular: ${past3ms}, ${past2ms}.`,
        `Present stem begins directly from R2: ${present3ms}.`,
        `Imperative: no connecting hamza needed — stem opens with a vowel (${imp2ms}). 2fs: ${imp2fs}, 2mp: ${imp2mp}.`,
      ];
      break;

    case "hollow_waw": {
      const isAVowel = presentVowel === "a"; // نام-type (نِمْتَ / يَنَامُ)
      classificationEn =
        "The second radical is واو (و), making this a hollow-waw (أجوف واوي) root.";
      if (isAVowel) {
        surfaceEn =
          `This hollow root uses an unusual a-vowel present pattern: the middle واو surfaces as long ALEF in the present (${present3ms}). ` +
          `In the 3ms past the middle واو also lengthens to ALEF (${past3ms}). ` +
          `Before consonantal suffixes the long vowel contracts to short KASRA (${past2ms}).`;
        ruleSummary = [
          `3ms past: middle واو → long ALEF (${past3ms}).`,
          `Past with suffix: contracts to short KASRA (${past2ms}).`,
          `3ms present: a-vowel pattern, long ALEF in present (${present3ms}).`,
          `Imperative 2ms: short stem + sukun (${imp2ms}). 2fs long stem: ${imp2fs}. 2mp: ${imp2mp}.`,
        ];
      } else {
        surfaceEn =
          `In the 3ms past the middle واو lengthens to ALEF: ${past3ms}. ` +
          `Before consonantal suffixes it contracts to short DAMMA: ${past2ms}. ` +
          `In the present واو surfaces as long DAMMA+واو: ${present3ms}.`;
        ruleSummary = [
          `3ms past: middle واو → long ALEF (${past3ms}).`,
          `Past with suffix: contracts to short DAMMA (${past2ms}).`,
          `3ms present: long DAMMA+واو stem (${present3ms}).`,
          `Imperative 2ms: short contracted stem + sukun (${imp2ms}). 2fs: ${imp2fs}. 2mp: ${imp2mp}.`,
        ];
      }
      break;
    }

    case "hollow_ya":
      classificationEn =
        "The second radical is ياء (ي), making this a hollow-ya (أجوف يائي) root.";
      surfaceEn =
        `In the 3ms past the middle ياء merges into ALEF: ${past3ms}. ` +
        `Before consonantal suffixes it contracts to short KASRA: ${past2ms}. ` +
        `In the present ياء surfaces as long KASRA+ياء: ${present3ms}.`;
      ruleSummary = [
        `3ms past: middle ياء → long ALEF (${past3ms}).`,
        `Past with suffix: contracts to short KASRA (${past2ms}).`,
        `3ms present: long KASRA+ياء stem (${present3ms}).`,
        `Imperative 2ms: short contracted stem + sukun (${imp2ms}). 2fs: ${imp2fs}. 2mp: ${imp2mp}.`,
      ];
      break;

    case "defective_waw":
      classificationEn =
        "The third radical is واو (و), making this a defective-waw (ناقص واوي) root.";
      surfaceEn =
        `In the 3ms past the final واو lengthens to ALEF: ${past3ms}. ` +
        `Before person suffixes the link consonant و reappears: ${past2ms}. ` +
        `In the present it surfaces as a final long واو: ${present3ms}. ` +
        `The imperative drops the final واو in 2ms: ${imp2ms}.`;
      ruleSummary = [
        `3ms past: final واو → long ALEF ending (${past3ms}).`,
        `Past with suffix: link consonant و reappears (${past2ms}).`,
        `3ms present: ends in long واو (${present3ms}).`,
        `Imperative 2ms: final واو dropped, jussive stem only (${imp2ms}).`,
        `Imperative 2mp: always uses وا suffix (${imp2mp}).`,
      ];
      break;

    case "defective_ya":
      classificationEn =
        "The third radical is ياء (ي), making this a defective-ya (ناقص يائي) root.";
      surfaceEn =
        `In the 3ms past the final ياء surfaces as alef maqsura ى: ${past3ms}. ` +
        `Before person suffixes the link consonant ي reappears: ${past2ms}. ` +
        `In the present it surfaces as a final long ياء (or alef maqsura for a-vowel type): ${present3ms}. ` +
        `The imperative drops the final ياء in 2ms: ${imp2ms}.`;
      ruleSummary = [
        `3ms past: final ياء → alef maqsura ى (${past3ms}).`,
        `Past with suffix: link consonant ي reappears (${past2ms}).`,
        `3ms present: ends in long ياء or alef maqsura (${present3ms}).`,
        `Imperative 2ms: final ياء dropped, jussive stem only (${imp2ms}). 2fs: ${imp2fs}.`,
        `Imperative 2mp: always uses وا suffix (${imp2mp}).`,
      ];
      break;

    case "doubled":
      classificationEn =
        "The second and third radicals are identical, making this a doubled (مضاعف) root.";
      surfaceEn =
        `When no suffix follows, or the suffix begins with a vowel, the two identical radicals merge under a shadda: ` +
        `${past3ms} (past), ${present3ms} (present). ` +
        `Before consonant-initial suffixes they split apart: ${past2ms}.`;
      ruleSummary = [
        `Geminated (merged) form with shadda: ${past3ms} (past 3ms), ${present3ms} (present 3ms).`,
        `Split form before consonantal suffixes: ${past2ms}.`,
        `Imperative 2ms: contracted stem + fatha on shadda (${imp2ms}).`,
        `Imperative 2fs: ${imp2fs}. Imperative 2mp: ${imp2mp}.`,
      ];
      break;

    case "form_x":
      classificationEn =
        `Measure X (اِسْتَفْعَلَ / يَسْتَفْعِلُ): the prefix اِسْتَ (ALEF+kasra+SIN+sukun+TA+fatha) is added before the three radicals. ` +
        `This pattern typically means "to deem X", "to request X", "to seek to X", or "to consider X", ` +
        `deriving a new semantic layer from the base root ` +
        `(e.g., عَمَلَ → اِسْتَعْمَلَ: work/act → to use/employ; قَبِلَ → اِسْتَقْبَلَ: to accept → to receive/welcome).`;
      surfaceEn =
        `Past follows اِسْتَفْعَلَ: اِسْتَ+R1+sukun+R2+a+R3 (${past3ms}). ` +
        `Present: يَسْتَفْعِلُ — fatha prefix (يَ/تَ/أَ/نَ) + سْتَ+R1+sukun+R2+i+R3+u (${present3ms}). ` +
        `Imperative needs connecting alef-kasra (اِ) because the stem opens with SIN+sukun: ${imp2ms}.`;
      ruleSummary = [
        `Past: اِسْتَ+R1+sukun+R2+a+R3 (${past3ms}). Before consonant suffixes: ${past2ms}.`,
        `Present: fatha prefix (يَ/تَ/أَ/نَ) + سْتَR1+sukun+R2+i+R3+u (${present3ms}).`,
        `Masdar: اِسْتِفْعَال — اِسْتِ (kasra on TA) + R1+sukun+R2+ā+R3 (e.g. اِسْتِعْمَال, اِسْتِخْدَام).`,
        `Imperative: connecting hamza اِ + سْتَR1+sukun+R2+i+R3. 2ms: ${imp2ms}. 2fs: ${imp2fs}. 2mp: ${imp2mp}.`,
        `Active participle: مُسْتَفْعِل — مُسْتَ+R1+sukun+R2+i+R3 (kasra on R2). Widely used: مُسْتَخْدِم, مُسْتَقْبِل.`,
        `Passive participle: مُسْتَفْعَل — مُسْتَ+R1+sukun+R2+a+R3 (fatha on R2). Widely used: مُسْتَخْدَم, مُسْتَعْمَل, مُسْتَقْبَل.`,
      ];
      break;

    case "form_viii": {
      const VOICED_DENTALS_SET = new Set(["\u062F", "\u0630", "\u0632"]);
      const assimNote =
        _r1 === "\u0648" || _r1 === "\u064A" || _r1 === "\u062A"
          ? ` (R1=${_r1} assimilates with the infixed TA → TA+shadda, e.g. اِتَّفَقَ from وفق)`
          : VOICED_DENTALS_SET.has(_r1)
          ? ` (R1=${_r1} causes voiced assimilation: infixed TA → DAL, e.g. اِزْدَحَمَ from زحم)`
          : "";
      classificationEn =
        `Measure VIII (اِفْتَعَلَ / يَفْتَعِلُ): a TA infix is inserted after the first radical (${_r1})${assimNote}, ` +
        "expressing acquisition, approach toward a state, or a reflexive-transitional action " +
        "(e.g., جَمَعَ → اِجْتَمَعَ: to gather [something] → to come together / convene; " +
        "قَرُبَ → اِقْتَرَبَ: to be near → to draw near / approach).";
      surfaceEn =
        `Past follows اِفْتَعَلَ: اِ+[infix]+a+R2+a+R3 (${past3ms}). ` +
        `Present: يَفْتَعِلُ — prefix+a + [infix]+a+R2+i+R3+u (${present3ms}). ` +
        `Imperative: اِفْتَعِلْ — connecting alef-kasra (اِ) because the stem opens with a sukun (${imp2ms}).`;
      ruleSummary = [
        `Past: اِ+[infix]+a+R2+a+R3 (${past3ms}). Before consonant suffixes: ${past2ms}.`,
        `Present: (يَ/تَ/أَ/نَ)+[infix]+a+R2+i+R3+u (${present3ms}).`,
        `Masdar: اِفْتِعَال — اِ+[infix]+i+R2+ā+R3 (kasra on infix tail, long-alef before R3).`,
        `Imperative: connecting hamza اِ + [infix]+a+R2+i+R3. 2ms: ${imp2ms}. 2fs: ${imp2fs}. 2mp: ${imp2mp}.`,
        `Active participle: مُفْتَعِل (kasra on R2). Passive participle: مُفْتَعَل (fatha on R2 — widely used: مُحْتَرَم, مُكْتَسَب).`,
      ];
      break;
    }

    case "form_vii":
      classificationEn =
        "Measure VII (اِنْفَعَلَ / يَنْفَعِلُ): an ALEF+NUN prefix (اِنْ) is added before the three radicals, " +
        "making the verb reflexive or passive — the subject undergoes the Measure I action " +
        "(e.g., كَسَرَ → اِنْكَسَرَ: to break [something] → to be broken / break apart).";
      surfaceEn =
        `Past follows اِنْفَعَلَ: اِنْ+R1+a+R2+a+R3 (${past3ms}). ` +
        `Present: يَنْفَعِلُ — prefix+a + نْ+R1+a+R2+i+R3+u (${present3ms}). ` +
        `Imperative: اِنْفَعِلْ — needs connecting alef-kasra (اِ) since stem opens with NUN+sukun (${imp2ms}).`;
      ruleSummary = [
        `Past: اِنْ+R1+a+R2+a+R3 pattern (${past3ms}). Before consonant suffixes: ${past2ms}.`,
        `Present: fatha prefix (يَ/تَ/أَ/نَ) + نْ+R1+a+R2+i+R3+u (${present3ms}).`,
        `Masdar: اِنْفِعَال pattern (اِنْ+R1+i+R2+ā+R3) — kasra on R1, long-alef before R3.`,
        `Imperative: connecting alef-kasra اِ + نْR1+a+R2+i+R3. 2ms: ${imp2ms}. 2fs: ${imp2fs}. 2mp: ${imp2mp}.`,
        `Active participle: مُنْفَعِل (kasra on R2). Passive participle: مُنْفَعَل (fatha on R2 — adjectival use).`,
      ];
      break;

    case "form_vi":
      classificationEn =
        "Measure VI (تَفَاعَلَ / يَتَفَاعَلُ): a TA prefix is added to the Measure III (فَاعَلَ) stem, " +
        "expressing a reciprocal or mutual action performed between two or more parties " +
        "(e.g., قَابَلَ → تَقَابَلَ: to meet someone → to meet each other).";
      surfaceEn =
        `Past follows تَفَاعَلَ: TA+a+R1+a+ā+R2+a+R3 (${past3ms}). ` +
        `Present: يَتَفَاعَلُ — prefix+a + TA stem + u (${present3ms}). ` +
        `Imperative: تَفَاعَلْ — verb opens with TA+fatha, no connecting hamza needed (${imp2ms}).`;
      ruleSummary = [
        `Past: تَ+R1+ā+R2+a+R3 pattern (${past3ms}). Before consonant suffixes: ${past2ms}.`,
        `Present: (يَ/تَ/أَ/نَ)تَ+R1+ā+R2+a+R3+u (${present3ms}).`,
        `Masdar: تَفَاعُل pattern (TA+a+R1+ā+R2+u+R3) — ALEF + DAMMA on R2.`,
        `Imperative: open TA+fatha, no hamza. 2ms: ${imp2ms}. 2fs: ${imp2fs}. 2mp: ${imp2mp}.`,
        `Active participle: مُتَفَاعِل (ALEF + kasra before R3). Passive participle: مُتَفَاعَل (ALEF + fatha before R3).`,
      ];
      break;

    case "form_v":
      classificationEn =
        "Measure V (تَفَعَّلَ / يَتَفَعَّلُ): a TA prefix is added to the Measure II stem, making the action " +
        "reflexive or passive — the subject undergoes or performs the action upon itself " +
        "(e.g., عَلَّمَ → تَعَلَّمَ: to teach → to learn / become educated).";
      surfaceEn =
        `Past follows تَفَعَّلَ: TA+a+R1+a+R2+shadda+a+R3 (${past3ms}). ` +
        `Present: يَتَفَعَّلُ — prefix+a + TA stem + u (${present3ms}). ` +
        `Imperative: تَفَعَّلْ — verb opens with TA+fatha, no connecting hamza needed (${imp2ms}).`;
      ruleSummary = [
        `Past: تَ+R1+a+R2+shadda+a+R3 pattern (${past3ms}). Before consonant suffixes: ${past2ms}.`,
        `Present: (يَ/تَ/أَ/نَ)تَ+R1+a+R2+shadda+a+R3+u (${present3ms}).`,
        `Masdar: تَفَعُّل pattern (TA+a+R1+a+R2+shadda+u+R3) — shadda+DAMMA on R2.`,
        `Imperative: open TA+fatha, no hamza. 2ms: ${imp2ms}. 2fs: ${imp2fs}. 2mp: ${imp2mp}.`,
        `Active participle: مُتَفَعِّل (shadda+kasra on R2). Passive participle: مُتَفَعَّل (shadda+fatha on R2).`,
      ];
      break;

    case "form_iv":
      classificationEn =
        "Measure IV (أَفْعَلَ / يُفْعِلُ): a hamza prefix (أَ/يُ) is added before the three radicals, " +
        "most commonly making the verb causative or transitive (e.g., كَرُمَ → أَكْرَمَ: to be generous → to honor someone).";
      surfaceEn =
        `Past follows أَفْعَلَ: hamza+a+R1+ْ+R2+a+R3 (${past3ms}). ` +
        `Present takes a DAMMA prefix and kasra before R3: يُفْعِلُ (${present3ms}). ` +
        `Imperative uses أَفْعِلْ — open hamza+fatha, not a connecting alef: ${imp2ms}.`;
      ruleSummary = [
        `Past: أَ+R1+ْ+R2+a+R3 pattern (${past3ms}). Before consonant suffixes: ${past2ms}.`,
        `Present: DAMMA prefix + R1+ْ+R2+i+R3+u (${present3ms}).`,
        `Masdar: إِفْعَال pattern (إِ+R1+ْ+R2+a+ā+R3) — open hamza-below + kasra.`,
        `Imperative: أَفْعِلْ form — open hamza+fatha (not connecting alef). 2ms: ${imp2ms}. 2fs: ${imp2fs}. 2mp: ${imp2mp}.`,
        `Active participle: مُفْعِل (kasra before R3). Passive participle: مُفْعَل (fatha before R3).`,
      ];
      break;

    case "form_ii":
      classificationEn =
        "Measure II (فَعَّلَ / يُفَعِّلُ): the middle radical is geminated (doubled by shadda), " +
        "intensifying the base meaning or making the verb causative/transitive.";
      surfaceEn =
        `Past tense follows فَعَّلَ pattern with fatha on both sides of the doubled R2: ${past3ms}. ` +
        `Present takes a DAMMA prefix (يُ/تُ/أُ/نُ) and kasra vowel before R3: ${present3ms}. ` +
        `Imperative has no connecting hamza — R1 carries an open fatha: ${imp2ms}.`;
      ruleSummary = [
        `Past: R1+a+R2+shadda+a+R3 pattern (${past3ms}). Before consonant suffixes: ${past2ms}.`,
        `Present: DAMMA prefix + R1+a+R2+shadda+i+R3+u (${present3ms}).`,
        `Masdar: تَفْعِيل pattern (تَ+R1+ْ+R2+ِيـ+R3).`,
        `Imperative: no hamza — open fatha on R1. 2ms: ${imp2ms}. 2fs: ${imp2fs}. 2mp: ${imp2mp}.`,
        `Active participle: مُفَعِّل. Passive participle: مُفَعَّل (fatha vs kasra before R3).`,
      ];
      break;

    case "form_iii":
      classificationEn =
        "Measure III (فَاعَلَ / يُفَاعِلُ): a long ALEF is inserted between the first and second " +
        "radicals, conveying a reciprocal, directed, or intensive action toward another party.";
      surfaceEn =
        `Past tense follows فَاعَلَ: R1+fatha+alef+R2+fatha+R3 (${past3ms}). ` +
        `Present takes a DAMMA prefix and kasra before R3: ${present3ms}. ` +
        `Imperative starts with R1+fatha (no connecting hamza): ${imp2ms}.`;
      ruleSummary = [
        `Past: R1+ā+R2+a+R3 pattern (${past3ms}). Before consonant suffixes: ${past2ms}.`,
        `Present: DAMMA prefix + R1+ā+R2+i+R3+u (${present3ms}).`,
        `Masdar: مُفَاعَلَة pattern (مُ+R1+ā+R2+a+R3+ة).`,
        `Imperative: open fatha on R1, no hamza. 2ms: ${imp2ms}. 2fs: ${imp2fs}. 2mp: ${imp2mp}.`,
        `Active participle: مُفَاعِل (kasra before R3). Passive participle: مُفَاعَل (fatha before R3).`,
      ];
      break;

    default:
      classificationEn = "Unknown root type.";
      surfaceEn = "No specific surface-change rule available.";
      ruleSummary = [];
  }

  const full = `[Classification] ${classificationEn}\n\n[Surface Changes] ${surfaceEn}`;
  return { classification: classificationEn, surfaceChanges: surfaceEn, ruleSummary, full };
}
