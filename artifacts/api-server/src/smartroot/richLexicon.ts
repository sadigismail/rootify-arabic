/**
 * richLexicon.ts
 * Per-root supplementary data for the SmartRoot learning tool:
 *   - Transitivity (Form I verb)
 *   - Preposition-based meaning shifts with examples
 *   - Example sentence for Form I
 *   - Example sentences for derived forms (Forms II–X)
 *
 * Covers ~40 of the most common Modern Standard Arabic roots.
 * For roots not listed here the endpoint falls back to rule-only output.
 *
 * NO changes to the core morphology engine.
 */

export type Transitivity = "transitive" | "intransitive" | "both";

export interface PrepShift {
  prep:      string;  // Arabic preposition, e.g. "إلى"
  prepEn:    string;  // English gloss, e.g. "to/toward"
  meaning:   string;  // Full English meaning with this preposition
  exampleAr: string;
  exampleEn: string;
}

export interface FormExample {
  ar: string;
  en: string;
}

export interface RichEntry {
  transitivity:  Transitivity;
  prepositions?: PrepShift[];
  example?:      FormExample;                     // Form I sentence
  formExamples?: Partial<Record<number, FormExample>>; // Forms II–X
}

const RICH: Record<string, RichEntry> = {

  // ── Regular roots ──────────────────────────────────────────────────────────

  "كتب": {
    transitivity: "transitive",
    prepositions: [
      { prep: "إلى", prepEn: "to", meaning: "to write to (someone)",
        exampleAr: "كَتَبَ إِلَى صَدِيقِهِ رِسَالَةً.", exampleEn: "He wrote a letter to his friend." },
    ],
    example: { ar: "كَتَبَ الطَّالِبُ دَرْسَهُ.", en: "The student wrote his lesson." },
    formExamples: {
      2:  { ar: "كَتَّبَ المُعَلِّمُ التَّلَامِيذَ.", en: "The teacher had the students write." },
      5:  { ar: "تَكَتَّبَ الأَعضَاءُ لِنُصرَةِ القَضِيَّةِ.", en: "The members rallied together in support of the cause." },
      7:  { ar: "اِنْكَتَبَ اسمُهُ فِي القَائِمَةِ.", en: "His name was inscribed in the list." },
      8:  { ar: "اِكْتَتَبَ الطُّلَّابُ فِي الجَامِعَةِ.", en: "The students enrolled at the university." },
      10: { ar: "اسْتَكتَبَ المُدِيرُ سِكرِتِيرَتَهُ التَّقرِيرَ.", en: "The manager dictated the report to his secretary." },
    },
  },

  "فتح": {
    transitivity: "transitive",
    prepositions: [
      { prep: "على", prepEn: "onto / for", meaning: "to open for (someone)",
        exampleAr: "فَتَحَ لَنَا البَابَ بِاسمِ اللهِ.", exampleEn: "He opened the door for us in God's name." },
    ],
    example: { ar: "فَتَحَ الوَلَدُ النَّافِذَةَ.", en: "The boy opened the window." },
    formExamples: {
      2: { ar: "فَتَّحَ الطَّبِيبُ جُرحَهُ بِحَذَرٍ.", en: "The doctor carefully lanced/opened the wound." },
      3: { ar: "فَاتَحَهُ فِي أَمرٍ مُهِمٍّ.", en: "He broached an important matter with him." },
      7: { ar: "اِنفَتَحَ البَابُ فَجأَةً.", en: "The door opened suddenly by itself." },
    },
  },

  "دخل": {
    transitivity: "intransitive",
    prepositions: [
      { prep: "في",  prepEn: "into / in", meaning: "to enter into (a place / matter)",
        exampleAr: "دَخَلَ فِي الغُرفَةِ.", exampleEn: "He entered the room." },
      { prep: "إلى", prepEn: "to",        meaning: "to go into",
        exampleAr: "دَخَلَ إِلَى المَكتَبَةِ.", exampleEn: "He went into the library." },
    ],
    example: { ar: "دَخَلَ الطُّلَّابُ إِلَى القَاعَةِ.", en: "The students entered the hall." },
    formExamples: {
      2: { ar: "أَدخَلَ الأَبُ ابنَهُ المَدرَسَةَ.", en: "The father enrolled his son in school." },
    },
  },

  "جلس": {
    transitivity: "intransitive",
    prepositions: [
      { prep: "على", prepEn: "on",        meaning: "to sit on",
        exampleAr: "جَلَسَ عَلَى الكُرسِيِّ.", exampleEn: "He sat on the chair." },
      { prep: "إلى", prepEn: "next to",   meaning: "to sit next to (someone)",
        exampleAr: "جَلَسَ إِلَى جَانِبِهِ.", exampleEn: "He sat next to him." },
    ],
    example: { ar: "جَلَسَ الضُّيُوفُ فِي غُرفَةِ الجُلُوسِ.", en: "The guests sat in the living room." },
    formExamples: {
      2: { ar: "جَلَّسَ المُضيفُ ضُيُوفَهُ بِتَرحِيبٍ.", en: "The host seated his guests warmly." },
    },
  },

  "درس": {
    transitivity: "both",
    prepositions: [
      { prep: "في",  prepEn: "in",    meaning: "to study in (a field)",
        exampleAr: "يَدرُسُ فِي الجَامِعَةِ.", exampleEn: "He studies at the university." },
    ],
    example: { ar: "دَرَسَ الطَّالِبُ اللُّغَةَ العَرَبِيَّةَ.", en: "The student studied the Arabic language." },
    formExamples: {
      2: { ar: "دَرَّسَ الأُستَاذُ الرِّيَاضِيَّاتِ بِمَهَارَةٍ.", en: "The professor taught mathematics skillfully." },
      5: { ar: "تَدَرَّسَ المَوضُوعُ بِعِنَايَةٍ فَائِقَةٍ.", en: "The topic was studied with great care." },
      6: { ar: "تَدَارَسَ الطُّلَّابُ المَادَّةَ مَعاً.", en: "The students studied the material together." },
    },
  },

  "شرب": {
    transitivity: "transitive",
    example: { ar: "شَرِبَ الرَّجُلُ قَهوَتَهُ كُلَّ صَبَاحٍ.", en: "The man drank his coffee every morning." },
    formExamples: {
      2: { ar: "شَرَّبَتِ الأُمُّ طِفلَهَا الدَّوَاءَ.", en: "The mother made her child take the medicine." },
    },
  },

  "أكل": {
    transitivity: "transitive",
    example: { ar: "أَكَلَتِ الأُسرَةُ طَعَامَهَا مَعاً.", en: "The family ate their meal together." },
    formExamples: {
      2: { ar: "أَكَّلَتِ الأُمُّ أَطفَالَهَا.", en: "The mother fed her children." },
      6: { ar: "تَآكَلَتِ الثِّقَةُ بَينَهُمَا مَعَ الوَقتِ.", en: "The trust between them eroded over time." },
    },
  },

  "نظر": {
    transitivity: "intransitive",
    prepositions: [
      { prep: "إلى",  prepEn: "at",      meaning: "to look at / gaze at",
        exampleAr: "نَظَرَ إِلَى السَّمَاءِ.", exampleEn: "He looked up at the sky." },
      { prep: "في",   prepEn: "into",    meaning: "to examine / consider (a matter)",
        exampleAr: "نَظَرَ القَاضِي فِي القَضِيَّةِ.", exampleEn: "The judge examined the case." },
      { prep: "بين",  prepEn: "between", meaning: "to adjudicate between parties",
        exampleAr: "نَظَرَ بَينَهُمَا بِالعَدلِ.", exampleEn: "He judged between them fairly." },
    ],
    example: { ar: "نَظَرَ الوَلَدُ إِلَى النُّجُومِ بِدَهشَةٍ.", en: "The boy looked at the stars with amazement." },
    formExamples: {
      3:  { ar: "نَاظَرَ الأُستَاذُ طُلَّابَهُ فِي المَسأَلَةِ.", en: "The professor debated the issue with his students." },
      6:  { ar: "تَنَاظَرَ الفَرِيقَانِ بِاحتِرَامٍ.", en: "The two teams debated respectfully." },
      10: { ar: "اسْتَنظَرَ المُحَامِي مَوكِّلَهُ قَبلَ الجَلسَةِ.", en: "The lawyer asked his client to wait before the hearing." },
    },
  },

  "سمع": {
    transitivity: "transitive",
    prepositions: [
      { prep: "من", prepEn: "from", meaning: "to hear from (someone)",
        exampleAr: "سَمِعَ مِنهُ الحَقِيقَةَ.", exampleEn: "He heard the truth from him." },
    ],
    example: { ar: "سَمِعَ الأَولَادُ صَوتَ أُمِّهِم.", en: "The children heard their mother's voice." },
    formExamples: {
      2: { ar: "سَمَّعَ المُعَلِّمُ الطُّلَّابَ القَصِيدَةَ.", en: "The teacher had the students recite the poem aloud." },
      8: { ar: "اِستَمَعَ الجَمهُورُ إِلَى الخِطَابِ بِإِصغَاءٍ.", en: "The audience listened attentively to the speech." },
    },
  },

  "علم": {
    transitivity: "transitive",
    prepositions: [
      { prep: "بـ", prepEn: "about", meaning: "to come to know about (something)",
        exampleAr: "عَلِمَ بِالخَبَرِ مُتَأَخِّراً.", exampleEn: "He learned about the news late." },
    ],
    example: { ar: "عَلِمَ المُدِيرُ بِالمُشكِلَةِ فَتَصَرَّفَ.", en: "The director learned of the problem and acted." },
    formExamples: {
      2:  { ar: "عَلَّمَ المُعَلِّمُ الأَطفَالَ الحِسَابَ.", en: "The teacher taught the children arithmetic." },
      5:  { ar: "تَعَلَّمَ الوَلَدُ العَزفَ عَلَى البِيَانُو.", en: "The boy learned to play the piano." },
      6:  { ar: "تَعَالَمُوا كَأَنَّهُم لَا يَعرِفُونَ.", en: "They feigned ignorance as if they knew nothing." },
      10: { ar: "اسْتَعلَمَ عَنِ الأَسعَارِ قَبلَ الشِّرَاءِ.", en: "He inquired about the prices before buying." },
    },
  },

  "فهم": {
    transitivity: "transitive",
    example: { ar: "فَهِمَ الطَّالِبُ الدَّرسَ جَيِّداً.", en: "The student understood the lesson well." },
    formExamples: {
      2: { ar: "فَهَّمَ المُعَلِّمُ المَادَّةَ لِلطُّلَّابِ.", en: "The teacher explained the material clearly to the students." },
      5: { ar: "تَفَهَّمَ الأَبُ مَشَاعِرَ ابنِهِ.", en: "The father came to understand his son's feelings." },
    },
  },

  "قرأ": {
    transitivity: "transitive",
    prepositions: [
      { prep: "على", prepEn: "to / for", meaning: "to read to / for (someone)",
        exampleAr: "قَرَأَ لِأَولَادِهِ قِصَّةً قَبلَ النَّومِ.", exampleEn: "He read his children a story before bedtime." },
    ],
    example: { ar: "قَرَأَتِ البِنتُ كِتَاباً مُمتِعاً.", en: "The girl read an interesting book." },
    formExamples: {
      3:  { ar: "قَارَأَ الأَصدِقَاءُ القِصَّةَ وَنَاقَشُوهَا.", en: "The friends read and discussed the story together." },
      10: { ar: "اسْتَقرَأَ العَالِمُ النَّتَائِجَ مِنَ البَيَانَاتِ.", en: "The scholar inductively inferred results from the data." },
    },
  },

  "خرج": {
    transitivity: "intransitive",
    prepositions: [
      { prep: "من",  prepEn: "from", meaning: "to exit from",
        exampleAr: "خَرَجَ مِنَ البَيتِ مُبَكِّراً.", exampleEn: "He left the house early." },
      { prep: "إلى", prepEn: "to",   meaning: "to go out to",
        exampleAr: "خَرَجَ إِلَى الحَدِيقَةِ.", exampleEn: "He went out to the garden." },
    ],
    example: { ar: "خَرَجَ الأَولَادُ لِلَّعِبِ فِي الشَّارِعِ.", en: "The children went outside to play in the street." },
    formExamples: {
      2: { ar: "أَخرَجَ المُخرِجُ فِيلَماً رَائِعاً.", en: "The director produced a wonderful film." },
      5: { ar: "تَخَرَّجَ مِنَ الجَامِعَةِ بِامتِيَازٍ.", en: "He graduated from the university with distinction." },
    },
  },

  "عمل": {
    transitivity: "both",
    prepositions: [
      { prep: "في",  prepEn: "in",  meaning: "to work in (a field / place)",
        exampleAr: "يَعمَلُ فِي المُستَشفَى.", exampleEn: "He works in the hospital." },
      { prep: "على", prepEn: "on",  meaning: "to work on / strive toward",
        exampleAr: "عَمِلَ عَلَى تَحسِينِ أَوضَاعِهِ.", exampleEn: "He worked on improving his conditions." },
    ],
    example: { ar: "عَمِلَ المُهَندِسُ سَاعَاتٍ طَوِيلَةً.", en: "The engineer worked long hours." },
    formExamples: {
      2:  { ar: "وَظَّفَتِ الشَّرِكَةُ مَئَاتِ الأَشخَاصِ.", en: "The company employed hundreds of people." },
      5:  { ar: "تَعَمَّلَ الجَمِيعُ لِإِنجَاحِ المَشرُوعِ.", en: "Everyone worked hard to make the project succeed." },
      6:  { ar: "تَعَامَلَ الفَرِيقَانِ بِاحتِرَامٍ مُتَبَادَلٍ.", en: "The two teams dealt with each other with mutual respect." },
      10: { ar: "اسْتَعمَلَ الطَّبِيبُ آلَةً حَدِيثَةً.", en: "The doctor used a modern instrument." },
    },
  },

  "ذهب": {
    transitivity: "intransitive",
    prepositions: [
      { prep: "إلى", prepEn: "to",   meaning: "to go to",
        exampleAr: "ذَهَبَ إِلَى العَمَلِ صَبَاحاً.", exampleEn: "He went to work in the morning." },
      { prep: "مع",  prepEn: "with", meaning: "to go with (someone)",
        exampleAr: "ذَهَبَ مَعَ أَصدِقَائِهِ.", exampleEn: "He went with his friends." },
    ],
    example: { ar: "ذَهَبَتِ المَرأَةُ إِلَى السُّوقِ.", en: "The woman went to the market." },
    formExamples: {
      2: { ar: "ذَهَّبَ الصَّائِغُ الإِنَاءَ.", en: "The goldsmith gilded the vessel." },
    },
  },

  "طلب": {
    transitivity: "transitive",
    prepositions: [
      { prep: "من", prepEn: "from", meaning: "to request from (someone)",
        exampleAr: "طَلَبَ مِنهُ المُسَاعَدَةَ.", exampleEn: "He asked him for help." },
    ],
    example: { ar: "طَلَبَ الطَّالِبُ وَقتاً إِضَافِيّاً.", en: "The student requested extra time." },
    formExamples: {
      3:  { ar: "طَالَبَ العُمَّالُ بِحُقُوقِهِم.", en: "The workers demanded their rights." },
      5:  { ar: "تَطَلَّبَ النَّجَاحُ جُهداً كَبِيراً.", en: "Success required great effort." },
      6:  { ar: "تَطَالَبَ الشُّرَكَاءُ بِالأَربَاحِ.", en: "The partners mutually demanded the profits." },
      10: { ar: "اسْتَطلَعَ الصَّحَفِيُّ الأَوضَاعَ.", en: "The journalist surveyed the situation." },
    },
  },

  "سأل": {
    transitivity: "transitive",
    prepositions: [
      { prep: "عن", prepEn: "about", meaning: "to ask about",
        exampleAr: "سَأَلَ عَنِ الطَّرِيقِ.", exampleEn: "He asked about the way." },
    ],
    example: { ar: "سَأَلَ الطَّالِبُ أُستَاذَهُ سُؤَالاً ذَكِيّاً.", en: "The student asked his professor a smart question." },
    formExamples: {
      3:  { ar: "سَاءَلَ القَاضِي الشُّهُودَ.", en: "The judge questioned the witnesses." },
      6:  { ar: "تَسَاءَلَ النَّاسُ عَنِ الحَقِيقَةِ.", en: "People wondered and asked about the truth." },
      10: { ar: "اسْتَفسَرَ المُوَظَّفُ عَنِ الإِجرَاءَاتِ.", en: "The employee inquired about the procedures." },
    },
  },

  "رجع": {
    transitivity: "intransitive",
    prepositions: [
      { prep: "إلى", prepEn: "to", meaning: "to return to",
        exampleAr: "رَجَعَ إِلَى البَيتِ مُتعَباً.", exampleEn: "He returned home tired." },
    ],
    example: { ar: "رَجَعَ المُسَافِرُ إِلَى وَطَنِهِ.", en: "The traveler returned to his homeland." },
    formExamples: {
      2: { ar: "رَجَّعَ المُعَلِّمُ الكُتُبَ إِلَى الطُّلَّابِ.", en: "The teacher returned the books to the students." },
    },
  },

  "كلم": {
    transitivity: "transitive",
    prepositions: [
      { prep: "في", prepEn: "about", meaning: "to speak to (someone) about a matter",
        exampleAr: "كَلَّمَهُ فِي الأَمرِ الهَامِّ.", exampleEn: "He spoke to him about the important matter." },
    ],
    example: { ar: "كَلَّمَ المُدِيرُ المُوَظَّفَ بِاحتِرَامٍ.", en: "The manager spoke to the employee respectfully." },
    formExamples: {
      5: { ar: "تَكَلَّمَ الخَطِيبُ أَمَامَ الجَمهُورِ بِوُضُوحٍ.", en: "The speaker addressed the audience clearly." },
      6: { ar: "تَكَالَمَ الصَّدِيقَانِ بَعدَ خِلَافٍ طَوِيلٍ.", en: "The two friends spoke to each other after a long dispute." },
    },
  },

  // ── Assimilated roots (R1 = و) ─────────────────────────────────────────────

  "وعد": {
    transitivity: "transitive",
    prepositions: [
      { prep: "بـ", prepEn: "with / of", meaning: "to promise (something)",
        exampleAr: "وَعَدَهُ بِالمُسَاعَدَةِ.", exampleEn: "He promised him help." },
    ],
    example: { ar: "وَعَدَ الأَبُ ابنَهُ بِجَائِزَةٍ عَلَى نَجَاحِهِ.", en: "The father promised his son a prize for his success." },
    formExamples: {
      3: { ar: "وَاعَدَهُ أَمَامَ المَحَطَّةِ.", en: "He made an appointment with him in front of the station." },
      6: { ar: "تَوَاعَدَا عَلَى اللِّقَاءِ غَداً.", en: "The two of them agreed to meet tomorrow." },
    },
  },

  "وصل": {
    transitivity: "both",
    prepositions: [
      { prep: "إلى", prepEn: "to", meaning: "to arrive at / reach",
        exampleAr: "وَصَلَ إِلَى المَطَارِ فِي الوَقتِ.", exampleEn: "He arrived at the airport on time." },
    ],
    example: { ar: "وَصَلَ القِطَارُ إِلَى المَحَطَّةِ.", en: "The train arrived at the station." },
    formExamples: {
      2: { ar: "وَصَّلَهُ إِلَى البَيتِ بِسَيَّارَتِهِ.", en: "He drove him home." },
      8: { ar: "اتَّصَلَ بِهِ عَلَى الهَاتِفِ.", en: "He called him on the phone." },
    },
  },

  "وقف": {
    transitivity: "intransitive",
    prepositions: [
      { prep: "على", prepEn: "on / at", meaning: "to stand at / stay at",
        exampleAr: "وَقَفَ عَلَى البَابِ يَنتَظِرُ.", exampleEn: "He stood at the door waiting." },
      { prep: "أمام",prepEn: "in front of", meaning: "to stand in front of",
        exampleAr: "وَقَفَ أَمَامَ المِرآةِ.", exampleEn: "He stood in front of the mirror." },
    ],
    example: { ar: "وَقَفَ الجَمهُورُ إِجلَالاً لِلنَّشِيدِ الوَطَنِيِّ.", en: "The audience stood in respect for the national anthem." },
    formExamples: {
      2: { ar: "أَوقَفَ الشُّرطِيُّ السَّيَّارَةَ.", en: "The policeman stopped the car." },
      5: { ar: "تَوَقَّفَ القِطَارُ فِي المَحَطَّةِ.", en: "The train stopped at the station." },
      6: { ar: "تَوَاقَفَ الجَانِبَانِ عَلَى الهُدنَةِ.", en: "The two sides agreed on a ceasefire." },
      10:{ ar: "اِستَوقَفَهُ لِيَسأَلَهُ سُؤَالاً.", en: "He stopped him to ask him a question." },
    },
  },

  "وزن": {
    transitivity: "transitive",
    example: { ar: "وَزَنَ البَائِعُ البَضَاعَةَ بِدِقَّةٍ.", en: "The merchant weighed the goods precisely." },
    formExamples: {
      2: { ar: "وَازَنَ بَينَ الخِيَارَاتِ بِعَقلَانِيَّةٍ.", en: "He weighed the options rationally." },
      8: { ar: "اِتَّزَنَتِ المِيزَانِيَّةُ بَعدَ التَّعدِيلَاتِ.", en: "The budget became balanced after the adjustments." },
      10:{ ar: "اِستَوزَنَ المُوَاطِنُ حُقُوقَهُ قَبلَ المُطَالَبَةِ.", en: "The citizen carefully weighed his rights before demanding them." },
    },
  },

  // ── Hollow roots ───────────────────────────────────────────────────────────

  "قول": {
    transitivity: "transitive",
    prepositions: [
      { prep: "لـ", prepEn: "to", meaning: "to say to (someone)",
        exampleAr: "قَالَ لَهُ الحَقِيقَةَ.", exampleEn: "He told him the truth." },
    ],
    example: { ar: "قَالَتِ المُعَلِّمَةُ لِلطُّلَّابِ الحَقِيقَةَ.", en: "The teacher told the students the truth." },
    formExamples: {
      2:  { ar: "قَوَّلَهُ مَا لَم يَقُلهُ قَطُّ.", en: "He put words in his mouth that he never said." },
      6:  { ar: "تَقَاوَلَا بِكَلِمَاتٍ جَارِحَةٍ.", en: "They exchanged hurtful words with each other." },
      10: { ar: "اسْتَقَالَ الوَزِيرُ مِن مَنصِبِهِ.", en: "The minister resigned from his position." },
    },
  },

  "زور": {
    transitivity: "transitive",
    example: { ar: "زَارَ الأَصدِقَاءُ المَرِيضَ فِي المُستَشفَى.", en: "The friends visited the patient in the hospital." },
    formExamples: {
      6: { ar: "تَزَاوَرَتِ الأُسَرُ فِي العِيدِ.", en: "The families visited one another during Eid." },
    },
  },

  "نوم": {
    transitivity: "intransitive",
    example: { ar: "نَامَ الطِّفلُ مُبَكِّراً.", en: "The child slept early." },
    formExamples: {
      2: { ar: "نَوَّمَتِ الأُمُّ طِفلَهَا.", en: "The mother put her child to sleep." },
      4: { ar: "أَنَامَ الطَّبِيبُ المَرِيضَ بِمُخَدِّرٍ.", en: "The doctor anesthetized the patient." },
    },
  },

  "صوم": {
    transitivity: "intransitive",
    example: { ar: "صَامَ المُسلِمُونَ فِي شَهرِ رَمَضَانَ.", en: "Muslims fasted during the month of Ramadan." },
    formExamples: {
      2: { ar: "صَوَّمَ الوَالِدَانِ أَطفَالَهُمَا تَدرِيجِيّاً.", en: "The parents gradually trained their children to fast." },
    },
  },

  "بيع": {
    transitivity: "transitive",
    prepositions: [
      { prep: "بـ", prepEn: "for (price)", meaning: "to sell for (a price)",
        exampleAr: "بَاعَ البَيتَ بِثَمَنٍ مُنَاسِبٍ.", exampleEn: "He sold the house at a fair price." },
    ],
    example: { ar: "بَاعَ التَّاجِرُ بَضَاعَتَهُ فِي السُّوقِ.", en: "The merchant sold his goods in the market." },
    formExamples: {
      3: { ar: "بَايَعَ الجُندُ قَائِدَهُم.", en: "The soldiers pledged allegiance to their commander." },
      6: { ar: "تَبَايَعَ البَائِعُ وَالمُشتَرِي بِرِضَا.", en: "The seller and buyer transacted willingly." },
      8: { ar: "اِبتَاعَ الرَّجُلُ سَيَّارَةً جَدِيدَةً.", en: "The man bought a new car." },
    },
  },

  // ── Defective roots ────────────────────────────────────────────────────────

  "دعو": {
    transitivity: "transitive",
    prepositions: [
      { prep: "إلى", prepEn: "to", meaning: "to call / invite to (something)",
        exampleAr: "دَعَاهُم إِلَى وَلِيمَةٍ.", exampleEn: "He invited them to a feast." },
    ],
    example: { ar: "دَعَا الإِمَامُ المُصَلِّينَ إِلَى الصَّلَاةِ.", en: "The imam called the worshippers to prayer." },
    formExamples: {
      3:  { ar: "دَاعَى المَسؤُولُ إِلَى الحِوَارِ.", en: "The official called for dialogue." },
      6:  { ar: "تَدَاعَى النَّاسُ لِنُصرَةِ المَظلُومِ.", en: "People rallied together to support the oppressed." },
      8:  { ar: "اِدَّعَى البَرَاءَةَ أَمَامَ المَحكَمَةِ.", en: "He claimed innocence before the court." },
      10: { ar: "اسْتَدعَتِ الشُّرطَةُ الشُّهُودَ.", en: "The police summoned the witnesses." },
    },
  },

  "مشي": {
    transitivity: "intransitive",
    prepositions: [
      { prep: "إلى", prepEn: "to",   meaning: "to walk to",
        exampleAr: "مَشَى إِلَى المَدرَسَةِ.", exampleEn: "He walked to school." },
      { prep: "على", prepEn: "on",   meaning: "to walk on",
        exampleAr: "مَشَى عَلَى الرَّملِ.", exampleEn: "He walked on the sand." },
    ],
    example: { ar: "مَشَى الطِّفلُ خَطَوَاتِهِ الأُولَى.", en: "The child took his first steps." },
    formExamples: {
      2: { ar: "مَشَّى الأَبُ طِفلَهُ فِي الحَدِيقَةِ.", en: "The father walked his child in the garden." },
    },
  },

  "رمي": {
    transitivity: "transitive",
    prepositions: [
      { prep: "بـ", prepEn: "with", meaning: "to throw (at) with / to accuse of",
        exampleAr: "رَمَاهُ بِالحَجَرِ.", exampleEn: "He threw a stone at him." },
    ],
    example: { ar: "رَمَى اللَّاعِبُ الكُرَةَ فِي الشَّبَكَةِ.", en: "The player threw the ball into the net." },
  },

  // ── Doubled roots ──────────────────────────────────────────────────────────

  "ردد": {
    transitivity: "transitive",
    example: { ar: "رَدَّ الطَّالِبُ دُرُوسَهُ قَبلَ الامتِحَانِ.", en: "The student reviewed his lessons before the exam." },
    formExamples: {
      2: { ar: "رَدَّدَ المُغَنِّي اللَّازِمَةَ مَرَّتَيِن.", en: "The singer repeated the refrain twice." },
      5: { ar: "تَرَدَّدَ قَبلَ اتِّخَاذِ القَرَارِ.", en: "He hesitated before making the decision." },
      10:{ ar: "اِستَرَدَّ حُقُوقَهُ بَعدَ طُولِ انتِظَارٍ.", en: "He recovered his rights after a long wait." },
    },
  },

  // ── Additional very common roots ───────────────────────────────────────────

  "صبر": {
    transitivity: "intransitive",
    prepositions: [
      { prep: "على", prepEn: "on / with", meaning: "to be patient with / to endure",
        exampleAr: "صَبَرَ عَلَى الأَلَمِ وَلَم يَشكُ.", exampleEn: "He endured the pain without complaining." },
    ],
    example: { ar: "صَبَرَ الوَالِدَانِ عَلَى التَّعَبِ مِن أَجلِ أَولَادِهِمَا.", en: "The parents patiently endured hardship for their children." },
    formExamples: {
      2: { ar: "صَبَّرَ الأَبُ ابنَهُ عَلَى الفَشَلِ.", en: "The father consoled his son after the failure." },
      5: { ar: "تَصَبَّرَ وَلَم يُظهِر حُزنَهُ.", en: "He forced himself to be patient and did not show his sadness." },
    },
  },

  "كرم": {
    transitivity: "intransitive",
    example: { ar: "كَرُمَ الرَّجُلُ وَقَدَّمَ طَعَاماً لِلفُقَرَاءِ.", en: "The man was generous and provided food for the poor." },
    formExamples: {
      2:  { ar: "كَرَّمَتِ الجَامِعَةُ الطُّلَّابَ المُتَفَوِّقِينَ.", en: "The university honored the top students." },
      4:  { ar: "أَكرَمَ الضَّيفَ وَقَدَّمَ لَهُ أَحسَنَ الطَّعَامِ.", en: "He honored the guest and offered him the finest food." },
      10: { ar: "اِستَكرَمَ صِفَاتِهِ العَالِيَةَ.", en: "He admired and valued his noble qualities." },
    },
  },

  "غفر": {
    transitivity: "transitive",
    prepositions: [
      { prep: "لـ", prepEn: "for", meaning: "to forgive (someone)",
        exampleAr: "غَفَرَ اللهُ لِعِبَادِهِ.", exampleEn: "God forgave His servants." },
    ],
    example: { ar: "غَفَرَ الأَبُ لِابنِهِ زَلَّتَهُ.", en: "The father forgave his son his mistake." },
    formExamples: {
      6:  { ar: "تَغَافَرَ الصَّدِيقَانِ وَعَادَا إِلَى صَدَاقَتِهِمَا.", en: "The two friends forgave each other and returned to their friendship." },
      10: { ar: "اسْتَغفَرَ اللهَ عَلَى ذُنُوبِهِ.", en: "He sought God's forgiveness for his sins." },
    },
  },

  "حفظ": {
    transitivity: "transitive",
    example: { ar: "حَفِظَ الطَّالِبُ القُرآنَ الكَرِيمَ.", en: "The student memorized the Holy Quran." },
    formExamples: {
      2:  { ar: "حَفَّظَ المُعَلِّمُ الطُّلَّابَ القَصِيدَةَ.", en: "The teacher had the students memorize the poem." },
      5:  { ar: "تَحَفَّظَ عَلَى بَعضِ بُنُودِ العَقدِ.", en: "He expressed reservations about some contract clauses." },
      8:  { ar: "اِحتَفَظَتِ المَكتَبَةُ بِنُسَخٍ نَادِرَةٍ.", en: "The library kept rare copies in its collection." },
      10: { ar: "اِستَحفَظَهُ الوَثِيقَةَ الهَامَّةَ.", en: "He entrusted him with keeping the important document." },
    },
  },

};

export function lookupRich(root3: string): RichEntry | undefined {
  return RICH[root3];
}

/**
 * Return transitivity for a root; defaults to "transitive" if unknown.
 * Callers should use the returned value, not assume transitivity.
 */
export function getTransitivity(root3: string): Transitivity {
  return RICH[root3]?.transitivity ?? "transitive";
}
